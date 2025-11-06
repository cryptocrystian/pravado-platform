// =====================================================
// AI POLICY & COST CONTROL HOOKS
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// =====================================================
// TYPES
// =====================================================

export interface PolicyConfig {
  organizationId: string;
  trialMode: boolean;
  maxDailyCostUsd: number;
  maxRequestCostUsd: number;
  maxTokensInput: number;
  maxTokensOutput: number;
  maxConcurrentJobs: number;
  allowedProviders: string[];
  taskOverrides: Record<string, {
    minPerf: number;
    preferredModels: string[];
  }>;
  burstRateLimit: number;
  sustainedRateLimit: number;
}

export interface PolicyWithUsage {
  policy: PolicyConfig;
  usage: {
    dailySpend: number;
    remainingBudget: number;
    usagePercent: number;
  };
}

export interface BudgetState {
  dailyCost: number;
  maxDailyCost: number;
  remainingBudget: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'critical' | 'exceeded';
}

export interface UsageSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  byProvider: Record<string, { cost: number; requests: number }>;
  byModel: Record<string, { cost: number; requests: number }>;
}

export interface UsageTrend {
  date: string;
  spend: number;
  requests: number;
}

export interface TelemetryMetrics {
  provider: string;
  model: string;
  latencyMs: number;
  errorRate: number;
  requestCount: number;
  lastUpdated: Date;
}

export interface GuardrailStatus {
  rateLimit: {
    burstCount: number;
    sustainedCount: number;
  };
  concurrency: number;
  budget: {
    dailySpend: number;
    maxDailyBudget: number;
    remainingBudget: number;
  };
}

export interface PolicyCompliance {
  compliant: boolean;
  violations: string[];
  policy: PolicyConfig;
}

// =====================================================
// POLICY HOOKS
// =====================================================

/**
 * Get policy configuration for current organization
 */
