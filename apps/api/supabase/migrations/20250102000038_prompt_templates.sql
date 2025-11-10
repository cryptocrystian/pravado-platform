-- =====================================================
-- PROMPT TEMPLATE SYSTEM MIGRATION
-- Core Infrastructure: Agent Prompt Pipeline + Dynamic Slot Filling
-- Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
-- =====================================================

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

-- Slot resolution strategies
CREATE TYPE slot_resolution_strategy AS ENUM (
  'STATIC',      -- Use default/fixed value
  'CONTEXT',     -- Extract from runtime context object
  'MEMORY',      -- Query agent memory system
  'DATABASE',    -- Execute database query
  'GPT'          -- Generate with GPT-4
);

COMMENT ON TYPE slot_resolution_strategy IS 'Strategy for resolving prompt slot values';

-- =====================================================
-- CREATE PROMPT_TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'content_generation', 'outreach', 'analysis'
  use_case TEXT, -- Specific use case label

  -- Template content
  template_text TEXT NOT NULL, -- Template with {{slot}} syntax

  -- Configuration
  resolution_strategies TEXT[], -- Allowed strategies for this template
  metadata JSONB DEFAULT '{}',  -- Additional template configuration

  -- Status and versioning
  active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES prompt_templates(id), -- For versioning

  -- Audit fields
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT template_name_unique UNIQUE(organization_id, name, version)
);

-- Add comments
COMMENT ON TABLE prompt_templates IS 'Reusable prompt templates with dynamic slot filling';
COMMENT ON COLUMN prompt_templates.template_text IS 'Prompt template with {{slot_name}} syntax for dynamic slots';
COMMENT ON COLUMN prompt_templates.resolution_strategies IS 'Array of allowed resolution strategies for this template';
COMMENT ON COLUMN prompt_templates.parent_version_id IS 'Reference to previous version for change tracking';

-- =====================================================
-- CREATE PROMPT_SLOTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,

  -- Slot definition
  slot_name TEXT NOT NULL,        -- e.g., 'agent_name', 'campaign_goal'
  slot_type TEXT NOT NULL,        -- 'string', 'number', 'boolean', 'array', 'object'
  description TEXT,

  -- Value constraints
  required BOOLEAN DEFAULT TRUE,
  default_value TEXT,             -- Default/fallback value
  validation_regex TEXT,          -- Regex for validation
  example_value TEXT,             -- Example for documentation

  -- Resolution configuration
  resolution_strategy slot_resolution_strategy NOT NULL,
  source_reference TEXT,          -- e.g., 'agent.name', 'memory:recent_campaigns'

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT slot_name_template_unique UNIQUE(template_id, slot_name)
);

-- Add comments
COMMENT ON TABLE prompt_slots IS 'Slot definitions for prompt templates';
COMMENT ON COLUMN prompt_slots.slot_name IS 'Unique slot identifier within template (matches {{slot_name}} in template_text)';
COMMENT ON COLUMN prompt_slots.resolution_strategy IS 'How to resolve this slot value at runtime';
COMMENT ON COLUMN prompt_slots.source_reference IS 'Reference for resolution (e.g., context path, memory query, database table.column)';

-- =====================================================
-- CREATE PROMPT_INVOCATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,

  -- Context references
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Invocation data
  resolved_prompt TEXT NOT NULL,           -- Final filled prompt
  resolved_slots JSONB DEFAULT '{}',       -- Record of slot values used

  -- Execution metadata
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  response_time_ms INTEGER,

  -- GPT metadata
  gpt_model TEXT,                          -- e.g., 'gpt-4', 'gpt-3.5-turbo'
  gpt_token_count INTEGER,
  gpt_cost_usd DECIMAL(10,6),

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE prompt_invocations IS 'Log of prompt template executions for analytics';
COMMENT ON COLUMN prompt_invocations.resolved_prompt IS 'Final prompt text after slot resolution';
COMMENT ON COLUMN prompt_invocations.resolved_slots IS 'JSON record of what value filled each slot';
COMMENT ON COLUMN prompt_invocations.response_time_ms IS 'Time taken to resolve and execute prompt';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Prompt templates indexes
CREATE INDEX idx_prompt_templates_org ON prompt_templates(organization_id);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(active) WHERE active = TRUE;
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_use_case ON prompt_templates(use_case);
CREATE INDEX idx_prompt_templates_created ON prompt_templates(created_at DESC);

-- Prompt slots indexes
CREATE INDEX idx_prompt_slots_template ON prompt_slots(template_id);
CREATE INDEX idx_prompt_slots_strategy ON prompt_slots(resolution_strategy);

