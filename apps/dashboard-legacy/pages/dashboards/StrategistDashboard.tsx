// =====================================================
// STRATEGIST DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Strategists
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function StrategistDashboard() {
  return (
    <DashboardTemplate
      title="Strategist Dashboard"
      description="Strategic planning, insights, and competitive analysis"
      icon="🎯"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          New Strategy
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Active Strategies"
          value="6"
          icon="🎯"
        />
        <DashboardStat
          label="Market Insights"
          value="24"
          icon="🔍"
          trend={{ value: 8, isPositive: true }}
        />
        <DashboardStat
          label="Strategy Success Rate"
          value="87%"
          icon="✅"
          trend={{ value: 3, isPositive: true }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Competitive Analysis" icon="🔍">
          <p className="text-muted-foreground">Market trends and competitor insights...</p>
        </DashboardWidget>

        <DashboardWidget title="Strategic Goals" icon="🎯">
          <p className="text-muted-foreground">Key objectives and milestones...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
