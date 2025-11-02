-- =====================================================
-- MIGRATION: Channel Intelligence + Sentiment-Aware Outreach
-- Sprint 27: Channel effectiveness and sentiment analysis
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Channel types for outreach
CREATE TYPE channel_type AS ENUM (
  'EMAIL',
  'LINKEDIN',
  'PHONE',
  'TWITTER',
  'OTHER'
);

-- Engagement sentiment classification
CREATE TYPE engagement_sentiment AS ENUM (
  'POSITIVE',      -- Enthusiastic, friendly, interested
  'NEUTRAL',       -- Professional, neutral tone
  'NEGATIVE',      -- Dismissive, annoyed, uninterested
  'UNDETERMINED'   -- Cannot determine from data
);

-- Types of engagement events
CREATE TYPE engagement_type AS ENUM (
  'OPEN',          -- Email opened
  'CLICK',         -- Link clicked
  'REPLY',         -- Reply received
  'CONNECT',       -- LinkedIn connection accepted
  'COMMENT',       -- Comment on post
  'CALL',          -- Phone call answered
  'VOICEMAIL',     -- Voicemail left
  'DISMISS',       -- Unsubscribe, block, negative action
  'FORWARD',       -- Email forwarded
  'DOWNLOAD',      -- Attachment downloaded
  'MEETING_SCHEDULED' -- Meeting/call scheduled
);

-- =====================================================
-- TABLES
-- =====================================================

-- Channel Engagements (event log)
CREATE TABLE channel_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Context
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id TEXT, -- Which agent triggered this

  -- Engagement details
  channel_type channel_type NOT NULL,
  engagement_type engagement_type NOT NULL,
  sentiment engagement_sentiment DEFAULT 'UNDETERMINED',

  -- Metrics
  engagement_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0 quality score

  -- Content
  raw_message TEXT, -- Reply content, voicemail transcription, etc.
  metadata JSONB DEFAULT '{}'::jsonb, -- Channel-specific data

  -- Timing
  engaged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_engagement_score CHECK (engagement_score >= 0 AND engagement_score <= 1)
);

-- Indexes for channel_engagements
CREATE INDEX idx_channel_engagements_contact ON channel_engagements(contact_id);
CREATE INDEX idx_channel_engagements_campaign ON channel_engagements(campaign_id);
CREATE INDEX idx_channel_engagements_organization ON channel_engagements(organization_id);
CREATE INDEX idx_channel_engagements_channel ON channel_engagements(channel_type);
CREATE INDEX idx_channel_engagements_type ON channel_engagements(engagement_type);
CREATE INDEX idx_channel_engagements_sentiment ON channel_engagements(sentiment);
CREATE INDEX idx_channel_engagements_engaged_at ON channel_engagements(engaged_at);

-- Channel Performance Aggregates
CREATE TABLE channel_performance_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Scope (one of these will be set)
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Channel
  channel_type channel_type NOT NULL,

  -- Aggregate metrics
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_connected INTEGER DEFAULT 0,
  total_dismissed INTEGER DEFAULT 0,

  -- Calculated rates (0.0 to 1.0)
  open_rate DECIMAL(5,4) DEFAULT 0.0,
  click_rate DECIMAL(5,4) DEFAULT 0.0,
  reply_rate DECIMAL(5,4) DEFAULT 0.0,
  connect_rate DECIMAL(5,4) DEFAULT 0.0,

  -- Sentiment metrics
  avg_sentiment_score DECIMAL(3,2) DEFAULT 0.5, -- Average across all engagements
  positive_ratio DECIMAL(5,4) DEFAULT 0.0,
  negative_ratio DECIMAL(5,4) DEFAULT 0.0,

  -- Contact receptiveness (0-100 score)
  contact_receptiveness_score INTEGER DEFAULT 50,

  -- Timing intelligence
  preferred_hour INTEGER, -- 0-23, most successful hour
  preferred_day_of_week INTEGER, -- 0-6, Sunday=0
  avg_response_time_hours DECIMAL(8,2), -- Average time to respond

  -- Metadata
  last_engagement_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_rates CHECK (
    open_rate >= 0 AND open_rate <= 1 AND
    click_rate >= 0 AND click_rate <= 1 AND
    reply_rate >= 0 AND reply_rate <= 1 AND
    connect_rate >= 0 AND connect_rate <= 1
  ),
  CONSTRAINT valid_sentiment_score CHECK (avg_sentiment_score >= 0 AND avg_sentiment_score <= 1),
  CONSTRAINT valid_receptiveness CHECK (contact_receptiveness_score >= 0 AND contact_receptiveness_score <= 100),
  CONSTRAINT valid_hour CHECK (preferred_hour IS NULL OR (preferred_hour >= 0 AND preferred_hour <= 23)),
  CONSTRAINT valid_day CHECK (preferred_day_of_week IS NULL OR (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6)),
  CONSTRAINT must_have_scope CHECK (contact_id IS NOT NULL OR campaign_id IS NOT NULL)
);

