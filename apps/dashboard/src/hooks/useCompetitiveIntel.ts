// =====================================================
// COMPETITIVE INTELLIGENCE HOOKS
// Sprint 33: Competitor tracking, market trends, AI insights
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Competitor,
  IntelEvent,
  IntelTrend,
  CompetitorMetrics,
  CompetitorProfile,
  MarketTrendsSummary,
  CompetitiveDashboardData,
  GptCompetitorAnalysis,
  GptMarketAnalysis,
  CreateCompetitorInput,
  UpdateCompetitorInput,
  LogIntelEventInput,
  UpdateIntelEventInput,
  CreateTrendInput,
  CalculateCompetitorMetricsInput,
  GetCompetitorsInput,
  GetIntelFeedInput,
  GetTrendsInput,
  IntelEventType,
  IntelSourceType,
  IntelSeverity,
  ActivityLevel,
  CompetitorPriority,
  INTEL_EVENT_TYPE_CONFIGS,
  INTEL_SOURCE_TYPE_CONFIGS,
  INTEL_SEVERITY_CONFIGS,
  ACTIVITY_LEVEL_CONFIGS,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS - COMPETITORS
// =====================================================

/**
 * Create competitor
 */
export function useCreateCompetitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateCompetitorInput, 'organizationId' | 'addedBy'>) => {
      const res = await fetch(`${API_BASE}/competitive-intel/competitors`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create competitor');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
    },
  });
}

/**
 * Update competitor
 */
export function useUpdateCompetitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCompetitorInput) => {
      const res = await fetch(`${API_BASE}/competitive-intel/competitors/${input.competitorId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update competitor');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      queryClient.invalidateQueries({ queryKey: ['competitor', variables.competitorId] });
    },
  });
}

/**
 * Summarize competitor (GPT-4)
 */
export function useSummarizeCompetitor() {
  return useMutation({
    mutationFn: async (competitorId: string) => {
      const res = await fetch(`${API_BASE}/competitive-intel/competitors/${competitorId}/summarize`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize competitor');
      }
      return res.json();
    },
  });
}

// =====================================================
// MUTATION HOOKS - INTEL EVENTS
// =====================================================

/**
 * Log intel event
 */
export function useLogIntelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<LogIntelEventInput, 'organizationId' | 'submittedBy'>) => {
      const res = await fetch(`${API_BASE}/competitive-intel/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log intel event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intel-feed'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Update intel event
 */
export function useUpdateIntelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateIntelEventInput) => {
      const res = await fetch(`${API_BASE}/competitive-intel/events/${input.eventId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update intel event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intel-feed'] });
    },
  });
}

// =====================================================
// MUTATION HOOKS - METRICS
// =====================================================

/**
 * Calculate competitor metrics
 */
export function useCalculateCompetitorMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CalculateCompetitorMetricsInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/competitive-intel/competitors/${input.competitorId}/metrics/calculate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to calculate metrics');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-metrics', variables.competitorId] });
    },
  });
}

// =====================================================
// MUTATION HOOKS - TRENDS
// =====================================================

/**
 * Create trend
 */
export function useCreateTrend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateTrendInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/competitive-intel/trends`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create trend');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends'] });
    },
  });
}

/**
 * Summarize market trends (GPT-4)
 */
export function useSummarizeTrends() {
  return useMutation({
    mutationFn: async (input: { category: string; periodStart: string; periodEnd: string }) => {
      const res = await fetch(`${API_BASE}/competitive-intel/market/${input.category}/summarize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart: input.periodStart, periodEnd: input.periodEnd }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize trends');
      }
      return res.json();
    },
  });
}

// =====================================================
// QUERY HOOKS - COMPETITORS
// =====================================================

/**
 * Get competitors list
 */
export function useCompetitorList(input?: Omit<GetCompetitorsInput, 'organizationId'>) {
  return useQuery({
    queryKey: ['competitors', input],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (input?.isActive !== undefined) params.append('isActive', input.isActive.toString());
      if (input?.priority) params.append('priority', input.priority);
      if (input?.category) params.append('category', input.category);
      if (input?.limit) params.append('limit', input.limit.toString());
      if (input?.offset) params.append('offset', input.offset.toString());

      const res = await fetch(`${API_BASE}/competitive-intel/competitors?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch competitors');
      }
      const data = await res.json();
      return { competitors: data.competitors as Competitor[], total: data.total as number };
    },
  });
}

