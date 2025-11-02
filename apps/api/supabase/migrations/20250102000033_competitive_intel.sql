-- =====================================================
-- COMPETITIVE INTELLIGENCE & MARKET TRACKER
-- Sprint 33: Competitor tracking, market trends, AI insights
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Intel event type enum
 * Types of competitive intelligence events
 */
CREATE TYPE intel_event_type AS ENUM (
  'PRODUCT_LAUNCH',     -- New product or feature announcement
  'FUNDING',            -- Funding round announcement
  'HIRING',             -- Significant hiring activity
  'LAYOFF',             -- Layoffs or downsizing
  'PARTNERSHIP',        -- Strategic partnership
  'PR_CAMPAIGN',        -- Major PR or marketing campaign
  'SOCIAL_TRACTION',    -- Viral social media activity
  'MENTION',            -- Media mention or coverage
  'LEGAL',              -- Legal issues or disputes
  'OTHER'               -- Other competitive events
);

/**
 * Intel source type enum
 * Source of competitive intelligence
 */
CREATE TYPE intel_source_type AS ENUM (
  'NEWS',              -- News articles
  'SOCIAL',            -- Social media
  'RSS',               -- RSS feed
  'USER_SUBMITTED',    -- Manually submitted by user
  'SYSTEM'             -- System-detected
);

/**
 * Intel severity enum
 * Impact severity of competitive events
 */
CREATE TYPE intel_severity AS ENUM (
  'LOW',      -- Minor impact
  'MEDIUM',   -- Moderate impact
  'HIGH',     -- Significant impact
  'CRITICAL'  -- Critical threat or opportunity
);

-- =====================================================
-- TABLES
-- =====================================================

/**
 * Competitors
 * Companies or products being tracked
 */
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Competitor info
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,

  -- Company details
  industry TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  employee_count TEXT, -- e.g., "50-100", "500-1000"
  funding_stage TEXT,  -- e.g., "Series A", "Series B"
  total_funding_usd BIGINT,

  -- Product info
  primary_product TEXT,
  product_categories TEXT[],
  target_market TEXT,

  -- Social media
  linkedin_url TEXT,
  twitter_handle TEXT,
  facebook_url TEXT,

  -- Tracking metadata
  is_active BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- AI-generated insights
  positioning_summary TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  threats_to_us TEXT[],
  last_analyzed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Intel Events
 * Individual competitive intelligence events
 */
CREATE TABLE intel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Competitor reference
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,

  -- Event details
  event_type intel_event_type NOT NULL,
  severity intel_severity NOT NULL DEFAULT 'MEDIUM',
  source_type intel_source_type NOT NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,

  -- Metadata
  source_name TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Impact analysis
  impact_score DECIMAL(3, 2), -- 0.00 to 1.00
  relevance_score DECIMAL(3, 2), -- 0.00 to 1.00
  action_required BOOLEAN DEFAULT false,
  action_notes TEXT,

  -- AI insights
  ai_summary TEXT,
  key_insights TEXT[],
  affected_campaigns UUID[],

  -- User tracking
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Intel Trends
 * Market trends and category insights
 */
CREATE TABLE intel_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Trend details
  trend_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,

  -- Trend metrics
  momentum TEXT, -- 'rising', 'stable', 'declining'
  growth_rate DECIMAL(5, 2), -- % growth
  market_size_usd BIGINT,

  -- Time window
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Related data
  related_competitors UUID[],
  related_intel_events UUID[],
  keywords TEXT[],

  -- AI analysis
  opportunity_score DECIMAL(3, 2), -- 0.00 to 1.00
  threat_score DECIMAL(3, 2), -- 0.00 to 1.00
  strategic_recommendations TEXT[],
  ai_summary TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/**
 * Competitor Metrics
 * Aggregated metrics per competitor over time
 */
