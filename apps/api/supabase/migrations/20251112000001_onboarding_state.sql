-- =====================================================
-- ONBOARDING STATE MIGRATION
-- Sprint 73: User Onboarding + Trial-to-Paid Conversion Automation
-- =====================================================
-- Track user onboarding progress and trial lifecycle

-- =====================================================
-- ONBOARDING STATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization mapping
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Wizard progress (0-4, 4 = complete)
  current_step INTEGER NOT NULL DEFAULT 0,
  step_1_org_setup BOOLEAN DEFAULT false,
  step_2_api_keys BOOLEAN DEFAULT false,
  step_3_first_agent BOOLEAN DEFAULT false,
  step_4_usage_demo BOOLEAN DEFAULT false,
  wizard_completed BOOLEAN DEFAULT false,
  wizard_completed_at TIMESTAMP WITH TIME ZONE,

  -- Trial lifecycle
  trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_duration_days INTEGER NOT NULL DEFAULT 7,
  trial_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),

  -- Grace period (24 hours after expiry before hard cutoff)
  grace_period_hours INTEGER NOT NULL DEFAULT 24,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE,
  in_grace_period BOOLEAN DEFAULT false,

  -- Trial budget tracking
  trial_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 2.00,
  trial_budget_used_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  trial_budget_exhausted BOOLEAN DEFAULT false,
  trial_budget_exhausted_at TIMESTAMP WITH TIME ZONE,

  -- Trial expiry status
  trial_expired BOOLEAN DEFAULT false,
  trial_expired_at TIMESTAMP WITH TIME ZONE,
  trial_expiry_reason TEXT, -- 'time_limit', 'budget_limit', 'manual'

  -- Upgrade prompts
  upgrade_prompted BOOLEAN DEFAULT false,
  upgrade_prompted_at TIMESTAMP WITH TIME ZONE,
  upgrade_prompt_count INTEGER DEFAULT 0,
  last_upgrade_prompt_at TIMESTAMP WITH TIME ZONE,

  -- Conversion tracking
  converted_to_paid BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_to_tier TEXT,

  -- Email tracking
  trial_day_1_email_sent BOOLEAN DEFAULT false,
  trial_day_3_email_sent BOOLEAN DEFAULT false,
  trial_day_7_email_sent BOOLEAN DEFAULT false,
  trial_expired_email_sent BOOLEAN DEFAULT false,

  -- Metadata
  onboarding_metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_current_step CHECK (current_step >= 0 AND current_step <= 4),
  CONSTRAINT valid_trial_budget CHECK (trial_budget_usd >= 0),
  CONSTRAINT valid_trial_budget_used CHECK (trial_budget_used_usd >= 0)
);

-- =====================================================
-- TRIAL ACTIVITY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS trial_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Activity tracking
  activity_type TEXT NOT NULL, -- 'trial_started', 'step_completed', 'limit_warning', 'trial_expired', 'upgraded', 'downgraded'
  activity_description TEXT NOT NULL,

  -- Context
  step_number INTEGER,
  budget_at_time NUMERIC(10, 6),
  days_remaining INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN (
      'trial_started',
      'step_completed',
      'limit_warning_80',
      'limit_warning_95',
      'trial_expired',
      'grace_period_started',
      'grace_period_ended',
      'upgraded',
      'downgraded',
      'budget_exhausted'
    )
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Onboarding State
CREATE INDEX idx_onboarding_state_org
  ON onboarding_state(organization_id);

CREATE INDEX idx_onboarding_state_trial_status
  ON onboarding_state(trial_expired, in_grace_period);

CREATE INDEX idx_onboarding_state_trial_expiry
  ON onboarding_state(trial_expires_at)
  WHERE trial_expired = false;

CREATE INDEX idx_onboarding_state_wizard_progress
  ON onboarding_state(current_step, wizard_completed);

-- Trial Activity Log
CREATE INDEX idx_trial_activity_org
  ON trial_activity_log(organization_id, created_at DESC);

