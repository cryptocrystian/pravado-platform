// =====================================================
// AUTONOMOUS CAMPAIGN CONTROLLER
// =====================================================
// HTTP request handlers for autonomous campaign creation and execution

import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { autoCampaignAgent } from '../../../agents/src/flows/auto-campaign.agent';
import { logger } from '../lib/logger';
import {
  CreateAutonomousCampaignInputSchema,
  UpdateAutonomousCampaignInputSchema,
  CampaignPlanningRequestSchema,
  CampaignExecutionRequestSchema,
} from '@pravado/shared-types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class AutonomousCampaignController {
  // =====================================================
  // CAMPAIGNS
  // =====================================================

  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateAutonomousCampaignInputSchema.parse({
        ...req.body,
        organizationId,
        createdBy: userId,
      });

      logger.info('Creating autonomous campaign', {
        prompt: input.originalPrompt.substring(0, 100),
        organizationId,
      });

      // Create campaign planning request
      const planningRequest = CampaignPlanningRequestSchema.parse({
        prompt: input.originalPrompt,
        campaignType: input.campaignType,
      });

      // Delegate to autonomous agent
      const campaign = await autoCampaignAgent.createCampaign(
        planningRequest,
        organizationId,
        userId
      );

      logger.info('Autonomous campaign created', {
        campaignId: campaign.id,
        qualityScore: campaign.qualityScore,
      });

      res.status(201).json(campaign);
    } catch (error) {
      logger.error('Failed to create campaign', error);
      next(error);
    }
  }

  async listCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let query = supabase
        .from('autonomous_campaigns')
        .select('*')
        .eq('organization_id', organizationId);

      // Filter by status
      if (req.query.status) {
        query = query.eq('status', req.query.status);
      }

      // Filter by campaign type
      if (req.query.campaignType) {
        query = query.eq('campaign_type', req.query.campaignType);
      }

      // Filter by agent created
      if (req.query.agentCreated !== undefined) {
        query = query.eq('agent_created', req.query.agentCreated === 'true');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to list campaigns: ${error.message}`);
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to list campaigns', error);
      next(error);
    }
  }

  async getCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('autonomous_campaigns')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to get campaign', error);
      next(error);
    }
  }

  async updateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateAutonomousCampaignInputSchema.parse(req.body);

      const { data, error } = await supabase
        .from('autonomous_campaigns')
        .update(input)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update campaign: ${error.message}`);
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to update campaign', error);
      next(error);
    }
  }

  // =====================================================
  // CAMPAIGN EXECUTION
  // =====================================================

  async runCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const executionRequest = CampaignExecutionRequestSchema.parse({
        ...req.body,
        campaignId: id,
      });

      logger.info('Starting campaign execution', {
        campaignId: id,
        dryRun: executionRequest.dryRun,
      });

      // Execute campaign asynchronously
      autoCampaignAgent
        .executeCampaign(id, organizationId, executionRequest.dryRun)
        .catch((error) => {
          logger.error('Campaign execution failed', error);
        });

      res.json({
        message: 'Campaign execution initiated',
        campaignId: id,
        dryRun: executionRequest.dryRun,
      });
    } catch (error) {
      logger.error('Failed to run campaign', error);
      next(error);
    }
  }

  async getCampaignStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('autonomous_campaigns')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Get execution graph if exists
      let executionGraph = null;
      if (campaign.execution_graph_id) {
        const { data: graphData } = await supabase
          .from('execution_graphs')
          .select('*')
          .eq('id', campaign.execution_graph_id)
          .single();

        executionGraph = graphData;
      }

      // Get task statistics
      const { data: stats } = await supabase.rpc('get_campaign_statistics', {
        p_campaign_id: id,
        p_organization_id: organizationId,
      });

      res.json({
        campaign,
        executionGraph,
        statistics: stats?.[0] || null,
      });
    } catch (error) {
      logger.error('Failed to get campaign status', error);
      next(error);
    }
  }

  // =====================================================
  // CAMPAIGN TEMPLATES
  // =====================================================

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('campaign_templates')
        .select('*')
        .or(`organization_id.eq.${organizationId},is_system_template.eq.true`)
        .order('usage_count', { ascending: false });

      if (error) {
        throw new Error(`Failed to list templates: ${error.message}`);
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to list templates', error);
      next(error);
    }
  }

  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('campaign_templates')
        .select('*')
        .eq('id', id)
        .or(`organization_id.eq.${organizationId},is_system_template.eq.true`)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to get template', error);
      next(error);
    }
  }

  // =====================================================
  // CAMPAIGN ANALYTICS
  // =====================================================

  async getCampaignAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get campaign success score
      const { data: successScore } = await supabase.rpc('calculate_campaign_success', {
        p_campaign_id: id,
        p_organization_id: organizationId,
      });

      // Get campaign with stats
      const { data: campaign } = await supabase
        .from('autonomous_campaigns')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({
        campaignId: id,
        successScore: successScore || 0,
        metrics: {
          totalContactsTargeted: campaign.total_contacts_targeted,
          pitchesSent: campaign.pitches_sent,
          responsesReceived: campaign.responses_received,
          placementsAchieved: campaign.placements_achieved,
          responseRate:
            campaign.pitches_sent > 0
              ? campaign.responses_received / campaign.pitches_sent
              : 0,
          placementRate:
            campaign.responses_received > 0
              ? campaign.placements_achieved / campaign.responses_received
              : 0,
        },
        quality: {
          qualityScore: campaign.quality_score,
          learnings: campaign.learnings,
        },
      });
    } catch (error) {
      logger.error('Failed to get campaign analytics', error);
      next(error);
    }
  }
}

export const autonomousCampaignController = new AutonomousCampaignController();
