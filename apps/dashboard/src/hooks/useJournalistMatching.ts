// =====================================================
// JOURNALIST MATCHING HOOKS
// Sprint 68 Track D
// =====================================================
// React Query hooks for journalist/contact matching and recommendations

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface JournalistMatch {
  contactId: string;
  contactName: string;
  contactOutlet: string;
  contactTier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNTIERED';
  matchScore: number;
  matchReasons: string[];
}

export interface JournalistMatchingFilters {
  minScore?: number;
  tier?: string;
  outlet?: string;
  limit?: number;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get recommended journalist targets for a press release
 */
export function useJournalistMatching(
  pressReleaseId: string | null,
  filters?: JournalistMatchingFilters
) {
  return useQuery<JournalistMatch[]>({
    queryKey: ['journalist-matches', pressReleaseId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.minScore !== undefined) params.append('minScore', filters.minScore.toString());
      if (filters?.limit !== undefined) params.append('maxResults', filters.limit.toString());

      const response = await api.get(
        `/pr/releases/${pressReleaseId}/targets?${params.toString()}`
      );

      let matches: JournalistMatch[] = response.data;

      // Apply client-side filters
      if (filters?.tier) {
        matches = matches.filter((m) => m.contactTier === filters.tier);
      }

      if (filters?.outlet) {
        matches = matches.filter((m) =>
          m.contactOutlet.toLowerCase().includes(filters.outlet!.toLowerCase())
        );
      }

      return matches;
    },
    enabled: !!pressReleaseId,
  });
}

/**
 * Get journalist matches for multiple press releases (bulk)
 */
export function useBulkJournalistMatching(pressReleaseIds: string[]) {
  return useQuery<Record<string, JournalistMatch[]>>({
    queryKey: ['journalist-matches-bulk', pressReleaseIds],
    queryFn: async () => {
      const results: Record<string, JournalistMatch[]> = {};

      // Fetch matches for each press release
      await Promise.all(
        pressReleaseIds.map(async (id) => {
          try {
            const response = await api.get(`/pr/releases/${id}/targets`);
            results[id] = response.data;
          } catch (error) {
            console.error(`Failed to fetch matches for release ${id}:`, error);
            results[id] = [];
          }
        })
      );

      return results;
    },
    enabled: pressReleaseIds.length > 0,
  });
}
