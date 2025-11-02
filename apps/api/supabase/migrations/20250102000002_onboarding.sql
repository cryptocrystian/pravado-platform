-- =====================================================
-- ONBOARDING SYSTEM MIGRATION
-- =====================================================
-- This migration creates the complete onboarding infrastructure
-- for the AI-driven trial flow, including intake collection,
-- session management, and agent orchestration tracking.
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Onboarding session status
CREATE TYPE onboarding_status AS ENUM (
    'STARTED',           -- User began onboarding
    'INTAKE_COMPLETE',   -- All intake questions answered
    'PROCESSING',        -- AI agents are working
    'STRATEGY_READY',    -- Strategy plan generated
    'PLANNER_READY',     -- Content/PR/SEO generated
    'COMPLETED',         -- Fully complete
    'FAILED',            -- Processing failed
    'ABANDONED'          -- User left without completing
);

-- Intake step identifier
CREATE TYPE intake_step AS ENUM (
    'BUSINESS_INFO',     -- Company name, industry, website
    'GOALS',             -- Business goals and objectives
    'COMPETITORS',       -- Competitive landscape
    'BRAND_VOICE',       -- Tone, style, target audience
    'CHANNELS',          -- PR, Content, SEO priorities
    'REGIONS'            -- Geographic targets
);

-- =====================================================
-- TABLES
-- =====================================================

-- Onboarding Sessions
-- Tracks the complete onboarding journey for each organization
CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

    -- Session state
    status onboarding_status DEFAULT 'STARTED' NOT NULL,
    current_step intake_step DEFAULT 'BUSINESS_INFO',
    completed_steps TEXT[] DEFAULT '{}',

    -- Timestamps for each major phase
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    intake_completed_at TIMESTAMPTZ,
    processing_started_at TIMESTAMPTZ,
    strategy_generated_at TIMESTAMPTZ,
    planner_completed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Agent task tracking
    strategy_task_id UUID,  -- BullMQ job ID for strategy generation
    planner_task_id UUID,   -- BullMQ job ID for planner tasks

    -- Generated asset references
    strategy_plan_id UUID REFERENCES strategy_plans(id) ON DELETE SET NULL,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT one_session_per_org UNIQUE(organization_id)
);

-- Intake Responses
-- Stores all collected information from the onboarding form
CREATE TABLE IF NOT EXISTS intake_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE NOT NULL,
    step intake_step NOT NULL,

    -- Business Information
    business_name VARCHAR(255),
    industry VARCHAR(255),
    website VARCHAR(500),
    company_size VARCHAR(50),
    founded_year INTEGER,

    -- Goals and Objectives
    primary_goals TEXT[],
    success_metrics TEXT[],
    timeline VARCHAR(100),
    budget_range VARCHAR(100),

    -- Competitive Landscape
    competitors JSONB DEFAULT '[]', -- [{ name, website, strengths }]
    market_position VARCHAR(100),
    unique_value_proposition TEXT,

    -- Brand Voice and Audience
    brand_tone TEXT[],
    brand_attributes TEXT[],
    target_audience JSONB DEFAULT '{}', -- { demographics, psychographics, painPoints }
    brand_personality TEXT,

    -- Channel Priorities
    pr_priority INTEGER, -- 1-5 scale
    content_priority INTEGER,
    seo_priority INTEGER,
    preferred_content_types TEXT[],

    -- Geographic Targeting
    primary_regions TEXT[],
    languages TEXT[],
    local_considerations TEXT,

    -- Additional context
    additional_context TEXT,
    challenges TEXT[],
    existing_assets JSONB DEFAULT '{}',

    -- Metadata
    response_data JSONB DEFAULT '{}', -- Flexible storage for future fields

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_step_per_session UNIQUE(session_id, step)
);

-- Agent Task Results
-- Stores outputs from AI agents during onboarding
CREATE TABLE IF NOT EXISTS onboarding_agent_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE NOT NULL,
    agent_type VARCHAR(50) NOT NULL, -- 'strategy', 'planner'

    -- Task tracking
    task_id UUID NOT NULL, -- BullMQ job ID
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed

    -- Results
    result JSONB DEFAULT '{}',

    -- Generated asset references
    generated_content_ids UUID[],
    generated_press_release_id UUID,
    generated_seo_audit_id UUID,

    -- Performance metrics
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms INTEGER,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Onboarding Sessions
CREATE INDEX idx_onboarding_sessions_org ON onboarding_sessions(organization_id);
CREATE INDEX idx_onboarding_sessions_user ON onboarding_sessions(user_id);
CREATE INDEX idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX idx_onboarding_sessions_started ON onboarding_sessions(started_at);

