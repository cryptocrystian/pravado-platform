-- =====================================================
-- AGENT CONFLICT RESOLUTION MIGRATION
-- Sprint 52 Phase 4.8
-- =====================================================
--
-- Purpose: Agent arbitration engine & conflict resolution protocols
-- Creates: Tables, indexes, functions, RLS policies, TTL triggers
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE arbitration_strategy AS ENUM (
  'majority_vote',
  'confidence_weighted',
  'escalate_to_facilitator',
  'defer_to_expert',
  'gpt4_moderated',
  'consensus_building',
  'round_robin_review'
);

CREATE TYPE conflict_type AS ENUM (
  'reasoning_mismatch',
  'tone_disagreement',
  'action_conflict',
  'entity_evaluation',
  'priority_conflict',
  'data_interpretation',
  'strategy_disagreement',
  'factual_contradiction',
  'ethical_disagreement'
);

CREATE TYPE conflict_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE resolution_outcome_type AS ENUM (
  'consensus_reached',
  'majority_decision',
  'expert_override',
  'escalated',
  'compromise',
  'deferred',
  'unresolved'
);

CREATE TYPE conflict_status AS ENUM (
  'detected',
  'under_review',
  'resolving',
  'resolved',
  'escalated',
  'expired'
);

CREATE TYPE arbitrator_role AS ENUM (
  'facilitator',
  'expert',
  'neutral_third_party',
  'ai_moderator',
  'human_reviewer'
);

-- =====================================================
-- MAIN TABLE: agent_conflict_logs
-- =====================================================

CREATE TABLE agent_conflict_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id VARCHAR(255) NOT NULL UNIQUE,
  agent_ids UUID[] NOT NULL,
  conflict_type conflict_type NOT NULL,
  severity conflict_severity NOT NULL,
  status conflict_status NOT NULL DEFAULT 'detected',
  conflicting_assertions JSONB NOT NULL DEFAULT '[]',
  suggested_strategy arbitration_strategy,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT NOT NULL,
  task_id VARCHAR(255),
  conversation_id VARCHAR(255),
  context JSONB,
  metadata JSONB,
  user_id UUID,
  organization_id UUID,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0),
  CONSTRAINT valid_agent_count CHECK (array_length(agent_ids, 1) >= 2),
  CONSTRAINT valid_assertions CHECK (jsonb_typeof(conflicting_assertions) = 'array'),
  CONSTRAINT resolved_has_timestamp CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL) OR
    (status != 'resolved')
  )
);

-- =====================================================
-- RESOLUTION OUTCOMES TABLE
-- =====================================================

