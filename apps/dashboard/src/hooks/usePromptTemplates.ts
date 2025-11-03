// =====================================================
// PROMPT TEMPLATE HOOKS
// Sprint 38 Day 5-6: React Query hooks for Prompt Templates
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  PromptTemplate,
  PromptTemplateWithDetails,
  PromptTemplatesResponse,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  ResolvePromptInput,
  ResolvePromptOutput,
  PromptPerformanceMetrics,
  PromptSlot,
  CreatePromptSlotInput,
  UpdatePromptSlotInput,
  PromptUseCase,
  SlotResolutionStrategy,
  SLOT_RESOLUTION_CONFIGS,
  PROMPT_USE_CASE_CONFIGS,
  SLOT_TYPE_CONFIGS,
} from '@pravado/shared-types';

// =====================================================
// TEMPLATE CRUD HOOKS
// =====================================================

/**
 * Hook to fetch all prompt templates with filters
 */
export function usePromptTemplates(filters?: {
  category?: string;
  useCase?: PromptUseCase;
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<PromptTemplatesResponse>({
    queryKey: ['prompt-templates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.useCase) params.append('useCase', filters.useCase);
      if (filters?.active !== undefined) params.append('active', String(filters.active));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const response = await api.get(`/prompt-templates?${params.toString()}`);
      return response.data;
    },
  });
}

/**
 * Hook to fetch a single prompt template by ID
 */
export function usePromptTemplateById(id: string | null, includeDetails = false) {
  return useQuery<PromptTemplate | PromptTemplateWithDetails>({
    queryKey: ['prompt-template', id, includeDetails],
    queryFn: async () => {
      const params = includeDetails ? '?includeDetails=true' : '';
      const response = await api.get(`/prompt-templates/${id}${params}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch template by use case (latest active version)
 */
export function usePromptTemplateByUseCase(
  useCase: PromptUseCase | null,
  category?: string
) {
  return useQuery<PromptTemplate>({
    queryKey: ['prompt-template-use-case', useCase, category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      const response = await api.get(`/prompt-templates/use-case/${useCase}${params}`);
      return response.data;
    },
    enabled: !!useCase,
  });
}

/**
 * Hook to create a new prompt template
 */
export function useCreatePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation<PromptTemplate, Error, CreatePromptTemplateInput>({
    mutationFn: async (input) => {
      const response = await api.post('/prompt-templates', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

/**
 * Hook to update an existing prompt template
 */
export function useUpdatePromptTemplate(id: string) {
  const queryClient = useQueryClient();

  return useMutation<PromptTemplate, Error, UpdatePromptTemplateInput>({
    mutationFn: async (input) => {
      const response = await api.put(`/prompt-templates/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-template', id] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

/**
 * Hook to delete (soft delete) a prompt template
 */
export function useDeletePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (id) => {
      const response = await api.delete(`/prompt-templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

// =====================================================
// PROMPT RESOLUTION HOOKS
// =====================================================

/**
 * Hook to resolve a prompt template with given context
 */
export function useResolvePrompt(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation<ResolvePromptOutput, Error, ResolvePromptInput>({
    mutationFn: async (input) => {
      const response = await api.post(`/prompt-templates/${templateId}/resolve`, input);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate analytics after resolution
      queryClient.invalidateQueries({ queryKey: ['prompt-analytics', templateId] });
    },
  });
}

// =====================================================
// ANALYTICS HOOKS
// =====================================================

/**
 * Hook to fetch prompt template analytics
 */
export function usePromptAnalytics(templateId: string | null, days = 30) {
  return useQuery<PromptPerformanceMetrics>({
    queryKey: ['prompt-analytics', templateId, days],
    queryFn: async () => {
      const response = await api.get(`/prompt-templates/${templateId}/analytics?days=${days}`);
      return response.data;
    },
    enabled: !!templateId,
  });
}

// =====================================================
// SLOT MANAGEMENT HOOKS
// =====================================================

/**
 * Hook to create a new slot for a template
 */
export function useCreatePromptSlot(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation<PromptSlot, Error, CreatePromptSlotInput>({
    mutationFn: async (input) => {
      const response = await api.post(`/prompt-templates/${templateId}/slots`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-template', templateId] });
    },
  });
}

/**
 * Hook to update a prompt slot
 */
export function useUpdatePromptSlot(templateId: string, slotId: string) {
  const queryClient = useQueryClient();

  return useMutation<PromptSlot, Error, UpdatePromptSlotInput>({
    mutationFn: async (input) => {
      const response = await api.put(`/prompt-templates/${templateId}/slots/${slotId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-template', templateId] });
    },
  });
}

/**
 * Hook to delete a prompt slot
 */
export function useDeletePromptSlot(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (slotId) => {
      const response = await api.delete(`/prompt-templates/${templateId}/slots/${slotId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-template', templateId] });
    },
  });
}

// =====================================================
// HELPER HOOKS FOR UI CONFIGS
// =====================================================

/**
 * Hook to get all available prompt use cases with their configs
 */
export function usePromptUseCases() {
  return Object.entries(PROMPT_USE_CASE_CONFIGS).map(([key, config]) => ({
    value: key as PromptUseCase,
    ...config,
  }));
}

/**
 * Hook to get all available resolution strategies with their configs
 */
export function useResolutionStrategyConfigs() {
  return Object.entries(SLOT_RESOLUTION_CONFIGS).map(([key, config]) => ({
    value: key as SlotResolutionStrategy,
    ...config,
  }));
}

/**
 * Hook to get all available slot types with their configs
 */
export function useSlotTypeConfigs() {
  return Object.entries(SLOT_TYPE_CONFIGS).map(([key, config]) => ({
    value: key,
    ...config,
  }));
}

/**
 * Hook to get use case config by key
 */
export function useUseCaseConfig(useCase: PromptUseCase | null) {
  if (!useCase) return null;
  return PROMPT_USE_CASE_CONFIGS[useCase];
}

/**
 * Hook to get resolution strategy config by key
 */
export function useResolutionStrategyConfig(strategy: SlotResolutionStrategy | null) {
  if (!strategy) return null;
  return SLOT_RESOLUTION_CONFIGS[strategy];
}

/**
 * Hook to get slot type config by key
 */
export function useSlotTypeConfig(type: string | null) {
  if (!type) return null;
  return SLOT_TYPE_CONFIGS[type as keyof typeof SLOT_TYPE_CONFIGS];
}

// =====================================================
// COMPUTED/DERIVED HOOKS
// =====================================================

/**
 * Hook to get active templates count
 */
export function useActiveTemplatesCount() {
  const { data } = usePromptTemplates({ active: true, limit: 0 });
  return data?.total ?? 0;
}

/**
 * Hook to get templates by category
 */
export function useTemplatesByCategory(category: string | null) {
  return usePromptTemplates({
    category: category ?? undefined,
    active: true,
  });
}

/**
 * Hook to get template with full details (slots + invocations)
 */
export function usePromptTemplateDetails(id: string | null) {
  return usePromptTemplateById(id, true);
}

/**
 * Hook to check if template has required slots
 */
export function useTemplateHasRequiredSlots(templateId: string | null) {
  const { data } = usePromptTemplateById(templateId, true);

  if (!data || !('slots' in data)) return false;

  return data.slots?.some((slot) => slot.required) ?? false;
}

/**
 * Hook to get template slot names
 */
export function useTemplateSlotNames(templateId: string | null) {
  const { data } = usePromptTemplateById(templateId, true);

  if (!data || !('slots' in data)) return [];

  return data.slots?.map((slot) => slot.slotName) ?? [];
}

// =====================================================
// BULK OPERATIONS
// =====================================================

/**
 * Hook to clone a template (create a copy with incremented version)
 */
export function useClonePromptTemplate() {
  const queryClient = useQueryClient();
  const createTemplate = useCreatePromptTemplate();

  return useMutation<PromptTemplate, Error, string>({
    mutationFn: async (templateId) => {
      // Fetch original template with details
      const response = await api.get(`/prompt-templates/${templateId}?includeDetails=true`);
      const original: PromptTemplateWithDetails = response.data;

      // Create new template with cloned data
      const cloneInput: CreatePromptTemplateInput = {
        name: `${original.name} (Copy)`,
        description: original.description,
        templateText: original.templateText,
        category: original.category,
        useCase: original.useCase as PromptUseCase,
        metadata: {
          ...original.metadata,
          clonedFrom: templateId,
          clonedAt: new Date().toISOString(),
        },
      };

      return createTemplate.mutateAsync(cloneInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

/**
 * Hook to export template as JSON
 */
export function useExportPromptTemplate() {
  return useMutation<Blob, Error, string>({
    mutationFn: async (templateId) => {
      const response = await api.get(`/prompt-templates/${templateId}?includeDetails=true`);
      const template = response.data;

      const json = JSON.stringify(template, null, 2);
      return new Blob([json], { type: 'application/json' });
    },
  });
}

/**
 * Hook to get template status label
 */
export function useTemplateStatusLabel(template: PromptTemplate | null) {
  if (!template) return null;

  return {
    active: {
      label: 'Active',
      color: 'green',
      icon: '✓',
    },
    inactive: {
      label: 'Inactive',
      color: 'gray',
      icon: '○',
    },
  }[template.active ? 'active' : 'inactive'];
}
