// =====================================================
// AGENT ANALYTICS - EVI ROUTES
// Sprint 68 Track E
// =====================================================
// API endpoints for Exposure Visibility Index (EVI) metrics

import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import {
  calculateEVIResult,
  calculateMediaReach,
  calculateEngagementRate,
  calculateSentimentScore,
  calculateTierQuality,
  type EVIComponents,
  type EVIDataPoint,
} from '@pravado/utils/analytics/evi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// EVI CALCULATION ENDPOINT
// =====================================================

/**
 * GET /api/v1/agent-analytics/evi
 * Calculate EVI score for organization or specific campaign
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { campaignId, startDate, endDate } = req.query;

    // Date range
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // =====================================================
    // FETCH METRICS DATA
    // =====================================================

    // Get campaign performance data
    let campaignQuery = supabase
      .from('campaigns')
      .select('*, press_releases(*)')
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (campaignId) {
      campaignQuery = campaignQuery.eq('id', campaignId);
    }

    const { data: campaigns } = await campaignQuery;

    // Get media mentions
    const { data: mentions } = await supabase
      .from('media_mentions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('published_at', start.toISOString())
      .lte('published_at', end.toISOString());

    // Get contact interactions
    const { data: interactions } = await supabase
      .from('campaign_interactions')
      .select('*, contacts(*)')
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // =====================================================
    // CALCULATE EVI COMPONENTS
    // =====================================================

    // Media Reach
    const totalImpressions = campaigns?.reduce(
      (sum, c) => sum + (c.actual_impressions || 0),
      0
    ) || 0;
    const coverageCount = mentions?.length || 0;

    const mediaReach = calculateMediaReach({
      impressions: totalImpressions,
      coverage: coverageCount,
      maxImpressions: 10000000, // 10M baseline
      maxCoverage: 500,
    });

    // Engagement Rate
    const totalEngagements = interactions?.filter((i) => i.interaction_type === 'ENGAGED').length || 0;
    const totalSent = interactions?.length || 1;

    const engagementRate = calculateEngagementRate({
      interactions: totalEngagements,
      impressions: totalSent,
      clicks: mentions?.filter((m) => m.virality_score && m.virality_score > 50).length || 0,
      shares: mentions?.reduce((sum, m) => sum + (m.share_count || 0), 0) || 0,
    });

    // Sentiment Score
    const positiveMentions = mentions?.filter((m) => m.sentiment === 'POSITIVE').length || 0;
    const neutralMentions = mentions?.filter((m) => m.sentiment === 'NEUTRAL').length || 0;
    const negativeMentions = mentions?.filter((m) => m.sentiment === 'NEGATIVE').length || 0;

    const sentimentScore = calculateSentimentScore({
      positive: positiveMentions,
      neutral: neutralMentions,
      negative: negativeMentions,
    });

    // Tier Quality
    const tier1Contacts = interactions?.filter((i) => i.contacts?.tier === 'TIER_1').length || 0;
    const tier2Contacts = interactions?.filter((i) => i.contacts?.tier === 'TIER_2').length || 0;
    const tier3Contacts = interactions?.filter((i) => i.contacts?.tier === 'TIER_3').length || 0;
    const untieredContacts = interactions?.filter((i) => i.contacts?.tier === 'UNTIERED').length || 0;

    const tierQuality = calculateTierQuality({
      tier1: tier1Contacts,
      tier2: tier2Contacts,
      tier3: tier3Contacts,
      untiered: untieredContacts,
    });

    const components: EVIComponents = {
      mediaReach,
      engagementRate,
      sentimentScore,
      tierQuality,
    };

    // =====================================================
    // FETCH HISTORICAL DATA
    // =====================================================

    // Get EVI history from database (last 30 days)
    const { data: history } = await supabase
      .from('agent_analytics_metrics')
      .select('created_at, evi_score')
      .eq('organization_id', organizationId)
      .eq('metric_type', 'EVI')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const historyPoints: EVIDataPoint[] = (history || []).map((h) => ({
      timestamp: new Date(h.created_at),
      score: h.evi_score,
    }));

    // =====================================================
    // CALCULATE EVI RESULT
    // =====================================================

    const result = calculateEVIResult(components, historyPoints);

    // Store current EVI score in database
    await supabase.from('agent_analytics_metrics').insert({
      organization_id: organizationId,
      campaign_id: campaignId || null,
      metric_type: 'EVI',
      evi_score: result.score,
      evi_components: components,
      evi_grade: result.grade,
      evi_trend: result.trend,
    });

    res.json({
      ...result,
      history: historyPoints,
      metadata: {
        startDate: start,
        endDate: end,
        campaignId: campaignId || null,
        dataPoints: {
          campaigns: campaigns?.length || 0,
          mentions: mentions?.length || 0,
          interactions: interactions?.length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('[EVI] Calculation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/agent-analytics/evi/history
 * Get EVI score history for visualization
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const { data: history, error } = await supabase
      .from('agent_analytics_metrics')
      .select('created_at, evi_score, evi_grade, evi_trend')
      .eq('organization_id', organizationId)
      .eq('metric_type', 'EVI')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({
      history: (history || []).map((h) => ({
        timestamp: h.created_at,
        score: h.evi_score,
        grade: h.evi_grade,
        trend: h.evi_trend,
      })),
      days: parseInt(days as string),
    });
  } catch (error: any) {
    console.error('[EVI] History fetch failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
