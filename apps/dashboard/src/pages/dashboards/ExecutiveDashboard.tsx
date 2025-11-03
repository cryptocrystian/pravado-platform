// =====================================================
// EXECUTIVE DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Executives
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function ExecutiveDashboard() {
  return (
    <DashboardTemplate
      title="Executive Dashboard"
      description="High-level overview and strategic insights"
      icon="💼"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Export Report
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Overall ROI"
          value="324%"
          icon="💰"
          trend={{ value: 12, isPositive: true }}
        />
        <DashboardStat
          label="Total Campaigns"
          value="42"
          icon="📊"
        />
        <DashboardStat
          label="Brand Sentiment"
          value="+87%"
          icon="😊"
          trend={{ value: 5, isPositive: true }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Strategic Overview" icon="🎯">
          <p className="text-muted-foreground">Key performance indicators and trends...</p>
        </DashboardWidget>

        <DashboardWidget title="Market Position" icon="📈">
          <p className="text-muted-foreground">Competitive standing and opportunities...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
