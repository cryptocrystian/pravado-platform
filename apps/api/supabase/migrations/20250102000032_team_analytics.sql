-- =====================================================
-- TEAM ANALYTICS & BEHAVIORAL INSIGHTS
-- Sprint 32: Activity tracking, anomaly detection, coaching
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Activity type enum
 * Types of activities users and agents can perform
 */
CREATE TYPE activity_type AS ENUM (
  'AGENT_RUN',
  'FOLLOWUP_SENT',
  'GOAL_UPDATED',
  'COMMENT_ADDED',
  'TASK_CREATED',
  'TASK_COMPLETED',
  'REPORT_GENERATED',
  'REVIEW_SUBMITTED',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'CONTACT_ADDED',
  'PERSONA_ASSIGNED',
  'PROMPT_CREATED',
  'STRATEGY_UPDATED'
);

/**
 * Anomaly type enum
 * Types of behavioral anomalies that can be detected
 */
CREATE TYPE anomaly_type AS ENUM (
  'LOW_ACTIVITY',      -- Activity dropped below threshold
  'SPIKE',             -- Sudden increase in activity
  'PATTERN_SHIFT',     -- Change in typical work pattern
  'OUTLIER_BEHAVIOR'   -- Behavior significantly different from team
);

/**
 * Engagement mode enum
 * How the activity was performed
 */
CREATE TYPE engagement_mode AS ENUM (
  'MANUAL',        -- User performed action manually
  'AI_ASSISTED',   -- User initiated, AI helped
  'AUTONOMOUS'     -- Fully autonomous AI action
);

-- =====================================================
-- TABLES
-- =====================================================

/**
 * Team Activity Events
 * Core activity feed for all user and agent actions
 */
CREATE TABLE team_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- User info
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,

  -- Activity details
  activity_type activity_type NOT NULL,
  engagement_mode engagement_mode NOT NULL DEFAULT 'MANUAL',

  -- Context
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  agent_id UUID,
  contact_id UUID,
  task_id UUID,

  -- Activity metadata
  activity_title TEXT,
  activity_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Duration tracking (in seconds)
  duration_seconds INTEGER,

  -- Success/quality metrics
  success BOOLEAN DEFAULT true,
  quality_score DECIMAL(3, 2), -- 0.00 to 1.00

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Team Behavior Metrics
 * Aggregated statistics per user over time windows
 */
CREATE TABLE team_behavior_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Time window
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Activity counts by type
  agent_runs INTEGER DEFAULT 0,
  followups_sent INTEGER DEFAULT 0,
  goals_updated INTEGER DEFAULT 0,
  comments_added INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  reviews_submitted INTEGER DEFAULT 0,

  -- Engagement breakdown
  manual_actions INTEGER DEFAULT 0,
  ai_assisted_actions INTEGER DEFAULT 0,
  autonomous_actions INTEGER DEFAULT 0,

  -- Performance metrics
  total_activities INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2), -- 0.00 to 100.00
  average_quality_score DECIMAL(3, 2), -- 0.00 to 1.00
  average_duration_seconds INTEGER,

  -- Productivity metrics
  active_days INTEGER DEFAULT 0,
  peak_activity_hour INTEGER, -- 0-23
  campaigns_touched INTEGER DEFAULT 0,

  -- Comparison metrics
  team_percentile DECIMAL(5, 2), -- 0.00 to 100.00 (where they rank vs team)
  velocity_trend TEXT, -- 'increasing', 'stable', 'decreasing'

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_id, period_start, period_end, window_type)
);

/**
 * Behavioral Anomalies
 * Flagged unusual patterns for review
 */
