// =====================================================
// HEALTH CHECK ROUTES
// Sprint 74: Production Launch Hardening + Operational Telemetry
// =====================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../services/logger.service';
import Redis from 'ioredis';

const router = Router();

// Redis client (reuse existing or create)
let redisClient: Redis | null = null;
try {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (redisUrl) {
    redisClient = new Redis(redisUrl);
  }
} catch (err: any) {
  logger.warn('Redis not available for health checks', { error: err.message });
}

// =====================================================
// TYPES
// =====================================================

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: CheckDetail;
    redis: CheckDetail;
    llm?: CheckDetail;
  };
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

interface CheckDetail {
  status: 'pass' | 'fail' | 'warn';
  latency_ms?: number;
  message?: string;
  error?: string;
}

interface StatusResponse {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: CheckDetail;
    redis: CheckDetail;
    llm: CheckDetail;
    disk?: CheckDetail;
    memory?: CheckDetail;
  };
  timestamp: string;
}

// =====================================================
// HEALTH CHECK FUNCTIONS
// =====================================================

/**
 * Check database connectivity and latency
 */
async function checkDatabase(): Promise<CheckDetail> {
  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return {
        status: 'fail',
        latency_ms: latency,
        error: error.message,
      };
    }

    // Warn if latency > 500ms
    if (latency > 500) {
      return {
        status: 'warn',
        latency_ms: latency,
        message: 'Database latency high',
      };
    }

    return {
      status: 'pass',
      latency_ms: latency,
    };
  } catch (err: any) {
    return {
      status: 'fail',
      latency_ms: Date.now() - startTime,
      error: err.message,
    };
  }
}

/**
 * Check Redis connectivity and latency
 */
async function checkRedis(): Promise<CheckDetail> {
  if (!redisClient) {
    return {
      status: 'warn',
      message: 'Redis not configured',
    };
  }

  const startTime = Date.now();
  try {
    await redisClient.ping();
    const latency = Date.now() - startTime;

    // Warn if latency > 100ms
    if (latency > 100) {
      return {
        status: 'warn',
        latency_ms: latency,
        message: 'Redis latency high',
      };
    }

    return {
      status: 'pass',
      latency_ms: latency,
    };
  } catch (err: any) {
    return {
      status: 'fail',
      latency_ms: Date.now() - startTime,
      error: err.message,
    };
  }
}

/**
 * Check LLM provider availability and latency
 */
async function checkLLM(): Promise<CheckDetail> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: 'warn',
      message: 'LLM provider not configured',
    };
  }

  const startTime = Date.now();
  try {
    // Simple API health check (not a full generation)
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'fail',
        latency_ms: latency,
        error: `OpenAI API returned ${response.status}`,
      };
    }

    // Warn if latency > 1000ms
    if (latency > 1000) {
      return {
        status: 'warn',
        latency_ms: latency,
        message: 'LLM API latency high',
      };
    }

    return {
      status: 'pass',
      latency_ms: latency,
    };
  } catch (err: any) {
    return {
      status: 'fail',
      latency_ms: Date.now() - startTime,
      error: err.message,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckDetail {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (heapUsagePercent > 90) {
    return {
      status: 'fail',
      message: `Memory usage critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
    };
  }

  if (heapUsagePercent > 75) {
    return {
      status: 'warn',
      message: `Memory usage high: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
    };
  }

  return {
    status: 'pass',
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
  };
}

// =====================================================
// ROUTES
// =====================================================

/**
 * GET /api/health
 * Simple health check for load balancers
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // Lightweight check - just DB ping
    const dbCheck = await checkDatabase();

    if (dbCheck.status === 'fail') {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Database unavailable',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err: any) {
    logger.error('Health check failed', { error: err.message });
    res.status(503).json({
      status: 'unhealthy',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/status
 * Comprehensive system status with all checks
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    // Run all checks in parallel
    const [dbCheck, redisCheck, llmCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkLLM(),
    ]);

    const memCheck = checkMemory();

    // Determine overall status
    let overallStatus: 'operational' | 'degraded' | 'down' = 'operational';

    if (
      dbCheck.status === 'fail' ||
      memCheck.status === 'fail'
    ) {
      overallStatus = 'down';
    } else if (
      dbCheck.status === 'warn' ||
      redisCheck.status === 'warn' ||
      llmCheck.status === 'warn' ||
      memCheck.status === 'warn'
    ) {
      overallStatus = 'degraded';
    }

    const statusResponse: StatusResponse = {
      service: 'Pravado API',
      status: overallStatus,
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: {
        database: dbCheck,
        redis: redisCheck,
        llm: llmCheck,
        memory: memCheck,
      },
      timestamp: new Date().toISOString(),
    };

    const statusCode = overallStatus === 'down' ? 503 : 200;
    res.status(statusCode).json(statusResponse);

    // Log if degraded or down
    if (overallStatus !== 'operational') {
      logger.warn('System status degraded', {
        status: overallStatus,
        checks: statusResponse.checks,
      });
    }
  } catch (err: any) {
    logger.error('Status check failed', { error: err.message });
    res.status(500).json({
      service: 'Pravado API',
      status: 'down',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check critical dependencies
    const [dbCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    // Service is ready if DB is accessible
    if (dbCheck.status === 'fail') {
      res.status(503).json({
        ready: false,
        reason: 'Database not accessible',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Readiness check failed', { error: err.message });
    res.status(503).json({
      ready: false,
      reason: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (req: Request, res: Response): void => {
  // Simple liveness check - process is alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// =====================================================
// EXPORTS
// =====================================================

export default router;
