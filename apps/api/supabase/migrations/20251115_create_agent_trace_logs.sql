-- =====================================================
-- AGENT TRACE LOGGING SYSTEM
-- Sprint 59 Phase 5.6
-- =====================================================
-- Purpose: Enable comprehensive debugging and trace logging for agent behavior
-- Tables: agent_trace_logs, agent_trace_nodes
-- Features: Full-text search, TTL cleanup, performance tracking, RLS

-- =====================================================
-- TABLE: agent_trace_logs
-- =====================================================
-- Stores top-level trace information for agent executions

CREATE TABLE IF NOT EXISTS agent_trace_logs (
  trace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  conversation_id UUID,
  turn_id UUID,

  -- Timing
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_duration INTEGER, -- milliseconds

  -- Structure
  root_node_ids UUID[] NOT NULL DEFAULT '{}',

  -- Metadata
  debug_metadata JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  searchable_text TEXT, -- For full-text search

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for agent_trace_logs
CREATE INDEX idx_agent_trace_logs_agent_id ON agent_trace_logs(agent_id);
CREATE INDEX idx_agent_trace_logs_tenant_id ON agent_trace_logs(tenant_id);
CREATE INDEX idx_agent_trace_logs_conversation_id ON agent_trace_logs(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_agent_trace_logs_turn_id ON agent_trace_logs(turn_id) WHERE turn_id IS NOT NULL;
CREATE INDEX idx_agent_trace_logs_created_at ON agent_trace_logs(created_at DESC);
CREATE INDEX idx_agent_trace_logs_expires_at ON agent_trace_logs(expires_at);
CREATE INDEX idx_agent_trace_logs_tags ON agent_trace_logs USING GIN(tags);

-- Full-text search index
CREATE INDEX idx_agent_trace_logs_search ON agent_trace_logs USING GIN(to_tsvector('english', COALESCE(searchable_text, '')));

-- =====================================================
-- TABLE: agent_trace_nodes
-- =====================================================
-- Stores individual nodes in the trace tree

CREATE TABLE IF NOT EXISTS agent_trace_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES agent_trace_logs(trace_id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES agent_trace_nodes(node_id) ON DELETE CASCADE,

  -- Node information
  node_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  label VARCHAR(255) NOT NULL,
  description TEXT,

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER, -- milliseconds

  -- Data
  metadata JSONB NOT NULL DEFAULT '{}',
  input_data JSONB,
  output_data JSONB,

  -- Error handling
  error_message TEXT,
  stack_trace TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for agent_trace_nodes
CREATE INDEX idx_agent_trace_nodes_trace_id ON agent_trace_nodes(trace_id);
CREATE INDEX idx_agent_trace_nodes_parent_node_id ON agent_trace_nodes(parent_node_id) WHERE parent_node_id IS NOT NULL;
CREATE INDEX idx_agent_trace_nodes_node_type ON agent_trace_nodes(node_type);
CREATE INDEX idx_agent_trace_nodes_severity ON agent_trace_nodes(severity);
CREATE INDEX idx_agent_trace_nodes_start_time ON agent_trace_nodes(start_time DESC);
CREATE INDEX idx_agent_trace_nodes_duration ON agent_trace_nodes(duration) WHERE duration IS NOT NULL;

-- =====================================================
-- FUNCTION: get_trace_for_turn
-- =====================================================
-- Retrieves the complete trace for a specific conversation turn

CREATE OR REPLACE FUNCTION get_trace_for_turn(p_turn_id UUID)
RETURNS TABLE (
  trace_id UUID,
  agent_id UUID,
  tenant_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_duration INTEGER,
  debug_metadata JSONB,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    atl.trace_id,
    atl.agent_id,
    atl.tenant_id,
    atl.start_time,
    atl.end_time,
    atl.total_duration,
    atl.debug_metadata,
    atl.tags
  FROM agent_trace_logs atl
  WHERE atl.turn_id = p_turn_id
  ORDER BY atl.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_traces_for_agent
-- =====================================================
-- Retrieves all traces for a specific agent with pagination

CREATE OR REPLACE FUNCTION get_traces_for_agent(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  trace_id UUID,
  conversation_id UUID,
  turn_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_duration INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    atl.trace_id,
    atl.conversation_id,
    atl.turn_id,
    atl.start_time,
    atl.end_time,
    atl.total_duration,
    atl.tags,
    atl.created_at
  FROM agent_trace_logs atl
  WHERE atl.agent_id = p_agent_id
  ORDER BY atl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_trace_node_path
-- =====================================================
-- Returns the full path from root to a specific node (breadcrumb trail)

CREATE OR REPLACE FUNCTION get_trace_node_path(p_node_id UUID)
RETURNS TABLE (
  node_id UUID,
  label VARCHAR(255),
  node_type VARCHAR(50),
  depth INTEGER
) AS $$
WITH RECURSIVE node_path AS (
  -- Base case: the target node
  SELECT
    atn.node_id,
    atn.parent_node_id,
    atn.label,
    atn.node_type,
    0 AS depth
  FROM agent_trace_nodes atn
  WHERE atn.node_id = p_node_id

  UNION ALL

  -- Recursive case: parent nodes
  SELECT
    atn.node_id,
    atn.parent_node_id,
    atn.label,
    atn.node_type,
    np.depth + 1
  FROM agent_trace_nodes atn
  INNER JOIN node_path np ON atn.node_id = np.parent_node_id
)
SELECT
  np.node_id,
  np.label,
  np.node_type,
  np.depth
FROM node_path np
ORDER BY np.depth DESC;
$$ LANGUAGE sql;

-- =====================================================
-- FUNCTION: get_trace_children
-- =====================================================
-- Returns all child nodes for a given node (for tree expansion)

CREATE OR REPLACE FUNCTION get_trace_children(p_node_id UUID)
RETURNS TABLE (
  node_id UUID,
  node_type VARCHAR(50),
  severity VARCHAR(20),
  label VARCHAR(255),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTEGER,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    atn.node_id,
    atn.node_type,
    atn.severity,
    atn.label,
    atn.start_time,
    atn.end_time,
    atn.duration,
    atn.error_message
  FROM agent_trace_nodes atn
  WHERE atn.parent_node_id = p_node_id
  ORDER BY atn.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: get_trace_summary
-- =====================================================
-- Returns a summary of a trace with statistics

CREATE OR REPLACE FUNCTION get_trace_summary(p_trace_id UUID)
RETURNS TABLE (
  trace_id UUID,
  total_steps INTEGER,
  error_count INTEGER,
  warning_count INTEGER,
  avg_step_duration NUMERIC,
  max_step_duration INTEGER,
  slowest_node_id UUID,
  slowest_node_label VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_trace_id,
    COUNT(*)::INTEGER AS total_steps,
    COUNT(*) FILTER (WHERE atn.severity IN ('error', 'critical'))::INTEGER AS error_count,
    COUNT(*) FILTER (WHERE atn.severity = 'warning')::INTEGER AS warning_count,
    AVG(atn.duration) AS avg_step_duration,
    MAX(atn.duration) AS max_step_duration,
    (SELECT node_id FROM agent_trace_nodes WHERE trace_id = p_trace_id ORDER BY duration DESC NULLS LAST LIMIT 1) AS slowest_node_id,
    (SELECT label FROM agent_trace_nodes WHERE trace_id = p_trace_id ORDER BY duration DESC NULLS LAST LIMIT 1) AS slowest_node_label
  FROM agent_trace_nodes atn
  WHERE atn.trace_id = p_trace_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: cleanup_expired_traces
-- =====================================================
-- Removes traces older than 30 days (called by cron job)

CREATE OR REPLACE FUNCTION cleanup_expired_traces()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agent_trace_logs
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: update_trace_searchable_text
-- =====================================================
-- Auto-generates searchable text from trace data

CREATE OR REPLACE FUNCTION update_trace_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
  -- Build searchable text from tags and metadata
  NEW.searchable_text := COALESCE(array_to_string(NEW.tags, ' '), '') || ' ' ||
                         COALESCE(NEW.debug_metadata::TEXT, '');

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trace_searchable_text
  BEFORE INSERT OR UPDATE ON agent_trace_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_trace_searchable_text();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agent_trace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trace_nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see traces for their tenant
CREATE POLICY tenant_isolation_trace_logs ON agent_trace_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Policy: Users can only see trace nodes for traces they can access
CREATE POLICY tenant_isolation_trace_nodes ON agent_trace_nodes
  FOR ALL
  USING (
    trace_id IN (
      SELECT trace_id FROM agent_trace_logs
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_trace_logs IS 'Stores trace information for agent executions with 30-day TTL';
COMMENT ON TABLE agent_trace_nodes IS 'Stores individual nodes in agent trace trees';
COMMENT ON FUNCTION get_trace_for_turn(UUID) IS 'Retrieves trace for a specific conversation turn';
COMMENT ON FUNCTION get_traces_for_agent(UUID, INTEGER, INTEGER) IS 'Retrieves paginated traces for an agent';
COMMENT ON FUNCTION get_trace_node_path(UUID) IS 'Returns breadcrumb trail from root to specific node';
COMMENT ON FUNCTION get_trace_children(UUID) IS 'Returns child nodes for tree expansion';
COMMENT ON FUNCTION get_trace_summary(UUID) IS 'Returns statistical summary of a trace';
COMMENT ON FUNCTION cleanup_expired_traces() IS 'Removes traces older than 30 days';
