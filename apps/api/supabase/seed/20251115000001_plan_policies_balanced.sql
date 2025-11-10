/**
 * Plan Policies Seed Data - Balanced Model
 *
 * Implements validated pricing from PVS-01 Pricing Validation Sprint
 * Based on pricing_validation_report_v1.json recommendations
 *
 * Pricing Model: Balanced Model (Sweet Spot Index: 81.6)
 * - Starter: $149/mo ($1,341 annual)
 * - Pro: $599/mo ($5,391 annual)
 * - Premium: $1,499/mo ($13,491 annual)
 * - Enterprise: $5,000/mo ($45,000 annual)
 *
 * Sprint 75 - Track B: Validated Pricing Rollout
 */

-- ============================================================================
-- 1. Clear existing plan policies (if any)
-- ============================================================================

DELETE FROM plan_policies WHERE tier IN ('starter', 'pro', 'premium', 'enterprise');

-- ============================================================================
-- 2. Insert Balanced Model pricing tiers
-- ============================================================================

/**
 * STARTER TIER - $149/mo
 * Target: Solo PR professionals, freelancers
 * Market Share: 30% of customers
 */
INSERT INTO plan_policies (
  tier,
  tier_display_name,
  tier_description,

  -- Pricing
  monthly_price_usd,
  annual_price_usd,
  stripe_price_id_monthly, -- TO BE UPDATED after Stripe configuration
  stripe_price_id_annual,

  -- Feature limits
  journalist_contacts_limit,
  ai_generations_monthly,
  media_searches_monthly,
  storage_gb_limit,
  max_users,
  podcast_syndications_monthly,
  citemind_queries_monthly, -- NULL = feature not available
  agent_sync_depth_days,

  -- Feature flags
  api_access,
  white_label_reports,
  custom_integrations,
  dedicated_csm,
  priority_support_hours,
  sla_uptime_percent,

  -- Metadata
  is_active,
  sort_order
) VALUES (
  'starter',
  'Starter',
  'For solo PR professionals and freelancers just getting started',

  -- Pricing (25% annual discount)
  149.00,
  1341.00, -- $112/mo equivalent

  -- Stripe IDs (placeholder - update after Stripe setup)
  NULL,
  NULL,

  -- Limits from PVS-01
  5000,    -- journalist_contacts_limit
  500,     -- ai_generations_monthly
  50,      -- media_searches_monthly
  5,       -- storage_gb_limit
  1,       -- max_users
  0,       -- podcast_syndications_monthly (not available)
  NULL,    -- citemind_queries_monthly (not available)
  30,      -- agent_sync_depth_days

  -- Premium features (not available on Starter)
  false,   -- api_access
  false,   -- white_label_reports
  false,   -- custom_integrations
  false,   -- dedicated_csm
  NULL,    -- priority_support_hours (email only)
  NULL,    -- sla_uptime_percent (no SLA)

  -- Active and first in sort order
  true,
  1
);

/**
 * PRO TIER - $599/mo
 * Target: Small agencies, in-house teams (2-10 people)
 * Market Share: 45% of customers (DEFAULT CHOICE)
 * Sweet Spot: Perfectly aligned with Van Westendorp optimal range ($399-$699)
 */
