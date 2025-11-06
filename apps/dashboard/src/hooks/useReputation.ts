import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MediaMention,
  MentionSearchParams,
  MonitoringRule,
  CreateMonitoringRuleInput,
  UpdateMonitoringRuleInput,
  MentionAlert,
  SubmitFeedbackInput,
  MonitoringSnapshot,
  MentionTrendsResponse,
  MonitoringStats,
  SimilarMention,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MEDIA MENTIONS QUERIES
// =====================================================

export function useMediaMentions(params: MentionSearchParams) {
  return useQuery<{ mentions: MediaMention[]; total: number }>({
    queryKey: ['reputation', 'mentions', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      if (params.mentionType) queryParams.append('mentionType', JSON.stringify(params.mentionType));
      if (params.medium) queryParams.append('medium', JSON.stringify(params.medium));
      if (params.sentiment) queryParams.append('sentiment', JSON.stringify(params.sentiment));
      if (params.minRelevance !== undefined) queryParams.append('minRelevance', String(params.minRelevance));
      if (params.minVisibility !== undefined) queryParams.append('minVisibility', String(params.minVisibility));
      if (params.isViral !== undefined) queryParams.append('isViral', String(params.isViral));
      if (params.startDate) queryParams.append('startDate', params.startDate.toISOString());
      if (params.endDate) queryParams.append('endDate', params.endDate.toISOString());
      if (params.outlet) queryParams.append('outlet', params.outlet);
      if (params.topics) queryParams.append('topics', JSON.stringify(params.topics));
      if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.offset) queryParams.append('offset', String(params.offset));
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const res = await fetch(`${API_BASE}/reputation/mentions?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch mentions');
      return res.json();
    },
  });
}

export function useMediaMention(id: string | null) {
  return useQuery<MediaMention>({
    queryKey: ['reputation', 'mentions', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`${API_BASE}/reputation/mentions/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch mention');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useSimilarMentions(mentionId: string | null, limit = 10) {
  return useQuery<SimilarMention[]>({
    queryKey: ['reputation', 'mentions', mentionId, 'similar', limit],
    queryFn: async () => {
      if (!mentionId) return [];
      const res = await fetch(`${API_BASE}/reputation/mentions/${mentionId}/similar?limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch similar mentions');
      return res.json();
    },
    enabled: !!mentionId,
  });
}

// =====================================================
// TRENDS & ANALYTICS QUERIES
// =====================================================

export function useMentionTrends(
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
) {
  return useQuery<MentionTrendsResponse>({
    queryKey: ['reputation', 'trends', startDate, endDate, granularity],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity,
      });

      const res = await fetch(`${API_BASE}/reputation/trends?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
  });
}

export function useMonitoringStats(startDate?: Date, endDate?: Date) {
  return useQuery<MonitoringStats>({
    queryKey: ['reputation', 'stats', startDate, endDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate.toISOString());
      if (endDate) queryParams.append('endDate', endDate.toISOString());

      const res = await fetch(`${API_BASE}/reputation/stats?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

// =====================================================
// MONITORING RULES QUERIES
// =====================================================

export function useMonitoringRules(activeOnly = true) {
  return useQuery<MonitoringRule[]>({
    queryKey: ['reputation', 'rules', activeOnly],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        activeOnly: String(activeOnly),
      });

      const res = await fetch(`${API_BASE}/reputation/rules?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch rules');
      return res.json();
    },
  });
}

// =====================================================
// MONITORING RULES MUTATIONS
// =====================================================

export function useCreateMonitoringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMonitoringRuleInput) => {
      const res = await fetch(`${API_BASE}/reputation/rules`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation', 'rules'] });
    },
  });
}

export function useUpdateMonitoringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMonitoringRuleInput }) => {
      const res = await fetch(`${API_BASE}/reputation/rules/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update rule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation', 'rules'] });
    },
  });
}

export function useDeleteMonitoringRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/reputation/rules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete rule');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation', 'rules'] });
    },
  });
}

// =====================================================
// ALERTS QUERIES
// =====================================================

export function useAlerts(limit = 50, offset = 0) {
  return useQuery<MentionAlert[]>({
    queryKey: ['reputation', 'alerts', limit, offset],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      const res = await fetch(`${API_BASE}/reputation/alerts?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// =====================================================
// ALERTS MUTATIONS
// =====================================================

export function useMarkAlertAsViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/reputation/alerts/${id}/view`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to mark alert as viewed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation', 'alerts'] });
    },
  });
}

// =====================================================
// FEEDBACK MUTATIONS
// =====================================================

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      const res = await fetch(`${API_BASE}/reputation/mentions/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation', 'mentions'] });
    },
  });
}

// =====================================================
// SNAPSHOTS QUERIES
// =====================================================

export function useMonitoringSnapshots(
  startDate: Date,
  endDate: Date,
  snapshotType: string = 'DAILY'
) {
  return useQuery<MonitoringSnapshot[]>({
    queryKey: ['reputation', 'snapshots', startDate, endDate, snapshotType],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        snapshotType,
      });

      const res = await fetch(`${API_BASE}/reputation/snapshots?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch snapshots');
      return res.json();
    },
  });
}
