-- =====================================================
-- SMART GOAL TRACKING + OKR INTELLIGENCE
-- Core Infrastructure: Goal setting, progress tracking, AI insights
-- Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Goal scope enum
 * Level at which the goal is set
 */
CREATE TYPE goal_scope AS ENUM (
  'ORG',        -- Organization-wide goal
  'TEAM',       -- Team-level goal
  'USER',       -- Individual user goal
  'CAMPAIGN'    -- Campaign-specific goal
);

/**
 * Goal type enum
 * Category of the goal
 */
CREATE TYPE goal_type AS ENUM (
  'OUTREACH',         -- Outreach volume or coverage
  'CONVERSION',       -- Conversion rate or count
  'PLACEMENT',        -- Media placements
  'LEAD_SCORE',       -- Lead quality metrics
  'SENTIMENT',        -- Sentiment scores
  'RESPONSE_RATE',    -- Response rate targets
  'CUSTOM'            -- Custom metric
);

/**
 * Goal status enum
 * Current state of the goal
 */
CREATE TYPE goal_status AS ENUM (
  'NOT_STARTED',  -- Goal created but not started
  'IN_PROGRESS',  -- Actively being worked on
  'ACHIEVED',     -- Successfully completed
  'MISSED',       -- Failed to achieve by deadline
  'BLOCKED',      -- Blocked by dependencies or issues
  'DEFERRED'      -- Postponed to later date
);

-- =====================================================
-- TABLES
-- =====================================================

/**
 * Goals
 * Core goal definitions
 */
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Scope and ownership
  scope goal_scope NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Goal definition
  title TEXT NOT NULL,
  description TEXT,
  goal_type goal_type NOT NULL,

  -- Metrics
  target_value DECIMAL(12, 2) NOT NULL,
  current_value DECIMAL(12, 2) DEFAULT 0,
  unit TEXT, -- e.g., "contacts", "placements", "%", "score"

  -- Timeline
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status goal_status NOT NULL DEFAULT 'NOT_STARTED',

  -- Parent/child relationships
  parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  is_key_result BOOLEAN DEFAULT false, -- Is this an OKR key result?

  -- Progress tracking
  progress_percentage DECIMAL(5, 2) DEFAULT 0, -- 0.00 to 100.00
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Risk and priority
  risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
  priority INTEGER DEFAULT 0, -- Higher = more important
  is_stretch_goal BOOLEAN DEFAULT false,

  -- AI insights
  alignment_score DECIMAL(3, 2), -- 0.00 to 1.00
  alignment_notes TEXT,
  conflict_warnings TEXT[],
  recommended_actions TEXT[],
  last_analyzed_at TIMESTAMPTZ,

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  achieved_at TIMESTAMPTZ,
  missed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Goal Progress
 * Progress updates and milestones
 */
CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  -- Progress details
  previous_value DECIMAL(12, 2),
  new_value DECIMAL(12, 2) NOT NULL,
  progress_delta DECIMAL(12, 2),
  progress_percentage DECIMAL(5, 2),

  -- Update info
  update_type TEXT, -- 'manual', 'automatic', 'milestone'
  notes TEXT,
  blockers TEXT[],
  wins TEXT[],

  -- Velocity metrics
  velocity DECIMAL(10, 2), -- Rate of progress
  days_to_completion INTEGER, -- Estimated days remaining

  -- Metadata
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_milestone BOOLEAN DEFAULT false,
  milestone_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * OKR Snapshots
 * Periodic summaries of objectives and key results
 */
