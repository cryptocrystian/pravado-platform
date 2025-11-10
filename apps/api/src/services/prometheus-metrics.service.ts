// =====================================================
// PROMETHEUS METRICS SERVICE
// Sprint 74: Production Launch Hardening + Operational Telemetry
// =====================================================

import { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { logger } from './logger.service';

// =====================================================
// REGISTRY
// =====================================================

const register = new Registry();

// Collect default metrics (memory, CPU, event loop, etc.)
collectDefaultMetrics({ register });

// =====================================================
// HTTP METRICS
// =====================================================

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
});

const httpRequestSize = new Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

const httpResponseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register],
});

// =====================================================
// AI EXECUTION METRICS
// =====================================================

const aiRequestsTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['provider', 'model', 'organization_id', 'status'],
  registers: [register],
});

const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI request duration in seconds',
  labelNames: ['provider', 'model'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

const aiTokensUsed = new Counter({
  name: 'ai_tokens_used_total',
  help: 'Total AI tokens consumed',
  labelNames: ['provider', 'model', 'organization_id', 'token_type'],
  registers: [register],
});

const aiCostTotal = new Counter({
  name: 'ai_cost_usd_total',
  help: 'Total AI cost in USD',
  labelNames: ['provider', 'model', 'organization_id'],
  registers: [register],
});

// =====================================================
// DATABASE METRICS
// =====================================================

const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'],
  registers: [register],
});

// =====================================================
// REDIS METRICS
// =====================================================

const redisCommandsTotal = new Counter({
  name: 'redis_commands_total',
  help: 'Total number of Redis commands',
  labelNames: ['command', 'status'],
  registers: [register],
});

const redisCommandDuration = new Histogram({
  name: 'redis_command_duration_seconds',
  help: 'Redis command duration in seconds',
  labelNames: ['command'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register],
});

const redisCacheHits = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['cache_key_prefix'],
  registers: [register],
});

const redisCacheMisses = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['cache_key_prefix'],
  registers: [register],
});

// =====================================================
// BUSINESS METRICS
// =====================================================

const activeTrialsGauge = new Gauge({
  name: 'active_trials_total',
  help: 'Number of active trial organizations',
  registers: [register],
});

const trialConversionsTotal = new Counter({
  name: 'trial_conversions_total',
  help: 'Total trial to paid conversions',
  labelNames: ['tier'],
  registers: [register],
});

const activeSubscriptionsGauge = new Gauge({
  name: 'active_subscriptions_total',
  help: 'Number of active paid subscriptions',
  labelNames: ['tier'],
  registers: [register],
});

const invoicesPaidTotal = new Counter({
  name: 'invoices_paid_total',
  help: 'Total invoices successfully paid',
  registers: [register],
});

const invoicesFailedTotal = new Counter({
  name: 'invoices_failed_total',
  help: 'Total failed invoice payments',
  registers: [register],
});

const revenueTotal = new Counter({
  name: 'revenue_usd_total',
  help: 'Total revenue in USD',
  registers: [register],
});

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Express middleware to collect HTTP metrics
 */
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Track request size
    const requestSize = parseInt(req.headers['content-length'] || '0', 10);
    if (requestSize > 0) {
      httpRequestSize.observe(
        { method: req.method, route: req.route?.path || req.path },
        requestSize
      );
    }

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      // Track response size
      const responseSize = Buffer.byteLength(JSON.stringify(data || ''));
      httpResponseSize.observe(
        { method: req.method, route: req.route?.path || req.path },
        responseSize
      );

      return originalSend.call(this, data);
    };

    // On response finish
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const route = req.route?.path || req.path;
      const statusCode = res.statusCode.toString();

      // Increment request counter
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });

      // Record request duration
      httpRequestDuration.observe(
        { method: req.method, route, status_code: statusCode },
        duration
      );
    });

    next();
  };
}

// =====================================================
// METRIC HELPERS
// =====================================================

/**
 * Track AI request metrics
 */
export function trackAIRequest(
  provider: string,
  model: string,
  organizationId: string,
  duration_seconds: number,
  tokensIn: number,
  tokensOut: number,
  costUsd: number,
  status: 'success' | 'error'
): void {
  aiRequestsTotal.inc({ provider, model, organization_id: organizationId, status });
  aiRequestDuration.observe({ provider, model }, duration_seconds);
  aiTokensUsed.inc({ provider, model, organization_id: organizationId, token_type: 'input' }, tokensIn);
  aiTokensUsed.inc({ provider, model, organization_id: organizationId, token_type: 'output' }, tokensOut);
  aiCostTotal.inc({ provider, model, organization_id: organizationId }, costUsd);
}

/**
 * Track database query metrics
 */
export function trackDBQuery(
  operation: string,
  table: string,
  duration_seconds: number,
  status: 'success' | 'error'
): void {
  dbQueriesTotal.inc({ operation, table, status });
  dbQueryDuration.observe({ operation, table }, duration_seconds);
}

/**
 * Track Redis command metrics
 */
export function trackRedisCommand(
  command: string,
  duration_seconds: number,
  status: 'success' | 'error'
): void {
  redisCommandsTotal.inc({ command, status });
  redisCommandDuration.observe({ command }, duration_seconds);
}

/**
 * Track Redis cache hit/miss
 */
export function trackCacheHit(keyPrefix: string, hit: boolean): void {
  if (hit) {
    redisCacheHits.inc({ cache_key_prefix: keyPrefix });
  } else {
    redisCacheMisses.inc({ cache_key_prefix: keyPrefix });
  }
}

/**
 * Update active trials gauge
 */
export function updateActiveTrials(count: number): void {
  activeTrialsGauge.set(count);
}

/**
 * Track trial conversion
 */
export function trackTrialConversion(tier: string): void {
  trialConversionsTotal.inc({ tier });
}

/**
 * Update active subscriptions gauge
 */
export function updateActiveSubscriptions(tier: string, count: number): void {
  activeSubscriptionsGauge.set({ tier }, count);
}

/**
 * Track invoice payment
 */
export function trackInvoicePayment(success: boolean, amountUsd?: number): void {
  if (success) {
    invoicesPaidTotal.inc();
    if (amountUsd) {
      revenueTotal.inc(amountUsd);
    }
  } else {
    invoicesFailedTotal.inc();
  }
}

/**
 * Get metrics endpoint handler
 */
export async function getMetrics(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    logger.error('Failed to get Prometheus metrics', { error: err.message });
    res.status(500).end(err.message);
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  register,
  metricsMiddleware,
  getMetrics,
  trackAIRequest,
  trackDBQuery,
  trackRedisCommand,
  trackCacheHit,
  updateActiveTrials,
  trackTrialConversion,
  updateActiveSubscriptions,
  trackInvoicePayment,
};
