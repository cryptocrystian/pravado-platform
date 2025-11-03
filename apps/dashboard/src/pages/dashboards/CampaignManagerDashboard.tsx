// =====================================================
// CAMPAIGN MANAGER DASHBOARD - PRODUCTION
// Sprint 40 Phase 3.3.2: Campaign planning, execution, and tracking
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
  ProgressCard,
} from '@/components/widgets';
import { Plus, TrendingUp, Users, Calendar } from 'lucide-react';

export function CampaignManagerDashboard() {
  const [loading] = useState(false);

  const campaignStats = {
    active: { value: 24, trend: { value: 8, direction: 'up' as const } },
    totalReach: { value: '1.2M', trend: { value: 18, direction: 'up' as const, label: 'this month' } },
    engagement: { value: '4.8%', trend: { value: 0.5, direction: 'up' as const } },
    conversions: { value: 3420, trend: { value: 12, direction: 'up' as const } },
  };

  const reachTrend = [
    { label: 'Week 1', value: 245000 },
    { label: 'Week 2', value: 320000 },
    { label: 'Week 3', value: 380000 },
    { label: 'Week 4', value: 455000 },
  ];

  const campaignsByStatus = [
    { label: 'Active', value: 24, color: 'bg-green-500' },
    { label: 'Planned', value: 12, color: 'bg-blue-500' },
    { label: 'Completed', value: 18, color: 'bg-gray-500' },
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'New campaign launched',
      description: 'Q2 Product Launch campaign is now live',
      timestamp: '2 hours ago',
      type: 'success' as const,
    },
    {
      id: '2',
      title: 'Campaign milestone reached',
      description: 'Holiday Campaign hit 100K reach target',
      timestamp: '5 hours ago',
      type: 'success' as const,
    },
    {
      id: '3',
      title: 'Content approved',
      description: '5 press releases approved for distribution',
      timestamp: '1 day ago',
      type: 'info' as const,
    },
  ];

  const quickActions = [
    {
      id: 'new-campaign',
      label: 'New Campaign',
      description: 'Create a new campaign',
      icon: <Plus />,
      variant: 'primary' as const,
      onClick: () => console.log('New campaign'),
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      description: 'Campaign performance',
      icon: <TrendingUp />,
      onClick: () => console.log('Analytics'),
    },
    {
      id: 'manage-contacts',
      label: 'Manage Contacts',
      description: 'Media and influencer database',
      icon: <Users />,
      onClick: () => console.log('Contacts'),
    },
    {
      id: 'schedule',
      label: 'Content Calendar',
      description: 'View upcoming content',
      icon: <Calendar />,
      onClick: () => console.log('Calendar'),
    },
  ];

  const activeCampaigns = [
    { id: '1', name: 'Q2 Product Launch', reach: '450K', engagement: '5.2%', status: 'Active' },
    { id: '2', name: 'Holiday Campaign', reach: '380K', engagement: '4.8%', status: 'Active' },
    { id: '3', name: 'Brand Awareness', reach: '290K', engagement: '4.1%', status: 'Active' },
  ];

  return (
    <RoleDashboardLayout
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          New Campaign
        </button>
      }
      loading={loading}
    >
      {/* Key Metrics */}
      <DashboardSection title="Campaign Overview">
        <DashboardGrid columns={4}>
          <StatCard
            label="Active Campaigns"
            value={campaignStats.active.value}
            icon="📊"
            trend={campaignStats.active.trend}
          />
          <StatCard
            label="Total Reach (Month)"
            value={campaignStats.totalReach.value}
            icon="👁️"
            trend={campaignStats.totalReach.trend}
          />
          <StatCard
            label="Engagement Rate"
            value={campaignStats.engagement.value}
            icon="❤️"
            trend={campaignStats.engagement.trend}
          />
          <StatCard
            label="Conversions"
            value={campaignStats.conversions.value.toLocaleString()}
            icon="✨"
            trend={campaignStats.conversions.trend}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Charts */}
      <DashboardSection title="Performance Analytics" className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWidget title="Reach Trend" description="Last 4 weeks">
            <SimpleTrendChart data={reachTrend} />
          </ChartWidget>

          <ChartWidget title="Campaign Status" description="Distribution">
            <SimpleBarChart data={campaignsByStatus} />
          </ChartWidget>
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <DashboardSection title="Quick Actions" className="mt-8">
        <QuickActions actions={quickActions} columns={4} />
      </DashboardSection>

      {/* Active Campaigns & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <DashboardWidget title="Active Campaigns" icon="📊">
          <DataTable
            columns={[
              { key: 'name', label: 'Campaign' },
              { key: 'reach', label: 'Reach' },
              { key: 'engagement', label: 'Engagement' },
              {
                key: 'status',
                label: 'Status',
                render: (item) => (
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    {item.status}
                  </span>
                ),
              },
            ]}
            data={activeCampaigns}
            onRowClick={(campaign) => console.log('View:', campaign)}
          />
        </DashboardWidget>

        <div className="space-y-6">
          <DashboardWidget title="Recent Activity" icon="📋">
            <ActivityFeed activities={recentActivities} />
          </DashboardWidget>

          <ProgressCard
            title="Monthly Campaign Goal"
            description="Campaigns launched this month"
            current={24}
            target={30}
            unit="campaigns"
            icon="🎯"
            color="green"
          />
        </div>
      </div>
    </RoleDashboardLayout>
  );
}
