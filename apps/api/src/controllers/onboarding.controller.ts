// =====================================================
// ONBOARDING CONTROLLER
// =====================================================
// HTTP request handlers for onboarding endpoints

import type { Request, Response, NextFunction } from 'express';
import { onboardingService } from '../services/onboarding.service';
import { logger } from '../lib/logger';
import {
  enqueueStrategyGeneration,
  enqueuePlannerTasks,
} from '../../agents/src/queues/onboarding.queue';
import {
  CreateOnboardingSessionInputSchema,
  CreateIntakeResponseInputSchema,
  IntakeStepSchema,
} from '@pravado/shared-types';

class OnboardingController {
  /**
   * POST /api/onboarding/sessions
   * Create a new onboarding session
   */
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const canStart = await onboardingService.canStartOnboarding(organizationId);
      if (!canStart) {
        return res.status(403).json({
          error:
            'Cannot start onboarding. Organization must be on trial tier and have no existing session.',
        });
      }

      const session = await onboardingService.createSession({
        organizationId,
        userId,
      });

      logger.info(`Onboarding session created: ${session.id}`);

      res.status(201).json(session);
    } catch (error) {
      logger.error('Failed to create onboarding session', error);
      next(error);
    }
  }

  /**
   * GET /api/onboarding/sessions/current
   * Get the current organization's onboarding session
   */
  async getCurrentSession(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const session = await onboardingService.getSessionByOrganization(organizationId);

      if (!session) {
        return res.status(404).json({ error: 'No onboarding session found' });
      }

      res.json(session);
    } catch (error) {
      logger.error('Failed to fetch current onboarding session', error);
      next(error);
    }
  }

  /**
   * GET /api/onboarding/sessions/:id
   * Get onboarding session by ID
   */
  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const session = await onboardingService.getSession(id);

      res.json(session);
    } catch (error) {
      logger.error('Failed to fetch onboarding session', error);
      next(error);
    }
  }

  /**
   * POST /api/onboarding/sessions/:id/intake
   * Save intake response for a step
   */
  async saveIntakeResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sessionId } = req.params;
      const { step, data } = req.body;

      // Validate step
      const validatedStep = IntakeStepSchema.parse(step);

      const response = await onboardingService.saveIntakeResponse({
        sessionId,
        step: validatedStep,
        data,
      });

      // Mark step as completed
      await onboardingService.completeStep(sessionId, validatedStep);

      res.json(response);
    } catch (error) {
      logger.error('Failed to save intake response', error);
      next(error);
    }
  }

  /**
   * GET /api/onboarding/sessions/:id/intake
   * Get all intake responses for a session
   */
  async getIntakeResponses(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const responses = await onboardingService.getIntakeResponses(id);

      res.json(responses);
    } catch (error) {
      logger.error('Failed to fetch intake responses', error);
      next(error);
    }
  }

  /**
   * GET /api/onboarding/sessions/:id/summary
   * Get aggregated intake summary
   */
  async getIntakeSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const summary = await onboardingService.getIntakeSummary(id);

      res.json(summary);
    } catch (error) {
      logger.error('Failed to fetch intake summary', error);
      next(error);
    }
  }

  /**
   * POST /api/onboarding/sessions/:id/start-processing
   * Start AI processing (trigger strategy agent)
   */
  async startProcessing(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sessionId } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const session = await onboardingService.getSession(sessionId);

      if (session.status !== 'INTAKE_COMPLETE') {
        return res.status(400).json({
          error: 'Cannot start processing. Intake must be complete first.',
        });
      }

      // Get intake summary
      const intakeSummary = await onboardingService.getIntakeSummary(sessionId);

      // Enqueue strategy generation job
      const jobId = await enqueueStrategyGeneration({
        sessionId,
        organizationId,
        userId,
        intakeSummary,
      });

      // Update session with task ID
      await onboardingService.updateSession(sessionId, {
        strategyTaskId: jobId,
        status: 'PROCESSING',
      });

      logger.info(`Started processing for session ${sessionId}, job ${jobId}`);

      res.json({
        message: 'Processing started',
        jobId,
      });
    } catch (error) {
      logger.error('Failed to start processing', error);
      next(error);
    }
  }

  /**
   * POST /api/onboarding/sessions/:id/start-planner
   * Start planner tasks (trigger planner agent)
   */
  async startPlanner(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sessionId } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const session = await onboardingService.getSession(sessionId);

      if (session.status !== 'STRATEGY_READY') {
        return res.status(400).json({
          error: 'Cannot start planner. Strategy must be generated first.',
        });
      }

      if (!session.strategy_plan_id) {
        return res.status(400).json({
          error: 'Strategy plan ID not found',
        });
      }

      // Get intake summary
      const intakeSummary = await onboardingService.getIntakeSummary(sessionId);

      // Enqueue planner tasks job
      const jobId = await enqueuePlannerTasks({
        sessionId,
        organizationId,
        userId,
        strategyPlanId: session.strategy_plan_id,
        intakeSummary,
      });

      // Update session with task ID
      await onboardingService.updateSession(sessionId, {
        plannerTaskId: jobId,
      });

      logger.info(`Started planner for session ${sessionId}, job ${jobId}`);

      res.json({
        message: 'Planner started',
        jobId,
      });
    } catch (error) {
      logger.error('Failed to start planner', error);
      next(error);
    }
  }

  /**
   * GET /api/onboarding/sessions/:id/result
   * Get complete onboarding result
   */
  async getResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await onboardingService.getOnboardingResult(id);

      res.json(result);
    } catch (error) {
      logger.error('Failed to fetch onboarding result', error);
      next(error);
    }
  }

  /**
   * POST /api/onboarding/sessions/:id/complete
   * Mark onboarding as complete
   */
  async completeOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const session = await onboardingService.completeOnboarding(id);

      logger.info(`Onboarding completed for session ${id}`);

      res.json(session);
    } catch (error) {
      logger.error('Failed to complete onboarding', error);
      next(error);
    }
  }
}

export const onboardingController = new OnboardingController();
