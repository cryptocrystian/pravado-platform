-- =====================================================
-- CRM WORKFLOW MIGRATION
-- =====================================================
-- Relationship tracking, interactions, and follow-ups

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE interaction_type AS ENUM ('EMAIL', 'CALL', 'MEETING', 'DM', 'OTHER');
CREATE TYPE interaction_direction AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE interaction_channel AS ENUM ('EMAIL', 'TWITTER', 'LINKEDIN', 'PHONE', 'ZOOM', 'SLACK', 'OTHER');
CREATE TYPE interaction_sentiment AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE relationship_type AS ENUM ('OWNER', 'COLLABORATOR', 'WATCHER');
CREATE TYPE follow_up_status AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED');
CREATE TYPE follow_up_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- =====================================================
-- CONTACT INTERACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,

    -- Interaction Details
    interaction_type interaction_type NOT NULL,
    direction interaction_direction NOT NULL,
    channel interaction_channel NOT NULL,

    -- Content
    subject VARCHAR(500),
    notes TEXT,
    outcome TEXT,
    sentiment interaction_sentiment,

    -- Related Campaign
    related_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    -- Timing
    occurred_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,

    -- Attachments/Links
    attachments JSONB,
    external_links TEXT[],

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_contact_interactions_contact_id ON contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_user_id ON contact_interactions(user_id);
CREATE INDEX idx_contact_interactions_org_id ON contact_interactions(organization_id);
CREATE INDEX idx_contact_interactions_occurred_at ON contact_interactions(occurred_at DESC);
CREATE INDEX idx_contact_interactions_type ON contact_interactions(interaction_type);
CREATE INDEX idx_contact_interactions_campaign ON contact_interactions(related_campaign_id) WHERE related_campaign_id IS NOT NULL;

-- =====================================================
-- CONTACT RELATIONSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Relationship Details
    relationship_type relationship_type DEFAULT 'WATCHER' NOT NULL,
    notes TEXT,

    -- Strength Metrics
    strength_score DECIMAL(5, 2) DEFAULT 0 CHECK (strength_score >= 0 AND strength_score <= 100),
    interaction_count INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 0, -- 0-5, higher = more important

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT contact_relationships_unique_pair UNIQUE (contact_id, user_id)
);

CREATE INDEX idx_contact_relationships_contact_id ON contact_relationships(contact_id);
CREATE INDEX idx_contact_relationships_user_id ON contact_relationships(user_id);
CREATE INDEX idx_contact_relationships_org_id ON contact_relationships(organization_id);
CREATE INDEX idx_contact_relationships_strength ON contact_relationships(strength_score DESC);
CREATE INDEX idx_contact_relationships_active ON contact_relationships(is_active) WHERE is_active = true;

-- =====================================================
-- FOLLOW UPS
-- =====================================================

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    interaction_id UUID REFERENCES contact_interactions(id) ON DELETE SET NULL,

    -- Follow-up Details
    title VARCHAR(255) NOT NULL,
    notes TEXT,
    due_date DATE NOT NULL,
    priority follow_up_priority DEFAULT 'MEDIUM' NOT NULL,
    status follow_up_status DEFAULT 'PENDING' NOT NULL,

    -- Completion
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_follow_ups_contact_id ON follow_ups(contact_id);
CREATE INDEX idx_follow_ups_created_by ON follow_ups(created_by);
CREATE INDEX idx_follow_ups_org_id ON follow_ups(organization_id);
CREATE INDEX idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);
CREATE INDEX idx_follow_ups_pending ON follow_ups(due_date, status) WHERE status = 'PENDING';

-- =====================================================
-- VIEWS
-- =====================================================

-- Recent Contact Activity (Last 30 Days)
CREATE OR REPLACE VIEW recent_contact_activity AS
SELECT
    ci.user_id,
    ci.contact_id,
    c.full_name as contact_name,
    c.outlet,
    ci.interaction_type,
    ci.direction,
    ci.channel,
    ci.occurred_at,
    ci.sentiment,
    ci.organization_id
FROM contact_interactions ci
JOIN contacts c ON ci.contact_id = c.id
WHERE ci.occurred_at >= NOW() - INTERVAL '30 days'
  AND c.deleted_at IS NULL
ORDER BY ci.occurred_at DESC;

