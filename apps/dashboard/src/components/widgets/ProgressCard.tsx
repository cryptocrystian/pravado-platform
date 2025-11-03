// =====================================================
// PROGRESS CARD WIDGET
// Sprint 40 Phase 3.3.2: Goal/progress tracking component
// =====================================================

import { ReactNode } from 'react';

export interface ProgressCardProps {
  title: string;
  description?: string;
  current: number;
  target: number;
  unit?: string;
  icon?: ReactNode;
  color?: string;
  showPercentage?: boolean;
  loading?: boolean;
}

export function ProgressCard({
  title,
  description,
  current,
  target,
  unit = '',
  icon,
  color = 'blue',
  showPercentage = true,
  loading = false,
}: ProgressCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
        <div className="h-3 bg-muted rounded mb-2"></div>
        <div className="h-2 bg-muted rounded"></div>
      </div>
    );
  }

  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {icon && <div className="text-3xl opacity-50">{icon}</div>}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{current}</span>
            <span className="text-muted-foreground">/ {target}</span>
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </div>
          {showPercentage && (
            <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete ? 'bg-green-500' : (colorClasses as any)[color] || colorClasses.blue
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {isComplete && (
          <p className="text-sm text-green-600 font-medium">✓ Goal achieved!</p>
        )}
      </div>
    </div>
  );
}

export function ProgressCardSkeleton() {
  return <ProgressCard title="" current={0} target={0} loading={true} />;
}
