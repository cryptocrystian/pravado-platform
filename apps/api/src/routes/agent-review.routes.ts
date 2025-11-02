// =====================================================
// AGENT REVIEW ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reviewController from '../controllers/agent-review.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// REVIEW CRUD ROUTES
// =====================================================

/**
 * POST /api/v1/reviews
 * Create a new review request
 */
router.post('/', reviewController.createReview);

/**
 * GET /api/v1/reviews/pending
 * Get pending reviews for current user
 */
router.get('/pending', reviewController.getPendingReviews);

/**
 * GET /api/v1/reviews/:reviewId
 * Get a specific review by ID
 */
router.get('/:reviewId', reviewController.getReview);

/**
 * PATCH /api/v1/reviews/:reviewId
 * Update review metadata (assignment, priority, etc.)
 */
router.patch('/:reviewId', reviewController.updateReview);

// =====================================================
// REVIEW DECISION ROUTES
// =====================================================

/**
 * POST /api/v1/reviews/decision
 * Submit a review decision (approve, reject, needs edit)
 */
router.post('/decision', reviewController.submitDecision);

/**
 * POST /api/v1/reviews/:reviewId/approve
 * Approve a review (convenience endpoint)
 */
router.post('/:reviewId/approve', reviewController.approveReview);

/**
 * POST /api/v1/reviews/:reviewId/reject
 * Reject a review (convenience endpoint)
 */
router.post('/:reviewId/reject', reviewController.rejectReview);

/**
 * POST /api/v1/reviews/:reviewId/request-edits
 * Request edits for a review (convenience endpoint)
 */
router.post('/:reviewId/request-edits', reviewController.requestEdits);

// =====================================================
// REVIEW COMMENTS ROUTES
// =====================================================

/**
 * POST /api/v1/reviews/:reviewId/comments
 * Add a comment to a review
 */
router.post('/:reviewId/comments', reviewController.addComment);

// =====================================================
// REVIEW HELPERS ROUTES
// =====================================================

/**
 * POST /api/v1/reviews/check-required
 * Check if an entity requires review
 */
router.post('/check-required', reviewController.checkReviewRequired);

/**
 * GET /api/v1/reviews/context/:entityType/:entityId
 * Get review context for a specific entity
 */
router.get('/context/:entityType/:entityId', reviewController.getReviewContext);

export default router;