CREATE INDEX idx_trial_activity_type
  ON trial_activity_log(activity_type, created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Initialize onboarding state for new organization
 */
CREATE OR REPLACE FUNCTION initialize_onboarding_state(
  org_id UUID,
  trial_days INTEGER DEFAULT 7,
  trial_budget NUMERIC DEFAULT 2.00
)
RETURNS UUID AS $$
DECLARE
  state_id UUID;
BEGIN
  INSERT INTO onboarding_state (
    organization_id,
    trial_duration_days,
    trial_budget_usd,
    trial_started_at,
    trial_expires_at
  ) VALUES (
    org_id,
    trial_days,
    trial_budget,
    now(),
    now() + (trial_days || ' days')::INTERVAL
  )
  ON CONFLICT (organization_id) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO state_id;

  -- Log trial start
  INSERT INTO trial_activity_log (
    organization_id,
    activity_type,
    activity_description,
    days_remaining,
    metadata
  ) VALUES (
    org_id,
    'trial_started',
    'Trial period started',
    trial_days,
    jsonb_build_object(
      'trial_duration_days', trial_days,
      'trial_budget_usd', trial_budget
    )
  );

  RETURN state_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Mark onboarding step as complete
 */
CREATE OR REPLACE FUNCTION complete_onboarding_step(
  org_id UUID,
  step_num INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_progress INTEGER;
BEGIN
  -- Update step completion
  UPDATE onboarding_state
  SET
    current_step = GREATEST(current_step, step_num),
    step_1_org_setup = CASE WHEN step_num >= 1 THEN true ELSE step_1_org_setup END,
    step_2_api_keys = CASE WHEN step_num >= 2 THEN true ELSE step_2_api_keys END,
    step_3_first_agent = CASE WHEN step_num >= 3 THEN true ELSE step_3_first_agent END,
    step_4_usage_demo = CASE WHEN step_num >= 4 THEN true ELSE step_4_usage_demo END,
    wizard_completed = (step_num >= 4),
    wizard_completed_at = CASE WHEN step_num >= 4 AND wizard_completed_at IS NULL THEN now() ELSE wizard_completed_at END,
    updated_at = now()
  WHERE organization_id = org_id
  RETURNING current_step INTO current_progress;

  -- Log step completion
  INSERT INTO trial_activity_log (
    organization_id,
    activity_type,
    activity_description,
    step_number
  ) VALUES (
    org_id,
    'step_completed',
    'Onboarding step ' || step_num || ' completed',
    step_num
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Get trial status for organization
 */
CREATE OR REPLACE FUNCTION get_trial_status(org_id UUID)
RETURNS TABLE (
  trial_active BOOLEAN,
  trial_expired BOOLEAN,
  in_grace_period BOOLEAN,
  days_remaining INTEGER,
  budget_remaining NUMERIC,
  budget_used_percent NUMERIC,
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    NOT os.trial_expired AND NOT os.trial_budget_exhausted AS trial_active,
    os.trial_expired,
    os.in_grace_period,
    GREATEST(0, EXTRACT(DAY FROM (os.trial_expires_at - now()))::INTEGER) AS days_remaining,
    GREATEST(0, os.trial_budget_usd - os.trial_budget_used_usd) AS budget_remaining,
    LEAST(100, (os.trial_budget_used_usd / NULLIF(os.trial_budget_usd, 0) * 100)::NUMERIC(5, 2)) AS budget_used_percent,
    os.trial_expires_at,
    os.grace_period_ends_at
  FROM onboarding_state os
  WHERE os.organization_id = org_id;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Update trial budget usage
 */
CREATE OR REPLACE FUNCTION update_trial_budget_usage(
  org_id UUID,
  cost_increment NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  new_budget_used NUMERIC;
  budget_limit NUMERIC;
  is_exhausted BOOLEAN;
BEGIN
  -- Update budget usage
  UPDATE onboarding_state
  SET
    trial_budget_used_usd = trial_budget_used_usd + cost_increment,
    updated_at = now()
  WHERE organization_id = org_id
  RETURNING trial_budget_used_usd, trial_budget_usd INTO new_budget_used, budget_limit;

  -- Check if budget exhausted
  is_exhausted := new_budget_used >= budget_limit;

  IF is_exhausted THEN
    UPDATE onboarding_state
    SET
      trial_budget_exhausted = true,
      trial_budget_exhausted_at = now(),
      trial_expired = true,
      trial_expired_at = COALESCE(trial_expired_at, now()),
      trial_expiry_reason = COALESCE(trial_expiry_reason, 'budget_limit')
    WHERE organization_id = org_id
      AND trial_budget_exhausted = false;

    -- Log budget exhaustion
    IF FOUND THEN
      INSERT INTO trial_activity_log (
        organization_id,
        activity_type,
        activity_description,
        budget_at_time
      ) VALUES (
        org_id,
        'budget_exhausted',
        'Trial budget limit reached',
        new_budget_used
      );
    END IF;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Mark trial as expired
 */
CREATE OR REPLACE FUNCTION expire_trial(
  org_id UUID,
  expiry_reason TEXT DEFAULT 'time_limit'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE onboarding_state
  SET
    trial_expired = true,
    trial_expired_at = now(),
    trial_expiry_reason = expiry_reason,
    grace_period_ends_at = now() + (grace_period_hours || ' hours')::INTERVAL,
    in_grace_period = true,
    updated_at = now()
  WHERE organization_id = org_id
    AND trial_expired = false;

  IF FOUND THEN
    -- Log trial expiry
    INSERT INTO trial_activity_log (
      organization_id,
      activity_type,
      activity_description,
      metadata
    ) VALUES (
      org_id,
      'trial_expired',
      'Trial period expired: ' || expiry_reason,
      jsonb_build_object('reason', expiry_reason)
    );

    -- Log grace period start
    INSERT INTO trial_activity_log (
      organization_id,
      activity_type,
      activity_description
    ) VALUES (
      org_id,
      'grace_period_started',
      'Grace period started (24 hours)'
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * End grace period
 */
CREATE OR REPLACE FUNCTION end_grace_period(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE onboarding_state
  SET
    in_grace_period = false,
    updated_at = now()
  WHERE organization_id = org_id
    AND in_grace_period = true;

  IF FOUND THEN
    INSERT INTO trial_activity_log (
      organization_id,
      activity_type,
      activity_description
    ) VALUES (
      org_id,
      'grace_period_ended',
      'Grace period ended - trial fully expired'
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Mark trial as converted to paid
 */
CREATE OR REPLACE FUNCTION convert_trial_to_paid(
  org_id UUID,
  new_tier TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE onboarding_state
  SET
    converted_to_paid = true,
    converted_at = now(),
    converted_to_tier = new_tier,
    trial_expired = false,
    in_grace_period = false,
    updated_at = now()
  WHERE organization_id = org_id;

  IF FOUND THEN
    INSERT INTO trial_activity_log (
      organization_id,
      activity_type,
      activity_description,
      metadata
    ) VALUES (
      org_id,
      'upgraded',
      'Trial converted to ' || new_tier || ' plan',
      jsonb_build_object('tier', new_tier)
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Get organizations with expiring trials (for cron job)
 */
CREATE OR REPLACE FUNCTION get_expiring_trials(hours_threshold INTEGER DEFAULT 24)
RETURNS TABLE (
  organization_id UUID,
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  hours_remaining NUMERIC,
  budget_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    os.organization_id,
    os.trial_expires_at,
    EXTRACT(EPOCH FROM (os.trial_expires_at - now())) / 3600 AS hours_remaining,
    GREATEST(0, os.trial_budget_usd - os.trial_budget_used_usd) AS budget_remaining
  FROM onboarding_state os
  WHERE os.trial_expired = false
    AND os.trial_expires_at <= now() + (hours_threshold || ' hours')::INTERVAL
    AND os.trial_expires_at > now()
  ORDER BY os.trial_expires_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get organizations in grace period (for cron job)
 */
CREATE OR REPLACE FUNCTION get_grace_period_organizations()
RETURNS TABLE (
  organization_id UUID,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE,
  hours_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    os.organization_id,
    os.grace_period_ends_at,
    EXTRACT(EPOCH FROM (os.grace_period_ends_at - now())) / 3600 AS hours_remaining
  FROM onboarding_state os
  WHERE os.in_grace_period = true
    AND os.grace_period_ends_at IS NOT NULL
  ORDER BY os.grace_period_ends_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- AUTOMATIC UPDATE TRIGGERS
-- =====================================================

/**
 * Update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_onboarding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_state_timestamp
  BEFORE UPDATE ON onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE onboarding_state IS 'Sprint 73: Onboarding wizard progress and trial lifecycle tracking';
COMMENT ON TABLE trial_activity_log IS 'Sprint 73: Audit log for trial lifecycle events';

COMMENT ON COLUMN onboarding_state.trial_expires_at IS 'When trial period ends (default 7 days)';
COMMENT ON COLUMN onboarding_state.grace_period_ends_at IS 'When grace period ends (24 hours after trial expiry)';
COMMENT ON COLUMN onboarding_state.trial_budget_usd IS 'Trial budget limit (default $2.00)';
COMMENT ON COLUMN onboarding_state.trial_budget_used_usd IS 'Amount of budget consumed during trial';

-- =====================================================
-- GRANTS (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_activity_log ENABLE ROW LEVEL SECURITY;

-- Organizations can read their own onboarding state
CREATE POLICY onboarding_state_select_own
  ON onboarding_state
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Organizations can update their own onboarding state
CREATE POLICY onboarding_state_update_own
  ON onboarding_state
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Organizations can read their own trial activity
CREATE POLICY trial_activity_select_own
  ON trial_activity_log
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Only system/admin can modify
CREATE POLICY onboarding_state_admin_all
  ON onboarding_state
  FOR ALL
  USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY trial_activity_admin_all
  ON trial_activity_log
  FOR ALL
  USING (current_setting('app.user_role', true) = 'admin');
