// =====================================================
// AGENT CARD COMPONENT
// =====================================================

import { AgentTemplate } from '@pravado/shared-types';
import { Play, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface AgentCardProps {
  template: AgentTemplate;
  onRun: () => void;
}

export default function AgentCard({ template, onRun }: AgentCardProps) {
  const categoryColors: Record<string, string> = {
    PR: 'bg-blue-100 text-blue-800',
    CONTENT: 'bg-green-100 text-green-800',
    SEO: 'bg-purple-100 text-purple-800',
    RESEARCH: 'bg-orange-100 text-orange-800',
    ANALYSIS: 'bg-pink-100 text-pink-800',
    GENERAL: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
          <span
            className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
              categoryColors[template.category] || categoryColors.GENERAL
            }`}
          >
            {template.category}
          </span>
        </div>
        {template.isPublic && (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            Public
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
        {template.description || 'No description available'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className="text-center">
          <TrendingUp className="h-4 w-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Runs</p>
          <p className="text-sm font-semibold text-gray-900">{template.executionCount}</p>
        </div>
        <div className="text-center">
          <CheckCircle className="h-4 w-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Success</p>
          <p className="text-sm font-semibold text-gray-900">
            {template.successRate ? `${(template.successRate * 100).toFixed(0)}%` : 'N/A'}
          </p>
        </div>
        <div className="text-center">
          <Clock className="h-4 w-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Avg Time</p>
          <p className="text-sm font-semibold text-gray-900">
            {template.avgExecutionTimeMs ? `${(template.avgExecutionTimeMs / 1000).toFixed(1)}s` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500">+{template.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={onRun}
        disabled={!template.isActive}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          template.isActive
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Play className="h-4 w-4" />
        {template.isActive ? 'Run Agent' : 'Inactive'}
      </button>
    </div>
  );
}
