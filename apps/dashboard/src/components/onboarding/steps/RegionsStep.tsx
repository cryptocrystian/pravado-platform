'use client';

import { useState } from 'react';

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Portuguese', 'Arabic'];

export function RegionsStep({ initialData, onNext, onBack, isSubmitting }: any) {
  const [formData, setFormData] = useState({
    primaryRegions: initialData?.primaryRegions || [],
    languages: initialData?.languages || [],
    localConsiderations: initialData?.localConsiderations || '',
    additionalContext: initialData?.additionalContext || '',
    challenges: initialData?.challenges || [],
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
        <label className="block text-sm font-medium text-gray-700 mb-3">Primary Regions *</label>
        <div className="grid grid-cols-2 gap-3">
          {REGIONS.map((region) => (
            <button key={region} type="button" onClick={() => toggleItem('primaryRegions', region)}
              className={`px-4 py-2 border rounded-md text-sm ${formData.primaryRegions.includes(region) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
              {region}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Languages *</label>
        <div className="grid grid-cols-3 gap-3">
          {LANGUAGES.map((lang) => (
            <button key={lang} type="button" onClick={() => toggleItem('languages', lang)}
              className={`px-4 py-2 border rounded-md text-sm ${formData.languages.includes(lang) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}`}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Local Considerations</label>
        <textarea value={formData.localConsiderations}
          onChange={(e) => setFormData((prev) => ({ ...prev, localConsiderations: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows={3}
          placeholder="Any cultural nuances or local considerations?" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Additional Context</label>
        <textarea value={formData.additionalContext}
          onChange={(e) => setFormData((prev) => ({ ...prev, additionalContext: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows={3}
          placeholder="Anything else we should know?" />
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-md" disabled={isSubmitting}>Back</button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Complete Intake'}
        </button>
      </div>
    </form>
  );
}
