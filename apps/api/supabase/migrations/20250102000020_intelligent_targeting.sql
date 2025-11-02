-- =====================================================
-- INTELLIGENT CONTACT TARGETING & CAMPAIGN READINESS
-- =====================================================
-- Smart targeting layer for automatic contact selection and campaign readiness assessment

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE match_reason AS ENUM (
  'RELATIONSHIP_SCORE',
  'TOPIC_ALIGNMENT',
  'PAST_SUCCESS',
  'BEAT_MATCH',
  'OUTLET_MATCH',
  'TIER_QUALIFICATION',
  'ENGAGEMENT_HISTORY',
  'AGENT_RECOMMENDATION',
  'MANUAL_SELECTION'
);

CREATE TYPE targeting_mode AS ENUM (
  'AUTO',       -- Fully automatic contact selection
  'SEMI_AUTO',  -- AI suggests, human approves
  'MANUAL'      -- Human selects all contacts
);

CREATE TYPE readiness_status AS ENUM (
  'READY',
  'NEEDS_REVIEW',
  'INSUFFICIENT_CONTACTS',
  'NOT_READY'
);

-- =====================================================
-- EXTEND CAMPAIGNS TABLE
-- =====================================================

-- Add targeting criteria to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS targeting_criteria JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS targeting_mode targeting_mode DEFAULT 'SEMI_AUTO';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_contacts_required INTEGER DEFAULT 10;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS readiness_score DECIMAL(3,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS readiness_status readiness_status;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS readiness_notes TEXT;

-- Index for targeting criteria
CREATE INDEX IF NOT EXISTS idx_campaigns_targeting_mode ON campaigns(targeting_mode);
CREATE INDEX IF NOT EXISTS idx_campaigns_readiness_status ON campaigns(readiness_status) WHERE readiness_status IS NOT NULL;

COMMENT ON COLUMN campaigns.targeting_criteria IS 'JSONB criteria for contact matching: tiers, topics, outlets, scores, exclusions';
COMMENT ON COLUMN campaigns.targeting_mode IS 'How contacts are selected: AUTO, SEMI_AUTO, or MANUAL';

-- =====================================================
-- CAMPAIGN CONTACT MATCHES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_contact_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Match scoring
    match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
    match_reasons match_reason[] NOT NULL, -- Array of reasons
    match_rationale TEXT, -- AI-generated explanation

    -- Match factors breakdown
    relationship_score_factor DECIMAL(3,2),
    topic_alignment_factor DECIMAL(3,2),
    past_success_factor DECIMAL(3,2),
    engagement_factor DECIMAL(3,2),

    -- Contact context at match time
    contact_tier relationship_tier,
    contact_composite_score DECIMAL(3,2),
    contact_last_interaction TIMESTAMPTZ,

    -- Match metadata
    matched_by VARCHAR(100), -- 'AUTO', agent name, or user ID
    match_confidence DECIMAL(3,2), -- Confidence in the match (0-1)

    -- Exclusion tracking
    is_excluded BOOLEAN DEFAULT false,
    exclusion_reason TEXT,
    excluded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    excluded_at TIMESTAMPTZ,

    -- Approval workflow
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Timestamps
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    UNIQUE(campaign_id, contact_id, organization_id)
);

-- Indexes
CREATE INDEX idx_campaign_contact_matches_campaign ON campaign_contact_matches(campaign_id);
CREATE INDEX idx_campaign_contact_matches_contact ON campaign_contact_matches(contact_id);
CREATE INDEX idx_campaign_contact_matches_score ON campaign_contact_matches(match_score DESC);
CREATE INDEX idx_campaign_contact_matches_tier ON campaign_contact_matches(contact_tier);
CREATE INDEX idx_campaign_contact_matches_excluded ON campaign_contact_matches(is_excluded) WHERE is_excluded = false;
CREATE INDEX idx_campaign_contact_matches_approved ON campaign_contact_matches(is_approved) WHERE is_approved = true;
CREATE INDEX idx_campaign_contact_matches_organization ON campaign_contact_matches(organization_id);

