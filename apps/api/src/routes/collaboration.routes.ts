// =====================================================
// COLLABORATION ROUTES - Collaboration & Handoff API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as collaborationController from '../controllers/collaboration.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// HANDOFF ROUTES
// =====================================================

/**
 * Request a handoff
 * POST /api/v1/collaboration/handoff
 * Body: { campaignId, toUserId, handoffType, message, metadata?, expiresInHours? }
 */
router.post('/handoff', collaborationController.requestHandoff);

/**
 * Accept a handoff
 * POST /api/v1/collaboration/handoff/:id/accept
 * Body: { responseMessage? }
 */
router.post('/handoff/:id/accept', collaborationController.acceptHandoff);

/**
 * Decline a handoff
 * POST /api/v1/collaboration/handoff/:id/decline
 * Body: { responseMessage? }
 */
router.post('/handoff/:id/decline', collaborationController.declineHandoff);

/**
 * Get user's handoff queue
 * GET /api/v1/collaboration/handoff/queue
 */
router.get('/handoff/queue', collaborationController.getHandoffQueue);

// =====================================================
// THREAD ROUTES
// =====================================================

/**
 * Create a thread
 * POST /api/v1/collaboration/threads
 * Body: { campaignId, title, description?, isPrivate?, visibility? }
 */
router.post('/threads', collaborationController.createThread);

/**
 * Summarize a thread
 * POST /api/v1/collaboration/threads/:threadId/summarize
 * Body: { maxLength?, includeActionItems? }
 */
router.post('/threads/:threadId/summarize', collaborationController.summarizeThread);

// =====================================================
// COMMENT ROUTES
// =====================================================

/**
 * Add a comment
 * POST /api/v1/collaboration/comments
 * Body: { threadId, content, mentions?, attachments?, parentCommentId? }
 */
router.post('/comments', collaborationController.addComment);

// =====================================================
// CAMPAIGN DISCUSSION ROUTES
// =====================================================

/**
 * Get campaign discussion
 * GET /api/v1/collaboration/campaign/:campaignId
 */
router.get('/campaign/:campaignId', collaborationController.getCampaignDiscussion);

export default router;
