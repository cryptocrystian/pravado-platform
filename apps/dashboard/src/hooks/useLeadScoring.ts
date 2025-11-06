// =====================================================
// LEAD SCORING HOOKS
// Sprint 28: Lead scoring and qualification pipeline
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  RecalculateLeadScoreInput,
  UpdateLeadStageInput,
  SummarizeLeadPerformanceInput,
  LeadScore,
  EnrichedLeadScore,
  LeadScoreSummary,
  LeadTrendResult,
  LeadScoreHistory,
  LeadPerformanceSummary,
  TopLeadsResult,
  QualifiedLeadsResult,
  DisqualifiedLeadsResult,
  LeadStage,
  RAGStatus,
  DisqualificationReason,
  LEAD_STAGE_CONFIGS,
  RAG_STATUS_CONFIGS,
  DISQUALIFICATION_REASON_CONFIGS,
  SCORE_THRESHOLDS,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Recalculate lead score
 */
export function useRecalculateLeadScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<RecalculateLeadScoreInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/lead-scoring/contact/${input.contactId}/recalculate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: input.campaignId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to recalculate lead score');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['lead-score', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['lead-trend', variables.contactId] });
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign-scores', variables.campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaign-summary', variables.campaignId] });
        queryClient.invalidateQueries({ queryKey: ['top-leads', variables.campaignId] });
      }
    },
  });
}

/**
 * Update lead stage
 */
export function useUpdateLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<UpdateLeadStageInput, 'organizationId' | 'userId'>) => {
      const res = await fetch(`${API_BASE}/lead-scoring/contact/${input.contactId}/update-stage`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStage: input.newStage,
          campaignId: input.campaignId,
          disqualificationReason: input.disqualificationReason,
          disqualificationNotes: input.disqualificationNotes,
          source: input.source,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update lead stage');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['lead-score', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', variables.contactId] });
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign-summary', variables.campaignId] });
        queryClient.invalidateQueries({ queryKey: ['qualified-leads'] });
        queryClient.invalidateQueries({ queryKey: ['disqualified-leads'] });
      }
    },
  });
}

/**
 * Disqualify a lead
 */
export function useDisqualifyLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      contactId: string;
      reason: DisqualificationReason;
      notes?: string;
      campaignId?: string;
    }) => {
      const res = await fetch(`${API_BASE}/lead-scoring/contact/${input.contactId}/disqualify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: input.reason,
          notes: input.notes,
          campaignId: input.campaignId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to disqualify lead');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['lead-score', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['lead-history', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['disqualified-leads'] });
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign-summary', variables.campaignId] });
      }
    },
  });
}

/**
 * Summarize lead performance (GPT-powered)
 */
export function useSummarizeLeadPerformance() {
  return useMutation({
    mutationFn: async (input: Omit<SummarizeLeadPerformanceInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/lead-scoring/contact/${input.contactId}/summarize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: input.campaignId,
          includeRecommendations: input.includeRecommendations,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to summarize lead performance');
      }
      return res.json() as Promise<{ success: boolean; summary: LeadPerformanceSummary }>;
    },
  });
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get lead score for a contact
 */
export function useLeadScore(contactId: string | null, campaignId?: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['lead-score', contactId, campaignId],
    queryFn: async () => {
      if (!contactId) return null;

      let url = `${API_BASE}/lead-scoring/contact/${contactId}/score`;
      if (campaignId) {
        url += `?campaignId=${campaignId}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch lead score');
      return res.json() as Promise<{ success: boolean; score: LeadScore }>;
    },
    enabled: !!contactId,
    refetchInterval,
  });
}

/**
 * Get lead score summary for a campaign
 */
export function useLeadScoreSummary(campaignId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-summary', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const res = await fetch(`${API_BASE}/lead-scoring/campaign/${campaignId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch lead score summary');
      return res.json() as Promise<{ success: boolean; summary: LeadScoreSummary }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get lead score trend for a contact
 */
