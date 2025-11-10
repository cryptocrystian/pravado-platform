-- =====================================================
-- AI POLICY AND USAGE TRACKING SCHEMA
-- Sprint 69: Dynamic LLM Strategy Manager + Cost Guardrails
-- =====================================================

-- =====================================================
-- AI POLICY TABLE
-- =====================================================
-- Organization-scoped LLM usage policies and guardrails

CREATE TABLE IF NOT EXISTS ai_policy (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,

  -- Trial vs Paid tier
  trial_mode BOOLEAN NOT NULL DEFAULT false,

  -- Cost guardrails
  max_daily_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 10.00,
  max_request_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.03,

  -- Token limits
  max_tokens_input INTEGER NOT NULL DEFAULT 2000,
  max_tokens_output INTEGER NOT NULL DEFAULT 1200,

  -- Concurrency limits
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 10,

  -- Provider controls
  allowed_providers TEXT NOT NULL DEFAULT 'openai,anthropic',

  -- Task-specific overrides (JSON)
  -- Example: {"pr-pitch": {"minPerf": 0.8, "preferredModels": ["claude-3-sonnet", "gpt-4o"]}}
  task_overrides JSONB DEFAULT '{}'::jsonb,

  -- Rate limits
  burst_rate_limit INTEGER NOT NULL DEFAULT 10,      -- Max requests in burst
  sustained_rate_limit INTEGER NOT NULL DEFAULT 60,  -- Max requests per minute sustained

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_policy_trial ON ai_policy(trial_mode);

-- RLS Policies
ALTER TABLE ai_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view policy for their organization"
  ON ai_policy FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY "Admins can update policy for their organization"
  ON ai_policy FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Updated at trigger
CREATE TRIGGER update_ai_policy_updated_at
  BEFORE UPDATE ON ai_policy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_policy IS 'Per-organization LLM usage policies and cost guardrails';

-- =====================================================
-- AI USAGE LEDGER TABLE
-- =====================================================
-- Tracks every LLM API call for cost accounting

CREATE TABLE IF NOT EXISTS ai_usage_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Request details
  provider TEXT NOT NULL,              -- 'openai', 'anthropic'
  model TEXT NOT NULL,                 -- 'gpt-4o', 'claude-3-sonnet', etc.
  task_category TEXT,                  -- 'pr-pitch', 'summarization', etc.

  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- Cost tracking
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.00,

  -- Performance metrics
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  -- Context
  agent_type TEXT,                     -- Which agent made the request
  user_id UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_ai_usage_org ON ai_usage_ledger(organization_id);
CREATE INDEX idx_ai_usage_created ON ai_usage_ledger(created_at DESC);
CREATE INDEX idx_ai_usage_org_created ON ai_usage_ledger(organization_id, created_at DESC);
CREATE INDEX idx_ai_usage_provider_model ON ai_usage_ledger(provider, model);

-- Composite index for daily cost queries
CREATE INDEX idx_ai_usage_daily_cost ON ai_usage_ledger(
  organization_id,
  DATE(created_at),
  estimated_cost_usd
);

-- RLS Policies
ALTER TABLE ai_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage for their organization"
  ON ai_usage_ledger FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY "System can insert usage records"
  ON ai_usage_ledger FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

COMMENT ON TABLE ai_usage_ledger IS 'Detailed log of all LLM API calls for cost tracking and analytics';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get daily spend for an organization
CREATE OR REPLACE FUNCTION get_daily_spend(org_id UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)
  FROM ai_usage_ledger
  WHERE organization_id = org_id
    AND DATE(created_at) = target_date;
$$ LANGUAGE SQL STABLE;

-- Function to get remaining budget for today
CREATE OR REPLACE FUNCTION get_remaining_budget(org_id UUID)
RETURNS NUMERIC AS $$
  SELECT
    COALESCE(p.max_daily_cost_usd, 10.00) - COALESCE(get_daily_spend(org_id), 0)
  FROM ai_policy p
  WHERE p.organization_id = org_id;
$$ LANGUAGE SQL STABLE;

-- Function to check if organization can afford a request
CREATE OR REPLACE FUNCTION can_afford_request(
  org_id UUID,
  estimated_cost NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  policy_record RECORD;
  daily_spend NUMERIC;
BEGIN
  -- Get policy
  SELECT * INTO policy_record
  FROM ai_policy
  WHERE organization_id = org_id;

  -- If no policy, use defaults
  IF NOT FOUND THEN
    RETURN estimated_cost <= 0.03; -- Default max_request_cost_usd
  END IF;

  -- Check request-level limit
  IF estimated_cost > policy_record.max_request_cost_usd THEN
    RETURN false;
  END IF;

  -- Check daily limit
  daily_spend := get_daily_spend(org_id);
  IF (daily_spend + estimated_cost) > policy_record.max_daily_cost_usd THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;
