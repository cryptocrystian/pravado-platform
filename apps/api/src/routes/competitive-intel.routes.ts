// =====================================================
// COMPETITIVE INTELLIGENCE ROUTES
// Sprint 33: Competitor tracking, market trends, AI insights
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as competitiveIntelController from '../controllers/competitive-intel.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// COMPETITOR ROUTES
// =====================================================

/**
 * Create competitor
 * POST /api/v1/competitive-intel/competitors
 */
router.post('/competitors', competitiveIntelController.createCompetitor);

/**
 * Update competitor
 * PUT /api/v1/competitive-intel/competitors/:competitorId
 */
router.put('/competitors/:competitorId', competitiveIntelController.updateCompetitor);

/**
 * Get competitors
 * GET /api/v1/competitive-intel/competitors
 */
router.get('/competitors', competitiveIntelController.getCompetitors);

/**
 * Get competitor profile
 * GET /api/v1/competitive-intel/competitors/:competitorId/profile
 */
router.get('/competitors/:competitorId/profile', competitiveIntelController.getCompetitorProfile);

/**
 * Summarize competitor (GPT-4)
 * POST /api/v1/competitive-intel/competitors/:competitorId/summarize
 */
router.post('/competitors/:competitorId/summarize', competitiveIntelController.summarizeCompetitor);

/**
 * Calculate competitor metrics
 * POST /api/v1/competitive-intel/competitors/:competitorId/metrics/calculate
 */
router.post('/competitors/:competitorId/metrics/calculate', competitiveIntelController.calculateMetrics);

/**
 * Get competitor metrics
 * GET /api/v1/competitive-intel/competitors/:competitorId/metrics
 */
router.get('/competitors/:competitorId/metrics', competitiveIntelController.getCompetitorMetrics);

// =====================================================
// INTEL EVENT ROUTES
// =====================================================

/**
 * Log intel event
 * POST /api/v1/competitive-intel/events
 */
router.post('/events', competitiveIntelController.logIntelEvent);

/**
 * Update intel event
 * PUT /api/v1/competitive-intel/events/:eventId
 */
router.put('/events/:eventId', competitiveIntelController.updateIntelEvent);

/**
 * Get intel feed
 * GET /api/v1/competitive-intel/events
 */
router.get('/events', competitiveIntelController.getIntelFeed);

// =====================================================
// TRENDS ROUTES
// =====================================================

/**
 * Create trend
 * POST /api/v1/competitive-intel/trends
 */
router.post('/trends', competitiveIntelController.createTrend);

/**
 * Get trends
 * GET /api/v1/competitive-intel/trends
 */
router.get('/trends', competitiveIntelController.getTrends);

/**
 * Get market trends summary
 * GET /api/v1/competitive-intel/market/:category/trends
 */
router.get('/market/:category/trends', competitiveIntelController.getMarketTrends);

/**
 * Summarize market trends (GPT-4)
 * POST /api/v1/competitive-intel/market/:category/summarize
 */
router.post('/market/:category/summarize', competitiveIntelController.summarizeMarketTrends);

// =====================================================
// DASHBOARD ROUTES
// =====================================================

/**
 * Get dashboard snapshot
 * GET /api/v1/competitive-intel/dashboard
 */
router.get('/dashboard', competitiveIntelController.getDashboard);

export default router;
