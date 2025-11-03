// =====================================================
// ANALYST DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Analysts
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function AnalystDashboard() {
  return (
    <DashboardTemplate
      title="Analyst Dashboard"
      description="Data analysis, reporting, and performance metrics"
      icon="📈"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Generate Report
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Reports Generated"
          value="34"
          icon="📊"
          trend={{ value: 12, isPositive: true }}
        />
        <DashboardStat
          label="Data Points Analyzed"
          value="1.4M"
          icon="🔢"
        />
        <DashboardStat
          label="Insights Delivered"
          value="156"
          icon="💡"
          trend={{ value: 22, isPositive: true }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Key Metrics" icon="📊">
          <p className="text-muted-foreground">Performance indicators and trends...</p>
        </DashboardWidget>

        <DashboardWidget title="Recent Reports" icon="📄">
          <p className="text-muted-foreground">Your latest analytical reports...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
