# Test Installation Guide

## Quick Start

Follow these steps to install dependencies and run the onboarding tests.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Supabase CLI (for API tests)
- Redis (for API tests)

## Installation Steps

### 1. Install Dependencies

```bash
# Install root dependencies
pnpm install

# This will install dependencies for all workspaces including:
# - @playwright/test (dashboard E2E tests)
# - supertest (API contract tests)
# - zod (schema validation)
```

### 2. Install Playwright Browsers (First Time Only)

```bash
cd apps/dashboard
npx playwright install
```

This downloads the browser binaries needed for E2E tests (Chromium, Firefox, WebKit).

### 3. Set Up Database (For API Tests)

```bash
cd apps/api

# Start Supabase locally
supabase start

# Note: You'll need to create the onboarding tables
# See TEST_SUMMARY.md for required schema
```

### 4. Configure Environment Variables

```bash
# Create .env.test file in apps/api/
cp .env.example .env.test

# Required variables:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=your_key
# SUPABASE_SERVICE_ROLE_KEY=your_key
# JWT_SECRET=test_secret
# REDIS_URL=redis://localhost:6379
```

## Running Tests

### E2E Tests (Dashboard)

```bash
cd apps/dashboard

# Run all E2E tests
pnpm test:e2e

# Run with UI (recommended)
pnpm test:e2e:ui

# Run specific test
pnpm test:e2e onboarding.spec.ts
```

### API Contract Tests

```bash
cd apps/api

# Run all tests
pnpm test

# Run only onboarding tests
pnpm test onboarding.contract

# Run with coverage
pnpm test:coverage
```

## Verification

After installation, verify everything works:

```bash
# Check Playwright installation
cd apps/dashboard
npx playwright --version
# Should show: Version 1.40.1

# Check test files exist
ls -la tests/e2e/onboarding.spec.ts
ls -la tests/e2e/page-objects/onboarding.page.ts

# Check API test files exist
cd ../api
ls -la test/onboarding.contract.spec.ts
ls -la test/helpers/test-setup.ts
```

## Troubleshooting

### Playwright Installation Issues

```bash
# If browser download fails, try:
npx playwright install chromium --force

# Or set proxy if behind corporate firewall:
HTTPS_PROXY=http://proxy:port npx playwright install
```

### Supabase Connection Issues

```bash
# Check Supabase status
cd apps/api
supabase status

# Restart if needed
supabase stop
supabase start
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (macOS)
brew services start redis

# Start Redis (Linux)
sudo systemctl start redis
```

### Permission Issues

```bash
# If you get permission errors, try:
sudo chown -R $USER:$USER node_modules
```

## Known Limitations

### E2E Tests
- **Cannot run yet** - Frontend onboarding UI not implemented
- Tests are ready but need the actual React components to exist
- See `apps/dashboard/tests/e2e/README.md` for required data-testid attributes

### API Tests
- **Cannot run yet** - Database schema not created
- Tests are ready but need Supabase migrations
- See `apps/api/test/README.md` for required tables and functions

## Next Steps

Once prerequisites are met:

1. **For E2E tests:**
   - Implement frontend onboarding flow
   - Add data-testid attributes
   - Run `pnpm test:e2e:ui` to debug visually

2. **For API tests:**
   - Create database migrations
   - Implement queue workers
   - Run `pnpm test` to validate

## CI/CD Integration

Tests are configured for CI:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: pnpm install

- name: Install Playwright browsers
  run: cd apps/dashboard && npx playwright install --with-deps

- name: Run E2E tests
  run: cd apps/dashboard && pnpm test:e2e
  env:
    CI: true

- name: Run API tests
  run: cd apps/api && pnpm test
  env:
    CI: true
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Getting Help

- Check README files in test directories
- Review TEST_SUMMARY.md for overview
- Check Playwright docs: https://playwright.dev
- Check Vitest docs: https://vitest.dev
- Check Supertest docs: https://github.com/ladjs/supertest

## Summary

✅ Dependencies configured in package.json files
✅ Test files created and ready to run
⏳ Waiting on frontend implementation (E2E)
⏳ Waiting on database schema (API)

Run `pnpm install` to get started!
