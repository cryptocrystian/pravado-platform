-- =====================================================
-- ADMIN ANALYTICS MIGRATION
-- Sprint 56 Phase 5.3
-- Created: 2025-11-13
-- =====================================================

-- =====================================================
-- 1. ADMIN USERS & ROLES
-- =====================================================

-- Admin roles enum
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'admin',
  'analyst',
  'support'
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'analyst',
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- =====================================================
-- 2. ERROR LOGS TABLE (Enhanced from Sprint 54)
-- =====================================================

-- Error severity enum
CREATE TYPE error_severity AS ENUM (
  'critical',
  'error',
  'warning',
  'info'
);

-- Error category enum
CREATE TYPE error_category AS ENUM (
  'authentication',
  'authorization',
  'rate_limit',
  'validation',
  'agent_error',
  'webhook_delivery',
  'database',
  'network',
  'timeout',
  'unknown'
);

-- Enhanced error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  error_type VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  error_category error_category NOT NULL DEFAULT 'unknown',
  severity error_severity NOT NULL DEFAULT 'error',
  status_code INTEGER,
  endpoint VARCHAR(500),
  method VARCHAR(10),
  organization_id UUID REFERENCES organizations(organization_id) ON DELETE SET NULL,
  agent_id UUID,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  request_id VARCHAR(255),
  trace_id VARCHAR(255),
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_error_category ON error_logs(error_category);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_status_code ON error_logs(status_code);
CREATE INDEX idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX idx_error_logs_agent_id ON error_logs(agent_id);
CREATE INDEX idx_error_logs_endpoint ON error_logs(endpoint);
CREATE INDEX idx_error_logs_request_id ON error_logs(request_id);

-- =====================================================
-- 3. ANALYTICS AGGREGATION FUNCTIONS
-- =====================================================

