-- =====================================================
-- AI PLAYBOOKS SYSTEM - DATABASE MIGRATION
-- Core Infrastructure: AI Playbook Runtime
-- Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Playbook execution status
CREATE TYPE playbook_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
  'DEPRECATED'
);

-- Playbook execution instance status
CREATE TYPE playbook_execution_status AS ENUM (
  'PENDING',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'TIMEOUT'
);

-- Playbook step type
CREATE TYPE playbook_step_type AS ENUM (
  'AGENT_EXECUTION',
  'DATA_TRANSFORM',
  'CONDITIONAL_BRANCH',
  'PARALLEL_EXECUTION',
  'WAIT_FOR_INPUT',
  'API_CALL',
  'DATABASE_QUERY',
  'MEMORY_SEARCH',
  'PROMPT_TEMPLATE',
  'CUSTOM_FUNCTION'
);

-- Step execution result status
CREATE TYPE step_result_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
  'TIMEOUT'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Playbooks metadata table
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,

  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status playbook_status DEFAULT 'DRAFT',

  -- Configuration
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  agent_id UUID, -- Optional: associate with specific agent

  -- Schema versioning
  schema_version INTEGER DEFAULT 1,

  -- Input/Output specifications (JSONB for flexibility)
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',

  -- Execution settings
  timeout_seconds INTEGER DEFAULT 3600, -- 1 hour default
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 30,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT playbooks_name_org_version_unique UNIQUE (organization_id, name, version)
);

-- Playbook steps table
CREATE TABLE playbook_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,

  -- Step identification
  step_name VARCHAR(255) NOT NULL,
  step_type playbook_step_type NOT NULL,
  step_order INTEGER NOT NULL, -- Execution order

  -- Step configuration
  description TEXT,
  config JSONB DEFAULT '{}', -- Step-specific configuration

  -- Input/Output
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  input_mapping JSONB DEFAULT '{}', -- Map previous step outputs to this step's inputs

  -- Branching logic
  condition JSONB, -- Conditional logic for this step
  on_success_step_id UUID REFERENCES playbook_steps(id) ON DELETE SET NULL,
  on_failure_step_id UUID REFERENCES playbook_steps(id) ON DELETE SET NULL,

  -- Execution settings
  timeout_seconds INTEGER DEFAULT 300, -- 5 minutes default
  max_retries INTEGER DEFAULT 2,
  is_optional BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT playbook_steps_playbook_order_unique UNIQUE (playbook_id, step_order)
);

-- Playbook executions table
CREATE TABLE playbook_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  -- Execution metadata
  execution_name VARCHAR(255),
  status playbook_execution_status DEFAULT 'PENDING',

  -- Context
  triggered_by UUID, -- User ID who triggered execution
  trigger_source VARCHAR(100), -- 'manual', 'api', 'scheduled', 'event'

  -- Input/Output
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER, -- Calculated duration in milliseconds

  -- Execution metadata
  current_step_id UUID REFERENCES playbook_steps(id) ON DELETE SET NULL,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playbook step results table
CREATE TABLE playbook_step_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES playbook_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES playbook_steps(id) ON DELETE CASCADE,

  -- Result metadata
  status step_result_status DEFAULT 'PENDING',
  attempt_number INTEGER DEFAULT 1,

  -- Input/Output
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT playbook_step_results_execution_step_attempt_unique
    UNIQUE (execution_id, step_id, attempt_number)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Playbooks indexes
CREATE INDEX idx_playbooks_organization_id ON playbooks(organization_id);
CREATE INDEX idx_playbooks_status ON playbooks(status);
CREATE INDEX idx_playbooks_agent_id ON playbooks(agent_id);
CREATE INDEX idx_playbooks_category ON playbooks(category);
CREATE INDEX idx_playbooks_tags ON playbooks USING GIN(tags);
CREATE INDEX idx_playbooks_created_at ON playbooks(created_at DESC);

-- Playbook steps indexes
CREATE INDEX idx_playbook_steps_playbook_id ON playbook_steps(playbook_id);
CREATE INDEX idx_playbook_steps_step_type ON playbook_steps(step_type);
CREATE INDEX idx_playbook_steps_step_order ON playbook_steps(playbook_id, step_order);

-- Playbook executions indexes
CREATE INDEX idx_playbook_executions_playbook_id ON playbook_executions(playbook_id);
CREATE INDEX idx_playbook_executions_organization_id ON playbook_executions(organization_id);
CREATE INDEX idx_playbook_executions_status ON playbook_executions(status);
CREATE INDEX idx_playbook_executions_triggered_by ON playbook_executions(triggered_by);
CREATE INDEX idx_playbook_executions_created_at ON playbook_executions(created_at DESC);
CREATE INDEX idx_playbook_executions_started_at ON playbook_executions(started_at DESC);

