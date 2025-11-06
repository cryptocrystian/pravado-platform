// =====================================================
// CHANNEL INTELLIGENCE HOOKS
// Sprint 27: Channel effectiveness and sentiment analysis
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  LogEngagementInput,
  AnalyzeSentimentInput,
  ContactChannelProfile,
  CampaignChannelStats,
  ChannelRecommendation,
  SentimentTrend,
  SentimentTrendSummary,
  BestTimeToContact,
  SentimentAnalysisResult,
  ChannelType,
  EngagementType,
  EngagementSentiment,
  CHANNEL_CONFIGS,
  SENTIMENT_CONFIGS,
  ENGAGEMENT_TYPE_CONFIGS,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Log an engagement event
 */
export function useLogEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<LogEngagementInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/channel-intel/engagement`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to log engagement');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contact-channel-profile', variables.contactId] });
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign-channel-stats', variables.campaignId] });
      }
      queryClient.invalidateQueries({ queryKey: ['sentiment-trends', variables.contactId] });
    },
  });
}

/**
 * Analyze sentiment of a message
 */
export function useAnalyzeSentiment() {
  return useMutation({
    mutationFn: async (input: AnalyzeSentimentInput) => {
      const res = await fetch(`${API_BASE}/channel-intel/analyze-sentiment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to analyze sentiment');
      }
      return res.json() as Promise<{ success: boolean; analysis: SentimentAnalysisResult }>;
    },
  });
}

/**
 * Summarize sentiment trends (GPT-powered)
 */
