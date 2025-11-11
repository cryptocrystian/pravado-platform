// =====================================================
// USE OPS HISTORY HOOK
// Sprint 83: Post-Launch Reliability & SLO Automation
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SLOMetric {
  date: string;
  uptime_percent: number;
  avg_latency_ms: number;
  error_rate_percent: number;
  llm_failure_rate_percent: number;
  status: 'healthy' | 'degraded' | 'critical';
}

export interface CostTrend {
  date: string;
  total_cost_usd: number;
  total_requests: number;
}

export interface CostAnomaly {
  organization_id: string;
  date: string;
  current_cost_usd: number;
  baseline_cost_usd: number;
  percent_increase: number;
  severity: 'warning' | 'critical';
  detected_at: string;
}

export interface OpsHistory {
  timestamp: string;
  period_days: number;
  start_date: string;
  slo_metrics: SLOMetric[];
  cost_trends: CostTrend[];
  anomalies: CostAnomaly[];
  summary: {
    total_slo_records: number;
    total_cost_days: number;
    total_anomalies: number;
    avg_uptime: string;
    avg_latency_ms: string;
  };
}

/**
 * Fetch ops history from admin endpoint
 */
export function useOpsHistory(days: number = 30, refreshInterval?: number) {
  return useQuery<OpsHistory>({
    queryKey: ['ops-history', days],
    queryFn: async () => {
      return api.get<OpsHistory>(`/api/v1/admin/ops-history?days=${days}`);
    },
    refetchInterval: refreshInterval,
    staleTime: 300000, // Consider data fresh for 5 minutes
  });
}

/**
 * Fetch ops history summary
 */
export function useOpsHistorySummary(days: number = 30) {
  return useQuery({
    queryKey: ['ops-history-summary', days],
    queryFn: async () => {
      return api.get(`/api/v1/admin/ops-history/summary?days=${days}`);
    },
    staleTime: 300000,
  });
}
