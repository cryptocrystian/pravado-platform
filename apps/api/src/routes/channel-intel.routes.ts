// =====================================================
// CHANNEL INTELLIGENCE ROUTES
// Sprint 27: Channel effectiveness and sentiment analysis API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as channelIntelController from '../controllers/channel-intel.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// ENGAGEMENT LOGGING ROUTES
// =====================================================

/**
 * Log an engagement event
 * POST /api/v1/channel-intel/engagement
 * Body: { contactId, campaignId?, channelType, engagementType, sentiment?, engagementScore?, rawMessage?, metadata?, agentId?, engagedAt? }
 */
router.post('/engagement', channelIntelController.logEngagement);

/**
 * Analyze sentiment of a message
 * POST /api/v1/channel-intel/analyze-sentiment
 * Body: { message, channelType, engagementType, contactContext? }
 */
router.post('/analyze-sentiment', channelIntelController.analyzeSentiment);

// =====================================================
// CHANNEL PROFILE ROUTES
// =====================================================

/**
 * Get contact channel profile
 * GET /api/v1/channel-intel/contact/:contactId
 */
router.get('/contact/:contactId', channelIntelController.getContactProfile);

/**
 * Get campaign channel statistics
 * GET /api/v1/channel-intel/campaign/:campaignId
 */
router.get('/campaign/:campaignId', channelIntelController.getCampaignStats);

// =====================================================
// RECOMMENDATION ROUTES
// =====================================================

/**
 * Get channel recommendations for a contact
 * GET /api/v1/channel-intel/recommendations/:contactId
 * Query: campaignId?, excludeChannels? (comma-separated)
 */
router.get('/recommendations/:contactId', channelIntelController.getRecommendations);

/**
 * Get best time to contact
 * GET /api/v1/channel-intel/best-time/:contactId
 */
router.get('/best-time/:contactId', channelIntelController.getBestTime);

// =====================================================
// SENTIMENT TREND ROUTES
// =====================================================

/**
 * Get sentiment trends for a contact
 * GET /api/v1/channel-intel/trends/:contactId
 * Query: channelType?
 */
router.get('/trends/:contactId', channelIntelController.getSentimentTrends);

/**
 * Summarize sentiment trends (GPT-powered)
 * POST /api/v1/channel-intel/trends/:contactId/summarize
 * Body: { channelType?, timeframe?, includeRecommendations? }
 */
router.post('/trends/:contactId/summarize', channelIntelController.summarizeTrends);

export default router;
