// =====================================================
// AGENT ANALYTICS API ROUTES
// Sprint 47 Phase 4.3
// =====================================================
//
// Purpose: API endpoints for agent conversation analytics
// Provides: Summary, sentiment trends, topics, engagement, resolution metrics
//

import express, { Request, Response } from 'express';
import { agentConversationAnalytics } from '../services/agentConversationAnalytics';
import type {
  ConversationSummary,
  SentimentDataPoint,
  TopicData,
  EngagementMetrics,
  ResolutionOutcomes,
  DateRange,
} from '../services/agentConversationAnalytics';

const router = express.Router();

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Extract organization ID from request
 */
function getOrganizationId(req: Request): string | undefined {
  return req.headers['x-organization-id'] as string | undefined;
}

/**
 * Parse date range from query params
 */
function parseDateRange(req: Request): DateRange | undefined {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }

  return undefined;
}

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/agent-analytics/summary/:agentId
 * Get conversation summary statistics
 */
router.get('/summary/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);
    const dateRange = parseDateRange(req);

    const summary: ConversationSummary = await agentConversationAnalytics.getConversationSummary(
      agentId,
      dateRange,
      organizationId
    );

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching conversation summary:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-analytics/sentiment/:agentId
 * Get sentiment trends over time
 */
router.get('/sentiment/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);
    const dateRange = parseDateRange(req);
    const interval = (req.query.interval as 'daily' | 'weekly' | 'monthly') || 'daily';

    const trends: SentimentDataPoint[] = await agentConversationAnalytics.getSentimentTrends(
      agentId,
      interval,
      dateRange,
      organizationId
    );

    res.status(200).json({
      success: true,
      trends,
      interval,
    });
  } catch (error: any) {
    console.error('Error fetching sentiment trends:', error);
    res.status(500).json({
      error: 'Failed to fetch sentiment trends',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-analytics/topics/:agentId
 * Get topic distribution
 */
router.get('/topics/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);
    const dateRange = parseDateRange(req);
    const limit = parseInt(req.query.limit as string) || 20;

    const topics: TopicData[] = await agentConversationAnalytics.getTopicDistribution(
      agentId,
      dateRange,
      limit,
      organizationId
    );

    res.status(200).json({
      success: true,
      topics,
      count: topics.length,
    });
  } catch (error: any) {
    console.error('Error fetching topic distribution:', error);
    res.status(500).json({
      error: 'Failed to fetch topic distribution',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-analytics/engagement/:agentId
 * Get engagement metrics
 */
router.get('/engagement/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);
    const dateRange = parseDateRange(req);

    const metrics: EngagementMetrics = await agentConversationAnalytics.getEngagementMetrics(
      agentId,
      dateRange,
      organizationId
    );

    res.status(200).json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch engagement metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-analytics/resolution/:agentId
 * Get resolution outcomes
 */
router.get('/resolution/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const organizationId = getOrganizationId(req);
    const dateRange = parseDateRange(req);

    const outcomes: ResolutionOutcomes = await agentConversationAnalytics.getResolutionOutcomes(
      agentId,
      dateRange,
      organizationId
    );

    res.status(200).json({
      success: true,
      outcomes,
    });
  } catch (error: any) {
    console.error('Error fetching resolution outcomes:', error);
    res.status(500).json({
      error: 'Failed to fetch resolution outcomes',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-analytics/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'agent-analytics',
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
