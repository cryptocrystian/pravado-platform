-- =====================================================
-- AGENT PLAYBOOK DECISION LOGS TABLE
-- Sprint 43 Phase 3.5.1
-- =====================================================
--
-- Purpose: Track AI agent decisions when selecting and executing playbooks
-- This table logs the reasoning, context, and alternatives for each playbook selection
--

-- Create agent_playbook_logs table
CREATE TABLE IF NOT EXISTS agent_playbook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent and organization
  agent_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- User prompt and context
  user_prompt TEXT NOT NULL,
  agent_context JSONB NOT NULL DEFAULT '{}',

  -- LLM decision
  reasoning TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Selected playbook
  selected_playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  selected_playbook_name TEXT,
  playbook_found BOOLEAN NOT NULL DEFAULT false,

  -- Alternatives considered
  alternatives_considered JSONB NOT NULL DEFAULT '[]',

  -- Execution reference
  execution_id UUID REFERENCES playbook_executions(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for querying logs by agent
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_agent_id
  ON agent_playbook_logs(agent_id);

-- Index for querying logs by organization
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_organization_id
  ON agent_playbook_logs(organization_id);

-- Index for querying logs by playbook
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_playbook_id
  ON agent_playbook_logs(selected_playbook_id);

-- Index for querying logs by execution
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_execution_id
  ON agent_playbook_logs(execution_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_created_at
  ON agent_playbook_logs(created_at DESC);

-- Index for successful selections
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_playbook_found
  ON agent_playbook_logs(playbook_found)
  WHERE playbook_found = true;

-- Composite index for agent analytics
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_agent_org_created
  ON agent_playbook_logs(agent_id, organization_id, created_at DESC);

-- GIN index for JSONB columns (for efficient querying)
CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_agent_context
  ON agent_playbook_logs USING GIN (agent_context);

CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_alternatives
  ON agent_playbook_logs USING GIN (alternatives_considered);

CREATE INDEX IF NOT EXISTS idx_agent_playbook_logs_metadata
  ON agent_playbook_logs USING GIN (metadata);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE agent_playbook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view logs from their organization
CREATE POLICY agent_playbook_logs_select_policy ON agent_playbook_logs
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only insert logs for their organization
CREATE POLICY agent_playbook_logs_insert_policy ON agent_playbook_logs
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only update logs from their organization
CREATE POLICY agent_playbook_logs_update_policy ON agent_playbook_logs
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only delete logs from their organization
CREATE POLICY agent_playbook_logs_delete_policy ON agent_playbook_logs
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get agent playbook selection statistics
CREATE OR REPLACE FUNCTION get_agent_playbook_stats(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  total_decisions INTEGER,
  successful_selections INTEGER,
  failed_selections INTEGER,
  avg_confidence DECIMAL,
  most_selected_playbook_id UUID,
  most_selected_playbook_name TEXT,
  selection_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE playbook_found = true)::INTEGER as successful,
      COUNT(*) FILTER (WHERE playbook_found = false)::INTEGER as failed,
      AVG(confidence_score) as avg_conf
    FROM agent_playbook_logs
    WHERE agent_id = p_agent_id
      AND created_at BETWEEN p_start_date AND p_end_date
  ),
  top_playbook AS (
    SELECT
      selected_playbook_id,
      selected_playbook_name,
      COUNT(*)::INTEGER as count
    FROM agent_playbook_logs
    WHERE agent_id = p_agent_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND selected_playbook_id IS NOT NULL
    GROUP BY selected_playbook_id, selected_playbook_name
    ORDER BY count DESC
    LIMIT 1
  )
  SELECT
    stats.total,
    stats.successful,
    stats.failed,
    stats.avg_conf,
    top_playbook.selected_playbook_id,
    top_playbook.selected_playbook_name,
    top_playbook.count
  FROM stats
  LEFT JOIN top_playbook ON true;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recent agent decisions with context
CREATE OR REPLACE FUNCTION get_recent_agent_decisions(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  user_prompt TEXT,
  reasoning TEXT,
  selected_playbook_name TEXT,
  confidence_score DECIMAL,
  playbook_found BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    apl.id,
    apl.user_prompt,
    apl.reasoning,
    apl.selected_playbook_name,
    apl.confidence_score,
    apl.playbook_found,
    apl.created_at
  FROM agent_playbook_logs apl
  WHERE apl.agent_id = p_agent_id
  ORDER BY apl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get playbook selection trends
CREATE OR REPLACE FUNCTION get_playbook_selection_trends(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  playbook_id UUID,
  playbook_name TEXT,
  selection_count INTEGER,
  avg_confidence DECIMAL,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    apl.selected_playbook_id as playbook_id,
    apl.selected_playbook_name as playbook_name,
    COUNT(*)::INTEGER as selection_count,
    AVG(apl.confidence_score) as avg_confidence,
    (COUNT(*) FILTER (WHERE pe.status = 'completed')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) as success_rate
  FROM agent_playbook_logs apl
  LEFT JOIN playbook_executions pe ON pe.id = apl.execution_id
  WHERE apl.organization_id = p_organization_id
    AND apl.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND apl.selected_playbook_id IS NOT NULL
  GROUP BY apl.selected_playbook_id, apl.selected_playbook_name
  ORDER BY selection_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_playbook_logs IS 'Logs AI agent decisions when selecting and executing playbooks';
COMMENT ON COLUMN agent_playbook_logs.id IS 'Unique identifier for the decision log';
COMMENT ON COLUMN agent_playbook_logs.agent_id IS 'ID of the agent that made the decision';
COMMENT ON COLUMN agent_playbook_logs.organization_id IS 'Organization context for multi-tenancy';
COMMENT ON COLUMN agent_playbook_logs.user_prompt IS 'Original user prompt or request';
COMMENT ON COLUMN agent_playbook_logs.agent_context IS 'Full agent context (memory, permissions, conversation)';
COMMENT ON COLUMN agent_playbook_logs.reasoning IS 'LLM explanation for playbook selection';
COMMENT ON COLUMN agent_playbook_logs.confidence_score IS 'Confidence score (0-1) for the selection';
COMMENT ON COLUMN agent_playbook_logs.selected_playbook_id IS 'ID of the selected playbook';
COMMENT ON COLUMN agent_playbook_logs.selected_playbook_name IS 'Name of the selected playbook';
COMMENT ON COLUMN agent_playbook_logs.playbook_found IS 'Whether a suitable playbook was found';
COMMENT ON COLUMN agent_playbook_logs.alternatives_considered IS 'Alternative playbooks that were considered';
COMMENT ON COLUMN agent_playbook_logs.execution_id IS 'Reference to the resulting playbook execution';
COMMENT ON COLUMN agent_playbook_logs.metadata IS 'Additional metadata for the decision';
COMMENT ON COLUMN agent_playbook_logs.created_at IS 'Timestamp when the decision was made';

COMMENT ON FUNCTION get_agent_playbook_stats IS 'Get statistics for agent playbook selections over a time period';
COMMENT ON FUNCTION get_recent_agent_decisions IS 'Get recent playbook selection decisions for an agent';
COMMENT ON FUNCTION get_playbook_selection_trends IS 'Get playbook selection trends for an organization';
