// =====================================================
// GOALS HOOKS - React Query hooks for Goals & Attribution
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CampaignGoal,
  EnrichedCampaignGoal,
  CreateCampaignGoalInput,
  UpdateCampaignGoalInput,
  TrackAttributionEventInput,
  CampaignGoalsOverview,
  AttributionMap,
  EnrichedAttributionEvent,
  GoalPerformanceSummary,
  GoalContextForAgent,
  GoalType,
  GoalPriority,
  GoalStatus,
  GOAL_TYPE_CONFIGS,
  GOAL_PRIORITY_CONFIGS,
  GOAL_STATUS_CONFIGS,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// GOAL MUTATION HOOKS
// =====================================================

/**
 * Create a new campaign goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      campaignId: string;
      goalType: GoalType;
      title: string;
      description?: string;
      targetMetric: Record<string, number>;
      priority?: GoalPriority;
      trackingMethod?: string;
      successConditions?: Record<string, unknown>;
      dueDate?: string;
    }) => {
      const res = await fetch(`${API_BASE}/goals/campaign/${input.campaignId}/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create goal');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-goals', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-goals-summary', variables.campaignId] });
    },
  });
}

/**
 * Update a campaign goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      goalId: string;
      campaignId?: string;
      title?: string;
      description?: string;
      targetMetric?: Record<string, number>;
      priority?: GoalPriority;
      trackingMethod?: string;
      successConditions?: Record<string, unknown>;
      dueDate?: string;
      status?: GoalStatus;
    }) => {
      const res = await fetch(`${API_BASE}/goals/${input.goalId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update goal');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign-goals', variables.campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaign-goals-summary', variables.campaignId] });
      }
    },
  });
}

/**
 * Track an attribution event
 */
export function useTrackAttributionEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TrackAttributionEventInput & { campaignId: string }) => {
      const res = await fetch(`${API_BASE}/goals/campaign/${input.campaignId}/track-event`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to track event');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all goal-related queries for this campaign
      queryClient.invalidateQueries({ queryKey: ['campaign-goals', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-goals-summary', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['attribution-map', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['attribution-log', variables.campaignId] });
      if (variables.goalId) {
        queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      }
    },
  });
}

/**
 * Calculate goal progress manually
 */
export function useCalculateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, campaignId }: { goalId: string; campaignId?: string }) => {
      const res = await fetch(`${API_BASE}/goals/${goalId}/calculate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to calculate progress');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign-goals', variables.campaignId] });
      }
    },
  });
}

/**
 * Summarize goal performance (GPT-powered)
 */
export function useSummarizeGoalPerformance() {
  return useMutation({
    mutationFn: async (input: {
      goalId?: string;
      campaignId?: string;
      includeRecommendations?: boolean;
      includeAttributionBreakdown?: boolean;
    }) => {
      const url = input.goalId
        ? `${API_BASE}/goals/${input.goalId}/summarize`
        : `${API_BASE}/goals/campaign/${input.campaignId}/summarize`;

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize goal performance');
      }
      return res.json() as Promise<{ success: boolean; summary: GoalPerformanceSummary }>;
    },
  });
}

// =====================================================
// GOAL QUERY HOOKS
// =====================================================

/**
 * Get all goals for a campaign
 */
export function useCampaignGoals(campaignId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-goals', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/goals/campaign/${campaignId}/goals`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign goals');
      return res.json() as Promise<{
        success: boolean;
        goals: EnrichedCampaignGoal[];
        total: number;
      }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get a single goal
 */
export function useGoal(goalId: string | null) {
  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      if (!goalId) return null;

      const res = await fetch(`${API_BASE}/goals/${goalId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch goal');
      return res.json() as Promise<{
        success: boolean;
        goal: EnrichedCampaignGoal;
      }>;
    },
    enabled: !!goalId,
  });
}

/**
 * Get campaign goals summary
 */
export function useGoalSummary(campaignId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-goals-summary', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/goals/campaign/${campaignId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch goal summary');
      return res.json() as Promise<CampaignGoalsOverview & { success: boolean }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get attribution map for campaign
 */
export function useAttributionMap(campaignId: string | null) {
  return useQuery({
    queryKey: ['attribution-map', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/goals/campaign/${campaignId}/attribution`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch attribution map');
      return res.json() as Promise<{
        success: boolean;
        attributionMap: AttributionMap[];
        total: number;
      }>;
    },
    enabled: !!campaignId,
  });
}

/**
 * Get attribution log for campaign
 */
export function useAttributionLog(campaignId: string | null, limit: number = 100) {
  return useQuery({
    queryKey: ['attribution-log', campaignId, limit],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/goals/campaign/${campaignId}/attribution-log?limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch attribution log');
      return res.json() as Promise<{
        success: boolean;
        events: EnrichedAttributionEvent[];
        total: number;
      }>;
    },
    enabled: !!campaignId,
  });
}

/**
 * Get goal context for agents
 */
