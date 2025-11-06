// =====================================================
// TEAM ANALYTICS HOOKS
// Sprint 32: Activity tracking, anomaly detection, coaching
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  LogTeamEventInput,
  CalculateMetricsInput,
  DetectAnomaliesInput,
  GetActivityFeedInput,
  GetBehaviorMetricsInput,
  GetAnomaliesInput,
  SummarizeTeamPatternsInput,
  RecommendCoachingInput,
  ResolveAnomalyInput,
  TeamActivityEvent,
  TeamBehaviorMetrics,
  BehavioralAnomaly,
  GptTeamPatternSummary,
  TeamSummary,
  CoachingOpportunity,
  PerformanceTrend,
  ActivityType,
  AnomalyType,
  EngagementMode,
  AnomalySeverity,
  ACTIVITY_TYPE_CONFIGS,
  ANOMALY_TYPE_CONFIGS,
  ENGAGEMENT_MODE_CONFIGS,
  SEVERITY_CONFIGS,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Log team event
 */
export function useLogTeamEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<LogTeamEventInput, 'organizationId' | 'userId'>) => {
      const res = await fetch(`${API_BASE}/team-analytics/event`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log team event');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
}

/**
 * Calculate metrics
 */
export function useCalculateMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CalculateMetricsInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/team-analytics/metrics/calculate`, {
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
      queryClient.invalidateQueries({ queryKey: ['behavior-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['behavior-metrics', variables.userId] });
    },
  });
}

/**
 * Calculate metrics for all users
 */
export function useCalculateMetricsForAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { periodStart: string; periodEnd: string; windowType?: string }) => {
      const res = await fetch(`${API_BASE}/team-analytics/metrics/calculate-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to calculate metrics for all');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['behavior-metrics'] });
    },
  });
}

/**
 * Detect anomalies
 */
export function useDetectAnomalies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<DetectAnomaliesInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/team-analytics/anomalies/detect`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to detect anomalies');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomalies', variables.userId] });
    },
  });
}

/**
 * Detect anomalies for all users
 */
export function useDetectAnomaliesForAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { detectionWindowStart: string; detectionWindowEnd: string }) => {
      const res = await fetch(`${API_BASE}/team-analytics/anomalies/detect-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to detect anomalies for all');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
}

/**
 * Resolve anomaly
 */
export function useResolveAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { anomalyId: string; resolutionNotes?: string }) => {
      const res = await fetch(`${API_BASE}/team-analytics/anomalies/${input.anomalyId}/resolve`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: input.resolutionNotes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to resolve anomaly');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });
}

/**
 * Summarize team patterns
 */
export function useSummarizeTeamPatterns() {
  return useMutation({
    mutationFn: async (input: Omit<SummarizeTeamPatternsInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/team-analytics/summarize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize team patterns');
      }
      return res.json();
    },
  });
}

/**
 * Recommend coaching
 */
export function useRecommendCoaching() {
  return useMutation({
    mutationFn: async (input: Omit<RecommendCoachingInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/team-analytics/coaching`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to recommend coaching');
      }
      return res.json();
    },
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get team activity feed
 */
export function useTeamActivityFeed(input: Omit<GetActivityFeedInput, 'organizationId'>) {
  return useQuery({
    queryKey: ['activity-feed', input],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (input.userId) params.append('userId', input.userId);
      if (input.campaignId) params.append('campaignId', input.campaignId);
      if (input.activityTypes?.length) params.append('activityTypes', input.activityTypes.join(','));
      if (input.startDate) params.append('startDate', input.startDate);
      if (input.endDate) params.append('endDate', input.endDate);
      if (input.limit) params.append('limit', input.limit.toString());
      if (input.offset) params.append('offset', input.offset.toString());

      const res = await fetch(`${API_BASE}/team-analytics/activity-feed?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch activity feed');
      }
      const data = await res.json();
      return { events: data.events as TeamActivityEvent[], total: data.total as number };
    },
  });
}

/**
 * Get behavior metrics
 */
