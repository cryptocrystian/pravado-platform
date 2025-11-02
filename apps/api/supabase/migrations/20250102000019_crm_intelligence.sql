-- =====================================================
-- CRM INTELLIGENCE ENGINE + RELATIONSHIP SCORING
-- =====================================================
-- Rich profile enrichment, dynamic relationship scoring, and interaction tracking

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE relationship_tier AS ENUM (
  'A', -- Top tier: Strong relationship, high responsiveness
  'B', -- Mid tier: Established relationship, moderate engagement
  'C', -- Lower tier: New or cold relationship
  'UNRATED' -- No relationship data yet
);

CREATE TYPE interaction_type AS ENUM (
  'EMAIL_SENT',
  'EMAIL_OPENED',
  'EMAIL_CLICKED',
  'EMAIL_REPLIED',
  'MEETING_SCHEDULED',
  'MEETING_COMPLETED',
  'PHONE_CALL',
  'SOCIAL_ENGAGEMENT',
  'PITCH_ACCEPTED',
  'PITCH_REJECTED',
  'ARTICLE_PUBLISHED',
  'BACKLINK_RECEIVED',
  'FOLLOW_UP',
  'REFERRAL_GIVEN',
  'NOTE_ADDED'
);

CREATE TYPE score_source AS ENUM (
  'MANUAL',
  'AUTOMATED',
  'AI_GENERATED',
  'INTERACTION_BASED',
  'AGENT_CALCULATED'
);

CREATE TYPE relationship_status AS ENUM (
  'ACTIVE',
  'DORMANT',
  'COLD',
  'NURTURING',
  'ARCHIVED'
);

-- =====================================================
-- CRM INSIGHTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contact reference
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,

    -- AI-generated insights
    bio_summary TEXT, -- Condensed bio from multiple sources
    beat_summary TEXT, -- Coverage areas and topics
    tone_analysis TEXT, -- Communication style and preferences
    expertise_areas JSONB, -- Array of expertise topics
    recent_articles JSONB, -- Recent work samples with analysis

    -- Historical collaboration
    past_collaborations JSONB, -- Array of past pitches/placements
    collaboration_summary TEXT, -- AI summary of past work together
    success_patterns JSONB, -- What has worked well in the past

    -- Preferences and notes
    pitch_preferences TEXT, -- How they like to be pitched
    best_contact_times TEXT, -- When to reach out
    topics_to_avoid TEXT, -- Sensitive topics or areas

    -- Social media insights
    social_profiles JSONB, -- Links and handles
    social_activity_level VARCHAR(50), -- 'HIGH', 'MEDIUM', 'LOW'
    social_engagement_topics JSONB, -- What they engage with

    -- Behavioral insights
    avg_response_time_hours DECIMAL(10,2),
    preferred_content_types JSONB, -- Press releases, exclusives, etc.
    pitch_resonance_score DECIMAL(3,2), -- How well our pitches resonate (0-1)

    -- Intelligence metadata
    last_enriched_at TIMESTAMPTZ,
    enrichment_source VARCHAR(100), -- 'AI', 'MANUAL', 'IMPORTED'
    confidence_score DECIMAL(3,2), -- Confidence in the insights (0-1)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    UNIQUE(contact_id, organization_id)
);

-- Indexes
CREATE INDEX idx_crm_insights_contact_id ON crm_insights(contact_id);
CREATE INDEX idx_crm_insights_organization_id ON crm_insights(organization_id);
CREATE INDEX idx_crm_insights_last_enriched ON crm_insights(last_enriched_at DESC);

-- =====================================================
-- RELATIONSHIP SCORES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS relationship_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship context
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Individual user relationship
    agent_id VARCHAR(255), -- Agent relationship (if applicable)

    -- Score components
    composite_score DECIMAL(3,2) NOT NULL CHECK (composite_score >= 0 AND composite_score <= 1),
    relationship_tier relationship_tier NOT NULL DEFAULT 'UNRATED',

    -- Factor breakdown
    recency_score DECIMAL(3,2), -- How recent the last interaction
    frequency_score DECIMAL(3,2), -- How often we interact
    quality_score DECIMAL(3,2), -- Quality of interactions (replies, meetings)
    outcome_score DECIMAL(3,2), -- Success rate (placements, conversions)
    engagement_score DECIMAL(3,2), -- Email opens, clicks, social engagement

    -- Scoring metadata
    score_rationale TEXT, -- AI-generated explanation
    score_source score_source NOT NULL DEFAULT 'AUTOMATED',
    last_scored_at TIMESTAMPTZ DEFAULT NOW(),

    -- Relationship status
    relationship_status relationship_status DEFAULT 'ACTIVE',
    status_reason TEXT,

    -- Interaction summary
    total_interactions INTEGER DEFAULT 0,
    successful_outcomes INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMPTZ,
    last_interaction_type interaction_type,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    UNIQUE(contact_id, user_id, organization_id)
);

