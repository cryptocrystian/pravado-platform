-- =====================================================
-- CONTACT MANAGEMENT SYSTEM MIGRATION
-- =====================================================
-- This migration creates a comprehensive contact database
-- for managing 500k+ media contacts, influencers, and KOLs
-- with enrichment, filtering, and AI-powered targeting
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- =====================================================
-- ENUMS
-- =====================================================

-- Contact tier (quality/reach classification)
CREATE TYPE contact_tier AS ENUM ('1', '2', '3', '4');

-- Preferred pitch method
CREATE TYPE pitch_method AS ENUM (
    'EMAIL',
    'LINKEDIN',
    'TWITTER',
    'PHONE',
    'PR_PLATFORM',
    'NOT_SPECIFIED'
);

-- Enrichment job status
CREATE TYPE enrichment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'PARTIAL'
);

-- Contact role type
CREATE TYPE contact_role AS ENUM (
    'JOURNALIST',
    'EDITOR',
    'REPORTER',
    'COLUMNIST',
    'PRODUCER',
    'BLOGGER',
    'INFLUENCER',
    'PODCASTER',
    'ANALYST',
    'OTHER'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Normalized Tags Table
-- Enables consistent tagging and efficient filtering
CREATE TABLE IF NOT EXISTS contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color for UI display
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_tag_per_org UNIQUE(organization_id, slug)
);

-- Main Contacts Table
-- Stores media contacts, influencers, and KOLs
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    full_name VARCHAR(500) NOT NULL,
    title VARCHAR(500),
    email VARCHAR(500),
    phone VARCHAR(50),

    -- Organization/Outlet Info
    outlet VARCHAR(500), -- Media outlet, publication, or platform
    role contact_role DEFAULT 'JOURNALIST',

    -- Classification
    tier contact_tier DEFAULT '3',

    -- Topics of Coverage
    topics TEXT[] DEFAULT '{}', -- ["Technology", "AI", "SaaS", etc.]

    -- Geographic & Language
    regions TEXT[] DEFAULT '{}', -- ["North America", "Europe", etc.]
    languages TEXT[] DEFAULT '{}', -- ["English", "Spanish", etc.]

    -- Social & Professional Links
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    website_url VARCHAR(500),

    -- Engagement Preferences
    preferred_pitch_method pitch_method DEFAULT 'EMAIL',

    -- Tags (references to contact_tags)
    tag_ids UUID[] DEFAULT '{}',

    -- Enrichment Data
    bio TEXT,
    follower_count INTEGER,
    recent_articles JSONB DEFAULT '[]', -- [{ title, url, publishedAt }]

    -- Metadata
    source VARCHAR(100), -- Where the contact came from (import, manual, enrichment)
    notes TEXT,
    last_contacted_at TIMESTAMPTZ,

    -- Custom Fields (extensible)
    custom_fields JSONB DEFAULT '{}',

    -- Audit & Org Scoping
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(outlet, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(title, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(bio, '')), 'D')
    ) STORED
);

-- Enrichment Jobs Table
-- Tracks background enrichment tasks
CREATE TABLE IF NOT EXISTS contact_enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Job Details
    contact_ids UUID[] NOT NULL, -- Batch of contacts to enrich
    status enrichment_status DEFAULT 'PENDING',

    -- Tracking
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES users(id) NOT NULL,

    -- Results
    result JSONB DEFAULT '{}', -- { enriched: [...], failed: [...], updates: {...} }
    error_message TEXT,

    -- Metrics
    total_contacts INTEGER NOT NULL,
    enriched_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,

    -- Performance
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms INTEGER,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Activity Log (optional - for tracking interactions)
CREATE TABLE IF NOT EXISTS contact_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    interaction_type VARCHAR(50) NOT NULL, -- 'pitch_sent', 'response_received', 'meeting_scheduled', etc.
    channel VARCHAR(50), -- 'email', 'phone', 'linkedin', etc.

    subject TEXT,
    notes TEXT,

    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Contact Indexes for Performance
