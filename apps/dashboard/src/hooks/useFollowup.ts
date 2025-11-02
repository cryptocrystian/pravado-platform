import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  FollowupSequence,
  FollowupStep,
  ScheduledFollowup,
  CreateFollowupSequenceInput,
  UpdateFollowupSequenceInput,
  CreateFollowupStepInput,
  UpdateFollowupStepInput,
  GenerateFollowupsInput,
  RescheduleFollowupInput,
  CancelFollowupSequenceInput,
  ExecuteFollowupInput,
  FollowupSequenceWithSteps,
  FollowupSequenceSummary,
  ContactFollowupStatus,
  FollowupBatchExecutionResult,
  FollowupExecutionResult,
  DueFollowup,
  FollowupTriggerEvaluation,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// SEQUENCE MUTATIONS
// =====================================================

/**
 * Create followup sequence
 */
export function useCreateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateFollowupSequenceInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/sequences`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create sequence');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-sequences'] });
    },
  });
}

/**
 * Update followup sequence
 */
export function useUpdateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sequenceId,
      ...input
    }: Omit<UpdateFollowupSequenceInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/sequences/${sequenceId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update sequence');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['followup-sequences'] });
      queryClient.invalidateQueries({
        queryKey: ['followup-sequence', variables.sequenceId],
      });
    },
  });
}

/**
 * Delete followup sequence
 */
export function useDeleteSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sequenceId: string) => {
      const res = await fetch(`${API_BASE}/followup/sequences/${sequenceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete sequence');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-sequences'] });
    },
  });
}

// =====================================================
// STEP MUTATIONS
// =====================================================

/**
 * Create followup step
 */
export function useCreateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateFollowupStepInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/steps`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create step');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['followup-sequence', variables.sequenceId],
      });
    },
  });
}

/**
 * Update followup step
 */
export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stepId,
      ...input
    }: Omit<UpdateFollowupStepInput, 'organizationId'> & { stepId: string }) => {
      const res = await fetch(`${API_BASE}/followup/steps/${stepId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update step');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-sequence'] });
    },
  });
}

/**
 * Delete followup step
 */
export function useDeleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stepId: string) => {
      const res = await fetch(`${API_BASE}/followup/steps/${stepId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete step');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-sequence'] });
    },
  });
}

// =====================================================
// EXECUTION MUTATIONS
// =====================================================

/**
 * Generate followups for campaign
 */
export function useGenerateFollowups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<GenerateFollowupsInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate followups');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['due-followups'] });
    },
  });
}

/**
 * Evaluate followup triggers
 */
export function useEvaluateTriggers() {
  return useMutation({
    mutationFn: async (followupId: string) => {
      const res = await fetch(`${API_BASE}/followup/evaluate/${followupId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to evaluate triggers');
      }
      return res.json() as Promise<{ success: boolean; evaluation: FollowupTriggerEvaluation }>;
    },
  });
}

/**
 * Reschedule followup
 */
export function useRescheduleFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      followupId,
      ...input
    }: Omit<RescheduleFollowupInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/reschedule/${followupId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reschedule followup');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['due-followups'] });
    },
  });
}

/**
 * Cancel followup sequence for contact
 */
export function useCancelSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CancelFollowupSequenceInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cancel sequence');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['contact-followup-status'] });
    },
  });
}

/**
 * Execute single followup
 */
export function useExecuteFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      followupId,
      dryRun = false,
    }: Omit<ExecuteFollowupInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/followup/execute/${followupId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to execute followup');
      }
      return res.json() as Promise<FollowupExecutionResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['due-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sequence-summary'] });
    },
  });
}

/**
 * Execute batch of due followups
 */
export function useExecuteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (limit: number = 50) => {
      const res = await fetch(`${API_BASE}/followup/execute-batch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to execute batch');
      }
      return res.json() as Promise<FollowupBatchExecutionResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['due-followups'] });
      queryClient.invalidateQueries({ queryKey: ['sequence-summary'] });
    },
  });
}

// =====================================================
// QUERIES
// =====================================================

/**
 * List followup sequences
 */
export function useFollowupSequences(options?: {
  campaignId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['followup-sequences', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.campaignId) params.append('campaignId', options.campaignId);
      if (options?.isActive !== undefined)
        params.append('isActive', String(options.isActive));
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const res = await fetch(
        `${API_BASE}/followup/sequences${params.toString() ? '?' + params.toString() : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch sequences');
      return res.json() as Promise<{
        success: boolean;
        sequences: FollowupSequence[];
        total: number;
        limit: number;
        offset: number;
      }>;
    },
  });
}

/**
 * Get followup sequence with steps
 */
