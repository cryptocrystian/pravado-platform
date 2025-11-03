// =====================================================
// AGENT FEEDBACK API ROUTES
// Sprint 48 Phase 4.4
// =====================================================

import express, { Request, Response } from 'express';
import { agentFeedbackEngine } from '../services/agentFeedbackEngine';
import type { AgentFeedbackInput } from '@pravado/shared-types';

const router = express.Router();

/**
 * POST /api/agent-feedback/submit
 * Submit agent feedback
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const feedback: AgentFeedbackInput = req.body;
    const entry = await agentFeedbackEngine.recordAgentFeedback(feedback);

    res.status(201).json({ success: true, entry });
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback', message: error.message });
  }
});

/**
 * GET /api/agent-feedback/summary/:agentId
 * Get feedback summary
 */
router.get('/summary/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await agentFeedbackEngine.getFeedbackSummary(agentId, startDate, endDate);

    res.status(200).json({ success: true, summary });
  } catch (error: any) {
    console.error('Error fetching feedback summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', message: error.message });
  }
});

/**
 * POST /api/agent-feedback/generate-plan/:agentId
 * Generate improvement plans
 */
router.post('/generate-plan/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const plans = await agentFeedbackEngine.generateAgentImprovementTasks(agentId, req.body);

    res.status(200).json({ success: true, plans, count: plans.length });
  } catch (error: any) {
    console.error('Error generating improvement plans:', error);
    res.status(500).json({ error: 'Failed to generate plans', message: error.message });
  }
});

/**
 * GET /api/agent-feedback/plans/:agentId
 * Get improvement plans
 */
router.get('/plans/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const status = req.query.status as any;

    const plans = await agentFeedbackEngine.getImprovementPlans(agentId, status);

    res.status(200).json({ success: true, plans, count: plans.length });
  } catch (error: any) {
    console.error('Error fetching improvement plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans', message: error.message });
  }
});

/**
 * GET /api/agent-feedback/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'agent-feedback' });
});

export default router;
