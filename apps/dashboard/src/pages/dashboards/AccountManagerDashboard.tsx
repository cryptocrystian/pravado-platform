// =====================================================
// ACCOUNT MANAGER DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Account Managers
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function AccountManagerDashboard() {
  return (
    <DashboardTemplate
      title="Account Manager Dashboard"
      description="Client relationships, billing, and account health"
      icon="🤝"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          View Clients
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Active Clients"
          value="18"
          icon="👥"
          trend={{ value: 2, isPositive: true }}
        />
        <DashboardStat
          label="Revenue (Month)"
          value="$124K"
          icon="💰"
          trend={{ value: 8, isPositive: true }}
        />
        <DashboardStat
          label="Client Satisfaction"
          value="4.7/5"
          icon="⭐"
          trend={{ value: 0.2, isPositive: true }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Client Activity" icon="📊">
          <p className="text-muted-foreground">Recent client interactions and updates...</p>
        </DashboardWidget>

        <DashboardWidget title="Upcoming Renewals" icon="🔄">
          <p className="text-muted-foreground">Contract renewals and opportunities...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
