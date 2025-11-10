# Onboarding API Contract Tests

## Overview

Comprehensive API contract tests for the 4 canonical onboarding endpoints using Supertest and Vitest. Tests validate request/response schemas with Zod and ensure proper API behavior.

## Canonical Endpoints Tested

### 1. POST /api/v1/onboarding/session
Create new onboarding session

**Tests:**
- ✓ 201 response with valid input
- ✓ Response matches OnboardingSession schema
- ✓ 403 when org not on trial tier
- ✓ 403 when session already exists
- ✓ 401 when not authenticated

### 2. POST /api/v1/onboarding/session/:id/intake
Submit intake step data (called 6 times, once per step)

**Tests:**
- ✓ 200 response for each of 6 steps with valid data
- ✓ Step completion tracked in session
- ✓ 400 with invalid step data (missing required fields)
- ✓ 404 with non-existent session ID
- ✓ Upsert behavior (update existing response)

### 3. POST /api/v1/onboarding/session/:id/process
Trigger AI processing (strategy + planner agents)

**Tests:**
- ✓ 202 response with valid session
- ✓ Returns strategyJobId and plannerJobId
- ✓ 400 when intake not complete
- ✓ 409 when processing already in progress
- ✓ 404 with non-existent session

### 4. GET /api/v1/onboarding/session/:id/result
Get complete onboarding result

**Tests:**
- ✓ 200 response with complete session
- ✓ Response includes session, intakeSummary, strategy, planner
- ✓ 404 with non-existent session
- ✓ Partial data while processing
- ✓ Complete data after processing finishes

## Running Tests

```bash
# Install dependencies (if not already installed)
cd apps/api
pnpm install

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run only onboarding contract tests
pnpm test onboarding.contract.spec.ts

# Run tests in watch mode
pnpm test --watch

# Run tests with UI
pnpm test --ui
```

## Project Structure

```
apps/api/test/
├── onboarding.contract.spec.ts     # Main contract test file
├── helpers/
│   └── test-setup.ts               # Test utilities and factories
└── README.md                       # This file
```

## Test Utilities

### Test Data Factories

```typescript
import { generateIntakeData } from './helpers/test-setup';

// Generate valid intake data for any step
const businessInfo = generateIntakeData('BUSINESS_INFO');
const goals = generateIntakeData('GOALS');
// ... etc
```

### Test Setup/Teardown

```typescript
import {
  createTestOrganization,
  createTestUser,
  createTestSession,
  cleanupTestOrganization,
  cleanupTestSession,
} from './helpers/test-setup';

// Create test fixtures
const org = await createTestOrganization('TRIAL');
const user = await createTestUser(org.id);
const session = await createTestSession(org.id, user.id);

// Clean up after tests
await cleanupTestSession(session.id);
await cleanupTestOrganization(org.id);
```

### Auth Token Generation

```typescript
import { generateTestAuthToken } from './helpers/test-setup';

const token = generateTestAuthToken(userId, organizationId);

// Use in requests
await request(app)
  .get('/api/v1/onboarding/session/:id/result')
  .set('Authorization', `Bearer ${token}`);
```

## Schema Validation

Tests use Zod schemas to validate API responses:

```typescript
import { z } from 'zod';

const OnboardingSessionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: z.enum([...]),
  // ... etc
});

// Validate response
const result = OnboardingSessionSchema.safeParse(response.body);
expect(result.success).toBe(true);
```

## Test Flow Examples

### Complete Onboarding Flow

```typescript
// 1. Create session
POST /api/v1/onboarding/session
→ 201 Created

// 2. Submit intake (6 times)
POST /api/v1/onboarding/session/:id/intake (BUSINESS_INFO)
POST /api/v1/onboarding/session/:id/intake (GOALS)
POST /api/v1/onboarding/session/:id/intake (COMPETITORS)
POST /api/v1/onboarding/session/:id/intake (BRAND_VOICE)
POST /api/v1/onboarding/session/:id/intake (CHANNELS)
POST /api/v1/onboarding/session/:id/intake (REGIONS)
→ All return 200 OK

// 3. Start processing
POST /api/v1/onboarding/session/:id/process
→ 202 Accepted

// 4. Get result
GET /api/v1/onboarding/session/:id/result
→ 200 OK (with full data)
```

## Known Issues and Prerequisites

### Issue 1: Database Setup Required

Tests require a local Supabase instance with proper schema:

```bash
# Start Supabase locally
cd apps/api
supabase start

# Run migrations
supabase db reset

# Generate TypeScript types
pnpm db:types
```

### Issue 2: Controller Implementation

The onboarding controller needs to be fully implemented to match the test expectations. Current implementation may need updates:

**Required in onboardingController:**
- Proper authentication middleware integration
- Validation for all input fields
- Error handling for 400, 403, 404, 409 status codes
- Idempotency checks for duplicate requests

### Issue 3: Missing Database Schema

The following tables/views must exist:
- `organizations` - With subscription_tier column
- `users` - With organization_id foreign key
- `onboarding_sessions` - Main session table
- `intake_responses` - Step-specific data
- `onboarding_agent_results` - AI processing results
- `strategy_plans` - Generated strategies
- `get_intake_summary` - Database function to aggregate intake data
- `complete_onboarding` - Database function to mark completion

### Issue 4: Queue Integration

Tests expect BullMQ queue integration for agent processing:

```typescript
import { enqueueStrategyGeneration, enqueuePlannerTasks } from '../../agents/src/queues/onboarding.queue';
```

This must be implemented for the `/process` endpoint to work correctly.

### Issue 5: Auth Middleware

The `generateTestAuthToken()` helper creates a mock token. For real tests, you need:

**Option A:** Mock the auth middleware in tests:
```typescript
import { authenticate } from '../src/middleware/auth';
vi.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'user-123', organizationId: 'org-123' };
    next();
  },
}));
```

**Option B:** Generate real JWT tokens:
```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId, organizationId },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
```

## Environment Variables

Required environment variables for tests:

```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_test_secret

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=test
PORT=3000
```

## CI/CD Integration

Tests are configured for CI environments:

```yaml
# .github/workflows/test.yml
- name: Run API Contract Tests
  run: |
    cd apps/api
    pnpm install
    pnpm test
  env:
    CI: true
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

## Debugging

### View Test Output

```bash
# Verbose output
pnpm test -- --reporter=verbose

# With stack traces
pnpm test -- --stack-traces
```

### Debug Single Test

```typescript
import { describe, it, expect } from 'vitest';

// Use .only to run single test
it.only('should create session', async () => {
  // ...
});
```

### Database State

```bash
# Check database state during test debugging
supabase db dump --data-only
```

## Performance Considerations

- Tests use real database (Supabase local)
- Each test creates and cleans up its own data
- Tests run in parallel by default (use `--no-threads` to disable)
- Consider using test transactions for faster cleanup

## Next Steps

1. **Implement missing controller methods** - Ensure all endpoints handle edge cases
2. **Add database migrations** - Create schema for onboarding tables
3. **Implement queue workers** - Set up BullMQ for agent processing
4. **Add integration tests** - Test actual agent execution (not just contracts)
5. **Add load tests** - Ensure endpoints can handle concurrent requests
