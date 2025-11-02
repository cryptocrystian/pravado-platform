import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Permission } from '@pravado/shared-types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Permission.CAMPAIGN_READ), campaignController.getCampaigns);
router.get('/:id', authorize(Permission.CAMPAIGN_READ), campaignController.getCampaignById);
router.post('/', authorize(Permission.CAMPAIGN_WRITE), campaignController.createCampaign);
router.patch('/:id', authorize(Permission.CAMPAIGN_WRITE), campaignController.updateCampaign);
router.delete('/:id', authorize(Permission.CAMPAIGN_DELETE), campaignController.deleteCampaign);

export default router;