export function useFollowupSequence(sequenceId: string | null) {
  return useQuery({
    queryKey: ['followup-sequence', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return null;
      const res = await fetch(`${API_BASE}/followup/sequences/${sequenceId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sequence');
      return res.json() as Promise<{
        success: boolean;
        sequence: FollowupSequenceWithSteps;
      }>;
    },
    enabled: !!sequenceId,
  });
}

/**
 * Get sequence summary with statistics
 */
export function useSequenceSummary(sequenceId: string | null) {
  return useQuery({
    queryKey: ['sequence-summary', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return null;
      const res = await fetch(`${API_BASE}/followup/sequences/${sequenceId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sequence summary');
      return res.json() as Promise<{
        success: boolean;
        summary: FollowupSequenceSummary;
      }>;
    },
    enabled: !!sequenceId,
  });
}

/**
 * List scheduled followups
 */
export function useScheduledFollowups(options?: {
  campaignId?: string;
  sequenceId?: string;
  contactId?: string;
  status?: string;
  scheduledBefore?: string;
  scheduledAfter?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['scheduled-followups', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.campaignId) params.append('campaignId', options.campaignId);
      if (options?.sequenceId) params.append('sequenceId', options.sequenceId);
      if (options?.contactId) params.append('contactId', options.contactId);
      if (options?.status) params.append('status', options.status);
      if (options?.scheduledBefore)
        params.append('scheduledBefore', options.scheduledBefore);
      if (options?.scheduledAfter) params.append('scheduledAfter', options.scheduledAfter);
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const res = await fetch(
        `${API_BASE}/followup/scheduled${params.toString() ? '?' + params.toString() : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch scheduled followups');
      return res.json() as Promise<{
        success: boolean;
        followups: ScheduledFollowup[];
        total: number;
        limit: number;
        offset: number;
      }>;
    },
  });
}

/**
 * Get due followups
 */
export function useDueFollowups(limit: number = 100, refetchInterval?: number) {
  return useQuery({
    queryKey: ['due-followups', limit],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/followup/due?limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch due followups');
      return res.json() as Promise<{
        success: boolean;
        followups: DueFollowup[];
        count: number;
      }>;
    },
    refetchInterval,
  });
}

/**
 * Get contact followup status
 */
export function useContactFollowupStatus(contactId: string | null) {
  return useQuery({
    queryKey: ['contact-followup-status', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const res = await fetch(`${API_BASE}/followup/contacts/${contactId}/status`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch contact status');
      return res.json() as Promise<{
        success: boolean;
        status: ContactFollowupStatus;
      }>;
    },
    enabled: !!contactId,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get followup statistics
 */
export function useFollowupStats(campaignId?: string) {
  const { data: scheduledData } = useScheduledFollowups({ campaignId });
  const { data: dueData } = useDueFollowups();

  if (!scheduledData) return null;

  const { followups } = scheduledData;

  const totalScheduled = followups.length;
  const totalPending = followups.filter((f) => f.status === 'PENDING').length;
  const totalSent = followups.filter((f) => f.status === 'SENT').length;
  const totalCanceled = followups.filter((f) => f.status === 'CANCELED').length;
  const totalFailed = followups.filter((f) => f.status === 'FAILED').length;
  const totalSkipped = followups.filter((f) => f.status === 'SKIPPED').length;

  const sentFollowups = followups.filter((f) => f.status === 'SENT');
  const openRate =
    sentFollowups.length > 0
      ? sentFollowups.filter((f) => f.wasOpened).length / sentFollowups.length
      : 0;
  const clickRate =
    sentFollowups.length > 0
      ? sentFollowups.filter((f) => f.wasClicked).length / sentFollowups.length
      : 0;
  const replyRate =
    sentFollowups.length > 0
      ? sentFollowups.filter((f) => f.wasReplied).length / sentFollowups.length
      : 0;

  return {
    totalScheduled,
    totalPending,
    totalSent,
    totalCanceled,
    totalFailed,
    totalSkipped,
    totalDue: dueData?.count || 0,
    openRate,
    clickRate,
    replyRate,
    upcomingFollowups: followups
      .filter((f) => f.status === 'PENDING')
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
      .slice(0, 5),
  };
}

/**
 * Get sequence performance
 */
export function useSequencePerformance(sequenceId: string | null) {
  const { data } = useSequenceSummary(sequenceId);

  if (!data?.summary) return null;

  const { summary } = data;
  const { statistics } = summary;

  return {
    totalFollowups: statistics.totalScheduled,
    sentCount: statistics.totalSent,
    pendingCount: statistics.totalPending,
    canceledCount: statistics.totalCanceled,
    failedCount: statistics.totalFailed,
    completionRate:
      statistics.totalScheduled > 0
        ? statistics.totalSent / statistics.totalScheduled
        : 0,
    engagementRate:
      statistics.avgOpenRate +
      statistics.avgClickRate +
      statistics.avgReplyRate,
    metrics: {
      openRate: statistics.avgOpenRate,
      clickRate: statistics.avgClickRate,
      replyRate: statistics.avgReplyRate,
    },
  };
}

/**
 * Get contact followup timeline
 */
export function useContactFollowupTimeline(contactId: string | null) {
  const { data: statusData } = useContactFollowupStatus(contactId);
  const { data: followupsData } = useScheduledFollowups({ contactId });

  if (!statusData || !followupsData) return null;

  const { status } = statusData;
  const { followups } = followupsData;

  return {
    activeSequences: status.sequences.filter((s) => s.status === 'active').length,
    completedSequences: status.sequences.filter((s) => s.status === 'completed')
      .length,
    canceledSequences: status.sequences.filter((s) => s.status === 'canceled')
      .length,
    nextFollowup: followups
      .filter((f) => f.status === 'PENDING')
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )[0],
    recentSent: followups
      .filter((f) => f.status === 'SENT')
      .sort(
        (a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime()
      )
      .slice(0, 5),
    timeline: followups.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    ),
  };
}