export function useBehaviorMetrics(input: Omit<GetBehaviorMetricsInput, 'organizationId'>) {
  return useQuery({
    queryKey: ['behavior-metrics', input],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (input.userId) params.append('userId', input.userId);
      if (input.windowType) params.append('windowType', input.windowType);
      if (input.periodStart) params.append('periodStart', input.periodStart);
      if (input.periodEnd) params.append('periodEnd', input.periodEnd);
      if (input.limit) params.append('limit', input.limit.toString());
      if (input.offset) params.append('offset', input.offset.toString());

      const res = await fetch(`${API_BASE}/team-analytics/metrics?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch behavior metrics');
      }
      const data = await res.json();
      return { metrics: data.metrics as TeamBehaviorMetrics[], total: data.total as number };
    },
  });
}

/**
 * Get performance trend
 */
export function usePerformanceTrend(
  userId: string | undefined,
  periodStart: string,
  periodEnd: string
) {
  return useQuery({
    queryKey: ['performance-trend', userId, periodStart, periodEnd],
    queryFn: async () => {
      if (!userId) return null;
      const params = new URLSearchParams();
      params.append('periodStart', periodStart);
      params.append('periodEnd', periodEnd);

      const res = await fetch(`${API_BASE}/team-analytics/metrics/trend/${userId}?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch performance trend');
      }
      const data = await res.json();
      return data.trend as PerformanceTrend;
    },
    enabled: !!userId,
  });
}

/**
 * Get anomalies
 */
