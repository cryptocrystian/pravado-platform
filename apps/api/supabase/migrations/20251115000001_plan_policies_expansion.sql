/**
 * Plan Policies Expansion Migration
 *
 * Implements validated 4-tier pricing structure from PVS-01
 * Adds feature limits and upgrade triggers for:
 * - Starter ($149/mo)
 * - Pro ($599/mo)
 * - Premium ($1,499/mo)
 * - Enterprise ($5,000+/mo)
 *
 * Sprint 75 - Track B: Validated Pricing Rollout
 */

-- ============================================================================
-- 1. Add new columns to plan_policies table
-- ============================================================================

ALTER TABLE plan_policies
ADD COLUMN IF NOT EXISTS journalist_contacts_limit INTEGER,
ADD COLUMN IF NOT EXISTS ai_generations_monthly INTEGER,
ADD COLUMN IF NOT EXISTS media_searches_monthly INTEGER,
ADD COLUMN IF NOT EXISTS storage_gb_limit INTEGER,
ADD COLUMN IF NOT EXISTS max_users INTEGER,
ADD COLUMN IF NOT EXISTS podcast_syndications_monthly INTEGER,
ADD COLUMN IF NOT EXISTS citemind_queries_monthly INTEGER,
ADD COLUMN IF NOT EXISTS api_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS white_label_reports BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_integrations BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dedicated_csm BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_uptime_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS priority_support_hours INTEGER,
ADD COLUMN IF NOT EXISTS agent_sync_depth_days INTEGER,
ADD COLUMN IF NOT EXISTS monthly_price_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS annual_price_usd DECIMAL(10,2);

-- ============================================================================
-- 2. Add stripe_price_id mapping columns
-- ============================================================================

ALTER TABLE plan_policies
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id_annual VARCHAR(255);

-- Create index for fast Stripe price lookups
CREATE INDEX IF NOT EXISTS idx_plan_policies_stripe_monthly
  ON plan_policies(stripe_price_id_monthly);

CREATE INDEX IF NOT EXISTS idx_plan_policies_stripe_annual
  ON plan_policies(stripe_price_id_annual);

-- ============================================================================
-- 3. Add usage tracking table for upgrade triggers
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Usage metrics
  journalist_contacts_used INTEGER DEFAULT 0,
  ai_generations_used INTEGER DEFAULT 0,
  media_searches_used INTEGER DEFAULT 0,
  storage_gb_used DECIMAL(10,2) DEFAULT 0,
  active_users_count INTEGER DEFAULT 0,
  podcast_syndications_used INTEGER DEFAULT 0,
  citemind_queries_used INTEGER DEFAULT 0,

  -- Percentage of limits
  contacts_utilization_percent DECIMAL(5,2),
  ai_utilization_percent DECIMAL(5,2),
  searches_utilization_percent DECIMAL(5,2),
  storage_utilization_percent DECIMAL(5,2),
  users_utilization_percent DECIMAL(5,2),

  -- Upgrade trigger flags
  should_prompt_upgrade BOOLEAN DEFAULT false,
  upgrade_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, snapshot_date)
);

-- Indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_org
  ON feature_usage_snapshots(organization_id);

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_date
  ON feature_usage_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_upgrade
  ON feature_usage_snapshots(should_prompt_upgrade)
  WHERE should_prompt_upgrade = true;

