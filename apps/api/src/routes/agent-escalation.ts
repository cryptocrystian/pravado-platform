// =====================================================
// AGENT ESCALATION API ROUTES
// Sprint 51 Phase 4.7
// =====================================================

import express, { Request, Response } from 'express';
import { agentEscalationOrchestrator } from '../services/agentEscalationOrchestrator';
import type {
  EscalateTaskInput,
  HandoffToAgentInput,
  FallbackToDefaultInput,
  EscalationHistoryQuery,
} from '@pravado/types';

const router = express.Router();

/**
 * POST /api/agent-escalation/escalate
 * Escalate a task to another agent
 */
router.post('/escalate', async (req: Request, res: Response) => {
  try {
    const input: EscalateTaskInput = req.body;

    if (!input.agentId || !input.reason) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId and reason are required',
      });
    }

    const result = await agentEscalationOrchestrator.escalateTask(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error escalating task:', error);
    res.status(500).json({
      error: 'Failed to escalate task',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-escalation/handoff
 * Handoff task to another agent
 */
router.post('/handoff', async (req: Request, res: Response) => {
  try {
    const input: HandoffToAgentInput = req.body;

    if (!input.fromAgentId || !input.toAgentId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'fromAgentId and toAgentId are required',
      });
    }

    const result = await agentEscalationOrchestrator.handoffToAgent(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error handing off task:', error);
    res.status(500).json({
      error: 'Failed to handoff task',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-escalation/fallback
 * Fallback to default escalation targets
 */
router.post('/fallback', async (req: Request, res: Response) => {
  try {
    const input: FallbackToDefaultInput = req.body;

    if (!input.agentId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId is required',
      });
    }

    const result = await agentEscalationOrchestrator.fallbackToDefault(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error executing fallback:', error);
    res.status(500).json({
      error: 'Failed to execute fallback',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-escalation/history/:agentId
 * Get escalation history for an agent
 */
router.get('/history/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      fromAgentId,
      toAgentId,
      escalationType,
      reason,
      outcome,
      startDate,
      endDate,
      organizationId,
      limit,
      offset,
    } = req.query;

    const query: EscalationHistoryQuery = {
      agentId,
      fromAgentId: fromAgentId as string,
      toAgentId: toAgentId as string,
      escalationType: escalationType as any,
      reason: reason as any,
      outcome: outcome as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      organizationId: organizationId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const history = await agentEscalationOrchestrator.getEscalationHistory(query);

    res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Error fetching escalation history:', error);
    res.status(500).json({
      error: 'Failed to fetch escalation history',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-escalation/metrics/:agentId
 * Get escalation metrics for an agent
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

    const metrics = await agentEscalationOrchestrator.getEscalationMetrics(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching escalation metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch escalation metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-escalation/trends/:agentId
 * Get escalation trends over time
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

    const trends = await agentEscalationOrchestrator.getEscalationTrends(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string),
      (interval as 'day' | 'week' | 'month') || 'day'
    );

    res.status(200).json({ success: true, trends });
  } catch (error: any) {
    console.error('Error fetching escalation trends:', error);
    res.status(500).json({
      error: 'Failed to fetch escalation trends',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-escalation/path-performance
 * Get escalation path performance
 */
router.get('/path-performance', async (req: Request, res: Response) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    const performance = await agentEscalationOrchestrator.getEscalationPathPerformance(
      organizationId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, performance });
  } catch (error: any) {
    console.error('Error fetching path performance:', error);
    res.status(500).json({
      error: 'Failed to fetch path performance',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-escalation/handoff-stats/:agentId
 * Get agent handoff statistics
 */
router.get('/handoff-stats/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate query parameters are required',
      });
    }

    const stats = await agentEscalationOrchestrator.getAgentHandoffStats(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({ success: true, stats });
  } catch (error: any) {
    console.error('Error fetching handoff stats:', error);
    res.status(500).json({
      error: 'Failed to fetch handoff stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-escalation/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-escalation',
  });
});

export default router;
