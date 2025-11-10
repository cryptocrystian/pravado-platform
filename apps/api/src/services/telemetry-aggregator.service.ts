// =====================================================
// TELEMETRY AGGREGATOR SERVICE
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// Aggregate and analyze provider/model performance trends

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getRecentTelemetry, getTelemetry } from '@pravado/utils/llm/metrics/telemetry';

// =====================================================
// TYPES
// =====================================================

export interface AggregatedMetrics {
  provider: string;
  model: string;
  period: string;              // e.g., "2025-11-04", "2025-11-04T14:00"
  avgLatencyMs: number;
  avgErrorRate: number;
  avgCostPerRequest: number;
  totalRequests: number;
  totalCost: number;
  successRate: number;
}

export interface ProviderHealthStatus {
  provider: string;
  model: string;
  status: 'healthy' | 'warning' | 'critical';
  currentLatency: number;
  baselineLatency: number;
  latencyDeviation: number;    // Percentage from baseline
  currentErrorRate: number;
  baselineErrorRate: number;
  errorDeviation: number;
  recommendations: string[];
}

export interface MetricsSummary {
  period: '1h' | '24h' | '7d' | '30d';
  startDate: Date;
  endDate: Date;
  totalRequests: number;
  totalCost: number;
  avgLatency: number;
  avgErrorRate: number;
  byProvider: Record<string, AggregatedMetrics>;
  byModel: Record<string, AggregatedMetrics>;
  trends: {
    costTrend: 'increasing' | 'stable' | 'decreasing';
    latencyTrend: 'increasing' | 'stable' | 'decreasing';
    errorTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

// =====================================================
// AGGREGATION FUNCTIONS
// =====================================================

/**
 * Aggregate metrics by provider for a time period
 */
export async function aggregateByProvider(
  startDate: Date,
  endDate: Date,
  organizationId?: string
): Promise<Record<string, AggregatedMetrics>> {
  try {
    let query = supabase
      .from('ai_usage_ledger')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error || !data) {
      logger.error('[TelemetryAggregator] Failed to fetch usage data', error);
      return {};
    }

    const providerMap = new Map<string, {
      requests: number;
      totalLatency: number;
      totalCost: number;
      successCount: number;
      errorCount: number;
    }>();

    // Aggregate by provider
    for (const record of data) {
      const key = `${record.provider}:${record.model}`;
      const existing = providerMap.get(key) || {
        requests: 0,
        totalLatency: 0,
        totalCost: 0,
        successCount: 0,
        errorCount: 0,
      };

      existing.requests++;
      existing.totalLatency += record.latency_ms || 0;
      existing.totalCost += parseFloat(record.estimated_cost_usd || '0');

      if (record.success) {
        existing.successCount++;
      } else {
        existing.errorCount++;
      }

      providerMap.set(key, existing);
    }

    // Convert to AggregatedMetrics
    const result: Record<string, AggregatedMetrics> = {};

    for (const [key, stats] of providerMap.entries()) {
      const [provider, model] = key.split(':');

      result[key] = {
        provider,
        model,
        period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
        avgLatencyMs: stats.requests > 0 ? stats.totalLatency / stats.requests : 0,
        avgErrorRate: stats.requests > 0 ? stats.errorCount / stats.requests : 0,
        avgCostPerRequest: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
        totalRequests: stats.requests,
        totalCost: stats.totalCost,
        successRate: stats.requests > 0 ? stats.successCount / stats.requests : 0,
      };
    }

    return result;
  } catch (error) {
    logger.error('[TelemetryAggregator] Exception in aggregateByProvider', error);
    return {};
  }
}

/**
 * Get hourly aggregates for the last N hours
 */
export async function getHourlyAggregates(
  hours: number = 24,
  organizationId?: string
): Promise<AggregatedMetrics[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

  try {
    let query = supabase
      .from('ai_usage_ledger')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error || !data) {
      logger.error('[TelemetryAggregator] Failed to fetch hourly data', error);
      return [];
    }

    // Group by hour + provider:model
    const hourlyMap = new Map<string, typeof data>();

    for (const record of data) {
      const hour = new Date(record.created_at);
      hour.setMinutes(0, 0, 0);
      const hourKey = `${hour.toISOString()}_${record.provider}:${record.model}`;

      const existing = hourlyMap.get(hourKey) || [];
      existing.push(record);
      hourlyMap.set(hourKey, existing);
    }

    // Aggregate each hour
    const results: AggregatedMetrics[] = [];

    for (const [key, records] of hourlyMap.entries()) {
      const [period, providerModel] = key.split('_');
      const [provider, model] = providerModel.split(':');

      const totalLatency = records.reduce((sum, r) => sum + (r.latency_ms || 0), 0);
      const totalCost = records.reduce((sum, r) => sum + parseFloat(r.estimated_cost_usd || '0'), 0);
      const successCount = records.filter(r => r.success).length;

      results.push({
        provider,
        model,
        period,
        avgLatencyMs: records.length > 0 ? totalLatency / records.length : 0,
        avgErrorRate: records.length > 0 ? (records.length - successCount) / records.length : 0,
        avgCostPerRequest: records.length > 0 ? totalCost / records.length : 0,
        totalRequests: records.length,
        totalCost,
        successRate: records.length > 0 ? successCount / records.length : 0,
      });
    }

    return results.sort((a, b) => a.period.localeCompare(b.period));
  } catch (error) {
    logger.error('[TelemetryAggregator] Exception in getHourlyAggregates', error);
    return [];
  }
}

