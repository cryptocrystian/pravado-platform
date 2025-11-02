// =====================================================
// TARGETING ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as targetingController from '../controllers/targeting.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// CONTACT MATCHING ROUTES
// =====================================================

/**
 * Match contacts to campaign (no persistence)
 * POST /api/v1/targeting/match
 */
router.post('/match', targetingController.matchContacts);

/**
 * Create bulk matches for campaign (with persistence)
 * POST /api/v1/targeting/bulk-match
 */
router.post('/bulk-match', targetingController.createBulkMatches);

/**
 * Get suitable contacts for topics
 * POST /api/v1/targeting/suitable-contacts
 */
router.post('/suitable-contacts', targetingController.getSuitableContacts);

// =====================================================
// CAMPAIGN MATCH MANAGEMENT ROUTES
// =====================================================

/**
 * Get campaign matches
 * GET /api/v1/targeting/campaigns/:campaignId/matches
 * Query params: approved, excluded, minScore
 */
router.get('/campaigns/:campaignId/matches', targetingController.getCampaignMatches);

/**
 * Approve a contact match
 * POST /api/v1/targeting/matches/:matchId/approve
 */
router.post('/matches/:matchId/approve', targetingController.approveMatch);

/**
 * Exclude a contact match
 * POST /api/v1/targeting/matches/:matchId/exclude
 * Body: { reason: string }
 */
router.post('/matches/:matchId/exclude', targetingController.excludeMatch);

/**
 * Auto-approve matches
 * POST /api/v1/targeting/campaigns/:campaignId/auto-approve
 * Body: { minScore?, minTier?, maxCount?, dryRun? }
 */
router.post('/campaigns/:campaignId/auto-approve', targetingController.autoApproveMatches);

// =====================================================
// TARGETING SUGGESTIONS ROUTES
// =====================================================

/**
 * Generate targeting suggestions
 * POST /api/v1/targeting/campaigns/:campaignId/suggestions
 * Body: { agentId: string, context?: {...} }
 */
router.post('/campaigns/:campaignId/suggestions', targetingController.generateSuggestions);

// =====================================================
// CAMPAIGN READINESS ROUTES
// =====================================================

/**
 * Calculate campaign readiness
 * GET /api/v1/targeting/campaigns/:campaignId/readiness
 */
router.get('/campaigns/:campaignId/readiness', targetingController.calculateReadiness);

/**
 * Get targeting summary
 * GET /api/v1/targeting/campaigns/:campaignId/summary
 */
router.get('/campaigns/:campaignId/summary', targetingController.getTargetingSummary);

/**
 * Get readiness recommendations
 * GET /api/v1/targeting/campaigns/:campaignId/recommendations
 */
router.get('/campaigns/:campaignId/recommendations', targetingController.getRecommendations);

/**
 * Check if campaign can execute
 * GET /api/v1/targeting/campaigns/:campaignId/can-execute
 */
router.get('/campaigns/:campaignId/can-execute', targetingController.canExecuteCampaign);

/**
 * Update targeting criteria
 * PUT /api/v1/targeting/campaigns/:campaignId/criteria
 * Body: { criteria: TargetingCriteria, triggerRematch?: boolean }
 */
router.put('/campaigns/:campaignId/criteria', targetingController.updateTargetingCriteria);

// =====================================================
// MONITORING ROUTES
// =====================================================

/**
 * Monitor campaigns readiness
 * GET /api/v1/targeting/monitor
 * Query params: statuses (comma-separated)
 */
router.get('/monitor', targetingController.monitorReadiness);

export default router;
