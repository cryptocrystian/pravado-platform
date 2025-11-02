import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MatchContactsRequest,
  ContactMatchResult,
  CampaignContactMatch,
  CampaignReadinessResult,
  CampaignTargetingSummary,
  SuitableContactsRequest,
  TargetingSuggestion,
  BulkMatchResult,
  TargetingCriteria,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// CONTACT MATCHING HOOKS
// =====================================================

/**
 * Match contacts to campaign (dry run, no persistence)
 */
export function useMatchContacts() {
  return useMutation({
    mutationFn: async (request: MatchContactsRequest) => {
      const res = await fetch(`${API_BASE}/targeting/match`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to match contacts');
      }
      const data = await res.json();
      return data.matches as ContactMatchResult[];
    },
  });
}

/**
 * Create bulk matches for campaign (with persistence)
 */
export function useCreateBulkMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MatchContactsRequest) => {
      const res = await fetch(`${API_BASE}/targeting/bulk-match`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create bulk matches');
      }
      const data = await res.json();
      return data.result as BulkMatchResult;
    },
    onSuccess: (data) => {
      // Invalidate campaign matches
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'matches'],
      });
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'summary'],
      });
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'readiness'],
      });
    },
  });
}

/**
 * Get suitable contacts for topics
 */
export function useSuitableContacts() {
  return useMutation({
    mutationFn: async (request: SuitableContactsRequest) => {
      const res = await fetch(`${API_BASE}/targeting/suitable-contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get suitable contacts');
      }
      const data = await res.json();
      return data.contacts as ContactMatchResult[];
    },
  });
}

// =====================================================
// CAMPAIGN MATCH QUERIES
// =====================================================

/**
 * Get campaign matches
 */
export function useCampaignMatches(
  campaignId: string | null,
  filters?: {
    approved?: boolean;
    excluded?: boolean;
    minScore?: number;
  }
) {
  return useQuery<CampaignContactMatch[]>({
    queryKey: ['targeting', 'campaigns', campaignId, 'matches', filters],
    queryFn: async () => {
      if (!campaignId) return [];

      const params = new URLSearchParams();
      if (filters?.approved !== undefined) params.append('approved', String(filters.approved));
      if (filters?.excluded !== undefined) params.append('excluded', String(filters.excluded));
      if (filters?.minScore !== undefined) params.append('minScore', String(filters.minScore));

      const res = await fetch(
        `${API_BASE}/targeting/campaigns/${campaignId}/matches?${params}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch campaign matches');
      const data = await res.json();
      return data.matches;
    },
    enabled: !!campaignId,
  });
}

/**
 * Get approved campaign matches
 */
export function useApprovedMatches(campaignId: string | null) {
  return useCampaignMatches(campaignId, { approved: true, excluded: false });
}

/**
 * Get pending matches (not approved, not excluded)
 */
export function usePendingMatches(campaignId: string | null) {
  return useCampaignMatches(campaignId, { approved: false, excluded: false });
}

// =====================================================
// MATCH MANAGEMENT MUTATIONS
// =====================================================

/**
 * Approve a contact match
 */
export function useApproveMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      const res = await fetch(`${API_BASE}/targeting/matches/${matchId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve match');
      }
      const data = await res.json();
      return data.match as CampaignContactMatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'matches'],
      });
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'summary'],
      });
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'readiness'],
      });
    },
  });
}

/**
 * Exclude a contact match
 */
export function useExcludeMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, reason }: { matchId: string; reason: string }) => {
      const res = await fetch(`${API_BASE}/targeting/matches/${matchId}/exclude`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to exclude match');
      }
      const data = await res.json();
      return data.match as CampaignContactMatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'matches'],
      });
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'summary'],
      });
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', data.campaignId, 'readiness'],
      });
    },
  });
}

/**
 * Auto-approve matches
 */
export function useAutoApproveMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      options,
    }: {
      campaignId: string;
      options?: {
        minScore?: number;
        minTier?: 'A' | 'B' | 'C';
        maxCount?: number;
        dryRun?: boolean;
      };
    }) => {
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/auto-approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to auto-approve matches');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (!variables.options?.dryRun) {
        queryClient.invalidateQueries({
          queryKey: ['targeting', 'campaigns', variables.campaignId, 'matches'],
        });
        queryClient.invalidateQueries({
          queryKey: ['targeting', 'campaigns', variables.campaignId, 'summary'],
        });
        queryClient.invalidateQueries({
          queryKey: ['targeting', 'campaigns', variables.campaignId, 'readiness'],
        });
      }
    },
  });
}

// =====================================================
// TARGETING SUGGESTIONS
// =====================================================

/**
 * Generate targeting suggestions
 */
export function useGenerateSuggestions() {
  return useMutation({
    mutationFn: async ({
      campaignId,
      agentId,
      context,
    }: {
      campaignId: string;
      agentId: string;
      context?: any;
    }) => {
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/suggestions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, context }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate suggestions');
      }
      const data = await res.json();
      return data.suggestions as TargetingSuggestion[];
    },
  });
}

// =====================================================
// CAMPAIGN READINESS HOOKS
// =====================================================

/**
 * Get campaign readiness
 */
export function useCampaignReadiness(campaignId: string | null) {
  return useQuery<CampaignReadinessResult>({
    queryKey: ['targeting', 'campaigns', campaignId, 'readiness'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/readiness`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign readiness');
      const data = await res.json();
      return data.readiness;
    },
    enabled: !!campaignId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Get targeting summary
 */
export function useTargetingSummary(campaignId: string | null) {
  return useQuery<CampaignTargetingSummary>({
    queryKey: ['targeting', 'campaigns', campaignId, 'summary'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch targeting summary');
      const data = await res.json();
      return data.summary;
    },
    enabled: !!campaignId,
  });
}

/**
 * Get readiness recommendations
 */
export function useReadinessRecommendations(campaignId: string | null) {
  return useQuery<{
    critical: string[];
    important: string[];
    suggestions: string[];
  }>({
    queryKey: ['targeting', 'campaigns', campaignId, 'recommendations'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/recommendations`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch readiness recommendations');
      const data = await res.json();
      return data.recommendations;
    },
    enabled: !!campaignId,
  });
}

/**
 * Check if campaign can execute
 */
export function useCanExecuteCampaign(campaignId: string | null) {
  return useQuery<{
    canExecute: boolean;
    blockers: string[];
    warnings: string[];
  }>({
    queryKey: ['targeting', 'campaigns', campaignId, 'can-execute'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/can-execute`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to check campaign execution status');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

/**
 * Update targeting criteria
 */
export function useUpdateTargetingCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      criteria,
      triggerRematch,
    }: {
      campaignId: string;
      criteria: TargetingCriteria;
      triggerRematch?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/targeting/campaigns/${campaignId}/criteria`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria, triggerRematch }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update targeting criteria');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['targeting', 'campaigns', variables.campaignId],
      });
    },
  });
}

// =====================================================
// MONITORING HOOKS
// =====================================================

/**
 * Monitor campaigns readiness
 */
export function useMonitorCampaignsReadiness(statuses?: string[]) {
  return useQuery<CampaignReadinessResult[]>({
    queryKey: ['targeting', 'monitor', statuses],
    queryFn: async () => {
      const params = statuses?.length
        ? `?statuses=${statuses.join(',')}`
        : '';
      const res = await fetch(`${API_BASE}/targeting/monitor${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to monitor campaigns readiness');
      const data = await res.json();
      return data.campaigns;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get readiness status color
 */
export function useReadinessStatusColor(status: string | null) {
  const colorMap = {
    READY: 'green',
    NEEDS_REVIEW: 'yellow',
    INSUFFICIENT_CONTACTS: 'orange',
    NOT_READY: 'red',
  };

  return colorMap[status as keyof typeof colorMap] || 'gray';
}

/**
 * Get readiness score label
 */
export function useReadinessScoreLabel(score: number | null) {
  if (!score) return 'Unknown';
  if (score >= 0.8) return 'Excellent';
  if (score >= 0.6) return 'Good';
  if (score >= 0.4) return 'Fair';
  return 'Poor';
}

/**
 * Check if matches need approval
 */
export function useNeedsApproval(campaignId: string | null) {
  const { data: summary } = useTargetingSummary(campaignId);

  if (!summary) return null;

  return {
    needsApproval: summary.pendingApproval > 0,
    pendingCount: summary.pendingApproval,
    approvedCount: summary.approvedMatches,
    totalMatches: summary.totalMatches,
    approvalRate:
      summary.totalMatches > 0 ? summary.approvedMatches / summary.totalMatches : 0,
  };
}

/**
 * Get match quality distribution
 */
export function useMatchQualityDistribution(campaignId: string | null) {
  const { data: matches } = useCampaignMatches(campaignId);

  if (!matches) return null;

  const excellent = matches.filter((m) => m.matchScore >= 0.8).length;
  const good = matches.filter((m) => m.matchScore >= 0.6 && m.matchScore < 0.8).length;
  const fair = matches.filter((m) => m.matchScore >= 0.4 && m.matchScore < 0.6).length;
  const poor = matches.filter((m) => m.matchScore < 0.4).length;

  return {
    excellent,
    good,
    fair,
    poor,
    total: matches.length,
  };
}
