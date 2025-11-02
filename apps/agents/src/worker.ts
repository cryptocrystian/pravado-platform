import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './lib/logger';
import type { AgentJobData } from './types';
import { processAgentTask } from './processors';
import { startOnboardingWorker } from './flows/onboarding';
import { startContactEnrichmentWorker } from './queues/contact-enrichment.queue';

const connection = new Redis(
  process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379'
);

export const startWorker = () => {
  // Start general agent tasks worker
  const generalWorker = new Worker<AgentJobData>(
    'agent-tasks',
    async (job) => {
      logger.info(`Processing agent task ${job.data.taskId}`);
      await processAgentTask(job.data);
    },
    {
      connection,
      concurrency: parseInt(process.env.AGENT_WORKER_CONCURRENCY || '5', 10),
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  generalWorker.on('completed', (job) => {
    logger.info(`Agent task ${job.id} completed successfully`);
  });

  generalWorker.on('failed', (job, err) => {
    logger.error(`Agent task ${job?.id} failed: ${err.message}`);
  });

  generalWorker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  // Start onboarding-specific worker
  const onboardingWorker = startOnboardingWorker();

  // Start contact enrichment worker
  const contactEnrichmentWorker = startContactEnrichmentWorker();

  logger.info('All workers started: general agent tasks + onboarding + contact enrichment');

  // Return all workers for cleanup
  return {
    general: generalWorker,
    onboarding: onboardingWorker,
    contactEnrichment: contactEnrichmentWorker,
    close: async () => {
      await Promise.all([
        generalWorker.close(),
        onboardingWorker.close(),
        contactEnrichmentWorker.close(),
      ]);
    },
  };
};
