// =====================================================
// AI OPS ANALYTICS HOOKS
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// =====================================================
// TYPES
// =====================================================

export interface DecisionLog {
  id: string;
  timestamp: Date;
  organizationId: string;
  taskCategory: string;
  agentType?: string;
  selectedProvider: string;
  selectedModel: string;
  estimatedCost: number;
  factors: {
    costScore: number;
    latencyScore: number;
    errorScore: number;
    qualityScore: number;
    totalScore: number;
  };
  alternatives: Array<{
    provider: string;
    model: string;
    score: number;
    rejected: boolean;
    rejectReason?: string;
  }>;
  reason: string;
  constraints: {
    minPerformance: number;
    maxCost?: number;
    allowedProviders: string[];
    forceCheapest: boolean;
  };
  telemetry?: {
    latencyMs: number;
    errorRate: number;
    requestCount: number;
  };
}

export interface DecisionSummary {
  organizationId: string;
  period: '1h' | '24h' | '7d' | '30d' | 'all';
  totalDecisions: number;
  byProvider: Record<string, number>;
  byTaskCategory: Record<string, number>;
  avgCost: number;
  forceCheapestCount: number;
  forceCheapestPercentage: number;
  topProviders: Array<{
    provider: string;
    model: string;
    timesSelected: number;
    avgCost: number;
    avgScore: number;
  }>;
}

export interface ExplainabilityReport {
  decision: DecisionLog;
  explanation: string;
  insights: {
    primaryFactor: 'cost' | 'latency' | 'error' | 'quality';
    costEfficiency: 'optimal' | 'good' | 'poor';
    alternativesConsidered: number;
    modelsFiltered: number;
    budgetConstrained: boolean;
  };
}

export interface AggregatedMetrics {
  provider: string;
  model: string;
  period: string;
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
  latencyDeviation: number;
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

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  avgHitsPerEntry: number;
  cacheSizeMb: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  latencySavedMs: number;
  costSaved: number;
}

// =====================================================
// DECISION & EXPLAINABILITY HOOKS
// =====================================================

/**
 * Get decision history for an organization
 */
export function useDecisionHistory(
  organizationId: string,
  options?: {
    limit?: number;
    taskCategory?: string;
    provider?: string;
    startDate?: Date;
    endDate?: Date;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['decision-history', organizationId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.taskCategory) params.append('taskCategory', options.taskCategory);
      if (options?.provider) params.append('provider', options.provider);
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());

      const response = await api.get(
        `/ai-ops/explain/${organizationId}/history?${params.toString()}`
      );
      return response.data.data.decisions as DecisionLog[];
    },
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get latest decision for an organization
 */
export function useLatestDecision(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['latest-decision', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/explain/${organizationId}/latest`);
      return response.data.data as DecisionLog;
    },
    enabled,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Get specific decision by ID
 */
export function useDecision(organizationId: string, decisionId: string, enabled = true) {
  return useQuery({
    queryKey: ['decision', organizationId, decisionId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/explain/${organizationId}/decision/${decisionId}`);
      return response.data.data as DecisionLog;
    },
    enabled,
  });
}

/**
 * Get decision summary
 */
