// =====================================================
// COMPETITIVE INTELLIGENCE CONTROLLER
// Core Infrastructure: Competitor tracking, market trends, AI insights
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { Request, Response } from 'express';
import { competitiveIntelEngine } from '../../../agents/src/competitive-intel/competitive-engine';
import type {
  CreateCompetitorInput,
  UpdateCompetitorInput,
  LogIntelEventInput,
  UpdateIntelEventInput,
  CreateTrendInput,
  CalculateCompetitorMetricsInput,
  GetCompetitorsInput,
  GetIntelFeedInput,
  GetTrendsInput,
  SummarizeCompetitorInput,
  SummarizeMarketInput,
  GetDashboardInput,
} from '@pravado/types';

// =====================================================
// COMPETITOR ENDPOINTS
// =====================================================

/**
 * Create competitor
 * POST /api/v1/competitive-intel/competitors
 */
export async function createCompetitor(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreateCompetitorInput = {
      ...req.body,
      organizationId,
      addedBy: userId,
    };

    const competitor = await competitiveIntelEngine.createCompetitor(input);

    res.json({ success: true, competitor });
  } catch (error: any) {
    console.error('Create competitor error:', error);
    res.status(500).json({ error: error.message || 'Failed to create competitor' });
  }
}

/**
 * Update competitor
 * PUT /api/v1/competitive-intel/competitors/:competitorId
 */
export async function updateCompetitor(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { competitorId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateCompetitorInput = {
      ...req.body,
      competitorId,
    };

    const competitor = await competitiveIntelEngine.updateCompetitor(input);

    res.json({ success: true, competitor });
  } catch (error: any) {
    console.error('Update competitor error:', error);
    res.status(500).json({ error: error.message || 'Failed to update competitor' });
  }
}

/**
 * Get competitors
 * GET /api/v1/competitive-intel/competitors
 */
export async function getCompetitors(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { isActive, priority, category, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetCompetitorsInput = {
      organizationId,
      isActive: isActive ? isActive === 'true' : undefined,
      priority: priority as any,
      category: category as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await competitiveIntelEngine.getCompetitors(input);

    res.json({ success: true, competitors: result.competitors, total: result.total });
  } catch (error: any) {
    console.error('Get competitors error:', error);
    res.status(500).json({ error: error.message || 'Failed to get competitors' });
  }
}

/**
 * Get competitor profile
 * GET /api/v1/competitive-intel/competitors/:competitorId/profile
 */
export async function getCompetitorProfile(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { competitorId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const profile = await competitiveIntelEngine.getCompetitorProfile(organizationId, competitorId);

    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('Get competitor profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to get competitor profile' });
  }
}

/**
 * Summarize competitor (GPT-4)
 * POST /api/v1/competitive-intel/competitors/:competitorId/summarize
 */
export async function summarizeCompetitor(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { competitorId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeCompetitorInput = {
      organizationId,
      competitorId,
    };

    const analysis = await competitiveIntelEngine.summarizeCompetitor(input);

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Summarize competitor error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize competitor' });
  }
}

// =====================================================
// INTEL EVENT ENDPOINTS
// =====================================================

/**
 * Log intel event
 * POST /api/v1/competitive-intel/events
 */
export async function logIntelEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: LogIntelEventInput = {
      ...req.body,
      organizationId,
      submittedBy: userId,
    };

    const eventId = await competitiveIntelEngine.logIntelEvent(input);

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('Log intel event error:', error);
    res.status(500).json({ error: error.message || 'Failed to log intel event' });
  }
}

/**
 * Update intel event
 * PUT /api/v1/competitive-intel/events/:eventId
 */
export async function updateIntelEvent(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { eventId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateIntelEventInput = {
      ...req.body,
      eventId,
    };

    const event = await competitiveIntelEngine.updateIntelEvent(input);

    res.json({ success: true, event });
  } catch (error: any) {
    console.error('Update intel event error:', error);
    res.status(500).json({ error: error.message || 'Failed to update intel event' });
  }
}

