// =====================================================
// FOLLOWUP ROUTES - Automated Follow-Up API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as followupController from '../controllers/followup.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// SEQUENCE ROUTES
// =====================================================

/**
 * Create followup sequence
 * POST /api/v1/followup/sequences
 */
router.post('/sequences', followupController.createSequence);

/**
 * List followup sequences
 * GET /api/v1/followup/sequences
 * Query params: campaignId, isActive, limit, offset
 */
router.get('/sequences', followupController.listSequences);

/**
 * Get followup sequence with steps
 * GET /api/v1/followup/sequences/:sequenceId
 */
router.get('/sequences/:sequenceId', followupController.getSequence);

/**
 * Update followup sequence
 * PUT /api/v1/followup/sequences/:sequenceId
 */
router.put('/sequences/:sequenceId', followupController.updateSequence);

/**
 * Delete followup sequence
 * DELETE /api/v1/followup/sequences/:sequenceId
 */
router.delete('/sequences/:sequenceId', followupController.deleteSequence);

/**
 * Get sequence summary with statistics
 * GET /api/v1/followup/sequences/:sequenceId/summary
 */
router.get('/sequences/:sequenceId/summary', followupController.getSequenceSummary);

// =====================================================
// STEP ROUTES
// =====================================================

/**
 * Create followup step
 * POST /api/v1/followup/steps
 */
router.post('/steps', followupController.createStep);

/**
 * Update followup step
 * PUT /api/v1/followup/steps/:stepId
 */
router.put('/steps/:stepId', followupController.updateStep);

/**
 * Delete followup step
 * DELETE /api/v1/followup/steps/:stepId
 */
router.delete('/steps/:stepId', followupController.deleteStep);

// =====================================================
// EXECUTION ROUTES
// =====================================================

/**
 * Generate followups for campaign
 * POST /api/v1/followup/generate
 * Body: { campaignId, sequenceId, contactIds? }
 */
router.post('/generate', followupController.generateFollowups);

/**
 * Evaluate followup triggers
 * POST /api/v1/followup/evaluate/:followupId
 */
router.post('/evaluate/:followupId', followupController.evaluateTriggers);

/**
 * Reschedule followup
 * POST /api/v1/followup/reschedule/:followupId
 * Body: { newScheduledAt, reason }
 */
router.post('/reschedule/:followupId', followupController.rescheduleFollowup);

/**
 * Cancel followup sequence for contact
 * POST /api/v1/followup/cancel
 * Body: { contactId, sequenceId, reason }
 */
router.post('/cancel', followupController.cancelSequence);

/**
 * Get due followups
 * GET /api/v1/followup/due
 * Query params: limit
 */
router.get('/due', followupController.getDueFollowups);

/**
 * Execute single followup
 * POST /api/v1/followup/execute/:followupId
 * Body: { dryRun? }
 */
router.post('/execute/:followupId', followupController.executeFollowup);

/**
 * Execute batch of due followups
 * POST /api/v1/followup/execute-batch
 * Body: { limit? }
 */
router.post('/execute-batch', followupController.executeBatch);

// =====================================================
// QUERY ROUTES
// =====================================================

/**
 * List scheduled followups
 * GET /api/v1/followup/scheduled
 * Query params: campaignId, sequenceId, contactId, status, scheduledBefore, scheduledAfter, limit, offset
 */
router.get('/scheduled', followupController.listScheduledFollowups);

/**
 * Get contact followup status
 * GET /api/v1/followup/contacts/:contactId/status
 */
router.get('/contacts/:contactId/status', followupController.getContactStatus);

export default router;