-- =====================================================
-- CONTACT SUITABILITY CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_suitability_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contact reference
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- Cached suitability data
    preferred_topics TEXT[], -- Topics this contact covers
    preferred_content_types TEXT[], -- Press release, exclusive, etc.
    outlet_tier VARCHAR(50), -- Tier of their outlet
    avg_pitch_acceptance_rate DECIMAL(3,2),
    best_outreach_days TEXT[], -- 'Monday', 'Tuesday', etc.
    best_outreach_hours INTEGER[], -- Hours of day (0-23)

    -- Behavioral patterns
    typical_response_time_hours DECIMAL(10,2),
    engagement_level VARCHAR(50), -- 'HIGH', 'MEDIUM', 'LOW'
    pitch_resonance_topics TEXT[], -- Topics that resonate well

    -- Cache metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_source VARCHAR(100), -- 'AUTO', 'AI', 'MANUAL'
    cache_validity_hours INTEGER DEFAULT 168, -- 1 week default

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    UNIQUE(contact_id, organization_id)
);

-- Indexes
CREATE INDEX idx_contact_suitability_contact ON contact_suitability_cache(contact_id);
CREATE INDEX idx_contact_suitability_organization ON contact_suitability_cache(organization_id);
CREATE INDEX idx_contact_suitability_last_calculated ON contact_suitability_cache(last_calculated_at DESC);
CREATE INDEX idx_contact_suitability_engagement ON contact_suitability_cache(engagement_level);

-- GIN index for array searches
CREATE INDEX idx_contact_suitability_topics ON contact_suitability_cache USING gin(preferred_topics);
CREATE INDEX idx_contact_suitability_resonance ON contact_suitability_cache USING gin(pitch_resonance_topics);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to match contacts to campaign based on criteria
CREATE OR REPLACE FUNCTION match_contacts_to_campaign(
    p_campaign_id UUID,
    p_criteria JSONB,
    p_organization_id UUID
) RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    outlet TEXT,
    match_score DECIMAL,
    match_reasons match_reason[],
    relationship_tier relationship_tier,
    composite_score DECIMAL
) AS $$
DECLARE
    v_min_tier TEXT;
    v_max_tier TEXT;
    v_min_score DECIMAL;
    v_topics TEXT[];
    v_outlets TEXT[];
    v_excluded_contacts UUID[];
    v_require_past_success BOOLEAN;
