'use client';

// =====================================================
// JOURNALIST MATCHING PAGE
// Sprint 85: Non-Blocking Gap Closure
// =====================================================
// Dedicated route for AI-powered journalist matching and targeting

import { useState } from 'react';
import { usePressReleases } from '@/hooks/usePRCampaigns';
import { JournalistMatchTable } from '@/components/pr/JournalistMatchTable';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function JournalistMatchingPage() {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const { data: pressReleases, isLoading } = usePressReleases();

  const handleAddToPitch = (contactId: string) => {
    console.log('Adding contact to pitch queue:', contactId);
    alert(`Contact ${contactId} added to pitch queue. This would integrate with the pitch workflow.`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Journalist Matching</h1>
        <p className="text-gray-600">
          Get AI-powered journalist recommendations for your press releases. Our matching engine
          analyzes beat coverage, engagement history, and outlet tiers to find the perfect targets.
        </p>
      </div>

      {/* Breadcrumb */}
      <nav className="flex mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <a href="/" className="text-gray-700 hover:text-blue-600">
              Home
            </a>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-500">Journalist Matching</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* About Card */}
      <Card className="p-6 mb-6 bg-purple-50 border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-2">How Matching Works</h3>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 shrink-0">•</span>
            <span>
              <strong>Beat Analysis:</strong> We match journalists based on their coverage areas and interests
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 shrink-0">•</span>
            <span>
              <strong>Engagement History:</strong> Past interactions and response rates influence scoring
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 shrink-0">•</span>
            <span>
              <strong>Tier-Based Targeting:</strong> Prioritize by outlet reach (Tier 1 = national, Tier 2 = regional, Tier 3 = niche)
            </span>
          </li>
        </ul>
      </Card>

      {/* Press Release Selector */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Select a Press Release</h3>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !pressReleases || pressReleases.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-lg mb-2">No press releases found</div>
            <div className="text-sm">
              Create a PR campaign and add press releases to see journalist recommendations
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {pressReleases.slice(0, 10).map((release: any) => (
              <button
                key={release.id}
                onClick={() => setSelectedReleaseId(release.id)}
                className={`w-full text-left p-4 border rounded-lg transition-all ${
                  selectedReleaseId === release.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">{release.title}</div>
                    <div className="text-sm text-gray-600">
                      Campaign: {release.campaignName || release.campaignId}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        release.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : release.status === 'DRAFT'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {release.status}
                    </span>
                    {selectedReleaseId === release.id && (
                      <span className="text-xs text-purple-600 font-medium">Selected</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {pressReleases.length > 10 && (
              <div className="text-sm text-gray-500 text-center pt-2">
                Showing first 10 press releases. Use campaigns page to view all.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Journalist Matches Table */}
      {selectedReleaseId ? (
        <JournalistMatchTable
          pressReleaseId={selectedReleaseId}
          title="Recommended Journalists"
          onAddToPitch={handleAddToPitch}
        />
      ) : (
        <Card className="p-12 text-center text-gray-500">
          <div className="text-lg mb-2">Select a press release above</div>
          <div className="text-sm">to see AI-powered journalist recommendations</div>
        </Card>
      )}
    </div>
  );
}
