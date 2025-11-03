// =====================================================
// ANALYTICS COMPONENTS
// Sprint 47 Phase 4.3
// =====================================================
//
// Purpose: Reusable analytics components for agent conversation metrics
// Components: Summary cards, charts, and metric displays
//

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type {
  ConversationSummary,
  SentimentDataPoint,
  TopicData,
  EngagementMetrics,
  ResolutionOutcomes,
} from '../../hooks/useAgentAnalytics';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format time in milliseconds to human-readable format
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// =====================================================
// CONVERSATION SUMMARY CARD
// =====================================================

interface ConversationSummaryCardProps {
  summary: ConversationSummary | null;
  isLoading?: boolean;
}

export const ConversationSummaryCard: React.FC<ConversationSummaryCardProps> = ({
  summary,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const stats = [
    {
      label: 'Total Conversations',
      value: formatNumber(summary.totalConversations),
      icon: '💬',
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      label: 'Total Messages',
      value: formatNumber(summary.totalMessages),
      icon: '📝',
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Avg Response Time',
      value: formatTime(summary.avgResponseTime),
      icon: '⏱️',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Avg Length',
      value: `${summary.avgConversationLength.toFixed(1)}m`,
      icon: '⏳',
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Conversation Summary</h3>
        <div className="text-sm text-gray-500">
          {new Date(summary.dateRange.startDate).toLocaleDateString()} -{' '}
          {new Date(summary.dateRange.endDate).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${stat.color}`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Active:</span>{' '}
            <span className="font-semibold text-green-600">{summary.activeConversations}</span>
          </div>
          <div>
            <span className="text-gray-600">Completed:</span>{' '}
            <span className="font-semibold text-blue-600">{summary.completedConversations}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Messages:</span>{' '}
            <span className="font-semibold text-gray-900">
              {summary.avgMessagesPerConversation.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// SENTIMENT TREND CHART
// =====================================================

interface SentimentTrendChartProps {
  data: SentimentDataPoint[] | null;
  isLoading?: boolean;
}

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No sentiment data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="positive"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            name="Positive"
          />
          <Area
            type="monotone"
            dataKey="neutral"
            stackId="1"
            stroke="#6b7280"
            fill="#6b7280"
            name="Neutral"
          />
          <Area
            type="monotone"
            dataKey="negative"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            name="Negative"
          />
          <Area
            type="monotone"
            dataKey="mixed"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            name="Mixed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// =====================================================
// TOPIC DISTRIBUTION CHART
// =====================================================

interface TopicDistributionChartProps {
  data: TopicData[] | null;
  isLoading?: boolean;
}

export const TopicDistributionChart: React.FC<TopicDistributionChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Topics</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No topic data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Topics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="topic" type="category" width={100} />
          <Tooltip />
          <Bar dataKey="count" fill="#6366f1" name="Mentions" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {data.slice(0, 5).map((topic, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900">#{topic.topic}</span>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{topic.count} mentions</span>
              <span className="text-gray-500">{topic.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================================
// ENGAGEMENT METRICS
// =====================================================

interface EngagementMetricsProps {
  metrics: EngagementMetrics | null;
  isLoading?: boolean;
}

export const EngagementMetricsCard: React.FC<EngagementMetricsProps> = ({
  metrics,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const stats = [
    {
      label: 'Agent Response Time',
      value: formatTime(metrics.avgAgentResponseTime),
      icon: '🤖',
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      label: 'User Response Time',
      value: formatTime(metrics.avgUserResponseTime),
      icon: '👤',
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Message Ratio',
      value: `${metrics.agentUserMessageRatio.toFixed(2)}:1`,
      icon: '📊',
      color: 'text-blue-600 bg-blue-100',
      subtitle: 'Agent:User',
    },
    {
      label: 'Avg Typing Time',
      value: formatTime(metrics.avgTypingTime),
      icon: '⌨️',
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Engagement Metrics</h3>

      <div className="space-y-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${stat.color}`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">{stat.label}</div>
                {stat.subtitle && <div className="text-xs text-gray-500">{stat.subtitle}</div>}
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {metrics.peakActivityHours && metrics.peakActivityHours.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Peak Activity Hours</h4>
          <div className="flex flex-wrap gap-2">
            {metrics.peakActivityHours.map((peak, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
              >
                {peak.hour}:00 ({peak.messageCount} msgs)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// RESOLUTION BREAKDOWN
// =====================================================

interface ResolutionBreakdownProps {
  outcomes: ResolutionOutcomes | null;
  isLoading?: boolean;
}

export const ResolutionBreakdownCard: React.FC<ResolutionBreakdownProps> = ({
  outcomes,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!outcomes) return null;

  const pieData = [
    { name: 'Resolved', value: outcomes.resolved, color: '#10b981' },
    { name: 'Escalated', value: outcomes.escalated, color: '#ef4444' },
    { name: 'Abandoned', value: outcomes.abandoned, color: '#6b7280' },
    { name: 'In Progress', value: outcomes.inProgress, color: '#3b82f6' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Outcomes</h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie Chart */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">{item.value}</span>
                <span className="text-sm text-gray-500">
                  {outcomes.total > 0 ? ((item.value / outcomes.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Resolution Rate:</span>{' '}
            <span className="font-semibold text-green-600">
              {outcomes.resolutionRate.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Avg Time:</span>{' '}
            <span className="font-semibold text-gray-900">
              {outcomes.avgTimeToResolution.toFixed(1)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
