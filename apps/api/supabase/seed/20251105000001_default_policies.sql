-- =====================================================
-- DEFAULT AI POLICIES SEED DATA
-- Sprint 69: Dynamic LLM Strategy Manager
-- =====================================================
-- This file seeds default policies for trial and paid organizations
-- Run after migration 20251105000001_ai_policy_and_usage.sql

-- =====================================================
-- DEFAULT TRIAL POLICY (Strict Guardrails)
-- =====================================================
-- Note: This is a template. Replace 'your-trial-org-id-here' with actual org IDs
--
-- Example usage:
-- INSERT INTO ai_policy (organization_id, trial_mode, ...)
-- SELECT id, true, ... FROM organizations WHERE plan_type = 'trial';

-- Template for trial organizations
-- max_daily_cost_usd: $2.00 (strict limit)
-- max_request_cost_usd: $0.02 (small requests only)
-- max_tokens_input/output: 1500/800 (limited context)
-- burst_rate_limit: 5 (low burst)
-- sustained_rate_limit: 30 (30 req/min)
--
-- Task overrides for trial mode (restrict to cheapest models):
-- {
--   "drafting-short": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]},
--   "summarization": {"minPerf": 0.5, "preferredModels": ["claude-3-haiku", "gpt-4o-mini"]},
--   "seo-keywords": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini"]},
--   "safe-mode": {"minPerf": 0.4, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]}
-- }

-- =====================================================
-- DEFAULT PAID POLICY (Relaxed Guardrails)
-- =====================================================
-- Template for paid organizations
-- max_daily_cost_usd: $100.00 (generous limit)
-- max_request_cost_usd: $0.50 (allow larger requests)
-- max_tokens_input/output: 8000/4000 (large context)
-- burst_rate_limit: 20 (high burst)
-- sustained_rate_limit: 120 (120 req/min)
--
-- Task overrides for balanced performance/cost:
-- {
--   "drafting-short": {"minPerf": 0.6, "preferredModels": ["gpt-4o-mini", "claude-3-haiku", "gpt-4o"]},
--   "drafting-long": {"minPerf": 0.7, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
--   "structured-json": {"minPerf": 0.8, "preferredModels": ["gpt-4o", "claude-3-sonnet"]},
--   "summarization": {"minPerf": 0.6, "preferredModels": ["claude-3-haiku", "gpt-4o-mini"]},
--   "seo-keywords": {"minPerf": 0.6, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]},
--   "pr-pitch": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
--   "analyst": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
--   "safe-mode": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]}
-- }

-- =====================================================
-- EXAMPLE SEED INSERTS
-- =====================================================
-- Uncomment and modify for your actual organization IDs

-- Example 1: Seed trial policy for a specific organization
/*
INSERT INTO ai_policy (
  organization_id,
  trial_mode,
  max_daily_cost_usd,
  max_request_cost_usd,
  max_tokens_input,
  max_tokens_output,
  max_concurrent_jobs,
  allowed_providers,
  task_overrides,
  burst_rate_limit,
  sustained_rate_limit
)
VALUES (
  'your-trial-org-uuid-here'::UUID,
  true,
  2.00,
  0.02,
  1500,
  800,
  5,
  'openai,anthropic',
  '{
    "drafting-short": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]},
    "summarization": {"minPerf": 0.5, "preferredModels": ["claude-3-haiku", "gpt-4o-mini"]},
    "seo-keywords": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini"]},
    "safe-mode": {"minPerf": 0.4, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]}
  }'::jsonb,
  5,
  30
)
ON CONFLICT (organization_id) DO NOTHING;
*/

-- Example 2: Seed paid policy for a specific organization
/*
INSERT INTO ai_policy (
  organization_id,
  trial_mode,
  max_daily_cost_usd,
  max_request_cost_usd,
  max_tokens_input,
  max_tokens_output,
  max_concurrent_jobs,
  allowed_providers,
  task_overrides,
  burst_rate_limit,
  sustained_rate_limit
)
VALUES (
  'your-paid-org-uuid-here'::UUID,
  false,
  100.00,
  0.50,
  8000,
  4000,
  20,
  'openai,anthropic',
  '{
    "drafting-short": {"minPerf": 0.6, "preferredModels": ["gpt-4o-mini", "claude-3-haiku", "gpt-4o"]},
    "drafting-long": {"minPerf": 0.7, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
    "structured-json": {"minPerf": 0.8, "preferredModels": ["gpt-4o", "claude-3-sonnet"]},
    "summarization": {"minPerf": 0.6, "preferredModels": ["claude-3-haiku", "gpt-4o-mini"]},
    "seo-keywords": {"minPerf": 0.6, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]},
    "pr-pitch": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
    "analyst": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
    "safe-mode": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]}
  }'::jsonb,
  20,
  120
)
ON CONFLICT (organization_id) DO NOTHING;
*/

-- Example 3: Bulk insert default trial policies for all trial-tier orgs
/*
INSERT INTO ai_policy (
  organization_id,
  trial_mode,
  max_daily_cost_usd,
  max_request_cost_usd,
  max_tokens_input,
  max_tokens_output,
  max_concurrent_jobs,
  allowed_providers,
  task_overrides,
  burst_rate_limit,
  sustained_rate_limit
)
SELECT
  id,
  true,
  2.00,
  0.02,
  1500,
  800,
  5,
  'openai,anthropic',
  '{
    "drafting-short": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]},
    "summarization": {"minPerf": 0.5, "preferredModels": ["claude-3-haiku", "gpt-4o-mini"]},
    "seo-keywords": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini"]},
    "safe-mode": {"minPerf": 0.4, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]}
  }'::jsonb,
  5,
  30
FROM organizations
WHERE plan_type = 'trial' OR subscription_status = 'trialing'
ON CONFLICT (organization_id) DO NOTHING;
*/

-- Example 4: Bulk insert default paid policies for all paid orgs
/*
INSERT INTO ai_policy (
  organization_id,
  trial_mode,
  max_daily_cost_usd,
  max_request_cost_usd,
  max_tokens_input,
  max_tokens_output,
  max_concurrent_jobs,
  allowed_providers,
  task_overrides,
  burst_rate_limit,
  sustained_rate_limit
)
SELECT
  id,
  false,
  100.00,
  0.50,
  8000,
  4000,
  20,
  'openai,anthropic',
  '{
    "drafting-short": {"minPerf": 0.6, "preferredModels": ["gpt-4o-mini", "claude-3-haiku", "gpt-4o"]},
    "drafting-long": {"minPerf": 0.7, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
    "structured-json": {"minPerf": 0.8, "preferredModels": ["gpt-4o", "claude-3-sonnet"]},
    "summarization": {"minPerf": 0.6, "preferredModels": ["claude-3-haiku", "gpt-4o-mini"]},
    "seo-keywords": {"minPerf": 0.6, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]},
    "pr-pitch": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
    "analyst": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]},
    "safe-mode": {"minPerf": 0.5, "preferredModels": ["gpt-4o-mini", "claude-3-haiku"]}
  }'::jsonb,
  20,
  120
FROM organizations
WHERE plan_type IN ('pro', 'enterprise') OR subscription_status = 'active'
ON CONFLICT (organization_id) DO NOTHING;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify seed data was inserted correctly

-- Check trial policies
-- SELECT * FROM ai_policy WHERE trial_mode = true;

-- Check paid policies
-- SELECT * FROM ai_policy WHERE trial_mode = false;

-- Verify task overrides structure
-- SELECT organization_id, jsonb_pretty(task_overrides) FROM ai_policy LIMIT 5;
