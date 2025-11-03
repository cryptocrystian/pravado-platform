-- =====================================================
-- AGENT COLLABORATION LOGS TABLE
-- Sprint 43 Phase 3.5.2
-- =====================================================
--
-- Purpose: Track agent-to-agent collaboration, escalation, and delegation
-- Enables transparency and analytics for multi-agent workflows
--

-- Create collaboration type enum
CREATE TYPE collaboration_type AS ENUM ('escalation', 'delegation', 'coordination');

-- Create collaboration status enum
CREATE TYPE collaboration_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Create agent_collaboration_logs table
CREATE TABLE IF NOT EXISTS agent_collaboration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Collaboration type
  collaboration_type collaboration_type NOT NULL,

  -- Agents involved
  initiating_agent_id UUID NOT NULL,
  target_agent_ids UUID[] NOT NULL,

  -- Organization context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Task context
  task_context JSONB NOT NULL DEFAULT '{}',

  -- Decision reasoning
  reasoning TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Alternatives considered
  alternatives_considered JSONB NOT NULL DEFAULT '[]',

  -- Execution tracking
  execution_ids UUID[] NOT NULL DEFAULT '{}',

  -- Status and outcome
  status collaboration_status NOT NULL DEFAULT 'pending',
  outcome JSONB,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for querying by initiating agent
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_initiating_agent
  ON agent_collaboration_logs(initiating_agent_id);

-- Index for querying by target agents (GIN for array)
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_target_agents
  ON agent_collaboration_logs USING GIN (target_agent_ids);

-- Index for querying by organization
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_organization
  ON agent_collaboration_logs(organization_id);

-- Index for querying by collaboration type
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_type
  ON agent_collaboration_logs(collaboration_type);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_status
  ON agent_collaboration_logs(status);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_created_at
  ON agent_collaboration_logs(created_at DESC);

-- Composite index for agent analytics
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_agent_org_created
  ON agent_collaboration_logs(initiating_agent_id, organization_id, created_at DESC);

-- Composite index for collaboration type analytics
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_type_org_created
  ON agent_collaboration_logs(collaboration_type, organization_id, created_at DESC);

-- GIN index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_task_context
  ON agent_collaboration_logs USING GIN (task_context);

CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_alternatives
  ON agent_collaboration_logs USING GIN (alternatives_considered);

CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_outcome
  ON agent_collaboration_logs USING GIN (outcome);

CREATE INDEX IF NOT EXISTS idx_agent_collab_logs_metadata
  ON agent_collaboration_logs USING GIN (metadata);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE agent_collaboration_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view logs from their organization
CREATE POLICY agent_collab_logs_select_policy ON agent_collaboration_logs
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only insert logs for their organization
CREATE POLICY agent_collab_logs_insert_policy ON agent_collaboration_logs
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only update logs from their organization
CREATE POLICY agent_collab_logs_update_policy ON agent_collaboration_logs
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only delete logs from their organization
CREATE POLICY agent_collab_logs_delete_policy ON agent_collaboration_logs
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get collaboration statistics for an agent
CREATE OR REPLACE FUNCTION get_agent_collaboration_stats(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  total_collaborations INTEGER,
  total_escalations INTEGER,
  total_delegations INTEGER,
  total_coordinations INTEGER,
  success_rate DECIMAL,
  avg_confidence DECIMAL,
  most_frequent_collaborator_id UUID,
  most_frequent_collaborator_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE collaboration_type = 'escalation')::INTEGER as escalations,
      COUNT(*) FILTER (WHERE collaboration_type = 'delegation')::INTEGER as delegations,
      COUNT(*) FILTER (WHERE collaboration_type = 'coordination')::INTEGER as coordinations,
      (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) as success,
      AVG(confidence_score) as avg_conf
    FROM agent_collaboration_logs
    WHERE (initiating_agent_id = p_agent_id OR p_agent_id = ANY(target_agent_ids))
      AND created_at BETWEEN p_start_date AND p_end_date
  ),
  top_collaborator AS (
    SELECT
      unnest(target_agent_ids) as collaborator_id,
      COUNT(*)::INTEGER as count
    FROM agent_collaboration_logs
    WHERE initiating_agent_id = p_agent_id
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY collaborator_id
    ORDER BY count DESC
    LIMIT 1
  )
  SELECT
    stats.total,
    stats.escalations,
    stats.delegations,
    stats.coordinations,
    stats.success,
    stats.avg_conf,
    top_collaborator.collaborator_id,
    top_collaborator.count
  FROM stats
  LEFT JOIN top_collaborator ON true;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recent collaborations for an agent