-- Prompt invocations indexes (for analytics)
CREATE INDEX idx_prompt_invocations_org ON prompt_invocations(organization_id);
CREATE INDEX idx_prompt_invocations_template ON prompt_invocations(template_id);
CREATE INDEX idx_prompt_invocations_agent ON prompt_invocations(agent_id);
CREATE INDEX idx_prompt_invocations_campaign ON prompt_invocations(campaign_id);
CREATE INDEX idx_prompt_invocations_created ON prompt_invocations(created_at DESC);
CREATE INDEX idx_prompt_invocations_success ON prompt_invocations(success);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_invocations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Prompt templates policies
CREATE POLICY prompt_templates_org_isolation ON prompt_templates
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY prompt_templates_select_own_org ON prompt_templates
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY prompt_templates_insert_own_org ON prompt_templates
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY prompt_templates_update_own_org ON prompt_templates
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY prompt_templates_delete_own_org ON prompt_templates
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Prompt slots policies (inherit from template)
CREATE POLICY prompt_slots_select_own_org ON prompt_slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompt_templates
      WHERE prompt_templates.id = prompt_slots.template_id
        AND prompt_templates.organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

CREATE POLICY prompt_slots_insert_own_org ON prompt_slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prompt_templates
      WHERE prompt_templates.id = prompt_slots.template_id
        AND prompt_templates.organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

CREATE POLICY prompt_slots_update_own_org ON prompt_slots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM prompt_templates
      WHERE prompt_templates.id = prompt_slots.template_id
        AND prompt_templates.organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

CREATE POLICY prompt_slots_delete_own_org ON prompt_slots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prompt_templates
      WHERE prompt_templates.id = prompt_slots.template_id
        AND prompt_templates.organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

-- Prompt invocations policies
CREATE POLICY prompt_invocations_org_isolation ON prompt_invocations
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY prompt_invocations_select_own_org ON prompt_invocations
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY prompt_invocations_insert_own_org ON prompt_invocations
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get active template by category
CREATE OR REPLACE FUNCTION get_active_prompt_template(
  p_organization_id UUID,
  p_category TEXT,
  p_use_case TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  template_text TEXT,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.name,
    pt.template_text,
    pt.version
  FROM prompt_templates pt
  WHERE pt.organization_id = p_organization_id
    AND pt.active = TRUE
    AND pt.category = p_category
    AND (p_use_case IS NULL OR pt.use_case = p_use_case)
  ORDER BY pt.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_prompt_template IS 'Get the active (latest version) prompt template for a category';

-- Function to calculate template performance metrics
CREATE OR REPLACE FUNCTION calculate_prompt_performance(
  p_template_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'template_id', p_template_id,
    'period_days', p_days,
    'total_invocations', COUNT(*),
    'successful_invocations', COUNT(*) FILTER (WHERE success = TRUE),
    'failed_invocations', COUNT(*) FILTER (WHERE success = FALSE),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE success = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ),
    'avg_response_time_ms', ROUND(AVG(response_time_ms), 2),
    'total_tokens_used', SUM(gpt_token_count),
    'total_cost_usd', ROUND(SUM(gpt_cost_usd)::DECIMAL, 4)
  )
  INTO v_result
  FROM prompt_invocations
  WHERE template_id = p_template_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_prompt_performance IS 'Calculate performance metrics for a prompt template';

-- Function to get prompt analytics dashboard
CREATE OR REPLACE FUNCTION get_prompt_analytics_dashboard(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'organization_id', p_organization_id,
    'period_days', p_days,
    'total_templates', (
      SELECT COUNT(*)
      FROM prompt_templates
      WHERE organization_id = p_organization_id
    ),
    'active_templates', (
      SELECT COUNT(*)
      FROM prompt_templates
      WHERE organization_id = p_organization_id AND active = TRUE
    ),
    'total_invocations', (
      SELECT COUNT(*)
      FROM prompt_invocations
      WHERE organization_id = p_organization_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'success_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE success = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        2
      )
      FROM prompt_invocations
      WHERE organization_id = p_organization_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'total_tokens', (
      SELECT SUM(gpt_token_count)
      FROM prompt_invocations
      WHERE organization_id = p_organization_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'total_cost_usd', (
      SELECT ROUND(SUM(gpt_cost_usd)::DECIMAL, 4)
      FROM prompt_invocations
      WHERE organization_id = p_organization_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    'top_templates', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          pt.id,
          pt.name,
          COUNT(pi.id) as invocation_count
        FROM prompt_templates pt
        LEFT JOIN prompt_invocations pi ON pi.template_id = pt.id
          AND pi.created_at >= NOW() - (p_days || ' days')::INTERVAL
        WHERE pt.organization_id = p_organization_id
        GROUP BY pt.id, pt.name
        ORDER BY COUNT(pi.id) DESC
        LIMIT 5
      ) t
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_prompt_analytics_dashboard IS 'Get comprehensive prompt analytics for dashboard';

-- =====================================================
-- CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_prompt_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompt_template_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_template_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'prompt_templates') = 1,
    'prompt_templates table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'prompt_slots') = 1,
    'prompt_slots table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'prompt_invocations') = 1,
    'prompt_invocations table not created';

  RAISE NOTICE 'Prompt Templates migration completed successfully';
END $$;
