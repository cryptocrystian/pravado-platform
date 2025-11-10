// =====================================================
// BILLING LEDGER SERVICE
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================
// Daily usage aggregation for billing

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getPolicyWithDefaults } from './llm-policy.service';

// =====================================================
// TYPES
// =====================================================

export interface DailyUsage {
  organizationId: string;
  date: string;
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byProvider: Record<string, { requests: number; cost: number }>;
  byModel: Record<string, { requests: number; cost: number }>;
  byTaskCategory: Record<string, { requests: number; cost: number }>;
  cacheHits: number;
  cacheMisses: number;
  cacheCostSaved: number;
  avgLatencyMs: number;
  avgErrorRate: number;
  successRate: number;
  planTier: string;
}

export interface UnbilledUsage {
  date: string;
  totalCost: number;
  totalRequests: number;
  planTier: string;
}

export interface UsageSummary {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  avgDailyCost: number;
  cacheHitRate: number;
  avgLatency: number;
}

// =====================================================
// DAILY AGGREGATION
// =====================================================

/**
 * Aggregate usage for a specific day and organization
 * Call this at end of day or via cron job
 */
export async function aggregateDailyUsage(
  organizationId: string,
  date: Date = new Date()
): Promise<DailyUsage | null> {
  try {
    const dateStr = date.toISOString().split('T')[0];

    logger.info('[BillingLedger] Aggregating daily usage', {
      organizationId,
      date: dateStr,
    });

    // Get all usage for this org on this date
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: usageRecords, error } = await supabase
      .from('ai_usage_ledger')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (error) {
      logger.error('[BillingLedger] Failed to fetch usage records', error);
      return null;
    }

    if (!usageRecords || usageRecords.length === 0) {
      logger.info('[BillingLedger] No usage records for date', {
        organizationId,
        date: dateStr,
      });
      return null;
    }

    // Aggregate metrics
    const byProvider: Record<string, { requests: number; cost: number }> = {};
    const byModel: Record<string, { requests: number; cost: number }> = {};
    const byTaskCategory: Record<string, { requests: number; cost: number }> = {};

    let totalRequests = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCostUsd = 0;
    let totalLatency = 0;
    let totalErrors = 0;
    let successCount = 0;

    for (const record of usageRecords) {
      totalRequests++;
      totalTokensIn += record.tokens_in || 0;
      totalTokensOut += record.tokens_out || 0;
      totalCostUsd += parseFloat(record.estimated_cost_usd || '0');
      totalLatency += record.latency_ms || 0;

      if (record.success) {
        successCount++;
      } else {
        totalErrors++;
      }

      // By provider
      const providerKey = record.provider;
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = { requests: 0, cost: 0 };
      }
      byProvider[providerKey].requests++;
      byProvider[providerKey].cost += parseFloat(record.estimated_cost_usd || '0');

      // By model
      const modelKey = record.model;
      if (!byModel[modelKey]) {
        byModel[modelKey] = { requests: 0, cost: 0 };
      }
      byModel[modelKey].requests++;
      byModel[modelKey].cost += parseFloat(record.estimated_cost_usd || '0');

      // By task category
      const taskKey = record.task_category || 'unknown';
      if (!byTaskCategory[taskKey]) {
        byTaskCategory[taskKey] = { requests: 0, cost: 0 };
      }
      byTaskCategory[taskKey].requests++;
      byTaskCategory[taskKey].cost += parseFloat(record.estimated_cost_usd || '0');
    }

    // Get cache metrics from cache middleware (if available)
    const cacheMetrics = await getCacheMetricsForDate(organizationId, date);

    // Get current plan tier
    const policy = await getPolicyWithDefaults(organizationId);
    const planTier = await getOrganizationPlanTier(organizationId);

    const dailyUsage: DailyUsage = {
      organizationId,
      date: dateStr,
      totalRequests,
      totalTokensIn,
      totalTokensOut,
      totalCostUsd,
      byProvider,
      byModel,
      byTaskCategory,
      cacheHits: cacheMetrics.hits,
      cacheMisses: cacheMetrics.misses,
      cacheCostSaved: cacheMetrics.costSaved,
      avgLatencyMs: totalRequests > 0 ? totalLatency / totalRequests : 0,
      avgErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      successRate: totalRequests > 0 ? successCount / totalRequests : 1.0,
      planTier,
    };

    // Store in billing_usage_ledger
    await storeDailyUsage(dailyUsage);

    logger.info('[BillingLedger] Daily usage aggregated', {
      organizationId,
      date: dateStr,
      totalCost: totalCostUsd.toFixed(6),
      totalRequests,
    });

    return dailyUsage;
  } catch (error) {
    logger.error('[BillingLedger] Error aggregating daily usage', error);
    return null;
  }
}

/**
 * Store daily usage in billing ledger
 */
