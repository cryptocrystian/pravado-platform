// =====================================================
// TRIAL ONBOARDING WIZARD
// Sprint 73: User Onboarding + Trial-to-Paid Conversion Automation
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  useOnboardingState,
  useTrialStatus,
  useCompleteStep,
  useOnboardingProgress,
} from '@/hooks/useOnboarding';
import { useRouter } from 'next/router';

// =====================================================
// TYPES
// =====================================================

interface TrialOnboardingWizardProps {
  organizationId: string;
  onComplete?: () => void;
}

interface StepProps {
  organizationId: string;
  onNext: () => void;
  onPrev?: () => void;
}

// =====================================================
// STEP COMPONENTS
// =====================================================

const Step1OrgSetup: React.FC<StepProps> = ({ organizationId, onNext }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const { mutate: completeStep } = useCompleteStep();

  const handleComplete = () => {
    completeStep(
      { organizationId, stepNumber: 1 },
      {
        onSuccess: () => onNext(),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Pravado</h2>
        <p className="mt-2 text-gray-600">
          Let's get your organization set up. You can invite team members now or skip this step.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invite Team Members (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              onClick={() => {
                // TODO: Implement invite logic
                setInviteEmail('');
              }}
            >
              Send Invite
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Team members will receive an email invitation to join your organization
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const Step2ApiKeys: React.FC<StepProps> = ({ organizationId, onNext, onPrev }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const { mutate: completeStep } = useCompleteStep();

  const handleComplete = () => {
    completeStep(
      { organizationId, stepNumber: 2 },
      {
        onSuccess: () => onNext(),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configure API Keys</h2>
        <p className="mt-2 text-gray-600">
          Connect your AI provider accounts to start using Pravado agents.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Get your API key from{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              platform.openai.com
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anthropic API Key (Optional)
          </label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Get your API key from{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              console.anthropic.com
            </a>
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const Step3FirstAgent: React.FC<StepProps> = ({ organizationId, onNext, onPrev }) => {
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('content_writer');
  const { mutate: completeStep } = useCompleteStep();

  const handleComplete = () => {
    completeStep(
      { organizationId, stepNumber: 3 },
      {
        onSuccess: () => onNext(),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create Your First Agent</h2>
        <p className="mt-2 text-gray-600">
          AI agents automate tasks and workflows. Start with a pre-configured agent template.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="My Content Writer"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Type
          </label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="content_writer">Content Writer</option>
            <option value="data_analyst">Data Analyst</option>
            <option value="customer_support">Customer Support</option>
            <option value="social_media">Social Media Manager</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Content Writer Agent</h4>
          <p className="text-xs text-blue-700">
            Automatically generates blog posts, product descriptions, and marketing copy based on
            your prompts and brand guidelines.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const Step4UsageDemo: React.FC<StepProps> = ({ organizationId, onNext, onPrev }) => {
  const { mutate: completeStep } = useCompleteStep();
  const router = useRouter();

  const handleComplete = () => {
    completeStep(
      { organizationId, stepNumber: 4 },
      {
        onSuccess: () => {
          if (onNext) {
            onNext();
          }
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">You're All Set!</h2>
        <p className="mt-2 text-gray-600">
          Your organization is ready. Here are some quick tips to get started.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">1</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Configure your first agent</h4>
            <p className="text-sm text-gray-600">
              Customize prompts, set up workflows, and define agent personality
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">2</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Run your first job</h4>
            <p className="text-sm text-gray-600">
              Test your agent with a sample task to see it in action
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">3</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Monitor usage and costs</h4>
            <p className="text-sm text-gray-600">
              Track AI spending and performance in your dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <p className="text-sm text-green-800">
          <strong>Trial Active:</strong> You have access to all features during your trial period.
          Monitor your usage in the billing section.
        </p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

// =====================================================
// MAIN WIZARD COMPONENT
// =====================================================

export const TrialOnboardingWizard: React.FC<TrialOnboardingWizardProps> = ({
  organizationId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { data: onboardingState, isLoading } = useOnboardingState(organizationId);
  const { data: trialStatus } = useTrialStatus(organizationId);
  const { data: progress } = useOnboardingProgress(organizationId);

  useEffect(() => {
    if (onboardingState) {
      setCurrentStep(onboardingState.currentStep || 1);
    }
  }, [onboardingState]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (onboardingState?.wizardCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Complete!</h2>
          <p className="text-gray-600 mb-6">You're all set to start using Pravado.</p>
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Trial Status Banner */}
        {trialStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
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
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Trial Active - {trialStatus.daysRemaining} days remaining
                  </p>
                  <p className="text-xs text-blue-700">
                    ${trialStatus.budgetRemaining.toFixed(2)} of $
                    {(trialStatus.budgetRemaining + (onboardingState?.trialBudgetUsedUsd || 0)).toFixed(2)}{' '}
                    budget remaining
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-blue-900">
                  {Math.round(100 - trialStatus.budgetUsedPercent)}% left
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-gray-900">Getting Started</h1>
            <span className="text-sm text-gray-600">
              Step {currentStep} of 4
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep) / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {currentStep === 1 && (
            <Step1OrgSetup organizationId={organizationId} onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <Step2ApiKeys
              organizationId={organizationId}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}
          {currentStep === 3 && (
            <Step3FirstAgent
              organizationId={organizationId}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}
          {currentStep === 4 && (
            <Step4UsageDemo
              organizationId={organizationId}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}
        </div>

        {/* Help Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="/support" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialOnboardingWizard;