CREATE TABLE competitor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Time window
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Event counts by type
  product_launches INTEGER DEFAULT 0,
  funding_events INTEGER DEFAULT 0,
  hiring_events INTEGER DEFAULT 0,
  layoff_events INTEGER DEFAULT 0,
  partnerships INTEGER DEFAULT 0,
  pr_campaigns INTEGER DEFAULT 0,
  social_mentions INTEGER DEFAULT 0,
  media_mentions INTEGER DEFAULT 0,
  legal_events INTEGER DEFAULT 0,

  -- Aggregate metrics
  total_events INTEGER DEFAULT 0,
  average_severity_score DECIMAL(3, 2),
  average_impact_score DECIMAL(3, 2),
  average_relevance_score DECIMAL(3, 2),

  -- Activity indicators
  activity_level TEXT, -- 'low', 'medium', 'high', 'very_high'
  trending_up BOOLEAN DEFAULT false,

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, competitor_id, period_start, period_end, window_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Competitors
CREATE INDEX idx_competitors_org ON competitors(organization_id);
CREATE INDEX idx_competitors_active ON competitors(is_active);
CREATE INDEX idx_competitors_priority ON competitors(priority);

-- Intel Events
CREATE INDEX idx_intel_events_org ON intel_events(organization_id);
CREATE INDEX idx_intel_events_competitor ON intel_events(competitor_id);
CREATE INDEX idx_intel_events_type ON intel_events(event_type);
CREATE INDEX idx_intel_events_severity ON intel_events(severity);
CREATE INDEX idx_intel_events_source ON intel_events(source_type);
CREATE INDEX idx_intel_events_detected ON intel_events(detected_at DESC);
CREATE INDEX idx_intel_events_published ON intel_events(published_at DESC);

-- Intel Trends
CREATE INDEX idx_intel_trends_org ON intel_trends(organization_id);
CREATE INDEX idx_intel_trends_category ON intel_trends(category);
CREATE INDEX idx_intel_trends_period ON intel_trends(period_start, period_end);

-- Competitor Metrics
CREATE INDEX idx_competitor_metrics_org ON competitor_metrics(organization_id);
CREATE INDEX idx_competitor_metrics_competitor ON competitor_metrics(competitor_id);
CREATE INDEX idx_competitor_metrics_period ON competitor_metrics(period_start, period_end);

-- =====================================================
-- FUNCTIONS
-- =====================================================

/**
 * Log intel event
 * Records a competitive intelligence event
 */
