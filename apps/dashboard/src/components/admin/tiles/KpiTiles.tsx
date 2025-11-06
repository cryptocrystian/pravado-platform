/**
 * KPI Tiles Component
 *
 * Displays executive KPI metrics in a grid layout.
 * Shows MRR, ARR, ARPU, LTV:CAC ratio, NRR, and Trial→Paid conversion.
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

'use client';

import { AdminOverview } from '@/hooks/useAdminMetrics';

export interface KpiTilesProps {
  overview: AdminOverview | undefined;
  loading?: boolean;
}

export function KpiTiles({ overview, loading }: KpiTilesProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatRatio = (value: number): string => {
    return `${value.toFixed(2)}:1`;
  };

  const kpis = [
    {
      label: 'MRR',
      value: overview ? formatCurrency(overview.revenue_metrics.mrr) : '--',
      delta: overview?.revenue_metrics.mrr_growth_percent,
      subtitle: 'Monthly Recurring Revenue',
    },
    {
      label: 'ARR',
      value: overview ? formatCurrency(overview.revenue_metrics.arr) : '--',
      subtitle: 'Annual Run Rate',
    },
    {
      label: 'ARPU',
      value: overview ? formatCurrency(overview.revenue_metrics.arpu) : '--',
      subtitle: 'Average Revenue Per User',
    },
    {
      label: 'LTV:CAC',
      value: overview ? formatRatio(overview.customer_metrics.ltv_cac_ratio) : '--',
      subtitle: 'Lifetime Value : Customer Acquisition Cost',
      status:
        overview && overview.customer_metrics.ltv_cac_ratio >= 4
          ? 'good'
          : overview && overview.customer_metrics.ltv_cac_ratio >= 3
          ? 'ok'
          : 'poor',
    },
    {
      label: 'Active Customers',
      value: overview ? formatNumber(overview.customer_metrics.active_customers) : '--',
      delta: overview?.customer_metrics.new_customers,
      deltaLabel: 'new',
      subtitle: 'Current paying customers',
    },
    {
      label: 'Trial→Paid',
      value: overview ? formatPercent(overview.trial_metrics.conversion_rate_percent) : '--',
      subtitle: `${overview?.trial_metrics.active_trials || 0} active trials`,
      status:
        overview && overview.trial_metrics.conversion_rate_percent >= 30
          ? 'good'
          : overview && overview.trial_metrics.conversion_rate_percent >= 20
          ? 'ok'
          : 'poor',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpis.map((kpi, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</h3>
            {kpi.status && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  kpi.status === 'good'
                    ? 'bg-green-100 text-green-800'
                    : kpi.status === 'ok'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {kpi.status === 'good' ? '✓' : kpi.status === 'ok' ? '~' : '!'}
              </span>
            )}
          </div>

          <div className="mb-2">
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>

          <div className="flex items-center gap-2">
            {kpi.delta !== undefined && (
              <span
                className={`inline-flex items-center text-sm font-medium ${
                  kpi.delta > 0 ? 'text-green-600' : kpi.delta < 0 ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {kpi.delta > 0 ? '↑' : kpi.delta < 0 ? '↓' : '→'}{' '}
                {Math.abs(kpi.delta).toFixed(1)}
                {kpi.deltaLabel ? ` ${kpi.deltaLabel}` : '%'}
              </span>
            )}
            <p className="text-sm text-gray-500">{kpi.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default KpiTiles;
