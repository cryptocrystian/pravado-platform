// =====================================================
// BUDGET GUARD SERVICE
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Cost tracking and enforcement with graceful degradation

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  forceCheapest: boolean;     // Graceful degradation flag
  remainingBudget: number;
  dailySpend: number;
  maxDailyBudget: number;
}

export interface UsageRecord {
  organizationId: string;
  provider: string;
  model: string;
  taskCategory?: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs?: number;
  success: boolean;
  errorMessage?: string;
  agentType?: string;
  userId?: string;
}

// =====================================================
// BUDGET QUERIES
// =====================================================

/**
 * Get daily spend for an organization
 * Uses database function for efficiency
 */
export async function getDailySpend(organizationId: string, date?: Date): Promise<number> {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase.rpc('get_daily_spend', {
    org_id: organizationId,
    target_date: dateStr,
  });

  if (error) {
    logger.error('[BudgetGuard] Failed to get daily spend', error);
    return 0;
  }

  return parseFloat(data || '0');
}

/**
 * Get remaining budget for today
 * Uses database function
 */
export async function getRemainingBudget(organizationId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_remaining_budget', {
    org_id: organizationId,
  });

  if (error) {
    logger.error('[BudgetGuard] Failed to get remaining budget', error);
    return 0;
  }

  return parseFloat(data || '0');
}

/**
 * Get policy max daily cost for organization
 */
async function getMaxDailyCost(organizationId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ai_policy')
    .select('max_daily_cost_usd')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    // Default to env variable if no policy found
    return parseFloat(process.env.LLM_MAX_DAILY_COST || '10.00');
  }

  return parseFloat(data.max_daily_cost_usd);
}

// =====================================================
// PRE-FLIGHT CHECKS
// =====================================================

/**
 * Check if organization can afford a request
 * Implements graceful degradation:
 * - If budget > 80%: allow normally
 * - If budget 80-95%: force cheapest models
 * - If budget 95-100%: force cheapest models + warn
 * - If budget > 100%: deny
 */
export async function canAffordRequest(
  organizationId: string,
  estimatedCost: number
): Promise<BudgetCheckResult> {
  try {
    // Get policy
    const { data: policy } = await supabase
      .from('ai_policy')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const maxDailyCost = policy
      ? parseFloat(policy.max_daily_cost_usd)
      : parseFloat(process.env.LLM_MAX_DAILY_COST || '10.00');

    const maxRequestCost = policy
      ? parseFloat(policy.max_request_cost_usd)
      : parseFloat(process.env.LLM_MAX_COST_PER_REQUEST || '0.03');

    // Check request-level limit
    if (estimatedCost > maxRequestCost) {
      return {
        allowed: false,
        reason: `Request cost ($${estimatedCost.toFixed(4)}) exceeds max per-request limit ($${maxRequestCost.toFixed(4)})`,
        forceCheapest: false,
        remainingBudget: 0,
        dailySpend: 0,
        maxDailyBudget: maxDailyCost,
      };
    }

    // Get daily spend
    const dailySpend = await getDailySpend(organizationId);
    const remainingBudget = maxDailyCost - dailySpend;
    const budgetUsagePercent = (dailySpend / maxDailyCost) * 100;

    // Check if this request would exceed daily budget
    if (dailySpend + estimatedCost > maxDailyCost) {
      // Hard deny if already at/over 100%
      if (budgetUsagePercent >= 100) {
        return {
          allowed: false,
          reason: `Daily budget exceeded ($${dailySpend.toFixed(2)} / $${maxDailyCost.toFixed(2)})`,
          forceCheapest: false,
          remainingBudget: 0,
          dailySpend,
          maxDailyBudget: maxDailyCost,
        };
      }

      // Graceful degradation: allow if we force cheapest model
      return {
        allowed: true,
        reason: `Near budget limit (${budgetUsagePercent.toFixed(1)}%), forcing cheapest models`,
        forceCheapest: true,
        remainingBudget,
        dailySpend,
        maxDailyBudget: maxDailyCost,
      };
    }

    // Check for graceful degradation thresholds
    if (budgetUsagePercent >= 95) {
      // 95-100%: force cheapest + warn
      return {
        allowed: true,
        reason: `Critical budget usage (${budgetUsagePercent.toFixed(1)}%), forcing cheapest models`,
        forceCheapest: true,
        remainingBudget,
        dailySpend,
        maxDailyBudget: maxDailyCost,
      };
    }

    if (budgetUsagePercent >= 80) {
      // 80-95%: force cheapest
      return {
        allowed: true,
        reason: `High budget usage (${budgetUsagePercent.toFixed(1)}%), forcing cheapest models`,
        forceCheapest: true,
        remainingBudget,
        dailySpend,
        maxDailyBudget: maxDailyCost,
      };
    }

    // Normal operation
    return {
      allowed: true,
      forceCheapest: false,
      remainingBudget,
      dailySpend,
      maxDailyBudget: maxDailyCost,
    };
  } catch (error) {
    logger.error('[BudgetGuard] Error in canAffordRequest', error);

    // Fail-safe: allow request but force cheapest
    return {
      allowed: true,
      reason: 'Budget check failed, defaulting to cheapest models',
      forceCheapest: true,
      remainingBudget: 0,
      dailySpend: 0,
      maxDailyBudget: 0,
    };
  }
}

