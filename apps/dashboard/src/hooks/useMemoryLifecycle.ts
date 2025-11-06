// =====================================================
// MEMORY LIFECYCLE REACT HOOKS
// Sprint 37: Autonomous memory pruning, aging, and lifespan management
// =====================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import type {
  AgeMemoryInput,
  AgeMemoryResult,
  ReinforceMemoryInput,
  CompressMemoryInput,
  CompressMemoryResult,
  PruneMemoryInput,
  PruneMemoryResult,
  ArchiveMemoryInput,
  ArchiveMemoryResult,
  MarkForArchivalInput,
  RecommendArchivalInput,
  AssessImportanceInput,
  GetRetentionPlanInput,
  GetLifecycleDashboardInput,
  MemoryAgingMetrics,
  MemoryRetentionPlan,
  MemoryArchivalRecommendation,
  MemoryImportanceAssessment,
  MemoryLifecycleDashboard,
} from '@pravado/types';

// =====================================================
// MUTATION HOOKS - LIFECYCLE OPERATIONS
// =====================================================

/**
 * Hook to age all memory episodes (decay score based on time)
 */
export function useAgeMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AgeMemoryInput) => {
      const response = await api.post('/agent-memory-lifecycle/age', input);
      return response.data as { success: boolean; result: AgeMemoryResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retention-plan'] });
    },
  });
}

/**
 * Hook to reinforce a memory episode (boost age score on access)
 */
export function useReinforceMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReinforceMemoryInput) => {
      const response = await api.post('/agent-memory-lifecycle/reinforce', input);
      return response.data as { success: boolean };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
      queryClient.invalidateQueries({ queryKey: ['aging-metrics', variables.episodeId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-dashboard'] });
    },
  });
}

/**
 * Hook to compress old/stale memory episodes using GPT-4
 */
export function useCompressMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompressMemoryInput) => {
      const response = await api.post('/agent-memory-lifecycle/compress', input);
      return response.data as { success: boolean; result: CompressMemoryResult };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retention-plan'] });
    },
  });
}

/**
 * Hook to prune expired memory episodes (soft delete)
 */
export function usePruneMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PruneMemoryInput) => {
      const response = await api.post('/agent-memory-lifecycle/prune', input);
      return response.data as { success: boolean; result: PruneMemoryResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retention-plan'] });
    },
  });
}

/**
 * Hook to archive memory episodes
 */
export function useArchiveMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveMemoryInput) => {
      const response = await api.post('/agent-memory-lifecycle/archive', input);
      return response.data as { success: boolean; result: ArchiveMemoryResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retention-plan'] });
    },
  });
}

/**
 * Hook to mark episode(s) for archival with expiration
 */
export function useMarkForArchival() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkForArchivalInput) => {
      const response = await api.put('/agent-memory-lifecycle/mark-archival', input);
      return response.data as { success: boolean };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
      queryClient.invalidateQueries({ queryKey: ['retention-plan'] });
    },
  });
}

// =====================================================
// QUERY HOOKS - AI-POWERED OPERATIONS
// =====================================================

/**
 * Hook to get AI recommendations for archival candidates
 */
export function useRecommendArchival(input?: RecommendArchivalInput) {
  return useQuery({
    queryKey: ['archival-recommendations', input],
    queryFn: async () => {
      if (!input?.organizationId) return null;
      const response = await api.post('/agent-memory-lifecycle/recommend-archival', input);
      return response.data as {
        success: boolean;
        recommendations: MemoryArchivalRecommendation[];
      };
    },
    enabled: !!input?.organizationId,
  });
}

/**
 * Hook to assess memory importance using GPT-4
 */
export function useAssessImportance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssessImportanceInput) => {
      const response = await api.post('/agent-memory-lifecycle/assess-importance', input);
      return response.data as {
        success: boolean;
        assessment: MemoryImportanceAssessment;
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
    },
  });
}

// =====================================================
// QUERY HOOKS - DASHBOARD & PLANNING
// =====================================================

/**
 * Hook to get memory retention plan
 */
