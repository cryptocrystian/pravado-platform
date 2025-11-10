// =====================================================
// LLM RESPONSE CACHE SERVICE
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// Performance caching to reduce cost and latency

import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface CacheEntry {
  promptHash: string;
  provider: string;
  model: string;
  responseJson: any;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
  hitCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

export interface CacheLookupResult {
  hit: boolean;
  entry?: CacheEntry;
  latencySavedMs?: number;
  costSaved?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  avgHitsPerEntry: number;
  cacheSizeMb: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

// =====================================================
// CONFIGURATION
// =====================================================

const CACHE_TTL_HOURS = parseInt(process.env.LLM_CACHE_TTL_HOURS || '24', 10);
const CACHE_ENABLED = process.env.ENABLE_LLM_CACHE === 'true';

// =====================================================
// HASH GENERATION
// =====================================================

/**
 * Generate cache key from prompt, model, and parameters
 */
export function generateCacheHash(
  prompt: string | string[],
  model: string,
  params?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): string {
  // Normalize prompt (array of messages or single string)
  const normalizedPrompt = Array.isArray(prompt)
    ? JSON.stringify(prompt)
    : prompt;

  // Create stable string representation
  const cacheKey = JSON.stringify({
    prompt: normalizedPrompt,
    model,
    temperature: params?.temperature || 0.7,
    maxTokens: params?.maxTokens || 2000,
    systemPrompt: params?.systemPrompt || '',
  });

  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(cacheKey).digest('hex');
}

// =====================================================
// CACHE OPERATIONS
// =====================================================

/**
 * Lookup response in cache
 */
export async function lookupCache(
  promptHash: string
): Promise<CacheLookupResult> {
  if (!CACHE_ENABLED) {
    return { hit: false };
  }

  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('prompt_hash', promptHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { hit: false };
    }

    // Cache hit! Increment hit count
    const { error: updateError } = await supabase
      .from('ai_response_cache')
      .update({
        hit_count: data.hit_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('prompt_hash', promptHash);

    if (updateError) {
      logger.warn('[LLMCache] Failed to update hit count', updateError);
    }

    const entry: CacheEntry = {
      promptHash: data.prompt_hash,
      provider: data.provider,
      model: data.model,
      responseJson: data.response_json,
      tokensIn: data.tokens_in,
      tokensOut: data.tokens_out,
      estimatedCost: parseFloat(data.estimated_cost_usd),
      hitCount: data.hit_count + 1,
      createdAt: new Date(data.created_at),
      lastAccessedAt: new Date(),
      expiresAt: new Date(data.expires_at),
    };

    logger.info('[LLMCache] Cache HIT', {
      promptHash: promptHash.substring(0, 16),
      provider: entry.provider,
      model: entry.model,
      hitCount: entry.hitCount,
    });

    return {
      hit: true,
      entry,
      costSaved: entry.estimatedCost,
      latencySavedMs: 1000, // Assume ~1s saved on average
    };
  } catch (error) {
    logger.error('[LLMCache] Exception in lookupCache', error);
    return { hit: false };
  }
}

/**
 * Store response in cache
 */
export async function storeInCache(
  promptHash: string,
  provider: string,
  model: string,
  responseJson: any,
  tokensIn: number,
  tokensOut: number,
  estimatedCost: number
): Promise<boolean> {
  if (!CACHE_ENABLED) {
    return false;
  }

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    const { error } = await supabase
      .from('ai_response_cache')
      .insert({
        prompt_hash: promptHash,
        provider,
        model,
        response_json: responseJson,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        estimated_cost_usd: estimatedCost,
        hit_count: 0,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      // Duplicate key is OK (race condition)
      if (error.code === '23505') {
        logger.debug('[LLMCache] Entry already exists (race condition)', {
          promptHash: promptHash.substring(0, 16),
        });
        return true;
      }

      logger.error('[LLMCache] Failed to store in cache', error);
      return false;
    }

    logger.info('[LLMCache] Stored in cache', {
      promptHash: promptHash.substring(0, 16),
      provider,
      model,
      ttlHours: CACHE_TTL_HOURS,
    });

    return true;
  } catch (error) {
    logger.error('[LLMCache] Exception in storeInCache', error);
    return false;
  }
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(promptHash: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_response_cache')
      .delete()
      .eq('prompt_hash', promptHash);

    if (error) {
      logger.error('[LLMCache] Failed to invalidate cache', error);
      return false;
    }

    logger.info('[LLMCache] Invalidated cache entry', {
      promptHash: promptHash.substring(0, 16),
    });

    return true;
  } catch (error) {
    logger.error('[LLMCache] Exception in invalidateCache', error);
    return false;
  }
}

/**
 * Clear all expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_cache');

    if (error) {
      logger.error('[LLMCache] Failed to cleanup expired cache', error);
      return 0;
    }

    const deletedCount = data || 0;

    if (deletedCount > 0) {
      logger.info('[LLMCache] Cleaned up expired cache entries', { deletedCount });
    }

    return deletedCount;
  } catch (error) {
    logger.error('[LLMCache] Exception in cleanupExpiredCache', error);
    return 0;
  }
}

// =====================================================
// CACHE ANALYTICS
// =====================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const { data, error } = await supabase.rpc('get_cache_stats');

    if (error || !data || data.length === 0) {
      logger.error('[LLMCache] Failed to get cache stats', error);
      return {
        totalEntries: 0,
        totalHits: 0,
        avgHitsPerEntry: 0,
        cacheSizeMb: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const stats = data[0];

    return {
      totalEntries: parseInt(stats.total_entries || '0', 10),
      totalHits: parseInt(stats.total_hits || '0', 10),
      avgHitsPerEntry: parseFloat(stats.avg_hits_per_entry || '0'),
      cacheSizeMb: parseFloat(stats.cache_size_mb || '0'),
      oldestEntry: stats.oldest_entry ? new Date(stats.oldest_entry) : null,
      newestEntry: stats.newest_entry ? new Date(stats.newest_entry) : null,
    };
  } catch (error) {
    logger.error('[LLMCache] Exception in getCacheStats', error);
    return {
      totalEntries: 0,
      totalHits: 0,
      avgHitsPerEntry: 0,
      cacheSizeMb: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}

/**
 * Get cache hit rate for a time period
 */
export async function getCacheHitRate(
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const { data, error } = await supabase.rpc('get_cache_hit_rate', {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });

    if (error) {
      logger.error('[LLMCache] Failed to get cache hit rate', error);
      return 0;
    }

    return parseFloat(data || '0');
  } catch (error) {
    logger.error('[LLMCache] Exception in getCacheHitRate', error);
    return 0;
  }
}

/**
 * Get most frequently cached prompts (hot cache)
 */
export async function getHotCacheEntries(limit: number = 10): Promise<Array<{
  promptHash: string;
  provider: string;
  model: string;
  hitCount: number;
  estimatedSavings: number;
  lastAccessed: Date;
}>> {
  try {
    const { data, error } = await supabase.rpc('get_hot_cache_entries', {
      limit_count: limit,
    });

    if (error || !data) {
      logger.error('[LLMCache] Failed to get hot cache entries', error);
      return [];
    }

    return data.map((entry: any) => ({
      promptHash: entry.prompt_hash,
      provider: entry.provider,
      model: entry.model,
      hitCount: entry.hit_count,
      estimatedSavings: parseFloat(entry.estimated_savings_usd || '0'),
      lastAccessed: new Date(entry.last_accessed_at),
    }));
  } catch (error) {
    logger.error('[LLMCache] Exception in getHotCacheEntries', error);
    return [];
  }
}

/**
 * Get total cost savings from cache
 */
export async function getCacheSavings(
  startDate?: Date,
  endDate?: Date
): Promise<{ totalSavings: number; requestsSaved: number }> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('estimated_cost_usd, hit_count')
      .gte('last_accessed_at', start.toISOString())
      .lte('last_accessed_at', end.toISOString());

    if (error || !data) {
      logger.error('[LLMCache] Failed to get cache savings', error);
      return { totalSavings: 0, requestsSaved: 0 };
    }

    let totalSavings = 0;
    let requestsSaved = 0;

    for (const entry of data) {
      const cost = parseFloat(entry.estimated_cost_usd || '0');
      const hits = entry.hit_count || 0;

      totalSavings += cost * hits;
      requestsSaved += hits;
    }

    return { totalSavings, requestsSaved };
  } catch (error) {
    logger.error('[LLMCache] Exception in getCacheSavings', error);
    return { totalSavings: 0, requestsSaved: 0 };
  }
}

// =====================================================
// CACHE WARMING (Optional)
// =====================================================

/**
 * Pre-warm cache with common prompts
 * Can be used to populate cache with frequently used prompts
 */
export async function warmCache(entries: Array<{
  prompt: string;
  model: string;
  provider: string;
  response: any;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}>): Promise<number> {
  if (!CACHE_ENABLED) {
    return 0;
  }

  let warmed = 0;

  for (const entry of entries) {
    const hash = generateCacheHash(entry.prompt, entry.model);
    const success = await storeInCache(
      hash,
      entry.provider,
      entry.model,
      entry.response,
      entry.tokensIn,
      entry.tokensOut,
      entry.cost
    );

    if (success) {
      warmed++;
    }
  }

  logger.info('[LLMCache] Cache warming completed', {
    totalEntries: entries.length,
    warmed,
  });

  return warmed;
}

/**
 * Get cache configuration
 */
export function getCacheConfig(): {
  enabled: boolean;
  ttlHours: number;
} {
  return {
    enabled: CACHE_ENABLED,
    ttlHours: CACHE_TTL_HOURS,
  };
}
