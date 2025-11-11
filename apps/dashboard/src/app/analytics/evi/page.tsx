'use client';

// =====================================================
// EVI ANALYTICS PAGE
// Sprint 85: Non-Blocking Gap Closure
// =====================================================
// Dedicated route for Exposure Visibility Index (EVI) analytics and tracking

import { usePRCampaigns } from '@/hooks/usePRCampaigns';
import { EviCard } from '@/components/analytics/EviCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function EVIAnalyticsPage() {
  const { data: campaigns, isLoading } = usePRCampaigns();

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          EVI Analytics
        </h1>
        <p className="text-gray-600">
          Exposure Visibility Index (EVI) measures the reach and impact of your PR campaigns.
          Track performance across media reach, engagement, sentiment, and outlet quality.
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
              <a href="/analytics" className="text-gray-700 hover:text-blue-600">
                Analytics
              </a>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-500">EVI</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* About Card */}
      <Card className="p-6 mb-6 bg-indigo-50 border-indigo-200">
        <h3 className="font-semibold text-indigo-900 mb-2">Understanding EVI</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-indigo-800">
          <div>
            <h4 className="font-medium mb-2">EVI Components:</h4>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0">•</span>
                <span><strong>Media Reach:</strong> Audience size of outlets covering your story</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0">•</span>
                <span><strong>Engagement Rate:</strong> How audiences interact with coverage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0">•</span>
                <span><strong>Sentiment Score:</strong> Positive vs negative coverage tone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 shrink-0">•</span>
                <span><strong>Tier Quality:</strong> Outlet reputation and authority</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Grade Scale:</h4>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium">A</span>
                <span>Exceptional (90-100)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">B</span>
                <span>Strong (80-89)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">C</span>
                <span>Average (70-79)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-medium">D</span>
                <span>Below Average (60-69)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">F</span>
                <span>Poor (&lt;60)</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Organization-Level EVI */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Organization Performance</h2>
        <EviCard />
      </div>

      {/* Campaign-Level EVIs */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Campaign Performance</h2>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <div className="text-lg mb-2">No campaigns found</div>
            <div className="text-sm">Create PR campaigns to start tracking EVI metrics</div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="space-y-2">
                <div className="px-4 py-2 bg-gray-50 rounded-t border-x border-t">
                  <div className="font-medium text-gray-900 truncate" title={campaign.name}>
                    {campaign.name}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        campaign.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </div>
                <EviCard campaignId={campaign.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <Card className="p-6 mt-8 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Improving Your EVI Score</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">1.</span>
            <span>
              <strong>Target Tier 1 outlets</strong> for maximum reach and credibility boost
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">2.</span>
            <span>
              <strong>Personalize pitches</strong> to increase journalist engagement rates
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">3.</span>
            <span>
              <strong>Monitor sentiment</strong> and respond quickly to negative coverage
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">4.</span>
            <span>
              <strong>Track trends</strong> to identify what messaging resonates with media
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
