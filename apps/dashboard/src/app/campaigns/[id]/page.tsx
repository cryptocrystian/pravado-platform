'use client';

import { use } from 'react';
import { useCampaign, useCampaignStats, usePressReleases, useUpdateCampaign } from '@/hooks/usePRCampaigns';
import { CampaignStatus } from '@pravado/shared-types';
import Link from 'next/link';
import { formatDistance } from 'date-fns';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: campaign, isLoading: campaignLoading } = useCampaign(id);
  const { data: stats } = useCampaignStats(id);
  const { data: releases } = usePressReleases({ campaignId: id });
  const updateMutation = useUpdateCampaign(id);

  const handleStatusChange = async (status: CampaignStatus) => {
    try {
      await updateMutation.mutateAsync({ status });
    } catch (error) {
      alert('Failed to update campaign status. Please try again.');
    }
  };

  if (campaignLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Campaign not found.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: CampaignStatus) => {
    const styles = {
      PLANNED: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/campaigns" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Campaigns
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-gray-600 max-w-3xl">{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(campaign.status)}
            <select
              value={campaign.status}
              onChange={(e) => handleStatusChange(e.target.value as CampaignStatus)}
              disabled={updateMutation.isPending}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(CampaignStatus).map((status) => (
                <option key={status} value={status}>
                  Change to {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Campaign Goal */}
      {campaign.goal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-2">Campaign Goal</h2>
          <p className="text-blue-700">{campaign.goal}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Releases</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalReleases}</div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Pitches Sent</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalPitches}</div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Open Rate</div>
            <div className="text-3xl font-bold text-gray-900">
              {(stats.openRate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Coverage Pieces</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalCoverage}</div>
            {campaign.targetCoveragePieces && (
              <div className="text-xs text-gray-500 mt-1">
                Target: {campaign.targetCoveragePieces}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Opens</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalOpens}</div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Clicks</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalClicks}</div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Replies</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalReplies}</div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Coverage Rate</div>
            <div className="text-3xl font-bold text-gray-900">
              {(stats.coverageRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details */}
      <div className="bg-white border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Campaign Details</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-gray-600">Start Date</div>
            <div className="text-gray-900">
              {campaign.startDate
                ? new Date(campaign.startDate).toLocaleDateString()
                : 'Not set'}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-600">End Date</div>
            <div className="text-gray-900">
              {campaign.endDate
                ? new Date(campaign.endDate).toLocaleDateString()
                : 'Not set'}
            </div>
          </div>

          {campaign.budget && (
            <div>
              <div className="text-sm font-medium text-gray-600">Budget</div>
              <div className="text-gray-900">
                {campaign.budget.toLocaleString()} {campaign.currency}
              </div>
            </div>
          )}

          {campaign.targetImpressions && (
            <div>
              <div className="text-sm font-medium text-gray-600">Target Impressions</div>
              <div className="text-gray-900">{campaign.targetImpressions.toLocaleString()}</div>
            </div>
          )}

          <div>
            <div className="text-sm font-medium text-gray-600">Created</div>
            <div className="text-gray-900">
              {formatDistance(new Date(campaign.createdAt), new Date(), { addSuffix: true })}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-600">Last Updated</div>
            <div className="text-gray-900">
              {formatDistance(new Date(campaign.updatedAt), new Date(), { addSuffix: true })}
            </div>
          </div>
        </div>

        {campaign.notes && (
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Notes</div>
            <div className="text-gray-900 whitespace-pre-wrap">{campaign.notes}</div>
          </div>
        )}
      </div>

      {/* Press Releases */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Press Releases</h2>
          <Link
            href={`/campaigns/${id}/releases/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Release
          </Link>
        </div>

        {releases && releases.length > 0 ? (
          <div className="space-y-4">
            {releases.map((release) => (
              <Link
                key={release.id}
                href={`/releases/${release.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{release.title}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      release.status === 'SENT'
                        ? 'bg-green-100 text-green-800'
                        : release.status === 'SENDING'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {release.status}
                  </span>
                </div>

                {release.aiSummary && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{release.aiSummary}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {release.pitchCount} pitches
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    {release.openCount} opens
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    {release.replyCount} replies
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {release.coverageCount} coverage
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No press releases</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first press release for this campaign.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