-- Function: Get overview statistics
CREATE OR REPLACE FUNCTION get_admin_overview_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC,
  p95_response_time NUMERIC,
  p99_response_time NUMERIC,
  error_rate NUMERIC,
  unique_tenants BIGINT,
  active_agents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::BIGINT AS successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS failed_requests,
    ROUND(AVG(response_time_ms), 2) AS avg_response_time,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms), 2) AS p95_response_time,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms), 2) AS p99_response_time,
    ROUND(
      (COUNT(*) FILTER (WHERE status_code >= 400)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS error_rate,
    COUNT(DISTINCT organization_id)::BIGINT AS unique_tenants,
    COUNT(DISTINCT agent_id) FILTER (WHERE agent_id IS NOT NULL)::BIGINT AS active_agents
  FROM api_access_logs
  WHERE timestamp BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Get peak usage windows
CREATE OR REPLACE FUNCTION get_peak_usage_windows(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  hour_timestamp TIMESTAMP WITH TIME ZONE,
  hour_of_day INTEGER,
  request_count BIGINT,
  avg_response_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', timestamp) AS hour_timestamp,
    EXTRACT(HOUR FROM timestamp)::INTEGER AS hour_of_day,
    COUNT(*)::BIGINT AS request_count,
    ROUND(AVG(response_time_ms), 2) AS avg_response_time
  FROM api_access_logs
  WHERE timestamp BETWEEN p_start_date AND p_end_date
  GROUP BY DATE_TRUNC('hour', timestamp), EXTRACT(HOUR FROM timestamp)
  ORDER BY request_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get error breakdown by category
CREATE OR REPLACE FUNCTION get_error_breakdown(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  category error_category,
  count BIGINT,
  percentage NUMERIC,
  severity error_severity
) AS $$
BEGIN
  RETURN QUERY
  WITH error_counts AS (
    SELECT
      error_category,
      COUNT(*)::BIGINT AS error_count,
      severity
    FROM error_logs
    WHERE timestamp BETWEEN p_start_date AND p_end_date
    GROUP BY error_category, severity
  ),
  total_errors AS (
    SELECT SUM(error_count) AS total FROM error_counts
  )
  SELECT
    ec.error_category AS category,
    ec.error_count AS count,
    ROUND((ec.error_count::NUMERIC / NULLIF(te.total, 0)) * 100, 2) AS percentage,
    ec.severity
  FROM error_counts ec
  CROSS JOIN total_errors te
  ORDER BY ec.error_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get hourly request data
CREATE OR REPLACE FUNCTION get_hourly_request_data(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  hour_timestamp TIMESTAMP WITH TIME ZONE,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', timestamp) AS hour_timestamp,
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::BIGINT AS successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS failed_requests,
    ROUND(AVG(response_time_ms), 2) AS avg_response_time
  FROM api_access_logs
  WHERE timestamp BETWEEN p_start_date AND p_end_date
  GROUP BY DATE_TRUNC('hour', timestamp)
  ORDER BY hour_timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TENANT ACTIVITY FUNCTIONS
-- =====================================================

-- Function: Get tenant activity summary
CREATE OR REPLACE FUNCTION get_tenant_activity(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_search_term VARCHAR DEFAULT NULL,
  p_sort_by VARCHAR DEFAULT 'total_requests',
  p_sort_order VARCHAR DEFAULT 'desc',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  error_rate NUMERIC,
  active_agents BIGINT,
  total_agents BIGINT,
  avg_response_time NUMERIC,
  rate_limit_tier VARCHAR,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_sort_column VARCHAR;
BEGIN
  -- Validate sort column
  v_sort_column := CASE p_sort_by
    WHEN 'requests' THEN 'total_requests'
    WHEN 'errorRate' THEN 'error_rate'
    WHEN 'lastActivity' THEN 'last_activity_at'
    WHEN 'organizationName' THEN 'organization_name'
    ELSE 'total_requests'
  END;

  RETURN QUERY EXECUTE format('
    WITH org_stats AS (
      SELECT
        l.organization_id,
        COUNT(*)::BIGINT AS total_requests,
        COUNT(*) FILTER (WHERE l.status_code >= 200 AND l.status_code < 300)::BIGINT AS successful_requests,
        COUNT(*) FILTER (WHERE l.status_code >= 400)::BIGINT AS failed_requests,
        ROUND((COUNT(*) FILTER (WHERE l.status_code >= 400)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS error_rate,
        ROUND(AVG(l.response_time_ms), 2) AS avg_response_time,
        MAX(l.timestamp) AS last_activity_at
      FROM api_access_logs l
      WHERE l.timestamp BETWEEN $1 AND $2
        AND l.organization_id IS NOT NULL
      GROUP BY l.organization_id
    ),
    agent_counts AS (
      SELECT
        a.organization_id,
        COUNT(*) FILTER (WHERE a.is_active = true)::BIGINT AS active_agents,
        COUNT(*)::BIGINT AS total_agents
      FROM agents a
      GROUP BY a.organization_id
    )
    SELECT
      o.organization_id,
      o.name AS organization_name,
      COALESCE(s.total_requests, 0) AS total_requests,
      COALESCE(s.successful_requests, 0) AS successful_requests,
      COALESCE(s.failed_requests, 0) AS failed_requests,
      COALESCE(s.error_rate, 0) AS error_rate,
      COALESCE(ac.active_agents, 0) AS active_agents,
      COALESCE(ac.total_agents, 0) AS total_agents,
      COALESCE(s.avg_response_time, 0) AS avg_response_time,
      COALESCE(rc.rate_limit_tier, ''free'')::VARCHAR AS rate_limit_tier,
      s.last_activity_at,
      o.created_at
    FROM organizations o
    LEFT JOIN org_stats s ON o.organization_id = s.organization_id
    LEFT JOIN agent_counts ac ON o.organization_id = ac.organization_id
    LEFT JOIN registered_clients rc ON o.organization_id = rc.organization_id
    WHERE ($3 IS NULL OR o.name ILIKE ''%%'' || $3 || ''%%'')
    ORDER BY %I %s
    LIMIT $4 OFFSET $5
  ', v_sort_column, CASE WHEN p_sort_order = 'asc' THEN 'ASC' ELSE 'DESC' END)
  USING p_start_date, p_end_date, p_search_term, p_limit, p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. AGENT ACTIVITY FUNCTIONS
-- =====================================================

-- Function: Get agent activity statistics
CREATE OR REPLACE FUNCTION get_agent_activity(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_organization_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  agent_id UUID,
  agent_name VARCHAR,
  agent_type VARCHAR,
  organization_id UUID,
  organization_name VARCHAR,
  requests_handled BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC,
  p95_response_time NUMERIC,
  error_rate NUMERIC,
  escalation_rate NUMERIC,
  contradiction_count BIGINT,
  conflict_count BIGINT,
  last_active_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_stats AS (
    SELECT
      ear.agent_id,
      COUNT(*)::BIGINT AS requests_handled,
      COUNT(*) FILTER (WHERE ear.status = 'completed')::BIGINT AS successful_requests,
      COUNT(*) FILTER (WHERE ear.status = 'failed')::BIGINT AS failed_requests,
      ROUND(AVG(EXTRACT(EPOCH FROM (ear.completed_at - ear.created_at)) * 1000), 2) AS avg_response_time,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ear.completed_at - ear.created_at)) * 1000), 2) AS p95_response_time,
      ROUND((COUNT(*) FILTER (WHERE ear.status = 'failed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS error_rate,
      MAX(ear.created_at) AS last_active_at
    FROM external_agent_requests ear
    WHERE ear.created_at BETWEEN p_start_date AND p_end_date
      AND (p_organization_id IS NULL OR ear.organization_id = p_organization_id)
    GROUP BY ear.agent_id
  ),
  escalation_stats AS (
    SELECT
      agent_id,
      COUNT(*)::BIGINT AS escalation_count
    FROM agent_escalations
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY agent_id
  ),
  conflict_stats AS (
    SELECT
      agent_id,
      SUM(contradiction_count)::BIGINT AS contradiction_count,
      SUM(conflict_count)::BIGINT AS conflict_count
    FROM agent_self_evaluations
    WHERE evaluated_at BETWEEN p_start_date AND p_end_date
    GROUP BY agent_id
  )
  SELECT
    a.agent_id,
    a.name AS agent_name,
    a.agent_type,
    a.organization_id,
    o.name AS organization_name,
    COALESCE(s.requests_handled, 0) AS requests_handled,
    COALESCE(s.successful_requests, 0) AS successful_requests,
    COALESCE(s.failed_requests, 0) AS failed_requests,
    COALESCE(s.avg_response_time, 0) AS avg_response_time,
    COALESCE(s.p95_response_time, 0) AS p95_response_time,
    COALESCE(s.error_rate, 0) AS error_rate,
    ROUND((COALESCE(es.escalation_count, 0)::NUMERIC / NULLIF(s.requests_handled, 0)) * 100, 2) AS escalation_rate,
    COALESCE(cs.contradiction_count, 0) AS contradiction_count,
    COALESCE(cs.conflict_count, 0) AS conflict_count,
    s.last_active_at,
    CASE
      WHEN s.last_active_at > NOW() - INTERVAL '1 hour' THEN 'active'
      WHEN s.last_active_at > NOW() - INTERVAL '24 hours' THEN 'idle'
      WHEN s.failed_requests::NUMERIC / NULLIF(s.requests_handled, 0) > 0.5 THEN 'error'
      ELSE 'offline'
    END AS status
  FROM agents a
  LEFT JOIN organizations o ON a.organization_id = o.organization_id
  LEFT JOIN agent_stats s ON a.agent_id = s.agent_id
  LEFT JOIN escalation_stats es ON a.agent_id = es.agent_id
  LEFT JOIN conflict_stats cs ON a.agent_id = cs.agent_id
  WHERE a.is_active = true
    AND (p_organization_id IS NULL OR a.organization_id = p_organization_id)
    AND s.requests_handled IS NOT NULL
  ORDER BY s.requests_handled DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Get agent load heatmap data
CREATE OR REPLACE FUNCTION get_agent_load_heatmap(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_agent_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  agent_id UUID,
  agent_name VARCHAR,
  hour_timestamp TIMESTAMP WITH TIME ZONE,
  request_count BIGINT,
  avg_response_time NUMERIC,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ear.agent_id,
    a.name AS agent_name,
    DATE_TRUNC('hour', ear.created_at) AS hour_timestamp,
    COUNT(*)::BIGINT AS request_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (ear.completed_at - ear.created_at)) * 1000), 2) AS avg_response_time,
    COUNT(*) FILTER (WHERE ear.status = 'failed')::BIGINT AS error_count
  FROM external_agent_requests ear
  JOIN agents a ON ear.agent_id = a.agent_id
  WHERE ear.created_at BETWEEN p_start_date AND p_end_date
    AND (p_agent_ids IS NULL OR ear.agent_id = ANY(p_agent_ids))
  GROUP BY ear.agent_id, a.name, DATE_TRUNC('hour', ear.created_at)
  ORDER BY ear.agent_id, hour_timestamp;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. PERFORMANCE METRICS FUNCTIONS
-- =====================================================

-- Function: Get route performance metrics
CREATE OR REPLACE FUNCTION get_route_performance_metrics(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  endpoint VARCHAR,
  method VARCHAR,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC,
  min_response_time NUMERIC,
  max_response_time NUMERIC,
  p50_response_time NUMERIC,
  p95_response_time NUMERIC,
  p99_response_time NUMERIC,
  error_rate NUMERIC,
  requests_per_minute NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.endpoint,
    l.method,
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE l.status_code >= 200 AND l.status_code < 300)::BIGINT AS successful_requests,
    COUNT(*) FILTER (WHERE l.status_code >= 400)::BIGINT AS failed_requests,
    ROUND(AVG(l.response_time_ms), 2) AS avg_response_time,
    ROUND(MIN(l.response_time_ms), 2) AS min_response_time,
    ROUND(MAX(l.response_time_ms), 2) AS max_response_time,
    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY l.response_time_ms), 2) AS p50_response_time,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY l.response_time_ms), 2) AS p95_response_time,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY l.response_time_ms), 2) AS p99_response_time,
    ROUND((COUNT(*) FILTER (WHERE l.status_code >= 400)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS error_rate,
    ROUND(COUNT(*)::NUMERIC / EXTRACT(EPOCH FROM (p_end_date - p_start_date)) * 60, 2) AS requests_per_minute
  FROM api_access_logs l
  WHERE l.timestamp BETWEEN p_start_date AND p_end_date
    AND l.endpoint IS NOT NULL
  GROUP BY l.endpoint, l.method
  ORDER BY total_requests DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get webhook delivery performance
CREATE OR REPLACE FUNCTION get_webhook_delivery_performance(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  webhook_id UUID,
  webhook_url VARCHAR,
  organization_id UUID,
  organization_name VARCHAR,
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  avg_delivery_time NUMERIC,
  p95_delivery_time NUMERIC,
  retry_rate NUMERIC,
  last_delivery_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.webhook_id,
    w.url AS webhook_url,
    w.organization_id,
    o.name AS organization_name,
    COUNT(wda.*)::BIGINT AS total_deliveries,
    COUNT(*) FILTER (WHERE wda.status = 'delivered')::BIGINT AS successful_deliveries,
    COUNT(*) FILTER (WHERE wda.status = 'failed')::BIGINT AS failed_deliveries,
    ROUND(AVG(wda.delivery_time_ms), 2) AS avg_delivery_time,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wda.delivery_time_ms), 2) AS p95_delivery_time,
    ROUND((COUNT(*) FILTER (WHERE wda.attempt_number > 1)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS retry_rate,
    MAX(wda.created_at) AS last_delivery_at
  FROM webhook_registrations w
  JOIN organizations o ON w.organization_id = o.organization_id
  LEFT JOIN webhook_delivery_attempts wda ON w.webhook_id = wda.webhook_id
  WHERE wda.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY w.webhook_id, w.url, w.organization_id, o.name
  ORDER BY total_deliveries DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get slowest requests
CREATE OR REPLACE FUNCTION get_slowest_requests(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  request_id VARCHAR,
  timestamp TIMESTAMP WITH TIME ZONE,
  endpoint VARCHAR,
  method VARCHAR,
  response_time NUMERIC,
  status_code INTEGER,
  organization_name VARCHAR,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.request_id,
    l.timestamp,
    l.endpoint,
    l.method,
    l.response_time_ms AS response_time,
    l.status_code,
    o.name AS organization_name,
    CASE WHEN l.status_code >= 400 THEN l.error_message ELSE NULL END AS error_message
  FROM api_access_logs l
  LEFT JOIN organizations o ON l.organization_id = o.organization_id
  WHERE l.timestamp BETWEEN p_start_date AND p_end_date
    AND l.response_time_ms IS NOT NULL
  ORDER BY l.response_time_ms DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get status code distribution
CREATE OR REPLACE FUNCTION get_status_code_distribution(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  status_code INTEGER,
  count BIGINT,
  percentage NUMERIC,
  category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH status_counts AS (
    SELECT
      l.status_code,
      COUNT(*)::BIGINT AS count
    FROM api_access_logs l
    WHERE l.timestamp BETWEEN p_start_date AND p_end_date
      AND l.status_code IS NOT NULL
    GROUP BY l.status_code
  ),
  total_requests AS (
    SELECT SUM(count) AS total FROM status_counts
  )
  SELECT
    sc.status_code,
    sc.count,
    ROUND((sc.count::NUMERIC / NULLIF(tr.total, 0)) * 100, 2) AS percentage,
    CASE
      WHEN sc.status_code >= 200 AND sc.status_code < 300 THEN '2xx'
      WHEN sc.status_code >= 300 AND sc.status_code < 400 THEN '3xx'
      WHEN sc.status_code >= 400 AND sc.status_code < 500 THEN '4xx'
      WHEN sc.status_code >= 500 THEN '5xx'
      ELSE 'unknown'
    END AS category
  FROM status_counts sc
  CROSS JOIN total_requests tr
  ORDER BY sc.count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on admin users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can view all admin records
CREATE POLICY admin_users_view_all ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = current_setting('app.current_user_id')::UUID
        AND au.is_active = true
    )
  );

-- Only super admins can modify admin users
CREATE POLICY admin_users_modify_super_only ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = current_setting('app.current_user_id')::UUID
        AND au.role = 'super_admin'
        AND au.is_active = true
    )
  );

-- Enable RLS on error logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can view all error logs
CREATE POLICY error_logs_admin_view ON error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = current_setting('app.current_user_id')::UUID
        AND au.is_active = true
    )
  );

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_api_logs_timestamp_org ON api_access_logs(timestamp DESC, organization_id);
CREATE INDEX idx_api_logs_timestamp_status ON api_access_logs(timestamp DESC, status_code);
CREATE INDEX idx_api_logs_endpoint_method ON api_access_logs(endpoint, method);
CREATE INDEX idx_api_logs_response_time ON api_access_logs(response_time_ms DESC);

CREATE INDEX idx_external_requests_created_org ON external_agent_requests(created_at DESC, organization_id);
CREATE INDEX idx_external_requests_agent_status ON external_agent_requests(agent_id, status);

CREATE INDEX idx_webhook_attempts_created ON webhook_delivery_attempts(created_at DESC);
CREATE INDEX idx_webhook_attempts_webhook_status ON webhook_delivery_attempts(webhook_id, status);

-- =====================================================
-- 9. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Update updated_at timestamp for admin_users
CREATE OR REPLACE FUNCTION update_admin_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_users_timestamp
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_timestamp();

-- =====================================================
-- 10. SAMPLE ADMIN USER (Development Only)
-- =====================================================

-- Insert a sample admin user for development
-- REMOVE THIS IN PRODUCTION!
-- INSERT INTO admin_users (user_id, role, permissions, is_active)
-- SELECT
--   user_id,
--   'super_admin'::admin_role,
--   '{"canViewGlobalStats": true, "canViewTenantData": true, "canViewErrorLogs": true, "canViewPerformanceMetrics": true, "canExportData": true, "canAccessSensitiveData": true}'::JSONB,
--   true
-- FROM users
-- WHERE email = 'admin@pravado.com'
-- LIMIT 1;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
