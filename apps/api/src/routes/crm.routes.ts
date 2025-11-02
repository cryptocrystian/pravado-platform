import { Router } from 'express';
import { crmController } from '../controllers/crm.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All CRM routes require authentication
router.use(authenticate);

// =====================================================
// INTERACTION ROUTES
// =====================================================

router.post('/interactions', crmController.logInteraction);
router.get('/interactions/:contactId', crmController.getContactInteractions);
router.get('/interactions/:id/detail', crmController.getInteraction);
router.patch('/interactions/:id', crmController.updateInteraction);
router.delete('/interactions/:id', crmController.deleteInteraction);
router.get('/interactions/:contactId/summary', crmController.getInteractionSummary);

// =====================================================
// RELATIONSHIP ROUTES
// =====================================================

router.post('/relationships', crmController.createRelationship);
router.get('/relationships', crmController.getUserRelationships);
router.get('/relationships/strengths', crmController.getRelationshipStrengths);
router.get('/relationships/:contactId', crmController.getRelationship);
router.patch('/relationships/:contactId', crmController.updateRelationship);

// =====================================================
// FOLLOW-UP ROUTES
// =====================================================

router.post('/follow-ups', crmController.scheduleFollowUp);
router.get('/follow-ups', crmController.getUserFollowUps);
router.get('/follow-ups/pending', crmController.getPendingFollowUps);
router.get('/follow-ups/overdue', crmController.getOverdueFollowUps);
router.get('/follow-ups/:id', crmController.getFollowUp);
router.patch('/follow-ups/:id', crmController.updateFollowUp);
router.post('/follow-ups/:id/complete', crmController.completeFollowUp);
router.delete('/follow-ups/:id', crmController.deleteFollowUp);

// =====================================================
// ACTIVITY & STATS ROUTES
// =====================================================

router.get('/activity/recent', crmController.getRecentActivity);
router.get('/stats', crmController.getUserCRMStats);

export default router;
