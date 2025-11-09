/**
 * Ops Health Chart Component
 *
 * Displays operational health metrics: provider status, API latency,
 * error rates, cache hit rates, and uptime.
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

'use client';

import { OpsMetrics } from '@/hooks/useAdminMetrics';

export interface OpsHealthProps {
  metrics: OpsMetrics | undefined;
  loading?: boolean;
}

type ProviderStatus = 'healthy' | 'degraded' | 'down';

export function OpsHealth({ metrics, loading }: OpsHealthProps) {
  const getStatusColor = (status: ProviderStatus): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: ProviderStatus): string => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'down':
        return '✕';
      default:
        return '?';
    }
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatLatency = (ms: number): string => {
    return `${Math.round(ms)}ms`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading || !metrics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Health</h3>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const providers = [
    { name: 'Supabase', key: 'supabase', status: metrics.provider_health.supabase },
    { name: 'Redis', key: 'redis', status: metrics.provider_health.redis },
    { name: 'OpenAI', key: 'openai', status: metrics.provider_health.openai },
    { name: 'Anthropic', key: 'anthropic', status: metrics.provider_health.anthropic },
  ];

  const healthyCount = providers.filter((p) => p.status === 'healthy').length;
  const overallHealth = (healthyCount / providers.length) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Operational Health</h3>
          <p className="text-sm text-gray-500 mt-1">Infrastructure and provider status</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{formatPercent(overallHealth)}</p>
          <p className="text-sm text-gray-500">System Health</p>
        </div>
      </div>

      {/* Provider Status */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Provider Status</h4>
        <div className="grid grid-cols-2 gap-3">
          {providers.map((provider) => (
            <div
              key={provider.key}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border ${getStatusColor(
                provider.status
              )}`}
            >
              <span className="font-medium">{provider.name}</span>
              <span className="text-lg">{getStatusIcon(provider.status)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">API Latency</p>
            <p className="text-2xl font-bold text-gray-900">{formatLatency(metrics.avg_api_latency_ms)}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  metrics.avg_api_latency_ms < 200
                    ? 'bg-green-500'
                    : metrics.avg_api_latency_ms < 500
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (metrics.avg_api_latency_ms / 1000) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Error Rate</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercent(metrics.error_rate_percent)}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  metrics.error_rate_percent < 1
                    ? 'bg-green-500'
                    : metrics.error_rate_percent < 5
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, metrics.error_rate_percent * 10)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cache Hit Rate</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercent(metrics.cache_hit_rate_percent)}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  metrics.cache_hit_rate_percent >= 90
                    ? 'bg-green-500'
                    : metrics.cache_hit_rate_percent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${metrics.cache_hit_rate_percent}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Uptime</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercent(metrics.uptime_percent)}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  metrics.uptime_percent >= 99.9
                    ? 'bg-green-500'
                    : metrics.uptime_percent >= 99
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${metrics.uptime_percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage Metrics */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">AI Operations</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Requests</p>
              <p className="text-lg font-semibold text-gray-900">
                {metrics.ai_metrics.total_requests.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.ai_metrics.total_cost_usd)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Cost/Request</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(metrics.ai_metrics.avg_cost_per_request)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpsHealth;
