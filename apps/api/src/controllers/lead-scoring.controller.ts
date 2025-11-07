// =====================================================
// LEAD SCORING CONTROLLER
// Sprint 28: Lead scoring and qualification pipeline API
// =====================================================

import { Request, Response } from 'express';
import { leadScoringEngine } from '../../../agents/src/lead-scoring/lead-engine';
import type {
  RecalculateLeadScoreInput,
  UpdateLeadStageInput,
  SummarizeLeadPerformanceInput,
} from '@pravado/types';

// =====================================================
// SCORE MANAGEMENT ENDPOINTS
// =====================================================

/**
 * Get lead score for a contact
 * GET /api/v1/lead-scoring/contact/:id/score
 */
export async function getLeadScore(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;
    const { campaignId } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const score = await leadScoringEngine.getLeadScore(
      id,
      campaignId as string | undefined,
      organizationId
    );

    if (!score) {
      return res.status(404).json({ error: 'Lead score not found' });
    }

    res.json({ success: true, score });
  } catch (error: any) {
    console.error('Get lead score error:', error);
    res.status(500).json({ error: error.message || 'Failed to get lead score' });
  }
}

/**
 * Recalculate lead score
 * POST /api/v1/lead-scoring/contact/:id/recalculate
 */
export async function recalculateScore(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;
    const { campaignId } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const leadScore = await leadScoringEngine.calculateLeadScore({
      contactId: id,
      campaignId,
      organizationId,
    });

    res.json({ success: true, score: leadScore.rawScore, leadScore });
  } catch (error: any) {
    console.error('Recalculate score error:', error);
    res.status(500).json({ error: error.message || 'Failed to recalculate score' });
  }
}

/**
 * Update lead stage
 * POST /api/v1/lead-scoring/contact/:id/update-stage
 */
export async function updateStage(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<UpdateLeadStageInput, 'contactId' | 'organizationId' | 'userId'> = req.body;

    await leadScoringEngine.updateStage({
      ...input,
      contactId: id,
      organizationId,
      userId,
    });

    const updatedScore = await leadScoringEngine.getLeadScore(id, input.campaignId, organizationId);

    res.json({ success: true, leadScore: updatedScore, message: 'Stage updated successfully' });
  } catch (error: any) {
    console.error('Update stage error:', error);
    res.status(500).json({ error: error.message || 'Failed to update stage' });
  }
}

// =====================================================
// CAMPAIGN-LEVEL ENDPOINTS
// =====================================================

/**
 * Get all lead scores for a campaign
 * GET /api/v1/lead-scoring/campaign/:campaignId/scores
 */
export async function getCampaignScores(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const topLeads = await leadScoringEngine.getTopLeads(campaignId, organizationId, limit);

    res.json({ success: true, leads: topLeads.leads, total: topLeads.total });
  } catch (error: any) {
    console.error('Get campaign scores error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign scores' });
  }
}

/**
 * Get lead score summary for a campaign
 * GET /api/v1/lead-scoring/campaign/:campaignId/summary
 */
export async function getCampaignSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const summary = await leadScoringEngine.getLeadScoreSummary(campaignId, organizationId);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Get campaign summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign summary' });
  }
}

/**
 * Get top leads for a campaign
 * GET /api/v1/lead-scoring/campaign/:campaignId/top-leads
 */
export async function getTopLeads(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const result = await leadScoringEngine.getTopLeads(campaignId, organizationId, limit);

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get top leads error:', error);
    res.status(500).json({ error: error.message || 'Failed to get top leads' });
  }
}

// =====================================================
// CONTACT-LEVEL ENDPOINTS
// =====================================================

/**
 * Get lead score history for a contact
 * GET /api/v1/lead-scoring/contact/:id/history
 */
export async function getLeadHistory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const { data, error } = await (await import('@supabase/supabase-js')).createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
      .from('lead_score_history')
      .select('*')
      .eq('contact_id', id)
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to get lead history: ${error.message}`);
    }

    res.json({ success: true, history: data, total: data?.length || 0 });
  } catch (error: any) {
    console.error('Get lead history error:', error);
    res.status(500).json({ error: error.message || 'Failed to get lead history' });
  }
}

/**
 * Get lead score trend for a contact
 * GET /api/v1/lead-scoring/contact/:id/trend
 */
export async function getLeadTrend(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const trend = await leadScoringEngine.getLeadTrends(id, organizationId);

    res.json({ success: true, trend });
  } catch (error: any) {
    console.error('Get lead trend error:', error);
    res.status(500).json({ error: error.message || 'Failed to get lead trend' });
  }
}

/**
 * Summarize lead performance (GPT-powered)
 * POST /api/v1/lead-scoring/contact/:id/summarize
 */
export async function summarizeLeadPerformance(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: Omit<SummarizeLeadPerformanceInput, 'contactId' | 'organizationId'> = req.body;

    const summary = await leadScoringEngine.summarizeLeadPerformance({
      ...input,
      contactId: id,
      organizationId,
    });

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize lead performance error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize lead performance' });
  }
}

// =====================================================
// QUALIFICATION ENDPOINTS
// =====================================================

/**
 * Disqualify a lead
 * POST /api/v1/lead-scoring/contact/:id/disqualify
 */
export async function disqualifyLead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { id } = req.params;
    const { reason, notes, campaignId } = req.body;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    await leadScoringEngine.updateStage({
      contactId: id,
      campaignId,
      organizationId,
      newStage: 'DISQUALIFIED',
      disqualificationReason: reason,
      disqualificationNotes: notes,
      userId,
    });

    res.json({ success: true, message: 'Lead disqualified successfully' });
  } catch (error: any) {
    console.error('Disqualify lead error:', error);
    res.status(500).json({ error: error.message || 'Failed to disqualify lead' });
  }
}

/**
 * Get all disqualified leads
 * GET /api/v1/lead-scoring/disqualified
 */
export async function getDisqualifiedLeads(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const result = await leadScoringEngine.getDisqualifiedLeads(
      organizationId,
      campaignId as string | undefined
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get disqualified leads error:', error);
    res.status(500).json({ error: error.message || 'Failed to get disqualified leads' });
  }
}

/**
 * Get all qualified leads
 * GET /api/v1/lead-scoring/qualified
 */
export async function getQualifiedLeads(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const result = await leadScoringEngine.getQualifiedLeads(
      organizationId,
      campaignId as string | undefined
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get qualified leads error:', error);
    res.status(500).json({ error: error.message || 'Failed to get qualified leads' });
  }
}
