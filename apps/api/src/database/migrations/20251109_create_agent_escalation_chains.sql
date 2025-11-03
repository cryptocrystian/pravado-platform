-- =====================================================
-- AGENT ESCALATION CHAINS MIGRATION
-- Sprint 51 Phase 4.7
-- =====================================================
--
-- Purpose: Advanced escalation logic & multi-agent handoff system
-- Creates: Tables, indexes, functions, RLS policies
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE escalation_type AS ENUM (
  'skill_based',
  'role_based',
  'last_successful',
  'default_chain',
  'manual',
  'confidence_threshold'
);

CREATE TYPE escalation_reason AS ENUM (
  'low_confidence',
  'missing_skill',
  'complexity_threshold',
  'error_occurred',
  'timeout',
  'manual_override',
  'policy_violation',
  'missing_context',
  'user_requested',
  'task_reassignment'
);

CREATE TYPE escalation_outcome AS ENUM (
  'success',
  'failed',
  'no_agent_available',
  'timeout',
  'rejected',
  'partial',
  'fallback_used'
);

CREATE TYPE handoff_method AS ENUM (
  'direct',
  'skill_match',
  'role_priority',
  'last_successful',
  'round_robin',
  'load_balanced'
);

CREATE TYPE escalation_path_type AS ENUM (
  'sequential',
  'parallel',
  'conditional',
  'hybrid'
);

CREATE TYPE fallback_strategy AS ENUM (
  'retry_default',
  'return_to_user',
  'escalate_to_human',
  'use_last_successful',
  'queue_for_later'
);

-- =====================================================
-- MAIN TABLE: agent_escalation_logs
-- =====================================================

CREATE TABLE agent_escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id UUID NOT NULL,
  to_agent_id UUID,
  escalation_type escalation_type NOT NULL,
  reason escalation_reason NOT NULL,
  outcome escalation_outcome NOT NULL,
  method handoff_method,
  attempted_agents UUID[] NOT NULL DEFAULT '{}',
  path TEXT,
  context JSONB,
  metadata JSONB,
  user_id UUID,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_attempted_agents CHECK (array_length(attempted_agents, 1) >= 0)
);

-- =====================================================
-- ESCALATION PATHS TABLE
-- =====================================================

CREATE TABLE agent_escalation_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  path_type escalation_path_type NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  organization_id UUID,
  trigger_conditions JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_path_name_per_org UNIQUE (name, organization_id),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
  CONSTRAINT only_one_default_per_org EXCLUDE (organization_id WITH =) WHERE (is_default = true AND enabled = true),
  CONSTRAINT valid_steps CHECK (jsonb_typeof(steps) = 'array')
);

-- =====================================================
-- INDEXES
-- =====================================================

-- agent_escalation_logs indexes
CREATE INDEX idx_escalation_logs_from_agent ON agent_escalation_logs(from_agent_id);
CREATE INDEX idx_escalation_logs_to_agent ON agent_escalation_logs(to_agent_id);
CREATE INDEX idx_escalation_logs_org ON agent_escalation_logs(organization_id);
CREATE INDEX idx_escalation_logs_user ON agent_escalation_logs(user_id);
CREATE INDEX idx_escalation_logs_created_at ON agent_escalation_logs(created_at DESC);
CREATE INDEX idx_escalation_logs_type ON agent_escalation_logs(escalation_type);
CREATE INDEX idx_escalation_logs_reason ON agent_escalation_logs(reason);
CREATE INDEX idx_escalation_logs_outcome ON agent_escalation_logs(outcome);

-- GIN indexes for arrays and JSONB
CREATE INDEX idx_escalation_logs_attempted ON agent_escalation_logs USING GIN(attempted_agents);
CREATE INDEX idx_escalation_logs_context ON agent_escalation_logs USING GIN(context);
CREATE INDEX idx_escalation_logs_metadata ON agent_escalation_logs USING GIN(metadata);