CREATE TABLE okr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Snapshot metadata
  snapshot_name TEXT NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Scope
  scope goal_scope NOT NULL,
  scope_id UUID, -- team_id, user_id, or campaign_id

  -- Aggregated metrics
  total_goals INTEGER DEFAULT 0,
  achieved_goals INTEGER DEFAULT 0,
  in_progress_goals INTEGER DEFAULT 0,
  at_risk_goals INTEGER DEFAULT 0,
  blocked_goals INTEGER DEFAULT 0,

  -- Performance metrics
  average_progress DECIMAL(5, 2),
  average_velocity DECIMAL(10, 2),
  on_track_percentage DECIMAL(5, 2),

  -- Goal breakdown by type
  outreach_goals INTEGER DEFAULT 0,
  conversion_goals INTEGER DEFAULT 0,
  placement_goals INTEGER DEFAULT 0,
  lead_score_goals INTEGER DEFAULT 0,
  sentiment_goals INTEGER DEFAULT 0,
  response_rate_goals INTEGER DEFAULT 0,

  -- AI-generated summary
  ai_summary TEXT,
  key_wins TEXT[],
  key_challenges TEXT[],
  strategic_recommendations TEXT[],
  stretch_opportunities TEXT[],

  -- Metadata
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Goal Events
 * Event log for goal lifecycle
 */
