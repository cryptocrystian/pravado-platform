-- =====================================================
-- MIGRATION: Goal-Driven Strategy Layer + Outcome Attribution
-- Sprint 26: Strategic intelligence and outcome tracking
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Goal types aligned with campaign objectives
CREATE TYPE goal_type AS ENUM (
  'AWARENESS',        -- Brand visibility and reach
  'COVERAGE',         -- Media placements and mentions
  'LEADS',            -- Lead generation and acquisition
  'PARTNERSHIPS',     -- Strategic partnerships formed
  'REFERRALS',        -- Referral generation
  'CONVERSIONS',      -- Sales or conversion events
  'POSITIONING'       -- Brand positioning and messaging
);

-- Goal priority levels
CREATE TYPE goal_priority AS ENUM (
  'CRITICAL',         -- Must-have, campaign success depends on it
  'IMPORTANT',        -- Should-have, significant impact
  'NICE_TO_HAVE'      -- Optional, nice bonus if achieved
);

-- How goals are tracked
CREATE TYPE tracking_method AS ENUM (
  'ENGAGEMENT',       -- Tracked via engagement metrics
  'INTERACTIONS',     -- Tracked via interaction counts
  'PLACEMENTS',       -- Tracked via media placements
  'CUSTOM'            -- Custom tracking logic
);

-- Attribution event types
CREATE TYPE attribution_event_type AS ENUM (
  'REPLY_RECEIVED',       -- Contact replied to outreach
  'COVERAGE_SECURED',     -- Media coverage obtained
  'CONVERSION_MADE',      -- Conversion or sale completed
  'PARTNERSHIP_FORMED',   -- Partnership established
  'REFERRAL_RECEIVED',    -- Referral obtained
  'MEETING_SCHEDULED',    -- Meeting or call scheduled
  'CONTENT_PUBLISHED',    -- Content went live
  'ENGAGEMENT_MILESTONE', -- Engagement threshold reached
  'LEAD_QUALIFIED',       -- Lead qualified
  'OPPORTUNITY_CREATED',  -- Sales opportunity created
  'CUSTOM_EVENT'          -- Custom attribution event
);

-- Goal status
CREATE TYPE goal_status AS ENUM (
  'DRAFT',        -- Not yet active
  'ACTIVE',       -- Currently being tracked
  'ON_TRACK',     -- Making good progress
  'AT_RISK',      -- Behind schedule or underperforming
  'COMPLETED',    -- Successfully achieved
  'FAILED',       -- Did not achieve target
  'CANCELED'      -- Goal was canceled
);

-- =====================================================
-- TABLES
-- =====================================================

-- Campaign Goals
CREATE TABLE campaign_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Goal definition
  goal_type goal_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Target metrics (flexible JSONB structure)
  -- Examples:
  -- { "reach": 100000, "impressions": 500000 }
  -- { "placements": 10, "tier1_outlets": 3 }
  -- { "leads": 50, "qualified_leads": 20 }
  target_metric JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Goal metadata
  priority goal_priority NOT NULL DEFAULT 'IMPORTANT',
  tracking_method tracking_method NOT NULL DEFAULT 'CUSTOM',

  -- Success criteria (flexible conditions)
  -- Example: { "min_placements": 5, "min_engagement_rate": 0.02 }
  success_conditions JSONB DEFAULT '{}'::jsonb,

  -- Timeline
  due_date TIMESTAMPTZ,

  -- Status tracking
  status goal_status NOT NULL DEFAULT 'DRAFT',
  completion_score DECIMAL(5,2) DEFAULT 0.0, -- 0-100%

  -- User tracking
  created_by UUID NOT NULL REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_completion_score CHECK (completion_score >= 0 AND completion_score <= 100),
  CONSTRAINT valid_target_metric CHECK (jsonb_typeof(target_metric) = 'object')
);

-- Indexes for campaign_goals
CREATE INDEX idx_campaign_goals_campaign ON campaign_goals(campaign_id);
CREATE INDEX idx_campaign_goals_organization ON campaign_goals(organization_id);
CREATE INDEX idx_campaign_goals_status ON campaign_goals(status);
CREATE INDEX idx_campaign_goals_priority ON campaign_goals(priority);
CREATE INDEX idx_campaign_goals_type ON campaign_goals(goal_type);
CREATE INDEX idx_campaign_goals_due_date ON campaign_goals(due_date) WHERE due_date IS NOT NULL;

-- Goal Outcomes (real-time metrics)
CREATE TABLE goal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES campaign_goals(id) ON DELETE CASCADE,

  -- Current metrics (auto-updated by attribution events)
  -- Mirrors structure of target_metric for comparison
  current_metric JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Performance tracking
  total_attributed_events INTEGER NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,

  -- Trend analysis (optional)
  daily_progress JSONB DEFAULT '[]'::jsonb, -- Array of daily snapshots

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_goal_outcome UNIQUE(goal_id),
  CONSTRAINT valid_current_metric CHECK (jsonb_typeof(current_metric) = 'object')
);

