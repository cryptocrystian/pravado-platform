// =====================================================
// ACTIVITY FEED WIDGET
// Sprint 40 Phase 3.3.2: Activity timeline component
// =====================================================

import { ReactNode } from 'react';
import { Clock } from 'lucide-react';

export interface Activity {
  id: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  type?: 'success' | 'info' | 'warning' | 'error';
}

export interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  emptyMessage?: string;
  showTimestamps?: boolean;
}

export function ActivityFeed({
  activities,
  loading = false,
  emptyMessage = 'No recent activity',
  showTimestamps = true,
}: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const typeColors = {
    success: 'bg-green-100 text-green-700',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              activity.type ? typeColors[activity.type] : 'bg-muted'
            }`}
          >
            {activity.icon || <Clock className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                )}
                {activity.user && (
                  <p className="text-xs text-muted-foreground mt-1">by {activity.user.name}</p>
                )}
              </div>
              {showTimestamps && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.timestamp}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return <ActivityFeed activities={[]} loading={true} />;
}
