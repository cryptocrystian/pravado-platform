// =====================================================
// AGENT DASHBOARD - PRODUCTION
// Sprint 40 Phase 3.3.2: AI agent management and campaign execution
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
  ProgressCard,
} from '@/components/widgets';
import { Bot, Rocket, Target, Zap } from 'lucide-react';

export function AgentDashboard() {
  const [loading] = useState(false);

  const agentStats = {
    activeCampaigns: { value: 18, trend: { value: 3, direction: 'up' as const } },
    agentExecutions: { value: 142, trend: { value: 15, direction: 'up' as const, label: 'this week' } },
    successRate: { value: '94%', trend: { value: 2, direction: 'up' as const } },
    avgExecutionTime: { value: '2.3s', trend: { value: 10, direction: 'down' as const } },
  };

  const executionTrend = [
    { label: 'Mon', value: 24 },
    { label: 'Tue', value: 28 },
    { label: 'Wed', value: 26 },
    { label: 'Thu', value: 32 },
    { label: 'Fri', value: 32 },
  ];

  const agentTypes = [
    { label: 'Content Generator', value: 45 },
    { label: 'Media Outreach', value: 38 },
    { label: 'Analytics', value: 32 },
    { label: 'Research', value: 27 },
  ];

  const recentRuns = [
    {
      id: '1',
      title: 'Content Generator completed',
      description: 'Generated 5 press releases for Q1 campaign',
      timestamp: '10 minutes ago',
      type: 'success' as const,
    },
    {
      id: '2',
      title: 'Media Outreach in progress',
      description: 'Contacting 50 media outlets for product launch',
      timestamp: '30 minutes ago',
      type: 'info' as const,
    },
    {
      id: '3',
      title: 'Analytics Agent completed',
      description: 'Analyzed campaign performance for last 30 days',
      timestamp: '1 hour ago',
      type: 'success' as const,
    },
  ];

  const quickActions = [
    {
      id: 'run-agent',
      label: 'Run New Agent',
      description: 'Execute AI agent workflow',
      icon: <Rocket />,
      variant: 'primary' as const,
      onClick: () => console.log('Run agent'),
    },
    {
      id: 'templates',
      label: 'Agent Templates',
      description: 'Browse agent templates',
      icon: <Bot />,
      onClick: () => console.log('Templates'),
    },
    {
      id: 'campaigns',
      label: 'View Campaigns',
      description: 'Active campaign status',
      icon: <Target />,
      onClick: () => console.log('Campaigns'),
    },
    {
      id: 'optimize',
      label: 'Optimize Agents',
      description: 'Improve performance',
      icon: <Zap />,
      onClick: () => console.log('Optimize'),
    },
  ];

  return (
    <RoleDashboardLayout
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Run New Agent
        </button>
      }
      loading={loading}
    >
      {/* Key Metrics */}
      <DashboardSection title="Agent Performance">
        <DashboardGrid columns={4}>
          <StatCard
            label="Active Campaigns"
            value={agentStats.activeCampaigns.value}
            icon="📊"
            trend={agentStats.activeCampaigns.trend}
          />
          <StatCard
            label="Agent Executions"
            value={agentStats.agentExecutions.value}
            icon="🤖"
            trend={agentStats.agentExecutions.trend}
          />
          <StatCard
            label="Success Rate"
            value={agentStats.successRate.value}
            icon="✅"
            trend={agentStats.successRate.trend}
          />
          <StatCard
            label="Avg Execution Time"
            value={agentStats.avgExecutionTime.value}
            icon="⚡"
            trend={agentStats.avgExecutionTime.trend}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Charts */}
      <DashboardSection title="Execution Analytics" className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWidget title="Daily Executions" description="This week">
            <SimpleTrendChart data={executionTrend} />
          </ChartWidget>

          <ChartWidget title="Agent Types" description="By execution count">
            <SimpleBarChart data={agentTypes} />
          </ChartWidget>
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <DashboardSection title="Quick Actions" className="mt-8">
        <QuickActions actions={quickActions} columns={4} />
      </DashboardSection>

      {/* Recent Runs & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <DashboardWidget title="Recent Agent Runs" icon="🤖">
          <ActivityFeed activities={recentRuns} />
        </DashboardWidget>

        <div className="space-y-6">
          <ProgressCard
            title="Weekly Execution Goal"
            description="Agent runs this week"
            current={142}
            target={200}
            unit="executions"
            icon="🎯"
            color="purple"
          />
          <ProgressCard
            title="Campaign Completion"
            description="Q1 campaigns progress"
            current={18}
            target={25}
            unit="campaigns"
            icon="📊"
            color="blue"
          />
        </div>
      </div>
    </RoleDashboardLayout>
  );
}
