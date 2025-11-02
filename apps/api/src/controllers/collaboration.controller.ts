// =====================================================
// COLLABORATION CONTROLLER - Collaboration & Handoff API
// =====================================================

import { Request, Response } from 'express';
import { collaborationEngine } from '../../../agents/src/collaboration/collaboration-engine';
import type {
  CreateHandoffRequestInput,
  CreateCollaborationThreadInput,
  CreateCollaborationCommentInput,
  SummarizeThreadInput,
} from '@pravado/shared-types';

// =====================================================
// HANDOFF ENDPOINTS
// =====================================================

/**
 * Request a handoff
 * POST /api/v1/collaboration/handoff
 */
export async function requestHandoff(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<CreateHandoffRequestInput, 'organizationId'> = req.body;

    const request = await collaborationEngine.requestHandoff({
      ...input,
      fromUserId: userId,
      organizationId,
    });

    res.json({ success: true, request });
  } catch (error: any) {
    console.error('Request handoff error:', error);
    res.status(500).json({ error: error.message || 'Failed to request handoff' });
  }
}

/**
 * Accept a handoff
 * POST /api/v1/collaboration/handoff/:id/accept
 */
export async function acceptHandoff(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const { responseMessage } = req.body;

    const success = await collaborationEngine.acceptHandoff({
      requestId: id,
      userId,
      responseMessage,
      organizationId,
    });

    res.json({ success, requestId: id, status: 'ACCEPTED', message: 'Handoff accepted' });
  } catch (error: any) {
    console.error('Accept handoff error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept handoff' });
  }
}

/**
 * Decline a handoff
 * POST /api/v1/collaboration/handoff/:id/decline
 */
export async function declineHandoff(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const { responseMessage } = req.body;

    const success = await collaborationEngine.declineHandoff({
      requestId: id,
      userId,
      responseMessage,
      organizationId,
    });

    res.json({ success, requestId: id, status: 'DECLINED', message: 'Handoff declined' });
  } catch (error: any) {
    console.error('Decline handoff error:', error);
    res.status(500).json({ error: error.message || 'Failed to decline handoff' });
  }
}

/**
 * Get user's handoff queue
 * GET /api/v1/collaboration/handoff/queue
 */
export async function getHandoffQueue(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const requests = await collaborationEngine.getUserHandoffQueue(userId, organizationId);

    res.json({ success: true, requests, total: requests.length });
  } catch (error: any) {
    console.error('Get handoff queue error:', error);
    res.status(500).json({ error: error.message || 'Failed to get handoff queue' });
  }
}

// =====================================================
// THREAD ENDPOINTS
// =====================================================

/**
 * Create a thread
 * POST /api/v1/collaboration/threads
 */
export async function createThread(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<CreateCollaborationThreadInput, 'organizationId'> = req.body;

    const thread = await collaborationEngine.createThread({
      ...input,
      userId,
      organizationId,
    });

    res.json({ success: true, thread });
  } catch (error: any) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to create thread' });
  }
}

/**
 * Add a comment
 * POST /api/v1/collaboration/comments
 */
export async function addComment(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<CreateCollaborationCommentInput, 'organizationId'> = req.body;

    const comment = await collaborationEngine.addComment({
      ...input,
      authorId: userId,
      organizationId,
    });

    res.json({ success: true, comment });
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: error.message || 'Failed to add comment' });
  }
}

/**
 * Get campaign discussion
 * GET /api/v1/collaboration/campaign/:campaignId
 */
export async function getCampaignDiscussion(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const context = await collaborationEngine.getCampaignDiscussion(
      campaignId,
      userId,
      organizationId
    );

    res.json({ success: true, ...context });
  } catch (error: any) {
    console.error('Get campaign discussion error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign discussion' });
  }
}

/**
 * Summarize a thread
 * POST /api/v1/collaboration/threads/:threadId/summarize
 */
export async function summarizeThread(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { threadId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeThreadInput = {
      threadId,
      organizationId,
      maxLength: req.body.maxLength,
      includeActionItems: req.body.includeActionItems !== false,
    };

    const summary = await collaborationEngine.summarizeThread(input);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize thread' });
  }
}
