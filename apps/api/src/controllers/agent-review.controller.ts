// =====================================================
// AGENT REVIEW CONTROLLER
// =====================================================

import { Request, Response } from 'express';
import { reviewEngine } from '@pravado/agents';
import type {
  CreateAgentReviewInput,
  UpdateAgentReviewInput,
  SubmitReviewDecisionInput,
  CreateReviewCommentInput,
} from '@pravado/types';
import {
  CreateAgentReviewInputSchema,
  UpdateAgentReviewInputSchema,
  SubmitReviewDecisionInputSchema,
  CreateReviewCommentInputSchema,
} from '@pravado/types';

// =====================================================
// REVIEW CRUD OPERATIONS
// =====================================================

/**
 * Create a new review request
 */
export async function createReview(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: CreateAgentReviewInput = {
      ...req.body,
      organizationId,
    };

    const review = await reviewEngine.createReviewRequest(input);

    res.status(201).json(review);
  } catch (error: any) {
    console.error('[ReviewController] Error creating review:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Get a specific review by ID
 */
export async function getReview(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const review = await reviewEngine.getReview(reviewId, organizationId);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error: any) {
    console.error('[ReviewController] Error fetching review:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * List pending reviews for the current user
 */
export async function getPendingReviews(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reviews = await reviewEngine.getUserPendingReviews(userId, organizationId);

    res.json(reviews);
  } catch (error: any) {
    console.error('[ReviewController] Error fetching pending reviews:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update review metadata (assignment, priority, etc.)
 */
export async function updateReview(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: UpdateAgentReviewInput = req.body;

    const review = await reviewEngine.updateReview(reviewId, input, organizationId);

    res.json(review);
  } catch (error: any) {
    console.error('[ReviewController] Error updating review:', error);
    res.status(400).json({ error: error.message });
  }
}

// =====================================================
// REVIEW DECISION OPERATIONS
// =====================================================

/**
 * Submit a review decision (approve, reject, needs edit)
 */
export async function submitDecision(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: SubmitReviewDecisionInput = {
      ...req.body,
      reviewedBy: userId,
    };

    const result = await reviewEngine.submitReviewDecision(input, organizationId);

    res.json(result);
  } catch (error: any) {
    console.error('[ReviewController] Error submitting decision:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Approve a review (convenience endpoint)
 */
export async function approveReview(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { decisionSummary, decisionReasoning } = req.body;

    const input: SubmitReviewDecisionInput = {
      reviewId,
      decision: 'APPROVED',
      decisionSummary: decisionSummary || 'Approved',
      decisionReasoning,
      reviewedBy: userId,
    };

    const result = await reviewEngine.submitReviewDecision(input, organizationId);

    res.json(result);
  } catch (error: any) {
    console.error('[ReviewController] Error approving review:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Reject a review (convenience endpoint)
 */
export async function rejectReview(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { decisionSummary, decisionReasoning } = req.body;

    if (!decisionSummary) {
      return res.status(400).json({ error: 'Decision summary is required for rejection' });
    }

    const input: SubmitReviewDecisionInput = {
      reviewId,
      decision: 'REJECTED',
      decisionSummary,
      decisionReasoning,
      reviewedBy: userId,
    };

    const result = await reviewEngine.submitReviewDecision(input, organizationId);

    res.json(result);
  } catch (error: any) {
    console.error('[ReviewController] Error rejecting review:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Request edits for a review (convenience endpoint)
 */
export async function requestEdits(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { decisionSummary, decisionReasoning, modifications } = req.body;

    if (!decisionSummary) {
      return res.status(400).json({ error: 'Decision summary is required for edits' });
    }

    const input: SubmitReviewDecisionInput = {
      reviewId,
      decision: 'NEEDS_EDIT',
      decisionSummary,
      decisionReasoning,
      modifications,
      reviewedBy: userId,
    };

    const result = await reviewEngine.submitReviewDecision(input, organizationId);

    res.json(result);
  } catch (error: any) {
    console.error('[ReviewController] Error requesting edits:', error);
    res.status(400).json({ error: error.message });
  }
}

// =====================================================
// REVIEW COMMENTS
// =====================================================

/**
 * Add a comment to a review
 */
export async function addComment(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: CreateReviewCommentInput = {
      ...req.body,
      reviewId,
      authorId: userId,
      organizationId,
    };

    const comment = await reviewEngine.addComment(input);

    res.status(201).json(comment);
  } catch (error: any) {
    console.error('[ReviewController] Error adding comment:', error);
    res.status(400).json({ error: error.message });
  }
}

// =====================================================
// REVIEW CONTEXT & HELPERS
// =====================================================

/**
 * Check if an entity requires review
 */
export async function checkReviewRequired(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityType, entityId, metadata } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const result = await reviewEngine.shouldTriggerReview(
      entityType,
      entityId,
      organizationId,
      metadata
    );

    res.json(result);
  } catch (error: any) {
    console.error('[ReviewController] Error checking review requirement:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get review context for a specific entity
 */
export async function getReviewContext(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityType, entityId } = req.params;

    const context = await reviewEngine.fetchReviewContext(
      entityType as any,
      entityId,
      organizationId
    );

    res.json(context);
  } catch (error: any) {
    console.error('[ReviewController] Error fetching review context:', error);
    res.status(500).json({ error: error.message });
  }
}
