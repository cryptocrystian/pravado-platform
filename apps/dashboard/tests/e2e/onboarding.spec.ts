/**
 * Onboarding E2E Tests
 * Sprint 76 - Onboarding Consolidation Project
 *
 * Tests the complete onboarding flow with 6 steps:
 * 1. Business Info
 * 2. Goals
 * 3. Competitors
 * 4. Brand Voice
 * 5. Channels
 * 6. Regions
 */

import { test, expect, Page } from '@playwright/test';
import { OnboardingPage } from './page-objects/onboarding.page';

// Test data factory
const createTestData = () => ({
  businessInfo: {
    businessName: 'Acme Corp',
    industry: 'Technology',
    website: 'https://acme.example.com',
    companySize: 'SMALL',
  },
  goals: {
    primaryGoals: ['Brand Awareness', 'Lead Generation'],
    successMetrics: ['Media Mentions', 'Website Traffic'],
    timeline: '6 months',
  },
  competitors: {
    competitors: [
      { name: 'Competitor A', website: 'https://competitor-a.com' },
      { name: 'Competitor B', website: 'https://competitor-b.com' },
    ],
    uniqueValueProposition: 'We deliver faster and more reliable solutions than our competitors.',
  },
  brandVoice: {
    brandTone: ['Professional', 'Innovative'],
    brandAttributes: ['Trustworthy', 'Expert'],
    targetAudienceDescription: 'Tech-savvy professionals aged 30-50 in enterprise companies',
  },
  channels: {
    prPriority: 4,
    contentPriority: 5,
    seoPriority: 3,
    preferredContentTypes: ['Blog Posts', 'Case Studies'],
  },
  regions: {
    primaryRegions: ['North America', 'Europe'],
    languages: ['English'],
  },
});

// Helper to mock API responses
async function mockAPISuccess(page: Page) {
  // Mock session creation
  await page.route('**/api/v1/onboarding/session', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-123',
          organizationId: 'org-123',
          userId: 'user-123',
          status: 'STARTED',
          currentStep: 'BUSINESS_INFO',
          completedSteps: [],
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock intake responses
  await page.route('**/api/v1/onboarding/session/*/intake', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'response-123',
          sessionId: 'test-session-123',
          step: 'BUSINESS_INFO',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock processing start
  await page.route('**/api/v1/onboarding/session/*/process', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          strategyJobId: 'strategy-job-123',
          plannerJobId: 'planner-job-123',
        }),
      });
    }
  });

  // Mock result endpoint - initially processing, then complete
  let callCount = 0;
  await page.route('**/api/v1/onboarding/session/*/result', async (route) => {
    callCount++;
    const status = callCount <= 2 ? 'PROCESSING' : 'PLANNER_READY';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: {
          id: 'test-session-123',
          status,
          completedSteps: ['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS'],
        },
        intakeSummary: {},
        strategy: {
          result: {
            objectives: ['Increase brand awareness', 'Generate qualified leads'],
            keyMessages: ['Innovation leader', 'Trusted partner'],
          },
          plan: {
            id: 'strategy-plan-123',
            name: 'Q1 2025 Strategy',
          },
        },
        planner: {
          result: {
            contentCalendar: {
              items: [
                { id: 'content-1', title: 'Blog Post 1', type: 'blog', channel: 'website' },
                { id: 'content-2', title: 'Case Study 1', type: 'case_study', channel: 'website' },
              ],
            },
          },
          contentIds: ['content-1', 'content-2'],
        },
      }),
    });
  });
}

