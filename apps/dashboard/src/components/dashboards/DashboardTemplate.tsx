// =====================================================
// DASHBOARD TEMPLATE
// Sprint 39 Phase 3.3.1: Shared dashboard layout template
// =====================================================

import { ReactNode } from 'react';
import { useRoleConfig } from '@/hooks/useRoleBasedNavigation';

interface DashboardTemplateProps {
  title: string;
  description?: string;
  icon?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function DashboardTemplate({
  title,
  description,
  icon,
  children,
  actions,
}: DashboardTemplateProps) {
  const roleConfig = useRoleConfig();

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {icon && <span className="text-4xl">{icon}</span>}
              <h1 className="text-3xl font-bold">{title}</h1>
            </div>
            {description && <p className="text-muted-foreground text-lg">{description}</p>}
            {roleConfig && (
              <div className="mt-2">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: `var(--${roleConfig.color}-100)`,
                    color: `var(--${roleConfig.color}-700)`,
                  }}
                >
                  <span>{roleConfig.icon}</span>
                  <span>{roleConfig.label}</span>
                </span>
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}

interface DashboardWidgetProps {
  title: string;
  icon?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DashboardWidget({
  title,
  icon,
  children,
  actions,
  className = '',
}: DashboardWidgetProps) {
  return (
    <div className={`bg-card rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>;
}

export function DashboardStat({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && <span className="text-3xl opacity-50">{icon}</span>}
      </div>
    </div>
  );
}