-- Composite indexes for common queries
CREATE INDEX idx_escalation_logs_from_created ON agent_escalation_logs(from_agent_id, created_at DESC);
CREATE INDEX idx_escalation_logs_to_created ON agent_escalation_logs(to_agent_id, created_at DESC);
CREATE INDEX idx_escalation_logs_org_created ON agent_escalation_logs(organization_id, created_at DESC);
CREATE INDEX idx_escalation_logs_outcome_created ON agent_escalation_logs(outcome, created_at DESC);

-- agent_escalation_paths indexes
CREATE INDEX idx_escalation_paths_org ON agent_escalation_paths(organization_id);
CREATE INDEX idx_escalation_paths_type ON agent_escalation_paths(path_type);
CREATE INDEX idx_escalation_paths_enabled ON agent_escalation_paths(enabled);
CREATE INDEX idx_escalation_paths_priority ON agent_escalation_paths(priority DESC);
CREATE INDEX idx_escalation_paths_default ON agent_escalation_paths(is_default) WHERE is_default = true;

-- GIN indexes for JSONB
CREATE INDEX idx_escalation_paths_steps ON agent_escalation_paths USING GIN(steps);
CREATE INDEX idx_escalation_paths_triggers ON agent_escalation_paths USING GIN(trigger_conditions);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get escalation metrics for an agent
 */
CREATE OR REPLACE FUNCTION get_escalation_metrics(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_escalations BIGINT,
  successful_escalations BIGINT,
  failed_escalations BIGINT,
  success_rate NUMERIC,
  escalations_by_reason JSONB,
  escalations_by_type JSONB,
  outcome_distribution JSONB,
  avg_processing_time NUMERIC,
  avg_retry_count NUMERIC,
  top_escalation_targets JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH escalation_data AS (
    SELECT
      escalation_type,
      reason,
      outcome,
      to_agent_id,
      array_length(attempted_agents, 1) AS retry_count,
      EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY from_agent_id ORDER BY created_at))) AS processing_time
    FROM agent_escalation_logs
    WHERE from_agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ),
  reason_counts AS (
    SELECT
      jsonb_object_agg(reason::TEXT, count) AS distribution
    FROM (
      SELECT reason, COUNT(*) AS count
      FROM escalation_data
      GROUP BY reason
    ) sub
  ),
  type_counts AS (
    SELECT
      jsonb_object_agg(escalation_type::TEXT, count) AS distribution
    FROM (
      SELECT escalation_type, COUNT(*) AS count
      FROM escalation_data
      GROUP BY escalation_type
    ) sub
  ),
  outcome_counts AS (
    SELECT
      jsonb_object_agg(outcome::TEXT, count) AS distribution
    FROM (
      SELECT outcome, COUNT(*) AS count
      FROM escalation_data
      GROUP BY outcome
    ) sub
  ),
  top_targets AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'agentId', to_agent_id,
          'count', count,
          'successRate', ROUND((success_count::NUMERIC / count) * 100, 2)
        ) ORDER BY count DESC
      ) FILTER (WHERE rn <= 5) AS targets
    FROM (
      SELECT
        to_agent_id,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE outcome = 'success') AS success_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
      FROM escalation_data
      WHERE to_agent_id IS NOT NULL
      GROUP BY to_agent_id
    ) sub
  )
  SELECT
    COUNT(*)::BIGINT AS total_escalations,
    COUNT(*) FILTER (WHERE outcome = 'success')::BIGINT AS successful_escalations,
    COUNT(*) FILTER (WHERE outcome IN ('failed', 'no_agent_available', 'timeout', 'rejected'))::BIGINT AS failed_escalations,
    ROUND((COUNT(*) FILTER (WHERE outcome = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS success_rate,
    COALESCE((SELECT distribution FROM reason_counts), '{}'::JSONB) AS escalations_by_reason,
    COALESCE((SELECT distribution FROM type_counts), '{}'::JSONB) AS escalations_by_type,
    COALESCE((SELECT distribution FROM outcome_counts), '{}'::JSONB) AS outcome_distribution,
    ROUND(AVG(processing_time), 2) AS avg_processing_time,
    ROUND(AVG(retry_count), 2) AS avg_retry_count,
    COALESCE((SELECT targets FROM top_targets), '[]'::JSONB) AS top_escalation_targets
  FROM escalation_data;
END;
$$ LANGUAGE plpgsql;

/**
 * Get escalation trends over time
 */
CREATE OR REPLACE FUNCTION get_escalation_trends(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_interval TEXT DEFAULT 'day'
)
RETURNS TABLE (
  date TEXT,
  total_escalations BIGINT,
  successful_escalations BIGINT,
  failed_escalations BIGINT,
  avg_processing_time NUMERIC,
  top_reasons JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT
      DATE_TRUNC(p_interval, created_at) AS period,
      outcome,
      reason,
      array_length(attempted_agents, 1) AS attempts,
      EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY from_agent_id ORDER BY created_at))) AS processing_time
    FROM agent_escalation_logs
    WHERE from_agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ),
  top_reasons_by_period AS (
    SELECT
      period,
      jsonb_agg(
        jsonb_build_object(
          'reason', reason,
          'count', count
        ) ORDER BY count DESC
      ) FILTER (WHERE rn <= 3) AS top_reasons
    FROM (
      SELECT
        period,
        reason,
        COUNT(*) AS count,
        ROW_NUMBER() OVER (PARTITION BY period ORDER BY COUNT(*) DESC) AS rn
      FROM daily_data
      GROUP BY period, reason
    ) sub
    GROUP BY period
  )
  SELECT
    TO_CHAR(dd.period, 'YYYY-MM-DD') AS date,
    COUNT(*)::BIGINT AS total_escalations,
    COUNT(*) FILTER (WHERE dd.outcome = 'success')::BIGINT AS successful_escalations,
    COUNT(*) FILTER (WHERE dd.outcome IN ('failed', 'no_agent_available', 'timeout', 'rejected'))::BIGINT AS failed_escalations,
    ROUND(AVG(dd.processing_time), 2) AS avg_processing_time,
    COALESCE(tr.top_reasons, '[]'::JSONB) AS top_reasons
  FROM daily_data dd
  LEFT JOIN top_reasons_by_period tr ON dd.period = tr.period
  GROUP BY dd.period, tr.top_reasons
  ORDER BY dd.period;