CREATE OR REPLACE FUNCTION log_intel_event(
  p_organization_id UUID,
  p_competitor_id UUID,
  p_event_type intel_event_type,
  p_severity intel_severity,
  p_source_type intel_source_type,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_source_name TEXT DEFAULT NULL,
  p_author TEXT DEFAULT NULL,
  p_published_at TIMESTAMPTZ DEFAULT NULL,
  p_impact_score DECIMAL DEFAULT NULL,
  p_relevance_score DECIMAL DEFAULT NULL,
  p_submitted_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert event
  INSERT INTO intel_events (
    organization_id,
    competitor_id,
    event_type,
    severity,
    source_type,
    title,
    description,
    url,
    image_url,
    source_name,
    author,
    published_at,
    impact_score,
    relevance_score,
    submitted_by
  ) VALUES (
    p_organization_id,
    p_competitor_id,
    p_event_type,
    p_severity,
    p_source_type,
    p_title,
    p_description,
    p_url,
    p_image_url,
    p_source_name,
    p_author,
    COALESCE(p_published_at, NOW()),
    p_impact_score,
    p_relevance_score,
    p_submitted_by
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Calculate competitor metrics
 * Aggregates intel events for a competitor over a time window
 */
CREATE OR REPLACE FUNCTION calculate_competitor_metrics(
  p_organization_id UUID,
  p_competitor_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_window_type TEXT DEFAULT 'daily'
) RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
  v_product_launches INTEGER;
  v_funding_events INTEGER;
  v_hiring_events INTEGER;
  v_layoff_events INTEGER;
  v_partnerships INTEGER;
  v_pr_campaigns INTEGER;
  v_social_mentions INTEGER;
  v_media_mentions INTEGER;
  v_legal_events INTEGER;
  v_total_events INTEGER;
  v_avg_severity DECIMAL;
  v_avg_impact DECIMAL;
  v_avg_relevance DECIMAL;
  v_activity_level TEXT;
BEGIN
  -- Count events by type
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'PRODUCT_LAUNCH'),
    COUNT(*) FILTER (WHERE event_type = 'FUNDING'),
    COUNT(*) FILTER (WHERE event_type = 'HIRING'),
    COUNT(*) FILTER (WHERE event_type = 'LAYOFF'),
    COUNT(*) FILTER (WHERE event_type = 'PARTNERSHIP'),
    COUNT(*) FILTER (WHERE event_type = 'PR_CAMPAIGN'),
    COUNT(*) FILTER (WHERE event_type = 'SOCIAL_TRACTION'),
    COUNT(*) FILTER (WHERE event_type = 'MENTION'),
    COUNT(*) FILTER (WHERE event_type = 'LEGAL'),
    COUNT(*),
    AVG(CASE severity
      WHEN 'LOW' THEN 0.25
      WHEN 'MEDIUM' THEN 0.50
      WHEN 'HIGH' THEN 0.75
      WHEN 'CRITICAL' THEN 1.00
    END),
    AVG(impact_score),
    AVG(relevance_score)
  INTO
    v_product_launches,
    v_funding_events,
    v_hiring_events,
    v_layoff_events,
    v_partnerships,
    v_pr_campaigns,
    v_social_mentions,
    v_media_mentions,
    v_legal_events,
    v_total_events,
    v_avg_severity,
    v_avg_impact,
    v_avg_relevance
  FROM intel_events
  WHERE organization_id = p_organization_id
    AND competitor_id = p_competitor_id
    AND detected_at >= p_period_start
    AND detected_at < p_period_end;

  -- Determine activity level
  IF v_total_events >= 20 THEN
    v_activity_level := 'very_high';
  ELSIF v_total_events >= 10 THEN
    v_activity_level := 'high';
  ELSIF v_total_events >= 5 THEN
    v_activity_level := 'medium';
  ELSE
    v_activity_level := 'low';
  END IF;

  -- Insert or update metrics
  INSERT INTO competitor_metrics (
    organization_id,
    competitor_id,
    period_start,
    period_end,
    window_type,
    product_launches,
    funding_events,
    hiring_events,
    layoff_events,
    partnerships,
    pr_campaigns,
    social_mentions,
    media_mentions,
    legal_events,
    total_events,
    average_severity_score,
    average_impact_score,
    average_relevance_score,
    activity_level
  ) VALUES (
    p_organization_id,
    p_competitor_id,
    p_period_start,
    p_period_end,
    p_window_type,
    v_product_launches,
    v_funding_events,
    v_hiring_events,
    v_layoff_events,
    v_partnerships,
    v_pr_campaigns,
    v_social_mentions,
    v_media_mentions,
    v_legal_events,
    v_total_events,
    v_avg_severity,
    v_avg_impact,
    v_avg_relevance,
    v_activity_level
  )
  ON CONFLICT (organization_id, competitor_id, period_start, period_end, window_type)
  DO UPDATE SET
    product_launches = EXCLUDED.product_launches,
    funding_events = EXCLUDED.funding_events,
    hiring_events = EXCLUDED.hiring_events,
    layoff_events = EXCLUDED.layoff_events,
    partnerships = EXCLUDED.partnerships,
    pr_campaigns = EXCLUDED.pr_campaigns,
    social_mentions = EXCLUDED.social_mentions,
    media_mentions = EXCLUDED.media_mentions,
    legal_events = EXCLUDED.legal_events,
    total_events = EXCLUDED.total_events,
    average_severity_score = EXCLUDED.average_severity_score,
    average_impact_score = EXCLUDED.average_impact_score,
    average_relevance_score = EXCLUDED.average_relevance_score,
    activity_level = EXCLUDED.activity_level,
    calculated_at = NOW()
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Summarize market trends
 * Aggregates trend data for a category
 */
CREATE OR REPLACE FUNCTION summarize_market_trends(
  p_organization_id UUID,
  p_category TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_trends JSONB;
  v_total_events INTEGER;
  v_top_competitors JSONB;
BEGIN
  -- Get trends for category
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'trend_name', trend_name,
      'momentum', momentum,
      'growth_rate', growth_rate,
      'opportunity_score', opportunity_score,
      'threat_score', threat_score
    ) ORDER BY opportunity_score DESC
  )
  INTO v_trends
  FROM intel_trends
  WHERE organization_id = p_organization_id
    AND category = p_category
    AND period_start >= p_period_start
    AND period_end <= p_period_end;

  -- Get total events in category
  SELECT COUNT(DISTINCT ie.id)
  INTO v_total_events
  FROM intel_events ie
  JOIN competitors c ON ie.competitor_id = c.id
  WHERE ie.organization_id = p_organization_id
    AND p_category = ANY(c.product_categories)
    AND ie.detected_at >= p_period_start
    AND ie.detected_at < p_period_end;

  -- Get top competitors in category
  SELECT jsonb_agg(
    jsonb_build_object(
      'competitor_id', c.id,
      'competitor_name', c.name,
      'event_count', event_count
    ) ORDER BY event_count DESC
  )
  INTO v_top_competitors
  FROM (
    SELECT c.id, c.name, COUNT(ie.id) as event_count
    FROM competitors c
    LEFT JOIN intel_events ie ON c.id = ie.competitor_id
      AND ie.detected_at >= p_period_start
      AND ie.detected_at < p_period_end
    WHERE c.organization_id = p_organization_id
      AND p_category = ANY(c.product_categories)
    GROUP BY c.id, c.name
    ORDER BY event_count DESC
    LIMIT 10
  ) subq;

  RETURN jsonb_build_object(
    'category', p_category,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'trends', COALESCE(v_trends, '[]'::jsonb),
    'total_events', v_total_events,
    'top_competitors', COALESCE(v_top_competitors, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Summarize competitor profile
 * Returns comprehensive competitor summary
 */
CREATE OR REPLACE FUNCTION summarize_competitor_profile(
  p_organization_id UUID,
  p_competitor_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_competitor JSONB;
  v_recent_events JSONB;
  v_metrics JSONB;
BEGIN
  -- Get competitor details
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'description', description,
    'website', website,
    'industry', industry,
    'funding_stage', funding_stage,
    'total_funding_usd', total_funding_usd,
    'positioning_summary', positioning_summary,
    'strengths', strengths,
    'weaknesses', weaknesses,
    'threats_to_us', threats_to_us
  )
  INTO v_competitor
  FROM competitors
  WHERE id = p_competitor_id
    AND organization_id = p_organization_id;

  -- Get recent events (last 30 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'event_type', event_type,
      'severity', severity,
      'title', title,
      'detected_at', detected_at
    ) ORDER BY detected_at DESC
  )
  INTO v_recent_events
  FROM intel_events
  WHERE competitor_id = p_competitor_id
    AND organization_id = p_organization_id
    AND detected_at >= NOW() - INTERVAL '30 days'
  LIMIT 20;

  -- Get latest metrics
  SELECT jsonb_build_object(
    'total_events', total_events,
    'activity_level', activity_level,
    'average_severity_score', average_severity_score,
    'average_impact_score', average_impact_score
  )
  INTO v_metrics
  FROM competitor_metrics
  WHERE competitor_id = p_competitor_id
    AND organization_id = p_organization_id
  ORDER BY period_end DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'competitor', v_competitor,
    'recent_events', COALESCE(v_recent_events, '[]'::jsonb),
    'metrics', COALESCE(v_metrics, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Get competitive dashboard data
 * Returns overview data for dashboard
 */
CREATE OR REPLACE FUNCTION get_competitive_dashboard_data(
  p_organization_id UUID,
  p_period_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_period_end TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  v_total_competitors INTEGER;
  v_active_competitors INTEGER;
  v_total_events INTEGER;
  v_critical_events INTEGER;
  v_top_competitors JSONB;
  v_recent_events JSONB;
  v_event_distribution JSONB;
BEGIN
  -- Get competitor counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
  INTO v_total_competitors, v_active_competitors
  FROM competitors
  WHERE organization_id = p_organization_id;

  -- Get event counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE severity = 'CRITICAL')
  INTO v_total_events, v_critical_events
  FROM intel_events
  WHERE organization_id = p_organization_id
    AND detected_at >= p_period_start
    AND detected_at < p_period_end;

  -- Get top competitors by activity
  SELECT jsonb_agg(
    jsonb_build_object(
      'competitor_id', c.id,
      'competitor_name', c.name,
      'event_count', event_count,
      'critical_count', critical_count
    ) ORDER BY event_count DESC
  )
  INTO v_top_competitors
  FROM (
    SELECT
      c.id,
      c.name,
      COUNT(ie.id) as event_count,
      COUNT(*) FILTER (WHERE ie.severity = 'CRITICAL') as critical_count
    FROM competitors c
    LEFT JOIN intel_events ie ON c.id = ie.competitor_id
      AND ie.detected_at >= p_period_start
      AND ie.detected_at < p_period_end
    WHERE c.organization_id = p_organization_id
      AND c.is_active = true
    GROUP BY c.id, c.name
    ORDER BY event_count DESC
    LIMIT 10
  ) subq;

  -- Get recent critical events
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ie.id,
      'competitor_name', c.name,
      'event_type', ie.event_type,
      'title', ie.title,
      'detected_at', ie.detected_at
    ) ORDER BY ie.detected_at DESC
  )
  INTO v_recent_events
  FROM intel_events ie
  JOIN competitors c ON ie.competitor_id = c.id
  WHERE ie.organization_id = p_organization_id
    AND ie.severity IN ('HIGH', 'CRITICAL')
    AND ie.detected_at >= p_period_start
    AND ie.detected_at < p_period_end
  LIMIT 10;

  -- Get event type distribution
  SELECT jsonb_object_agg(event_type, count)
  INTO v_event_distribution
  FROM (
    SELECT event_type::TEXT, COUNT(*) as count
    FROM intel_events
    WHERE organization_id = p_organization_id
      AND detected_at >= p_period_start
      AND detected_at < p_period_end
    GROUP BY event_type
  ) subq;

  RETURN jsonb_build_object(
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_competitors', v_total_competitors,
    'active_competitors', v_active_competitors,
    'total_events', v_total_events,
    'critical_events', v_critical_events,
    'top_competitors', COALESCE(v_top_competitors, '[]'::jsonb),
    'recent_events', COALESCE(v_recent_events, '[]'::jsonb),
    'event_distribution', COALESCE(v_event_distribution, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_metrics ENABLE ROW LEVEL SECURITY;

-- Competitors policies
CREATE POLICY competitors_org_isolation ON competitors
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Intel Events policies
CREATE POLICY intel_events_org_isolation ON intel_events
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Intel Trends policies
CREATE POLICY intel_trends_org_isolation ON intel_trends
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Competitor Metrics policies
CREATE POLICY competitor_metrics_org_isolation ON competitor_metrics
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE competitors IS 'Companies and products being tracked for competitive intelligence';
COMMENT ON TABLE intel_events IS 'Individual competitive intelligence events and activities';
COMMENT ON TABLE intel_trends IS 'Market trends and category-level insights';
COMMENT ON TABLE competitor_metrics IS 'Aggregated metrics per competitor over time windows';

COMMENT ON FUNCTION log_intel_event IS 'Records a competitive intelligence event';
COMMENT ON FUNCTION calculate_competitor_metrics IS 'Aggregates intel events for a competitor over a time period';
COMMENT ON FUNCTION summarize_market_trends IS 'Returns market trend summary for a category';
COMMENT ON FUNCTION summarize_competitor_profile IS 'Returns comprehensive competitor profile with events and metrics';
COMMENT ON FUNCTION get_competitive_dashboard_data IS 'Returns overview data for competitive intelligence dashboard';
