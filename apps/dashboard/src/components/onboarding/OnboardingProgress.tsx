'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OnboardingStatus } from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface OnboardingProgressProps {
  sessionId: string;
  onComplete: () => void;
}

export function OnboardingProgress({ sessionId, onComplete }: OnboardingProgressProps) {
  const [progress, setProgress] = useState(0);

  // Poll session status every 3 seconds
  const { data: session } = useQuery({
    queryKey: ['onboarding', sessionId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/onboarding/sessions/${sessionId}`, {
        credentials: 'include',
      });
      return res.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  useEffect(() => {
    if (!session) return;

    // Update progress based on status
    if (session.status === OnboardingStatus.PROCESSING) {
      setProgress(25);
    } else if (session.status === OnboardingStatus.STRATEGY_READY) {
      setProgress(65);
      // Auto-trigger planner if strategy is ready
      triggerPlanner();
    } else if (session.status === OnboardingStatus.PLANNER_READY) {
      setProgress(100);
      // Wait a moment then complete
      setTimeout(() => onComplete(), 1500);
    } else if (session.status === OnboardingStatus.FAILED) {
      setProgress(0);
    }
  }, [session]);

  const triggerPlanner = async () => {
    try {
      await fetch(`${API_BASE}/onboarding/sessions/${sessionId}/start-planner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Failed to trigger planner:', error);
    }
  };

  const getStatusMessage = () => {
    if (!session) return 'Loading...';

    switch (session.status) {
      case OnboardingStatus.PROCESSING:
        return 'Analyzing your business and generating strategic plan...';
      case OnboardingStatus.STRATEGY_READY:
        return 'Strategy created! Now generating your content calendar, PR pitch, and SEO audit...';
      case OnboardingStatus.PLANNER_READY:
        return 'All done! Your AI-powered strategy is ready.';
      case OnboardingStatus.FAILED:
        return 'Something went wrong. Please try again or contact support.';
      default:
        return 'Processing your information...';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        {/* AI Brain Animation */}
        <div className="mb-8">
          <div className="inline-block p-6 bg-blue-100 rounded-full">
            <svg
              className="w-16 h-16 text-blue-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          SAGE is analyzing your business
        </h2>

        <p className="text-gray-600 mb-8">{getStatusMessage()}</p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-8">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p className="flex items-center justify-center">
            <span className={progress >= 25 ? 'text-green-600 font-semibold' : ''}>
              ✓ Analyzing business context
            </span>
          </p>
          <p className="flex items-center justify-center">
            <span className={progress >= 65 ? 'text-green-600 font-semibold' : ''}>
              {progress >= 65 ? '✓' : '○'} Generating 3-pillar strategy
            </span>
          </p>
          <p className="flex items-center justify-center">
            <span className={progress >= 100 ? 'text-green-600 font-semibold' : ''}>
              {progress >= 100 ? '✓' : '○'} Creating content calendar & deliverables
            </span>
          </p>
        </div>

        {session?.status === OnboardingStatus.FAILED && (
          <div className="mt-8">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
