// =====================================================
// EXECUTION ROUTES - DAG Execution API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as executionController from '../controllers/execution.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// EXECUTION CONTROL ROUTES
// =====================================================

/**
 * Start campaign execution
 * POST /api/v1/execution/:campaignId/start
 * Body: { parallelism?: number, dryRun?: boolean }
 */
router.post('/:campaignId/start', executionController.startExecution);

/**
 * Stop campaign execution
 * POST /api/v1/execution/:campaignId/stop
 */
router.post('/:campaignId/stop', executionController.stopExecution);

// =====================================================
// STATUS AND MONITORING ROUTES
// =====================================================

/**
 * Get execution status
 * GET /api/v1/execution/:campaignId/status
 */
router.get('/:campaignId/status', executionController.getExecutionStatus);

/**
 * Get execution summary
 * GET /api/v1/execution/:campaignId/summary
 */
router.get('/:campaignId/summary', executionController.getExecutionSummary);

/**
 * Get execution logs
 * GET /api/v1/execution/:campaignId/logs
 */
router.get('/:campaignId/logs', executionController.getExecutionLogs);

// =====================================================
// TASK CONTROL ROUTES
// =====================================================

/**
 * Retry failed task
 * POST /api/v1/execution/:campaignId/retry/:nodeId
 */
router.post('/:campaignId/retry/:nodeId', executionController.retryTask);

/**
 * Skip blocked task
 * POST /api/v1/execution/:campaignId/skip/:nodeId
 * Body: { reason?: string }
 */
router.post('/:campaignId/skip/:nodeId', executionController.skipTask);

export default router;
