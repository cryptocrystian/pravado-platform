'use client';

import { useState, FormEvent } from 'react';

export interface GoalsData {
  primaryGoals: string[];
  successMetrics: string[];
  timeline: string;
  budgetRange: string;
}

interface GoalsStepProps {
  initialData?: Partial<GoalsData>;
  onNext: (data: GoalsData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

const PRIMARY_GOALS = [
  'Increase brand awareness',
  'Generate leads',
  'Build thought leadership',
  'Improve SEO rankings',
  'Drive website traffic',
  'Build media relationships',
  'Launch new products',
  'Crisis management preparedness',
];

const SUCCESS_METRICS = [
  'Media mentions',
  'Website traffic',
  'Lead generation',
  'Social media engagement',
  'Domain authority',
  'Brand sentiment',
  'Backlink quality',
  'Share of voice',
];

export function GoalsStep({
  initialData,
  onNext,
  onBack,
  isSubmitting,
}: GoalsStepProps) {
  const [formData, setFormData] = useState<GoalsData>({
    primaryGoals: initialData?.primaryGoals || [],
    successMetrics: initialData?.successMetrics || [],
    timeline: initialData?.timeline || '',
    budgetRange: initialData?.budgetRange || '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.primaryGoals.length === 0) {
      alert('Please select at least one primary goal');
      return;
    }
    if (formData.successMetrics.length === 0) {
      alert('Please select at least one success metric');
      return;
    }
    onNext(formData);
  };

  const toggleCheckbox = (field: 'primaryGoals' | 'successMetrics', value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleChange = (field: keyof GoalsData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Goals & Objectives</h2>
        <p className="text-sm text-muted-foreground">
          Define what success looks like for your PR and content strategy
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3">
            Primary Goals <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {PRIMARY_GOALS.map((goal) => (
              <label key={goal} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.primaryGoals.includes(goal)}
                  onChange={() => toggleCheckbox('primaryGoals', goal)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">
            Success Metrics <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {SUCCESS_METRICS.map((metric) => (
              <label key={metric} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.successMetrics.includes(metric)}
                  onChange={() => toggleCheckbox('successMetrics', metric)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{metric}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="timeline" className="block text-sm font-medium mb-1.5">
            Timeline <span className="text-red-500">*</span>
          </label>
          <input
            id="timeline"
            type="text"
            required
            value={formData.timeline}
            onChange={(e) => handleChange('timeline', e.target.value)}
            placeholder="e.g., 6 months, Q1 2024, Ongoing"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="budgetRange" className="block text-sm font-medium mb-1.5">
            Budget Range <span className="text-red-500">*</span>
          </label>
          <input
            id="budgetRange"
            type="text"
            required
            value={formData.budgetRange}
            onChange={(e) => handleChange('budgetRange', e.target.value)}
            placeholder="e.g., $5k-10k/month, $50k annual"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
