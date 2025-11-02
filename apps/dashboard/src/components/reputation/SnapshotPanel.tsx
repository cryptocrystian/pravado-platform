import { useMemo } from 'react';
import { useMonitoringStats } from '../../hooks/useReputation';

export interface SnapshotPanelProps {
  organizationId: string;
  startDate?: Date;
  endDate?: Date;
}

export function SnapshotPanel({ organizationId, startDate, endDate }: SnapshotPanelProps) {
  const { data: stats, isLoading, error } = useMonitoringStats(startDate, endDate);

  const sentimentDistribution = useMemo(() => {
    if (!stats?.sentimentBreakdown) return [];
    return [
      { name: 'Positive', value: stats.sentimentBreakdown.positive, color: 'bg-green-500' },
      { name: 'Neutral', value: stats.sentimentBreakdown.neutral, color: 'bg-gray-500' },
      { name: 'Negative', value: stats.sentimentBreakdown.negative, color: 'bg-red-500' },
      { name: 'Mixed', value: stats.sentimentBreakdown.mixed, color: 'bg-yellow-500' },
    ];
  }, [stats]);

  const totalMentions = useMemo(() => {
    if (!stats?.sentimentBreakdown) return 0;
    return Object.values(stats.sentimentBreakdown).reduce((sum, val) => sum + val, 0);
  }, [stats]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Failed to load monitoring statistics.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Mentions */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Mentions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{totalMentions.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Average Sentiment */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Sentiment</p>
              <p className={`mt-2 text-3xl font-bold ${stats.avgSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.avgSentiment?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div className={`rounded-full p-3 ${stats.avgSentiment >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <svg className={`h-6 w-6 ${stats.avgSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {stats.avgSentiment >= 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Avg Relevance Score */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Relevance</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.avgRelevanceScore?.toFixed(0) || 'N/A'}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Viral Mentions */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Viral Mentions</p>
              <p className="mt-2 text-3xl font-bold text-pink-600">
                {stats.viralMentions || 0}
              </p>
            </div>
            <div className="rounded-full bg-pink-100 p-3">
              <svg className="h-6 w-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Sentiment Distribution</h3>

        {/* Bar Chart */}
        <div className="space-y-3">
          {sentimentDistribution.map((item) => {
            const percentage = totalMentions > 0 ? (item.value / totalMentions) * 100 : 0;
            return (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-gray-600">
                    {item.value} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${item.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by Type and Medium */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Mention Type */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">By Mention Type</h3>
          <div className="space-y-2">
            {stats.mentionsByType && Object.entries(stats.mentionsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{type}</span>
                <span className="text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Medium */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">By Medium</h3>
          <div className="space-y-2">
            {stats.mentionsByMedium && Object.entries(stats.mentionsByMedium).map(([medium, count]) => (
              <div key={medium} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{medium}</span>
                <span className="text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Outlets */}
      {stats.topOutlets && stats.topOutlets.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Outlets</h3>
          <div className="space-y-3">
            {stats.topOutlets.slice(0, 10).map((outlet, idx) => (
              <div key={outlet.outlet} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-900">{outlet.outlet}</span>
                </div>
                <span className="text-sm text-gray-600">{outlet.count} mentions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Keywords */}
      {stats.topKeywords && stats.topKeywords.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topKeywords.slice(0, 20).map((keyword) => (
              <span
                key={keyword.keyword}
                className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm"
              >
                <span className="font-medium text-blue-900">{keyword.keyword}</span>
                <span className="ml-2 text-blue-600">{keyword.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Score Averages */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Average Scores</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Relevance Score</p>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {stats.avgRelevanceScore?.toFixed(1) || 'N/A'}
              </span>
              <span className="pb-1 text-sm text-gray-500">/ 100</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${stats.avgRelevanceScore || 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Visibility Score</p>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {stats.avgVisibilityScore?.toFixed(1) || 'N/A'}
              </span>
              <span className="pb-1 text-sm text-gray-500">/ 100</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${stats.avgVisibilityScore || 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Virality Score</p>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {stats.avgViralityScore?.toFixed(1) || 'N/A'}
              </span>
              <span className="pb-1 text-sm text-gray-500">/ 100</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-pink-500"
                style={{ width: `${stats.avgViralityScore || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
