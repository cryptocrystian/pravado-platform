// =====================================================
// AGENT CONTEXT ENHANCEMENT API ROUTES
// Sprint 43 Phase 3.5.3
// =====================================================
//
// Purpose: API endpoints for agent context enrichment and memory summarization
// Provides: Context building, memory summarization, prompt injection
//

import express, { Request, Response } from 'express';
import { agentContextEnhancer } from '../services/agentContextEnhancer';
import { pool } from '../database/db';
import type {
  BuildContextRequest,
  SummarizeMemoryRequest,
  EnhancedAgentContext,
  MemorySummary,
  ContextInjectionResult,
  MemoryScope,
} from '@pravado/types';

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
// CONTEXT BUILDING ENDPOINTS
// =====================================================

/**
 * POST /api/agent-context/build
 * Build enhanced context for agent task execution
 */
router.post('/build', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const request = req.body as BuildContextRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId', 'taskContext'])) {
      return;
    }

    if (!validateRequired(res, request.taskContext, ['prompt'])) {
      return;
    }

    // Ensure organizationId is set
    if (!request.organizationId) {
      request.organizationId = organizationId;
    }

    // Build enhanced context
    const context: EnhancedAgentContext = await agentContextEnhancer.buildEnhancedContext(
      request.agentId,
      {
        prompt: request.taskContext.prompt,
        userId: request.taskContext.userId,
        organizationId: request.organizationId,
        metadata: request.taskContext.metadata,
      },
      request.options
    );

    res.status(200).json({
      success: true,
      context,
      metadata: {
        agentId: request.agentId,
        organizationId: request.organizationId,
        memorySnippetsCount: context.memorySnippets.length,
        recentPlaybooksCount: context.recentPlaybooks.length,
        collaborationsCount: context.pastCollaborations.length,
        entitiesCount: context.keyEntities?.length || 0,
        topicsCount: context.trendingTopics?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error building enhanced context:', error);
    res.status(500).json({
      error: 'Failed to build enhanced context',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-context/inject
 * Inject context into prompt template
 */
router.post('/inject', async (req: Request, res: Response) => {
  try {
    const { template, context } = req.body;

    // Validate required fields
    if (!validateRequired(res, req.body, ['template', 'context'])) {
      return;
    }

    // Inject context into template
    const result: ContextInjectionResult = agentContextEnhancer.injectContextIntoPrompt(
      template,
      context
    );

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error injecting context:', error);
    res.status(500).json({
      error: 'Failed to inject context into prompt',
      message: error.message,
    });
  }
});

// =====================================================
// MEMORY SUMMARIZATION ENDPOINTS
// =====================================================

/**
 * POST /api/agent-context/summarize
 * Generate GPT-4 powered memory summary
 */
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const request = req.body as SummarizeMemoryRequest;

    // Validate required fields
    if (!validateRequired(res, request, ['agentId', 'scope'])) {
      return;
    }

    // Ensure organizationId is set
    if (!request.organizationId) {
      request.organizationId = organizationId;
    }

    // Validate scope
    const validScopes: MemoryScope[] = ['short_term', 'long_term', 'session', 'historical'];
    if (!validScopes.includes(request.scope)) {
      res.status(400).json({
        error: 'Invalid scope',
        message: `Scope must be one of: ${validScopes.join(', ')}`,
      });
      return;
    }

    // Generate summary
    const summary: MemorySummary = await agentContextEnhancer.summarizeAgentMemory(
      request.agentId,
      request.scope,
      request.organizationId,
      {
        summaryType: request.summaryType,
        timeWindowDays: request.timeWindowDays,
        maxEntries: request.maxEntries,
        forceRegenerate: request.forceRegenerate,
      }
    );

    res.status(200).json({
      success: true,
      summary,
      metadata: {
        agentId: request.agentId,
        organizationId: request.organizationId,
        scope: request.scope,
        entryCount: summary.entryCount,
        topicsCount: summary.topics.length,
        entitiesCount: summary.entities.length,
        trendsCount: summary.trends?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error summarizing agent memory:', error);
    res.status(500).json({
      error: 'Failed to summarize agent memory',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-context/summaries/:agentId
 * Get memory summaries for an agent
 */
router.get('/summaries/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);

    // Query parameters
    const scope = req.query.scope as MemoryScope | undefined;
    const summaryType = req.query.summaryType as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Build query
    let query = `
      SELECT
        id,
        agent_id,
        organization_id,
        summary_type,
        scope,
        summary_text,
        topics,
        entities,
        trends,
        time_period_start,
        time_period_end,
        entry_count,
        metadata,
        created_at
      FROM agent_memory_summaries
      WHERE agent_id = $1
        AND organization_id = $2
    `;

    const params: any[] = [agentId, organizationId];
    let paramIndex = 3;

    if (scope) {
      query += ` AND scope = $${paramIndex}`;
      params.push(scope);
      paramIndex++;
    }

    if (summaryType) {
      query += ` AND summary_type = $${paramIndex}`;
      params.push(summaryType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      summaries: result.rows,
      count: result.rows.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({
      error: 'Failed to fetch summaries',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-context/summaries/:agentId/recent
 * Get most recent summary for an agent
 */
router.get('/summaries/:agentId/recent', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);

    const scope = (req.query.scope as MemoryScope) || 'short_term';
    const summaryType = (req.query.summaryType as string) || 'short_term';

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_recent_agent_summary($1, $2, $3)',
      [agentId, scope, summaryType]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'No recent summary found',
        message: `No ${scope} summary found for agent ${agentId}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      summary: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching recent summary:', error);
    res.status(500).json({
      error: 'Failed to fetch recent summary',
      message: error.message,
    });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/agent-context/topics/:agentId
 * Get top topics for an agent
 */
router.get('/topics/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_agent_top_topics($1, $2, $3)',
      [agentId, days, limit]
    );

    res.status(200).json({
      success: true,
      topics: result.rows,
      count: result.rows.length,
      days,
    });
  } catch (error: any) {
    console.error('Error fetching top topics:', error);
    res.status(500).json({
      error: 'Failed to fetch top topics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-context/entities/:agentId
 * Get top entities for an agent
 */
router.get('/entities/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_agent_top_entities($1, $2, $3)',
      [agentId, days, limit]
    );

    res.status(200).json({
      success: true,
      entities: result.rows,
      count: result.rows.length,
      days,
    });
  } catch (error: any) {
    console.error('Error fetching top entities:', error);
    res.status(500).json({
      error: 'Failed to fetch top entities',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-context/trending/:agentId
 * Get trending topics for an agent
 */
router.get('/trending/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_trending_topics($1, $2)',
      [agentId, days]
    );

    res.status(200).json({
      success: true,
      trendingTopics: result.rows,
      count: result.rows.length,
      days,
    });
  } catch (error: any) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({
      error: 'Failed to fetch trending topics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-context/search/:agentId
 * Search agent summaries by text
 */
router.get('/search/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      res.status(400).json({
        error: 'Missing search query',
        message: 'Query parameter "q" is required',
      });
      return;
    }

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM search_agent_summaries($1, $2, $3)',
      [agentId, query, limit]
    );

    res.status(200).json({
      success: true,
      results: result.rows,
      count: result.rows.length,
      query,
    });
  } catch (error: any) {
    console.error('Error searching summaries:', error);
    res.status(500).json({
      error: 'Failed to search summaries',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-context/summaries/:agentId/time-range
 * Get summaries for a specific time range
 */
router.get('/summaries/:agentId/time-range', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Missing time range',
        message: 'Query parameters "start" and "end" are required (ISO 8601 format)',
      });
      return;
    }

    // Use helper function from migration
    const result = await pool.query(
      'SELECT * FROM get_summaries_for_time_range($1, $2, $3)',
      [agentId, startDate, endDate]
    );

    res.status(200).json({
      success: true,
      summaries: result.rows,
      count: result.rows.length,
      timeRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching summaries for time range:', error);
    res.status(500).json({
      error: 'Failed to fetch summaries for time range',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/agent-context/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    // Check if agent_memory_summaries table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'agent_memory_summaries'
      );
    `);

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      table: tableCheck.rows[0].exists ? 'exists' : 'missing',
      service: 'agent-context-enhancer',
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
