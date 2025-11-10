# Sprint 37: Memory Lifecycle Sanity Check

This document provides step-by-step instructions to verify that Sprint 37 (Autonomous Memory Pruning) is properly implemented and functional.

## 📋 Pre-Check Status

### ✅ Files Created & Committed

All Sprint 37 files have been created and pushed to the repository:

1. **Backend API Routes** ✅
   - `apps/api/src/routes/agent-memory-lifecycle.routes.ts` (11 endpoints)
   - Registered in `apps/api/src/routes/index.ts` at `/agent-memory-lifecycle`

2. **Frontend Hooks** ✅
   - `apps/dashboard/src/hooks/useMemoryLifecycle.ts` (25 hooks total)

3. **Database Migration** ✅
   - `apps/api/supabase/migrations/20250102000037_memory_lifecycle.sql` (17KB)
   - Adds lifecycle columns to `agent_memory_episodes` and `agent_memory_chunks`
   - Creates `agent_memory_lifecycle_events` table
   - Implements 10+ PostgreSQL functions

4. **Backend Engine** ✅
   - `apps/agents/src/memory/memory-lifecycle-engine.ts` (1,092 lines)
   - All lifecycle operations implemented

5. **Controller** ✅
   - `apps/api/src/controllers/agent-memory-lifecycle.controller.ts` (336 lines)

---

## 🔧 Setup Steps

### Step 1: Install Dependencies

```bash
cd /home/saipienlabs/projects/pravado-platform
pnpm install
```

**Expected**: All packages installed without errors.

---

### Step 2: Apply Database Migrations

You have two options:

#### Option A: Using Supabase CLI (Recommended)

```bash
cd apps/api
npx supabase db push
```

This will apply all pending migrations to your Supabase project.

#### Option B: Manual SQL Execution

1. Go to your Supabase project dashboard: https://zahrjxnwqaxsezcrnpef.supabase.co
2. Navigate to **SQL Editor**
3. Copy the contents of `apps/api/supabase/migrations/20250102000037_memory_lifecycle.sql`
4. Paste and execute

**Expected**: Migration applies successfully with no errors.

---

### Step 3: Verify Database Schema

Run this SQL query in Supabase SQL Editor:

```sql
-- Check if lifecycle columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agent_memory_episodes'
  AND column_name IN ('age_score', 'decay_factor', 'compressed', 'archived_at');

-- Check if lifecycle events table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'agent_memory_lifecycle_events'
);

-- Check if PostgreSQL functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%memory%lifecycle%';
```

**Expected Results**:
- 4 columns returned for agent_memory_episodes
- TRUE for lifecycle events table
- Multiple function names containing "memory" and "lifecycle"

---

### Step 4: Start the API Server

```bash
cd apps/api
pnpm dev
```

**Expected**: Server starts on port 3001 without errors.

You should see:
```
✓ API server listening on port 3001
✓ Connected to Supabase
✓ Routes registered: /api/v1/agent-memory-lifecycle
```

---

## ✅ Sanity Check Tests

### Test 1: Health Check

```bash
curl http://localhost:3001/health
```

**Expected**: `{"status": "ok"}` or similar health response.

---

### Test 2: GET Dashboard Endpoint

```bash
curl -X GET http://localhost:3001/api/v1/agent-memory-lifecycle/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (if no data yet):
```json
{
  "success": true,
  "dashboard": {
    "total_episodes": 0,
    "active_episodes": 0,
    "compressed_episodes": 0,
    "pruned_episodes": 0,
    "archived_episodes": 0,
    "avg_age_score": 0,
    "compression_candidates": 0,
    "pruning_candidates": 0
  }
}
```

---

### Test 3: GET Retention Plan Endpoint

```bash
curl -X GET http://localhost:3001/api/v1/agent-memory-lifecycle/retention-plan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "plan": {
    "organization_id": "...",
    "generated_at": "2025-01-02T...",
    "total_episodes": 0,
    "episodes_to_compress": 0,
    "episodes_to_archive": 0,
    "episodes_to_prune": 0,
    "compression_candidates": [],
    "archival_candidates": [],
    "pruning_candidates": []
  }
}
```

---

### Test 4: Check Database Tables

Run this SQL in Supabase:

```sql
-- Check lifecycle events
SELECT * FROM agent_memory_lifecycle_events
ORDER BY created_at DESC
LIMIT 5;

