-- =====================================================
-- UNIFIED TIMELINE FEED + CAMPAIGN ACTIVITY VIEW
-- Migration: 20250102000024_campaign_timeline.sql
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Timeline event type enumeration
 */
CREATE TYPE timeline_event_type AS ENUM (
  'AGENT_RUN',
  'FOLLOWUP_SENT',
  'REVIEW_SUBMITTED',
  'DECISION_MADE',
  'INSIGHT_GENERATED',
  'CRM_INTERACTION',
  'TASK_EXECUTED',
  'GOAL_COMPLETED',
  'FAILURE',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_LAUNCHED',
  'CONTACT_MATCHED',
  'CONTACT_APPROVED',
  'SEQUENCE_GENERATED',
  'MEMORY_STORED',
  'KNOWLEDGE_GRAPH_UPDATED',
  'HANDOFF_INITIATED',
  'COLLABORATION_STARTED'
);

/**
 * Timeline entity type enumeration
 */
CREATE TYPE timeline_entity_type AS ENUM (
  'AGENT',
  'FOLLOWUP',
  'REVIEW',
  'DECISION',
  'INSIGHT',
  'INTERACTION',
  'TASK',
  'GOAL',
  'CAMPAIGN',
  'CONTACT',
  'SEQUENCE',
  'MEMORY',
  'KNOWLEDGE_GRAPH',
  'HANDOFF',
  'COLLABORATION'
);

-- =====================================================
-- CAMPAIGN TIMELINE EVENTS
-- =====================================================

/**
 * campaign_timeline_events - Unified activity timeline
 */
