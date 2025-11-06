// =====================================================
// USAGE REPORT HOOKS
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UsageReport {
  organizationId: string;
  period: { startDate: Date; endDate: Date };
  summary: {
    totalCost: number;
    totalRequests: number;
    avgDailyCost: number;
    cacheHitRate: number;
  };
  dailyBreakdown: Array<{
    date: string;
    totalCostUsd: number;
    totalRequests: number;
    planTier: string;
  }>;
  providerMix: Record<string, { requests: number; cost: number; percentage: number }>;
  modelMix: Record<string, { requests: number; cost: number; percentage: number }>;
  trends: {
    costTrend: 'increasing' | 'decreasing' | 'stable';
    requestTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export function useUsageReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  return useQuery({
    queryKey: ['usage-report', organizationId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await api.get(`/usage-report/${organizationId}?${params.toString()}`);
      return response.data.data as UsageReport;
    },
    enabled,
    staleTime: 300000, // 5 minutes
  });
}

export function useUnbilledUsage(organizationId: string) {
  return useQuery({
    queryKey: ['unbilled-usage', organizationId],
    queryFn: async () => {
      const response = await api.get(`/usage-report/${organizationId}/unbilled`);
      return response.data.data as Array<{
        date: string;
        totalCost: number;
        totalRequests: number;
        planTier: string;
      }>;
    },
    staleTime: 60000, // 1 minute
  });
}

export function useAINotifications(organizationId: string, limit = 50) {
  return useQuery({
    queryKey: ['ai-notifications', organizationId, limit],
    queryFn: async () => {
      const response = await api.get(`/notifications/${organizationId}?limit=${limit}`);
      return response.data.data as Array<{
        id: string;
        eventType: string;
        severity: string;
        title: string;
        message: string;
        createdAt: Date;
      }>;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}