END;
$$ LANGUAGE plpgsql;

/**
 * Get escalation path performance
 */
CREATE OR REPLACE FUNCTION get_escalation_path_performance(
  p_organization_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  path_id UUID,
  path_name VARCHAR,
  total_uses BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate NUMERIC,
  avg_steps_used NUMERIC,
  avg_processing_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH path_usage AS (
    SELECT
      aep.id,
      aep.name,
      ael.outcome,
      jsonb_array_length(COALESCE(aep.steps, '[]'::JSONB)) AS total_steps,
      array_length(ael.attempted_agents, 1) AS steps_used,
      EXTRACT(EPOCH FROM (ael.created_at - LAG(ael.created_at) OVER (PARTITION BY ael.from_agent_id ORDER BY ael.created_at))) AS processing_time
    FROM agent_escalation_logs ael
    JOIN agent_escalation_paths aep ON ael.path = aep.id::TEXT
    WHERE (p_organization_id IS NULL OR aep.organization_id = p_organization_id)
      AND (p_start_date IS NULL OR ael.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ael.created_at <= p_end_date)
  )
  SELECT
    pu.id AS path_id,
    pu.name AS path_name,
    COUNT(*)::BIGINT AS total_uses,
    COUNT(*) FILTER (WHERE pu.outcome = 'success')::BIGINT AS success_count,
    COUNT(*) FILTER (WHERE pu.outcome IN ('failed', 'no_agent_available', 'timeout', 'rejected'))::BIGINT AS failure_count,
    ROUND((COUNT(*) FILTER (WHERE pu.outcome = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS success_rate,
    ROUND(AVG(pu.steps_used), 2) AS avg_steps_used,
    ROUND(AVG(pu.processing_time), 2) AS avg_processing_time
  FROM path_usage pu
  GROUP BY pu.id, pu.name
  ORDER BY total_uses DESC;
END;
$$ LANGUAGE plpgsql;

/**
 * Get agent handoff statistics
 */
CREATE OR REPLACE FUNCTION get_agent_handoff_stats(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  handoffs_received BIGINT,
  handoffs_given BIGINT,
  net_handoffs BIGINT,
  top_source_agents JSONB,
  top_target_agents JSONB,
  avg_context_size NUMERIC,
  memory_preservation_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH received AS (
    SELECT COUNT(*)::BIGINT AS count
    FROM agent_escalation_logs
    WHERE to_agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ),
  given AS (
    SELECT COUNT(*)::BIGINT AS count
    FROM agent_escalation_logs
    WHERE from_agent_id = p_agent_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ),
  top_sources AS (
    SELECT
      jsonb_agg(
        jsonb_build_object('agentId', from_agent_id, 'count', count)
        ORDER BY count DESC
      ) FILTER (WHERE rn <= 5) AS sources
    FROM (
      SELECT
        from_agent_id,
        COUNT(*) AS count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
      FROM agent_escalation_logs
      WHERE to_agent_id = p_agent_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date
      GROUP BY from_agent_id
    ) sub
  ),
  top_targets AS (
    SELECT
      jsonb_agg(
        jsonb_build_object('agentId', to_agent_id, 'count', count)
        ORDER BY count DESC
      ) FILTER (WHERE rn <= 5) AS targets
    FROM (
      SELECT
        to_agent_id,
        COUNT(*) AS count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
      FROM agent_escalation_logs
      WHERE from_agent_id = p_agent_id
        AND to_agent_id IS NOT NULL
        AND created_at >= p_start_date
        AND created_at <= p_end_date
      GROUP BY to_agent_id
    ) sub
  ),
  context_stats AS (
    SELECT
      AVG(jsonb_array_length(COALESCE(context->'previousMessages', '[]'::JSONB))) AS avg_size,
      COUNT(*) FILTER (WHERE (metadata->>'memoryPreserved')::BOOLEAN = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS preservation_rate
    FROM agent_escalation_logs
    WHERE (from_agent_id = p_agent_id OR to_agent_id = p_agent_id)
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT
    (SELECT count FROM received) AS handoffs_received,
    (SELECT count FROM given) AS handoffs_given,
    (SELECT count FROM received) - (SELECT count FROM given) AS net_handoffs,
    COALESCE((SELECT sources FROM top_sources), '[]'::JSONB) AS top_source_agents,
    COALESCE((SELECT targets FROM top_targets), '[]'::JSONB) AS top_target_agents,
    ROUND((SELECT avg_size FROM context_stats), 2) AS avg_context_size,
    ROUND((SELECT preservation_rate FROM context_stats), 2) AS memory_preservation_rate;
END;
$$ LANGUAGE plpgsql;

/**
 * Get escalation history with filters
 */
CREATE OR REPLACE FUNCTION get_escalation_history(
  p_agent_id UUID DEFAULT NULL,
  p_from_agent_id UUID DEFAULT NULL,
  p_to_agent_id UUID DEFAULT NULL,
  p_escalation_type escalation_type DEFAULT NULL,
  p_reason escalation_reason DEFAULT NULL,
  p_outcome escalation_outcome DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  from_agent_id UUID,
  to_agent_id UUID,
  escalation_type escalation_type,
  reason escalation_reason,
  outcome escalation_outcome,
  method handoff_method,
  attempted_agents UUID[],
  path TEXT,
  context JSONB,
  metadata JSONB,
  user_id UUID,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ael.id,
    ael.from_agent_id,
    ael.to_agent_id,
    ael.escalation_type,
    ael.reason,
    ael.outcome,
    ael.method,
    ael.attempted_agents,
    ael.path,
    ael.context,
    ael.metadata,
    ael.user_id,
    ael.organization_id,
    ael.created_at
  FROM agent_escalation_logs ael
  WHERE (p_agent_id IS NULL OR (ael.from_agent_id = p_agent_id OR ael.to_agent_id = p_agent_id))
    AND (p_from_agent_id IS NULL OR ael.from_agent_id = p_from_agent_id)
    AND (p_to_agent_id IS NULL OR ael.to_agent_id = p_to_agent_id)
    AND (p_escalation_type IS NULL OR ael.escalation_type = p_escalation_type)
    AND (p_reason IS NULL OR ael.reason = p_reason)
    AND (p_outcome IS NULL OR ael.outcome = p_outcome)
    AND (p_start_date IS NULL OR ael.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ael.created_at <= p_end_date)
    AND (p_organization_id IS NULL OR ael.organization_id = p_organization_id)
  ORDER BY ael.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

/**
 * Get escalation paths by query
 */
CREATE OR REPLACE FUNCTION get_escalation_paths(
  p_organization_id UUID DEFAULT NULL,
  p_path_type escalation_path_type DEFAULT NULL,
  p_enabled BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  path_type escalation_path_type,
  steps JSONB,
  organization_id UUID,
  trigger_conditions JSONB,
  is_default BOOLEAN,
  enabled BOOLEAN,
  priority INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aep.id,
    aep.name,
    aep.description,
    aep.path_type,
    aep.steps,
    aep.organization_id,
    aep.trigger_conditions,
    aep.is_default,
    aep.enabled,
    aep.priority,
    aep.created_at,
    aep.updated_at
  FROM agent_escalation_paths aep
  WHERE (p_organization_id IS NULL OR aep.organization_id = p_organization_id OR aep.organization_id IS NULL)
    AND (p_path_type IS NULL OR aep.path_type = p_path_type)
    AND (p_enabled IS NULL OR aep.enabled = p_enabled)
    AND (p_is_default IS NULL OR aep.is_default = p_is_default)
  ORDER BY aep.priority DESC, aep.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

/**
 * Trigger to automatically update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_escalation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escalation_paths_updated_at
BEFORE UPDATE ON agent_escalation_paths
FOR EACH ROW
EXECUTE FUNCTION update_escalation_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE agent_escalation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_escalation_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_escalation_logs
CREATE POLICY escalation_logs_org_isolation ON agent_escalation_logs
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY escalation_logs_insert ON agent_escalation_logs
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- RLS Policies for agent_escalation_paths
CREATE POLICY escalation_paths_org_isolation ON agent_escalation_paths
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY escalation_paths_insert ON agent_escalation_paths
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

CREATE POLICY escalation_paths_update ON agent_escalation_paths
  FOR UPDATE
  USING (
    organization_id IS NULL OR
    organization_id = current_setting('app.current_organization_id', true)::UUID
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_escalation_logs IS 'Logs all escalation events and agent handoffs';
COMMENT ON TABLE agent_escalation_paths IS 'Defines escalation paths and chains for automatic escalation';

COMMENT ON COLUMN agent_escalation_logs.attempted_agents IS 'Array of agent IDs that were attempted during escalation';
COMMENT ON COLUMN agent_escalation_logs.path IS 'ID of the escalation path used (if any)';
COMMENT ON COLUMN agent_escalation_logs.context IS 'Context data transferred during escalation';

COMMENT ON COLUMN agent_escalation_paths.steps IS 'Array of escalation path steps with conditions';
COMMENT ON COLUMN agent_escalation_paths.trigger_conditions IS 'Conditions that trigger this path';
COMMENT ON COLUMN agent_escalation_paths.priority IS 'Priority for path selection (1-10, higher = more important)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant appropriate permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT ON agent_escalation_logs TO authenticated_users;
-- GRANT SELECT, INSERT, UPDATE ON agent_escalation_paths TO admin_users;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
