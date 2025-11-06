// =====================================================
// AGENT MEMORY REACT HOOKS
// Sprint 36: Long-term agent memory and contextual recall
// =====================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import type {
  StoreMemoryEpisodeInput,
  UpdateMemoryEpisodeInput,
  EmbedMemoryChunksInput,
  LinkMemoryReferencesInput,
  SearchMemoryInput,
  GetMemoryEpisodesInput,
  GetMemoryTimelineInput,
  GetMemoryDashboardInput,
  SummarizeMemoryInput,
  CompressMemoryInput,
  LogMemoryEventInput,
  MemoryEpisode,
  MemoryEpisodeWithDetails,
  MemorySearchResult,
  MemoryTimeline,
  MemoryDashboard,
  GptMemorySummary,
  GptMemoryCompression,
  MemoryContextForAgent,
  MemoryInjectionPrompt,
  MemoryType,
  MemoryStatus,
  MEMORY_TYPE_CONFIGS,
  MEMORY_STATUS_CONFIGS,
  MemoryChunk,
  MemoryLink,
  MemoryEvent,
  MemoryHeatmapData,
  MemoryTypeDistributionData,
  MemoryAccessTrendData,
  MemoryImportanceDistributionData,
  MemoryAgingData,
} from '@pravado/types';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Hook to store a new memory episode
 */
export function useStoreEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StoreMemoryEpisodeInput) => {
      const response = await api.post('/agent-memory/episodes', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['memory-dashboard'] });
    },
  });
}

/**
 * Hook to update a memory episode
 */
export function useUpdateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMemoryEpisodeInput) => {
      const response = await api.put(`/agent-memory/episodes/${input.episodeId}`, input);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
      queryClient.invalidateQueries({ queryKey: ['memory-dashboard'] });
    },
  });
}

/**
 * Hook to embed memory chunks
 */
export function useEmbedChunks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmbedMemoryChunksInput) => {
      const response = await api.post(`/agent-memory/episodes/${input.episodeId}/embed`, input);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
    },
  });
}

/**
 * Hook to link memory references
 */
export function useLinkReferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LinkMemoryReferencesInput) => {
      const response = await api.post(`/agent-memory/episodes/${input.episodeId}/link`, input);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
    },
  });
}

/**
 * Hook to log a memory event
 */
export function useLogMemoryEvent() {
  return useMutation({
    mutationFn: async (input: LogMemoryEventInput) => {
      const response = await api.post(`/agent-memory/episodes/${input.episodeId}/events`, input);
      return response.data;
    },
  });
}

/**
 * Hook to summarize a memory episode with GPT-4
 */
export function useSummarizeEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SummarizeMemoryInput) => {
      const response = await api.post(`/agent-memory/episodes/${input.episodeId}/summarize`, input);
      return response.data as { success: boolean; summary: GptMemorySummary };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memory-episode', variables.episodeId] });
    },
  });
}

/**
 * Hook to compress multiple memories with GPT-4
 */
export function useCompressMemories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompressMemoryInput) => {
      const response = await api.post('/agent-memory/compress', input);
      return response.data as { success: boolean; compression: GptMemoryCompression };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-episodes'] });
    },
  });
}

// =====================================================
// QUERY HOOKS - BASIC
// =====================================================

/**
 * Hook to get memory episodes with filters
 */
export function useMemoryEpisodes(filters?: Partial<GetMemoryEpisodesInput>) {
  return useQuery({
    queryKey: ['memory-episodes', filters],
    queryFn: async () => {
      const response = await api.get('/agent-memory/episodes', { params: filters });
      return response.data as { success: boolean; episodes: MemoryEpisode[]; total: number };
    },
  });
}

/**
 * Hook to get a single memory episode by ID
 */
export function useMemoryEpisode(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['memory-episode', episodeId],
    queryFn: async () => {
      if (!episodeId) return null;
      const response = await api.get(`/agent-memory/episodes/${episodeId}`);
      return response.data as { success: boolean; episode: MemoryEpisodeWithDetails };
    },
    enabled: !!episodeId,
  });
}

/**
 * Hook to search memory with semantic search
 */