CREATE TABLE agent_resolution_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id VARCHAR(255) NOT NULL,
  outcome_type resolution_outcome_type NOT NULL,
  strategy arbitration_strategy NOT NULL,
  resolution TEXT NOT NULL,
  chosen_agent UUID,
  chosen_position TEXT,
  consensus JSONB,
  votes JSONB DEFAULT '[]',
  arbitrator_feedback JSONB,
  processing_time INTEGER NOT NULL, -- milliseconds
  rounds_required INTEGER NOT NULL DEFAULT 1,
  participating_agents UUID[] NOT NULL DEFAULT '{}',
  task_id VARCHAR(255),
  conversation_id VARCHAR(255),
  user_id UUID,
  organization_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_processing_time CHECK (processing_time >= 0),
  CONSTRAINT valid_rounds CHECK (rounds_required >= 1),
  CONSTRAINT valid_votes CHECK (jsonb_typeof(votes) = 'array'),
  CONSTRAINT fk_conflict FOREIGN KEY (conflict_id) REFERENCES agent_conflict_logs(conflict_id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

-- agent_conflict_logs indexes
CREATE INDEX idx_conflict_logs_agents ON agent_conflict_logs USING GIN(agent_ids);
CREATE INDEX idx_conflict_logs_conflict_id ON agent_conflict_logs(conflict_id);
CREATE INDEX idx_conflict_logs_type ON agent_conflict_logs(conflict_type);
CREATE INDEX idx_conflict_logs_severity ON agent_conflict_logs(severity);
CREATE INDEX idx_conflict_logs_status ON agent_conflict_logs(status);
CREATE INDEX idx_conflict_logs_org ON agent_conflict_logs(organization_id);
CREATE INDEX idx_conflict_logs_task ON agent_conflict_logs(task_id);
CREATE INDEX idx_conflict_logs_conversation ON agent_conflict_logs(conversation_id);
CREATE INDEX idx_conflict_logs_detected_at ON agent_conflict_logs(detected_at DESC);
CREATE INDEX idx_conflict_logs_expires_at ON agent_conflict_logs(expires_at) WHERE expires_at IS NOT NULL;

-- GIN indexes for JSONB
CREATE INDEX idx_conflict_logs_assertions ON agent_conflict_logs USING GIN(conflicting_assertions);
CREATE INDEX idx_conflict_logs_context ON agent_conflict_logs USING GIN(context);
CREATE INDEX idx_conflict_logs_metadata ON agent_conflict_logs USING GIN(metadata);

-- Composite indexes
CREATE INDEX idx_conflict_logs_org_detected ON agent_conflict_logs(organization_id, detected_at DESC);
CREATE INDEX idx_conflict_logs_status_severity ON agent_conflict_logs(status, severity);

-- agent_resolution_outcomes indexes
CREATE INDEX idx_resolution_outcomes_conflict ON agent_resolution_outcomes(conflict_id);
CREATE INDEX idx_resolution_outcomes_type ON agent_resolution_outcomes(outcome_type);
CREATE INDEX idx_resolution_outcomes_strategy ON agent_resolution_outcomes(strategy);
CREATE INDEX idx_resolution_outcomes_org ON agent_resolution_outcomes(organization_id);
CREATE INDEX idx_resolution_outcomes_task ON agent_resolution_outcomes(task_id);
CREATE INDEX idx_resolution_outcomes_created_at ON agent_resolution_outcomes(created_at DESC);

-- GIN indexes for JSONB
CREATE INDEX idx_resolution_outcomes_votes ON agent_resolution_outcomes USING GIN(votes);
CREATE INDEX idx_resolution_outcomes_consensus ON agent_resolution_outcomes USING GIN(consensus);

-- agent_resolution_outcomes participating agents
CREATE INDEX idx_resolution_outcomes_agents ON agent_resolution_outcomes USING GIN(participating_agents);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get conflict metrics for an agent or organization
 */
CREATE OR REPLACE FUNCTION get_conflict_metrics(
  p_agent_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_conflicts BIGINT,
  resolved_conflicts BIGINT,
  unresolved_conflicts BIGINT,
  resolution_rate NUMERIC,
  conflicts_by_type JSONB,
  conflicts_by_severity JSONB,
  outcome_distribution JSONB,
  avg_resolution_time NUMERIC,
  avg_rounds_required NUMERIC,
  most_frequent_conflict_pairs JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH conflict_data AS (
    SELECT
      acl.id,
      acl.agent_ids,
      acl.conflict_type,
      acl.severity,
      acl.status,
      acl.detected_at,
      acl.resolved_at,
      aro.outcome_type,
      aro.processing_time,
      aro.rounds_required
    FROM agent_conflict_logs acl
    LEFT JOIN agent_resolution_outcomes aro ON acl.conflict_id = aro.conflict_id
    WHERE (p_agent_id IS NULL OR p_agent_id = ANY(acl.agent_ids))
      AND (p_organization_id IS NULL OR acl.organization_id = p_organization_id)
      AND (p_start_date IS NULL OR acl.detected_at >= p_start_date)
      AND (p_end_date IS NULL OR acl.detected_at <= p_end_date)
  ),
  type_counts AS (
    SELECT
      jsonb_object_agg(conflict_type::TEXT, count) AS distribution
    FROM (
      SELECT conflict_type, COUNT(*) AS count
      FROM conflict_data
      GROUP BY conflict_type
    ) sub
  ),
  severity_counts AS (
    SELECT
      jsonb_object_agg(severity::TEXT, count) AS distribution
    FROM (
      SELECT severity, COUNT(*) AS count
      FROM conflict_data
      GROUP BY severity
    ) sub
  ),
  outcome_counts AS (
    SELECT
      jsonb_object_agg(outcome_type::TEXT, count) AS distribution
    FROM (
      SELECT outcome_type, COUNT(*) AS count
      FROM conflict_data
      WHERE outcome_type IS NOT NULL
      GROUP BY outcome_type
    ) sub
  ),
  conflict_pairs AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'agentPair', ARRAY[agent_ids[1]::TEXT, agent_ids[2]::TEXT],
          'count', count,
          'topConflictTypes', top_types
        ) ORDER BY count DESC
      ) FILTER (WHERE rn <= 5) AS pairs
    FROM (
      SELECT
        agent_ids,
        COUNT(*) AS count,
        ARRAY_AGG(DISTINCT conflict_type) AS top_types,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
      FROM conflict_data
      WHERE array_length(agent_ids, 1) = 2
      GROUP BY agent_ids
    ) sub
  )
  SELECT
    COUNT(*)::BIGINT AS total_conflicts,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT AS resolved_conflicts,
    COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'expired'))::BIGINT AS unresolved_conflicts,
    ROUND((COUNT(*) FILTER (WHERE status = 'resolved')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS resolution_rate,
    COALESCE((SELECT distribution FROM type_counts), '{}'::JSONB) AS conflicts_by_type,
    COALESCE((SELECT distribution FROM severity_counts), '{}'::JSONB) AS conflicts_by_severity,
    COALESCE((SELECT distribution FROM outcome_counts), '{}'::JSONB) AS outcome_distribution,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) * 1000), 2) AS avg_resolution_time,
    ROUND(AVG(rounds_required), 2) AS avg_rounds_required,
    COALESCE((SELECT pairs FROM conflict_pairs), '[]'::JSONB) AS most_frequent_conflict_pairs
  FROM conflict_data;
