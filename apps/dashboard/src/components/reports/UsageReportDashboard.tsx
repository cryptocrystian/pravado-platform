// =====================================================
// USAGE REPORT DASHBOARD
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import React, { useState } from 'react';
import { useUsageReport, useUnbilledUsage, useAINotifications } from '@/hooks/useUsageReport';

interface UsageReportDashboardProps {
  organizationId: string;
}

export function UsageReportDashboard({ organizationId }: UsageReportDashboardProps) {
  const [dateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
  });

  const { data: report, isLoading } = useUsageReport(organizationId, dateRange.start, dateRange.end);
  const { data: unbilled } = useUnbilledUsage(organizationId);
  const { data: notifications } = useAINotifications(organizationId, 10);

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading usage report...</div>;
  }

  if (!report) {
    return <div className="p-6 text-red-500">No usage data available</div>;
  }

  const { summary, providerMix, modelMix, trends } = report;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Cost (30d)</div>
          <div className="text-3xl font-bold">${summary.totalCost.toFixed(2)}</div>
          <TrendBadge trend={trends.costTrend} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Requests</div>
          <div className="text-3xl font-bold">{summary.totalRequests.toLocaleString()}</div>
          <TrendBadge trend={trends.requestTrend} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Daily Cost</div>
          <div className="text-3xl font-bold">${summary.avgDailyCost.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Cache Hit Rate</div>
          <div className="text-3xl font-bold">{summary.cacheHitRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Provider Mix */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Provider Mix</h3>
        <div className="space-y-3">
          {Object.entries(providerMix).map(([provider, data]) => (
            <div key={provider}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{provider}</span>
                <span>${data.cost.toFixed(2)} ({data.percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Mix */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Model Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(modelMix).map(([model, data]) => (
            <div key={model} className="p-4 bg-gray-50 rounded">
              <div className="font-medium">{model}</div>
              <div className="text-sm text-gray-600">{data.requests} requests</div>
              <div className="text-lg font-bold">${data.cost.toFixed(4)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Unbilled Usage */}
      {unbilled && unbilled.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Unbilled Usage</h3>
          <div className="text-2xl font-bold text-yellow-900">
            ${unbilled.reduce((sum, u) => sum + u.totalCost, 0).toFixed(2)}
          </div>
          <div className="text-sm text-yellow-700 mt-1">
            {unbilled.length} unbilled day{unbilled.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Recent Events */}
      {notifications && notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent AI Ops Events</h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className="p-3 bg-gray-50 rounded flex items-start">
                <SeverityBadge severity={notif.severity} />
                <div className="ml-3 flex-1">
                  <div className="font-medium">{notif.title}</div>
                  <div className="text-sm text-gray-600">{notif.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const color = trend === 'increasing' ? 'text-red-600' : trend === 'decreasing' ? 'text-green-600' : 'text-gray-600';
  const icon = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';
  return <span className={`text-sm ${color}`}>{icon} {trend}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    debug: 'bg-gray-500',
  };

  return (
    <span className={`w-2 h-2 mt-2 rounded-full ${colors[severity] || colors.info}`} />
  );
}
