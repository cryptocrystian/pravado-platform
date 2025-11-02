'use client';

import { useState } from 'react';

const CONTENT_TYPES = ['Blog Posts', 'Social Media', 'Videos', 'Podcasts', 'Whitepapers', 'Case Studies', 'Infographics', 'Webinars'];

export function ChannelsStep({ initialData, onNext, onBack, isSubmitting }: any) {
  const [formData, setFormData] = useState({
    prPriority: initialData?.prPriority || 3,
    contentPriority: initialData?.contentPriority || 3,
    seoPriority: initialData?.seoPriority || 3,
    preferredContentTypes: initialData?.preferredContentTypes || [],
  });

  const toggleContentType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredContentTypes: prev.preferredContentTypes.includes(type)
        ? prev.preferredContentTypes.filter((t: string) => t !== type)
        : [...prev.preferredContentTypes, type],
    }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(formData); }} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">PR Priority (1-5)</label>
          <input type="range" min="1" max="5" value={formData.prPriority}
            onChange={(e) => setFormData((prev) => ({ ...prev, prPriority: parseInt(e.target.value) }))}
            className="w-full" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span><span className="font-bold text-lg">{formData.prPriority}</span><span>High</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Priority (1-5)</label>
          <input type="range" min="1" max="5" value={formData.contentPriority}
            onChange={(e) => setFormData((prev) => ({ ...prev, contentPriority: parseInt(e.target.value) }))}
            className="w-full" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span><span className="font-bold text-lg">{formData.contentPriority}</span><span>High</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SEO Priority (1-5)</label>
          <input type="range" min="1" max="5" value={formData.seoPriority}
            onChange={(e) => setFormData((prev) => ({ ...prev, seoPriority: parseInt(e.target.value) }))}
            className="w-full" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span><span className="font-bold text-lg">{formData.seoPriority}</span><span>High</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Content Types *</label>
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => toggleContentType(type)}
              className={`px-4 py-2 border rounded-md text-sm ${formData.preferredContentTypes.includes(type) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-md" disabled={isSubmitting}>Back</button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Next'}</button>
      </div>
    </form>
  );
}
