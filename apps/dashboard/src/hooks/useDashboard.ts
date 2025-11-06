// =====================================================
// DASHBOARD HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  DashboardMetrics,
  DashboardFilters,
  ReportSnapshot,
  CreateReportSnapshotInput,
  StrategyScorecard,
  ScorecardCategory,
} from '@pravado/types';

// =====================================================
// STRATEGY METRICS
// =====================================================

export function useStrategyMetrics(filters?: DashboardFilters) {
  const defaultFilters: DashboardFilters = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    ...filters,
  };

  return useQuery<DashboardMetrics>({
    queryKey: ['strategy-metrics', defaultFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', defaultFilters.startDate);
      params.append('endDate', defaultFilters.endDate);
      if (defaultFilters.campaigns) params.append('campaigns', defaultFilters.campaigns.join(','));
      if (defaultFilters.contentFormats) params.append('contentFormats', defaultFilters.contentFormats.join(','));
      if (defaultFilters.tiers) params.append('tiers', defaultFilters.tiers.join(','));

      const response = await api.get(`/dashboard/strategy-metrics?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

// =====================================================
// REPORT SNAPSHOTS
// =====================================================

export function useGenerateReportSnapshot() {
  const queryClient = useQueryClient();
  return useMutation<ReportSnapshot, Error, CreateReportSnapshotInput>({
    mutationFn: async (input) => {
      const response = await api.post('/dashboard/report-snapshots', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-snapshots'] });
    },
  });
}

export function useReportSnapshots() {
  return useQuery<ReportSnapshot[]>({
    queryKey: ['report-snapshots'],
    queryFn: async () => {
      const response = await api.get('/dashboard/report-snapshots');
      return response.data;
    },
  });
}

// =====================================================
// SCORECARDS
// =====================================================

export function useCreateScorecard() {
  const queryClient = useQueryClient();
  return useMutation<
    StrategyScorecard,
    Error,
    {
      periodStart: Date;
      periodEnd: Date;
      category: ScorecardCategory;
    }
  >({
    mutationFn: async (input) => {
      const response = await api.post('/dashboard/scorecards', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-metrics'] });
    },
  });
}
