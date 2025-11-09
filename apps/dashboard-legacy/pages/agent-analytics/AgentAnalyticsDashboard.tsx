// =====================================================
// AGENT ANALYTICS DASHBOARD
// Sprint 47 Phase 4.3
// =====================================================
//
// Purpose: Main analytics dashboard for agent conversation insights
// Features: Summary, sentiment, topics, engagement, resolution metrics
//

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useConversationSummary,
  useSentimentTrends,
  useTopicDistribution,
  useEngagementMetrics,
  useResolutionOutcomes,
  DateRange,
} from '../../hooks/useAgentAnalytics';
import {
  ConversationSummaryCard,
  SentimentTrendChart,
  TopicDistributionChart,
  EngagementMetricsCard,
  ResolutionBreakdownCard,
} from './AnalyticsComponents';

// =====================================================
// TYPES
// =====================================================

interface AgentAnalyticsDashboardProps {
  agentId?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const AgentAnalyticsDashboard: React.FC<AgentAnalyticsDashboardProps> = ({
  agentId: propAgentId,
}) => {
  // Get agent ID from props or route params
  const params = useParams<{ agentId?: string }>();
  const agentId = propAgentId || params.agentId || null;

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });

  // Sentiment interval state
  const [sentimentInterval, setSentimentInterval] = useState<'daily' | 'weekly' | 'monthly'>(
    'daily'
  );

  // Fetch analytics data
  const { data: summary, isLoading: summaryLoading } = useConversationSummary(agentId, dateRange);
  const { data: sentimentTrends, isLoading: sentimentLoading } = useSentimentTrends(
    agentId,
    sentimentInterval,
    dateRange
  );
  const { data: topics, isLoading: topicsLoading } = useTopicDistribution(agentId, dateRange, 10);
  const { data: engagement, isLoading: engagementLoading } = useEngagementMetrics(
    agentId,
    dateRange
  );
  const { data: resolution, isLoading: resolutionLoading } = useResolutionOutcomes(
    agentId,
    dateRange
  );

  // Handle date range change
  const handleDateRangeChange = (preset: '7d' | '30d' | '90d' | 'custom') => {
    const now = new Date();
    let startDate: Date;

    switch (preset) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return; // Custom handled separately
    }

    setDateRange({ startDate, endDate: now });
  };

  // No agent ID
  if (!agentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Agent Selected</h2>
          <p className="text-gray-600">Please select an agent to view analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Analytics</h1>
              <p className="text-gray-600 mt-1">
                Conversation insights and performance metrics
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateRangeChange('7d')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('30d')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-indigo-50 border-indigo-300 text-indigo-700"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('90d')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Last 90 Days
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Summary */}
          <ConversationSummaryCard summary={summary} isLoading={summaryLoading} />

          {/* Charts Row 1: Sentiment + Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Interval:</label>
                  <select
                    value={sentimentInterval}
                    onChange={(e) =>
                      setSentimentInterval(e.target.value as 'daily' | 'weekly' | 'monthly')
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <SentimentTrendChart data={sentimentTrends} isLoading={sentimentLoading} />
            </div>

            <TopicDistributionChart data={topics} isLoading={topicsLoading} />
          </div>

          {/* Charts Row 2: Engagement + Resolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EngagementMetricsCard metrics={engagement} isLoading={engagementLoading} />
            <ResolutionBreakdownCard outcomes={resolution} isLoading={resolutionLoading} />
          </div>

          {/* Export/Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Export & Actions</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Download reports or configure alert thresholds
                </p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Export PDF
                </button>
                <button className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Export CSV
                </button>
                <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Configure Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentAnalyticsDashboard;
