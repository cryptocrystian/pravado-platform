/**
 * Revenue Trends Chart Component
 *
 * Displays MRR historical trends with a simple line chart.
 * Shows MRR growth over time with net new MRR.
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

'use client';

import { RevenueTrend } from '@/hooks/useAdminMetrics';

export interface RevenueTrendsProps {
  trends: RevenueTrend[] | undefined;
  loading?: boolean;
}

export function RevenueTrends({ trends, loading }: RevenueTrendsProps) {
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading || !trends || trends.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const mrrValues = trends.map((t) => t.mrr);
  const maxMrr = Math.max(...mrrValues);
  const minMrr = Math.min(...mrrValues);
  const mrrRange = maxMrr - minMrr || 1; // Avoid division by zero

  // Generate path for MRR line
  const mrrPath = trends
    .map((trend, i) => {
      const x = padding.left + (i / (trends.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((trend.mrr - minMrr) / mrrRange) * chartHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Calculate grid lines
  const yAxisSteps = 5;
  const yAxisLines = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = minMrr + (mrrRange * i) / yAxisSteps;
    const y = padding.top + chartHeight - (i / yAxisSteps) * chartHeight;
    return { y, value };
  });

  // X-axis labels (show every nth point to avoid crowding)
  const xAxisSteps = Math.min(5, trends.length);
  const xAxisInterval = Math.floor(trends.length / xAxisSteps);
  const xAxisLabels = trends
    .filter((_, i) => i % xAxisInterval === 0 || i === trends.length - 1)
    .map((trend, i, arr) => {
      const originalIndex = trends.indexOf(trend);
      const x = padding.left + (originalIndex / (trends.length - 1)) * chartWidth;
      return { x, label: formatDate(trend.date) };
    });

  const latestMrr = trends[trends.length - 1]?.mrr || 0;
  const previousMrr = trends[Math.max(0, trends.length - 2)]?.mrr || 0;
  const mrrChange = latestMrr - previousMrr;
  const mrrChangePercent = previousMrr > 0 ? (mrrChange / previousMrr) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly Recurring Revenue (MRR) over time</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(latestMrr)}</p>
          <p
            className={`text-sm font-medium ${
              mrrChangePercent > 0 ? 'text-green-600' : mrrChangePercent < 0 ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {mrrChangePercent > 0 ? '↑' : mrrChangePercent < 0 ? '↓' : '→'} {formatCurrency(Math.abs(mrrChange))} (
            {Math.abs(mrrChangePercent).toFixed(1)}%)
          </p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {yAxisLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={padding.left - 10} y={line.y + 4} textAnchor="end" fontSize="12" fill="#6b7280">
              {formatCurrency(line.value)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xAxisLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {label.label}
          </text>
        ))}

        {/* MRR line */}
        <path d={mrrPath} stroke="#3b82f6" strokeWidth="2" fill="none" />

        {/* Data points */}
        {trends.map((trend, i) => {
          const x = padding.left + (i / (trends.length - 1)) * chartWidth;
          const y = padding.top + chartHeight - ((trend.mrr - minMrr) / mrrRange) * chartHeight;
          return (
            <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6">
              <title>{`${formatDate(trend.date)}: ${formatCurrency(trend.mrr)}`}</title>
            </circle>
          );
        })}

        {/* Area fill */}
        <path
          d={`${mrrPath} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${
            padding.top + chartHeight
          } Z`}
          fill="url(#gradient)"
          opacity="0.2"
        />

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-gray-200 pt-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Daily Growth</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {formatCurrency(mrrChange / trends.length)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Growth</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {formatCurrency(trends[trends.length - 1]?.mrr - trends[0]?.mrr)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Data Points</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{trends.length} days</p>
        </div>
      </div>
    </div>
  );
}

export default RevenueTrends;
