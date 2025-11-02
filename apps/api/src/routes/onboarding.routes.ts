import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

// Session management
router.post('/sessions', onboardingController.createSession);
router.get('/sessions/current', onboardingController.getCurrentSession);
router.get('/sessions/:id', onboardingController.getSession);

// Intake responses
router.post('/sessions/:id/intake', onboardingController.saveIntakeResponse);
router.get('/sessions/:id/intake', onboardingController.getIntakeResponses);
router.get('/sessions/:id/summary', onboardingController.getIntakeSummary);

// AI processing
router.post('/sessions/:id/start-processing', onboardingController.startProcessing);
router.post('/sessions/:id/start-planner', onboardingController.startPlanner);

// Results
router.get('/sessions/:id/result', onboardingController.getResult);
router.post('/sessions/:id/complete', onboardingController.completeOnboarding);

export default router;
