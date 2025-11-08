'use client';

import { useState, FormEvent } from 'react';

export interface RegionsData {
  primaryRegions: string[];
  languages: string[];
  localConsiderations: string;
  additionalContext: string;
}

interface RegionsStepProps {
  initialData?: Partial<RegionsData>;
  onNext: (data: RegionsData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

const REGIONS = [
  'North America',
  'Latin America',
  'Western Europe',
  'Eastern Europe',
  'Middle East',
  'Africa',
  'Asia-Pacific',
  'Southeast Asia',
  'East Asia',
  'South Asia',
  'Oceania',
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Dutch',
  'Russian',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
];

export function RegionsStep({
  initialData,
  onNext,
  onBack,
  isSubmitting,
}: RegionsStepProps) {
  const [formData, setFormData] = useState<RegionsData>({
    primaryRegions: initialData?.primaryRegions || [],
    languages: initialData?.languages || [],
    localConsiderations: initialData?.localConsiderations || '',
    additionalContext: initialData?.additionalContext || '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.primaryRegions.length === 0) {
      alert('Please select at least one primary region');
      return;
    }
    if (formData.languages.length === 0) {
      alert('Please select at least one language');
      return;
    }
    onNext(formData);
  };

  const toggleCheckbox = (
    field: 'primaryRegions' | 'languages',
    value: string
  ) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Geographic & Language Focus</h2>
        <p className="text-sm text-muted-foreground">
          Define your target markets and language requirements
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3">
            Primary Regions <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select all regions you operate in or target
          </p>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map((region) => (
              <label key={region} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.primaryRegions.includes(region)}
                  onChange={() => toggleCheckbox('primaryRegions', region)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{region}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">
            Languages <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select all languages for your content and communications
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((language) => (
              <label
                key={language}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.languages.includes(language)}
                  onChange={() => toggleCheckbox('languages', language)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{language}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="localConsiderations"
            className="block text-sm font-medium mb-1.5"
          >
            Local Considerations
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Any cultural, regulatory, or market-specific considerations we should
            know about?
          </p>
          <textarea
            id="localConsiderations"
            rows={4}
            value={formData.localConsiderations}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                localConsiderations: e.target.value,
              }))
            }
            placeholder="e.g., GDPR compliance for EU markets, specific cultural sensitivities, local holidays, regulatory requirements..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="additionalContext"
            className="block text-sm font-medium mb-1.5"
          >
            Additional Context
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Any other information that would help us serve you better?
          </p>
          <textarea
            id="additionalContext"
            rows={4}
            value={formData.additionalContext}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                additionalContext: e.target.value,
              }))
            }
            placeholder="Share any additional details about your business, goals, or specific needs..."
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
          {isSubmitting ? 'Complete' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
