// =====================================================
// MEDIA CONTACT DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Media Contacts
// =====================================================

import { DashboardTemplate, DashboardGrid, DashboardStat, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function MediaContactDashboard() {
  return (
    <DashboardTemplate
      title="Media Contact Dashboard"
      description="Press materials and media resources"
      icon="📰"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Press Kit
        </button>
      }
    >
      <DashboardGrid>
        <DashboardStat
          label="Press Releases"
          value="6"
          icon="📢"
        />
        <DashboardStat
          label="Media Assets"
          value="24"
          icon="🖼️"
        />
        <DashboardStat
          label="Recent Updates"
          value="3"
          icon="🆕"
        />
      </DashboardGrid>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Latest Press Releases" icon="📢">
          <p className="text-muted-foreground">Recent press materials and announcements...</p>
        </DashboardWidget>

        <DashboardWidget title="Media Resources" icon="📁">
          <p className="text-muted-foreground">Press kit, images, and brand assets...</p>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
