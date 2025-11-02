import { useState } from 'react';
import type { MediaMention } from '@pravado/shared-types';
import { MentionFeedback } from './MentionFeedback';
import { useSimilarMentions } from '../../hooks/useReputation';

export interface MentionCardProps {
  mention: MediaMention;
  showFeedback?: boolean;
  showSimilar?: boolean;
}

export function MentionCard({ mention, showFeedback = true, showSimilar = false }: MentionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSimilarMentions, setShowSimilarMentions] = useState(false);

  const { data: similarMentions, isLoading: loadingSimilar } = useSimilarMentions(
    showSimilarMentions ? mention.id : null,
    5
  );

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'bg-green-100 text-green-800';
      case 'NEGATIVE':
        return 'bg-red-100 text-red-800';
      case 'NEUTRAL':
        return 'bg-gray-100 text-gray-800';
      case 'MIXED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMentionTypeColor = (type: string) => {
    switch (type) {
      case 'BRAND':
        return 'bg-blue-100 text-blue-800';
      case 'COMPETITOR':
        return 'bg-purple-100 text-purple-800';
      case 'INDUSTRY':
        return 'bg-indigo-100 text-indigo-800';
      case 'TOPIC':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${getMentionTypeColor(mention.mentionType)}`}>
              {mention.mentionType}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              {mention.medium}
            </span>
            {mention.sentiment && (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getSentimentColor(mention.sentiment)}`}>
                {mention.sentiment}
              </span>
            )}
            {mention.isViral && (
              <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-800">
                🔥 Viral
              </span>
            )}
          </div>

          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            <a
              href={mention.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600"
            >
              {mention.title}
            </a>
          </h3>

          <div className="flex items-center space-x-3 text-sm text-gray-600">
            {mention.outlet && <span>{mention.outlet}</span>}
            {mention.author && <span>by {mention.author}</span>}
            <span>{formatDate(mention.publishedAt)}</span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Excerpt */}
      {mention.excerpt && (
        <p className="mb-3 text-sm text-gray-700 line-clamp-2">
          {mention.excerpt}
        </p>
      )}

      {/* Scores */}
      <div className="mb-3 flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-1">
          <span className="text-gray-600">Relevance:</span>
          <span className={`font-semibold ${getScoreColor(mention.relevanceScore)}`}>
            {mention.relevanceScore.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-gray-600">Visibility:</span>
          <span className={`font-semibold ${getScoreColor(mention.visibilityScore)}`}>
            {mention.visibilityScore.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-gray-600">Virality:</span>
          <span className={`font-semibold ${getScoreColor(mention.viralityScore)}`}>
            {mention.viralityScore.toFixed(0)}
          </span>
        </div>
        {mention.sentimentScore !== null && (
          <div className="flex items-center space-x-1">
            <span className="text-gray-600">Sentiment Score:</span>
            <span className={`font-semibold ${mention.sentimentScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {mention.sentimentScore.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Entity Tags */}
      {mention.entityTags && mention.entityTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {mention.entityTags.slice(0, 8).map((tag, idx) => (
            <span
              key={idx}
              className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              {tag}
            </span>
          ))}
          {mention.entityTags.length > 8 && (
            <span className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600">
              +{mention.entityTags.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
          {/* Additional Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {mention.tone && (
              <div>
                <span className="font-medium text-gray-700">Tone:</span>
                <span className="ml-2 text-gray-600">{mention.tone}</span>
              </div>
            )}
            {mention.stance && (
              <div>
                <span className="font-medium text-gray-700">Stance:</span>
                <span className="ml-2 text-gray-600">{mention.stance}</span>
              </div>
            )}
            {mention.emotion && (
              <div>
                <span className="font-medium text-gray-700">Emotion:</span>
                <span className="ml-2 text-gray-600">{mention.emotion}</span>
              </div>
            )}
            {mention.confidenceScore !== null && mention.confidenceScore !== undefined && (
              <div>
                <span className="font-medium text-gray-700">Confidence:</span>
                <span className="ml-2 text-gray-600">{(mention.confidenceScore * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>

          {/* Detected Entities */}
          {mention.detectedEntities && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Detected Entities</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {mention.detectedEntities.brands && mention.detectedEntities.brands.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Brands:</p>
                    <p className="text-sm text-gray-600">{mention.detectedEntities.brands.join(', ')}</p>
                  </div>
                )}
                {mention.detectedEntities.competitors && mention.detectedEntities.competitors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Competitors:</p>
                    <p className="text-sm text-gray-600">{mention.detectedEntities.competitors.join(', ')}</p>
                  </div>
                )}
                {mention.detectedEntities.products && mention.detectedEntities.products.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Products:</p>
                    <p className="text-sm text-gray-600">{mention.detectedEntities.products.join(', ')}</p>
                  </div>
                )}
                {mention.detectedEntities.people && mention.detectedEntities.people.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">People:</p>
                    <p className="text-sm text-gray-600">{mention.detectedEntities.people.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Similar Mentions */}
          {showSimilar && (
            <div>
              <button
                onClick={() => setShowSimilarMentions(!showSimilarMentions)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {showSimilarMentions ? 'Hide' : 'Show'} Similar Mentions
              </button>

              {showSimilarMentions && (
                <div className="mt-3 space-y-2">
                  {loadingSimilar ? (
                    <div className="text-sm text-gray-600">Loading similar mentions...</div>
                  ) : similarMentions && similarMentions.length > 0 ? (
                    similarMentions.map((similar) => (
                      <div
                        key={similar.id}
                        className="rounded-md border border-gray-200 bg-gray-50 p-2"
                      >
                        <a
                          href={similar.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {similar.title}
                        </a>
                        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-600">
                          <span>{similar.outlet}</span>
                          <span>•</span>
                          <span>Similarity: {(similar.similarity * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">No similar mentions found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 border-t border-gray-200 pt-3">
            <a
              href={mention.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Source
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Feedback Component */}
          {showFeedback && (
            <div className="border-t border-gray-200 pt-3">
              <MentionFeedback mentionId={mention.id} organizationId={mention.organizationId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
