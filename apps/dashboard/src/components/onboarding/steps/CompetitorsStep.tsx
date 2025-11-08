'use client';

import { useState, FormEvent } from 'react';

export interface Competitor {
  name: string;
  website: string;
  strengths: string;
}

export interface CompetitorsData {
  competitors: Competitor[];
  marketPosition: 'LEADER' | 'CHALLENGER' | 'FOLLOWER' | 'NICHE';
  uniqueValueProposition: string;
}

interface CompetitorsStepProps {
  initialData?: Partial<CompetitorsData>;
  onNext: (data: CompetitorsData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

export function CompetitorsStep({
  initialData,
  onNext,
  onBack,
  isSubmitting,
}: CompetitorsStepProps) {
  const [formData, setFormData] = useState<CompetitorsData>({
    competitors: initialData?.competitors || [
      { name: '', website: '', strengths: '' },
    ],
    marketPosition: initialData?.marketPosition || 'CHALLENGER',
    uniqueValueProposition: initialData?.uniqueValueProposition || '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Filter out empty competitors
    const validCompetitors = formData.competitors.filter(
      (c) => c.name.trim() !== ''
    );
    onNext({ ...formData, competitors: validCompetitors });
  };

  const handleCompetitorChange = (
    index: number,
    field: keyof Competitor,
    value: string
  ) => {
    const updatedCompetitors = [...formData.competitors];
    updatedCompetitors[index] = { ...updatedCompetitors[index], [field]: value };
    setFormData((prev) => ({ ...prev, competitors: updatedCompetitors }));
  };

  const addCompetitor = () => {
    setFormData((prev) => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', website: '', strengths: '' }],
    }));
  };

  const removeCompetitor = (index: number) => {
    if (formData.competitors.length > 1) {
      const updatedCompetitors = formData.competitors.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, competitors: updatedCompetitors }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Competitive Landscape</h2>
        <p className="text-sm text-muted-foreground">
          Help us understand your competitive positioning
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">
              Key Competitors
            </label>
            <button
              type="button"
              onClick={addCompetitor}
              disabled={isSubmitting}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              + Add Competitor
            </button>
          </div>

          <div className="space-y-4">
            {formData.competitors.map((competitor, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Competitor {index + 1}
                  </span>
                  {formData.competitors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCompetitor(index)}
                      disabled={isSubmitting}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={competitor.name}
                  onChange={(e) =>
                    handleCompetitorChange(index, 'name', e.target.value)
                  }
                  placeholder="Competitor name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                />

                <input
                  type="url"
                  value={competitor.website}
                  onChange={(e) =>
                    handleCompetitorChange(index, 'website', e.target.value)
                  }
                  placeholder="https://competitor.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                />

                <input
                  type="text"
                  value={competitor.strengths}
                  onChange={(e) =>
                    handleCompetitorChange(index, 'strengths', e.target.value)
                  }
                  placeholder="Their key strengths"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="marketPosition"
            className="block text-sm font-medium mb-1.5"
          >
            Market Position <span className="text-red-500">*</span>
          </label>
          <select
            id="marketPosition"
            required
            value={formData.marketPosition}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                marketPosition: e.target.value as CompetitorsData['marketPosition'],
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="LEADER">Market Leader</option>
            <option value="CHALLENGER">Challenger</option>
            <option value="FOLLOWER">Follower</option>
            <option value="NICHE">Niche Player</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="uniqueValueProposition"
            className="block text-sm font-medium mb-1.5"
          >
            Unique Value Proposition <span className="text-red-500">*</span>
          </label>
          <textarea
            id="uniqueValueProposition"
            required
            rows={4}
            value={formData.uniqueValueProposition}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                uniqueValueProposition: e.target.value,
              }))
            }
            placeholder="What makes your business unique? What value do you provide that competitors don't?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
