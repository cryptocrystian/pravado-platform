-- =====================================================
-- MIGRATION: Lead Scoring System + Qualification Pipeline
-- Sprint 28: Adaptive lead scoring and qualification
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Lead qualification stages
CREATE TYPE lead_stage AS ENUM (
  'UNQUALIFIED',    -- New lead, not yet scored
  'IN_PROGRESS',    -- Being nurtured/evaluated
  'QUALIFIED',      -- Meets qualification criteria
  'DISQUALIFIED'    -- Does not meet criteria
);

-- Disqualification reasons
CREATE TYPE disqualification_reason AS ENUM (
  'BOUNCED',         -- Email bounced
  'NO_BUDGET',       -- Budget constraints
  'NOT_INTERESTED',  -- Explicitly not interested
  'BAD_FIT',         -- Not a good fit for offering
  'WRONG_PERSONA',   -- Not the right decision maker
  'TIMING',          -- Bad timing (maybe later)
  'COMPETITOR',      -- Using competitor
  'OTHER'            -- Other reason
);

-- Lead score source
CREATE TYPE lead_score_source AS ENUM (
  'SYSTEM',    -- Automatically calculated
  'MANUAL',    -- Manually set by user
  'AI',        -- GPT-powered evaluation
  'RULE'       -- Rule-based update
);

-- =====================================================
-- TABLES
-- =====================================================

-- Lead Scores (main scoring table)
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- References
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Scoring
  raw_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0-1.0, how confident we are

  -- Stage
  stage lead_stage NOT NULL DEFAULT 'UNQUALIFIED',
  disqualification_reason disqualification_reason,
  disqualification_notes TEXT,

  -- Component scores (for transparency)
  engagement_score INTEGER DEFAULT 0, -- 0-100
  sentiment_score INTEGER DEFAULT 0, -- 0-100
  behavior_score INTEGER DEFAULT 0, -- 0-100
  fit_score INTEGER DEFAULT 0, -- 0-100

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  last_stage_change_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by lead_score_source DEFAULT 'SYSTEM',

  -- RAG classification (derived from raw_score)
  rag_status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN raw_score >= 70 THEN 'GREEN'
      WHEN raw_score >= 40 THEN 'AMBER'
      ELSE 'RED'
    END
  ) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_raw_score CHECK (raw_score >= 0 AND raw_score <= 100),
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT valid_component_scores CHECK (
    engagement_score >= 0 AND engagement_score <= 100 AND
    sentiment_score >= 0 AND sentiment_score <= 100 AND
    behavior_score >= 0 AND behavior_score <= 100 AND
    fit_score >= 0 AND fit_score <= 100
  ),
  CONSTRAINT disqualified_needs_reason CHECK (
    stage != 'DISQUALIFIED' OR disqualification_reason IS NOT NULL
  ),
  CONSTRAINT unique_contact_campaign UNIQUE(contact_id, campaign_id)
);

-- Indexes for lead_scores
CREATE INDEX idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX idx_lead_scores_campaign ON lead_scores(campaign_id);
CREATE INDEX idx_lead_scores_organization ON lead_scores(organization_id);
CREATE INDEX idx_lead_scores_stage ON lead_scores(stage);
CREATE INDEX idx_lead_scores_rag ON lead_scores(rag_status);
CREATE INDEX idx_lead_scores_raw_score ON lead_scores(raw_score DESC);
CREATE INDEX idx_lead_scores_updated ON lead_scores(updated_at DESC);

-- Lead Score History (audit trail)
CREATE TABLE lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference to main score
  lead_score_id UUID NOT NULL REFERENCES lead_scores(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- What changed
  change_type TEXT NOT NULL, -- 'SCORE_UPDATE', 'STAGE_CHANGE', 'DISQUALIFICATION'

  -- Before/after
  before_score INTEGER,
  after_score INTEGER,
  before_stage lead_stage,
  after_stage lead_stage,

  -- Context
  source lead_score_source NOT NULL,
  agent_id TEXT, -- Which agent triggered this
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If manual
  reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_before_after CHECK (
    (before_score IS NULL OR (before_score >= 0 AND before_score <= 100)) AND
    (after_score IS NULL OR (after_score >= 0 AND after_score <= 100))
  )
);

