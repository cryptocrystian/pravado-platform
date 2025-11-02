// =====================================================
// ONBOARDING QUEUE
// =====================================================
// Dedicated queue for onboarding-related agent tasks

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../lib/logger';
import type { OnboardingJobData } from '../types/onboarding.types';

const connection = new Redis(
  process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

// Onboarding queue for strategy and planning tasks
export const onboardingQueue = new Queue<OnboardingJobData>('onboarding-tasks', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs for debugging
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for analysis
    },
  },
});

// Strategy generation job
export async function enqueueStrategyGeneration(data: {
  sessionId: string;
  organizationId: string;
  userId: string;
  intakeSummary: Record<string, unknown>;
}) {
  logger.info(`Enqueueing strategy generation for session ${data.sessionId}`);

  const job = await onboardingQueue.add(
    'strategy-generation',
    {
      type: 'strategy',
      sessionId: data.sessionId,
      organizationId: data.organizationId,
      userId: data.userId,
      input: data.intakeSummary,
    },
    {
      jobId: `strategy-${data.sessionId}`,
      priority: 1, // High priority
    }
  );

  logger.info(`Strategy generation job created: ${job.id}`);
  return job.id;
}

// Planning tasks job (runs after strategy is complete)
export async function enqueuePlannerTasks(data: {
  sessionId: string;
  organizationId: string;
  userId: string;
  strategyPlanId: string;
  intakeSummary: Record<string, unknown>;
}) {
  logger.info(`Enqueueing planner tasks for session ${data.sessionId}`);

  const job = await onboardingQueue.add(
    'planner-execution',
    {
      type: 'planner',
      sessionId: data.sessionId,
      organizationId: data.organizationId,
      userId: data.userId,
      strategyPlanId: data.strategyPlanId,
      input: data.intakeSummary,
    },
    {
      jobId: `planner-${data.sessionId}`,
      priority: 2, // Lower priority than strategy
    }
  );

  logger.info(`Planner tasks job created: ${job.id}`);
  return job.id;
}

// Get job status
export async function getJobStatus(jobId: string) {
  const job = await onboardingQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    name: job.name,
    state,
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

// Cleanup handlers
connection.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

connection.on('connect', () => {
  logger.info('Connected to Redis for onboarding queue');
});