export function usePolicy(organizationId: string) {
  return useQuery<PolicyConfig>({
    queryKey: ['ai-policy', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/policy/${organizationId}`);
      return response.data.data;
    },
    enabled: !!organizationId,
  });
}

/**
 * Get policy with current usage statistics
 */
export function usePolicyWithUsage(organizationId: string) {
  return useQuery<PolicyWithUsage>({
    queryKey: ['ai-policy-with-usage', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/policy/${organizationId}/with-usage`);
      return response.data.data;
    },
    enabled: !!organizationId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Get policy compliance status
 */
export function usePolicyCompliance(organizationId: string) {
  return useQuery<PolicyCompliance>({
    queryKey: ['ai-policy-compliance', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/policy/${organizationId}/compliance`);
      return response.data.data;
    },
    enabled: !!organizationId,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get lightweight policy summary
 */
export function usePolicySummary(organizationId: string) {
  return useQuery({
    queryKey: ['ai-policy-summary', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/policy/${organizationId}/summary`);
      return response.data.data;
    },
    enabled: !!organizationId,
  });
}

// =====================================================
// BUDGET HOOKS
// =====================================================

/**
 * Get current budget state with usage percentage
 */
export function useBudgetState(organizationId: string) {
  return useQuery<BudgetState>({
    queryKey: ['budget-state', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/budget/${organizationId}/state`);
      return response.data.data;
    },
    enabled: !!organizationId,
    refetchInterval: 15000, // Refetch every 15 seconds for real-time budget tracking
  });
}

/**
 * Get daily spend for a specific date
 */
export function useDailySpend(organizationId: string, date?: Date) {
  const dateStr = date ? date.toISOString().split('T')[0] : undefined;

  return useQuery({
    queryKey: ['daily-spend', organizationId, dateStr],
    queryFn: async () => {
      const params = dateStr ? `?date=${dateStr}` : '';
      const response = await api.get(`/ai-ops/budget/${organizationId}/daily-spend${params}`);
      return response.data.data;
    },
    enabled: !!organizationId,
  });
}

/**
 * Get remaining budget for today
 */
export function useRemainingBudget(organizationId: string) {
  return useQuery<{ remainingBudget: number }>({
    queryKey: ['remaining-budget', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/budget/${organizationId}/remaining`);
      return response.data.data;
    },
    enabled: !!organizationId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// =====================================================
// USAGE HOOKS
// =====================================================

/**
 * Get usage summary for a date range
 */
export function useUsageSummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  return useQuery<UsageSummary>({
    queryKey: ['usage-summary', organizationId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await api.get(`/ai-ops/usage/${organizationId}/summary?${params.toString()}`);
      return response.data.data;
    },
    enabled: !!organizationId && !!startDate && !!endDate,
  });
}

/**
 * Get usage trend for last N days
 */
export function useUsageTrend(organizationId: string, days: number = 7) {
  return useQuery<{ days: number; trend: UsageTrend[] }>({
    queryKey: ['usage-trend', organizationId, days],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/usage/${organizationId}/trend?days=${days}`);
      return response.data.data;
    },
    enabled: !!organizationId,
    refetchInterval: 60000, // Refetch every minute
  });
}

// =====================================================
// TELEMETRY HOOKS
// =====================================================

/**
 * Get recent telemetry for all models (last 24h)
 */
export function useRecentTelemetry() {
  return useQuery<Record<string, TelemetryMetrics>>({
    queryKey: ['telemetry-recent'],
    queryFn: async () => {
      const response = await api.get('/ai-ops/telemetry/recent');
      return response.data.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Get telemetry for a specific provider
 */
export function useProviderTelemetry(provider: string) {
  return useQuery<{ provider: string; models: TelemetryMetrics[] }>({
    queryKey: ['telemetry-provider', provider],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/telemetry/provider/${provider}`);
      return response.data.data;
    },
    enabled: !!provider,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Get circuit-broken models
 */
export function useCircuitBrokenModels(threshold: number = 0.5) {
  return useQuery<{ threshold: number; brokenModels: string[] }>({
    queryKey: ['telemetry-circuit-broken', threshold],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/telemetry/circuit-broken?threshold=${threshold}`);
      return response.data.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get complete telemetry snapshot
 */
export function useTelemetrySnapshot() {
  return useQuery({
    queryKey: ['telemetry-snapshot'],
    queryFn: async () => {
      const response = await api.get('/ai-ops/telemetry/snapshot');
      return response.data.data;
    },
  });
}

// =====================================================
// GUARDRAIL HOOKS
// =====================================================

/**
 * Get current guardrail status
 */
export function useGuardrailStatus(organizationId: string) {
  return useQuery<GuardrailStatus>({
    queryKey: ['guardrail-status', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/guardrails/${organizationId}/status`);
      return response.data.data;
    },
    enabled: !!organizationId,
    refetchInterval: 10000, // Refetch every 10 seconds for rate limit tracking
  });
}

// =====================================================
// COMBINED DASHBOARD HOOK
// =====================================================

/**
 * Get all AI Ops data for dashboard (combines multiple queries)
 */
export function useAIOPsDashboard(organizationId: string) {
  const policy = usePolicyWithUsage(organizationId);
  const budgetState = useBudgetState(organizationId);
  const usageTrend = useUsageTrend(organizationId, 7);
  const telemetry = useRecentTelemetry();
  const guardrails = useGuardrailStatus(organizationId);
  const circuitBroken = useCircuitBrokenModels();

  return {
    policy,
    budgetState,
    usageTrend,
    telemetry,
    guardrails,
    circuitBroken,
    isLoading:
      policy.isLoading ||
      budgetState.isLoading ||
      usageTrend.isLoading ||
      telemetry.isLoading ||
      guardrails.isLoading ||
      circuitBroken.isLoading,
    error:
      policy.error ||
      budgetState.error ||
      usageTrend.error ||
      telemetry.error ||
      guardrails.error ||
      circuitBroken.error,
  };
}