export function useSummarizeSentimentTrends() {
  return useMutation({
    mutationFn: async (input: {
      contactId: string;
      channelType?: ChannelType;
      timeframe?: 'week' | 'month' | 'quarter' | 'all';
      includeRecommendations?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/channel-intel/trends/${input.contactId}/summarize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize trends');
      }
      return res.json() as Promise<{ success: boolean; summary: SentimentTrendSummary }>;
    },
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get contact channel profile
 */
export function useContactChannelProfile(contactId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['contact-channel-profile', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const res = await fetch(`${API_BASE}/channel-intel/contact/${contactId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch contact channel profile');
      return res.json() as Promise<{ success: boolean; profile: ContactChannelProfile }>;
    },
    enabled: !!contactId,
    refetchInterval,
  });
}

/**
 * Get campaign channel statistics
 */
export function useCampaignChannelStats(campaignId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-channel-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/channel-intel/campaign/${campaignId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign channel stats');
      return res.json() as Promise<{ success: boolean; stats: CampaignChannelStats }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get channel recommendations for a contact
 */
export function useChannelRecommendations(
  contactId: string | null,
  options?: {
    campaignId?: string;
    excludeChannels?: ChannelType[];
  }
) {
  return useQuery({
    queryKey: ['channel-recommendations', contactId, options],
    queryFn: async () => {
      if (!contactId) return null;

      let url = `${API_BASE}/channel-intel/recommendations/${contactId}`;
      const params = new URLSearchParams();

      if (options?.campaignId) {
        params.append('campaignId', options.campaignId);
      }
      if (options?.excludeChannels?.length) {
        params.append('excludeChannels', options.excludeChannels.join(','));
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch channel recommendations');
      return res.json() as Promise<{ success: boolean; recommendations: ChannelRecommendation[] }>;
    },
    enabled: !!contactId,
  });
}

/**
 * Get sentiment trends for a contact
 */
export function useSentimentTrends(contactId: string | null, channelType?: ChannelType) {
  return useQuery({
    queryKey: ['sentiment-trends', contactId, channelType],
    queryFn: async () => {
      if (!contactId) return null;

      let url = `${API_BASE}/channel-intel/trends/${contactId}`;
      if (channelType) {
        url += `?channelType=${channelType}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sentiment trends');
      return res.json() as Promise<{ success: boolean; trends: SentimentTrend[]; total: number }>;
    },
    enabled: !!contactId,
  });
}

/**
 * Get best time to contact
 */
export function useBestTimeToContact(contactId: string | null) {
  return useQuery({
    queryKey: ['best-time-to-contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const res = await fetch(`${API_BASE}/channel-intel/best-time/${contactId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch best time to contact');
      return res.json() as Promise<{ success: boolean; recommendations: BestTimeToContact[] }>;
    },
    enabled: !!contactId,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get preferred channel for a contact
 */
export function usePreferredChannel(contactId: string | null) {
  const { data } = useContactChannelProfile(contactId);

  if (!data || !data.profile) return null;

  return data.profile.preferredChannel;
}

/**
 * Get recommended tone for a contact
 */
export function useRecommendedTone(contactId: string | null) {
  const { data } = useChannelRecommendations(contactId);

  if (!data || !data.recommendations || data.recommendations.length === 0) {
    return 'professional'; // Default
  }

  return data.recommendations[0].recommendedTone;
}

/**
 * Get channel performance summary
 */
export function useChannelPerformanceSummary(contactId: string | null) {
  const { data } = useContactChannelProfile(contactId);

  if (!data || !data.profile) {
    return {
      bestChannel: null,
      worstChannel: null,
      avgReplyRate: 0,
      overallSentiment: 'NEUTRAL' as EngagementSentiment,
    };
  }

  const performances = data.profile.performances;

  if (performances.length === 0) {
    return {
      bestChannel: null,
      worstChannel: null,
      avgReplyRate: 0,
      overallSentiment: 'NEUTRAL' as EngagementSentiment,
    };
  }

  const sortedByReply = [...performances].sort((a, b) => b.replyRate - a.replyRate);
  const bestChannel = sortedByReply[0]?.channelType;
  const worstChannel = sortedByReply[sortedByReply.length - 1]?.channelType;

  const avgReplyRate =
    performances.reduce((sum, p) => sum + p.replyRate, 0) / performances.length;

  const avgSentiment =
    performances.reduce((sum, p) => sum + p.avgSentimentScore, 0) / performances.length;

  const overallSentiment =
    avgSentiment > 0.6
      ? 'POSITIVE'
      : avgSentiment < 0.4
      ? 'NEGATIVE'
      : 'NEUTRAL';

  return {
    bestChannel,
    worstChannel,
    avgReplyRate,
    overallSentiment,
  };
}

/**
 * Get channel performance chart data
 */
export function useChannelPerformanceChart(contactId: string | null) {
  const { data } = useContactChannelProfile(contactId);

  if (!data || !data.profile) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const performances = data.profile.performances;

  return {
    labels: performances.map((p) => CHANNEL_CONFIGS[p.channelType].label),
    datasets: [
      {
        label: 'Reply Rate',
        data: performances.map((p) => p.replyRate * 100),
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-500
      },
      {
        label: 'Open Rate',
        data: performances.map((p) => p.openRate * 100),
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // green-500
      },
      {
        label: 'Sentiment Score',
        data: performances.map((p) => p.avgSentimentScore * 100),
        backgroundColor: 'rgba(245, 158, 11, 0.5)', // amber-500
      },
    ],
  };
}

/**
 * Get sentiment trend chart data
 */
export function useSentimentTrendChart(contactId: string | null, channelType?: ChannelType) {
  const { data } = useSentimentTrends(contactId, channelType);

  if (!data || !data.trends) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const trends = data.trends.slice(0, 30); // Last 30 engagements

  return {
    labels: trends.map((t) => new Date(t.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Sentiment Score',
        data: trends.map((t) => t.sentimentScore * 100),
        borderColor: 'rgba(59, 130, 246, 1)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
    ],
  };
}

/**
 * Get receptiveness score color
 */
export function useReceptivenessColor() {
  return (score: number) => {
    if (score >= 70) return '#10B981'; // green-500
    if (score >= 50) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };
}

/**
 * Get channel color
 */
export function useChannelColor() {
  return (channelType: ChannelType) => {
    return CHANNEL_CONFIGS[channelType]?.color || '#6B7280';
  };
}

/**
 * Get sentiment color
 */
export function useSentimentColor() {
  return (sentiment: EngagementSentiment) => {
    return SENTIMENT_CONFIGS[sentiment]?.color || '#6B7280';
  };
}

/**
 * Get channel icon
 */
export function useChannelIcon() {
  return (channelType: ChannelType) => {
    return CHANNEL_CONFIGS[channelType]?.icon || 'message-circle';
  };
}

/**
 * Get sentiment icon
 */
export function useSentimentIcon() {
  return (sentiment: EngagementSentiment) => {
    return SENTIMENT_CONFIGS[sentiment]?.icon || 'help-circle';
  };
}

/**
 * Get engagement type icon
 */
export function useEngagementTypeIcon() {
  return (engagementType: EngagementType) => {
    return ENGAGEMENT_TYPE_CONFIGS[engagementType]?.icon || 'activity';
  };
}

/**
 * Format best time text
 */
export function useBestTimeText() {
  return (timeRec: BestTimeToContact) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[timeRec.preferredDayOfWeek];
    const hour = timeRec.preferredHour % 12 || 12;
    const ampm = timeRec.preferredHour < 12 ? 'AM' : 'PM';

    return `${day}s around ${hour}${ampm}`;
  };
}

/**
 * Get sentiment trend indicator
 */
export function useSentimentTrendIndicator(contactId: string | null) {
  const { data } = useContactChannelProfile(contactId);

  if (!data || !data.profile) return null;

  const trend = data.profile.sentimentTrend;

  return {
    trend,
    color: trend === 'IMPROVING' ? '#10B981' : trend === 'DECLINING' ? '#EF4444' : '#6B7280',
    icon: trend === 'IMPROVING' ? 'trending-up' : trend === 'DECLINING' ? 'trending-down' : 'minus',
    label: trend === 'IMPROVING' ? 'Improving' : trend === 'DECLINING' ? 'Declining' : 'Stable',
  };
}

/**
 * Check if contact is high receptiveness
 */
export function useIsHighReceptiveness(contactId: string | null, threshold: number = 70) {
  const { data } = useContactChannelProfile(contactId);

  if (!data || !data.profile) return false;

  return data.profile.overallReceptiveness >= threshold;
}

/**
 * Check if contact is at risk (declining sentiment)
 */
export function useIsAtRisk(contactId: string | null) {
  const { data } = useContactChannelProfile(contactId);

  if (!data || !data.profile) return false;

  return (
    data.profile.sentimentTrend === 'DECLINING' ||
    data.profile.overallReceptiveness < 30
  );
}

/**
 * Real-time contact channel profile (polling)
 */
export function useRealtimeContactProfile(contactId: string | null) {
  return useContactChannelProfile(contactId, 60000); // Poll every minute
}

/**
 * Real-time campaign stats (polling)
 */
export function useRealtimeCampaignStats(campaignId: string | null) {
  return useCampaignChannelStats(campaignId, 60000); // Poll every minute
}
