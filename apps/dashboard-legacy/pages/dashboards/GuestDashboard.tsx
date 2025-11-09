// =====================================================
// GUEST DASHBOARD
// Sprint 39 Phase 3.3.1: Role-specific dashboard for Guests
// =====================================================

import { DashboardTemplate, DashboardWidget } from '@/components/dashboards/DashboardTemplate';

export function GuestDashboard() {
  return (
    <DashboardTemplate
      title="Welcome"
      description="Limited read-only access"
      icon="👁️"
      actions={
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Request Access
        </button>
      }
    >
      <div className="max-w-2xl mx-auto">
        <DashboardWidget title="Guest Access" icon="ℹ️">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You currently have limited guest access to this platform. To unlock full features,
              please contact your administrator.
            </p>
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-semibold mb-2">What you can do:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>View public dashboard information</li>
                <li>Access shared resources</li>
                <li>Request account upgrade</li>
              </ul>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-semibold mb-2">Need more access?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact your organization administrator to upgrade your account and unlock
                additional features.
              </p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm">
                Contact Admin
              </button>
            </div>
          </div>
        </DashboardWidget>
      </div>
    </DashboardTemplate>
  );
}
