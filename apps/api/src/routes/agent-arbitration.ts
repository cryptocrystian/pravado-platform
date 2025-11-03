// =====================================================
// AGENT ARBITRATION API ROUTES
// Sprint 52 Phase 4.8
// =====================================================

import express, { Request, Response } from 'express';
import { agentArbitrationEngine } from '../services/agentArbitrationEngine';
import type {
  DetectConflictInput,
  ResolveConflictInput,
  LogConflictResolutionInput,
  ConflictHistoryQuery,
  ResolutionOutcomeQuery,
} from '@pravado/shared-types';

const router = express.Router();

/**
 * POST /api/agent-arbitration/detect
 * Detect conflicts between agent outputs
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const input: DetectConflictInput = req.body;

    if (!input.agentIds || input.agentIds.length < 2) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'At least 2 agent IDs are required',
      });
    }

    const report = await agentArbitrationEngine.detectConflictBetweenAgents(input);

    res.status(200).json({ success: true, report });
  } catch (error: any) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({
      error: 'Failed to detect conflicts',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-arbitration/resolve
 * Resolve agent conflict using arbitration strategy
 */
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const input: ResolveConflictInput = req.body;

    if (!input.strategy) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Arbitration strategy is required',
      });
    }

    const outcome = await agentArbitrationEngine.resolveAgentConflict(input);

    // Auto-log if successful
    if (outcome.success && input.conflicts && input.conflicts.length > 0) {
      const conflict = input.conflicts[0];
      await agentArbitrationEngine.logConflictResolution({
        conflictId: conflict.conflictId,
        agentIds: conflict.involvedAgents,
        conflictType: conflict.type,
        severity: conflict.severity,
        resolution: outcome,
        context: input.context,
        taskId: input.context.taskId,
        conversationId: input.context.conversationId,
      });
    }

    res.status(200).json({ success: true, outcome });
  } catch (error: any) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      error: 'Failed to resolve conflict',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-arbitration/log
 * Log conflict resolution
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const input: LogConflictResolutionInput = req.body;

    if (!input.agentIds || !input.conflictType || !input.resolution) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'agentIds, conflictType, and resolution are required',
      });
    }

    await agentArbitrationEngine.logConflictResolution(input);

    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('Error logging conflict resolution:', error);
    res.status(500).json({
      error: 'Failed to log conflict resolution',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/conflicts/:agentId
 * Get conflict history for an agent
 */
router.get('/conflicts/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      conflictType,
      severity,
      status,
      startDate,
      endDate,
      taskId,
      conversationId,
      organizationId,
      limit,
      offset,
    } = req.query;

    const query: ConflictHistoryQuery = {
      agentId,
      conflictType: conflictType as any,
      severity: severity as any,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      taskId: taskId as string,
      conversationId: conversationId as string,
      organizationId: organizationId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const history = await agentArbitrationEngine.getConflictHistory(query);

    res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Error fetching conflict history:', error);
    res.status(500).json({
      error: 'Failed to fetch conflict history',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/outcomes/:agentId
 * Get resolution outcomes for an agent
 */
router.get('/outcomes/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      conflictId,
      outcomeType,
      strategy,
      startDate,
      endDate,
      taskId,
      organizationId,
      limit,
      offset,
    } = req.query;

    const query: ResolutionOutcomeQuery = {
      agentId,
      conflictId: conflictId as string,
      outcomeType: outcomeType as any,
      strategy: strategy as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      taskId: taskId as string,
      organizationId: organizationId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const outcomes = await agentArbitrationEngine.getResolutionOutcomes(query);

    res.status(200).json({ success: true, outcomes });
  } catch (error: any) {
    console.error('Error fetching resolution outcomes:', error);
    res.status(500).json({
      error: 'Failed to fetch resolution outcomes',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/metrics
 * Get conflict metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { agentId, organizationId, startDate, endDate } = req.query;

    const metrics = await agentArbitrationEngine.getConflictMetrics(
      agentId as string,
      organizationId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching conflict metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch conflict metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/trends
 * Get conflict trends over time
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { agentId, organizationId, startDate, endDate, interval } = req.query;

    const trends = await agentArbitrationEngine.getConflictTrends(
      agentId as string,
      organizationId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      (interval as 'day' | 'week' | 'month') || 'day'
    );

    res.status(200).json({ success: true, trends });
  } catch (error: any) {
    console.error('Error fetching conflict trends:', error);
    res.status(500).json({
      error: 'Failed to fetch conflict trends',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/strategy-performance
 * Get strategy performance analysis
 */
router.get('/strategy-performance', async (req: Request, res: Response) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    const performance = await agentArbitrationEngine.getStrategyPerformance(
      organizationId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, performance });
  } catch (error: any) {
    console.error('Error fetching strategy performance:', error);
    res.status(500).json({
      error: 'Failed to fetch strategy performance',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/agent-profile/:agentId
 * Get agent conflict profile
 */
router.get('/agent-profile/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;

    const profile = await agentArbitrationEngine.getAgentConflictProfile(
      agentId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    console.error('Error fetching agent conflict profile:', error);
    res.status(500).json({
      error: 'Failed to fetch agent conflict profile',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-arbitration/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-arbitration',
  });
});

export default router;
