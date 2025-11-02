// =====================================================
// ONBOARDING FLOW ORCHESTRATION
// =====================================================
// Main orchestration logic for the AI-driven onboarding flow
// Coordinates Strategy Agent → Planner Agent execution

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import type { OnboardingJobData } from '../types/onboarding.types';
import { executeStrategyGeneration } from './onboarding/strategy-agent';
import { executePlannerTasks } from './onboarding/planner-agent';

const connection = new Redis(
  process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

// Process onboarding jobs
export async function processOnboardingJob(job: Job<OnboardingJobData>) {
  const { type, sessionId, organizationId, userId, input } = job.data;

  logger.info(`Processing onboarding job: ${type} for session ${sessionId}`);

  try {
    // Update session status to PROCESSING
    await updateOnboardingSession(sessionId, {
      status: 'PROCESSING',
      processing_started_at: new Date().toISOString(),
    });

    // Create agent result record
    const agentResultId = await createAgentResult(sessionId, type, job.id || '');

    let result;

    if (type === 'strategy') {
      // Execute Strategy Agent
      result = await executeStrategyGeneration(
        sessionId,
        organizationId,
        userId,
        input as any
      );

      // Update session with strategy plan ID
      await updateOnboardingSession(sessionId, {
        status: 'STRATEGY_READY',
        strategy_plan_id: result.strategyPlanId,
        strategy_generated_at: new Date().toISOString(),
      });

      // Update agent result
      await updateAgentResult(agentResultId, {
        status: 'completed',
        result: result,
        completed_at: new Date().toISOString(),
      });

      logger.info(`Strategy generation completed for session ${sessionId}`);

      return result;
    } else if (type === 'planner') {
      // Execute Planner Agent
      const strategyPlanId = job.data.strategyPlanId;
      if (!strategyPlanId) {
        throw new Error('Strategy plan ID is required for planner tasks');
      }

      result = await executePlannerTasks(
        sessionId,
        organizationId,
        userId,
        strategyPlanId,
        input as any
      );

      // Update session with completion
      await updateOnboardingSession(sessionId, {
        status: 'PLANNER_READY',
        planner_completed_at: new Date().toISOString(),
      });

      // Update agent result with generated asset IDs
      await updateAgentResult(agentResultId, {
        status: 'completed',
        result: result,
        generated_content_ids: result.contentCalendar.items.map(i => i.id),
        generated_press_release_id: result.pressRelease?.id || null,
        generated_seo_audit_id: result.seoAudit?.id || null,
        completed_at: new Date().toISOString(),
      });

      logger.info(`Planner tasks completed for session ${sessionId}`);

      return result;
    } else {
      throw new Error(`Unknown onboarding job type: ${type}`);
    }
  } catch (error) {
    logger.error(`Onboarding job failed for session ${sessionId}:`, error);

    // Update session with error
    await updateOnboardingSession(sessionId, {
      status: 'FAILED',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// Helper functions
async function updateOnboardingSession(
  sessionId: string,
  updates: Record<string, any>
) {
  const { error } = await supabase
    .from('onboarding_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) {
    logger.error(`Failed to update onboarding session ${sessionId}:`, error);
    throw error;
  }
}

async function createAgentResult(
  sessionId: string,
  agentType: string,
  taskId: string
) {
  const { data, error } = await supabase
    .from('onboarding_agent_results')
    .insert({
      session_id: sessionId,
      agent_type: agentType,
      task_id: taskId,
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('Failed to create agent result:', error);
    throw error;
  }

  return data.id;
}

async function updateAgentResult(
  resultId: string,
  updates: Record<string, any>
) {
  const { error } = await supabase
    .from('onboarding_agent_results')
    .update(updates)
    .eq('id', resultId);

  if (error) {
    logger.error(`Failed to update agent result ${resultId}:`, error);
    throw error;
  }
}

// Start onboarding worker
export function startOnboardingWorker() {
  const worker = new Worker<OnboardingJobData>(
    'onboarding-tasks',
    async (job) => {
      await processOnboardingJob(job);
    },
    {
      connection,
      concurrency: 2, // Process 2 onboarding sessions at a time
      limiter: {
        max: 5, // Max 5 jobs per second
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Onboarding job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Onboarding job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('Onboarding worker error:', err);
  });

  logger.info('Onboarding worker started');

  return worker;
}
