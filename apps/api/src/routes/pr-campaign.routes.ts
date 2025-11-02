// =====================================================
// PR CAMPAIGN ROUTES
// =====================================================
// Route definitions for PR campaign API endpoints

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/pr-campaign.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// CAMPAIGN ROUTES
// =====================================================

router.post('/campaigns', requireRole('CONTRIBUTOR'), controller.createCampaign);
router.get('/campaigns', controller.listCampaigns);
router.get('/campaigns/:id', controller.getCampaign);
router.put('/campaigns/:id', requireRole('CONTRIBUTOR'), controller.updateCampaign);
router.delete('/campaigns/:id', requireRole('ADMIN'), controller.deleteCampaign);
router.get('/campaigns/:id/stats', controller.getCampaignStats);

// =====================================================
// PRESS RELEASE ROUTES
// =====================================================

router.post('/releases', requireRole('CONTRIBUTOR'), controller.createPressRelease);
router.get('/releases', controller.listPressReleases);
router.get('/releases/:id', controller.getPressRelease);
router.put('/releases/:id', requireRole('CONTRIBUTOR'), controller.updatePressRelease);
router.delete('/releases/:id', requireRole('ADMIN'), controller.deletePressRelease);
router.get('/releases/:id/stats', controller.getPressReleaseStats);

// AI & Targeting
router.post('/releases/:releaseId/pitch/:contactId', requireRole('CONTRIBUTOR'), controller.generatePitch);
router.get('/releases/:releaseId/targets', controller.getRecommendedTargets);

// =====================================================
// INTERACTION ROUTES
// =====================================================

router.post('/interactions', requireRole('CONTRIBUTOR'), controller.createInteraction);
router.put('/interactions/:id', requireRole('CONTRIBUTOR'), controller.updateInteraction);
router.get('/contacts/:contactId/interactions', controller.getContactInteractions);

// =====================================================
// PITCH TEMPLATE ROUTES
// =====================================================

router.post('/templates', requireRole('CONTRIBUTOR'), controller.createPitchTemplate);
router.get('/templates', controller.listPitchTemplates);
router.put('/templates/:id', requireRole('CONTRIBUTOR'), controller.updatePitchTemplate);
router.delete('/templates/:id', requireRole('ADMIN'), controller.deletePitchTemplate);

export default router;
