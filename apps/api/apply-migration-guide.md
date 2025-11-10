# Sprint 37 Migration Application Guide

## Quick Apply (Supabase Dashboard)

Since programmatic application requires complex PostgreSQL connection handling with Supabase's pooler, the **recommended approach** is to apply via the Supabase Dashboard:

### Steps:

1. **Open Supabase SQL Editor**:
   ```
   https://zahrjxnwqaxsezcrnpef.supabase.co/project/_/sql
   ```

2. **Create New Query**

3. **Copy Migration SQL**:
   - File location: `apps/api/supabase/migrations/20250102000037_memory_lifecycle.sql`
   - Copy entire contents (17.4KB)

4. **Paste and Execute**

5. **Verify Success**:
   ```bash
   cd apps/api
   node verify-migration.js
   ```

---

## Why Not Programmatic?

Supabase uses connection pooling with specific authentication that requires:
- Correct pooler URL format
- Service role credentials
- SSL configuration
- Proper transaction handling

The SQL Editor provides the most reliable execution path.

---

## Alternative: Supabase CLI

If you have Docker running:

```bash
cd apps/api
npx supabase db push
```

This uploads all pending migrations from the `supabase/migrations/` directory.

---

## Verification

After applying via either method, verify with:

```bash
node verify-migration.js
```

This will confirm:
- ✅ Lifecycle columns exist
- ✅ Lifecycle events table created
- ✅ PostgreSQL functions defined
- ✅ RLS policies applied

---

## Migration Contents

The migration includes:

- **3 tables modified/created**:
  - `agent_memory_episodes` (9 new columns)
  - `agent_memory_chunks` (6 new columns)
  - `agent_memory_lifecycle_events` (new table)

- **10+ PostgreSQL functions**:
  - `age_memory_episodes()`
  - `reinforce_memory_episode()`
  - `get_compression_candidates()`
  - `get_pruning_candidates()`
  - `archive_memory_episodes()`
  - `prune_memory_episodes()`
  - And more...

- **Indexes** for performance
- **RLS policies** for security
- **Triggers** for automatic reinforcement

---

## Troubleshooting

**Error: "relation does not exist"**
→ Ensure earlier migrations (Sprint 36) have been run first

**Error: "column already exists"**
→ Migration has already been applied (this is safe to ignore)

**Error: "permission denied"**
→ Ensure you're using service role key or running in Supabase Dashboard

---

**Status**: Ready to apply
**Estimated time**: 2-3 minutes
**Rollback**: Not needed (migration uses IF NOT EXISTS)
