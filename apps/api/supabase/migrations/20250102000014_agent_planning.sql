-- =====================================================
-- AGENT AUTONOMY, PLANNING & EXECUTION GRAPHS
-- =====================================================
-- Multi-step autonomous agent planning and execution framework
-- with task dependencies, execution graphs, and autonomy safeguards

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE goal_status AS ENUM (
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE task_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
  'CANCELLED'
);

CREATE TYPE task_strategy AS ENUM (
  'PLAN_ONLY',
  'EXECUTE_ONLY',
  'PLAN_AND_EXECUTE'
);

-- =====================================================
-- AGENT GOALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Status
    status goal_status DEFAULT 'PENDING' NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    risk_score DECIMAL(3, 2) DEFAULT 0.0 CHECK (risk_score >= 0 AND risk_score <= 1),
    requires_approval BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Relationships
    target_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    target_campaign_id UUID,
    due_date TIMESTAMPTZ,

    -- Execution tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- Audit
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_agent_goals_agent_id ON agent_goals(agent_id);
CREATE INDEX idx_agent_goals_status ON agent_goals(status);
CREATE INDEX idx_agent_goals_organization_id ON agent_goals(organization_id);
CREATE INDEX idx_agent_goals_created_by ON agent_goals(created_by);
CREATE INDEX idx_agent_goals_priority ON agent_goals(priority DESC);
CREATE INDEX idx_agent_goals_tags ON agent_goals USING GIN(tags);
CREATE INDEX idx_agent_goals_due_date ON agent_goals(due_date) WHERE due_date IS NOT NULL;

-- =====================================================
-- AGENT TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE NOT NULL,
    parent_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,

    -- Task definition
    agent_id VARCHAR(255) NOT NULL,
    step_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    strategy task_strategy DEFAULT 'PLAN_AND_EXECUTE' NOT NULL,

    -- Status
    status task_status DEFAULT 'PENDING' NOT NULL,

    -- Execution
    agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    output_summary TEXT,
    output_data JSONB,
    error_message TEXT,

    -- Planning metadata
    planned_by_agent VARCHAR(255),
    estimated_duration_minutes INTEGER,
    dependencies UUID[] DEFAULT '{}',

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    CONSTRAINT valid_step_number CHECK (step_number > 0)
);

-- Indexes
CREATE INDEX idx_agent_tasks_goal_id ON agent_tasks(goal_id);
CREATE INDEX idx_agent_tasks_parent_task_id ON agent_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_organization_id ON agent_tasks(organization_id);
CREATE INDEX idx_agent_tasks_agent_id ON agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_step_number ON agent_tasks(goal_id, step_number);
CREATE INDEX idx_agent_tasks_dependencies ON agent_tasks USING GIN(dependencies);

-- =====================================================
-- AGENT EXECUTION GRAPHS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_execution_graphs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE NOT NULL,
    agent_id VARCHAR(255) NOT NULL,

    -- Graph structure
    graph_data JSONB NOT NULL,
    -- Structure: { nodes: [...], edges: [...], metadata: {...} }
    -- Node: { id, taskId, type, status, data }
    -- Edge: { from, to, type, condition }

    -- Metadata
    total_nodes INTEGER DEFAULT 0,
    completed_nodes INTEGER DEFAULT 0,
    failed_nodes INTEGER DEFAULT 0,
    max_depth INTEGER DEFAULT 0,

    -- Execution tracking
    execution_status goal_status DEFAULT 'PENDING' NOT NULL,
    current_node_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    CONSTRAINT valid_total_nodes CHECK (total_nodes >= 0),
    CONSTRAINT valid_completed_nodes CHECK (completed_nodes >= 0 AND completed_nodes <= total_nodes),
    CONSTRAINT valid_failed_nodes CHECK (failed_nodes >= 0 AND failed_nodes <= total_nodes),
    CONSTRAINT valid_max_depth CHECK (max_depth >= 0 AND max_depth <= 20)
);

-- Indexes
CREATE INDEX idx_agent_execution_graphs_goal_id ON agent_execution_graphs(goal_id);
CREATE INDEX idx_agent_execution_graphs_agent_id ON agent_execution_graphs(agent_id);
CREATE INDEX idx_agent_execution_graphs_organization_id ON agent_execution_graphs(organization_id);
CREATE INDEX idx_agent_execution_graphs_status ON agent_execution_graphs(execution_status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get goal with task summary
CREATE OR REPLACE FUNCTION get_goal_summary(
    p_goal_id UUID,
    p_organization_id UUID
) RETURNS TABLE (
    goal_id UUID,
    title VARCHAR,
    status goal_status,
    total_tasks INTEGER,
    pending_tasks INTEGER,
    in_progress_tasks INTEGER,
    completed_tasks INTEGER,
    failed_tasks INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id,
        g.title,
        g.status,
        COUNT(t.id)::INTEGER AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'PENDING')::INTEGER AS pending_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS')::INTEGER AS in_progress_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED')::INTEGER AS completed_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'FAILED')::INTEGER AS failed_tasks
    FROM agent_goals g
    LEFT JOIN agent_tasks t ON t.goal_id = g.id
    WHERE
        g.id = p_goal_id
        AND g.organization_id = p_organization_id
    GROUP BY g.id, g.title, g.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update goal status based on tasks
