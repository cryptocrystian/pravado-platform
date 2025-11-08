'use client';

import { useState, FormEvent } from 'react';

export interface ChannelsData {
  prPriority: number;
  contentPriority: number;
  seoPriority: number;
  preferredContentTypes: string[];
}

interface ChannelsStepProps {
  initialData?: Partial<ChannelsData>;
  onNext: (data: ChannelsData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

const CONTENT_TYPES = [
  'Blog posts',
  'Case studies',
  'White papers',
  'Press releases',
  'Social media content',
  'Video content',
  'Podcasts',
  'Infographics',
  'Email newsletters',
  'Webinars',
];

export function ChannelsStep({
  initialData,
  onNext,
  onBack,
  isSubmitting,
}: ChannelsStepProps) {
  const [formData, setFormData] = useState<ChannelsData>({
    prPriority: initialData?.prPriority || 3,
    contentPriority: initialData?.contentPriority || 3,
    seoPriority: initialData?.seoPriority || 3,
    preferredContentTypes: initialData?.preferredContentTypes || [],
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.preferredContentTypes.length === 0) {
      alert('Please select at least one preferred content type');
      return;
    }
    onNext(formData);
  };

  const handlePriorityChange = (
    field: 'prPriority' | 'contentPriority' | 'seoPriority',
    value: number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleContentType = (type: string) => {
    setFormData((prev) => {
      const updated = prev.preferredContentTypes.includes(type)
        ? prev.preferredContentTypes.filter((item) => item !== type)
        : [...prev.preferredContentTypes, type];
      return { ...prev, preferredContentTypes: updated };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Channel Priorities</h2>
        <p className="text-sm text-muted-foreground">
          Rate your priorities for different marketing channels
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="prPriority" className="text-sm font-medium">
                PR Priority <span className="text-red-500">*</span>
              </label>
              <span className="text-sm font-semibold text-primary">
                {formData.prPriority}
              </span>
            </div>
            <input
              id="prPriority"
              type="range"
              min="1"
              max="5"
              value={formData.prPriority}
              onChange={(e) =>
                handlePriorityChange('prPriority', parseInt(e.target.value))
              }
              disabled={isSubmitting}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="contentPriority" className="text-sm font-medium">
                Content Marketing Priority <span className="text-red-500">*</span>
              </label>
              <span className="text-sm font-semibold text-primary">
                {formData.contentPriority}
              </span>
            </div>
            <input
              id="contentPriority"
              type="range"
              min="1"
              max="5"
              value={formData.contentPriority}
              onChange={(e) =>
                handlePriorityChange('contentPriority', parseInt(e.target.value))
              }
              disabled={isSubmitting}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="seoPriority" className="text-sm font-medium">
                SEO Priority <span className="text-red-500">*</span>
              </label>
              <span className="text-sm font-semibold text-primary">
                {formData.seoPriority}
              </span>
            </div>
            <input
              id="seoPriority"
              type="range"
              min="1"
              max="5"
              value={formData.seoPriority}
              onChange={(e) =>
                handlePriorityChange('seoPriority', parseInt(e.target.value))
              }
              disabled={isSubmitting}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">
            Preferred Content Types <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select all content types you're interested in producing
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferredContentTypes.includes(type)}
                  onChange={() => toggleContentType(type)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
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
