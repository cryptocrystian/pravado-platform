/**
 * Onboarding Page Object
 * Provides a clean interface for interacting with the onboarding flow
 */

import { Page, Locator, expect } from '@playwright/test';
import { IntakeStep } from '@pravado/types';

export class OnboardingPage {
  readonly page: Page;

  // Navigation elements
  readonly progressIndicator: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  // Step-specific sections
  readonly businessInfoSection: Locator;
  readonly goalsSection: Locator;
  readonly competitorsSection: Locator;
  readonly brandVoiceSection: Locator;
  readonly channelsSection: Locator;
  readonly regionsSection: Locator;

  // Processing screen
  readonly processingScreen: Locator;
  readonly processingStatus: Locator;

  // Results screen
  readonly resultsScreen: Locator;
  readonly strategyDisplay: Locator;
  readonly deliverablesDisplay: Locator;
  readonly dashboardButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.progressIndicator = page.locator('[data-testid="progress-indicator"]');
    this.nextButton = page.locator('button', { hasText: /next|continue/i });
    this.backButton = page.locator('button', { hasText: /back|previous/i });
    this.submitButton = page.locator('button', { hasText: /start processing|submit/i });

    // Step sections
    this.businessInfoSection = page.locator('[data-testid="step-business-info"]');
    this.goalsSection = page.locator('[data-testid="step-goals"]');
    this.competitorsSection = page.locator('[data-testid="step-competitors"]');
    this.brandVoiceSection = page.locator('[data-testid="step-brand-voice"]');
    this.channelsSection = page.locator('[data-testid="step-channels"]');
    this.regionsSection = page.locator('[data-testid="step-regions"]');

    // Processing
    this.processingScreen = page.locator('[data-testid="processing-screen"]');
    this.processingStatus = page.locator('[data-testid="processing-status"]');

    // Results
    this.resultsScreen = page.locator('[data-testid="results-screen"]');
    this.strategyDisplay = page.locator('[data-testid="strategy-display"]');
    this.deliverablesDisplay = page.locator('[data-testid="deliverables-display"]');
    this.dashboardButton = page.locator('button', { hasText: /go to dashboard|view dashboard/i });
  }

  async goto() {
    await this.page.goto('/onboarding');
    await this.page.waitForLoadState('networkidle');
  }

  async fillBusinessInfo(data: {
    businessName: string;
    industry: string;
    website: string;
    companySize?: string;
  }) {
    await this.page.fill('input[name="businessName"]', data.businessName);
    await this.page.fill('input[name="industry"]', data.industry);
    await this.page.fill('input[name="website"]', data.website);

    if (data.companySize) {
      await this.page.selectOption('select[name="companySize"]', data.companySize);
    }
  }

  async fillGoals(data: {
    primaryGoals: string[];
    successMetrics: string[];
    timeline?: string;
  }) {
    // Select primary goals (checkboxes)
    for (const goal of data.primaryGoals) {
      await this.page.check(`input[type="checkbox"][value="${goal}"]`);
    }

    // Select success metrics (checkboxes)
    for (const metric of data.successMetrics) {
      await this.page.check(`input[type="checkbox"][value="${metric}"]`);
    }

    if (data.timeline) {
      await this.page.selectOption('select[name="timeline"]', data.timeline);
    }
  }

  async fillCompetitors(data: {
    competitors: Array<{ name: string; website?: string }>;
    uniqueValueProposition: string;
  }) {
    // Fill competitors
    for (let i = 0; i < data.competitors.length; i++) {
      const competitor = data.competitors[i];
      await this.page.fill(`input[name="competitors.${i}.name"]`, competitor.name);

      if (competitor.website) {
        await this.page.fill(`input[name="competitors.${i}.website"]`, competitor.website);
      }

      // Add another competitor if not the last one
      if (i < data.competitors.length - 1) {
        await this.page.click('button:has-text("Add Competitor")');
      }
    }

    // Fill UVP
    await this.page.fill('textarea[name="uniqueValueProposition"]', data.uniqueValueProposition);
  }

  async fillBrandVoice(data: {
    brandTone: string[];
    brandAttributes: string[];
    targetAudienceDescription: string;
  }) {
    // Select brand tone (checkboxes)
    for (const tone of data.brandTone) {
      await this.page.check(`input[type="checkbox"][value="${tone}"]`);
    }

    // Select brand attributes (checkboxes)
    for (const attribute of data.brandAttributes) {
      await this.page.check(`input[type="checkbox"][value="${attribute}"]`);
    }

    // Fill target audience description
    await this.page.fill('textarea[name="targetAudienceDescription"]', data.targetAudienceDescription);
  }

  async fillChannels(data: {
    prPriority: number;
    contentPriority: number;
    seoPriority: number;
    preferredContentTypes: string[];
  }) {
    // Set priority sliders
    await this.page.locator('input[name="prPriority"]').fill(data.prPriority.toString());
    await this.page.locator('input[name="contentPriority"]').fill(data.contentPriority.toString());
    await this.page.locator('input[name="seoPriority"]').fill(data.seoPriority.toString());

    // Select preferred content types
    for (const contentType of data.preferredContentTypes) {
      await this.page.check(`input[type="checkbox"][value="${contentType}"]`);
    }
  }

  async fillRegions(data: {
    primaryRegions: string[];
    languages: string[];
  }) {
    // Select primary regions
    for (const region of data.primaryRegions) {
      await this.page.check(`input[type="checkbox"][value="${region}"]`);
    }

    // Select languages
    for (const language of data.languages) {
      await this.page.check(`input[type="checkbox"][value="${language}"]`);
    }
  }

  async clickNext() {
    await this.nextButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickStartProcessing() {
    await this.submitButton.click();
  }

  async clickGoToDashboard() {
    await this.dashboardButton.click();
  }

  async waitForProcessingToComplete(timeout: number = 120000) {
    // Poll for processing completion
    await this.page.waitForFunction(
      async () => {
        const response = await fetch(window.location.href.replace('/onboarding', '/api/v1/onboarding/session/current/result'));
        const data = await response.json();
        return data.session?.status === 'PLANNER_READY' || data.session?.status === 'COMPLETED';
      },
      { timeout }
    );
  }

  async getErrorMessages(): Promise<string[]> {
    const errorElements = await this.page.locator('[role="alert"], .error-message, [data-testid="error"]').all();
    return Promise.all(errorElements.map(el => el.textContent() || ''));
  }

  async getCurrentStep(): Promise<string> {
    const stepElement = await this.page.locator('[data-testid="current-step"]').textContent();
    return stepElement || '';
  }

  async isOnStep(step: IntakeStep): Promise<boolean> {
    const currentStep = await this.getCurrentStep();
    return currentStep.toUpperCase() === step;
  }

  async getFormFieldValue(fieldName: string): Promise<string> {
    const field = this.page.locator(`[name="${fieldName}"]`);
    const value = await field.inputValue();
    return value;
  }

  async isResultsScreenVisible(): Promise<boolean> {
    return await this.resultsScreen.isVisible();
  }

  async hasStrategy(): Promise<boolean> {
    return await this.strategyDisplay.isVisible();
  }

  async hasDeliverables(): Promise<boolean> {
    return await this.deliverablesDisplay.isVisible();
  }
}
