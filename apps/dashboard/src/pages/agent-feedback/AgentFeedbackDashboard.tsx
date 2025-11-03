// =====================================================
// AGENT FEEDBACK DASHBOARD
// Sprint 48 Phase 4.4
// =====================================================

import React, { useState } from 'react';
import {
  useFeedbackSummary,
  useGenerateImprovementPlans,
  useImprovementPlans,
} from '../../hooks/useAgentFeedback';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackStatsCard } from './FeedbackStatsCard';
import { TrendingIssuesChart } from './TrendingIssuesChart';
import { FeedbackHistoryTable } from './FeedbackHistoryTable';
import { ImprovementPlanViewer } from './ImprovementPlanViewer';

interface AgentFeedbackDashboardProps {
  agentId: string;
  userId?: string;
  showFeedbackForm?: boolean;
  messageId?: string;
  conversationId?: string;
  turnId?: string;
}

export const AgentFeedbackDashboard: React.FC<AgentFeedbackDashboardProps> = ({
  agentId,
  userId,
  showFeedbackForm = true,
  messageId,
  conversationId,
  turnId,
}) => {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
  });
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'plans'>('overview');

  // Fetch feedback summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useFeedbackSummary(agentId, dateRange.start, dateRange.end);

  // Fetch improvement plans
  const {
    data: plans = [],
    isLoading: isPlansLoading,
    refetch: refetchPlans,
  } = useImprovementPlans(agentId);

  // Generate improvement plans mutation
  const generatePlans = useGenerateImprovementPlans({
    onSuccess: () => {
      refetchPlans();
      alert('Improvement plans generated successfully!');
    },
    onError: (error) => {
      alert(`Failed to generate plans: ${error.message}`);
    },
  });

  const handleGeneratePlans = () => {
    if (confirm('Generate new improvement plans based on recent feedback? This may take a moment.')) {
      generatePlans.mutate({ agentId, lookbackDays: 30 });
    }
  };

  const handleFeedbackSuccess = () => {
    setShowForm(false);
    refetchSummary();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Feedback Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Continuous improvement through feedback analysis
              </p>
            </div>
            {showFeedbackForm && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showForm ? 'Hide Form' : 'Submit Feedback'}
              </button>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="mt-6 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <select
              onChange={(e) => {
                const days = parseInt(e.target.value);
                setDateRange({
                  start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                  end: new Date(),
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30" selected>Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feedback Form */}
        {showForm && (
          <div className="mb-8">
            <FeedbackForm
              agentId={agentId}
              messageId={messageId}
              conversationId={conversationId}
              turnId={turnId}
              userId={userId}
              onSuccess={handleFeedbackSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Feedback History
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'plans'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Improvement Plans
                {plans.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                    {plans.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FeedbackStatsCard metrics={summary?.metrics || null} isLoading={isSummaryLoading} />
              <TrendingIssuesChart issues={summary?.trendingIssues || []} isLoading={isSummaryLoading} />
            </div>

            {/* Improvement Opportunities */}
            {summary?.improvementOpportunities && summary.improvementOpportunities.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Improvement Opportunities</h3>
                  <button
                    onClick={handleGeneratePlans}
                    disabled={generatePlans.isPending}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatePlans.isPending ? 'Generating...' : 'Generate Plans'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {summary.improvementOpportunities.map((opportunity, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-500 mt-0.5">⚠️</span>
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Feedback Preview */}
            {summary?.recentFeedback && summary.recentFeedback.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {summary.recentFeedback.slice(0, 5).map((feedback) => (
                    <div key={feedback.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {feedback.rating.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {feedback.categories.slice(0, 2).map((cat) => (
                            <span key={cat} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {cat.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      {feedback.notes && (
                        <p className="text-sm text-gray-600 line-clamp-2">{feedback.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <FeedbackHistoryTable
            feedback={summary?.recentFeedback || []}
            isLoading={isSummaryLoading}
          />
        )}

        {activeTab === 'plans' && (
          <ImprovementPlanViewer
            plans={plans}
            isLoading={isPlansLoading}
            onGeneratePlans={handleGeneratePlans}
            isGenerating={generatePlans.isPending}
          />
        )}
      </div>
    </div>
  );
};

export default AgentFeedbackDashboard;
