-- =====================================================
-- REPUTATION MONITORING MIGRATION
-- =====================================================
-- AI-powered media monitoring with sentiment analysis, entity extraction, and alerting

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE mention_type AS ENUM ('BRAND', 'COMPETITOR', 'INDUSTRY', 'TOPIC');
CREATE TYPE medium AS ENUM ('NEWS', 'BLOG', 'FORUM', 'SOCIAL', 'PODCAST', 'VIDEO');
CREATE TYPE mention_sentiment AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');
CREATE TYPE alert_channel AS ENUM ('EMAIL', 'SLACK', 'IN_APP', 'WEBHOOK');
CREATE TYPE entity_type AS ENUM ('BRAND', 'COMPETITOR', 'TOPIC', 'PERSON', 'PRODUCT');
CREATE TYPE feedback_type AS ENUM ('RELEVANT', 'IRRELEVANT', 'NEEDS_REVIEW', 'SPAM');
CREATE TYPE alert_frequency AS ENUM ('IMMEDIATE', 'HOURLY', 'DAILY_DIGEST', 'WEEKLY_DIGEST');
CREATE TYPE mention_tone AS ENUM ('PROFESSIONAL', 'CASUAL', 'FORMAL', 'TECHNICAL', 'PROMOTIONAL');
CREATE TYPE mention_stance AS ENUM ('SUPPORTIVE', 'NEUTRAL', 'CRITICAL', 'BALANCED');
CREATE TYPE mention_emotion AS ENUM ('JOY', 'TRUST', 'FEAR', 'SURPRISE', 'SADNESS', 'ANGER', 'NEUTRAL');

-- =====================================================
-- MEDIA MENTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS media_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source Information
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    full_content TEXT,
    published_at TIMESTAMPTZ NOT NULL,

    -- Author & Outlet
    author VARCHAR(255),
    outlet VARCHAR(255),
    outlet_domain VARCHAR(255),

    -- Classification
    topics TEXT[],
    mention_type mention_type NOT NULL,
    medium medium NOT NULL,

    -- NLP Analysis Results
    sentiment mention_sentiment,
    sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0
    tone mention_tone,
    stance mention_stance,
    emotion mention_emotion,

    -- Relevance & Visibility
    relevance_score DECIMAL(5, 2) DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
    visibility_score DECIMAL(5, 2) DEFAULT 0 CHECK (visibility_score >= 0 AND visibility_score <= 100),
    virality_score DECIMAL(5, 2) DEFAULT 0 CHECK (virality_score >= 0 AND virality_score <= 100),
    is_viral BOOLEAN DEFAULT false,

    -- Entity Extraction
    detected_entities JSONB, -- { brands: [], competitors: [], products: [], people: [], locations: [] }
    entity_tags TEXT[],

    -- Engagement Metrics
    share_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reach_estimate INTEGER,

    -- Vector Embedding
    content_embedding VECTOR(1536),

    -- NLP Processing
    nlp_processed BOOLEAN DEFAULT false,
    nlp_processed_at TIMESTAMPTZ,
    nlp_confidence_score DECIMAL(3, 2),
    nlp_tokens_used INTEGER,

    -- Deduplication
    content_hash VARCHAR(64), -- SHA-256 hash for deduplication
    is_duplicate BOOLEAN DEFAULT false,
    original_mention_id UUID REFERENCES media_mentions(id) ON DELETE SET NULL,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_media_mentions_content_hash ON media_mentions(content_hash, organization_id);
CREATE INDEX idx_media_mentions_org_id ON media_mentions(organization_id);
CREATE INDEX idx_media_mentions_published_at ON media_mentions(published_at DESC);
CREATE INDEX idx_media_mentions_type ON media_mentions(mention_type);
CREATE INDEX idx_media_mentions_medium ON media_mentions(medium);
CREATE INDEX idx_media_mentions_sentiment ON media_mentions(sentiment);
CREATE INDEX idx_media_mentions_relevance ON media_mentions(relevance_score DESC);
CREATE INDEX idx_media_mentions_viral ON media_mentions(is_viral) WHERE is_viral = true;
CREATE INDEX idx_media_mentions_topics ON media_mentions USING GIN (topics);
CREATE INDEX idx_media_mentions_entities ON media_mentions USING GIN (entity_tags);
CREATE INDEX idx_media_mentions_embedding ON media_mentions USING ivfflat (content_embedding vector_cosine_ops);

