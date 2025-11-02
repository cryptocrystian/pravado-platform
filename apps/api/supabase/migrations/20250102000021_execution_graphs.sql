-- =====================================================
-- DYNAMIC CAMPAIGN EXECUTION GRAPHS
-- Migration: 20250102000021_execution_graphs.sql
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Task status enumeration
 */
CREATE TYPE task_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
  'SKIPPED'
);

-- =====================================================
-- CAMPAIGN TASK GRAPH
-- =====================================================

/**
 * campaign_task_graph - DAG nodes for campaign execution
 */
CREATE TABLE IF NOT EXISTS campaign_task_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign reference
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Node identification
  node_id VARCHAR(255) NOT NULL,

  -- Task definition
  task_type VARCHAR(100) NOT NULL,
  agent_type VARCHAR(100),

  -- Task configuration
  metadata JSONB,
  config JSONB,

  -- Dependencies (DAG edges)
  depends_on VARCHAR(255)[] DEFAULT '{}',

  -- Execution state
  status task_status DEFAULT 'PENDING',
  output JSONB,
  error_message TEXT,

  -- Retry configuration
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,

  -- Execution timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(campaign_id, node_id)
);

-- Indexes
CREATE INDEX idx_campaign_task_graph_campaign ON campaign_task_graph(campaign_id);
CREATE INDEX idx_campaign_task_graph_status ON campaign_task_graph(status);
CREATE INDEX idx_campaign_task_graph_org ON campaign_task_graph(organization_id);
CREATE INDEX idx_campaign_task_graph_depends ON campaign_task_graph USING GIN(depends_on);

-- =====================================================
-- CAMPAIGN TASK EXECUTIONS
-- =====================================================

/**
 * campaign_task_executions - Detailed execution logs for each task run
 */