export function useSearchMemory(input?: SearchMemoryInput) {
  return useQuery({
    queryKey: ['memory-search', input],
    queryFn: async () => {
      if (!input?.query) return null;
      const response = await api.post('/agent-memory/search', input);
      return response.data as { success: boolean; results: MemorySearchResult[] };
    },
    enabled: !!input?.query,
  });
}

/**
 * Hook to get memory context for an agent
 */
export function useMemoryContext(query: string, agentId?: string, threadId?: string, limit?: number) {
  return useQuery({
    queryKey: ['memory-context', query, agentId, threadId, limit],
    queryFn: async () => {
      if (!query) return null;
      const response = await api.post('/agent-memory/context', { query, agentId, threadId, limit });
      return response.data as { success: boolean; context: MemoryContextForAgent };
    },
    enabled: !!query,
  });
}

/**
 * Hook to get memory injection prompt
 */
export function useMemoryInjectionPrompt(query: string, agentId?: string, threadId?: string) {
  return useQuery({
    queryKey: ['memory-injection-prompt', query, agentId, threadId],
    queryFn: async () => {
      if (!query) return null;
      const response = await api.post('/agent-memory/inject-prompt', { query, agentId, threadId });
      return response.data as { success: boolean; prompt: MemoryInjectionPrompt };
    },
    enabled: !!query,
  });
}

/**
 * Hook to get memory timeline
 */
export function useMemoryTimeline(filters?: Partial<GetMemoryTimelineInput>) {
  return useQuery({
    queryKey: ['memory-timeline', filters],
    queryFn: async () => {
      const response = await api.get('/agent-memory/timeline', { params: filters });
      return response.data as { success: boolean; timeline: MemoryTimeline };
    },
  });
}

/**
 * Hook to get memory dashboard
 */
export function useMemoryDashboard(filters?: Partial<GetMemoryDashboardInput>) {
  return useQuery({
    queryKey: ['memory-dashboard', filters],
    queryFn: async () => {
      const response = await api.get('/agent-memory/dashboard', { params: filters });
      return response.data as { success: boolean; dashboard: MemoryDashboard };
    },
  });
}

// =====================================================
// FILTERED QUERY HOOKS
// =====================================================

/**
 * Hook to get active memory episodes
 */
export function useActiveEpisodes(filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, status: MemoryStatus.ACTIVE });
}

/**
 * Hook to get archived memory episodes
 */
export function useArchivedEpisodes(filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, status: MemoryStatus.ARCHIVED });
}

/**
 * Hook to get episodes by type
 */
export function useEpisodesByType(memoryType: MemoryType, filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, memoryType });
}

/**
 * Hook to get episodes by agent
 */
export function useEpisodesByAgent(agentId: string, filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, agentId });
}

/**
 * Hook to get episodes by thread
 */
export function useEpisodesByThread(threadId: string, filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, threadId });
}

/**
 * Hook to get episodes by session
 */
export function useEpisodesBySession(sessionId: string, filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, sessionId });
}

/**
 * Hook to get high importance episodes
 */
export function useHighImportanceEpisodes(minImportance: number = 70, filters?: Partial<GetMemoryEpisodesInput>) {
  return useMemoryEpisodes({ ...filters, minImportance });
}

/**
 * Hook to get recent episodes
 */
export function useRecentEpisodes(days: number = 7, filters?: Partial<GetMemoryEpisodesInput>) {
  const startDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }, [days]);

  return useMemoryEpisodes({ ...filters, startDate });
}

/**
 * Hook to get observations
 */
export function useObservations(filters?: Partial<GetMemoryEpisodesInput>) {
  return useEpisodesByType(MemoryType.OBSERVATION, filters);
}

/**
 * Hook to get goals
 */
export function useGoalMemories(filters?: Partial<GetMemoryEpisodesInput>) {
  return useEpisodesByType(MemoryType.GOAL, filters);
}

/**
 * Hook to get decisions
 */
export function useDecisions(filters?: Partial<GetMemoryEpisodesInput>) {
  return useEpisodesByType(MemoryType.DECISION, filters);
}

/**
 * Hook to get dialogues
 */
export function useDialogues(filters?: Partial<GetMemoryEpisodesInput>) {
  return useEpisodesByType(MemoryType.DIALOGUE, filters);
}