test.describe('Onboarding Flow - Happy Path', () => {
  test('should complete all 6 steps successfully and show results', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);
    const testData = createTestData();

    // Mock API responses
    await mockAPISuccess(page);

    // Navigate to onboarding
    await onboardingPage.goto();

    // Step 1: Business Info
    await expect(onboardingPage.businessInfoSection).toBeVisible();
    await onboardingPage.fillBusinessInfo(testData.businessInfo);
    await onboardingPage.clickNext();

    // Step 2: Goals
    await expect(onboardingPage.goalsSection).toBeVisible();
    await onboardingPage.fillGoals(testData.goals);
    await onboardingPage.clickNext();

    // Step 3: Competitors
    await expect(onboardingPage.competitorsSection).toBeVisible();
    await onboardingPage.fillCompetitors(testData.competitors);
    await onboardingPage.clickNext();

    // Step 4: Brand Voice
    await expect(onboardingPage.brandVoiceSection).toBeVisible();
    await onboardingPage.fillBrandVoice(testData.brandVoice);
    await onboardingPage.clickNext();

    // Step 5: Channels
    await expect(onboardingPage.channelsSection).toBeVisible();
    await onboardingPage.fillChannels(testData.channels);
    await onboardingPage.clickNext();

    // Step 6: Regions
    await expect(onboardingPage.regionsSection).toBeVisible();
    await onboardingPage.fillRegions(testData.regions);
    await onboardingPage.clickStartProcessing();

    // Processing screen
    await expect(onboardingPage.processingScreen).toBeVisible({ timeout: 5000 });

    // Wait for processing to complete
    await onboardingPage.waitForProcessingToComplete(30000);

    // Results screen
    await expect(onboardingPage.resultsScreen).toBeVisible();
    await expect(onboardingPage.strategyDisplay).toBeVisible();
    await expect(onboardingPage.deliverablesDisplay).toBeVisible();

    // Verify strategy content is displayed
    await expect(page.locator('text=Increase brand awareness')).toBeVisible();
    await expect(page.locator('text=Blog Post 1')).toBeVisible();

    // Go to Dashboard
    await onboardingPage.clickGoToDashboard();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Onboarding Flow - Validation Errors', () => {
  test('should show validation errors for empty Business Info form', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);

    await mockAPISuccess(page);
    await onboardingPage.goto();

    // Try to submit empty form
    await onboardingPage.clickNext();

    // Verify error messages appear
    const errors = await onboardingPage.getErrorMessages();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.toLowerCase().includes('business name'))).toBeTruthy();
    expect(errors.some(e => e.toLowerCase().includes('industry'))).toBeTruthy();

    // Still on step 1
    await expect(onboardingPage.businessInfoSection).toBeVisible();
  });

  test('should allow progress after filling valid data', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);
    const testData = createTestData();

    await mockAPISuccess(page);
    await onboardingPage.goto();

    // Submit empty form - should show errors
    await onboardingPage.clickNext();
    let errors = await onboardingPage.getErrorMessages();
    expect(errors.length).toBeGreaterThan(0);

    // Fill valid data
    await onboardingPage.fillBusinessInfo(testData.businessInfo);

    // Should be able to proceed
    await onboardingPage.clickNext();
    await expect(onboardingPage.goalsSection).toBeVisible();
  });
});

test.describe('Onboarding Flow - Persistence Across Refresh', () => {
  test('should resume from step 3 after page refresh', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);
    const testData = createTestData();

    // Mock API to return session at step 3
    await page.route('**/api/v1/onboarding/session/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-123',
          status: 'STARTED',
          currentStep: 'COMPETITORS',
          completedSteps: ['BUSINESS_INFO', 'GOALS'],
        }),
      });
    });

    await mockAPISuccess(page);

    // Navigate to onboarding
    await onboardingPage.goto();

    // Fill steps 1-2
    await onboardingPage.fillBusinessInfo(testData.businessInfo);
    await onboardingPage.clickNext();
    await onboardingPage.fillGoals(testData.goals);
    await onboardingPage.clickNext();

    // Now at step 3
    await expect(onboardingPage.competitorsSection).toBeVisible();

    // Refresh page
    await page.reload();

    // Should still be at step 3
    await expect(onboardingPage.competitorsSection).toBeVisible();

    // Verify progress is preserved
    const currentStep = await onboardingPage.getCurrentStep();
    expect(currentStep).toContain('COMPETITORS');

    // Should be able to continue
    await onboardingPage.fillCompetitors(testData.competitors);
    await onboardingPage.clickNext();
    await expect(onboardingPage.brandVoiceSection).toBeVisible();
  });
});