-- Check episodes with lifecycle data
SELECT id, title, age_score, decay_factor, compressed, archived_at
FROM agent_memory_episodes
WHERE age_score IS NOT NULL
LIMIT 5;
```

**Expected**:
- Empty result sets initially (no events or episodes yet)
- No errors means tables exist and are queryable

---

### Test 5: React Hook Integration

Create a test component in your dashboard:

```tsx
// apps/dashboard/src/app/test-lifecycle/page.tsx
'use client';

import { useLifecycleDashboard } from '@/hooks/useMemoryLifecycle';

export default function TestLifecyclePage() {
  const { data, error, isLoading } = useLifecycleDashboard({
    organizationId: 'YOUR_ORG_ID'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Lifecycle Dashboard Test</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

**Expected**:
- Component renders without errors
- Data shows empty dashboard metrics
- No console errors

---

## 🧪 Advanced Tests

### Test 6: Age Memory Episodes

```bash
curl -X POST http://localhost:3001/api/v1/agent-memory-lifecycle/age \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "daysSinceLastRun": 1
  }'
```

**Expected**:
```json
{
  "success": true,
  "result": {
    "episodes_aged": 0,
    "total_decay_amount": 0,
    "avg_new_age_score": 0,
    "episodes": []
  }
}
```

---

### Test 7: Compression Test (requires existing episodes)

First, create a test episode, then:

```bash
curl -X POST http://localhost:3001/api/v1/agent-memory-lifecycle/compress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "ageThreshold": 30,
    "dryRun": true
  }'
```

**Expected**: List of compression candidates (or empty array).

---

## 📊 Database Functions Verification

Test the PostgreSQL functions directly:

```sql
-- Test age_memory_episodes function
SELECT * FROM age_memory_episodes();

-- Test get_compression_candidates
SELECT * FROM get_compression_candidates(
  p_organization_id := 'YOUR_ORG_ID',
  p_age_threshold := 30.0,
  p_limit := 10
);

-- Test get_lifecycle_dashboard
SELECT * FROM get_memory_lifecycle_dashboard(
  p_organization_id := 'YOUR_ORG_ID'
);
```

**Expected**: Functions execute without errors, return valid JSON/results.

---

## 🎯 Success Criteria Checklist

- [ ] Dependencies installed (`pnpm install` successful)
- [ ] Migration applied (tables and functions created)
- [ ] API server starts without errors
- [ ] GET /dashboard returns valid JSON
- [ ] GET /retention-plan returns valid JSON
- [ ] Database tables queryable (no permission errors)
- [ ] React hooks import without errors
- [ ] PostgreSQL functions executable

---

## 🐛 Troubleshooting

### Issue: "Table does not exist"
**Solution**: Run the migration (Step 2)

### Issue: "Authentication required"
**Solution**: You need a valid JWT token. Get one by:
1. Logging into your dashboard
2. Checking browser DevTools → Application → Local Storage
3. Copy the Supabase session token

### Issue: "Function does not exist"
**Solution**: Migration may have failed. Check Supabase logs and re-run migration.

### Issue: API server won't start
**Solution**:
1. Check `.env` file exists with correct Supabase credentials
2. Verify Redis is running (if using local Redis)
3. Check logs for specific error messages

---

## 📝 Quick Verification Script

Run the included sanity check script:

```bash
cd /home/saipienlabs/projects/pravado-platform
node sanity-check.js
```

This will automatically check:
- ✅ Supabase connection
- ✅ Database tables existence
- ✅ Migration files presence
- ✅ API implementation files

---

## 🎉 What's Next?

Once all sanity checks pass:

1. **Create seed data** for testing lifecycle operations
2. **Build UI components** using the lifecycle hooks
3. **Set up cron jobs** for automatic aging/compression
4. **Monitor lifecycle events** in production
5. **Optimize retention policies** based on usage patterns

---

## 📞 Support

If you encounter issues:

1. Check this document's troubleshooting section
2. Review the migration file for SQL errors
3. Check API server logs for detailed error messages
4. Verify environment variables are set correctly

---

**Last Updated**: 2025-01-02
**Sprint**: 37 - Autonomous Memory Pruning
**Status**: Implementation Complete ✅
