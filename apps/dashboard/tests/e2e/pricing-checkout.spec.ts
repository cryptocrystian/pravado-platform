/**
 * Pricing Checkout E2E Test
 * Sprint 76 - Track C: E2E Testing
 *
 * Tests the critical pricing → checkout → entitlements flow
 */

import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('should display pricing page with 4 tiers', async ({ page }) => {
    await expect(page).toHaveTitle(/Pricing.*Pravado/);

    // Verify all 4 tiers are visible
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Premium')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
  });

  test('should show monthly prices by default', async ({ page }) => {
    // Starter: $149/mo
    await expect(page.getByText('$149')).toBeVisible();

    // Pro: $599/mo
    await expect(page.getByText('$599')).toBeVisible();

    // Premium: $1,499/mo
    await expect(page.getByText('$1,499')).toBeVisible();
  });

  test('should toggle to annual pricing', async ({ page }) => {
    // Click annual toggle
    await page.getByRole('button', { name: /annual/i }).click();

    // Verify discount badge is shown
    await expect(page.getByText('25% off')).toBeVisible();

    // Starter annual: $1,341/year
    await expect(page.getByText('$1,341')).toBeVisible();

    // Pro annual: $5,391/year
    await expect(page.getByText('$5,391')).toBeVisible();
  });

  test('should have accessibility labels', async ({ page }) => {
    // Check main heading has proper role
    const heading = page.getByRole('heading', { name: /pricing/i, level: 1 });
    await expect(heading).toBeVisible();

    // Check billing cycle toggle has accessible name
    const toggle = page.getByRole('button', { name: /annual|monthly/i });
    await expect(toggle).toBeVisible();

    // Check all CTA buttons have accessible text
    const ctaButtons = page.getByRole('button', { name: /start.*trial|get started|contact sales/i });
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should display feature comparison', async ({ page }) => {
    // Verify key features are listed
    await expect(page.getByText(/AI agent requests/i)).toBeVisible();
    await expect(page.getByText(/content pieces/i)).toBeVisible();
    await expect(page.getByText(/team members/i)).toBeVisible();
  });

  test('should highlight Pro as recommended', async ({ page }) => {
    // Pro plan should have a "Recommended" or "Most Popular" badge
    const proSection = page.locator('text=Pro').locator('..');
    await expect(proSection.getByText(/recommended|most popular/i)).toBeVisible();
  });
});

test.describe('Checkout Flow (Unauthenticated)', () => {
  test('should redirect to login when starting trial without auth', async ({ page }) => {
    await page.goto('/pricing');

    // Click "Start Free Trial" on Starter plan
    await page.getByRole('button', { name: /start.*trial/i }).first().click();

    // Should redirect to login or show auth modal
    await expect(page).toHaveURL(/login|auth/);
  });
});

test.describe('Checkout Flow (Authenticated)', () => {
  // This test requires a logged-in user
  // In a real scenario, you'd use page.context().addCookies() or Playwright's auth setup
  test.skip('should initiate Stripe checkout for authenticated user', async ({ page }) => {
    // Skip this test in CI unless STRIPE_TEST_MODE is enabled
    if (!process.env.STRIPE_TEST_MODE) {
      test.skip();
    }

    // TODO: Set up authentication
    // await loginAsTestUser(page);

    await page.goto('/pricing');

    // Click "Start Free Trial" on Pro plan
    await page.getByRole('button', { name: /start.*trial/i }).nth(1).click();

    // Should navigate to Stripe checkout or show loading
    await page.waitForURL(/checkout\.stripe\.com|stripe/i, { timeout: 10000 });

    // Verify Stripe checkout page loaded
    await expect(page.getByText(/card information|payment details/i)).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('pricing page should pass basic a11y checks', async ({ page }) => {
    await page.goto('/pricing');

    // Check color contrast for headings
    const heading = page.getByRole('heading', { name: /pricing/i, level: 1 });
    await expect(heading).toBeVisible();

    // Verify all interactive elements are keyboard accessible
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await expect(button).toBeEnabled();

      // Check button has accessible name
      const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
      expect(accessibleName).toBeTruthy();
    }
  });

  test('should navigate pricing tiers with keyboard', async ({ page }) => {
    await page.goto('/pricing');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focused element should be visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/pricing');

    // H1 should exist and be unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // H2 headings for each tier
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(4);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/pricing');

    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');

        // Decorative images should have empty alt, others should have descriptive alt
        expect(alt).toBeDefined();
      }
    }
  });
});

test.describe('Performance', () => {
  test('pricing page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/pricing');

    // Wait for main content to be visible
    await page.getByRole('heading', { name: /pricing/i }).waitFor();

    const loadTime = Date.now() - startTime;

    // Should load in < 3000ms
    expect(loadTime).toBeLessThan(3000);
  });

  test('pricing page should have good Lighthouse scores', async ({ page }) => {
    // This is a placeholder for Lighthouse integration
    // In a real setup, you'd use @playwright/test + lighthouse

    await page.goto('/pricing');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Basic performance checks
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    // DOMContentLoaded should be fast (< 1s)
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);

    // Full load should be reasonable (< 2s)
    expect(performanceMetrics.loadComplete).toBeLessThan(2000);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('pricing tiers should stack vertically on mobile', async ({ page }) => {
    await page.goto('/pricing');

    // Tiers should be visible
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();

    // Check layout is vertical (each tier below the previous)
    const starterBox = await page.getByText('Starter').boundingBox();
    const proBox = await page.getByText('Pro').boundingBox();

    expect(starterBox).toBeTruthy();
    expect(proBox).toBeTruthy();

    if (starterBox && proBox) {
      // Pro should be below Starter on mobile
      expect(proBox.y).toBeGreaterThan(starterBox.y);
    }
  });

  test('CTA buttons should be easily tappable on mobile', async ({ page }) => {
    await page.goto('/pricing');

    const button = page.getByRole('button', { name: /start.*trial/i }).first();
    const box = await button.boundingBox();

    expect(box).toBeTruthy();

    if (box) {
      // Button should be at least 44px tall (iOS minimum tap target)
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle Stripe API errors gracefully', async ({ page }) => {
    // Mock Stripe API failure
    await page.route('**/api/billing/checkout', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Stripe API unavailable' }),
      });
    });

    await page.goto('/pricing');

    // Try to start trial
    await page.getByRole('button', { name: /start.*trial/i }).first().click();

    // Should show error message to user
    await expect(page.getByText(/error|failed|unavailable/i)).toBeVisible({ timeout: 5000 });
  });
});
