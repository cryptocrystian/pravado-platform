// =====================================================
// AGENT DEBUG API ROUTES
// Sprint 59 Phase 5.6
// =====================================================

import { Router, Request, Response } from 'express';
import { AgentDebugService } from '../services/agentDebugService';
import { LogTraceRequest, TraceSearchFilters } from '@pravado/shared-types';

const router = Router();

/**
 * POST /api/agent-debug/log-trace
 * Logs a complete trace tree for an agent execution
 */
router.post('/log-trace', async (req: Request, res: Response) => {
  try {
    const request: LogTraceRequest = req.body;

    // Validate request
    if (!request.agentId || !request.tenantId || !request.traceTree) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, tenantId, or traceTree',
      });
    }

    const response = await AgentDebugService.logTraceTree(request);

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error in POST /log-trace:', error);
    res.status(500).json({
      error: error.message || 'Failed to log trace',
    });
  }
});

/**
 * GET /api/agent-debug/turn/:turnId
 * Retrieves the complete trace for a specific conversation turn
 */
router.get('/turn/:turnId', async (req: Request, res: Response) => {
  try {
    const { turnId } = req.params;

    if (!turnId) {
      return res.status(400).json({ error: 'Missing turnId parameter' });
    }

    const trace = await AgentDebugService.getTraceByTurn(turnId);

    if (!trace) {
      return res.status(404).json({ error: 'Trace not found for turn' });
    }

    res.json(trace);
  } catch (error: any) {
    console.error(`Error in GET /turn/${req.params.turnId}:`, error);
    res.status(500).json({
      error: error.message || 'Failed to fetch trace',
    });
  }
});

/**
 * GET /api/agent-debug/agent/:agentId
 * Retrieves all traces for a specific agent with pagination
 */
router.get('/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    if (!agentId) {
      return res.status(400).json({ error: 'Missing agentId parameter' });
    }

    const results = await AgentDebugService.getTraceByAgent(agentId, page, pageSize);

    res.json(results);
  } catch (error: any) {
    console.error(`Error in GET /agent/${req.params.agentId}:`, error);
    res.status(500).json({
      error: error.message || 'Failed to fetch traces',
    });
  }
});

/**
 * GET /api/agent-debug/search
 * Searches traces based on filters
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const filters: TraceSearchFilters = {
      agentId: req.query.agentId as string,
      conversationId: req.query.conversationId as string,
      turnId: req.query.turnId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      severity: req.query.severity as any,
      nodeType: req.query.nodeType as any,
      query: req.query.query as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      hasErrors: req.query.hasErrors === 'true' ? true : req.query.hasErrors === 'false' ? false : undefined,
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
      page: parseInt(req.query.page as string) || 0,
      pageSize: parseInt(req.query.pageSize as string) || 50,
    };

    const results = await AgentDebugService.searchTraces(filters);

    res.json(results);
  } catch (error: any) {
    console.error('Error in GET /search:', error);
    res.status(500).json({
      error: error.message || 'Failed to search traces',
    });
  }
});

/**
 * GET /api/agent-debug/summary/:traceId
 * Returns a high-level summary of a trace
 */
router.get('/summary/:traceId', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;

    if (!traceId) {
      return res.status(400).json({ error: 'Missing traceId parameter' });
    }

    const summary = await AgentDebugService.summarizeTrace(traceId);

    if (!summary) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    res.json(summary);
  } catch (error: any) {
    console.error(`Error in GET /summary/${req.params.traceId}:`, error);
    res.status(500).json({
      error: error.message || 'Failed to fetch trace summary',
    });
  }
});

/**
 * GET /api/agent-debug/metrics/:traceId
 * Returns performance metrics for a trace
 */
router.get('/metrics/:traceId', async (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;

    if (!traceId) {
      return res.status(400).json({ error: 'Missing traceId parameter' });
    }

    const metrics = await AgentDebugService.getPerformanceMetrics(traceId);

    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found for trace' });
    }

    res.json(metrics);
  } catch (error: any) {
    console.error(`Error in GET /metrics/${req.params.traceId}:`, error);
    res.status(500).json({
      error: error.message || 'Failed to fetch trace metrics',
    });
  }
});

export default router;
