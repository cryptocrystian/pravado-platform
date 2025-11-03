// =====================================================
// QUICK ACTIONS WIDGET
// Sprint 40 Phase 3.3.2: Role-specific action buttons
// =====================================================

import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  badge?: string | number;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 1 | 2 | 3 | 4;
  loading?: boolean;
}

export function QuickActions({
  actions,
  title = 'Quick Actions',
  columns = 2,
  loading = false,
}: QuickActionsProps) {
  if (loading) {
    return (
      <div>
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-3`}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-muted rounded-lg animate-pulse h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border-2 border-primary text-primary hover:bg-primary/10',
  };

  return (
    <div>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-3`}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`p-4 rounded-lg transition-all text-left relative group ${
              action.variant ? variantStyles[action.variant] : 'bg-card border hover:border-primary hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              {action.icon && <div className="flex-shrink-0 text-2xl">{action.icon}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{action.label}</p>
                  {action.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                      {action.badge}
                    </span>
                  )}
                </div>
                {action.description && (
                  <p className="text-sm opacity-80 mt-1">{action.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickActionsSkeleton() {
  return <QuickActions actions={[]} loading={true} />;
}
