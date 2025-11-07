// =====================================================
// LLM POLICY CONFIGURATION
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Policy loading and merging from environment + database

export interface TaskOverride {
  minPerf: number; // Minimum performance threshold (0-1)
  preferredModels: string[]; // Models sorted by cost (cheapest first)
}

export interface PolicyConfig {
  organizationId: string;
  trialMode: boolean;

  // Cost guardrails
  maxDailyCostUsd: number;
  maxRequestCostUsd: number;

  // Token limits
  maxTokensInput: number;
  maxTokensOutput: number;

  // Concurrency limits
  maxConcurrentJobs: number;

  // Provider controls
  allowedProviders: string[]; // e.g., ['openai', 'anthropic']

  // Task-specific overrides
  taskOverrides: Record<string, TaskOverride>;

  // Rate limits
  burstRateLimit: number;       // Max requests in burst
  sustainedRateLimit: number;   // Max requests per minute sustained
}

// =====================================================
// DEFAULT POLICIES
// =====================================================

/**
 * Get default trial policy (strict guardrails)
 */
export function getDefaultTrialPolicy(): Omit<PolicyConfig, 'organizationId'> {
  return {
    trialMode: true,
    maxDailyCostUsd: parseFloat(process.env.LLM_TRIAL_MAX_DAILY_COST || '2.00'),
    maxRequestCostUsd: parseFloat(process.env.LLM_TRIAL_MAX_REQUEST_COST || '0.02'),
    maxTokensInput: parseInt(process.env.LLM_MAX_TOKENS_IN || '1500', 10),
    maxTokensOutput: parseInt(process.env.LLM_MAX_TOKENS_OUT || '800', 10),
    maxConcurrentJobs: 5,
    allowedProviders: (process.env.LLM_ALLOWED_PROVIDERS || 'openai,anthropic').split(','),
    taskOverrides: {
      'drafting-short': { minPerf: 0.5, preferredModels: ['gpt-4o-mini', 'claude-3-haiku'] },
      'summarization': { minPerf: 0.5, preferredModels: ['claude-3-haiku', 'gpt-4o-mini'] },
      'seo-keywords': { minPerf: 0.5, preferredModels: ['gpt-4o-mini'] },
      'safe-mode': { minPerf: 0.4, preferredModels: ['gpt-4o-mini', 'claude-3-haiku'] },
    },
    burstRateLimit: 5,
    sustainedRateLimit: 30,
  };
}

/**
 * Get default paid policy (relaxed guardrails)
 */
export function getDefaultPaidPolicy(): Omit<PolicyConfig, 'organizationId'> {
  return {
    trialMode: false,
    maxDailyCostUsd: parseFloat(process.env.LLM_MAX_DAILY_COST || '100.00'),
    maxRequestCostUsd: parseFloat(process.env.LLM_MAX_COST_PER_REQUEST || '0.50'),
    maxTokensInput: parseInt(process.env.LLM_MAX_TOKENS_IN || '8000', 10),
    maxTokensOutput: parseInt(process.env.LLM_MAX_TOKENS_OUT || '4000', 10),
    maxConcurrentJobs: 20,
    allowedProviders: (process.env.LLM_ALLOWED_PROVIDERS || 'openai,anthropic').split(','),
    taskOverrides: {
      'drafting-short': { minPerf: 0.6, preferredModels: ['gpt-4o-mini', 'claude-3-haiku', 'gpt-4o'] },
      'drafting-long': { minPerf: 0.7, preferredModels: ['claude-3-sonnet', 'gpt-4o'] },
      'structured-json': { minPerf: 0.8, preferredModels: ['gpt-4o', 'claude-3-sonnet'] },
      'summarization': { minPerf: 0.6, preferredModels: ['claude-3-haiku', 'gpt-4o-mini'] },
      'seo-keywords': { minPerf: 0.6, preferredModels: ['gpt-4o-mini', 'claude-3-haiku'] },
      'pr-pitch': { minPerf: 0.8, preferredModels: ['claude-3-sonnet', 'gpt-4o'] },
      'analyst': { minPerf: 0.8, preferredModels: ['claude-3-sonnet', 'gpt-4o'] },
      'safe-mode': { minPerf: 0.5, preferredModels: ['gpt-4o-mini', 'claude-3-haiku'] },
    },
    burstRateLimit: 20,
    sustainedRateLimit: 120,
  };
}

/**
 * Get environment-based default policy (falls back to env vars)
 */
export function getEnvDefaultPolicy(): Omit<PolicyConfig, 'organizationId'> {
  const policyMode = process.env.LLM_POLICY_MODE || 'balanced';

  // If explicitly trial mode in env, use trial policy
  if (policyMode === 'trial') {
    return getDefaultTrialPolicy();
  }

  // Otherwise use balanced/paid policy
  return getDefaultPaidPolicy();
}

