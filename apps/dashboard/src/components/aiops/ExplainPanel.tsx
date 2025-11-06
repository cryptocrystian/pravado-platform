// ===================================================
// EXPLAIN PANEL COMPONENT
// Sprint 70: LLM Insights & Explainability Layer
// ===================================================

import React from 'react';
import {
  useLatestExplanation,
  useDecisionHistory,
  type ExplainabilityReport,
} from '@/hooks/useAIOpsAnalytics';

interface ExplainPanelProps {
  organizationId: string;
}

export function ExplainPanel({ organizationId }: ExplainPanelProps) {
  const { data: latestExplanation, isLoading, error } = useLatestExplanation(organizationId);
  const { data: history } = useDecisionHistory(organizationId, { limit: 10 });

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading decision explanation...</div>;
  }

  if (error || !latestExplanation) {
    return <div className="p-6 text-red-500">No recent decisions found</div>;
  }

  const { decision, explanation, insights } = latestExplanation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">Latest Model Selection</h2>
        <p className="text-gray-600">
          {decision.selectedProvider}:{decision.selectedModel} • ${decision.estimatedCost.toFixed(6)}
        </p>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Primary Factor</div>
          <div className="text-2xl font-bold text-blue-900">{insights.primaryFactor}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Cost Efficiency</div>
          <div className="text-2xl font-bold text-green-900">{insights.costEfficiency}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Alternatives</div>
          <div className="text-2xl font-bold text-purple-900">{insights.alternativesConsidered}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-medium">Filtered</div>
          <div className="text-2xl font-bold text-orange-900">{insights.modelsFiltered}</div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Decision Rationale</h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded">
          {explanation}
        </pre>
      </div>

      {/* Recent History */}
      {history && history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Decisions</h3>
          <div className="space-y-2">
            {history.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{log.selectedProvider}:{log.selectedModel}</div>
                  <div className="text-sm text-gray-600">{log.taskCategory}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">${log.estimatedCost.toFixed(6)}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
