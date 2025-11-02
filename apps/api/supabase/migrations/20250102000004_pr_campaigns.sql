-- =====================================================
-- PR CAMPAIGN & PRESS RELEASE SYSTEM MIGRATION
-- =====================================================
-- This migration creates the complete PR campaign infrastructure
-- including campaign planning, press release management, pitch
-- targeting, and engagement tracking
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For similarity search (if available)

-- =====================================================
-- ENUMS
-- =====================================================

-- Campaign status
CREATE TYPE campaign_status AS ENUM (
    'PLANNED',      -- In planning stage
    'ACTIVE',       -- Currently running
    'PAUSED',       -- Temporarily paused
    'COMPLETED',    -- Successfully completed
    'CANCELLED'     -- Cancelled
);

-- Press release status
CREATE TYPE press_release_status AS ENUM (
    'DRAFT',        -- Being written
    'REVIEW',       -- Ready for review
    'APPROVED',     -- Approved for sending
    'SCHEDULED',    -- Scheduled for future send
    'SENDING',      -- Currently being sent
    'SENT',         -- Successfully sent
    'CANCELLED'     -- Cancelled
);

-- Interaction type
CREATE TYPE interaction_type AS ENUM (
    'PITCH_SENT',
    'EMAIL_OPENED',
    'LINK_CLICKED',
    'REPLIED',
    'MEETING_SCHEDULED',
    'COVERAGE_RECEIVED',
    'DECLINED',
    'BOUNCED'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Campaigns Table
-- Main campaign planning and tracking
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    goal TEXT, -- Primary campaign objective

    -- Status & Timeline
    status campaign_status DEFAULT 'PLANNED' NOT NULL,
    start_date DATE,
    end_date DATE,

    -- Metrics & KPIs
    target_impressions INTEGER,
    target_coverage_pieces INTEGER,
    target_engagement_rate DECIMAL(5,2),
    metrics JSONB DEFAULT '{}', -- Flexible metrics storage

    -- Budget (optional)
    budget DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Notes
    notes TEXT,
    internal_notes TEXT, -- Private notes

    -- Organization & Team
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) NOT NULL,

    -- Audit
    created_by UUID REFERENCES users(id) NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Press Releases Table
-- Individual press releases within campaigns
CREATE TABLE IF NOT EXISTS press_releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Association
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(600) UNIQUE NOT NULL,
    subtitle TEXT,
    body_md TEXT NOT NULL, -- Markdown content
    body_html TEXT, -- Rendered HTML (generated)

    -- AI-Generated Content
    ai_summary TEXT, -- GPT-4 generated summary
    ai_headline_variants TEXT[], -- Alternative headlines
    key_messages TEXT[], -- Extracted key points

    -- SEO & Metadata
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    tags TEXT[] DEFAULT '{}',

    -- Status & Timeline
    status press_release_status DEFAULT 'DRAFT' NOT NULL,
    embargo_date TIMESTAMPTZ, -- When to send
    published_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    -- Targeting
    target_contact_ids UUID[] DEFAULT '{}', -- Specific contacts to target
    target_tiers contact_tier[], -- Auto-target by tier
    target_topics TEXT[], -- Auto-target by topic interest
    target_regions TEXT[], -- Auto-target by region

    -- Enrichment for AI targeting
    topic_vector VECTOR(1536), -- OpenAI embedding for similarity matching
    targeting_score_threshold DECIMAL(3,2) DEFAULT 0.7, -- Min score to auto-include

    -- Attachments
    attachments JSONB DEFAULT '[]', -- [{name, url, type}]

    -- Distribution Channels
    distribution_channels TEXT[] DEFAULT '{}', -- ['email', 'pr_wire', 'media_kit']

    -- Metrics (tracked over time)
    pitch_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    coverage_count INTEGER DEFAULT 0,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES users(id) NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Campaign Interactions Table
-- Track all outreach activities and responses
CREATE TABLE IF NOT EXISTS campaign_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
    press_release_id UUID REFERENCES press_releases(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Interaction Details
    interaction_type interaction_type NOT NULL,
    channel VARCHAR(50), -- 'email', 'linkedin', 'phone', etc.

    -- Pitch Content (if applicable)
    pitch_subject VARCHAR(500),
    pitch_body TEXT,
    personalization_data JSONB DEFAULT '{}', -- Data used for personalization

    -- Engagement Tracking
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,

    -- Response
    response_sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative', 'declined'
    response_text TEXT,
    notes TEXT,

    -- Coverage (if resulted in coverage)
    coverage_url VARCHAR(1000),
    coverage_title VARCHAR(500),
    coverage_published_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id), -- User who initiated

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pitch Templates Table
-- Reusable AI-generated pitch templates
CREATE TABLE IF NOT EXISTS pitch_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50), -- 'announcement', 'expert_commentary', 'data_story', etc.

    -- Template Content (with placeholders)
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,

    -- Variables/Placeholders
    -- Example: {{contact_name}}, {{company}}, {{hook}}, {{cta}}
    available_variables TEXT[] DEFAULT '{}',

    -- AI Generation Prompt (optional)
    ai_prompt TEXT, -- Prompt used to generate this template

    -- Usage Stats
    usage_count INTEGER DEFAULT 0,
    avg_open_rate DECIMAL(5,2),
    avg_reply_rate DECIMAL(5,2),

    -- Categorization
    tags TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES users(id) NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Campaign Indexes
