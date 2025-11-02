// =====================================================
// AGENT MEMORY QUEUE
// =====================================================
// Background workers for memory snapshot generation and pruning

import { Queue, Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { memorySummarizer, memoryStore } from '../memory';
import { logger } from '../lib/logger';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// JOB TYPES
// =====================================================

interface GenerateSnapshotJob {
  agentId: string;
  organizationId: string;
  date: string; // ISO date string
  snapshotType: 'daily' | 'weekly' | 'monthly';
}

interface PruneMemoriesJob {
  agentId: string;
  organizationId: string;
  olderThanDays: number;
  maxImportance: number;
}

interface AgentInfo {
  agentId: string;
  organizationId: string;
}

// =====================================================
// QUEUE CREATION
// =====================================================

export const agentMemoryQueue = new Queue('agent-memory', {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
});

// =====================================================
// WORKERS
// =====================================================

/**
 * Worker: Generate memory snapshots
 * Creates daily/weekly/monthly summaries of agent memories
 */
const snapshotGeneratorWorker = new Worker<GenerateSnapshotJob>(
  'agent-memory',
  async (job: Job<GenerateSnapshotJob>) => {
    const { agentId, organizationId, date, snapshotType } = job.data;

    logger.info(`[MemoryQueue] Generating ${snapshotType} snapshot for agent ${agentId}`, {
      jobId: job.id,
      date,
    });

    try {
      const targetDate = new Date(date);

      let snapshot;

      switch (snapshotType) {
        case 'daily':
          snapshot = await memorySummarizer.summarizeDailyMemories(
            agentId,
            organizationId,
            targetDate
          );
          break;

        case 'weekly':
          snapshot = await memorySummarizer.summarizeWeeklyMemories(
            agentId,
            organizationId,
            targetDate
          );
          break;

        default:
          throw new Error(`Unsupported snapshot type: ${snapshotType}`);
      }

      logger.info(`[MemoryQueue] Snapshot generated successfully`, {
        jobId: job.id,
        snapshotId: snapshot.id,
        memoryCount: snapshot.memoryCount,
      });

      return snapshot;
    } catch (error) {
      logger.error(`[MemoryQueue] Failed to generate snapshot`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 5,
  }
);

/**
 * Worker: Prune old memories
 * Removes low-importance old memories to manage storage
 */
const memoryPrunerWorker = new Worker<PruneMemoriesJob>(
  'agent-memory',
  async (job: Job<PruneMemoriesJob>) => {
    const { agentId, organizationId, olderThanDays, maxImportance } = job.data;

    logger.info(`[MemoryQueue] Pruning memories for agent ${agentId}`, {
      jobId: job.id,
      olderThanDays,
      maxImportance,
    });

    try {
      const result = await memoryStore.pruneMemories({
        agentId,
        organizationId,
        olderThanDays,
        maxImportance,
      });

      logger.info(`[MemoryQueue] Pruning completed`, {
        jobId: job.id,
        deletedCount: result.deletedCount,
      });

      return result;
    } catch (error) {
      logger.error(`[MemoryQueue] Failed to prune memories`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 3,
  }
);

// =====================================================
// QUEUE FUNCTIONS
// =====================================================

/**
 * Schedule daily snapshot generation for an agent
 */
export async function scheduleDailySnapshot(
  agentId: string,
  organizationId: string,
  date: Date = new Date()
): Promise<Job<GenerateSnapshotJob>> {
  return await agentMemoryQueue.add(
    'generate-snapshot',
    {
      agentId,
      organizationId,
      date: date.toISOString(),
      snapshotType: 'daily',
    },
    {
      jobId: `snapshot-daily-${agentId}-${date.toISOString().split('T')[0]}`,
    }
  );
}

/**
 * Schedule weekly snapshot generation for an agent
 */
export async function scheduleWeeklySnapshot(
  agentId: string,
  organizationId: string,
  weekStartDate: Date
): Promise<Job<GenerateSnapshotJob>> {
  return await agentMemoryQueue.add(
    'generate-snapshot',
    {
      agentId,
      organizationId,
      date: weekStartDate.toISOString(),
      snapshotType: 'weekly',
    },
    {
      jobId: `snapshot-weekly-${agentId}-${weekStartDate.toISOString().split('T')[0]}`,
    }
  );
}

/**
 * Schedule memory pruning for an agent
 */
export async function schedulePruning(
  agentId: string,
  organizationId: string,
  olderThanDays: number = 90,
  maxImportance: number = 0.3
): Promise<Job<PruneMemoriesJob>> {
  return await agentMemoryQueue.add(
    'prune-memories',
    {
      agentId,
      organizationId,
      olderThanDays,
      maxImportance,
    },
    {
      jobId: `prune-${agentId}-${Date.now()}`,
    }
  );
}

/**
 * Generate daily snapshots for all active agents (cron job)
 */
export async function generateAllDailySnapshots(): Promise<void> {
  try {
    logger.info('[MemoryQueue] Starting daily snapshot generation for all agents');

    // Get all distinct agent IDs from agent_memories
    const { data: agents, error } = await supabase
      .from('agent_memories')
      .select('agent_id, organization_id')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('agent_id');

    if (error) {
      throw new Error(`Failed to fetch active agents: ${error.message}`);
    }

    // Deduplicate by agent_id + organization_id
    const uniqueAgents = new Map<string, AgentInfo>();
    agents?.forEach((agent: any) => {
      const key = `${agent.agent_id}-${agent.organization_id}`;
      if (!uniqueAgents.has(key)) {
        uniqueAgents.set(key, {
          agentId: agent.agent_id,
          organizationId: agent.organization_id,
        });
      }
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Schedule snapshot generation for each agent
    const jobs = [];
    for (const agent of uniqueAgents.values()) {
      jobs.push(scheduleDailySnapshot(agent.agentId, agent.organizationId, yesterday));
    }

    await Promise.all(jobs);

    logger.info(`[MemoryQueue] Scheduled daily snapshots for ${uniqueAgents.size} agents`);
  } catch (error) {
    logger.error('[MemoryQueue] Failed to generate daily snapshots', error);
    throw error;
  }
}

/**
 * Prune memories for all agents (weekly cron job)
 */
export async function pruneAllAgentMemories(): Promise<void> {
  try {
    logger.info('[MemoryQueue] Starting memory pruning for all agents');

    // Get all distinct agent IDs
    const { data: agents, error } = await supabase
      .from('agent_memories')
      .select('agent_id, organization_id')
      .order('agent_id');

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    // Deduplicate by agent_id + organization_id
    const uniqueAgents = new Map<string, AgentInfo>();
    agents?.forEach((agent: any) => {
      const key = `${agent.agent_id}-${agent.organization_id}`;
      if (!uniqueAgents.has(key)) {
        uniqueAgents.set(key, {
          agentId: agent.agent_id,
          organizationId: agent.organization_id,
        });
      }
    });

    // Schedule pruning for each agent
    const jobs = [];
    for (const agent of uniqueAgents.values()) {
      jobs.push(schedulePruning(agent.agentId, agent.organizationId));
    }

    await Promise.all(jobs);

    logger.info(`[MemoryQueue] Scheduled pruning for ${uniqueAgents.size} agents`);
  } catch (error) {
    logger.error('[MemoryQueue] Failed to prune agent memories', error);
    throw error;
  }
}

// =====================================================
// WORKER EVENT LISTENERS
// =====================================================

snapshotGeneratorWorker.on('completed', (job, result) => {
  logger.info(`[MemoryQueue] Snapshot job completed`, {
    jobId: job.id,
    snapshotId: result.id,
  });
});

snapshotGeneratorWorker.on('failed', (job, error) => {
  logger.error(`[MemoryQueue] Snapshot job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

memoryPrunerWorker.on('completed', (job, result) => {
  logger.info(`[MemoryQueue] Pruning job completed`, {
    jobId: job.id,
    deletedCount: result.deletedCount,
  });
});

memoryPrunerWorker.on('failed', (job, error) => {
  logger.error(`[MemoryQueue] Pruning job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});