/**
 * Get intel feed
 * GET /api/v1/competitive-intel/events
 */
export async function getIntelFeed(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { competitorId, eventTypes, severity, sourceType, startDate, endDate, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetIntelFeedInput = {
      organizationId,
      competitorId: competitorId as string | undefined,
      eventTypes: eventTypes ? (eventTypes as string).split(',') : undefined,
      severity: severity as any,
      sourceType: sourceType as any,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await competitiveIntelEngine.getIntelFeed(input);

    res.json({ success: true, events: result.events, total: result.total });
  } catch (error: any) {
    console.error('Get intel feed error:', error);
    res.status(500).json({ error: error.message || 'Failed to get intel feed' });
  }
}

// =====================================================
// METRICS ENDPOINTS
// =====================================================

/**
 * Calculate competitor metrics
 * POST /api/v1/competitive-intel/competitors/:competitorId/metrics/calculate
 */
export async function calculateMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { competitorId } = req.params;
    const { periodStart, periodEnd, windowType } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CalculateCompetitorMetricsInput = {
      organizationId,
      competitorId,
      periodStart,
      periodEnd,
      windowType,
    };

    const metrics = await competitiveIntelEngine.calculateMetrics(input);

    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Calculate metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate metrics' });
  }
}

/**
 * Get competitor metrics
 * GET /api/v1/competitive-intel/competitors/:competitorId/metrics
 */
export async function getCompetitorMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { competitorId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const result = await competitiveIntelEngine.getCompetitorMetrics(organizationId, competitorId);

    res.json({ success: true, metrics: result.metrics, total: result.total });
  } catch (error: any) {
    console.error('Get competitor metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get competitor metrics' });
  }
}

// =====================================================
// TRENDS ENDPOINTS
// =====================================================

/**
 * Create trend
 * POST /api/v1/competitive-intel/trends
 */
export async function createTrend(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreateTrendInput = {
      ...req.body,
      organizationId,
    };

    const trend = await competitiveIntelEngine.createTrend(input);

    res.json({ success: true, trend });
  } catch (error: any) {
    console.error('Create trend error:', error);
    res.status(500).json({ error: error.message || 'Failed to create trend' });
  }
}

/**
 * Get trends
 * GET /api/v1/competitive-intel/trends
 */
export async function getTrends(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { category, periodStart, periodEnd, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetTrendsInput = {
      organizationId,
      category: category as string | undefined,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await competitiveIntelEngine.getTrends(input);

    res.json({ success: true, trends: result.trends, total: result.total });
  } catch (error: any) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: error.message || 'Failed to get trends' });
  }
}

/**
 * Get market trends summary
 * GET /api/v1/competitive-intel/market/:category/trends
 */
export async function getMarketTrends(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { category } = req.params;
    const { periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd are required' });
    }

    const summary = await competitiveIntelEngine.getMarketTrends(
      organizationId,
      category,
      periodStart as string,
      periodEnd as string
    );

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Get market trends error:', error);
    res.status(500).json({ error: error.message || 'Failed to get market trends' });
  }
}

/**
 * Summarize market trends (GPT-4)
 * POST /api/v1/competitive-intel/market/:category/summarize
 */
export async function summarizeMarketTrends(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { category } = req.params;
    const { periodStart, periodEnd } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeMarketInput = {
      organizationId,
      category,
      periodStart,
      periodEnd,
    };

    const analysis = await competitiveIntelEngine.summarizeMarketTrends(input);

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Summarize market trends error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize market trends' });
  }
}

// =====================================================
// DASHBOARD ENDPOINTS
// =====================================================

/**
 * Get dashboard snapshot
 * GET /api/v1/competitive-intel/dashboard
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetDashboardInput = {
      organizationId,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
    };

    const data = await competitiveIntelEngine.getDashboardSnapshot(input);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get dashboard data' });
  }
}