async function storeDailyUsage(usage: DailyUsage): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('billing_usage_ledger')
      .upsert({
        organization_id: usage.organizationId,
        date: usage.date,
        total_requests: usage.totalRequests,
        total_tokens_in: usage.totalTokensIn,
        total_tokens_out: usage.totalTokensOut,
        total_cost_usd: usage.totalCostUsd,
        by_provider: usage.byProvider,
        by_model: usage.byModel,
        by_task_category: usage.byTaskCategory,
        cache_hits: usage.cacheHits,
        cache_misses: usage.cacheMisses,
        cache_cost_saved: usage.cacheCostSaved,
        avg_latency_ms: usage.avgLatencyMs,
        avg_error_rate: usage.avgErrorRate,
        success_rate: usage.successRate,
        plan_tier: usage.planTier,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('[BillingLedger] Failed to store daily usage', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[BillingLedger] Exception storing daily usage', error);
    return false;
  }
}

/**
 * Get cache metrics for a specific date
 */
async function getCacheMetricsForDate(
  organizationId: string,
  date: Date
): Promise<{ hits: number; misses: number; costSaved: number }> {
  // TODO: Query cache hits/misses from middleware metrics or cache tables
  // For now, return zeros - this will be populated when cache middleware logs to DB
  return {
    hits: 0,
    misses: 0,
    costSaved: 0,
  };
}

/**
 * Get organization plan tier
 */
async function getOrganizationPlanTier(organizationId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('plan_tier')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      logger.warn('[BillingLedger] Failed to get plan tier, defaulting to trial', {
        organizationId,
      });
      return 'trial';
    }

    return data.plan_tier || 'trial';
  } catch (error) {
    logger.error('[BillingLedger] Error getting plan tier', error);
    return 'trial';
  }
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Get unbilled usage for an organization
 */
export async function getUnbilledUsage(
  organizationId: string
): Promise<UnbilledUsage[]> {
  try {
    const { data, error } = await supabase.rpc('get_unbilled_usage', {
      org_id: organizationId,
    });

    if (error) {
      logger.error('[BillingLedger] Failed to get unbilled usage', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('[BillingLedger] Exception getting unbilled usage', error);
    return [];
  }
}

/**
 * Get usage summary for date range
 */
export async function getUsageSummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_usage_summary', {
      org_id: organizationId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    if (error || !data || data.length === 0) {
      logger.error('[BillingLedger] Failed to get usage summary', error);
      return null;
    }

    const summary = data[0];

    return {
      totalCost: parseFloat(summary.total_cost || '0'),
      totalRequests: parseInt(summary.total_requests || '0', 10),
      totalTokens: parseInt(summary.total_tokens || '0', 10),
      avgDailyCost: parseFloat(summary.avg_daily_cost || '0'),
      cacheHitRate: parseFloat(summary.cache_hit_rate || '0'),
      avgLatency: parseFloat(summary.avg_latency || '0'),
    };
  } catch (error) {
    logger.error('[BillingLedger] Exception getting usage summary', error);
    return null;
  }
}

/**
 * Get daily usage records
 */
export async function getDailyUsageRecords(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyUsage[]> {
  try {
    const { data, error } = await supabase
      .from('billing_usage_ledger')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      logger.error('[BillingLedger] Failed to get daily usage records', error);
      return [];
    }

    return (data || []).map((record: any) => ({
      organizationId: record.organization_id,
      date: record.date,
      totalRequests: record.total_requests,
      totalTokensIn: record.total_tokens_in,
      totalTokensOut: record.total_tokens_out,
      totalCostUsd: parseFloat(record.total_cost_usd),
      byProvider: record.by_provider || {},
      byModel: record.by_model || {},
      byTaskCategory: record.by_task_category || {},
      cacheHits: record.cache_hits,
      cacheMisses: record.cache_misses,
      cacheCostSaved: parseFloat(record.cache_cost_saved || '0'),
      avgLatencyMs: parseFloat(record.avg_latency_ms || '0'),
      avgErrorRate: parseFloat(record.avg_error_rate || '0'),
      successRate: parseFloat(record.success_rate || '1.0'),
      planTier: record.plan_tier,
    }));
  } catch (error) {
    logger.error('[BillingLedger] Exception getting daily usage records', error);
    return [];
  }
}

// =====================================================
// BILLING OPERATIONS
// =====================================================

/**
 * Mark usage as billed
 */
export async function markUsageBilled(
  organizationId: string,
  date: Date,
  invoiceId?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_usage_billed', {
      org_id: organizationId,
      billing_date: date.toISOString().split('T')[0],
      invoice_id: invoiceId || null,
    });

    if (error) {
      logger.error('[BillingLedger] Failed to mark usage as billed', error);
      return false;
    }

    const updatedCount = data || 0;

    logger.info('[BillingLedger] Marked usage as billed', {
      organizationId,
      date: date.toISOString().split('T')[0],
      invoiceId,
      updatedCount,
    });

    return updatedCount > 0;
  } catch (error) {
    logger.error('[BillingLedger] Exception marking usage as billed', error);
    return false;
  }
}

/**
 * Get top spending organizations (admin only)
 */
export async function getTopSpenders(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  organizationId: string;
  totalCost: number;
  totalRequests: number;
  planTier: string;
}>> {
  try {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const { data, error } = await supabase.rpc('get_top_spenders', {
      limit_count: limit,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    });

    if (error) {
      logger.error('[BillingLedger] Failed to get top spenders', error);
      return [];
    }

    return (data || []).map((record: any) => ({
      organizationId: record.organization_id,
      totalCost: parseFloat(record.total_cost || '0'),
      totalRequests: parseInt(record.total_requests || '0', 10),
      planTier: record.plan_tier,
    }));
  } catch (error) {
    logger.error('[BillingLedger] Exception getting top spenders', error);
    return [];
  }
}
