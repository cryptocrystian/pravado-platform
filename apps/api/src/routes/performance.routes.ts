// =====================================================
// PERFORMANCE ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as performanceController from '../controllers/performance.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// PERFORMANCE INSIGHTS ROUTES
// =====================================================

/**
 * POST /api/v1/performance/insights
 * Create a performance insight
 */
router.post('/insights', performanceController.createInsight);

/**
 * GET /api/v1/performance/insights/agent/:agentId
 * Get insights for a specific agent
 */
router.get('/insights/agent/:agentId', performanceController.getInsightsForAgent);

/**
 * GET /api/v1/performance/insights/summary
 * Get insight summary for dashboard
 */
router.get('/insights/summary', performanceController.getInsightSummary);

/**
 * GET /api/v1/performance/insights/benchmark/:agentType
 * Compare agent performance to benchmark
 */
router.get('/insights/benchmark/:agentType', performanceController.compareToBenchmark);

// =====================================================
// A/B EXPERIMENT ROUTES
// =====================================================

/**
 * POST /api/v1/performance/experiments
 * Create a new A/B experiment
 */
router.post('/experiments', performanceController.createExperiment);

/**
 * GET /api/v1/performance/experiments
 * List all experiments
 */
router.get('/experiments', performanceController.listExperiments);

/**
 * GET /api/v1/performance/experiments/:experimentId/results
 * Get experiment results
 */
router.get('/experiments/:experimentId/results', performanceController.getExperimentResults);

/**
 * POST /api/v1/performance/experiments/:experimentId/start
 * Start an experiment
 */
router.post('/experiments/:experimentId/start', performanceController.startExperiment);

/**
 * POST /api/v1/performance/experiments/:experimentId/complete
 * Complete an experiment and determine winner
 */
router.post('/experiments/:experimentId/complete', performanceController.completeExperiment);

/**
 * POST /api/v1/performance/variants
 * Create an experiment variant
 */
router.post('/variants', performanceController.createVariant);

/**
 * POST /api/v1/performance/assign
 * Assign entity to experiment variant
 */
router.post('/assign', performanceController.assignVariant);

/**
 * POST /api/v1/performance/record-outcome
 * Record experiment outcome
 */
router.post('/record-outcome', performanceController.recordOutcome);

// =====================================================
// QUALITY METRICS ROUTES
// =====================================================

/**
 * POST /api/v1/performance/quality/calculate
 * Calculate quality metrics for content
 */
router.post('/quality/calculate', performanceController.calculateQualityMetrics);

/**
 * GET /api/v1/performance/quality/trends
 * Get quality trends over time
 */
router.get('/quality/trends', performanceController.getQualityTrends);

/**
 * GET /api/v1/performance/quality/benchmark/:agentType
 * Compare quality to benchmark
 */
router.get('/quality/benchmark/:agentType', performanceController.compareQualityToBenchmark);

export default router;
