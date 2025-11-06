// =====================================================
// UPGRADE PROMPT
// Sprint 73: User Onboarding + Trial-to-Paid Conversion Automation
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  useUpgradePrompt,
  useTrialStatus,
  useCreateCheckoutLink,
} from '@/hooks/useOnboarding';

// =====================================================
// TYPES
// =====================================================

interface UpgradePromptProps {
  organizationId: string;
  mode?: 'banner' | 'modal';
  onDismiss?: () => void;
}

interface TierCardProps {
  name: string;
  price: string;
  features: string[];
  isRecommended?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

// =====================================================
// TIER COMPARISON CARD
// =====================================================

const TierCard: React.FC<TierCardProps> = ({
  name,
  price,
  features,
  isRecommended,
  onSelect,
  isLoading,
}) => {
  return (
    <div
      className={`relative rounded-lg border-2 p-6 ${
        isRecommended
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Recommended
          </span>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          {price !== 'Custom' && <span className="text-gray-600">/month</span>}
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <svg
              className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          isRecommended
            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-50'
        }`}
      >
        {isLoading ? 'Loading...' : 'Select Plan'}
      </button>
    </div>
  );
};

// =====================================================
// UPGRADE PROMPT BANNER
// =====================================================

const UpgradeBanner: React.FC<{
  reason: string;
  daysRemaining: number;
  budgetPercent: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}> = ({ reason, daysRemaining, budgetPercent, onUpgrade, onDismiss }) => {
  const getSeverityColor = () => {
    if (budgetPercent >= 95 || daysRemaining <= 1) {
      return 'bg-red-50 border-red-200 text-red-900';
    }
    if (budgetPercent >= 80 || daysRemaining <= 2) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-900';
    }
    return 'bg-blue-50 border-blue-200 text-blue-900';
  };

  const getIcon = () => {
    if (budgetPercent >= 95 || daysRemaining <= 1) {
      return (
        <svg
          className="w-5 h-5 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-5 h-5 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  };

  return (
    <div className={`rounded-lg border p-4 ${getSeverityColor()}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="flex-1">
            <p className="font-medium">{reason}</p>
            <p className="text-sm mt-0.5">
              Upgrade now to continue using Pravado without interruption
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Upgrade Now
          </button>
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// UPGRADE MODAL
// =====================================================

const UpgradeModal: React.FC<{
  organizationId: string;
  reason: string;
  onClose: () => void;
}> = ({ organizationId, reason, onClose }) => {
  const { mutate: createCheckoutLink, isPending } = useCreateCheckoutLink();
  const [selectedTier, setSelectedTier] = useState<'pro' | 'enterprise' | null>(null);

  const handleSelectTier = (tier: 'pro' | 'enterprise') => {
    setSelectedTier(tier);
    createCheckoutLink(
      {
        organizationId,
        tier,
        successUrl: `${window.location.origin}/dashboard/billing/success`,
        cancelUrl: `${window.location.origin}/dashboard/billing`,
      },
      {
        onSuccess: (checkoutUrl) => {
          // Redirect to Stripe Checkout
          window.location.href = checkoutUrl;
        },
        onError: (error: any) => {
          console.error('Failed to create checkout link:', error);
          alert('Failed to create checkout link. Please try again.');
          setSelectedTier(null);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
            <p className="text-sm text-gray-600 mt-1">{reason}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tier Comparison */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <TierCard
              name="Pro"
              price="$99"
              features={[
                'Unlimited AI agent executions',
                'GPT-4, Claude 3.5, and more models',
                'Advanced analytics dashboard',
                'Priority email support',
                'Custom workflows & automation',
                'API access',
                '10 team members',
              ]}
              isRecommended={true}
              onSelect={() => handleSelectTier('pro')}
              isLoading={isPending && selectedTier === 'pro'}
            />

            <TierCard
              name="Enterprise"
              price="Custom"
              features={[
                'Everything in Pro',
                'Dedicated account manager',
                '24/7 phone & chat support',
                'Custom model fine-tuning',
                'On-premise deployment option',
                'Advanced security & compliance',
                'Unlimited team members',
                'Custom SLA',
              ]}
              onSelect={() => handleSelectTier('enterprise')}
              isLoading={isPending && selectedTier === 'enterprise'}
            />
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              All plans include a 30-day money-back guarantee.{' '}
              <a href="/pricing" className="text-blue-600 hover:underline">
                Compare plans
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// MAIN UPGRADE PROMPT COMPONENT
// =====================================================

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  organizationId,
  mode = 'banner',
  onDismiss,
}) => {
  const { data: upgradePrompt } = useUpgradePrompt(organizationId);
  const { data: trialStatus } = useTrialStatus(organizationId);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem(`upgrade-prompt-dismissed-${organizationId}`);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const hoursSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      // Re-show after 24 hours
      if (hoursSinceDismiss < 24) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(`upgrade-prompt-dismissed-${organizationId}`);
      }
    }
  }, [organizationId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`upgrade-prompt-dismissed-${organizationId}`, Date.now().toString());
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleUpgrade = () => {
    if (mode === 'banner') {
      setShowModal(true);
    }
  };

  // Don't show if dismissed or no upgrade needed
  if (isDismissed || !upgradePrompt?.shouldPrompt || !trialStatus) {
    return null;
  }

  if (mode === 'modal') {
    return (
      <UpgradeModal
        organizationId={organizationId}
        reason={upgradePrompt.reason || 'Your trial is ending soon'}
        onClose={() => {
          handleDismiss();
        }}
      />
    );
  }

  return (
    <>
      <UpgradeBanner
        reason={upgradePrompt.reason || 'Trial limit approaching'}
        daysRemaining={trialStatus.daysRemaining}
        budgetPercent={trialStatus.budgetUsedPercent}
        onUpgrade={handleUpgrade}
        onDismiss={handleDismiss}
      />

      {showModal && (
        <UpgradeModal
          organizationId={organizationId}
          reason={upgradePrompt.reason || 'Your trial is ending soon'}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default UpgradePrompt;
