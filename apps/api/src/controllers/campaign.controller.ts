import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { campaignService } from '../services/campaign.service';

class CampaignController {
  async getCampaigns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const campaigns = await campaignService.getCampaigns(req.user!.organizationId, req.query);
      res.json({
        success: true,
        data: campaigns,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getCampaignById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignService.getCampaignById(req.params.id);
      res.json({
        success: true,
        data: campaign,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async createCampaign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignService.createCampaign(req.body);
      res.status(201).json({
        success: true,
        data: campaign,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCampaign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignService.updateCampaign(req.params.id, req.body);
      res.json({
        success: true,
        data: campaign,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCampaign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await campaignService.deleteCampaign(req.params.id);
      res.json({
        success: true,
        message: 'Campaign deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