// =====================================================
// POLICY MERGING
// =====================================================

/**
 * Merge database policy with environment defaults
 * Database policy takes precedence over env defaults
 */
export function mergePolicyWithDefaults(
  dbPolicy: Partial<PolicyConfig> | null,
  organizationId: string
): PolicyConfig {
  // Start with env defaults
  const envDefaults = getEnvDefaultPolicy();

  // If no DB policy, use env defaults
  if (!dbPolicy) {
    return {
      ...envDefaults,
      organizationId,
    };
  }

  // Merge DB policy over env defaults
  return {
    organizationId,
    trialMode: dbPolicy.trialMode ?? envDefaults.trialMode,
    maxDailyCostUsd: dbPolicy.maxDailyCostUsd ?? envDefaults.maxDailyCostUsd,
    maxRequestCostUsd: dbPolicy.maxRequestCostUsd ?? envDefaults.maxRequestCostUsd,
    maxTokensInput: dbPolicy.maxTokensInput ?? envDefaults.maxTokensInput,
    maxTokensOutput: dbPolicy.maxTokensOutput ?? envDefaults.maxTokensOutput,
    maxConcurrentJobs: dbPolicy.maxConcurrentJobs ?? envDefaults.maxConcurrentJobs,
    allowedProviders: dbPolicy.allowedProviders ?? envDefaults.allowedProviders,
    taskOverrides: {
      ...envDefaults.taskOverrides,
      ...(dbPolicy.taskOverrides || {}),
    },
    burstRateLimit: dbPolicy.burstRateLimit ?? envDefaults.burstRateLimit,
    sustainedRateLimit: dbPolicy.sustainedRateLimit ?? envDefaults.sustainedRateLimit,
  };
}

// =====================================================
// POLICY VALIDATION
// =====================================================

/**
 * Validate policy configuration
 * Ensures values are within safe ranges
 */
export function validatePolicy(policy: PolicyConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Cost validations
  if (policy.maxDailyCostUsd < 0) {
    errors.push('maxDailyCostUsd must be >= 0');
  }
  if (policy.maxRequestCostUsd < 0) {
    errors.push('maxRequestCostUsd must be >= 0');
  }
  if (policy.maxRequestCostUsd > policy.maxDailyCostUsd) {
    errors.push('maxRequestCostUsd cannot exceed maxDailyCostUsd');
  }

  // Token validations
  if (policy.maxTokensInput < 100 || policy.maxTokensInput > 100000) {
    errors.push('maxTokensInput must be between 100 and 100,000');
  }
  if (policy.maxTokensOutput < 100 || policy.maxTokensOutput > 100000) {
    errors.push('maxTokensOutput must be between 100 and 100,000');
  }

  // Concurrency validations
  if (policy.maxConcurrentJobs < 1 || policy.maxConcurrentJobs > 100) {
    errors.push('maxConcurrentJobs must be between 1 and 100');
  }

  // Provider validations
  if (policy.allowedProviders.length === 0) {
    errors.push('At least one provider must be allowed');
  }

  // Rate limit validations
  if (policy.burstRateLimit < 1 || policy.burstRateLimit > 1000) {
    errors.push('burstRateLimit must be between 1 and 1000');
  }
  if (policy.sustainedRateLimit < 1 || policy.sustainedRateLimit > 10000) {
    errors.push('sustainedRateLimit must be between 1 and 10,000');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Apply trial mode restrictions to a policy
 * Ensures trial orgs cannot exceed safe limits
 */
export function applyTrialRestrictions(policy: PolicyConfig): PolicyConfig {
  if (!policy.trialMode) {
    return policy;
  }

  // Enforce maximum limits for trial mode
  return {
    ...policy,
    maxDailyCostUsd: Math.min(policy.maxDailyCostUsd, 5.00),      // Cap at $5
    maxRequestCostUsd: Math.min(policy.maxRequestCostUsd, 0.05),  // Cap at $0.05
    maxTokensInput: Math.min(policy.maxTokensInput, 2000),        // Cap at 2000
    maxTokensOutput: Math.min(policy.maxTokensOutput, 1000),      // Cap at 1000
    maxConcurrentJobs: Math.min(policy.maxConcurrentJobs, 10),    // Cap at 10
    burstRateLimit: Math.min(policy.burstRateLimit, 10),          // Cap at 10
    sustainedRateLimit: Math.min(policy.sustainedRateLimit, 60),  // Cap at 60/min
  };
}
