// =====================================================
// PLAN CONTROLS (Admin Component)
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import React from 'react';

const PLAN_TIERS = [
  {
    name: 'Trial',
    tier: 'trial',
    maxDailyCost: '$2.00',
    maxConcurrent: 2,
    providers: ['OpenAI'],
    cacheTTL: '12h',
  },
  {
    name: 'Professional',
    tier: 'pro',
    maxDailyCost: '$100.00',
    maxConcurrent: 10,
    providers: ['OpenAI', 'Anthropic'],
    cacheTTL: '24h',
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    maxDailyCost: '$1,000.00',
    maxConcurrent: 50,
    providers: ['OpenAI', 'Anthropic'],
    cacheTTL: '72h',
  },
];

interface PlanControlsProps {
  organizationId: string;
  currentPlan: string;
  onPlanChange?: (newPlan: string) => void;
}

export function PlanControls({ organizationId, currentPlan, onPlanChange }: PlanControlsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Plan Management</h2>
        <p className="text-gray-600">Manage billing plan for organization {organizationId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLAN_TIERS.map((plan) => (
          <div
            key={plan.tier}
            className={`border-2 rounded-lg p-6 ${
              currentPlan === plan.tier
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {currentPlan === plan.tier && (
                <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                  Current
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Budget</span>
                <span className="font-medium">{plan.maxDailyCost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Concurrent Jobs</span>
                <span className="font-medium">{plan.maxConcurrent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Providers</span>
                <span className="font-medium">{plan.providers.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache TTL</span>
                <span className="font-medium">{plan.cacheTTL}</span>
              </div>
            </div>

            {currentPlan !== plan.tier && onPlanChange && (
              <button
                onClick={() => onPlanChange(plan.tier)}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Switch to {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