CREATE INDEX idx_campaigns_org ON campaigns(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_status ON campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX idx_campaigns_team ON campaigns(team_id);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date) WHERE deleted_at IS NULL;

-- Press Release Indexes
CREATE INDEX idx_press_releases_campaign ON press_releases(campaign_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_press_releases_org ON press_releases(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_press_releases_status ON press_releases(status);
CREATE INDEX idx_press_releases_embargo ON press_releases(embargo_date) WHERE status = 'SCHEDULED';
CREATE INDEX idx_press_releases_slug ON press_releases(slug);
CREATE INDEX idx_press_releases_tags ON press_releases USING GIN(tags);
CREATE INDEX idx_press_releases_topics ON press_releases USING GIN(target_topics);
CREATE INDEX idx_press_releases_contacts ON press_releases USING GIN(target_contact_ids);

-- Campaign Interaction Indexes
CREATE INDEX idx_interactions_campaign ON campaign_interactions(campaign_id);
CREATE INDEX idx_interactions_release ON campaign_interactions(press_release_id);
CREATE INDEX idx_interactions_contact ON campaign_interactions(contact_id);
CREATE INDEX idx_interactions_org ON campaign_interactions(organization_id);
CREATE INDEX idx_interactions_type ON campaign_interactions(interaction_type);
CREATE INDEX idx_interactions_created ON campaign_interactions(created_at DESC);

-- Pitch Template Indexes
CREATE INDEX idx_pitch_templates_org ON pitch_templates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pitch_templates_type ON pitch_templates(template_type);
CREATE INDEX idx_pitch_templates_default ON pitch_templates(is_default) WHERE is_default = true;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_press_releases_updated_at
    BEFORE UPDATE ON press_releases
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_campaign_interactions_updated_at
    BEFORE UPDATE ON campaign_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_pitch_templates_updated_at
    BEFORE UPDATE ON pitch_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

-- Auto-generate slug for press releases
CREATE OR REPLACE FUNCTION generate_press_release_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(NEW.id::TEXT from 1 for 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_slug_on_insert
    BEFORE INSERT ON press_releases
    FOR EACH ROW
    EXECUTE FUNCTION generate_press_release_slug();

-- Update press release metrics on interaction
CREATE OR REPLACE FUNCTION update_release_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update press release metrics based on interaction type
    IF NEW.interaction_type = 'PITCH_SENT' THEN
        UPDATE press_releases
        SET pitch_count = pitch_count + 1
        WHERE id = NEW.press_release_id;
    ELSIF NEW.interaction_type = 'EMAIL_OPENED' THEN
        UPDATE press_releases
        SET open_count = open_count + 1
        WHERE id = NEW.press_release_id;
    ELSIF NEW.interaction_type = 'LINK_CLICKED' THEN
        UPDATE press_releases
        SET click_count = click_count + 1
        WHERE id = NEW.press_release_id;
    ELSIF NEW.interaction_type = 'REPLIED' THEN
        UPDATE press_releases
        SET reply_count = reply_count + 1
        WHERE id = NEW.press_release_id;
    ELSIF NEW.interaction_type = 'COVERAGE_RECEIVED' THEN
        UPDATE press_releases
        SET coverage_count = coverage_count + 1
        WHERE id = NEW.press_release_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_metrics_on_interaction
    AFTER INSERT ON campaign_interactions
    FOR EACH ROW
    WHEN (NEW.press_release_id IS NOT NULL)
    EXECUTE FUNCTION update_release_metrics();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_templates ENABLE ROW LEVEL SECURITY;

-- Campaign Policies
-- Users can view campaigns in their organization
CREATE POLICY "Users can view org campaigns"
    ON campaigns FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- Contributor+ can create campaigns
CREATE POLICY "Contributors can create campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
        )
    );

-- Contributor+ can update campaigns
CREATE POLICY "Contributors can update campaigns"
    ON campaigns FOR UPDATE
    USING (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
        )
        AND deleted_at IS NULL
    );