// =====================================================
// HEALTH MONITORING
// =====================================================

/**
 * Calculate baseline metrics from historical data
 */
async function calculateBaseline(
  provider: string,
  model: string,
  days: number = 7
): Promise<{ latency: number; errorRate: number } | null> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const { data, error } = await supabase
      .from('ai_usage_ledger')
      .select('latency_ms, success')
      .eq('provider', provider)
      .eq('model', model)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !data || data.length === 0) {
      return null;
    }

    const totalLatency = data.reduce((sum, r) => sum + (r.latency_ms || 0), 0);
    const successCount = data.filter(r => r.success).length;

    return {
      latency: totalLatency / data.length,
      errorRate: (data.length - successCount) / data.length,
    };
  } catch (error) {
    logger.error('[TelemetryAggregator] Failed to calculate baseline', error);
    return null;
  }
}

/**
 * Get provider health status
 */
export async function getProviderHealthStatus(
  deviationThreshold: number = 0.2 // 20% deviation from baseline
): Promise<ProviderHealthStatus[]> {
  const telemetry = getRecentTelemetry();
  const results: ProviderHealthStatus[] = [];

  for (const [key, metrics] of Object.entries(telemetry)) {
    const { provider, model } = metrics;

    // Get baseline
    const baseline = await calculateBaseline(provider, model);

    if (!baseline) {
      // No baseline data, assume healthy
      results.push({
        provider,
        model,
        status: 'healthy',
        currentLatency: metrics.latencyMs,
        baselineLatency: 0,
        latencyDeviation: 0,
        currentErrorRate: metrics.errorRate,
        baselineErrorRate: 0,
        errorDeviation: 0,
        recommendations: ['Insufficient historical data for baseline comparison'],
      });
      continue;
    }

    // Calculate deviations
    const latencyDeviation = baseline.latency > 0
      ? (metrics.latencyMs - baseline.latency) / baseline.latency
      : 0;

    const errorDeviation = baseline.errorRate > 0
      ? (metrics.errorRate - baseline.errorRate) / baseline.errorRate
      : metrics.errorRate > 0 ? 1 : 0;

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    // Check error rate
    if (metrics.errorRate > 0.5) {
      status = 'critical';
      recommendations.push('Error rate exceeds 50% - provider may be circuit-broken');
    } else if (metrics.errorRate > 0.3 || errorDeviation > deviationThreshold) {
      status = status === 'critical' ? 'critical' : 'warning';
      recommendations.push(`Error rate ${(errorDeviation * 100).toFixed(0)}% above baseline`);
    }

    // Check latency
    if (latencyDeviation > deviationThreshold * 2) {
      status = 'critical';
      recommendations.push(`Latency ${(latencyDeviation * 100).toFixed(0)}% above baseline`);
    } else if (latencyDeviation > deviationThreshold) {
      status = status === 'critical' ? 'critical' : 'warning';
      recommendations.push(`Latency ${(latencyDeviation * 100).toFixed(0)}% above baseline`);
    }

    if (status === 'healthy') {
      recommendations.push('All metrics within normal range');
    }

    results.push({
      provider,
      model,
      status,
      currentLatency: metrics.latencyMs,
      baselineLatency: baseline.latency,
      latencyDeviation,
      currentErrorRate: metrics.errorRate,
      baselineErrorRate: baseline.errorRate,
      errorDeviation,
      recommendations,
    });
  }

  return results.sort((a, b) => {
    // Sort critical first, then warning, then healthy
    const statusOrder = { critical: 0, warning: 1, healthy: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
}

// =====================================================
// METRICS SUMMARY
// =====================================================

/**
 * Get comprehensive metrics summary for a period
 */
export async function getMetricsSummary(
  period: '1h' | '24h' | '7d' | '30d',
  organizationId?: string
): Promise<MetricsSummary> {
  const endDate = new Date();
  const hours = period === '1h' ? 1 : period === '24h' ? 24 : period === '7d' ? 168 : 720;
  const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

  // Get aggregated data
  const byProvider = await aggregateByProvider(startDate, endDate, organizationId);

  // Calculate totals
  let totalRequests = 0;
  let totalCost = 0;
  let totalLatency = 0;
  let totalErrors = 0;

  for (const metrics of Object.values(byProvider)) {
    totalRequests += metrics.totalRequests;
    totalCost += metrics.totalCost;
    totalLatency += metrics.avgLatencyMs * metrics.totalRequests;
    totalErrors += metrics.avgErrorRate * metrics.totalRequests;
  }

  const avgLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;
  const avgErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

  // Calculate trends (compare first half vs second half)
  const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
  const firstHalf = await aggregateByProvider(startDate, midDate, organizationId);
  const secondHalf = await aggregateByProvider(midDate, endDate, organizationId);

  const firstCost = Object.values(firstHalf).reduce((sum, m) => sum + m.totalCost, 0);
  const secondCost = Object.values(secondHalf).reduce((sum, m) => sum + m.totalCost, 0);

  const firstLatency = Object.values(firstHalf).reduce((sum, m) => sum + m.avgLatencyMs, 0) / Object.keys(firstHalf).length || 0;
  const secondLatency = Object.values(secondHalf).reduce((sum, m) => sum + m.avgLatencyMs, 0) / Object.keys(secondHalf).length || 0;

  const firstError = Object.values(firstHalf).reduce((sum, m) => sum + m.avgErrorRate, 0) / Object.keys(firstHalf).length || 0;
  const secondError = Object.values(secondHalf).reduce((sum, m) => sum + m.avgErrorRate, 0) / Object.keys(secondHalf).length || 0;

  const getTrend = (first: number, second: number): 'increasing' | 'stable' | 'decreasing' => {
    if (first === 0 || second === 0) return 'stable';
    const change = (second - first) / first;
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  };

  // Group by model (aggregate across providers)
  const byModel: Record<string, AggregatedMetrics> = {};
  for (const [key, metrics] of Object.entries(byProvider)) {
    const modelKey = metrics.model;
    if (!byModel[modelKey]) {
      byModel[modelKey] = { ...metrics };
    } else {
      byModel[modelKey].totalRequests += metrics.totalRequests;
      byModel[modelKey].totalCost += metrics.totalCost;
      byModel[modelKey].avgLatencyMs =
        (byModel[modelKey].avgLatencyMs * byModel[modelKey].totalRequests +
         metrics.avgLatencyMs * metrics.totalRequests) /
        (byModel[modelKey].totalRequests + metrics.totalRequests);
      byModel[modelKey].avgErrorRate =
        (byModel[modelKey].avgErrorRate * byModel[modelKey].totalRequests +
         metrics.avgErrorRate * metrics.totalRequests) /
        (byModel[modelKey].totalRequests + metrics.totalRequests);
    }
  }

  return {
    period,
    startDate,
    endDate,
    totalRequests,
    totalCost,
    avgLatency,
    avgErrorRate,
    byProvider,
    byModel,
    trends: {
      costTrend: getTrend(firstCost, secondCost),
      latencyTrend: getTrend(firstLatency, secondLatency),
      errorTrend: getTrend(firstError, secondError),
    },
  };
}

/**
 * Get cost breakdown by task category
 */
export async function getCostByTaskCategory(
  startDate: Date,
  endDate: Date,
  organizationId?: string
): Promise<Record<string, { cost: number; requests: number }>> {
  try {
    let query = supabase
      .from('ai_usage_ledger')
      .select('task_category, estimated_cost_usd')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error || !data) {
      logger.error('[TelemetryAggregator] Failed to fetch task category data', error);
      return {};
    }

    const categoryMap: Record<string, { cost: number; requests: number }> = {};

    for (const record of data) {
      const category = record.task_category || 'unknown';
      if (!categoryMap[category]) {
        categoryMap[category] = { cost: 0, requests: 0 };
      }
      categoryMap[category].cost += parseFloat(record.estimated_cost_usd || '0');
      categoryMap[category].requests++;
    }

    return categoryMap;
  } catch (error) {
    logger.error('[TelemetryAggregator] Exception in getCostByTaskCategory', error);
    return {};
  }
}
