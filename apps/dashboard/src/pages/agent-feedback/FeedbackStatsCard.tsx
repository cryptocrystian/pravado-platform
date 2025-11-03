// =====================================================
// FEEDBACK STATS CARD COMPONENT
// Sprint 48 Phase 4.4
// =====================================================

import React from 'react';
import type { FeedbackMetrics } from '@pravado/shared-types';

interface FeedbackStatsCardProps {
  metrics: FeedbackMetrics | null;
  isLoading?: boolean;
}

export const FeedbackStatsCard: React.FC<FeedbackStatsCardProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No feedback data available</p>
      </div>
    );
  }

  const thumbsUpPercentage = metrics.totalFeedback > 0
    ? (metrics.thumbsUpCount / metrics.totalFeedback) * 100
    : 0;

  const thumbsDownPercentage = metrics.totalFeedback > 0
    ? (metrics.thumbsDownCount / metrics.totalFeedback) * 100
    : 0;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Feedback Overview</h3>
        <p className="text-sm text-gray-500 mt-1">
          {metrics.dateRange.startDate.toLocaleDateString()} - {metrics.dateRange.endDate.toLocaleDateString()}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="p-6 space-y-6">
        {/* Total Feedback & Average Rating */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Feedback</p>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalFeedback}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Average Rating</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{metrics.avgRating.toFixed(2)}</p>
              <p className="text-sm text-gray-500">/ 5.0</p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.round(metrics.avgRating) ? 'text-yellow-400' : 'text-gray-300'}
                >
                  ⭐
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Thumbs Up/Down */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Feedback</p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <span>👍</span>
                  Thumbs Up
                </span>
                <span className="text-sm font-semibold text-green-600">
                  {metrics.thumbsUpCount} ({thumbsUpPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${thumbsUpPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <span>👎</span>
                  Thumbs Down
                </span>
                <span className="text-sm font-semibold text-red-600">
                  {metrics.thumbsDownCount} ({thumbsDownPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${thumbsDownPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Star Ratings Distribution */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Rating Distribution</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = metrics.ratingDistribution[`star_${stars}` as keyof typeof metrics.ratingDistribution] || 0;
              const percentage = metrics.totalFeedback > 0 ? (count / metrics.totalFeedback) * 100 : 0;

              return (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm text-gray-600">{stars}</span>
                    <span className="text-yellow-400 text-xs">⭐</span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-20 text-right">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(metrics.categoryBreakdown).length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Top Categories</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(metrics.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-600 capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackStatsCard;
