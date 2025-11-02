import { Router } from 'express';
import { autonomousCampaignController } from '../controllers/autonomous-campaign.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All autonomous campaign routes require authentication
router.use(authenticate);

// =====================================================
// CAMPAIGN ROUTES
// =====================================================

router.post('/campaigns', autonomousCampaignController.createCampaign);
router.get('/campaigns', autonomousCampaignController.listCampaigns);
router.get('/campaigns/:id', autonomousCampaignController.getCampaign);
router.patch('/campaigns/:id', autonomousCampaignController.updateCampaign);

// =====================================================
// EXECUTION ROUTES
// =====================================================

router.post('/campaigns/:id/run', autonomousCampaignController.runCampaign);
router.get('/campaigns/:id/status', autonomousCampaignController.getCampaignStatus);
router.get('/campaigns/:id/analytics', autonomousCampaignController.getCampaignAnalytics);

// =====================================================
// TEMPLATE ROUTES
// =====================================================

router.get('/templates', autonomousCampaignController.listTemplates);
router.get('/templates/:id', autonomousCampaignController.getTemplate);

export default router;
