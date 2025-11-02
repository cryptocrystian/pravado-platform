// =====================================================
// PR CAMPAIGN CONTROLLER
// =====================================================
// HTTP request handlers for PR campaign endpoints

import { Request, Response } from 'express';
import {
  CreatePRCampaignSchema,
  UpdatePRCampaignSchema,
  CreatePressReleaseSchema,
  UpdatePressReleaseSchema,
  CreateCampaignInteractionSchema,
  UpdateCampaignInteractionSchema,
  CreatePitchTemplateSchema,
  UpdatePitchTemplateSchema,
  GeneratePitchRequestSchema,
  GetRecommendedTargetsSchema,
} from '@pravado/shared-types';
import * as campaignService from '../services/pr-campaign.service';

// =====================================================
// CAMPAIGN ENDPOINTS
// =====================================================

export async function createCampaign(req: Request, res: Response) {
  try {
    const input = CreatePRCampaignSchema.parse(req.body);
    const userId = req.user!.id;

    const campaign = await campaignService.createCampaign(input, userId);
    res.status(201).json(campaign);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function getCampaign(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const campaign = await campaignService.getCampaignById(id, organizationId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listCampaigns(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;
    const { status, teamId, ownerId } = req.query;

    const campaigns = await campaignService.listCampaigns(organizationId, {
      status: status as string | undefined,
      teamId: teamId as string | undefined,
      ownerId: ownerId as string | undefined,
    });

    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateCampaign(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input = UpdatePRCampaignSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const campaign = await campaignService.updateCampaign(id, input, userId, organizationId);
    res.json(campaign);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCampaign(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    await campaignService.deleteCampaign(id, organizationId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCampaignStats(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const stats = await campaignService.getCampaignStats(id, organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// PRESS RELEASE ENDPOINTS
// =====================================================

export async function createPressRelease(req: Request, res: Response) {
  try {
    const input = CreatePressReleaseSchema.parse(req.body);
    const userId = req.user!.id;

    const release = await campaignService.createPressRelease(input, userId);
    res.status(201).json(release);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function getPressRelease(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const release = await campaignService.getPressReleaseById(id, organizationId);
    if (!release) {
      return res.status(404).json({ error: 'Press release not found' });
    }

    res.json(release);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listPressReleases(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;
    const { campaignId, status } = req.query;

    const releases = await campaignService.listPressReleases(organizationId, {
      campaignId: campaignId as string | undefined,
      status: status as string | undefined,
    });

    res.json(releases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updatePressRelease(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input = UpdatePressReleaseSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const release = await campaignService.updatePressRelease(id, input, userId, organizationId);
    res.json(release);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deletePressRelease(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    await campaignService.deletePressRelease(id, organizationId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getPressReleaseStats(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const stats = await campaignService.getPressReleaseStats(id, organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// AI & TARGETING ENDPOINTS
// =====================================================

export async function generatePitch(req: Request, res: Response) {
  try {
    const { releaseId, contactId } = req.params;
    const { templateId, customInstructions } = GeneratePitchRequestSchema.parse({
      pressReleaseId: releaseId,
      contactId,
      ...req.body,
    });
    const organizationId = req.user!.organizationId;

    const pitch = await campaignService.generatePitch(
      releaseId,
      contactId,
      organizationId,
      templateId,
      customInstructions
    );

    res.json(pitch);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function getRecommendedTargets(req: Request, res: Response) {
  try {
    const { releaseId } = req.params;
    const { maxResults, minScore } = GetRecommendedTargetsSchema.parse({
      pressReleaseId: releaseId,
      maxResults: req.query.maxResults ? parseInt(req.query.maxResults as string) : undefined,
      minScore: req.query.minScore ? parseFloat(req.query.minScore as string) : undefined,
    });
    const organizationId = req.user!.organizationId;

    const targets = await campaignService.getRecommendedTargets(
      releaseId,
      organizationId,
      maxResults,
      minScore
    );

    res.json(targets);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// INTERACTION ENDPOINTS
// =====================================================

export async function createInteraction(req: Request, res: Response) {
  try {
    const input = CreateCampaignInteractionSchema.parse(req.body);
    const userId = req.user!.id;

    const interaction = await campaignService.createInteraction(input, userId);
    res.status(201).json(interaction);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function updateInteraction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input = UpdateCampaignInteractionSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    const interaction = await campaignService.updateInteraction(id, input, organizationId);
    res.json(interaction);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function getContactInteractions(req: Request, res: Response) {
  try {
    const { contactId } = req.params;
    const organizationId = req.user!.organizationId;

    const interactions = await campaignService.getInteractionsByContact(contactId, organizationId);
    res.json(interactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// PITCH TEMPLATE ENDPOINTS
// =====================================================

export async function createPitchTemplate(req: Request, res: Response) {
  try {
    const input = CreatePitchTemplateSchema.parse(req.body);
    const userId = req.user!.id;

    const template = await campaignService.createPitchTemplate(input, userId);
    res.status(201).json(template);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function listPitchTemplates(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;

    const templates = await campaignService.listPitchTemplates(organizationId);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updatePitchTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input = UpdatePitchTemplateSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const template = await campaignService.updatePitchTemplate(id, input, userId, organizationId);
    res.json(template);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deletePitchTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    await campaignService.deletePitchTemplate(id, organizationId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
