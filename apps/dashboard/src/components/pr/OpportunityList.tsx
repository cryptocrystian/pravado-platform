'use client';

import { useState } from 'react';
import {
  useMediaOpportunities,
  useScanOpportunities,
  useUpdateOpportunityStatus,
  useOpportunityStats,
  type ListOpportunitiesFilters,
} from '@/hooks/useMediaOpportunities';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface OpportunityListProps {
  filters?: ListOpportunitiesFilters;
  title?: string;
  showStats?: boolean;
}

export function OpportunityList({
  filters,
  title = 'Media Opportunities',
  showStats = true,
}: OpportunityListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(filters?.status);
  const [selectedMinScore, setSelectedMinScore] = useState<number>(filters?.minScore || 50);

  const queryFilters: ListOpportunitiesFilters = {
    ...filters,
    status: selectedStatus as any,
    minScore: selectedMinScore,
  };

  const { data: opportunities, isLoading } = useMediaOpportunities(queryFilters);
  const { data: stats } = useOpportunityStats();
  const scanMutation = useScanOpportunities();

  const handleScan = async () => {
    try {
      await scanMutation.mutateAsync({
        minScore: selectedMinScore,
      });
    } catch (error) {
      console.error('Failed to scan opportunities:', error);
      alert('Failed to scan for opportunities. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800';
      case 'REVIEWED':
        return 'bg-purple-100 text-purple-800';
      case 'ADDED_TO_CAMPAIGN':
        return 'bg-green-100 text-green-800';
      case 'DISMISSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">New</div>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Reviewed</div>
            <div className="text-2xl font-bold text-purple-600">{stats.reviewed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">In Campaign</div>
            <div className="text-2xl font-bold text-green-600">{stats.addedToCampaign}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Avg Score</div>
            <div className="text-2xl font-bold">{Math.round(stats.averageScore)}</div>
          </Card>
        </div>
      )}

      {/* Main Card */}
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button
            onClick={handleScan}
            disabled={scanMutation.isPending}
            variant="default"
          >
            {scanMutation.isPending ? 'Scanning...' : 'Scan Now'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div>
            <label className="text-sm text-gray-600 mr-2">Status:</label>
            <select
              value={selectedStatus || ''}
              onChange={(e) => setSelectedStatus(e.target.value || undefined)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ADDED_TO_CAMPAIGN">Added to Campaign</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mr-2">Min Score:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={selectedMinScore}
              onChange={(e) => setSelectedMinScore(parseInt(e.target.value) || 0)}
              className="border rounded px-3 py-1 text-sm w-20"
            />
          </div>
        </div>

        {/* Opportunities List */}
        {!opportunities || opportunities.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-lg mb-2">No opportunities found</div>
            <div className="text-sm">Try scanning for new opportunities or adjusting your filters</div>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                getScoreColor={getScoreColor}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// =====================================================
// OPPORTUNITY CARD COMPONENT
// =====================================================

interface OpportunityCardProps {
  opportunity: any;
  getScoreColor: (score: number) => string;
  getStatusColor: (status: string) => string;
}

function OpportunityCard({ opportunity, getScoreColor, getStatusColor }: OpportunityCardProps) {
  const updateStatusMutation = useUpdateOpportunityStatus(opportunity.id);

  const handleUpdateStatus = async (newStatus: 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED') => {
    try {
      await updateStatusMutation.mutateAsync({ status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title and Source */}
          <div className="flex items-start gap-2 mb-2">
            <a
              href={opportunity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline flex-1"
            >
              {opportunity.title}
            </a>
            <span
              className={`text-xs px-2 py-1 rounded border shrink-0 ${getScoreColor(
                opportunity.opportunityScore
              )}`}
            >
              {opportunity.opportunityScore}
            </span>
          </div>

          {/* Source and Date */}
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
            <span className="font-medium">{opportunity.source}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(opportunity.publishedAt), { addSuffix: true })}
            </span>
          </div>

          {/* Match Reasons */}
          {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
            <div className="space-y-1 mb-3">
              {opportunity.matchReasons.map((reason: string, idx: number) => (
                <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 shrink-0">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Score Breakdown */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Relevance: {opportunity.relevanceScore}</span>
            <span>Visibility: {opportunity.visibilityScore}</span>
            <span>Freshness: {opportunity.freshnessScore}</span>
          </div>

          {/* Keywords */}
          {opportunity.keywords && opportunity.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {opportunity.keywords.slice(0, 5).map((keyword: string, idx: number) => (
                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {keyword}
                </span>
              ))}
              {opportunity.keywords.length > 5 && (
                <span className="text-xs text-gray-500">+{opportunity.keywords.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(opportunity.status)}`}>
            {opportunity.status.replace('_', ' ')}
          </span>

          {opportunity.status === 'NEW' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus('REVIEWED')}
                disabled={updateStatusMutation.isPending}
              >
                Mark Reviewed
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleUpdateStatus('ADDED_TO_CAMPAIGN')}
                disabled={updateStatusMutation.isPending}
              >
                Add to Campaign
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleUpdateStatus('DISMISSED')}
                disabled={updateStatusMutation.isPending}
              >
                Dismiss
              </Button>
            </>
          )}

          {opportunity.status === 'REVIEWED' && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleUpdateStatus('ADDED_TO_CAMPAIGN')}
                disabled={updateStatusMutation.isPending}
              >
                Add to Campaign
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleUpdateStatus('DISMISSED')}
                disabled={updateStatusMutation.isPending}
              >
                Dismiss
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
