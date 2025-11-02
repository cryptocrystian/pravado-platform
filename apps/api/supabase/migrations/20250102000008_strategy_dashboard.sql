-- =====================================================
-- STRATEGY DASHBOARD MIGRATION
-- =====================================================
-- Reporting and analytics infrastructure

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE report_snapshot_type AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');
CREATE TYPE report_format AS ENUM ('JSON', 'CSV', 'PDF');
CREATE TYPE scorecard_category AS ENUM ('PR', 'CONTENT', 'SEO', 'REACH', 'ENGAGEMENT', 'OVERALL');

-- =====================================================
-- REPORT SNAPSHOTS
-- =====================================================

CREATE TABLE IF NOT EXISTS report_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Report Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type report_snapshot_type DEFAULT 'CUSTOM' NOT NULL,
    format report_format DEFAULT 'JSON' NOT NULL,

    -- Time Range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Filters
    filters JSONB DEFAULT '{}',
    -- { campaigns: [], contentFormats: [], tiers: [] }

    -- Computed Metrics
    metrics JSONB NOT NULL,
    -- {
    --   campaigns: { sent: N, openRate: 0.25, ... },
    --   content: { published: N, avgSeoScore: 0.75, ... },
    --   contacts: { total: N, byTier: {}, ... },
    --   agents: { executions: N, cost: $X, ... }
    -- }

    -- Export Data
    export_url TEXT,
    file_size_bytes INTEGER,
    generated_at TIMESTAMPTZ,

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_report_snapshots_org_id ON report_snapshots(organization_id);
CREATE INDEX idx_report_snapshots_date_range ON report_snapshots(start_date, end_date);
CREATE INDEX idx_report_snapshots_type ON report_snapshots(report_type);

-- =====================================================
-- STRATEGY SCORECARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS strategy_scorecards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Scorecard Info
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    category scorecard_category NOT NULL,

    -- Scores (0-100)
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    pr_score DECIMAL(5, 2) CHECK (pr_score >= 0 AND pr_score <= 100),
    content_score DECIMAL(5, 2) CHECK (content_score >= 0 AND content_score <= 100),
    seo_score DECIMAL(5, 2) CHECK (seo_score >= 0 AND seo_score <= 100),
    reach_score DECIMAL(5, 2) CHECK (reach_score >= 0 AND reach_score <= 100),
    engagement_score DECIMAL(5, 2) CHECK (engagement_score >= 0 AND engagement_score <= 100),

    -- Metrics Used
    metrics_data JSONB NOT NULL,

    -- Recommendations
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],

    -- Organization
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_strategy_scorecards_org_id ON strategy_scorecards(organization_id);
CREATE INDEX idx_strategy_scorecards_period ON strategy_scorecards(period_start, period_end);
CREATE INDEX idx_strategy_scorecards_category ON strategy_scorecards(category);

-- =====================================================
-- AGGREGATE VIEWS
-- =====================================================

-- Campaign Performance View
CREATE OR REPLACE VIEW campaign_performance AS
SELECT
    w.organization_id,
    COUNT(DISTINCT w.id) as total_workflows,
    COUNT(DISTINCT CASE WHEN w.status = 'COMPLETED' THEN w.id END) as completed_workflows,
    SUM(w.sent_count) as total_sent,
    SUM(w.delivered_count) as total_delivered,
    SUM(w.opened_count) as total_opened,
    SUM(w.clicked_count) as total_clicked,
    SUM(w.replied_count) as total_replied,
    SUM(w.bounced_count) as total_bounced,
    CASE
        WHEN SUM(w.sent_count) > 0
        THEN (SUM(w.delivered_count)::DECIMAL / SUM(w.sent_count))
        ELSE 0
    END as delivery_rate,
    CASE
        WHEN SUM(w.delivered_count) > 0
        THEN (SUM(w.opened_count)::DECIMAL / SUM(w.delivered_count))
        ELSE 0
    END as open_rate,
    CASE
        WHEN SUM(w.delivered_count) > 0
        THEN (SUM(w.clicked_count)::DECIMAL / SUM(w.delivered_count))
        ELSE 0
    END as click_rate,
    CASE
        WHEN SUM(w.delivered_count) > 0
        THEN (SUM(w.replied_count)::DECIMAL / SUM(w.delivered_count))
        ELSE 0
    END as reply_rate