/**
 * Get competitor profile
 */
export function useCompetitorProfile(competitorId: string | undefined) {
  return useQuery({
    queryKey: ['competitor', competitorId],
    queryFn: async () => {
      if (!competitorId) return null;
      const res = await fetch(`${API_BASE}/competitive-intel/competitors/${competitorId}/profile`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch competitor profile');
      }
      const data = await res.json();
      return data.profile as CompetitorProfile;
    },
    enabled: !!competitorId,
  });
}

// =====================================================
// QUERY HOOKS - INTEL FEED
// =====================================================

/**
 * Get intel feed
 */
export function useIntelFeed(input?: Omit<GetIntelFeedInput, 'organizationId'>) {
  return useQuery({
    queryKey: ['intel-feed', input],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (input?.competitorId) params.append('competitorId', input.competitorId);
      if (input?.eventTypes?.length) params.append('eventTypes', input.eventTypes.join(','));
      if (input?.severity) params.append('severity', input.severity);
      if (input?.sourceType) params.append('sourceType', input.sourceType);
      if (input?.startDate) params.append('startDate', input.startDate);
      if (input?.endDate) params.append('endDate', input.endDate);
      if (input?.limit) params.append('limit', input.limit.toString());
      if (input?.offset) params.append('offset', input.offset.toString());

      const res = await fetch(`${API_BASE}/competitive-intel/events?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch intel feed');
      }
      const data = await res.json();
      return { events: data.events as IntelEvent[], total: data.total as number };
    },
  });
}

// =====================================================
// QUERY HOOKS - TRENDS
// =====================================================

/**
 * Get trends
 */
export function useMarketTrends(input?: Omit<GetTrendsInput, 'organizationId'>) {
  return useQuery({
    queryKey: ['trends', input],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (input?.category) params.append('category', input.category);
      if (input?.periodStart) params.append('periodStart', input.periodStart);
      if (input?.periodEnd) params.append('periodEnd', input.periodEnd);
      if (input?.limit) params.append('limit', input.limit.toString());
      if (input?.offset) params.append('offset', input.offset.toString());

      const res = await fetch(`${API_BASE}/competitive-intel/trends?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch trends');
      }
      const data = await res.json();
      return { trends: data.trends as IntelTrend[], total: data.total as number };
    },
  });
}

/**
 * Get market trends summary
 */
export function useMarketTrendsSummary(
  category: string | undefined,
  periodStart: string,
  periodEnd: string
) {
  return useQuery({
    queryKey: ['market-trends-summary', category, periodStart, periodEnd],
    queryFn: async () => {
      if (!category) return null;
      const params = new URLSearchParams();
      params.append('periodStart', periodStart);
      params.append('periodEnd', periodEnd);

      const res = await fetch(`${API_BASE}/competitive-intel/market/${category}/trends?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch market trends summary');
      }
      const data = await res.json();
      return data.summary as MarketTrendsSummary;
    },
    enabled: !!category,
  });
}

// =====================================================
// QUERY HOOKS - METRICS
// =====================================================

/**
 * Get competitor metrics
 */
export function useCompetitorMetrics(competitorId: string | undefined) {
  return useQuery({
    queryKey: ['competitor-metrics', competitorId],
    queryFn: async () => {
      if (!competitorId) return null;
      const res = await fetch(`${API_BASE}/competitive-intel/competitors/${competitorId}/metrics`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch competitor metrics');
      }
      const data = await res.json();
      return { metrics: data.metrics as CompetitorMetrics[], total: data.total as number };
    },
    enabled: !!competitorId,
  });
}

// =====================================================
// QUERY HOOKS - DASHBOARD
// =====================================================

/**
 * Get dashboard snapshot
 */
export function useDashboardSnapshot(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['dashboard', periodStart, periodEnd],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (periodStart) params.append('periodStart', periodStart);
      if (periodEnd) params.append('periodEnd', periodEnd);

      const res = await fetch(`${API_BASE}/competitive-intel/dashboard?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard');
      }
      const data = await res.json();
      return data.data as CompetitiveDashboardData;
    },
  });
}

