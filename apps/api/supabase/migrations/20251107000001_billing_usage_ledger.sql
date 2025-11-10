-- =====================================================
-- BILLING USAGE LEDGER MIGRATION
-- Sprint 71: User-Facing AI Performance Reports + Billing Integration
-- =====================================================
-- Daily aggregated usage per organization for billing

-- =====================================================
-- BILLING USAGE LEDGER TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS billing_usage_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization and date
  organization_id UUID NOT NULL,
  date DATE NOT NULL,

  -- Usage metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_tokens_in BIGINT NOT NULL DEFAULT 0,
  total_tokens_out BIGINT NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,

  -- Provider breakdown (JSONB for flexibility)
  by_provider JSONB NOT NULL DEFAULT '{}',
  -- Example: {"openai": {"requests": 100, "cost": 1.50}, "anthropic": {...}}

  -- Model breakdown
  by_model JSONB NOT NULL DEFAULT '{}',
  -- Example: {"gpt-4o": {"requests": 50, "cost": 0.75}, ...}

  -- Task category breakdown
  by_task_category JSONB NOT NULL DEFAULT '{}',
  -- Example: {"summarization": {"requests": 30, "cost": 0.20}, ...}

  -- Cache metrics
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  cache_cost_saved NUMERIC(10, 6) NOT NULL DEFAULT 0,

  -- Performance metrics
  avg_latency_ms NUMERIC(10, 2) NOT NULL DEFAULT 0,
  avg_error_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  success_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.0,

  -- Plan tier at time of usage
  plan_tier TEXT NOT NULL DEFAULT 'trial',  -- trial, pro, enterprise

  -- Billing status
  billed BOOLEAN NOT NULL DEFAULT false,
  billed_at TIMESTAMP WITH TIME ZONE,
  stripe_invoice_id TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  UNIQUE(organization_id, date),
  CONSTRAINT valid_metrics CHECK (
    total_requests >= 0 AND
    total_tokens_in >= 0 AND
    total_tokens_out >= 0 AND
    total_cost_usd >= 0 AND
    cache_hits >= 0 AND
    cache_misses >= 0
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Organization + date lookup (primary query pattern)
CREATE INDEX idx_billing_usage_org_date
  ON billing_usage_ledger(organization_id, date DESC);

-- Unbilled usage query
CREATE INDEX idx_billing_usage_unbilled
  ON billing_usage_ledger(billed, organization_id)
  WHERE billed = false;

-- Date range queries
CREATE INDEX idx_billing_usage_date
  ON billing_usage_ledger(date DESC);

-- Plan tier analysis
CREATE INDEX idx_billing_usage_plan_tier
  ON billing_usage_ledger(plan_tier, date DESC);

-- Full-text search on breakdowns
CREATE INDEX idx_billing_usage_provider_gin
  ON billing_usage_ledger USING gin(by_provider);

CREATE INDEX idx_billing_usage_model_gin
  ON billing_usage_ledger USING gin(by_model);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get unbilled usage for an organization
 */
CREATE OR REPLACE FUNCTION get_unbilled_usage(org_id UUID)
RETURNS TABLE (
  date DATE,
  total_cost NUMERIC,
  total_requests INTEGER,
  plan_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.date,
    b.total_cost_usd,
    b.total_requests,
    b.plan_tier
  FROM billing_usage_ledger b
  WHERE b.organization_id = org_id
    AND b.billed = false
  ORDER BY b.date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get usage summary for date range
 */
CREATE OR REPLACE FUNCTION get_usage_summary(
  org_id UUID,
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_cost NUMERIC,
  total_requests BIGINT,
  total_tokens BIGINT,
  avg_daily_cost NUMERIC,
  cache_hit_rate NUMERIC,
  avg_latency NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_cost_usd), 0) as total_cost,
    COALESCE(SUM(total_requests), 0)::BIGINT as total_requests,
    COALESCE(SUM(total_tokens_in + total_tokens_out), 0)::BIGINT as total_tokens,
    COALESCE(AVG(total_cost_usd), 0) as avg_daily_cost,
    CASE
      WHEN SUM(cache_hits + cache_misses) > 0
      THEN (SUM(cache_hits)::NUMERIC / SUM(cache_hits + cache_misses)::NUMERIC) * 100
      ELSE 0
    END as cache_hit_rate,
    COALESCE(AVG(avg_latency_ms), 0) as avg_latency
  FROM billing_usage_ledger
  WHERE organization_id = org_id
    AND date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Mark usage as billed
 */
CREATE OR REPLACE FUNCTION mark_usage_billed(
  org_id UUID,
  billing_date DATE,
  invoice_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE billing_usage_ledger
  SET
    billed = true,
    billed_at = now(),
    stripe_invoice_id = invoice_id
  WHERE organization_id = org_id
    AND date = billing_date
    AND billed = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Get top spending organizations
 */
CREATE OR REPLACE FUNCTION get_top_spenders(
  limit_count INTEGER DEFAULT 10,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  organization_id UUID,
  total_cost NUMERIC,
  total_requests BIGINT,
  plan_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.organization_id,
    SUM(b.total_cost_usd) as total_cost,
    SUM(b.total_requests)::BIGINT as total_requests,
    MAX(b.plan_tier) as plan_tier  -- Most recent plan tier
  FROM billing_usage_ledger b
  WHERE b.date BETWEEN start_date AND end_date
  GROUP BY b.organization_id
  ORDER BY total_cost DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- AUTOMATIC UPDATE TRIGGER
-- =====================================================

/**
 * Update updated_at timestamp on row change
 */
CREATE OR REPLACE FUNCTION update_billing_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_billing_usage_timestamp
  BEFORE UPDATE ON billing_usage_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_usage_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE billing_usage_ledger IS 'Sprint 71: Daily aggregated AI usage for billing';
COMMENT ON COLUMN billing_usage_ledger.by_provider IS 'Provider breakdown as JSONB: {"openai": {"requests": N, "cost": X}}';
COMMENT ON COLUMN billing_usage_ledger.billed IS 'Whether this usage has been invoiced';
COMMENT ON COLUMN billing_usage_ledger.stripe_invoice_id IS 'Stripe invoice ID for reconciliation';

-- =====================================================
-- GRANTS (if using RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE billing_usage_ledger ENABLE ROW LEVEL SECURITY;

-- Organizations can read their own usage
CREATE POLICY billing_usage_select_own
  ON billing_usage_ledger
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Only system/admin can insert/update
CREATE POLICY billing_usage_admin_all
  ON billing_usage_ledger
  FOR ALL
  USING (current_setting('app.user_role', true) = 'admin');
