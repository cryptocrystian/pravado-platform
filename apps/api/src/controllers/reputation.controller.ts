// =====================================================
// REPUTATION CONTROLLER
// =====================================================
// HTTP request handlers for reputation monitoring endpoints

import type { Request, Response, NextFunction } from 'express';
import { reputationService } from '../services/reputation.service';
import { ingestMediaMention } from '../../agents/src/queues/media-monitoring.queue';
import { logger } from '../lib/logger';
import {
  MentionSearchParamsSchema,
  CreateMonitoringRuleInputSchema,
  UpdateMonitoringRuleInputSchema,
  SubmitFeedbackInputSchema,
} from '@pravado/shared-types';

class ReputationController {
  // =====================================================
  // MEDIA MENTIONS
  // =====================================================

  /**
   * GET /api/reputation/mentions
   * List media mentions with filters
   */
  async listMentions(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const params = MentionSearchParamsSchema.parse({
        mentionType: req.query.mentionType ? JSON.parse(req.query.mentionType as string) : undefined,
        medium: req.query.medium ? JSON.parse(req.query.medium as string) : undefined,
        sentiment: req.query.sentiment ? JSON.parse(req.query.sentiment as string) : undefined,
        minRelevance: req.query.minRelevance ? parseFloat(req.query.minRelevance as string) : undefined,
        minVisibility: req.query.minVisibility ? parseFloat(req.query.minVisibility as string) : undefined,
        isViral: req.query.isViral === 'true' ? true : req.query.isViral === 'false' ? false : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        outlet: req.query.outlet as string,
        topics: req.query.topics ? JSON.parse(req.query.topics as string) : undefined,
        searchQuery: req.query.searchQuery as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      });

      const result = await reputationService.listMentions(organizationId, params);

      res.json(result);
    } catch (error) {
      logger.error('Failed to list mentions', error);
      next(error);
    }
  }

  /**
   * GET /api/reputation/mentions/:id
   * Get mention by ID
   */
  async getMention(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const mention = await reputationService.getMentionById(id, organizationId);

      if (!mention) {
        return res.status(404).json({ error: 'Mention not found' });
      }

      res.json(mention);
    } catch (error) {
      logger.error('Failed to get mention', error);
      next(error);
    }
  }

  /**
   * GET /api/reputation/mentions/:id/similar
   * Find similar mentions
   */
  async findSimilarMentions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const similar = await reputationService.findSimilarMentions(id, organizationId, limit);

      res.json(similar);
    } catch (error) {
      logger.error('Failed to find similar mentions', error);
      next(error);
    }
  }

  /**
   * POST /api/reputation/mentions/feedback
   * Submit mention feedback
   */
  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = SubmitFeedbackInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const feedback = await reputationService.submitFeedback(userId, input);

      res.status(201).json(feedback);
    } catch (error) {
      logger.error('Failed to submit feedback', error);
      next(error);
    }
  }

  // =====================================================
  // TRENDS & ANALYTICS
  // =====================================================

  /**
   * GET /api/reputation/trends
   * Get mention trends over time
   */
  async getMentionTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const granularity = (req.query.granularity as 'daily' | 'weekly' | 'monthly') || 'daily';

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const trends = await reputationService.getMentionTrends(
        organizationId,
        startDate,
        endDate,
        granularity
      );

      res.json(trends);
    } catch (error) {
      logger.error('Failed to get mention trends', error);
      next(error);
    }
  }

  /**
   * GET /api/reputation/stats
   * Get monitoring statistics
   */
  async getMonitoringStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await reputationService.getMonitoringStats(organizationId, startDate, endDate);

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get monitoring stats', error);
      next(error);
    }
  }

  // =====================================================
  // MONITORING RULES
  // =====================================================

  /**
   * GET /api/reputation/rules
   * List monitoring rules
   */
  async listRules(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const activeOnly = req.query.activeOnly !== 'false';

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const rules = await reputationService.listMonitoringRules(organizationId, activeOnly);

      res.json(rules);
    } catch (error) {
      logger.error('Failed to list rules', error);
      next(error);
    }
  }

  /**
   * POST /api/reputation/rules
   * Create monitoring rule
   */
  async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateMonitoringRuleInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const rule = await reputationService.createMonitoringRule(userId, input);

      res.status(201).json(rule);
    } catch (error) {
      logger.error('Failed to create rule', error);
      next(error);
    }
  }

  /**
   * PATCH /api/reputation/rules/:id
   * Update monitoring rule
   */
  async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateMonitoringRuleInputSchema.parse(req.body);

      const rule = await reputationService.updateMonitoringRule(id, userId, organizationId, input);

      res.json(rule);
    } catch (error) {
      logger.error('Failed to update rule', error);
      next(error);
    }
  }

  /**
   * DELETE /api/reputation/rules/:id
   * Delete monitoring rule
   */
  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await reputationService.deleteMonitoringRule(id, organizationId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete rule', error);
      next(error);
    }
  }

  // =====================================================
  // ALERTS
  // =====================================================

  /**
   * GET /api/reputation/alerts
   * List mention alerts
   */
  async listAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const alerts = await reputationService.listAlerts(organizationId, limit, offset);

      res.json(alerts);
    } catch (error) {
      logger.error('Failed to list alerts', error);
      next(error);
    }
  }

  /**
   * POST /api/reputation/alerts/:id/view
   * Mark alert as viewed
   */
  async markAlertAsViewed(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await reputationService.markAlertAsViewed(id, organizationId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to mark alert as viewed', error);
      next(error);
    }
  }

  // =====================================================
  // SNAPSHOTS
  // =====================================================

  /**
   * GET /api/reputation/snapshots
   * Get monitoring snapshots
   */
  async getSnapshots(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const snapshotType = (req.query.snapshotType as string) || 'DAILY';

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const snapshots = await reputationService.getSnapshots(
        organizationId,
        startDate,
        endDate,
        snapshotType
      );

      res.json(snapshots);
    } catch (error) {
      logger.error('Failed to get snapshots', error);
      next(error);
    }
  }
}

export const reputationController = new ReputationController();
