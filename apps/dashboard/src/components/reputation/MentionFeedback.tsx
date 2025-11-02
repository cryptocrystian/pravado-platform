import { useState } from 'react';
import { useSubmitFeedback } from '../../hooks/useReputation';
import type { FeedbackType, MentionSentiment } from '@pravado/shared-types';

export interface MentionFeedbackProps {
  mentionId: string;
  organizationId: string;
}

export function MentionFeedback({ mentionId, organizationId }: MentionFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('CORRECTION');
  const [correctedSentiment, setCorrectedSentiment] = useState<MentionSentiment | ''>('');
  const [correctedRelevance, setCorrectedRelevance] = useState<string>('');
  const [notes, setNotes] = useState('');

  const submitFeedbackMutation = useSubmitFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const feedbackData: any = {
      mentionId,
      organizationId,
      feedbackType,
      notes: notes || undefined,
    };

    if (feedbackType === 'CORRECTION') {
      if (correctedSentiment) {
        feedbackData.correctedSentiment = correctedSentiment;
      }
      if (correctedRelevance) {
        feedbackData.correctedRelevanceScore = parseFloat(correctedRelevance);
      }
    }

    try {
      await submitFeedbackMutation.mutateAsync(feedbackData);
      // Reset form
      setFeedbackType('CORRECTION');
      setCorrectedSentiment('');
      setCorrectedRelevance('');
      setNotes('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-gray-600 hover:text-gray-900"
      >
        <span className="flex items-center space-x-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span>Provide Feedback</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Submit Feedback</h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Feedback Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Feedback Type
          </label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setFeedbackType('CORRECTION')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                feedbackType === 'CORRECTION'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
              }`}
            >
              Correction
            </button>
            <button
              type="button"
              onClick={() => setFeedbackType('PRAISE')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                feedbackType === 'PRAISE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
              }`}
            >
              Praise
            </button>
            <button
              type="button"
              onClick={() => setFeedbackType('SUGGESTION')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                feedbackType === 'SUGGESTION'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
              }`}
            >
              Suggestion
            </button>
          </div>
        </div>

        {/* Correction Fields */}
        {feedbackType === 'CORRECTION' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Corrected Sentiment (Optional)
              </label>
              <select
                value={correctedSentiment}
                onChange={(e) => setCorrectedSentiment(e.target.value as MentionSentiment | '')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select sentiment...</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="NEGATIVE">Negative</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Corrected Relevance Score (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={correctedRelevance}
                onChange={(e) => setCorrectedRelevance(e.target.value)}
                placeholder="0-100"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes {feedbackType === 'CORRECTION' ? '(Optional)' : '(Required)'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            required={feedbackType !== 'CORRECTION'}
            placeholder={
              feedbackType === 'CORRECTION'
                ? 'Explain what was incorrect...'
                : feedbackType === 'PRAISE'
                ? 'What did we do well?'
                : 'How can we improve?'
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitFeedbackMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>

        {/* Error Message */}
        {submitFeedbackMutation.isError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            Failed to submit feedback. Please try again.
          </div>
        )}

        {/* Success Message */}
        {submitFeedbackMutation.isSuccess && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Thank you for your feedback! It will help improve our AI analysis.
          </div>
        )}
      </form>
    </div>
  );
}
