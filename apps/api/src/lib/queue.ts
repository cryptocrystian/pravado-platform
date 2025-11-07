import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from './redis';
import { logger } from './logger';
import type { AgentTask, AgentType } from '@pravado/types';

const connection = redis;

export const agentQueue = new Queue('agent-tasks', { connection });

const queueEvents = new QueueEvents('agent-tasks', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Agent task ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Agent task ${jobId} failed: ${failedReason}`);
});

export interface AgentJobData {
  taskId: string;
  type: AgentType;
  context: AgentTask['context'];
  userId: string;
  organizationId: string;
}

export const enqueueAgentTask = async (data: AgentJobData, priority: number = 0) => {
  const job = await agentQueue.add('process-agent-task', data, {
    priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info(`Enqueued agent task ${data.taskId} with job ID ${job.id}`);
  return job;
};

export const createAgentWorker = (
  processor: (job: { data: AgentJobData }) => Promise<void>
) => {
  return new Worker('agent-tasks', processor, {
    connection,
    concurrency: parseInt(process.env.AGENT_WORKER_CONCURRENCY || '5', 10),
  });
};
