// =====================================================
// PR OPPORTUNITIES CONTROLLER
// Sprint 68 Track B
// =====================================================
// HTTP request handlers for media opportunity endpoints

import { Request, Response } from 'express';
import * as opportunityService from '../services/pr-opportunities.service';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const ScanOpportunitiesSchema = z.object({
  focusKeywords: z.array(z.string()).optional(),
  minScore: z.number().min(0).max(100).optional(),
});

const ListOpportunitiesQuerySchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'ADDED_TO_CAMPAIGN', 'DISMISSED']).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  source: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const UpdateOpportunityStatusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'ADDED_TO_CAMPAIGN', 'DISMISSED']),
});

// =====================================================
// SCAN ENDPOINTS
// =====================================================

/**
 * POST /api/pr/opportunities/scan
 * Trigger a manual scan for media opportunities
 */
export async function scanOpportunities(req: Request, res: Response) {
  try {
    const input = ScanOpportunitiesSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    const result = await opportunityService.scanForOpportunities({
      organizationId,
      focusKeywords: input.focusKeywords,
      minScore: input.minScore,
    });

    res.status(200).json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// QUERY ENDPOINTS
// =====================================================

/**
 * GET /api/pr/opportunities
 * List media opportunities with filtering and pagination
 */
export async function listOpportunities(req: Request, res: Response) {
  try {
    const filters = ListOpportunitiesQuerySchema.parse(req.query);
    const organizationId = req.user!.organizationId;

    const opportunities = await opportunityService.listOpportunities(
      organizationId,
      filters
    );

    res.json(opportunities);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/pr/opportunities/:id
 * Get a single opportunity by ID
 */
export async function getOpportunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const opportunity = await opportunityService.getOpportunityById(id, organizationId);

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(opportunity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/pr/opportunities/:id/status
 * Update opportunity status
 */
export async function updateOpportunityStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input = UpdateOpportunityStatusSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    const opportunity = await opportunityService.updateOpportunityStatus(
      id,
      organizationId,
      input.status
    );

    res.json(opportunity);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/pr/opportunities/stats
 * Get opportunity statistics for dashboard
 */
export async function getOpportunityStats(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;

    const stats = await opportunityService.getOpportunityStats(organizationId);

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