-- Relationship Strengths
CREATE OR REPLACE VIEW relationship_strengths AS
SELECT
    cr.user_id,
    cr.contact_id,
    c.full_name as contact_name,
    c.tier,
    c.outlet,
    cr.relationship_type,
    cr.strength_score,
    cr.interaction_count,
    cr.last_interaction_at,
    cr.priority_level,
    cr.is_active,
    CASE
        WHEN cr.last_interaction_at >= NOW() - INTERVAL '7 days' THEN 'Hot'
        WHEN cr.last_interaction_at >= NOW() - INTERVAL '30 days' THEN 'Warm'
        WHEN cr.last_interaction_at >= NOW() - INTERVAL '90 days' THEN 'Cool'
        ELSE 'Cold'
    END as relationship_temperature,
    cr.organization_id
FROM contact_relationships cr
JOIN contacts c ON cr.contact_id = c.id
WHERE cr.is_active = true
  AND c.deleted_at IS NULL;

-- Overdue Follow-Ups
CREATE OR REPLACE VIEW overdue_follow_ups AS
SELECT
    f.id,
    f.contact_id,
    c.full_name as contact_name,
    f.title,
    f.due_date,
    f.priority,
    f.created_by,
    CURRENT_DATE - f.due_date as days_overdue,
    f.organization_id
FROM follow_ups f
JOIN contacts c ON f.contact_id = c.id
WHERE f.status = 'PENDING'
  AND f.due_date < CURRENT_DATE
  AND c.deleted_at IS NULL
ORDER BY f.due_date ASC;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update Relationship Strength After Interaction
CREATE OR REPLACE FUNCTION update_relationship_strength()
RETURNS TRIGGER AS $$
DECLARE
    rel_exists BOOLEAN;
    interaction_count INTEGER;
    days_since_first INTEGER;
    frequency_score DECIMAL;
    recency_score DECIMAL;
    sentiment_score DECIMAL;
    total_score DECIMAL;
BEGIN
    -- Check if relationship exists
    SELECT EXISTS(
        SELECT 1 FROM contact_relationships
        WHERE contact_id = NEW.contact_id
          AND user_id = NEW.user_id
    ) INTO rel_exists;

    -- Create relationship if it doesn't exist
    IF NOT rel_exists THEN
        INSERT INTO contact_relationships (
            contact_id,
            user_id,
            relationship_type,
            organization_id
        ) VALUES (
            NEW.contact_id,
            NEW.user_id,
            'WATCHER',
            NEW.organization_id
        );
    END IF;

    -- Get interaction metrics
    SELECT
        COUNT(*),
        EXTRACT(EPOCH FROM (NOW() - MIN(occurred_at))) / 86400
    INTO interaction_count, days_since_first
    FROM contact_interactions
    WHERE contact_id = NEW.contact_id
      AND user_id = NEW.user_id;

    -- Calculate frequency score (0-40 points)
    frequency_score := LEAST(40, interaction_count * 4);

    -- Calculate recency score (0-30 points)
    recency_score := CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - NEW.occurred_at)) / 86400 <= 7 THEN 30
        WHEN EXTRACT(EPOCH FROM (NOW() - NEW.occurred_at)) / 86400 <= 30 THEN 20
        WHEN EXTRACT(EPOCH FROM (NOW() - NEW.occurred_at)) / 86400 <= 90 THEN 10
        ELSE 5
    END;

    -- Calculate sentiment score (0-30 points)
    sentiment_score := CASE
        WHEN NEW.sentiment = 'POSITIVE' THEN 30
        WHEN NEW.sentiment = 'NEUTRAL' THEN 15
        WHEN NEW.sentiment = 'NEGATIVE' THEN 0
        ELSE 15
    END;

    total_score := LEAST(100, frequency_score + recency_score + sentiment_score);

    -- Update relationship
    UPDATE contact_relationships
    SET
        strength_score = total_score,
        interaction_count = interaction_count,
        last_interaction_at = NEW.occurred_at,
        updated_at = NOW()
    WHERE contact_id = NEW.contact_id
      AND user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_interactions_update_strength
    AFTER INSERT ON contact_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_relationship_strength();

-- Auto-Mark Overdue Follow-Ups as Missed
CREATE OR REPLACE FUNCTION mark_overdue_follow_ups()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE follow_ups
    SET
        status = 'MISSED',
        updated_at = NOW()
    WHERE status = 'PENDING'
      AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Get User's CRM Stats