export function useRetentionPlan(input?: GetRetentionPlanInput) {
  return useQuery({
    queryKey: ['retention-plan', input],
    queryFn: async () => {
      if (!input?.organizationId) return null;
      const response = await api.get('/agent-memory-lifecycle/retention-plan', {
        params: input,
      });
      return response.data as { success: boolean; plan: MemoryRetentionPlan };
    },
    enabled: !!input?.organizationId,
  });
}

/**
 * Hook to get lifecycle dashboard metrics
 */
export function useLifecycleDashboard(input?: GetLifecycleDashboardInput) {
  return useQuery({
    queryKey: ['lifecycle-dashboard', input],
    queryFn: async () => {
      if (!input?.organizationId) return null;
      const response = await api.get('/agent-memory-lifecycle/dashboard', {
        params: input,
      });
      return response.data as { success: boolean; dashboard: MemoryLifecycleDashboard };
    },
    enabled: !!input?.organizationId,
  });
}

/**
 * Hook to get aging metrics for a specific memory episode
 */
export function useAgingMetrics(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['aging-metrics', episodeId],
    queryFn: async () => {
      if (!episodeId) return null;
      const response = await api.get(`/agent-memory-lifecycle/aging-metrics/${episodeId}`);
      return response.data as { success: boolean; metrics: MemoryAgingMetrics };
    },
    enabled: !!episodeId,
  });
}

// =====================================================
// HELPER HOOKS - UI & DISPLAY
// =====================================================

/**
 * Hook to get age score color based on value
 */
export function useAgeScoreColor(ageScore?: number): string {
  return useMemo(() => {
    if (!ageScore) return 'gray';
    if (ageScore >= 80) return 'green';
    if (ageScore >= 60) return 'yellow';
    if (ageScore >= 40) return 'orange';
    if (ageScore >= 20) return 'red';
    return 'red';
  }, [ageScore]);
}

/**
 * Hook to get retention priority color based on value
 */
export function useRetentionPriorityColor(priority?: number): string {
  return useMemo(() => {
    if (!priority) return 'gray';
    if (priority >= 80) return 'green';
    if (priority >= 60) return 'blue';
    if (priority >= 40) return 'yellow';
    if (priority >= 20) return 'orange';
    return 'red';
  }, [priority]);
}

/**
 * Hook to get importance score label
 */
export function useImportanceScoreLabel(importance?: number): string {
  return useMemo(() => {
    if (!importance) return 'Unknown';
    if (importance >= 90) return 'Critical';
    if (importance >= 70) return 'High';
    if (importance >= 50) return 'Medium';
    if (importance >= 30) return 'Low';
    return 'Very Low';
  }, [importance]);
}

/**
 * Hook to get compression status badge data
 */
export function useCompressionStatus(compressed?: boolean) {
  return useMemo(
    () => ({
      label: compressed ? 'Compressed' : 'Original',
      color: compressed ? 'blue' : 'gray',
      icon: compressed ? '🗜️' : '📄',
    }),
    [compressed]
  );
}

/**
 * Hook to get archival status badge data
 */
export function useArchivalStatus(archived_at?: string, pruned?: boolean) {
  return useMemo(() => {
    if (pruned) {
      return {
        label: 'Pruned',
        color: 'red',
        icon: '🗑️',
      };
    }
    if (archived_at) {
      return {
        label: 'Archived',
        color: 'orange',
        icon: '📦',
      };
    }
    return {
      label: 'Active',
      color: 'green',
      icon: '✓',
    };
  }, [archived_at, pruned]);
}

/**
 * Hook to calculate days until memory expires
 */
export function useDaysUntilExpiration(
  ageScore?: number,
  decayFactor?: number
): number | null {
  return useMemo(() => {
    if (!ageScore || !decayFactor || decayFactor === 0) return null;
    if (ageScore <= 0) return 0;

    // Calculate days until age_score reaches 0
    // age_score decreases by decay_factor each day
    const daysUntilZero = Math.ceil(ageScore / decayFactor);
    return daysUntilZero;
  }, [ageScore, decayFactor]);
}

