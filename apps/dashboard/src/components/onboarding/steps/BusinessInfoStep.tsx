'use client';

import { useState } from 'react';
import { BusinessInfoSchema } from '@pravado/shared-types';

interface BusinessInfoStepProps {
  initialData?: any;
  onNext: (data: any) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}

export function BusinessInfoStep({ initialData, onNext, onBack, isSubmitting }: BusinessInfoStepProps) {
  const [formData, setFormData] = useState({
    businessName: initialData?.businessName || '',
    industry: initialData?.industry || '',
    website: initialData?.website || '',
    companySize: initialData?.companySize || '',
    foundedYear: initialData?.foundedYear || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const result = BusinessInfoSchema.safeParse({
      ...formData,
      foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
    });

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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
          Business Name *
        </label>
        <input
          type="text"
          id="businessName"
          value={formData.businessName}
          onChange={(e) => handleChange('businessName', e.target.value)}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.businessName ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Acme Corp"
        />
        {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>}
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
          Industry *
        </label>
        <input
          type="text"
          id="industry"
          value={formData.industry}
          onChange={(e) => handleChange('industry', e.target.value)}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.industry ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="SaaS, Healthcare, Finance, etc."
        />
        {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700">
          Website *
        </label>
        <input
          type="url"
          id="website"
          value={formData.website}
          onChange={(e) => handleChange('website', e.target.value)}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            errors.website ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="https://example.com"
        />
        {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
      </div>

      <div>
        <label htmlFor="companySize" className="block text-sm font-medium text-gray-700">
          Company Size (optional)
        </label>
        <select
          id="companySize"
          value={formData.companySize}
          onChange={(e) => handleChange('companySize', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">Select...</option>
          <option value="SOLO">Solo (1)</option>
          <option value="SMALL">Small (2-10)</option>
          <option value="MEDIUM">Medium (11-50)</option>
          <option value="LARGE">Large (51-200)</option>
          <option value="ENTERPRISE">Enterprise (200+)</option>
        </select>
      </div>

      <div>
        <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700">
          Founded Year (optional)
        </label>
        <input
          type="number"
          id="foundedYear"
          value={formData.foundedYear}
          onChange={(e) => handleChange('foundedYear', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="2020"
          min="1800"
          max={new Date().getFullYear()}
        />
        {errors.foundedYear && <p className="mt-1 text-sm text-red-600">{errors.foundedYear}</p>}
      </div>

      <div className="flex justify-between pt-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Next'}
        </button>
      </div>
    </form>
  );
}