INSERT INTO plan_policies (
  tier,
  tier_display_name,
  tier_description,

  -- Pricing
  monthly_price_usd,
  annual_price_usd,
  stripe_price_id_monthly,
  stripe_price_id_annual,

  -- Feature limits
  journalist_contacts_limit,
  ai_generations_monthly,
  media_searches_monthly,
  storage_gb_limit,
  max_users,
  podcast_syndications_monthly,
  citemind_queries_monthly,
  agent_sync_depth_days,

  -- Feature flags
  api_access,
  white_label_reports,
  custom_integrations,
  dedicated_csm,
  priority_support_hours,
  sla_uptime_percent,

  -- Metadata
  is_active,
  is_recommended,
  sort_order
) VALUES (
  'pro',
  'Pro',
  'For growing teams and agencies with regular PR campaigns',

  -- Pricing (25% annual discount)
  599.00,
  5391.00, -- $449/mo equivalent

  -- Stripe IDs (placeholder)
  NULL,
  NULL,

  -- Limits from PVS-01
  50000,   -- journalist_contacts_limit
  2000,    -- ai_generations_monthly
  200,     -- media_searches_monthly
  20,      -- storage_gb_limit
  3,       -- max_users
  10,      -- podcast_syndications_monthly (limited)
  50,      -- citemind_queries_monthly (limited)
  90,      -- agent_sync_depth_days

  -- Premium features
  false,   -- api_access (not yet)
  false,   -- white_label_reports (not yet)
  false,   -- custom_integrations (not yet)
  false,   -- dedicated_csm (not yet)
  4,       -- priority_support_hours (< 4hr email/chat response)
  99.5,    -- sla_uptime_percent (99.5% uptime SLA)

  -- Active and recommended
  true,
  true,    -- is_recommended (default tier for trials)
  2
);

/**
 * PREMIUM TIER - $1,499/mo
 * Target: Mid-size agencies, enterprise PR teams
 * Market Share: 20% of customers
 */
INSERT INTO plan_policies (
  tier,
  tier_display_name,
  tier_description,

  -- Pricing
  monthly_price_usd,
  annual_price_usd,
  stripe_price_id_monthly,
  stripe_price_id_annual,

  -- Feature limits
  journalist_contacts_limit,
  ai_generations_monthly,
  media_searches_monthly,
  storage_gb_limit,
  max_users,
  podcast_syndications_monthly,
  citemind_queries_monthly,
  agent_sync_depth_days,

  -- Feature flags
  api_access,
  white_label_reports,
  custom_integrations,
  dedicated_csm,
  priority_support_hours,
  sla_uptime_percent,

  -- Metadata
  is_active,
  sort_order
) VALUES (
  'premium',
  'Premium',
  'For agencies needing podcast syndication, white-label reports, and unlimited AI',

  -- Pricing (25% annual discount)
  1499.00,
  13491.00, -- $1,124/mo equivalent

  -- Stripe IDs (placeholder)
  NULL,
  NULL,

  -- Limits from PVS-01
  100000,  -- journalist_contacts_limit
  5000,    -- ai_generations_monthly
  1000,    -- media_searches_monthly
  50,      -- storage_gb_limit
  10,      -- max_users
  50,      -- podcast_syndications_monthly (full access)
  NULL,    -- citemind_queries_monthly (unlimited)
  180,     -- agent_sync_depth_days

  -- Premium features
  false,   -- api_access (Enterprise only)
  true,    -- white_label_reports
  false,   -- custom_integrations (Enterprise only)
  false,   -- dedicated_csm (Enterprise only)
  2,       -- priority_support_hours (< 2hr phone/chat response)
  99.9,    -- sla_uptime_percent (99.9% uptime SLA)

  -- Active
  true,
  3
);

/**
 * ENTERPRISE TIER - $5,000+/mo
 * Target: Large agencies, multi-national PR teams
 * Market Share: 5% of customers
 * Note: Custom pricing, this is starting price
 */
