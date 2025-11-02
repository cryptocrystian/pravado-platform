import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  StartExecutionRequest,
  StartExecutionResult,
  ExecutionSummary,
  GraphExecutionStatus,
  TaskExecutionLog,
  ExecutionLogs,
  RetryTaskRequest,
  SkipTaskRequest,
  SkipTaskResult,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// EXECUTION STATUS QUERIES
// =====================================================

/**
 * Get execution status with real-time polling
 */
export function useExecutionStatus(campaignId: string | null, pollInterval: number = 2000) {
  return useQuery<GraphExecutionStatus>({
    queryKey: ['execution', campaignId, 'status'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/execution/${campaignId}/status`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch execution status');
      return res.json();
    },
    enabled: !!campaignId,
    refetchInterval: (data) => {
      // Poll while execution is running
      if (data?.isRunning) return pollInterval;
      return false;
    },
  });
}

/**
 * Get execution summary
 */
export function useExecutionSummary(campaignId: string | null) {
  return useQuery<{ success: boolean; summary: ExecutionSummary }>({
    queryKey: ['execution', campaignId, 'summary'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/execution/${campaignId}/summary`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch execution summary');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

/**
 * Get execution logs
 */
export function useExecutionLogs(campaignId: string | null) {
  return useQuery<ExecutionLogs>({
    queryKey: ['execution', campaignId, 'logs'],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(`${API_BASE}/execution/${campaignId}/logs`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch execution logs');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

// =====================================================
// EXECUTION CONTROL MUTATIONS
// =====================================================

/**
 * Start execution
 */
export function useStartExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      campaignId: string;
      parallelism?: number;
      dryRun?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/execution/${request.campaignId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parallelism: request.parallelism,
          dryRun: request.dryRun,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start execution');
      }
      return res.json() as Promise<StartExecutionResult>;
    },
    onSuccess: (data, variables) => {
      // Invalidate and start polling
      queryClient.invalidateQueries({
        queryKey: ['execution', variables.campaignId],
      });
    },
  });
}

/**
 * Stop execution
 */
export function useStopExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`${API_BASE}/execution/${campaignId}/stop`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to stop execution');
      }
      return res.json();
    },
    onSuccess: (data, campaignId) => {
      queryClient.invalidateQueries({
        queryKey: ['execution', campaignId],
      });
    },
  });
}

// =====================================================
// TASK CONTROL MUTATIONS
// =====================================================

/**
 * Retry a failed task
 */
export function useRetryTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      nodeId,
    }: {
      campaignId: string;
      nodeId: string;
    }) => {
      const res = await fetch(`${API_BASE}/execution/${campaignId}/retry/${nodeId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to retry task');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['execution', variables.campaignId],
      });
    },
  });
}

/**
 * Skip a blocked task
 */
export function useSkipTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      nodeId,
      reason,
    }: {
      campaignId: string;
      nodeId: string;
      reason?: string;
    }) => {
      const res = await fetch(`${API_BASE}/execution/${campaignId}/skip/${nodeId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to skip task');
      }
      return res.json() as Promise<SkipTaskResult>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['execution', variables.campaignId],
      });
    },
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get execution progress percentage
 */
export function useExecutionProgress(campaignId: string | null) {
  const { data: summaryData } = useExecutionSummary(campaignId);

  if (!summaryData?.summary) return null;

  const summary = summaryData.summary;

  return {
    progress: summary.progress,
    percentage: Math.round(summary.progress * 100),
    completed: summary.completed,
    total: summary.totalTasks,
    remaining: summary.pending + summary.running + summary.blocked,
    isComplete: summary.isComplete,
  };
}

/**
 * Get execution health status
 */
export function useExecutionHealth(campaignId: string | null) {
  const { data: summaryData } = useExecutionSummary(campaignId);

  if (!summaryData?.summary) return null;

  const summary = summaryData.summary;

  const health = {
    status: 'healthy' as 'healthy' | 'warning' | 'critical',
    issues: [] as string[],
    warnings: [] as string[],
  };

  if (summary.failed > 0) {
    health.status = 'critical';
    health.issues.push(`${summary.failed} task(s) failed`);
  }

  if (summary.blocked > 0) {
    health.status = summary.failed > 0 ? 'critical' : 'warning';
    health.warnings.push(`${summary.blocked} task(s) blocked`);
  }

  if (summary.running === 0 && summary.pending > 0 && !summary.isComplete) {
    health.status = 'warning';
    health.warnings.push('Execution stalled - no tasks running');
  }

  return health;
}