CREATE TABLE goal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'created', 'updated', 'achieved', 'missed', 'status_changed', 'blocked', 'unblocked'
  event_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- User tracking
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Goals
CREATE INDEX idx_goals_org ON goals(organization_id);
CREATE INDEX idx_goals_scope ON goals(scope);
CREATE INDEX idx_goals_owner ON goals(owner_id);
CREATE INDEX idx_goals_campaign ON goals(campaign_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_type ON goals(goal_type);
CREATE INDEX idx_goals_dates ON goals(start_date, end_date);
CREATE INDEX idx_goals_parent ON goals(parent_goal_id);
CREATE INDEX idx_goals_active ON goals(is_active);

-- Goal Progress
CREATE INDEX idx_goal_progress_org ON goal_progress(organization_id);
CREATE INDEX idx_goal_progress_goal ON goal_progress(goal_id);
CREATE INDEX idx_goal_progress_created ON goal_progress(created_at DESC);

-- OKR Snapshots
CREATE INDEX idx_okr_snapshots_org ON okr_snapshots(organization_id);
CREATE INDEX idx_okr_snapshots_scope ON okr_snapshots(scope);
CREATE INDEX idx_okr_snapshots_period ON okr_snapshots(period_start, period_end);

-- Goal Events
CREATE INDEX idx_goal_events_org ON goal_events(organization_id);
CREATE INDEX idx_goal_events_goal ON goal_events(goal_id);
CREATE INDEX idx_goal_events_type ON goal_events(event_type);
CREATE INDEX idx_goal_events_created ON goal_events(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

/**
 * Log goal event
 * Records a goal lifecycle event
 */
CREATE OR REPLACE FUNCTION log_goal_event(
  p_organization_id UUID,
  p_goal_id UUID,
  p_event_type TEXT,
  p_event_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_triggered_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO goal_events (
    organization_id,
    goal_id,
    event_type,
    event_description,
    metadata,
    triggered_by
  ) VALUES (
    p_organization_id,
    p_goal_id,
    p_event_type,
    p_event_description,
    p_metadata,
    p_triggered_by
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Update goal progress
 * Records progress update and recalculates metrics
 */
CREATE OR REPLACE FUNCTION update_goal_progress(
  p_organization_id UUID,
  p_goal_id UUID,
  p_new_value DECIMAL,
  p_notes TEXT DEFAULT NULL,
  p_blockers TEXT[] DEFAULT NULL,
  p_wins TEXT[] DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL,
  p_is_milestone BOOLEAN DEFAULT false,
  p_milestone_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_progress_id UUID;
  v_current_value DECIMAL;
  v_target_value DECIMAL;
  v_progress_pct DECIMAL;
  v_delta DECIMAL;
  v_velocity DECIMAL;
  v_days_remaining INTEGER;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Get current goal values
  SELECT current_value, target_value, start_date, end_date
  INTO v_current_value, v_target_value, v_start_date, v_end_date
  FROM goals
  WHERE id = p_goal_id AND organization_id = p_organization_id;

  -- Calculate delta
  v_delta := p_new_value - COALESCE(v_current_value, 0);

  -- Calculate progress percentage
  IF v_target_value > 0 THEN
    v_progress_pct := (p_new_value / v_target_value * 100);
    v_progress_pct := LEAST(100, GREATEST(0, v_progress_pct));
  ELSE
    v_progress_pct := 0;
  END IF;

  -- Calculate velocity (progress per day)
  IF v_start_date IS NOT NULL AND NOW() > v_start_date THEN
    v_velocity := p_new_value / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_start_date)) / 86400);
  ELSE
    v_velocity := 0;
  END IF;

  -- Estimate days to completion
  IF v_velocity > 0 AND p_new_value < v_target_value THEN
    v_days_remaining := CEIL((v_target_value - p_new_value) / v_velocity);
  ELSE
    v_days_remaining := NULL;
  END IF;

  -- Insert progress record
  INSERT INTO goal_progress (
    organization_id,
    goal_id,
    previous_value,
    new_value,
    progress_delta,
    progress_percentage,
    update_type,
    notes,
    blockers,
    wins,
    velocity,
    days_to_completion,
    updated_by,
    is_milestone,
    milestone_name
  ) VALUES (
    p_organization_id,
    p_goal_id,
    v_current_value,
    p_new_value,
    v_delta,
    v_progress_pct,
    CASE WHEN p_updated_by IS NULL THEN 'automatic' ELSE 'manual' END,
    p_notes,
    p_blockers,
    p_wins,
    v_velocity,
    v_days_remaining,
    p_updated_by,
    p_is_milestone,
    p_milestone_name
  ) RETURNING id INTO v_progress_id;

  -- Update goal current value and progress
  UPDATE goals
  SET
    current_value = p_new_value,
    progress_percentage = v_progress_pct,
    last_updated_at = NOW(),
    last_updated_by = p_updated_by,
    status = CASE
      WHEN v_progress_pct >= 100 THEN 'ACHIEVED'::goal_status
      WHEN v_progress_pct > 0 THEN 'IN_PROGRESS'::goal_status
      ELSE status
    END,
    achieved_at = CASE
      WHEN v_progress_pct >= 100 AND achieved_at IS NULL THEN NOW()
      ELSE achieved_at
    END
  WHERE id = p_goal_id AND organization_id = p_organization_id;

  -- Log event if milestone
  IF p_is_milestone THEN
    PERFORM log_goal_event(
      p_organization_id,
      p_goal_id,
      'milestone_reached',
      p_milestone_name,
      jsonb_build_object('progress_percentage', v_progress_pct),
      p_updated_by
    );
  END IF;

  RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Calculate goal metrics
 * Computes risk level and other derived metrics
 */
CREATE OR REPLACE FUNCTION calculate_goal_metrics(
  p_goal_id UUID,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_goal RECORD;
  v_latest_progress RECORD;
  v_avg_velocity DECIMAL;
  v_days_elapsed INTEGER;
  v_days_total INTEGER;
  v_time_pct DECIMAL;
  v_risk_level TEXT;
  v_on_track BOOLEAN;
BEGIN
  -- Get goal data
  SELECT * INTO v_goal
  FROM goals
  WHERE id = p_goal_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;

  -- Get latest progress
  SELECT * INTO v_latest_progress
  FROM goal_progress
  WHERE goal_id = p_goal_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate time metrics
  v_days_elapsed := EXTRACT(EPOCH FROM (NOW() - v_goal.start_date)) / 86400;
  v_days_total := EXTRACT(EPOCH FROM (v_goal.end_date - v_goal.start_date)) / 86400;
  v_time_pct := (v_days_elapsed / GREATEST(1, v_days_total) * 100);

  -- Get average velocity from last 7 days
  SELECT AVG(velocity) INTO v_avg_velocity
  FROM goal_progress
  WHERE goal_id = p_goal_id
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Determine if on track
  v_on_track := v_goal.progress_percentage >= (v_time_pct * 0.8);

  -- Calculate risk level
  IF v_goal.status IN ('ACHIEVED', 'MISSED', 'DEFERRED') THEN
    v_risk_level := 'none';
  ELSIF v_goal.status = 'BLOCKED' THEN
    v_risk_level := 'critical';
  ELSIF v_goal.progress_percentage < (v_time_pct * 0.5) THEN
    v_risk_level := 'high';
  ELSIF v_goal.progress_percentage < (v_time_pct * 0.7) THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;

  -- Update goal with risk level
  UPDATE goals
  SET risk_level = v_risk_level
  WHERE id = p_goal_id;

  RETURN jsonb_build_object(
    'goal_id', p_goal_id,
    'progress_percentage', v_goal.progress_percentage,
    'time_percentage', v_time_pct,
    'on_track', v_on_track,
    'risk_level', v_risk_level,
    'average_velocity', v_avg_velocity,
    'days_elapsed', v_days_elapsed,
    'days_remaining', v_days_total - v_days_elapsed
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Generate OKR snapshot
 * Creates a snapshot of goals for a given scope and period
 */
CREATE OR REPLACE FUNCTION generate_okr_snapshot(
  p_organization_id UUID,
  p_snapshot_name TEXT,
  p_snapshot_type TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_scope goal_scope,
  p_scope_id UUID DEFAULT NULL,
  p_generated_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_total_goals INTEGER;
  v_achieved_goals INTEGER;
  v_in_progress_goals INTEGER;
  v_at_risk_goals INTEGER;
  v_blocked_goals INTEGER;
  v_avg_progress DECIMAL;
  v_on_track_pct DECIMAL;
BEGIN
  -- Count goals by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ACHIEVED'),
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'),
    COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical')),
    COUNT(*) FILTER (WHERE status = 'BLOCKED'),
    AVG(progress_percentage)
  INTO
    v_total_goals,
    v_achieved_goals,
    v_in_progress_goals,
    v_at_risk_goals,
    v_blocked_goals,
    v_avg_progress
  FROM goals
  WHERE organization_id = p_organization_id
    AND scope = p_scope
    AND (p_scope_id IS NULL OR
         (scope = 'USER' AND owner_id = p_scope_id) OR
         (scope = 'TEAM' AND team_id = p_scope_id) OR
         (scope = 'CAMPAIGN' AND campaign_id = p_scope_id))
    AND start_date <= p_period_end
    AND end_date >= p_period_start
    AND is_active = true;

  -- Calculate on-track percentage
  IF v_total_goals > 0 THEN
    v_on_track_pct := ((v_total_goals - v_at_risk_goals)::DECIMAL / v_total_goals * 100);
  ELSE
    v_on_track_pct := 0;
  END IF;

  -- Insert snapshot
  INSERT INTO okr_snapshots (
    organization_id,
    snapshot_name,
    snapshot_type,
    period_start,
    period_end,
    scope,
    scope_id,
    total_goals,
    achieved_goals,
    in_progress_goals,
    at_risk_goals,
    blocked_goals,
    average_progress,
    on_track_percentage,
    outreach_goals,
    conversion_goals,
    placement_goals,
    lead_score_goals,
    sentiment_goals,
    response_rate_goals,
    generated_by
  )
  SELECT
    p_organization_id,
    p_snapshot_name,
    p_snapshot_type,
    p_period_start,
    p_period_end,
    p_scope,
    p_scope_id,
    v_total_goals,
    v_achieved_goals,
    v_in_progress_goals,
    v_at_risk_goals,
    v_blocked_goals,
    v_avg_progress,
    v_on_track_pct,
    COUNT(*) FILTER (WHERE goal_type = 'OUTREACH'),
    COUNT(*) FILTER (WHERE goal_type = 'CONVERSION'),
    COUNT(*) FILTER (WHERE goal_type = 'PLACEMENT'),
    COUNT(*) FILTER (WHERE goal_type = 'LEAD_SCORE'),
    COUNT(*) FILTER (WHERE goal_type = 'SENTIMENT'),
    COUNT(*) FILTER (WHERE goal_type = 'RESPONSE_RATE'),
    p_generated_by
  FROM goals
  WHERE organization_id = p_organization_id
    AND scope = p_scope
    AND (p_scope_id IS NULL OR
         (scope = 'USER' AND owner_id = p_scope_id) OR
         (scope = 'TEAM' AND team_id = p_scope_id) OR
         (scope = 'CAMPAIGN' AND campaign_id = p_scope_id))
    AND start_date <= p_period_end
    AND end_date >= p_period_start
    AND is_active = true
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Summarize goal progress
 * Returns comprehensive goal summary data
 */
CREATE OR REPLACE FUNCTION summarize_goal_progress(
  p_organization_id UUID,
  p_goal_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_goal JSONB;
  v_progress_history JSONB;
  v_recent_blockers JSONB;
  v_recent_wins JSONB;
  v_metrics JSONB;
BEGIN
  -- Get goal details
  SELECT jsonb_build_object(
    'id', id,
    'title', title,
    'description', description,
    'goal_type', goal_type,
    'target_value', target_value,
    'current_value', current_value,
    'unit', unit,
    'progress_percentage', progress_percentage,
    'status', status,
    'risk_level', risk_level,
    'start_date', start_date,
    'end_date', end_date
  )
  INTO v_goal
  FROM goals
  WHERE id = p_goal_id AND organization_id = p_organization_id;

  -- Get progress history (last 10)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'new_value', new_value,
      'progress_percentage', progress_percentage,
      'notes', notes,
      'created_at', created_at
    ) ORDER BY created_at DESC
  )
  INTO v_progress_history
  FROM (
    SELECT * FROM goal_progress
    WHERE goal_id = p_goal_id
    ORDER BY created_at DESC
    LIMIT 10
  ) subq;

  -- Get recent blockers
  SELECT jsonb_agg(DISTINCT blocker)
  INTO v_recent_blockers
  FROM goal_progress, LATERAL unnest(blockers) AS blocker
  WHERE goal_id = p_goal_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND blockers IS NOT NULL;

  -- Get recent wins
  SELECT jsonb_agg(DISTINCT win)
  INTO v_recent_wins
  FROM goal_progress, LATERAL unnest(wins) AS win
  WHERE goal_id = p_goal_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND wins IS NOT NULL;

  -- Get metrics
  SELECT calculate_goal_metrics(p_goal_id, p_organization_id) INTO v_metrics;

  RETURN jsonb_build_object(
    'goal', v_goal,
    'progress_history', COALESCE(v_progress_history, '[]'::jsonb),
    'recent_blockers', COALESCE(v_recent_blockers, '[]'::jsonb),
    'recent_wins', COALESCE(v_recent_wins, '[]'::jsonb),
    'metrics', v_metrics
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_events ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY goals_org_isolation ON goals
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Goal Progress policies
CREATE POLICY goal_progress_org_isolation ON goal_progress
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- OKR Snapshots policies
CREATE POLICY okr_snapshots_org_isolation ON okr_snapshots
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Goal Events policies
CREATE POLICY goal_events_org_isolation ON goal_events
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE goals IS 'Unified goal tracking across org, team, user, and campaign levels';
COMMENT ON TABLE goal_progress IS 'Progress updates and milestones for goals';
COMMENT ON TABLE okr_snapshots IS 'Periodic OKR summaries with AI-generated insights';
COMMENT ON TABLE goal_events IS 'Event log for goal lifecycle tracking';

COMMENT ON FUNCTION log_goal_event IS 'Records a goal lifecycle event';
COMMENT ON FUNCTION update_goal_progress IS 'Records progress update and recalculates metrics';
COMMENT ON FUNCTION calculate_goal_metrics IS 'Computes risk level and derived metrics';
COMMENT ON FUNCTION generate_okr_snapshot IS 'Creates a snapshot of goals for reporting';
COMMENT ON FUNCTION summarize_goal_progress IS 'Returns comprehensive goal summary data';
