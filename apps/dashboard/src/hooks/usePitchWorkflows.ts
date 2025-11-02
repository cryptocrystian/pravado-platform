// =====================================================
// PITCH WORKFLOW HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  PitchWorkflow,
  PitchJob,
  PitchEvent,
  PitchWorkflowStats,
  CreatePitchWorkflowInput,
  UpdatePitchWorkflowInput,
  PitchWorkflowStatus,
  PitchJobStatus,
} from '@pravado/shared-types';

// =====================================================
// WORKFLOWS
// =====================================================

export function usePitchWorkflows(status?: PitchWorkflowStatus) {
  return useQuery<PitchWorkflow[]>({
    queryKey: ['pitch-workflows', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await api.get(`/pitch-workflows${params}`);
      return response.data;
    },
  });
}

export function usePitchWorkflow(id: string | null) {
  return useQuery<PitchWorkflow>({
    queryKey: ['pitch-workflow', id],
    queryFn: async () => {
      const response = await api.get(`/pitch-workflows/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreatePitchWorkflow() {
  const queryClient = useQueryClient();
  return useMutation<PitchWorkflow, Error, CreatePitchWorkflowInput>({
    mutationFn: async (input) => {
      const response = await api.post('/pitch-workflows', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch-workflows'] });
    },
  });
}

export function useUpdatePitchWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation<PitchWorkflow, Error, UpdatePitchWorkflowInput>({
    mutationFn: async (input) => {
      const response = await api.patch(`/pitch-workflows/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch-workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['pitch-workflows'] });
    },
  });
}

export function useDeletePitchWorkflow() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/pitch-workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch-workflows'] });
    },
  });
}

// =====================================================
// WORKFLOW ACTIONS
// =====================================================

export function useStartWorkflow() {
  const queryClient = useQueryClient();
  return useMutation<PitchWorkflow, Error, string>({
    mutationFn: async (id) => {
      const response = await api.post(`/pitch-workflows/${id}/start`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitch-workflow', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pitch-workflows'] });
    },
  });
}

export function usePauseWorkflow() {
  const queryClient = useQueryClient();
  return useMutation<PitchWorkflow, Error, string>({
    mutationFn: async (id) => {
      const response = await api.post(`/pitch-workflows/${id}/pause`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitch-workflow', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pitch-workflows'] });
    },
  });
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();
  return useMutation<PitchWorkflow, Error, string>({
    mutationFn: async (id) => {
      const response = await api.post(`/pitch-workflows/${id}/cancel`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pitch-workflow', data.id] });
      queryClient.invalidateQueries({ queryKey: ['pitch-workflows'] });
    },
  });
}

// =====================================================
// WORKFLOW STATS
// =====================================================

export function usePitchWorkflowStats(id: string | null) {
  return useQuery<PitchWorkflowStats>({
    queryKey: ['pitch-workflow-stats', id],
    queryFn: async () => {
      const response = await api.get(`/pitch-workflows/${id}/stats`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: (data) => {
      // Poll every 5 seconds if workflow is running
      if (data?.workflow?.status === 'RUNNING') {
        return 5000;
      }
      return false;
    },
  });
}

// =====================================================
// JOBS
// =====================================================

export function usePitchJobs(workflowId: string | null, status?: PitchJobStatus) {
  return useQuery<PitchJob[]>({
    queryKey: ['pitch-jobs', workflowId, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await api.get(`/pitch-workflows/${workflowId}/jobs${params}`);
      return response.data;
    },
    enabled: !!workflowId,
  });
}

export function usePitchJob(id: string | null) {
  return useQuery<PitchJob>({
    queryKey: ['pitch-job', id],
    queryFn: async () => {
      const response = await api.get(`/pitch-workflows/jobs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// =====================================================
// EVENTS
// =====================================================

export function usePitchEvents(workflowId: string | null) {
  return useQuery<PitchEvent[]>({
    queryKey: ['pitch-events', workflowId],
    queryFn: async () => {
      const response = await api.get(`/pitch-workflows/${workflowId}/events`);
      return response.data;
    },
    enabled: !!workflowId,
  });
}
