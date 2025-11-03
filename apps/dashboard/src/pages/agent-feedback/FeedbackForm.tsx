// =====================================================
// FEEDBACK FORM COMPONENT
// Sprint 48 Phase 4.4
// =====================================================

import React, { useState } from 'react';
import { useSubmitFeedback } from '../../hooks/useAgentFeedback';
import type { AgentFeedbackInput, FeedbackRating, FeedbackScope } from '@pravado/shared-types';

interface FeedbackFormProps {
  agentId: string;
  messageId?: string;
  conversationId?: string;
  turnId?: string;
  userId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RATING_OPTIONS: { value: FeedbackRating; label: string; icon: string }[] = [
  { value: 'thumbs_down' as FeedbackRating, label: 'Thumbs Down', icon: '👎' },
  { value: 'thumbs_up' as FeedbackRating, label: 'Thumbs Up', icon: '👍' },
];

const STAR_RATINGS: { value: FeedbackRating; label: string }[] = [
  { value: 'star_1' as FeedbackRating, label: '1 Star' },
  { value: 'star_2' as FeedbackRating, label: '2 Stars' },
  { value: 'star_3' as FeedbackRating, label: '3 Stars' },
  { value: 'star_4' as FeedbackRating, label: '4 Stars' },
  { value: 'star_5' as FeedbackRating, label: '5 Stars' },
];

const CATEGORY_OPTIONS: { value: FeedbackScope; label: string; description: string }[] = [
  { value: 'response_quality' as FeedbackScope, label: 'Response Quality', description: 'Overall quality of the response' },
  { value: 'tone' as FeedbackScope, label: 'Tone', description: 'Friendliness and professionalism' },
  { value: 'accuracy' as FeedbackScope, label: 'Accuracy', description: 'Correctness of information' },
  { value: 'helpfulness' as FeedbackScope, label: 'Helpfulness', description: 'How useful the response was' },
  { value: 'speed' as FeedbackScope, label: 'Speed', description: 'Response time' },
  { value: 'understanding' as FeedbackScope, label: 'Understanding', description: 'How well the agent understood' },
  { value: 'relevance' as FeedbackScope, label: 'Relevance', description: 'Relevance to the question' },
  { value: 'completeness' as FeedbackScope, label: 'Completeness', description: 'Thoroughness of the answer' },
  { value: 'professionalism' as FeedbackScope, label: 'Professionalism', description: 'Professional demeanor' },
  { value: 'other' as FeedbackScope, label: 'Other', description: 'Other feedback' },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  agentId,
  messageId,
  conversationId,
  turnId,
  userId,
  onSuccess,
  onCancel,
}) => {
  const [ratingType, setRatingType] = useState<'thumbs' | 'stars'>('thumbs');
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [categories, setCategories] = useState<FeedbackScope[]>([]);
  const [notes, setNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const submitFeedback = useSubmitFeedback({
    onSuccess: () => {
      // Reset form
      setRating(null);
      setCategories([]);
      setNotes('');
      setIsAnonymous(false);
      onSuccess?.();
    },
    onError: (error) => {
      alert(`Failed to submit feedback: ${error.message}`);
    },
  });

  const handleCategoryToggle = (category: FeedbackScope) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating) {
      alert('Please select a rating');
      return;
    }

    if (categories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    const feedback: AgentFeedbackInput = {
      agentId,
      messageId,
      conversationId,
      turnId,
      rating,
      categories,
      notes: notes.trim() || undefined,
      userId: isAnonymous ? undefined : userId,
      isAnonymous,
    };

    submitFeedback.mutate(feedback);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Submit Feedback</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating Type
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setRatingType('thumbs');
                setRating(null);
              }}
              className={`px-4 py-2 rounded-md ${
                ratingType === 'thumbs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Thumbs Up/Down
            </button>
            <button
              type="button"
              onClick={() => {
                setRatingType('stars');
                setRating(null);
              }}
              className={`px-4 py-2 rounded-md ${
                ratingType === 'stars'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Star Rating
            </button>
          </div>
        </div>

        {/* Rating Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Rating *
          </label>

          {ratingType === 'thumbs' ? (
            <div className="flex gap-4">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRating(option.value)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md border-2 transition-all ${
                    rating === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {STAR_RATINGS.map((star) => (
                <button
                  key={star.value}
                  type="button"
                  onClick={() => setRating(star.value)}
                  className={`px-4 py-2 rounded-md border transition-all ${
                    rating === star.value
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {'⭐'.repeat(parseInt(star.value.split('_')[1]))}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Categories * (select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((category) => (
              <label
                key={category.value}
                className="flex items-start gap-2 p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={categories.includes(category.value)}
                  onChange={() => handleCategoryToggle(category.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{category.label}</div>
                  <div className="text-xs text-gray-500">{category.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share any specific feedback, suggestions, or details..."
          />
        </div>

        {/* Anonymous Option */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Submit anonymously</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={submitFeedback.isPending}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitFeedback.isPending || !rating || categories.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