-- =====================================================
-- MONITORING RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS monitoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Rule Configuration
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Query Terms
    query_terms TEXT[] NOT NULL, -- Keywords to monitor
    entity_type entity_type NOT NULL,

    -- Filters
    mention_types mention_type[],
    mediums medium[],
    min_relevance_score DECIMAL(5, 2),
    min_visibility_score DECIMAL(5, 2),

    -- Alert Configuration
    alert_channel alert_channel NOT NULL,
    alert_frequency alert_frequency DEFAULT 'IMMEDIATE' NOT NULL,
    threshold_score DECIMAL(5, 2) DEFAULT 70,

    -- Alert Recipients
    alert_email VARCHAR(500), -- Email address for EMAIL channel
    alert_webhook_url TEXT, -- Webhook URL for WEBHOOK channel
    alert_slack_channel VARCHAR(100), -- Slack channel for SLACK channel

    -- Rule Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_monitoring_rules_org_id ON monitoring_rules(organization_id);
CREATE INDEX idx_monitoring_rules_active ON monitoring_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_monitoring_rules_entity_type ON monitoring_rules(entity_type);
CREATE INDEX idx_monitoring_rules_terms ON monitoring_rules USING GIN (query_terms);

-- =====================================================
-- MENTION ALERTS
-- =====================================================

CREATE TABLE IF NOT EXISTS mention_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    rule_id UUID REFERENCES monitoring_rules(id) ON DELETE CASCADE NOT NULL,
    mention_id UUID REFERENCES media_mentions(id) ON DELETE CASCADE NOT NULL,

    -- Alert Details
    alert_channel alert_channel NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Delivery Status
    was_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    delivery_error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Alert Content
    alert_title VARCHAR(500),
    alert_message TEXT,

    -- User Interaction
    was_viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMPTZ,
    was_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT mention_alerts_unique_rule_mention UNIQUE (rule_id, mention_id)
);

CREATE INDEX idx_mention_alerts_rule_id ON mention_alerts(rule_id);
CREATE INDEX idx_mention_alerts_mention_id ON mention_alerts(mention_id);
CREATE INDEX idx_mention_alerts_org_id ON mention_alerts(organization_id);
CREATE INDEX idx_mention_alerts_triggered_at ON mention_alerts(triggered_at DESC);
CREATE INDEX idx_mention_alerts_undelivered ON mention_alerts(was_delivered) WHERE was_delivered = false;
CREATE INDEX idx_mention_alerts_unviewed ON mention_alerts(was_viewed) WHERE was_viewed = false;

-- =====================================================
-- MENTION FEEDBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS mention_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    mention_id UUID REFERENCES media_mentions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Feedback
    feedback_type feedback_type NOT NULL,
    comment TEXT,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT mention_feedback_unique_user_mention UNIQUE (mention_id, user_id)
);

CREATE INDEX idx_mention_feedback_mention_id ON mention_feedback(mention_id);
CREATE INDEX idx_mention_feedback_user_id ON mention_feedback(user_id);
CREATE INDEX idx_mention_feedback_org_id ON mention_feedback(organization_id);
CREATE INDEX idx_mention_feedback_type ON mention_feedback(feedback_type);

-- =====================================================
-- MONITORING SNAPSHOTS
-- =====================================================

CREATE TABLE IF NOT EXISTS monitoring_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Snapshot Metadata
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY'

    -- Overall Metrics
    total_mentions INTEGER DEFAULT 0,
    brand_mentions INTEGER DEFAULT 0,
    competitor_mentions INTEGER DEFAULT 0,
    industry_mentions INTEGER DEFAULT 0,

    -- Sentiment Analysis
    avg_sentiment DECIMAL(3, 2), -- -1.0 to 1.0
    positive_mentions INTEGER DEFAULT 0,
    neutral_mentions INTEGER DEFAULT 0,
    negative_mentions INTEGER DEFAULT 0,

    -- Visibility & Engagement
    avg_visibility_score DECIMAL(5, 2),
    avg_virality_score DECIMAL(5, 2),
    total_reach_estimate BIGINT DEFAULT 0,
    viral_mentions INTEGER DEFAULT 0,

    -- Top Sources & Keywords
    top_sources JSONB, -- [{ outlet: 'TechCrunch', count: 15 }, ...]
    top_keywords TEXT[],
    top_entities JSONB, -- { brands: [], competitors: [], products: [] }

    -- Medium Breakdown
    by_medium JSONB, -- { NEWS: 45, BLOG: 23, SOCIAL: 67 }

    -- Trend Indicators
    mentions_change_pct DECIMAL(5, 2), -- % change from previous period
    sentiment_change_pct DECIMAL(3, 2),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT monitoring_snapshots_unique_org_date_type UNIQUE (organization_id, snapshot_date, snapshot_type)
);

