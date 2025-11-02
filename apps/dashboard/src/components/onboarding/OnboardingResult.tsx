'use client';

import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface OnboardingResultProps {
  sessionId: string;
  onActivate: () => void;
}

export function OnboardingResult({ sessionId, onActivate }: OnboardingResultProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ['onboarding', sessionId, 'result'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/onboarding/sessions/${sessionId}/result`, {
        credentials: 'include',
      });
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-center">Loading your results...</div>;
  }

  const strategy = result?.strategy?.plan;
  const planner = result?.planner;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Success Header */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
        <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Strategy is Ready!</h1>
        <p className="text-gray-600">
          SAGE has created a comprehensive PR, Content, and SEO strategy tailored to your business.
        </p>
      </div>

      {/* Strategy Summary */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-blue-600 mb-3">📰 PR Strategy</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Objectives:</strong>
              <ul className="list-disc ml-5 mt-1">
                {strategy?.goals?.[0]?.objectives?.slice(0, 3).map((obj: string, i: number) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-green-600 mb-3">✍️ Content Strategy</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Themes:</strong>
              <ul className="list-disc ml-5 mt-1">
                {strategy?.goals?.[1]?.objectives?.slice(0, 3).map((theme: string, i: number) => (
                  <li key={i}>{theme}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-purple-600 mb-3">🔍 SEO Strategy</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Focus Keywords:</strong>
              <ul className="list-disc ml-5 mt-1">
                {strategy?.goals?.[2]?.objectives?.slice(0, 3).map((kw: string, i: number) => (
                  <li key={i}>{kw}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverables */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Created For You</h2>

        <div className="space-y-4">
          {planner?.result?.contentCalendar?.items?.length > 0 && (
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-bold text-lg mb-2">
                📅 Content Calendar ({planner.result.contentCalendar.items.length} items)
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                Ready-to-publish content pieces scheduled across the next 30 days
              </p>
              <div className="text-sm text-gray-500">
                {planner.result.contentCalendar.items.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="mb-1">• {item.title}</div>
                ))}
                {planner.result.contentCalendar.items.length > 3 && (
                  <div className="text-blue-600">
                    + {planner.result.contentCalendar.items.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {planner?.result?.pressRelease && (
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-lg mb-2">📰 Press Release</h3>
              <p className="text-gray-600 text-sm">{planner.result.pressRelease.title}</p>
            </div>
          )}

          {planner?.result?.seoAudit && (
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-lg mb-2">🔍 SEO Audit</h3>
              <p className="text-gray-600 text-sm">
                Initial audit score: {planner.result.seoAudit.initialScore}/100
              </p>
              <p className="text-sm text-gray-500">
                {planner.result.seoAudit.issues?.length || 0} issues identified,{' '}
                {planner.result.seoAudit.recommendations?.length || 0} recommendations provided
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Ready to Launch?</h2>
        <p className="mb-6 text-blue-100">
          Your AI-powered PR, Content, and SEO strategy is ready to go. Activate your account to access
          your dashboard and start executing.
        </p>
        <button
          onClick={onActivate}
          className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors"
        >
          Activate Account & Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
