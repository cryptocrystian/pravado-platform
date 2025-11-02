-- =====================================================
-- CONTENT & SEO MANAGEMENT MIGRATION
-- =====================================================
-- Tables for content planning, keyword clustering, and SEO audits

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE content_status AS ENUM ('IDEA', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
CREATE TYPE content_format AS ENUM ('BLOG', 'VIDEO', 'SOCIAL', 'PODCAST', 'INFOGRAPHIC', 'WHITEPAPER', 'CASE_STUDY', 'EMAIL', 'LANDING_PAGE');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE task_type AS ENUM ('WRITE', 'EDIT', 'IMAGE', 'SEO', 'REVIEW', 'PUBLISH', 'PROMOTE');

-- =====================================================
-- KEYWORD CLUSTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS keyword_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Keywords & Metrics
    cluster_keywords TEXT[] DEFAULT '{}' NOT NULL,
    primary_keyword VARCHAR(255),
    search_volume INTEGER DEFAULT 0,
    difficulty_score DECIMAL(3, 2), -- 0.00 to 1.00

    -- Recommendations
    recommended_topics TEXT[] DEFAULT '{}',
    content_gaps TEXT[] DEFAULT '{}',

    -- SEO Metrics
    avg_cpc DECIMAL(10, 2),
    competition_level VARCHAR(50),
    trend_direction VARCHAR(20), -- 'rising', 'stable', 'declining'

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_cluster_name_per_org UNIQUE (organization_id, name, deleted_at)
);

