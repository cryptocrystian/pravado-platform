// =====================================================
// AGENT INTERACTION API ROUTES
// Sprint 45 Phase 4.1
// =====================================================
//
// Purpose: API endpoints for human-agent messaging and interaction
// Provides: Message sending, conversation management, personality mirroring
//

import express, { Request, Response } from 'express';
import { agentMessenger } from '../services/agentMessenger';
import { pool } from '../database/db';
import type {
  SendMessageRequest,
  StartConversationRequest,
  GetConversationHistoryRequest,
  MirrorPersonalityRequest,
  UpdateMemoryRequest,
  MessageProcessingResult,
  AgentConversation,
  AgentMessage,
  AppliedToneStyle,
} from '@pravado/shared-types';

const router = express.Router();

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Extract organization ID from request
 * In production, this would come from authenticated session
 */
function getOrganizationId(req: Request): string {
  // TODO: Extract from authenticated session
  return req.headers['x-organization-id'] as string || 'default-org-id';
}

/**
 * Get user ID from request
 * In production, this would come from authenticated session
 */
function getUserId(req: Request): string {
  // TODO: Extract from authenticated session
  return req.headers['x-user-id'] as string || 'default-user-id';
}

/**
 * Validate required fields
 */
function validateRequired(
  res: Response,
  fields: Record<string, any>,
  requiredFields: string[]
): boolean {
  const missing = requiredFields.filter((field) => !fields[field]);
  if (missing.length > 0) {
    res.status(400).json({
      error: 'Missing required fields',
      missing,
    });
    return false;
  }
  return true;
}

// =====================================================
// MESSAGING ENDPOINTS
// =====================================================

/**
 * POST /api/agent-interaction/send
 * Send message to agent and get response
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const request = req.body as SendMessageRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['conversationId', 'text'])) {
      return;
    }

    // Send message and get response
    const result: MessageProcessingResult = await agentMessenger.sendMessageToAgent(
      request.conversationId,
      {
        text: request.text,
        userId: request.userId || userId,
        metadata: request.metadata,
      },
      request.options
    );

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-interaction/start
 * Start a new conversation
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const organizationId = getOrganizationId(req);
    const request = req.body as StartConversationRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId'])) {
      return;
    }

    // Start conversation
    const conversation: AgentConversation = await agentMessenger.startConversation(
      request.userId || userId,
      request.agentId,
      request.organizationId || organizationId,
      {
        initialMessage: request.initialMessage,
        title: request.title,
        metadata: request.metadata,
      }
    );

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      error: 'Failed to start conversation',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-interaction/history/:conversationId
 * Get conversation history
 */