// =====================================================
// USAGE RECORDING
// =====================================================

/**
 * Record usage in the ledger
 * This is called AFTER a successful LLM request
 */
export async function recordUsage(record: UsageRecord): Promise<void> {
  try {
    const { error } = await supabase.from('ai_usage_ledger').insert({
      organization_id: record.organizationId,
      provider: record.provider,
      model: record.model,
      task_category: record.taskCategory || null,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      estimated_cost_usd: record.estimatedCost,
      latency_ms: record.latencyMs || null,
      success: record.success,
      error_message: record.errorMessage || null,
      agent_type: record.agentType || null,
      user_id: record.userId || null,
    });

    if (error) {
      logger.error('[BudgetGuard] Failed to record usage', error);
      // Don't throw - usage recording should not block the response
    } else {
      logger.info('[BudgetGuard] Recorded usage', {
        org: record.organizationId,
        provider: record.provider,
        model: record.model,
        cost: record.estimatedCost,
      });
    }
  } catch (error) {
    logger.error('[BudgetGuard] Exception in recordUsage', error);
  }
}

// =====================================================
// BUDGET ANALYTICS
// =====================================================

/**
 * Get usage summary for a date range
 */
export async function getUsageSummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  byProvider: Record<string, { cost: number; requests: number }>;
  byModel: Record<string, { cost: number; requests: number }>;
}> {
  const { data, error } = await supabase
    .from('ai_usage_ledger')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error || !data) {
    logger.error('[BudgetGuard] Failed to get usage summary', error);
    return {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      successRate: 0,
      avgLatencyMs: 0,
      byProvider: {},
      byModel: {},
    };
  }

  const totalCost = data.reduce((sum, r) => sum + parseFloat(r.estimated_cost_usd || '0'), 0);
  const totalTokens = data.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
  const totalRequests = data.length;
  const successfulRequests = data.filter((r) => r.success).length;
  const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
  const avgLatencyMs =
    data.length > 0
      ? data.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / data.length
      : 0;

  // Group by provider
  const byProvider: Record<string, { cost: number; requests: number }> = {};
  for (const record of data) {
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = { cost: 0, requests: 0 };
    }
    byProvider[record.provider].cost += parseFloat(record.estimated_cost_usd || '0');
    byProvider[record.provider].requests++;
  }

  // Group by model
  const byModel: Record<string, { cost: number; requests: number }> = {};
  for (const record of data) {
    const key = `${record.provider}:${record.model}`;
    if (!byModel[key]) {
      byModel[key] = { cost: 0, requests: 0 };
    }
    byModel[key].cost += parseFloat(record.estimated_cost_usd || '0');
    byModel[key].requests++;
  }

  return {
    totalCost,
    totalTokens,
    totalRequests,
    successRate,
    avgLatencyMs,
    byProvider,
    byModel,
  };
}

/**
 * Get budget state for dashboard display
 */
export async function getBudgetState(organizationId: string): Promise<{
  dailyCost: number;
  maxDailyCost: number;
  remainingBudget: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'critical' | 'exceeded';
}> {
  const dailyCost = await getDailySpend(organizationId);
  const maxDailyCost = await getMaxDailyCost(organizationId);
  const remainingBudget = Math.max(0, maxDailyCost - dailyCost);
  const usagePercent = (dailyCost / maxDailyCost) * 100;

  let status: 'normal' | 'warning' | 'critical' | 'exceeded' = 'normal';
  if (usagePercent >= 100) status = 'exceeded';
  else if (usagePercent >= 95) status = 'critical';
  else if (usagePercent >= 80) status = 'warning';

  return {
    dailyCost,
    maxDailyCost,
    remainingBudget,
    usagePercent,
    status,
  };
}
