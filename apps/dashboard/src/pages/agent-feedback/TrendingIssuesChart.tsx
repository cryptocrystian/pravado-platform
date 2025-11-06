// =====================================================
// TRENDING ISSUES CHART COMPONENT
// Sprint 48 Phase 4.4
// =====================================================

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { IssueSummary } from '@pravado/types';

interface TrendingIssuesChartProps {
  issues: IssueSummary[];
  isLoading?: boolean;
}

const COLORS = {
  critical: '#ef4444', // red-500
  high: '#f97316', // orange-500
  medium: '#eab308', // yellow-500
  low: '#22c55e', // green-500
};

export const TrendingIssuesChart: React.FC<TrendingIssuesChartProps> = ({ issues, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Trending Issues</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No issues found. Great job!</p>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = issues.map((issue) => ({
    category: issue.category.replace(/_/g, ' '),
    count: issue.count,
    percentage: issue.percentage,
    avgRating: issue.avgRating,
    // Determine severity based on rating
    severity: issue.avgRating < 2 ? 'critical' : issue.avgRating < 2.5 ? 'high' : issue.avgRating < 3.5 ? 'medium' : 'low',
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 capitalize mb-2">{data.category}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              Reports: <span className="font-semibold text-gray-900">{data.count}</span>
            </p>
            <p className="text-gray-600">
              Percentage: <span className="font-semibold text-gray-900">{data.percentage.toFixed(1)}%</span>
            </p>
            <p className="text-gray-600">
              Avg Rating: <span className="font-semibold text-gray-900">{data.avgRating.toFixed(1)}/5</span>
            </p>
            <p className="text-gray-600">
              Severity: <span className={`font-semibold capitalize ${
                data.severity === 'critical' ? 'text-red-600' :
                data.severity === 'high' ? 'text-orange-600' :
                data.severity === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {data.severity}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Trending Issues</h3>
        <p className="text-sm text-gray-500 mt-1">
          Issues sorted by frequency (lower ratings indicate higher priority)
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: 'Number of Reports', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => value === 'count' ? 'Reports' : value}
          />
          <Bar dataKey="count" name="Reports" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.severity as keyof typeof COLORS]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend for severity */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.critical }}></div>
          <span className="text-gray-600">Critical (&lt;2.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.high }}></div>
          <span className="text-gray-600">High (2.0-2.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.medium }}></div>
          <span className="text-gray-600">Medium (2.5-3.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.low }}></div>
          <span className="text-gray-600">Low (&gt;3.5)</span>
        </div>
      </div>

      {/* Issue Examples */}
      {issues.length > 0 && issues[0].examples && issues[0].examples.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Examples</h4>
          <div className="space-y-2">
            {issues[0].examples.slice(0, 3).map((example, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                "{example}"
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingIssuesChart;
