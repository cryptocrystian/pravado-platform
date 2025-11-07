// =====================================================
// LLM TELEMETRY WITH EWMA TRACKING
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Standalone module for tracking latency and error rates using
// Exponentially Weighted Moving Average (EWMA) for responsive metrics

export interface TelemetryMetrics {
  provider: string;
  model: string;
  latencyMs: number;      // EWMA latency in milliseconds
  errorRate: number;      // EWMA error rate (0-1)
  requestCount: number;   // Total requests tracked
  lastUpdated: Date;
}

export interface RequestRecord {
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  estimatedCost: number;
  timestamp: Date;
}

// =====================================================
// EWMA CONFIGURATION
// =====================================================

// Alpha determines how responsive the EWMA is to new values
// - Lower alpha (e.g., 0.1) = more stable, slower to react
// - Higher alpha (e.g., 0.5) = more responsive, faster to react
// - 0.3 provides good balance for LLM performance tracking
const EWMA_ALPHA = parseFloat(process.env.LLM_TELEMETRY_EWMA_ALPHA || '0.3');

// Maximum age for telemetry data (older data is reset)
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// =====================================================
// IN-MEMORY TELEMETRY STORE
// =====================================================

// Store telemetry by provider:model key
const telemetryStore = new Map<string, TelemetryMetrics>();

/**
 * Generate storage key for provider:model combination
 */
function getKey(provider: string, model: string): string {
  return `${provider}:${model}`;
}

// =====================================================
// EWMA CALCULATION
// =====================================================

/**
 * Calculate EWMA (Exponentially Weighted Moving Average)
 * Formula: EWMA_new = alpha * newValue + (1 - alpha) * EWMA_old
 *
 * @param currentEWMA - Current EWMA value
 * @param newValue - New observation
 * @param alpha - Smoothing factor (0-1)
 */
function calculateEWMA(currentEWMA: number, newValue: number, alpha: number): number {
  return alpha * newValue + (1 - alpha) * currentEWMA;
}

// =====================================================
// RECORDING FUNCTIONS
// =====================================================

/**
 * Record a request and update telemetry with EWMA
 */
export function recordRequest(
  provider: string,
  model: string,
  latencyMs: number,
  success: boolean,
  _estimatedCost: number = 0
): void {
  const key = getKey(provider, model);
  const now = new Date();

  const existing = telemetryStore.get(key);

  if (!existing) {
    // First request for this provider:model
    telemetryStore.set(key, {
      provider,
      model,
      latencyMs,
      errorRate: success ? 0 : 1,
      requestCount: 1,
      lastUpdated: now,
    });
    return;
  }

  // Check if data is stale (older than MAX_AGE_MS)
  const ageMs = now.getTime() - existing.lastUpdated.getTime();
  if (ageMs > MAX_AGE_MS) {
    // Reset with new values
    telemetryStore.set(key, {
      provider,
      model,
      latencyMs,
      errorRate: success ? 0 : 1,
      requestCount: 1,
      lastUpdated: now,
    });
    return;
  }

  // Update with EWMA
  const newLatencyEWMA = calculateEWMA(existing.latencyMs, latencyMs, EWMA_ALPHA);
  const errorValue = success ? 0 : 1;
  const newErrorRateEWMA = calculateEWMA(existing.errorRate, errorValue, EWMA_ALPHA);

  telemetryStore.set(key, {
    provider,
    model,
    latencyMs: newLatencyEWMA,
    errorRate: newErrorRateEWMA,
    requestCount: existing.requestCount + 1,
    lastUpdated: now,
  });
}

/**
 * Batch record multiple requests
 */
