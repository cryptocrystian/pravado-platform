'use client';

import { useState, FormEvent } from 'react';

export interface BrandVoiceData {
  brandTone: string[];
  brandAttributes: string[];
  brandPersonality: string;
}

interface BrandVoiceStepProps {
  initialData?: Partial<BrandVoiceData>;
  onNext: (data: BrandVoiceData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

const BRAND_TONES = [
  'Professional',
  'Friendly',
  'Authoritative',
  'Casual',
  'Formal',
  'Conversational',
  'Technical',
  'Approachable',
  'Bold',
  'Conservative',
];

const BRAND_ATTRIBUTES = [
  'Innovative',
  'Trustworthy',
  'Transparent',
  'Customer-focused',
  'Industry leader',
  'Disruptive',
  'Reliable',
  'Cutting-edge',
  'Sustainable',
  'Data-driven',
  'Human-centered',
  'Agile',
];

export function BrandVoiceStep({
  initialData,
  onNext,
  onBack,
  isSubmitting,
}: BrandVoiceStepProps) {
  const [formData, setFormData] = useState<BrandVoiceData>({
    brandTone: initialData?.brandTone || [],
    brandAttributes: initialData?.brandAttributes || [],
    brandPersonality: initialData?.brandPersonality || '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.brandTone.length === 0) {
      alert('Please select at least one brand tone');
      return;
    }
    if (formData.brandAttributes.length === 0) {
      alert('Please select at least one brand attribute');
      return;
    }
    onNext(formData);
  };

  const toggleCheckbox = (
    field: 'brandTone' | 'brandAttributes',
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
        <h2 className="text-2xl font-semibold mb-2">Brand Voice & Personality</h2>
        <p className="text-sm text-muted-foreground">
          Define how your brand communicates and presents itself
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3">
            Brand Tone <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select all that apply to your brand's communication style
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BRAND_TONES.map((tone) => (
              <label key={tone} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.brandTone.includes(tone)}
                  onChange={() => toggleCheckbox('brandTone', tone)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{tone}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">
            Brand Attributes <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select the attributes that best describe your brand
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BRAND_ATTRIBUTES.map((attribute) => (
              <label
                key={attribute}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.brandAttributes.includes(attribute)}
                  onChange={() => toggleCheckbox('brandAttributes', attribute)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{attribute}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="brandPersonality"
            className="block text-sm font-medium mb-1.5"
          >
            Brand Personality <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Describe your brand as if it were a person. What are its key
            characteristics?
          </p>
          <textarea
            id="brandPersonality"
            required
            rows={5}
            value={formData.brandPersonality}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                brandPersonality: e.target.value,
              }))
            }
            placeholder="e.g., Our brand is like a knowledgeable mentor - experienced, approachable, and genuinely invested in helping clients succeed. We communicate with confidence but never arrogance..."
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
