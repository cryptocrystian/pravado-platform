-- =====================================================
-- AUTONOMOUS CAMPAIGNS
-- =====================================================
-- Enable fully autonomous PR campaigns with agent planning and execution

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE campaign_status AS ENUM (
  'PLANNING',
  'READY',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE campaign_type AS ENUM (
  'AI_STARTUP_LAUNCH',
  'PRODUCT_ANNOUNCEMENT',
  'THOUGHT_LEADERSHIP',
  'CRISIS_RESPONSE',
  'FUNDING_ANNOUNCEMENT',
  'PARTNERSHIP_NEWS',
  'CUSTOM'
);

-- =====================================================
-- AUTONOMOUS CAMPAIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS autonomous_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Campaign metadata
    title VARCHAR(500) NOT NULL,
    description TEXT,
    campaign_type campaign_type NOT NULL DEFAULT 'CUSTOM',

    -- Campaign lifecycle
    status campaign_status NOT NULL DEFAULT 'PLANNING',
    agent_created BOOLEAN DEFAULT true,

    -- Agent information
    planning_agent_id VARCHAR(255),
    orchestrator_agent_id VARCHAR(255),

    -- Campaign prompt & planning
    original_prompt TEXT,
    planning_output JSONB, -- Strategy doc, pitch plan, contact criteria, metrics

    -- Execution metadata
    execution_metadata JSONB, -- DAG configuration, task results, monitoring setup
    execution_graph_id UUID REFERENCES execution_graphs(id) ON DELETE SET NULL,

    -- Targeting & segmentation
    target_contact_criteria JSONB, -- Contact filtering rules
    target_outlet_types TEXT[], -- Publication types to target
    target_topics TEXT[], -- Topics/beats to focus on

    -- Personalization strategy
    personalization_strategy JSONB, -- How to personalize pitches
    pitch_theme TEXT,

    -- Workflow configuration
    workflow_config JSONB, -- Timing, batching, retry rules
    batch_size INTEGER DEFAULT 10,
    delay_between_batches INTEGER DEFAULT 3600, -- seconds

    -- Monitoring & metrics
    monitoring_setup JSONB, -- Alert rules, KPIs, thresholds
    kpis JSONB, -- Key performance indicators
    success_criteria JSONB, -- What defines campaign success

    -- Campaign results
    total_contacts_targeted INTEGER DEFAULT 0,
    pitches_sent INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    placements_achieved INTEGER DEFAULT 0,

    -- Quality & learning
    quality_score DECIMAL(3,2), -- Agent self-critique score (0-1)
    learnings JSONB, -- What worked, what didn't

    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- Approval workflow (human-in-the-loop)
    requires_approval BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_autonomous_campaigns_organization_id ON autonomous_campaigns(organization_id);
CREATE INDEX idx_autonomous_campaigns_status ON autonomous_campaigns(status);
CREATE INDEX idx_autonomous_campaigns_campaign_type ON autonomous_campaigns(campaign_type);
CREATE INDEX idx_autonomous_campaigns_planning_agent ON autonomous_campaigns(planning_agent_id);
CREATE INDEX idx_autonomous_campaigns_created_at ON autonomous_campaigns(created_at DESC);
CREATE INDEX idx_autonomous_campaigns_execution_graph ON autonomous_campaigns(execution_graph_id) WHERE execution_graph_id IS NOT NULL;

-- =====================================================
-- CAMPAIGN TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type campaign_type NOT NULL,

    -- Template configuration
    template_config JSONB NOT NULL, -- Reusable campaign structure
    execution_graph_template JSONB, -- DAG template

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2), -- Historical success rate

    -- Ownership
    is_system_template BOOLEAN DEFAULT false,
    created_by_agent VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy (NULL for system templates)
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Constraints
    UNIQUE(name, organization_id)
);

