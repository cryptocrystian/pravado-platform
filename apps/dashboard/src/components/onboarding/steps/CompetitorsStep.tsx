'use client';

import { useState } from 'react';
import { CompetitiveInfoSchema } from '@pravado/shared-types';

interface CompetitorsStepProps {
  initialData?: any;
  onNext: (data: any) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

export function CompetitorsStep({ initialData, onNext, onBack, isSubmitting }: CompetitorsStepProps) {
  const [formData, setFormData] = useState({
    competitors: initialData?.competitors || [{ name: '', website: '', strengths: '' }],
    marketPosition: initialData?.marketPosition || '',
    uniqueValueProposition: initialData?.uniqueValueProposition || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = CompetitiveInfoSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onNext(result.data);
  };

  const addCompetitor = () => {
    setFormData((prev) => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', website: '', strengths: '' }],
    }));
  };

  const removeCompetitor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };

  const updateCompetitor = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Competitors * (Add at least one)
        </label>
        {formData.competitors.map((competitor, index) => (
          <div key={index} className="border rounded-lg p-4 mb-3">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <input
                type="text"
                placeholder="Competitor Name *"
                value={competitor.name}
                onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="url"
                placeholder="Website (optional)"
                value={competitor.website}
                onChange={(e) => updateCompetitor(index, 'website', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <textarea
              placeholder="Their strengths (optional)"
              value={competitor.strengths}
              onChange={(e) => updateCompetitor(index, 'strengths', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={2}
            />
            {formData.competitors.length > 1 && (
              <button
                type="button"
                onClick={() => removeCompetitor(index)}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addCompetitor}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + Add another competitor
        </button>
        {errors.competitors && <p className="mt-1 text-sm text-red-600">{errors.competitors}</p>}
      </div>

      <div>
        <label htmlFor="uniqueValueProposition" className="block text-sm font-medium text-gray-700">
          Your Unique Value Proposition *
        </label>
        <textarea
          id="uniqueValueProposition"
          value={formData.uniqueValueProposition}
          onChange={(e) => setFormData((prev) => ({ ...prev, uniqueValueProposition: e.target.value }))}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.uniqueValueProposition ? 'border-red-300' : 'border-gray-300'
          }`}
          rows={4}
          placeholder="What makes you different from competitors?"
        />
        {errors.uniqueValueProposition && (
          <p className="mt-1 text-sm text-red-600">{errors.uniqueValueProposition}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Next'}
        </button>
      </div>
    </form>
  );
}
