import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AgentGoal,
  CreateAgentGoalInput,
  UpdateAgentGoalInput,
  AgentTask,
  GoalSummary,
  ExecutionGraph,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// GOAL QUERIES
// =====================================================

export function useAgentGoals(params?: { status?: string; agentId?: string }) {
  return useQuery<AgentGoal[]>({
    queryKey: ['agent-planning', 'goals', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.agentId) queryParams.append('agentId', params.agentId);

      const res = await fetch(`${API_BASE}/agent-planning/goals?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch goals');
      return res.json();
    },
  });
}

export function useAgentGoal(goalId: string | null) {
  return useQuery<AgentGoal>({
    queryKey: ['agent-planning', 'goals', goalId],
    queryFn: async () => {
      if (!goalId) return null;
      const res = await fetch(`${API_BASE}/agent-planning/goals/${goalId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch goal');
      return res.json();
    },
    enabled: !!goalId,
  });
}

export function useGoalSummary(goalId: string | null) {
  return useQuery<GoalSummary>({
    queryKey: ['agent-planning', 'goals', goalId, 'summary'],
    queryFn: async () => {
      if (!goalId) return null;
      const res = await fetch(`${API_BASE}/agent-planning/goals/${goalId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch goal summary');
      return res.json();
    },
    enabled: !!goalId,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });
}

// =====================================================
// TASK QUERIES
// =====================================================

export function useAgentTasks(goalId: string | null) {
  return useQuery<AgentTask[]>({
    queryKey: ['agent-planning', 'goals', goalId, 'tasks'],
    queryFn: async () => {
      if (!goalId) return [];
      const res = await fetch(`${API_BASE}/agent-planning/goals/${goalId}/tasks`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: !!goalId,
    refetchInterval: 3000, // Refresh every 3 seconds for live updates
  });
}

// =====================================================
// EXECUTION GRAPH QUERIES
// =====================================================

export function useExecutionGraph(goalId: string | null) {
  return useQuery<ExecutionGraph>({
    queryKey: ['agent-planning', 'execution-graphs', goalId],
    queryFn: async () => {
      if (!goalId) return null;
      const res = await fetch(`${API_BASE}/agent-planning/execution-graphs/${goalId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch execution graph');
      return res.json();
    },
    enabled: !!goalId,
  });
}

// =====================================================
// GOAL MUTATIONS
// =====================================================

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentGoalInput) => {
      const res = await fetch(`${API_BASE}/agent-planning/goals`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAgentGoalInput }) => {
      const res = await fetch(`${API_BASE}/agent-planning/goals/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update goal');
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals'] });
    },
  });
}

export function useExecuteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`${API_BASE}/agent-planning/goals/${goalId}/execute`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to execute goal');
      }
      return res.json();
    },
    onSuccess: (data, goalId) => {
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals', goalId] });
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals', goalId, 'tasks'] });
    },
  });
}

export function useApproveGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`${API_BASE}/agent-planning/goals/${goalId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to approve goal');
      return res.json();
    },
    onSuccess: (data, goalId) => {
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals', goalId] });
    },
  });
}

// =====================================================
// TASK MUTATIONS
// =====================================================

export function useExecuteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`${API_BASE}/agent-planning/tasks/${taskId}/execute`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to execute task');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate tasks queries to refresh status
      queryClient.invalidateQueries({ queryKey: ['agent-planning', 'goals'] });
    },
  });
}
