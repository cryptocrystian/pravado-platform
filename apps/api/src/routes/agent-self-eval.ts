// =====================================================
// AGENT SELF-EVALUATION API ROUTES
// Sprint 49 Phase 4.5
// =====================================================

import express, { Request, Response } from 'express';
import { agentSelfEvaluator } from '../services/agentSelfEvaluator';
import type {
  ConfidenceEvaluationInput,
  ContradictionDetectionInput,
  SelfImprovementInput,
  SelfEvalLogQuery,
  SelfImprovementSuggestionQuery,
} from '@pravado/types';

const router = express.Router();

/**
 * POST /api/agent-self-eval/evaluate
 * Evaluate agent's confidence in a decision
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const input: ConfidenceEvaluationInput = req.body;

    if (!input.agentId || !input.context?.task) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId and context.task are required',
      });
    }

    const assessment = await agentSelfEvaluator.evaluateDecisionConfidence(input);

    res.status(200).json({ success: true, assessment });
  } catch (error: any) {
    console.error('Error evaluating confidence:', error);
    res.status(500).json({
      error: 'Failed to evaluate confidence',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-self-eval/contradictions
 * Detect contradictions in agent responses
 */
router.post('/contradictions', async (req: Request, res: Response) => {
  try {
    const input: ContradictionDetectionInput = req.body;

    if (!input.agentId || !input.context?.currentTask) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId and context.currentTask are required',
      });
    }

    const result = await agentSelfEvaluator.detectContradictions(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error detecting contradictions:', error);
    res.status(500).json({
      error: 'Failed to detect contradictions',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-self-eval/suggest-improvement
 * Generate self-improvement proposal
 */
router.post('/suggest-improvement', async (req: Request, res: Response) => {
  try {
    const input: SelfImprovementInput = req.body;

    if (!input.agentId || !input.taskOutcome || !input.context?.task) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId, taskOutcome, and context.task are required',
      });
    }

    const plan = await agentSelfEvaluator.generateSelfImprovementProposal(input);

    res.status(200).json({ success: true, plan });
  } catch (error: any) {
    console.error('Error generating improvement proposal:', error);
    res.status(500).json({
      error: 'Failed to generate improvement proposal',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-self-eval/logs/:agentId
 * Get evaluation logs for an agent
 */
router.get('/logs/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const query: SelfEvalLogQuery = {
      agentId,
      evalType: req.query.evalType as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined,
      maxConfidence: req.query.maxConfidence ? parseFloat(req.query.maxConfidence as string) : undefined,
      suggestedAction: req.query.suggestedAction as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const logs = await agentSelfEvaluator.getEvaluationLogs(query);

    res.status(200).json({ success: true, logs, count: logs.length });
  } catch (error: any) {
    console.error('Error fetching evaluation logs:', error);
    res.status(500).json({
      error: 'Failed to fetch evaluation logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-self-eval/suggestions/:agentId
 * Get improvement suggestions for an agent
 */
router.get('/suggestions/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const query: SelfImprovementSuggestionQuery = {
      agentId,
      category: req.query.category as any,
      status: req.query.status as any,
      priority: req.query.priority as any,
      minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const suggestions = await agentSelfEvaluator.getImprovementSuggestions(query);

    res.status(200).json({ success: true, suggestions, count: suggestions.length });
  } catch (error: any) {
    console.error('Error fetching improvement suggestions:', error);
    res.status(500).json({
      error: 'Failed to fetch improvement suggestions',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-self-eval/metrics/:agentId
 * Get self-evaluation metrics for an agent
 */
router.get('/metrics/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await agentSelfEvaluator.getSelfEvalMetrics(agentId, startDate, endDate);

    res.status(200).json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching self-eval metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-self-eval/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-self-eval',
  });
});

export default router;
