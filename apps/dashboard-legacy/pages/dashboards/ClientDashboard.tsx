// =====================================================
// CLIENT DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Clients
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function ClientDashboard() {
  return (
    <DashboardTemplate
      title="Client Dashboard"
      description="Your campaign results and performance overview"
      icon="👤"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          View Reports
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Active Campaigns"
          value="3"
          icon="📊"
        />
        <DashboardStat
          label="Total Reach"
          value="245K"
          icon="👁️"
          trend={{ value: 18, isPositive: true }}
        />
        <DashboardStat
          label="Engagement Rate"
          value="5.2%"
          icon="❤️"
          trend={{ value: 0.8, isPositive: true }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Campaign Performance" icon="📈">
          <p className="text-muted-foreground">Your campaign metrics and results...</p>
        </DashboardWidget>

        <DashboardWidget title="Recent Updates" icon="📢">
          <p className="text-muted-foreground">Latest news and campaign updates...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
