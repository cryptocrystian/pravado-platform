// =====================================================
// STAT CARD WIDGET
// Sprint 40 Phase 3.3.2: Reusable metric card component
// =====================================================

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  color?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  loading = false,
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-muted rounded w-1/3"></div>
      </div>
    );
  }

  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    trend?.direction === 'up'
      ? 'text-green-600'
      : trend?.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <div
      className={`bg-card rounded-lg border p-6 transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-primary' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold mb-2">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={`text-4xl opacity-50 text-${color}-500`}>{icon}</div>
        )}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return <StatCard label="" value="" loading={true} />;
}
