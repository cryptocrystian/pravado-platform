// =====================================================
// RATE LIMITING MIDDLEWARE
// Sprint 74: Production Launch Hardening + Operational Telemetry
// =====================================================

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from '../services/logger.service';

// =====================================================
// REDIS CLIENT
// =====================================================

let redisClient: Redis | null = null;

try {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (redisUrl) {
    redisClient = new Redis(redisUrl);
    logger.info('Redis connected for rate limiting');
  } else {
    logger.warn('Redis not configured, using in-memory rate limiting');
  }
} catch (err: any) {
  logger.error('Failed to connect Redis for rate limiting', { error: err.message });
}

// =====================================================
// RATE LIMIT CONFIGURATIONS
// =====================================================

/**
 * Default rate limiter: 100 requests per minute
 */
export const defaultRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: 60,
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store: redisClient
    ? new RedisStore({
        // @ts-ignore - RedisStore expects ioredis client
        client: redisClient,
        prefix: 'rl:default:',
      })
    : undefined, // Falls back to memory store if Redis unavailable
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: 60,
    });
  },
});

/**
 * Strict rate limiter for auth endpoints: 5 requests per minute
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient
    ? new RedisStore({
        // @ts-ignore
        client: redisClient,
        prefix: 'rl:auth:',
      })
    : undefined,
  keyGenerator: (req) => req.ip || 'unknown',
  skipSuccessfulRequests: true, // Don't count successful login attempts
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again in 1 minute',
      retryAfter: 60,
    });
  },
});

/**
 * API rate limiter for AI operations: 20 requests per minute
 */
export const aiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60000, // 1 minute
  max: 20,
  message: {
    success: false,
    error: 'Too many AI requests, please try again later',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient
    ? new RedisStore({
        // @ts-ignore
        client: redisClient,
        prefix: 'rl:ai:',
      })
    : undefined,
  keyGenerator: (req) => {
    // Rate limit by organization ID for AI requests
    return req.user?.organizationId || req.user?.id || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logger.warn('AI rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'AI request rate limit exceeded. Please upgrade your plan for higher limits.',
      retryAfter: 60,
    });
  },
});

/**
 * Webhook rate limiter: 30 requests per minute
 */
export const webhookRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Too many webhook requests',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient
    ? new RedisStore({
        // @ts-ignore
        client: redisClient,
        prefix: 'rl:webhook:',
      })
    : undefined,
  keyGenerator: (req) => {
    // Rate limit by webhook source (Stripe, Mailgun, etc.)
    const webhookSource = req.headers['user-agent'] || req.ip || 'unknown';
    return webhookSource.toString();
  },
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded', {
      source: req.headers['user-agent'],
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Webhook rate limit exceeded',
    });
  },
});

/**
 * Signup rate limiter: 3 signups per hour per IP
 */
export const signupRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many signup attempts from this IP, please try again later',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient
    ? new RedisStore({
        // @ts-ignore
        client: redisClient,
        prefix: 'rl:signup:',
      })
    : undefined,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res) => {
    logger.warn('Signup rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
    });
    res.status(429).json({
      success: false,
      error: 'Too many signup attempts. Please try again in 1 hour.',
      retryAfter: 3600,
    });
  },
});

/**
 * Admin endpoints rate limiter: 50 requests per minute
 */
export const adminRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60000, // 1 minute
  max: 50,
  message: {
    success: false,
    error: 'Too many admin requests',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient
    ? new RedisStore({
        // @ts-ignore
        client: redisClient,
        prefix: 'rl:admin:',
      })
    : undefined,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many admin requests',
    });
  },
});

// =====================================================
// CUSTOM RATE LIMITER FACTORY
// =====================================================

/**
 * Create custom rate limiter with specific configuration
 */
export function createRateLimiter(config: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
  keyGenerator?: (req: any) => string;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: config.message,
      retryAfter: Math.ceil(config.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient
      ? new RedisStore({
          // @ts-ignore
          client: redisClient,
          prefix: `rl:${config.keyPrefix}:`,
        })
      : undefined,
    keyGenerator: config.keyGenerator || ((req) => req.ip || 'unknown'),
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded: ${config.keyPrefix}`, {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
  });
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  defaultRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  webhookRateLimiter,
  signupRateLimiter,
  adminRateLimiter,
  createRateLimiter,
};