FROM pitch_workflows w
WHERE w.deleted_at IS NULL
GROUP BY w.organization_id;

-- Content Performance View
CREATE OR REPLACE VIEW content_performance AS
SELECT
    c.organization_id,
    COUNT(*) as total_items,
    COUNT(CASE WHEN c.status = 'PUBLISHED' THEN 1 END) as published_items,
    COUNT(CASE WHEN c.status = 'DRAFT' THEN 1 END) as draft_items,
    AVG(c.seo_score) as avg_seo_score,
    AVG(c.readability_score) as avg_readability_score,
    SUM(c.word_count) as total_word_count,
    COUNT(DISTINCT c.format) as format_diversity
FROM content_items c
WHERE c.deleted_at IS NULL
GROUP BY c.organization_id;

-- Contact Reach View
CREATE OR REPLACE VIEW contact_reach AS
SELECT
    c.organization_id,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN c.tier = 'TIER_1' THEN 1 END) as tier_1_contacts,
    COUNT(CASE WHEN c.tier = 'TIER_2' THEN 1 END) as tier_2_contacts,
    COUNT(CASE WHEN c.tier = 'TIER_3' THEN 1 END) as tier_3_contacts,
    COUNT(DISTINCT c.outlet_type) as outlet_diversity,
    ARRAY_AGG(DISTINCT t) FILTER (WHERE t IS NOT NULL) as all_topics
