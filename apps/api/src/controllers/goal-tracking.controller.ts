// =====================================================
// UNIFIED GOAL TRACKING CONTROLLER
// Core Infrastructure: Multi-level goals, OKR snapshots, AI insights
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { Request, Response } from 'express';
import { unifiedGoalEngine } from '../../../agents/src/goal-tracking/unified-goal-engine';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  LogGoalEventInput,
  UpdateGoalProgressInput,
  CalculateGoalMetricsInput,
  GenerateOkrSnapshotInput,
  SummarizeGoalInput,
  ValidateAlignmentInput,
  RecommendStretchGoalsInput,
  GetGoalsInput,
  GetGoalTimelineInput,
  GetGoalDashboardInput,
} from '@pravado/types';

// =====================================================
// GOAL CRUD ENDPOINTS
// =====================================================

/**
 * Create goal
 * POST /api/v1/goal-tracking/goals
 */
export async function createGoal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreateGoalInput = {
      ...req.body,
      organizationId,
    };

    const goal = await unifiedGoalEngine.createGoal(input);

    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to create goal' });
  }
}

/**
 * Update goal
 * PUT /api/v1/goal-tracking/goals/:goalId
 */
export async function updateGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateGoalInput = {
      ...req.body,
      goalId,
    };

    const goal = await unifiedGoalEngine.updateGoal(input);

    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to update goal' });
  }
}

/**
 * Get goals
 * GET /api/v1/goal-tracking/goals
 */
export async function getGoals(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { scope, scopeId, goalType, status, ownerId, parentGoalId, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetGoalsInput = {
      organizationId,
      scope: scope as any,
      scopeId: scopeId as string | undefined,
      goalType: goalType as any,
      status: status as any,
      ownerId: ownerId as string | undefined,
      parentGoalId: parentGoalId === 'null' ? null : (parentGoalId as string | undefined),
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await unifiedGoalEngine.getGoals(input);

    res.json({ success: true, goals: result.goals, total: result.total });
  } catch (error: any) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goals' });
  }
}

/**
 * Get goal by ID
 * GET /api/v1/goal-tracking/goals/:goalId
 */
export async function getGoalById(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const goal = await unifiedGoalEngine.getGoalById(organizationId, goalId);

    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goal' });
  }
}

// =====================================================
// PROGRESS TRACKING ENDPOINTS
// =====================================================

/**
 * Log goal event
 * POST /api/v1/goal-tracking/goals/:goalId/events
 */
export async function logGoalEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: LogGoalEventInput = {
      ...req.body,
      goalId,
      triggeredBy: userId,
    };

    const eventId = await unifiedGoalEngine.logGoalEvent(input);

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('Log goal event error:', error);
    res.status(500).json({ error: error.message || 'Failed to log goal event' });
  }
}

/**
 * Update goal progress
 * POST /api/v1/goal-tracking/goals/:goalId/progress
 */
export async function updateGoalProgress(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateGoalProgressInput = {
      goalId,
      value: req.body.value,
      notes: req.body.notes,
      loggedBy: userId,
      metadata: req.body.metadata,
    };

    const progress = await unifiedGoalEngine.updateGoalProgress(input);

    res.json({ success: true, progress });
  } catch (error: any) {
    console.error('Update goal progress error:', error);
    res.status(500).json({ error: error.message || 'Failed to update goal progress' });
  }
}

/**
 * Calculate goal metrics
 * POST /api/v1/goal-tracking/goals/:goalId/metrics/calculate
 */
export async function calculateGoalMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CalculateGoalMetricsInput = {
      organizationId,
      goalId,
    };

    const metrics = await unifiedGoalEngine.calculateGoalMetrics(input);

    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Calculate goal metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate goal metrics' });
  }
}

/**
 * Get goal timeline
 * GET /api/v1/goal-tracking/goals/:goalId/timeline
 */
export async function getGoalTimeline(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;
    const { limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetGoalTimelineInput = {
      organizationId,
      goalId,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const timeline = await unifiedGoalEngine.getGoalTimeline(input);

    res.json({ success: true, timeline });
  } catch (error: any) {
    console.error('Get goal timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goal timeline' });
  }
}

// =====================================================
// OKR ENDPOINTS
// =====================================================

/**
 * Generate OKR snapshot
 * POST /api/v1/goal-tracking/okr/snapshot
 */
export async function generateOkrSnapshot(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { scope, scopeId } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GenerateOkrSnapshotInput = {
      organizationId,
      scope,
      scopeId,
    };

    const snapshot = await unifiedGoalEngine.generateOkrSnapshot(input);

    res.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Generate OKR snapshot error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate OKR snapshot' });
  }
}

// =====================================================
// AI INSIGHTS ENDPOINTS
// =====================================================

/**
 * Summarize goal (GPT-4)
 * POST /api/v1/goal-tracking/goals/:goalId/summarize
 */
export async function summarizeGoal(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeGoalInput = {
      organizationId,
      goalId,
    };

    const summary = await unifiedGoalEngine.summarizeGoal(input);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize goal' });
  }
}

/**
 * Validate goal alignment (GPT-4)
 * POST /api/v1/goal-tracking/goals/:goalId/validate-alignment
 */
export async function validateAlignment(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { goalId } = req.params;
    const { parentGoalId } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: ValidateAlignmentInput = {
      organizationId,
      goalId,
      parentGoalId,
    };

    const validation = await unifiedGoalEngine.validateAlignment(input);

    res.json({ success: true, validation });
  } catch (error: any) {
    console.error('Validate alignment error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate alignment' });
  }
}

/**
 * Recommend stretch goals (GPT-4)
 * POST /api/v1/goal-tracking/stretch-goals/recommend
 */
export async function recommendStretchGoals(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { scope, scopeId, periodStart, periodEnd } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: RecommendStretchGoalsInput = {
      organizationId,
      scope,
      scopeId,
      periodStart,
      periodEnd,
    };

    const recommendations = await unifiedGoalEngine.recommendStretchGoals(input);

    res.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('Recommend stretch goals error:', error);
    res.status(500).json({ error: error.message || 'Failed to recommend stretch goals' });
  }
}

// =====================================================
// DASHBOARD ENDPOINTS
// =====================================================

/**
 * Get goal dashboard
 * GET /api/v1/goal-tracking/dashboard
 */
export async function getGoalDashboard(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { scope, scopeId, periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetGoalDashboardInput = {
      organizationId,
      scope: scope as any,
      scopeId: scopeId as string | undefined,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
    };

    const dashboard = await unifiedGoalEngine.getGoalDashboard(input);

    res.json({ success: true, dashboard });
  } catch (error: any) {
    console.error('Get goal dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goal dashboard' });
  }
}
