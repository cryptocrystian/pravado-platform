// =====================================================
// AGENT COLLABORATION CONTROLLER
// =====================================================
// HTTP request handlers for multi-agent collaboration

import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { collabManager, handoffEngine, messageCenter } from '../../../agents/src/collaboration';
import { logger } from '../lib/logger';
import {
  CreateAgentCollaborationInputSchema,
  UpdateAgentCollaborationInputSchema,
  CreateAgentHandoffInputSchema,
  ResolveAgentHandoffInputSchema,
  CreateAgentChatThreadInputSchema,
  CreateAgentMessageInputSchema,
  EscalationRequestSchema,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class AgentCollabController {
  // =====================================================
  // COLLABORATIONS
  // =====================================================

  async joinGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateAgentCollaborationInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const collaboration = await collabManager.joinGoal(input);

      logger.info('Agent joined goal collaboration', {
        collaborationId: collaboration.id,
        goalId: input.goalId,
        agentId: input.agentId,
      });

      res.status(201).json(collaboration);
    } catch (error) {
      logger.error('Failed to join goal', error);
      next(error);
    }
  }

  async leaveGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { goalId, agentId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await collabManager.leaveGoal(goalId, agentId, organizationId);

      logger.info('Agent left goal collaboration', {
        goalId,
        agentId,
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to leave goal', error);
      next(error);
    }
  }

  async updateCollaboration(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateAgentCollaborationInputSchema.parse(req.body);

      const collaboration = await collabManager.updateCollaboration(
        id,
        input,
        organizationId
      );

      logger.info('Collaboration updated', {
        collaborationId: id,
        updates: input,
      });

      res.json(collaboration);
    } catch (error) {
      logger.error('Failed to update collaboration', error);
      next(error);
    }
  }

  async getGoalCollaborators(req: Request, res: Response, next: NextFunction) {
    try {
      const { goalId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const collaborators = await collabManager.getGoalCollaborators(
        goalId,
        organizationId
      );

      res.json(collaborators);
    } catch (error) {
      logger.error('Failed to get collaborators', error);
      next(error);
    }
  }

  async getCollaborationSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { goalId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await collabManager.getCollaborationSummary(
        goalId,
        organizationId
      );

      res.json(summary);
    } catch (error) {
      logger.error('Failed to get collaboration summary', error);
      next(error);
    }
  }

  // =====================================================
  // HANDOFFS
  // =====================================================

  async initiateHandoff(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateAgentHandoffInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const handoff = await handoffEngine.initiateHandoff(input);

      logger.info('Handoff initiated', {
        handoffId: handoff.id,
        taskId: input.taskId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
      });

      res.status(201).json(handoff);
    } catch (error) {
      logger.error('Failed to initiate handoff', error);
      next(error);
    }
  }

  async approveHandoff(req: Request, res: Response, next: NextFunction) {
    try {
      const { handoffId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = ResolveAgentHandoffInputSchema.parse({
        ...req.body,
        status: 'ACCEPTED',
      });

      const handoff = await handoffEngine.approveHandoff(
        handoffId,
        input,
        organizationId
      );

      logger.info('Handoff approved', {
        handoffId,
        resolvedBy: input.resolvedBy,
      });

      res.json(handoff);
    } catch (error) {
      logger.error('Failed to approve handoff', error);
      next(error);
    }
  }

  async rejectHandoff(req: Request, res: Response, next: NextFunction) {
    try {
      const { handoffId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = ResolveAgentHandoffInputSchema.parse({
        ...req.body,
        status: 'REJECTED',
      });

      const handoff = await handoffEngine.rejectHandoff(
        handoffId,
        input,
        organizationId
      );

      logger.info('Handoff rejected', {
        handoffId,
        resolvedBy: input.resolvedBy,
      });

      res.json(handoff);
    } catch (error) {
      logger.error('Failed to reject handoff', error);
      next(error);
    }
  }

  async getTaskHandoffs(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const handoffs = await handoffEngine.getTaskHandoffs(taskId, organizationId);

      res.json(handoffs);
    } catch (error) {
      logger.error('Failed to get task handoffs', error);
      next(error);
    }
  }

  async getPendingHandoffs(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const handoffs = await handoffEngine.getPendingHandoffs(
        agentId,
        organizationId
      );

      res.json(handoffs);
    } catch (error) {
      logger.error('Failed to get pending handoffs', error);
      next(error);
    }
  }

  // =====================================================
  // MESSAGING
  // =====================================================

  async createThread(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateAgentChatThreadInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const thread = await messageCenter.createThread(input);

      logger.info('Chat thread created', {
        threadId: thread.id,
        goalId: input.goalId,
        taskId: input.taskId,
      });

      res.status(201).json(thread);
    } catch (error) {
      logger.error('Failed to create thread', error);
      next(error);
    }
  }

  async getGoalThreads(req: Request, res: Response, next: NextFunction) {
    try {
      const { goalId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const threads = await messageCenter.getGoalThreads(goalId, organizationId);

      res.json(threads);
    } catch (error) {
      logger.error('Failed to get goal threads', error);
      next(error);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateAgentMessageInputSchema.parse({
        ...req.body,
        organizationId,
        senderUserId: userId,
        senderType: 'user',
      });

      const message = await messageCenter.sendMessage(input);

      logger.info('Message sent', {
        messageId: message.id,
        threadId: input.threadId,
        messageType: input.messageType,
      });

      res.status(201).json(message);
    } catch (error) {
      logger.error('Failed to send message', error);
      next(error);
    }
  }

  async getThreadMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { threadId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await messageCenter.getThreadMessages(
        threadId,
        organizationId,
        limit
      );

      res.json(messages);
    } catch (error) {
      logger.error('Failed to get thread messages', error);
      next(error);
    }
  }

  async escalate(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const request = EscalationRequestSchema.parse(req.body);
      const agentId = req.body.agentId || 'system';

      const message = await messageCenter.escalate(request, agentId, organizationId);

      logger.warn('Escalation created', {
        messageId: message.id,
        severity: request.severity,
        goalId: request.goalId,
        taskId: request.taskId,
      });

      res.status(201).json(message);
    } catch (error) {
      logger.error('Failed to create escalation', error);
      next(error);
    }
  }
}

export const agentCollabController = new AgentCollabController();
