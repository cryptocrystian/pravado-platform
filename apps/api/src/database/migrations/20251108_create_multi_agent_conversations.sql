-- =====================================================
-- MULTI-AGENT CONVERSATIONS MIGRATION
-- Sprint 50 Phase 4.6
-- =====================================================
--
-- Purpose: Enable structured multi-agent dialogue with turn-taking
-- Creates: Conversations, turns, interruptions tables and helper functions
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE turn_type AS ENUM (
  'statement',
  'question',
  'response',
  'proposal',
  'objection',
  'agreement',
  'summary',
  'clarification'
);

CREATE TYPE agent_role_type AS ENUM (
  'facilitator',
  'contributor',
  'expert',
  'reviewer',
  'observer',
  'decision_maker'
);

CREATE TYPE turn_taking_strategy AS ENUM (
  'round_robin',
  'role_priority',
  'confidence_weighted',
  'agent_initiated',
  'facilitator_directed'
);

CREATE TYPE dialogue_status AS ENUM (
  'active',
  'paused',
  'completed',
  'interrupted',
  'expired'
);

CREATE TYPE dialogue_outcome AS ENUM (
  'consensus',
  'decision',
  'no_resolution',
  'timeout',
  'interrupted'
);

CREATE TYPE interruption_reason AS ENUM (
  'user_request',
  'agent_confusion',
  'contradiction_detected',
  'low_confidence',
  'escalation_needed',
  'time_limit_reached',
  'error_occurred'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Multi-agent conversation sessions
CREATE TABLE multi_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants TEXT[] NOT NULL, -- Array of agentIds
  participant_roles JSONB NOT NULL, -- { agentId: role }
  participant_priorities JSONB NOT NULL DEFAULT '{}', -- { agentId: priority }
  context JSONB NOT NULL,
  strategy turn_taking_strategy NOT NULL DEFAULT 'round_robin',
  status dialogue_status NOT NULL DEFAULT 'active',
  outcome dialogue_outcome,
  current_speaker TEXT,
  turn_order TEXT[] NOT NULL,
  total_turns INTEGER NOT NULL DEFAULT 0,
  max_turns INTEGER,
  time_limit INTEGER, -- seconds
  shared_state JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  organization_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_participants_not_empty CHECK (array_length(participants, 1) > 0),
  CONSTRAINT check_turn_order_not_empty CHECK (array_length(turn_order, 1) > 0),
  CONSTRAINT check_max_turns_positive CHECK (max_turns IS NULL OR max_turns > 0),
  CONSTRAINT check_time_limit_positive CHECK (time_limit IS NULL OR time_limit > 0)
);

-- Multi-agent dialogue turns
CREATE TABLE multi_agent_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multi_agent_conversations(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  turn_type turn_type NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
  next_speaker TEXT,
  actions JSONB, -- Array of TurnAction objects
  referenced_turns UUID[], -- IDs of previous turns referenced
  processing_time INTEGER, -- milliseconds
  tokens_used INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE (session_id, turn_number),
  CONSTRAINT check_turn_number_positive CHECK (turn_number > 0)
);

-- Dialogue interruptions
CREATE TABLE dialogue_interruptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multi_agent_conversations(id) ON DELETE CASCADE,
  agent_id TEXT,
  reason interruption_reason NOT NULL,
  details TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_action TEXT CHECK (resolution_action IN ('resume', 'terminate', 'redirect')),
  new_speaker TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Conversation indexes
CREATE INDEX idx_multi_agent_conversations_status ON multi_agent_conversations(status);
CREATE INDEX idx_multi_agent_conversations_strategy ON multi_agent_conversations(strategy);
CREATE INDEX idx_multi_agent_conversations_organization ON multi_agent_conversations(organization_id);
CREATE INDEX idx_multi_agent_conversations_created_by ON multi_agent_conversations(created_by);
CREATE INDEX idx_multi_agent_conversations_started_at ON multi_agent_conversations(started_at);
CREATE INDEX idx_multi_agent_conversations_completed_at ON multi_agent_conversations(completed_at);
CREATE INDEX idx_multi_agent_conversations_participants ON multi_agent_conversations USING GIN (participants);

-- Turn indexes
CREATE INDEX idx_multi_agent_turns_session ON multi_agent_turns(session_id);
CREATE INDEX idx_multi_agent_turns_agent ON multi_agent_turns(agent_id);
CREATE INDEX idx_multi_agent_turns_turn_number ON multi_agent_turns(turn_number);
CREATE INDEX idx_multi_agent_turns_turn_type ON multi_agent_turns(turn_type);
CREATE INDEX idx_multi_agent_turns_created_at ON multi_agent_turns(created_at);

