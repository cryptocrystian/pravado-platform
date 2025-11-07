// =====================================================
// AGENT COLLABORATION QUEUE
// =====================================================
// Background workers for collaboration join/leave, handoffs, messaging, and escalations

import { Queue, Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { collabManager, handoffEngine, messageCenter } from '../collaboration';
import { logger } from '../lib/logger';
import type {
  CreateAgentCollaborationInput,
  CreateAgentHandoffInput,
  ResolveAgentHandoffInput,
  CreateAgentMessageInput,
  EscalationRequest,
} from '@pravado/types';

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

interface JoinGoalJob {
  input: CreateAgentCollaborationInput;
}

interface LeaveGoalJob {
  goalId: string;
  agentId: string;
  organizationId: string;
}

interface InitiateHandoffJob {
  input: CreateAgentHandoffInput;
}

interface ResolveHandoffJob {
  handoffId: string;
  resolution: ResolveAgentHandoffInput;
  organizationId: string;
}

interface SendMessageJob {
  input: CreateAgentMessageInput;
}

interface HandleEscalationJob {
  request: EscalationRequest;
  agentId: string;
  organizationId: string;
}

// =====================================================
// QUEUE CREATION
// =====================================================

export const agentCollabQueue = new Queue('agent-collab', {
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
 * Worker: Process collaboration join requests
 */
const joinGoalWorker = new Worker<JoinGoalJob>(
  'agent-collab',
  async (job: Job<JoinGoalJob>) => {
    const { input } = job.data;

    logger.info(`[CollabQueue] Processing join goal request`, {
      jobId: job.id,
      goalId: input.goalId,
      agentId: input.agentId,
    });

    try {
      const collaboration = await collabManager.joinGoal(input);

      logger.info(`[CollabQueue] Agent joined goal successfully`, {
        jobId: job.id,
        collaborationId: collaboration.id,
      });

      return collaboration;
    } catch (error) {
      logger.error(`[CollabQueue] Failed to join goal`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 10,
  }
);

/**
 * Worker: Process collaboration leave requests
 */
const leaveGoalWorker = new Worker<LeaveGoalJob>(
  'agent-collab',
  async (job: Job<LeaveGoalJob>) => {
    const { goalId, agentId, organizationId } = job.data;

    logger.info(`[CollabQueue] Processing leave goal request`, {
      jobId: job.id,
      goalId,
      agentId,
    });

    try {
      await collabManager.leaveGoal(goalId, agentId, organizationId);

      logger.info(`[CollabQueue] Agent left goal successfully`, {
        jobId: job.id,
      });

      return { success: true };
    } catch (error) {
      logger.error(`[CollabQueue] Failed to leave goal`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 10,
  }
);

/**
 * Worker: Process handoff initiation
 */
const initiateHandoffWorker = new Worker<InitiateHandoffJob>(
  'agent-collab',
  async (job: Job<InitiateHandoffJob>) => {
    const { input } = job.data;

    logger.info(`[CollabQueue] Processing handoff initiation`, {
      jobId: job.id,
      taskId: input.taskId,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
    });

    try {
      const handoff = await handoffEngine.initiateHandoff(input);

      // Send notification message to target agent
      await messageCenter.sendMessage({
        threadId: handoff.id, // This should use the thread ID
        senderType: 'system',
        messageType: 'REQUEST',
        content: `Handoff request from ${input.fromAgentId}: ${input.handoffReason}`,
        metadata: {
          handoffId: handoff.id,
          taskId: input.taskId,
        },
        organizationId: input.organizationId,
      });

      logger.info(`[CollabQueue] Handoff initiated successfully`, {
        jobId: job.id,
        handoffId: handoff.id,
      });

      return handoff;
    } catch (error) {
      logger.error(`[CollabQueue] Failed to initiate handoff`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 10,
  }
);

/**
 * Worker: Process handoff resolution (accept/reject)
 */
const resolveHandoffWorker = new Worker<ResolveHandoffJob>(
  'agent-collab',
  async (job: Job<ResolveHandoffJob>) => {
    const { handoffId, resolution, organizationId } = job.data;

    logger.info(`[CollabQueue] Processing handoff resolution`, {
      jobId: job.id,
      handoffId,
      status: resolution.status,
    });

    try {
      let handoff;

      if (resolution.status === 'ACCEPTED') {
        handoff = await handoffEngine.approveHandoff(handoffId, resolution, organizationId);
      } else {
        handoff = await handoffEngine.rejectHandoff(handoffId, resolution, organizationId);
      }

      logger.info(`[CollabQueue] Handoff resolved successfully`, {
        jobId: job.id,
        status: handoff.status,
      });

      return handoff;
    } catch (error) {
      logger.error(`[CollabQueue] Failed to resolve handoff`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 10,
  }
);

/**
 * Worker: Process cross-agent messaging
 */
const sendMessageWorker = new Worker<SendMessageJob>(
  'agent-collab',
  async (job: Job<SendMessageJob>) => {
    const { input } = job.data;

    logger.info(`[CollabQueue] Processing message send`, {
      jobId: job.id,
      threadId: input.threadId,
      messageType: input.messageType,
    });

    try {
      const message = await messageCenter.sendMessage(input);

      logger.info(`[CollabQueue] Message sent successfully`, {
        jobId: job.id,
        messageId: message.id,
      });

      return message;
    } catch (error) {
      logger.error(`[CollabQueue] Failed to send message`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 20,
  }
);

/**
 * Worker: Handle escalations to human oversight
 */
const handleEscalationWorker = new Worker<HandleEscalationJob>(
  'agent-collab',
  async (job: Job<HandleEscalationJob>) => {
    const { request, agentId, organizationId } = job.data;

    logger.info(`[CollabQueue] Processing escalation`, {
      jobId: job.id,
      severity: request.severity,
      agentId,
    });

    try {
      // Create escalation message
      const message = await messageCenter.escalate(request, agentId, organizationId);

      // If critical, send notification to organization admins
      if (request.severity === 'critical') {
        // TODO: Implement admin notification via email/webhook
        logger.warn(`[CollabQueue] CRITICAL escalation created`, {
          jobId: job.id,
          escalationId: message.id,
          goalId: request.goalId,
          taskId: request.taskId,
        });
      }

      logger.info(`[CollabQueue] Escalation handled successfully`, {
        jobId: job.id,
        messageId: message.id,
      });

      return message;
    } catch (error) {
      logger.error(`[CollabQueue] Failed to handle escalation`, error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 10,
  }
);

// =====================================================
// QUEUE FUNCTIONS
// =====================================================

/**
 * Queue an agent to join a goal collaboration
 */
export async function queueJoinGoal(
  input: CreateAgentCollaborationInput
): Promise<Job<JoinGoalJob>> {
  return await agentCollabQueue.add(
    'join-goal',
    { input },
    {
      jobId: `join-${input.goalId}-${input.agentId}-${Date.now()}`,
    }
  );
}

/**
 * Queue an agent to leave a goal collaboration
 */
export async function queueLeaveGoal(
  goalId: string,
  agentId: string,
  organizationId: string
): Promise<Job<LeaveGoalJob>> {
  return await agentCollabQueue.add(
    'leave-goal',
    { goalId, agentId, organizationId },
    {
      jobId: `leave-${goalId}-${agentId}-${Date.now()}`,
    }
  );
}

/**
 * Queue a handoff initiation
 */
export async function queueInitiateHandoff(
  input: CreateAgentHandoffInput
): Promise<Job<InitiateHandoffJob>> {
  return await agentCollabQueue.add(
    'initiate-handoff',
    { input },
    {
      jobId: `handoff-${input.taskId}-${Date.now()}`,
      priority: 2, // Higher priority for handoffs
    }
  );
}

/**
 * Queue a handoff resolution
 */
export async function queueResolveHandoff(
  handoffId: string,
  resolution: ResolveAgentHandoffInput,
  organizationId: string
): Promise<Job<ResolveHandoffJob>> {
  return await agentCollabQueue.add(
    'resolve-handoff',
    { handoffId, resolution, organizationId },
    {
      jobId: `resolve-${handoffId}-${Date.now()}`,
      priority: 2, // Higher priority for resolutions
    }
  );
}

/**
 * Queue a message send
 */
export async function queueSendMessage(
  input: CreateAgentMessageInput
): Promise<Job<SendMessageJob>> {
  return await agentCollabQueue.add(
    'send-message',
    { input },
    {
      jobId: `message-${input.threadId}-${Date.now()}`,
      priority: input.messageType === 'ESCALATION' ? 1 : 3,
    }
  );
}

/**
 * Queue an escalation
 */
export async function queueEscalation(
  request: EscalationRequest,
  agentId: string,
  organizationId: string
): Promise<Job<HandleEscalationJob>> {
  return await agentCollabQueue.add(
    'handle-escalation',
    { request, agentId, organizationId },
    {
      jobId: `escalation-${agentId}-${Date.now()}`,
      priority: request.severity === 'critical' ? 1 : 3,
    }
  );
}

// =====================================================
// WORKER EVENT LISTENERS
// =====================================================

joinGoalWorker.on('completed', (job, result) => {
  logger.info(`[CollabQueue] Join goal job completed`, {
    jobId: job.id,
    collaborationId: result.id,
  });
});

joinGoalWorker.on('failed', (job, error) => {
  logger.error(`[CollabQueue] Join goal job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

leaveGoalWorker.on('completed', (job) => {
  logger.info(`[CollabQueue] Leave goal job completed`, {
    jobId: job.id,
  });
});

leaveGoalWorker.on('failed', (job, error) => {
  logger.error(`[CollabQueue] Leave goal job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

initiateHandoffWorker.on('completed', (job, result) => {
  logger.info(`[CollabQueue] Handoff initiation job completed`, {
    jobId: job.id,
    handoffId: result.id,
  });
});

initiateHandoffWorker.on('failed', (job, error) => {
  logger.error(`[CollabQueue] Handoff initiation job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

resolveHandoffWorker.on('completed', (job, result) => {
  logger.info(`[CollabQueue] Handoff resolution job completed`, {
    jobId: job.id,
    status: result.status,
  });
});

resolveHandoffWorker.on('failed', (job, error) => {
  logger.error(`[CollabQueue] Handoff resolution job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

sendMessageWorker.on('completed', (job, result) => {
  logger.info(`[CollabQueue] Message send job completed`, {
    jobId: job.id,
    messageId: result.id,
  });
});

sendMessageWorker.on('failed', (job, error) => {
  logger.error(`[CollabQueue] Message send job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

handleEscalationWorker.on('completed', (job, result) => {
  logger.info(`[CollabQueue] Escalation job completed`, {
    jobId: job.id,
    messageId: result.id,
  });
});

handleEscalationWorker.on('failed', (job, error) => {
  logger.error(`[CollabQueue] Escalation job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});