-- Playbook step results indexes
CREATE INDEX idx_playbook_step_results_execution_id ON playbook_step_results(execution_id);
CREATE INDEX idx_playbook_step_results_step_id ON playbook_step_results(step_id);
CREATE INDEX idx_playbook_step_results_status ON playbook_step_results(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_step_results ENABLE ROW LEVEL SECURITY;

-- Playbooks RLS policies
CREATE POLICY playbooks_tenant_isolation ON playbooks
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Playbook steps RLS policies (inherit from playbook)
CREATE POLICY playbook_steps_tenant_isolation ON playbook_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playbooks
      WHERE playbooks.id = playbook_steps.playbook_id
      AND playbooks.organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- Playbook executions RLS policies
CREATE POLICY playbook_executions_tenant_isolation ON playbook_executions
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Playbook step results RLS policies (inherit from execution)
CREATE POLICY playbook_step_results_tenant_isolation ON playbook_step_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playbook_executions
      WHERE playbook_executions.id = playbook_step_results.execution_id
      AND playbook_executions.organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON playbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_steps_updated_at
  BEFORE UPDATE ON playbook_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_executions_updated_at
  BEFORE UPDATE ON playbook_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_step_results_updated_at
  BEFORE UPDATE ON playbook_step_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate execution duration
CREATE OR REPLACE FUNCTION calculate_execution_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply duration calculation triggers
CREATE TRIGGER calculate_playbook_execution_duration
  BEFORE INSERT OR UPDATE ON playbook_executions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_execution_duration();

CREATE TRIGGER calculate_step_result_duration
  BEFORE INSERT OR UPDATE ON playbook_step_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_execution_duration();

-- =====================================================
-- POSTGRESQL FUNCTIONS
-- =====================================================

-- Function to get playbook execution summary
CREATE OR REPLACE FUNCTION get_playbook_execution_summary(p_playbook_id UUID)
RETURNS TABLE (
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  running_executions BIGINT,
  avg_duration_ms NUMERIC,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE status = 'COMPLETED')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE status = 'FAILED')::BIGINT as failed_executions,
    COUNT(*) FILTER (WHERE status = 'RUNNING')::BIGINT as running_executions,
    ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration_ms,
    MAX(completed_at) as last_execution_at,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'COMPLETED')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as success_rate
  FROM playbook_executions
  WHERE playbook_id = p_playbook_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get active playbooks for an agent
CREATE OR REPLACE FUNCTION get_active_playbooks(p_agent_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  version INTEGER,
  total_steps INTEGER,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.version,
    (SELECT COUNT(*)::INTEGER FROM playbook_steps WHERE playbook_id = p.id) as total_steps,
    (SELECT MAX(created_at) FROM playbook_executions WHERE playbook_id = p.id) as last_executed_at,
    (SELECT COUNT(*) FROM playbook_executions WHERE playbook_id = p.id) as execution_count
  FROM playbooks p
  WHERE p.agent_id = p_agent_id
    AND p.status = 'ACTIVE'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get execution progress
CREATE OR REPLACE FUNCTION get_execution_progress(p_execution_id UUID)
RETURNS TABLE (
  execution_id UUID,
  status playbook_execution_status,
  progress_percentage INTEGER,
  current_step_name VARCHAR(255),
  completed_steps INTEGER,
  total_steps INTEGER,
  elapsed_time_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as execution_id,
    e.status,
    CASE
      WHEN e.total_steps > 0 THEN (e.completed_steps * 100 / e.total_steps)
      ELSE 0
    END as progress_percentage,
    s.step_name as current_step_name,
    e.completed_steps,
    e.total_steps,
    CASE
      WHEN e.started_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (COALESCE(e.completed_at, NOW()) - e.started_at))::INTEGER * 1000
      ELSE 0
    END as elapsed_time_ms
  FROM playbook_executions e
  LEFT JOIN playbook_steps s ON s.id = e.current_step_id
  WHERE e.id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE playbooks IS 'Stores metadata and configuration for AI playbooks';
COMMENT ON TABLE playbook_steps IS 'Defines ordered steps within a playbook with branching logic';
COMMENT ON TABLE playbook_executions IS 'Tracks execution instances of playbooks';
COMMENT ON TABLE playbook_step_results IS 'Stores results of individual step executions';

COMMENT ON COLUMN playbooks.input_schema IS 'JSON schema defining required inputs for playbook execution';
COMMENT ON COLUMN playbooks.output_schema IS 'JSON schema defining expected outputs from playbook execution';
COMMENT ON COLUMN playbook_steps.input_mapping IS 'Maps outputs from previous steps to this step''s inputs';
COMMENT ON COLUMN playbook_steps.condition IS 'JSONB condition for conditional step execution';
COMMENT ON COLUMN playbook_executions.trigger_source IS 'Source that triggered the execution: manual, api, scheduled, event';

-- =====================================================
-- GRANT PERMISSIONS (adjust based on your roles)
-- =====================================================

-- Grant basic permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
