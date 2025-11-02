-- =====================================================
-- PERFORMANCE INSIGHTS & OPTIMIZATION FRAMEWORK
-- =====================================================
-- Track performance metrics, A/B testing, benchmarking, and continuous improvement

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE insight_type AS ENUM (
  'AGENT',
  'CAMPAIGN',
  'TASK',
  'GOAL',
  'PITCH'
);

CREATE TYPE metric_type AS ENUM (
  'SUCCESS',
  'QUALITY',
  'EFFICIENCY',
  'RESPONSE_RATE',
  'CONVERSION',
  'SPEED',
  'ACCURACY',
  'ENGAGEMENT'
);

CREATE TYPE experiment_status AS ENUM (
  'DRAFT',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
);

CREATE TYPE variant_type AS ENUM (
  'CONTROL',
  'VARIANT_A',
  'VARIANT_B',
  'VARIANT_C'
);

-- =====================================================
-- PERFORMANCE INSIGHTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What is being measured
    insight_type insight_type NOT NULL,
    entity_id UUID NOT NULL, -- ID of agent_goal, autonomous_campaign, agent_task, etc.

    -- Agent context
    agent_id VARCHAR(255),
    agent_type VARCHAR(100),

    -- Metrics
    success_score DECIMAL(3,2) CHECK (success_score >= 0 AND success_score <= 1),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    efficiency_score DECIMAL(3,2) CHECK (efficiency_score >= 0 AND efficiency_score <= 1),
    speed_score DECIMAL(3,2) CHECK (speed_score >= 0 AND speed_score <= 1),

    -- Detailed metrics
    metrics JSONB, -- { responseRate: 0.45, conversionRate: 0.12, ... }

    -- Performance data
    execution_time_ms INTEGER,
    tokens_used INTEGER,
    api_calls_made INTEGER,
    errors_encountered INTEGER,

    -- Outcome tracking
    achieved_goal BOOLEAN,
    goal_completion_percentage DECIMAL(5,2),

    -- Comparative analysis
    vs_benchmark_delta DECIMAL(5,2), -- How much better/worse than benchmark
    vs_previous_delta DECIMAL(5,2), -- Improvement over last run

    -- Insights & learnings
    insight_summary TEXT,
    key_learnings JSONB, -- Array of learning strings
    improvement_suggestions JSONB, -- Array of suggestion strings

    -- Context
    context JSONB, -- Additional metadata

    -- Timestamps
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_performance_insights_organization_id ON performance_insights(organization_id);
CREATE INDEX idx_performance_insights_type ON performance_insights(insight_type);
CREATE INDEX idx_performance_insights_entity ON performance_insights(entity_id);
CREATE INDEX idx_performance_insights_agent ON performance_insights(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_performance_insights_success_score ON performance_insights(success_score DESC);
CREATE INDEX idx_performance_insights_measured_at ON performance_insights(measured_at DESC);

-- =====================================================
-- A/B EXPERIMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Experiment metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT, -- What we're testing

    -- Configuration
    experiment_type VARCHAR(100) NOT NULL, -- 'PROMPT', 'STRATEGY', 'TEMPLATE', 'WORKFLOW'
    target_entity_type insight_type NOT NULL, -- What we're experimenting on

    -- Status
    status experiment_status NOT NULL DEFAULT 'DRAFT',

    -- Traffic allocation
    traffic_allocation DECIMAL(3,2) DEFAULT 1.0, -- What % of traffic to include

    -- Success criteria
    primary_metric metric_type NOT NULL,
    success_threshold DECIMAL(5,2), -- Target value for primary metric
    minimum_sample_size INTEGER DEFAULT 100,

    -- Results
    winning_variant_id UUID,
    confidence_level DECIMAL(3,2), -- Statistical confidence

    -- Lifecycle
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Ownership
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_ab_experiments_organization_id ON ab_experiments(organization_id);
CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX idx_ab_experiments_type ON ab_experiments(experiment_type);
CREATE INDEX idx_ab_experiments_created_at ON ab_experiments(created_at DESC);

-- =====================================================
-- EXPERIMENT VARIANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS experiment_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,

    -- Variant metadata
    variant_type variant_type NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    configuration JSONB NOT NULL, -- The variant settings

    -- Traffic allocation
    traffic_percentage DECIMAL(3,2) DEFAULT 0.5, -- % of experiment traffic

    -- Results
    sample_size INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    total_runs INTEGER DEFAULT 0,

    -- Aggregated metrics
    avg_success_score DECIMAL(3,2),
    avg_quality_score DECIMAL(3,2),
    avg_efficiency_score DECIMAL(3,2),
    avg_execution_time_ms INTEGER,

    -- Detailed metrics
    metrics_summary JSONB,

    -- Performance vs control
    lift_vs_control DECIMAL(5,2), -- % improvement
    statistical_significance DECIMAL(3,2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    UNIQUE(experiment_id, variant_type)
);

-- Indexes
CREATE INDEX idx_experiment_variants_experiment_id ON experiment_variants(experiment_id);
CREATE INDEX idx_experiment_variants_organization_id ON experiment_variants(organization_id);

-- =====================================================
-- AGENT BENCHMARKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Agent identification
    agent_type VARCHAR(100) NOT NULL,
    task_type VARCHAR(100), -- Optional: benchmark for specific task types

    -- Benchmark metrics
    expected_success_rate DECIMAL(3,2) NOT NULL,
    expected_quality_score DECIMAL(3,2) NOT NULL,
    expected_efficiency_score DECIMAL(3,2) NOT NULL,
    expected_execution_time_ms INTEGER,

    -- Performance thresholds
    minimum_acceptable_success DECIMAL(3,2),
    minimum_acceptable_quality DECIMAL(3,2),

    -- Context
    description TEXT,
    sample_size INTEGER DEFAULT 0, -- How many runs this benchmark is based on

    -- Metadata
    is_system_benchmark BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    UNIQUE(agent_type, task_type, organization_id)
);