BEGIN
    -- Extract criteria from JSONB
    v_min_tier := p_criteria->>'minTier';
    v_max_tier := COALESCE(p_criteria->>'maxTier', 'A');
    v_min_score := COALESCE((p_criteria->>'minScore')::DECIMAL, 0.0);
    v_topics := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'topics'));
    v_outlets := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'outlets'));
    v_excluded_contacts := ARRAY(SELECT (jsonb_array_elements_text(p_criteria->'excludedContacts'))::UUID);
    v_require_past_success := COALESCE((p_criteria->>'requirePastSuccess')::BOOLEAN, false);

    RETURN QUERY
    WITH contact_scores AS (
        SELECT
            c.id,
            c.name,
            c.outlet,
            COALESCE(rs.composite_score, 0) as comp_score,
            COALESCE(rs.relationship_tier, 'UNRATED') as rel_tier,
            ci.beat_summary,
            ci.expertise_areas,
            csc.preferred_topics,
            csc.avg_pitch_acceptance_rate,
            -- Calculate match score components
            CASE
                WHEN rs.composite_score >= 0.7 THEN 0.3
                WHEN rs.composite_score >= 0.4 THEN 0.2
                ELSE 0.1
            END as relationship_factor,
            CASE
                WHEN v_topics IS NOT NULL AND csc.preferred_topics && v_topics THEN 0.4
                WHEN ci.expertise_areas IS NOT NULL AND ci.expertise_areas ?| v_topics THEN 0.3
                ELSE 0.0
            END as topic_factor,
            CASE
                WHEN v_require_past_success AND COALESCE(csc.avg_pitch_acceptance_rate, 0) > 0.3 THEN 0.2
                WHEN COALESCE(csc.avg_pitch_acceptance_rate, 0) > 0.2 THEN 0.1
                ELSE 0.05
            END as success_factor,
            CASE
                WHEN v_outlets IS NOT NULL AND c.outlet = ANY(v_outlets) THEN 0.1
                ELSE 0.0
            END as outlet_factor
        FROM contacts c
        LEFT JOIN relationship_scores rs ON rs.contact_id = c.id AND rs.organization_id = p_organization_id
        LEFT JOIN crm_insights ci ON ci.contact_id = c.id AND ci.organization_id = p_organization_id
        LEFT JOIN contact_suitability_cache csc ON csc.contact_id = c.id AND csc.organization_id = p_organization_id
        WHERE c.organization_id = p_organization_id
          AND c.status = 'ACTIVE'
          -- Apply tier filter
          AND (v_min_tier IS NULL OR COALESCE(rs.relationship_tier::TEXT, 'UNRATED') >= v_min_tier)
          -- Apply score filter
          AND COALESCE(rs.composite_score, 0) >= v_min_score
          -- Apply outlet filter
          AND (v_outlets IS NULL OR array_length(v_outlets, 1) IS NULL OR c.outlet = ANY(v_outlets))
          -- Apply exclusions
          AND (v_excluded_contacts IS NULL OR array_length(v_excluded_contacts, 1) IS NULL OR c.id != ALL(v_excluded_contacts))
    ),
    scored_contacts AS (
        SELECT
            id,
            name,
            outlet,
            comp_score,
            rel_tier,
            (relationship_factor + topic_factor + success_factor + outlet_factor) as total_match_score,
            -- Build match reasons array
            ARRAY(
                SELECT unnest(ARRAY[
                    CASE WHEN relationship_factor > 0 THEN 'RELATIONSHIP_SCORE'::match_reason END,
                    CASE WHEN topic_factor > 0.3 THEN 'TOPIC_ALIGNMENT'::match_reason END,
                    CASE WHEN success_factor > 0.1 THEN 'PAST_SUCCESS'::match_reason END,
                    CASE WHEN outlet_factor > 0 THEN 'OUTLET_MATCH'::match_reason END
                ])
                WHERE unnest IS NOT NULL
            ) as reasons
        FROM contact_scores
        WHERE (relationship_factor + topic_factor + success_factor + outlet_factor) > 0.1
    )
    SELECT
        sc.id,
        sc.name,
        sc.outlet,
        LEAST(sc.total_match_score, 1.0)::DECIMAL(3,2),
        sc.reasons,
        sc.rel_tier,
        sc.comp_score
    FROM scored_contacts sc
    ORDER BY sc.total_match_score DESC
    LIMIT 500; -- Reasonable limit
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate campaign readiness score
CREATE OR REPLACE FUNCTION calculate_campaign_readiness(
    p_campaign_id UUID,
    p_organization_id UUID
) RETURNS TABLE (
    readiness_score DECIMAL,
    readiness_status readiness_status,
    total_matches INTEGER,
    tier_a_matches INTEGER,
    tier_b_matches INTEGER,
    tier_c_matches INTEGER,
    avg_match_score DECIMAL,
    issues TEXT[]
) AS $$
DECLARE
    v_min_required INTEGER;
    v_total INTEGER;
    v_tier_a INTEGER;
    v_tier_b INTEGER;
    v_tier_c INTEGER;
    v_avg_score DECIMAL;
    v_readiness DECIMAL := 0;
    v_status readiness_status;
    v_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get minimum required contacts
    SELECT min_contacts_required INTO v_min_required
    FROM campaigns
    WHERE id = p_campaign_id;

    v_min_required := COALESCE(v_min_required, 10);

    -- Get match statistics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE contact_tier = 'A'),
        COUNT(*) FILTER (WHERE contact_tier = 'B'),
        COUNT(*) FILTER (WHERE contact_tier = 'C'),
        AVG(match_score)
    INTO v_total, v_tier_a, v_tier_b, v_tier_c, v_avg_score
    FROM campaign_contact_matches
    WHERE campaign_id = p_campaign_id
      AND organization_id = p_organization_id
      AND is_excluded = false;

    v_total := COALESCE(v_total, 0);
    v_tier_a := COALESCE(v_tier_a, 0);
    v_tier_b := COALESCE(v_tier_b, 0);
    v_tier_c := COALESCE(v_tier_c, 0);
    v_avg_score := COALESCE(v_avg_score, 0);

    -- Calculate readiness score (0-1)
    -- Factor 1: Meeting minimum contacts (40%)
    v_readiness := v_readiness + (LEAST(v_total::DECIMAL / v_min_required, 1.0) * 0.4);

    -- Factor 2: Quality mix (30%)
    IF v_total > 0 THEN
        v_readiness := v_readiness + ((v_tier_a::DECIMAL / v_total * 0.5) +
                                      (v_tier_b::DECIMAL / v_total * 0.3) +
                                      (v_tier_c::DECIMAL / v_total * 0.2)) * 0.3;
    END IF;

    -- Factor 3: Average match score (30%)
    v_readiness := v_readiness + (v_avg_score * 0.3);

    -- Determine status and issues
    IF v_total < v_min_required THEN
        v_status := 'INSUFFICIENT_CONTACTS';
        v_issues := array_append(v_issues, format('Only %s contacts matched (need %s)', v_total, v_min_required));
    END IF;

    IF v_tier_a = 0 AND v_total > 0 THEN
        v_issues := array_append(v_issues, 'No Tier A contacts - campaign may have lower success rate');
    END IF;

    IF v_avg_score < 0.3 THEN
        v_issues := array_append(v_issues, format('Low average match score: %s', ROUND(v_avg_score, 2)));
    END IF;

    -- Final status determination
    IF v_status IS NULL THEN
        IF array_length(v_issues, 1) > 0 THEN
            v_status := 'NEEDS_REVIEW';
        ELSIF v_readiness >= 0.7 THEN
            v_status := 'READY';
        ELSE
            v_status := 'NOT_READY';
        END IF;
    END IF;

    RETURN QUERY SELECT
        v_readiness::DECIMAL(3,2),
        v_status,
        v_total,
        v_tier_a,
        v_tier_b,
        v_tier_c,
        v_avg_score::DECIMAL(3,2),
        v_issues;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get contact suitability for topics
