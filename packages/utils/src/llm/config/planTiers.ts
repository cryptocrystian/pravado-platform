// =====================================================
// PLAN TIER CONFIGURATION
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import { PolicyConfig } from '../strategy/policyConfig';

export type PlanTier = 'trial' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxDailyCostUsd: number;
  maxRequestCostUsd: number;
  maxTokensInput: number;
  maxTokensOutput: number;
  maxConcurrentJobs: number;
  cacheTTLHours: number;
  burstRateLimit: number;
  sustainedRateLimit: number;
}

export const PLAN_TIER_LIMITS: Record<PlanTier, PlanLimits> = {
  trial: {
    maxDailyCostUsd: 2.0,
    maxRequestCostUsd: 0.02,
    maxTokensInput: 4000,
    maxTokensOutput: 2000,
    maxConcurrentJobs: 2,
    cacheTTLHours: 12,
    burstRateLimit: 10,
    sustainedRateLimit: 100,
  },
  pro: {
    maxDailyCostUsd: 100.0,
    maxRequestCostUsd: 0.5,
    maxTokensInput: 8000,
    maxTokensOutput: 4000,
    maxConcurrentJobs: 10,
    cacheTTLHours: 24,
    burstRateLimit: 50,
    sustainedRateLimit: 1000,
  },
  enterprise: {
    maxDailyCostUsd: 1000.0,
    maxRequestCostUsd: 2.0,
    maxTokensInput: 16000,
    maxTokensOutput: 8000,
    maxConcurrentJobs: 50,
    cacheTTLHours: 72,
    burstRateLimit: 200,
    sustainedRateLimit: 5000,
  },
};

export function getPolicyForPlanTier(planTier: PlanTier): Partial<PolicyConfig> {
  const limits = PLAN_TIER_LIMITS[planTier];

  return {
    maxDailyCostUsd: limits.maxDailyCostUsd,
    maxRequestCostUsd: limits.maxRequestCostUsd,
    maxTokensInput: limits.maxTokensInput,
    maxTokensOutput: limits.maxTokensOutput,
    maxConcurrentJobs: limits.maxConcurrentJobs,
    burstRateLimit: limits.burstRateLimit,
    sustainedRateLimit: limits.sustainedRateLimit,
    allowedProviders: planTier === 'trial' ? ['openai'] : ['openai', 'anthropic'],
  };
}
