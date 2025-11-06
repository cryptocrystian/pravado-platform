import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PerformanceInsight,
  CreatePerformanceInsightInput,
  ABExperiment,
  CreateABExperimentInput,
  CreateExperimentVariantInput,
  ExperimentVariant,
  ABTestAssignmentRequest,
  ABTestAssignmentResult,
  RecordExperimentOutcomeInput,
  ExperimentResults,
  InsightSummary,
  AgentPerformanceComparison,
  QualityMetrics,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// INSIGHT QUERIES
// =====================================================

/**
 * Get insights for a specific agent
 */
export function useAgentInsights(agentId: string | null, limit: number = 10) {
  return useQuery<PerformanceInsight[]>({
    queryKey: ['performance', 'insights', 'agent', agentId, limit],
    queryFn: async () => {
      if (!agentId) return [];
      const res = await fetch(
        `${API_BASE}/performance/insights/agent/${agentId}?limit=${limit}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch agent insights');
      return res.json();
    },
    enabled: !!agentId,
  });
}

/**
 * Get insight summary for dashboard
 */
export function useInsightSummary(days: number = 30) {
  return useQuery<InsightSummary>({
    queryKey: ['performance', 'insights', 'summary', days],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/performance/insights/summary?days=${days}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch insight summary');
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Compare agent performance to benchmark
 */
export function useAgentBenchmarkComparison(agentType: string | null, days: number = 30) {
  return useQuery<AgentPerformanceComparison>({
    queryKey: ['performance', 'benchmark', agentType, days],
    queryFn: async () => {
      if (!agentType) return null;
      const res = await fetch(
        `${API_BASE}/performance/insights/benchmark/${agentType}?days=${days}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch benchmark comparison');
      return res.json();
    },
    enabled: !!agentType,
  });
}

// =====================================================
// INSIGHT MUTATIONS
// =====================================================

/**
 * Create a performance insight
 */
export function useCreateInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePerformanceInsightInput) => {
      const res = await fetch(`${API_BASE}/performance/insights`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create insight');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'insights'] });
      if (data.agentId) {
        queryClient.invalidateQueries({
          queryKey: ['performance', 'insights', 'agent', data.agentId],
        });
      }
    },
  });
}

// =====================================================
// EXPERIMENT QUERIES
// =====================================================

/**
 * List A/B experiments
 */
export function useExperiments(status?: string) {
  return useQuery<ABExperiment[]>({
    queryKey: ['performance', 'experiments', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const res = await fetch(`${API_BASE}/performance/experiments${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch experiments');
      return res.json();
    },
  });
}

/**
 * Get experiment results
 */
export function useExperimentResults(experimentId: string | null) {
  return useQuery<ExperimentResults>({
    queryKey: ['performance', 'experiments', experimentId, 'results'],
    queryFn: async () => {
      if (!experimentId) return null;
      const res = await fetch(
        `${API_BASE}/performance/experiments/${experimentId}/results`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch experiment results');
      return res.json();
    },
    enabled: !!experimentId,
    refetchInterval: (data) => {
      // Poll for running experiments
      if (data?.experiment?.status === 'RUNNING') return 30000; // 30 seconds
      return false;
    },
  });
}

// =====================================================
// EXPERIMENT MUTATIONS
// =====================================================

/**
 * Create an A/B experiment
 */
export function useCreateExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateABExperimentInput) => {
      const res = await fetch(`${API_BASE}/performance/experiments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create experiment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'experiments'] });
    },
  });
}

/**
 * Create an experiment variant
 */
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExperimentVariantInput) => {
      const res = await fetch(`${API_BASE}/performance/variants`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create variant');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['performance', 'experiments', data.experimentId],
      });
    },
  });
}

/**
 * Start an experiment
 */
