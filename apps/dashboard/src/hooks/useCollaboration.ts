import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  HandoffRequest,
  EnrichedHandoffRequest,
  CollaborationThread,
  CollaborationComment,
  CreateHandoffRequestInput,
  CreateCollaborationThreadInput,
  CreateCollaborationCommentInput,
  CampaignCollaborationContext,
  ThreadSummary,
  HandoffType,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// HANDOFF MUTATIONS
// =====================================================

/**
 * Request a handoff
 */
export function useRequestHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateHandoffRequestInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/collaboration/handoff`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to request handoff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoff-queue'] });
    },
  });
}

/**
 * Accept a handoff
 */
export function useAcceptHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      responseMessage,
    }: {
      requestId: string;
      responseMessage?: string;
    }) => {
      const res = await fetch(`${API_BASE}/collaboration/handoff/${requestId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseMessage }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to accept handoff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoff-queue'] });
    },
  });
}

/**
 * Decline a handoff
 */
export function useDeclineHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      responseMessage,
    }: {
      requestId: string;
      responseMessage?: string;
    }) => {
      const res = await fetch(`${API_BASE}/collaboration/handoff/${requestId}/decline`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseMessage }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to decline handoff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoff-queue'] });
    },
  });
}

// =====================================================
// THREAD MUTATIONS
// =====================================================

/**
 * Create a thread
 */
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateCollaborationThreadInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/collaboration/threads`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create thread');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-discussion', variables.campaignId],
      });
    },
  });
}

/**
 * Add a comment
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateCollaborationCommentInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/collaboration/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add comment');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the campaign discussion to refresh comments
      queryClient.invalidateQueries({ queryKey: ['campaign-discussion'] });
      queryClient.invalidateQueries({ queryKey: ['thread-summary', variables.threadId] });
    },
  });
}

/**
 * Summarize a thread
 */
export function useSummarizeThread() {
  return useMutation({
    mutationFn: async ({
      threadId,
      maxLength,
      includeActionItems,
    }: {
      threadId: string;
      maxLength?: number;
      includeActionItems?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/collaboration/threads/${threadId}/summarize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxLength, includeActionItems }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize thread');
      }
      return res.json() as Promise<{ success: boolean; summary: ThreadSummary }>;
    },
  });
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Get user's handoff queue
 */
export function useHandoffQueue(refetchInterval?: number) {
  return useQuery({
    queryKey: ['handoff-queue'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/collaboration/handoff/queue`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch handoff queue');
      return res.json() as Promise<{
        success: boolean;
        requests: EnrichedHandoffRequest[];
        total: number;
      }>;
    },
    refetchInterval,
  });
}

/**
 * Get campaign discussion
 */
export function useCampaignDiscussion(campaignId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-discussion', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/collaboration/campaign/${campaignId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign discussion');
      return res.json() as Promise<
        CampaignCollaborationContext & { success: boolean }
      >;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get thread summary (cached)
 */
export function useThreadSummary(threadId: string | null) {
  return useQuery({
    queryKey: ['thread-summary', threadId],
    queryFn: async () => {
      if (!threadId) return null;

      // First check if summary exists in thread data (from campaign discussion)
      // If not, this would require a separate endpoint or manual trigger
      return null;
    },
    enabled: !!threadId,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get handoff statistics
 */
export function useHandoffStats() {
  const { data } = useHandoffQueue();

  if (!data) return null;

  const { requests } = data;

  const byType = requests.reduce((acc, req) => {
    acc[req.handoffType] = (acc[req.handoffType] || 0) + 1;
    return acc;
  }, {} as Record<HandoffType, number>);

  const expiringSoon = requests.filter((req) => {
    if (!req.expiresAt) return false;
    const expiresIn = new Date(req.expiresAt).getTime() - Date.now();
    return expiresIn < 24 * 60 * 60 * 1000; // Less than 24 hours
  });

  return {
    totalPending: requests.length,
    byType,
    expiringSoon: expiringSoon.length,
    oldestRequest: requests.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0],
  };
}

/**
 * Get discussion statistics
 */
export function useDiscussionStats(campaignId: string | null) {
  const { data } = useCampaignDiscussion(campaignId);

  if (!data) return null;

  const { threads, comments, totalThreads, totalComments } = data;

  const activeThreads = threads.filter((t) => !t.isLocked && t.commentCount > 0);
  const privateThreads = threads.filter((t) => t.isPrivate);
  const pinnedThreads = threads.filter((t) => t.isPinned);

  // Get most active thread
  const mostActiveThread = threads.sort((a, b) => b.commentCount - a.commentCount)[0];

  // Get recent activity
  const recentComments = Object.values(comments)
    .flat()
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return {
    totalThreads,
    totalComments,
    activeThreads: activeThreads.length,
    privateThreads: privateThreads.length,
    pinnedThreads: pinnedThreads.length,
    mostActiveThread,
    recentComments,
  };
}

/**
 * Get thread by ID from campaign discussion
 */
export function useThread(campaignId: string | null, threadId: string | null) {
  const { data } = useCampaignDiscussion(campaignId);

  if (!data || !threadId) return null;

  const thread = data.threads.find((t) => t.id === threadId);
  const threadComments = data.comments[threadId] || [];

  return thread ? { thread, comments: threadComments } : null;
}

/**
 * Get mentions for current user in campaign
 */
export function useMentions(campaignId: string | null) {
  const { data } = useCampaignDiscussion(campaignId);

  // TODO: This would need user ID from auth context
  // For now, return empty array
  if (!data) return [];

  // Filter comments that mention current user
  const currentUserId = ''; // Get from auth context

  const mentions = Object.values(data.comments)
    .flat()
    .filter((comment) => comment.mentions.includes(currentUserId))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return mentions;
}

/**
 * Get unread comment count (would need read tracking)
 */
export function useUnreadCount(campaignId: string | null) {
  const { data } = useCampaignDiscussion(campaignId);

  // TODO: Implement read tracking
  // For now, return 0
  return 0;
}

/**
 * Real-time discussion updates
 */
export function useRealtimeDiscussion(campaignId: string | null) {
  return useCampaignDiscussion(campaignId, 30000); // Poll every 30 seconds
}

/**
 * Get handoff by type
 */
export function useHandoffsByType(handoffType: HandoffType) {
  const { data } = useHandoffQueue();

  if (!data) return [];

  return data.requests.filter((req) => req.handoffType === handoffType);
}
