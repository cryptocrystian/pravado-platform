-- =====================================================
-- CONTACT INTELLIGENCE MIGRATION
-- =====================================================
-- AI-driven enrichment, clustering, and smart targeting

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE enrichment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE cluster_generation_method AS ENUM ('AI_GENERATED', 'MANUAL', 'RULE_BASED');

-- =====================================================
-- CONTACT CLUSTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Cluster Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    generation_method cluster_generation_method DEFAULT 'AI_GENERATED' NOT NULL,

    -- Clustering Criteria
    criteria JSONB NOT NULL, -- { topics: [], tier: '', outletTypes: [], ... }
    keywords TEXT[],
    topics TEXT[],

    -- Tier Breakdown
    tier_breakdown JSONB DEFAULT '{"TIER_1": 0, "TIER_2": 0, "TIER_3": 0}',
    total_contacts INTEGER DEFAULT 0,

    -- AI Metadata
    confidence_score DECIMAL(3, 2),
    generation_prompt TEXT,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_contact_clusters_org_id ON contact_clusters(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contact_clusters_method ON contact_clusters(generation_method);
CREATE INDEX idx_contact_clusters_topics ON contact_clusters USING GIN (topics);

-- =====================================================
-- CONTACT SEGMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Segment Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Filter Query
    query_filters JSONB NOT NULL,
    -- {
    --   tier: ['TIER_1'],
    --   topics: ['technology'],
    --   regions: ['North America'],
    --   outletTypes: ['Blog'],
    --   hasEmail: true,
    --   lastContactedDays: 30
    -- }

    -- Dynamic vs Static
    is_dynamic BOOLEAN DEFAULT true,
    match_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_contact_segments_org_id ON contact_segments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contact_segments_is_dynamic ON contact_segments(is_dynamic);

-- =====================================================
-- CONTACT ENRICHMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_enrichments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Enrichment Status
    status enrichment_status DEFAULT 'PENDING' NOT NULL,

    -- AI-Generated Data
    topics TEXT[],
    tone VARCHAR(100), -- 'Professional', 'Casual', 'Technical', etc.
    outlet_sentiment VARCHAR(100), -- 'Positive', 'Neutral', 'Critical'
    reach_score DECIMAL(5, 2), -- 0-100 estimated reach
    bio_summary TEXT,
    writing_style TEXT,
    coverage_themes TEXT[],

    -- Metadata
    enrichment_source VARCHAR(50) DEFAULT 'AI', -- 'AI', 'MANUAL', 'API'
    confidence_score DECIMAL(3, 2),
    tokens_used INTEGER,
    processing_time_ms INTEGER,

    -- Error Handling
    error_message TEXT,
    error_details JSONB,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_contact_enrichments_contact_id ON contact_enrichments(contact_id);
CREATE INDEX idx_contact_enrichments_org_id ON contact_enrichments(organization_id);
CREATE INDEX idx_contact_enrichments_status ON contact_enrichments(status);
CREATE INDEX idx_contact_enrichments_topics ON contact_enrichments USING GIN (topics);

-- =====================================================
-- CONTACT SIMILARITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_similarities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    similar_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Similarity Score
    similarity_score DECIMAL(5, 4) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),

    -- Similarity Factors
    shared_topics TEXT[],
    shared_regions TEXT[],
    same_tier BOOLEAN,
    same_outlet_type BOOLEAN,

    -- Vector Embedding (for future use)
    contact_embedding VECTOR(1536),

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT contact_similarities_different_contacts CHECK (contact_id != similar_contact_id),
    CONSTRAINT contact_similarities_unique_pair UNIQUE (contact_id, similar_contact_id)
);

