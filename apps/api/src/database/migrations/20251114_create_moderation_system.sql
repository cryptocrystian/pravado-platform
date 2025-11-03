-- =====================================================
-- MODERATION & AUDIT TRAIL SYSTEM MIGRATION
-- Sprint 57 Phase 5.4
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- 1. AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id VARCHAR(255) NOT NULL, -- User/service performing action
  action_type VARCHAR(100) NOT NULL,
  target_id VARCHAR(255), -- Resource affected
  target_type VARCHAR(100), -- Type of target resource
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET NOT NULL,
  user_agent TEXT,
  organization_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}', -- Flexible context data
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- GIN index on metadata for full-text search and JSONB queries
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);
CREATE INDEX idx_audit_logs_actor_timestamp ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action_timestamp ON audit_logs(action_type, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit logs for their organization
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
    )
    OR
    -- Allow moderators/admins to see all logs
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- RLS Policy: Only the system can insert audit logs
CREATE POLICY audit_logs_insert_only ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (controlled by application logic)

-- RLS Policy: Audit logs are immutable (no updates allowed)
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  USING (false);

-- RLS Policy: Only admins can delete old audit logs
CREATE POLICY audit_logs_admin_delete ON audit_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- 2. ABUSE REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS abuse_reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(255),
  ip_address INET,
  token_id VARCHAR(255),
  endpoint VARCHAR(500),
  abuse_score VARCHAR(50) NOT NULL, -- 'normal', 'suspicious', 'abusive'
  patterns JSONB DEFAULT '[]', -- Array of detected patterns
  metrics JSONB DEFAULT '{}', -- Detailed metrics
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  organization_id UUID,
  severity INTEGER NOT NULL DEFAULT 0, -- 0-100 score
  is_flagged BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for abuse_reports
