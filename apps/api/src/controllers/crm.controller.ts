// =====================================================
// CRM CONTROLLER
// =====================================================
// HTTP request handlers for CRM endpoints

import type { Request, Response, NextFunction } from 'express';
import { crmService } from '../services/crm.service';
import { logger } from '../lib/logger';
import {
  CreateInteractionInputSchema,
  UpdateInteractionInputSchema,
  CreateRelationshipInputSchema,
  UpdateRelationshipInputSchema,
  CreateFollowUpInputSchema,
  UpdateFollowUpInputSchema,
  CompleteFollowUpInputSchema,
} from '@pravado/types';

class CRMController {
  // =====================================================
  // INTERACTION ENDPOINTS
  // =====================================================

  /**
   * POST /api/crm/interactions
   * Log a new contact interaction
   */
  async logInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateInteractionInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const interaction = await crmService.logInteraction(userId, input);

      res.status(201).json(interaction);
    } catch (error) {
      logger.error('Failed to log interaction', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/interactions/:contactId
   * Get all interactions for a contact
   */
  async getContactInteractions(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const interactions = await crmService.getContactInteractions(
        contactId,
        organizationId,
        limit,
        offset
      );

      res.json(interactions);
    } catch (error) {
      logger.error('Failed to get contact interactions', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/interactions/:id/detail
   * Get interaction by ID
   */
  async getInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const interaction = await crmService.getInteractionById(id, organizationId);

      if (!interaction) {
        return res.status(404).json({ error: 'Interaction not found' });
      }

      res.json(interaction);
    } catch (error) {
      logger.error('Failed to get interaction', error);
      next(error);
    }
  }

  /**
   * PATCH /api/crm/interactions/:id
   * Update an interaction
   */
  async updateInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateInteractionInputSchema.parse(req.body);

      const interaction = await crmService.updateInteraction(
        id,
        userId,
        organizationId,
        input
      );

      res.json(interaction);
    } catch (error) {
      logger.error('Failed to update interaction', error);
      next(error);
    }
  }

  /**
   * DELETE /api/crm/interactions/:id
   * Delete an interaction
   */
  async deleteInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await crmService.deleteInteraction(id, organizationId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete interaction', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/interactions/:contactId/summary
   * Get interaction summary for a contact
   */
  async getInteractionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await crmService.getInteractionSummary(contactId, organizationId);

      res.json(summary);
    } catch (error) {
      logger.error('Failed to get interaction summary', error);
      next(error);
    }
  }

  // =====================================================
  // RELATIONSHIP ENDPOINTS
  // =====================================================

  /**
   * POST /api/crm/relationships
   * Create a new contact relationship
   */
  async createRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateRelationshipInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const relationship = await crmService.createRelationship(userId, input);

      res.status(201).json(relationship);
    } catch (error) {
      logger.error('Failed to create relationship', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/relationships/:contactId
   * Get relationship between user and contact
   */
  async getRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const relationship = await crmService.getRelationship(
        userId,
        contactId,
        organizationId
      );

      if (!relationship) {
        return res.status(404).json({ error: 'Relationship not found' });
      }

      res.json(relationship);
    } catch (error) {
      logger.error('Failed to get relationship', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/relationships
   * Get all relationships for the current user
   */
  async getUserRelationships(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const activeOnly = req.query.activeOnly !== 'false';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const relationships = await crmService.getUserRelationships(
        userId,
        organizationId,
        activeOnly,
        limit,
        offset
      );

      res.json(relationships);
    } catch (error) {
      logger.error('Failed to get user relationships', error);
      next(error);
    }
  }

  /**
   * PATCH /api/crm/relationships/:contactId
   * Update a relationship
   */
  async updateRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const { contactId } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateRelationshipInputSchema.parse(req.body);

      const relationship = await crmService.updateRelationship(
        userId,
        contactId,
        organizationId,
        input
      );

      res.json(relationship);
    } catch (error) {
      logger.error('Failed to update relationship', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/relationships/strengths
   * Get relationship strengths view
   */
  async getRelationshipStrengths(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const strengths = await crmService.getRelationshipStrengths(
        userId,
        organizationId,
        limit,
        offset
      );

      res.json(strengths);
    } catch (error) {
      logger.error('Failed to get relationship strengths', error);
      next(error);
    }
  }

  // =====================================================
  // FOLLOW-UP ENDPOINTS
  // =====================================================

  /**
   * POST /api/crm/follow-ups
   * Schedule a new follow-up
   */
  async scheduleFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateFollowUpInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const followUp = await crmService.scheduleFollowUp(userId, input);

      res.status(201).json(followUp);
    } catch (error) {
      logger.error('Failed to schedule follow-up', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/follow-ups/:id
   * Get follow-up by ID
   */
  async getFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const followUp = await crmService.getFollowUpById(id, organizationId);

      if (!followUp) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }

      res.json(followUp);
    } catch (error) {
      logger.error('Failed to get follow-up', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/follow-ups
   * Get all follow-ups for the current user
   */
  async getUserFollowUps(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const followUps = await crmService.getUserFollowUps(
        userId,
        organizationId,
        status,
        limit,
        offset
      );

      res.json(followUps);
    } catch (error) {
      logger.error('Failed to get user follow-ups', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/follow-ups/pending
   * Get pending follow-ups
   */
  async getPendingFollowUps(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const followUps = await crmService.getPendingFollowUps(userId, organizationId, limit);

      res.json(followUps);
    } catch (error) {
      logger.error('Failed to get pending follow-ups', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/follow-ups/overdue
   * Get overdue follow-ups
   */
  async getOverdueFollowUps(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const followUps = await crmService.getOverdueFollowUps(
        userId,
        organizationId,
        limit,
        offset
      );

      res.json(followUps);
    } catch (error) {
      logger.error('Failed to get overdue follow-ups', error);
      next(error);
    }
  }

  /**
   * PATCH /api/crm/follow-ups/:id
   * Update a follow-up
   */
  async updateFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateFollowUpInputSchema.parse(req.body);

      const followUp = await crmService.updateFollowUp(id, userId, organizationId, input);

      res.json(followUp);
    } catch (error) {
      logger.error('Failed to update follow-up', error);
      next(error);
    }
  }

  /**
   * POST /api/crm/follow-ups/:id/complete
   * Complete a follow-up
   */
  async completeFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CompleteFollowUpInputSchema.parse(req.body);

      const followUp = await crmService.completeFollowUp(
        id,
        userId,
        organizationId,
        input.completionNotes
      );

      res.json(followUp);
    } catch (error) {
      logger.error('Failed to complete follow-up', error);
      next(error);
    }
  }

  /**
   * DELETE /api/crm/follow-ups/:id
   * Delete a follow-up
   */
  async deleteFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await crmService.deleteFollowUp(id, organizationId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete follow-up', error);
      next(error);
    }
  }

  // =====================================================
  // ACTIVITY & STATS ENDPOINTS
  // =====================================================

  /**
   * GET /api/crm/activity/recent
   * Get recent activity for the current user
   */
  async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const activity = await crmService.getRecentActivity(
        userId,
        organizationId,
        days,
        limit,
        offset
      );

      res.json(activity);
    } catch (error) {
      logger.error('Failed to get recent activity', error);
      next(error);
    }
  }

  /**
   * GET /api/crm/stats
   * Get CRM stats for the current user
   */
  async getUserCRMStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await crmService.getUserCRMStats(userId, organizationId);

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get user CRM stats', error);
      next(error);
    }
  }
}

export const crmController = new CRMController();
