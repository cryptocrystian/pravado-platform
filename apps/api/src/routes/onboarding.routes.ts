// =====================================================
// CANONICAL ONBOARDING ROUTES (V2)
// =====================================================
// 4 endpoints total - consolidated from 11 legacy endpoints

import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

// =====================================================
// CANONICAL API (4 ENDPOINTS)
// =====================================================

/**
 * 1. POST /api/v1/onboarding/session
 * Create new onboarding session
 * Rate limit: 5 req/hour per organization
 */
router.post('/session', onboardingController.createSession);

/**
 * 2. POST /api/v1/onboarding/session/:id/intake
 * Submit intake step data (called 6 times, once per step)
 * Rate limit: 60 req/hour per session
 */
router.post('/session/:id/intake', onboardingController.saveIntakeResponse);

/**
 * 3. POST /api/v1/onboarding/session/:id/process
 * Trigger AI processing (strategy + planner agents)
 * Rate limit: 3 req/hour per session
 */
router.post('/session/:id/process', onboardingController.startProcessing);

/**
 * 4. GET /api/v1/onboarding/session/:id/result
 * Get complete onboarding result (session + intake + AI outputs)
 * Rate limit: 100 req/hour per session
 */
router.get('/session/:id/result', onboardingController.getResult);

// =====================================================
// DEPRECATED ENDPOINTS (30-day sunset)
// Remove after 2025-12-07
// =====================================================

// @deprecated Use session ID from creation response instead
// router.get('/sessions/current', onboardingController.getCurrentSession);

// @deprecated Merged into /session/:id/result
// router.get('/sessions/:id', onboardingController.getSession);

// @deprecated Merged into /session/:id/result
// router.get('/sessions/:id/intake', onboardingController.getIntakeResponses);

// @deprecated Merged into /session/:id/result
// router.get('/sessions/:id/summary', onboardingController.getIntakeSummary);

// @deprecated Auto-triggered by /session/:id/process
// router.post('/sessions/:id/start-planner', onboardingController.startPlanner);

// @deprecated Status auto-updates, no manual completion needed
// router.post('/sessions/:id/complete', onboardingController.completeOnboarding);

export default router;