-- Admin/Manager can delete campaigns
CREATE POLICY "Managers can delete campaigns"
    ON campaigns FOR UPDATE
    USING (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER')
        )
    );

-- Press Release Policies (same pattern as campaigns)
CREATE POLICY "Users can view org press releases"
    ON press_releases FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Contributors can create press releases"
    ON press_releases FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
        )
    );

CREATE POLICY "Contributors can update press releases"
    ON press_releases FOR UPDATE
    USING (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
        )
        AND deleted_at IS NULL
    );

-- Interaction Policies
CREATE POLICY "Users can view org interactions"
    ON campaign_interactions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Contributors can create interactions"
    ON campaign_interactions FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
        )
    );

-- Service role can update interactions (for automated tracking)
CREATE POLICY "Service role can update interactions"
    ON campaign_interactions FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Pitch Template Policies
CREATE POLICY "Users can view org templates"
    ON pitch_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Contributors can manage templates"
    ON pitch_templates FOR ALL
    USING (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER', 'CONTRIBUTOR')
        )
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(campaign_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_releases', COUNT(DISTINCT pr.id),
        'total_pitches', SUM(pr.pitch_count),
        'total_opens', SUM(pr.open_count),
        'total_clicks', SUM(pr.click_count),
        'total_replies', SUM(pr.reply_count),
        'total_coverage', SUM(pr.coverage_count),
        'open_rate', CASE
            WHEN SUM(pr.pitch_count) > 0
            THEN ROUND((SUM(pr.open_count)::DECIMAL / SUM(pr.pitch_count) * 100), 2)
            ELSE 0
        END,
        'reply_rate', CASE
            WHEN SUM(pr.pitch_count) > 0
            THEN ROUND((SUM(pr.reply_count)::DECIMAL / SUM(pr.pitch_count) * 100), 2)
            ELSE 0
        END,
        'coverage_rate', CASE
            WHEN SUM(pr.pitch_count) > 0
            THEN ROUND((SUM(pr.coverage_count)::DECIMAL / SUM(pr.pitch_count) * 100), 2)
            ELSE 0
        END
    ) INTO result
    FROM press_releases pr
    WHERE pr.campaign_id = campaign_uuid
    AND pr.deleted_at IS NULL;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recommended targets for a press release
CREATE OR REPLACE FUNCTION get_recommended_targets(release_uuid UUID, max_results INTEGER DEFAULT 50)
RETURNS TABLE (
    contact_id UUID,
    contact_name VARCHAR,
    contact_outlet VARCHAR,
    contact_tier contact_tier,
    match_score DECIMAL,
    match_reasons TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.full_name,
        c.outlet,
        c.tier,
        CASE
            -- Exact tier match
            WHEN c.tier = ANY(pr.target_tiers) THEN 1.0
            -- Topic overlap (high weight)
            WHEN c.topics && pr.target_topics THEN 0.8 + (
                ARRAY_LENGTH(ARRAY(SELECT UNNEST(c.topics) INTERSECT SELECT UNNEST(pr.target_topics)), 1)::DECIMAL /
                GREATEST(ARRAY_LENGTH(pr.target_topics, 1), 1) * 0.2
            )
            -- Region overlap (medium weight)
            WHEN c.regions && pr.target_regions THEN 0.6
            -- Default
            ELSE 0.3
        END as score,
        ARRAY(
            SELECT reason FROM (
                SELECT CASE
                    WHEN c.tier = ANY(pr.target_tiers) THEN 'Tier match'
                    WHEN c.topics && pr.target_topics THEN 'Topic relevance'
                    WHEN c.regions && pr.target_regions THEN 'Geographic fit'
                    ELSE NULL
                END as reason
            ) reasons WHERE reason IS NOT NULL
        ) as reasons
    FROM contacts c
    CROSS JOIN press_releases pr
    WHERE pr.id = release_uuid
    AND c.deleted_at IS NULL
    AND c.email IS NOT NULL -- Must have contact method
    AND NOT (c.id = ANY(pr.target_contact_ids)) -- Not already targeted
    ORDER BY score DESC, c.tier ASC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE campaigns IS 'PR campaign planning and tracking';
COMMENT ON TABLE press_releases IS 'Press releases with AI-assisted targeting and pitch generation';
COMMENT ON TABLE campaign_interactions IS 'Outreach tracking and engagement metrics';
COMMENT ON TABLE pitch_templates IS 'Reusable AI-generated pitch templates';
COMMENT ON FUNCTION get_campaign_stats IS 'Get aggregate metrics for a campaign';
COMMENT ON FUNCTION get_recommended_targets IS 'AI-powered contact recommendations for a press release';
