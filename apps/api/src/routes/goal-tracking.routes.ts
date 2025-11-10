// =====================================================
// UNIFIED GOAL TRACKING ROUTES
// Core Infrastructure: Multi-level goals, OKR snapshots, AI insights
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as goalTrackingController from '../controllers/goal-tracking.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// GOAL CRUD ROUTES
// =====================================================

/**
 * Create goal
 * POST /api/v1/goal-tracking/goals
 */
router.post('/goals', goalTrackingController.createGoal);

/**
 * Update goal
 * PUT /api/v1/goal-tracking/goals/:goalId
 */
router.put('/goals/:goalId', goalTrackingController.updateGoal);

/**
 * Get goals
 * GET /api/v1/goal-tracking/goals
 */
router.get('/goals', goalTrackingController.getGoals);

/**
 * Get goal by ID
 * GET /api/v1/goal-tracking/goals/:goalId
 */
router.get('/goals/:goalId', goalTrackingController.getGoalById);

// =====================================================
// PROGRESS TRACKING ROUTES
// =====================================================

/**
 * Log goal event
 * POST /api/v1/goal-tracking/goals/:goalId/events
 */
router.post('/goals/:goalId/events', goalTrackingController.logGoalEvent);

/**
 * Update goal progress
 * POST /api/v1/goal-tracking/goals/:goalId/progress
 */
router.post('/goals/:goalId/progress', goalTrackingController.updateGoalProgress);

/**
 * Calculate goal metrics
 * POST /api/v1/goal-tracking/goals/:goalId/metrics/calculate
 */
router.post('/goals/:goalId/metrics/calculate', goalTrackingController.calculateGoalMetrics);

/**
 * Get goal timeline
 * GET /api/v1/goal-tracking/goals/:goalId/timeline
 */
router.get('/goals/:goalId/timeline', goalTrackingController.getGoalTimeline);

// =====================================================
// OKR ROUTES
// =====================================================

/**
 * Generate OKR snapshot
 * POST /api/v1/goal-tracking/okr/snapshot
 */
router.post('/okr/snapshot', goalTrackingController.generateOkrSnapshot);

// =====================================================
// AI INSIGHTS ROUTES
// =====================================================

/**
 * Summarize goal (GPT-4)
 * POST /api/v1/goal-tracking/goals/:goalId/summarize
 */
router.post('/goals/:goalId/summarize', goalTrackingController.summarizeGoal);

/**
 * Validate goal alignment (GPT-4)
 * POST /api/v1/goal-tracking/goals/:goalId/validate-alignment
 */
router.post('/goals/:goalId/validate-alignment', goalTrackingController.validateAlignment);

/**
 * Recommend stretch goals (GPT-4)
 * POST /api/v1/goal-tracking/stretch-goals/recommend
 */
router.post('/stretch-goals/recommend', goalTrackingController.recommendStretchGoals);

// =====================================================
// DASHBOARD ROUTES
// =====================================================

/**
 * Get goal dashboard
 * GET /api/v1/goal-tracking/dashboard
 */
router.get('/dashboard', goalTrackingController.getGoalDashboard);

export default router;
