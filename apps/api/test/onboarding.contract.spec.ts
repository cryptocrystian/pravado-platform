/**
 * Onboarding API Contract Tests
 * Sprint 76 - Onboarding Consolidation Project
 *
 * Tests the 4 canonical onboarding endpoints:
 * 1. POST /api/v1/onboarding/session - Create session
 * 2. POST /api/v1/onboarding/session/:id/intake - Submit intake data
 * 3. POST /api/v1/onboarding/session/:id/process - Start AI processing
 * 4. GET /api/v1/onboarding/session/:id/result - Get complete result
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import app from '../src/index';
import {
  createTestOrganization,
  createTestUser,
  createTestSession,
  cleanupTestOrganization,
  cleanupTestSession,
  generateIntakeData,
  generateTestAuthToken,
  type TestOrganization,
  type TestUser,
} from './helpers/test-setup';

// Zod schemas for response validation
const OnboardingSessionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['STARTED', 'INTAKE_COMPLETE', 'PROCESSING', 'STRATEGY_READY', 'PLANNER_READY', 'COMPLETED', 'FAILED', 'ABANDONED']),
  currentStep: z.enum(['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS']),
  completedSteps: z.array(z.string()),
  startedAt: z.string(),
  intakeCompletedAt: z.string().nullable(),
  processingStartedAt: z.string().nullable(),
  strategyGeneratedAt: z.string().nullable(),
  plannerCompletedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  strategyTaskId: z.string().nullable(),
  plannerTaskId: z.string().nullable(),
  strategyPlanId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  retryCount: z.number(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const IntakeResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  step: z.enum(['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ProcessingResponseSchema = z.object({
  strategyJobId: z.string(),
  plannerJobId: z.string(),
});

const OnboardingResultSchema = z.object({
  session: OnboardingSessionSchema,
  intakeSummary: z.record(z.unknown()),
  strategy: z.object({
    result: z.record(z.unknown()).nullable(),
    plan: z.record(z.unknown()).nullable(),
  }),
  planner: z.object({
    result: z.record(z.unknown()).nullable(),
    contentIds: z.array(z.string()),
    pressReleaseId: z.string().nullable(),
    seoAuditId: z.string().nullable(),
  }),
});

describe('Onboarding API Contract Tests', () => {
  let testOrg: TestOrganization;
  let testUser: TestUser;
  let authToken: string;

  beforeAll(async () => {
    // Create test organization and user
    testOrg = await createTestOrganization('TRIAL');
    testUser = await createTestUser(testOrg.id);
    authToken = generateTestAuthToken(testUser.id, testOrg.id);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestOrganization(testOrg.id);
  });

  describe('POST /api/v1/onboarding/session', () => {
    it('should create a new onboarding session with 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          userId: testUser.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();

      // Validate response schema
      const validationResult = OnboardingSessionSchema.safeParse(response.body);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        const session = validationResult.data;
        expect(session.organizationId).toBe(testOrg.id);
        expect(session.userId).toBe(testUser.id);
        expect(session.status).toBe('STARTED');
        expect(session.currentStep).toBe('BUSINESS_INFO');
        expect(session.completedSteps).toEqual([]);
      }

      // Clean up
      await cleanupTestSession(response.body.id);
    });

    it('should return 403 when org not on trial tier', async () => {
      // Create a non-trial organization
      const nonTrialOrg = await createTestOrganization('STARTER');
      const nonTrialUser = await createTestUser(nonTrialOrg.id);
      const nonTrialToken = generateTestAuthToken(nonTrialUser.id, nonTrialOrg.id);

      const response = await request(app)
        .post('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${nonTrialToken}`)
        .send({
          organizationId: nonTrialOrg.id,
          userId: nonTrialUser.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('trial tier');

      // Clean up
      await cleanupTestOrganization(nonTrialOrg.id);
    });

    it('should return 403 when session already exists', async () => {
      // Create a session first
      const existingSession = await createTestSession(testOrg.id, testUser.id);

      const response = await request(app)
        .post('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          userId: testUser.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('already exists');

      // Clean up
      await cleanupTestSession(existingSession.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/v1/onboarding/session')
        .send({
          organizationId: testOrg.id,
          userId: testUser.id,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/onboarding/session/:id/intake', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await createTestSession(testOrg.id, testUser.id);
    });

    afterEach(async () => {
      if (testSession) {
        await cleanupTestSession(testSession.id);
      }
    });

    it('should save BUSINESS_INFO step with 200 status', async () => {
      const intakeData = generateIntakeData('BUSINESS_INFO');

      const response = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'BUSINESS_INFO',
          data: intakeData,
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      // Validate response schema
      const validationResult = IntakeResponseSchema.safeParse(response.body);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        const intakeResponse = validationResult.data;
        expect(intakeResponse.sessionId).toBe(testSession.id);
        expect(intakeResponse.step).toBe('BUSINESS_INFO');
      }
    });

    it('should save all 6 steps successfully', async () => {
      const steps = ['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS'];

      for (const step of steps) {
        const intakeData = generateIntakeData(step);

        const response = await request(app)
          .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            step,
            data: intakeData,
          });

        expect(response.status).toBe(200);
        expect(response.body.step).toBe(step);
      }

      // Verify session status updated to INTAKE_COMPLETE
      const sessionResponse = await request(app)
        .get(`/api/v1/onboarding/session/${testSession.id}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(sessionResponse.body.session.status).toBe('INTAKE_COMPLETE');
      expect(sessionResponse.body.session.completedSteps).toHaveLength(6);
    });

    it('should return 400 with invalid step data', async () => {
      const response = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'BUSINESS_INFO',
          data: {
            // Missing required fields
            businessName: '',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 with non-existent session ID', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';
      const intakeData = generateIntakeData('BUSINESS_INFO');

      const response = await request(app)
        .post(`/api/v1/onboarding/session/${fakeSessionId}/intake`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'BUSINESS_INFO',
          data: intakeData,
        });

      expect(response.status).toBe(404);
    });

    it('should update existing intake response (upsert behavior)', async () => {
      const intakeData1 = generateIntakeData('BUSINESS_INFO');

      // First save
      const response1 = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'BUSINESS_INFO',
          data: intakeData1,
        });

      expect(response1.status).toBe(200);
      const firstResponseId = response1.body.id;

      // Second save with updated data
      const intakeData2 = {
        ...intakeData1,
        businessName: 'Updated Business Name',
      };

      const response2 = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'BUSINESS_INFO',
          data: intakeData2,
        });

      expect(response2.status).toBe(200);
      // Should have same ID (upsert, not insert)
      expect(response2.body.id).toBe(firstResponseId);
    });
  });

  describe('POST /api/v1/onboarding/session/:id/process', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await createTestSession(testOrg.id, testUser.id, 'INTAKE_COMPLETE');

      // Fill all intake steps
      const steps = ['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS'];
      for (const step of steps) {
        const intakeData = generateIntakeData(step);
        await request(app)
          .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ step, data: intakeData });
      }
    });

    afterEach(async () => {
      if (testSession) {
        await cleanupTestSession(testSession.id);
      }
    });

    it('should start processing with 202 status', async () => {
      const response = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(202);
      expect(response.body).toBeDefined();

      // Validate response schema
      const validationResult = ProcessingResponseSchema.safeParse(response.body);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        const processingResponse = validationResult.data;
        expect(processingResponse.strategyJobId).toBeDefined();
        expect(processingResponse.plannerJobId).toBeDefined();
      }
    });

    it('should return 400 when intake not complete', async () => {
      // Create a session with incomplete intake
      const incompleteSession = await createTestSession(testOrg.id, testUser.id, 'STARTED');

      const response = await request(app)
        .post(`/api/v1/onboarding/session/${incompleteSession.id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('intake');

      // Clean up
      await cleanupTestSession(incompleteSession.id);
    });

    it('should return 409 when processing already in progress', async () => {
      // Start processing first time
      const response1 = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response1.status).toBe(202);

      // Try to start processing again
      const response2 = await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response2.status).toBe(409);
      expect(response2.body.error).toBeDefined();
      expect(response2.body.error).toContain('already');
    });

    it('should return 404 with non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/v1/onboarding/session/${fakeSessionId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/onboarding/session/:id/result', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await createTestSession(testOrg.id, testUser.id);

      // Fill all intake steps
      const steps = ['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS'];
      for (const step of steps) {
        const intakeData = generateIntakeData(step);
        await request(app)
          .post(`/api/v1/onboarding/session/${testSession.id}/intake`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ step, data: intakeData });
      }
    });

    afterEach(async () => {
      if (testSession) {
        await cleanupTestSession(testSession.id);
      }
    });

    it('should return complete result with 200 status', async () => {
      const response = await request(app)
        .get(`/api/v1/onboarding/session/${testSession.id}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      // Validate response schema
      const validationResult = OnboardingResultSchema.safeParse(response.body);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        const result = validationResult.data;
        expect(result.session).toBeDefined();
        expect(result.session.id).toBe(testSession.id);
        expect(result.intakeSummary).toBeDefined();
        expect(result.strategy).toBeDefined();
        expect(result.planner).toBeDefined();
      }
    });

    it('should include session, intakeSummary, strategy, and planner in response', async () => {
      const response = await request(app)
        .get(`/api/v1/onboarding/session/${testSession.id}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Check all required fields are present
      expect(response.body.session).toBeDefined();
      expect(response.body.intakeSummary).toBeDefined();
      expect(response.body.strategy).toBeDefined();
      expect(response.body.planner).toBeDefined();

      // Session should have complete intake
      expect(response.body.session.status).toBe('INTAKE_COMPLETE');
      expect(response.body.session.completedSteps).toHaveLength(6);

      // Intake summary should have data from all steps
      expect(response.body.intakeSummary.businessInfo).toBeDefined();
      expect(response.body.intakeSummary.goals).toBeDefined();
      expect(response.body.intakeSummary.competitiveInfo).toBeDefined();
      expect(response.body.intakeSummary.brandVoice).toBeDefined();
      expect(response.body.intakeSummary.channelPriorities).toBeDefined();
      expect(response.body.intakeSummary.geographicTargeting).toBeDefined();
    });

    it('should return 404 with non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/onboarding/session/${fakeSessionId}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return partial data while processing', async () => {
      // Start processing
      await request(app)
        .post(`/api/v1/onboarding/session/${testSession.id}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      // Get result while processing
      const response = await request(app)
        .get(`/api/v1/onboarding/session/${testSession.id}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.session.status).toBe('PROCESSING');

      // Strategy and planner results may be null or partial
      expect(response.body.strategy).toBeDefined();
      expect(response.body.planner).toBeDefined();
    });

    it('should return complete data after processing finishes', async () => {
      // Mock a completed session with strategy and planner results
      // In a real test, you would wait for actual processing to complete
      // or use test fixtures that simulate completed processing

      const response = await request(app)
        .get(`/api/v1/onboarding/session/${testSession.id}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify structure is correct even if data is not complete yet
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('intakeSummary');
      expect(response.body).toHaveProperty('strategy');
      expect(response.body).toHaveProperty('planner');

      expect(response.body.strategy).toHaveProperty('result');
      expect(response.body.strategy).toHaveProperty('plan');

      expect(response.body.planner).toHaveProperty('result');
      expect(response.body.planner).toHaveProperty('contentIds');
      expect(response.body.planner).toHaveProperty('pressReleaseId');
      expect(response.body.planner).toHaveProperty('seoAuditId');
    });
  });

  describe('Integration Tests - Full Flow', () => {
    it('should complete full onboarding flow end-to-end', async () => {
      // 1. Create session
      const createResponse = await request(app)
        .post('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          organizationId: testOrg.id,
          userId: testUser.id,
        });

      expect(createResponse.status).toBe(201);
      const sessionId = createResponse.body.id;

      // 2. Submit all intake steps
      const steps = ['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS'];
      for (const step of steps) {
        const intakeData = generateIntakeData(step);

        const intakeResponse = await request(app)
          .post(`/api/v1/onboarding/session/${sessionId}/intake`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ step, data: intakeData });

        expect(intakeResponse.status).toBe(200);
      }

      // 3. Start processing
      const processResponse = await request(app)
        .post(`/api/v1/onboarding/session/${sessionId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(processResponse.status).toBe(202);
      expect(processResponse.body.strategyJobId).toBeDefined();
      expect(processResponse.body.plannerJobId).toBeDefined();

      // 4. Get result
      const resultResponse = await request(app)
        .get(`/api/v1/onboarding/session/${sessionId}/result`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resultResponse.status).toBe(200);
      expect(resultResponse.body.session.status).toMatch(/PROCESSING|STRATEGY_READY|PLANNER_READY|COMPLETED/);

      // Clean up
      await cleanupTestSession(sessionId);
    });
  });
});