export function useStartExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (experimentId: string) => {
      const res = await fetch(`${API_BASE}/performance/experiments/${experimentId}/start`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start experiment');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['performance', 'experiments', data.id],
      });
      queryClient.invalidateQueries({ queryKey: ['performance', 'experiments'] });
    },
  });
}

/**
 * Complete an experiment
 */
export function useCompleteExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (experimentId: string) => {
      const res = await fetch(
        `${API_BASE}/performance/experiments/${experimentId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete experiment');
      }
      return res.json() as Promise<ExperimentResults>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['performance', 'experiments', data.experiment.id],
      });
      queryClient.invalidateQueries({ queryKey: ['performance', 'experiments'] });
    },
  });
}

/**
 * Assign variant to entity
 */
export function useAssignVariant() {
  return useMutation({
    mutationFn: async (request: ABTestAssignmentRequest) => {
      const res = await fetch(`${API_BASE}/performance/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign variant');
      }
      return res.json() as Promise<ABTestAssignmentResult>;
    },
  });
}

/**
 * Record experiment outcome
 */
export function useRecordOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordExperimentOutcomeInput) => {
      const res = await fetch(`${API_BASE}/performance/record-outcome`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to record outcome');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'experiments'] });
    },
  });
}

// =====================================================
// QUALITY METRICS
// =====================================================

/**
 * Calculate quality metrics for content
 */
export function useCalculateQualityMetrics() {
  return useMutation({
    mutationFn: async (params: {
      content: string;
      contentType: string;
      context?: Record<string, any>;
      includeAIAnalysis?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/performance/quality/calculate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to calculate quality metrics');
      }
      return res.json() as Promise<QualityMetrics>;
    },
  });
}

/**
 * Get quality trends
 */
export function useQualityTrends(params: {
  agentId?: string;
  agentType?: string;
  days?: number;
}) {
  const { agentId, agentType, days = 30 } = params;

  return useQuery<Array<{ date: string; avgQuality: number; count: number }>>({
    queryKey: ['performance', 'quality', 'trends', agentId, agentType, days],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (agentId) queryParams.append('agentId', agentId);
      if (agentType) queryParams.append('agentType', agentType);
      queryParams.append('days', days.toString());

      const res = await fetch(`${API_BASE}/performance/quality/trends?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch quality trends');
      return res.json();
    },
  });
}

/**
 * Compare quality to benchmark
 */
export function useQualityBenchmarkComparison(agentType: string | null, days: number = 30) {
  return useQuery<{
    currentQuality: number;
    benchmarkQuality: number;
    delta: number;
    performanceLevel: string;
  }>({
    queryKey: ['performance', 'quality', 'benchmark', agentType, days],
    queryFn: async () => {
      if (!agentType) return null;
      const res = await fetch(
        `${API_BASE}/performance/quality/benchmark/${agentType}?days=${days}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch quality benchmark comparison');
      return res.json();
    },
    enabled: !!agentType,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Hook to check experiment eligibility
 */
export function useExperimentEligibility(experimentId: string | null) {
  const { data: results } = useExperimentResults(experimentId);

  if (!results) return null;

  return {
    isRunning: results.experiment.status === 'RUNNING',
    isCompleted: results.experiment.status === 'COMPLETED',
    hasWinner: !!results.winningVariant,
    isStatisticallySignificant: results.isStatisticallySignificant,
    recommendation: results.recommendation,
  };
}

/**
 * Hook to get performance health status
 */
export function usePerformanceHealth() {
  const { data: summary } = useInsightSummary();

  if (!summary) return null;

  return {
    overallScore: (summary.avgSuccessScore + summary.avgQualityScore) / 2,
    trendDirection: summary.trendDirection,
    isHealthy: summary.avgSuccessScore >= 0.7 && summary.avgQualityScore >= 0.7,
    needsAttention: summary.avgSuccessScore < 0.6 || summary.avgQualityScore < 0.6,
    topPerformers: summary.topPerformingAgents,
    improvementAreas: summary.topImprovementAreas,
  };
}
