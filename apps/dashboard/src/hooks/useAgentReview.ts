import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AgentReview,
  CreateAgentReviewInput,
  UpdateAgentReviewInput,
  SubmitReviewDecisionInput,
  CreateReviewCommentInput,
  ReviewComment,
  ReviewContext,
  ReviewDecisionResult,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// REVIEW QUERIES
// =====================================================

/**
 * Get pending reviews for the current user
 */
export function usePendingReviews() {
  return useQuery<AgentReview[]>({
    queryKey: ['reviews', 'pending'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/reviews/pending`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch pending reviews');
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds for new reviews
  });
}

/**
 * Get a specific review by ID
 */
export function useReview(reviewId: string | null) {
  return useQuery<AgentReview>({
    queryKey: ['reviews', reviewId],
    queryFn: async () => {
      if (!reviewId) return null;
      const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch review');
      return res.json();
    },
    enabled: !!reviewId,
    refetchInterval: (data) => {
      // Poll more frequently for pending/escalated reviews
      if (data?.status === 'PENDING' || data?.status === 'ESCALATED') return 10000; // 10 seconds
      return false; // Don't poll for completed reviews
    },
  });
}

/**
 * Get review context for a specific entity
 */
export function useReviewContext(entityType: string | null, entityId: string | null) {
  return useQuery<ReviewContext>({
    queryKey: ['reviews', 'context', entityType, entityId],
    queryFn: async () => {
      if (!entityType || !entityId) return null;
      const res = await fetch(`${API_BASE}/reviews/context/${entityType}/${entityId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch review context');
      return res.json();
    },
    enabled: !!(entityType && entityId),
  });
}

// =====================================================
// REVIEW MUTATIONS
// =====================================================

/**
 * Create a new review request
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAgentReviewInput) => {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create review');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
    },
  });
}

/**
 * Update review metadata
 */
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      data,
    }: {
      reviewId: string;
      data: UpdateAgentReviewInput;
    }) => {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update review');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
    },
  });
}

// =====================================================
// DECISION MUTATIONS
// =====================================================

/**
 * Submit a review decision (approve, reject, needs edit)
 */
export function useSubmitReviewDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitReviewDecisionInput) => {
      const res = await fetch(`${API_BASE}/reviews/decision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit decision');
      }
      return res.json() as Promise<ReviewDecisionResult>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
    },
  });
}

/**
 * Approve a review (convenience hook)
 */
export function useApproveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      decisionSummary,
      decisionReasoning,
    }: {
      reviewId: string;
      decisionSummary?: string;
      decisionReasoning?: string;
    }) => {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionSummary, decisionReasoning }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve review');
      }
      return res.json() as Promise<ReviewDecisionResult>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
    },
  });
}

/**
 * Reject a review (convenience hook)
 */
export function useRejectReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      decisionSummary,
      decisionReasoning,
    }: {
      reviewId: string;
      decisionSummary: string;
      decisionReasoning?: string;
    }) => {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionSummary, decisionReasoning }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject review');
      }
      return res.json() as Promise<ReviewDecisionResult>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
    },
  });
}

/**
 * Request edits for a review (convenience hook)
 */
export function useRequestEdits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      decisionSummary,
      decisionReasoning,
      modifications,
    }: {
      reviewId: string;
      decisionSummary: string;
      decisionReasoning?: string;
      modifications?: Record<string, any>;
    }) => {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/request-edits`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionSummary, decisionReasoning, modifications }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to request edits');
      }
      return res.json() as Promise<ReviewDecisionResult>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] });
    },
  });
}

// =====================================================
// COMMENT MUTATIONS
// =====================================================

/**
 * Add a comment to a review
 */
export function useAddReviewComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReviewCommentInput) => {
      const res = await fetch(`${API_BASE}/reviews/${input.reviewId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add comment');
      }
      return res.json() as Promise<ReviewComment>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.reviewId, 'comments'] });
    },
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Check if an entity requires review
 */
export function useCheckReviewRequired() {
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      metadata,
    }: {
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
    }) => {
      const res = await fetch(`${API_BASE}/reviews/check-required`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, metadata }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to check review requirement');
      }
      return res.json() as Promise<{
        requiresReview: boolean;
        reviewType?: string;
        priority?: string;
        reason?: string;
      }>;
    },
  });
}

/**
 * Hook to monitor review status changes
 */
export function useReviewStatus(reviewId: string | null) {
  const { data: review } = useReview(reviewId);

  if (!review) return null;

  return {
    isPending: review.status === 'PENDING',
    isApproved: review.status === 'APPROVED',
    isRejected: review.status === 'REJECTED',
    needsEdit: review.status === 'NEEDS_EDIT',
    isEscalated: review.status === 'ESCALATED',
    isWithdrawn: review.status === 'WITHDRAWN',
    canReview: review.status === 'PENDING' || review.status === 'ESCALATED',
  };
}

/**
 * Hook to calculate review urgency
 */
export function useReviewUrgency(reviewId: string | null) {
  const { data: review } = useReview(reviewId);

  if (!review) return null;

  const now = new Date();
  const dueDate = review.dueDate ? new Date(review.dueDate) : null;
  const hoursUntilDue = dueDate
    ? (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    : null;

  return {
    isOverdue: dueDate ? now > dueDate : false,
    hoursUntilDue,
    isCritical: review.priority === 'CRITICAL',
    isHighPriority: review.priority === 'HIGH' || review.priority === 'CRITICAL',
    urgencyLevel:
      review.priority === 'CRITICAL'
        ? 'critical'
        : hoursUntilDue && hoursUntilDue < 2
          ? 'urgent'
          : hoursUntilDue && hoursUntilDue < 12
            ? 'soon'
            : 'normal',
  };
}

/**
 * Hook to get review statistics for a user
 */
export function useReviewStats() {
  const { data: pendingReviews } = usePendingReviews();

  if (!pendingReviews) return null;

  const criticalCount = pendingReviews.filter((r) => r.priority === 'CRITICAL').length;
  const highCount = pendingReviews.filter((r) => r.priority === 'HIGH').length;
  const overdueCount = pendingReviews.filter(
    (r) => r.dueDate && new Date(r.dueDate) < new Date()
  ).length;

  return {
    totalPending: pendingReviews.length,
    criticalCount,
    highCount,
    overdueCount,
    hasUrgentReviews: criticalCount > 0 || overdueCount > 0,
  };
}