CREATE INDEX idx_contacts_org ON contacts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_tier ON contacts(tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_outlet ON contacts(outlet) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_role ON contacts(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;

-- Array indexes for filtering
CREATE INDEX idx_contacts_topics ON contacts USING GIN(topics);
CREATE INDEX idx_contacts_regions ON contacts USING GIN(regions);
CREATE INDEX idx_contacts_languages ON contacts USING GIN(languages);
CREATE INDEX idx_contacts_tag_ids ON contacts USING GIN(tag_ids);

-- Full-text search index
CREATE INDEX idx_contacts_search ON contacts USING GIN(search_vector);

-- Fuzzy search support
CREATE INDEX idx_contacts_full_name_trgm ON contacts USING GIN(full_name gin_trgm_ops);
CREATE INDEX idx_contacts_outlet_trgm ON contacts USING GIN(outlet gin_trgm_ops);

-- Tag Indexes
CREATE INDEX idx_contact_tags_org ON contact_tags(organization_id);
CREATE INDEX idx_contact_tags_slug ON contact_tags(slug);

-- Enrichment Job Indexes
CREATE INDEX idx_enrichment_jobs_org ON contact_enrichment_jobs(organization_id);
CREATE INDEX idx_enrichment_jobs_status ON contact_enrichment_jobs(status);
CREATE INDEX idx_enrichment_jobs_created ON contact_enrichment_jobs(created_at DESC);

-- Interaction Indexes
CREATE INDEX idx_contact_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_org ON contact_interactions(organization_id);
CREATE INDEX idx_contact_interactions_created ON contact_interactions(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_contact_tags_updated_at
    BEFORE UPDATE ON contact_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

CREATE TRIGGER update_enrichment_jobs_updated_at
    BEFORE UPDATE ON contact_enrichment_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_columns();

-- Auto-increment tag usage count
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- When a contact is created or updated with tags
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.tag_ids IS DISTINCT FROM OLD.tag_ids) THEN
        -- Increment usage count for new tags
        UPDATE contact_tags
        SET usage_count = usage_count + 1
        WHERE id = ANY(NEW.tag_ids)
        AND organization_id = NEW.organization_id;

        -- Decrement usage count for removed tags (on update)
        IF TG_OP = 'UPDATE' THEN
            UPDATE contact_tags
            SET usage_count = GREATEST(0, usage_count - 1)
            WHERE id = ANY(OLD.tag_ids)
            AND NOT (id = ANY(NEW.tag_ids))
            AND organization_id = NEW.organization_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_tag_usage_trigger
    AFTER INSERT OR UPDATE OF tag_ids ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION increment_tag_usage();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

-- Contacts Policies
-- Users can view contacts in their organization
CREATE POLICY "Users can view org contacts"
    ON contacts FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- Users can create contacts in their organization
CREATE POLICY "Users can create contacts"
    ON contacts FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can update contacts in their organization
CREATE POLICY "Users can update contacts"
    ON contacts FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- Only Admin/Manager can delete contacts
CREATE POLICY "Admin/Manager can delete contacts"
    ON contacts FOR UPDATE
    USING (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER')
        )
    );

-- Contact Tags Policies
CREATE POLICY "Users can view org tags"
    ON contact_tags FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create tags"
    ON contact_tags FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update tags"
    ON contact_tags FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Enrichment Jobs Policies
CREATE POLICY "Users can view org enrichment jobs"
    ON contact_enrichment_jobs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Only Admin/Manager can trigger enrichment
CREATE POLICY "Admin/Manager can create enrichment jobs"
    ON contact_enrichment_jobs FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT u.organization_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('ADMIN', 'MANAGER')
        )
    );

-- Service role can update enrichment jobs
CREATE POLICY "Service role can update enrichment jobs"
    ON contact_enrichment_jobs FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Contact Interactions Policies
CREATE POLICY "Users can view org interactions"
    ON contact_interactions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create interactions"
    ON contact_interactions FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Search contacts with filters
CREATE OR REPLACE FUNCTION search_contacts(
    p_org_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_tier contact_tier[] DEFAULT NULL,
    p_topics TEXT[] DEFAULT NULL,
    p_regions TEXT[] DEFAULT NULL,
    p_tag_ids UUID[] DEFAULT NULL,
    p_outlet TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    full_name VARCHAR,
    title VARCHAR,
    email VARCHAR,
    outlet VARCHAR,
    role contact_role,
    tier contact_tier,
    topics TEXT[],
    regions TEXT[],
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.full_name,
        c.title,
        c.email,
        c.outlet,
        c.role,
        c.tier,
        c.topics,
        c.regions,
        c.created_at
    FROM contacts c
    WHERE c.organization_id = p_org_id
        AND c.deleted_at IS NULL
        AND (p_search_query IS NULL OR c.search_vector @@ plainto_tsquery('english', p_search_query))
        AND (p_tier IS NULL OR c.tier = ANY(p_tier))
        AND (p_topics IS NULL OR c.topics && p_topics)
        AND (p_regions IS NULL OR c.regions && p_regions)
        AND (p_tag_ids IS NULL OR c.tag_ids && p_tag_ids)
        AND (p_outlet IS NULL OR c.outlet ILIKE '%' || p_outlet || '%')
    ORDER BY
        CASE WHEN p_search_query IS NOT NULL
            THEN ts_rank(c.search_vector, plainto_tsquery('english', p_search_query))
            ELSE 0
        END DESC,
        c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get contact statistics
CREATE OR REPLACE FUNCTION get_contact_stats(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_tier', jsonb_object_agg(tier, tier_count),
        'by_role', jsonb_object_agg(role, role_count),
        'enriched', COUNT(*) FILTER (WHERE bio IS NOT NULL OR follower_count IS NOT NULL)
    ) INTO result
    FROM (
        SELECT
            tier,
            role,
            COUNT(*) OVER (PARTITION BY tier) as tier_count,
            COUNT(*) OVER (PARTITION BY role) as role_count,
            bio,
            follower_count
        FROM contacts
        WHERE organization_id = p_org_id
        AND deleted_at IS NULL
    ) stats;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contacts IS 'Media contacts, influencers, and KOLs database with enrichment support';
COMMENT ON TABLE contact_tags IS 'Normalized tags for contact categorization';
COMMENT ON TABLE contact_enrichment_jobs IS 'Background jobs for enriching contact data via APIs';
COMMENT ON TABLE contact_interactions IS 'Log of all interactions with contacts';
COMMENT ON FUNCTION search_contacts IS 'Advanced search with filtering, full-text search, and pagination';
COMMENT ON FUNCTION get_contact_stats IS 'Get aggregate statistics for contacts by tier, role, and enrichment status';
