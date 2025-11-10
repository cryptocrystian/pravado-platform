// =====================================================
// LLM POLICY SERVICE
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Policy fetching, merging, and validation with defaults

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  PolicyConfig,
  mergePolicyWithDefaults,
  validatePolicy,
  applyTrialRestrictions,
  TaskOverride,
} from '@pravado/utils/llm/strategy/policyConfig';
import { getDailySpend, getRemainingBudget, getUsageSummary } from './budget-guard.service';

// =====================================================
// TYPES
// =====================================================

export interface PolicyRow {
  organization_id: string;
  trial_mode: boolean;
  max_daily_cost_usd: string;
  max_request_cost_usd: string;
  max_tokens_input: number;
  max_tokens_output: number;
  max_concurrent_jobs: number;
  allowed_providers: string;
  task_overrides: Record<string, TaskOverride>;
  burst_rate_limit: number;
  sustained_rate_limit: number;
  created_at: string;
  updated_at: string;
}

export interface PolicyWithUsage {
  policy: PolicyConfig;
  usage: {
    dailySpend: number;
    remainingBudget: number;
    usagePercent: number;
  };
}

// =====================================================
// POLICY FETCHING
// =====================================================

/**
 * Fetch raw policy from database
 * Returns null if no policy exists for organization
 */