CREATE INDEX idx_monitoring_snapshots_org_id ON monitoring_snapshots(organization_id);
CREATE INDEX idx_monitoring_snapshots_date ON monitoring_snapshots(snapshot_date DESC);
CREATE INDEX idx_monitoring_snapshots_type ON monitoring_snapshots(snapshot_type);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Calculate Mention Similarity
CREATE OR REPLACE FUNCTION find_similar_mentions(
    ref_mention_id UUID,
    similarity_threshold DECIMAL DEFAULT 0.85,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    mention JSONB,
    similarity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(m.*) as mention,
        1 - (m.content_embedding <=> ref.content_embedding) as similarity_score
    FROM media_mentions m
    CROSS JOIN (
        SELECT content_embedding
        FROM media_mentions
        WHERE id = ref_mention_id
    ) ref
    WHERE m.id != ref_mention_id
      AND m.content_embedding IS NOT NULL
      AND 1 - (m.content_embedding <=> ref.content_embedding) >= similarity_threshold
    ORDER BY m.content_embedding <=> ref.content_embedding
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate Daily Snapshot
CREATE OR REPLACE FUNCTION generate_daily_snapshot(org_uuid UUID, target_date DATE)
RETURNS UUID AS $$
DECLARE
    snapshot_id UUID;
    prev_total INTEGER;
    prev_sentiment DECIMAL;
BEGIN
    -- Get previous day's total for trend calculation
    SELECT total_mentions, avg_sentiment
    INTO prev_total, prev_sentiment
    FROM monitoring_snapshots
    WHERE organization_id = org_uuid
      AND snapshot_type = 'DAILY'
      AND snapshot_date = target_date - INTERVAL '1 day'
    LIMIT 1;

    -- Create snapshot
    INSERT INTO monitoring_snapshots (
        organization_id,
        snapshot_date,
        snapshot_type,
        total_mentions,
        brand_mentions,
        competitor_mentions,
        industry_mentions,
        avg_sentiment,
        positive_mentions,
        neutral_mentions,
        negative_mentions,
        avg_visibility_score,
        avg_virality_score,
        total_reach_estimate,
        viral_mentions,
        top_sources,
        top_keywords,
        by_medium,
        mentions_change_pct,
        sentiment_change_pct
    )
    SELECT
        org_uuid,
        target_date,
        'DAILY',
        COUNT(*),
        COUNT(*) FILTER (WHERE mention_type = 'BRAND'),
        COUNT(*) FILTER (WHERE mention_type = 'COMPETITOR'),
        COUNT(*) FILTER (WHERE mention_type = 'INDUSTRY'),
        AVG(sentiment_score),
        COUNT(*) FILTER (WHERE sentiment = 'POSITIVE'),
        COUNT(*) FILTER (WHERE sentiment = 'NEUTRAL'),
        COUNT(*) FILTER (WHERE sentiment = 'NEGATIVE'),
        AVG(visibility_score),
        AVG(virality_score),
        SUM(reach_estimate),
        COUNT(*) FILTER (WHERE is_viral = true),
        (
            SELECT jsonb_agg(jsonb_build_object('outlet', outlet, 'count', cnt))
            FROM (
                SELECT outlet, COUNT(*) as cnt
                FROM media_mentions
                WHERE organization_id = org_uuid
                  AND DATE(published_at) = target_date
                  AND outlet IS NOT NULL
                GROUP BY outlet
                ORDER BY cnt DESC
                LIMIT 10
            ) top_outlets
        ),
        (
            SELECT ARRAY_AGG(DISTINCT topic)
            FROM (
                SELECT unnest(topics) as topic
                FROM media_mentions
                WHERE organization_id = org_uuid
                  AND DATE(published_at) = target_date
                LIMIT 50
            ) all_topics
        ),
        (
            SELECT jsonb_build_object(
                'NEWS', COUNT(*) FILTER (WHERE medium = 'NEWS'),
                'BLOG', COUNT(*) FILTER (WHERE medium = 'BLOG'),
                'SOCIAL', COUNT(*) FILTER (WHERE medium = 'SOCIAL'),
                'FORUM', COUNT(*) FILTER (WHERE medium = 'FORUM'),
                'PODCAST', COUNT(*) FILTER (WHERE medium = 'PODCAST'),
                'VIDEO', COUNT(*) FILTER (WHERE medium = 'VIDEO')
            )
            FROM media_mentions
            WHERE organization_id = org_uuid
              AND DATE(published_at) = target_date
        ),
        CASE WHEN prev_total > 0 THEN
            ((COUNT(*)::DECIMAL - prev_total) / prev_total) * 100
        ELSE NULL END,
        CASE WHEN prev_sentiment IS NOT NULL THEN
            AVG(sentiment_score) - prev_sentiment
        ELSE NULL END
    FROM media_mentions
    WHERE organization_id = org_uuid
      AND DATE(published_at) = target_date
    RETURNING id INTO snapshot_id;

    RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if Mention Matches Rule
CREATE OR REPLACE FUNCTION check_rule_match(
    mention_uuid UUID,
    rule_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    mention RECORD;
    rule RECORD;
    has_term_match BOOLEAN;
BEGIN
    -- Get mention and rule
    SELECT * INTO mention FROM media_mentions WHERE id = mention_uuid;
    SELECT * INTO rule FROM monitoring_rules WHERE id = rule_uuid;

    IF mention IS NULL OR rule IS NULL THEN
        RETURN false;
    END IF;

    -- Check if rule is active
    IF NOT rule.is_active THEN
        RETURN false;
    END IF;

    -- Check query terms match
    SELECT bool_or(
        mention.title ILIKE '%' || term || '%' OR
        mention.excerpt ILIKE '%' || term || '%'
    ) INTO has_term_match
    FROM unnest(rule.query_terms) term;

    IF NOT has_term_match THEN
        RETURN false;
    END IF;

    -- Check mention type filter
    IF rule.mention_types IS NOT NULL AND array_length(rule.mention_types, 1) > 0 THEN
        IF NOT mention.mention_type = ANY(rule.mention_types) THEN
            RETURN false;
        END IF;
    END IF;

    -- Check medium filter
    IF rule.mediums IS NOT NULL AND array_length(rule.mediums, 1) > 0 THEN
        IF NOT mention.medium = ANY(rule.mediums) THEN
            RETURN false;
        END IF;
    END IF;

    -- Check relevance threshold
    IF rule.min_relevance_score IS NOT NULL THEN
        IF mention.relevance_score < rule.min_relevance_score THEN
            RETURN false;
        END IF;
    END IF;

    -- Check visibility threshold
    IF rule.min_visibility_score IS NOT NULL THEN
        IF mention.visibility_score < rule.min_visibility_score THEN
            RETURN false;
        END IF;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update mention updated_at timestamp
CREATE OR REPLACE FUNCTION update_mention_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_mentions_update_timestamp
    BEFORE UPDATE ON media_mentions
    FOR EACH ROW
    EXECUTE FUNCTION update_mention_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE media_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mention_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mention_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_snapshots ENABLE ROW LEVEL SECURITY;

-- Media Mentions Policies
CREATE POLICY media_mentions_view_policy ON media_mentions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY media_mentions_insert_policy ON media_mentions
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

CREATE POLICY media_mentions_update_policy ON media_mentions
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Monitoring Rules Policies
CREATE POLICY monitoring_rules_view_policy ON monitoring_rules
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY monitoring_rules_manage_policy ON monitoring_rules
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Mention Alerts Policies
CREATE POLICY mention_alerts_view_policy ON mention_alerts
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY mention_alerts_manage_policy ON mention_alerts
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Mention Feedback Policies
CREATE POLICY mention_feedback_view_policy ON mention_feedback
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY mention_feedback_manage_policy ON mention_feedback
    FOR ALL
    USING (
        user_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role = 'ADMIN'
        )
    );

-- Monitoring Snapshots Policies
CREATE POLICY monitoring_snapshots_view_policy ON monitoring_snapshots
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY monitoring_snapshots_insert_policy ON monitoring_snapshots
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE media_mentions IS 'AI-analyzed media mentions with NLP enrichment and vector embeddings';
COMMENT ON TABLE monitoring_rules IS 'Configurable alerting rules for brand/competitor mentions';
COMMENT ON TABLE mention_alerts IS 'Triggered alerts based on monitoring rules';
COMMENT ON TABLE mention_feedback IS 'User feedback on mention relevance for ML refinement';
COMMENT ON TABLE monitoring_snapshots IS 'Daily/weekly aggregated monitoring metrics';

COMMENT ON FUNCTION find_similar_mentions IS 'Find semantically similar mentions using vector similarity';
COMMENT ON FUNCTION generate_daily_snapshot IS 'Generate daily monitoring snapshot with trends';
COMMENT ON FUNCTION check_rule_match IS 'Check if a mention matches a monitoring rule criteria';
