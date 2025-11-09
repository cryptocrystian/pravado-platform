// =====================================================
// FEEDBACK HISTORY TABLE COMPONENT
// Sprint 48 Phase 4.4
// =====================================================

import React, { useState, useMemo } from 'react';
import type { AgentFeedbackEntry, FeedbackRating } from '@pravado/types';

interface FeedbackHistoryTableProps {
  feedback: AgentFeedbackEntry[];
  isLoading?: boolean;
}

const RATING_DISPLAY: Record<FeedbackRating, { label: string; icon: string; color: string }> = {
  thumbs_up: { label: 'Thumbs Up', icon: '👍', color: 'text-green-600' },
  thumbs_down: { label: 'Thumbs Down', icon: '👎', color: 'text-red-600' },
  star_1: { label: '1 Star', icon: '⭐', color: 'text-red-600' },
  star_2: { label: '2 Stars', icon: '⭐⭐', color: 'text-orange-600' },
  star_3: { label: '3 Stars', icon: '⭐⭐⭐', color: 'text-yellow-600' },
  star_4: { label: '4 Stars', icon: '⭐⭐⭐⭐', color: 'text-blue-600' },
  star_5: { label: '5 Stars', icon: '⭐⭐⭐⭐⭐', color: 'text-green-600' },
};

export const FeedbackHistoryTable: React.FC<FeedbackHistoryTableProps> = ({ feedback, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<FeedbackRating | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort feedback
  const filteredFeedback = useMemo(() => {
    let result = [...feedback];

    // Search filter
    if (searchTerm) {
      result = result.filter((entry) =>
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.categories.some((cat) => cat.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      result = result.filter((entry) => entry.rating === ratingFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        // Sort by rating (convert to numeric)
        const ratingValue = (rating: FeedbackRating): number => {
          if (rating === 'thumbs_up') return 5;
          if (rating === 'thumbs_down') return 1;
          return parseInt(rating.split('_')[1]);
        };
        const ratingA = ratingValue(a.rating);
        const ratingB = ratingValue(b.rating);
        return sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA;
      }
    });

    return result;
  }, [feedback, searchTerm, ratingFilter, sortBy, sortOrder]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Feedback History</h3>
        <p className="text-sm text-gray-500 mt-1">
          {filteredFeedback.length} of {feedback.length} feedback entries
        </p>
      </div>

      {/* Filters */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search notes or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Ratings</option>
              <option value="thumbs_up">👍 Thumbs Up</option>
              <option value="thumbs_down">👎 Thumbs Down</option>
              <option value="star_5">⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value="star_4">⭐⭐⭐⭐ 4 Stars</option>
              <option value="star_3">⭐⭐⭐ 3 Stars</option>
              <option value="star_2">⭐⭐ 2 Stars</option>
              <option value="star_1">⭐ 1 Star</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="rating">Rating</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredFeedback.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No feedback found matching your filters.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFeedback.map((entry) => {
                const ratingInfo = RATING_DISPLAY[entry.rating];
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.createdAt).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-2 ${ratingInfo.color}`}>
                        <span className="text-lg">{ratingInfo.icon.split('')[0]}</span>
                        <span className="text-sm font-medium">{ratingInfo.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {entry.categories.map((category) => (
                          <span
                            key={category}
                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {category.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.notes ? (
                        <div className="max-w-md">
                          <p className="line-clamp-2">{entry.notes}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No notes</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.isAnonymous ? (
                        <span className="italic">Anonymous</span>
                      ) : (
                        <span>{entry.createdBy || 'Unknown'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FeedbackHistoryTable;
