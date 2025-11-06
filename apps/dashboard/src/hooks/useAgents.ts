// =====================================================
// AGENT HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AgentTemplate,
  AgentExecution,
  AgentExecutionResult,
  AgentStats,
  CreateAgentTemplateInput,
  UpdateAgentTemplateInput,
  AgentCategory,
} from '@pravado/types';

// =====================================================
// AGENT TEMPLATES
// =====================================================

export function useAgentTemplates(category?: AgentCategory) {
  return useQuery<AgentTemplate[]>({
    queryKey: ['agent-templates', category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      const response = await api.get(`/agent-templates/templates${params}`);
      return response.data;
    },
  });
}

export function useAgentTemplate(id: string | null) {
  return useQuery<AgentTemplate>({
    queryKey: ['agent-template', id],
    queryFn: async () => {
      const response = await api.get(`/agent-templates/templates/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateAgentTemplate() {
  const queryClient = useQueryClient();
  return useMutation<AgentTemplate, Error, CreateAgentTemplateInput>({
    mutationFn: async (input) => {
      const response = await api.post('/agent-templates/templates', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
    },
  });
}

export function useUpdateAgentTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AgentTemplate, Error, UpdateAgentTemplateInput>({
    mutationFn: async (input) => {
      const response = await api.patch(`/agent-templates/templates/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-template', id] });
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
    },
  });
}

export function useDeleteAgentTemplate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/agent-templates/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
    },
  });
}

// =====================================================
// AGENT EXECUTIONS
// =====================================================

export function useExecuteAgent() {
  const queryClient = useQueryClient();
  return useMutation<
    { execution: AgentExecution; message: string },
    Error,
    {
      templateId?: string;
      agentName: string;
      inputData: Record<string, any>;
      contextData?: Record<string, any>;
    }
  >({
    mutationFn: async (input) => {
      const response = await api.post('/agent-templates/execute', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-executions'] });
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
    },
  });
}

export function useAgentExecutions(filters?: {
  templateId?: string;
  status?: string;
  limit?: number;
}) {
  return useQuery<AgentExecution[]>({
    queryKey: ['agent-executions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.templateId) params.append('templateId', filters.templateId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      const response = await api.get(`/agent-templates/executions?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAgentExecution(id: string | null) {
  return useQuery<{
    execution: AgentExecution;
    results: AgentExecutionResult[];
  }>({
    queryKey: ['agent-execution', id],
    queryFn: async () => {
      const response = await api.get(`/agent-templates/executions/${id}`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: (data) => {
      // Poll every 2 seconds if execution is running
      if (data?.execution?.status === 'RUNNING' || data?.execution?.status === 'PENDING') {
        return 2000;
      }
      return false;
    },
  });
}

export function useAgentExecutionResults(executionId: string | null) {
  return useQuery<AgentExecutionResult[]>({
    queryKey: ['agent-execution-results', executionId],
    queryFn: async () => {
      const response = await api.get(`/agent-templates/executions/${executionId}/results`);
      return response.data;
    },
    enabled: !!executionId,
  });
}

// =====================================================
// AGENT STATISTICS
// =====================================================

export function useAgentStats() {
  return useQuery<AgentStats>({
    queryKey: ['agent-stats'],
    queryFn: async () => {
      const response = await api.get('/agent-templates/stats');
      return response.data;
    },
  });
}
