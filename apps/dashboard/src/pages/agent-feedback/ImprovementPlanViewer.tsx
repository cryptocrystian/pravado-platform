// =====================================================
// IMPROVEMENT PLAN VIEWER COMPONENT
// Sprint 48 Phase 4.4
// =====================================================

import React, { useState } from 'react';
import type { ImprovementPlan, ImprovementPriority, ImprovementStatus } from '@pravado/types';

interface ImprovementPlanViewerProps {
  plans: ImprovementPlan[];
  isLoading?: boolean;
  onGeneratePlans?: () => void;
  isGenerating?: boolean;
}

const PRIORITY_CONFIG: Record<ImprovementPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' },
};

const STATUS_CONFIG: Record<ImprovementStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const ImprovementPlanViewer: React.FC<ImprovementPlanViewerProps> = ({
  plans,
  isLoading,
  onGeneratePlans,
  isGenerating,
}) => {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ImprovementStatus | 'all'>('all');

  const filteredPlans = statusFilter === 'all'
    ? plans
    : plans.filter((plan) => plan.status === statusFilter);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Improvement Plans</h3>
            <p className="text-sm text-gray-500 mt-1">
              GPT-4 generated recommendations based on feedback analysis
            </p>
          </div>
          {onGeneratePlans && (
            <button
              onClick={onGeneratePlans}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Generating...
                </>
              ) : (
                <>
                  <span>🤖</span>
                  Generate Plans
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <div className="flex gap-2">
            {(['all', 'pending', 'in_progress', 'completed', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md text-sm ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="p-6">
        {filteredPlans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No improvement plans found.</p>
            {onGeneratePlans && (
              <button
                onClick={onGeneratePlans}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate Plans
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const isExpanded = expandedPlan === plan.id;
              const priorityConfig = PRIORITY_CONFIG[plan.priority];
              const statusConfig = STATUS_CONFIG[plan.status];

              return (
                <div key={plan.id} className="border rounded-lg overflow-hidden">
                  {/* Plan Header */}
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{plan.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                      <button className="ml-4 text-gray-400 hover:text-gray-600">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                      <span>Category: <span className="font-medium">{plan.category.replace(/_/g, ' ')}</span></span>
                      <span>Expected Impact: <span className="font-medium">+{plan.estimatedImpact.expectedRatingIncrease.toFixed(2)}</span> rating</span>
                      <span>Affects: <span className="font-medium">{plan.estimatedImpact.affectedInteractions}</span> interactions</span>
                    </div>
                  </div>

                  {/* Plan Details */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t">
                      {/* Reasoning */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">Reasoning</h5>
                        <p className="text-sm text-gray-700">{plan.reasoning}</p>
                      </div>

                      {/* Proposed Changes */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">
                          Proposed Changes ({plan.proposedChanges.length})
                        </h5>
                        <div className="space-y-3">
                          {plan.proposedChanges.map((change, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                    {change.type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Confidence:</span>
                                  <span className={`text-xs font-semibold ${
                                    change.confidence >= 0.8 ? 'text-green-600' :
                                    change.confidence >= 0.6 ? 'text-yellow-600' :
                                    'text-orange-600'
                                  }`}>
                                    {(change.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Target:</span>
                                  <p className="text-gray-600 mt-1">{change.target}</p>
                                </div>

                                {change.currentValue && (
                                  <div>
                                    <span className="font-medium text-gray-700">Current:</span>
                                    <p className="text-gray-600 mt-1 font-mono text-xs bg-white p-2 rounded">
                                      {change.currentValue}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <span className="font-medium text-gray-700">Proposed:</span>
                                  <p className="text-gray-600 mt-1 font-mono text-xs bg-white p-2 rounded">
                                    {change.proposedValue}
                                  </p>
                                </div>

                                <div>
                                  <span className="font-medium text-gray-700">Rationale:</span>
                                  <p className="text-gray-600 mt-1">{change.rationale}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metadata */}
                      {plan.metadata && (
                        <div className="pt-4 border-t">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Feedback Sample:</span>
                              <p className="font-semibold text-gray-900">
                                {plan.metadata.feedbackSampleSize || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Overall Confidence:</span>
                              <p className="font-semibold text-gray-900">
                                {plan.metadata.confidence ? `${(plan.metadata.confidence * 100).toFixed(0)}%` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Generated:</span>
                              <p className="font-semibold text-gray-900">
                                {new Date(plan.generatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovementPlanViewer;