/**
 * Hook to get corrections
 */
export function useCorrections(filters?: Partial<GetMemoryEpisodesInput>) {
  return useEpisodesByType(MemoryType.CORRECTION, filters);
}

/**
 * Hook to get insights
 */
export function useInsights(filters?: Partial<GetMemoryEpisodesInput>) {
  return useEpisodesByType(MemoryType.INSIGHT, filters);
}

// =====================================================
// CONFIGURATION HELPERS
// =====================================================

/**
 * Hook to get memory type configuration
 */
export function useMemoryTypeConfig(memoryType: MemoryType) {
  return useMemo(() => MEMORY_TYPE_CONFIGS[memoryType], [memoryType]);
}

/**
 * Hook to get memory status configuration
 */
export function useMemoryStatusConfig(status: MemoryStatus) {
  return useMemo(() => MEMORY_STATUS_CONFIGS[status], [status]);
}

/**
 * Hook to get memory type color
 */
export function useMemoryTypeColor(memoryType: MemoryType) {
  return useMemo(() => MEMORY_TYPE_CONFIGS[memoryType].color, [memoryType]);
}

/**
 * Hook to get memory status color
 */
export function useMemoryStatusColor(status: MemoryStatus) {
  return useMemo(() => MEMORY_STATUS_CONFIGS[status].color, [status]);
}

/**
 * Hook to get memory type icon
 */
export function useMemoryTypeIcon(memoryType: MemoryType) {
  return useMemo(() => MEMORY_TYPE_CONFIGS[memoryType].icon, [memoryType]);
}

/**
 * Hook to get memory status icon
 */
export function useMemoryStatusIcon(status: MemoryStatus) {
  return useMemo(() => MEMORY_STATUS_CONFIGS[status].icon, [status]);
}

/**
 * Hook to get memory type label
 */
export function useMemoryTypeLabel(memoryType: MemoryType) {
  return useMemo(() => MEMORY_TYPE_CONFIGS[memoryType].label, [memoryType]);
}

/**
 * Hook to get all memory type configs
 */
export function useAllMemoryTypeConfigs() {
  return useMemo(() => MEMORY_TYPE_CONFIGS, []);
}

/**
 * Hook to get all memory status configs
 */
export function useAllMemoryStatusConfigs() {
  return useMemo(() => MEMORY_STATUS_CONFIGS, []);
}

// =====================================================
// UTILITY HELPERS
// =====================================================

/**
 * Hook to get importance score color
 */
export function useImportanceColor(score: number) {
  return useMemo(() => {
    if (score >= 80) return 'red';
    if (score >= 60) return 'orange';
    if (score >= 40) return 'yellow';
    return 'gray';
  }, [score]);
}

/**
 * Hook to calculate memory age in days
 */
export function useMemoryAge(occurredAt: string) {
  return useMemo(() => {
    const occurred = new Date(occurredAt);
    const now = new Date();
    const diffMs = now.getTime() - occurred.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [occurredAt]);
}

/**
 * Hook to format memory age
 */
export function useFormattedMemoryAge(occurredAt: string) {
  const age = useMemoryAge(occurredAt);

  return useMemo(() => {
    if (age === 0) return 'Today';
    if (age === 1) return 'Yesterday';
    if (age < 7) return `${age} days ago`;
    if (age < 30) return `${Math.floor(age / 7)} weeks ago`;
    if (age < 365) return `${Math.floor(age / 30)} months ago`;
    return `${Math.floor(age / 365)} years ago`;
  }, [age]);
}

/**
 * Hook to calculate access frequency
 */
export function useAccessFrequency(accessCount: number, createdAt: string) {
  return useMemo(() => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    return accessCount / diffDays;
  }, [accessCount, createdAt]);
}

/**
 * Hook to check if memory is stale
 */
export function useIsMemoryStale(occurredAt: string, accessCount: number, threshold: number = 30) {
  const age = useMemoryAge(occurredAt);
  return useMemo(() => age > threshold && accessCount === 0, [age, accessCount, threshold]);
}

/**
 * Hook to check if memory is expiring soon
 */
export function useIsExpiringSoon(expiresAt: string | undefined, daysThreshold: number = 7) {
  return useMemo(() => {
    if (!expiresAt) return false;
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= daysThreshold;
  }, [expiresAt, daysThreshold]);
}

