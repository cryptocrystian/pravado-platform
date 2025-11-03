// =====================================================
// EDITOR DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Editors
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function EditorDashboard() {
  return (
    <DashboardTemplate
      title="Editor Dashboard"
      description="Content review, approval, and quality control"
      icon="📝"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Review Queue
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Pending Reviews"
          value="12"
          icon="📋"
        />
        <DashboardStat
          label="Approved (Week)"
          value="38"
          icon="✅"
          trend={{ value: 15, isPositive: true }}
        />
        <DashboardStat
          label="Avg. Review Time"
          value="2.4h"
          icon="⏱️"
          trend={{ value: 0.3, isPositive: false }}
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Review Queue" icon="📋">
          <p className="text-muted-foreground">Content awaiting your review...</p>
        </DashboardWidget>

        <DashboardWidget title="Recent Edits" icon="✏️">
          <p className="text-muted-foreground">Your recent editorial decisions...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