-- ============================================================================
-- 4. Add tier pricing history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL,
  monthly_price_usd DECIMAL(10,2) NOT NULL,
  annual_price_usd DECIMAL(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,

  -- Pricing model metadata
  model_name VARCHAR(100), -- e.g., "Balanced Model", "Premium Model"
  pricing_version VARCHAR(50), -- e.g., "v1.0", "v1.1"
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index for historical pricing lookups
CREATE INDEX IF NOT EXISTS idx_tier_pricing_tier_date
  ON tier_pricing_history(tier, effective_date DESC);

-- ============================================================================
-- 5. Add trial configuration table
-- ============================================================================

CREATE TABLE IF NOT EXISTS trial_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL UNIQUE,
  trial_duration_days INTEGER NOT NULL DEFAULT 14,
  trial_features_tier VARCHAR(50) NOT NULL, -- Which tier's features are shown during trial
  credit_card_required BOOLEAN DEFAULT true,
  auto_downgrade_tier VARCHAR(50), -- Tier to downgrade to if trial expires without payment

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. Add upgrade/downgrade tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Change details
  from_tier VARCHAR(50),
  to_tier VARCHAR(50) NOT NULL,
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'trial_start', 'trial_convert', 'trial_expire')),

  -- Financial impact
  from_monthly_price DECIMAL(10,2),
  to_monthly_price DECIMAL(10,2),
  mrr_change DECIMAL(10,2), -- Positive for upgrades, negative for downgrades

  -- Reason and context
  change_reason VARCHAR(100), -- e.g., 'usage_limit_hit', 'user_requested', 'trial_conversion'
  triggered_by VARCHAR(50), -- 'user', 'system', 'admin'
  notes TEXT,

  -- Stripe details
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for tier change analytics
CREATE INDEX IF NOT EXISTS idx_tier_changes_org
  ON tier_change_log(organization_id);

CREATE INDEX IF NOT EXISTS idx_tier_changes_date
  ON tier_change_log(effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_tier_changes_type
  ON tier_change_log(change_type);

-- ============================================================================
-- 7. Add RLS policies for new tables
-- ============================================================================

-- Feature usage snapshots
ALTER TABLE feature_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's usage snapshots"
  ON feature_usage_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Platform admins can view all usage snapshots"
  ON feature_usage_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_platform_admin = true
    )
  );

-- Tier change log
ALTER TABLE tier_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's tier changes"
  ON tier_change_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Platform admins can view all tier changes"
  ON tier_change_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_platform_admin = true
    )
  );

-- Trial configurations
ALTER TABLE trial_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trial configurations"
  ON trial_configurations
  FOR SELECT
  USING (true);

CREATE POLICY "Only platform admins can modify trial configurations"
  ON trial_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_platform_admin = true
    )
  );

-- ============================================================================
-- 8. Add functions for upgrade triggers
-- ============================================================================

/**
 * Check if organization should be prompted to upgrade
 */
CREATE OR REPLACE FUNCTION check_upgrade_triggers(org_id UUID)
RETURNS TABLE (
  should_upgrade BOOLEAN,
  reason TEXT,
  recommended_tier VARCHAR(50)
) AS $$
DECLARE
  current_tier VARCHAR(50);
  latest_snapshot RECORD;
  current_limits RECORD;
BEGIN
  -- Get current tier
  SELECT plan_tier INTO current_tier
  FROM organizations
  WHERE id = org_id;

  -- Get latest usage snapshot
  SELECT * INTO latest_snapshot
  FROM feature_usage_snapshots
  WHERE organization_id = org_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- Get current tier limits
  SELECT * INTO current_limits
  FROM plan_policies
  WHERE tier = current_tier;

  -- Check upgrade conditions
  -- Rule 1: Hit 80% of any hard limit
  IF latest_snapshot.contacts_utilization_percent >= 80 THEN
    RETURN QUERY SELECT true, 'Approaching journalist contact limit (80% used)', get_next_tier(current_tier);
    RETURN;
  END IF;

  IF latest_snapshot.ai_utilization_percent >= 80 THEN
    RETURN QUERY SELECT true, 'Approaching AI generation limit (80% used)', get_next_tier(current_tier);
    RETURN;
  END IF;

  IF latest_snapshot.users_utilization_percent >= 100 THEN
    RETURN QUERY SELECT true, 'Team size exceeds current tier limit', get_next_tier(current_tier);
    RETURN;
  END IF;

  -- Rule 2: Consistent high usage over 2 months
  -- (Simplified - full implementation would check multiple snapshots)

  -- No upgrade needed
  RETURN QUERY SELECT false, NULL::TEXT, NULL::VARCHAR(50);