test.describe('Onboarding Flow - Back/Next Navigation', () => {
  test('should retain data when navigating back and forth', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);
    const testData = createTestData();

    await mockAPISuccess(page);
    await onboardingPage.goto();

    // Fill step 1
    await onboardingPage.fillBusinessInfo(testData.businessInfo);
    await onboardingPage.clickNext();

    // Go to step 2
    await expect(onboardingPage.goalsSection).toBeVisible();

    // Click back
    await onboardingPage.clickBack();
    await expect(onboardingPage.businessInfoSection).toBeVisible();

    // Verify step 1 data is still filled
    const businessName = await onboardingPage.getFormFieldValue('businessName');
    expect(businessName).toBe(testData.businessInfo.businessName);

    const industry = await onboardingPage.getFormFieldValue('industry');
    expect(industry).toBe(testData.businessInfo.industry);

    // Click next again
    await onboardingPage.clickNext();
    await expect(onboardingPage.goalsSection).toBeVisible();

    // Continue to step 3
    await onboardingPage.fillGoals(testData.goals);
    await onboardingPage.clickNext();
    await expect(onboardingPage.competitorsSection).toBeVisible();
  });
});

test.describe('Onboarding Flow - API Failure Recovery', () => {
  test('should show retry UI on 500 error and recover', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);
    const testData = createTestData();

    // Mock API to fail first, then succeed
    let saveAttempts = 0;
    await page.route('**/api/v1/onboarding/session/*/intake', async (route) => {
      saveAttempts++;

      if (saveAttempts === 1) {
        // First attempt fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        // Subsequent attempts succeed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'response-123',
            sessionId: 'test-session-123',
            step: 'BUSINESS_INFO',
          }),
        });
      }
    });

    await mockAPISuccess(page);
    await onboardingPage.goto();

    // Fill and submit step 1
    await onboardingPage.fillBusinessInfo(testData.businessInfo);
    await onboardingPage.clickNext();

    // Should show error UI
    await expect(page.locator('text=/error|failed|retry/i')).toBeVisible({ timeout: 5000 });

    // Click retry button
    await page.click('button:has-text("Retry")');

    // Should succeed on retry and proceed to step 2
    await expect(onboardingPage.goalsSection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Onboarding Flow - Completion Idempotency', () => {
  test('should prevent duplicate submissions when clicking Go to Dashboard multiple times', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);

    // Track completion API calls
    const completionCalls: string[] = [];

    await page.route('**/api/v1/onboarding/session/*/complete', async (route) => {
      completionCalls.push(new Date().toISOString());

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-session-123',
          status: 'COMPLETED',
        }),
      });
    });

    // Mock result endpoint to show PLANNER_READY
    await page.route('**/api/v1/onboarding/session/*/result', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'test-session-123',
            status: 'PLANNER_READY',
            completedSteps: ['BUSINESS_INFO', 'GOALS', 'COMPETITORS', 'BRAND_VOICE', 'CHANNELS', 'REGIONS'],
          },
          intakeSummary: {},
          strategy: { result: {}, plan: {} },
          planner: { result: {}, contentIds: [] },
        }),
      });
    });

    await mockAPISuccess(page);
    await onboardingPage.goto();

    // Skip to results screen (simulate completed onboarding)
    await page.goto('/onboarding/results?session=test-session-123');
    await expect(onboardingPage.resultsScreen).toBeVisible();

    // Click "Go to Dashboard" multiple times quickly
    await Promise.all([
      onboardingPage.clickGoToDashboard(),
      onboardingPage.clickGoToDashboard(),
      onboardingPage.clickGoToDashboard(),
    ]);

    // Wait a bit to ensure all potential API calls complete
    await page.waitForTimeout(1000);

    // Should only have made 1 completion API call
    expect(completionCalls.length).toBeLessThanOrEqual(1);
  });
});

test.describe('Onboarding Flow - Accessibility', () => {
  test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
    const onboardingPage = new OnboardingPage(page);

    await mockAPISuccess(page);
    await onboardingPage.goto();

    // Check progress indicator has ARIA label
    const progressIndicator = onboardingPage.progressIndicator;
    const ariaLabel = await progressIndicator.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Check form fields have labels
    const businessNameInput = page.locator('input[name="businessName"]');
    const labelFor = await page.locator('label[for*="businessName"]').count();
    expect(labelFor).toBeGreaterThan(0);

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus first input
    const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(firstFocusedElement);
  });
});
