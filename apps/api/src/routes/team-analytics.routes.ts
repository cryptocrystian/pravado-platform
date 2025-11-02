// =====================================================
// TEAM ANALYTICS ROUTES
// Sprint 32: Activity tracking, anomaly detection, coaching
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as teamAnalyticsController from '../controllers/team-analytics.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// ACTIVITY LOGGING ROUTES
// =====================================================

/**
 * Log team event
 * POST /api/v1/team-analytics/event
 * Body: LogTeamEventInput (organizationId and userId auto-added)
 */
router.post('/event', teamAnalyticsController.logTeamEvent);

// =====================================================
// METRICS ROUTES
// =====================================================

/**
 * Calculate behavior metrics
 * POST /api/v1/team-analytics/metrics/calculate
 * Body: { userId?, periodStart, periodEnd, windowType? }
 */
router.post('/metrics/calculate', teamAnalyticsController.calculateMetrics);

/**
 * Calculate metrics for all users
 * POST /api/v1/team-analytics/metrics/calculate-all
 * Body: { periodStart, periodEnd, windowType? }
 */
router.post('/metrics/calculate-all', teamAnalyticsController.calculateMetricsForAll);

/**
 * Get behavior metrics
 * GET /api/v1/team-analytics/metrics
 * Query: { userId?, windowType?, periodStart?, periodEnd?, limit?, offset? }
 */
router.get('/metrics', teamAnalyticsController.getBehaviorMetrics);

/**
 * Get performance trend for a user
 * GET /api/v1/team-analytics/metrics/trend/:userId
 * Query: { periodStart, periodEnd }
 */
router.get('/metrics/trend/:userId', teamAnalyticsController.getPerformanceTrend);

// =====================================================
// ANOMALY ROUTES
// =====================================================

/**
 * Detect behavioral anomalies
 * POST /api/v1/team-analytics/anomalies/detect
 * Body: { userId?, detectionWindowStart, detectionWindowEnd }
 */
router.post('/anomalies/detect', teamAnalyticsController.detectAnomalies);

/**
 * Detect anomalies for all users
 * POST /api/v1/team-analytics/anomalies/detect-all
 * Body: { detectionWindowStart, detectionWindowEnd }
 */
router.post('/anomalies/detect-all', teamAnalyticsController.detectAnomaliesForAll);

/**
 * Get anomalies
 * GET /api/v1/team-analytics/anomalies
 * Query: { userId?, anomalyType?, severity?, isResolved?, limit?, offset? }
 */
router.get('/anomalies', teamAnalyticsController.getAnomalies);

/**
 * Resolve anomaly
 * PUT /api/v1/team-analytics/anomalies/:anomalyId/resolve
 * Body: { resolutionNotes? }
 */
router.put('/anomalies/:anomalyId/resolve', teamAnalyticsController.resolveAnomaly);

// =====================================================
// ACTIVITY FEED ROUTES
// =====================================================

/**
 * Get team activity feed
 * GET /api/v1/team-analytics/activity-feed
 * Query: { userId?, campaignId?, activityTypes? (comma-separated), startDate?, endDate?, limit?, offset? }
 */
router.get('/activity-feed', teamAnalyticsController.getActivityFeed);

// =====================================================
// SUMMARIZATION & INSIGHTS ROUTES
// =====================================================

/**
 * Summarize team patterns (GPT-powered)
 * POST /api/v1/team-analytics/summarize
 * Body: { periodStart, periodEnd, includeCoaching? }
 */
router.post('/summarize', teamAnalyticsController.summarizeTeamPatterns);

/**
 * Recommend coaching opportunities (GPT-powered)
 * POST /api/v1/team-analytics/coaching
 * Body: { userId?, periodStart, periodEnd }
 */
router.post('/coaching', teamAnalyticsController.recommendCoaching);

export default router;
