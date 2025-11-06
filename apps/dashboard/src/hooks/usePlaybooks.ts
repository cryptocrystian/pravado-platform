// =====================================================
// PLAYBOOKS HOOKS
// Sprint 41 Phase 3.4 Days 3-6
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Playbook,
  PlaybookWithSteps,
  PlaybookExecution,
  PlaybookExecutionWithResults,
  ExecutionProgress,
  PlaybookExecutionSummary,
  CreatePlaybookInput,
  UpdatePlaybookInput,
  ExecutePlaybookInput,
  PlaybooksQueryFilters,
  ExecutionsQueryFilters,
} from '@pravado/types';
import { apiClient } from '../lib/api';

// =====================================================
// PLAYBOOK QUERIES
// =====================================================

/**
 * Fetch playbooks list
 */
export function usePlaybooks(filters?: PlaybooksQueryFilters) {
  return useQuery({
    queryKey: ['playbooks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.status) params.append('status', filters.status as string);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.agentId) params.append('agentId', filters.agentId);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.orderBy) params.append('orderBy', filters.orderBy);
      if (filters?.orderDirection) params.append('orderDirection', filters.orderDirection);

      const response = await apiClient.get(`/playbooks?${params.toString()}`);
      return response.data;
    },
  });
}

/**
 * Fetch single playbook
 */
export function usePlaybook(playbookId: string | undefined) {
  return useQuery({
    queryKey: ['playbook', playbookId],
    queryFn: async () => {
      if (!playbookId) throw new Error('Playbook ID is required');
      const response = await apiClient.get(`/playbooks/${playbookId}`);
      return response.data as Playbook;
    },
    enabled: !!playbookId,
  });
}

/**
 * Fetch playbook with steps
 */
export function usePlaybookWithSteps(playbookId: string | undefined) {
  return useQuery({
    queryKey: ['playbook-with-steps', playbookId],
    queryFn: async () => {
      if (!playbookId) throw new Error('Playbook ID is required');
      const response = await apiClient.get(`/playbooks/${playbookId}/with-steps`);
      return response.data as PlaybookWithSteps;
    },
    enabled: !!playbookId,
  });
}

/**
 * Fetch playbook execution summary
 */
export function usePlaybookSummary(playbookId: string | undefined) {
  return useQuery({
    queryKey: ['playbook-summary', playbookId],
    queryFn: async () => {
      if (!playbookId) throw new Error('Playbook ID is required');
      const response = await apiClient.get(`/playbooks/${playbookId}/summary`);
      return response.data as PlaybookExecutionSummary;
    },
    enabled: !!playbookId,
  });
}

// =====================================================
// PLAYBOOK MUTATIONS
// =====================================================

/**
 * Create playbook
 */
export function useCreatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePlaybookInput) => {
      const response = await apiClient.post('/playbooks', input);
      return response.data as Playbook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
  });
}

/**
 * Update playbook
 */
export function useUpdatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdatePlaybookInput }) => {
      const response = await apiClient.patch(`/playbooks/${id}`, input);
      return response.data as Playbook;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      queryClient.invalidateQueries({ queryKey: ['playbook', data.id] });
      queryClient.invalidateQueries({ queryKey: ['playbook-with-steps', data.id] });
    },
  });
}

/**
 * Delete playbook
 */
export function useDeletePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playbookId: string) => {
      await apiClient.delete(`/playbooks/${playbookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
  });
}

// =====================================================
// EXECUTION QUERIES
// =====================================================

/**
 * Fetch playbook executions
 */
export function useExecutions(filters?: ExecutionsQueryFilters) {
  return useQuery({
    queryKey: ['executions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.playbookId) params.append('playbookId', filters.playbookId);
      if (filters?.status) params.append('status', filters.status as string);
      if (filters?.triggeredBy) params.append('triggeredBy', filters.triggeredBy);
      if (filters?.triggerSource) params.append('triggerSource', filters.triggerSource);
      if (filters?.startedAfter) params.append('startedAfter', filters.startedAfter);
      if (filters?.startedBefore) params.append('startedBefore', filters.startedBefore);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.orderBy) params.append('orderBy', filters.orderBy);
      if (filters?.orderDirection) params.append('orderDirection', filters.orderDirection);

      const response = await apiClient.get(`/playbooks/executions?${params.toString()}`);
      return response.data;
    },
  });
}

/**
 * Fetch single execution
 */
export function useExecution(executionId: string | undefined) {
  return useQuery({
    queryKey: ['execution', executionId],
    queryFn: async () => {
      if (!executionId) throw new Error('Execution ID is required');
      const response = await apiClient.get(`/playbooks/executions/${executionId}`);
      return response.data as PlaybookExecution;
    },
    enabled: !!executionId,
  });
}

/**
 * Fetch execution with results
 */
export function useExecutionWithResults(executionId: string | undefined) {
  return useQuery({
    queryKey: ['execution-with-results', executionId],
    queryFn: async () => {
      if (!executionId) throw new Error('Execution ID is required');
      const response = await apiClient.get(`/playbooks/executions/${executionId}/with-results`);
      return response.data as PlaybookExecutionWithResults;
    },
    enabled: !!executionId,
  });
}

/**
 * Fetch execution progress (with polling)
 */
export function useExecutionProgress(executionId: string | undefined, pollingInterval: number = 5000) {
  return useQuery({
    queryKey: ['execution-progress', executionId],
    queryFn: async () => {
      if (!executionId) throw new Error('Execution ID is required');
      const response = await apiClient.get(`/playbooks/executions/${executionId}/progress`);
      return response.data as ExecutionProgress;
    },
    enabled: !!executionId,
    refetchInterval: pollingInterval,
  });
}

// =====================================================
// EXECUTION MUTATIONS
// =====================================================

/**
 * Execute playbook
 */
export function useExecutePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playbookId,
      input,
    }: {
      playbookId: string;
      input: Omit<ExecutePlaybookInput, 'playbookId'>;
    }) => {
      const response = await apiClient.post(`/playbooks/${playbookId}/execute`, input);
      return response.data as PlaybookExecution;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
      queryClient.invalidateQueries({ queryKey: ['playbook-summary', data.playbookId] });
    },
  });
}
