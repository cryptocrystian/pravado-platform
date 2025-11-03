-- =====================================================
-- AGENT SELF-EVALUATION LOGS MIGRATION
-- Sprint 49 Phase 4.5
-- =====================================================
--
-- Purpose: Enable agent meta-cognition and self-evaluation capabilities
-- Creates: Evaluation logs, improvement suggestions, helper functions
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE eval_type AS ENUM (
  'confidence',
  'contradiction',
  'improvement',
  'pattern_analysis'
);

CREATE TYPE next_step_action AS ENUM (
  'proceed',
  'retry',
  'escalate',
  'collaborate',
  'seek_clarification',
  'consult_memory'
);

CREATE TYPE confidence_level AS ENUM (
  'very_low',
  'low',
  'medium',
  'high',
  'very_high'
);

CREATE TYPE improvement_category AS ENUM (
  'tone',
  'accuracy',
  'decision_making',
  'memory_recall',
  'collaboration',
  'clarification',
  'knowledge_gap',
  'reasoning'
);

CREATE TYPE suggestion_status AS ENUM (
  'pending',
  'reviewed',
  'applied',
  'rejected'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Agent self-evaluation logs
CREATE TABLE agent_self_eval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  eval_type eval_type NOT NULL,
  context JSONB NOT NULL,
  result JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  suggested_action next_step_action,
  playbook_execution_id UUID,
  conversation_id UUID,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Self-improvement suggestions
CREATE TABLE agent_self_improvement_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  category improvement_category NOT NULL,
  summary TEXT NOT NULL,
  issue_detected TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  specific_changes JSONB NOT NULL, -- Array of SpecificChange objects
  confidence_level NUMERIC(3,2) NOT NULL CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
  related_memory_links TEXT[] DEFAULT '{}',
  related_feedback_ids UUID[] DEFAULT '{}',
  related_eval_log_id UUID REFERENCES agent_self_eval_logs(id) ON DELETE SET NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status suggestion_status NOT NULL DEFAULT 'pending',
  estimated_impact JSONB,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Self-eval logs indexes
CREATE INDEX idx_self_eval_logs_agent ON agent_self_eval_logs(agent_id);
CREATE INDEX idx_self_eval_logs_type ON agent_self_eval_logs(eval_type);
CREATE INDEX idx_self_eval_logs_confidence ON agent_self_eval_logs(confidence_score);
CREATE INDEX idx_self_eval_logs_action ON agent_self_eval_logs(suggested_action);
CREATE INDEX idx_self_eval_logs_playbook ON agent_self_eval_logs(playbook_execution_id);
CREATE INDEX idx_self_eval_logs_conversation ON agent_self_eval_logs(conversation_id);
CREATE INDEX idx_self_eval_logs_created_at ON agent_self_eval_logs(created_at);
CREATE INDEX idx_self_eval_logs_context ON agent_self_eval_logs USING GIN (context);
CREATE INDEX idx_self_eval_logs_result ON agent_self_eval_logs USING GIN (result);

-- Improvement suggestions indexes
CREATE INDEX idx_improvement_suggestions_agent ON agent_self_improvement_suggestions(agent_id);
CREATE INDEX idx_improvement_suggestions_category ON agent_self_improvement_suggestions(category);
CREATE INDEX idx_improvement_suggestions_status ON agent_self_improvement_suggestions(status);
CREATE INDEX idx_improvement_suggestions_priority ON agent_self_improvement_suggestions(priority);
CREATE INDEX idx_improvement_suggestions_confidence ON agent_self_improvement_suggestions(confidence_level);
CREATE INDEX idx_improvement_suggestions_eval_log ON agent_self_improvement_suggestions(related_eval_log_id);
CREATE INDEX idx_improvement_suggestions_created_at ON agent_self_improvement_suggestions(created_at);
CREATE INDEX idx_improvement_suggestions_generated_at ON agent_self_improvement_suggestions(generated_at);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get self-evaluation metrics for an agent
CREATE OR REPLACE FUNCTION get_self_eval_metrics(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_evaluations BIGINT,
  avg_confidence_score NUMERIC,
  evaluations_by_type JSONB,
  action_suggestions JSONB,
  contradictions_detected BIGINT,
  improvement_suggestions_generated BIGINT,
  improvement_suggestions_applied BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_evaluations,
    AVG(confidence_score) as avg_confidence_score,
    (
      SELECT jsonb_object_agg(eval_type, count)
      FROM (
        SELECT eval_type, COUNT(*) as count
        FROM agent_self_eval_logs
        WHERE agent_id = p_agent_id
          AND created_at >= p_start_date
          AND created_at <= p_end_date
        GROUP BY eval_type
      ) eval_counts
    ) as evaluations_by_type,
    (
      SELECT jsonb_object_agg(suggested_action, count)
      FROM (
        SELECT suggested_action, COUNT(*) as count
        FROM agent_self_eval_logs
        WHERE agent_id = p_agent_id
          AND created_at >= p_start_date
          AND created_at <= p_end_date
          AND suggested_action IS NOT NULL
        GROUP BY suggested_action
      ) action_counts
    ) as action_suggestions,
    (
      SELECT COUNT(*)
      FROM agent_self_eval_logs
      WHERE agent_id = p_agent_id
        AND eval_type = 'contradiction'
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ) as contradictions_detected,
    (
      SELECT COUNT(*)
      FROM agent_self_improvement_suggestions
      WHERE agent_id = p_agent_id
        AND generated_at >= p_start_date
        AND generated_at <= p_end_date
    ) as improvement_suggestions_generated,
    (
      SELECT COUNT(*)
      FROM agent_self_improvement_suggestions
      WHERE agent_id = p_agent_id
        AND status = 'applied'
        AND applied_at >= p_start_date
        AND applied_at <= p_end_date
    ) as improvement_suggestions_applied
  FROM agent_self_eval_logs
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get confidence trends over time
CREATE OR REPLACE FUNCTION get_confidence_trends(
  p_agent_id UUID,
  p_interval TEXT DEFAULT 'day',
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  date TEXT,
  avg_confidence NUMERIC,
  evaluation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC(p_interval, created_at), 'YYYY-MM-DD') as date,
    AVG(confidence_score) as avg_confidence,
    COUNT(*) as evaluation_count
  FROM agent_self_eval_logs
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND confidence_score IS NOT NULL
  GROUP BY DATE_TRUNC(p_interval, created_at)
  ORDER BY DATE_TRUNC(p_interval, created_at) ASC;
END;
$$ LANGUAGE plpgsql;

-- Get contradiction trends
CREATE OR REPLACE FUNCTION get_contradiction_trends(
  p_agent_id UUID,
  p_interval TEXT DEFAULT 'day',
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  date TEXT,
  count BIGINT,
  severity_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC(p_interval, created_at), 'YYYY-MM-DD') as date,
    COUNT(*) as count,
    jsonb_build_object(
      'low', COUNT(*) FILTER (WHERE (result->>'severity')::TEXT = 'low'),
      'medium', COUNT(*) FILTER (WHERE (result->>'severity')::TEXT = 'medium'),
      'high', COUNT(*) FILTER (WHERE (result->>'severity')::TEXT = 'high'),
      'critical', COUNT(*) FILTER (WHERE (result->>'severity')::TEXT = 'critical')
    ) as severity_breakdown
  FROM agent_self_eval_logs
  WHERE agent_id = p_agent_id
    AND eval_type = 'contradiction'
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY DATE_TRUNC(p_interval, created_at)
  ORDER BY DATE_TRUNC(p_interval, created_at) ASC;
END;
$$ LANGUAGE plpgsql;

-- Get pending improvement suggestions
CREATE OR REPLACE FUNCTION get_pending_improvements(
  p_agent_id UUID,
  p_priority TEXT DEFAULT NULL,
  p_category improvement_category DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  category improvement_category,
  summary TEXT,
  priority TEXT,
  confidence_level NUMERIC,
  generated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.category,
    s.summary,
    s.priority,
    s.confidence_level,
    s.generated_at
  FROM agent_self_improvement_suggestions s
  WHERE s.agent_id = p_agent_id
    AND s.status = 'pending'
    AND (p_priority IS NULL OR s.priority = p_priority)
    AND (p_category IS NULL OR s.category = p_category)
  ORDER BY
    CASE s.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    s.confidence_level DESC,
    s.generated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get low confidence evaluations
CREATE OR REPLACE FUNCTION get_low_confidence_evaluations(
  p_agent_id UUID,
  p_threshold NUMERIC DEFAULT 0.5,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  eval_type eval_type,
  confidence_score NUMERIC,
  suggested_action next_step_action,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.eval_type,
    e.confidence_score,
    e.suggested_action,
    e.context,
    e.created_at
  FROM agent_self_eval_logs e
  WHERE e.agent_id = p_agent_id
    AND e.confidence_score < p_threshold
    AND e.created_at >= p_start_date
  ORDER BY e.confidence_score ASC, e.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get failure patterns (evaluations with low confidence or escalation)
CREATE OR REPLACE FUNCTION get_failure_patterns(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  pattern_type TEXT,
  frequency BIGINT,
  avg_confidence NUMERIC,
  common_context TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (context->>'task')::TEXT as pattern_type,
    COUNT(*) as frequency,
    AVG(confidence_score) as avg_confidence,
    ARRAY_AGG(DISTINCT (context->>'currentStep')::TEXT) FILTER (WHERE context->>'currentStep' IS NOT NULL) as common_context
  FROM agent_self_eval_logs
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND (confidence_score < 0.5 OR suggested_action IN ('escalate', 'collaborate'))
  GROUP BY (context->>'task')::TEXT
  HAVING COUNT(*) >= 2
  ORDER BY frequency DESC, avg_confidence ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE agent_self_eval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_self_improvement_suggestions ENABLE ROW LEVEL SECURITY;

-- Self-eval logs policies
-- Users can view all evaluation logs for their organization
CREATE POLICY select_org_self_eval_logs
  ON agent_self_eval_logs
  FOR SELECT
  USING (true); -- TODO: Add proper org check via agent table

-- System can insert evaluation logs
CREATE POLICY insert_self_eval_logs
  ON agent_self_eval_logs
  FOR INSERT
  WITH CHECK (true);

-- System can update evaluation logs
CREATE POLICY update_self_eval_logs
  ON agent_self_eval_logs
  FOR UPDATE
  USING (true);

-- Improvement suggestions policies
-- Users can view suggestions for their organization's agents
CREATE POLICY select_org_improvement_suggestions
  ON agent_self_improvement_suggestions
  FOR SELECT
  USING (true); -- TODO: Add proper org check via agent table

-- System can insert suggestions
CREATE POLICY insert_improvement_suggestions
  ON agent_self_improvement_suggestions
  FOR INSERT
  WITH CHECK (true);

-- Users can update suggestions (to apply/reject them)
CREATE POLICY update_improvement_suggestions
  ON agent_self_improvement_suggestions
  FOR UPDATE
  USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at on self-eval log changes
CREATE OR REPLACE FUNCTION update_self_eval_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_self_eval_timestamp
  BEFORE UPDATE ON agent_self_eval_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_self_eval_timestamp();

-- Update updated_at on improvement suggestion changes
CREATE TRIGGER trigger_update_improvement_suggestion_timestamp
  BEFORE UPDATE ON agent_self_improvement_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_self_eval_timestamp();

-- Auto-set applied_at when status changes to 'applied'
CREATE OR REPLACE FUNCTION set_applied_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'applied' AND OLD.status != 'applied' THEN
    NEW.applied_at = NOW();
  END IF;

  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_applied_at_timestamp
  BEFORE UPDATE ON agent_self_improvement_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION set_applied_at_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_self_eval_logs IS 'Stores agent self-evaluation assessments for meta-cognition';
COMMENT ON TABLE agent_self_improvement_suggestions IS 'Stores GPT-4 generated self-improvement suggestions';
COMMENT ON COLUMN agent_self_eval_logs.eval_type IS 'Type of evaluation performed';
COMMENT ON COLUMN agent_self_eval_logs.confidence_score IS 'Agent confidence score (0.0-1.0)';
COMMENT ON COLUMN agent_self_eval_logs.suggested_action IS 'Recommended next step based on evaluation';
COMMENT ON COLUMN agent_self_improvement_suggestions.specific_changes IS 'JSON array of specific change proposals';
COMMENT ON COLUMN agent_self_improvement_suggestions.confidence_level IS 'Confidence in this improvement suggestion (0.0-1.0)';
COMMENT ON COLUMN agent_self_improvement_suggestions.estimated_impact IS 'Expected impact of applying this suggestion';
