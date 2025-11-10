// =====================================================
// LLM CACHE MIDDLEWARE
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// Performance caching layer to reduce cost and latency

import { Request, Response, NextFunction } from 'express';
import {
  generateCacheHash,
  lookupCache,
  storeInCache,
  getCacheConfig,
} from '../services/llm-cache.service';
import { logger } from '../lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface CacheableRequest {
  prompt: string | string[];
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  organizationId: string;
}

export interface CachedResponse {
  response: any;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
  fromCache: true;
  cacheHit: {
    hitCount: number;
    createdAt: Date;
    latencySavedMs: number;
    costSaved: number;
  };
}

// =====================================================
// CACHE METRICS
// =====================================================

interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  latencySavedMs: number;
  costSaved: number;
}

const cacheMetrics = new Map<string, CacheMetrics>();

/**
 * Get cache metrics for an organization
 */
export function getCacheMetrics(organizationId: string): CacheMetrics {
  return cacheMetrics.get(organizationId) || {
    hits: 0,
    misses: 0,
    errors: 0,
    latencySavedMs: 0,
    costSaved: 0,
  };
}

/**
 * Reset cache metrics for an organization
 */
export function resetCacheMetrics(organizationId: string): void {
  cacheMetrics.delete(organizationId);
}

/**
 * Increment cache metric
 */
function incrementMetric(
  organizationId: string,
  metric: 'hits' | 'misses' | 'errors',
  latencySaved?: number,
  costSaved?: number
): void {
  const metrics = getCacheMetrics(organizationId);

  metrics[metric]++;

  if (latencySaved !== undefined) {
    metrics.latencySavedMs += latencySaved;
  }

  if (costSaved !== undefined) {
    metrics.costSaved += costSaved;
  }

  cacheMetrics.set(organizationId, metrics);
}

// =====================================================
// CACHE LOOKUP MIDDLEWARE
// =====================================================

/**
 * Express middleware to check LLM cache before routing
 *
 * Expects request body to contain:
 * - prompt: string | string[]
 * - model: string
 * - provider: string
 * - organizationId: string
 * - temperature?: number
 * - maxTokens?: number
 * - systemPrompt?: string
 *
 * If cache hit:
 * - Returns cached response immediately (status 200)
 * - Does NOT call next()
 *
 * If cache miss:
 * - Attaches cacheHash to req for downstream storage
 * - Calls next() to proceed to LLM call
 */
export async function llmCacheLookupMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const config = getCacheConfig();

  // Skip if caching disabled
  if (!config.enabled) {
    next();
    return;
  }

  try {
    const {
      prompt,
      model,
      provider,
      organizationId,
      temperature,
      maxTokens,
      systemPrompt,
    } = req.body as CacheableRequest;

    // Validate required fields
    if (!prompt || !model || !provider || !organizationId) {
      // Missing fields, skip caching
      next();
      return;
    }

    // Generate cache hash
    const cacheHash = generateCacheHash(prompt, model, {
      temperature,
      maxTokens,
      systemPrompt,
    });

    // Lookup in cache
    const cacheResult = await lookupCache(cacheHash);

    if (cacheResult.hit && cacheResult.entry) {
      // CACHE HIT! Return cached response immediately
      const cachedResponse: CachedResponse = {
        response: cacheResult.entry.responseJson,
        tokensIn: cacheResult.entry.tokensIn,
        tokensOut: cacheResult.entry.tokensOut,
        estimatedCost: cacheResult.entry.estimatedCost,
        fromCache: true,
        cacheHit: {
          hitCount: cacheResult.entry.hitCount,
          createdAt: cacheResult.entry.createdAt,
          latencySavedMs: cacheResult.latencySavedMs || 0,
          costSaved: cacheResult.costSaved || 0,
        },
      };

      // Update metrics
      incrementMetric(
        organizationId,
        'hits',
        cacheResult.latencySavedMs,
        cacheResult.costSaved
      );

      logger.info('[LLMCache] Returning cached response', {
        organizationId,
        provider,
        model,
        cacheHash: cacheHash.substring(0, 16),
        hitCount: cacheResult.entry.hitCount,
        latencySaved: cacheResult.latencySavedMs,
        costSaved: cacheResult.costSaved,
      });

      // Return cached response (don't call next!)
      res.status(200).json(cachedResponse);
      return;
    }

    // CACHE MISS - attach hash to request for downstream storage
    (req as any).cacheHash = cacheHash;
    (req as any).cacheParams = {
      provider,
      model,
      organizationId,
    };

    // Update metrics
    incrementMetric(organizationId, 'misses');

    logger.debug('[LLMCache] Cache miss, proceeding to LLM call', {
      organizationId,
      provider,
      model,
      cacheHash: cacheHash.substring(0, 16),
    });

    next();
  } catch (error) {
    logger.error('[LLMCache] Error in lookup middleware', error);

    // On error, skip caching and proceed to LLM call
    const { organizationId } = req.body;
    if (organizationId) {
      incrementMetric(organizationId, 'errors');
    }

    next();
  }
}

