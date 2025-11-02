'use client';

import { useCRMStats } from '../../hooks/useCRM';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function CRMStatsSidebar() {
  const { data: stats, isLoading } = useCRMStats();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const relationshipDistribution = [
    {
      label: 'Hot',
      count: stats.hotRelationships,
      color: 'text-red-600 bg-red-50',
      percentage: stats.totalRelationships > 0
        ? Math.round((stats.hotRelationships / stats.totalRelationships) * 100)
        : 0,
    },
    {
      label: 'Warm',
      count: stats.warmRelationships,
      color: 'text-orange-600 bg-orange-50',
      percentage: stats.totalRelationships > 0
        ? Math.round((stats.warmRelationships / stats.totalRelationships) * 100)
        : 0,
    },
    {
      label: 'Cool',
      count: stats.coolRelationships,
      color: 'text-blue-600 bg-blue-50',
      percentage: stats.totalRelationships > 0
        ? Math.round((stats.coolRelationships / stats.totalRelationships) * 100)
        : 0,
    },
    {
      label: 'Cold',
      count: stats.coldRelationships,
      color: 'text-gray-600 bg-gray-50',
      percentage: stats.totalRelationships > 0
        ? Math.round((stats.coldRelationships / stats.totalRelationships) * 100)
        : 0,
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">CRM Overview</h3>

      {/* Total Relationships */}
      <div className="mb-6">
        <div className="text-3xl font-bold">{stats.totalRelationships}</div>
        <div className="text-sm text-gray-600">Total Relationships</div>
        <div className="text-sm text-gray-500 mt-1">
          Avg Strength: {stats.avgStrengthScore.toFixed(1)}/100
        </div>
      </div>

      {/* Relationship Temperature Distribution */}
      <div className="mb-6">
        <div className="text-sm font-medium mb-3">Relationship Temperature</div>
        <div className="space-y-2">
          {relationshipDistribution.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              <div className="text-sm font-medium">
                {item.count} ({item.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mb-6">
        <div className="text-sm font-medium mb-3">Recent Activity</div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">This Week</span>
            <span className="font-medium">{stats.interactionsThisWeek}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">This Month</span>
            <span className="font-medium">{stats.interactionsThisMonth}</span>
          </div>
        </div>
      </div>

      {/* Follow-Ups */}
      <div>
        <div className="text-sm font-medium mb-3">Follow-Ups</div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pending</span>
            <span className="font-medium">{stats.pendingFollowUps}</span>
          </div>
          {stats.overdueFollowUps > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Overdue</span>
              <span className="font-medium text-red-600">{stats.overdueFollowUps}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