export function useGoalContext(campaignId: string | null, activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['goal-context', campaignId, activeOnly],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(
        `${API_BASE}/goals/campaign/${campaignId}/context?activeOnly=${activeOnly}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch goal context');
      return res.json() as Promise<{
        success: boolean;
        context: GoalContextForAgent;
      }>;
    },
    enabled: !!campaignId,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get critical goals for a campaign
 */
export function useCriticalGoals(campaignId: string | null) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  return data.goals.filter((goal) => goal.priority === 'CRITICAL');
}

/**
 * Get at-risk goals
 */
export function useAtRiskGoals(campaignId: string | null) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  return data.goals.filter(
    (goal) => goal.status === 'AT_RISK' || goal.status === 'FAILED' || goal.isOverdue
  );
}

/**
 * Get on-track goals
 */
export function useOnTrackGoals(campaignId: string | null) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  return data.goals.filter((goal) => goal.status === 'ON_TRACK' || goal.status === 'COMPLETED');
}

/**
 * Get goals by type
 */
export function useGoalsByType(campaignId: string | null, goalType: GoalType) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  return data.goals.filter((goal) => goal.goalType === goalType);
}

/**
 * Get goal progress chart data
 */
export function useGoalProgressChart(campaignId: string | null) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const labels = data.goals.map((goal) => goal.title);
  const progressData = data.goals.map((goal) => goal.completionScore);
  const targetData = data.goals.map(() => 100);

  return {
    labels,
    datasets: [
      {
        label: 'Progress',
        data: progressData,
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-500
      },
      {
        label: 'Target',
        data: targetData,
        backgroundColor: 'rgba(229, 231, 235, 0.5)', // gray-200
      },
    ],
  };
}

/**
 * Get goal status statistics
 */
export function useGoalStatusStats(campaignId: string | null) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) {
    return {
      total: 0,
      byStatus: {},
      byPriority: {},
      byType: {},
      averageCompletion: 0,
    };
  }

  const byStatus = data.goals.reduce((acc, goal) => {
    acc[goal.status] = (acc[goal.status] || 0) + 1;
    return acc;
  }, {} as Record<GoalStatus, number>);

  const byPriority = data.goals.reduce((acc, goal) => {
    acc[goal.priority] = (acc[goal.priority] || 0) + 1;
    return acc;
  }, {} as Record<GoalPriority, number>);

  const byType = data.goals.reduce((acc, goal) => {
    acc[goal.goalType] = (acc[goal.goalType] || 0) + 1;
    return acc;
  }, {} as Record<GoalType, number>);

  const averageCompletion =
    data.goals.reduce((sum, goal) => sum + goal.completionScore, 0) / data.goals.length;

  return {
    total: data.goals.length,
    byStatus,
    byPriority,
    byType,
    averageCompletion,
  };
}

/**
 * Get upcoming goal deadlines
 */
export function useUpcomingDeadlines(campaignId: string | null, daysAhead: number = 7) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return data.goals
    .filter((goal) => {
      if (!goal.dueDate) return false;
      const dueDate = new Date(goal.dueDate);
      return dueDate >= now && dueDate <= futureDate;
    })
    .sort((a, b) => {
      const aDate = new Date(a.dueDate!);
      const bDate = new Date(b.dueDate!);
      return aDate.getTime() - bDate.getTime();
    });
}

/**
 * Get top performing goals
 */
export function useTopPerformingGoals(campaignId: string | null, limit: number = 5) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  return [...data.goals]
    .sort((a, b) => b.completionScore - a.completionScore)
    .slice(0, limit);
}

/**
 * Get bottom performing goals
 */
export function useBottomPerformingGoals(campaignId: string | null, limit: number = 5) {
  const { data } = useCampaignGoals(campaignId);

  if (!data || !data.goals) return [];

  return [...data.goals]
    .filter((goal) => goal.status !== 'COMPLETED' && goal.status !== 'CANCELED')
    .sort((a, b) => a.completionScore - b.completionScore)
    .slice(0, limit);
}

// =====================================================
// UI HELPER HOOKS
// =====================================================

/**
 * Get color for goal status
 */
export function useGoalStatusColor() {
  return (status: GoalStatus) => {
    return GOAL_STATUS_CONFIGS[status]?.color || '#6B7280';
  };
}

/**
 * Get color for goal priority
 */
export function useGoalPriorityColor() {
  return (priority: GoalPriority) => {
    return GOAL_PRIORITY_CONFIGS[priority]?.color || '#6B7280';
  };
}

/**
 * Get icon for goal type
 */
export function useGoalTypeIcon() {
  return (goalType: GoalType) => {
    return GOAL_TYPE_CONFIGS[goalType]?.icon || 'target';
  };
}

/**
 * Get icon for goal status
 */
export function useGoalStatusIcon() {
  return (status: GoalStatus) => {
    return GOAL_STATUS_CONFIGS[status]?.icon || 'circle';
  };
}

/**
 * Format goal progress text
 */
export function useGoalProgressText() {
  return (goal: EnrichedCampaignGoal) => {
    const targetKeys = Object.keys(goal.targetMetric);
    if (targetKeys.length === 0) return 'No target set';

    const key = targetKeys[0];
    const target = goal.targetMetric[key];
    const current = goal.currentMetric[key] || 0;

    return `${current} / ${target} ${key}`;
  };
}

/**
 * Format days until due
 */
export function useDaysUntilDueText() {
  return (goal: EnrichedCampaignGoal) => {
    if (!goal.dueDate) return null;

    if (goal.isOverdue) {
      const daysOverdue = Math.abs(goal.daysUntilDue || 0);
      return `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`;
    }

    if (goal.daysUntilDue === 0) {
      return 'Due today';
    }

    if (goal.daysUntilDue === 1) {
      return 'Due tomorrow';
    }

    return `${goal.daysUntilDue} days remaining`;
  };
}

/**
 * Real-time goal updates (polling)
 */
export function useRealtimeGoals(campaignId: string | null) {
  return useCampaignGoals(campaignId, 30000); // Poll every 30 seconds
}

/**
 * Real-time goal summary (polling)
 */
export function useRealtimeGoalSummary(campaignId: string | null) {
  return useGoalSummary(campaignId, 30000); // Poll every 30 seconds
}