// =====================================================
// HELPER HOOKS - CONFIGURATION
// =====================================================

/**
 * Get event type config
 */
export function useIntelEventTypeConfig(type: IntelEventType | undefined) {
  if (!type) return null;
  return INTEL_EVENT_TYPE_CONFIGS[type];
}

/**
 * Get source type config
 */
export function useIntelSourceTypeConfig(source: IntelSourceType | undefined) {
  if (!source) return null;
  return INTEL_SOURCE_TYPE_CONFIGS[source];
}

/**
 * Get severity config
 */
export function useIntelSeverityConfig(severity: IntelSeverity | undefined) {
  if (!severity) return null;
  return INTEL_SEVERITY_CONFIGS[severity];
}

/**
 * Get activity level config
 */
export function useActivityLevelConfig(level: ActivityLevel | undefined) {
  if (!level) return null;
  return ACTIVITY_LEVEL_CONFIGS[level];
}

/**
 * Get event type icon
 */
export function useIntelSourceIcon(source: IntelSourceType | undefined) {
  const config = useIntelSourceTypeConfig(source);
  return config?.icon || 'info';
}

/**
 * Get severity color
 */
export function useSeverityColor(severity: IntelSeverity | undefined) {
  const config = useIntelSeverityConfig(severity);
  return config?.color || '#6B7280';
}

/**
 * Get event type color
 */
export function useEventTypeColor(type: IntelEventType | undefined) {
  const config = useIntelEventTypeConfig(type);
  return config?.color || '#6B7280';
}

/**
 * Get activity level color
 */
export function useActivityLevelColor(level: ActivityLevel | undefined) {
  const config = useActivityLevelConfig(level);
  return config?.color || '#6B7280';
}

// =====================================================
// HELPER HOOKS - CHARTS
// =====================================================

/**
 * Get trend chart data
 */
export function useTrendChartData(metrics: CompetitorMetrics[] | undefined | null) {
  if (!metrics || metrics.length === 0) return null;

  return {
    labels: metrics.map((m) => m.periodStart),
    datasets: [
      {
        label: 'Total Events',
        data: metrics.map((m) => m.totalEvents),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
    ],
  };
}

/**
 * Get competitor metrics chart
 */
export function useCompetitorMetricsChart(metrics: CompetitorMetrics | undefined) {
  if (!metrics) return null;

  return {
    labels: [
      'Product Launches',
      'Funding',
      'Partnerships',
      'PR Campaigns',
      'Social Mentions',
      'Media Mentions',
    ],
    datasets: [
      {
        label: 'Event Count',
        data: [
          metrics.productLaunches,
          metrics.fundingEvents,
          metrics.partnerships,
          metrics.prCampaigns,
          metrics.socialMentions,
          metrics.mediaMentions,
        ],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EC4899',
          '#06B6D4',
          '#6366F1',
        ],
      },
    ],
  };
}

// =====================================================
// HELPER HOOKS - FILTERING
// =====================================================

/**
 * Filter events by severity
 */
export function useEventsBySeverity(events: IntelEvent[] | undefined, severity: IntelSeverity) {
  if (!events) return [];
  return events.filter((e) => e.severity === severity);
}

/**
 * Get critical events count
 */
export function useCriticalEventsCount(events: IntelEvent[] | undefined) {
  if (!events) return 0;
  return events.filter((e) => e.severity === 'CRITICAL').length;
}

/**
 * Get high priority competitors
 */
export function useHighPriorityCompetitors(competitors: Competitor[] | undefined) {
  if (!competitors) return [];
  return competitors.filter((c) => c.priority === 'high');
}

/**
 * Get active competitors count
 */
export function useActiveCompetitorsCount(competitors: Competitor[] | undefined) {
  if (!competitors) return 0;
  return competitors.filter((c) => c.isActive).length;
}

/**
 * Filter events by type
 */
export function useEventsByType(events: IntelEvent[] | undefined, type: IntelEventType) {
  if (!events) return [];
  return events.filter((e) => e.eventType === type);
}

/**
 * Get events requiring action
 */
export function useEventsRequiringAction(events: IntelEvent[] | undefined) {
  if (!events) return [];
  return events.filter((e) => e.actionRequired && !e.isVerified);
}
