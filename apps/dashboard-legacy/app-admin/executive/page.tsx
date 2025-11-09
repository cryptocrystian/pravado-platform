/**
 * Executive Dashboard Page
 *
 * Founder-level KPI view with MRR/ARR/ARPU/LTV/CAC/NRR metrics,
 * revenue trends, operational health, and trial-to-paid funnel.
 *
 * RBAC: Requires platform admin (is_platform_admin = true)
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

'use client';

import { useState } from 'react';
import {
  useAdminOverview,
  useRevenueMetrics,
  useFunnelMetrics,
  TimePeriod,
} from '@/hooks/useAdminMetrics';
import { KpiTiles } from '@/components/admin/tiles/KpiTiles';
import { RevenueTrends } from '@/components/admin/charts/RevenueTrends';
import { OpsHealth } from '@/components/admin/charts/OpsHealth';
import { TrialToPaid } from '@/components/admin/funnels/TrialToPaid';

export default function ExecutiveDashboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useAdminOverview(period);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueMetrics(period);
  const { data: funnelData, isLoading: funnelLoading } = useFunnelMetrics(period);

  // Handle RBAC error (403 Forbidden)
  if (overviewError && overviewError.message.includes('Platform admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Insufficient Privileges</h2>
          <p className="text-gray-600 mb-6">
            This page requires platform admin access. Please contact your administrator if you need access to the
            executive dashboard.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Founder KPI view - Business metrics and operational health
              </p>
            </div>

            {/* Time period selector */}
            <div className="mt-4 sm:mt-0">
              <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white">
                {(['7d', '30d', '90d'] as TimePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      period === p
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* KPI Tiles */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
            <KpiTiles overview={overview} loading={overviewLoading} />
          </section>

          {/* Revenue Trends & Ops Health */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueTrends trends={revenueData?.trends} loading={revenueLoading} />
              <OpsHealth metrics={overview?.ops_metrics} loading={overviewLoading} />
            </div>
          </section>

          {/* Trial to Paid Funnel */}
          <section>
            <TrialToPaid
              funnel={funnelData?.funnel}
              totalConversions={funnelData?.total_conversions}
              loading={funnelLoading}
            />
          </section>

          {/* Additional Metrics Grid */}
          {overview && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue by Tier */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Tier</h3>
                  <div className="space-y-3">
                    {Object.entries(overview.revenue_metrics.revenue_by_tier).map(([tier, revenue]) => {
                      const totalRevenue = Object.values(overview.revenue_metrics.revenue_by_tier).reduce(
                        (a, b) => a + b,
                        0
                      );
                      const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

                      return (
                        <div key={tier}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">{tier}</span>
                            <span className="text-sm font-semibold text-gray-900">
                              ${revenue.toLocaleString()} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customers by Tier */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers by Tier</h3>
                  <div className="space-y-3">
                    {Object.entries(overview.customer_metrics.customers_by_tier).map(([tier, count]) => {
                      const totalCustomers = Object.values(overview.customer_metrics.customers_by_tier).reduce(
                        (a, b) => a + b,
                        0
                      );
                      const percentage = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;

                      return (
                        <div key={tier}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">{tier}</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Timestamp */}
          {overview && (
            <div className="text-center text-sm text-gray-500">
              Last updated: {new Date(overview.as_of).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
