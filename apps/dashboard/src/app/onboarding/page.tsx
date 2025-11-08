'use client';

import { useState, useEffect } from 'react';
import { OnboardingStatus } from '@pravado/types';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingResult } from '@/components/onboarding/OnboardingResult';
import { useOnboarding } from '@/hooks/useOnboarding';

// Feature flag: ONBOARDING_V2 (default: true)
const ONBOARDING_V2_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_V2 !== 'false';

export default function OnboardingPage() {
  // Feature flag check
  if (!ONBOARDING_V2_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Onboarding Temporarily Unavailable
          </h2>
          <p className="text-gray-600 mb-6">
            We're currently updating our onboarding experience. Please check back soon or contact
            support for assistance.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }
  const {
    session,
    isLoading,
    createSession,
    saveIntakeResponse,
    startProcessing,
  } = useOnboarding();

  const [currentView, setCurrentView] = useState<'wizard' | 'processing' | 'complete'>('wizard');

  useEffect(() => {
    // Determine which view to show based on session status
    if (session) {
      if (
        session.status === OnboardingStatus.COMPLETED ||
        session.status === OnboardingStatus.PLANNER_READY
      ) {
        setCurrentView('complete');
      } else if (
        session.status === OnboardingStatus.PROCESSING ||
        session.status === OnboardingStatus.STRATEGY_READY
      ) {
        setCurrentView('processing');
      } else {
        setCurrentView('wizard');
      }
    }
  }, [session]);

  // Create session on mount if none exists
  useEffect(() => {
    if (!session && !isLoading) {
      // TODO: Replace with actual user/org IDs from auth context
      createSession({
        organizationId: 'placeholder-org-id',
        userId: 'placeholder-user-id',
      });
    }
  }, [session, isLoading, createSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Unable to start onboarding</h2>
          <p className="text-gray-600">
            Please ensure your organization is on a trial plan and hasn't completed onboarding yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Pravado</h1>
          <p className="mt-2 text-gray-600">
            Let's set up your AI-powered PR, Content, and SEO strategy
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'wizard' && (
          <OnboardingWizard
            session={session}
            onSaveResponse={saveIntakeResponse}
            onComplete={async () => {
              await startProcessing();
              setCurrentView('processing');
            }}
          />
        )}

        {currentView === 'processing' && (
          <OnboardingProgress
            sessionId={session.id}
            onComplete={() => setCurrentView('complete')}
          />
        )}

        {currentView === 'complete' && (
          <OnboardingResult
            sessionId={session.id}
            onActivate={() => {
              window.location.href = '/dashboard';
            }}
          />
        )}
      </div>
    </div>
  );
}