END;
$$ LANGUAGE plpgsql;

/**
 * Get conflict trends over time
 */
CREATE OR REPLACE FUNCTION get_conflict_trends(
  p_agent_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_interval TEXT DEFAULT 'day'
)
RETURNS TABLE (
  date TEXT,
  total_conflicts BIGINT,
  resolved_conflicts BIGINT,
  unresolved_conflicts BIGINT,
  avg_severity NUMERIC,
  top_conflict_types JSONB,
  avg_resolution_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT
      DATE_TRUNC(p_interval, acl.detected_at) AS period,
      acl.status,
      acl.conflict_type,
      acl.severity,
      acl.detected_at,
      acl.resolved_at,
      CASE acl.severity
        WHEN 'low' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'high' THEN 3
        WHEN 'critical' THEN 4
      END AS severity_value
    FROM agent_conflict_logs acl
    WHERE (p_agent_id IS NULL OR p_agent_id = ANY(acl.agent_ids))
      AND (p_organization_id IS NULL OR acl.organization_id = p_organization_id)
      AND (p_start_date IS NULL OR acl.detected_at >= p_start_date)
      AND (p_end_date IS NULL OR acl.detected_at <= p_end_date)
  ),
  top_types_by_period AS (
    SELECT
      period,
      jsonb_agg(
        jsonb_build_object('type', conflict_type, 'count', count)
        ORDER BY count DESC
      ) FILTER (WHERE rn <= 3) AS top_types
    FROM (
      SELECT
        period,
        conflict_type,
        COUNT(*) AS count,
        ROW_NUMBER() OVER (PARTITION BY period ORDER BY COUNT(*) DESC) AS rn
      FROM daily_data
      GROUP BY period, conflict_type
    ) sub
    GROUP BY period
  )
  SELECT
    TO_CHAR(dd.period, 'YYYY-MM-DD') AS date,
    COUNT(*)::BIGINT AS total_conflicts,
    COUNT(*) FILTER (WHERE dd.status = 'resolved')::BIGINT AS resolved_conflicts,
    COUNT(*) FILTER (WHERE dd.status NOT IN ('resolved', 'expired'))::BIGINT AS unresolved_conflicts,
    ROUND(AVG(dd.severity_value), 2) AS avg_severity,
    COALESCE(tp.top_types, '[]'::JSONB) AS top_conflict_types,
    ROUND(AVG(EXTRACT(EPOCH FROM (dd.resolved_at - dd.detected_at)) * 1000), 2) AS avg_resolution_time
  FROM daily_data dd
  LEFT JOIN top_types_by_period tp ON dd.period = tp.period
  GROUP BY dd.period, tp.top_types
  ORDER BY dd.period;
END;
$$ LANGUAGE plpgsql;

/**
 * Get strategy performance
 */
