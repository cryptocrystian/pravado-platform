/**
 * Trial to Paid Funnel Component
 *
 * Displays trial-to-paid conversion funnel with steps and conversion rates.
 * Shows drop-off points and overall conversion percentage.
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

'use client';

import { FunnelStep } from '@/hooks/useAdminMetrics';

export interface TrialToPaidProps {
  funnel: FunnelStep[] | undefined;
  totalConversions: number | undefined;
  loading?: boolean;
}

export function TrialToPaid({ funnel, totalConversions, loading }: TrialToPaidProps) {
  if (loading || !funnel || funnel.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trial → Paid Funnel</h3>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const maxCount = funnel[0]?.count || 1; // First step is usually the largest

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Trial → Paid Funnel</h3>
          <p className="text-sm text-gray-500 mt-1">Conversion stages and drop-off analysis</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{totalConversions || 0}</p>
          <p className="text-sm text-gray-500">Total Conversions</p>
        </div>
      </div>

      <div className="space-y-3">
        {funnel.map((step, index) => {
          const widthPercent = (step.count / maxCount) * 100;
          const isFirstStep = index === 0;
          const isLastStep = index === funnel.length - 1;
          const previousStep = index > 0 ? funnel[index - 1] : null;
          const dropOff = previousStep ? previousStep.count - step.count : 0;
          const dropOffPercent = previousStep ? ((dropOff / previousStep.count) * 100).toFixed(1) : '0.0';

          return (
            <div key={index}>
              {/* Drop-off indicator */}
              {!isFirstStep && dropOff > 0 && (
                <div className="flex items-center gap-2 ml-4 mb-1">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-400"></div>
                  <span className="text-xs text-red-600 font-medium">
                    {dropOff.toLocaleString()} dropped ({dropOffPercent}%)
                  </span>
                </div>
              )}

              {/* Funnel step */}
              <div className="relative">
                <div className="flex items-center gap-4">
                  {/* Step number */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isLastStep
                        ? 'bg-green-100 text-green-800 border-2 border-green-500'
                        : 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Step bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{step.step}</span>
                      <span className="text-sm font-semibold text-gray-700">{step.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className={`h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-500 ${
                          isLastStep ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {step.conversion_rate_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Started Trials</p>
            <p className="text-lg font-semibold text-gray-900">{funnel[0]?.count.toLocaleString() || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completed Trials</p>
            <p className="text-lg font-semibold text-gray-900">
              {funnel[funnel.length - 2]?.count.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Converted to Paid</p>
            <p className="text-lg font-semibold text-green-600">
              {funnel[funnel.length - 1]?.count.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {funnel.length >= 2 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Insight:</span> Overall conversion rate from trial start to paid customer is{' '}
            <span className="font-bold">{funnel[funnel.length - 1]?.conversion_rate_percent.toFixed(1)}%</span>.
            {funnel[funnel.length - 1]?.conversion_rate_percent >= 30 ? (
              <span className="text-green-700"> This is excellent! 🎉</span>
            ) : funnel[funnel.length - 1]?.conversion_rate_percent >= 20 ? (
              <span className="text-yellow-700"> This is good, but there's room for improvement.</span>
            ) : (
              <span className="text-red-700"> Consider optimizing your trial experience.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default TrialToPaid;