CREATE INDEX idx_contact_similarities_contact_id ON contact_similarities(contact_id);
CREATE INDEX idx_contact_similarities_similar_contact_id ON contact_similarities(similar_contact_id);
CREATE INDEX idx_contact_similarities_org_id ON contact_similarities(organization_id);
CREATE INDEX idx_contact_similarities_score ON contact_similarities(similarity_score DESC);
CREATE INDEX idx_contact_similarities_embedding ON contact_similarities USING ivfflat (contact_embedding vector_cosine_ops);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Find Similar Contacts
CREATE OR REPLACE FUNCTION find_similar_contacts(
    ref_contact_id UUID,
    similarity_threshold DECIMAL DEFAULT 0.5,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    contact JSONB,
    similarity_score DECIMAL,
    shared_factors JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(c.*) as contact,
        s.similarity_score,
        jsonb_build_object(
            'sharedTopics', s.shared_topics,
            'sharedRegions', s.shared_regions,
            'sameTier', s.same_tier,
            'sameOutletType', s.same_outlet_type
        ) as shared_factors
    FROM contact_similarities s
    JOIN contacts c ON s.similar_contact_id = c.id
    WHERE s.contact_id = ref_contact_id
      AND s.similarity_score >= similarity_threshold
      AND c.deleted_at IS NULL
    ORDER BY s.similarity_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Segment Contacts
CREATE OR REPLACE FUNCTION get_segment_contacts(segment_uuid UUID)
RETURNS TABLE (
    contact JSONB
) AS $$
DECLARE
    filters JSONB;
    org_uuid UUID;
    query TEXT;
BEGIN
    -- Get segment filters and org
    SELECT query_filters, organization_id
    INTO filters, org_uuid
    FROM contact_segments
    WHERE id = segment_uuid;

    IF filters IS NULL THEN
        RAISE EXCEPTION 'Segment not found';
    END IF;

    -- Build dynamic query based on filters
    -- This is a simplified version - expand with all filter types
    RETURN QUERY
    SELECT to_jsonb(c.*)
    FROM contacts c
    WHERE c.organization_id = org_uuid
      AND c.deleted_at IS NULL
      AND (
          (filters->>'tier' IS NULL)
          OR (c.tier = ANY(ARRAY(SELECT jsonb_array_elements_text(filters->'tier'))))
      )
      AND (
          (filters->>'topics' IS NULL)
          OR (c.topics && ARRAY(SELECT jsonb_array_elements_text(filters->'topics')))
      )
      AND (
          (filters->>'regions' IS NULL)
          OR (c.regions && ARRAY(SELECT jsonb_array_elements_text(filters->'regions')))
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Segment Match Count
CREATE OR REPLACE FUNCTION update_segment_match_count()
RETURNS TRIGGER AS $$
DECLARE
    contact_count INTEGER;
BEGIN
    -- Count matching contacts
    SELECT COUNT(*)
    INTO contact_count
    FROM get_segment_contacts(NEW.id);

    -- Update segment
    UPDATE contact_segments
    SET match_count = contact_count,
        last_calculated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_segments_update_count
    AFTER INSERT OR UPDATE ON contact_segments
    FOR EACH ROW
    WHEN (NEW.is_dynamic = true)
    EXECUTE FUNCTION update_segment_match_count();

-- Calculate Contact Similarity Score
CREATE OR REPLACE FUNCTION calculate_similarity_score(
    contact1_id UUID,
    contact2_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    c1 RECORD;
    c2 RECORD;
    score DECIMAL := 0;
    topic_overlap INTEGER;
    region_overlap INTEGER;
BEGIN
    -- Get both contacts
    SELECT * INTO c1 FROM contacts WHERE id = contact1_id;
    SELECT * INTO c2 FROM contacts WHERE id = contact2_id;

    IF c1 IS NULL OR c2 IS NULL THEN
        RETURN 0;
    END IF;

    -- Same tier (0.3 weight)
    IF c1.tier = c2.tier THEN
        score := score + 0.3;
    END IF;

    -- Same outlet type (0.2 weight)
    IF c1.outlet_type = c2.outlet_type THEN
        score := score + 0.2;
    END IF;

    -- Topic overlap (0.3 weight)
    IF c1.topics IS NOT NULL AND c2.topics IS NOT NULL THEN
        SELECT COUNT(*)
        INTO topic_overlap
        FROM (
            SELECT unnest(c1.topics) AS topic
            INTERSECT
            SELECT unnest(c2.topics) AS topic
        ) t;

        IF array_length(c1.topics, 1) > 0 THEN
            score := score + (topic_overlap::DECIMAL / array_length(c1.topics, 1)) * 0.3;
        END IF;
    END IF;

    -- Region overlap (0.2 weight)
    IF c1.regions IS NOT NULL AND c2.regions IS NOT NULL THEN
        SELECT COUNT(*)
        INTO region_overlap
        FROM (
            SELECT unnest(c1.regions) AS region
            INTERSECT
            SELECT unnest(c2.regions) AS region
        ) r;

        IF array_length(c1.regions, 1) > 0 THEN
            score := score + (region_overlap::DECIMAL / array_length(c1.regions, 1)) * 0.2;
        END IF;
    END IF;

    RETURN LEAST(score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Batch Calculate Similarities for Contact
CREATE OR REPLACE FUNCTION generate_contact_similarities(target_contact_id UUID)
RETURNS INTEGER AS $$
DECLARE
    target_org_id UUID;
    other_contact RECORD;
    sim_score DECIMAL;
    inserted_count INTEGER := 0;
BEGIN
    -- Get organization
    SELECT organization_id INTO target_org_id
    FROM contacts
    WHERE id = target_contact_id;

    IF target_org_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Delete existing similarities
    DELETE FROM contact_similarities
    WHERE contact_id = target_contact_id;

    -- Calculate for all other contacts in org
    FOR other_contact IN
        SELECT id
        FROM contacts
        WHERE organization_id = target_org_id
          AND id != target_contact_id
          AND deleted_at IS NULL
    LOOP
        sim_score := calculate_similarity_score(target_contact_id, other_contact.id);

        -- Only insert if score is meaningful (> 0.3)
        IF sim_score > 0.3 THEN
            INSERT INTO contact_similarities (
                contact_id,
                similar_contact_id,
                similarity_score,
                shared_topics,
                shared_regions,
                same_tier,
                same_outlet_type,
                organization_id
            )
            SELECT
                target_contact_id,
                other_contact.id,
                sim_score,
                ARRAY(
                    SELECT unnest(c1.topics)
                    INTERSECT
                    SELECT unnest(c2.topics)
                ),
                ARRAY(
                    SELECT unnest(c1.regions)
                    INTERSECT
                    SELECT unnest(c2.regions)
                ),
                c1.tier = c2.tier,
                c1.outlet_type = c2.outlet_type,
                target_org_id
            FROM contacts c1
            CROSS JOIN contacts c2
            WHERE c1.id = target_contact_id
              AND c2.id = other_contact.id;

            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE contact_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_similarities ENABLE ROW LEVEL SECURITY;

-- Contact Clusters Policies
CREATE POLICY contact_clusters_view_policy ON contact_clusters
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY contact_clusters_insert_policy ON contact_clusters
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY contact_clusters_update_policy ON contact_clusters
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY contact_clusters_delete_policy ON contact_clusters
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- Contact Segments Policies
CREATE POLICY contact_segments_view_policy ON contact_segments
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY contact_segments_manage_policy ON contact_segments
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Contact Enrichments Policies
CREATE POLICY contact_enrichments_view_policy ON contact_enrichments
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY contact_enrichments_manage_policy ON contact_enrichments
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Contact Similarities Policies
CREATE POLICY contact_similarities_view_policy ON contact_similarities
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY contact_similarities_manage_policy ON contact_similarities
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

COMMENT ON TABLE contact_clusters IS 'AI-generated contact clusters for smart segmentation';
COMMENT ON TABLE contact_segments IS 'User-defined saved filter queries with dynamic matching';
COMMENT ON TABLE contact_enrichments IS 'AI-powered contact enrichment with topics, tone, and reach';
COMMENT ON TABLE contact_similarities IS 'Similarity scores between contacts for recommendation';

COMMENT ON FUNCTION find_similar_contacts IS 'Find top similar contacts by similarity score';
COMMENT ON FUNCTION get_segment_contacts IS 'Get all contacts matching segment filters';
COMMENT ON FUNCTION calculate_similarity_score IS 'Calculate similarity between two contacts';
COMMENT ON FUNCTION generate_contact_similarities IS 'Batch generate similarities for a contact';
