// =====================================================
// MEDIA OPPORTUNITIES HOOKS
// Sprint 68 Track B
// =====================================================
// React Query hooks for media opportunity scanning and management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MediaOpportunity {
  id: string;
  organizationId: string;
  newsItemId: string;
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  opportunityScore: number;
  relevanceScore: number;
  visibilityScore: number;
  freshnessScore: number;
  matchReasons: string[];
  keywords: string[];
  status: 'NEW' | 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanResult {
  scannedItems: number;
  opportunitiesFound: number;
  opportunities: MediaOpportunity[];
  scanDuration: number;
}

export interface OpportunityStats {
  total: number;
  new: number;
  reviewed: number;
  addedToCampaign: number;
  averageScore: number;
}

export interface ScanOpportunitiesInput {
  focusKeywords?: string[];
  minScore?: number;
}

export interface ListOpportunitiesFilters {
  status?: 'NEW' | 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED';
  minScore?: number;
  source?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * List media opportunities with filtering
 */
export function useMediaOpportunities(filters?: ListOpportunitiesFilters) {
  return useQuery<MediaOpportunity[]>({
    queryKey: ['media-opportunities', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.minScore !== undefined) params.append('minScore', filters.minScore.toString());
      if (filters?.source) params.append('source', filters.source);
      if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

      const response = await api.get(`/pr/opportunities?${params.toString()}`);
      return response.data;
    },
  });
}

/**
 * Get a single opportunity by ID
 */
export function useMediaOpportunity(opportunityId: string | null) {
  return useQuery<MediaOpportunity>({
    queryKey: ['media-opportunity', opportunityId],
    queryFn: async () => {
      const response = await api.get(`/pr/opportunities/${opportunityId}`);
      return response.data;
    },
    enabled: !!opportunityId,
  });
}

/**
 * Get opportunity statistics
 */
export function useOpportunityStats() {
  return useQuery<OpportunityStats>({
    queryKey: ['media-opportunity-stats'],
    queryFn: async () => {
      const response = await api.get('/pr/opportunities/stats');
      return response.data;
    },
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Trigger manual scan for opportunities
 */
export function useScanOpportunities() {
  const queryClient = useQueryClient();

  return useMutation<ScanResult, Error, ScanOpportunitiesInput>({
    mutationFn: async (input) => {
      const response = await api.post('/pr/opportunities/scan', input);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate opportunity queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['media-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['media-opportunity-stats'] });
    },
  });
}

/**
 * Update opportunity status
 */
export function useUpdateOpportunityStatus(opportunityId: string) {
  const queryClient = useQueryClient();

  return useMutation<MediaOpportunity, Error, { status: 'NEW' | 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED' }>({
    mutationFn: async (input) => {
      const response = await api.patch(`/pr/opportunities/${opportunityId}/status`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['media-opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['media-opportunity-stats'] });
    },
  });
}
