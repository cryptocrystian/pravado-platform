/**
 * Admin Metrics Hooks
 *
 * React Query hooks for executive admin console KPIs.
 * Requires platform admin RBAC (is_platform_admin = true).
 *
 * Endpoints:
 * - GET /api/admin-metrics/overview - Comprehensive KPI overview
 * - GET /api/admin-metrics/revenue - Revenue-specific metrics
 * - GET /api/admin-metrics/funnels - Trial-to-paid conversion funnel
 * - GET /api/admin-metrics/ops - Operational health metrics
 * - GET /api/admin-metrics/calculations - Calculation transparency
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ============================================================================
// Types
// ============================================================================

export type TimePeriod = '7d' | '30d' | '90d';

export interface RevenueMetrics {
  mrr: number;
  mrr_growth_percent: number;
  arr: number;
  arpu: number;
  total_revenue: number;
  revenue_by_tier: {
    starter: number;
    pro: number;
    premium: number;
    enterprise: number;
  };
}

export interface CustomerMetrics {
  active_customers: number;
  new_customers: number;
  churned_customers: number;
  churn_rate_percent: number;
  ltv: number;
  cac: number;
  ltv_cac_ratio: number;
  customers_by_tier: {
    starter: number;
    pro: number;
    premium: number;
    enterprise: number;
  };
}

export interface TrialMetrics {
  active_trials: number;
  trial_starts: number;
  conversions: number;
  conversion_rate_percent: number;
  avg_days_to_convert: number;
}

export interface OpsMetrics {
  avg_api_latency_ms: number;
  error_rate_percent: number;
  cache_hit_rate_percent: number;
  uptime_percent: number;
  provider_health: {
    supabase: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
    openai: 'healthy' | 'degraded' | 'down';
    anthropic: 'healthy' | 'degraded' | 'down';
  };
  ai_metrics: {
    total_requests: number;
    total_cost_usd: number;
    avg_cost_per_request: number;
  };
}

export interface AdminOverview {
  revenue_metrics: RevenueMetrics;
  customer_metrics: CustomerMetrics;
  trial_metrics: TrialMetrics;
  ops_metrics: OpsMetrics;
  as_of: string;
}

export interface RevenueTrend {
  date: string;
  mrr: number;
  net_new_mrr: number;
  churned_mrr: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversion_rate_percent: number;
}

export interface Calculation {
  metric: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get comprehensive admin overview (MRR/ARR/ARPU/LTV/CAC/NRR + ops health)
 *
 * @param period - Time period (7d | 30d | 90d)
 * @returns Admin overview with revenue, customer, trial, and ops metrics
 */
export function useAdminOverview(period: TimePeriod = '30d') {
  return useQuery<AdminOverview>({
    queryKey: ['admin-metrics', 'overview', period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin-metrics/overview?period=${period}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Platform admin access required');
        }
        throw new Error('Failed to fetch admin overview');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get revenue-specific metrics and historical trends
 *
 * @param period - Time period (7d | 30d | 90d)
 * @returns Revenue metrics with historical MRR trends
 */
export function useRevenueMetrics(period: TimePeriod = '30d') {
  return useQuery<{ metrics: RevenueMetrics; trends: RevenueTrend[] }>({
    queryKey: ['admin-metrics', 'revenue', period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin-metrics/revenue?period=${period}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Platform admin access required');
        }
        throw new Error('Failed to fetch revenue metrics');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 60000,
  });
}

/**
 * Get trial-to-paid conversion funnel
 *
 * @param period - Time period (7d | 30d | 90d)
 * @returns Funnel steps with conversion rates
 */
export function useFunnelMetrics(period: TimePeriod = '30d') {
  return useQuery<{ funnel: FunnelStep[]; total_conversions: number }>({
    queryKey: ['admin-metrics', 'funnels', period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin-metrics/funnels?period=${period}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Platform admin access required');
        }
        throw new Error('Failed to fetch funnel metrics');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 60000,
  });
}

/**
 * Get operational health metrics
 *
 * @param period - Time period (7d | 30d | 90d)
 * @returns Ops metrics (latency, errors, provider health)
 */
export function useOpsMetrics(period: TimePeriod = '30d') {
  return useQuery<OpsMetrics>({
    queryKey: ['admin-metrics', 'ops', period],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin-metrics/ops?period=${period}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Platform admin access required');
        }
        throw new Error('Failed to fetch ops metrics');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 30000, // 30 seconds for ops metrics
    refetchInterval: 30000,
  });
}

/**
 * Get calculation transparency (how LTV, CAC, NRR are calculated)
 *
 * @returns Calculation details with formulas and inputs
 */
export function useCalculations() {
  return useQuery<Calculation[]>({
    queryKey: ['admin-metrics', 'calculations'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin-metrics/calculations`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Platform admin access required');
        }
        throw new Error('Failed to fetch calculations');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 300000, // 5 minutes (calculations don't change often)
  });
}