-- Indexes for channel_performance_aggregates
CREATE INDEX idx_channel_perf_contact ON channel_performance_aggregates(contact_id);
CREATE INDEX idx_channel_perf_campaign ON channel_performance_aggregates(campaign_id);
CREATE INDEX idx_channel_perf_organization ON channel_performance_aggregates(organization_id);
CREATE INDEX idx_channel_perf_channel ON channel_performance_aggregates(channel_type);
CREATE UNIQUE INDEX idx_channel_perf_contact_channel ON channel_performance_aggregates(contact_id, channel_type) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX idx_channel_perf_campaign_channel ON channel_performance_aggregates(campaign_id, channel_type) WHERE campaign_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE channel_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_performance_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY channel_engagements_org_isolation ON channel_engagements
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY channel_performance_org_isolation ON channel_performance_aggregates
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

/**
 * Log an engagement event
 * This is called after engagement is classified (sentiment already determined)
 */
CREATE OR REPLACE FUNCTION log_engagement(
  p_organization_id UUID,
  p_contact_id UUID,
  p_campaign_id UUID,
  p_channel_type channel_type,
  p_engagement_type engagement_type,
  p_sentiment engagement_sentiment DEFAULT 'UNDETERMINED',
  p_engagement_score DECIMAL DEFAULT 0.5,
  p_raw_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_agent_id TEXT DEFAULT NULL,
  p_engaged_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_engagement_id UUID;
BEGIN
  -- Insert engagement
  INSERT INTO channel_engagements (
    organization_id,
    contact_id,
    campaign_id,
    channel_type,
    engagement_type,
    sentiment,
    engagement_score,
    raw_message,
    metadata,
    agent_id,
    engaged_at
  ) VALUES (
    p_organization_id,
    p_contact_id,
    p_campaign_id,
    p_channel_type,
    p_engagement_type,
    p_sentiment,
    p_engagement_score,
    p_raw_message,
    p_metadata,
    p_agent_id,
    p_engaged_at
  )
  RETURNING id INTO v_engagement_id;

  -- Trigger stats recalculation for contact
  IF p_contact_id IS NOT NULL THEN
    PERFORM calculate_channel_stats(p_contact_id, p_channel_type, p_organization_id);
  END IF;

  -- Trigger stats recalculation for campaign
  IF p_campaign_id IS NOT NULL THEN
    PERFORM calculate_campaign_channel_stats(p_campaign_id, p_channel_type, p_organization_id);
  END IF;

  RETURN v_engagement_id;
END;
$$;

/**
 * Calculate channel statistics for a contact
 */
CREATE OR REPLACE FUNCTION calculate_channel_stats(
  p_contact_id UUID,
  p_channel_type channel_type,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_sent INTEGER;
  v_total_opened INTEGER;
  v_total_clicked INTEGER;
  v_total_replied INTEGER;
  v_total_connected INTEGER;
  v_total_dismissed INTEGER;
  v_avg_sentiment DECIMAL;
  v_positive_count INTEGER;
  v_negative_count INTEGER;
  v_total_sentiment INTEGER;
  v_preferred_hour INTEGER;
  v_preferred_day INTEGER;
  v_last_engagement TIMESTAMPTZ;
  v_avg_response_hours DECIMAL;
BEGIN
  -- Count engagement types
  SELECT
    COUNT(*) FILTER (WHERE engagement_type = 'OPEN'),
    COUNT(*) FILTER (WHERE engagement_type = 'CLICK'),
    COUNT(*) FILTER (WHERE engagement_type = 'REPLY'),
    COUNT(*) FILTER (WHERE engagement_type IN ('CONNECT', 'MEETING_SCHEDULED')),
    COUNT(*) FILTER (WHERE engagement_type = 'DISMISS')
  INTO
    v_total_opened,
    v_total_clicked,
    v_total_replied,
    v_total_connected,
    v_total_dismissed
  FROM channel_engagements
  WHERE contact_id = p_contact_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id;

  -- Estimate total sent (this would come from a separate tracking table in production)
  -- For now, assume sent = unique days with opens + replies
  SELECT COUNT(DISTINCT DATE(engaged_at)) INTO v_total_sent
  FROM channel_engagements
  WHERE contact_id = p_contact_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id;

  IF v_total_sent = 0 THEN
    v_total_sent := GREATEST(v_total_opened, v_total_replied, v_total_connected, 1);
  END IF;

  -- Calculate sentiment metrics
  SELECT
    AVG(engagement_score),
    COUNT(*) FILTER (WHERE sentiment = 'POSITIVE'),
    COUNT(*) FILTER (WHERE sentiment = 'NEGATIVE'),
    COUNT(*)
  INTO
    v_avg_sentiment,
    v_positive_count,
    v_negative_count,
    v_total_sentiment
  FROM channel_engagements
  WHERE contact_id = p_contact_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id
    AND sentiment != 'UNDETERMINED';

  -- Find preferred hour
  SELECT EXTRACT(HOUR FROM engaged_at)::INTEGER
  INTO v_preferred_hour
  FROM channel_engagements
  WHERE contact_id = p_contact_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id
    AND engagement_type IN ('REPLY', 'CONNECT', 'CALL')
  GROUP BY EXTRACT(HOUR FROM engaged_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Find preferred day of week
  SELECT EXTRACT(DOW FROM engaged_at)::INTEGER
  INTO v_preferred_day
  FROM channel_engagements
  WHERE contact_id = p_contact_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id
    AND engagement_type IN ('REPLY', 'CONNECT', 'CALL')
  GROUP BY EXTRACT(DOW FROM engaged_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Get last engagement
  SELECT MAX(engaged_at) INTO v_last_engagement
  FROM channel_engagements
  WHERE contact_id = p_contact_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id;

  -- Calculate receptiveness score (0-100)
  DECLARE
    v_receptiveness INTEGER;
  BEGIN
    v_receptiveness := 50; -- Base score

    -- Boost for replies
    v_receptiveness := v_receptiveness + (v_total_replied * 10);

    -- Boost for connections
    v_receptiveness := v_receptiveness + (v_total_connected * 15);

    -- Penalty for dismissals
    v_receptiveness := v_receptiveness - (v_total_dismissed * 20);

    -- Sentiment factor
    IF v_avg_sentiment IS NOT NULL THEN
      v_receptiveness := v_receptiveness + ((v_avg_sentiment - 0.5) * 40)::INTEGER;
    END IF;

    -- Clamp to 0-100
    v_receptiveness := GREATEST(0, LEAST(100, v_receptiveness));

    -- Insert or update aggregate
    INSERT INTO channel_performance_aggregates (
      organization_id,
      contact_id,
      channel_type,
      total_sent,
      total_opened,
      total_clicked,
      total_replied,
      total_connected,
      total_dismissed,
      open_rate,
      click_rate,
      reply_rate,
      connect_rate,
      avg_sentiment_score,
      positive_ratio,
      negative_ratio,
      contact_receptiveness_score,
      preferred_hour,
      preferred_day_of_week,
      last_engagement_at
    ) VALUES (
      p_organization_id,
      p_contact_id,
      p_channel_type,
      v_total_sent,
      v_total_opened,
      v_total_clicked,
      v_total_replied,
      v_total_connected,
      v_total_dismissed,
      v_total_opened::DECIMAL / NULLIF(v_total_sent, 0),
      v_total_clicked::DECIMAL / NULLIF(v_total_sent, 0),
      v_total_replied::DECIMAL / NULLIF(v_total_sent, 0),
      v_total_connected::DECIMAL / NULLIF(v_total_sent, 0),
      COALESCE(v_avg_sentiment, 0.5),
      COALESCE(v_positive_count::DECIMAL / NULLIF(v_total_sentiment, 0), 0),
      COALESCE(v_negative_count::DECIMAL / NULLIF(v_total_sentiment, 0), 0),
      v_receptiveness,
      v_preferred_hour,
      v_preferred_day,
      v_last_engagement
    )
    ON CONFLICT (contact_id, channel_type) WHERE contact_id IS NOT NULL
    DO UPDATE SET
      total_sent = EXCLUDED.total_sent,
      total_opened = EXCLUDED.total_opened,
      total_clicked = EXCLUDED.total_clicked,
      total_replied = EXCLUDED.total_replied,
      total_connected = EXCLUDED.total_connected,
      total_dismissed = EXCLUDED.total_dismissed,
      open_rate = EXCLUDED.open_rate,
      click_rate = EXCLUDED.click_rate,
      reply_rate = EXCLUDED.reply_rate,
      connect_rate = EXCLUDED.connect_rate,
      avg_sentiment_score = EXCLUDED.avg_sentiment_score,
      positive_ratio = EXCLUDED.positive_ratio,
      negative_ratio = EXCLUDED.negative_ratio,
      contact_receptiveness_score = EXCLUDED.contact_receptiveness_score,
      preferred_hour = EXCLUDED.preferred_hour,
      preferred_day_of_week = EXCLUDED.preferred_day_of_week,
      last_engagement_at = EXCLUDED.last_engagement_at,
      updated_at = NOW();
  END;
END;
$$;

/**
 * Calculate campaign-level channel statistics
 */
CREATE OR REPLACE FUNCTION calculate_campaign_channel_stats(
  p_campaign_id UUID,
  p_channel_type channel_type,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_sent INTEGER;
  v_total_opened INTEGER;
  v_total_clicked INTEGER;
  v_total_replied INTEGER;
  v_total_connected INTEGER;
  v_total_dismissed INTEGER;
  v_avg_sentiment DECIMAL;
  v_positive_count INTEGER;
  v_negative_count INTEGER;
  v_total_sentiment INTEGER;
  v_last_engagement TIMESTAMPTZ;
BEGIN
  -- Count engagement types for campaign
  SELECT
    COUNT(*) FILTER (WHERE engagement_type = 'OPEN'),
    COUNT(*) FILTER (WHERE engagement_type = 'CLICK'),
    COUNT(*) FILTER (WHERE engagement_type = 'REPLY'),
    COUNT(*) FILTER (WHERE engagement_type IN ('CONNECT', 'MEETING_SCHEDULED')),
    COUNT(*) FILTER (WHERE engagement_type = 'DISMISS')
  INTO
    v_total_opened,
    v_total_clicked,
    v_total_replied,
    v_total_connected,
    v_total_dismissed
  FROM channel_engagements
  WHERE campaign_id = p_campaign_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id;

  -- Estimate total sent
  SELECT COUNT(DISTINCT contact_id) INTO v_total_sent
  FROM channel_engagements
  WHERE campaign_id = p_campaign_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id;

  IF v_total_sent = 0 THEN
    v_total_sent := 1;
  END IF;

  -- Calculate sentiment
  SELECT
    AVG(engagement_score),
    COUNT(*) FILTER (WHERE sentiment = 'POSITIVE'),
    COUNT(*) FILTER (WHERE sentiment = 'NEGATIVE'),
    COUNT(*)
  INTO
    v_avg_sentiment,
    v_positive_count,
    v_negative_count,
    v_total_sentiment
  FROM channel_engagements
  WHERE campaign_id = p_campaign_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id
    AND sentiment != 'UNDETERMINED';

  -- Get last engagement
  SELECT MAX(engaged_at) INTO v_last_engagement
  FROM channel_engagements
  WHERE campaign_id = p_campaign_id
    AND channel_type = p_channel_type
    AND organization_id = p_organization_id;

  -- Insert or update
  INSERT INTO channel_performance_aggregates (
    organization_id,
    campaign_id,
    channel_type,
    total_sent,
    total_opened,
    total_clicked,
    total_replied,
    total_connected,
    total_dismissed,
    open_rate,
    click_rate,
    reply_rate,
    connect_rate,
    avg_sentiment_score,
    positive_ratio,
    negative_ratio,
    last_engagement_at
  ) VALUES (
    p_organization_id,
    p_campaign_id,
    p_channel_type,
    v_total_sent,
    v_total_opened,
    v_total_clicked,
    v_total_replied,
    v_total_connected,
    v_total_dismissed,
    v_total_opened::DECIMAL / NULLIF(v_total_sent, 0),
    v_total_clicked::DECIMAL / NULLIF(v_total_sent, 0),
    v_total_replied::DECIMAL / NULLIF(v_total_sent, 0),
    v_total_connected::DECIMAL / NULLIF(v_total_sent, 0),
    COALESCE(v_avg_sentiment, 0.5),
    COALESCE(v_positive_count::DECIMAL / NULLIF(v_total_sentiment, 0), 0),
    COALESCE(v_negative_count::DECIMAL / NULLIF(v_total_sentiment, 0), 0),
    v_last_engagement
  )
  ON CONFLICT (campaign_id, channel_type) WHERE campaign_id IS NOT NULL
  DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_opened = EXCLUDED.total_opened,
    total_clicked = EXCLUDED.total_clicked,
    total_replied = EXCLUDED.total_replied,
    total_connected = EXCLUDED.total_connected,
    total_dismissed = EXCLUDED.total_dismissed,
    open_rate = EXCLUDED.open_rate,
    click_rate = EXCLUDED.click_rate,
    reply_rate = EXCLUDED.reply_rate,
    connect_rate = EXCLUDED.connect_rate,
    avg_sentiment_score = EXCLUDED.avg_sentiment_score,
    positive_ratio = EXCLUDED.positive_ratio,
    negative_ratio = EXCLUDED.negative_ratio,
    last_engagement_at = EXCLUDED.last_engagement_at,
    updated_at = NOW();
END;
$$;

/**
 * Get channel recommendations for a contact
 */
CREATE OR REPLACE FUNCTION get_channel_recommendations(
  p_contact_id UUID,
  p_organization_id UUID
)
RETURNS TABLE(
  channel channel_type,
  score DECIMAL,
  rationale TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cpa.channel_type,
    (
      (cpa.reply_rate * 40) +
      (cpa.connect_rate * 30) +
      (cpa.open_rate * 10) +
      (cpa.avg_sentiment_score * 20)
    ) AS score,
    CASE
      WHEN cpa.reply_rate > 0.2 THEN 'High reply rate (' || ROUND(cpa.reply_rate * 100) || '%)'
      WHEN cpa.connect_rate > 0.3 THEN 'Good connection rate'
      WHEN cpa.avg_sentiment_score > 0.7 THEN 'Positive sentiment history'
      WHEN cpa.total_dismissed > 0 THEN 'Some negative signals detected'
      ELSE 'Limited data available'
    END AS rationale
  FROM channel_performance_aggregates cpa
  WHERE cpa.contact_id = p_contact_id
    AND cpa.organization_id = p_organization_id
  ORDER BY score DESC;
END;
$$;

/**
 * Get sentiment trends over time for a contact
 */
CREATE OR REPLACE FUNCTION get_sentiment_trends(
  p_contact_id UUID,
  p_organization_id UUID,
  p_channel_type channel_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  engagement_date DATE,
  channel channel_type,
  sentiment engagement_sentiment,
  engagement_type engagement_type,
  sentiment_score DECIMAL,
  message_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ce.engaged_at),
    ce.channel_type,
    ce.sentiment,
    ce.engagement_type,
    ce.engagement_score,
    LEFT(ce.raw_message, 100) AS message_preview
  FROM channel_engagements ce
  WHERE ce.contact_id = p_contact_id
    AND ce.organization_id = p_organization_id
    AND (p_channel_type IS NULL OR ce.channel_type = p_channel_type)
  ORDER BY ce.engaged_at DESC
  LIMIT p_limit;
END;
$$;

/**
 * Get best time to contact
 */
CREATE OR REPLACE FUNCTION get_best_time_to_contact(
  p_contact_id UUID,
  p_organization_id UUID
)
RETURNS TABLE(
  channel channel_type,
  preferred_hour INTEGER,
  preferred_day_of_week INTEGER,
  confidence_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cpa.channel_type,
    cpa.preferred_hour,
    cpa.preferred_day_of_week,
    CASE
      WHEN cpa.total_replied + cpa.total_connected > 10 THEN 'HIGH'
      WHEN cpa.total_replied + cpa.total_connected > 3 THEN 'MEDIUM'
      ELSE 'LOW'
    END AS confidence_level
  FROM channel_performance_aggregates cpa
  WHERE cpa.contact_id = p_contact_id
    AND cpa.organization_id = p_organization_id
    AND cpa.preferred_hour IS NOT NULL
  ORDER BY (cpa.total_replied + cpa.total_connected) DESC;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_channel_performance_updated_at
  BEFORE UPDATE ON channel_performance_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE channel_engagements IS 'Engagement event log across all communication channels';
COMMENT ON TABLE channel_performance_aggregates IS 'Aggregated channel performance metrics per contact and campaign';

COMMENT ON FUNCTION log_engagement IS 'Log an engagement event and trigger stats recalculation';
COMMENT ON FUNCTION calculate_channel_stats IS 'Calculate aggregated channel statistics for a contact';
COMMENT ON FUNCTION calculate_campaign_channel_stats IS 'Calculate campaign-level channel statistics';
COMMENT ON FUNCTION get_channel_recommendations IS 'Get best channel recommendations for a contact';
COMMENT ON FUNCTION get_sentiment_trends IS 'Get sentiment history over time';
COMMENT ON FUNCTION get_best_time_to_contact IS 'Get optimal contact timing based on historical patterns';
