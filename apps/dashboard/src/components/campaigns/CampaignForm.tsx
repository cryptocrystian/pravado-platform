'use client';

import { useState } from 'react';
import { useCreateCampaign, useUpdateCampaign } from '@/hooks/usePRCampaigns';
import { PRCampaign, CampaignStatus } from '@pravado/types';

interface CampaignFormProps {
  campaign?: PRCampaign;
  onClose: () => void;
  onSuccess: () => void;
}

export function CampaignForm({ campaign, onClose, onSuccess }: CampaignFormProps) {
  const isEditing = !!campaign;
  const createMutation = useCreateCampaign();
  const updateMutation = campaign ? useUpdateCampaign(campaign.id) : null;

  const [formData, setFormData] = useState({
    title: campaign?.title || '',
    description: campaign?.description || '',
    goal: campaign?.goal || '',
    status: campaign?.status || CampaignStatus.PLANNED,
    startDate: campaign?.startDate
      ? new Date(campaign.startDate).toISOString().split('T')[0]
      : '',
    endDate: campaign?.endDate
      ? new Date(campaign.endDate).toISOString().split('T')[0]
      : '',
    targetImpressions: campaign?.targetImpressions?.toString() || '',
    targetCoveragePieces: campaign?.targetCoveragePieces?.toString() || '',
    targetEngagementRate: campaign?.targetEngagementRate
      ? (campaign.targetEngagementRate * 100).toString()
      : '',
    budget: campaign?.budget?.toString() || '',
    currency: campaign?.currency || 'USD',
    notes: campaign?.notes || '',
    internalNotes: campaign?.internalNotes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        goal: formData.goal || undefined,
        status: formData.status,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        targetImpressions: formData.targetImpressions
          ? parseInt(formData.targetImpressions)
          : undefined,
        targetCoveragePieces: formData.targetCoveragePieces
          ? parseInt(formData.targetCoveragePieces)
          : undefined,
        targetEngagementRate: formData.targetEngagementRate
          ? parseFloat(formData.targetEngagementRate) / 100
          : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        currency: formData.currency,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
        organizationId: '', // Will be set by API from auth context
      };

      if (isEditing && updateMutation) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      alert('Failed to save campaign. Please try again.');
    }
  };

  const isPending = createMutation.isPending || updateMutation?.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
          <h2 className="text-2xl font-bold">
            {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Q1 Product Launch Campaign"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Brief overview of the campaign..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Campaign Goal</label>
                <textarea
                  value={formData.goal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, goal: e.target.value }))}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="What do you want to achieve with this campaign?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value as CampaignStatus }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {Object.values(CampaignStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Timeline</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Goals & Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Goals & Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Impressions
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.targetImpressions}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, targetImpressions: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="1000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Coverage Pieces
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.targetCoveragePieces}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, targetCoveragePieces: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Engagement Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.targetEngagementRate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, targetEngagementRate: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="15.5"
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Budget</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Public Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Notes visible to all team members..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Internal Notes</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Private notes for campaign managers..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