export function useLeadScoreTrend(contactId: string | null) {
  return useQuery({
    queryKey: ['lead-trend', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const res = await fetch(`${API_BASE}/lead-scoring/contact/${contactId}/trend`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch lead trend');
      return res.json() as Promise<{ success: boolean; trend: LeadTrendResult }>;
    },
    enabled: !!contactId,
  });
}

/**
 * Get lead score history for a contact
 */
export function useLeadHistory(contactId: string | null) {
  return useQuery({
    queryKey: ['lead-history', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const res = await fetch(`${API_BASE}/lead-scoring/contact/${contactId}/history`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch lead history');
      return res.json() as Promise<{ success: boolean; history: LeadScoreHistory[]; total: number }>;
    },
    enabled: !!contactId,
  });
}

/**
 * Get top leads for a campaign
 */
export function useTopLeads(campaignId: string | null, limit?: number, refetchInterval?: number) {
  return useQuery({
    queryKey: ['top-leads', campaignId, limit],
    queryFn: async () => {
      if (!campaignId) return null;

      let url = `${API_BASE}/lead-scoring/campaign/${campaignId}/top-leads`;
      if (limit) {
        url += `?limit=${limit}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch top leads');
      return res.json() as Promise<{ success: boolean; leads: EnrichedLeadScore[]; total: number; avgScore: number }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

/**
 * Get all qualified leads
 */
export function useQualifiedLeads(campaignId?: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['qualified-leads', campaignId],
    queryFn: async () => {
      let url = `${API_BASE}/lead-scoring/qualified`;
      if (campaignId) {
        url += `?campaignId=${campaignId}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch qualified leads');
      return res.json() as Promise<{ success: boolean; leads: EnrichedLeadScore[]; total: number; avgScore: number; recentlyQualified: EnrichedLeadScore[] }>;
    },
    refetchInterval,
  });
}

/**
 * Get all disqualified leads
 */
export function useDisqualifiedLeads(campaignId?: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['disqualified-leads', campaignId],
    queryFn: async () => {
      let url = `${API_BASE}/lead-scoring/disqualified`;
      if (campaignId) {
        url += `?campaignId=${campaignId}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch disqualified leads');
      return res.json() as Promise<{ success: boolean; leads: EnrichedLeadScore[]; total: number; byReason: Record<DisqualificationReason, number> }>;
    },
    refetchInterval,
  });
}

/**
 * Get all lead scores for a campaign
 */
export function useCampaignScores(campaignId: string | null, limit?: number, refetchInterval?: number) {
  return useQuery({
    queryKey: ['campaign-scores', campaignId, limit],
    queryFn: async () => {
      if (!campaignId) return null;

      let url = `${API_BASE}/lead-scoring/campaign/${campaignId}/scores`;
      if (limit) {
        url += `?limit=${limit}`;
      }

      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign scores');
      return res.json() as Promise<{ success: boolean; leads: EnrichedLeadScore[]; total: number }>;
    },
    enabled: !!campaignId,
    refetchInterval,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get lead score color based on RAG status
 */
export function useLeadScoreColor() {
  return (score: number) => {
    if (score >= 70) return RAG_STATUS_CONFIGS.GREEN.color;
    if (score >= 40) return RAG_STATUS_CONFIGS.AMBER.color;
    return RAG_STATUS_CONFIGS.RED.color;
  };
}

/**
 * Get lead stage color
 */
export function useLeadStageColor() {
  return (stage: LeadStage) => {
    return LEAD_STAGE_CONFIGS[stage]?.color || '#6B7280';
  };
}

/**
 * Get RAG status color
 */
export function useRAGStatusColor() {
  return (status: RAGStatus) => {
    return RAG_STATUS_CONFIGS[status]?.color || '#6B7280';
  };
}

/**
 * Get lead stage icon
 */
export function useLeadStageIcon() {
  return (stage: LeadStage) => {
    return LEAD_STAGE_CONFIGS[stage]?.icon || 'circle';
  };
}

/**
 * Get RAG status icon
 */
export function useRAGStatusIcon() {
  return (status: RAGStatus) => {
    if (status === 'GREEN') return 'check-circle';
    if (status === 'AMBER') return 'alert-circle';
    return 'x-circle';
  };
}

/**
 * Get disqualification reason icon
 */
export function useDisqualificationReasonIcon() {
  return (reason: DisqualificationReason) => {
    return DISQUALIFICATION_REASON_CONFIGS[reason]?.icon || 'help-circle';
  };
}

/**
 * Get disqualification reason text
 */
export function useDisqualificationReasonText() {
  return (reason: DisqualificationReason) => {
    return DISQUALIFICATION_REASON_CONFIGS[reason]?.label || 'Unknown';
  };
}

/**
 * Get lead stage text
 */
export function useLeadStageText() {
  return (stage: LeadStage) => {
    return LEAD_STAGE_CONFIGS[stage]?.label || 'Unknown';
  };
}

/**
 * Get RAG status text
 */
export function useRAGStatusText() {
  return (status: RAGStatus) => {
    return RAG_STATUS_CONFIGS[status]?.label || 'Unknown';
  };
}

/**
 * Get lead score chart data for a contact
 */
export function useLeadScoreChart(contactId: string | null) {
  const { data } = useLeadScoreTrend(contactId);

  if (!data || !data.trend) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const trends = data.trend.trends.slice(-30); // Last 30 data points

  return {
    labels: trends.map((t) => new Date(t.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Lead Score',
        data: trends.map((t) => t.score),
        borderColor: 'rgba(59, 130, 246, 1)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
    ],
  };
}

/**
 * Get component scores breakdown chart
 */
export function useComponentScoresChart(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) {
    return {
      labels: [],
      datasets: [],
    };
  }

  return {
    labels: ['Engagement', 'Sentiment', 'Behavior', 'Fit'],
    datasets: [
      {
        label: 'Component Scores',
        data: [
          data.score.engagementScore,
          data.score.sentimentScore,
          data.score.behaviorScore,
          data.score.fitScore,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)', // blue-500
          'rgba(16, 185, 129, 0.5)', // green-500
          'rgba(245, 158, 11, 0.5)', // amber-500
          'rgba(139, 92, 246, 0.5)', // purple-500
        ],
      },
    ],
  };
}

/**
 * Get lead distribution chart for a campaign
 */
export function useLeadDistributionChart(campaignId: string | null) {
  const { data } = useLeadScoreSummary(campaignId);

  if (!data || !data.summary) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const summary = data.summary;

  return {
    labels: ['Qualified', 'In Progress', 'Unqualified', 'Disqualified'],
    datasets: [
      {
        label: 'Lead Distribution',
        data: [
          summary.qualifiedCount,
          summary.inProgressCount,
          summary.unqualifiedCount,
          summary.disqualifiedCount,
        ],
        backgroundColor: [
          LEAD_STAGE_CONFIGS.QUALIFIED.color,
          LEAD_STAGE_CONFIGS.IN_PROGRESS.color,
          LEAD_STAGE_CONFIGS.UNQUALIFIED.color,
          LEAD_STAGE_CONFIGS.DISQUALIFIED.color,
        ],
      },
    ],
  };
}

/**
 * Get RAG distribution chart for a campaign
 */
export function useRAGDistributionChart(campaignId: string | null) {
  const { data } = useLeadScoreSummary(campaignId);

  if (!data || !data.summary) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const summary = data.summary;

  return {
    labels: ['Green (≥70)', 'Amber (40-69)', 'Red (<40)'],
    datasets: [
      {
        label: 'RAG Distribution',
        data: [summary.greenCount, summary.amberCount, summary.redCount],
        backgroundColor: [
          RAG_STATUS_CONFIGS.GREEN.color,
          RAG_STATUS_CONFIGS.AMBER.color,
          RAG_STATUS_CONFIGS.RED.color,
        ],
      },
    ],
  };
}

/**
 * Check if a contact is qualified
 */
export function useIsQualified(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) return false;

  return data.score.stage === 'QUALIFIED';
}

/**
 * Check if a contact is disqualified
 */
export function useIsDisqualified(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) return false;

  return data.score.stage === 'DISQUALIFIED';
}

/**
 * Check if lead should be auto-qualified
 */
export function useShouldAutoQualify(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) return false;

  return (
    data.score.rawScore >= SCORE_THRESHOLDS.AUTO_QUALIFY &&
    data.score.stage === 'UNQUALIFIED'
  );
}

/**
 * Get lead score trend indicator
 */
export function useLeadScoreTrendIndicator(contactId: string | null) {
  const { data } = useLeadScoreTrend(contactId);

  if (!data || !data.trend) return null;

  const trend = data.trend.trendDirection;

  return {
    trend,
    color: trend === 'IMPROVING' ? '#10B981' : trend === 'DECLINING' ? '#EF4444' : '#6B7280',
    icon: trend === 'IMPROVING' ? 'trending-up' : trend === 'DECLINING' ? 'trending-down' : 'minus',
    label: trend === 'IMPROVING' ? 'Improving' : trend === 'DECLINING' ? 'Declining' : 'Stable',
  };
}

/**
 * Check if lead needs review (amber zone)
 */
export function useNeedsReview(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) return false;

  return (
    data.score.rawScore >= SCORE_THRESHOLDS.NEEDS_REVIEW &&
    data.score.rawScore < SCORE_THRESHOLDS.AUTO_QUALIFY &&
    data.score.stage === 'IN_PROGRESS'
  );
}

/**
 * Check if lead is at risk (low score)
 */
export function useIsAtRisk(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) return false;

  return data.score.rawScore < SCORE_THRESHOLDS.AUTO_DISQUALIFY;
}

/**
 * Get qualification rate for a campaign
 */
export function useQualificationRate(campaignId: string | null) {
  const { data } = useLeadScoreSummary(campaignId);

  if (!data || !data.summary) return 0;

  return data.summary.qualificationRate;
}

/**
 * Get disqualification rate for a campaign
 */
export function useDisqualificationRate(campaignId: string | null) {
  const { data } = useLeadScoreSummary(campaignId);

  if (!data || !data.summary) return 0;

  return data.summary.disqualificationRate;
}

/**
 * Get average lead score for a campaign
 */
export function useAverageLeadScore(campaignId: string | null) {
  const { data } = useLeadScoreSummary(campaignId);

  if (!data || !data.summary) return 0;

  return data.summary.avgScore;
}

/**
 * Get lead confidence indicator
 */
export function useLeadConfidenceIndicator(contactId: string | null, campaignId?: string) {
  const { data } = useLeadScore(contactId, campaignId);

  if (!data || !data.score) return null;

  const confidence = data.score.confidenceScore;

  return {
    confidence,
    color: confidence >= 0.8 ? '#10B981' : confidence >= 0.5 ? '#F59E0B' : '#EF4444',
    label: confidence >= 0.8 ? 'High Confidence' : confidence >= 0.5 ? 'Medium Confidence' : 'Low Confidence',
  };
}

/**
 * Real-time lead score (polling)
 */
export function useRealtimeLeadScore(contactId: string | null, campaignId?: string) {
  return useLeadScore(contactId, campaignId, 60000); // Poll every minute
}

/**
 * Real-time campaign summary (polling)
 */
export function useRealtimeCampaignSummary(campaignId: string | null) {
  return useLeadScoreSummary(campaignId, 60000); // Poll every minute
}

/**
 * Real-time top leads (polling)
 */
export function useRealtimeTopLeads(campaignId: string | null, limit?: number) {
  return useTopLeads(campaignId, limit, 60000); // Poll every minute
}

/**
 * Get recently qualified leads count
 */
export function useRecentlyQualifiedCount() {
  const { data } = useQualifiedLeads();

  if (!data || !data.recentlyQualified) return 0;

  return data.recentlyQualified.length;
}

/**
 * Get disqualification reasons breakdown
 */
export function useDisqualificationReasons(campaignId?: string) {
  const { data } = useDisqualifiedLeads(campaignId);

  if (!data || !data.byReason) return [];

  return Object.entries(data.byReason).map(([reason, count]) => ({
    reason: reason as DisqualificationReason,
    count,
    label: DISQUALIFICATION_REASON_CONFIGS[reason as DisqualificationReason]?.label || reason,
    icon: DISQUALIFICATION_REASON_CONFIGS[reason as DisqualificationReason]?.icon || 'help-circle',
  }));
}
