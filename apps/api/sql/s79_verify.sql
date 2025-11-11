-- Sprint 79 - LLM Router Retrofit SQL Verification
-- Verifies that ai_usage_ledger is receiving entries from retrofitted services

\echo ''
\echo '========================================='
\echo 'Sprint 79 - LLM Router Retrofit Verification'
\echo '========================================='
\echo ''

-- 1. Check if ai_usage_ledger table exists
\echo '1. Checking ai_usage_ledger table existence...'
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'ai_usage_ledger'
    )
    THEN '✅ ai_usage_ledger table exists'
    ELSE '❌ ai_usage_ledger table NOT FOUND'
  END AS status;

\echo ''

-- 2. Check for entries from retrofitted services
\echo '2. Checking for LLM usage from retrofitted services...'
\echo '   (Note: Run this AFTER making test API calls to retrofitted endpoints)'
\echo ''

SELECT
  service,
  route,
  COUNT(*) as call_count,
  SUM(tokens_used) as total_tokens,
  AVG(cost_usd) as avg_cost_usd,
  MIN(created_at) as first_call,
  MAX(created_at) as last_call
FROM ai_usage_ledger
WHERE service IN (
  'agentContextEnhancer',
  'agentCollaborationOrchestrator',
  'agentFeedbackEngine',
  'agentMessenger',
  'agentPlaybookSyncEngine',
  'agentArbitrationEngine',
  'agentModerationEngine'
)
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY service, route
ORDER BY service, route;

\echo ''

-- 3. Check budget guard enforcement
\echo '3. Checking budget guard logs...'
SELECT
  COUNT(*) as total_checks,
  SUM(CASE WHEN allowed THEN 1 ELSE 0 END) as allowed_count,
  SUM(CASE WHEN NOT allowed THEN 1 ELSE 0 END) as blocked_count
FROM budget_guard_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND organization_id IS NOT NULL;

\echo ''

-- 4. Check for any bypassed calls (should be zero)
\echo '4. Checking for direct OpenAI SDK usage (should be ZERO)...'
\echo '   (This checks application logs, if available)'
-- Note: This would need to query application logs if they're stored in DB
SELECT '✅ No database-level bypass detection available' as status;
SELECT 'Run grep verification script instead: bash apps/api/scripts/s79_smoke.sh' as recommendation;

\echo ''

-- 5. Provider distribution
\echo '5. Checking LLM provider distribution...'
SELECT
  provider,
  model,
  COUNT(*) as usage_count,
  SUM(tokens_used) as total_tokens
FROM ai_usage_ledger
WHERE service IN (
  'agentContextEnhancer',
  'agentCollaborationOrchestrator',
  'agentFeedbackEngine',
  'agentMessenger',
  'agentPlaybookSyncEngine',
  'agentArbitrationEngine',
  'agentModerationEngine'
)
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider, model
ORDER BY usage_count DESC;

\echo ''

-- 6. Recent errors (if any)
\echo '6. Checking for recent LLM router errors...'
SELECT
  service,
  route,
  error_message,
  created_at
FROM ai_usage_ledger
WHERE service IN (
  'agentContextEnhancer',
  'agentCollaborationOrchestrator',
  'agentFeedbackEngine',
  'agentMessenger',
  'agentPlaybookSyncEngine',
  'agentArbitrationEngine',
  'agentModerationEngine'
)
AND error_message IS NOT NULL
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '========================================='
\echo 'Verification Complete'
\echo '========================================='
\echo ''
\echo 'Expected Results:'
\echo '- ai_usage_ledger should show entries for retrofitted services'
\echo '- All calls should route through the centralized router'
\echo '- Budget guard should be enforcing limits'
\echo '- No direct SDK usage detected'
\echo ''
