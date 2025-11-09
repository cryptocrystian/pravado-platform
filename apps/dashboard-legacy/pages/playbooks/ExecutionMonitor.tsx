// =====================================================
// EXECUTION MONITORING DASHBOARD
// Sprint 41 Phase 3.4 Days 3-6
// =====================================================

import { useState } from 'react';
import {
  useExecutionWithResults,
  useExecutionProgress,
} from '../../hooks/usePlaybooks';
import {
  EXECUTION_STATUS_CONFIGS,
  STEP_RESULT_STATUS_CONFIGS,
  PlaybookExecutionStatus,
} from '@pravado/types';
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function ExecutionMonitor({ executionId }: { executionId: string }) {
  const { data: execution, isLoading } = useExecutionWithResults(executionId);
  const { data: progress } = useExecutionProgress(
    executionId,
    execution?.status === PlaybookExecutionStatus.RUNNING ? 3000 : 0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Execution not found</p>
      </div>
    );
  }

  const statusConfig = EXECUTION_STATUS_CONFIGS[execution.status];

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">
            {execution.executionName || 'Playbook Execution'}
          </h1>
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
        </div>
        <p className="text-muted-foreground">
          Execution ID: {execution.id}
        </p>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-card rounded-lg border p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Progress</h2>
            <span className="text-sm text-muted-foreground">
              {progress.completedSteps} / {progress.totalSteps} steps
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {progress.currentStepName && (
                <>Current step: {progress.currentStepName}</>
              )}
            </div>
            <div className="text-muted-foreground">
              {Math.floor(progress.elapsedTimeMs / 1000)}s elapsed
            </div>
          </div>
        </div>
      )}

      {/* Execution Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Started At</div>
              <div className="font-semibold">
                {execution.startedAt
                  ? new Date(execution.startedAt).toLocaleString()
                  : 'Not started'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Duration</div>
              <div className="font-semibold">
                {execution.durationMs
                  ? `${(execution.durationMs / 1000).toFixed(2)}s`
                  : 'In progress'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Trigger Source</div>
              <div className="font-semibold capitalize">{execution.triggerSource}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Results */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Step Results</h2>

        {execution.stepResults && execution.stepResults.length > 0 ? (
          <div className="space-y-3">
            {execution.stepResults.map((result) => {
              const statusConfig = STEP_RESULT_STATUS_CONFIGS[result.status];
              const Icon =
                result.status === 'COMPLETED'
                  ? CheckCircle2
                  : result.status === 'FAILED'
                    ? XCircle
                    : result.status === 'RUNNING'
                      ? Loader2
                      : Clock;

              return (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon
                      className={`h-5 w-5 ${result.status === 'RUNNING' ? 'animate-spin' : ''}`}
                      style={{ color: `var(--${statusConfig.color})` }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">Step {result.attemptNumber}</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </div>
                    {result.durationMs && (
                      <div className="text-sm text-muted-foreground">
                        {(result.durationMs / 1000).toFixed(2)}s
                      </div>
                    )}
                  </div>

                  {result.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <div className="font-semibold mb-1">Error:</div>
                      {result.errorMessage}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No step results yet
          </div>
        )}
      </div>

      {/* Error Details */}
      {execution.errorMessage && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-700 mb-3">Execution Error</h2>
          <div className="text-red-700 mb-3">{execution.errorMessage}</div>
          {execution.errorStack && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">Stack Trace</summary>
              <pre className="mt-2 p-3 bg-white rounded text-xs overflow-x-auto">
                {execution.errorStack}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
