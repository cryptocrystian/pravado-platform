-- =====================================================
-- AGENT FRAMEWORK MIGRATION
-- =====================================================
-- Scalable agent execution and template system

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE agent_execution_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE agent_category AS ENUM ('PR', 'CONTENT', 'SEO', 'RESEARCH', 'ANALYSIS', 'GENERAL');

-- =====================================================
-- AGENT TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    category agent_category DEFAULT 'GENERAL' NOT NULL,

    -- Agent Configuration
    system_prompt TEXT NOT NULL,
    input_schema JSONB NOT NULL, -- Zod schema as JSON
    output_schema JSONB NOT NULL,

    -- Example Data
    example_input JSONB,
    example_output JSONB,

    -- Template Settings
    model VARCHAR(100) DEFAULT 'gpt-4-turbo-preview',
    temperature DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,

    -- Tools & Context
    required_tools TEXT[] DEFAULT '{}',
    context_sources TEXT[] DEFAULT '{}', -- ['strategy', 'contacts', 'clusters']

    -- Usage Stats
    execution_count INTEGER DEFAULT 0,
    avg_execution_time_ms INTEGER,
    success_rate DECIMAL(3, 2),

    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    parent_template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_template_slug_per_org UNIQUE (organization_id, slug, deleted_at)
);

CREATE INDEX idx_agent_templates_org_id ON agent_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_agent_templates_slug ON agent_templates(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_agent_templates_category ON agent_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_agent_templates_is_public ON agent_templates(is_public) WHERE is_public = true AND deleted_at IS NULL;

-- =====================================================
-- AGENT EXECUTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Execution Info
    template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
    agent_name VARCHAR(255) NOT NULL,
    status agent_execution_status DEFAULT 'PENDING' NOT NULL,

    -- Input/Output
    input_data JSONB NOT NULL,
    output_data JSONB,

    -- Execution Details
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms INTEGER,

    -- Steps & Progress
    steps JSONB DEFAULT '[]', -- Array of step objects
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 1,

    -- Error Handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,

    -- Context Used
    context_data JSONB, -- Strategy, contacts, clusters used

    -- Tokens & Cost
    tokens_used INTEGER,
    estimated_cost DECIMAL(10, 4),

    -- Result Metadata
    confidence_score DECIMAL(3, 2),
    quality_score DECIMAL(3, 2),

    -- Organization & User
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    triggered_by UUID REFERENCES auth.users(id) NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_agent_executions_template_id ON agent_executions(template_id);
CREATE INDEX idx_agent_executions_org_id ON agent_executions(organization_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_triggered_by ON agent_executions(triggered_by);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at DESC);

-- =====================================================
-- AGENT EXECUTION RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_execution_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE NOT NULL,

    -- Result Data
    result_type VARCHAR(100) NOT NULL, -- 'content', 'pitch', 'strategy', 'analysis'
    result_data JSONB NOT NULL,

    -- Metadata
    title VARCHAR(500),
    summary TEXT,

    -- Actions
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    applied_to VARCHAR(100), -- 'content_item', 'campaign', etc.
    applied_to_id UUID,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_agent_execution_results_execution_id ON agent_execution_results(execution_id);
CREATE INDEX idx_agent_execution_results_org_id ON agent_execution_results(organization_id);
CREATE INDEX idx_agent_execution_results_applied ON agent_execution_results(applied);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update template stats after execution
CREATE OR REPLACE FUNCTION update_template_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        UPDATE agent_templates
        SET
            execution_count = execution_count + 1,
            avg_execution_time_ms = COALESCE(
                (avg_execution_time_ms * (execution_count - 1) + NEW.execution_time_ms) / execution_count,
                NEW.execution_time_ms
            ),
            success_rate = (
                SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED')::DECIMAL / COUNT(*)
                FROM agent_executions
                WHERE template_id = NEW.template_id
            ),
            updated_at = NOW()
        WHERE id = NEW.template_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_executions_update_stats
    AFTER UPDATE ON agent_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_template_stats();

-- Get agent execution with full context
CREATE OR REPLACE FUNCTION get_agent_execution_full(execution_uuid UUID)
RETURNS TABLE (
    execution JSONB,
    template JSONB,
    results JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(e.*) as execution,
        to_jsonb(t.*) as template,
        COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(r.*))
                FROM agent_execution_results r
                WHERE r.execution_id = execution_uuid
            ),
            '[]'::jsonb
        ) as results
    FROM agent_executions e
    LEFT JOIN agent_templates t ON e.template_id = t.id
    WHERE e.id = execution_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get agent statistics
CREATE OR REPLACE FUNCTION get_agent_stats(org_uuid UUID)
RETURNS TABLE (
    total_executions INTEGER,
    successful_executions INTEGER,
    failed_executions INTEGER,
    avg_execution_time_ms INTEGER,
    total_tokens_used BIGINT,
    total_cost DECIMAL,
    popular_agents JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_executions,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER as successful_executions,
        COUNT(*) FILTER (WHERE status = 'FAILED')::INTEGER as failed_executions,
        AVG(execution_time_ms)::INTEGER as avg_execution_time_ms,
        SUM(tokens_used)::BIGINT as total_tokens_used,
        SUM(estimated_cost)::DECIMAL as total_cost,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'agent_name', agent_name,
                        'execution_count', count,
                        'success_rate', success_rate
                    )
                )
                FROM (
                    SELECT
                        agent_name,
                        COUNT(*)::INTEGER as count,
                        (COUNT(*) FILTER (WHERE status = 'COMPLETED')::DECIMAL / COUNT(*))::DECIMAL(3, 2) as success_rate
                    FROM agent_executions
                    WHERE organization_id = org_uuid
                    GROUP BY agent_name
                    ORDER BY count DESC
                    LIMIT 5
                ) top_agents
            ),
            '[]'::jsonb
        ) as popular_agents
    FROM agent_executions
    WHERE organization_id = org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_execution_results ENABLE ROW LEVEL SECURITY;

-- Agent Templates Policies
CREATE POLICY agent_templates_view_policy ON agent_templates
    FOR SELECT
    USING (
        is_public = true
        OR organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY agent_templates_insert_policy ON agent_templates
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY agent_templates_update_policy ON agent_templates
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY agent_templates_delete_policy ON agent_templates
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- Agent Executions Policies
CREATE POLICY agent_executions_view_policy ON agent_executions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY agent_executions_insert_policy ON agent_executions
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY agent_executions_update_policy ON agent_executions
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Agent Execution Results Policies
CREATE POLICY agent_execution_results_view_policy ON agent_execution_results
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY agent_execution_results_manage_policy ON agent_execution_results
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_templates IS 'Reusable AI agent templates with input/output schemas';
COMMENT ON TABLE agent_executions IS 'Agent execution tracking with step-by-step progress';
COMMENT ON TABLE agent_execution_results IS 'Results from agent executions';

COMMENT ON FUNCTION get_agent_execution_full IS 'Retrieves complete agent execution with template and results';
COMMENT ON FUNCTION get_agent_stats IS 'Returns aggregated agent usage statistics';
