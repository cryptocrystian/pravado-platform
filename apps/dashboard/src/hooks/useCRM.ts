import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ContactInteraction,
  CreateInteractionInput,
  UpdateInteractionInput,
  ContactRelationship,
  CreateRelationshipInput,
  UpdateRelationshipInput,
  FollowUp,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  RecentActivityView,
  RelationshipStrengthView,
  OverdueFollowUpView,
  UserCRMStats,
  InteractionSummary,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// INTERACTION QUERIES
// =====================================================

export function useContactInteractions(contactId: string | null, limit = 50, offset = 0) {
  return useQuery<ContactInteraction[]>({
    queryKey: ['crm', 'interactions', contactId, limit, offset],
    queryFn: async () => {
      if (!contactId) return [];
      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const res = await fetch(`${API_BASE}/crm/interactions/${contactId}?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch interactions');
      return res.json();
    },
    enabled: !!contactId,
  });
}

export function useInteraction(id: string | null) {
  return useQuery<ContactInteraction>({
    queryKey: ['crm', 'interactions', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`${API_BASE}/crm/interactions/${id}/detail`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch interaction');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useInteractionSummary(contactId: string | null) {
  return useQuery<InteractionSummary>({
    queryKey: ['crm', 'interactions', contactId, 'summary'],
    queryFn: async () => {
      if (!contactId) return null;
      const res = await fetch(`${API_BASE}/crm/interactions/${contactId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch interaction summary');
      return res.json();
    },
    enabled: !!contactId,
  });
}

// =====================================================
// INTERACTION MUTATIONS
// =====================================================

export function useLogInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInteractionInput) => {
      const res = await fetch(`${API_BASE}/crm/interactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to log interaction');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'relationships'] });
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInteractionInput }) => {
      const res = await fetch(`${API_BASE}/crm/interactions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update interaction');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions', data.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions', 'detail', data.id] });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/crm/interactions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete interaction');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'interactions'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'activity'] });
    },
  });
}

// =====================================================
// RELATIONSHIP QUERIES
// =====================================================

export function useRelationship(contactId: string | null) {
  return useQuery<ContactRelationship>({
    queryKey: ['crm', 'relationships', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const res = await fetch(`${API_BASE}/crm/relationships/${contactId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch relationship');
      }
      return res.json();
    },
    enabled: !!contactId,
  });
}

export function useUserRelationships(activeOnly = true, limit = 100, offset = 0) {
  return useQuery<ContactRelationship[]>({
    queryKey: ['crm', 'relationships', 'user', activeOnly, limit, offset],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('activeOnly', String(activeOnly));
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const res = await fetch(`${API_BASE}/crm/relationships?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch relationships');
      return res.json();
    },
  });
}

export function useRelationshipStrengths(limit = 50, offset = 0) {
  return useQuery<RelationshipStrengthView[]>({
    queryKey: ['crm', 'relationships', 'strengths', limit, offset],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const res = await fetch(`${API_BASE}/crm/relationships/strengths?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch relationship strengths');
      return res.json();
    },
  });
}

// =====================================================
// RELATIONSHIP MUTATIONS
// =====================================================

export function useCreateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRelationshipInput) => {
      const res = await fetch(`${API_BASE}/crm/relationships`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create relationship');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'relationships', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'relationships', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'stats'] });
    },
  });
}

export function useUpdateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: UpdateRelationshipInput }) => {
      const res = await fetch(`${API_BASE}/crm/relationships/${contactId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update relationship');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'relationships', data.contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'relationships', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'relationships', 'strengths'] });
    },
  });
}

// =====================================================
// FOLLOW-UP QUERIES
// =====================================================

export function useFollowUp(id: string | null) {
  return useQuery<FollowUp>({
    queryKey: ['crm', 'follow-ups', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`${API_BASE}/crm/follow-ups/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch follow-up');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUserFollowUps(status?: string, limit = 50, offset = 0) {
  return useQuery<FollowUp[]>({
    queryKey: ['crm', 'follow-ups', 'user', status, limit, offset],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const res = await fetch(`${API_BASE}/crm/follow-ups?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch follow-ups');
      return res.json();
    },
  });
}

export function usePendingFollowUps(limit = 50) {
  return useQuery<FollowUp[]>({
    queryKey: ['crm', 'follow-ups', 'pending', limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(limit));

      const res = await fetch(`${API_BASE}/crm/follow-ups/pending?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch pending follow-ups');
      return res.json();
    },
  });
}

export function useOverdueFollowUps(limit = 50, offset = 0) {
  return useQuery<OverdueFollowUpView[]>({
    queryKey: ['crm', 'follow-ups', 'overdue', limit, offset],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const res = await fetch(`${API_BASE}/crm/follow-ups/overdue?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch overdue follow-ups');
      return res.json();
    },
  });
}

// =====================================================
// FOLLOW-UP MUTATIONS
// =====================================================

export function useScheduleFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFollowUpInput) => {
      const res = await fetch(`${API_BASE}/crm/follow-ups`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to schedule follow-up');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'stats'] });
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFollowUpInput }) => {
      const res = await fetch(`${API_BASE}/crm/follow-ups/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update follow-up');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups', data.id] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups', 'overdue'] });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completionNotes }: { id: string; completionNotes?: string }) => {
      const res = await fetch(`${API_BASE}/crm/follow-ups/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionNotes }),
      });
      if (!res.ok) throw new Error('Failed to complete follow-up');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups', data.id] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'stats'] });
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/crm/follow-ups/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete follow-up');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'stats'] });
    },
  });
}

// =====================================================
// ACTIVITY & STATS QUERIES
// =====================================================

export function useRecentActivity(days = 30, limit = 50, offset = 0) {
  return useQuery<RecentActivityView[]>({
    queryKey: ['crm', 'activity', 'recent', days, limit, offset],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('days', String(days));
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));

      const res = await fetch(`${API_BASE}/crm/activity/recent?${queryParams}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch recent activity');
      return res.json();
    },
  });
}

export function useCRMStats() {
  return useQuery<UserCRMStats>({
    queryKey: ['crm', 'stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/crm/stats`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch CRM stats');
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

// =====================================================
// COMBINED HOOKS FOR CONTACT DETAIL
// =====================================================

/**
 * Hook to get all CRM data for a contact (interactions, relationship, follow-ups)
 */
export function useContactCRM(contactId: string | null) {
  const interactions = useContactInteractions(contactId);
  const relationship = useRelationship(contactId);
  const interactionSummary = useInteractionSummary(contactId);

  return {
    interactions: interactions.data || [],
    interactionsLoading: interactions.isLoading,
    relationship: relationship.data,
    relationshipLoading: relationship.isLoading,
    summary: interactionSummary.data,
    summaryLoading: interactionSummary.isLoading,
  };
}