CREATE TABLE behavioral_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Anomaly classification
  anomaly_type anomaly_type NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'

  -- Detection details
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detection_window_start TIMESTAMPTZ NOT NULL,
  detection_window_end TIMESTAMPTZ NOT NULL,

  -- Metrics
  baseline_value DECIMAL(10, 2),
  observed_value DECIMAL(10, 2),
  deviation_percent DECIMAL(5, 2),

  -- Context
  metric_name TEXT NOT NULL,
  activity_types TEXT[], -- Which activity types were anomalous
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Analysis
  description TEXT NOT NULL,
  possible_causes TEXT[],
  recommended_actions TEXT[],

  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- AI insights
  ai_analysis JSONB,
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Team Activity Events
CREATE INDEX idx_team_activity_events_org ON team_activity_events(organization_id);
CREATE INDEX idx_team_activity_events_user ON team_activity_events(user_id);
CREATE INDEX idx_team_activity_events_campaign ON team_activity_events(campaign_id);
CREATE INDEX idx_team_activity_events_type ON team_activity_events(activity_type);
CREATE INDEX idx_team_activity_events_occurred ON team_activity_events(occurred_at DESC);
CREATE INDEX idx_team_activity_events_org_user_occurred ON team_activity_events(organization_id, user_id, occurred_at DESC);

-- Team Behavior Metrics
CREATE INDEX idx_team_behavior_metrics_org ON team_behavior_metrics(organization_id);
CREATE INDEX idx_team_behavior_metrics_user ON team_behavior_metrics(user_id);
CREATE INDEX idx_team_behavior_metrics_period ON team_behavior_metrics(period_start, period_end);
CREATE INDEX idx_team_behavior_metrics_org_user ON team_behavior_metrics(organization_id, user_id);