/**
 * Hook to check if memory is expired
 */
export function useIsExpired(expiresAt: string | undefined) {
  return useMemo(() => {
    if (!expiresAt) return false;
    const expires = new Date(expiresAt);
    const now = new Date();
    return now > expires;
  }, [expiresAt]);
}

/**
 * Hook to get memory relevance score
 */
export function useMemoryRelevance(episode: MemoryEpisode) {
  const age = useMemoryAge(episode.occurred_at);

  return useMemo(() => {
    const recency = Math.max(0, 100 - age);
    const access = Math.min(100, episode.access_count * 10);
    const importance = episode.importance_score;

    return (recency * 0.3 + access * 0.3 + importance * 0.4);
  }, [age, episode.access_count, episode.importance_score]);
}

// =====================================================
// CHART DATA GENERATORS
// =====================================================

/**
 * Hook to generate memory heatmap data
 */
export function useMemoryHeatmapData(episodes?: MemoryEpisode[]): MemoryHeatmapData[] {
  return useMemo(() => {
    if (!episodes) return [];

    const heatmap = new Map<string, number>();

    episodes.forEach((episode) => {
      const date = new Date(episode.occurred_at);
      const dateStr = date.toISOString().split('T')[0];
      const hour = date.getHours();
      const key = `${dateStr}-${hour}`;

      heatmap.set(key, (heatmap.get(key) || 0) + episode.access_count);
    });

    return Array.from(heatmap.entries()).map(([key, access_count]) => {
      const [date, hourStr] = key.split('-');
      return {
        date,
        hour: parseInt(hourStr),
        access_count,
      };
    });
  }, [episodes]);
}

/**
 * Hook to generate memory type distribution data
 */
export function useMemoryTypeDistribution(episodes?: MemoryEpisode[]): MemoryTypeDistributionData[] {
  return useMemo(() => {
    if (!episodes || episodes.length === 0) return [];

    const distribution = new Map<MemoryType, { count: number; totalImportance: number }>();

    episodes.forEach((episode) => {
      const current = distribution.get(episode.memory_type) || { count: 0, totalImportance: 0 };
      distribution.set(episode.memory_type, {
        count: current.count + 1,
        totalImportance: current.totalImportance + episode.importance_score,
      });
    });

    return Array.from(distribution.entries()).map(([memory_type, data]) => ({
      memory_type,
      count: data.count,
      avg_importance: data.totalImportance / data.count,
      percentage: (data.count / episodes.length) * 100,
    }));
  }, [episodes]);
}

/**
 * Hook to generate memory access trend data
 */
