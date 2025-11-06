'use client';

// =====================================================
// AGENTS PAGE - Template Listing & Execution
// =====================================================

import { useState } from 'react';
import { useAgentTemplates, useAgentStats } from '@/hooks/useAgents';
import { AgentCategory } from '@pravado/types';
import { Loader2, Sparkles, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import AgentCard from '@/components/agents/AgentCard';
import AgentRunner from '@/components/agents/AgentRunner';

export default function AgentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | undefined>(undefined);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading: templatesLoading } = useAgentTemplates(selectedCategory);
  const { data: stats } = useAgentStats();

  const categories: { value: AgentCategory | undefined; label: string }[] = [
    { value: undefined, label: 'All' },
    { value: 'PR' as AgentCategory, label: 'PR' },
    { value: 'CONTENT' as AgentCategory, label: 'Content' },
    { value: 'SEO' as AgentCategory, label: 'SEO' },
    { value: 'RESEARCH' as AgentCategory, label: 'Research' },
    { value: 'ANALYSIS' as AgentCategory, label: 'Analysis' },
    { value: 'GENERAL' as AgentCategory, label: 'General' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            AI Agents
          </h1>
          <p className="mt-2 text-gray-600">
            Automate tasks with intelligent AI agents powered by GPT-4
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Executions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalExecutions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalExecutions > 0
                      ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failedExecutions}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgExecutionTimeMs
                      ? `${(stats.avgExecutionTimeMs / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {templatesLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {templates.map((template) => (
              <AgentCard
                key={template.id}
                template={template}
                onRun={() => setSelectedTemplateId(template.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No agents found for this category</p>
          </div>
        )}

        {/* Agent Runner Modal */}
        {selectedTemplateId && (
          <AgentRunner templateId={selectedTemplateId} onClose={() => setSelectedTemplateId(null)} />
        )}
      </div>
    </div>
  );
}
