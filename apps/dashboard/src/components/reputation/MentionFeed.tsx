import { useState } from 'react';
import { useMediaMentions } from '../../hooks/useReputation';
import type { MentionSearchParams, MentionType, Medium, MentionSentiment } from '@pravado/types';
import { MentionCard } from './MentionCard';

export interface MentionFeedProps {
  organizationId: string;
  initialFilters?: Partial<MentionSearchParams>;
}

export function MentionFeed({ organizationId, initialFilters = {} }: MentionFeedProps) {
  const [filters, setFilters] = useState<MentionSearchParams>({
    limit: 20,
    offset: 0,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
    ...initialFilters,
  });

  const { data, isLoading, error } = useMediaMentions(filters);

  const handleFilterChange = (key: keyof MentionSearchParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset pagination when filters change
    }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
  };

  const clearFilters = () => {
    setFilters({
      limit: 20,
      offset: 0,
      sortBy: 'publishedAt',
      sortOrder: 'desc',
    });
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Failed to load mentions. Please try again.</p>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / (filters.limit || 20)) : 0;
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filter Mentions</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Mention Type Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mention Type
            </label>
            <select
              value={filters.mentionType?.[0] || ''}
              onChange={(e) =>
                handleFilterChange('mentionType', e.target.value ? [e.target.value as MentionType] : undefined)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="BRAND">Brand</option>
              <option value="COMPETITOR">Competitor</option>
              <option value="INDUSTRY">Industry</option>
              <option value="TOPIC">Topic</option>
            </select>
          </div>

          {/* Medium Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Medium
            </label>
            <select
              value={filters.medium?.[0] || ''}
              onChange={(e) =>
                handleFilterChange('medium', e.target.value ? [e.target.value as Medium] : undefined)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Media</option>
              <option value="NEWS">News</option>
              <option value="BLOG">Blog</option>
              <option value="FORUM">Forum</option>
              <option value="SOCIAL">Social</option>
              <option value="PODCAST">Podcast</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>

          {/* Sentiment Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sentiment
            </label>
            <select
              value={filters.sentiment?.[0] || ''}
              onChange={(e) =>
                handleFilterChange('sentiment', e.target.value ? [e.target.value as MentionSentiment] : undefined)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Sentiments</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEUTRAL">Neutral</option>
              <option value="NEGATIVE">Negative</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>

          {/* Viral Only Toggle */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Show Only
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.isViral || false}
                onChange={(e) => handleFilterChange('isViral', e.target.checked || undefined)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Viral Mentions</span>
            </label>
          </div>

          {/* Search Query */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value || undefined)}
              placeholder="Search by title, excerpt, or outlet..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Min Relevance Slider */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Min Relevance: {filters.minRelevance || 0}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minRelevance || 0}
              onChange={(e) => handleFilterChange('minRelevance', parseInt(e.target.value) || undefined)}
              className="w-full"
            />
          </div>

          {/* Min Visibility Slider */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Min Visibility: {filters.minVisibility || 0}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minVisibility || 0}
              onChange={(e) => handleFilterChange('minVisibility', parseInt(e.target.value) || undefined)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {data ? (
            <>
              Showing {data.mentions.length} of {data.total} mentions
            </>
          ) : (
            'Loading...'
          )}
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={filters.sortBy || 'publishedAt'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="publishedAt">Published Date</option>
            <option value="relevanceScore">Relevance</option>
            <option value="visibilityScore">Visibility</option>
            <option value="viralityScore">Virality</option>
            <option value="sentimentScore">Sentiment</option>
          </select>
          <select
            value={filters.sortOrder || 'desc'}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Mentions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : data && data.mentions.length > 0 ? (
        <div className="space-y-4">
          {data.mentions.map((mention) => (
            <MentionCard key={mention.id} mention={mention} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No mentions found matching your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > (filters.limit || 20) && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange((filters.offset || 0) - (filters.limit || 20))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 20))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange((filters.offset || 0) - (filters.limit || 20))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 20))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
