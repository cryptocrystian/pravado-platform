// =====================================================
// TEAM MEMBER DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Team Members
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function TeamMemberDashboard() {
  return (
    <DashboardTemplate
      title="Team Member Dashboard"
      description="Collaborative workspace and team activities"
      icon="👥"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          My Tasks
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Assigned Tasks"
          value="8"
          icon="📋"
        />
        <DashboardStat
          label="Team Projects"
          value="5"
          icon="🎯"
        />
        <DashboardStat
          label="Completed (Week)"
          value="12"
          icon="✅"
          trend={{ value: 20, isPositive: true }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="My Tasks" icon="📋">
          <p className="text-muted-foreground">Your assigned tasks and deadlines...</p>
        </DashboardWidget>

        <DashboardWidget title="Team Activity" icon="👥">
          <p className="text-muted-foreground">Recent team updates and collaboration...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