-- Indexes for lead_score_history
CREATE INDEX idx_lead_score_history_lead_score ON lead_score_history(lead_score_id);
CREATE INDEX idx_lead_score_history_contact ON lead_score_history(contact_id);
CREATE INDEX idx_lead_score_history_organization ON lead_score_history(organization_id);
CREATE INDEX idx_lead_score_history_timestamp ON lead_score_history(timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_scores_org_isolation ON lead_scores
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY lead_score_history_org_isolation ON lead_score_history
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

/**
 * Calculate lead score for a contact
 * Uses engagement data, channel performance, sentiment, and goal alignment
 */
CREATE OR REPLACE FUNCTION calculate_lead_score(
  p_contact_id UUID,
  p_campaign_id UUID,
  p_organization_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_engagement_score INTEGER := 0;
  v_sentiment_score INTEGER := 0;
  v_behavior_score INTEGER := 0;
  v_fit_score INTEGER := 50; -- Base fit score
  v_final_score INTEGER;
  v_confidence DECIMAL;
BEGIN
  -- ===== ENGAGEMENT SCORE (0-100) =====
  -- Based on channel engagement metrics
  SELECT
    LEAST(100, (
      (COALESCE(SUM(total_replied), 0) * 25) + -- Replies are highly valuable
      (COALESCE(SUM(total_connected), 0) * 20) + -- Connections matter
      (COALESCE(SUM(total_opened), 0) * 5) + -- Opens are weak signals
      (COALESCE(SUM(total_clicked), 0) * 10) -- Clicks show interest
    ))::INTEGER
  INTO v_engagement_score
  FROM channel_performance_aggregates
  WHERE contact_id = p_contact_id
    AND organization_id = p_organization_id;

  -- ===== SENTIMENT SCORE (0-100) =====
  -- Average sentiment from channel engagements
  SELECT
    LEAST(100, COALESCE(AVG(avg_sentiment_score) * 100, 50))::INTEGER
  INTO v_sentiment_score
  FROM channel_performance_aggregates
  WHERE contact_id = p_contact_id
    AND organization_id = p_organization_id;

  -- ===== BEHAVIOR SCORE (0-100) =====
  -- Based on receptiveness and engagement quality
  SELECT
    LEAST(100, COALESCE(AVG(contact_receptiveness_score), 50))::INTEGER
  INTO v_behavior_score
  FROM channel_performance_aggregates
  WHERE contact_id = p_contact_id
    AND organization_id = p_organization_id;

  -- ===== FIT SCORE (0-100) =====
  -- Check if contact contributed to goal completion
  DECLARE
    v_goal_contributions INTEGER := 0;
  BEGIN
    SELECT COUNT(DISTINCT goal_id)
    INTO v_goal_contributions
    FROM attribution_events
    WHERE contact_id = p_contact_id
      AND organization_id = p_organization_id
      AND goal_id IS NOT NULL;

    -- Each goal contribution adds 10 points, max 50
    v_fit_score := 50 + LEAST(50, v_goal_contributions * 10);
  END;

  -- ===== FINAL SCORE (weighted average) =====
  v_final_score := (
    (v_engagement_score * 0.35) + -- 35% weight
    (v_sentiment_score * 0.25) +  -- 25% weight
    (v_behavior_score * 0.20) +   -- 20% weight
    (v_fit_score * 0.20)           -- 20% weight
  )::INTEGER;

  -- Calculate confidence (higher when more data points)
  DECLARE
    v_total_engagements INTEGER := 0;
  BEGIN
    SELECT COUNT(*)
    INTO v_total_engagements
    FROM channel_engagements
    WHERE contact_id = p_contact_id
      AND organization_id = p_organization_id;

    -- Confidence increases with more data
    v_confidence := LEAST(1.0, 0.3 + (v_total_engagements::DECIMAL / 20.0));
  END;

  -- Insert or update lead_scores
  INSERT INTO lead_scores (
    organization_id,
    contact_id,
    campaign_id,
    raw_score,
    confidence_score,
    engagement_score,
    sentiment_score,
    behavior_score,
    fit_score,
    last_calculated_at,
    calculated_by
  ) VALUES (
    p_organization_id,
    p_contact_id,
    p_campaign_id,
    v_final_score,
    v_confidence,
    v_engagement_score,
    v_sentiment_score,
    v_behavior_score,
    v_fit_score,
    NOW(),
    'SYSTEM'
  )
  ON CONFLICT (contact_id, campaign_id) DO UPDATE SET
    raw_score = EXCLUDED.raw_score,
    confidence_score = EXCLUDED.confidence_score,
    engagement_score = EXCLUDED.engagement_score,
    sentiment_score = EXCLUDED.sentiment_score,
    behavior_score = EXCLUDED.behavior_score,
    fit_score = EXCLUDED.fit_score,
    last_calculated_at = NOW(),
    calculated_by = 'SYSTEM',
    updated_at = NOW();

  -- Record history if score changed significantly
  DECLARE
    v_old_score INTEGER;
    v_lead_score_id UUID;
  BEGIN
    SELECT id, raw_score INTO v_lead_score_id, v_old_score
    FROM lead_scores
    WHERE contact_id = p_contact_id AND campaign_id = p_campaign_id;

    IF v_old_score IS NOT NULL AND ABS(v_old_score - v_final_score) > 5 THEN
      INSERT INTO lead_score_history (
        organization_id,
        lead_score_id,
        contact_id,
        change_type,
        before_score,
        after_score,
        source
      ) VALUES (
        p_organization_id,
        v_lead_score_id,
        p_contact_id,
        'SCORE_UPDATE',
        v_old_score,
        v_final_score,
        'SYSTEM'
      );
    END IF;
  END;

  RETURN v_final_score;
END;
$$;

/**
 * Update lead stage
 */
CREATE OR REPLACE FUNCTION update_lead_stage(
  p_contact_id UUID,
  p_campaign_id UUID,
  p_organization_id UUID,
  p_new_stage lead_stage,
  p_disqualification_reason disqualification_reason DEFAULT NULL,
  p_disqualification_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_source lead_score_source DEFAULT 'MANUAL'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_score_id UUID;
  v_old_stage lead_stage;
BEGIN
  -- Get current stage
  SELECT id, stage INTO v_lead_score_id, v_old_stage
  FROM lead_scores
  WHERE contact_id = p_contact_id
    AND campaign_id = p_campaign_id
    AND organization_id = p_organization_id;

  IF v_lead_score_id IS NULL THEN
    RAISE EXCEPTION 'Lead score not found for contact';
  END IF;

  -- Update stage
  UPDATE lead_scores
  SET
    stage = p_new_stage,
    disqualification_reason = p_disqualification_reason,
    disqualification_notes = p_disqualification_notes,
    last_stage_change_at = NOW(),
    updated_at = NOW()
  WHERE id = v_lead_score_id;

  -- Record history
  INSERT INTO lead_score_history (
    organization_id,
    lead_score_id,
    contact_id,
    change_type,
    before_stage,
    after_stage,
    source,
    user_id,
    reason,
    metadata
  ) VALUES (
    p_organization_id,
    v_lead_score_id,
    p_contact_id,
    'STAGE_CHANGE',
    v_old_stage,
    p_new_stage,
    p_source,
    p_user_id,
    p_disqualification_notes,
    jsonb_build_object(
      'disqualification_reason', p_disqualification_reason,
      'old_stage', v_old_stage,
      'new_stage', p_new_stage
    )
  );

  RETURN TRUE;
END;
$$;

/**
 * Get lead score summary for campaign
 */
CREATE OR REPLACE FUNCTION get_lead_score_summary(
  p_campaign_id UUID,
  p_organization_id UUID
)
RETURNS TABLE(
  total_leads BIGINT,
  qualified_count BIGINT,
  disqualified_count BIGINT,
  in_progress_count BIGINT,
  unqualified_count BIGINT,
  avg_score DECIMAL,
  green_count BIGINT,
  amber_count BIGINT,
  red_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_leads,
    COUNT(*) FILTER (WHERE stage = 'QUALIFIED')::BIGINT AS qualified_count,
    COUNT(*) FILTER (WHERE stage = 'DISQUALIFIED')::BIGINT AS disqualified_count,
    COUNT(*) FILTER (WHERE stage = 'IN_PROGRESS')::BIGINT AS in_progress_count,
    COUNT(*) FILTER (WHERE stage = 'UNQUALIFIED')::BIGINT AS unqualified_count,
    AVG(raw_score)::DECIMAL AS avg_score,
    COUNT(*) FILTER (WHERE rag_status = 'GREEN')::BIGINT AS green_count,
    COUNT(*) FILTER (WHERE rag_status = 'AMBER')::BIGINT AS amber_count,
    COUNT(*) FILTER (WHERE rag_status = 'RED')::BIGINT AS red_count
  FROM lead_scores
  WHERE campaign_id = p_campaign_id
    AND organization_id = p_organization_id;
END;
$$;

/**
 * Get lead score trend for contact
 */
CREATE OR REPLACE FUNCTION get_lead_trend(
  p_contact_id UUID,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  timestamp TIMESTAMPTZ,
  score INTEGER,
  stage lead_stage,
  change_type TEXT,
  source lead_score_source
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.timestamp,
    h.after_score,
    h.after_stage,
    h.change_type,
    h.source
  FROM lead_score_history h
  WHERE h.contact_id = p_contact_id
    AND h.organization_id = p_organization_id
  ORDER BY h.timestamp DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER update_lead_scores_updated_at
  BEFORE UPDATE ON lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE lead_scores IS 'Lead qualification scores and pipeline stages';
COMMENT ON TABLE lead_score_history IS 'Audit trail of lead score and stage changes';

COMMENT ON FUNCTION calculate_lead_score IS 'Calculate weighted lead score based on engagement, sentiment, behavior, and fit';
COMMENT ON FUNCTION update_lead_stage IS 'Update lead qualification stage with history tracking';
COMMENT ON FUNCTION get_lead_score_summary IS 'Get summary statistics for campaign lead scores';
COMMENT ON FUNCTION get_lead_trend IS 'Get historical score changes for a contact';