CREATE TABLE IF NOT EXISTS campaign_task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Graph node reference
  graph_node_id UUID NOT NULL REFERENCES campaign_task_graph(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,

  -- Agent execution
  agent_id VARCHAR(255),
  agent_run_id VARCHAR(255),

  -- Execution details
  status task_status NOT NULL,
  input JSONB,
  output JSONB,
  error_message TEXT,
  error_stack TEXT,

  -- Retry information
  attempt_number INTEGER DEFAULT 1,
  is_retry BOOLEAN DEFAULT false,

  -- Performance metrics
  duration_ms INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_campaign_task_executions_graph_node ON campaign_task_executions(graph_node_id);
CREATE INDEX idx_campaign_task_executions_campaign ON campaign_task_executions(campaign_id);
CREATE INDEX idx_campaign_task_executions_status ON campaign_task_executions(status);
CREATE INDEX idx_campaign_task_executions_org ON campaign_task_executions(organization_id);
CREATE INDEX idx_campaign_task_executions_created ON campaign_task_executions(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE campaign_task_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_task_executions ENABLE ROW LEVEL SECURITY;

-- campaign_task_graph policies
CREATE POLICY campaign_task_graph_org_isolation ON campaign_task_graph
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- campaign_task_executions policies
CREATE POLICY campaign_task_executions_org_isolation ON campaign_task_executions
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get executable tasks for a campaign
 * Returns all tasks that are PENDING and have no unmet dependencies
 */
CREATE OR REPLACE FUNCTION get_executable_tasks(
  p_campaign_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  node_id VARCHAR,
  task_type VARCHAR,
  agent_type VARCHAR,
  metadata JSONB,
  config JSONB,
  depends_on VARCHAR[],
  retry_count INTEGER,
  max_retries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.node_id,
    g.task_type,
    g.agent_type,
    g.metadata,
    g.config,
    g.depends_on,
    g.retry_count,
    g.max_retries
  FROM campaign_task_graph g
  WHERE g.campaign_id = p_campaign_id
    AND g.organization_id = p_organization_id
    AND g.status = 'PENDING'
    -- Check if all dependencies are completed
    AND NOT EXISTS (
      SELECT 1
      FROM campaign_task_graph dep
      WHERE dep.campaign_id = p_campaign_id
        AND dep.organization_id = p_organization_id
        AND dep.node_id = ANY(g.depends_on)
        AND dep.status != 'COMPLETED'
    )
  ORDER BY g.created_at;
END;
$$ LANGUAGE plpgsql;

/**
 * Propagate task status through the DAG
 * Handles status changes and downstream effects
 */
CREATE OR REPLACE FUNCTION propagate_task_status(
  p_campaign_id UUID,
  p_node_id VARCHAR,
  p_new_status task_status,
  p_organization_id UUID,
  p_output JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_affected_count INTEGER := 0;
  v_downstream_nodes VARCHAR[];
  v_node VARCHAR;
  v_all_deps_completed BOOLEAN;
  v_result JSONB;
BEGIN
  -- Update the current node
  UPDATE campaign_task_graph
  SET
    status = p_new_status,
    output = COALESCE(p_output, output),
    error_message = COALESCE(p_error_message, error_message),
    completed_at = CASE WHEN p_new_status IN ('COMPLETED', 'FAILED', 'SKIPPED') THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE campaign_id = p_campaign_id
    AND node_id = p_node_id
    AND organization_id = p_organization_id;

  -- If task failed, block all downstream tasks
  IF p_new_status = 'FAILED' THEN
    -- Find all downstream nodes (nodes that depend on this one)
    SELECT ARRAY_AGG(DISTINCT node_id)
    INTO v_downstream_nodes
    FROM campaign_task_graph
    WHERE campaign_id = p_campaign_id
      AND organization_id = p_organization_id
      AND p_node_id = ANY(depends_on)
      AND status = 'PENDING';

    -- Block downstream tasks
    IF v_downstream_nodes IS NOT NULL THEN
      UPDATE campaign_task_graph
      SET
        status = 'BLOCKED',
        error_message = 'Upstream dependency failed: ' || p_node_id,
        updated_at = NOW()
      WHERE campaign_id = p_campaign_id
        AND organization_id = p_organization_id
        AND node_id = ANY(v_downstream_nodes);

      GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    END IF;
  END IF;

  -- If task completed or skipped, check if downstream tasks can now run
  IF p_new_status IN ('COMPLETED', 'SKIPPED') THEN
    -- Find potential downstream nodes
    SELECT ARRAY_AGG(DISTINCT node_id)
    INTO v_downstream_nodes
    FROM campaign_task_graph
    WHERE campaign_id = p_campaign_id
      AND organization_id = p_organization_id
      AND p_node_id = ANY(depends_on)
      AND status IN ('PENDING', 'BLOCKED');

    -- For each downstream node, check if all deps are now complete
    IF v_downstream_nodes IS NOT NULL THEN
      FOREACH v_node IN ARRAY v_downstream_nodes
      LOOP
        -- Check if all dependencies are completed or skipped
        SELECT NOT EXISTS (
          SELECT 1
          FROM campaign_task_graph dep
          WHERE dep.campaign_id = p_campaign_id
            AND dep.organization_id = p_organization_id
            AND dep.node_id = ANY(
              SELECT unnest(depends_on)
              FROM campaign_task_graph
              WHERE campaign_id = p_campaign_id
                AND node_id = v_node
            )
            AND dep.status NOT IN ('COMPLETED', 'SKIPPED')
        )
        INTO v_all_deps_completed;

        -- Unblock if all dependencies are met
        IF v_all_deps_completed THEN
          UPDATE campaign_task_graph
          SET
            status = 'PENDING',
            error_message = NULL,
            updated_at = NOW()
          WHERE campaign_id = p_campaign_id
            AND node_id = v_node
            AND organization_id = p_organization_id
            AND status = 'BLOCKED';

          IF FOUND THEN
            v_affected_count := v_affected_count + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'node_id', p_node_id,
    'new_status', p_new_status,
    'affected_count', v_affected_count,
    'downstream_nodes', COALESCE(v_downstream_nodes, ARRAY[]::VARCHAR[])
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Get execution summary for a campaign
 */
CREATE OR REPLACE FUNCTION get_execution_summary(
  p_campaign_id UUID,
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
  v_total INTEGER;
  v_pending INTEGER;
  v_running INTEGER;
  v_completed INTEGER;
  v_failed INTEGER;
  v_blocked INTEGER;
  v_skipped INTEGER;
  v_progress DECIMAL;
BEGIN
  -- Count tasks by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'PENDING'),
    COUNT(*) FILTER (WHERE status = 'RUNNING'),
    COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    COUNT(*) FILTER (WHERE status = 'FAILED'),
    COUNT(*) FILTER (WHERE status = 'BLOCKED'),
    COUNT(*) FILTER (WHERE status = 'SKIPPED')
  INTO
    v_total,
    v_pending,
    v_running,
    v_completed,
    v_failed,
    v_blocked,
    v_skipped
  FROM campaign_task_graph
  WHERE campaign_id = p_campaign_id
    AND organization_id = p_organization_id;

  -- Calculate progress
  v_progress := CASE
    WHEN v_total > 0 THEN
      ROUND((v_completed + v_skipped)::DECIMAL / v_total::DECIMAL, 3)
    ELSE 0
  END;

  -- Build summary
  v_summary := jsonb_build_object(
    'campaign_id', p_campaign_id,
    'total_tasks', v_total,
    'pending', v_pending,
    'running', v_running,
    'completed', v_completed,
    'failed', v_failed,
    'blocked', v_blocked,
    'skipped', v_skipped,
    'progress', v_progress,
    'is_complete', (v_pending = 0 AND v_running = 0 AND v_blocked = 0),
    'has_failures', (v_failed > 0)
  );

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

/**
 * Reset task for retry
 */
CREATE OR REPLACE FUNCTION reset_task_for_retry(
  p_campaign_id UUID,
  p_node_id VARCHAR,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  -- Get current retry count and max
  SELECT retry_count, max_retries
  INTO v_current_retry_count, v_max_retries
  FROM campaign_task_graph
  WHERE campaign_id = p_campaign_id
    AND node_id = p_node_id
    AND organization_id = p_organization_id;

  -- Check if retries exceeded
  IF v_current_retry_count >= v_max_retries THEN
    RETURN FALSE;
  END IF;

  -- Reset task to PENDING
  UPDATE campaign_task_graph
  SET
    status = 'PENDING',
    retry_count = retry_count + 1,
    error_message = NULL,
    started_at = NULL,
    completed_at = NULL,
    updated_at = NOW()
  WHERE campaign_id = p_campaign_id
    AND node_id = p_node_id
    AND organization_id = p_organization_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Skip a blocked task
 */
CREATE OR REPLACE FUNCTION skip_task(
  p_campaign_id UUID,
  p_node_id VARCHAR,
  p_organization_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Skip the task
  UPDATE campaign_task_graph
  SET
    status = 'SKIPPED',
    error_message = COALESCE(p_reason, 'Task skipped by user'),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE campaign_id = p_campaign_id
    AND node_id = p_node_id
    AND organization_id = p_organization_id
    AND status IN ('PENDING', 'BLOCKED', 'FAILED');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or cannot be skipped');
  END IF;

  -- Propagate status to unblock downstream tasks
  v_result := propagate_task_status(
    p_campaign_id,
    p_node_id,
    'SKIPPED',
    p_organization_id,
    NULL,
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'propagation', v_result
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE campaign_task_graph IS 'DAG nodes for campaign execution with dependencies';
COMMENT ON TABLE campaign_task_executions IS 'Detailed execution logs for each task run attempt';
COMMENT ON FUNCTION get_executable_tasks IS 'Returns all tasks ready to execute (no unmet dependencies)';
COMMENT ON FUNCTION propagate_task_status IS 'Handles DAG status propagation on task completion/failure';
COMMENT ON FUNCTION get_execution_summary IS 'Returns execution progress summary for a campaign';
COMMENT ON FUNCTION reset_task_for_retry IS 'Resets a failed task for retry if retries remaining';
COMMENT ON FUNCTION skip_task IS 'Skips a task and unblocks downstream dependencies';