export async function getPolicy(organizationId: string): Promise<PolicyConfig | null> {
  try {
    const { data, error } = await supabase
      .from('ai_policy')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      // Policy not found is expected for new orgs
      if (error.code === 'PGRST116') {
        logger.info('[LLMPolicy] No policy found for organization', { organizationId });
        return null;
      }

      logger.error('[LLMPolicy] Error fetching policy', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform database row to PolicyConfig
    return transformRowToPolicy(data);
  } catch (error) {
    logger.error('[LLMPolicy] Exception in getPolicy', error);
    return null;
  }
}

/**
 * Get policy with environment defaults as fallback
 * Always returns a valid PolicyConfig (never null)
 */
export async function getPolicyWithDefaults(organizationId: string): Promise<PolicyConfig> {
  try {
    const dbPolicy = await getPolicy(organizationId);

    // Merge with environment defaults
    const mergedPolicy = mergePolicyWithDefaults(dbPolicy, organizationId);

    // Validate
    const validation = validatePolicy(mergedPolicy);
    if (!validation.valid) {
      logger.warn('[LLMPolicy] Policy validation failed, using env defaults', {
        organizationId,
        errors: validation.errors,
      });
      // Fall back to env defaults if validation fails
      return mergePolicyWithDefaults(null, organizationId);
    }

    // Apply trial restrictions if needed
    const finalPolicy = applyTrialRestrictions(mergedPolicy);

    logger.info('[LLMPolicy] Policy loaded successfully', {
      organizationId,
      trialMode: finalPolicy.trialMode,
      maxDailyCost: finalPolicy.maxDailyCostUsd,
    });

    return finalPolicy;
  } catch (error) {
    logger.error('[LLMPolicy] Exception in getPolicyWithDefaults', error);
    // Safe fallback: return env defaults
    return mergePolicyWithDefaults(null, organizationId);
  }
}

/**
 * Get policy with usage statistics
 * Useful for dashboard display
 */
export async function getPolicyWithUsage(organizationId: string): Promise<PolicyWithUsage> {
  const policy = await getPolicyWithDefaults(organizationId);

  const dailySpend = await getDailySpend(organizationId);
  const remainingBudget = await getRemainingBudget(organizationId);
  const usagePercent = (dailySpend / policy.maxDailyCostUsd) * 100;

  return {
    policy,
    usage: {
      dailySpend,
      remainingBudget,
      usagePercent,
    },
  };
}

// =====================================================
// POLICY VALIDATION
// =====================================================

/**
 * Check if organization is within policy compliance
 * Returns true if organization is operating within their limits
 */
export async function checkPolicyCompliance(organizationId: string): Promise<{
  compliant: boolean;
  violations: string[];
  policy: PolicyConfig;
}> {
  const policy = await getPolicyWithDefaults(organizationId);
  const violations: string[] = [];

  // Check daily budget
  const dailySpend = await getDailySpend(organizationId);
  if (dailySpend > policy.maxDailyCostUsd) {
    violations.push(
      `Daily spend ($${dailySpend.toFixed(2)}) exceeds limit ($${policy.maxDailyCostUsd.toFixed(2)})`
    );
  }

  // Note: Request-level and concurrency checks happen at runtime
  // This function only checks aggregate compliance

  return {
    compliant: violations.length === 0,
    violations,
    policy,
  };
}

/**
 * Get task-specific override for an organization
 * Returns default from catalog if no override exists
 */
export async function getTaskOverride(
  organizationId: string,
  taskCategory: string
): Promise<TaskOverride | null> {
  const policy = await getPolicyWithDefaults(organizationId);

  if (!policy.taskOverrides || !policy.taskOverrides[taskCategory]) {
    return null;
  }

  return policy.taskOverrides[taskCategory];
}

// =====================================================
// USAGE ANALYTICS
// =====================================================

/**
 * Get organization usage summary for a date range
 */
export async function getOrganizationUsage(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  return getUsageSummary(organizationId, startDate, endDate);
}

/**
 * Get usage trend for last N days
 */
export async function getUsageTrend(
  organizationId: string,
  days: number = 7
): Promise<
  Array<{
    date: string;
    spend: number;
    requests: number;
  }>
> {
  const results: Array<{ date: string; spend: number; requests: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);
    const dateStr = targetDate.toISOString().split('T')[0];

    const dailySpend = await getDailySpend(organizationId, targetDate);

    // Get request count for this day
    const { data, error } = await supabase
      .from('ai_usage_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', `${dateStr}T00:00:00Z`)
      .lt('created_at', `${dateStr}T23:59:59Z`);

    const requests = error ? 0 : data?.length || 0;

    results.push({
      date: dateStr,
      spend: dailySpend,
      requests,
    });
  }

  return results;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Transform database row to PolicyConfig object
 */
function transformRowToPolicy(row: PolicyRow): PolicyConfig {
  return {
    organizationId: row.organization_id,
    trialMode: row.trial_mode,
    maxDailyCostUsd: parseFloat(row.max_daily_cost_usd),
    maxRequestCostUsd: parseFloat(row.max_request_cost_usd),
    maxTokensInput: row.max_tokens_input,
    maxTokensOutput: row.max_tokens_output,
    maxConcurrentJobs: row.max_concurrent_jobs,
    allowedProviders: row.allowed_providers.split(',').map((p) => p.trim()),
    taskOverrides: row.task_overrides || {},
    burstRateLimit: row.burst_rate_limit,
    sustainedRateLimit: row.sustained_rate_limit,
  };
}

/**
 * Check if organization has a custom policy configured
 */
export async function hasCustomPolicy(organizationId: string): Promise<boolean> {
  const policy = await getPolicy(organizationId);
  return policy !== null;
}

/**
 * Get policy summary for logging/debugging
 */
export async function getPolicySummary(organizationId: string): Promise<{
  organizationId: string;
  trialMode: boolean;
  maxDailyCost: number;
  maxRequestCost: number;
  allowedProviders: string[];
  taskOverrideCount: number;
}> {
  const policy = await getPolicyWithDefaults(organizationId);

  return {
    organizationId: policy.organizationId,
    trialMode: policy.trialMode,
    maxDailyCost: policy.maxDailyCostUsd,
    maxRequestCost: policy.maxRequestCostUsd,
    allowedProviders: policy.allowedProviders,
    taskOverrideCount: Object.keys(policy.taskOverrides).length,
  };
}

// =====================================================
// POLICY UPDATES (Deferred to Sprint 70)
// =====================================================
// Note: Write operations are intentionally limited in Sprint 69
// Full CRUD admin interface will be added in Sprint 70

/**
 * Update policy (admin only - placeholder for Sprint 70)
 * @deprecated Not implemented in Sprint 69
 */
export async function updatePolicy(
  organizationId: string,
  updates: Partial<PolicyConfig>
): Promise<{ success: boolean; message: string }> {
  logger.warn('[LLMPolicy] updatePolicy called but not implemented in Sprint 69', {
    organizationId,
  });

  return {
    success: false,
    message: 'Policy updates deferred to Sprint 70 - please use database directly for now',
  };
}

/**
 * Create new policy (admin only - placeholder for Sprint 70)
 * @deprecated Not implemented in Sprint 69
 */
export async function createPolicy(
  policy: PolicyConfig
): Promise<{ success: boolean; message: string }> {
  logger.warn('[LLMPolicy] createPolicy called but not implemented in Sprint 69', {
    organizationId: policy.organizationId,
  });

  return {
    success: false,
    message: 'Policy creation deferred to Sprint 70 - please use seed files for now',
  };
}
