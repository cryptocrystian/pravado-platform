// =====================================================
// USE OPS METRICS HOOK
// Sprint 82: Production Launch Hardening + Ops Dashboard
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface OpsMetrics {
  timestamp: string;
  system: {
    uptime_seconds: number;
    uptime_human: string;
    status: string;
  };
  llm_router: {
    total_requests: number;
    total_failures: number;
    failure_rate_percent: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
  };
  ledger: {
    total_records: number;
    total_cost_usd: number;
    last_7_days_cost_usd: number;
  };
  top_organizations: Array<{
    org_id: string;
    org_name: string | null;
    total_requests: number;
    total_cost_usd: number;
    last_request_at: string | null;
  }>;
  alerts: Array<any>;
}

/**
 * Fetch ops metrics from admin endpoint
 */
export function useOpsMetrics(refreshInterval: number = 60000) {
  return useQuery<OpsMetrics>({
    queryKey: ['ops-metrics'],
    queryFn: async () => {
      return api.get<OpsMetrics>('/api/v1/admin/ops-metrics');
    },
    refetchInterval: refreshInterval,
    staleTime: 30000, // Consider data fresh for 30s
  });
}
