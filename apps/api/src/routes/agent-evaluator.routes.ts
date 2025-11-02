// =====================================================
// AGENT EVALUATOR ROUTES
// Sprint 35: Agent performance evaluation framework
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as agentEvaluatorController from '../controllers/agent-evaluator.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// EVALUATION ROUTES
// =====================================================

/**
 * Evaluate agent run
 * POST /api/v1/agent-evaluator/evaluate
 */
router.post('/evaluate', agentEvaluatorController.evaluateRun);

/**
 * Update evaluation
 * PUT /api/v1/agent-evaluator/evaluations/:evaluationId
 */
router.put('/evaluations/:evaluationId', agentEvaluatorController.updateEvaluation);

/**
 * Get evaluations
 * GET /api/v1/agent-evaluator/evaluations
 */
router.get('/evaluations', agentEvaluatorController.getEvaluations);

/**
 * Get evaluation by ID
 * GET /api/v1/agent-evaluator/evaluations/:evaluationId
 */
router.get('/evaluations/:evaluationId', agentEvaluatorController.getEvaluationById);

/**
 * Log evaluation event
 * POST /api/v1/agent-evaluator/evaluations/:evaluationId/events
 */
router.post('/evaluations/:evaluationId/events', agentEvaluatorController.logEvaluationEvent);

/**
 * Get evaluation events
 * GET /api/v1/agent-evaluator/evaluations/:evaluationId/events
 */
router.get('/evaluations/:evaluationId/events', agentEvaluatorController.getEvaluationEvents);

// =====================================================
// TEMPLATE ROUTES
// =====================================================

/**
 * Create evaluation template
 * POST /api/v1/agent-evaluator/templates
 */
router.post('/templates', agentEvaluatorController.createTemplate);

/**
 * Update evaluation template
 * PUT /api/v1/agent-evaluator/templates/:templateId
 */
router.put('/templates/:templateId', agentEvaluatorController.updateTemplate);

/**
 * Get evaluation templates
 * GET /api/v1/agent-evaluator/templates
 */
router.get('/templates', agentEvaluatorController.getTemplates);

// =====================================================
// AI-POWERED INSIGHTS ROUTES
// =====================================================

/**
 * Summarize evaluation (GPT-4)
 * POST /api/v1/agent-evaluator/evaluations/:evaluationId/summarize
 */
router.post('/evaluations/:evaluationId/summarize', agentEvaluatorController.summarizeEvaluation);

/**
 * Recommend agent improvements (GPT-4)
 * POST /api/v1/agent-evaluator/evaluations/:evaluationId/improvements
 */
router.post('/evaluations/:evaluationId/improvements', agentEvaluatorController.recommendImprovements);

// =====================================================
// DASHBOARD ROUTES
// =====================================================

/**
 * Get evaluation dashboard
 * GET /api/v1/agent-evaluator/dashboard
 */
router.get('/dashboard', agentEvaluatorController.getDashboard);

export default router;