-- Behavioral Anomalies
CREATE INDEX idx_behavioral_anomalies_org ON behavioral_anomalies(organization_id);
CREATE INDEX idx_behavioral_anomalies_user ON behavioral_anomalies(user_id);
CREATE INDEX idx_behavioral_anomalies_type ON behavioral_anomalies(anomaly_type);
CREATE INDEX idx_behavioral_anomalies_severity ON behavioral_anomalies(severity);
CREATE INDEX idx_behavioral_anomalies_resolved ON behavioral_anomalies(is_resolved);
CREATE INDEX idx_behavioral_anomalies_detected ON behavioral_anomalies(detected_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

/**
 * Log team event
 * Records a team activity event
 */
CREATE OR REPLACE FUNCTION log_team_event(
  p_organization_id UUID,
  p_user_id UUID,
  p_activity_type activity_type,
  p_engagement_mode engagement_mode DEFAULT 'MANUAL',
  p_campaign_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_activity_title TEXT DEFAULT NULL,
  p_activity_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_quality_score DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user info
  SELECT email, name INTO v_user_email, v_user_name
  FROM users
  WHERE id = p_user_id;

  -- Insert event
  INSERT INTO team_activity_events (
    organization_id,
    user_id,
    user_email,
    user_name,
    activity_type,
    engagement_mode,
    campaign_id,
    agent_id,
    contact_id,
    task_id,
    activity_title,
    activity_description,
    metadata,
    duration_seconds,
    success,
    quality_score
  ) VALUES (
    p_organization_id,
    p_user_id,
    v_user_email,
    v_user_name,
    p_activity_type,
    p_engagement_mode,
    p_campaign_id,
    p_agent_id,
    p_contact_id,
    p_task_id,
    p_activity_title,
    p_activity_description,
    p_metadata,
    p_duration_seconds,
    p_success,
    p_quality_score
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Calculate behavior metrics
 * Aggregates activity data for a user over a time window
 */
CREATE OR REPLACE FUNCTION calculate_behavior_metrics(
  p_organization_id UUID,
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_window_type TEXT DEFAULT 'daily'
) RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
  v_agent_runs INTEGER;
  v_followups_sent INTEGER;
  v_goals_updated INTEGER;
  v_comments_added INTEGER;
  v_tasks_created INTEGER;
  v_tasks_completed INTEGER;
  v_reports_generated INTEGER;
  v_reviews_submitted INTEGER;
  v_manual_actions INTEGER;
  v_ai_assisted_actions INTEGER;
  v_autonomous_actions INTEGER;
  v_total_activities INTEGER;
  v_success_count INTEGER;
  v_total_quality DECIMAL;
  v_quality_count INTEGER;
  v_avg_duration INTEGER;
  v_active_days INTEGER;
  v_peak_hour INTEGER;
  v_campaigns_count INTEGER;
  v_team_avg_activities DECIMAL;
  v_percentile DECIMAL;
BEGIN
  -- Count activities by type
  SELECT
    COUNT(*) FILTER (WHERE activity_type = 'AGENT_RUN'),
    COUNT(*) FILTER (WHERE activity_type = 'FOLLOWUP_SENT'),
    COUNT(*) FILTER (WHERE activity_type = 'GOAL_UPDATED'),
    COUNT(*) FILTER (WHERE activity_type = 'COMMENT_ADDED'),
    COUNT(*) FILTER (WHERE activity_type = 'TASK_CREATED'),
    COUNT(*) FILTER (WHERE activity_type = 'TASK_COMPLETED'),
    COUNT(*) FILTER (WHERE activity_type = 'REPORT_GENERATED'),
    COUNT(*) FILTER (WHERE activity_type = 'REVIEW_SUBMITTED'),
    COUNT(*) FILTER (WHERE engagement_mode = 'MANUAL'),
    COUNT(*) FILTER (WHERE engagement_mode = 'AI_ASSISTED'),
    COUNT(*) FILTER (WHERE engagement_mode = 'AUTONOMOUS'),
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    SUM(quality_score),
    COUNT(*) FILTER (WHERE quality_score IS NOT NULL),
    AVG(duration_seconds)::INTEGER,
    COUNT(DISTINCT DATE(occurred_at)),
    COUNT(DISTINCT campaign_id)
  INTO
    v_agent_runs,
    v_followups_sent,
    v_goals_updated,
    v_comments_added,
    v_tasks_created,
    v_tasks_completed,
    v_reports_generated,
    v_reviews_submitted,
    v_manual_actions,
    v_ai_assisted_actions,
    v_autonomous_actions,
    v_total_activities,
    v_success_count,
    v_total_quality,
    v_quality_count,
    v_avg_duration,
    v_active_days,
    v_campaigns_count
  FROM team_activity_events
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND occurred_at >= p_period_start
    AND occurred_at < p_period_end;

  -- Get peak activity hour
  SELECT EXTRACT(HOUR FROM occurred_at)::INTEGER
  INTO v_peak_hour
  FROM team_activity_events
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND occurred_at >= p_period_start
    AND occurred_at < p_period_end
  GROUP BY EXTRACT(HOUR FROM occurred_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Calculate team average for percentile
  SELECT AVG(activity_count)
  INTO v_team_avg_activities
  FROM (
    SELECT user_id, COUNT(*) as activity_count
    FROM team_activity_events
    WHERE organization_id = p_organization_id
      AND occurred_at >= p_period_start
      AND occurred_at < p_period_end
    GROUP BY user_id
  ) subq;

  -- Calculate percentile (simplified - could use more sophisticated calculation)
  IF v_team_avg_activities > 0 THEN
    v_percentile := LEAST(100, (v_total_activities::DECIMAL / v_team_avg_activities) * 50);
  ELSE
    v_percentile := 50;
  END IF;

  -- Insert or update metrics
  INSERT INTO team_behavior_metrics (
    organization_id,
    user_id,
    period_start,
    period_end,
    window_type,
    agent_runs,
    followups_sent,
    goals_updated,
    comments_added,
    tasks_created,
    tasks_completed,
    reports_generated,
    reviews_submitted,
    manual_actions,
    ai_assisted_actions,
    autonomous_actions,
    total_activities,
    success_rate,
    average_quality_score,
    average_duration_seconds,
    active_days,
    peak_activity_hour,
    campaigns_touched,
    team_percentile
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_period_start,
    p_period_end,
    p_window_type,
    v_agent_runs,
    v_followups_sent,
    v_goals_updated,
    v_comments_added,
    v_tasks_created,
    v_tasks_completed,
    v_reports_generated,
    v_reviews_submitted,
    v_manual_actions,
    v_ai_assisted_actions,
    v_autonomous_actions,
    v_total_activities,
    CASE WHEN v_total_activities > 0 THEN (v_success_count::DECIMAL / v_total_activities * 100) ELSE NULL END,
    CASE WHEN v_quality_count > 0 THEN (v_total_quality / v_quality_count) ELSE NULL END,
    v_avg_duration,
    v_active_days,
    v_peak_hour,
    v_campaigns_count,
    v_percentile
  )
  ON CONFLICT (organization_id, user_id, period_start, period_end, window_type)
  DO UPDATE SET
    agent_runs = EXCLUDED.agent_runs,
    followups_sent = EXCLUDED.followups_sent,
    goals_updated = EXCLUDED.goals_updated,
    comments_added = EXCLUDED.comments_added,
    tasks_created = EXCLUDED.tasks_created,
    tasks_completed = EXCLUDED.tasks_completed,
    reports_generated = EXCLUDED.reports_generated,
    reviews_submitted = EXCLUDED.reviews_submitted,
    manual_actions = EXCLUDED.manual_actions,
    ai_assisted_actions = EXCLUDED.ai_assisted_actions,
    autonomous_actions = EXCLUDED.autonomous_actions,
    total_activities = EXCLUDED.total_activities,
    success_rate = EXCLUDED.success_rate,
    average_quality_score = EXCLUDED.average_quality_score,
    average_duration_seconds = EXCLUDED.average_duration_seconds,
    active_days = EXCLUDED.active_days,
    peak_activity_hour = EXCLUDED.peak_activity_hour,
    campaigns_touched = EXCLUDED.campaigns_touched,
    team_percentile = EXCLUDED.team_percentile,
    calculated_at = NOW()
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Detect behavioral anomalies
 * Identifies unusual patterns in user behavior
 */
CREATE OR REPLACE FUNCTION detect_behavioral_anomalies(
  p_organization_id UUID,
  p_user_id UUID,
  p_detection_window_start TIMESTAMPTZ,
  p_detection_window_end TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_current_activity INTEGER;
  v_baseline_activity DECIMAL;
  v_std_dev DECIMAL;
  v_deviation DECIMAL;
  v_anomalies JSONB := '[]'::jsonb;
  v_anomaly JSONB;
  v_anomaly_id UUID;
BEGIN
  -- Get current period activity
  SELECT COUNT(*)
  INTO v_current_activity
  FROM team_activity_events
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND occurred_at >= p_detection_window_start
    AND occurred_at < p_detection_window_end;

  -- Get baseline (average of previous 4 similar periods)
  SELECT AVG(total_activities), STDDEV(total_activities)
  INTO v_baseline_activity, v_std_dev
  FROM team_behavior_metrics
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND period_end <= p_detection_window_start
  ORDER BY period_end DESC
  LIMIT 4;

  -- Calculate deviation
  IF v_baseline_activity IS NOT NULL AND v_baseline_activity > 0 THEN
    v_deviation := ((v_current_activity - v_baseline_activity) / v_baseline_activity * 100);

    -- LOW_ACTIVITY: 50% or more below baseline
    IF v_deviation <= -50 THEN
      INSERT INTO behavioral_anomalies (
        organization_id,
        user_id,
        anomaly_type,
        severity,
        detection_window_start,
        detection_window_end,
        baseline_value,
        observed_value,
        deviation_percent,
        metric_name,
        description,
        possible_causes,
        recommended_actions,
        confidence_score
      ) VALUES (
        p_organization_id,
        p_user_id,
        'LOW_ACTIVITY',
        CASE
          WHEN v_deviation <= -80 THEN 'critical'
          WHEN v_deviation <= -70 THEN 'high'
          WHEN v_deviation <= -60 THEN 'medium'
          ELSE 'low'
        END,
        p_detection_window_start,
        p_detection_window_end,
        v_baseline_activity,
        v_current_activity,
        v_deviation,
        'total_activities',
        'Activity significantly below normal levels',
        ARRAY['User on leave', 'Shifted responsibilities', 'Technical issues', 'Decreased engagement'],
        ARRAY['Check in with user', 'Review workload distribution', 'Verify system access'],
        0.85
      )
      RETURNING id INTO v_anomaly_id;

      v_anomaly := jsonb_build_object(
        'id', v_anomaly_id,
        'type', 'LOW_ACTIVITY',
        'severity', CASE
          WHEN v_deviation <= -80 THEN 'critical'
          WHEN v_deviation <= -70 THEN 'high'
          WHEN v_deviation <= -60 THEN 'medium'
          ELSE 'low'
        END,
        'deviation', v_deviation
      );
      v_anomalies := v_anomalies || v_anomaly;
    END IF;

    -- SPIKE: 100% or more above baseline (and above std dev threshold)
    IF v_deviation >= 100 AND (v_std_dev IS NULL OR v_current_activity > v_baseline_activity + (2 * v_std_dev)) THEN
      INSERT INTO behavioral_anomalies (
        organization_id,
        user_id,
        anomaly_type,
        severity,
        detection_window_start,
        detection_window_end,
        baseline_value,
        observed_value,
        deviation_percent,
        metric_name,
        description,
        possible_causes,
        recommended_actions,
        confidence_score
      ) VALUES (
        p_organization_id,
        p_user_id,
        'SPIKE',
        CASE
          WHEN v_deviation >= 300 THEN 'critical'
          WHEN v_deviation >= 200 THEN 'high'
          WHEN v_deviation >= 150 THEN 'medium'
          ELSE 'low'
        END,
        p_detection_window_start,
        p_detection_window_end,
        v_baseline_activity,
        v_current_activity,
        v_deviation,
        'total_activities',
        'Unusual spike in activity detected',
        ARRAY['New campaign launch', 'Catching up on backlog', 'Process change', 'Automation testing'],
        ARRAY['Verify spike is intentional', 'Check for quality vs quantity', 'Review for burnout risk'],
        0.80
      )
      RETURNING id INTO v_anomaly_id;

      v_anomaly := jsonb_build_object(
        'id', v_anomaly_id,
        'type', 'SPIKE',
        'severity', CASE
          WHEN v_deviation >= 300 THEN 'critical'
          WHEN v_deviation >= 200 THEN 'high'
          WHEN v_deviation >= 150 THEN 'medium'
          ELSE 'low'
        END,
        'deviation', v_deviation
      );
      v_anomalies := v_anomalies || v_anomaly;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'anomalies', v_anomalies,
    'total_detected', jsonb_array_length(v_anomalies)
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Get team activity feed
 * Retrieves activity events with filters
 */
CREATE OR REPLACE FUNCTION get_team_activity_feed(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_activity_types activity_type[] DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  activity_type activity_type,
  engagement_mode engagement_mode,
  campaign_id UUID,
  activity_title TEXT,
  activity_description TEXT,
  metadata JSONB,
  success BOOLEAN,
  quality_score DECIMAL,
  occurred_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tae.id,
    tae.user_id,
    tae.user_email,
    tae.user_name,
    tae.activity_type,
    tae.engagement_mode,
    tae.campaign_id,
    tae.activity_title,
    tae.activity_description,
    tae.metadata,
    tae.success,
    tae.quality_score,
    tae.occurred_at,
    COUNT(*) OVER() as total_count
  FROM team_activity_events tae
  WHERE tae.organization_id = p_organization_id
    AND (p_user_id IS NULL OR tae.user_id = p_user_id)
    AND (p_campaign_id IS NULL OR tae.campaign_id = p_campaign_id)
    AND (p_activity_types IS NULL OR tae.activity_type = ANY(p_activity_types))
    AND (p_start_date IS NULL OR tae.occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR tae.occurred_at < p_end_date)
  ORDER BY tae.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

/**
 * Summarize behavioral patterns
 * Returns aggregated insights about team behavior
 */
CREATE OR REPLACE FUNCTION summarize_behavioral_patterns(
  p_organization_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
  v_top_performers JSONB;
  v_activity_distribution JSONB;
  v_engagement_breakdown JSONB;
  v_active_users INTEGER;
  v_total_activities INTEGER;
BEGIN
  -- Get top performers
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', user_id,
      'user_name', user_name,
      'total_activities', activity_count,
      'success_rate', success_rate
    ) ORDER BY activity_count DESC
  )
  INTO v_top_performers
  FROM (
    SELECT
      user_id,
      MAX(user_name) as user_name,
      COUNT(*) as activity_count,
      (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*) * 100) as success_rate
    FROM team_activity_events
    WHERE organization_id = p_organization_id
      AND occurred_at >= p_period_start
      AND occurred_at < p_period_end
    GROUP BY user_id
    ORDER BY activity_count DESC
    LIMIT 10
  ) subq;

  -- Get activity distribution
  SELECT jsonb_object_agg(activity_type, count)
  INTO v_activity_distribution
  FROM (
    SELECT activity_type::TEXT, COUNT(*) as count
    FROM team_activity_events
    WHERE organization_id = p_organization_id
      AND occurred_at >= p_period_start
      AND occurred_at < p_period_end
    GROUP BY activity_type
  ) subq;

  -- Get engagement breakdown
  SELECT jsonb_object_agg(engagement_mode, count)
  INTO v_engagement_breakdown
  FROM (
    SELECT engagement_mode::TEXT, COUNT(*) as count
    FROM team_activity_events
    WHERE organization_id = p_organization_id
      AND occurred_at >= p_period_start
      AND occurred_at < p_period_end
    GROUP BY engagement_mode
  ) subq;

  -- Get counts
  SELECT COUNT(DISTINCT user_id), COUNT(*)
  INTO v_active_users, v_total_activities
  FROM team_activity_events
  WHERE organization_id = p_organization_id
    AND occurred_at >= p_period_start
    AND occurred_at < p_period_end;

  -- Build summary
  v_summary := jsonb_build_object(
    'period_start', p_period_start,
    'period_end', p_period_end,
    'active_users', v_active_users,
    'total_activities', v_total_activities,
    'top_performers', COALESCE(v_top_performers, '[]'::jsonb),
    'activity_distribution', COALESCE(v_activity_distribution, '{}'::jsonb),
    'engagement_breakdown', COALESCE(v_engagement_breakdown, '{}'::jsonb)
  );

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE team_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_behavior_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_anomalies ENABLE ROW LEVEL SECURITY;

-- Team Activity Events policies
CREATE POLICY team_activity_events_org_isolation ON team_activity_events
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Team Behavior Metrics policies
CREATE POLICY team_behavior_metrics_org_isolation ON team_behavior_metrics
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Behavioral Anomalies policies
CREATE POLICY behavioral_anomalies_org_isolation ON behavioral_anomalies
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE team_activity_events IS 'Core activity feed tracking all user and agent actions';
COMMENT ON TABLE team_behavior_metrics IS 'Aggregated behavioral statistics per user over time windows';
COMMENT ON TABLE behavioral_anomalies IS 'Detected unusual patterns flagged for review';

COMMENT ON FUNCTION log_team_event IS 'Records a team activity event with context and metadata';
COMMENT ON FUNCTION calculate_behavior_metrics IS 'Aggregates activity data for a user over a time period';
COMMENT ON FUNCTION detect_behavioral_anomalies IS 'Identifies unusual patterns in user behavior';
COMMENT ON FUNCTION get_team_activity_feed IS 'Retrieves filtered activity events with pagination';
COMMENT ON FUNCTION summarize_behavioral_patterns IS 'Returns aggregated insights about team behavior';
