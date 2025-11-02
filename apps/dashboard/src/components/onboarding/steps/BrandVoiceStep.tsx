'use client';

import { useState } from 'react';

const TONE_OPTIONS = ['Professional', 'Friendly', 'Authoritative', 'Conversational', 'Technical', 'Creative'];
const ATTRIBUTE_OPTIONS = ['Trustworthy', 'Innovative', 'Expert', 'Approachable', 'Bold', 'Reliable'];

export function BrandVoiceStep({ initialData, onNext, onBack, isSubmitting }: any) {
  const [formData, setFormData] = useState({
    brandTone: initialData?.brandTone || [],
    brandAttributes: initialData?.brandAttributes || [],
    targetAudience: initialData?.targetAudience || {},
    brandPersonality: initialData?.brandPersonality || '',
  });

  const toggleItem = (field: string, item: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: prev[field].includes(item) ? prev[field].filter((i: string) => i !== item) : [...prev[field], item],
    }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(formData); }} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Brand Tone *</label>
        <div className="grid grid-cols-3 gap-3">
          {TONE_OPTIONS.map((tone) => (
            <button key={tone} type="button" onClick={() => toggleItem('brandTone', tone)}
              className={`px-4 py-2 border rounded-md text-sm ${formData.brandTone.includes(tone) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
              {tone}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Brand Attributes *</label>
        <div className="grid grid-cols-3 gap-3">
          {ATTRIBUTE_OPTIONS.map((attr) => (
            <button key={attr} type="button" onClick={() => toggleItem('brandAttributes', attr)}
              className={`px-4 py-2 border rounded-md text-sm ${formData.brandAttributes.includes(attr) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
              {attr}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Brand Personality</label>
        <textarea value={formData.brandPersonality} onChange={(e) => setFormData((prev) => ({ ...prev, brandPersonality: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows={3} placeholder="Describe your brand's personality..." />
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700" disabled={isSubmitting}>Back</button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Next'}</button>
      </div>
    </form>
  );
}