// =====================================================
// CACHE STORAGE MIDDLEWARE
// =====================================================

/**
 * Express middleware to store LLM responses in cache
 *
 * Should be used AFTER the LLM call completes successfully.
 * Reads cacheHash from req (set by lookup middleware).
 *
 * Intercepts res.json() to store response before sending.
 */
export function llmCacheStorageMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const config = getCacheConfig();

  // Skip if caching disabled
  if (!config.enabled) {
    next();
    return;
  }

  try {
    const cacheHash = (req as any).cacheHash;
    const cacheParams = (req as any).cacheParams;

    // Skip if no cache hash (cache hit or error in lookup)
    if (!cacheHash || !cacheParams) {
      next();
      return;
    }

    // Monkey-patch res.json() to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && body) {
        // Store in cache asynchronously (don't wait)
        storeResponseInCache(cacheHash, cacheParams, body).catch((error) => {
          logger.error('[LLMCache] Failed to store response', error);
        });
      }

      // Call original json method
      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error('[LLMCache] Error in storage middleware', error);
    next();
  }
}

/**
 * Helper to store response in cache
 */
async function storeResponseInCache(
  cacheHash: string,
  cacheParams: { provider: string; model: string; organizationId: string },
  responseBody: any
): Promise<void> {
  const { provider, model } = cacheParams;

  // Extract token usage and cost from response
  const tokensIn = responseBody.usage?.prompt_tokens || responseBody.tokensIn || 0;
  const tokensOut = responseBody.usage?.completion_tokens || responseBody.tokensOut || 0;
  const estimatedCost = responseBody.cost || responseBody.estimatedCost || 0;

  // Store the actual response data (not metadata)
  const responseToCache = responseBody.response || responseBody.data || responseBody;

  await storeInCache(
    cacheHash,
    provider,
    model,
    responseToCache,
    tokensIn,
    tokensOut,
    estimatedCost
  );
}

// =====================================================
// COMBINED MIDDLEWARE
// =====================================================

/**
 * Combined middleware that does both lookup and storage
 *
 * Use this as a single middleware for simple integration:
 * app.use('/api/ai/generate', llmCacheMiddleware);
 *
 * For more control, use lookup and storage separately:
 * app.use('/api/ai/generate', llmCacheLookupMiddleware);
 * // ... your LLM route handler ...
 * app.use('/api/ai/generate', llmCacheStorageMiddleware);
 */
export function llmCacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // First do lookup
  llmCacheLookupMiddleware(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }

    // If we got here, it was a cache miss
    // Apply storage middleware for the response
    llmCacheStorageMiddleware(req, res, next);
  }).catch((error) => {
    logger.error('[LLMCache] Error in combined middleware', error);
    next();
  });
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Get cache status for monitoring
 */
export function getCacheStatus(organizationId?: string): {
  enabled: boolean;
  ttlHours: number;
  metrics: organizationId extends string
    ? CacheMetrics
    : Record<string, CacheMetrics>;
} {
  const config = getCacheConfig();

  if (organizationId) {
    return {
      enabled: config.enabled,
      ttlHours: config.ttlHours,
      metrics: getCacheMetrics(organizationId),
    };
  }

  // Return all metrics
  const allMetrics: Record<string, CacheMetrics> = {};
  for (const [orgId, metrics] of cacheMetrics.entries()) {
    allMetrics[orgId] = metrics;
  }

  return {
    enabled: config.enabled,
    ttlHours: config.ttlHours,
    metrics: allMetrics,
  };
}

/**
 * Calculate cache hit rate for an organization
 */
export function getCacheHitRate(organizationId: string): number {
  const metrics = getCacheMetrics(organizationId);
  const total = metrics.hits + metrics.misses;

  if (total === 0) {
    return 0;
  }

  return metrics.hits / total;
}

/**
 * Get cache efficiency (cost saved per request)
 */
export function getCacheEfficiency(organizationId: string): {
  hitRate: number;
  avgLatencySavedMs: number;
  avgCostSaved: number;
  totalCostSaved: number;
} {
  const metrics = getCacheMetrics(organizationId);
  const hitRate = getCacheHitRate(organizationId);

  return {
    hitRate,
    avgLatencySavedMs: metrics.hits > 0 ? metrics.latencySavedMs / metrics.hits : 0,
    avgCostSaved: metrics.hits > 0 ? metrics.costSaved / metrics.hits : 0,
    totalCostSaved: metrics.costSaved,
  };
}