export function useBehaviorAnomalies(input: Omit<GetAnomaliesInput, 'organizationId'>) {
  return useQuery({
    queryKey: ['anomalies', input],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (input.userId) params.append('userId', input.userId);
      if (input.anomalyType) params.append('anomalyType', input.anomalyType);
      if (input.severity) params.append('severity', input.severity);
      if (input.isResolved !== undefined) params.append('isResolved', input.isResolved.toString());
      if (input.limit) params.append('limit', input.limit.toString());
      if (input.offset) params.append('offset', input.offset.toString());

      const res = await fetch(`${API_BASE}/team-analytics/anomalies?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch anomalies');
      }
      const data = await res.json();
      return { anomalies: data.anomalies as BehavioralAnomaly[], total: data.total as number };
    },
  });
}

// =====================================================
// HELPER HOOKS - CONFIGURATION
// =====================================================

/**
 * Get activity type config
 */
export function useActivityTypeConfig(type: ActivityType | undefined) {
  if (!type) return null;
  return ACTIVITY_TYPE_CONFIGS[type];
}

/**
 * Get anomaly type config
 */
export function useAnomalyTypeConfig(type: AnomalyType | undefined) {
  if (!type) return null;
  return ANOMALY_TYPE_CONFIGS[type];
}

/**
 * Get engagement mode config
 */
export function useEngagementModeConfig(mode: EngagementMode | undefined) {
  if (!mode) return null;
  return ENGAGEMENT_MODE_CONFIGS[mode];
}

/**
 * Get severity config
 */
export function useSeverityConfig(severity: AnomalySeverity | undefined) {
  if (!severity) return null;
  return SEVERITY_CONFIGS[severity];
}

/**
 * Get activity type color
 */
export function useActivityTypeColor(type: ActivityType | undefined) {
  const config = useActivityTypeConfig(type);
  return config?.color || '#6B7280';
}

/**
 * Get activity type icon
 */
export function useActivityTypeIcon(type: ActivityType | undefined) {
  const config = useActivityTypeConfig(type);
  return config?.icon || 'activity';
}

/**
 * Get anomaly color
 */
export function useAnomalyColor(type: AnomalyType | undefined) {
  const config = useAnomalyTypeConfig(type);
  return config?.color || '#6B7280';
}

/**
 * Get anomaly icon
 */
export function useAnomalyIcon(type: AnomalyType | undefined) {
  const config = useAnomalyTypeConfig(type);
  return config?.icon || 'alert-circle';
}

/**
 * Get severity color
 */
export function useSeverityColor(severity: AnomalySeverity | undefined) {
  const config = useSeverityConfig(severity);
  return config?.color || '#6B7280';
}

/**
 * Get engagement mode badge
 */
export function useEngagementModeBadge(mode: EngagementMode | undefined) {
  const config = useEngagementModeConfig(mode);
  return config?.badge || 'Unknown';
}

// =====================================================
// HELPER HOOKS - UI HELPERS
// =====================================================

/**
 * Get performance trend chart data
 */
export function usePerformanceTrendChart(trend: PerformanceTrend | undefined | null) {
  if (!trend) return null;

  return {
    labels: trend.dataPoints.map((dp) => dp.date),
    datasets: [
      {
        label: 'Activity Count',
        data: trend.dataPoints.map((dp) => dp.activityCount),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
    ],
  };
}

/**
 * Check if user is performing well
 */
export function useIsPerformingWell(metrics: TeamBehaviorMetrics | undefined) {
  if (!metrics) return null;
  if (metrics.teamPercentile && metrics.teamPercentile >= 75) return true;
  if (metrics.successRate && metrics.successRate >= 90) return true;
  return false;
}

/**
 * Get velocity trend indicator
 */
export function useVelocityTrendIndicator(trend: 'increasing' | 'stable' | 'decreasing' | undefined) {
  if (!trend) return { label: 'Unknown', color: '#6B7280', icon: 'minus' };
  const indicators = {
    increasing: { label: 'Increasing', color: '#10B981', icon: 'trending-up' },
    stable: { label: 'Stable', color: '#3B82F6', icon: 'minus' },
    decreasing: { label: 'Decreasing', color: '#EF4444', icon: 'trending-down' },
  };
  return indicators[trend];
}

/**
 * Get percentile rank label
 */
export function usePercentileRankLabel(percentile: number | undefined) {
  if (percentile === undefined) return 'Unknown';
  if (percentile >= 90) return 'Top Performer';
  if (percentile >= 75) return 'High Performer';
  if (percentile >= 50) return 'Average Performer';
  if (percentile >= 25) return 'Below Average';
  return 'Low Performer';
}

/**
 * Get quality score label
 */
export function useQualityScoreLabel(score: number | undefined) {
  if (score === undefined) return 'Unknown';
  if (score >= 0.8) return 'Excellent';
  if (score >= 0.6) return 'Good';
  if (score >= 0.4) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Get success rate label
 */
export function useSuccessRateLabel(rate: number | undefined) {
  if (rate === undefined) return 'Unknown';
  if (rate >= 90) return 'Excellent';
  if (rate >= 75) return 'Good';
  if (rate >= 60) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Get anomaly detection status
 */
export function useAnomalyDetectionStatus(anomalies: BehavioralAnomaly[] | undefined) {
  if (!anomalies || anomalies.length === 0) {
    return { status: 'healthy', message: 'No anomalies detected', color: '#10B981' };
  }

  const criticalCount = anomalies.filter((a) => a.severity === 'critical' && !a.isResolved).length;
  const highCount = anomalies.filter((a) => a.severity === 'high' && !a.isResolved).length;

  if (criticalCount > 0) {
    return {
      status: 'critical',
      message: `${criticalCount} critical anomal${criticalCount === 1 ? 'y' : 'ies'}`,
      color: '#991B1B',
    };
  }

  if (highCount > 0) {
    return {
      status: 'warning',
      message: `${highCount} high-severity anomal${highCount === 1 ? 'y' : 'ies'}`,
      color: '#EF4444',
    };
  }

  return {
    status: 'attention',
    message: `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected`,
    color: '#F59E0B',
  };
}

// =====================================================
// HELPER HOOKS - FILTERING & AGGREGATION
// =====================================================

/**
 * Filter events by activity type
 */
export function useEventsByActivityType(
  events: TeamActivityEvent[] | undefined,
  type: ActivityType
) {
  if (!events) return [];
  return events.filter((e) => e.activityType === type);
}

/**
 * Filter events by user
 */
export function useEventsByUser(events: TeamActivityEvent[] | undefined, userId: string) {
  if (!events) return [];
  return events.filter((e) => e.userId === userId);
}

/**
 * Get activity distribution
 */
export function useActivityDistribution(events: TeamActivityEvent[] | undefined) {
  if (!events) return {};
  return events.reduce((acc, event) => {
    acc[event.activityType] = (acc[event.activityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Get engagement distribution
 */
export function useEngagementDistribution(events: TeamActivityEvent[] | undefined) {
  if (!events) return {};
  return events.reduce((acc, event) => {
    acc[event.engagementMode] = (acc[event.engagementMode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculate average quality score
 */
export function useAverageQualityScore(events: TeamActivityEvent[] | undefined) {
  if (!events || events.length === 0) return undefined;
  const eventsWithScore = events.filter((e) => e.qualityScore !== undefined);
  if (eventsWithScore.length === 0) return undefined;
  const sum = eventsWithScore.reduce((acc, e) => acc + (e.qualityScore || 0), 0);
  return sum / eventsWithScore.length;
}

/**
 * Calculate success rate
 */
export function useSuccessRate(events: TeamActivityEvent[] | undefined) {
  if (!events || events.length === 0) return undefined;
  const successCount = events.filter((e) => e.success).length;
  return (successCount / events.length) * 100;
}

/**
 * Get unresolved anomalies count
 */
export function useUnresolvedAnomaliesCount(anomalies: BehavioralAnomaly[] | undefined) {
  if (!anomalies) return 0;
  return anomalies.filter((a) => !a.isResolved).length;
}

/**
 * Get high-priority coaching opportunities
 */
export function useHighPriorityCoaching(opportunities: CoachingOpportunity[] | undefined) {
  if (!opportunities) return [];
  return opportunities.filter((o) => o.priority === 'high');
}