CREATE OR REPLACE FUNCTION get_recent_agent_collaborations(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  collaboration_type collaboration_type,
  target_agent_ids UUID[],
  task_context JSONB,
  reasoning TEXT,
  confidence_score DECIMAL,
  status collaboration_status,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    acl.id,
    acl.collaboration_type,
    acl.target_agent_ids,
    acl.task_context,
    acl.reasoning,
    acl.confidence_score,
    acl.status,
    acl.created_at,
    acl.completed_at
  FROM agent_collaboration_logs acl
  WHERE acl.initiating_agent_id = p_agent_id
    OR p_agent_id = ANY(acl.target_agent_ids)
  ORDER BY acl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get collaboration trends by organization
CREATE OR REPLACE FUNCTION get_organization_collaboration_trends(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  collaboration_type collaboration_type,
  count INTEGER,
  success_rate DECIMAL,
  avg_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    acl.collaboration_type,
    COUNT(*)::INTEGER as count,
    (COUNT(*) FILTER (WHERE acl.status = 'completed')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) as success_rate,
    AVG(acl.confidence_score) as avg_confidence
  FROM agent_collaboration_logs acl
  WHERE acl.organization_id = p_organization_id
    AND acl.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY acl.collaboration_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get escalation patterns (who escalates to whom)
CREATE OR REPLACE FUNCTION get_escalation_patterns(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  initiating_agent_id UUID,
  target_agent_id UUID,
  escalation_count INTEGER,
  avg_confidence DECIMAL,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    acl.initiating_agent_id,
    unnest(acl.target_agent_ids) as target_agent_id,
    COUNT(*)::INTEGER as escalation_count,
    AVG(acl.confidence_score) as avg_confidence,
    (COUNT(*) FILTER (WHERE acl.status = 'completed')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) as success_rate
  FROM agent_collaboration_logs acl
  WHERE acl.organization_id = p_organization_id
    AND acl.collaboration_type = 'escalation'
    AND acl.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY acl.initiating_agent_id, target_agent_id
  ORDER BY escalation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get agent workload (how many active collaborations)
CREATE OR REPLACE FUNCTION get_agent_workload(
  p_agent_id UUID
)
RETURNS TABLE(
  pending_count INTEGER,
  in_progress_count INTEGER,
  total_active_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending,
    COUNT(*) FILTER (WHERE status = 'in_progress')::INTEGER as in_progress,
    COUNT(*)::INTEGER as total_active
  FROM agent_collaboration_logs
  WHERE (initiating_agent_id = p_agent_id OR p_agent_id = ANY(target_agent_ids))
    AND status IN ('pending', 'in_progress');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update completed_at when status changes to completed or failed
CREATE OR REPLACE FUNCTION update_collaboration_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collaboration_completed_at
  BEFORE UPDATE ON agent_collaboration_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_completed_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_collaboration_logs IS 'Logs of agent-to-agent collaboration, escalation, and delegation';
COMMENT ON COLUMN agent_collaboration_logs.id IS 'Unique identifier for the collaboration log';
COMMENT ON COLUMN agent_collaboration_logs.collaboration_type IS 'Type of collaboration (escalation, delegation, coordination)';
COMMENT ON COLUMN agent_collaboration_logs.initiating_agent_id IS 'ID of the agent initiating the collaboration';
COMMENT ON COLUMN agent_collaboration_logs.target_agent_ids IS 'IDs of target/receiving agents';
COMMENT ON COLUMN agent_collaboration_logs.organization_id IS 'Organization context for multi-tenancy';
COMMENT ON COLUMN agent_collaboration_logs.task_context IS 'Context of the task being collaborated on';
COMMENT ON COLUMN agent_collaboration_logs.reasoning IS 'Reasoning for the collaboration decision';
COMMENT ON COLUMN agent_collaboration_logs.confidence_score IS 'Confidence score (0-1) for the collaboration';
COMMENT ON COLUMN agent_collaboration_logs.alternatives_considered IS 'Alternative agents that were considered';
COMMENT ON COLUMN agent_collaboration_logs.execution_ids IS 'Array of execution IDs resulting from collaboration';
COMMENT ON COLUMN agent_collaboration_logs.status IS 'Current status of the collaboration';
COMMENT ON COLUMN agent_collaboration_logs.outcome IS 'Final outcome of the collaboration';
COMMENT ON COLUMN agent_collaboration_logs.metadata IS 'Additional metadata';
COMMENT ON COLUMN agent_collaboration_logs.created_at IS 'Timestamp when collaboration was initiated';
COMMENT ON COLUMN agent_collaboration_logs.completed_at IS 'Timestamp when collaboration completed or failed';

COMMENT ON FUNCTION get_agent_collaboration_stats IS 'Get collaboration statistics for an agent over a time period';
COMMENT ON FUNCTION get_recent_agent_collaborations IS 'Get recent collaboration logs for an agent';
COMMENT ON FUNCTION get_organization_collaboration_trends IS 'Get collaboration trends for an organization';
COMMENT ON FUNCTION get_escalation_patterns IS 'Get escalation patterns showing who escalates to whom';
COMMENT ON FUNCTION get_agent_workload IS 'Get current workload for an agent';
