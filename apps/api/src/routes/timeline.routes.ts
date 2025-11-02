// =====================================================
// TIMELINE ROUTES - Unified Activity Feed API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as timelineController from '../controllers/timeline.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// TIMELINE ROUTES
// =====================================================

/**
 * Get campaign timeline
 * GET /api/v1/timeline/campaign/:campaignId
 * Query params: limit, offset, eventTypes, startDate, endDate
 */
router.get('/campaign/:campaignId', timelineController.getCampaignTimeline);

/**
 * Get global timeline across all campaigns
 * GET /api/v1/timeline/global
 * Query params: limit, offset, campaignIds, eventTypes, entityTypes, actorIds, startDate, endDate, minImportance
 */
router.get('/global', timelineController.getGlobalTimeline);

/**
 * Get timeline statistics
 * GET /api/v1/timeline/stats
 * Query params: campaignId, startDate, endDate
 */
router.get('/stats', timelineController.getTimelineStats);

/**
 * Get event details
 * GET /api/v1/timeline/events/:eventId
 */
router.get('/events/:eventId', timelineController.getEventDetails);

/**
 * Cleanup old timeline events (admin only)
 * POST /api/v1/timeline/cleanup
 * Body: { retentionDays?, minImportance? }
 */
router.post('/cleanup', timelineController.cleanupOldEvents);

export default router;