-- Intake Responses
CREATE INDEX idx_intake_responses_session ON intake_responses(session_id);
CREATE INDEX idx_intake_responses_step ON intake_responses(step);

-- Agent Results
CREATE INDEX idx_agent_results_session ON onboarding_agent_results(session_id);
CREATE INDEX idx_agent_results_task ON onboarding_agent_results(task_id);
CREATE INDEX idx_agent_results_status ON onboarding_agent_results(status);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_onboarding_sessions_updated_at
    BEFORE UPDATE ON onboarding_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_intake_responses_updated_at
    BEFORE UPDATE ON intake_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_agent_results_updated_at
    BEFORE UPDATE ON onboarding_agent_results
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_agent_results ENABLE ROW LEVEL SECURITY;

-- Onboarding Sessions Policies
-- Users can only access their organization's onboarding session
CREATE POLICY "Users can view their org's onboarding session"
    ON onboarding_sessions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Only trial users can create onboarding sessions
CREATE POLICY "Trial users can create onboarding session"
    ON onboarding_sessions FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT o.id FROM organizations o
            JOIN users u ON u.organization_id = o.id
            WHERE u.id = auth.uid()
            AND o.subscription_tier = 'TRIAL'
            AND NOT EXISTS (
                SELECT 1 FROM onboarding_sessions os
                WHERE os.organization_id = o.id
            )
        )
    );

-- Users can update their organization's session
CREATE POLICY "Users can update their org's onboarding session"
    ON onboarding_sessions FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Intake Responses Policies
-- Users can view responses for their org's session
CREATE POLICY "Users can view their org's intake responses"
    ON intake_responses FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM onboarding_sessions
            WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Users can insert responses for their org's session
CREATE POLICY "Users can insert intake responses"
    ON intake_responses FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM onboarding_sessions
            WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Users can update their org's responses
CREATE POLICY "Users can update their org's intake responses"
    ON intake_responses FOR UPDATE
    USING (
        session_id IN (
            SELECT id FROM onboarding_sessions
            WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Agent Results Policies
-- Users can view agent results for their org's session
CREATE POLICY "Users can view their org's agent results"
    ON onboarding_agent_results FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM onboarding_sessions
            WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Only system (service role) can insert agent results
CREATE POLICY "Service role can insert agent results"
    ON onboarding_agent_results FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Service role can update agent results
CREATE POLICY "Service role can update agent results"
    ON onboarding_agent_results FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to check if organization can start onboarding
CREATE OR REPLACE FUNCTION can_start_onboarding(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if organization is on trial tier
    -- and doesn't have an existing session
    RETURN EXISTS (
        SELECT 1 FROM organizations
        WHERE id = org_id
        AND subscription_tier = 'TRIAL'
        AND NOT EXISTS (
            SELECT 1 FROM onboarding_sessions
            WHERE organization_id = org_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate intake responses into a single object
CREATE OR REPLACE FUNCTION get_intake_summary(session_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(
        step::TEXT,
        jsonb_build_object(
            'business_name', business_name,
            'industry', industry,
            'website', website,
            'company_size', company_size,
            'primary_goals', primary_goals,
            'success_metrics', success_metrics,
            'competitors', competitors,
            'market_position', market_position,
            'unique_value_proposition', unique_value_proposition,
            'brand_tone', brand_tone,
            'brand_attributes', brand_attributes,
            'target_audience', target_audience,
            'brand_personality', brand_personality,
            'pr_priority', pr_priority,
            'content_priority', content_priority,
            'seo_priority', seo_priority,
            'preferred_content_types', preferred_content_types,
            'primary_regions', primary_regions,
            'languages', languages,
            'additional_context', additional_context,
            'challenges', challenges,
            'existing_assets', existing_assets
        )
    ) INTO result
    FROM intake_responses
    WHERE session_id = session_uuid;

    RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark onboarding as complete
CREATE OR REPLACE FUNCTION complete_onboarding(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE onboarding_sessions
    SET
        status = 'COMPLETED',
        completed_at = NOW()
    WHERE id = session_uuid
    AND status IN ('PLANNER_READY', 'STRATEGY_READY');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE onboarding_sessions IS 'Tracks the AI-driven onboarding journey for each organization';
COMMENT ON TABLE intake_responses IS 'Stores collected information from multi-step onboarding form';
COMMENT ON TABLE onboarding_agent_results IS 'Tracks AI agent task execution and results during onboarding';
COMMENT ON FUNCTION get_intake_summary IS 'Aggregates all intake responses into a single JSON object for agent consumption';
COMMENT ON FUNCTION can_start_onboarding IS 'Checks if an organization is eligible to start onboarding (trial tier, no existing session)';
