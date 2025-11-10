// =====================================================
// AIOPS METRICS & ANALYTICS API ROUTES
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// REST API for telemetry aggregation and provider health

import { Router, Request, Response } from 'express';
import {
  aggregateByProvider,
  getHourlyAggregates,
  getProviderHealthStatus,
  getMetricsSummary,
  getCostByTaskCategory,
} from '../services/telemetry-aggregator.service';
import {
  getCacheStats,
  getCacheHitRate,
  getHotCacheEntries,
  getCacheSavings,
  cleanupExpiredCache,
  getCacheConfig,
} from '../services/llm-cache.service';
import {
  getCacheStatus,
  getCacheHitRate as getMiddlewareCacheHitRate,
  getCacheEfficiency,
  getCacheMetrics,
} from '../middleware/llm-cache.middleware';
import { logger } from '../lib/logger';

const router = Router();

// =====================================================
// TELEMETRY AGGREGATION ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/metrics/aggregated
 * Get aggregated metrics by provider
 * Query params: startDate, endDate, organizationId
 */
router.get('/metrics/aggregated', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, organizationId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const aggregated = await aggregateByProvider(start, end, organizationId as string);

    res.json({
      success: true,
      data: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        organizationId: organizationId || 'all',
        metrics: aggregated,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching aggregated metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch aggregated metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/metrics/hourly
 * Get hourly aggregates
 * Query params: hours (default: 24), organizationId
 */
router.get('/metrics/hourly', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const { organizationId } = req.query;

    const hourlyMetrics = await getHourlyAggregates(hours, organizationId as string);

    res.json({
      success: true,
      data: {
        hours,
        organizationId: organizationId || 'all',
        metrics: hourlyMetrics,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching hourly metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hourly metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/metrics/summary
 * Get comprehensive metrics summary
 * Query params: period (1h, 24h, 7d, 30d), organizationId
 */
router.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as '1h' | '24h' | '7d' | '30d') || '24h';
    const { organizationId } = req.query;

    const summary = await getMetricsSummary(period, organizationId as string);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching metrics summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/metrics/cost-by-task
 * Get cost breakdown by task category
 * Query params: startDate, endDate, organizationId
 */
router.get('/metrics/cost-by-task', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, organizationId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const costBreakdown = await getCostByTaskCategory(start, end, organizationId as string);

    res.json({
      success: true,
      data: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        organizationId: organizationId || 'all',
        breakdown: costBreakdown,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cost breakdown', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost breakdown',
      message: error.message,
    });
  }
});

// =====================================================
// PROVIDER HEALTH ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/metrics/provider-health
 * Get provider health status with deviation analysis
 * Query params: deviationThreshold (default: 0.2 = 20%)
 */
router.get('/metrics/provider-health', async (req: Request, res: Response) => {
  try {
    const deviationThreshold = parseFloat(req.query.deviationThreshold as string) || 0.2;

    const healthStatus = await getProviderHealthStatus(deviationThreshold);

    res.json({
      success: true,
      data: {
        deviationThreshold,
        providers: healthStatus,
        summary: {
          total: healthStatus.length,
          healthy: healthStatus.filter((p) => p.status === 'healthy').length,
          warning: healthStatus.filter((p) => p.status === 'warning').length,
          critical: healthStatus.filter((p) => p.status === 'critical').length,
        },
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching provider health', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider health',
      message: error.message,
    });
  }
});

// =====================================================
// CACHE ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cache stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/cache/hit-rate
 * Get cache hit rate for a time period
 * Query params: startDate, endDate
 */
router.get('/cache/hit-rate', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const hitRate = await getCacheHitRate(start, end);

    res.json({
      success: true,
      data: {
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
        hitRate,
        hitRatePercentage: (hitRate * 100).toFixed(2),
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cache hit rate', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache hit rate',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/cache/hot-entries
 * Get most frequently cached prompts
 * Query params: limit (default: 10)
 */
router.get('/cache/hot-entries', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const hotEntries = await getHotCacheEntries(limit);

    res.json({
      success: true,
      data: {
        limit,
        entries: hotEntries,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching hot cache entries', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hot cache entries',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/cache/savings
 * Get cost savings from cache
 * Query params: startDate, endDate
 */
router.get('/cache/savings', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const savings = await getCacheSavings(start, end);

    res.json({
      success: true,
      data: {
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
        totalSavings: savings.totalSavings,
        requestsSaved: savings.requestsSaved,
        avgSavingsPerHit: savings.requestsSaved > 0
          ? savings.totalSavings / savings.requestsSaved
          : 0,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cache savings', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache savings',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/cache/:organizationId/status
 * Get cache status for an organization (middleware metrics)
 */
router.get('/cache/:organizationId/status', (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const status = getCacheStatus(organizationId);
    const hitRate = getMiddlewareCacheHitRate(organizationId);
    const efficiency = getCacheEfficiency(organizationId);

    res.json({
      success: true,
      data: {
        organizationId,
        ...status,
        hitRate,
        efficiency,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cache status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache status',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/cache/:organizationId/metrics
 * Get cache metrics for an organization
 */
router.get('/cache/:organizationId/metrics', (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const metrics = getCacheMetrics(organizationId);

    res.json({
      success: true,
      data: {
        organizationId,
        metrics,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cache metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache metrics',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai-ops/cache/cleanup
 * Manually trigger cache cleanup
 */
router.post('/cache/cleanup', async (req: Request, res: Response) => {
  try {
    const deletedCount = await cleanupExpiredCache();

    logger.info('[AIOpsMetricsRoutes] Manual cache cleanup triggered', { deletedCount });

    res.json({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} expired cache entries`,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error cleaning up cache', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup cache',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/cache/config
 * Get cache configuration
 */
router.get('/cache/config', (req: Request, res: Response) => {
  try {
    const config = getCacheConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('[AIOpsMetricsRoutes] Error fetching cache config', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache config',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/ai-ops/metrics/health
 * Health check for metrics system
 */
router.get('/metrics/health', (req: Request, res: Response) => {
  const cacheConfig = getCacheConfig();

  res.json({
    success: true,
    message: 'Metrics and analytics system is operational',
    version: '1.0.0',
    sprint: 70,
    features: {
      telemetryAggregation: true,
      providerHealth: true,
      caching: cacheConfig.enabled,
    },
  });
});

export default router;
