-- =====================================================
-- AUTONOMOUS AGENT EVALUATOR + GPT-POWERED SCORECARDS
-- Sprint 35: Agent performance evaluation framework
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE evaluation_source AS ENUM (
  'GPT',
  'MANUAL',
  'HYBRID'
);

CREATE TYPE evaluation_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE evaluation_criteria AS ENUM (
  'CLARITY',
  'TONE',
  'TASK_FIT',
  'SUCCESS',
  'ACCURACY',
  'RELEVANCE',
  'PERSONALIZATION',
  'PROFESSIONALISM',
  'OUTCOME_QUALITY',
  'TIMING',
  'FOLLOW_UP',
  'STRATEGIC_ALIGNMENT'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Agent Evaluations Table
CREATE TABLE agent_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Linkage
  agent_run_id UUID,
  campaign_id UUID,
  contact_id UUID,

  -- Evaluation metadata
  source evaluation_source NOT NULL DEFAULT 'GPT',
  status evaluation_status NOT NULL DEFAULT 'PENDING',
  template_id UUID, -- Reference to evaluation_templates

  -- Scores
  overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
  score_breakdown JSONB DEFAULT '{}', -- { criteria: score }
  criteria_weights JSONB DEFAULT '{}', -- { criteria: weight }

  -- Analysis
  strengths TEXT[],
  weaknesses TEXT[],
  improvement_suggestions TEXT[],
  coaching_prompts TEXT[],

  -- Context
  evaluation_context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Tracking
  evaluated_by UUID, -- User ID if manual/hybrid
  evaluated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluation Events Table
CREATE TABLE evaluation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id UUID NOT NULL REFERENCES agent_evaluations(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'GPT_ANALYSIS', 'MANUAL_OVERRIDE', 'SCORE_ADJUSTED', 'NOTE_ADDED'
  description TEXT NOT NULL,

  -- Event data
  old_value JSONB,
  new_value JSONB,

  -- Metadata
  triggered_by UUID, -- User ID
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluation Templates Table
CREATE TABLE evaluation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  description TEXT,

  -- Criteria configuration
  criteria evaluation_criteria[] NOT NULL,
  criteria_weights JSONB NOT NULL, -- { criteria: weight }

  -- Scoring config
  scoring_guidance JSONB DEFAULT '{}', -- Descriptions for each criteria
  pass_threshold DECIMAL(5,2) DEFAULT 70.0,

  -- Template metadata
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Context applicability
  applicable_to TEXT[], -- ['outreach', 'followup', 'research', etc.]

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_agent_evaluations_org ON agent_evaluations(organization_id);
CREATE INDEX idx_agent_evaluations_run ON agent_evaluations(agent_run_id);
CREATE INDEX idx_agent_evaluations_campaign ON agent_evaluations(campaign_id);
CREATE INDEX idx_agent_evaluations_contact ON agent_evaluations(contact_id);
CREATE INDEX idx_agent_evaluations_status ON agent_evaluations(status);
CREATE INDEX idx_agent_evaluations_source ON agent_evaluations(source);
CREATE INDEX idx_agent_evaluations_created ON agent_evaluations(created_at DESC);

CREATE INDEX idx_evaluation_events_evaluation ON evaluation_events(evaluation_id);
CREATE INDEX idx_evaluation_events_created ON evaluation_events(created_at DESC);

CREATE INDEX idx_evaluation_templates_org ON evaluation_templates(organization_id);
CREATE INDEX idx_evaluation_templates_default ON evaluation_templates(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_evaluation_templates_active ON evaluation_templates(is_active) WHERE is_active = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_templates ENABLE ROW LEVEL SECURITY;

-- Agent Evaluations Policies
CREATE POLICY agent_evaluations_org_isolation ON agent_evaluations
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Evaluation Events Policies
CREATE POLICY evaluation_events_org_isolation ON evaluation_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_evaluations
      WHERE agent_evaluations.id = evaluation_events.evaluation_id
      AND agent_evaluations.organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- Evaluation Templates Policies
CREATE POLICY evaluation_templates_org_isolation ON evaluation_templates
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- POSTGRESQL FUNCTIONS
-- =====================================================

/**
 * Evaluate Agent Run
 * Initiates an evaluation for an agent execution
 */
CREATE OR REPLACE FUNCTION evaluate_agent_run(
  p_organization_id UUID,
  p_agent_run_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_template_id UUID DEFAULT NULL,
  p_source evaluation_source DEFAULT 'GPT',
  p_evaluated_by UUID DEFAULT NULL,
  p_evaluation_context JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_evaluation_id UUID;
  v_template RECORD;
BEGIN
  -- Get template if specified
  IF p_template_id IS NOT NULL THEN
    SELECT * INTO v_template
    FROM evaluation_templates
    WHERE id = p_template_id
    AND organization_id = p_organization_id;
  ELSE
    -- Get default template
    SELECT * INTO v_template
    FROM evaluation_templates
    WHERE organization_id = p_organization_id
    AND is_default = TRUE
    AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- Create evaluation
  INSERT INTO agent_evaluations (
    organization_id,
    agent_run_id,
    campaign_id,
    contact_id,
    source,
    status,
    template_id,
    criteria_weights,
    evaluation_context,
    evaluated_by
  ) VALUES (
    p_organization_id,
    p_agent_run_id,
    p_campaign_id,
    p_contact_id,
    p_source,
    'PENDING',
    COALESCE(p_template_id, v_template.id),
    COALESCE(v_template.criteria_weights, '{}'::JSONB),
    p_evaluation_context,
    p_evaluated_by
  )
  RETURNING id INTO v_evaluation_id;

  -- Log event
  INSERT INTO evaluation_events (
    evaluation_id,
    event_type,
    description,
    new_value,
    triggered_by
  ) VALUES (
    v_evaluation_id,
    'EVALUATION_INITIATED',
    'Evaluation created with source: ' || p_source::TEXT,
    jsonb_build_object('source', p_source, 'template_id', COALESCE(p_template_id, v_template.id)),
    p_evaluated_by
  );

  RETURN v_evaluation_id;
END;
$$;

/**
 * Calculate Score Breakdown
 * Aggregates criteria scores based on weights
 */
CREATE OR REPLACE FUNCTION calculate_score_breakdown(
  p_evaluation_id UUID,
  p_score_breakdown JSONB,
  p_criteria_weights JSONB
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_overall_score DECIMAL(5,2) := 0;
  v_total_weight DECIMAL(5,2) := 0;
  v_criteria TEXT;
  v_score DECIMAL(5,2);
  v_weight DECIMAL(5,2);
BEGIN
  -- Calculate weighted average
  FOR v_criteria IN SELECT jsonb_object_keys(p_score_breakdown)
  LOOP
    v_score := (p_score_breakdown->v_criteria)::DECIMAL(5,2);
    v_weight := COALESCE((p_criteria_weights->v_criteria)::DECIMAL(5,2), 1.0);

    v_overall_score := v_overall_score + (v_score * v_weight);
    v_total_weight := v_total_weight + v_weight;
  END LOOP;

  -- Normalize to 0-100 scale
  IF v_total_weight > 0 THEN
    v_overall_score := v_overall_score / v_total_weight;
  END IF;

  -- Update evaluation
  UPDATE agent_evaluations
  SET
    overall_score = v_overall_score,
    score_breakdown = p_score_breakdown,
    status = 'COMPLETED',
    evaluated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_evaluation_id;

  RETURN v_overall_score;
END;
$$;

/**
 * Summarize Evaluation
 * Generates summary statistics for evaluations
 */
CREATE OR REPLACE FUNCTION summarize_evaluation(
  p_organization_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_evaluations BIGINT,
  avg_overall_score DECIMAL(5,2),
  gpt_evaluations BIGINT,
  manual_evaluations BIGINT,
  hybrid_evaluations BIGINT,
  completed_evaluations BIGINT,
  pending_evaluations BIGINT,
  avg_scores_by_criteria JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_evaluations AS (
    SELECT *
    FROM agent_evaluations
    WHERE organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
  )
  SELECT
    COUNT(*)::BIGINT AS total_evaluations,
    AVG(overall_score)::DECIMAL(5,2) AS avg_overall_score,
    COUNT(*) FILTER (WHERE source = 'GPT')::BIGINT AS gpt_evaluations,
    COUNT(*) FILTER (WHERE source = 'MANUAL')::BIGINT AS manual_evaluations,
    COUNT(*) FILTER (WHERE source = 'HYBRID')::BIGINT AS hybrid_evaluations,
    COUNT(*) FILTER (WHERE status = 'COMPLETED')::BIGINT AS completed_evaluations,
    COUNT(*) FILTER (WHERE status = 'PENDING')::BIGINT AS pending_evaluations,
    (
      SELECT jsonb_object_agg(criteria, avg_score)
      FROM (
        SELECT
          key AS criteria,
          AVG((value)::DECIMAL(5,2))::DECIMAL(5,2) AS avg_score
        FROM filtered_evaluations,
        LATERAL jsonb_each_text(score_breakdown)
        WHERE status = 'COMPLETED'
        GROUP BY key
      ) criteria_avg
    ) AS avg_scores_by_criteria
  FROM filtered_evaluations;
END;
$$;

/**
 * Create Evaluation Template
 * Creates a reusable evaluation template
 */
CREATE OR REPLACE FUNCTION create_evaluation_template(
  p_organization_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_criteria evaluation_criteria[],
  p_criteria_weights JSONB,
  p_scoring_guidance JSONB DEFAULT '{}',
  p_pass_threshold DECIMAL(5,2) DEFAULT 70.0,
  p_is_default BOOLEAN DEFAULT FALSE,
  p_applicable_to TEXT[] DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- If setting as default, unset other defaults
  IF p_is_default THEN
    UPDATE evaluation_templates
    SET is_default = FALSE
    WHERE organization_id = p_organization_id
    AND is_default = TRUE;
  END IF;

  -- Create template
  INSERT INTO evaluation_templates (
    organization_id,
    name,
    description,
    criteria,
    criteria_weights,
    scoring_guidance,
    pass_threshold,
    is_default,
    applicable_to,
    created_by
  ) VALUES (
    p_organization_id,
    p_name,
    p_description,
    p_criteria,
    p_criteria_weights,
    p_scoring_guidance,
    p_pass_threshold,
    p_is_default,
    p_applicable_to,
    p_created_by
  )
  RETURNING id INTO v_template_id;

  RETURN v_template_id;
END;
$$;

/**
 * Get Evaluation Dashboard
 * Returns comprehensive evaluation dashboard data
 */
CREATE OR REPLACE FUNCTION get_evaluation_dashboard(
  p_organization_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_period_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_period_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_evaluations BIGINT,
  avg_overall_score DECIMAL(5,2),
  score_trend TEXT, -- 'IMPROVING', 'STABLE', 'DECLINING'
  top_performers JSONB,
  bottom_performers JSONB,
  criteria_breakdown JSONB,
  recent_evaluations JSONB,
  evaluation_velocity JSONB -- Evaluations over time
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_avg DECIMAL(5,2);
  v_previous_avg DECIMAL(5,2);
  v_score_trend TEXT;
BEGIN
  -- Calculate current period average
  SELECT AVG(overall_score) INTO v_current_avg
  FROM agent_evaluations
  WHERE organization_id = p_organization_id
  AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
  AND created_at >= p_period_start
  AND created_at <= p_period_end
  AND status = 'COMPLETED';

  -- Calculate previous period average
  SELECT AVG(overall_score) INTO v_previous_avg
  FROM agent_evaluations
  WHERE organization_id = p_organization_id
  AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
  AND created_at >= p_period_start - (p_period_end - p_period_start)
  AND created_at < p_period_start
  AND status = 'COMPLETED';

  -- Determine trend
  IF v_previous_avg IS NULL OR v_current_avg IS NULL THEN
    v_score_trend := 'STABLE';
  ELSIF v_current_avg > v_previous_avg + 5 THEN
    v_score_trend := 'IMPROVING';
  ELSIF v_current_avg < v_previous_avg - 5 THEN
    v_score_trend := 'DECLINING';
  ELSE
    v_score_trend := 'STABLE';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_evaluations,
    AVG(overall_score)::DECIMAL(5,2) AS avg_overall_score,
    v_score_trend AS score_trend,

    -- Top performers (highest scores)
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'evaluation_id', id,
          'agent_run_id', agent_run_id,
          'overall_score', overall_score,
          'strengths', strengths
        )
      )
      FROM (
        SELECT id, agent_run_id, overall_score, strengths
        FROM agent_evaluations
        WHERE organization_id = p_organization_id
        AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
        AND created_at >= p_period_start
        AND created_at <= p_period_end
        AND status = 'COMPLETED'
        ORDER BY overall_score DESC NULLS LAST
        LIMIT 5
      ) top
    ) AS top_performers,

    -- Bottom performers (lowest scores)
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'evaluation_id', id,
          'agent_run_id', agent_run_id,
          'overall_score', overall_score,
          'weaknesses', weaknesses,
          'improvement_suggestions', improvement_suggestions
        )
      )
      FROM (
        SELECT id, agent_run_id, overall_score, weaknesses, improvement_suggestions
        FROM agent_evaluations
        WHERE organization_id = p_organization_id
        AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
        AND created_at >= p_period_start
        AND created_at <= p_period_end
        AND status = 'COMPLETED'
        ORDER BY overall_score ASC NULLS LAST
        LIMIT 5
      ) bottom
    ) AS bottom_performers,

    -- Criteria breakdown
    (
      SELECT jsonb_object_agg(criteria, avg_score)
      FROM (
        SELECT
          key AS criteria,
          AVG((value)::DECIMAL(5,2))::DECIMAL(5,2) AS avg_score
        FROM agent_evaluations,
        LATERAL jsonb_each_text(score_breakdown)
        WHERE organization_id = p_organization_id
        AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
        AND created_at >= p_period_start
        AND created_at <= p_period_end
        AND status = 'COMPLETED'
        GROUP BY key
      ) criteria_avg
    ) AS criteria_breakdown,

    -- Recent evaluations
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'evaluation_id', id,
          'agent_run_id', agent_run_id,
          'overall_score', overall_score,
          'source', source,
          'created_at', created_at
        )
        ORDER BY created_at DESC
      )
      FROM (
        SELECT id, agent_run_id, overall_score, source, created_at
        FROM agent_evaluations
        WHERE organization_id = p_organization_id
        AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
        AND created_at >= p_period_start
        AND created_at <= p_period_end
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    ) AS recent_evaluations,

    -- Evaluation velocity (count by day)
    (
      SELECT jsonb_object_agg(date::TEXT, count)
      FROM (
        SELECT
          DATE(created_at) AS date,
          COUNT(*)::BIGINT AS count
        FROM agent_evaluations
        WHERE organization_id = p_organization_id
        AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
        AND created_at >= p_period_start
        AND created_at <= p_period_end
        GROUP BY DATE(created_at)
        ORDER BY date
      ) velocity
    ) AS evaluation_velocity

  FROM agent_evaluations
  WHERE organization_id = p_organization_id
  AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
  AND created_at >= p_period_start
  AND created_at <= p_period_end;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for agent_evaluations
CREATE TRIGGER update_agent_evaluations_timestamp
  BEFORE UPDATE ON agent_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for evaluation_templates
CREATE TRIGGER update_evaluation_templates_timestamp
  BEFORE UPDATE ON evaluation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
