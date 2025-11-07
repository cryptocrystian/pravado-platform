// =====================================================
// CHANNEL INTELLIGENCE CONTROLLER
// Sprint 27: Channel effectiveness and sentiment analysis API
// =====================================================

import { Request, Response } from 'express';
import { channelEngine } from '../../../agents/src/channel-intel/channel-engine';
import type {
  LogEngagementInput,
  AnalyzeSentimentInput,
  GetChannelRecommendationsInput,
  SummarizeSentimentTrendsInput,
} from '@pravado/types';

// =====================================================
// ENGAGEMENT LOGGING ENDPOINTS
// =====================================================

/**
 * Log an engagement event
 * POST /api/v1/channel-intel/engagement
 */
export async function logEngagement(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<LogEngagementInput, 'organizationId'> = req.body;

    const engagementId = await channelEngine.logEngagement({
      ...input,
      organizationId,
    });

    res.json({ success: true, engagementId });
  } catch (error: any) {
    console.error('Log engagement error:', error);
    res.status(500).json({ error: error.message || 'Failed to log engagement' });
  }
}

/**
 * Analyze sentiment of a message
 * POST /api/v1/channel-intel/analyze-sentiment
 */
export async function analyzeSentiment(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: AnalyzeSentimentInput = req.body;

    const analysis = await channelEngine.analyzeSentiment(input);

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Analyze sentiment error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze sentiment' });
  }
}

// =====================================================
// CHANNEL PROFILE ENDPOINTS
// =====================================================

/**
 * Get contact channel profile
 * GET /api/v1/channel-intel/contact/:contactId
 */
export async function getContactProfile(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const profile = await channelEngine.getContactChannelProfile(contactId, organizationId);

    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('Get contact profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to get contact profile' });
  }
}

/**
 * Get campaign channel statistics
 * GET /api/v1/channel-intel/campaign/:campaignId
 */
export async function getCampaignStats(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const stats = await channelEngine.getCampaignChannelStats(campaignId, organizationId);

    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign stats' });
  }
}

// =====================================================
// RECOMMENDATION ENDPOINTS
// =====================================================

/**
 * Get channel recommendations for a contact
 * GET /api/v1/channel-intel/recommendations/:contactId
 */
export async function getRecommendations(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { campaignId, excludeChannels } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const recommendations = await channelEngine.getBestChannelForContact({
      contactId,
      organizationId,
      campaignId: campaignId as string | undefined,
      excludeChannels: excludeChannels
        ? (excludeChannels as string).split(',')
        : undefined,
    });

    res.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
}

/**
 * Get best time to contact
 * GET /api/v1/channel-intel/best-time/:contactId
 */
export async function getBestTime(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const recommendations = await channelEngine.getBestTimeToContact(
      contactId,
      organizationId
    );

    res.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('Get best time error:', error);
    res.status(500).json({ error: error.message || 'Failed to get best time' });
  }
}

// =====================================================
// SENTIMENT TREND ENDPOINTS
// =====================================================

/**
 * Get sentiment trends for a contact
 * GET /api/v1/channel-intel/trends/:contactId
 */
export async function getSentimentTrends(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { channelType } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const trends = await channelEngine.getSentimentTrends(
      contactId,
      organizationId,
      channelType as any
    );

    res.json({ success: true, trends, total: trends.length });
  } catch (error: any) {
    console.error('Get sentiment trends error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sentiment trends' });
  }
}

/**
 * Summarize sentiment trends (GPT-powered)
 * POST /api/v1/channel-intel/trends/:contactId/summarize
 */
export async function summarizeTrends(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<SummarizeSentimentTrendsInput, 'contactId' | 'organizationId'> =
      req.body;

    const summary = await channelEngine.summarizeSentimentTrends({
      ...input,
      contactId,
      organizationId,
    });

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize trends error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize trends' });
  }
}