router.get('/history/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const includeMetadata = req.query.includeMetadata === 'true';
    const includeContext = req.query.includeContext === 'true';

    // Get conversation history
    const messages: AgentMessage[] = await agentMessenger.getConversationHistory(
      conversationId,
      {
        limit,
        offset,
        includeMetadata,
        includeContext,
      }
    );

    res.status(200).json({
      success: true,
      messages,
      count: messages.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation history',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-interaction/mirror
 * Mirror personality traits from user
 */
router.post('/mirror', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const request = req.body as MirrorPersonalityRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId'])) {
      return;
    }

    // Mirror personality traits
    const appliedToneStyle: AppliedToneStyle = await agentMessenger.mirrorPersonalityTraits(
      request.agentId,
      request.userId || userId,
      request.conversationId,
      request.recentTurns
    );

    res.status(200).json({
      success: true,
      appliedToneStyle,
    });
  } catch (error: any) {
    console.error('Error mirroring personality:', error);
    res.status(500).json({
      error: 'Failed to mirror personality traits',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-interaction/update-memory
 * Update agent memory from conversation turn
 */
router.post('/update-memory', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const request = req.body as UpdateMemoryRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId', 'turn'])) {
      return;
    }

    // Update memory
    await agentMessenger.updateAgentMemoryFromTurn(
      request.agentId,
      request.turn,
      request.organizationId || organizationId,
      request.options
    );

    res.status(200).json({
      success: true,
      message: 'Agent memory updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating memory:', error);
    res.status(500).json({
      error: 'Failed to update agent memory',
      message: error.message,
    });
  }
});

// =====================================================
// CONVERSATION MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/agent-interaction/conversations
 * Get user's conversations
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 20;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_user_active_conversations($1, $2)',
      [userId, limit]
    );

    res.status(200).json({
      success: true,
      conversations: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-interaction/conversation/:conversationId
 * Get conversation details
 */
router.get('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const { data, error } = await pool.query(
      'SELECT * FROM agent_conversations WHERE id = $1',
      [conversationId]
    );

    if (error || !data || data.rows.length === 0) {
      res.status(404).json({
        error: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      conversation: data.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation',
      message: error.message,
    });
  }
});

/**
 * PUT /api/agent-interaction/conversation/:conversationId/status
 * Update conversation status
 */
router.put('/conversation/:conversationId/status', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
      });
      return;
    }

    const validStatuses = ['active', 'paused', 'archived', 'completed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const { error } = await pool.query(
      'UPDATE agent_conversations SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, conversationId]
    );

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({
      success: true,
      message: `Conversation status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Error updating conversation status:', error);
    res.status(500).json({
      error: 'Failed to update conversation status',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/agent-interaction/conversation/:conversationId
 * Delete/archive conversation
 */
router.delete('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const archive = req.query.archive === 'true';

    if (archive) {
      // Archive instead of delete
      const { error } = await pool.query(
        'UPDATE agent_conversations SET status = $1, archived_at = NOW() WHERE id = $2',
        ['archived', conversationId]
      );

      if (error) {
        throw new Error(error.message);
      }

      res.status(200).json({
        success: true,
        message: 'Conversation archived',
      });
    } else {
      // Delete conversation
      const { error } = await pool.query(
        'DELETE FROM agent_conversations WHERE id = $1',
        [conversationId]
      );

      if (error) {
        throw new Error(error.message);
      }

      res.status(200).json({
        success: true,
        message: 'Conversation deleted',
      });
    }
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message,
    });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/agent-interaction/analytics/conversation/:conversationId
 * Get conversation analytics
 */
router.get('/analytics/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_conversation_analytics($1)',
      [conversationId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      analytics: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-interaction/analytics/agent/:agentId
 * Get agent conversation stats
 */
router.get('/analytics/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_agent_conversation_stats($1, $2)',
      [agentId, days]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'No stats found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      stats: result.rows[0],
      days,
    });
  } catch (error: any) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      error: 'Failed to fetch agent stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-interaction/search
 * Search messages
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      res.status(400).json({
        error: 'Search query is required',
      });
      return;
    }

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM search_messages($1, $2, $3)',
      [userId, query, limit]
    );

    res.status(200).json({
      success: true,
      results: result.rows,
      count: result.rows.length,
      query,
    });
  } catch (error: any) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      error: 'Failed to search messages',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-interaction/turns/:conversationId
 * Get conversation turns
 */
router.get('/turns/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_recent_turns($1, $2)',
      [conversationId, limit]
    );

    res.status(200).json({
      success: true,
      turns: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching turns:', error);
    res.status(500).json({
      error: 'Failed to fetch turns',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/agent-interaction/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'agent_conversations'
      ) as conversations_exists,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'agent_messages'
      ) as messages_exists,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_agent_turns'
      ) as turns_exists;
    `);

    const tables = tablesCheck.rows[0];

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      tables: {
        conversations: tables.conversations_exists ? 'exists' : 'missing',
        messages: tables.messages_exists ? 'exists' : 'missing',
        turns: tables.turns_exists ? 'exists' : 'missing',
      },
      service: 'agent-messenger',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;
