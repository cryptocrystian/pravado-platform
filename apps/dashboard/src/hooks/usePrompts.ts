// =====================================================
// PROMPT ENGINEERING HOOKS
// Sprint 30: Advanced prompt engineering + modular blocks
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PromptBlock,
  PromptTemplate,
  AssembledPrompt,
  PromptPreviewResult,
  PromptValidation,
  PromptImprovementResult,
  CreatePromptBlockInput,
  UpdatePromptBlockInput,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  ValidatePromptInput,
  ImprovePromptInput,
  BlockType,
  UseCaseTag,
  ModelScope,
  BLOCK_TYPE_CONFIGS,
  USE_CASE_TAG_CONFIGS,
  MODEL_SCOPE_CONFIGS,
  TOKEN_ESTIMATION,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS - BLOCKS
// =====================================================

/**
 * Create prompt block
 */
export function useCreatePromptBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreatePromptBlockInput, 'organizationId' | 'createdBy'>) => {
      const res = await fetch(`${API_BASE}/prompts/block`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create prompt block');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-blocks'] });
    },
  });
}

/**
 * Update prompt block
 */
export function useUpdatePromptBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePromptBlockInput) => {
      const res = await fetch(`${API_BASE}/prompts/block/${input.blockId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update prompt block');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompt-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-block', variables.blockId] });
    },
  });
}

/**
 * Delete prompt block
 */
export function useDeletePromptBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string) => {
      const res = await fetch(`${API_BASE}/prompts/block/${blockId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete prompt block');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-blocks'] });
    },
  });
}

// =====================================================
// MUTATION HOOKS - TEMPLATES
// =====================================================

/**
 * Create prompt template
 */
export function useCreatePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreatePromptTemplateInput, 'organizationId' | 'createdBy'>) => {
      const res = await fetch(`${API_BASE}/prompts/template`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create prompt template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

/**
 * Update prompt template
 */
export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePromptTemplateInput) => {
      const res = await fetch(`${API_BASE}/prompts/template/${input.templateId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update prompt template');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-template', variables.templateId] });
    },
  });
}

/**
 * Delete prompt template
 */
export function useDeletePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`${API_BASE}/prompts/template/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete prompt template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });
}

// =====================================================
// MUTATION HOOKS - VALIDATION & IMPROVEMENT
// =====================================================

/**
 * Preview prompt with GPT summary
 */
export function usePreviewPrompt() {
  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`${API_BASE}/prompts/template/${templateId}/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to preview prompt');
      }
      return res.json() as Promise<{ success: boolean; preview: PromptPreviewResult }>;
    },
  });
}

/**
 * Validate prompt
 */
export function useValidatePrompt() {
  return useMutation({
    mutationFn: async (input: ValidatePromptInput) => {
      const res = await fetch(`${API_BASE}/prompts/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to validate prompt');
      }
      return res.json() as Promise<{ success: boolean; validation: PromptValidation }>;
    },
  });
}

/**
 * Improve prompt with GPT suggestions
 */