INSERT INTO plan_policies (
  tier,
  tier_display_name,
  tier_description,

  -- Pricing
  monthly_price_usd,
  annual_price_usd,
  stripe_price_id_monthly,
  stripe_price_id_annual,

  -- Feature limits
  journalist_contacts_limit,
  ai_generations_monthly,
  media_searches_monthly,
  storage_gb_limit,
  max_users,
  podcast_syndications_monthly,
  citemind_queries_monthly,
  agent_sync_depth_days,

  -- Feature flags
  api_access,
  white_label_reports,
  custom_integrations,
  dedicated_csm,
  priority_support_hours,
  sla_uptime_percent,

  -- Metadata
  is_active,
  is_contact_sales,
  sort_order
) VALUES (
  'enterprise',
  'Enterprise',
  'For large organizations requiring API access, custom integrations, and dedicated support',

  -- Pricing (25% annual discount) - starting price, custom pricing available
  5000.00,
  45000.00, -- $3,750/mo equivalent

  -- Stripe IDs (manual invoice, may not use Stripe)
  NULL,
  NULL,

  -- Limits from PVS-01 (mostly unlimited or very high)
  NULL,    -- journalist_contacts_limit (unlimited)
  15000,   -- ai_generations_monthly (high limit, can be increased)
  5000,    -- media_searches_monthly
  200,     -- storage_gb_limit (can be increased)
  50,      -- max_users (can be increased)
  200,     -- podcast_syndications_monthly
  NULL,    -- citemind_queries_monthly (unlimited)
  365,     -- agent_sync_depth_days (1 year history)

  -- All premium features included
  true,    -- api_access
  true,    -- white_label_reports
  true,    -- custom_integrations
  true,    -- dedicated_csm
  1,       -- priority_support_hours (< 1hr response, 24/7)
  99.95,   -- sla_uptime_percent (99.95% uptime SLA)

  -- Active, contact sales for custom pricing
  true,
  true,    -- is_contact_sales
  4
);

-- ============================================================================
-- 3. Insert trial configurations
-- ============================================================================

/**
 * Default trial configuration
 * - 14 days duration
 * - Pro tier features shown
 * - Credit card required
 * - Downgrade to Starter if trial expires without payment
 */
INSERT INTO trial_configurations (
  tier,
  trial_duration_days,
  trial_features_tier,
  credit_card_required,
  auto_downgrade_tier
) VALUES
  ('starter', 14, 'pro', true, NULL),
  ('pro', 14, 'pro', true, 'starter'),
  ('premium', 14, 'pro', true, 'starter'),
  ('enterprise', 14, 'premium', false, 'premium'); -- Enterprise gets custom trial

-- ============================================================================
-- 4. Insert initial pricing history record
-- ============================================================================

INSERT INTO tier_pricing_history (
  tier,
  monthly_price_usd,
  annual_price_usd,
  effective_date,
  end_date,
  model_name,
  pricing_version,
  notes
) VALUES
  ('starter', 149.00, 1341.00, CURRENT_DATE, NULL, 'Balanced Model', 'v1.0', 'Initial validated pricing from PVS-01'),
  ('pro', 599.00, 5391.00, CURRENT_DATE, NULL, 'Balanced Model', 'v1.0', 'Sweet spot price - Van Westendorp optimal range'),
  ('premium', 1499.00, 13491.00, CURRENT_DATE, NULL, 'Balanced Model', 'v1.0', 'Premium tier with podcast + white-label'),
  ('enterprise', 5000.00, 45000.00, CURRENT_DATE, NULL, 'Balanced Model', 'v1.0', 'Starting price - custom pricing available');

-- ============================================================================
-- 5. Update organizations table defaults
-- ============================================================================

-- Set default trial tier to Pro (recommended tier)
ALTER TABLE organizations
ALTER COLUMN trial_tier SET DEFAULT 'pro';

-- ============================================================================
-- 6. Verification queries
-- ============================================================================

-- Verify all tiers are inserted correctly
DO $$
DECLARE
  tier_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tier_count FROM plan_policies WHERE is_active = true;

  IF tier_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 active tiers, found %', tier_count;
  END IF;

  RAISE NOTICE 'Plan policies seed completed successfully: % active tiers', tier_count;
END $$;

-- Display inserted tiers for verification
SELECT
  tier,
  tier_display_name,
  monthly_price_usd,
  annual_price_usd,
  journalist_contacts_limit,
  ai_generations_monthly,
  max_users,
  api_access,
  white_label_reports,
  is_recommended,
  is_contact_sales
FROM plan_policies
WHERE is_active = true
ORDER BY sort_order;

-- ============================================================================
-- Seed complete
-- ============================================================================

COMMENT ON TABLE plan_policies IS 'Balanced Model pricing from PVS-01 - Sweet Spot Index: 81.6, 96.4% weighted avg margin';
