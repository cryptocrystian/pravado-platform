// =====================================================
// DEVELOPER DASHBOARD - PRODUCTION
// Sprint 40 Phase 3.3.2: API integrations and technical tools
// =====================================================

import { useState } from 'react';
import {
  RoleDashboardLayout,
  DashboardGrid,
  DashboardSection,
  DashboardWidget,
} from '@/components/layouts/RoleDashboardLayout';
import {
  StatCard,
  ChartWidget,
  SimpleTrendChart,
  SimpleBarChart,
  ActivityFeed,
  QuickActions,
  DataTable,
} from '@/components/widgets';
import { Key, Code, Plug, Book } from 'lucide-react';

export function DeveloperDashboard() {
  const [loading] = useState(false);

  const apiStats = {
    callsToday: { value: '45.2K', trend: { value: 8, direction: 'up' as const } },
    activeIntegrations: { value: 12, trend: { value: 2, direction: 'up' as const } },
    errorRate: { value: '0.02%', trend: { value: 0.01, direction: 'down' as const } },
    avgResponseTime: { value: '45ms', trend: { value: 5, direction: 'down' as const } },
  };

  const apiUsageTrend = [
    { label: 'Mon', value: 38000 },
    { label: 'Tue', value: 42000 },
    { label: 'Wed', value: 39000 },
    { label: 'Thu', value: 44000 },
    { label: 'Fri', value: 45200 },
  ];

  const endpointUsage = [
    { label: '/api/campaigns', value: 15200 },
    { label: '/api/content', value: 12800 },
    { label: '/api/agents', value: 10400 },
    { label: '/api/analytics', value: 6800 },
  ];

  const recentErrors = [
    {
      id: '1',
      title: 'Rate limit exceeded',
      description: 'Client exceeded API rate limit on /api/campaigns',
      timestamp: '10 minutes ago',
      type: 'error' as const,
    },
    {
      id: '2',
      title: 'Webhook delivery failed',
      description: 'Failed to deliver webhook to https://client.com/webhook',
      timestamp: '1 hour ago',
      type: 'warning' as const,
    },
  ];

  const quickActions = [
    {
      id: 'api-keys',
      label: 'API Keys',
      description: 'Manage API credentials',
      icon: <Key />,
      onClick: () => console.log('API Keys'),
    },
    {
      id: 'docs',
      label: 'API Documentation',
      description: 'View technical docs',
      icon: <Book />,
      onClick: () => console.log('Docs'),
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'Configure integrations',
      icon: <Plug />,
      onClick: () => console.log('Integrations'),
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      description: 'Manage webhook endpoints',
      icon: <Code />,
      onClick: () => console.log('Webhooks'),
    },
  ];

  const integrations = [
    { id: '1', name: 'Slack', status: 'Connected', lastSync: '5 min ago' },
    { id: '2', name: 'Salesforce', status: 'Connected', lastSync: '1 hour ago' },
    { id: '3', name: 'HubSpot', status: 'Error', lastSync: '3 hours ago' },
  ];

  return (
    <RoleDashboardLayout
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          View API Docs
        </button>
      }
      loading={loading}
    >
      {/* Key Metrics */}
      <DashboardSection title="API Performance">
        <DashboardGrid columns={4}>
          <StatCard
            label="API Calls (Today)"
            value={apiStats.callsToday.value}
            icon="🔌"
            trend={apiStats.callsToday.trend}
          />
          <StatCard
            label="Active Integrations"
            value={apiStats.activeIntegrations.value}
            icon="🔗"
            trend={apiStats.activeIntegrations.trend}
          />
          <StatCard
            label="Error Rate"
            value={apiStats.errorRate.value}
            icon="⚠️"
            trend={apiStats.errorRate.trend}
          />
          <StatCard
            label="Avg Response Time"
            value={apiStats.avgResponseTime.value}
            icon="⚡"
            trend={apiStats.avgResponseTime.trend}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Charts */}
      <DashboardSection title="API Analytics" className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWidget title="API Usage Trend" description="Last 5 days">
            <SimpleTrendChart data={apiUsageTrend} />
          </ChartWidget>

          <ChartWidget title="Top Endpoints" description="By request count">
            <SimpleBarChart data={endpointUsage} />
          </ChartWidget>
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <DashboardSection title="Developer Tools" className="mt-8">
        <QuickActions actions={quickActions} columns={4} />
      </DashboardSection>

      {/* Recent Errors & Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <DashboardWidget title="Recent Errors" icon="🐛">
          <ActivityFeed activities={recentErrors} />
        </DashboardWidget>

        <DashboardWidget title="Integrations Status" icon="🔗">
          <DataTable
            columns={[
              { key: 'name', label: 'Integration' },
              {
                key: 'status',
                label: 'Status',
                render: (item) => (
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'Connected'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.status}
                  </span>
                ),
              },
              { key: 'lastSync', label: 'Last Sync' },
            ]}
            data={integrations}
            onRowClick={(integration) => console.log('View:', integration)}
          />
        </DashboardWidget>
      </div>
    </RoleDashboardLayout>
  );
}