CREATE OR REPLACE FUNCTION get_suitable_contacts_for_topics(
    p_topics TEXT[],
    p_organization_id UUID,
    p_min_tier relationship_tier DEFAULT 'C',
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    outlet TEXT,
    relationship_tier relationship_tier,
    topic_match_count INTEGER,
    suitability_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.outlet,
        COALESCE(rs.relationship_tier, 'UNRATED'::relationship_tier),
        (
            SELECT COUNT(*)
            FROM unnest(p_topics) AS topic
            WHERE topic = ANY(csc.preferred_topics) OR topic = ANY(ci.expertise_areas::TEXT[])
        )::INTEGER as matches,
        (
            COALESCE(rs.composite_score, 0) * 0.5 +
            (
                SELECT COUNT(*)::DECIMAL / array_length(p_topics, 1)
                FROM unnest(p_topics) AS topic
                WHERE topic = ANY(csc.preferred_topics) OR topic = ANY(ci.expertise_areas::TEXT[])
            ) * 0.5
        )::DECIMAL(3,2) as suit_score
    FROM contacts c
    LEFT JOIN relationship_scores rs ON rs.contact_id = c.id AND rs.organization_id = p_organization_id
    LEFT JOIN crm_insights ci ON ci.contact_id = c.id AND ci.organization_id = p_organization_id
    LEFT JOIN contact_suitability_cache csc ON csc.contact_id = c.id AND csc.organization_id = p_organization_id
    WHERE c.organization_id = p_organization_id
      AND c.status = 'ACTIVE'
      AND COALESCE(rs.relationship_tier, 'UNRATED') >= p_min_tier
      AND (
          EXISTS(
              SELECT 1
              FROM unnest(p_topics) AS topic
              WHERE topic = ANY(csc.preferred_topics) OR topic = ANY(ci.expertise_areas::TEXT[])
          )
      )
    ORDER BY suit_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_targeting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_contact_matches_updated_at
    BEFORE UPDATE ON campaign_contact_matches
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_targeting_timestamp();

CREATE TRIGGER contact_suitability_cache_updated_at
    BEFORE UPDATE ON contact_suitability_cache
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_targeting_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE campaign_contact_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_suitability_cache ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_contact_matches
CREATE POLICY campaign_contact_matches_org_isolation ON campaign_contact_matches
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY campaign_contact_matches_insert ON campaign_contact_matches
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for contact_suitability_cache
CREATE POLICY contact_suitability_cache_org_isolation ON contact_suitability_cache
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY contact_suitability_cache_insert ON contact_suitability_cache
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE campaign_contact_matches IS 'Matched contact-campaign pairs with scoring and reasoning';
COMMENT ON TABLE contact_suitability_cache IS 'Cached suitability data for faster contact matching';
COMMENT ON FUNCTION match_contacts_to_campaign IS 'Match contacts to campaign based on multi-dimensional criteria';
COMMENT ON FUNCTION calculate_campaign_readiness IS 'Calculate campaign readiness score and identify issues';
COMMENT ON FUNCTION get_suitable_contacts_for_topics IS 'Find contacts most suitable for specific topics';
