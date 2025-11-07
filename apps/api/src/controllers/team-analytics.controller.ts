// =====================================================
// TEAM ANALYTICS CONTROLLER
// Sprint 32: Activity tracking, anomaly detection, coaching
// =====================================================

import { Request, Response } from 'express';
import { teamAnalyticsEngine } from '../../../agents/src/analytics/team-analytics-engine';
import type {
  LogTeamEventInput,
  CalculateMetricsInput,
  DetectAnomaliesInput,
  GetActivityFeedInput,
  GetBehaviorMetricsInput,
  GetAnomaliesInput,
  SummarizeTeamPatternsInput,
  RecommendCoachingInput,
  ResolveAnomalyInput,
} from '@pravado/types';

// =====================================================
// ACTIVITY LOGGING ENDPOINTS
// =====================================================

/**
 * Log team event
 * POST /api/v1/team-analytics/event
 */
export async function logTeamEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: LogTeamEventInput = {
      ...req.body,
      organizationId,
      userId,
    };

    const eventId = await teamAnalyticsEngine.logTeamEvent(input);

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('Log team event error:', error);
    res.status(500).json({ error: error.message || 'Failed to log team event' });
  }
}

// =====================================================
// METRICS ENDPOINTS
// =====================================================

/**
 * Calculate behavior metrics
 * POST /api/v1/team-analytics/metrics/calculate
 */
export async function calculateMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId, periodStart, periodEnd, windowType } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CalculateMetricsInput = {
      organizationId,
      userId: userId || req.user?.id,
      periodStart,
      periodEnd,
      windowType,
    };

    const metrics = await teamAnalyticsEngine.calculateBehaviorMetrics(input);

    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Calculate metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate metrics' });
  }
}

/**
 * Calculate metrics for all users
 * POST /api/v1/team-analytics/metrics/calculate-all
 */
export async function calculateMetricsForAll(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { periodStart, periodEnd, windowType } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Start async calculation
    teamAnalyticsEngine
      .calculateMetricsForAllUsers(organizationId, periodStart, periodEnd, windowType)
      .catch((error) => console.error('Background metrics calculation error:', error));

    res.json({
      success: true,
      message: 'Metrics calculation started for all users',
    });
  } catch (error: any) {
    console.error('Calculate metrics for all error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate metrics for all' });
  }
}

/**
 * Get behavior metrics
 * GET /api/v1/team-analytics/metrics
 */
export async function getBehaviorMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId, windowType, periodStart, periodEnd, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetBehaviorMetricsInput = {
      organizationId,
      userId: userId as string | undefined,
      windowType: windowType as any,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await teamAnalyticsEngine.getBehaviorMetrics(input);

    res.json({ success: true, metrics: result.metrics, total: result.total });
  } catch (error: any) {
    console.error('Get behavior metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get behavior metrics' });
  }
}

/**
 * Get performance trend
 * GET /api/v1/team-analytics/metrics/trend/:userId
 */
export async function getPerformanceTrend(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId } = req.params;
    const { periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd are required' });
    }

    const trend = await teamAnalyticsEngine.getPerformanceTrend(
      organizationId,
      userId,
      periodStart as string,
      periodEnd as string
    );

    res.json({ success: true, trend });
  } catch (error: any) {
    console.error('Get performance trend error:', error);
    res.status(500).json({ error: error.message || 'Failed to get performance trend' });
  }
}

// =====================================================
// ANOMALY ENDPOINTS
// =====================================================

/**
 * Detect behavioral anomalies
 * POST /api/v1/team-analytics/anomalies/detect
 */
export async function detectAnomalies(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId, detectionWindowStart, detectionWindowEnd } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: DetectAnomaliesInput = {
      organizationId,
      userId: userId || req.user?.id,
      detectionWindowStart,
      detectionWindowEnd,
    };

    const anomalies = await teamAnalyticsEngine.detectBehavioralAnomalies(input);

    res.json({ success: true, anomalies, totalDetected: anomalies.length });
  } catch (error: any) {
    console.error('Detect anomalies error:', error);
    res.status(500).json({ error: error.message || 'Failed to detect anomalies' });
  }
}

