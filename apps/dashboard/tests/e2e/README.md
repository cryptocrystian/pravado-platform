# Onboarding E2E Tests

## Overview

Comprehensive Playwright E2E tests for the onboarding consolidation project. Tests cover all 6 intake steps and critical user flows.

## Test Scenarios

### 1. Happy Path
Complete all 6 steps successfully:
- Navigate to /onboarding
- Fill Business Info, Goals, Competitors, Brand Voice, Channels, Regions
- Click "Start Processing"
- Wait for processing to complete (poll until PLANNER_READY)
- Verify results screen shows strategy and deliverables
- Click "Go to Dashboard"

### 2. Validation Errors
Invalid data prevents progress:
- Submit empty Business Info form
- Verify error messages appear
- Fill valid data
- Verify can proceed to next step

### 3. Persistence Across Refresh
Resume from step 3:
- Fill steps 1-2
- Refresh page at step 3
- Verify still on step 3 with progress preserved
- Continue to completion

### 4. Back/Next Navigation
Data retention when navigating:
- Fill step 1, go to step 2
- Click Back
- Verify step 1 data is still filled
- Click Next
- Verify can continue

### 5. API Failure Recovery
Show retry UI on 500 error:
- Mock API to return 500 on first save attempt
- Verify error UI shows
- Mock API to succeed on retry
- Verify can complete successfully

### 6. Completion Idempotency
No duplicate submissions:
- Complete all steps
- Click "Go to Dashboard" multiple times quickly
- Verify only 1 completion API call made

## Running Tests

```bash
# Install dependencies (if not already installed)
cd apps/dashboard
pnpm install

# Run all tests
pnpm test:e2e

# Run tests with UI (recommended for debugging)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run specific test file
pnpm test:e2e onboarding.spec.ts

# Run tests in CI mode
CI=1 pnpm test:e2e
```

## Project Structure

```
apps/dashboard/tests/e2e/
├── onboarding.spec.ts              # Main test file with 6 scenarios
├── page-objects/
│   └── onboarding.page.ts          # Page object for onboarding flow
└── README.md                       # This file
```

## Page Object Pattern

Tests use the Page Object pattern for maintainability:

```typescript
import { OnboardingPage } from './page-objects/onboarding.page';

test('example', async ({ page }) => {
  const onboardingPage = new OnboardingPage(page);

  await onboardingPage.goto();
  await onboardingPage.fillBusinessInfo({...});
  await onboardingPage.clickNext();
  // ... etc
});
```

## Test Data

Test data is generated using a factory pattern:

```typescript
const testData = createTestData();
// Returns valid data for all 6 steps
```

## API Mocking

Tests mock API responses for predictable behavior:

```typescript
await mockAPISuccess(page);
// Mocks all onboarding endpoints to return success responses
```

## Configuration

Tests are configured in `playwright.config.ts`:
- Timeout: 30 seconds per test
- Retries: 2 on CI, 0 locally
- Browsers: Chromium, Firefox, WebKit
- Screenshots: On failure
- Videos: Retained on failure

## Known Issues

### Issue 1: Frontend Implementation Required
The actual frontend onboarding UI needs to be implemented with proper data-testid attributes for test selectors to work.

Required data-testid attributes:
- `progress-indicator` - Step progress indicator
- `step-business-info` - Business info step container
- `step-goals` - Goals step container
- `step-competitors` - Competitors step container
- `step-brand-voice` - Brand voice step container
- `step-channels` - Channels step container
- `step-regions` - Regions step container
- `processing-screen` - Processing/loading screen
- `processing-status` - Status text during processing
- `results-screen` - Final results screen
- `strategy-display` - Strategy content display
- `deliverables-display` - Deliverables content display
- `current-step` - Current step indicator

### Issue 2: Form Field Names
Tests assume specific form field names (e.g., `businessName`, `industry`, `website`). These need to match the actual implementation.

### Issue 3: API Endpoint Mocking
Tests mock API responses. For integration testing with real backend, remove mocks and ensure:
- Backend is running on localhost:3000 (or configure BASE_URL)
- Test user has proper authentication
- Database has test data seeded

## Debugging

### View Test Report
After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Debug Single Test
```bash
npx playwright test --debug onboarding.spec.ts -g "Happy Path"
```

### View Traces
Traces are captured on first retry. View with:
```bash
npx playwright show-trace test-results/path-to-trace.zip
```

## Accessibility Testing

Tests include basic accessibility checks:
- ARIA labels on interactive elements
- Proper keyboard navigation
- Form field labels

For comprehensive accessibility testing, consider adding:
- @axe-core/playwright for automated a11y checks
- Color contrast validation
- Screen reader compatibility tests
