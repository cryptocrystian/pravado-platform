'use client';

import { useState } from 'react';
import { GoalsSchema } from '@pravado/validators';

interface GoalsStepProps {
  initialData?: any;
  onNext: (data: any) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

const GOAL_OPTIONS = [
  'Brand Awareness',
  'Lead Generation',
  'Thought Leadership',
  'Product Launch',
  'Crisis Management',
  'Investor Relations',
  'Talent Acquisition',
  'Market Education',
];

const METRIC_OPTIONS = [
  'Media Mentions',
  'Website Traffic',
  'Leads Generated',
  'Social Engagement',
  'Domain Authority',
  'Keyword Rankings',
  'Backlinks',
  'Content Downloads',
];

export function GoalsStep({ initialData, onNext, onBack, isSubmitting }: GoalsStepProps) {
  const [formData, setFormData] = useState({
    primaryGoals: initialData?.primaryGoals || [],
    successMetrics: initialData?.successMetrics || [],
    timeline: initialData?.timeline || '',
    budgetRange: initialData?.budgetRange || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = GoalsSchema.safeParse(formData);

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

  const toggleItem = (field: 'primaryGoals' | 'successMetrics', item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i: string) => i !== item)
        : [...prev[field], item],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Primary Goals * (Select at least one)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleItem('primaryGoals', goal)}
              className={`px-4 py-2 border rounded-md text-sm ${
                formData.primaryGoals.includes(goal)
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
        {errors.primaryGoals && <p className="mt-1 text-sm text-red-600">{errors.primaryGoals}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Success Metrics * (Select at least one)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {METRIC_OPTIONS.map((metric) => (
            <button
              key={metric}
              type="button"
              onClick={() => toggleItem('successMetrics', metric)}
              className={`px-4 py-2 border rounded-md text-sm ${
                formData.successMetrics.includes(metric)
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {metric}
            </button>
          ))}
        </div>
        {errors.successMetrics && <p className="mt-1 text-sm text-red-600">{errors.successMetrics}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">
            Timeline
          </label>
          <select
            id="timeline"
            value={formData.timeline}
            onChange={(e) => setFormData((prev) => ({ ...prev, timeline: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select...</option>
            <option value="1 month">1 month</option>
            <option value="3 months">3 months</option>
            <option value="6 months">6 months</option>
            <option value="1 year">1 year</option>
          </select>
        </div>

        <div>
          <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700">
            Monthly Budget
          </label>
          <select
            id="budgetRange"
            value={formData.budgetRange}
            onChange={(e) => setFormData((prev) => ({ ...prev, budgetRange: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select...</option>
            <option value="$0-1k">$0-1k</option>
            <option value="$1k-5k">$1k-5k</option>
            <option value="$5k-10k">$5k-10k</option>
            <option value="$10k+">$10k+</option>
          </select>
        </div>
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