export function useMemoryAccessTrend(episodes?: MemoryEpisode[], days: number = 30): MemoryAccessTrendData[] {
  return useMemo(() => {
    if (!episodes) return [];

    const trend = new Map<string, { access_count: number; unique_episodes: Set<string> }>();

    episodes.forEach((episode) => {
      const date = new Date(episode.occurred_at).toISOString().split('T')[0];
      const current = trend.get(date) || { access_count: 0, unique_episodes: new Set<string>() };

      current.access_count += episode.access_count;
      current.unique_episodes.add(episode.id);

      trend.set(date, current);
    });

    return Array.from(trend.entries())
      .map(([date, data]) => ({
        date,
        access_count: data.access_count,
        unique_episodes: data.unique_episodes.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
  }, [episodes, days]);
}

/**
 * Hook to generate importance distribution data
 */
export function useMemoryImportanceDistribution(episodes?: MemoryEpisode[]): MemoryImportanceDistributionData[] {
  return useMemo(() => {
    if (!episodes || episodes.length === 0) return [];

    const ranges = [
      { label: '0-20', min: 0, max: 20 },
      { label: '20-40', min: 20, max: 40 },
      { label: '40-60', min: 40, max: 60 },
      { label: '60-80', min: 60, max: 80 },
      { label: '80-100', min: 80, max: 100 },
    ];

    return ranges.map((range) => {
      const count = episodes.filter(
        (ep) => ep.importance_score >= range.min && ep.importance_score < range.max
      ).length;

      return {
        importance_range: range.label,
        count,
        percentage: (count / episodes.length) * 100,
      };
    });
  }, [episodes]);
}

/**
 * Hook to generate memory aging data
 */
export function useMemoryAgingData(episodes?: MemoryEpisode[]): MemoryAgingData[] {
  return useMemo(() => {
    if (!episodes || episodes.length === 0) return [];

    const ranges = [
      { label: '0-7d', min: 0, max: 7 },
      { label: '7-30d', min: 7, max: 30 },
      { label: '30-90d', min: 30, max: 90 },
      { label: '90d+', min: 90, max: Infinity },
    ];

    return ranges.map((range) => {
      const now = new Date();
      const episodesInRange = episodes.filter((ep) => {
        const occurred = new Date(ep.occurred_at);
        const ageMs = now.getTime() - occurred.getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        return ageDays >= range.min && ageDays < range.max;
      });

      const totalAccess = episodesInRange.reduce((sum, ep) => sum + ep.access_count, 0);

      return {
        age_range: range.label,
        count: episodesInRange.length,
        avg_access_count: episodesInRange.length > 0 ? totalAccess / episodesInRange.length : 0,
      };
    });
  }, [episodes]);
}

// =====================================================
// ANALYSIS HELPERS
// =====================================================

/**
 * Hook to get memory summary statistics
 */
export function useMemorySummary(episodes?: MemoryEpisode[]) {
  return useMemo(() => {
    if (!episodes || episodes.length === 0) {
      return {
        total: 0,
        active: 0,
        archived: 0,
        redacted: 0,
        avgImportance: 0,
        totalAccess: 0,
        avgAccess: 0,
      };
    }

    const active = episodes.filter((ep) => ep.status === MemoryStatus.ACTIVE).length;
    const archived = episodes.filter((ep) => ep.status === MemoryStatus.ARCHIVED).length;
    const redacted = episodes.filter((ep) => ep.status === MemoryStatus.REDACTED).length;

    const totalImportance = episodes.reduce((sum, ep) => sum + ep.importance_score, 0);
    const totalAccess = episodes.reduce((sum, ep) => sum + ep.access_count, 0);

    return {
      total: episodes.length,
      active,
      archived,
      redacted,
      avgImportance: totalImportance / episodes.length,
      totalAccess,
      avgAccess: totalAccess / episodes.length,
    };
  }, [episodes]);
}

/**
 * Hook to get top accessed episodes
 */
export function useTopAccessedEpisodes(episodes?: MemoryEpisode[], limit: number = 10) {
  return useMemo(() => {
    if (!episodes) return [];
    return [...episodes]
      .sort((a, b) => b.access_count - a.access_count)
      .slice(0, limit);
  }, [episodes, limit]);
}

/**
 * Hook to get most important episodes
 */
export function useMostImportantEpisodes(episodes?: MemoryEpisode[], limit: number = 10) {
  return useMemo(() => {
    if (!episodes) return [];
    return [...episodes]
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, limit);
  }, [episodes, limit]);
}

/**
 * Hook to detect memory gaps (days without memories)
 */
export function useMemoryGaps(episodes?: MemoryEpisode[], threshold: number = 3) {
  return useMemo(() => {
    if (!episodes || episodes.length === 0) return [];

    const sortedEpisodes = [...episodes].sort((a, b) =>
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );

    const gaps: Array<{ start: string; end: string; days: number }> = [];

    for (let i = 0; i < sortedEpisodes.length - 1; i++) {
      const current = new Date(sortedEpisodes[i].occurred_at);
      const next = new Date(sortedEpisodes[i + 1].occurred_at);
      const diffDays = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > threshold) {
        gaps.push({
          start: current.toISOString(),
          end: next.toISOString(),
          days: diffDays,
        });
      }
    }

    return gaps;
  }, [episodes, threshold]);
}

/**
 * Hook to get episode count by memory type
 */
export function useEpisodeCountByType(episodes?: MemoryEpisode[]) {
  return useMemo(() => {
    if (!episodes) return {};

    return episodes.reduce((acc, episode) => {
      acc[episode.memory_type] = (acc[episode.memory_type] || 0) + 1;
      return acc;
    }, {} as Record<MemoryType, number>);
  }, [episodes]);
}

/**
 * Hook to get recently accessed episodes
 */
export function useRecentlyAccessedEpisodes(episodes?: MemoryEpisode[], days: number = 7) {
  return useMemo(() => {
    if (!episodes) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return episodes.filter((ep) => {
      if (!ep.last_accessed_at) return false;
      return new Date(ep.last_accessed_at) > cutoff;
    });
  }, [episodes, days]);
}

/**
 * Hook to filter episodes by date range
 */
export function useEpisodesInDateRange(
  episodes?: MemoryEpisode[],
  startDate?: string,
  endDate?: string
) {
  return useMemo(() => {
    if (!episodes) return [];

    return episodes.filter((ep) => {
      const occurred = new Date(ep.occurred_at);

      if (startDate && occurred < new Date(startDate)) return false;
      if (endDate && occurred > new Date(endDate)) return false;

      return true;
    });
  }, [episodes, startDate, endDate]);
}

/**
 * Hook to search episodes by keyword
 */
export function useSearchEpisodesByKeyword(episodes?: MemoryEpisode[], keyword?: string) {
  return useMemo(() => {
    if (!episodes || !keyword) return episodes || [];

    const lowerKeyword = keyword.toLowerCase();

    return episodes.filter((ep) => {
      return (
        ep.title.toLowerCase().includes(lowerKeyword) ||
        ep.content.toLowerCase().includes(lowerKeyword) ||
        ep.summary?.toLowerCase().includes(lowerKeyword)
      );
    });
  }, [episodes, keyword]);
}

/**
 * Hook to group episodes by date
 */
export function useEpisodesGroupedByDate(episodes?: MemoryEpisode[]) {
  return useMemo(() => {
    if (!episodes) return {};

    return episodes.reduce((acc, episode) => {
      const date = new Date(episode.occurred_at).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(episode);
      return acc;
    }, {} as Record<string, MemoryEpisode[]>);
  }, [episodes]);
}

/**
 * Hook to group episodes by agent
 */
export function useEpisodesGroupedByAgent(episodes?: MemoryEpisode[]) {
  return useMemo(() => {
    if (!episodes) return {};

    return episodes.reduce((acc, episode) => {
      const agentId = episode.agent_id || 'unassigned';
      if (!acc[agentId]) acc[agentId] = [];
      acc[agentId].push(episode);
      return acc;
    }, {} as Record<string, MemoryEpisode[]>);
  }, [episodes]);
}

/**
 * Hook to group episodes by thread
 */
export function useEpisodesGroupedByThread(episodes?: MemoryEpisode[]) {
  return useMemo(() => {
    if (!episodes) return {};

    return episodes.reduce((acc, episode) => {
      const threadId = episode.thread_id || 'unassigned';
      if (!acc[threadId]) acc[threadId] = [];
      acc[threadId].push(episode);
      return acc;
    }, {} as Record<string, MemoryEpisode[]>);
  }, [episodes]);
}

/**
 * Hook to get average importance by memory type
 */
export function useAvgImportanceByType(episodes?: MemoryEpisode[]) {
  return useMemo(() => {
    if (!episodes) return {};

    const typeData = episodes.reduce((acc, episode) => {
      if (!acc[episode.memory_type]) {
        acc[episode.memory_type] = { total: 0, count: 0 };
      }
      acc[episode.memory_type].total += episode.importance_score;
      acc[episode.memory_type].count += 1;
      return acc;
    }, {} as Record<MemoryType, { total: number; count: number }>);

    return Object.entries(typeData).reduce((acc, [type, data]) => {
      acc[type as MemoryType] = data.total / data.count;
      return acc;
    }, {} as Record<MemoryType, number>);
  }, [episodes]);
}

/**
 * Hook to calculate memory retention rate
 */
export function useMemoryRetentionRate(episodes?: MemoryEpisode[], days: number = 30) {
  return useMemo(() => {
    if (!episodes || episodes.length === 0) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recentEpisodes = episodes.filter((ep) => new Date(ep.occurred_at) > cutoff);
    const activeRecent = recentEpisodes.filter((ep) => ep.status === MemoryStatus.ACTIVE);

    return recentEpisodes.length > 0 ? (activeRecent.length / recentEpisodes.length) * 100 : 0;
  }, [episodes, days]);
}
