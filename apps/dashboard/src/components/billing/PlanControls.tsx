/**
 * Plan Controls Component
 *
 * In-app billing management widget showing current plan, usage caps,
 * remaining quota, and upgrade CTAs for next tier.
 *
 * Integrated with Stripe checkout for plan changes.
 *
 * Sprint 75 - Track B: Validated Pricing Rollout
 */

'use client';

import { useCurrentPlan, useUsageStatus, useStartCheckout, useBillingPortal, type PlanTier } from '@/hooks/usePlans';

export function PlanControls() {
  const { data: currentPlan, isLoading: planLoading } = useCurrentPlan();
  const { data: usage, isLoading: usageLoading } = useUsageStatus();
  const { mutate: startCheckout, isPending: isCheckoutLoading } = useStartCheckout();
  const { mutate: openBillingPortal, isPending: isPortalLoading } = useBillingPortal();

  const handleUpgrade = (tier: PlanTier) => {
    if (!currentPlan) return;

    startCheckout(
      { tier, billingCycle: currentPlan.billing_cycle },
      {
        onSuccess: (data) => {
          window.location.href = data.url;
        },
        onError: (error) => {
          alert(`Failed to start checkout: ${error.message}`);
        },
      }
    );
  };

  const handleManageBilling = () => {
    openBillingPortal(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: (error) => {
        alert(`Failed to open billing portal: ${error.message}`);
      },
    });
  };

  const getNextTier = (current: PlanTier): PlanTier | null => {
    const tierOrder: PlanTier[] = ['starter', 'pro', 'premium', 'enterprise'];
    const currentIndex = tierOrder.indexOf(current);
    return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
  };

  if (planLoading || usageLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">No active plan found.</p>
      </div>
    );
  }

  const nextTier = getNextTier(currentPlan.tier);
  const hasUsageWarnings = usage?.some((u) => u.is_approaching_limit || u.is_at_limit) || false;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">{currentPlan.tier} Plan</h3>
            <p className="text-sm text-gray-600 mt-1">
              ${currentPlan.monthly_price_usd.toLocaleString()}/month
              {currentPlan.billing_cycle === 'annual' && ' (billed annually)'}
            </p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={isPortalLoading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {isPortalLoading ? 'Loading...' : 'Manage Billing'}
          </button>
        </div>

        {/* Trial or Status Badge */}
        {currentPlan.status === 'trialing' && currentPlan.trial_ends_at && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Trial active:</span> Ends on{' '}
              {new Date(currentPlan.trial_ends_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {currentPlan.status === 'past_due' && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-900">
              <span className="font-semibold">Payment overdue:</span> Update your payment method to continue service.
            </p>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      {usage && usage.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Feature Usage</h4>
          <div className="space-y-4">
            {usage.slice(0, 5).map((item, index) => {
              const percentage = item.utilization_percent || 0;
              const isWarning = item.is_approaching_limit;
              const isMaxed = item.is_at_limit;

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.feature}</span>
                    <span className="text-sm text-gray-600">
                      {item.used.toLocaleString()}
                      {item.limit !== null ? ` / ${item.limit.toLocaleString()}` : ' (unlimited)'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isMaxed
                          ? 'bg-red-500'
                          : isWarning
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>
                  {isMaxed && (
                    <p className="text-xs text-red-600 mt-1">Limit reached - upgrade to continue</p>
                  )}
                  {isWarning && !isMaxed && (
                    <p className="text-xs text-yellow-600 mt-1">Approaching limit ({percentage.toFixed(0)}% used)</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {nextTier && hasUsageWarnings && (
        <div className="p-6 bg-blue-50">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Ready to grow?</h4>
          <p className="text-sm text-blue-800 mb-4">
            You're approaching your {currentPlan.tier} plan limits. Upgrade to {nextTier} for more capacity and
            features.
          </p>
          <button
            onClick={() => handleUpgrade(nextTier)}
            disabled={isCheckoutLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckoutLoading ? 'Loading...' : `Upgrade to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}`}
          </button>
        </div>
      )}

      {nextTier && !hasUsageWarnings && (
        <div className="p-6">
          <button
            onClick={() => handleUpgrade(nextTier)}
            disabled={isCheckoutLoading}
            className="w-full py-2 px-4 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckoutLoading ? 'Loading...' : `Upgrade to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default PlanControls;
