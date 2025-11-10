-- =====================================================
-- AI OPS EVENTS MIGRATION
-- Sprint 71: User-Facing AI Performance Reports + Billing Integration
-- =====================================================
-- Audit trail for critical AI operations events

-- =====================================================
-- AI OPS EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_ops_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization (nullable for system-wide events)
  organization_id UUID,

  -- Event classification
  event_type TEXT NOT NULL,
  -- Examples: provider_disabled, provider_enabled, budget_breach,
  --           policy_adapted, cache_cleanup, circuit_breaker_triggered

  severity TEXT NOT NULL DEFAULT 'info',
  -- Levels: debug, info, warning, error, critical

  -- Event details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  -- Example: {"provider": "openai", "errorRate": 0.65, "threshold": 0.5}

  -- Actor (who/what triggered the event)
  actor_type TEXT NOT NULL DEFAULT 'system',
  -- Options: system, user, cron, api

  actor_id TEXT,  -- User ID, cron job name, API key, etc.

  -- Notification status
  notified BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  notification_channels JSONB DEFAULT '[]',
  -- Example: ["email", "in_app", "slack"]

  -- Related entities
  related_provider TEXT,
  related_model TEXT,
  related_decision_id TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_severity CHECK (
    severity IN ('debug', 'info', 'warning', 'error', 'critical')
  ),
  CONSTRAINT valid_actor_type CHECK (
    actor_type IN ('system', 'user', 'cron', 'api')
  )
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Organization + time lookup
CREATE INDEX idx_ai_ops_events_org_time
  ON ai_ops_events(organization_id, created_at DESC);

-- Event type queries
CREATE INDEX idx_ai_ops_events_type
  ON ai_ops_events(event_type, created_at DESC);

-- Severity filtering
CREATE INDEX idx_ai_ops_events_severity
  ON ai_ops_events(severity, created_at DESC);

-- Unnotified events
CREATE INDEX idx_ai_ops_events_unnotified
  ON ai_ops_events(notified, created_at DESC)
  WHERE notified = false;

-- Provider/model filtering
CREATE INDEX idx_ai_ops_events_provider
  ON ai_ops_events(related_provider, related_model, created_at DESC);

-- Full-text search on metadata
CREATE INDEX idx_ai_ops_events_metadata_gin
  ON ai_ops_events USING gin(metadata);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get recent events for an organization
 */
CREATE OR REPLACE FUNCTION get_recent_events(
  org_id UUID,
  limit_count INTEGER DEFAULT 50,
  min_severity TEXT DEFAULT 'info'
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  severity TEXT,
  title TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  severity_order INTEGER;
BEGIN
  -- Map severity to numeric order
  severity_order := CASE min_severity
    WHEN 'debug' THEN 0
    WHEN 'info' THEN 1
    WHEN 'warning' THEN 2
    WHEN 'error' THEN 3
    WHEN 'critical' THEN 4
    ELSE 1
  END;

  RETURN QUERY
  SELECT
    e.id,
    e.event_type,
    e.severity,
    e.title,
    e.message,
    e.metadata,
    e.created_at
  FROM ai_ops_events e
  WHERE (e.organization_id = org_id OR e.organization_id IS NULL)
    AND CASE e.severity
      WHEN 'debug' THEN 0
      WHEN 'info' THEN 1
      WHEN 'warning' THEN 2
      WHEN 'error' THEN 3
      WHEN 'critical' THEN 4
    END >= severity_order
  ORDER BY e.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get unnotified critical events
 */
CREATE OR REPLACE FUNCTION get_unnotified_critical_events(
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  event_type TEXT,
  title TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.organization_id,
    e.event_type,
    e.title,
    e.message,
    e.metadata,
    e.created_at
  FROM ai_ops_events e
  WHERE e.notified = false
    AND e.severity IN ('error', 'critical')
  ORDER BY e.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Mark events as notified
 */
CREATE OR REPLACE FUNCTION mark_events_notified(
  event_ids UUID[],
  channels JSONB DEFAULT '["in_app"]'
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE ai_ops_events
  SET
    notified = true,
    notified_at = now(),
    notification_channels = channels
  WHERE id = ANY(event_ids)
    AND notified = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Get event statistics by type
 */
CREATE OR REPLACE FUNCTION get_event_stats(
  org_id UUID DEFAULT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
  event_type TEXT,
  count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.event_type,
    COUNT(*)::BIGINT as count,
    MAX(e.created_at) as last_occurrence
  FROM ai_ops_events e
  WHERE (org_id IS NULL OR e.organization_id = org_id)
    AND e.created_at BETWEEN start_date AND end_date
  GROUP BY e.event_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Cleanup old events (retention policy)
 */
CREATE OR REPLACE FUNCTION cleanup_old_events(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_ops_events
  WHERE created_at < now() - (retention_days || ' days')::INTERVAL
    AND notified = true;  -- Only delete notified events

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE ai_ops_events IS 'Sprint 71: Audit trail for AI operations events';
COMMENT ON COLUMN ai_ops_events.event_type IS 'Event classification (provider_disabled, budget_breach, etc.)';
COMMENT ON COLUMN ai_ops_events.severity IS 'Severity level: debug, info, warning, error, critical';
COMMENT ON COLUMN ai_ops_events.metadata IS 'Event-specific data as JSONB';
COMMENT ON COLUMN ai_ops_events.notification_channels IS 'Channels where notification was sent';

-- =====================================================
-- GRANTS (if using RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE ai_ops_events ENABLE ROW LEVEL SECURITY;

-- Organizations can read their own events + system-wide events
CREATE POLICY ai_ops_events_select_own
  ON ai_ops_events
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', true)::UUID
    OR organization_id IS NULL
  );

-- Only system/admin can insert
CREATE POLICY ai_ops_events_admin_insert
  ON ai_ops_events
  FOR INSERT
  WITH CHECK (current_setting('app.user_role', true) = 'admin');