CREATE TABLE IF NOT EXISTS campaign_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign context (optional - can be org-wide events)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Event timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event classification
  event_type timeline_event_type NOT NULL,
  entity_type timeline_entity_type NOT NULL,

  -- Entity reference
  entity_id UUID NOT NULL,

  -- Event description
  summary TEXT NOT NULL,
  details TEXT,

  -- Structured metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Actor information
  actor_type VARCHAR(50), -- 'agent', 'user', 'system'
  actor_id VARCHAR(255), -- agent name or user ID
  actor_name VARCHAR(255),

  -- Status/outcome
  status VARCHAR(50), -- 'success', 'failure', 'pending', 'in_progress'
  importance_score DECIMAL(3, 2) DEFAULT 0.5, -- 0.0 to 1.0

  -- Related entities (for linking)
  related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_timeline_campaign ON campaign_timeline_events(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_timeline_organization ON campaign_timeline_events(organization_id);
CREATE INDEX idx_timeline_timestamp ON campaign_timeline_events(timestamp DESC);
CREATE INDEX idx_timeline_event_type ON campaign_timeline_events(event_type);
CREATE INDEX idx_timeline_entity_type ON campaign_timeline_events(entity_type);
CREATE INDEX idx_timeline_actor ON campaign_timeline_events(actor_id);
CREATE INDEX idx_timeline_contact ON campaign_timeline_events(related_contact_id) WHERE related_contact_id IS NOT NULL;
CREATE INDEX idx_timeline_composite ON campaign_timeline_events(organization_id, campaign_id, timestamp DESC);

-- GIN index for metadata JSONB queries
CREATE INDEX idx_timeline_metadata ON campaign_timeline_events USING GIN (metadata);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE campaign_timeline_events ENABLE ROW LEVEL SECURITY;

-- Timeline events policy
CREATE POLICY timeline_events_org_isolation ON campaign_timeline_events
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Insert timeline event
 */
CREATE OR REPLACE FUNCTION insert_timeline_event(
  p_campaign_id UUID,
  p_event_type timeline_event_type,
  p_entity_type timeline_entity_type,
  p_entity_id UUID,
  p_summary TEXT,
  p_details TEXT,
  p_metadata JSONB,
  p_actor_type VARCHAR,
  p_actor_id VARCHAR,
  p_actor_name VARCHAR,
  p_status VARCHAR,
  p_importance_score DECIMAL,
  p_related_contact_id UUID,
  p_related_user_id UUID,
  p_organization_id UUID,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO campaign_timeline_events (
    campaign_id,
    timestamp,
    event_type,
    entity_type,
    entity_id,
    summary,
    details,
    metadata,
    actor_type,
    actor_id,
    actor_name,
    status,
    importance_score,
    related_contact_id,
    related_user_id,
    organization_id
  ) VALUES (
    p_campaign_id,
    p_timestamp,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_summary,
    p_details,
    p_metadata,
    p_actor_type,
    p_actor_id,
    p_actor_name,
    p_status,
    COALESCE(p_importance_score, 0.5),
    p_related_contact_id,
    p_related_user_id,
    p_organization_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Get campaign timeline with pagination
 */
CREATE OR REPLACE FUNCTION get_campaign_timeline(
  p_campaign_id UUID,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_event_types timeline_event_type[] DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  campaign_id UUID,
  timestamp TIMESTAMPTZ,
  event_type timeline_event_type,
  entity_type timeline_entity_type,
  entity_id UUID,
  summary TEXT,
  details TEXT,
  metadata JSONB,
  actor_type VARCHAR,
  actor_id VARCHAR,
  actor_name VARCHAR,
  status VARCHAR,
  importance_score DECIMAL,
  related_contact_id UUID,
  related_user_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.campaign_id,
    e.timestamp,
    e.event_type,
    e.entity_type,
    e.entity_id,
    e.summary,
    e.details,
    e.metadata,
    e.actor_type,
    e.actor_id,
    e.actor_name,
    e.status,
    e.importance_score,
    e.related_contact_id,
    e.related_user_id,
    e.created_at
  FROM campaign_timeline_events e
  WHERE e.campaign_id = p_campaign_id
    AND e.organization_id = p_organization_id
    AND (p_event_types IS NULL OR e.event_type = ANY(p_event_types))
    AND (p_start_date IS NULL OR e.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR e.timestamp <= p_end_date)
  ORDER BY e.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

/**
 * Get global timeline across campaigns
 */
CREATE OR REPLACE FUNCTION get_global_timeline(
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_campaign_ids UUID[] DEFAULT NULL,
  p_event_types timeline_event_type[] DEFAULT NULL,
  p_entity_types timeline_entity_type[] DEFAULT NULL,
  p_actor_ids VARCHAR[] DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_min_importance DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  campaign_id UUID,
  campaign_name VARCHAR,
  timestamp TIMESTAMPTZ,
  event_type timeline_event_type,
  entity_type timeline_entity_type,
  entity_id UUID,
  summary TEXT,
  details TEXT,
  metadata JSONB,
  actor_type VARCHAR,
  actor_id VARCHAR,
  actor_name VARCHAR,
  status VARCHAR,
  importance_score DECIMAL,
  related_contact_id UUID,
  related_user_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.campaign_id,
    c.name AS campaign_name,
    e.timestamp,
    e.event_type,
    e.entity_type,
    e.entity_id,
    e.summary,
    e.details,
    e.metadata,
    e.actor_type,
    e.actor_id,
    e.actor_name,
    e.status,
    e.importance_score,
    e.related_contact_id,
    e.related_user_id,
    e.created_at
  FROM campaign_timeline_events e
  LEFT JOIN campaigns c ON c.id = e.campaign_id
  WHERE e.organization_id = p_organization_id
    AND (p_campaign_ids IS NULL OR e.campaign_id = ANY(p_campaign_ids))
    AND (p_event_types IS NULL OR e.event_type = ANY(p_event_types))
    AND (p_entity_types IS NULL OR e.entity_type = ANY(p_entity_types))
    AND (p_actor_ids IS NULL OR e.actor_id = ANY(p_actor_ids))
    AND (p_start_date IS NULL OR e.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR e.timestamp <= p_end_date)
    AND (p_min_importance IS NULL OR e.importance_score >= p_min_importance)
  ORDER BY e.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

/**
 * Get timeline statistics
 */
CREATE OR REPLACE FUNCTION get_timeline_stats(
  p_organization_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
  v_total_events INTEGER;
  v_event_type_counts JSONB;
  v_entity_type_counts JSONB;
  v_recent_activity JSONB;
BEGIN
  -- Total events
  SELECT COUNT(*)
  INTO v_total_events
  FROM campaign_timeline_events
  WHERE organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
    AND (p_start_date IS NULL OR timestamp >= p_start_date)
    AND (p_end_date IS NULL OR timestamp <= p_end_date);

  -- Event type distribution
  SELECT jsonb_object_agg(event_type, count)
  INTO v_event_type_counts
  FROM (
    SELECT event_type::TEXT, COUNT(*) as count
    FROM campaign_timeline_events
    WHERE organization_id = p_organization_id
      AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
      AND (p_start_date IS NULL OR timestamp >= p_start_date)
      AND (p_end_date IS NULL OR timestamp <= p_end_date)
    GROUP BY event_type
  ) counts;

  -- Entity type distribution
  SELECT jsonb_object_agg(entity_type, count)
  INTO v_entity_type_counts
  FROM (
    SELECT entity_type::TEXT, COUNT(*) as count
    FROM campaign_timeline_events
    WHERE organization_id = p_organization_id
      AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
      AND (p_start_date IS NULL OR timestamp >= p_start_date)
      AND (p_end_date IS NULL OR timestamp <= p_end_date)
    GROUP BY entity_type
  ) counts;

  -- Recent activity (last 24 hours)
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', hour,
      'count', count
    )
  )
  INTO v_recent_activity
  FROM (
    SELECT
      date_trunc('hour', timestamp) as hour,
      COUNT(*) as count
    FROM campaign_timeline_events
    WHERE organization_id = p_organization_id
      AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
      AND timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY hour DESC
  ) activity;

  -- Build result
  v_stats := jsonb_build_object(
    'totalEvents', v_total_events,
    'eventTypeCounts', COALESCE(v_event_type_counts, '{}'::jsonb),
    'entityTypeCounts', COALESCE(v_entity_type_counts, '{}'::jsonb),
    'recentActivity', COALESCE(v_recent_activity, '[]'::jsonb)
  );

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

/**
 * Get event details with enriched data
 */
CREATE OR REPLACE FUNCTION get_timeline_event_details(
  p_event_id UUID,
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_result JSONB;
  v_contact_info JSONB;
  v_campaign_info JSONB;
BEGIN
  -- Get event
  SELECT * INTO v_event
  FROM campaign_timeline_events
  WHERE id = p_event_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get contact info if available
  IF v_event.related_contact_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'email', email,
      'outlet', outlet
    )
    INTO v_contact_info
    FROM contacts
    WHERE id = v_event.related_contact_id;
  END IF;

  -- Get campaign info if available
  IF v_event.campaign_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'status', status
    )
    INTO v_campaign_info
    FROM campaigns
    WHERE id = v_event.campaign_id;
  END IF;

  -- Build enriched result
  v_result := jsonb_build_object(
    'event', row_to_json(v_event)::jsonb,
    'contact', v_contact_info,
    'campaign', v_campaign_info
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Delete old timeline events (cleanup)
 */
CREATE OR REPLACE FUNCTION cleanup_old_timeline_events(
  p_retention_days INTEGER DEFAULT 90,
  p_min_importance DECIMAL DEFAULT 0.3
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete low-importance events older than retention period
  DELETE FROM campaign_timeline_events
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND importance_score < p_min_importance;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE campaign_timeline_events IS 'Unified timeline feed for all campaign and organizational activity';
COMMENT ON COLUMN campaign_timeline_events.importance_score IS 'Importance score from 0.0 to 1.0 for filtering and retention';
COMMENT ON COLUMN campaign_timeline_events.metadata IS 'Flexible JSONB structure containing event-specific data';

COMMENT ON FUNCTION insert_timeline_event IS 'Insert a new timeline event with all metadata';
COMMENT ON FUNCTION get_campaign_timeline IS 'Get paginated timeline for a specific campaign';
COMMENT ON FUNCTION get_global_timeline IS 'Get paginated timeline across all campaigns with filters';
COMMENT ON FUNCTION get_timeline_stats IS 'Get timeline statistics and activity metrics';
COMMENT ON FUNCTION get_timeline_event_details IS 'Get enriched event details with related entities';
COMMENT ON FUNCTION cleanup_old_timeline_events IS 'Delete old low-importance timeline events for retention management';
