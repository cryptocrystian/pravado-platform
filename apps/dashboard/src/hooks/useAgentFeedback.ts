// =====================================================
// AGENT FEEDBACK HOOKS
// Sprint 48 Phase 4.4
// =====================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AgentFeedbackInput,
  AgentFeedbackEntry,
  FeedbackSummary,
  ImprovementPlan,
} from '@pravado/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Query keys
export const feedbackQueryKeys = {
  all: ['agent-feedback'] as const,
  summary: (agentId: string, startDate?: Date, endDate?: Date) =>
    [...feedbackQueryKeys.all, 'summary', agentId, startDate, endDate] as const,
  plans: (agentId: string, status?: string) =>
    [...feedbackQueryKeys.all, 'plans', agentId, status] as const,
};

/**
 * Submit agent feedback
 */
export function useSubmitFeedback(options?: {
  onSuccess?: (entry: AgentFeedbackEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: AgentFeedbackInput) => {
      const response = await fetchApi<{ success: boolean; entry: AgentFeedbackEntry }>(
        '/api/agent-feedback/submit',
        {
          method: 'POST',
          body: JSON.stringify(feedback),
        }
      );

      return response.entry;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedbackQueryKeys.summary(variables.agentId) });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Get feedback summary
 */
export function useFeedbackSummary(
  agentId: string | null,
  startDate?: Date,
  endDate?: Date,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: feedbackQueryKeys.summary(agentId || '', startDate, endDate),
    queryFn: async () => {
      if (!agentId) return null;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetchApi<{ success: boolean; summary: FeedbackSummary }>(
        `/api/agent-feedback/summary/${agentId}?${params}`
      );

      return response.summary;
    },
    enabled: options?.enabled !== false && !!agentId,
    staleTime: 30000,
  });
}

/**
 * Generate improvement plans
 */
export function useGenerateImprovementPlans(options?: {
  onSuccess?: (plans: ImprovementPlan[]) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { agentId: string; lookbackDays?: number }) => {
      const response = await fetchApi<{ success: boolean; plans: ImprovementPlan[] }>(
        `/api/agent-feedback/generate-plan/${params.agentId}`,
        {
          method: 'POST',
          body: JSON.stringify({ lookbackDays: params.lookbackDays }),
        }
      );

      return response.plans;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: feedbackQueryKeys.plans(variables.agentId) });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Get improvement plans
 */
export function useImprovementPlans(
  agentId: string | null,
  status?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: feedbackQueryKeys.plans(agentId || '', status),
    queryFn: async () => {
      if (!agentId) return [];

      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetchApi<{ success: boolean; plans: ImprovementPlan[] }>(
        `/api/agent-feedback/plans/${agentId}?${params}`
      );

      return response.plans;
    },
    enabled: options?.enabled !== false && !!agentId,
    staleTime: 60000,
  });
}

export default {
  useSubmitFeedback,
  useFeedbackSummary,
  useGenerateImprovementPlans,
  useImprovementPlans,
};
