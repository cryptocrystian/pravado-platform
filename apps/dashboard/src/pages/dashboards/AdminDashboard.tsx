// =====================================================
// ADMIN DASHBOARD - PRODUCTION
// Sprint 40 Phase 3.3.2: Full system overview and control
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
  SimpleBarChart,
  SimpleTrendChart,
  ActivityFeed,
  QuickActions,
  DataTable,
  AlertList,
} from '@/components/widgets';
import { Settings, UserPlus, Shield, Database } from 'lucide-react';

export function AdminDashboard() {
  const [loading] = useState(false);

  // Mock data - replace with actual hooks
  const systemStats = {
    totalUsers: { value: 2547, trend: { value: 12, direction: 'up' as const } },
    activeOrgs: { value: 42, trend: { value: 5, direction: 'up' as const } },
    systemHealth: { value: '99.9%', trend: { value: 0.1, direction: 'up' as const } },
    apiCalls: { value: '1.2M', trend: { value: 8, direction: 'up' as const } },
  };

  const userGrowth = [
    { label: 'Jan', value: 120 },
    { label: 'Feb', value: 145 },
    { label: 'Mar', value: 180 },
    { label: 'Apr', value: 220 },
    { label: 'May', value: 285 },
    { label: 'Jun', value: 340 },
  ];

  const orgsByPlan = [
    { label: 'Enterprise', value: 12, color: 'bg-purple-500' },
    { label: 'Professional', value: 18, color: 'bg-blue-500' },
    { label: 'Starter', value: 12, color: 'bg-green-500' },
  ];

  const recentActivity = [
    {
      id: '1',
      title: 'New organization created',
      description: 'Acme Corp signed up for Enterprise plan',
      timestamp: '5 minutes ago',
      type: 'success' as const,
    },
    {
      id: '2',
      title: 'System update completed',
      description: 'Database migration v2.3.1 successful',
      timestamp: '1 hour ago',
      type: 'info' as const,
    },
    {
      id: '3',
      title: 'High API usage detected',
      description: 'Organization XYZ approaching rate limit',
      timestamp: '2 hours ago',
      type: 'warning' as const,
    },
  ];

  const quickActions = [
    {
      id: 'manage-users',
      label: 'Manage Users',
      description: 'Add, edit, or remove users',
      icon: <UserPlus />,
      onClick: () => console.log('Manage users'),
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      description: 'Configure platform settings',
      icon: <Settings />,
      onClick: () => console.log('System settings'),
    },
    {
      id: 'security',
      label: 'Security Center',
      description: 'Review security and compliance',
      icon: <Shield />,
      onClick: () => console.log('Security'),
    },
    {
      id: 'database',
      label: 'Database Admin',
      description: 'Monitor and manage databases',
      icon: <Database />,
      onClick: () => console.log('Database'),
    },
  ];

  const recentUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', joined: '2024-01-15' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Campaign Manager', status: 'Active', joined: '2024-01-14' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Content Creator', status: 'Active', joined: '2024-01-13' },
  ];

  const alerts = [
    {
      id: '1',
      type: 'warning' as const,
      title: 'Storage Usage High',
      message: 'Database storage is at 85% capacity. Consider upgrading or archiving old data.',
      action: {
        label: 'View Storage Details',
        onClick: () => console.log('View storage'),
      },
    },
  ];

  return (
    <RoleDashboardLayout
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          System Settings
        </button>
      }
      loading={loading}
    >
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <AlertList alerts={alerts} />
        </div>
      )}

      {/* Key Metrics */}
      <DashboardSection title="System Overview">
        <DashboardGrid columns={4}>
          <StatCard
            label="Total Users"
            value={systemStats.totalUsers.value.toLocaleString()}
            icon="👥"
            trend={systemStats.totalUsers.trend}
            loading={loading}
          />
          <StatCard
            label="Active Organizations"
            value={systemStats.activeOrgs.value}
            icon="🏢"
            trend={systemStats.activeOrgs.trend}
            loading={loading}
          />
          <StatCard
            label="System Health"
            value={systemStats.systemHealth.value}
            icon="✅"
            trend={systemStats.systemHealth.trend}
            loading={loading}
          />
          <StatCard
            label="API Calls (24h)"
            value={systemStats.apiCalls.value}
            icon="🔌"
            trend={systemStats.apiCalls.trend}
            loading={loading}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Charts */}
      <DashboardSection title="Analytics" className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWidget title="User Growth" description="Monthly new users" loading={loading}>
            <SimpleTrendChart data={userGrowth} />
          </ChartWidget>

          <ChartWidget title="Organizations by Plan" description="Distribution of plan types" loading={loading}>
            <SimpleBarChart data={orgsByPlan} />
          </ChartWidget>
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <DashboardSection title="Quick Actions" className="mt-8">
        <QuickActions actions={quickActions} columns={4} loading={loading} />
      </DashboardSection>

      {/* Recent Activity & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <DashboardWidget title="Recent Activity" icon="📊" loading={loading}>
          <ActivityFeed activities={recentActivity} />
        </DashboardWidget>

        <DashboardWidget title="Recent Users" icon="👥" loading={loading}>
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role' },
              { key: 'status', label: 'Status',
                render: (user) => (
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    {user.status}
                  </span>
                ),
              },
            ]}
            data={recentUsers}
            onRowClick={(user) => console.log('View user:', user)}
          />
        </DashboardWidget>
      </div>
    </RoleDashboardLayout>
  );
}