-- Indexes for goal_outcomes
CREATE INDEX idx_goal_outcomes_goal ON goal_outcomes(goal_id);
CREATE INDEX idx_goal_outcomes_organization ON goal_outcomes(organization_id);
CREATE INDEX idx_goal_outcomes_last_event ON goal_outcomes(last_event_at);

-- Attribution Events (normalized tracking)
CREATE TABLE attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event classification
  event_type attribution_event_type NOT NULL,
  event_subtype TEXT, -- Optional subcategory

  -- Entity references (flexible - not all will be populated)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  agent_run_id UUID, -- Reference to agent execution that triggered this
  goal_id UUID REFERENCES campaign_goals(id) ON DELETE SET NULL,

  -- Event details
  description TEXT,
  value DECIMAL(12,2), -- Optional monetary or numeric value

  -- Context metadata
  -- Examples:
  -- { "outlet_name": "TechCrunch", "tier": 1 }
  -- { "lead_source": "linkedin", "qualification_score": 85 }
  context JSONB DEFAULT '{}'::jsonb,

  -- Attribution weight (for multi-touch attribution)
  attribution_weight DECIMAL(5,4) DEFAULT 1.0, -- 0.0-1.0

  -- User attribution
  attributed_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_attribution_weight CHECK (attribution_weight >= 0 AND attribution_weight <= 1),
  CONSTRAINT valid_context CHECK (jsonb_typeof(context) = 'object'),
  CONSTRAINT must_have_campaign_or_goal CHECK (campaign_id IS NOT NULL OR goal_id IS NOT NULL)
);

-- Indexes for attribution_events
CREATE INDEX idx_attribution_events_campaign ON attribution_events(campaign_id);
CREATE INDEX idx_attribution_events_goal ON attribution_events(goal_id);
CREATE INDEX idx_attribution_events_contact ON attribution_events(contact_id);
CREATE INDEX idx_attribution_events_organization ON attribution_events(organization_id);
CREATE INDEX idx_attribution_events_type ON attribution_events(event_type);
CREATE INDEX idx_attribution_events_timestamp ON attribution_events(event_timestamp);
CREATE INDEX idx_attribution_events_agent_run ON attribution_events(agent_run_id) WHERE agent_run_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE campaign_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_events ENABLE ROW LEVEL SECURITY;

-- RLS for campaign_goals
CREATE POLICY campaign_goals_org_isolation ON campaign_goals
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- RLS for goal_outcomes
CREATE POLICY goal_outcomes_org_isolation ON goal_outcomes
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- RLS for attribution_events
CREATE POLICY attribution_events_org_isolation ON attribution_events
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

/**
 * Insert attribution event with automatic metadata extraction
 */