/**
 * Hook to format compression ratio as percentage
 */
export function useCompressionRatioFormatted(ratio?: number): string {
  return useMemo(() => {
    if (!ratio) return '0%';
    const percentage = (1 - ratio) * 100;
    return `${percentage.toFixed(1)}%`;
  }, [ratio]);
}

/**
 * Hook to get lifecycle health status
 */
export function useLifecycleHealthStatus(healthScore?: number) {
  return useMemo(() => {
    if (!healthScore) {
      return {
        label: 'Unknown',
        color: 'gray',
        icon: '❓',
      };
    }
    if (healthScore >= 80) {
      return {
        label: 'Excellent',
        color: 'green',
        icon: '💚',
      };
    }
    if (healthScore >= 60) {
      return {
        label: 'Good',
        color: 'blue',
        icon: '💙',
      };
    }
    if (healthScore >= 40) {
      return {
        label: 'Fair',
        color: 'yellow',
        icon: '💛',
      };
    }
    if (healthScore >= 20) {
      return {
        label: 'Poor',
        color: 'orange',
        icon: '🧡',
      };
    }
    return {
      label: 'Critical',
      color: 'red',
      icon: '❤️',
    };
  }, [healthScore]);
}

/**
 * Hook to format bytes as human-readable size
 */
export function useFormattedBytes(bytes?: number): string {
  return useMemo(() => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }, [bytes]);
}

/**
 * Hook to calculate storage savings percentage
 */
export function useStorageSavingsPercentage(
  totalSize?: number,
  compressedSize?: number
): number {
  return useMemo(() => {
    if (!totalSize || !compressedSize || totalSize === 0) return 0;
    const savings = ((totalSize - compressedSize) / totalSize) * 100;
    return Math.max(0, Math.min(100, savings));
  }, [totalSize, compressedSize]);
}

/**
 * Hook to get recommended action badge data
 */
export function useRecommendedActionBadge(
  action?: 'COMPRESS' | 'ARCHIVE' | 'PRUNE' | 'RETAIN' | 'REINFORCE'
) {
  return useMemo(() => {
    switch (action) {
      case 'COMPRESS':
        return {
          label: 'Compress',
          color: 'blue',
          icon: '🗜️',
          description: 'Compress to save space',
        };
      case 'ARCHIVE':
        return {
          label: 'Archive',
          color: 'orange',
          icon: '📦',
          description: 'Move to archive',
        };
      case 'PRUNE':
        return {
          label: 'Prune',
          color: 'red',
          icon: '🗑️',
          description: 'Remove from memory',
        };
      case 'RETAIN':
        return {
          label: 'Retain',
          color: 'green',
          icon: '✓',
          description: 'Keep in active memory',
        };
      case 'REINFORCE':
        return {
          label: 'Reinforce',
          color: 'purple',
          icon: '⚡',
          description: 'Boost importance',
        };
      default:
        return {
          label: 'Unknown',
          color: 'gray',
          icon: '❓',
          description: 'No recommendation',
        };
    }
  }, [action]);
}

/**
 * Hook to get age distribution chart data
 */
export function useAgeDistributionChartData(distribution?: Record<string, number>) {
  return useMemo(() => {
    if (!distribution) return [];

    return Object.entries(distribution).map(([range, count]) => ({
      name: range,
      value: count,
    }));
  }, [distribution]);
}

/**
 * Hook to determine if episode should be highlighted for attention
 */
export function useNeedsAttention(
  ageScore?: number,
  retentionPriority?: number,
  daysUntilExpiration?: number | null
): boolean {
  return useMemo(() => {
    if (!ageScore || !retentionPriority) return false;

    // Low age score with high retention priority = needs reinforcement
    if (ageScore < 30 && retentionPriority > 70) return true;

    // Very low age score = close to expiration
    if (ageScore < 20) return true;

    // Expiring soon with high priority
    if (daysUntilExpiration !== null && daysUntilExpiration < 7 && retentionPriority > 60) {
      return true;
    }

    return false;
  }, [ageScore, retentionPriority, daysUntilExpiration]);
}
