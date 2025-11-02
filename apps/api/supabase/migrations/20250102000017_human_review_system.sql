-- =====================================================
-- HUMAN-IN-THE-LOOP REVIEW & OVERSIGHT SYSTEM
-- =====================================================
-- Enable human review and approval of agent-generated content and decisions

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE review_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'NEEDS_EDIT',
  'ESCALATED',
  'WITHDRAWN'
);

CREATE TYPE review_type AS ENUM (
  'GOAL_APPROVAL',
  'CAMPAIGN_PLAN',
  'PITCH_CONTENT',
  'TASK_OUTPUT',
  'AGENT_DECISION',
  'HIGH_RISK_ACTION',
  'CONTENT_QUALITY',
  'STRATEGIC_CHANGE'
);

CREATE TYPE review_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE reviewable_entity_type AS ENUM (
  'AGENT_GOAL',
  'AGENT_TASK',
  'AUTONOMOUS_CAMPAIGN',
  'PITCH_WORKFLOW',
  'CONTENT_PIECE',
  'AGENT_HANDOFF',
  'STRATEGIC_DECISION'
);

-- =====================================================
-- AGENT REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Review metadata
    review_type review_type NOT NULL,
    status review_status NOT NULL DEFAULT 'PENDING',
    priority review_priority NOT NULL DEFAULT 'MEDIUM',

    -- What is being reviewed
    reviewable_entity_type reviewable_entity_type NOT NULL,
    reviewable_entity_id UUID NOT NULL,

    -- Review content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content_to_review JSONB NOT NULL, -- The actual content being reviewed
    context JSONB, -- Additional context for reviewers

    -- Agent information
    requesting_agent_id VARCHAR(255),
    agent_reasoning TEXT, -- Why the agent thinks this needs review

    -- Review decision
    decision_summary TEXT,
    decision_reasoning TEXT,
    modifications JSONB, -- Changes requested by reviewer

    -- Assignment & tracking
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Resolution
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    -- Deadlines & escalation
    due_date TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    escalated_to UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Lifecycle tracking
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    withdrawn_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_agent_reviews_organization_id ON agent_reviews(organization_id);
CREATE INDEX idx_agent_reviews_status ON agent_reviews(status);
CREATE INDEX idx_agent_reviews_review_type ON agent_reviews(review_type);
CREATE INDEX idx_agent_reviews_priority ON agent_reviews(priority);
CREATE INDEX idx_agent_reviews_assigned_to ON agent_reviews(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_agent_reviews_entity ON agent_reviews(reviewable_entity_type, reviewable_entity_id);
CREATE INDEX idx_agent_reviews_due_date ON agent_reviews(due_date) WHERE due_date IS NOT NULL AND status = 'PENDING';
CREATE INDEX idx_agent_reviews_created_at ON agent_reviews(created_at DESC);

-- =====================================================
-- REVIEW COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS review_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    review_id UUID REFERENCES agent_reviews(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES review_comments(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'FEEDBACK', -- 'FEEDBACK', 'QUESTION', 'SUGGESTION', 'CONCERN'

    -- Metadata
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs. shared with agent
    is_resolution BOOLEAN DEFAULT false, -- Final decision comment

    -- Highlighting specific content
    highlighted_section TEXT, -- Which part of the content this refers to
    line_number INTEGER, -- For code/structured content

    -- Author
    author_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    author_type VARCHAR(50) DEFAULT 'USER', -- 'USER', 'AGENT', 'SYSTEM'

    -- Engagement tracking
    upvotes INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX idx_review_comments_parent_id ON review_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_review_comments_author ON review_comments(author_id);
CREATE INDEX idx_review_comments_organization_id ON review_comments(organization_id);
CREATE INDEX idx_review_comments_created_at ON review_comments(created_at DESC);

-- =====================================================
-- REVIEW ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS review_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    review_id UUID REFERENCES agent_reviews(id) ON DELETE CASCADE NOT NULL,
    assignee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

    -- Assignment metadata
    role VARCHAR(100), -- 'PRIMARY', 'SECONDARY', 'APPROVER', 'OBSERVER'
    assignment_reason TEXT,

    -- Status tracking
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    completed_at TIMESTAMPTZ,

    -- Notifications
    notified_at TIMESTAMPTZ,
    last_reminded_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Constraints
    UNIQUE(review_id, assignee_id)
);

-- Indexes
CREATE INDEX idx_review_assignments_review_id ON review_assignments(review_id);
CREATE INDEX idx_review_assignments_assignee_id ON review_assignments(assignee_id);
CREATE INDEX idx_review_assignments_organization_id ON review_assignments(organization_id);

-- =====================================================
-- REVIEW TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS review_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    review_type review_type NOT NULL,

    -- Template configuration
    checklist JSONB, -- Review checklist items
    guidelines TEXT, -- Review guidelines for humans
    auto_assign_rules JSONB, -- Rules for automatic assignment

    -- SLA settings
    default_priority review_priority DEFAULT 'MEDIUM',
    default_due_hours INTEGER DEFAULT 24,
    escalation_hours INTEGER DEFAULT 48,

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Ownership
    is_system_template BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    UNIQUE(name, organization_id)
);

-- Indexes
CREATE INDEX idx_review_templates_organization_id ON review_templates(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_review_templates_type ON review_templates(review_type);
CREATE INDEX idx_review_templates_active ON review_templates(is_active) WHERE is_active = true;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get pending reviews for a user
CREATE OR REPLACE FUNCTION get_user_pending_reviews(
    p_user_id UUID,
    p_organization_id UUID
) RETURNS TABLE (
    review_id UUID,
    review_type review_type,
    priority review_priority,
    title VARCHAR,
    due_date TIMESTAMPTZ,
    days_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.review_type,
        r.priority,
        r.title,
        r.due_date,
        EXTRACT(DAY FROM NOW() - r.created_at)::INTEGER as days_pending
    FROM agent_reviews r
    LEFT JOIN review_assignments ra ON ra.review_id = r.id
    WHERE
        r.organization_id = p_organization_id
        AND r.status = 'PENDING'
        AND (
            r.assigned_to = p_user_id
            OR ra.assignee_id = p_user_id
        )
    ORDER BY
        CASE r.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
        END,
        r.due_date NULLS LAST,
        r.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate review metrics
CREATE OR REPLACE FUNCTION get_review_metrics(
    p_organization_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    total_reviews INTEGER,
    pending_reviews INTEGER,
    approved_reviews INTEGER,
    rejected_reviews INTEGER,
    avg_review_time_hours DECIMAL,
    overdue_reviews INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_reviews,
        COUNT(*) FILTER (WHERE status = 'PENDING')::INTEGER as pending_reviews,
        COUNT(*) FILTER (WHERE status = 'APPROVED')::INTEGER as approved_reviews,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::INTEGER as rejected_reviews,
        AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600)::DECIMAL as avg_review_time_hours,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND due_date < NOW())::INTEGER as overdue_reviews
    FROM agent_reviews
    WHERE
        organization_id = p_organization_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to auto-escalate overdue reviews
CREATE OR REPLACE FUNCTION escalate_overdue_reviews()
RETURNS INTEGER AS $$
DECLARE
    v_escalated_count INTEGER := 0;
    v_review RECORD;
BEGIN
    FOR v_review IN
        SELECT id, organization_id
        FROM agent_reviews
        WHERE
            status = 'PENDING'
            AND due_date IS NOT NULL
            AND due_date < NOW()
            AND escalated_at IS NULL
    LOOP
        UPDATE agent_reviews
        SET
            status = 'ESCALATED',
            escalated_at = NOW(),
            priority = CASE
                WHEN priority = 'CRITICAL' THEN 'CRITICAL'
                WHEN priority = 'HIGH' THEN 'CRITICAL'
                ELSE 'HIGH'
            END
        WHERE id = v_review.id;

        v_escalated_count := v_escalated_count + 1;
    END LOOP;

    RETURN v_escalated_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_reviews_updated_at
    BEFORE UPDATE ON agent_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_review_timestamp();

CREATE TRIGGER review_comments_updated_at
    BEFORE UPDATE ON review_comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_review_timestamp();

CREATE TRIGGER review_templates_updated_at
    BEFORE UPDATE ON review_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_review_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;

-- Policies for agent_reviews
CREATE POLICY agent_reviews_org_isolation ON agent_reviews
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_reviews_insert ON agent_reviews
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for review_comments
CREATE POLICY review_comments_org_isolation ON review_comments
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY review_comments_insert ON review_comments
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for review_assignments
CREATE POLICY review_assignments_org_isolation ON review_assignments
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY review_assignments_insert ON review_assignments
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for review_templates
CREATE POLICY review_templates_org_isolation ON review_templates
    USING (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR is_system_template = true
    );

CREATE POLICY review_templates_insert ON review_templates
    FOR INSERT
    WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR is_system_template = true
    );

-- =====================================================
-- SEED SYSTEM TEMPLATES
-- =====================================================

INSERT INTO review_templates (
    name,
    description,
    review_type,
    checklist,
    guidelines,
    default_priority,
    default_due_hours,
    is_system_template
) VALUES
(
    'Goal Approval Standard',
    'Standard review checklist for agent-generated goals',
    'GOAL_APPROVAL',
    '{
        "items": [
            "Goal is aligned with organization strategy",
            "Success criteria are measurable",
            "Timeline is realistic",
            "Resources required are available",
            "Risk level is acceptable"
        ]
    }',
    'Review agent goals for strategic alignment, feasibility, and risk. Approve if all criteria are met, or provide specific feedback for improvement.',
    'MEDIUM',
    24,
    true
),
(
    'Campaign Plan Review',
    'Review checklist for autonomous campaign plans',
    'CAMPAIGN_PLAN',
    '{
        "items": [
            "Target audience is appropriate",
            "Messaging aligns with brand voice",
            "Contact selection is justified",
            "Budget is within limits",
            "Timeline is feasible",
            "KPIs are appropriate"
        ]
    }',
    'Evaluate autonomous campaign plans for strategic fit, brand alignment, and execution feasibility. Focus on target selection and messaging quality.',
    'HIGH',
    12,
    true
),
(
    'Pitch Content Quality Check',
    'Quality review for AI-generated pitch content',
    'PITCH_CONTENT',
    '{
        "items": [
            "Tone is professional and appropriate",
            "Personalization is accurate",
            "Key messages are clear",
            "No factual errors or hallucinations",
            "Call-to-action is effective",
            "Grammar and style are correct"
        ]
    }',
    'Ensure pitch content meets quality standards before delivery. Check for accuracy, tone, personalization, and professionalism.',
    'HIGH',
    6,
    true
),
(
    'High-Risk Action Review',
    'Critical review for high-impact agent decisions',
    'HIGH_RISK_ACTION',
    '{
        "items": [
            "Action necessity is justified",
            "Risk assessment is comprehensive",
            "Mitigation strategies are in place",
            "Stakeholders have been considered",
            "Reversibility or fallback options exist"
        ]
    }',
    'Critical review for actions that could have significant impact. Require strong justification and risk mitigation before approval.',
    'CRITICAL',
    2,
    true
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_reviews IS 'Human review and approval records for agent-generated content and decisions';
COMMENT ON TABLE review_comments IS 'Threaded comments and feedback on review items';
COMMENT ON TABLE review_assignments IS 'Assignment of reviews to specific team members';
COMMENT ON TABLE review_templates IS 'Reusable review templates with checklists and guidelines';
COMMENT ON FUNCTION get_user_pending_reviews IS 'Get all pending reviews assigned to a specific user';
COMMENT ON FUNCTION get_review_metrics IS 'Calculate review system metrics for a time period';
COMMENT ON FUNCTION escalate_overdue_reviews IS 'Auto-escalate reviews past their due date';
