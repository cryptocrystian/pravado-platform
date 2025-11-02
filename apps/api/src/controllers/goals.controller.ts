// =====================================================
// GOALS CONTROLLER - Goal Management & Attribution API
// =====================================================

import { Request, Response } from 'express';
import { goalEngine } from '../../../agents/src/goals/goal-engine';
import type {
  CreateCampaignGoalInput,
  UpdateCampaignGoalInput,
  TrackAttributionEventInput,
  SummarizeGoalPerformanceInput,
} from '@pravado/shared-types';

// =====================================================
// GOAL MANAGEMENT ENDPOINTS
// =====================================================

/**
 * Create a new campaign goal
 * POST /api/v1/goals/campaign/:campaignId/create
 */
export async function createGoal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<CreateCampaignGoalInput, 'organizationId' | 'campaignId' | 'createdBy'> = req.body;

    const goal = await goalEngine.createGoal({
      ...input,
      organizationId,
      campaignId,
      createdBy: userId,
    });

    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to create goal' });
  }
}

/**
 * Update a campaign goal
 * PUT /api/v1/goals/:goalId
 */
export async function updateGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<UpdateCampaignGoalInput, 'organizationId' | 'goalId'> = req.body;

    const goal = await goalEngine.updateGoal({
      ...input,
      organizationId,
      goalId,
    });

    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to update goal' });
  }
}

/**
 * Get all goals for a campaign
 * GET /api/v1/goals/campaign/:campaignId/goals
 */
export async function getCampaignGoals(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const goals = await goalEngine.getCampaignGoals(campaignId, organizationId);

    res.json({ success: true, goals, total: goals.length });
  } catch (error: any) {
    console.error('Get campaign goals error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign goals' });
  }
}

/**
 * Get a single goal
 * GET /api/v1/goals/:goalId
 */
export async function getGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const goal = await goalEngine.getGoal(goalId, organizationId);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goal' });
  }
}

// =====================================================
// OUTCOME TRACKING ENDPOINTS
// =====================================================

/**
 * Track an attribution event
 * POST /api/v1/goals/campaign/:campaignId/track-event
 */
export async function trackEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<TrackAttributionEventInput, 'organizationId' | 'campaignId'> = req.body;

    const eventId = await goalEngine.trackOutcomeEvent({
      ...input,
      organizationId,
      campaignId,
      attributedToUserId: userId,
    });

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('Track event error:', error);
    res.status(500).json({ error: error.message || 'Failed to track event' });
  }
}

/**
 * Calculate goal progress manually
 * POST /api/v1/goals/:goalId/calculate
 */
export async function calculateProgress(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    await goalEngine.calculateGoalProgress({
      goalId,
      organizationId,
    });

    res.json({ success: true, message: 'Goal progress recalculated' });
  } catch (error: any) {
    console.error('Calculate progress error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate progress' });
  }
}

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * Get campaign goals summary
 * GET /api/v1/goals/campaign/:campaignId/summary
 */
export async function getCampaignSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const overview = await goalEngine.getCampaignGoalsOverview(campaignId, organizationId);

    res.json({ success: true, ...overview });
  } catch (error: any) {
    console.error('Get campaign summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign summary' });
  }
}

/**
 * Get attribution map for campaign
 * GET /api/v1/goals/campaign/:campaignId/attribution
 */
export async function getAttributionMap(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const attributionMap = await goalEngine.getAttributionMap(campaignId, organizationId);

    res.json({ success: true, attributionMap, total: attributionMap.length });
  } catch (error: any) {
    console.error('Get attribution map error:', error);
    res.status(500).json({ error: error.message || 'Failed to get attribution map' });
  }
}

/**
 * Get attribution log for campaign
 * GET /api/v1/goals/campaign/:campaignId/attribution-log
 */
export async function getAttributionLog(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Get attribution map which includes events
    const attributionMap = await goalEngine.getAttributionMap(campaignId, organizationId);

    // Flatten all events across goals
    const allEvents = attributionMap.flatMap((map) => map.events);

    // Sort by timestamp descending and limit
    const sortedEvents = allEvents
      .sort((a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime())
      .slice(0, limit);

    res.json({ success: true, events: sortedEvents, total: sortedEvents.length });
  } catch (error: any) {
    console.error('Get attribution log error:', error);
    res.status(500).json({ error: error.message || 'Failed to get attribution log' });
  }
}

/**
 * Summarize goal performance (GPT-powered)
 * POST /api/v1/goals/campaign/:campaignId/summarize
 */
export async function summarizeGoalPerformance(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<SummarizeGoalPerformanceInput, 'organizationId' | 'campaignId'> = req.body;

    const summary = await goalEngine.summarizeGoalPerformance({
      ...input,
      organizationId,
      campaignId,
    });

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize goal performance error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize goal performance' });
  }
}

/**
 * Summarize single goal performance
 * POST /api/v1/goals/:goalId/summarize
 */
export async function summarizeSingleGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<SummarizeGoalPerformanceInput, 'organizationId' | 'goalId'> = req.body;

    const summary = await goalEngine.summarizeGoalPerformance({
      ...input,
      organizationId,
      goalId,
    });

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize goal' });
  }
}

// =====================================================
// AGENT INTEGRATION ENDPOINTS
// =====================================================

/**
 * Get goal context for agents
 * GET /api/v1/goals/campaign/:campaignId/context
 */
export async function getGoalContext(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;
    const includeOnlyActive = req.query.activeOnly === 'true';

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const context = await goalEngine.injectGoalContext({
      campaignId,
      organizationId,
      includeOnlyActive,
    });

    res.json({ success: true, context });
  } catch (error: any) {
    console.error('Get goal context error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goal context' });
  }
}
