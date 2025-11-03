// =====================================================
// CHART WIDGET
// Sprint 40 Phase 3.3.2: Reusable chart container
// =====================================================

import { ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ChartWidgetProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function ChartWidget({
  title,
  description,
  children,
  actions,
  loading = false,
  className = '',
}: ChartWidgetProps) {
  if (loading) {
    return (
      <div className={`bg-card rounded-lg border p-6 ${className}`}>
        <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
        {description && <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>}
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg border p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function ChartWidgetSkeleton() {
  return <ChartWidget title="" loading={true} children={null} />;
}

// Simple bar chart component (placeholder for actual chart library)
export interface BarData {
  label: string;
  value: number;
  color?: string;
}

export function SimpleBarChart({ data }: { data: BarData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${item.color || 'bg-primary'}`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple line trend component
export interface TrendData {
  label: string;
  value: number;
}

export function SimpleTrendChart({ data }: { data: TrendData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  return (
    <div className="relative h-32">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          points={data
            .map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((point.value - minValue) / range) * 100;
              return `${x},${y}`;
            })
            .join(' ')}
        />
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((point, index) => (
          <div key={index} className="text-xs text-muted-foreground text-center">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}