-- Interruption indexes
CREATE INDEX idx_dialogue_interruptions_session ON dialogue_interruptions(session_id);
CREATE INDEX idx_dialogue_interruptions_agent ON dialogue_interruptions(agent_id);
CREATE INDEX idx_dialogue_interruptions_reason ON dialogue_interruptions(reason);
CREATE INDEX idx_dialogue_interruptions_resolved ON dialogue_interruptions(resolved);
CREATE INDEX idx_dialogue_interruptions_created_at ON dialogue_interruptions(created_at);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get dialogue analytics
CREATE OR REPLACE FUNCTION get_dialogue_analytics(
  p_session_id UUID
)
RETURNS TABLE (
  total_turns INTEGER,
  avg_turn_duration NUMERIC,
  participant_stats JSONB,
  turn_distribution JSONB,
  interruption_count BIGINT,
  outcome dialogue_outcome,
  duration INTEGER
) AS $$
DECLARE
  v_started_at TIMESTAMP WITH TIME ZONE;
  v_completed_at TIMESTAMP WITH TIME ZONE;
  v_outcome dialogue_outcome;
BEGIN
  -- Get session metadata
  SELECT started_at, completed_at, outcome
  INTO v_started_at, v_completed_at, v_outcome
  FROM multi_agent_conversations
  WHERE id = p_session_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM multi_agent_turns WHERE session_id = p_session_id) as total_turns,
    (SELECT AVG(processing_time)::NUMERIC FROM multi_agent_turns WHERE session_id = p_session_id AND processing_time IS NOT NULL) as avg_turn_duration,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'agentId', agent_id,
          'turnCount', turn_count,
          'avgConfidence', avg_confidence,
          'turnTypes', turn_types
        )
      )
      FROM (
        SELECT
          agent_id,
          COUNT(*)::INTEGER as turn_count,
          AVG(confidence)::NUMERIC as avg_confidence,
          jsonb_object_agg(turn_type, count) as turn_types
        FROM (
          SELECT
            agent_id,
            turn_type,
            COUNT(*) as count,
            confidence
          FROM multi_agent_turns
          WHERE session_id = p_session_id
          GROUP BY agent_id, turn_type, confidence
        ) type_counts
        GROUP BY agent_id
      ) agent_stats
    ) as participant_stats,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'agentId', agent_id,
          'percentage', percentage
        )
      )
      FROM (
        SELECT
          agent_id,
          (COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM multi_agent_turns WHERE session_id = p_session_id) * 100)::NUMERIC as percentage
        FROM multi_agent_turns
        WHERE session_id = p_session_id
        GROUP BY agent_id
      ) distribution
    ) as turn_distribution,
    (SELECT COUNT(*) FROM dialogue_interruptions WHERE session_id = p_session_id) as interruption_count,
    v_outcome as outcome,
    COALESCE(EXTRACT(EPOCH FROM (v_completed_at - v_started_at))::INTEGER, EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER) as duration;
END;
$$ LANGUAGE plpgsql;

