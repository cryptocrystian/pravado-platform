'use client';

import { useState } from 'react';
import {
  useJournalistMatching,
  type JournalistMatchingFilters,
} from '@/hooks/useJournalistMatching';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface JournalistMatchTableProps {
  pressReleaseId: string | null;
  title?: string;
  onAddToPitch?: (contactId: string) => void;
}

export function JournalistMatchTable({
  pressReleaseId,
  title = 'Recommended Journalists',
  onAddToPitch,
}: JournalistMatchTableProps) {
  const [filters, setFilters] = useState<JournalistMatchingFilters>({
    minScore: 60,
    limit: 50,
  });

  const { data: matches, isLoading, error } = useJournalistMatching(pressReleaseId, filters);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'TIER_1':
        return 'bg-purple-100 text-purple-800';
      case 'TIER_2':
        return 'bg-blue-100 text-blue-800';
      case 'TIER_3':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 font-bold';
    if (score >= 75) return 'text-blue-600 font-semibold';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="text-center text-red-500 py-12">
          Failed to load journalist matches. Please try again.
        </div>
      </Card>
    );
  }

  if (!pressReleaseId) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-12">
          Select a press release to see journalist recommendations
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-sm text-gray-600">
          {matches?.length || 0} matches found
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div>
          <label className="text-sm text-gray-600 mr-2">Min Score:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={filters.minScore || 0}
            onChange={(e) =>
              setFilters({ ...filters, minScore: parseInt(e.target.value) || 0 })
            }
            className="border rounded px-3 py-1 text-sm w-20"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 mr-2">Tier:</label>
          <select
            value={filters.tier || ''}
            onChange={(e) => setFilters({ ...filters, tier: e.target.value || undefined })}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="">All Tiers</option>
            <option value="TIER_1">Tier 1</option>
            <option value="TIER_2">Tier 2</option>
            <option value="TIER_3">Tier 3</option>
            <option value="UNTIERED">Untiered</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="text-sm text-gray-600 mr-2">Outlet:</label>
          <input
            type="text"
            placeholder="Filter by outlet..."
            value={filters.outlet || ''}
            onChange={(e) => setFilters({ ...filters, outlet: e.target.value || undefined })}
            className="border rounded px-3 py-1 text-sm w-full max-w-xs"
          />
        </div>
      </div>

      {/* Table */}
      {!matches || matches.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <div className="text-lg mb-2">No matching journalists found</div>
          <div className="text-sm">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Outlet
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Tier
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Match Score
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Match Reasons
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.contactId} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{match.contactName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-700">{match.contactOutlet}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getTierColor(match.contactTier)}`}
                    >
                      {match.contactTier.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`text-lg ${getScoreColor(match.matchScore)}`}>
                      {Math.round(match.matchScore)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1 max-w-md">
                      {match.matchReasons.slice(0, 3).map((reason, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-gray-600 flex items-start gap-2"
                        >
                          <span className="text-green-600 shrink-0">✓</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                      {match.matchReasons.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{match.matchReasons.length - 3} more reasons
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      size="sm"
                      onClick={() => onAddToPitch?.(match.contactId)}
                      disabled={!onAddToPitch}
                    >
                      Add to Pitch Queue
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {matches && matches.length > 0 && (
        <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </div>
          <div>
            Average Score:{' '}
            <span className="font-medium">
              {Math.round(
                matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length
              )}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