-- Indexes
CREATE INDEX idx_relationship_scores_contact_id ON relationship_scores(contact_id);
CREATE INDEX idx_relationship_scores_user_id ON relationship_scores(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_relationship_scores_agent_id ON relationship_scores(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_relationship_scores_tier ON relationship_scores(relationship_tier);
CREATE INDEX idx_relationship_scores_composite ON relationship_scores(composite_score DESC);
CREATE INDEX idx_relationship_scores_organization_id ON relationship_scores(organization_id);
CREATE INDEX idx_relationship_scores_last_interaction ON relationship_scores(last_interaction_at DESC);

-- =====================================================
-- CRM INTERACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Interaction context
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id VARCHAR(255), -- If triggered by an agent

    -- Interaction details
    interaction_type interaction_type NOT NULL,
    interaction_channel VARCHAR(50), -- 'EMAIL', 'PHONE', 'SOCIAL', 'IN_PERSON'

    -- Content
    subject TEXT,
    description TEXT,
    content_snippet TEXT,

    -- Outcome tracking
    was_successful BOOLEAN,
    outcome_type VARCHAR(100), -- 'PLACEMENT', 'MEETING', 'REPLY', 'REJECTION'
    outcome_value DECIMAL(10,2), -- Quantifiable value (placement reach, etc.)

    -- Response tracking
    response_time_hours DECIMAL(10,2),
    sentiment VARCHAR(50), -- 'POSITIVE', 'NEUTRAL', 'NEGATIVE'

    -- Related entities
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    pitch_workflow_id UUID REFERENCES pitch_workflows(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB, -- Additional contextual data

    -- Timestamps
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes
CREATE INDEX idx_crm_interactions_contact_id ON crm_interactions(contact_id);
CREATE INDEX idx_crm_interactions_user_id ON crm_interactions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX idx_crm_interactions_organization_id ON crm_interactions(organization_id);
CREATE INDEX idx_crm_interactions_occurred_at ON crm_interactions(occurred_at DESC);
CREATE INDEX idx_crm_interactions_campaign ON crm_interactions(campaign_id) WHERE campaign_id IS NOT NULL;

-- =====================================================
-- RELATIONSHIP MODELS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS relationship_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Model configuration
    model_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Scoring weights (should sum to ~1.0)
    recency_weight DECIMAL(3,2) DEFAULT 0.25,
    frequency_weight DECIMAL(3,2) DEFAULT 0.20,
    quality_weight DECIMAL(3,2) DEFAULT 0.25,
    outcome_weight DECIMAL(3,2) DEFAULT 0.20,
    engagement_weight DECIMAL(3,2) DEFAULT 0.10,

    -- Tier thresholds
    tier_a_threshold DECIMAL(3,2) DEFAULT 0.70, -- Composite score >= 0.70 = Tier A
    tier_b_threshold DECIMAL(3,2) DEFAULT 0.40, -- Composite score >= 0.40 = Tier B
    tier_c_threshold DECIMAL(3,2) DEFAULT 0.00, -- Composite score < 0.40 = Tier C

    -- Recency decay settings
    recency_half_life_days INTEGER DEFAULT 90, -- Score halves after this many days

    -- Metadata
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    UNIQUE(model_name, organization_id)
);

-- Indexes
CREATE INDEX idx_relationship_models_organization_id ON relationship_models(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_relationship_models_default ON relationship_models(is_default) WHERE is_default = true;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate relationship score
CREATE OR REPLACE FUNCTION calculate_relationship_score(
    p_contact_id UUID,
    p_user_id UUID,
    p_organization_id UUID,
    p_model_id UUID DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    v_recency_score DECIMAL := 0;
    v_frequency_score DECIMAL := 0;
    v_quality_score DECIMAL := 0;
    v_outcome_score DECIMAL := 0;
    v_engagement_score DECIMAL := 0;
    v_composite_score DECIMAL;
    v_model RECORD;
    v_last_interaction_days INTEGER;
    v_total_interactions INTEGER;
    v_successful_outcomes INTEGER;
    v_reply_rate DECIMAL;
BEGIN
    -- Get scoring model
    IF p_model_id IS NULL THEN
        SELECT * INTO v_model
        FROM relationship_models
        WHERE (organization_id = p_organization_id OR organization_id IS NULL)
          AND is_active = true
          AND is_default = true
        LIMIT 1;
    ELSE
        SELECT * INTO v_model
        FROM relationship_models
        WHERE id = p_model_id;
    END IF;

    -- Default model if none found
    IF v_model IS NULL THEN
        v_model.recency_weight := 0.25;
        v_model.frequency_weight := 0.20;
        v_model.quality_weight := 0.25;
        v_model.outcome_weight := 0.20;
        v_model.engagement_weight := 0.10;
        v_model.recency_half_life_days := 90;
    END IF;

    -- Calculate recency score (exponential decay)
    SELECT EXTRACT(DAY FROM NOW() - MAX(occurred_at))::INTEGER
    INTO v_last_interaction_days
    FROM crm_interactions
    WHERE contact_id = p_contact_id
      AND (user_id = p_user_id OR user_id IS NULL)
      AND organization_id = p_organization_id;

    IF v_last_interaction_days IS NOT NULL THEN
        v_recency_score := POWER(0.5, v_last_interaction_days::DECIMAL / v_model.recency_half_life_days);
    ELSE
        v_recency_score := 0;
    END IF;

    -- Calculate frequency score (interactions in last 6 months)
    SELECT COUNT(*)::INTEGER
    INTO v_total_interactions
    FROM crm_interactions
    WHERE contact_id = p_contact_id
      AND (user_id = p_user_id OR user_id IS NULL)
      AND organization_id = p_organization_id
      AND occurred_at >= NOW() - INTERVAL '6 months';

    v_frequency_score := LEAST(v_total_interactions::DECIMAL / 20.0, 1.0); -- Cap at 20 interactions

    -- Calculate quality score (reply rate)
    SELECT
        COUNT(*) FILTER (WHERE interaction_type IN ('EMAIL_REPLIED', 'MEETING_SCHEDULED'))::DECIMAL /
        NULLIF(COUNT(*) FILTER (WHERE interaction_type = 'EMAIL_SENT')::DECIMAL, 0)
    INTO v_reply_rate
    FROM crm_interactions
    WHERE contact_id = p_contact_id
      AND (user_id = p_user_id OR user_id IS NULL)
      AND organization_id = p_organization_id
      AND occurred_at >= NOW() - INTERVAL '1 year';

    v_quality_score := COALESCE(v_reply_rate, 0);

    -- Calculate outcome score (success rate)
    SELECT
        COUNT(*) FILTER (WHERE was_successful = true),
        COUNT(*)
    INTO v_successful_outcomes, v_total_interactions
    FROM crm_interactions
    WHERE contact_id = p_contact_id
      AND (user_id = p_user_id OR user_id IS NULL)
      AND organization_id = p_organization_id
      AND occurred_at >= NOW() - INTERVAL '1 year';

    IF v_total_interactions > 0 THEN
        v_outcome_score := v_successful_outcomes::DECIMAL / v_total_interactions::DECIMAL;
    ELSE
        v_outcome_score := 0;
    END IF;

    -- Calculate engagement score (opens, clicks)
    SELECT
        COUNT(*) FILTER (WHERE interaction_type IN ('EMAIL_OPENED', 'EMAIL_CLICKED', 'SOCIAL_ENGAGEMENT'))::DECIMAL /
        NULLIF(COUNT(*)::DECIMAL, 0)
    INTO v_engagement_score
    FROM crm_interactions
    WHERE contact_id = p_contact_id
      AND (user_id = p_user_id OR user_id IS NULL)
      AND organization_id = p_organization_id
      AND occurred_at >= NOW() - INTERVAL '6 months';

    v_engagement_score := COALESCE(v_engagement_score, 0);

    -- Calculate composite score
    v_composite_score :=
        (v_recency_score * v_model.recency_weight) +
        (v_frequency_score * v_model.frequency_weight) +
        (v_quality_score * v_model.quality_weight) +
        (v_outcome_score * v_model.outcome_weight) +
        (v_engagement_score * v_model.engagement_weight);

    RETURN LEAST(v_composite_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get contact insights summary
CREATE OR REPLACE FUNCTION get_contact_insights(
    p_contact_id UUID,
    p_organization_id UUID
) RETURNS TABLE (
    bio_summary TEXT,
    beat_summary TEXT,
    relationship_tier relationship_tier,
    composite_score DECIMAL,
    total_interactions INTEGER,
    last_interaction_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.bio_summary,
        ci.beat_summary,
        COALESCE(rs.relationship_tier, 'UNRATED'::relationship_tier),
        rs.composite_score,
        rs.total_interactions,
        rs.last_interaction_at
    FROM contacts c
    LEFT JOIN crm_insights ci ON ci.contact_id = c.id
    LEFT JOIN relationship_scores rs ON rs.contact_id = c.id
    WHERE c.id = p_contact_id
      AND c.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update relationship tier based on score
CREATE OR REPLACE FUNCTION update_relationship_tier(
    p_score_id UUID,
    p_composite_score DECIMAL
) RETURNS relationship_tier AS $$
DECLARE
    v_tier relationship_tier;
    v_model RECORD;
    v_organization_id UUID;
BEGIN
    -- Get organization for this score
    SELECT organization_id INTO v_organization_id
    FROM relationship_scores
    WHERE id = p_score_id;

    -- Get scoring model
    SELECT * INTO v_model
    FROM relationship_models
    WHERE (organization_id = v_organization_id OR organization_id IS NULL)
      AND is_active = true
      AND is_default = true
    LIMIT 1;

    -- Default thresholds if no model
    IF v_model IS NULL THEN
        v_model.tier_a_threshold := 0.70;
        v_model.tier_b_threshold := 0.40;
    END IF;

    -- Determine tier
    IF p_composite_score >= v_model.tier_a_threshold THEN
        v_tier := 'A';
    ELSIF p_composite_score >= v_model.tier_b_threshold THEN
        v_tier := 'B';
    ELSE
        v_tier := 'C';
    END IF;

    -- Update the score record
    UPDATE relationship_scores
    SET relationship_tier = v_tier,
        updated_at = NOW()
    WHERE id = p_score_id;

    RETURN v_tier;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update relationship scores after interactions
CREATE OR REPLACE FUNCTION trigger_update_relationship_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Update relationship score after interaction
    UPDATE relationship_scores
    SET
        total_interactions = total_interactions + 1,
        last_interaction_at = NEW.occurred_at,
        last_interaction_type = NEW.interaction_type,
        successful_outcomes = CASE
            WHEN NEW.was_successful THEN successful_outcomes + 1
            ELSE successful_outcomes
        END,
        updated_at = NOW()
    WHERE contact_id = NEW.contact_id
      AND (user_id = NEW.user_id OR (user_id IS NULL AND NEW.user_id IS NULL))
      AND organization_id = NEW.organization_id;

    -- Insert if doesn't exist
    IF NOT FOUND THEN
        INSERT INTO relationship_scores (
            contact_id,
            user_id,
            agent_id,
            composite_score,
            total_interactions,
            successful_outcomes,
            last_interaction_at,
            last_interaction_type,
            organization_id
        ) VALUES (
            NEW.contact_id,
            NEW.user_id,
            NEW.agent_id,
            0.1, -- Initial score
            1,
            CASE WHEN NEW.was_successful THEN 1 ELSE 0 END,
            NEW.occurred_at,
            NEW.interaction_type,
            NEW.organization_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_interactions_update_score
    AFTER INSERT ON crm_interactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_relationship_score();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_crm_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_insights_updated_at
    BEFORE UPDATE ON crm_insights
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_timestamp();

CREATE TRIGGER relationship_scores_updated_at
    BEFORE UPDATE ON relationship_scores
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_timestamp();

CREATE TRIGGER relationship_models_updated_at
    BEFORE UPDATE ON relationship_models
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crm_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE crm_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_models ENABLE ROW LEVEL SECURITY;

-- Policies for crm_insights
CREATE POLICY crm_insights_org_isolation ON crm_insights
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY crm_insights_insert ON crm_insights
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for relationship_scores
CREATE POLICY relationship_scores_org_isolation ON relationship_scores
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY relationship_scores_insert ON relationship_scores
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for crm_interactions
CREATE POLICY crm_interactions_org_isolation ON crm_interactions
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY crm_interactions_insert ON crm_interactions
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for relationship_models
CREATE POLICY relationship_models_org_isolation ON relationship_models
    USING (
        organization_id = current_setting('app.current_organization_id', true)::UUID
        OR organization_id IS NULL
    );

CREATE POLICY relationship_models_insert ON relationship_models
    FOR INSERT
    WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::UUID
    );

-- =====================================================
-- SEED DEFAULT RELATIONSHIP MODEL
-- =====================================================

INSERT INTO relationship_models (
    model_name,
    description,
    recency_weight,
    frequency_weight,
    quality_weight,
    outcome_weight,
    engagement_weight,
    tier_a_threshold,
    tier_b_threshold,
    recency_half_life_days,
    is_default
) VALUES (
    'Default Scoring Model',
    'Balanced scoring model for general PR relationships',
    0.25, -- Recency
    0.20, -- Frequency
    0.25, -- Quality (reply rate)
    0.20, -- Outcome (success rate)
    0.10, -- Engagement
    0.70, -- Tier A threshold
    0.40, -- Tier B threshold
    90,   -- 90-day half-life
    true
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE crm_insights IS 'AI-enriched intelligence and insights for contacts';
COMMENT ON TABLE relationship_scores IS 'Dynamic relationship scoring for contact-user pairs';
COMMENT ON TABLE crm_interactions IS 'Historical log of all CRM interactions';
COMMENT ON TABLE relationship_models IS 'Configurable scoring models for relationship calculation';
COMMENT ON FUNCTION calculate_relationship_score IS 'Calculate composite relationship score from interaction data';
COMMENT ON FUNCTION get_contact_insights IS 'Get comprehensive insights summary for a contact';
COMMENT ON FUNCTION update_relationship_tier IS 'Update relationship tier based on composite score';
