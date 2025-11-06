// =====================================================
// CONTENT HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  KeywordCluster,
  ContentItemNew,
  CalendarDay,
  SEOAudit,
  ContentTask,
  ContentStats,
  CreateKeywordClusterInput,
  CreateContentItemInput,
  UpdateContentItemInput,
  CreateSEOAuditInput,
  CreateContentTaskInput,
  UpdateContentTaskInput,
  GenerateContentIdeasInput,
  GeneratedContentIdea,
} from '@pravado/types';

// KEYWORD CLUSTERS
export function useKeywordClusters() {
  return useQuery<KeywordCluster[]>({
    queryKey: ['keyword-clusters'],
    queryFn: async () => {
      const response = await api.get('/content/clusters');
      return response.data;
    },
  });
}

export function useCreateKeywordCluster() {
  const queryClient = useQueryClient();
  return useMutation<KeywordCluster, Error, CreateKeywordClusterInput>({
    mutationFn: async (input) => {
      const response = await api.post('/content/clusters', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-clusters'] });
    },
  });
}

// CONTENT ITEMS
export function useContentItems(filters?: {
  status?: string;
  format?: string;
  clusterId?: string;
  assignedTo?: string;
}) {
  return useQuery<ContentItemNew[]>({
    queryKey: ['content-items', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.format) params.append('format', filters.format);
      if (filters?.clusterId) params.append('clusterId', filters.clusterId);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      const response = await api.get(`/content/items?${params.toString()}`);
      return response.data;
    },
  });
}

export function useContentItem(id: string | null) {
  return useQuery<ContentItemNew>({
    queryKey: ['content-item', id],
    queryFn: async () => {
      const response = await api.get(`/content/items/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateContentItem() {
  const queryClient = useQueryClient();
  return useMutation<ContentItemNew, Error, CreateContentItemInput>({
    mutationFn: async (input) => {
      const response = await api.post('/content/items', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

export function useUpdateContentItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation<ContentItemNew, Error, UpdateContentItemInput>({
    mutationFn: async (input) => {
      const response = await api.patch(`/content/items/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-item', id] });
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

export function useDeleteContentItem() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/content/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
    },
  });
}

export function useContentStats() {
  return useQuery<ContentStats>({
    queryKey: ['content-stats'],
    queryFn: async () => {
      const response = await api.get('/content/stats');
      return response.data;
    },
  });
}

// CALENDAR
export function useContentCalendar(month: number, year: number) {
  return useQuery<CalendarDay[]>({
    queryKey: ['content-calendar', month, year],
    queryFn: async () => {
      const response = await api.get(`/content/calendar?month=${month}&year=${year}`);
      return response.data;
    },
  });
}

// SEO AUDITS
export function useSEOAudits(contentItemId?: string) {
  return useQuery<SEOAudit[]>({
    queryKey: ['seo-audits', contentItemId],
    queryFn: async () => {
      const params = contentItemId ? `?contentItemId=${contentItemId}` : '';
      const response = await api.get(`/content/seo/audits${params}`);
      return response.data;
    },
  });
}

export function useCreateSEOAudit() {
  const queryClient = useQueryClient();
  return useMutation<SEOAudit, Error, CreateSEOAuditInput>({
    mutationFn: async (input) => {
      const response = await api.post('/content/seo/audits', input);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seo-audits'] });
      if (variables.contentItemId) {
        queryClient.invalidateQueries({ queryKey: ['seo-audits', variables.contentItemId] });
      }
    },
  });
}

// TASKS
export function useContentTasks(contentItemId: string | null) {
  return useQuery<ContentTask[]>({
    queryKey: ['content-tasks', contentItemId],
    queryFn: async () => {
      const response = await api.get(`/content/items/${contentItemId}/tasks`);
      return response.data;
    },
    enabled: !!contentItemId,
  });
}

export function useCreateContentTask() {
  const queryClient = useQueryClient();
  return useMutation<ContentTask, Error, CreateContentTaskInput>({
    mutationFn: async (input) => {
      const response = await api.post(`/content/items/${input.contentItemId}/tasks`, input);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-tasks', data.contentItemId] });
    },
  });
}

export function useUpdateContentTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation<ContentTask, Error, UpdateContentTaskInput>({
    mutationFn: async (input) => {
      const response = await api.patch(`/content/tasks/${taskId}`, input);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-tasks', data.contentItemId] });
    },
  });
}

// AI
export function useGenerateContentIdeas() {
  return useMutation<{ ideas: GeneratedContentIdea[] }, Error, GenerateContentIdeasInput>({
    mutationFn: async (input) => {
      const response = await api.post('/content/ideas', input);
      return response.data;
    },
  });
}

export function useEnhanceContent() {
  const queryClient = useQueryClient();
  return useMutation<ContentItemNew, Error, string>({
    mutationFn: async (contentItemId) => {
      const response = await api.post(`/content/items/${contentItemId}/enhance`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-item', data.id] });
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}
