import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { useMentionTrends } from '../../hooks/useReputation';

export interface TrendsChartProps {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  defaultGranularity?: 'daily' | 'weekly' | 'monthly';
}

type ChartType = 'line' | 'bar';
type Metric = 'volume' | 'sentiment' | 'scores';

export function TrendsChart({
  organizationId,
  startDate,
  endDate,
  defaultGranularity = 'daily',
}: TrendsChartProps) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>(defaultGranularity);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('volume');

  const { data: trends, isLoading, error } = useMentionTrends(startDate, endDate, granularity);

  const chartData = useMemo(() => {
    if (!trends?.dataPoints) return [];

    return trends.dataPoints.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(granularity === 'monthly' && { year: 'numeric' }),
      }),
      total: point.totalMentions,
      brand: point.brandMentions,
      competitor: point.competitorMentions,
      industry: point.industryMentions,
      topic: point.topicMentions,
      sentiment: point.avgSentiment,
      relevance: point.avgRelevanceScore,
      visibility: point.avgVisibilityScore,
      virality: point.avgViralityScore,
    }));
  }, [trends, granularity]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold text-gray-900">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-gray-700">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-900">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Failed to load trends data.</p>
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

  if (!trends || chartData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No trend data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Reputation Trends</h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Metric:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as Metric)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="volume">Volume</option>
              <option value="sentiment">Sentiment</option>
              <option value="scores">Scores</option>
            </select>
          </div>

          {/* Granularity Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Granularity:</label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex rounded-md border border-gray-300">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm font-medium ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-l-md`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`border-l border-gray-300 px-3 py-1.5 text-sm font-medium ${
                chartType === 'bar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-r-md`}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">Total Mentions</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{trends.summary.totalMentions}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">Avg Sentiment</p>
          <p className={`mt-1 text-xl font-bold ${trends.summary.avgSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trends.summary.avgSentiment.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">Peak Day</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {new Date(trends.summary.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-600">{trends.summary.peakMentions} mentions</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">Trend</p>
          <p className={`mt-1 text-xl font-bold ${trends.summary.trend === 'UP' ? 'text-green-600' : trends.summary.trend === 'DOWN' ? 'text-red-600' : 'text-gray-600'}`}>
            {trends.summary.trend === 'UP' ? '↗' : trends.summary.trend === 'DOWN' ? '↘' : '→'}
            {' '}{trends.summary.trend}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {selectedMetric === 'volume' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total Mentions"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="brand"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Brand"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="competitor"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Competitor"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="industry"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Industry"
                    dot={{ r: 3 }}
                  />
                </>
              )}

              {selectedMetric === 'sentiment' && (
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Avg Sentiment"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}

              {selectedMetric === 'scores' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="relevance"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Relevance"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="visibility"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Visibility"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="virality"
                    stroke="#ec4899"
                    strokeWidth={2}
                    name="Virality"
                    dot={{ r: 3 }}
                  />
                </>
              )}
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {selectedMetric === 'volume' && (
                <>
                  <Bar dataKey="brand" fill="#10b981" name="Brand" />
                  <Bar dataKey="competitor" fill="#8b5cf6" name="Competitor" />
                  <Bar dataKey="industry" fill="#f59e0b" name="Industry" />
                  <Bar dataKey="topic" fill="#06b6d4" name="Topic" />
                </>
              )}

              {selectedMetric === 'sentiment' && (
                <Bar dataKey="sentiment" fill="#3b82f6" name="Avg Sentiment" />
              )}

              {selectedMetric === 'scores' && (
                <>
                  <Bar dataKey="relevance" fill="#8b5cf6" name="Relevance" />
                  <Bar dataKey="visibility" fill="#3b82f6" name="Visibility" />
                  <Bar dataKey="virality" fill="#ec4899" name="Virality" />
                </>
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
