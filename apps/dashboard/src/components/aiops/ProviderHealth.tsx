// ===================================================
// PROVIDER HEALTH DASHBOARD
// Sprint 70: LLM Insights & Explainability Layer
// ===================================================

import React from 'react';
import { useProviderHealth, useMetricsSummary } from '@/hooks/useAIOpsAnalytics';

export function ProviderHealth() {
  const { data: healthData, isLoading } = useProviderHealth(0.2);
  const { data: metricsSummary } = useMetricsSummary('24h');

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading provider health...</div>;
  }

  if (!healthData) {
    return <div className="p-6 text-red-500">Failed to load health data</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <div className="text-sm text-green-600 font-medium">Healthy</div>
          <div className="text-3xl font-bold text-green-900">{healthData.summary.healthy}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Warning</div>
          <div className="text-3xl font-bold text-yellow-900">{healthData.summary.warning}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
          <div className="text-sm text-red-600 font-medium">Critical</div>
          <div className="text-3xl font-bold text-red-900">{healthData.summary.critical}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Providers</div>
          <div className="text-3xl font-bold text-blue-900">{healthData.summary.total}</div>
        </div>
      </div>

      {/* Metrics Trends (if available) */}
      {metricsSummary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">24-Hour Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrendCard
              label="Cost Trend"
              trend={metricsSummary.trends.costTrend}
              value={`$${metricsSummary.totalCost.toFixed(2)}`}
            />
            <TrendCard
              label="Latency Trend"
              trend={metricsSummary.trends.latencyTrend}
              value={`${metricsSummary.avgLatency.toFixed(0)}ms`}
            />
            <TrendCard
              label="Error Trend"
              trend={metricsSummary.trends.errorTrend}
              value={`${(metricsSummary.avgErrorRate * 100).toFixed(1)}%`}
            />
          </div>
        </div>
      )}

      {/* Provider List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Provider Status Details</h3>
        </div>
        <div className="divide-y">
          {healthData.providers.map((provider) => (
            <div key={`${provider.provider}-${provider.model}`} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">
                    {provider.provider}:{provider.model}
                  </h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(provider.status)}`}>
                    {provider.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Latency Deviation</div>
                  <div className="text-lg font-mono">
                    {(provider.latencyDeviation * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Current Latency</div>
                  <div className="font-mono">{provider.currentLatency.toFixed(0)}ms</div>
                </div>
                <div>
                  <div className="text-gray-600">Baseline Latency</div>
                  <div className="font-mono">{provider.baselineLatency.toFixed(0)}ms</div>
                </div>
                <div>
                  <div className="text-gray-600">Current Error Rate</div>
                  <div className="font-mono">{(provider.currentErrorRate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Baseline Error Rate</div>
                  <div className="font-mono">{(provider.baselineErrorRate * 100).toFixed(2)}%</div>
                </div>
              </div>

              {provider.recommendations.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-900 mb-1">Recommendations:</div>
                  <ul className="text-sm text-blue-700 list-disc list-inside">
                    {provider.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendCard({ label, trend, value }: { label: string; trend: string; value: string }) {
  const trendColor = trend === 'increasing' ? 'text-red-600' : trend === 'decreasing' ? 'text-green-600' : 'text-gray-600';
  const trendIcon = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';

  return (
    <div className="p-4 bg-gray-50 rounded">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold">{value}</div>
        <div className={`text-2xl ${trendColor}`}>{trendIcon}</div>
      </div>
    </div>
  );
}
