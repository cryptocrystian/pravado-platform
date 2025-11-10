// =====================================================
// OBSERVABILITY SERVICE
// Sprint 74: Production Launch Hardening + Operational Telemetry
// =====================================================

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger.service';

// =====================================================
// TYPES
// =====================================================

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  [key: string]: any;
}

export interface PerformanceMetric {
  operation: string;
  duration_ms: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
}

// =====================================================
// SENTRY INITIALIZATION
// =====================================================

let sentryInitialized = false;

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeSentry(): void {
  if (sentryInitialized) {
    logger.warn('Sentry already initialized');
    return;
  }

  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.warn('SENTRY_DSN not configured, skipping Sentry initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '2.0.0',

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Integrations
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined as any }),
      ],

      // Filter out health check noise
      beforeSend(event, hint) {
        const url = event.request?.url || '';

        // Don't send health check errors
        if (url.includes('/health') || url.includes('/status') || url.includes('/ready') || url.includes('/live')) {
          return null;
        }

        // Don't send 404s for favicon, robots.txt, etc.
        if (event.exception?.values?.[0]?.value?.includes('ENOENT') &&
            (url.includes('favicon') || url.includes('robots.txt'))) {
          return null;
        }

        return event;
      },

      // Capture breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      },
    });

    sentryInitialized = true;
    logger.info('Sentry initialized successfully', {
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version,
    });
  } catch (err: any) {
    logger.error('Failed to initialize Sentry', { error: err.message });
  }
}

// =====================================================
// ERROR TRACKING
// =====================================================

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: ErrorContext): void {
  if (!sentryInitialized) {
    logger.error('Exception occurred (Sentry not initialized)', {
      error: error.message,
      stack: error.stack,
      context,
    });
    return;
  }

  Sentry.withScope((scope) => {
    // Add custom context
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, value?.toString() || 'unknown');
      });

      scope.setContext('custom', context);
    }

    // Set user context if available
    if (context?.userId || context?.organizationId) {
      scope.setUser({
        id: context.userId,
        organization_id: context.organizationId,
      });
    }

    Sentry.captureException(error);
  });

  // Also log to standard logger
  logger.error('Exception captured', {
    error: error.message,
    stack: error.stack,
    context,
  });
}

/**
 * Capture message with severity level
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: ErrorContext
): void {
  if (!sentryInitialized) {
    logger[level === 'fatal' ? 'error' : level](message, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, value?.toString() || 'unknown');
      });

      scope.setContext('custom', context);
    }

    Sentry.captureMessage(message, level as any);
  });

  logger[level === 'fatal' ? 'error' : level](message, context);
}

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  operation: string,
  context?: Record<string, any>
): Sentry.Transaction | null {
  if (!sentryInitialized) {
    return null;
  }

  const transaction = Sentry.startTransaction({
    name,
    op: operation,
    data: context,
  });

  return transaction;
}

/**
 * Track performance metric
 */
export function trackPerformance(metric: PerformanceMetric): void {
  // Log performance metrics
  logger.info('Performance metric', metric);

  // Send to Sentry as breadcrumb
  if (sentryInitialized) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metric.operation}: ${metric.duration_ms}ms`,
      level: metric.success ? 'info' : 'warning',
      data: {
        duration_ms: metric.duration_ms,
        success: metric.success,
        ...metric.metadata,
      },
    });
  }
}

/**
 * Create performance timer
 */
export function createPerformanceTimer(operation: string) {
  const startTime = Date.now();

  return {
    end: (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      trackPerformance({
        operation,
        duration_ms: duration,
        success,
        metadata,
      });
      return duration;
    },
  };
}

// =====================================================
// REQUEST TRACING
// =====================================================

/**
 * Add request context to scope
 */
export function setRequestContext(req: any): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      query: req.query,
      ip: req.ip,
    });

    // Set user if authenticated
    if (req.user) {
      scope.setUser({
        id: req.user.id,
        email: req.user.email,
        organization_id: req.user.organizationId,
      });
    }
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Express middleware for Sentry request handling
 */
export function sentryRequestHandler() {
  if (!sentryInitialized) {
    return (req: any, res: any, next: any) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Express middleware for Sentry error handling
 */
export function sentryErrorHandler() {
  if (!sentryInitialized) {
    return (err: any, req: any, res: any, next: any) => next(err);
  }
  return Sentry.Handlers.errorHandler();
}

/**
 * Express middleware for Sentry tracing
 */
export function sentryTracingHandler() {
  if (!sentryInitialized) {
    return (req: any, res: any, next: any) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

// =====================================================
// DATADOG INTEGRATION (PLACEHOLDER)
// =====================================================

/**
 * Send custom metric to Datadog
 */
export function sendDatadogMetric(
  metric: string,
  value: number,
  tags?: Record<string, string>
): void {
  if (!process.env.DATADOG_API_KEY) {
    return;
  }

  // TODO: Implement Datadog metrics API integration
  logger.debug('Datadog metric (not yet implemented)', {
    metric,
    value,
    tags,
  });
}

/**
 * Send custom event to Datadog
 */
export function sendDatadogEvent(
  title: string,
  text: string,
  tags?: Record<string, string>
): void {
  if (!process.env.DATADOG_API_KEY) {
    return;
  }

  // TODO: Implement Datadog events API integration
  logger.debug('Datadog event (not yet implemented)', {
    title,
    text,
    tags,
  });
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  initializeSentry,
  captureException,
  captureMessage,
  startTransaction,
  trackPerformance,
  createPerformanceTimer,
  setRequestContext,
  addBreadcrumb,
  sentryRequestHandler,
  sentryErrorHandler,
  sentryTracingHandler,
  sendDatadogMetric,
  sendDatadogEvent,
};
