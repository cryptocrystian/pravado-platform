'use client';

import { useState } from 'react';
import { useTriggerEnrichment, useEnrichmentJobs } from '@/hooks/useContacts';

interface EnrichmentButtonProps {
  contactIds: string[];
  onComplete?: () => void;
}

export function EnrichmentButton({ contactIds, onComplete }: EnrichmentButtonProps) {
  const [showProgress, setShowProgress] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const enrichMutation = useTriggerEnrichment();
  const { data: jobs } = useEnrichmentJobs();

  const handleEnrich = async () => {
    try {
      const result = await enrichMutation.mutateAsync(contactIds);
      setCurrentJobId(result.jobId);
      setShowProgress(true);
    } catch (error) {
      console.error('Failed to trigger enrichment:', error);
      alert('Failed to start enrichment. Please try again.');
    }
  };

  const currentJob = jobs?.find((j: any) => j.id === currentJobId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <button
        onClick={handleEnrich}
        disabled={enrichMutation.isPending || contactIds.length === 0}
        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        {enrichMutation.isPending ? 'Starting...' : `Enrich (${contactIds.length})`}
      </button>

      {/* Progress Modal */}
      {showProgress && currentJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Enrichment Progress</h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Status:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      currentJob.status
                    )}`}
                  >
                    {currentJob.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>
                    {currentJob.enriched_count + currentJob.failed_count} / {currentJob.total_contacts}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        ((currentJob.enriched_count + currentJob.failed_count) /
                          currentJob.total_contacts) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {currentJob.status === 'COMPLETED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Enriched:</span>
                    <span className="font-bold text-green-900">{currentJob.enriched_count}</span>
                  </div>
                  {currentJob.failed_count > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-red-700">Failed:</span>
                      <span className="font-bold text-red-900">{currentJob.failed_count}</span>
                    </div>
                  )}
                  {currentJob.execution_time_ms && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{(currentJob.execution_time_ms / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              )}

              {currentJob.status === 'FAILED' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">Enrichment failed. Please try again.</p>
                  {currentJob.error_message && (
                    <p className="text-xs text-red-600 mt-1">{currentJob.error_message}</p>
                  )}
                </div>
              )}

              {currentJob.status === 'PROCESSING' && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowProgress(false);
                  setCurrentJobId(null);
                  if (currentJob.status === 'COMPLETED' && onComplete) {
                    onComplete();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {currentJob.status === 'COMPLETED' ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