CREATE INDEX idx_keyword_clusters_org_id ON keyword_clusters(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_keyword_clusters_keywords ON keyword_clusters USING GIN (cluster_keywords);
CREATE INDEX idx_keyword_clusters_search_volume ON keyword_clusters(search_volume DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- CONTENT ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    body_md TEXT,
    body_html TEXT,

    -- Content Details
    status content_status DEFAULT 'IDEA' NOT NULL,
    format content_format NOT NULL,

    -- Scheduling
    scheduled_date DATE,
    published_at TIMESTAMPTZ,

    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    keywords TEXT[] DEFAULT '{}',
    seo_score DECIMAL(3, 2), -- 0.00 to 1.00
    readability_score INTEGER, -- Flesch reading ease
    word_count INTEGER DEFAULT 0,

    -- Relations
    keyword_cluster_id UUID REFERENCES keyword_clusters(id) ON DELETE SET NULL,
    strategy_id UUID REFERENCES strategy_plans(id) ON DELETE SET NULL,

    -- AI Generated
    ai_summary TEXT,
    ai_outline TEXT[],
    ai_keywords_suggested TEXT[],

    -- Media
    featured_image_url TEXT,
    attachments JSONB DEFAULT '[]',

    -- Target Audience
    target_audience VARCHAR(255),
    buyer_stage VARCHAR(50), -- 'awareness', 'consideration', 'decision'

    -- Distribution
    distribution_channels TEXT[] DEFAULT '{}',
    canonical_url TEXT,

    -- Performance Metrics
    views INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    engagement_score DECIMAL(5, 2),

    -- Organization & Team
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_content_slug_per_org UNIQUE (organization_id, slug, deleted_at)
);

CREATE INDEX idx_content_items_org_id ON content_items(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_slug ON content_items(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_scheduled_date ON content_items(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_status ON content_items(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_format ON content_items(format) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_keywords ON content_items USING GIN (keywords);
CREATE INDEX idx_content_items_cluster_id ON content_items(keyword_cluster_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_strategy_id ON content_items(strategy_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_items_assigned_to ON content_items(assigned_to) WHERE deleted_at IS NULL;

-- =====================================================
-- CONTENT CALENDARS
-- =====================================================

CREATE TABLE IF NOT EXISTS content_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Calendar Period
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),

    -- Content Items
    content_item_ids UUID[] DEFAULT '{}',

    -- Calendar Metadata
    theme VARCHAR(255),
    goals TEXT,
    notes TEXT,

    -- Metrics
    planned_items_count INTEGER DEFAULT 0,
    completed_items_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(3, 2),

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_calendar_per_org_month UNIQUE (organization_id, year, month, deleted_at)
);

CREATE INDEX idx_content_calendars_org_id ON content_calendars(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_calendars_month_year ON content_calendars(year, month) WHERE deleted_at IS NULL;

-- =====================================================
-- SEO AUDITS
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target
    url TEXT NOT NULL,
    title VARCHAR(500),

    -- Overall Score
    audit_score DECIMAL(3, 2), -- 0.00 to 1.00

    -- Detailed Scores
    performance_score DECIMAL(3, 2),
    seo_score DECIMAL(3, 2),
    accessibility_score DECIMAL(3, 2),
    best_practices_score DECIMAL(3, 2),

    -- Issues & Suggestions
    issues JSONB DEFAULT '[]', -- [{severity: 'error'|'warning', message: '...'}]
    suggestions JSONB DEFAULT '[]', -- [{priority: 'high'|'medium'|'low', action: '...'}]

    -- Technical Details
    meta_data JSONB DEFAULT '{}', -- title, description, og tags, etc.
    headings JSONB DEFAULT '{}', -- h1, h2, h3 structure
    images_analyzed INTEGER DEFAULT 0,
    links_analyzed INTEGER DEFAULT 0,

    -- Performance Metrics
    page_load_time_ms INTEGER,
    page_size_kb INTEGER,
    total_requests INTEGER,

    -- Keywords Analysis
    primary_keywords TEXT[],
    keyword_density JSONB DEFAULT '{}', -- {keyword: density}
    missing_keywords TEXT[],

    -- Content Analysis
    word_count INTEGER,
    readability_score INTEGER,
    content_quality_score DECIMAL(3, 2),

    -- Backlinks & Authority
    backlinks_count INTEGER,
    domain_authority INTEGER,
    page_authority INTEGER,

    -- Mobile Optimization
    mobile_friendly BOOLEAN,
    mobile_issues JSONB DEFAULT '[]',

    -- Audit Metadata
    audit_type VARCHAR(50), -- 'manual', 'scheduled', 'auto'
    audited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Relations
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit Trail
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_seo_audits_org_id ON seo_audits(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_seo_audits_url ON seo_audits(url) WHERE deleted_at IS NULL;
CREATE INDEX idx_seo_audits_content_item_id ON seo_audits(content_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_seo_audits_audit_score ON seo_audits(audit_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_seo_audits_audited_at ON seo_audits(audited_at DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- CONTENT TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS content_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Task Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type task_type NOT NULL,
    status task_status DEFAULT 'TODO' NOT NULL,
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1 = highest

    -- Scheduling
    due_date DATE,
    completed_at TIMESTAMPTZ,

    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Relations
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE NOT NULL,

    -- Notes & Attachments
    notes TEXT,
    attachments JSONB DEFAULT '[]',

    -- Time Tracking
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_content_tasks_content_item_id ON content_tasks(content_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_tasks_assigned_to ON content_tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_tasks_status ON content_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_tasks_due_date ON content_tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_tasks_org_id ON content_tasks(organization_id) WHERE deleted_at IS NULL;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_content_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from title
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- If slug is manually set and not empty, use it
    IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
        RETURN NEW;
    END IF;

    final_slug := base_slug;

    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (
        SELECT 1 FROM content_items
        WHERE slug = final_slug
        AND organization_id = NEW.organization_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND deleted_at IS NULL
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := final_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_items_generate_slug
    BEFORE INSERT OR UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION generate_content_slug();

-- Update content calendar metrics
CREATE OR REPLACE FUNCTION update_calendar_metrics()
RETURNS TRIGGER AS $$
DECLARE
    cal_id UUID;
    cal_month INTEGER;
    cal_year INTEGER;
BEGIN
    -- Extract month/year from scheduled_date
    IF NEW.scheduled_date IS NOT NULL THEN
        cal_month := EXTRACT(MONTH FROM NEW.scheduled_date);
        cal_year := EXTRACT(YEAR FROM NEW.scheduled_date);

        -- Get or create calendar entry
        SELECT id INTO cal_id
        FROM content_calendars
        WHERE organization_id = NEW.organization_id
        AND month = cal_month
        AND year = cal_year
        AND deleted_at IS NULL;

        IF cal_id IS NOT NULL THEN
            -- Update metrics
            UPDATE content_calendars
            SET
                planned_items_count = (
                    SELECT COUNT(*)
                    FROM content_items
                    WHERE organization_id = NEW.organization_id
                    AND EXTRACT(MONTH FROM scheduled_date) = cal_month
                    AND EXTRACT(YEAR FROM scheduled_date) = cal_year
                    AND status IN ('PLANNED', 'IN_PROGRESS')
                    AND deleted_at IS NULL
                ),
                completed_items_count = (
                    SELECT COUNT(*)
                    FROM content_items
                    WHERE organization_id = NEW.organization_id
                    AND EXTRACT(MONTH FROM scheduled_date) = cal_month
                    AND EXTRACT(YEAR FROM scheduled_date) = cal_year
                    AND status = 'COMPLETED'
                    AND deleted_at IS NULL
                ),
                updated_at = NOW()
            WHERE id = cal_id;

            -- Update completion rate
            UPDATE content_calendars
            SET completion_rate = CASE
                WHEN planned_items_count + completed_items_count > 0
                THEN completed_items_count::DECIMAL / (planned_items_count + completed_items_count)
                ELSE 0
            END
            WHERE id = cal_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_items_update_calendar
    AFTER INSERT OR UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_metrics();

-- Get content calendar with items
CREATE OR REPLACE FUNCTION get_content_calendar(
    org_uuid UUID,
    cal_month INTEGER,
    cal_year INTEGER
)
RETURNS TABLE (
    date DATE,
    content_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH calendar_dates AS (
        SELECT generate_series(
            make_date(cal_year, cal_month, 1),
            make_date(cal_year, cal_month, 1) + INTERVAL '1 month' - INTERVAL '1 day',
            INTERVAL '1 day'
        )::DATE as date
    )
    SELECT
        cd.date,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ci.id,
                    'title', ci.title,
                    'status', ci.status,
                    'format', ci.format,
                    'seo_score', ci.seo_score
                )
                ORDER BY ci.created_at
            ) FILTER (WHERE ci.id IS NOT NULL),
            '[]'::jsonb
        ) as content_items
    FROM calendar_dates cd
    LEFT JOIN content_items ci ON ci.scheduled_date = cd.date
        AND ci.organization_id = org_uuid
        AND ci.deleted_at IS NULL
    GROUP BY cd.date
    ORDER BY cd.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get content statistics
CREATE OR REPLACE FUNCTION get_content_stats(org_uuid UUID)
RETURNS TABLE (
    total_content INTEGER,
    ideas_count INTEGER,
    planned_count INTEGER,
    in_progress_count INTEGER,
    completed_count INTEGER,
    avg_seo_score DECIMAL,
    top_performing JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_content,
        COUNT(*) FILTER (WHERE status = 'IDEA')::INTEGER as ideas_count,
        COUNT(*) FILTER (WHERE status = 'PLANNED')::INTEGER as planned_count,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::INTEGER as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER as completed_count,
        AVG(seo_score) as avg_seo_score,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', id,
                        'title', title,
                        'views', views,
                        'engagement_score', engagement_score
                    )
                )
                FROM (
                    SELECT id, title, views, engagement_score
                    FROM content_items
                    WHERE organization_id = org_uuid
                    AND deleted_at IS NULL
                    AND status = 'COMPLETED'
                    ORDER BY engagement_score DESC NULLS LAST
                    LIMIT 5
                ) top
            ),
            '[]'::jsonb
        ) as top_performing
    FROM content_items
    WHERE organization_id = org_uuid
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tasks ENABLE ROW LEVEL SECURITY;

-- Keyword Clusters Policies
CREATE POLICY keyword_clusters_view_policy ON keyword_clusters
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY keyword_clusters_insert_policy ON keyword_clusters
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY keyword_clusters_update_policy ON keyword_clusters
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY keyword_clusters_delete_policy ON keyword_clusters
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- Content Items Policies
CREATE POLICY content_items_view_policy ON content_items
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY content_items_insert_policy ON content_items
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY content_items_update_policy ON content_items
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY content_items_delete_policy ON content_items
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- Content Calendars Policies
CREATE POLICY content_calendars_view_policy ON content_calendars
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY content_calendars_manage_policy ON content_calendars
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- SEO Audits Policies
CREATE POLICY seo_audits_view_policy ON seo_audits
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY seo_audits_manage_policy ON seo_audits
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Content Tasks Policies
CREATE POLICY content_tasks_view_policy ON content_tasks
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY content_tasks_manage_policy ON content_tasks
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

COMMENT ON TABLE keyword_clusters IS 'SEO keyword clusters for content planning';
COMMENT ON TABLE content_items IS 'Content pieces in various formats and stages';
COMMENT ON TABLE content_calendars IS 'Monthly content planning calendars';
COMMENT ON TABLE seo_audits IS 'SEO audit results for URLs and content';
COMMENT ON TABLE content_tasks IS 'Tasks associated with content creation';

COMMENT ON FUNCTION get_content_calendar IS 'Returns calendar grid with content items for a given month';
COMMENT ON FUNCTION get_content_stats IS 'Returns content statistics for an organization';
