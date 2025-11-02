import { Router } from 'express';
import { reputationController } from '../controllers/reputation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All reputation routes require authentication
router.use(authenticate);

// =====================================================
// MEDIA MENTIONS ROUTES
// =====================================================

router.get('/mentions', reputationController.listMentions);
router.get('/mentions/:id', reputationController.getMention);
router.get('/mentions/:id/similar', reputationController.findSimilarMentions);
router.post('/mentions/feedback', reputationController.submitFeedback);

// =====================================================
// TRENDS & ANALYTICS ROUTES
// =====================================================

router.get('/trends', reputationController.getMentionTrends);
router.get('/stats', reputationController.getMonitoringStats);

// =====================================================
// MONITORING RULES ROUTES
// =====================================================

router.get('/rules', reputationController.listRules);
router.post('/rules', reputationController.createRule);
router.patch('/rules/:id', reputationController.updateRule);
router.delete('/rules/:id', reputationController.deleteRule);

// =====================================================
// ALERTS ROUTES
// =====================================================

router.get('/alerts', reputationController.listAlerts);
router.post('/alerts/:id/view', reputationController.markAlertAsViewed);

// =====================================================
// SNAPSHOTS ROUTES
// =====================================================

router.get('/snapshots', reputationController.getSnapshots);

export default router;
