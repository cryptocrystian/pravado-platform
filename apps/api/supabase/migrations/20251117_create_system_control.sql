-- =====================================================
-- SYSTEM CONTROL TABLES
-- Sprint 61 Phase 5.8
-- =====================================================

-- System Event Logs Table
-- Tracks all system-level events like lockdowns, flag changes, etc.
CREATE TABLE IF NOT EXISTS system_event_logs (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_event_logs_event_type ON system_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_event_logs_timestamp ON system_event_logs(timestamp DESC);

-- Comments
COMMENT ON TABLE system_event_logs IS 'Tracks all system-level events including lockdowns, flag changes, and critical system operations';
COMMENT ON COLUMN system_event_logs.event_type IS 'Type of system event (system_lockdown, system_unlock, flag_update, etc.)';
COMMENT ON COLUMN system_event_logs.metadata IS 'Event metadata including actor, reason, and event-specific data';

-- Enable Row Level Security
ALTER TABLE system_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view system event logs
CREATE POLICY view_system_event_logs ON system_event_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM admin_role_assignments
      WHERE admin_role_assignments.user_id = auth.uid()
        AND admin_role_assignments.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policy: System can insert event logs
CREATE POLICY insert_system_event_logs ON system_event_logs
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================

-- Function to cleanup old system event logs (>180 days)
CREATE OR REPLACE FUNCTION cleanup_old_system_event_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM system_event_logs
  WHERE timestamp < NOW() - INTERVAL '180 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_system_event_logs IS 'Deletes system event logs older than 180 days';

-- =====================================================
-- CONFIGURATION VERIFICATION VIEWS
-- =====================================================

-- View to check configuration sync status
CREATE OR REPLACE VIEW config_sync_status AS
SELECT
  (SELECT COUNT(*) FROM admin_roles WHERE is_system_role = TRUE) AS system_roles_count,
  (SELECT COUNT(*) FROM admin_permissions) AS permissions_count,
  (SELECT COUNT(*) FROM moderation_queue) AS moderation_queue_size,
  (SELECT COUNT(*) FROM agent_trace_logs WHERE timestamp > NOW() - INTERVAL '24 hours') AS recent_traces,
  NOW() AS checked_at;

COMMENT ON VIEW config_sync_status IS 'Provides a quick view of critical configuration status';

-- =====================================================
-- PRODUCTION READINESS CHECKS
-- =====================================================

-- Function to verify all critical tables exist
CREATE OR REPLACE FUNCTION verify_critical_tables()
RETURNS TABLE(table_name TEXT, exists BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.table_name::TEXT,
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE information_schema.tables.table_name = t.table_name
    ) AS exists
  FROM (VALUES
    ('admin_roles'),
    ('admin_permissions'),
    ('admin_role_assignments'),
    ('role_audit_logs'),
    ('moderation_queue'),
    ('moderation_actions'),
    ('agent_trace_logs'),
    ('system_event_logs')
  ) AS t(table_name);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_critical_tables IS 'Verifies that all critical production tables exist';

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS TABLE(
  metric_name TEXT,
  metric_value BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'total_admin_users'::TEXT,
    COUNT(DISTINCT user_id)::BIGINT,
    CASE WHEN COUNT(DISTINCT user_id) > 0 THEN 'healthy' ELSE 'warning' END::TEXT
  FROM admin_role_assignments
  UNION ALL
  SELECT
    'total_roles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) >= 5 THEN 'healthy' ELSE 'warning' END::TEXT
  FROM admin_roles
  UNION ALL
  SELECT
    'total_permissions'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'critical' END::TEXT
  FROM admin_permissions
  UNION ALL
  SELECT
    'moderation_queue_size'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) < 1000 THEN 'healthy' ELSE 'warning' END::TEXT
  FROM moderation_queue
  WHERE status = 'pending'
  UNION ALL
  SELECT
    'audit_logs_today'::TEXT,
    COUNT(*)::BIGINT,
    'healthy'::TEXT
  FROM role_audit_logs
  WHERE timestamp > NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_system_health_metrics IS 'Returns key system health metrics with status indicators';

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant permissions on new objects
GRANT SELECT ON config_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION verify_critical_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_system_event_logs() TO authenticated;