END;
$$ LANGUAGE plpgsql;

/**
 * Get next tier in upgrade path
 */
CREATE OR REPLACE FUNCTION get_next_tier(current_tier VARCHAR(50))
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN CASE current_tier
    WHEN 'starter' THEN 'pro'
    WHEN 'pro' THEN 'premium'
    WHEN 'premium' THEN 'enterprise'
    ELSE current_tier
  END;
END;
$$ LANGUAGE plpgsql;

/**
 * Calculate usage utilization percentages
 */
CREATE OR REPLACE FUNCTION calculate_usage_utilization()
RETURNS TRIGGER AS $$
DECLARE
  limits RECORD;
BEGIN
  -- Get tier limits
  SELECT * INTO limits
  FROM plan_policies p
  JOIN organizations o ON o.plan_tier = p.tier
  WHERE o.id = NEW.organization_id;

  -- Calculate utilization percentages
  NEW.contacts_utilization_percent := (NEW.journalist_contacts_used::DECIMAL / NULLIF(limits.journalist_contacts_limit, 0)) * 100;
  NEW.ai_utilization_percent := (NEW.ai_generations_used::DECIMAL / NULLIF(limits.ai_generations_monthly, 0)) * 100;
  NEW.searches_utilization_percent := (NEW.media_searches_used::DECIMAL / NULLIF(limits.media_searches_monthly, 0)) * 100;
  NEW.storage_utilization_percent := (NEW.storage_gb_used::DECIMAL / NULLIF(limits.storage_gb_limit, 0)) * 100;
  NEW.users_utilization_percent := (NEW.active_users_count::DECIMAL / NULLIF(limits.max_users, 0)) * 100;

  -- Set upgrade flag if any utilization > 80%
  IF NEW.contacts_utilization_percent >= 80 OR
     NEW.ai_utilization_percent >= 80 OR
     NEW.searches_utilization_percent >= 80 OR
     NEW.storage_utilization_percent >= 80 OR
     NEW.users_utilization_percent >= 100 THEN
    NEW.should_prompt_upgrade := true;

    -- Set upgrade reason
    NEW.upgrade_reason := CASE
      WHEN NEW.contacts_utilization_percent >= 80 THEN 'Journalist contact limit approaching'
      WHEN NEW.ai_utilization_percent >= 80 THEN 'AI generation limit approaching'
      WHEN NEW.searches_utilization_percent >= 80 THEN 'Media search limit approaching'
      WHEN NEW.storage_utilization_percent >= 80 THEN 'Storage limit approaching'
      WHEN NEW.users_utilization_percent >= 100 THEN 'User limit exceeded'
      ELSE 'Multiple limits approaching'
    END;
  ELSE
    NEW.should_prompt_upgrade := false;
    NEW.upgrade_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to calculate utilization on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_utilization ON feature_usage_snapshots;
CREATE TRIGGER trigger_calculate_utilization
  BEFORE INSERT OR UPDATE ON feature_usage_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION calculate_usage_utilization();

-- ============================================================================
-- 9. Add comments
-- ============================================================================

COMMENT ON TABLE feature_usage_snapshots IS 'Daily snapshots of feature usage for upgrade trigger detection';
COMMENT ON TABLE tier_pricing_history IS 'Historical record of tier pricing changes';
COMMENT ON TABLE trial_configurations IS 'Trial period configuration per tier';
COMMENT ON TABLE tier_change_log IS 'Audit log of all tier upgrades/downgrades';

COMMENT ON COLUMN plan_policies.journalist_contacts_limit IS 'Maximum journalist contacts per tier';
COMMENT ON COLUMN plan_policies.ai_generations_monthly IS 'Monthly AI content generation limit';
COMMENT ON COLUMN plan_policies.podcast_syndications_monthly IS 'Monthly podcast distribution limit';
COMMENT ON COLUMN plan_policies.citemind_queries_monthly IS 'Monthly CiteMind Context Engine query limit (NULL = unlimited)';

-- ============================================================================
-- Migration complete
-- ============================================================================
