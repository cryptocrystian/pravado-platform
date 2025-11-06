import { useQuery } from '@tanstack/react-query';
import type {
  TimelineEvent,
  EnrichedTimelineEvent,
  TimelineStats,
  TimelineEventDetails,
  TimelineEventType,
  TimelineEntityType,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// TIMELINE QUERIES
// =====================================================

/**
 * Get campaign timeline
 */
export function useCampaignTimeline(
  campaignId: string | null,
  options?: {
    limit?: number;
    offset?: number;
    eventTypes?: TimelineEventType[];
    startDate?: string;
    endDate?: string;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['campaign-timeline', campaignId, options],
    queryFn: async () => {
      if (!campaignId) return null;

      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));
      if (options?.eventTypes && options.eventTypes.length > 0) {
        params.append('eventTypes', options.eventTypes.join(','));
      }
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const res = await fetch(
        `${API_BASE}/timeline/campaign/${campaignId}${params.toString() ? '?' + params.toString() : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch campaign timeline');
      return res.json() as Promise<{
        success: boolean;
        events: TimelineEvent[];
        total: number;
        limit: number;
        offset: number;
      }>;
    },
    enabled: !!campaignId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Get global timeline across all campaigns
 */
export function useGlobalTimeline(options?: {
  limit?: number;
  offset?: number;
  campaignIds?: string[];
  eventTypes?: TimelineEventType[];
  entityTypes?: TimelineEntityType[];
  actorIds?: string[];
  startDate?: string;
  endDate?: string;
  minImportance?: number;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ['global-timeline', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));
      if (options?.campaignIds && options.campaignIds.length > 0) {
        params.append('campaignIds', options.campaignIds.join(','));
      }
      if (options?.eventTypes && options.eventTypes.length > 0) {
        params.append('eventTypes', options.eventTypes.join(','));
      }
      if (options?.entityTypes && options.entityTypes.length > 0) {
        params.append('entityTypes', options.entityTypes.join(','));
      }
      if (options?.actorIds && options.actorIds.length > 0) {
        params.append('actorIds', options.actorIds.join(','));
      }
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.minImportance !== undefined) {
        params.append('minImportance', String(options.minImportance));
      }

      const res = await fetch(
        `${API_BASE}/timeline/global${params.toString() ? '?' + params.toString() : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch global timeline');
      return res.json() as Promise<{
        success: boolean;
        events: EnrichedTimelineEvent[];
        total: number;
        limit: number;
        offset: number;
      }>;
    },
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Get timeline statistics
 */
export function useTimelineStats(options?: {
  campaignId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['timeline-stats', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.campaignId) params.append('campaignId', options.campaignId);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const res = await fetch(
        `${API_BASE}/timeline/stats${params.toString() ? '?' + params.toString() : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch timeline stats');
      return res.json() as Promise<{
        success: boolean;
        stats: TimelineStats;
      }>;
    },
  });
}

/**
 * Get event details
 */
export function useEventDetails(eventId: string | null) {
  return useQuery({
    queryKey: ['timeline-event-details', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const res = await fetch(`${API_BASE}/timeline/events/${eventId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch event details');
      return res.json() as Promise<{
        success: boolean;
        details: TimelineEventDetails;
      }>;
    },
    enabled: !!eventId,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get recent activity summary
 */
export function useRecentActivity(campaignId?: string, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: campaignData } = useCampaignTimeline(
    campaignId || null,
    campaignId
      ? {
          startDate: startDate.toISOString(),
          limit: 100,
        }
      : undefined
  );

  const { data: globalData } = useGlobalTimeline(
    !campaignId
      ? {
          startDate: startDate.toISOString(),
          limit: 100,
        }
      : undefined
  );

  const events = campaignId ? campaignData?.events || [] : globalData?.events || [];

  if (events.length === 0) return null;

  // Group by event type
  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by day
  const eventsByDay = events.reduce((acc, event) => {
    const day = new Date(event.timestamp).toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get high importance events
  const highImportanceEvents = events
    .filter((e) => e.importanceScore >= 0.7)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 5);

  // Get top actors
  const actorCounts = events.reduce((acc, event) => {
    if (event.actorId) {
      const key = `${event.actorId}:${event.actorName || event.actorId}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topActors = Object.entries(actorCounts)
    .map(([key, count]) => {
      const [actorId, actorName] = key.split(':');
      return { actorId, actorName, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEvents: events.length,
    eventTypeCounts,
    eventsByDay,
    highImportanceEvents,
    topActors,
    recentEvents: events.slice(0, 10),
  };
}

/**
 * Get timeline grouped by day
 */
export function useTimelineGroupedByDay(
  campaignId?: string,
  options?: {
    limit?: number;
    eventTypes?: TimelineEventType[];
  }
) {
  const { data: campaignData } = useCampaignTimeline(
    campaignId || null,
    campaignId ? options : undefined
  );

  const { data: globalData } = useGlobalTimeline(!campaignId ? options : undefined);

  const events = campaignId ? campaignData?.events || [] : globalData?.events || [];

  if (events.length === 0) return [];

  // Group events by day
  const grouped = events.reduce((acc, event) => {
    const day = new Date(event.timestamp).toISOString().split('T')[0];

    if (!acc[day]) {
      acc[day] = {
        date: day,
        events: [],
        count: 0,
      };
    }

    acc[day].events.push(event);
    acc[day].count++;

    return acc;
  }, {} as Record<string, { date: string; events: TimelineEvent[]; count: number }>);

  // Convert to array and sort by date descending
  return Object.values(grouped).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Get timeline filtered by event type
 */
export function useTimelineByEventType(
  eventType: TimelineEventType,
  campaignId?: string,
  limit: number = 20
) {
  return useCampaignTimeline(campaignId || null, {
    eventTypes: [eventType],
    limit,
  });
}

/**
 * Get timeline for specific actor
 */
export function useTimelineByActor(actorId: string, limit: number = 20) {
  return useGlobalTimeline({
    actorIds: [actorId],
    limit,
  });
}

/**
 * Get high importance events
 */
export function useHighImportanceEvents(
  minImportance: number = 0.7,
  campaignId?: string,
  limit: number = 10
) {
  const { data: campaignData } = useCampaignTimeline(campaignId || null, { limit: 100 });
  const { data: globalData } = useGlobalTimeline(!campaignId ? { limit: 100 } : undefined);

  const events = campaignId ? campaignData?.events || [] : globalData?.events || [];

  return events
    .filter((e) => e.importanceScore >= minImportance)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, limit);
}

/**
 * Get event type color for UI
 */
export function useEventTypeColor(eventType: TimelineEventType | null) {
  const colorMap: Record<TimelineEventType, string> = {
    AGENT_RUN: 'blue',
    FOLLOWUP_SENT: 'green',
    REVIEW_SUBMITTED: 'yellow',
    DECISION_MADE: 'purple',
    INSIGHT_GENERATED: 'indigo',
    CRM_INTERACTION: 'cyan',
    TASK_EXECUTED: 'teal',
    GOAL_COMPLETED: 'green',
    FAILURE: 'red',
    CAMPAIGN_CREATED: 'blue',
    CAMPAIGN_LAUNCHED: 'green',
    CONTACT_MATCHED: 'cyan',
    CONTACT_APPROVED: 'green',
    SEQUENCE_GENERATED: 'purple',
    MEMORY_STORED: 'indigo',
    KNOWLEDGE_GRAPH_UPDATED: 'violet',
    HANDOFF_INITIATED: 'orange',
    COLLABORATION_STARTED: 'pink',
  };

  return eventType ? colorMap[eventType] || 'gray' : 'gray';
}

/**
 * Get event type icon for UI
 */
export function useEventTypeIcon(eventType: TimelineEventType | null) {
  const iconMap: Record<TimelineEventType, string> = {
    AGENT_RUN: '🤖',
    FOLLOWUP_SENT: '📧',
    REVIEW_SUBMITTED: '📝',
    DECISION_MADE: '✅',
    INSIGHT_GENERATED: '💡',
    CRM_INTERACTION: '💬',
    TASK_EXECUTED: '⚙️',
    GOAL_COMPLETED: '🎯',
    FAILURE: '❌',
    CAMPAIGN_CREATED: '🚀',
    CAMPAIGN_LAUNCHED: '🎉',
    CONTACT_MATCHED: '🎯',
    CONTACT_APPROVED: '👍',
    SEQUENCE_GENERATED: '📋',
    MEMORY_STORED: '🧠',
    KNOWLEDGE_GRAPH_UPDATED: '🕸️',
    HANDOFF_INITIATED: '🤝',
    COLLABORATION_STARTED: '👥',
  };

  return eventType ? iconMap[eventType] || '📌' : '📌';
}

/**
 * Get real-time timeline with auto-refresh
 */
export function useRealtimeTimeline(campaignId?: string, refetchInterval: number = 30000) {
  return useCampaignTimeline(campaignId || null, {
    limit: 50,
    refetchInterval,
  });
}

/**
 * Get timeline activity trends
 */
export function useTimelineActivityTrends(campaignId?: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: statsData } = useTimelineStats({
    campaignId,
    startDate: startDate.toISOString(),
  });

  if (!statsData?.stats) return null;

  const { stats } = statsData;

  // Calculate daily average
  const dailyAverage = stats.totalEvents / days;

  // Get most active event types
  const topEventTypes = Object.entries(stats.eventTypeCounts)
    .map(([type, count]) => ({ eventType: type as TimelineEventType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate activity trend (last 7 days vs previous 7 days)
  const recentActivity = stats.recentActivity.slice(0, 7);
  const previousActivity = stats.recentActivity.slice(7, 14);

  const recentCount = recentActivity.reduce((sum, a) => sum + a.count, 0);
  const previousCount = previousActivity.reduce((sum, a) => sum + a.count, 0);

  const trendPercentage =
    previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0;

  return {
    totalEvents: stats.totalEvents,
    dailyAverage,
    topEventTypes,
    recentActivity: stats.recentActivity,
    trendPercentage,
    isIncreasing: trendPercentage > 0,
  };
}
