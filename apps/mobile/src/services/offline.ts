/**
 * Offline Cache Service
 *
 * Caches mobile summary and alerts for offline access (24h TTL).
 * Uses AsyncStorage for persistence.
 *
 * Sprint 76 - Track A: Offline Support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  SUMMARY: '@pravado/cache/summary',
  ALERTS: '@pravado/cache/alerts',
  USAGE: '@pravado/cache/usage',
  TIER: '@pravado/cache/tier',
} as const;

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedData<T> {
  data: T;
  timestamp: number;
}

// ============================================================================
// Cache Storage
// ============================================================================

/**
 * Store data in cache with timestamp
 */
export async function cacheData<T>(key: string, data: T): Promise<void> {
  try {
    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cachedData));
  } catch (error) {
    console.error(`Failed to cache data for key ${key}:`, error);
  }
}

/**
 * Get data from cache if not expired
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const cachedData: CachedData<T> = JSON.parse(cached);
    const age = Date.now() - cachedData.timestamp;

    // Check if cache is expired
    if (age > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cachedData.data;
  } catch (error) {
    console.error(`Failed to get cached data for key ${key}:`, error);
    return null;
  }
}

/**
 * Clear specific cache key
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to clear cache for key ${key}:`, error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
}

// ============================================================================
// Specific Cache Functions
// ============================================================================

/**
 * Cache mobile summary
 */
export async function cacheSummary(summary: any): Promise<void> {
  await cacheData(CACHE_KEYS.SUMMARY, summary);
}

/**
 * Get cached summary
 */
export async function getCachedSummary(): Promise<any | null> {
  return getCachedData(CACHE_KEYS.SUMMARY);
}

/**
 * Cache alerts
 */
export async function cacheAlerts(alerts: any): Promise<void> {
  await cacheData(CACHE_KEYS.ALERTS, alerts);
}

/**
 * Get cached alerts
 */
export async function getCachedAlerts(): Promise<any | null> {
  return getCachedData(CACHE_KEYS.ALERTS);
}

/**
 * Cache usage data
 */
export async function cacheUsage(usage: any): Promise<void> {
  await cacheData(CACHE_KEYS.USAGE, usage);
}

/**
 * Get cached usage
 */
export async function getCachedUsage(): Promise<any | null> {
  return getCachedData(CACHE_KEYS.USAGE);
}

/**
 * Cache tier info
 */
export async function cacheTier(tier: any): Promise<void> {
  await cacheData(CACHE_KEYS.TIER, tier);
}

/**
 * Get cached tier
 */
export async function getCachedTier(): Promise<any | null> {
  return getCachedData(CACHE_KEYS.TIER);
}