-- Indexes
CREATE INDEX idx_campaign_templates_organization_id ON campaign_templates(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_campaign_templates_type ON campaign_templates(campaign_type);
CREATE INDEX idx_campaign_templates_system ON campaign_templates(is_system_template) WHERE is_system_template = true;

-- =====================================================
-- UPDATE PITCH WORKFLOWS TO LINK CAMPAIGNS
-- =====================================================

-- Add campaign_id to pitch_workflows if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pitch_workflows' AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE pitch_workflows ADD COLUMN campaign_id UUID REFERENCES autonomous_campaigns(id) ON DELETE SET NULL;
        CREATE INDEX idx_pitch_workflows_campaign_id ON pitch_workflows(campaign_id) WHERE campaign_id IS NOT NULL;
    END IF;
END $$;

-- =====================================================
-- CAMPAIGN TASKS TABLE (Links to Agent Tasks)
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    campaign_id UUID REFERENCES autonomous_campaigns(id) ON DELETE CASCADE NOT NULL,
    agent_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,

    -- Task metadata
    task_type VARCHAR(100) NOT NULL, -- 'SEGMENT', 'DRAFT', 'PERSONALIZE', 'REVIEW', 'EXECUTE', 'MONITOR'
    task_order INTEGER NOT NULL,

    -- Task configuration
    task_config JSONB,

    -- Task results
    task_output JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Unique constraint
    UNIQUE(campaign_id, task_order)
);

