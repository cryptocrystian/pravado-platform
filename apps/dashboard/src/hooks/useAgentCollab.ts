import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AgentCollaboration,
  CreateAgentCollaborationInput,
  UpdateAgentCollaborationInput,
  AgentHandoff,
  CreateAgentHandoffInput,
  ResolveAgentHandoffInput,
  AgentChatThread,
  CreateAgentChatThreadInput,
  AgentMessage,
  CreateAgentMessageInput,
  EscalationRequest,
  CollaborationSummary,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// COLLABORATION QUERIES
// =====================================================

export function useGoalCollaborators(goalId: string | null) {
  return useQuery<AgentCollaboration[]>({
    queryKey: ['agent-collab', 'goals', goalId, 'collaborators'],
    queryFn: async () => {
      if (!goalId) return [];
      const res = await fetch(`${API_BASE}/agent-collab/goals/${goalId}/collaborators`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      return res.json();
    },
    enabled: !!goalId,
  });
}

export function useCollaborationSummary(goalId: string | null) {
  return useQuery<CollaborationSummary>({
    queryKey: ['agent-collab', 'goals', goalId, 'summary'],
    queryFn: async () => {
      if (!goalId) return null;
      const res = await fetch(`${API_BASE}/agent-collab/goals/${goalId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
    enabled: !!goalId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// =====================================================
// HANDOFF QUERIES
// =====================================================

export function useTaskHandoffs(taskId: string | null) {
  return useQuery<AgentHandoff[]>({
    queryKey: ['agent-collab', 'tasks', taskId, 'handoffs'],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await fetch(`${API_BASE}/agent-collab/tasks/${taskId}/handoffs`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch handoffs');
      return res.json();
    },
    enabled: !!taskId,
  });
}

export function usePendingHandoffs(agentId: string | null) {
  return useQuery<AgentHandoff[]>({
    queryKey: ['agent-collab', 'agents', agentId, 'pending-handoffs'],
    queryFn: async () => {
      if (!agentId) return [];
      const res = await fetch(`${API_BASE}/agent-collab/agents/${agentId}/pending-handoffs`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch pending handoffs');
      return res.json();
    },
    enabled: !!agentId,
    refetchInterval: 5000, // Refresh every 5 seconds for pending handoffs
  });
}

// =====================================================
// MESSAGING QUERIES
// =====================================================

export function useGoalThreads(goalId: string | null) {
  return useQuery<AgentChatThread[]>({
    queryKey: ['agent-collab', 'goals', goalId, 'threads'],
    queryFn: async () => {
      if (!goalId) return [];
      const res = await fetch(`${API_BASE}/agent-collab/goals/${goalId}/threads`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch threads');
      return res.json();
    },
    enabled: !!goalId,
  });
}

export function useThreadMessages(threadId: string | null, limit: number = 50) {
  return useQuery<AgentMessage[]>({
    queryKey: ['agent-collab', 'threads', threadId, 'messages', limit],
    queryFn: async () => {
      if (!threadId) return [];
      const res = await fetch(
        `${API_BASE}/agent-collab/threads/${threadId}/messages?limit=${limit}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!threadId,
    refetchInterval: 3000, // Refresh every 3 seconds for live chat
  });
}

// =====================================================
// COLLABORATION MUTATIONS
// =====================================================

export function useJoinGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentCollaborationInput) => {
      const res = await fetch(`${API_BASE}/agent-collab/goals/${input.goalId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to join goal');
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'goals', variables.goalId, 'collaborators'],
      });
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'goals', variables.goalId, 'summary'],
      });
    },
  });
}

export function useLeaveGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, agentId }: { goalId: string; agentId: string }) => {
      const res = await fetch(`${API_BASE}/agent-collab/goals/${goalId}/agents/${agentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to leave goal');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'goals', variables.goalId, 'collaborators'],
      });
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'goals', variables.goalId, 'summary'],
      });
    },
  });
}

export function useUpdateCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAgentCollaborationInput;
    }) => {
      const res = await fetch(`${API_BASE}/agent-collab/collaborations/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update collaboration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-collab'] });
    },
  });
}

// =====================================================
// HANDOFF MUTATIONS
// =====================================================

export function useInitiateHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentHandoffInput) => {
      const res = await fetch(`${API_BASE}/agent-collab/handoffs`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to initiate handoff');
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'tasks', variables.taskId, 'handoffs'],
      });
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'agents', variables.toAgentId, 'pending-handoffs'],
      });
    },
  });
}

export function useApproveHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      handoffId,
      data,
    }: {
      handoffId: string;
      data: Omit<ResolveAgentHandoffInput, 'status'>;
    }) => {
      const res = await fetch(`${API_BASE}/agent-collab/handoffs/${handoffId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to approve handoff');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-collab'] });
      queryClient.invalidateQueries({ queryKey: ['agent-planning'] }); // Refresh tasks
    },
  });
}

export function useRejectHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      handoffId,
      data,
    }: {
      handoffId: string;
      data: Omit<ResolveAgentHandoffInput, 'status'>;
    }) => {
      const res = await fetch(`${API_BASE}/agent-collab/handoffs/${handoffId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to reject handoff');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-collab'] });
    },
  });
}

// =====================================================
// MESSAGING MUTATIONS
// =====================================================

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentChatThreadInput) => {
      const res = await fetch(`${API_BASE}/agent-collab/threads`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create thread');
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.goalId) {
        queryClient.invalidateQueries({
          queryKey: ['agent-collab', 'goals', variables.goalId, 'threads'],
        });
      }
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentMessageInput) => {
      const res = await fetch(`${API_BASE}/agent-collab/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['agent-collab', 'threads', variables.threadId, 'messages'],
      });
    },
  });
}

export function useEscalate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: EscalationRequest & { agentId?: string }) => {
      const res = await fetch(`${API_BASE}/agent-collab/escalate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error('Failed to create escalation');
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.goalId) {
        queryClient.invalidateQueries({
          queryKey: ['agent-collab', 'goals', variables.goalId, 'threads'],
        });
      }
    },
  });
}