/**
 * Get task status color
 */
export function useTaskStatusColor(status: string | null) {
  const colorMap = {
    PENDING: 'gray',
    RUNNING: 'blue',
    COMPLETED: 'green',
    FAILED: 'red',
    BLOCKED: 'orange',
    SKIPPED: 'yellow',
  };

  return colorMap[status as keyof typeof colorMap] || 'gray';
}

/**
 * Check if execution can be started
 */
export function useCanStartExecution(campaignId: string | null) {
  const { data: status } = useExecutionStatus(campaignId, 0); // No polling

  if (!status) return null;

  return {
    canStart: !status.isRunning && !status.summary.isComplete,
    isRunning: status.isRunning,
    isComplete: status.summary.isComplete,
    reason: status.isRunning
      ? 'Execution already running'
      : status.summary.isComplete
      ? 'Execution already complete'
      : null,
  };
}

/**
 * Get failed tasks
 */
export function useFailedTasks(campaignId: string | null) {
  const { data: status } = useExecutionStatus(campaignId);

  if (!status) return null;

  const failedTasks = status.tasks.filter((task) => task.status === 'FAILED');

  return {
    tasks: failedTasks,
    count: failedTasks.length,
    canRetry: failedTasks.filter((task) => task.retryCount < task.maxRetries),
  };
}

/**
 * Get blocked tasks
 */
export function useBlockedTasks(campaignId: string | null) {
  const { data: status } = useExecutionStatus(campaignId);

  if (!status) return null;

  const blockedTasks = status.tasks.filter((task) => task.status === 'BLOCKED');

  return {
    tasks: blockedTasks,
    count: blockedTasks.length,
  };
}

/**
 * Get running tasks
 */
export function useRunningTasks(campaignId: string | null) {
  const { data: status } = useExecutionStatus(campaignId);

  if (!status) return null;

  const runningTasks = status.tasks.filter((task) => task.status === 'RUNNING');

  return {
    tasks: runningTasks,
    count: runningTasks.length,
  };
}

/**
 * Get task execution time
 */
export function useTaskExecutionTime(campaignId: string | null, nodeId: string | null) {
  const { data: logs } = useExecutionLogs(campaignId);

  if (!logs || !nodeId) return null;

  const taskLog = logs.logs.find((log) => log.nodeId === nodeId);

  if (!taskLog) return null;

  return {
    totalDurationMs: taskLog.totalDurationMs,
    attempts: taskLog.totalAttempts,
    avgDurationMs:
      taskLog.totalAttempts > 0 ? taskLog.totalDurationMs / taskLog.totalAttempts : 0,
  };
}

/**
 * Get execution timeline
 */
export function useExecutionTimeline(campaignId: string | null) {
  const { data: logs } = useExecutionLogs(campaignId);

  if (!logs) return null;

  const timeline = logs.logs.flatMap((log) =>
    log.attempts.map((attempt) => ({
      nodeId: log.nodeId,
      taskType: log.taskType,
      status: attempt.status,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      durationMs: attempt.durationMs,
      attemptNumber: attempt.attemptNumber,
    }))
  );

  // Sort by start time
  timeline.sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  return timeline;
}

/**
 * Get execution metrics
 */
export function useExecutionMetrics(campaignId: string | null) {
  const { data: summaryData } = useExecutionSummary(campaignId);
  const { data: logs } = useExecutionLogs(campaignId);

  if (!summaryData?.summary || !logs) return null;

  const summary = summaryData.summary;

  const totalDuration = logs.logs.reduce((sum, log) => sum + log.totalDurationMs, 0);
  const completedTasks = logs.logs.filter((log) => log.status === 'COMPLETED');
  const avgTaskDuration =
    completedTasks.length > 0
      ? completedTasks.reduce((sum, log) => sum + log.totalDurationMs, 0) /
        completedTasks.length
      : 0;

  const retriedTasks = logs.logs.filter((log) => log.totalAttempts > 1);
  const retryRate = summary.totalTasks > 0 ? retriedTasks.length / summary.totalTasks : 0;

  const failureRate = summary.totalTasks > 0 ? summary.failed / summary.totalTasks : 0;

  return {
    totalDuration,
    avgTaskDuration,
    retryRate,
    failureRate,
    successRate: 1 - failureRate,
    totalRetries: retriedTasks.reduce((sum, log) => sum + (log.totalAttempts - 1), 0),
  };
}
