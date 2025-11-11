'use client';

// =====================================================
// MEDIA OPPORTUNITIES PAGE
// Sprint 85: Non-Blocking Gap Closure
// =====================================================
// Dedicated route for media opportunity scanning and management

import { OpportunityList } from '@/components/pr/OpportunityList';
import { Card } from '@/components/ui/card';

export default function MediaOpportunitiesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Media Opportunities</h1>
        <p className="text-gray-600">
          Discover and track relevant media opportunities for your PR campaigns. Our AI scans news
          sources to find stories where your expertise or perspective could add value.
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
              <span className="text-gray-500">Media Opportunities</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* About Card */}
      <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">•</span>
            <span>
              <strong>AI-Powered Scanning:</strong> We continuously monitor news sources and identify stories relevant to your expertise
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">•</span>
            <span>
              <strong>Smart Scoring:</strong> Each opportunity is scored based on relevance, visibility, and freshness
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 shrink-0">•</span>
            <span>
              <strong>Quick Actions:</strong> Review, add to campaigns, or dismiss opportunities with one click
            </span>
          </li>
        </ul>
      </Card>

      {/* Main Opportunity List */}
      <OpportunityList showStats={true} />
    </div>
  );
}