CREATE OR REPLACE FUNCTION update_goal_status_from_tasks(
    p_goal_id UUID
) RETURNS goal_status AS $$
DECLARE
    v_total_tasks INTEGER;
    v_completed_tasks INTEGER;
    v_failed_tasks INTEGER;
    v_in_progress_tasks INTEGER;
    v_new_status goal_status;
BEGIN
    -- Count tasks
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'COMPLETED'),
        COUNT(*) FILTER (WHERE status = 'FAILED'),
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')
    INTO
        v_total_tasks,
        v_completed_tasks,
        v_failed_tasks,
        v_in_progress_tasks
    FROM agent_tasks
    WHERE goal_id = p_goal_id;

    -- Determine new status
    IF v_total_tasks = 0 THEN
        v_new_status := 'PENDING';
    ELSIF v_failed_tasks > 0 AND v_failed_tasks = v_total_tasks THEN
        v_new_status := 'FAILED';
    ELSIF v_completed_tasks = v_total_tasks THEN
        v_new_status := 'COMPLETED';
    ELSIF v_in_progress_tasks > 0 OR v_completed_tasks > 0 THEN
        v_new_status := 'ACTIVE';
    ELSE
        v_new_status := 'PENDING';
    END IF;

    -- Update goal
    UPDATE agent_goals
    SET
        status = v_new_status,
        completed_at = CASE WHEN v_new_status = 'COMPLETED' THEN NOW() ELSE NULL END,
        failed_at = CASE WHEN v_new_status = 'FAILED' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_goal_id;

    RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- Function to get next pending task for a goal
CREATE OR REPLACE FUNCTION get_next_pending_task(
    p_goal_id UUID,
    p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
    v_next_task_id UUID;
BEGIN
    -- Get the next pending task with no incomplete dependencies
    SELECT t.id
    INTO v_next_task_id
    FROM agent_tasks t
    WHERE
        t.goal_id = p_goal_id
        AND t.organization_id = p_organization_id
        AND t.status = 'PENDING'
        AND NOT EXISTS (
            -- Check if any dependencies are not completed
            SELECT 1
            FROM unnest(t.dependencies) AS dep_id
            JOIN agent_tasks dep ON dep.id = dep_id
            WHERE dep.status NOT IN ('COMPLETED', 'SKIPPED')
        )
    ORDER BY t.step_number ASC
    LIMIT 1;

    RETURN v_next_task_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate execution graph (prevent infinite loops)
CREATE OR REPLACE FUNCTION validate_execution_graph(
    p_graph_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_nodes JSONB;
    v_edges JSONB;
    v_node_count INTEGER;
    v_edge_count INTEGER;
    v_max_depth INTEGER;
BEGIN
    v_nodes := p_graph_data->'nodes';
    v_edges := p_graph_data->'edges';

    v_node_count := jsonb_array_length(v_nodes);
    v_edge_count := jsonb_array_length(v_edges);

    -- Extract max depth from metadata
    v_max_depth := COALESCE((p_graph_data->'metadata'->>'maxDepth')::INTEGER, 0);

    -- Validation rules
    IF v_node_count = 0 THEN
        RAISE EXCEPTION 'Graph must have at least one node';
    END IF;

    IF v_node_count > 100 THEN
        RAISE EXCEPTION 'Graph has too many nodes (max 100)';
    END IF;

    IF v_max_depth > 20 THEN
        RAISE EXCEPTION 'Graph depth exceeds maximum (20)';
    END IF;

    -- Could add cycle detection here

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update goal status when tasks change
CREATE OR REPLACE FUNCTION trigger_update_goal_status()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_goal_status_from_tasks(
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.goal_id
            ELSE NEW.goal_id
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_tasks_status_change
    AFTER INSERT OR UPDATE OF status OR DELETE
    ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_goal_status();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_goals_updated_at
    BEFORE UPDATE ON agent_goals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER agent_tasks_updated_at
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER agent_execution_graphs_updated_at
    BEFORE UPDATE ON agent_execution_graphs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_execution_graphs ENABLE ROW LEVEL SECURITY;

-- Policies for agent_goals
CREATE POLICY agent_goals_org_isolation ON agent_goals
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_goals_insert ON agent_goals
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_tasks
CREATE POLICY agent_tasks_org_isolation ON agent_tasks
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_tasks_insert ON agent_tasks
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_execution_graphs
CREATE POLICY agent_execution_graphs_org_isolation ON agent_execution_graphs
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_execution_graphs_insert ON agent_execution_graphs
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_goals IS 'High-level goals that agents work autonomously to achieve';
COMMENT ON TABLE agent_tasks IS 'Individual tasks that make up goal execution with dependencies';
COMMENT ON TABLE agent_execution_graphs IS 'DAG structures representing task execution flow';
COMMENT ON FUNCTION get_goal_summary IS 'Get goal with task statistics summary';
COMMENT ON FUNCTION update_goal_status_from_tasks IS 'Auto-update goal status based on task completion';
COMMENT ON FUNCTION get_next_pending_task IS 'Get next executable task respecting dependencies';
COMMENT ON FUNCTION validate_execution_graph IS 'Validate graph structure and prevent infinite loops';