/**
 * Detect anomalies for all users
 * POST /api/v1/team-analytics/anomalies/detect-all
 */
export async function detectAnomaliesForAll(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { detectionWindowStart, detectionWindowEnd } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Start async detection
    teamAnalyticsEngine
      .detectAnomaliesForAllUsers(organizationId, detectionWindowStart, detectionWindowEnd)
      .catch((error) => console.error('Background anomaly detection error:', error));

    res.json({
      success: true,
      message: 'Anomaly detection started for all users',
    });
  } catch (error: any) {
    console.error('Detect anomalies for all error:', error);
    res.status(500).json({ error: error.message || 'Failed to detect anomalies for all' });
  }
}

/**
 * Get anomalies
 * GET /api/v1/team-analytics/anomalies
 */
export async function getAnomalies(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId, anomalyType, severity, isResolved, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetAnomaliesInput = {
      organizationId,
      userId: userId as string | undefined,
      anomalyType: anomalyType as any,
      severity: severity as any,
      isResolved: isResolved ? isResolved === 'true' : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await teamAnalyticsEngine.getAnomalies(input);

    res.json({ success: true, anomalies: result.anomalies, total: result.total });
  } catch (error: any) {
    console.error('Get anomalies error:', error);
    res.status(500).json({ error: error.message || 'Failed to get anomalies' });
  }
}

/**
 * Resolve anomaly
 * PUT /api/v1/team-analytics/anomalies/:anomalyId/resolve
 */
export async function resolveAnomaly(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { anomalyId } = req.params;
    const { resolutionNotes } = req.body;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: ResolveAnomalyInput = {
      anomalyId,
      organizationId,
      resolvedBy: userId,
      resolutionNotes,
    };

    const anomaly = await teamAnalyticsEngine.resolveAnomaly(input);

    res.json({ success: true, anomaly });
  } catch (error: any) {
    console.error('Resolve anomaly error:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve anomaly' });
  }
}

// =====================================================
// ACTIVITY FEED ENDPOINTS
// =====================================================

/**
 * Get team activity feed
 * GET /api/v1/team-analytics/activity-feed
 */
export async function getActivityFeed(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId, campaignId, activityTypes, startDate, endDate, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetActivityFeedInput = {
      organizationId,
      userId: userId as string | undefined,
      campaignId: campaignId as string | undefined,
      activityTypes: activityTypes
        ? (activityTypes as string).split(',')
        : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await teamAnalyticsEngine.getTeamActivityFeed(input);

    res.json({ success: true, events: result.events, total: result.total });
  } catch (error: any) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ error: error.message || 'Failed to get activity feed' });
  }
}

// =====================================================
// SUMMARIZATION & INSIGHTS ENDPOINTS
// =====================================================

/**
 * Summarize team patterns
 * POST /api/v1/team-analytics/summarize
 */
export async function summarizeTeamPatterns(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { periodStart, periodEnd, includeCoaching } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeTeamPatternsInput = {
      organizationId,
      periodStart,
      periodEnd,
      includeCoaching,
    };

    const result = await teamAnalyticsEngine.summarizeTeamPatterns(input);

    res.json({
      success: true,
      summary: result.summary,
      teamSummary: result.teamSummary,
    });
  } catch (error: any) {
    console.error('Summarize team patterns error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize team patterns' });
  }
}

/**
 * Recommend coaching opportunities
 * POST /api/v1/team-analytics/coaching
 */
export async function recommendCoaching(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { userId, periodStart, periodEnd } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: RecommendCoachingInput = {
      organizationId,
      userId,
      periodStart,
      periodEnd,
    };

    const opportunities = await teamAnalyticsEngine.recommendCoachingOpportunities(input);

    res.json({ success: true, opportunities, total: opportunities.length });
  } catch (error: any) {
    console.error('Recommend coaching error:', error);
    res.status(500).json({ error: error.message || 'Failed to recommend coaching' });
  }
}
