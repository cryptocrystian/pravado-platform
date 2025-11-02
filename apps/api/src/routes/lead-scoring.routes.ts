// =====================================================
// LEAD SCORING ROUTES
// Sprint 28: Lead scoring and qualification pipeline API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as leadScoringController from '../controllers/lead-scoring.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// SCORE MANAGEMENT ROUTES
// =====================================================

/**
 * Get lead score for a contact
 * GET /api/v1/lead-scoring/contact/:id/score
 * Query: campaignId?
 */
router.get('/contact/:id/score', leadScoringController.getLeadScore);

/**
 * Recalculate lead score
 * POST /api/v1/lead-scoring/contact/:id/recalculate
 * Body: { campaignId? }
 */
router.post('/contact/:id/recalculate', leadScoringController.recalculateScore);

/**
 * Update lead stage
 * POST /api/v1/lead-scoring/contact/:id/update-stage
 * Body: { newStage, campaignId?, disqualificationReason?, disqualificationNotes?, source? }
 */
router.post('/contact/:id/update-stage', leadScoringController.updateStage);

// =====================================================
// CAMPAIGN-LEVEL ROUTES
// =====================================================

/**
 * Get all lead scores for a campaign
 * GET /api/v1/lead-scoring/campaign/:campaignId/scores
 * Query: limit?
 */
router.get('/campaign/:campaignId/scores', leadScoringController.getCampaignScores);

/**
 * Get lead score summary for a campaign
 * GET /api/v1/lead-scoring/campaign/:campaignId/summary
 */
router.get('/campaign/:campaignId/summary', leadScoringController.getCampaignSummary);

/**
 * Get top leads for a campaign
 * GET /api/v1/lead-scoring/campaign/:campaignId/top-leads
 * Query: limit?
 */
router.get('/campaign/:campaignId/top-leads', leadScoringController.getTopLeads);

// =====================================================
// CONTACT-LEVEL ROUTES
// =====================================================

/**
 * Get lead score history for a contact
 * GET /api/v1/lead-scoring/contact/:id/history
 */
router.get('/contact/:id/history', leadScoringController.getLeadHistory);

/**
 * Get lead score trend for a contact
 * GET /api/v1/lead-scoring/contact/:id/trend
 */
router.get('/contact/:id/trend', leadScoringController.getLeadTrend);

/**
 * Summarize lead performance (GPT-powered)
 * POST /api/v1/lead-scoring/contact/:id/summarize
 * Body: { campaignId?, includeRecommendations? }
 */
router.post('/contact/:id/summarize', leadScoringController.summarizeLeadPerformance);

// =====================================================
// QUALIFICATION ROUTES
// =====================================================

/**
 * Disqualify a lead
 * POST /api/v1/lead-scoring/contact/:id/disqualify
 * Body: { reason, notes?, campaignId? }
 */
router.post('/contact/:id/disqualify', leadScoringController.disqualifyLead);

/**
 * Get all disqualified leads
 * GET /api/v1/lead-scoring/disqualified
 * Query: campaignId?
 */
router.get('/disqualified', leadScoringController.getDisqualifiedLeads);

/**
 * Get all qualified leads
 * GET /api/v1/lead-scoring/qualified
 * Query: campaignId?
 */
router.get('/qualified', leadScoringController.getQualifiedLeads);

export default router;
