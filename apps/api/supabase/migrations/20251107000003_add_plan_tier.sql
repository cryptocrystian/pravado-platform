-- =====================================================
-- ADD PLAN TIER TO ORGANIZATIONS
-- Sprint 71: User-Facing AI Performance Reports + Billing Integration
-- =====================================================
-- Add billing plan tier to organizations table

-- Add plan_tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'plan_tier'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'trial'
      CONSTRAINT valid_plan_tier CHECK (plan_tier IN ('trial', 'pro', 'enterprise'));

    -- Add index for plan tier queries
    CREATE INDEX idx_organizations_plan_tier
      ON organizations(plan_tier);

    COMMENT ON COLUMN organizations.plan_tier IS 'Sprint 71: Billing plan tier (trial, pro, enterprise)';
  END IF;
END $$;

-- Add billing metadata column for future extensibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'billing_metadata'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN billing_metadata JSONB DEFAULT '{}';

    -- Example structure:
    -- {
    --   "stripe_customer_id": "cus_xxx",
    --   "stripe_subscription_id": "sub_xxx",
    --   "billing_email": "billing@company.com",
    --   "payment_method": "card",
    --   "auto_upgrade": false,
    --   "usage_alerts": {
    --     "threshold_80": true,
    --     "threshold_100": true
    --   }
    -- }

    CREATE INDEX idx_organizations_billing_metadata_gin
      ON organizations USING gin(billing_metadata);

    COMMENT ON COLUMN organizations.billing_metadata IS 'Sprint 71: Billing-related metadata (Stripe IDs, alerts, etc.)';
  END IF;
END $$;

-- Helper function to get organization plan details
CREATE OR REPLACE FUNCTION get_organization_plan(org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  plan_tier TEXT,
  billing_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.plan_tier,
    o.billing_metadata,
    o.created_at
  FROM organizations o
  WHERE o.id = org_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to upgrade/downgrade plan
CREATE OR REPLACE FUNCTION update_organization_plan(
  org_id UUID,
  new_plan_tier TEXT,
  metadata_updates JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Validate plan tier
  IF new_plan_tier NOT IN ('trial', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan tier: %', new_plan_tier;
  END IF;

  UPDATE organizations
  SET
    plan_tier = new_plan_tier,
    billing_metadata = billing_metadata || metadata_updates,
    updated_at = now()
  WHERE id = org_id;

  GET DIAGNOSTICS success = FOUND;
  RETURN success;
END;
$$ LANGUAGE plpgsql;

-- Get plan tier distribution (admin analytics)
CREATE OR REPLACE FUNCTION get_plan_tier_distribution()
RETURNS TABLE (
  plan_tier TEXT,
  organization_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_orgs BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_orgs FROM organizations;

  RETURN QUERY
  SELECT
    o.plan_tier,
    COUNT(*)::BIGINT as organization_count,
    CASE
      WHEN total_orgs > 0 THEN (COUNT(*)::NUMERIC / total_orgs::NUMERIC) * 100
      ELSE 0
    END as percentage
  FROM organizations o
  GROUP BY o.plan_tier
  ORDER BY organization_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;