export function useDecisionSummary(
  organizationId: string,
  period: '1h' | '24h' | '7d' | '30d' | 'all' = '24h'
) {
  return useQuery({
    queryKey: ['decision-summary', organizationId, period],
    queryFn: async () => {
      const response = await api.get(
        `/ai-ops/explain/${organizationId}/summary?period=${period}`
      );
      return response.data.data as DecisionSummary;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get trending decisions
 */
export function useTrendingDecisions(organizationId: string, limit: number = 5) {
  return useQuery({
    queryKey: ['trending-decisions', organizationId, limit],
    queryFn: async () => {
      const response = await api.get(
        `/ai-ops/explain/${organizationId}/trending?limit=${limit}`
      );
      return response.data.data.trending as Array<{
        provider: string;
        model: string;
        count: number;
        avgCost: number;
        lastUsed: Date;
      }>;
    },
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Get explanation for a decision
 */
export function useDecisionExplanation(organizationId: string, decisionId: string, enabled = true) {
  return useQuery({
    queryKey: ['decision-explanation', organizationId, decisionId],
    queryFn: async () => {
      const response = await api.get(
        `/ai-ops/explain/${organizationId}/decision/${decisionId}/explain`
      );
      return response.data.data as ExplainabilityReport;
    },
    enabled,
  });
}

/**
 * Get explanation for latest decision
 */
export function useLatestExplanation(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: ['latest-explanation', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/explain/${organizationId}/latest/explain`);
      return response.data.data as ExplainabilityReport;
    },
    enabled,
    staleTime: 10000, // 10 seconds
  });
}

// =====================================================
// METRICS & ANALYTICS HOOKS
// =====================================================

/**
 * Get aggregated metrics
 */
export function useAggregatedMetrics(
  startDate: Date,
  endDate: Date,
  organizationId?: string
) {
  return useQuery({
    queryKey: ['aggregated-metrics', startDate.toISOString(), endDate.toISOString(), organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      if (organizationId) params.append('organizationId', organizationId);

      const response = await api.get(`/ai-ops/metrics/aggregated?${params.toString()}`);
      return response.data.data.metrics as Record<string, AggregatedMetrics>;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get hourly metrics
 */
export function useHourlyMetrics(hours: number = 24, organizationId?: string) {
  return useQuery({
    queryKey: ['hourly-metrics', hours, organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: hours.toString() });
      if (organizationId) params.append('organizationId', organizationId);

      const response = await api.get(`/ai-ops/metrics/hourly?${params.toString()}`);
      return response.data.data.metrics as AggregatedMetrics[];
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get metrics summary
 */
export function useMetricsSummary(
  period: '1h' | '24h' | '7d' | '30d' = '24h',
  organizationId?: string
) {
  return useQuery({
    queryKey: ['metrics-summary', period, organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (organizationId) params.append('organizationId', organizationId);

      const response = await api.get(`/ai-ops/metrics/summary?${params.toString()}`);
      return response.data.data as MetricsSummary;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get provider health status
 */
export function useProviderHealth(deviationThreshold: number = 0.2) {
  return useQuery({
    queryKey: ['provider-health', deviationThreshold],
    queryFn: async () => {
      const response = await api.get(
        `/ai-ops/metrics/provider-health?deviationThreshold=${deviationThreshold}`
      );
      return response.data.data as {
        deviationThreshold: number;
        providers: ProviderHealthStatus[];
        summary: {
          total: number;
          healthy: number;
          warning: number;
          critical: number;
        };
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get cost breakdown by task category
 */
export function useCostByTask(startDate: Date, endDate: Date, organizationId?: string) {
  return useQuery({
    queryKey: ['cost-by-task', startDate.toISOString(), endDate.toISOString(), organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      if (organizationId) params.append('organizationId', organizationId);

      const response = await api.get(`/ai-ops/metrics/cost-by-task?${params.toString()}`);
      return response.data.data.breakdown as Record<string, { cost: number; requests: number }>;
    },
    staleTime: 60000, // 1 minute
  });
}

// =====================================================
// CACHE ANALYTICS HOOKS
// =====================================================

/**
 * Get cache statistics
 */
export function useCacheStats() {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const response = await api.get('/ai-ops/cache/stats');
      return response.data.data as CacheStats;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get cache hit rate
 */
export function useCacheHitRate(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['cache-hit-rate', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await api.get(`/ai-ops/cache/hit-rate?${params.toString()}`);
      return response.data.data as {
        startDate?: string;
        endDate?: string;
        hitRate: number;
        hitRatePercentage: string;
      };
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get hot cache entries
 */
export function useHotCacheEntries(limit: number = 10) {
  return useQuery({
    queryKey: ['hot-cache-entries', limit],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/cache/hot-entries?limit=${limit}`);
      return response.data.data.entries as Array<{
        promptHash: string;
        provider: string;
        model: string;
        hitCount: number;
        estimatedSavings: number;
        lastAccessed: Date;
      }>;
    },
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Get cache savings
 */
export function useCacheSavings(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['cache-savings', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await api.get(`/ai-ops/cache/savings?${params.toString()}`);
      return response.data.data as {
        startDate?: string;
        endDate?: string;
        totalSavings: number;
        requestsSaved: number;
        avgSavingsPerHit: number;
      };
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get cache metrics for organization
 */
export function useCacheMetrics(organizationId: string) {
  return useQuery({
    queryKey: ['cache-metrics', organizationId],
    queryFn: async () => {
      const response = await api.get(`/ai-ops/cache/${organizationId}/metrics`);
      return response.data.data.metrics as CacheMetrics;
    },
    staleTime: 30000, // 30 seconds
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Trigger manual cache cleanup
 */
export function useCacheCleanup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/ai-ops/cache/cleanup');
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate cache stats after cleanup
      queryClient.invalidateQueries({ queryKey: ['cache-stats'] });
    },
  });
}