export function recordRequests(records: RequestRecord[]): void {
  for (const record of records) {
    recordRequest(
      record.provider,
      record.model,
      record.latencyMs,
      record.success,
      record.estimatedCost
    );
  }
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Get telemetry for a specific provider:model
 */
export function getTelemetry(provider: string, model: string): TelemetryMetrics | null {
  const key = getKey(provider, model);
  const metrics = telemetryStore.get(key);

  if (!metrics) return null;

  // Check if stale
  const ageMs = Date.now() - metrics.lastUpdated.getTime();
  if (ageMs > MAX_AGE_MS) {
    telemetryStore.delete(key);
    return null;
  }

  return metrics;
}

/**
 * Get all recent telemetry (last 24h)
 * Returns map of provider:model -> metrics
 */
export function getRecentTelemetry(): Record<string, TelemetryMetrics> {
  const now = Date.now();
  const result: Record<string, TelemetryMetrics> = {};

  for (const [key, metrics] of telemetryStore.entries()) {
    const ageMs = now - metrics.lastUpdated.getTime();

    // Skip stale data
    if (ageMs > MAX_AGE_MS) {
      telemetryStore.delete(key);
      continue;
    }

    result[key] = metrics;
  }

  return result;
}

/**
 * Get telemetry for all models of a specific provider
 */
export function getProviderTelemetry(provider: string): TelemetryMetrics[] {
  const all = getRecentTelemetry();
  return Object.values(all).filter((m) => m.provider === provider);
}

/**
 * Get average latency across all providers/models
 */
export function getAverageLatency(): number {
  const all = getRecentTelemetry();
  const values = Object.values(all);

  if (values.length === 0) return 0;

  const sum = values.reduce((acc, m) => acc + m.latencyMs, 0);
  return sum / values.length;
}

/**
 * Get average error rate across all providers/models
 */
export function getAverageErrorRate(): number {
  const all = getRecentTelemetry();
  const values = Object.values(all);

  if (values.length === 0) return 0;

  const sum = values.reduce((acc, m) => acc + m.errorRate, 0);
  return sum / values.length;
}

// =====================================================
// MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Clear all telemetry data
 * Useful for testing or resetting metrics
 */
export function clearTelemetry(): void {
  telemetryStore.clear();
}

/**
 * Clear telemetry for a specific provider:model
 */
export function clearModelTelemetry(provider: string, model: string): void {
  const key = getKey(provider, model);
  telemetryStore.delete(key);
}

/**
 * Get telemetry store size (number of tracked models)
 */
export function getTelemetrySize(): number {
  return telemetryStore.size;
}

/**
 * Prune stale telemetry data
 * Returns number of entries removed
 */
export function pruneStaleData(): number {
  const now = Date.now();
  let removed = 0;

  for (const [key, metrics] of telemetryStore.entries()) {
    const ageMs = now - metrics.lastUpdated.getTime();
    if (ageMs > MAX_AGE_MS) {
      telemetryStore.delete(key);
      removed++;
    }
  }

  return removed;
}

// =====================================================
// CIRCUIT BREAKER DETECTION
// =====================================================

/**
 * Check if a provider:model should be circuit-broken
 * Based on error rate threshold
 *
 * @param provider - Provider name
 * @param model - Model name
 * @param errorThreshold - Error rate threshold (0-1), default 0.5 (50%)
 * @returns true if error rate exceeds threshold
 */
export function shouldCircuitBreak(
  provider: string,
  model: string,
  errorThreshold: number = 0.5
): boolean {
  const metrics = getTelemetry(provider, model);
  if (!metrics) return false;

  // Need at least 5 requests before circuit breaking
  if (metrics.requestCount < 5) return false;

  return metrics.errorRate > errorThreshold;
}

/**
 * Get all provider:model combinations that should be circuit-broken
 */
export function getCircuitBrokenModels(errorThreshold: number = 0.5): string[] {
  const all = getRecentTelemetry();
  const broken: string[] = [];

  for (const [key, metrics] of Object.entries(all)) {
    if (metrics.requestCount >= 5 && metrics.errorRate > errorThreshold) {
      broken.push(key);
    }
  }

  return broken;
}

// =====================================================
// EXPORT TELEMETRY SNAPSHOT
// =====================================================

/**
 * Export current telemetry state for debugging/reporting
 */
export function exportTelemetrySnapshot(): {
  timestamp: Date;
  totalModels: number;
  avgLatency: number;
  avgErrorRate: number;
  metrics: TelemetryMetrics[];
} {
  const all = getRecentTelemetry();
  const values = Object.values(all);

  return {
    timestamp: new Date(),
    totalModels: values.length,
    avgLatency: getAverageLatency(),
    avgErrorRate: getAverageErrorRate(),
    metrics: values.sort((a, b) => a.latencyMs - b.latencyMs),
  };
}