export function useImprovePrompt() {
  return useMutation({
    mutationFn: async (input: ImprovePromptInput) => {
      const res = await fetch(`${API_BASE}/prompts/improve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to improve prompt');
      }
      return res.json() as Promise<{ success: boolean; improvement: PromptImprovementResult }>;
    },
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get prompt blocks
 */
export function usePromptBlocks(filters?: {
  blockType?: BlockType;
  modelScope?: ModelScope;
  category?: string;
  tags?: string[];
}) {
  return useQuery({
    queryKey: ['prompt-blocks', filters],
    queryFn: async () => {
      let url = `${API_BASE}/prompts/blocks`;
      const params = new URLSearchParams();

      if (filters?.blockType) {
        params.append('blockType', filters.blockType);
      }
      if (filters?.modelScope) {
        params.append('modelScope', filters.modelScope);
      }
      if (filters?.category) {
        params.append('category', filters.category);
      }
      if (filters?.tags && filters.tags.length > 0) {
        filters.tags.forEach((tag) => params.append('tags', tag));
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch prompt blocks');
      return res.json() as Promise<{ success: boolean; blocks: PromptBlock[]; total: number }>;
    },
  });
}

/**
 * Get prompt block by ID
 */
export function usePromptBlock(blockId: string | null) {
  return useQuery({
    queryKey: ['prompt-block', blockId],
    queryFn: async () => {
      if (!blockId) return null;

      const res = await fetch(`${API_BASE}/prompts/block/${blockId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch prompt block');
      return res.json() as Promise<{ success: boolean; block: PromptBlock }>;
    },
    enabled: !!blockId,
  });
}

/**
 * Get prompt templates
 */
export function usePromptTemplates(filters?: {
  useCaseTag?: UseCaseTag;
  modelScope?: ModelScope;
}) {
  return useQuery({
    queryKey: ['prompt-templates', filters],
    queryFn: async () => {
      let url = `${API_BASE}/prompts/templates`;
      const params = new URLSearchParams();

      if (filters?.useCaseTag) {
        params.append('useCaseTag', filters.useCaseTag);
      }
      if (filters?.modelScope) {
        params.append('modelScope', filters.modelScope);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch prompt templates');
      return res.json() as Promise<{
        success: boolean;
        templates: PromptTemplate[];
        total: number;
      }>;
    },
  });
}

/**
 * Get prompt template by ID
 */
export function usePromptTemplateById(templateId: string | null, assemble?: boolean) {
  return useQuery({
    queryKey: ['prompt-template', templateId, assemble],
    queryFn: async () => {
      if (!templateId) return null;

      let url = `${API_BASE}/prompts/template/${templateId}`;
      if (assemble) {
        url += '?assemble=true';
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch prompt template');
      return res.json() as Promise<{
        success: boolean;
        template: PromptTemplate;
        assembled?: AssembledPrompt;
      }>;
    },
    enabled: !!templateId,
  });
}

/**
 * Get prompt preview (lazy - only when needed)
 */
export function usePromptPreview(templateId: string | null, enabled: boolean = false) {
  return useQuery({
    queryKey: ['prompt-preview', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const res = await fetch(`${API_BASE}/prompts/template/${templateId}/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch prompt preview');
      return res.json() as Promise<{ success: boolean; preview: PromptPreviewResult }>;
    },
    enabled: !!templateId && enabled,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get block type color
 */
export function usePromptBlockColor() {
  return (type: BlockType) => {
    return BLOCK_TYPE_CONFIGS[type]?.color || '#6B7280';
  };
}

/**
 * Get block type icon
 */
export function usePromptBlockIcon() {
  return (type: BlockType) => {
    return BLOCK_TYPE_CONFIGS[type]?.icon || 'file-text';
  };
}

/**
 * Get use case color
 */
export function useUseCaseColor() {
  return (useCase: UseCaseTag) => {
    return USE_CASE_TAG_CONFIGS[useCase]?.color || '#6B7280';
  };
}

/**
 * Get use case icon
 */
export function useUseCaseIcon() {
  return (useCase: UseCaseTag) => {
    return USE_CASE_TAG_CONFIGS[useCase]?.icon || 'file-text';
  };
}

/**
 * Get model scope icon
 */
export function useModelScopeIcon() {
  return (scope: ModelScope) => {
    return MODEL_SCOPE_CONFIGS[scope]?.icon || 'cpu';
  };
}

/**
 * Format prompt as markdown
 */
export function usePromptMarkdownFormatter() {
  return (prompt: string) => {
    // Add syntax highlighting for code blocks
    let formatted = prompt.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return '```' + (lang || '') + '\n' + code.trim() + '\n```';
    });

    // Ensure proper spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted;
  };
}

/**
 * Estimate tokens for text
 */
export function useTokenEstimation() {
  return (text: string) => {
    const characterCount = text.length;
    const estimatedTokens = Math.ceil(characterCount / TOKEN_ESTIMATION.CHARS_PER_TOKEN_AVG);

    return {
      characterCount,
      estimatedTokens,
      formattedTokens: estimatedTokens.toLocaleString(),
    };
  };
}

/**
 * Get block type label
 */
export function useBlockTypeLabel() {
  return (type: BlockType) => {
    return BLOCK_TYPE_CONFIGS[type]?.label || type;
  };
}

/**
 * Get use case label
 */
export function useUseCaseLabel() {
  return (useCase: UseCaseTag) => {
    return USE_CASE_TAG_CONFIGS[useCase]?.label || useCase;
  };
}

/**
 * Get model scope label
 */
export function useModelScopeLabel() {
  return (scope: ModelScope) => {
    return MODEL_SCOPE_CONFIGS[scope]?.label || scope;
  };
}

/**
 * Get recommended blocks for use case
 */
export function useRecommendedBlocks(useCase: UseCaseTag) {
  return USE_CASE_TAG_CONFIGS[useCase]?.recommendedBlocks || [];
}

/**
 * Get blocks by type
 */
export function useBlocksByType(type: BlockType) {
  const { data } = usePromptBlocks({ blockType: type });

  if (!data || !data.blocks) return [];

  return data.blocks;
}

/**
 * Get templates by use case
 */
export function useTemplatesByUseCase(useCase: UseCaseTag) {
  const { data } = usePromptTemplates({ useCaseTag: useCase });

  if (!data || !data.templates) return [];

  return data.templates;
}

/**
 * Get default template for use case
 */
export function useDefaultTemplateFor(useCase: UseCaseTag) {
  const { data } = usePromptTemplates({ useCaseTag: useCase });

  if (!data || !data.templates) return null;

  return data.templates.find((t) => t.isDefault) || data.templates[0] || null;
}

/**
 * Check if template is validated
 */
export function useIsTemplateValidated(templateId: string | null) {
  const { data } = usePromptTemplateById(templateId);

  if (!data || !data.template) return false;

  return data.template.isValidated;
}

/**
 * Get validation score color
 */
export function useValidationScoreColor() {
  return (score: number) => {
    if (score >= 80) return '#10B981'; // green-500
    if (score >= 60) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };
}

/**
 * Get block usage stats
 */
export function useBlockUsageStats() {
  const { data } = usePromptBlocks();

  if (!data || !data.blocks) {
    return {
      totalBlocks: 0,
      mostUsed: null,
      leastUsed: null,
      avgUsage: 0,
    };
  }

  const blocks = data.blocks;
  const sortedByUsage = [...blocks].sort((a, b) => b.usageCount - a.usageCount);

  return {
    totalBlocks: blocks.length,
    mostUsed: sortedByUsage[0] || null,
    leastUsed: sortedByUsage[sortedByUsage.length - 1] || null,
    avgUsage: blocks.reduce((sum, b) => sum + b.usageCount, 0) / (blocks.length || 1),
  };
}

/**
 * Get template usage stats
 */
export function useTemplateUsageStats() {
  const { data } = usePromptTemplates();

  if (!data || !data.templates) {
    return {
      totalTemplates: 0,
      mostUsed: null,
      leastUsed: null,
      avgUsage: 0,
    };
  }

  const templates = data.templates;
  const sortedByUsage = [...templates].sort((a, b) => b.usageCount - a.usageCount);

  return {
    totalTemplates: templates.length,
    mostUsed: sortedByUsage[0] || null,
    leastUsed: sortedByUsage[sortedByUsage.length - 1] || null,
    avgUsage: templates.reduce((sum, t) => sum + t.usageCount, 0) / (templates.length || 1),
  };
}

/**
 * Filter blocks by tags
 */
export function useFilterBlocksByTags(tags: string[]) {
  const { data } = usePromptBlocks({ tags });

  if (!data || !data.blocks) return [];

  return data.blocks;
}

/**
 * Get system blocks (provided by platform)
 */
export function useSystemBlocks() {
  const { data } = usePromptBlocks();

  if (!data || !data.blocks) return [];

  return data.blocks.filter((b) => b.isSystemBlock);
}

/**
 * Get user blocks (custom created)
 */
export function useUserBlocks() {
  const { data } = usePromptBlocks();

  if (!data || !data.blocks) return [];

  return data.blocks.filter((b) => !b.isSystemBlock);
}

/**
 * Get prompt length indicator
 */
export function usePromptLengthIndicator() {
  return (length: number) => {
    if (length < 500) return { label: 'Short', color: '#10B981' };
    if (length < 2000) return { label: 'Medium', color: '#F59E0B' };
    if (length < 5000) return { label: 'Long', color: '#EF4444' };
    return { label: 'Very Long', color: '#DC2626' };
  };
}

/**
 * Format block type description
 */
export function useBlockTypeDescription() {
  return (type: BlockType) => {
    return BLOCK_TYPE_CONFIGS[type]?.description || '';
  };
}

/**
 * Format use case description
 */
export function useUseCaseDescription() {
  return (useCase: UseCaseTag) => {
    return USE_CASE_TAG_CONFIGS[useCase]?.description || '';
  };
}
