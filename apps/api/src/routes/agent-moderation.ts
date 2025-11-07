// =====================================================
// AGENT MODERATION API ROUTES
// Sprint 51 Phase 4.7
// =====================================================

import express, { Request, Response } from 'express';
import { agentModerationEngine } from '../services/agentModerationEngine';
import type {
  ModerateAgentOutputInput,
  LogModerationEventInput,
  ModerationHistoryQuery,
  ModerationRuleQuery,
} from '@pravado/types';

const router = express.Router();

/**
 * POST /api/agent-moderation/moderate
 * Moderate agent output using AI + static rules
 */
router.post('/moderate', async (req: Request, res: Response) => {
  try {
    const input: ModerateAgentOutputInput = req.body;

    if (!input.agentId || !input.message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId and message are required',
      });
    }

    const result = await agentModerationEngine.moderateAgentOutput(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error moderating output:', error);
    res.status(500).json({
      error: 'Failed to moderate output',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-moderation/apply-rules
 * Apply moderation rules with automatic action execution
 */
router.post('/apply-rules', async (req: Request, res: Response) => {
  try {
    const { agentId, message, context } = req.body;

    if (!agentId || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId and message are required',
      });
    }

    const result = await agentModerationEngine.applyModerationRules(
      agentId,
      message,
      context
    );

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error applying moderation rules:', error);
    res.status(500).json({
      error: 'Failed to apply moderation rules',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-moderation/log
 * Log a moderation event
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const input: LogModerationEventInput = req.body;

    if (!input.agentId || !input.message || !input.result) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId, message, and result are required',
      });
    }

    await agentModerationEngine.logModerationEvent(input);

    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('Error logging moderation event:', error);
    res.status(500).json({
      error: 'Failed to log moderation event',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-moderation/history/:agentId
 * Get moderation history for an agent
 */
router.get('/history/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      categories,
      severity,
      action,
      startDate,
      endDate,
      minConfidence,
      organizationId,
      limit,
      offset,
    } = req.query;

    const query: ModerationHistoryQuery = {
      agentId,
      categories: categories ? (categories as string).split(',') as any : undefined,
      severity: severity as any,
      action: action as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minConfidence: minConfidence ? parseFloat(minConfidence as string) : undefined,
      organizationId: organizationId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const history = await agentModerationEngine.getModerationHistory(query);

    res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Error fetching moderation history:', error);
    res.status(500).json({
      error: 'Failed to fetch moderation history',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-moderation/metrics/:agentId
 * Get moderation metrics for an agent
 */
router.get('/metrics/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate query parameters are required',
      });
    }

    const metrics = await agentModerationEngine.getModerationMetrics(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching moderation metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch moderation metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-moderation/trends/:agentId
 * Get moderation trends over time
 */
router.get('/trends/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate, interval } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate query parameters are required',
      });
    }

    const trends = await agentModerationEngine.getModerationTrends(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string),
      (interval as 'day' | 'week' | 'month') || 'day'
    );

    res.status(200).json({ success: true, trends });
  } catch (error: any) {
    console.error('Error fetching moderation trends:', error);
    res.status(500).json({
      error: 'Failed to fetch moderation trends',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-moderation/category-breakdown/:agentId
 * Get category breakdown
 */
router.get('/category-breakdown/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate query parameters are required',
      });
    }

    const breakdown = await agentModerationEngine.getCategoryBreakdown(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({ success: true, breakdown });
  } catch (error: any) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({
      error: 'Failed to fetch category breakdown',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-moderation/rules
 * Get moderation rules with filters
 */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { organizationId, category, type, enabled, limit, offset } = req.query;

    const query: ModerationRuleQuery = {
      organizationId: organizationId as string,
      category: category as any,
      type: type as any,
      enabled: enabled ? enabled === 'true' : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const rules = await agentModerationEngine.getModerationRules(query);

    res.status(200).json({ success: true, rules });
  } catch (error: any) {
    console.error('Error fetching moderation rules:', error);
    res.status(500).json({
      error: 'Failed to fetch moderation rules',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-moderation/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-moderation',
  });
});

export default router;
