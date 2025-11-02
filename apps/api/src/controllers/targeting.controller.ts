// =====================================================
// TARGETING CONTROLLER - API Handlers
// =====================================================

import { Request, Response } from 'express';
import { contactMatcher } from '../../../agents/src/targeting/contact-matcher';
import { campaignReadiness } from '../../../agents/src/targeting/campaign-readiness';
import type {
  MatchContactsRequest,
  CampaignReadinessRequest,
  SuitableContactsRequest,
  UpdateCampaignContactMatchInput,
} from '@pravado/shared-types';

/**
 * Match contacts to campaign
 * POST /api/v1/targeting/match
 */
export async function matchContacts(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: MatchContactsRequest = {
      ...req.body,
      organizationId,
    };

    const matches = await contactMatcher.matchContactsToCampaign(request);

    res.json({
      success: true,
      matches,
      count: matches.length,
    });
  } catch (error: any) {
    console.error('matchContacts error:', error);
    res.status(500).json({
      error: error.message || 'Failed to match contacts',
    });
  }
}

/**
 * Create bulk matches for campaign
 * POST /api/v1/targeting/bulk-match
 */
export async function createBulkMatches(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: MatchContactsRequest = {
      ...req.body,
      organizationId,
    };

    const result = await contactMatcher.createBulkMatches(request);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('createBulkMatches error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create bulk matches',
    });
  }
}

/**
 * Get campaign matches
 * GET /api/v1/targeting/campaigns/:campaignId/matches
 */
export async function getCampaignMatches(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const filters = {
      approved: req.query.approved ? req.query.approved === 'true' : undefined,
      excluded: req.query.excluded ? req.query.excluded === 'true' : undefined,
      minScore: req.query.minScore ? parseFloat(req.query.minScore as string) : undefined,
    };

    const matches = await contactMatcher.getCampaignMatches(
      campaignId,
      organizationId,
      filters
    );

    res.json({
      success: true,
      matches,
      count: matches.length,
    });
  } catch (error: any) {
    console.error('getCampaignMatches error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get campaign matches',
    });
  }
}

/**
 * Approve a contact match
 * POST /api/v1/targeting/matches/:matchId/approve
 */
export async function approveMatch(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { matchId } = req.params;

    const match = await contactMatcher.approveMatch(matchId, userId, organizationId);

    res.json({
      success: true,
      match,
    });
  } catch (error: any) {
    console.error('approveMatch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to approve match',
    });
  }
}

/**
 * Exclude a contact match
 * POST /api/v1/targeting/matches/:matchId/exclude
 */
export async function excludeMatch(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { matchId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Exclusion reason is required' });
    }

    const match = await contactMatcher.excludeMatch(matchId, userId, reason, organizationId);

    res.json({
      success: true,
      match,
    });
  } catch (error: any) {
    console.error('excludeMatch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to exclude match',
    });
  }
}

/**
 * Get suitable contacts for topics
 * POST /api/v1/targeting/suitable-contacts
 */
export async function getSuitableContacts(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: SuitableContactsRequest = {
      ...req.body,
      organizationId,
    };

    const contacts = await contactMatcher.getSuitableContactsForTopics(request);

    res.json({
      success: true,
      contacts,
      count: contacts.length,
    });
  } catch (error: any) {
    console.error('getSuitableContacts error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get suitable contacts',
    });
  }
}

/**
 * Generate targeting suggestions
 * POST /api/v1/targeting/campaigns/:campaignId/suggestions
 */
export async function generateSuggestions(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const { agentId, context } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const suggestions = await contactMatcher.generateSuggestions(
      campaignId,
      organizationId,
      agentId,
      context
    );

    res.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error: any) {
    console.error('generateSuggestions error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate suggestions',
    });
  }
}

/**
 * Calculate campaign readiness
 * GET /api/v1/targeting/campaigns/:campaignId/readiness
 */
export async function calculateReadiness(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    const readiness = await campaignReadiness.calculateReadiness({
      campaignId,
      organizationId,
    });

    res.json({
      success: true,
      readiness,
    });
  } catch (error: any) {
    console.error('calculateReadiness error:', error);
    res.status(500).json({
      error: error.message || 'Failed to calculate readiness',
    });
  }
}

/**
 * Get targeting summary
 * GET /api/v1/targeting/campaigns/:campaignId/summary
 */
export async function getTargetingSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    const summary = await campaignReadiness.getTargetingSummary(campaignId, organizationId);

    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('getTargetingSummary error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get targeting summary',
    });
  }
}

/**
 * Get readiness recommendations
 * GET /api/v1/targeting/campaigns/:campaignId/recommendations
 */
export async function getRecommendations(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    const recommendations = await campaignReadiness.getRecommendations(
      campaignId,
      organizationId
    );

    res.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    console.error('getRecommendations error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get recommendations',
    });
  }
}

/**
 * Check if campaign can execute
 * GET /api/v1/targeting/campaigns/:campaignId/can-execute
 */
export async function canExecuteCampaign(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    const result = await campaignReadiness.canExecuteCampaign(campaignId, organizationId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('canExecuteCampaign error:', error);
    res.status(500).json({
      error: error.message || 'Failed to check campaign execution status',
    });
  }
}

/**
 * Auto-approve matches
 * POST /api/v1/targeting/campaigns/:campaignId/auto-approve
 */
export async function autoApproveMatches(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const options = {
      minScore: req.body.minScore,
      minTier: req.body.minTier,
      maxCount: req.body.maxCount,
      dryRun: req.body.dryRun,
    };

    const result = await campaignReadiness.autoApproveMatches(
      campaignId,
      organizationId,
      options
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('autoApproveMatches error:', error);
    res.status(500).json({
      error: error.message || 'Failed to auto-approve matches',
    });
  }
}

/**
 * Update targeting criteria
 * PUT /api/v1/targeting/campaigns/:campaignId/criteria
 */
export async function updateTargetingCriteria(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const { criteria, triggerRematch = false } = req.body;

    if (!criteria) {
      return res.status(400).json({ error: 'Criteria is required' });
    }

    await campaignReadiness.updateTargetingCriteria(
      campaignId,
      organizationId,
      criteria,
      triggerRematch
    );

    res.json({
      success: true,
      message: 'Targeting criteria updated',
    });
  } catch (error: any) {
    console.error('updateTargetingCriteria error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update targeting criteria',
    });
  }
}

/**
 * Monitor campaigns readiness
 * GET /api/v1/targeting/monitor
 */
export async function monitorReadiness(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const statuses = req.query.statuses
      ? (req.query.statuses as string).split(',')
      : undefined;

    const results = await campaignReadiness.monitorCampaignsReadiness(
      organizationId,
      statuses as any
    );

    res.json({
      success: true,
      campaigns: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('monitorReadiness error:', error);
    res.status(500).json({
      error: error.message || 'Failed to monitor readiness',
    });
  }
}