CREATE OR REPLACE FUNCTION get_strategy_performance(
  p_organization_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  strategy arbitration_strategy,
  total_uses BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate NUMERIC,
  avg_resolution_time NUMERIC,
  avg_rounds_required NUMERIC,
  preferred_for_conflict_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH strategy_data AS (
    SELECT
      aro.strategy,
      aro.outcome_type,
      aro.processing_time,
      aro.rounds_required,
      acl.conflict_type
    FROM agent_resolution_outcomes aro
    JOIN agent_conflict_logs acl ON aro.conflict_id = acl.conflict_id
    WHERE (p_organization_id IS NULL OR aro.organization_id = p_organization_id)
      AND (p_start_date IS NULL OR aro.created_at >= p_start_date)
      AND (p_end_date IS NULL OR aro.created_at <= p_end_date)
  ),
  preferred_types AS (
    SELECT
      strategy,
      jsonb_agg(DISTINCT conflict_type) AS types
    FROM strategy_data
    GROUP BY strategy
  )
  SELECT
    sd.strategy,
    COUNT(*)::BIGINT AS total_uses,
    COUNT(*) FILTER (WHERE sd.outcome_type IN ('consensus_reached', 'majority_decision', 'expert_override', 'compromise'))::BIGINT AS success_count,
    COUNT(*) FILTER (WHERE sd.outcome_type IN ('unresolved', 'deferred'))::BIGINT AS failure_count,
    ROUND((COUNT(*) FILTER (WHERE sd.outcome_type IN ('consensus_reached', 'majority_decision', 'expert_override', 'compromise'))::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS success_rate,
    ROUND(AVG(sd.processing_time), 2) AS avg_resolution_time,
    ROUND(AVG(sd.rounds_required), 2) AS avg_rounds_required,
    COALESCE(pt.types, '[]'::JSONB) AS preferred_for_conflict_types
  FROM strategy_data sd
  LEFT JOIN preferred_types pt ON sd.strategy = pt.strategy
  GROUP BY sd.strategy, pt.types
  ORDER BY total_uses DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Get agent conflict profile
 */
CREATE OR REPLACE FUNCTION get_agent_conflict_profile(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_conflicts_involved BIGINT,
  conflicts_resolved BIGINT,
  win_rate NUMERIC,
  most_common_opponents JSONB,
  preferred_strategies JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_conflicts AS (
    SELECT
      acl.id,
      acl.agent_ids,
      acl.conflict_type,
      acl.status,
      aro.outcome_type,
      aro.strategy,
      aro.chosen_agent
    FROM agent_conflict_logs acl
    LEFT JOIN agent_resolution_outcomes aro ON acl.conflict_id = aro.conflict_id
    WHERE p_agent_id = ANY(acl.agent_ids)
      AND (p_start_date IS NULL OR acl.detected_at >= p_start_date)
      AND (p_end_date IS NULL OR acl.detected_at <= p_end_date)
  ),
  opponents AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'agentId', opponent_id,
          'conflictCount', count,
          'conflictTypes', conflict_types
        ) ORDER BY count DESC
      ) FILTER (WHERE rn <= 5) AS opponents
    FROM (
      SELECT
        UNNEST(agent_ids) AS opponent_id,
        COUNT(*) AS count,
        ARRAY_AGG(DISTINCT conflict_type) AS conflict_types,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
      FROM agent_conflicts
      WHERE UNNEST(agent_ids) != p_agent_id
      GROUP BY opponent_id
    ) sub
  ),
  strategies AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'strategy', strategy,
          'count', count,
          'successRate', ROUND((success_count::NUMERIC / count) * 100, 2)
        ) ORDER BY count DESC
      ) AS strategies
    FROM (
      SELECT
        strategy,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE chosen_agent = p_agent_id OR outcome_type IN ('consensus_reached', 'compromise')) AS success_count
      FROM agent_conflicts
      WHERE strategy IS NOT NULL
      GROUP BY strategy
    ) sub
  )
  SELECT
    COUNT(*)::BIGINT AS total_conflicts_involved,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT AS conflicts_resolved,
    ROUND((COUNT(*) FILTER (WHERE chosen_agent = p_agent_id)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE chosen_agent IS NOT NULL), 0)) * 100, 2) AS win_rate,
    COALESCE((SELECT opponents FROM opponents), '[]'::JSONB) AS most_common_opponents,
    COALESCE((SELECT strategies FROM strategies), '[]'::JSONB) AS preferred_strategies
  FROM agent_conflicts;
END;
$$ LANGUAGE plpgsql;

/**
 * Get conflict history with filters
 */