CREATE OR REPLACE FUNCTION insert_attribution_event(
  p_organization_id UUID,
  p_event_type attribution_event_type,
  p_campaign_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_agent_run_id UUID DEFAULT NULL,
  p_goal_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_value DECIMAL DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_attribution_weight DECIMAL DEFAULT 1.0,
  p_attributed_to_user_id UUID DEFAULT NULL,
  p_event_subtype TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert event
  INSERT INTO attribution_events (
    organization_id,
    event_type,
    event_subtype,
    campaign_id,
    contact_id,
    agent_run_id,
    goal_id,
    description,
    value,
    context,
    attribution_weight,
    attributed_to_user_id
  ) VALUES (
    p_organization_id,
    p_event_type,
    p_event_subtype,
    p_campaign_id,
    p_contact_id,
    p_agent_run_id,
    p_goal_id,
    p_description,
    p_value,
    p_context,
    p_attribution_weight,
    p_attributed_to_user_id
  )
  RETURNING id INTO v_event_id;

  -- If goal_id is provided, trigger progress calculation
  IF p_goal_id IS NOT NULL THEN
    PERFORM calculate_goal_progress(p_goal_id, p_organization_id);
  END IF;

  -- If campaign_id is provided but no goal_id, update all campaign goals
  IF p_campaign_id IS NOT NULL AND p_goal_id IS NULL THEN
    PERFORM calculate_goal_progress(g.id, p_organization_id)
    FROM campaign_goals g
    WHERE g.campaign_id = p_campaign_id
      AND g.organization_id = p_organization_id
      AND g.status IN ('ACTIVE', 'ON_TRACK', 'AT_RISK');
  END IF;

  RETURN v_event_id;
END;
$$;

/**
 * Calculate goal progress based on attribution events
 */
CREATE OR REPLACE FUNCTION calculate_goal_progress(
  p_goal_id UUID,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal RECORD;
  v_current_metric JSONB;
  v_completion_score DECIMAL;
  v_total_events INTEGER;
  v_new_status goal_status;
BEGIN
  -- Get goal details
  SELECT * INTO v_goal
  FROM campaign_goals
  WHERE id = p_goal_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;

  -- Count total attributed events
  SELECT COUNT(*)::INTEGER INTO v_total_events
  FROM attribution_events
  WHERE goal_id = p_goal_id
    AND organization_id = p_organization_id;

  -- Build current_metric based on goal_type
  CASE v_goal.goal_type
    WHEN 'COVERAGE' THEN
      -- Count COVERAGE_SECURED events
      v_current_metric := jsonb_build_object(
        'placements', (
          SELECT COUNT(*)
          FROM attribution_events
          WHERE goal_id = p_goal_id
            AND event_type = 'COVERAGE_SECURED'
            AND organization_id = p_organization_id
        )
      );

    WHEN 'LEADS' THEN
      -- Count LEAD_QUALIFIED events
      v_current_metric := jsonb_build_object(
        'leads', (
          SELECT COUNT(*)
          FROM attribution_events
          WHERE goal_id = p_goal_id
            AND event_type IN ('LEAD_QUALIFIED', 'REPLY_RECEIVED')
            AND organization_id = p_organization_id
        )
      );

    WHEN 'CONVERSIONS' THEN
      -- Count CONVERSION_MADE events and sum values
      v_current_metric := jsonb_build_object(
        'conversions', (
          SELECT COUNT(*)
          FROM attribution_events
          WHERE goal_id = p_goal_id
            AND event_type = 'CONVERSION_MADE'
            AND organization_id = p_organization_id
        ),
        'total_value', (
          SELECT COALESCE(SUM(value), 0)
          FROM attribution_events
          WHERE goal_id = p_goal_id
            AND event_type = 'CONVERSION_MADE'
            AND organization_id = p_organization_id
        )
      );

    WHEN 'PARTNERSHIPS' THEN
      -- Count PARTNERSHIP_FORMED events
      v_current_metric := jsonb_build_object(
        'partnerships', (
          SELECT COUNT(*)
          FROM attribution_events
          WHERE goal_id = p_goal_id
            AND event_type = 'PARTNERSHIP_FORMED'
            AND organization_id = p_organization_id
        )
      );

    WHEN 'REFERRALS' THEN
      -- Count REFERRAL_RECEIVED events
      v_current_metric := jsonb_build_object(
        'referrals', (
          SELECT COUNT(*)
          FROM attribution_events
          WHERE goal_id = p_goal_id
            AND event_type = 'REFERRAL_RECEIVED'
            AND organization_id = p_organization_id
        )
      );

    ELSE
      -- Generic: count all events
      v_current_metric := jsonb_build_object(
        'total_events', v_total_events
      );
  END CASE;

  -- Calculate completion score
  -- Simple approach: compare first key in target_metric to current_metric
  DECLARE
    v_target_key TEXT;
    v_target_value NUMERIC;
    v_current_value NUMERIC;
  BEGIN
    -- Get first key from target_metric
    SELECT key INTO v_target_key
    FROM jsonb_each(v_goal.target_metric)
    LIMIT 1;

    IF v_target_key IS NOT NULL THEN
      v_target_value := (v_goal.target_metric->>v_target_key)::NUMERIC;
      v_current_value := COALESCE((v_current_metric->>v_target_key)::NUMERIC, 0);

      v_completion_score := LEAST(100, (v_current_value / NULLIF(v_target_value, 0) * 100));
    ELSE
      v_completion_score := 0;
    END IF;
  END;

  -- Determine new status based on completion and due date
  IF v_completion_score >= 100 THEN
    v_new_status := 'COMPLETED';
  ELSIF v_goal.due_date IS NOT NULL AND v_goal.due_date < NOW() THEN
    IF v_completion_score < 50 THEN
      v_new_status := 'FAILED';
    ELSE
      v_new_status := 'AT_RISK';
    END IF;
  ELSIF v_completion_score >= 75 THEN
    v_new_status := 'ON_TRACK';
  ELSIF v_completion_score >= 50 THEN
    v_new_status := 'ACTIVE';
  ELSE
    v_new_status := 'AT_RISK';
  END IF;

  -- Update or insert goal_outcomes
  INSERT INTO goal_outcomes (
    organization_id,
    goal_id,
    current_metric,
    total_attributed_events,
    last_event_at,
    updated_at
  ) VALUES (
    p_organization_id,
    p_goal_id,
    v_current_metric,
    v_total_events,
    NOW(),
    NOW()
  )
  ON CONFLICT (goal_id) DO UPDATE SET
    current_metric = EXCLUDED.current_metric,
    total_attributed_events = EXCLUDED.total_attributed_events,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = NOW();

  -- Update goal status and completion score
  UPDATE campaign_goals
  SET
    completion_score = v_completion_score,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_goal_id
    AND organization_id = p_organization_id;
END;
$$;

/**
 * Get goal summary for a campaign
 */
CREATE OR REPLACE FUNCTION get_goal_summary(
  p_campaign_id UUID,
  p_organization_id UUID
)
RETURNS TABLE(
  goal_id UUID,
  goal_type goal_type,
  title TEXT,
  description TEXT,
  priority goal_priority,
  status goal_status,
  target_metric JSONB,
  current_metric JSONB,
  completion_score DECIMAL,
  total_events INTEGER,
  due_date TIMESTAMPTZ,
  is_overdue BOOLEAN,
  days_until_due INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.goal_type,
    g.title,
    g.description,
    g.priority,
    g.status,
    g.target_metric,
    COALESCE(o.current_metric, '{}'::jsonb),
    g.completion_score,
    COALESCE(o.total_attributed_events, 0),
    g.due_date,
    (g.due_date IS NOT NULL AND g.due_date < NOW()) AS is_overdue,
    CASE
      WHEN g.due_date IS NOT NULL THEN
        EXTRACT(DAY FROM (g.due_date - NOW()))::INTEGER
      ELSE NULL
    END AS days_until_due
  FROM campaign_goals g
  LEFT JOIN goal_outcomes o ON o.goal_id = g.id
  WHERE g.campaign_id = p_campaign_id
    AND g.organization_id = p_organization_id
  ORDER BY
    CASE g.priority
      WHEN 'CRITICAL' THEN 1
      WHEN 'IMPORTANT' THEN 2
      WHEN 'NICE_TO_HAVE' THEN 3
    END,
    g.due_date NULLS LAST;
END;
$$;

/**
 * Get attribution events for a goal
 */
CREATE OR REPLACE FUNCTION get_goal_attribution_events(
  p_goal_id UUID,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  event_id UUID,
  event_type attribution_event_type,
  event_subtype TEXT,
  description TEXT,
  value DECIMAL,
  context JSONB,
  attribution_weight DECIMAL,
  contact_name TEXT,
  event_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.event_type,
    ae.event_subtype,
    ae.description,
    ae.value,
    ae.context,
    ae.attribution_weight,
    c.name AS contact_name,
    ae.event_timestamp
  FROM attribution_events ae
  LEFT JOIN contacts c ON c.id = ae.contact_id
  WHERE ae.goal_id = p_goal_id
    AND ae.organization_id = p_organization_id
  ORDER BY ae.event_timestamp DESC
  LIMIT p_limit;
END;
$$;

/**
 * Get campaign attribution events (across all goals)
 */
CREATE OR REPLACE FUNCTION get_campaign_attribution_events(
  p_campaign_id UUID,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  event_id UUID,
  event_type attribution_event_type,
  event_subtype TEXT,
  description TEXT,
  value DECIMAL,
  context JSONB,
  goal_title TEXT,
  contact_name TEXT,
  event_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.event_type,
    ae.event_subtype,
    ae.description,
    ae.value,
    ae.context,
    g.title AS goal_title,
    c.name AS contact_name,
    ae.event_timestamp
  FROM attribution_events ae
  LEFT JOIN campaign_goals g ON g.id = ae.goal_id
  LEFT JOIN contacts c ON c.id = ae.contact_id
  WHERE ae.campaign_id = p_campaign_id
    AND ae.organization_id = p_organization_id
  ORDER BY ae.event_timestamp DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for campaign_goals
CREATE TRIGGER update_campaign_goals_updated_at
  BEFORE UPDATE ON campaign_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for goal_outcomes
CREATE TRIGGER update_goal_outcomes_updated_at
  BEFORE UPDATE ON goal_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE campaign_goals IS 'Strategic goals for campaigns with target metrics and success criteria';
COMMENT ON TABLE goal_outcomes IS 'Real-time tracking of goal progress based on attribution events';
COMMENT ON TABLE attribution_events IS 'Normalized tracking of all success events contributing to goals';

COMMENT ON FUNCTION insert_attribution_event IS 'Insert attribution event and trigger goal progress calculation';
COMMENT ON FUNCTION calculate_goal_progress IS 'Calculate goal completion score and update status based on attribution events';
COMMENT ON FUNCTION get_goal_summary IS 'Get comprehensive summary of all goals for a campaign';
COMMENT ON FUNCTION get_goal_attribution_events IS 'Get all attribution events for a specific goal';
COMMENT ON FUNCTION get_campaign_attribution_events IS 'Get all attribution events for a campaign across all goals';
