import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AutonomousCampaign,
  CreateAutonomousCampaignInput,
  UpdateAutonomousCampaignInput,
  CampaignTemplate,
  CampaignStatistics,
  CampaignStatus,
  CampaignType,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// CAMPAIGN QUERIES
// =====================================================

export function useAutonomousCampaigns(params?: {
  status?: CampaignStatus;
  campaignType?: CampaignType;
  agentCreated?: boolean;
}) {
  return useQuery<AutonomousCampaign[]>({
    queryKey: ['autonomous-campaigns', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.campaignType) queryParams.append('campaignType', params.campaignType);
      if (params?.agentCreated !== undefined) {
        queryParams.append('agentCreated', params.agentCreated.toString());
      }

      const res = await fetch(`${API_BASE}/autonomous/campaigns?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });
}

export function useAutonomousCampaign(campaignId: string | null) {
  return useQuery<AutonomousCampaign>({
    queryKey: ['autonomous-campaigns', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/autonomous/campaigns/${campaignId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

export function useCampaignStatus(campaignId: string | null) {
  return useQuery<{
    campaign: AutonomousCampaign;
    executionGraph: any;
    statistics: CampaignStatistics;
  }>({
    queryKey: ['autonomous-campaigns', campaignId, 'status'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/autonomous/campaigns/${campaignId}/status`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign status');
      return res.json();
    },
    enabled: !!campaignId,
    refetchInterval: (data) => {
      // Poll more frequently for running campaigns
      if (data?.campaign?.status === 'RUNNING') return 5000; // 5 seconds
      if (data?.campaign?.status === 'PLANNING') return 10000; // 10 seconds
      return false; // Don't poll for completed/failed campaigns
    },
  });
}

export function useCampaignAnalytics(campaignId: string | null) {
  return useQuery<{
    campaignId: string;
    successScore: number;
    metrics: {
      totalContactsTargeted: number;
      pitchesSent: number;
      responsesReceived: number;
      placementsAchieved: number;
      responseRate: number;
      placementRate: number;
    };
    quality: {
      qualityScore: number;
      learnings: any;
    };
  }>({
    queryKey: ['autonomous-campaigns', campaignId, 'analytics'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/autonomous/campaigns/${campaignId}/analytics`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign analytics');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

// =====================================================
// TEMPLATE QUERIES
// =====================================================

export function useCampaignTemplates() {
  return useQuery<CampaignTemplate[]>({
    queryKey: ['campaign-templates'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/autonomous/templates`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });
}

export function useCampaignTemplate(templateId: string | null) {
  return useQuery<CampaignTemplate>({
    queryKey: ['campaign-templates', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const res = await fetch(`${API_BASE}/autonomous/templates/${templateId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch template');
      return res.json();
    },
    enabled: !!templateId,
  });
}

// =====================================================
// CAMPAIGN MUTATIONS
// =====================================================

export function useCreateAutonomousCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAutonomousCampaignInput) => {
      const res = await fetch(`${API_BASE}/autonomous/campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autonomous-campaigns'] });
    },
  });
}

export function useUpdateAutonomousCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAutonomousCampaignInput;
    }) => {
      const res = await fetch(`${API_BASE}/autonomous/campaigns/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update campaign');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['autonomous-campaigns', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['autonomous-campaigns'] });
    },
  });
}

export function useRunAutonomousCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, dryRun = false }: { campaignId: string; dryRun?: boolean }) => {
      const res = await fetch(`${API_BASE}/autonomous/campaigns/${campaignId}/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run campaign');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['autonomous-campaigns', variables.campaignId],
      });
      queryClient.invalidateQueries({
        queryKey: ['autonomous-campaigns', variables.campaignId, 'status'],
      });
    },
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Hook to get real-time campaign progress
 */
export function useCampaignProgress(campaignId: string | null) {
  const { data: status } = useCampaignStatus(campaignId);

  if (!status) return null;

  return {
    status: status.campaign.status,
    progress: status.statistics?.progressPercentage || 0,
    completedTasks: status.statistics?.completedTasks || 0,
    totalTasks: status.statistics?.totalTasks || 0,
    failedTasks: status.statistics?.failedTasks || 0,
    isRunning: status.campaign.status === 'RUNNING',
    isComplete: status.campaign.status === 'COMPLETED',
    isFailed: status.campaign.status === 'FAILED',
  };
}

/**
 * Hook to determine if campaign is ready to run
 */
export function useCampaignReadiness(campaignId: string | null) {
  const { data: campaign } = useAutonomousCampaign(campaignId);

  if (!campaign) return { ready: false, reasons: [] };

  const reasons: string[] = [];

  if (!campaign.planningOutput) {
    reasons.push('Campaign planning is incomplete');
  }

  if (campaign.requiresApproval && !campaign.approvedAt) {
    reasons.push('Campaign requires approval before execution');
  }

  if (campaign.status === 'RUNNING') {
    reasons.push('Campaign is already running');
  }

  if (campaign.status === 'COMPLETED') {
    reasons.push('Campaign has already been completed');
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

/**
 * Hook to get campaign performance metrics
 */
export function useCampaignPerformance(campaignId: string | null) {
  const { data: analytics } = useCampaignAnalytics(campaignId);

  if (!analytics) return null;

  return {
    responseRate: analytics.metrics.responseRate,
    placementRate: analytics.metrics.placementRate,
    successScore: analytics.successScore,
    qualityScore: analytics.quality.qualityScore,
    pitchesSent: analytics.metrics.pitchesSent,
    responsesReceived: analytics.metrics.responsesReceived,
    placementsAchieved: analytics.metrics.placementsAchieved,
  };
}