FROM contacts c
CROSS JOIN LATERAL unnest(c.topics) as t
WHERE c.deleted_at IS NULL
GROUP BY c.organization_id;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get Strategy Summary
CREATE OR REPLACE FUNCTION get_strategy_summary(org_uuid UUID, start_date DATE, end_date DATE)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'campaigns', (
            SELECT jsonb_build_object(
                'totalWorkflows', COUNT(*),
                'completedWorkflows', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
                'totalSent', COALESCE(SUM(sent_count), 0),
                'deliveryRate', CASE
                    WHEN SUM(sent_count) > 0
                    THEN ROUND((SUM(delivered_count)::DECIMAL / SUM(sent_count)) * 100, 2)
                    ELSE 0
                END,
                'openRate', CASE
                    WHEN SUM(delivered_count) > 0
                    THEN ROUND((SUM(opened_count)::DECIMAL / SUM(delivered_count)) * 100, 2)
                    ELSE 0
                END,
                'clickRate', CASE
                    WHEN SUM(delivered_count) > 0
                    THEN ROUND((SUM(clicked_count)::DECIMAL / SUM(delivered_count)) * 100, 2)
                    ELSE 0
                END,
                'replyRate', CASE
                    WHEN SUM(delivered_count) > 0
                    THEN ROUND((SUM(replied_count)::DECIMAL / SUM(delivered_count)) * 100, 2)
                    ELSE 0
                END
            )
            FROM pitch_workflows
            WHERE organization_id = org_uuid
              AND created_at BETWEEN start_date AND end_date
              AND deleted_at IS NULL
        ),
        'content', (
            SELECT jsonb_build_object(
                'totalItems', COUNT(*),
                'publishedItems', COUNT(*) FILTER (WHERE status = 'PUBLISHED'),
                'avgSeoScore', ROUND(AVG(seo_score), 2),
                'avgReadabilityScore', ROUND(AVG(readability_score), 2),
                'totalWordCount', COALESCE(SUM(word_count), 0)
            )
            FROM content_items
            WHERE organization_id = org_uuid
              AND created_at BETWEEN start_date AND end_date
              AND deleted_at IS NULL
        ),
        'contacts', (
            SELECT jsonb_build_object(
                'totalContacts', COUNT(*),
                'tier1Count', COUNT(*) FILTER (WHERE tier = 'TIER_1'),
                'tier2Count', COUNT(*) FILTER (WHERE tier = 'TIER_2'),
                'tier3Count', COUNT(*) FILTER (WHERE tier = 'TIER_3')
            )
            FROM contacts
            WHERE organization_id = org_uuid
              AND deleted_at IS NULL
        ),
        'agents', (
            SELECT jsonb_build_object(
                'totalExecutions', COUNT(*),
                'successfulExecutions', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
                'failedExecutions', COUNT(*) FILTER (WHERE status = 'FAILED'),
                'avgExecutionTimeMs', ROUND(AVG(execution_time_ms)),
                'totalTokensUsed', COALESCE(SUM(tokens_used), 0),
                'totalCost', ROUND(COALESCE(SUM(estimated_cost), 0), 2)
            )
            FROM agent_executions
            WHERE organization_id = org_uuid
              AND created_at BETWEEN start_date AND end_date
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Performance Metrics
CREATE OR REPLACE FUNCTION get_org_performance_metrics(org_uuid UUID)
RETURNS TABLE (
    metric_name VARCHAR,
    current_value DECIMAL,
    previous_value DECIMAL,
    change_percent DECIMAL,
    trend VARCHAR
) AS $$
BEGIN
    -- Calculate current vs previous period metrics
    -- This is a simplified version - expand based on needs
    RETURN QUERY
    SELECT
        'pitch_open_rate'::VARCHAR as metric_name,
        COALESCE(
            (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
             FROM pitch_workflows
             WHERE organization_id = org_uuid
               AND created_at >= CURRENT_DATE - INTERVAL '30 days'
               AND deleted_at IS NULL),
            0
        ) as current_value,
        COALESCE(
            (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
             FROM pitch_workflows
             WHERE organization_id = org_uuid
               AND created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
               AND deleted_at IS NULL),
            0
        ) as previous_value,
        CASE
            WHEN COALESCE(
                (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                 FROM pitch_workflows
                 WHERE organization_id = org_uuid
                   AND created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
                   AND deleted_at IS NULL),
                0
            ) > 0
            THEN ROUND(
                ((COALESCE(
                    (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                     FROM pitch_workflows
                     WHERE organization_id = org_uuid
                       AND created_at >= CURRENT_DATE - INTERVAL '30 days'
                       AND deleted_at IS NULL),
                    0
                ) - COALESCE(
                    (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                     FROM pitch_workflows
                     WHERE organization_id = org_uuid
                       AND created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
                       AND deleted_at IS NULL),
                    0
                )) / COALESCE(
                    (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                     FROM pitch_workflows
                     WHERE organization_id = org_uuid
                       AND created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
                       AND deleted_at IS NULL),
                    1
                )) * 100,
                2
            )
            ELSE 0
        END as change_percent,
        CASE
            WHEN COALESCE(
                (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                 FROM pitch_workflows
                 WHERE organization_id = org_uuid
                   AND created_at >= CURRENT_DATE - INTERVAL '30 days'
                   AND deleted_at IS NULL),
                0
            ) > COALESCE(
                (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                 FROM pitch_workflows
                 WHERE organization_id = org_uuid
                   AND created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
                   AND deleted_at IS NULL),
                0
            )
            THEN 'up'::VARCHAR
            WHEN COALESCE(
                (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                 FROM pitch_workflows
                 WHERE organization_id = org_uuid
                   AND created_at >= CURRENT_DATE - INTERVAL '30 days'
                   AND deleted_at IS NULL),
                0
            ) < COALESCE(
                (SELECT AVG((opened_count::DECIMAL / NULLIF(delivered_count, 0)) * 100)
                 FROM pitch_workflows
                 WHERE organization_id = org_uuid
                   AND created_at BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
                   AND deleted_at IS NULL),
                0
            )
            THEN 'down'::VARCHAR
            ELSE 'stable'::VARCHAR
        END as trend;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_scorecards ENABLE ROW LEVEL SECURITY;

-- Report Snapshots Policies
CREATE POLICY report_snapshots_view_policy ON report_snapshots
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY report_snapshots_insert_policy ON report_snapshots
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'CONTRIBUTOR')
        )
    );

-- Strategy Scorecards Policies
CREATE POLICY strategy_scorecards_view_policy ON strategy_scorecards
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organization_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY strategy_scorecards_manage_policy ON strategy_scorecards
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

COMMENT ON TABLE report_snapshots IS 'Precomputed reports with metrics for export';
COMMENT ON TABLE strategy_scorecards IS 'Performance scorecards with calculated health scores';
COMMENT ON VIEW campaign_performance IS 'Aggregated campaign metrics by organization';
COMMENT ON VIEW content_performance IS 'Aggregated content metrics by organization';
COMMENT ON VIEW contact_reach IS 'Contact reach and diversity metrics by organization';
COMMENT ON FUNCTION get_strategy_summary IS 'Get comprehensive strategy metrics for date range';
COMMENT ON FUNCTION get_org_performance_metrics IS 'Get performance trends with change percentages';
