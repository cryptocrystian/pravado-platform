-- =====================================================
-- AGENT FEEDBACK LOG MIGRATION
-- Sprint 48 Phase 4.4
-- =====================================================
--
-- Purpose: Store and analyze agent feedback for continuous improvement
-- Creates: Feedback log table, improvement plans table, helper functions
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE feedback_rating AS ENUM (
  'thumbs_up',
  'thumbs_down',
  'star_1',
  'star_2',
  'star_3',
  'star_4',
  'star_5'
);

CREATE TYPE feedback_scope AS ENUM (
  'response_quality',
  'tone',
  'accuracy',
  'helpfulness',
  'speed',
  'understanding',
  'relevance',
  'completeness',
  'professionalism',
  'other'
);

CREATE TYPE improvement_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

CREATE TYPE improvement_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'rejected'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Agent feedback log
CREATE TABLE agent_feedback_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  message_id UUID REFERENCES agent_messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES user_agent_turns(id) ON DELETE SET NULL,
  rating feedback_rating NOT NULL,
  categories feedback_scope[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID, -- NULL for anonymous
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Improvement plans
CREATE TABLE agent_improvement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority improvement_priority NOT NULL DEFAULT 'medium',
  status improvement_status NOT NULL DEFAULT 'pending',
  category feedback_scope,
  proposed_changes JSONB NOT NULL, -- Array of ProposedChange objects
  reasoning TEXT NOT NULL,
  estimated_impact JSONB, -- { expectedRatingIncrease, affectedInteractions }
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  implemented_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Feedback log indexes
CREATE INDEX idx_agent_feedback_agent ON agent_feedback_log(agent_id);
CREATE INDEX idx_agent_feedback_message ON agent_feedback_log(message_id);
CREATE INDEX idx_agent_feedback_conversation ON agent_feedback_log(conversation_id);
CREATE INDEX idx_agent_feedback_rating ON agent_feedback_log(rating);
CREATE INDEX idx_agent_feedback_created_at ON agent_feedback_log(created_at);
CREATE INDEX idx_agent_feedback_created_by ON agent_feedback_log(created_by);
CREATE INDEX idx_agent_feedback_categories ON agent_feedback_log USING GIN (categories);

-- Improvement plans indexes
CREATE INDEX idx_improvement_plans_agent ON agent_improvement_plans(agent_id);
CREATE INDEX idx_improvement_plans_status ON agent_improvement_plans(status);
CREATE INDEX idx_improvement_plans_priority ON agent_improvement_plans(priority);
CREATE INDEX idx_improvement_plans_category ON agent_improvement_plans(category);
CREATE INDEX idx_improvement_plans_created_at ON agent_improvement_plans(created_at);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get feedback metrics for an agent
CREATE OR REPLACE FUNCTION get_feedback_metrics(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_feedback BIGINT,
  avg_rating NUMERIC,
  thumbs_up_count BIGINT,
  thumbs_down_count BIGINT,
  star_1_count BIGINT,
  star_2_count BIGINT,
  star_3_count BIGINT,
  star_4_count BIGINT,
  star_5_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_feedback,
    AVG(
      CASE rating
        WHEN 'thumbs_up' THEN 5
        WHEN 'thumbs_down' THEN 1
        WHEN 'star_1' THEN 1
        WHEN 'star_2' THEN 2
        WHEN 'star_3' THEN 3
        WHEN 'star_4' THEN 4
        WHEN 'star_5' THEN 5
      END
    ) as avg_rating,
    COUNT(*) FILTER (WHERE rating = 'thumbs_up') as thumbs_up_count,
    COUNT(*) FILTER (WHERE rating = 'thumbs_down') as thumbs_down_count,
    COUNT(*) FILTER (WHERE rating = 'star_1') as star_1_count,
    COUNT(*) FILTER (WHERE rating = 'star_2') as star_2_count,
    COUNT(*) FILTER (WHERE rating = 'star_3') as star_3_count,
    COUNT(*) FILTER (WHERE rating = 'star_4') as star_4_count,
    COUNT(*) FILTER (WHERE rating = 'star_5') as star_5_count
  FROM agent_feedback_log
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get feedback distribution by category
CREATE OR REPLACE FUNCTION get_feedback_distribution(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  category feedback_scope,
  count BIGINT,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(categories) as category,
    COUNT(*) as count,
    AVG(
      CASE rating
        WHEN 'thumbs_up' THEN 5
        WHEN 'thumbs_down' THEN 1
        WHEN 'star_1' THEN 1
        WHEN 'star_2' THEN 2
        WHEN 'star_3' THEN 3
        WHEN 'star_4' THEN 4
        WHEN 'star_5' THEN 5
      END
    ) as avg_rating
  FROM agent_feedback_log
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY unnest(categories)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get common issues from feedback
CREATE OR REPLACE FUNCTION get_common_issues(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  category feedback_scope,
  frequency BIGINT,
  avg_rating NUMERIC,
  sample_notes TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(categories) as category,
    COUNT(*) as frequency,
    AVG(
      CASE rating
        WHEN 'thumbs_up' THEN 5
        WHEN 'thumbs_down' THEN 1
        WHEN 'star_1' THEN 1
        WHEN 'star_2' THEN 2
        WHEN 'star_3' THEN 3
        WHEN 'star_4' THEN 4
        WHEN 'star_5' THEN 5
      END
    ) as avg_rating,
    ARRAY_AGG(notes ORDER BY created_at DESC) FILTER (WHERE notes IS NOT NULL) as sample_notes
  FROM agent_feedback_log
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND (rating = 'thumbs_down' OR rating = 'star_1' OR rating = 'star_2') -- Negative feedback only
  GROUP BY unnest(categories)
  ORDER BY frequency DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get rating trends over time
CREATE OR REPLACE FUNCTION get_rating_trends(
  p_agent_id UUID,
  p_interval TEXT DEFAULT 'day',
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  date TEXT,
  avg_rating NUMERIC,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC(p_interval, created_at), 'YYYY-MM-DD') as date,
    AVG(
      CASE rating
        WHEN 'thumbs_up' THEN 5
        WHEN 'thumbs_down' THEN 1
        WHEN 'star_1' THEN 1
        WHEN 'star_2' THEN 2
        WHEN 'star_3' THEN 3
        WHEN 'star_4' THEN 4
        WHEN 'star_5' THEN 5
      END
    ) as avg_rating,
    COUNT(*) as count
  FROM agent_feedback_log
  WHERE agent_id = p_agent_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY DATE_TRUNC(p_interval, created_at)
  ORDER BY DATE_TRUNC(p_interval, created_at) ASC;
END;
$$ LANGUAGE plpgsql;

-- Get feedback for a specific message
CREATE OR REPLACE FUNCTION get_message_feedback(
  p_message_id UUID
)
RETURNS TABLE (
  id UUID,
  rating feedback_rating,
  categories feedback_scope[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    afl.id,
    afl.rating,
    afl.categories,
    afl.notes,
    afl.created_at
  FROM agent_feedback_log afl
  WHERE afl.message_id = p_message_id
  ORDER BY afl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE agent_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_improvement_plans ENABLE ROW LEVEL SECURITY;

-- Feedback log policies
-- Users can view all feedback for their organization (via agent conversations)
CREATE POLICY select_org_feedback
  ON agent_feedback_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_conversations ac
      WHERE ac.id = agent_feedback_log.conversation_id
        AND ac.organization_id = current_setting('app.current_organization_id', true)::UUID
    )
    OR conversation_id IS NULL -- Allow viewing non-conversation-specific feedback
  );

-- Users can insert feedback
CREATE POLICY insert_feedback
  ON agent_feedback_log
  FOR INSERT
  WITH CHECK (true); -- Anyone can submit feedback

-- Users can update their own feedback
CREATE POLICY update_own_feedback
  ON agent_feedback_log
  FOR UPDATE
  USING (created_by = current_setting('app.current_user_id', true)::UUID);

-- Improvement plans policies
-- Users can view plans for their organization's agents
CREATE POLICY select_org_improvement_plans
  ON agent_improvement_plans
  FOR SELECT
  USING (true); -- TODO: Add proper org check via agent table

-- System can insert plans
CREATE POLICY insert_improvement_plans
  ON agent_improvement_plans
  FOR INSERT
  WITH CHECK (true);

-- Users can update plans (to mark as completed, etc.)
CREATE POLICY update_improvement_plans
  ON agent_improvement_plans
  FOR UPDATE
  USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at on feedback changes
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_timestamp
  BEFORE UPDATE ON agent_feedback_log
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_timestamp();

-- Update updated_at on improvement plan changes
CREATE TRIGGER trigger_update_improvement_plan_timestamp
  BEFORE UPDATE ON agent_improvement_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_feedback_log IS 'Stores user feedback on agent responses for continuous improvement';
COMMENT ON TABLE agent_improvement_plans IS 'GPT-4 generated improvement plans based on feedback analysis';
COMMENT ON COLUMN agent_feedback_log.rating IS 'Thumbs up/down or 1-5 star rating';
COMMENT ON COLUMN agent_feedback_log.categories IS 'Array of feedback scopes (tone, accuracy, etc.)';
COMMENT ON COLUMN agent_feedback_log.is_anonymous IS 'Whether feedback was submitted anonymously';
COMMENT ON COLUMN agent_improvement_plans.proposed_changes IS 'JSON array of proposed changes to agent configuration';
COMMENT ON COLUMN agent_improvement_plans.estimated_impact IS 'Expected improvement metrics';
