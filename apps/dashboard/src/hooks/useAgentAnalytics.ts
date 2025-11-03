// =====================================================
// AGENT ANALYTICS HOOKS
// Sprint 47 Phase 4.3
// =====================================================
//
// Purpose: React Query hooks for agent conversation analytics
// Provides: Summary, sentiment trends, topics, engagement, resolution metrics
//

import { useQuery } from '@tanstack/react-query';

// =====================================================
// TYPES
// =====================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ConversationSummary {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  avgConversationLength: number;
  avgResponseTime: number;
  activeConversations: number;
  completedConversations: number;
  dateRange: DateRange;
}

export interface SentimentDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  total: number;
}

export interface TopicData {
  topic: string;
  count: number;
  percentage: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface EngagementMetrics {
  avgAgentResponseTime: number;
  avgUserResponseTime: number;
  avgMessagesPerConversation: number;
  agentUserMessageRatio: number;
  avgTypingTime: number;
  peakActivityHours: Array<{ hour: number; messageCount: number }>;
}

export interface ResolutionOutcomes {
  resolved: number;
  escalated: number;
  abandoned: number;
  inProgress: number;
  total: number;
  resolutionRate: number;
  avgTimeToResolution: number;
}

// =====================================================
// API CLIENT
// =====================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
}

/**
 * Fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-organization-id': localStorage.getItem('organizationId') || 'default-org-id',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

/**
 * Build query string from date range
 */
function buildDateRangeQuery(dateRange?: DateRange): string {
  if (!dateRange) return '';

  const params = new URLSearchParams({
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  });

  return `?${params.toString()}`;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const analyticsQueryKeys = {
  all: ['agent-analytics'] as const,
  summary: (agentId: string, dateRange?: DateRange) =>
    [...analyticsQueryKeys.all, 'summary', agentId, dateRange] as const,
  sentiment: (agentId: string, interval: string, dateRange?: DateRange) =>
    [...analyticsQueryKeys.all, 'sentiment', agentId, interval, dateRange] as const,
  topics: (agentId: string, limit: number, dateRange?: DateRange) =>
    [...analyticsQueryKeys.all, 'topics', agentId, limit, dateRange] as const,
  engagement: (agentId: string, dateRange?: DateRange) =>
    [...analyticsQueryKeys.all, 'engagement', agentId, dateRange] as const,
  resolution: (agentId: string, dateRange?: DateRange) =>
    [...analyticsQueryKeys.all, 'resolution', agentId, dateRange] as const,
};

// =====================================================
// HOOKS
// =====================================================

/**
 * Get conversation summary statistics
 */
export function useConversationSummary(
  agentId: string | null,
  dateRange?: DateRange,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: analyticsQueryKeys.summary(agentId || '', dateRange),
    queryFn: async () => {
      if (!agentId) return null;

      const query = buildDateRangeQuery(dateRange);
      const response = await fetchApi<{
        success: boolean;
        summary: ConversationSummary;
      }>(`/api/agent-analytics/summary/${agentId}${query}`);

      return response.summary;
    },
    enabled: options?.enabled !== false && !!agentId,
    refetchInterval: options?.refetchInterval,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get sentiment trends over time
 */
export function useSentimentTrends(
  agentId: string | null,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  dateRange?: DateRange,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: analyticsQueryKeys.sentiment(agentId || '', interval, dateRange),
    queryFn: async () => {
      if (!agentId) return [];

      let query = buildDateRangeQuery(dateRange);
      if (query) {
        query += `&interval=${interval}`;
      } else {
        query = `?interval=${interval}`;
      }

      const response = await fetchApi<{
        success: boolean;
        trends: SentimentDataPoint[];
        interval: string;
      }>(`/api/agent-analytics/sentiment/${agentId}${query}`);

      return response.trends;
    },
    enabled: options?.enabled !== false && !!agentId,
    refetchInterval: options?.refetchInterval,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get topic distribution
 */
export function useTopicDistribution(
  agentId: string | null,
  dateRange?: DateRange,
  limit: number = 20,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: analyticsQueryKeys.topics(agentId || '', limit, dateRange),
    queryFn: async () => {
      if (!agentId) return [];

      let query = buildDateRangeQuery(dateRange);
      if (query) {
        query += `&limit=${limit}`;
      } else {
        query = `?limit=${limit}`;
      }

      const response = await fetchApi<{
        success: boolean;
        topics: TopicData[];
        count: number;
      }>(`/api/agent-analytics/topics/${agentId}${query}`);

      return response.topics;
    },
    enabled: options?.enabled !== false && !!agentId,
    refetchInterval: options?.refetchInterval,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get engagement metrics
 */
export function useEngagementMetrics(
  agentId: string | null,
  dateRange?: DateRange,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: analyticsQueryKeys.engagement(agentId || '', dateRange),
    queryFn: async () => {
      if (!agentId) return null;

      const query = buildDateRangeQuery(dateRange);
      const response = await fetchApi<{
        success: boolean;
        metrics: EngagementMetrics;
      }>(`/api/agent-analytics/engagement/${agentId}${query}`);

      return response.metrics;
    },
    enabled: options?.enabled !== false && !!agentId,
    refetchInterval: options?.refetchInterval,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get resolution outcomes
 */
export function useResolutionOutcomes(
  agentId: string | null,
  dateRange?: DateRange,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: analyticsQueryKeys.resolution(agentId || '', dateRange),
    queryFn: async () => {
      if (!agentId) return null;

      const query = buildDateRangeQuery(dateRange);
      const response = await fetchApi<{
        success: boolean;
        outcomes: ResolutionOutcomes;
      }>(`/api/agent-analytics/resolution/${agentId}${query}`);

      return response.outcomes;
    },
    enabled: options?.enabled !== false && !!agentId,
    refetchInterval: options?.refetchInterval,
    staleTime: 30000, // 30 seconds
  });
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  useConversationSummary,
  useSentimentTrends,
  useTopicDistribution,
  useEngagementMetrics,
  useResolutionOutcomes,
};