-- Get next speaker based on strategy
CREATE OR REPLACE FUNCTION get_next_speaker_round_robin(
  p_session_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_turn_order TEXT[];
  v_current_speaker TEXT;
  v_current_index INTEGER;
  v_next_index INTEGER;
BEGIN
  SELECT turn_order, current_speaker
  INTO v_turn_order, v_current_speaker
  FROM multi_agent_conversations
  WHERE id = p_session_id;

  IF v_current_speaker IS NULL THEN
    -- First turn, return first in order
    RETURN v_turn_order[1];
  END IF;

  -- Find current speaker index
  SELECT idx - 1 INTO v_current_index
  FROM unnest(v_turn_order) WITH ORDINALITY AS t(agent, idx)
  WHERE agent = v_current_speaker;

  -- Get next index (wrap around)
  v_next_index := (v_current_index % array_length(v_turn_order, 1)) + 1;

  RETURN v_turn_order[v_next_index];
END;
$$ LANGUAGE plpgsql;

-- Get turn patterns
CREATE OR REPLACE FUNCTION get_turn_patterns(
  p_session_id UUID
)
RETURNS TABLE (
  pattern TEXT,
  frequency BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH consecutive_turns AS (
    SELECT
      agent_id,
      LAG(agent_id) OVER (ORDER BY turn_number) as prev_agent,
      turn_number
    FROM multi_agent_turns
    WHERE session_id = p_session_id
  )
  SELECT
    prev_agent || ' → ' || agent_id as pattern,
    COUNT(*) as frequency
  FROM consecutive_turns
  WHERE prev_agent IS NOT NULL
  GROUP BY prev_agent, agent_id
  ORDER BY frequency DESC;
END;
$$ LANGUAGE plpgsql;

-- Get active conversations
CREATE OR REPLACE FUNCTION get_active_conversations(
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  participants TEXT[],
  strategy turn_taking_strategy,
  total_turns INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  time_elapsed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.participants,
    c.strategy,
    c.total_turns,
    c.started_at,
    EXTRACT(EPOCH FROM (NOW() - c.started_at))::INTEGER as time_elapsed
  FROM multi_agent_conversations c
  WHERE c.status = 'active'
    AND (p_organization_id IS NULL OR c.organization_id = p_organization_id)
  ORDER BY c.started_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Check if dialogue should expire
CREATE OR REPLACE FUNCTION check_dialogue_expiry(
  p_session_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_time_limit INTEGER;
  v_started_at TIMESTAMP WITH TIME ZONE;
  v_elapsed INTEGER;
BEGIN
  SELECT time_limit, started_at
  INTO v_time_limit, v_started_at
  FROM multi_agent_conversations
  WHERE id = p_session_id;

  IF v_time_limit IS NULL THEN
    RETURN false;
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER;

  RETURN v_elapsed >= v_time_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE multi_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_agent_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_interruptions ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY select_org_conversations
  ON multi_agent_conversations
  FOR SELECT
  USING (true); -- TODO: Add proper org check

CREATE POLICY insert_conversations
  ON multi_agent_conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY update_conversations
  ON multi_agent_conversations
  FOR UPDATE
  USING (true);

-- Turn policies
CREATE POLICY select_turns
  ON multi_agent_turns
  FOR SELECT
  USING (true);

CREATE POLICY insert_turns
  ON multi_agent_turns
  FOR INSERT
  WITH CHECK (true);

-- Interruption policies
CREATE POLICY select_interruptions
  ON dialogue_interruptions
  FOR SELECT
  USING (true);

CREATE POLICY insert_interruptions
  ON dialogue_interruptions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY update_interruptions
  ON dialogue_interruptions
  FOR UPDATE
  USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at on conversation changes
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
  BEFORE UPDATE ON multi_agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Auto-increment total_turns when turn is added
CREATE OR REPLACE FUNCTION increment_total_turns()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE multi_agent_conversations
  SET total_turns = total_turns + 1
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_total_turns
  AFTER INSERT ON multi_agent_turns
  FOR EACH ROW
  EXECUTE FUNCTION increment_total_turns();

-- Auto-mark session as interrupted when interruption occurs
CREATE OR REPLACE FUNCTION mark_session_interrupted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE multi_agent_conversations
  SET status = 'interrupted'
  WHERE id = NEW.session_id
    AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_session_interrupted
  AFTER INSERT ON dialogue_interruptions
  FOR EACH ROW
  EXECUTE FUNCTION mark_session_interrupted();

-- Auto-expire old active conversations (TTL cleanup)
CREATE OR REPLACE FUNCTION expire_old_conversations()
RETURNS void AS $$
BEGIN
  UPDATE multi_agent_conversations
  SET status = 'expired',
      completed_at = NOW()
  WHERE status = 'active'
    AND time_limit IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER >= time_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run expiry check (requires pg_cron extension)
-- Note: This is commented out as pg_cron may not be available
-- SELECT cron.schedule('expire-conversations', '* * * * *', 'SELECT expire_old_conversations()');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE multi_agent_conversations IS 'Stores multi-agent conversation sessions with turn-taking coordination';
COMMENT ON TABLE multi_agent_turns IS 'Stores individual turns in multi-agent dialogues';
COMMENT ON TABLE dialogue_interruptions IS 'Stores interruption events in multi-agent conversations';
COMMENT ON COLUMN multi_agent_conversations.strategy IS 'Turn-taking strategy for speaker selection';
COMMENT ON COLUMN multi_agent_conversations.turn_order IS 'Ordered list of agent IDs for turn rotation';
COMMENT ON COLUMN multi_agent_conversations.shared_state IS 'Shared context/data accessible to all participants';
COMMENT ON COLUMN multi_agent_turns.actions IS 'JSON array of actions taken during this turn';
COMMENT ON COLUMN multi_agent_turns.referenced_turns IS 'UUIDs of previous turns referenced in this turn';