CREATE OR REPLACE FUNCTION get_conflict_history(
  p_agent_id UUID DEFAULT NULL,
  p_agent_ids UUID[] DEFAULT NULL,
  p_conflict_type conflict_type DEFAULT NULL,
  p_severity conflict_severity DEFAULT NULL,
  p_status conflict_status DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_task_id VARCHAR DEFAULT NULL,
  p_conversation_id VARCHAR DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF agent_conflict_logs AS $$
BEGIN
  RETURN QUERY
  SELECT acl.*
  FROM agent_conflict_logs acl
  WHERE (p_agent_id IS NULL OR p_agent_id = ANY(acl.agent_ids))
    AND (p_agent_ids IS NULL OR acl.agent_ids && p_agent_ids)
    AND (p_conflict_type IS NULL OR acl.conflict_type = p_conflict_type)
    AND (p_severity IS NULL OR acl.severity = p_severity)
    AND (p_status IS NULL OR acl.status = p_status)
    AND (p_start_date IS NULL OR acl.detected_at >= p_start_date)
    AND (p_end_date IS NULL OR acl.detected_at <= p_end_date)
    AND (p_task_id IS NULL OR acl.task_id = p_task_id)
    AND (p_conversation_id IS NULL OR acl.conversation_id = p_conversation_id)
    AND (p_organization_id IS NULL OR acl.organization_id = p_organization_id)
  ORDER BY acl.detected_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

/**
 * Get resolution outcomes with filters
 */
CREATE OR REPLACE FUNCTION get_resolution_outcomes(
  p_agent_id UUID DEFAULT NULL,
  p_conflict_id VARCHAR DEFAULT NULL,
  p_outcome_type resolution_outcome_type DEFAULT NULL,
  p_strategy arbitration_strategy DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_task_id VARCHAR DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF agent_resolution_outcomes AS $$
BEGIN
  RETURN QUERY
  SELECT aro.*
  FROM agent_resolution_outcomes aro
  WHERE (p_agent_id IS NULL OR p_agent_id = ANY(aro.participating_agents) OR aro.chosen_agent = p_agent_id)
    AND (p_conflict_id IS NULL OR aro.conflict_id = p_conflict_id)
    AND (p_outcome_type IS NULL OR aro.outcome_type = p_outcome_type)
    AND (p_strategy IS NULL OR aro.strategy = p_strategy)
    AND (p_start_date IS NULL OR aro.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aro.created_at <= p_end_date)
    AND (p_task_id IS NULL OR aro.task_id = p_task_id)
    AND (p_organization_id IS NULL OR aro.organization_id = p_organization_id)
  ORDER BY aro.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

/**
 * Trigger to automatically clean up expired conflicts
 */
CREATE OR REPLACE FUNCTION cleanup_expired_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_conflict_logs
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status NOT IN ('resolved', 'expired');

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup trigger periodically (simulated with INSERT trigger for demo)
-- In production, use pg_cron or similar
CREATE TRIGGER cleanup_expired_conflicts_trigger
AFTER INSERT ON agent_conflict_logs
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_conflicts();

/**
 * Trigger to update resolved_at when status changes to resolved
 */
CREATE OR REPLACE FUNCTION update_conflict_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conflict_resolved_at_trigger
BEFORE UPDATE ON agent_conflict_logs
FOR EACH ROW
EXECUTE FUNCTION update_conflict_resolved_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE agent_conflict_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_resolution_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_conflict_logs
CREATE POLICY conflict_logs_org_isolation ON agent_conflict_logs
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY conflict_logs_insert ON agent_conflict_logs
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- RLS Policies for agent_resolution_outcomes
CREATE POLICY resolution_outcomes_org_isolation ON agent_resolution_outcomes
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY resolution_outcomes_insert ON agent_resolution_outcomes
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_conflict_logs IS 'Logs all detected conflicts between agents';
COMMENT ON TABLE agent_resolution_outcomes IS 'Records resolution outcomes for agent conflicts';

COMMENT ON COLUMN agent_conflict_logs.agent_ids IS 'Array of agent IDs involved in the conflict';
COMMENT ON COLUMN agent_conflict_logs.conflicting_assertions IS 'JSONB array of conflicting positions from each agent';
COMMENT ON COLUMN agent_conflict_logs.expires_at IS 'Timestamp when conflict log expires (TTL)';

COMMENT ON COLUMN agent_resolution_outcomes.votes IS 'JSONB array of votes cast during resolution';
COMMENT ON COLUMN agent_resolution_outcomes.consensus IS 'JSONB object with consensus analysis';
COMMENT ON COLUMN agent_resolution_outcomes.processing_time IS 'Resolution processing time in milliseconds';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant appropriate permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT ON agent_conflict_logs TO authenticated_users;
-- GRANT SELECT, INSERT ON agent_resolution_outcomes TO authenticated_users;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