-- Indexes
CREATE INDEX idx_agent_benchmarks_organization_id ON agent_benchmarks(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_agent_benchmarks_agent_type ON agent_benchmarks(agent_type);
CREATE INDEX idx_agent_benchmarks_active ON agent_benchmarks(is_active) WHERE is_active = true;

-- =====================================================
-- PERFORMANCE FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What is being reviewed
    insight_id UUID REFERENCES performance_insights(id) ON DELETE CASCADE,
    entity_type insight_type NOT NULL,
    entity_id UUID NOT NULL,

    -- Feedback details
    feedback_type VARCHAR(50) NOT NULL, -- 'USER', 'AUTO_ANALYSIS', 'REVIEW'
    feedback_source VARCHAR(100), -- User ID, system component, etc.

    -- Ratings
    user_satisfaction_score DECIMAL(2,1) CHECK (user_satisfaction_score >= 1 AND user_satisfaction_score <= 5),
    quality_rating DECIMAL(2,1) CHECK (quality_rating >= 1 AND quality_rating <= 5),

    -- Qualitative feedback
    feedback_text TEXT,
    what_worked_well JSONB, -- Array of strings
    what_needs_improvement JSONB, -- Array of strings

    -- Structured feedback
    ratings JSONB, -- { creativity: 4, accuracy: 5, speed: 3 }

    -- Impact tracking
    was_helpful BOOLEAN,
    led_to_improvement BOOLEAN,

    -- Timestamps
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_performance_feedback_organization_id ON performance_feedback(organization_id);
CREATE INDEX idx_performance_feedback_insight_id ON performance_feedback(insight_id) WHERE insight_id IS NOT NULL;
CREATE INDEX idx_performance_feedback_entity ON performance_feedback(entity_type, entity_id);
CREATE INDEX idx_performance_feedback_submitted_at ON performance_feedback(submitted_at DESC);

-- =====================================================
-- EXPERIMENT ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS experiment_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Assignment details
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES experiment_variants(id) ON DELETE CASCADE NOT NULL,

    -- What was assigned
    entity_type insight_type NOT NULL,
    entity_id UUID NOT NULL,

    -- Agent context
    agent_id VARCHAR(255),

    -- Outcome tracking
    outcome_recorded BOOLEAN DEFAULT false,
    success_score DECIMAL(3,2),
    quality_score DECIMAL(3,2),

    -- Timestamps
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_experiment_assignments_experiment_id ON experiment_assignments(experiment_id);
CREATE INDEX idx_experiment_assignments_variant_id ON experiment_assignments(variant_id);
CREATE INDEX idx_experiment_assignments_entity ON experiment_assignments(entity_type, entity_id);
CREATE INDEX idx_experiment_assignments_organization_id ON experiment_assignments(organization_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate overall success score
CREATE OR REPLACE FUNCTION calculate_success_score(
    p_success_score DECIMAL,
    p_quality_score DECIMAL,
    p_efficiency_score DECIMAL,
    p_achieved_goal BOOLEAN
) RETURNS DECIMAL AS $$
BEGIN
    -- Weighted average with goal achievement boost
    RETURN (
        (COALESCE(p_success_score, 0) * 0.4) +
        (COALESCE(p_quality_score, 0) * 0.3) +
        (COALESCE(p_efficiency_score, 0) * 0.2) +
        (CASE WHEN p_achieved_goal THEN 0.1 ELSE 0 END)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to record experiment outcome
CREATE OR REPLACE FUNCTION record_experiment_outcome(
    p_assignment_id UUID,
    p_success_score DECIMAL,
    p_quality_score DECIMAL,
    p_efficiency_score DECIMAL,
    p_execution_time_ms INTEGER
) RETURNS VOID AS $$
DECLARE
    v_variant_id UUID;
    v_experiment_id UUID;
BEGIN
    -- Get variant and experiment IDs
    SELECT variant_id, experiment_id
    INTO v_variant_id, v_experiment_id
    FROM experiment_assignments
    WHERE id = p_assignment_id;

    -- Update assignment
    UPDATE experiment_assignments
    SET
        outcome_recorded = true,
        success_score = p_success_score,
        quality_score = p_quality_score,
        completed_at = NOW()
    WHERE id = p_assignment_id;

    -- Update variant statistics
    UPDATE experiment_variants
    SET
        total_runs = total_runs + 1,
        success_count = success_count + CASE WHEN p_success_score >= 0.7 THEN 1 ELSE 0 END,
        sample_size = sample_size + 1,
        avg_success_score = (
            COALESCE(avg_success_score * (sample_size - 1), 0) + p_success_score
        ) / NULLIF(sample_size, 0),
        avg_quality_score = (
            COALESCE(avg_quality_score * (sample_size - 1), 0) + p_quality_score
        ) / NULLIF(sample_size, 0),
        avg_efficiency_score = (
            COALESCE(avg_efficiency_score * (sample_size - 1), 0) + p_efficiency_score
        ) / NULLIF(sample_size, 0),
        avg_execution_time_ms = (
            COALESCE(avg_execution_time_ms * (sample_size - 1), 0) + p_execution_time_ms
        ) / NULLIF(sample_size, 0),
        updated_at = NOW()
    WHERE id = v_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(
    p_organization_id UUID,
    p_agent_id VARCHAR,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    date DATE,
    avg_success_score DECIMAL,
    avg_quality_score DECIMAL,
    total_runs INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(measured_at) as date,
        AVG(success_score)::DECIMAL as avg_success_score,
        AVG(quality_score)::DECIMAL as avg_quality_score,
        COUNT(*)::INTEGER as total_runs
    FROM performance_insights
    WHERE
        organization_id = p_organization_id
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND measured_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(measured_at)
    ORDER BY DATE(measured_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate experiment statistical significance
CREATE OR REPLACE FUNCTION calculate_experiment_significance(
    p_experiment_id UUID
) RETURNS TABLE (
    variant_id UUID,
    variant_name VARCHAR,
    p_value DECIMAL,
    is_significant BOOLEAN
) AS $$
BEGIN
    -- Simplified chi-square test
    -- In production, use a proper statistical library
    RETURN QUERY
    SELECT
        v.id,
        v.variant_name,
        -- Placeholder p-value calculation
        CASE
            WHEN v.sample_size >= 100 AND ABS(v.lift_vs_control) > 10 THEN 0.01
            WHEN v.sample_size >= 50 AND ABS(v.lift_vs_control) > 15 THEN 0.05
            ELSE 0.5
        END::DECIMAL as p_value,
        CASE
            WHEN v.sample_size >= 100 AND ABS(v.lift_vs_control) > 10 THEN true
            WHEN v.sample_size >= 50 AND ABS(v.lift_vs_control) > 15 THEN true
            ELSE false
        END as is_significant
    FROM experiment_variants v
    WHERE v.experiment_id = p_experiment_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_performance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ab_experiments_updated_at
    BEFORE UPDATE ON ab_experiments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_performance_timestamp();

CREATE TRIGGER experiment_variants_updated_at
    BEFORE UPDATE ON experiment_variants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_performance_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE performance_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for performance_insights
CREATE POLICY performance_insights_org_isolation ON performance_insights
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY performance_insights_insert ON performance_insights
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for ab_experiments
CREATE POLICY ab_experiments_org_isolation ON ab_experiments
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY ab_experiments_insert ON ab_experiments
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for experiment_variants
CREATE POLICY experiment_variants_org_isolation ON experiment_variants
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY experiment_variants_insert ON experiment_variants
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_benchmarks
CREATE POLICY agent_benchmarks_org_isolation ON agent_benchmarks
    USING (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR is_system_benchmark = true
    );

CREATE POLICY agent_benchmarks_insert ON agent_benchmarks
    FOR INSERT
    WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR is_system_benchmark = true
    );

-- Policies for performance_feedback
CREATE POLICY performance_feedback_org_isolation ON performance_feedback
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY performance_feedback_insert ON performance_feedback
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for experiment_assignments
CREATE POLICY experiment_assignments_org_isolation ON experiment_assignments
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY experiment_assignments_insert ON experiment_assignments
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- SEED SYSTEM BENCHMARKS
-- =====================================================

INSERT INTO agent_benchmarks (
    agent_type,
    task_type,
    expected_success_rate,
    expected_quality_score,
    expected_efficiency_score,
    expected_execution_time_ms,
    minimum_acceptable_success,
    minimum_acceptable_quality,
    description,
    is_system_benchmark
) VALUES
(
    'campaign-planner',
    'autonomous-campaign-planning',
    0.85,
    0.80,
    0.75,
    30000,
    0.70,
    0.65,
    'Expected baseline for autonomous campaign planning agent',
    true
),
(
    'pitch-writer',
    'pitch-generation',
    0.80,
    0.85,
    0.70,
    15000,
    0.65,
    0.70,
    'Expected baseline for pitch content generation',
    true
),
(
    'contact-researcher',
    'contact-discovery',
    0.75,
    0.80,
    0.85,
    20000,
    0.60,
    0.65,
    'Expected baseline for contact research and discovery',
    true
),
(
    'strategy-advisor',
    'strategy-planning',
    0.85,
    0.90,
    0.70,
    40000,
    0.75,
    0.80,
    'Expected baseline for strategic planning and advisory',
    true
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE performance_insights IS 'Performance metrics and insights for agents, campaigns, and tasks';
COMMENT ON TABLE ab_experiments IS 'A/B testing experiments for continuous optimization';
COMMENT ON TABLE experiment_variants IS 'Variant configurations and results for A/B tests';
COMMENT ON TABLE agent_benchmarks IS 'Performance benchmarks and baselines by agent type';
COMMENT ON TABLE performance_feedback IS 'User and system feedback on performance';
COMMENT ON TABLE experiment_assignments IS 'Track which entities were assigned to which experiment variants';
COMMENT ON FUNCTION calculate_success_score IS 'Calculate weighted success score from component metrics';
COMMENT ON FUNCTION record_experiment_outcome IS 'Record the outcome of an experiment assignment';
COMMENT ON FUNCTION get_performance_trends IS 'Get performance trends over time for an agent or organization';
COMMENT ON FUNCTION calculate_experiment_significance IS 'Calculate statistical significance of experiment results';