-- Indexes
CREATE INDEX idx_campaign_tasks_campaign_id ON campaign_tasks(campaign_id);
CREATE INDEX idx_campaign_tasks_agent_task_id ON campaign_tasks(agent_task_id) WHERE agent_task_id IS NOT NULL;
CREATE INDEX idx_campaign_tasks_organization_id ON campaign_tasks(organization_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get campaign with statistics
CREATE OR REPLACE FUNCTION get_campaign_statistics(
    p_campaign_id UUID,
    p_organization_id UUID
) RETURNS TABLE (
    campaign_id UUID,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    failed_tasks INTEGER,
    pending_tasks INTEGER,
    progress_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_campaign_id,
        COUNT(*)::INTEGER as total_tasks,
        COUNT(*) FILTER (WHERE at.status = 'COMPLETED')::INTEGER as completed_tasks,
        COUNT(*) FILTER (WHERE at.status = 'FAILED')::INTEGER as failed_tasks,
        COUNT(*) FILTER (WHERE at.status = 'PENDING')::INTEGER as pending_tasks,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE at.status = 'COMPLETED')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END as progress_percentage
    FROM campaign_tasks ct
    LEFT JOIN agent_tasks at ON at.id = ct.agent_task_id
    WHERE
        ct.campaign_id = p_campaign_id
        AND ct.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate campaign success score
CREATE OR REPLACE FUNCTION calculate_campaign_success(
    p_campaign_id UUID,
    p_organization_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_campaign autonomous_campaigns%ROWTYPE;
    v_success_score DECIMAL;
BEGIN
    -- Get campaign details
    SELECT * INTO v_campaign
    FROM autonomous_campaigns
    WHERE id = p_campaign_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Calculate success score based on multiple factors
    v_success_score := 0;

    -- Response rate (40% weight)
    IF v_campaign.pitches_sent > 0 THEN
        v_success_score := v_success_score +
            (v_campaign.responses_received::DECIMAL / v_campaign.pitches_sent) * 0.4;
    END IF;

    -- Placement rate (40% weight)
    IF v_campaign.responses_received > 0 THEN
        v_success_score := v_success_score +
            (v_campaign.placements_achieved::DECIMAL / v_campaign.responses_received) * 0.4;
    END IF;

    -- Quality score (20% weight)
    IF v_campaign.quality_score IS NOT NULL THEN
        v_success_score := v_success_score + (v_campaign.quality_score * 0.2);
    END IF;

    RETURN LEAST(v_success_score, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER autonomous_campaigns_updated_at
    BEFORE UPDATE ON autonomous_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_campaign_timestamp();

CREATE TRIGGER campaign_templates_updated_at
    BEFORE UPDATE ON campaign_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_campaign_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE autonomous_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for autonomous_campaigns
CREATE POLICY autonomous_campaigns_org_isolation ON autonomous_campaigns
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY autonomous_campaigns_insert ON autonomous_campaigns
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for campaign_templates
CREATE POLICY campaign_templates_org_isolation ON campaign_templates
    USING (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR is_system_template = true
    );

CREATE POLICY campaign_templates_insert ON campaign_templates
    FOR INSERT
    WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR is_system_template = true
    );

-- Policies for campaign_tasks
CREATE POLICY campaign_tasks_org_isolation ON campaign_tasks
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY campaign_tasks_insert ON campaign_tasks
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- SEED SYSTEM TEMPLATES
-- =====================================================

INSERT INTO campaign_templates (
    name,
    description,
    campaign_type,
    template_config,
    execution_graph_template,
    is_system_template
) VALUES
(
    'AI Startup Launch',
    'Comprehensive campaign for AI/ML startup product launches with tier-based outreach',
    'AI_STARTUP_LAUNCH',
    '{
        "targeting": {
            "outlet_types": ["Tech Publications", "AI/ML Focused", "General Business"],
            "contact_tiers": ["Tier 1", "Tier 2", "Tier 3"],
            "topics": ["Artificial Intelligence", "Machine Learning", "Startups", "Technology"]
        },
        "personalization": {
            "tier1": "High - Full custom research",
            "tier2": "Medium - Template with customization",
            "tier3": "Low - Generic template"
        },
        "workflow": {
            "batch_size": 10,
            "delay_between_batches": 3600,
            "followup_days": [3, 7, 14]
        }
    }',
    '{
        "nodes": [
            {"id": "1", "type": "TASK", "name": "Segment Contacts", "agent": "CRM"},
            {"id": "2", "type": "TASK", "name": "Draft Generic Pitch", "agent": "Content"},
            {"id": "3", "type": "TASK", "name": "Personalize Tier 1", "agent": "Content"},
            {"id": "4", "type": "TASK", "name": "Review Pitches", "agent": "Quality"},
            {"id": "5", "type": "TASK", "name": "Create Workflow", "agent": "Workflow"},
            {"id": "6", "type": "TASK", "name": "Execute Campaign", "agent": "Execution"},
            {"id": "7", "type": "TASK", "name": "Setup Monitoring", "agent": "Monitoring"}
        ],
        "edges": [
            {"from": "1", "to": "2", "type": "SEQUENCE"},
            {"from": "2", "to": "3", "type": "SEQUENCE"},
            {"from": "3", "to": "4", "type": "SEQUENCE"},
            {"from": "4", "to": "5", "type": "SEQUENCE"},
            {"from": "5", "to": "6", "type": "SEQUENCE"},
            {"from": "6", "to": "7", "type": "SEQUENCE"}
        ]
    }',
    true
),
(
    'Product Announcement',
    'Standard product announcement campaign with media outreach',
    'PRODUCT_ANNOUNCEMENT',
    '{
        "targeting": {
            "outlet_types": ["Industry Press", "Tech Publications", "Business News"],
            "contact_tiers": ["Tier 1", "Tier 2"],
            "topics": ["Product Launches", "Technology", "Innovation"]
        },
        "personalization": {
            "tier1": "High - Product fit analysis",
            "tier2": "Medium - Standard template"
        },
        "workflow": {
            "batch_size": 15,
            "delay_between_batches": 7200,
            "followup_days": [2, 5]
        }
    }',
    '{
        "nodes": [
            {"id": "1", "type": "TASK", "name": "Identify Target Contacts", "agent": "CRM"},
            {"id": "2", "type": "TASK", "name": "Create Announcement Pitch", "agent": "Content"},
            {"id": "3", "type": "TASK", "name": "Personalize Top Tier", "agent": "Content"},
            {"id": "4", "type": "TASK", "name": "Schedule & Send", "agent": "Execution"},
            {"id": "5", "type": "TASK", "name": "Track Mentions", "agent": "Monitoring"}
        ],
        "edges": [
            {"from": "1", "to": "2", "type": "SEQUENCE"},
            {"from": "2", "to": "3", "type": "SEQUENCE"},
            {"from": "3", "to": "4", "type": "SEQUENCE"},
            {"from": "4", "to": "5", "type": "SEQUENCE"}
        ]
    }',
    true
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE autonomous_campaigns IS 'Fully autonomous PR campaigns planned and executed by AI agents';
COMMENT ON TABLE campaign_templates IS 'Reusable campaign templates with execution graphs';
COMMENT ON TABLE campaign_tasks IS 'Links campaigns to agent tasks for tracking';
COMMENT ON FUNCTION get_campaign_statistics IS 'Get campaign progress and task statistics';
COMMENT ON FUNCTION calculate_campaign_success IS 'Calculate campaign success score based on metrics';
