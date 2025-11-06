'use client';

import { useState, useEffect } from 'react';
import { IntakeStep, OnboardingStatus } from '@pravado/types';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingResult } from '@/components/onboarding/OnboardingResult';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingPage() {
  const {
    session,
    isLoading,
    createSession,
    saveIntakeResponse,
    startProcessing,
    getResult,
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
      createSession();
    }
  }, []);

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
              await startProcessing(session.id);
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
