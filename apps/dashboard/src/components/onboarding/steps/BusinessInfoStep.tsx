'use client';

import { useState, FormEvent } from 'react';

export interface BusinessInfoData {
  businessName: string;
  industry: string;
  website: string;
  companySize: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  foundedYear: number;
}

interface BusinessInfoStepProps {
  initialData?: Partial<BusinessInfoData>;
  onNext: (data: BusinessInfoData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

export function BusinessInfoStep({
  initialData,
  onNext,
  onBack,
  isSubmitting,
}: BusinessInfoStepProps) {
  const [formData, setFormData] = useState<BusinessInfoData>({
    businessName: initialData?.businessName || '',
    industry: initialData?.industry || '',
    website: initialData?.website || '',
    companySize: initialData?.companySize || 'SMALL',
    foundedYear: initialData?.foundedYear || new Date().getFullYear(),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleChange = (
    field: keyof BusinessInfoData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Business Information</h2>
        <p className="text-sm text-muted-foreground">
          Tell us about your business to get started
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium mb-1.5"
          >
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            id="businessName"
            type="text"
            required
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            placeholder="Acme Corporation"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium mb-1.5">
            Industry <span className="text-red-500">*</span>
          </label>
          <input
            id="industry"
            type="text"
            required
            value={formData.industry}
            onChange={(e) => handleChange('industry', e.target.value)}
            placeholder="Technology, Healthcare, Finance, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium mb-1.5">
            Website <span className="text-red-500">*</span>
          </label>
          <input
            id="website"
            type="url"
            required
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="companySize"
            className="block text-sm font-medium mb-1.5"
          >
            Company Size <span className="text-red-500">*</span>
          </label>
          <select
            id="companySize"
            required
            value={formData.companySize}
            onChange={(e) =>
              handleChange(
                'companySize',
                e.target.value as BusinessInfoData['companySize']
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="SOLO">Solo (1 person)</option>
            <option value="SMALL">Small (2-10 employees)</option>
            <option value="MEDIUM">Medium (11-50 employees)</option>
            <option value="LARGE">Large (51-200 employees)</option>
            <option value="ENTERPRISE">Enterprise (200+ employees)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="foundedYear"
            className="block text-sm font-medium mb-1.5"
          >
            Founded Year <span className="text-red-500">*</span>
          </label>
          <input
            id="foundedYear"
            type="number"
            required
            min="1800"
            max={new Date().getFullYear()}
            value={formData.foundedYear}
            onChange={(e) =>
              handleChange('foundedYear', parseInt(e.target.value))
            }
            placeholder="2020"
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