CREATE INDEX idx_abuse_reports_client_id ON abuse_reports(client_id);
CREATE INDEX idx_abuse_reports_ip_address ON abuse_reports(ip_address);
CREATE INDEX idx_abuse_reports_token_id ON abuse_reports(token_id);
CREATE INDEX idx_abuse_reports_abuse_score ON abuse_reports(abuse_score);
CREATE INDEX idx_abuse_reports_detected_at ON abuse_reports(detected_at DESC);
CREATE INDEX idx_abuse_reports_organization_id ON abuse_reports(organization_id);
CREATE INDEX idx_abuse_reports_severity ON abuse_reports(severity DESC);
CREATE INDEX idx_abuse_reports_is_flagged ON abuse_reports(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_abuse_reports_is_resolved ON abuse_reports(is_resolved) WHERE is_resolved = false;

-- GIN indexes for pattern search
CREATE INDEX idx_abuse_reports_patterns_gin ON abuse_reports USING GIN (patterns);
CREATE INDEX idx_abuse_reports_metrics_gin ON abuse_reports USING GIN (metrics);

-- Composite indexes
CREATE INDEX idx_abuse_reports_score_detected ON abuse_reports(abuse_score, detected_at DESC);
CREATE INDEX idx_abuse_reports_org_detected ON abuse_reports(organization_id, detected_at DESC);

-- Enable Row Level Security
ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only moderators and admins can view abuse reports
CREATE POLICY abuse_reports_moderator_access ON abuse_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- RLS Policy: Only system can insert abuse reports
CREATE POLICY abuse_reports_insert_only ON abuse_reports
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Only moderators can update abuse reports
CREATE POLICY abuse_reports_moderator_update ON abuse_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_abuse_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER abuse_reports_update_timestamp
BEFORE UPDATE ON abuse_reports
FOR EACH ROW
EXECUTE FUNCTION update_abuse_reports_timestamp();

-- =====================================================
-- 3. MODERATION FLAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS moderation_flags (
  flag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(255),
  token_id VARCHAR(255),
  ip_address INET,
  organization_id UUID,
  flag_reason TEXT NOT NULL,
  flag_type VARCHAR(50) NOT NULL, -- 'warning', 'restriction', 'suspension', 'ban'
  severity VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  flagged_by VARCHAR(255) NOT NULL, -- Moderator/admin who flagged
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- At least one identifier must be provided
  CONSTRAINT moderation_flags_identifier_check CHECK (
    client_id IS NOT NULL OR token_id IS NOT NULL OR ip_address IS NOT NULL
  )
);

-- Indexes for moderation_flags
CREATE INDEX idx_moderation_flags_client_id ON moderation_flags(client_id);
CREATE INDEX idx_moderation_flags_token_id ON moderation_flags(token_id);
CREATE INDEX idx_moderation_flags_ip_address ON moderation_flags(ip_address);
CREATE INDEX idx_moderation_flags_organization_id ON moderation_flags(organization_id);
CREATE INDEX idx_moderation_flags_flag_type ON moderation_flags(flag_type);
CREATE INDEX idx_moderation_flags_severity ON moderation_flags(severity);
CREATE INDEX idx_moderation_flags_flagged_at ON moderation_flags(flagged_at DESC);
CREATE INDEX idx_moderation_flags_is_active ON moderation_flags(is_active) WHERE is_active = true;
CREATE INDEX idx_moderation_flags_expires_at ON moderation_flags(expires_at) WHERE expires_at IS NOT NULL;

-- GIN index on metadata
CREATE INDEX idx_moderation_flags_metadata_gin ON moderation_flags USING GIN (metadata);

-- Composite indexes
CREATE INDEX idx_moderation_flags_active_expires ON moderation_flags(is_active, expires_at);
CREATE INDEX idx_moderation_flags_client_active ON moderation_flags(client_id, is_active) WHERE is_active = true;
CREATE INDEX idx_moderation_flags_token_active ON moderation_flags(token_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only moderators and admins can view flags
CREATE POLICY moderation_flags_moderator_access ON moderation_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- RLS Policy: Only moderators can insert flags
CREATE POLICY moderation_flags_moderator_insert ON moderation_flags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- RLS Policy: Only moderators can update flags
CREATE POLICY moderation_flags_moderator_update ON moderation_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
      AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_moderation_flags_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moderation_flags_update_timestamp
BEFORE UPDATE ON moderation_flags
FOR EACH ROW
EXECUTE FUNCTION update_moderation_flags_timestamp();

-- =====================================================
-- 4. ABUSE DETECTION CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS abuse_detection_config (
  config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE, -- NULL for global config
  rate_limit_exceeded_threshold INTEGER DEFAULT 10,
  rate_limit_bypass_threshold INTEGER DEFAULT 5,
  malformed_payload_threshold INTEGER DEFAULT 20,
  malformed_payload_percentage DECIMAL(5,2) DEFAULT 15.0,
  unauthorized_attempts_threshold INTEGER DEFAULT 10,
  auth_failure_threshold INTEGER DEFAULT 15,
  token_reuse_threshold INTEGER DEFAULT 5,
  suspicious_token_pattern_threshold INTEGER DEFAULT 3,
  webhook_failure_threshold INTEGER DEFAULT 10,
  webhook_failure_percentage DECIMAL(5,2) DEFAULT 25.0,
  time_window_minutes INTEGER DEFAULT 60,
  requests_per_minute_threshold INTEGER DEFAULT 100,
  error_rate_threshold DECIMAL(5,2) DEFAULT 20.0,
  suspicious_score_threshold INTEGER DEFAULT 50,
  abusive_score_threshold INTEGER DEFAULT 75,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default global configuration
INSERT INTO abuse_detection_config (organization_id) VALUES (NULL)
ON CONFLICT (organization_id) DO NOTHING;

-- Indexes
CREATE INDEX idx_abuse_detection_config_org_id ON abuse_detection_config(organization_id);
CREATE INDEX idx_abuse_detection_config_is_active ON abuse_detection_config(is_active) WHERE is_active = true;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_abuse_detection_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER abuse_detection_config_update_timestamp
BEFORE UPDATE ON abuse_detection_config
FOR EACH ROW
EXECUTE FUNCTION update_abuse_detection_config_timestamp();

-- =====================================================
-- 5. TTL CLEANUP FUNCTION (90 days)
-- =====================================================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Cleaned up audit logs older than 90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old abuse reports
CREATE OR REPLACE FUNCTION cleanup_old_abuse_reports()
RETURNS void AS $$
BEGIN
  DELETE FROM abuse_reports
  WHERE detected_at < NOW() - INTERVAL '90 days'
  AND is_resolved = true;

  RAISE NOTICE 'Cleaned up resolved abuse reports older than 90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate expired moderation flags
CREATE OR REPLACE FUNCTION deactivate_expired_flags()
RETURNS void AS $$
BEGIN
  UPDATE moderation_flags
  SET is_active = false,
      updated_at = NOW()
  WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

  RAISE NOTICE 'Deactivated expired moderation flags';
END;
$$ LANGUAGE plpgsql;

-- Comment: To automate TTL cleanup, use pg_cron extension:
-- SELECT cron.schedule('cleanup_audit_logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs()');
-- SELECT cron.schedule('cleanup_abuse_reports', '0 3 * * *', 'SELECT cleanup_old_abuse_reports()');
-- SELECT cron.schedule('deactivate_expired_flags', '*/30 * * * *', 'SELECT deactivate_expired_flags()');

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get active moderation flags for a client
CREATE OR REPLACE FUNCTION get_active_flags_for_client(p_client_id VARCHAR)
RETURNS TABLE (
  flag_id UUID,
  flag_type VARCHAR,
  severity VARCHAR,
  flag_reason TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mf.flag_id,
    mf.flag_type,
    mf.severity,
    mf.flag_reason,
    mf.flagged_at,
    mf.expires_at
  FROM moderation_flags mf
  WHERE mf.client_id = p_client_id
  AND mf.is_active = true
  AND (mf.expires_at IS NULL OR mf.expires_at > NOW())
  ORDER BY mf.severity DESC, mf.flagged_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get active moderation flags for a token
CREATE OR REPLACE FUNCTION get_active_flags_for_token(p_token_id VARCHAR)
RETURNS TABLE (
  flag_id UUID,
  flag_type VARCHAR,
  severity VARCHAR,
  flag_reason TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mf.flag_id,
    mf.flag_type,
    mf.severity,
    mf.flag_reason,
    mf.flagged_at,
    mf.expires_at
  FROM moderation_flags mf
  WHERE mf.token_id = p_token_id
  AND mf.is_active = true
  AND (mf.expires_at IS NULL OR mf.expires_at > NOW())
  ORDER BY mf.severity DESC, mf.flagged_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get active moderation flags for an IP address
CREATE OR REPLACE FUNCTION get_active_flags_for_ip(p_ip_address INET)
RETURNS TABLE (
  flag_id UUID,
  flag_type VARCHAR,
  severity VARCHAR,
  flag_reason TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mf.flag_id,
    mf.flag_type,
    mf.severity,
    mf.flag_reason,
    mf.flagged_at,
    mf.expires_at
  FROM moderation_flags mf
  WHERE mf.ip_address = p_ip_address
  AND mf.is_active = true
  AND (mf.expires_at IS NULL OR mf.expires_at > NOW())
  ORDER BY mf.severity DESC, mf.flagged_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a client/token/IP is flagged
CREATE OR REPLACE FUNCTION is_flagged(
  p_client_id VARCHAR DEFAULT NULL,
  p_token_id VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM moderation_flags
    WHERE (
      (p_client_id IS NOT NULL AND client_id = p_client_id) OR
      (p_token_id IS NOT NULL AND token_id = p_token_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    )
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get abuse detection config
CREATE OR REPLACE FUNCTION get_abuse_detection_config(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
  rate_limit_exceeded_threshold INTEGER,
  rate_limit_bypass_threshold INTEGER,
  malformed_payload_threshold INTEGER,
  malformed_payload_percentage DECIMAL,
  unauthorized_attempts_threshold INTEGER,
  auth_failure_threshold INTEGER,
  token_reuse_threshold INTEGER,
  suspicious_token_pattern_threshold INTEGER,
  webhook_failure_threshold INTEGER,
  webhook_failure_percentage DECIMAL,
  time_window_minutes INTEGER,
  requests_per_minute_threshold INTEGER,
  error_rate_threshold DECIMAL,
  suspicious_score_threshold INTEGER,
  abusive_score_threshold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    adc.rate_limit_exceeded_threshold,
    adc.rate_limit_bypass_threshold,
    adc.malformed_payload_threshold,
    adc.malformed_payload_percentage,
    adc.unauthorized_attempts_threshold,
    adc.auth_failure_threshold,
    adc.token_reuse_threshold,
    adc.suspicious_token_pattern_threshold,
    adc.webhook_failure_threshold,
    adc.webhook_failure_percentage,
    adc.time_window_minutes,
    adc.requests_per_minute_threshold,
    adc.error_rate_threshold,
    adc.suspicious_score_threshold,
    adc.abusive_score_threshold
  FROM abuse_detection_config adc
  WHERE (
    (p_organization_id IS NOT NULL AND adc.organization_id = p_organization_id) OR
    (p_organization_id IS NULL AND adc.organization_id IS NULL)
  )
  AND adc.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all sensitive platform actions';
COMMENT ON COLUMN audit_logs.metadata IS 'JSONB field with GIN index for flexible context storage and full-text search';
COMMENT ON TABLE abuse_reports IS 'Automated abuse detection reports with scoring and pattern analysis';
COMMENT ON TABLE moderation_flags IS 'Manual moderation actions (warnings, bans, restrictions) applied to clients/tokens/IPs';
COMMENT ON TABLE abuse_detection_config IS 'Configurable thresholds for abuse detection algorithm';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
