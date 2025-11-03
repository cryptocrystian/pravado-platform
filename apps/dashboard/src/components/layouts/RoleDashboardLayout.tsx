// =====================================================
// ROLE DASHBOARD LAYOUT
// Sprint 40 Phase 3.3.2: Central layout wrapper for role-based dashboards
// =====================================================

import { ReactNode } from 'react';
import { useRoleConfig, useUserRole } from '@/hooks/useRoleBasedNavigation';
import { Loader2, AlertCircle } from 'lucide-react';

export interface RoleDashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: Error | null;
}

export function RoleDashboardLayout({
  children,
  title,
  description,
  actions,
  loading = false,
  error = null,
}: RoleDashboardLayoutProps) {
  const roleConfig = useRoleConfig();
  const { data: userContext, isLoading: userLoading } = useUserRole();

  // Show loading state while user role is being fetched
  if (userLoading || loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {roleConfig && <span className="text-4xl">{roleConfig.icon}</span>}
              <h1 className="text-3xl font-bold">
                {title || (roleConfig ? `${roleConfig.label} Dashboard` : 'Dashboard')}
              </h1>
            </div>
            {(description || roleConfig?.description) && (
              <p className="text-muted-foreground text-lg">
                {description || roleConfig?.description}
              </p>
            )}
            {roleConfig && userContext && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `hsl(var(--${roleConfig.color}-100))`,
                    color: `hsl(var(--${roleConfig.color}-700))`,
                  }}
                >
                  <span>{roleConfig.icon}</span>
                  <span>{roleConfig.label}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {userContext.organizationId}
                </span>
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

/**
 * Dashboard Grid - Responsive grid layout for dashboard widgets
 */
export function DashboardGrid({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={`grid ${gridClasses[columns]} gap-6`}>{children}</div>;
}

/**
 * Dashboard Section - Grouped section with optional title
 */
export function DashboardSection({
  title,
  description,
  children,
  actions,
  className = '',
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

/**
 * Dashboard Widget Container - Consistent widget styling
 */
export function DashboardWidget({
  title,
  description,
  icon,
  children,
  actions,
  className = '',
  loading = false,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={`bg-card rounded-lg border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg border p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-2xl">{icon}</span>}
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