CREATE OR REPLACE FUNCTION get_user_crm_stats(user_uuid UUID)
RETURNS TABLE (
    total_relationships INTEGER,
    hot_relationships INTEGER,
    warm_relationships INTEGER,
    cool_relationships INTEGER,
    cold_relationships INTEGER,
    interactions_this_week INTEGER,
    interactions_this_month INTEGER,
    pending_follow_ups INTEGER,
    overdue_follow_ups INTEGER,
    avg_strength_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT cr.contact_id)::INTEGER as total_relationships,
        COUNT(DISTINCT cr.contact_id) FILTER (WHERE cr.last_interaction_at >= NOW() - INTERVAL '7 days')::INTEGER as hot_relationships,
        COUNT(DISTINCT cr.contact_id) FILTER (WHERE cr.last_interaction_at >= NOW() - INTERVAL '30 days' AND cr.last_interaction_at < NOW() - INTERVAL '7 days')::INTEGER as warm_relationships,
        COUNT(DISTINCT cr.contact_id) FILTER (WHERE cr.last_interaction_at >= NOW() - INTERVAL '90 days' AND cr.last_interaction_at < NOW() - INTERVAL '30 days')::INTEGER as cool_relationships,
        COUNT(DISTINCT cr.contact_id) FILTER (WHERE cr.last_interaction_at < NOW() - INTERVAL '90 days' OR cr.last_interaction_at IS NULL)::INTEGER as cold_relationships,
        (SELECT COUNT(*)::INTEGER FROM contact_interactions WHERE user_id = user_uuid AND occurred_at >= NOW() - INTERVAL '7 days') as interactions_this_week,
        (SELECT COUNT(*)::INTEGER FROM contact_interactions WHERE user_id = user_uuid AND occurred_at >= NOW() - INTERVAL '30 days') as interactions_this_month,
        (SELECT COUNT(*)::INTEGER FROM follow_ups WHERE created_by = user_uuid AND status = 'PENDING') as pending_follow_ups,
        (SELECT COUNT(*)::INTEGER FROM follow_ups WHERE created_by = user_uuid AND status = 'PENDING' AND due_date < CURRENT_DATE) as overdue_follow_ups,
        ROUND(AVG(cr.strength_score), 2) as avg_strength_score
    FROM contact_relationships cr
    WHERE cr.user_id = user_uuid
      AND cr.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Contact Interactions Policies
CREATE POLICY contact_interactions_view_policy ON contact_interactions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY contact_interactions_insert_policy ON contact_interactions
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
        AND created_by = auth.uid()
    );

CREATE POLICY contact_interactions_update_policy ON contact_interactions
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_organization_roles
            WHERE user_id = auth.uid()
              AND organization_id = contact_interactions.organization_id
              AND role = 'ADMIN'
        )
    );

-- Contact Relationships Policies
CREATE POLICY contact_relationships_view_policy ON contact_relationships
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
              AND role = 'ADMIN'
        )
    );

CREATE POLICY contact_relationships_manage_policy ON contact_relationships
    FOR ALL
    USING (
        user_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
              AND role = 'ADMIN'
        )
    );

-- Follow-Ups Policies
CREATE POLICY follow_ups_view_policy ON follow_ups
    FOR SELECT
    USING (
        created_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
              AND role = 'ADMIN'
        )
    );

CREATE POLICY follow_ups_manage_policy ON follow_ups
    FOR ALL
    USING (
        created_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
              AND role = 'ADMIN'
        )
    );

-- =====================================================
-- SCHEDULED JOBS (pseudo-cron via application)
-- =====================================================

-- Run daily to mark overdue follow-ups
-- SELECT mark_overdue_follow_ups();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contact_interactions IS 'Log of all contact interactions (emails, calls, meetings, DMs)';
COMMENT ON TABLE contact_relationships IS 'User-contact relationship tracking with strength scoring';
COMMENT ON TABLE follow_ups IS 'Scheduled follow-up tasks with status tracking';

COMMENT ON VIEW recent_contact_activity IS 'Last 30 days of contact interactions';
COMMENT ON VIEW relationship_strengths IS 'Contact relationships with strength metrics and temperature';
COMMENT ON VIEW overdue_follow_ups IS 'Follow-ups past their due date still pending';

COMMENT ON FUNCTION update_relationship_strength IS 'Automatically calculates relationship strength after interaction';
COMMENT ON FUNCTION mark_overdue_follow_ups IS 'Marks pending follow-ups past due date as MISSED';
COMMENT ON FUNCTION get_user_crm_stats IS 'Returns comprehensive CRM statistics for a user';
