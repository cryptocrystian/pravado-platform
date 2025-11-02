// =====================================================
// GOALS ROUTES - Goal Management & Attribution API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as goalsController from '../controllers/goals.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// GOAL MANAGEMENT ROUTES
// =====================================================

/**
 * Create a new campaign goal
 * POST /api/v1/goals/campaign/:campaignId/create
 * Body: { goalType, title, description?, targetMetric, priority?, trackingMethod?, successConditions?, dueDate? }
 */
router.post('/campaign/:campaignId/create', goalsController.createGoal);

/**
 * Update a campaign goal
 * PUT /api/v1/goals/:goalId
 * Body: { title?, description?, targetMetric?, priority?, trackingMethod?, successConditions?, dueDate?, status? }
 */
router.put('/:goalId', goalsController.updateGoal);

/**
 * Get all goals for a campaign
 * GET /api/v1/goals/campaign/:campaignId/goals
 */
router.get('/campaign/:campaignId/goals', goalsController.getCampaignGoals);

/**
 * Get a single goal
 * GET /api/v1/goals/:goalId
 */
router.get('/:goalId', goalsController.getGoal);

/**
 * Calculate goal progress manually
 * POST /api/v1/goals/:goalId/calculate
 */
router.post('/:goalId/calculate', goalsController.calculateProgress);

// =====================================================
// OUTCOME TRACKING ROUTES
// =====================================================

/**
 * Track an attribution event
 * POST /api/v1/goals/campaign/:campaignId/track-event
 * Body: { eventType, eventSubtype?, contactId?, agentRunId?, goalId?, description?, value?, context?, attributionWeight? }
 */
router.post('/campaign/:campaignId/track-event', goalsController.trackEvent);

// =====================================================
// ANALYTICS ROUTES
// =====================================================

/**
 * Get campaign goals summary
 * GET /api/v1/goals/campaign/:campaignId/summary
 */
router.get('/campaign/:campaignId/summary', goalsController.getCampaignSummary);

/**
 * Get attribution map for campaign
 * GET /api/v1/goals/campaign/:campaignId/attribution
 */
router.get('/campaign/:campaignId/attribution', goalsController.getAttributionMap);

/**
 * Get attribution log for campaign
 * GET /api/v1/goals/campaign/:campaignId/attribution-log
 * Query: limit? (default 100)
 */
router.get('/campaign/:campaignId/attribution-log', goalsController.getAttributionLog);

/**
 * Summarize campaign goal performance (GPT-powered)
 * POST /api/v1/goals/campaign/:campaignId/summarize
 * Body: { includeRecommendations?, includeAttributionBreakdown? }
 */
router.post('/campaign/:campaignId/summarize', goalsController.summarizeGoalPerformance);

/**
 * Summarize single goal performance
 * POST /api/v1/goals/:goalId/summarize
 * Body: { includeRecommendations?, includeAttributionBreakdown? }
 */
router.post('/:goalId/summarize', goalsController.summarizeSingleGoal);

// =====================================================
// AGENT INTEGRATION ROUTES
// =====================================================

/**
 * Get goal context for agents
 * GET /api/v1/goals/campaign/:campaignId/context
 * Query: activeOnly? (boolean)
 */
router.get('/campaign/:campaignId/context', goalsController.getGoalContext);

export default router;
