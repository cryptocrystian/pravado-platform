-- =====================================================
-- EXTERNAL API LAYER MIGRATION
-- Sprint 54 Phase 5.1
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE rate_limit_tier AS ENUM (
  'free',
  'basic',
  'professional',
  'enterprise',
  'unlimited'
);

CREATE TYPE access_level AS ENUM (
  'read_only',
  'write',
  'admin',
  'full_access'
);

CREATE TYPE api_client_type AS ENUM (
  'web_app',
  'mobile_app',
  'server',
  'cli',
  'integration',
  'webhook',
  'custom'
);

CREATE TYPE webhook_event_type AS ENUM (
  'agent_response',
  'task_completed',
  'task_failed',
  'conversation_started',
  'conversation_ended',
  'agent_status_change',
  'error_occurred',
  'rate_limit_exceeded'
);

CREATE TYPE api_request_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'rate_limited',
  'unauthorized'
);

CREATE TYPE webhook_delivery_status AS ENUM (
  'pending',
  'delivered',
  'failed',
  'retrying',
  'abandoned'
);

-- =====================================================
-- REGISTERED CLIENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS registered_clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_type api_client_type NOT NULL DEFAULT 'server',

  -- Security
  allowed_origins TEXT[],
  allowed_ips TEXT[],
  webhook_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_registered_clients_org_id ON registered_clients(organization_id);
CREATE INDEX idx_registered_clients_active ON registered_clients(is_active) WHERE is_active = true;
CREATE INDEX idx_registered_clients_type ON registered_clients(client_type);

COMMENT ON TABLE registered_clients IS 'Registered API clients with access configuration';
COMMENT ON COLUMN registered_clients.allowed_origins IS 'CORS allowed origins for web apps';
COMMENT ON COLUMN registered_clients.allowed_ips IS 'IP whitelist for enhanced security';

-- =====================================================
-- EXTERNAL API TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS external_api_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES registered_clients(client_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  -- Token data
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  token_prefix VARCHAR(16) NOT NULL, -- First 8-12 chars for identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Access control
  access_level access_level NOT NULL DEFAULT 'read_only',
  scopes JSONB NOT NULL DEFAULT '[]',

  -- Rate limiting
  rate_limit_tier rate_limit_tier NOT NULL DEFAULT 'free',
  rate_limit_config JSONB NOT NULL DEFAULT '{
    "requestsPerMinute": 60,
    "requestsPerHour": 1000,
    "requestsPerDay": 10000,
    "burstLimit": 10
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,

  -- Constraints
  CONSTRAINT fk_token_client FOREIGN KEY (client_id) REFERENCES registered_clients(client_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_tokens_hash ON external_api_tokens(token_hash);
CREATE INDEX idx_tokens_client_id ON external_api_tokens(client_id);
CREATE INDEX idx_tokens_org_id ON external_api_tokens(organization_id);
CREATE INDEX idx_tokens_active ON external_api_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_tokens_prefix ON external_api_tokens(token_prefix);
CREATE INDEX idx_tokens_expires_at ON external_api_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_tokens_last_used ON external_api_tokens(last_used_at DESC);

-- GIN indexes for JSONB
CREATE INDEX idx_tokens_scopes ON external_api_tokens USING GIN(scopes);
CREATE INDEX idx_tokens_rate_limit_config ON external_api_tokens USING GIN(rate_limit_config);

COMMENT ON TABLE external_api_tokens IS 'API access tokens with hashed storage for security';
COMMENT ON COLUMN external_api_tokens.token_hash IS 'SHA-256 hash of the actual token';
COMMENT ON COLUMN external_api_tokens.token_prefix IS 'Visible prefix for token identification (e.g., pk_live_...)';
COMMENT ON COLUMN external_api_tokens.scopes IS 'Array of APIAccessScope objects defining permissions';

-- =====================================================
-- API ACCESS LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS api_access_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES registered_clients(client_id) ON DELETE CASCADE,
  token_id UUID REFERENCES external_api_tokens(token_id) ON DELETE SET NULL,
  organization_id UUID NOT NULL,

  -- Request details
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status api_request_status NOT NULL,
  status_code INTEGER NOT NULL,

  -- Request/Response data
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,

  -- Client info
  ip_address INET,
  user_agent TEXT,

  -- Performance
  request_duration INTEGER NOT NULL, -- milliseconds

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- TTL for automatic cleanup
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '90 days'
);

CREATE INDEX idx_api_logs_client_id ON api_access_logs(client_id);
CREATE INDEX idx_api_logs_token_id ON api_access_logs(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_api_logs_org_id ON api_access_logs(organization_id);
CREATE INDEX idx_api_logs_timestamp ON api_access_logs(timestamp DESC);
CREATE INDEX idx_api_logs_status ON api_access_logs(status);
CREATE INDEX idx_api_logs_endpoint ON api_access_logs(endpoint);
CREATE INDEX idx_api_logs_method ON api_access_logs(method);
CREATE INDEX idx_api_logs_status_code ON api_access_logs(status_code);
CREATE INDEX idx_api_logs_expires_at ON api_access_logs(expires_at);
CREATE INDEX idx_api_logs_duration ON api_access_logs(request_duration);

-- Composite indexes for analytics
CREATE INDEX idx_api_logs_org_timestamp ON api_access_logs(organization_id, timestamp DESC);
CREATE INDEX idx_api_logs_client_timestamp ON api_access_logs(client_id, timestamp DESC);

-- GIN indexes for JSONB
CREATE INDEX idx_api_logs_request_body ON api_access_logs USING GIN(request_body);
CREATE INDEX idx_api_logs_response_body ON api_access_logs USING GIN(response_body);

COMMENT ON TABLE api_access_logs IS 'Comprehensive request/response log for API analytics and debugging';
COMMENT ON COLUMN api_access_logs.request_duration IS 'Total request processing time in milliseconds';
COMMENT ON COLUMN api_access_logs.expires_at IS 'Auto-cleanup timestamp (90 days default)';

-- =====================================================
-- WEBHOOK REGISTRATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_registrations (
  webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES registered_clients(client_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  -- Webhook configuration
  url TEXT NOT NULL,
  events webhook_event_type[] NOT NULL,
  secret VARCHAR(255) NOT NULL, -- For HMAC signature validation

  -- Retry configuration
  retry_config JSONB NOT NULL DEFAULT '{
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelayMs": 1000
  }'::jsonb,

  -- Custom headers
  headers JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Statistics
  total_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_client_id ON webhook_registrations(client_id);
CREATE INDEX idx_webhooks_org_id ON webhook_registrations(organization_id);
CREATE INDEX idx_webhooks_active ON webhook_registrations(is_active) WHERE is_active = true;
CREATE INDEX idx_webhooks_events ON webhook_registrations USING GIN(events);
CREATE INDEX idx_webhooks_last_delivery ON webhook_registrations(last_delivery_at DESC NULLS LAST);

-- GIN indexes for JSONB
CREATE INDEX idx_webhooks_retry_config ON webhook_registrations USING GIN(retry_config);
CREATE INDEX idx_webhooks_headers ON webhook_registrations USING GIN(headers);

COMMENT ON TABLE webhook_registrations IS 'Webhook endpoints registered by API clients';
COMMENT ON COLUMN webhook_registrations.secret IS 'Secret key for HMAC-SHA256 signature generation';
COMMENT ON COLUMN webhook_registrations.retry_config IS 'Exponential backoff configuration for failed deliveries';

-- =====================================================
-- WEBHOOK DELIVERY ATTEMPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhook_registrations(webhook_id) ON DELETE CASCADE,

  -- Event details
  event_type webhook_event_type NOT NULL,
  payload JSONB NOT NULL,

  -- Delivery status
  status webhook_delivery_status NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,

  -- Retry tracking
  attempt_number INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,

  -- TTL for cleanup
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_webhook_attempts_webhook_id ON webhook_delivery_attempts(webhook_id);
CREATE INDEX idx_webhook_attempts_status ON webhook_delivery_attempts(status);
CREATE INDEX idx_webhook_attempts_event_type ON webhook_delivery_attempts(event_type);
CREATE INDEX idx_webhook_attempts_created_at ON webhook_delivery_attempts(created_at DESC);
CREATE INDEX idx_webhook_attempts_next_retry ON webhook_delivery_attempts(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_attempts_expires_at ON webhook_delivery_attempts(expires_at);

-- GIN index for payload
CREATE INDEX idx_webhook_attempts_payload ON webhook_delivery_attempts USING GIN(payload);

COMMENT ON TABLE webhook_delivery_attempts IS 'Individual webhook delivery attempts with retry tracking';
COMMENT ON COLUMN webhook_delivery_attempts.attempt_number IS 'Increments with each retry (1 = first attempt)';

-- =====================================================
-- EXTERNAL AGENT REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS external_agent_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES registered_clients(client_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  agent_id UUID NOT NULL,

  -- Request details
  task_type VARCHAR(50) NOT NULL, -- 'conversation', 'task', 'query', 'command'
  input JSONB NOT NULL,

  -- Response
  status api_request_status NOT NULL DEFAULT 'pending',
  response JSONB,

  -- Conversation tracking
  conversation_id UUID,

  -- Performance
  processing_time INTEGER, -- milliseconds

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- TTL
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',

  -- Constraints
  CONSTRAINT fk_external_request_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE INDEX idx_external_requests_client_id ON external_agent_requests(client_id);
CREATE INDEX idx_external_requests_org_id ON external_agent_requests(organization_id);
CREATE INDEX idx_external_requests_agent_id ON external_agent_requests(agent_id);
CREATE INDEX idx_external_requests_status ON external_agent_requests(status);
CREATE INDEX idx_external_requests_conversation_id ON external_agent_requests(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_external_requests_created_at ON external_agent_requests(created_at DESC);
CREATE INDEX idx_external_requests_expires_at ON external_agent_requests(expires_at);

-- GIN indexes for JSONB
CREATE INDEX idx_external_requests_input ON external_agent_requests USING GIN(input);
CREATE INDEX idx_external_requests_response ON external_agent_requests USING GIN(response);

COMMENT ON TABLE external_agent_requests IS 'Agent task requests submitted via external API';

-- =====================================================
-- RATE LIMIT TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  tracking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES registered_clients(client_id) ON DELETE CASCADE,
  token_id UUID REFERENCES external_api_tokens(token_id) ON DELETE CASCADE,

  -- Time windows
  window_minute TIMESTAMP WITH TIME ZONE NOT NULL,
  window_hour TIMESTAMP WITH TIME ZONE NOT NULL,
  window_day DATE NOT NULL,

  -- Counters
  requests_this_minute INTEGER DEFAULT 0,
  requests_this_hour INTEGER DEFAULT 0,
  requests_this_day INTEGER DEFAULT 0,

  -- Last update
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Auto-cleanup
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 days',

  -- Unique constraint per client per time window
  CONSTRAINT unique_rate_limit_window UNIQUE (client_id, window_minute)
);

CREATE INDEX idx_rate_limit_client_id ON rate_limit_tracking(client_id);
CREATE INDEX idx_rate_limit_token_id ON rate_limit_tracking(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_rate_limit_window_minute ON rate_limit_tracking(window_minute);
CREATE INDEX idx_rate_limit_window_hour ON rate_limit_tracking(window_hour);
CREATE INDEX idx_rate_limit_window_day ON rate_limit_tracking(window_day);
CREATE INDEX idx_rate_limit_expires_at ON rate_limit_tracking(expires_at);

COMMENT ON TABLE rate_limit_tracking IS 'Real-time rate limit tracking for API clients';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for registered_clients
CREATE OR REPLACE FUNCTION update_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registered_clients_updated_at_trigger
BEFORE UPDATE ON registered_clients
FOR EACH ROW
EXECUTE FUNCTION update_client_updated_at();

-- Update updated_at timestamp for webhook_registrations
CREATE TRIGGER webhook_registrations_updated_at_trigger
BEFORE UPDATE ON webhook_registrations
FOR EACH ROW
EXECUTE FUNCTION update_client_updated_at();

-- Cleanup expired API logs
CREATE OR REPLACE FUNCTION cleanup_expired_api_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM api_access_logs
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_api_logs_trigger
AFTER INSERT ON api_access_logs
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_api_logs();

-- Cleanup expired webhook attempts
CREATE OR REPLACE FUNCTION cleanup_expired_webhook_attempts()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM webhook_delivery_attempts
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_webhook_attempts_trigger
AFTER INSERT ON webhook_delivery_attempts
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_webhook_attempts();

-- Cleanup expired external requests
CREATE OR REPLACE FUNCTION cleanup_expired_external_requests()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM external_agent_requests
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_external_requests_trigger
AFTER INSERT ON external_agent_requests
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_external_requests();

-- Cleanup expired rate limit tracking
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM rate_limit_tracking
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_rate_limits_trigger
AFTER INSERT ON rate_limit_tracking
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_rate_limits();

-- Auto-deactivate expired tokens
CREATE OR REPLACE FUNCTION deactivate_expired_tokens()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE external_api_tokens
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = true;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_expired_tokens_trigger
AFTER INSERT ON external_api_tokens
FOR EACH STATEMENT
EXECUTE FUNCTION deactivate_expired_tokens();

-- Update webhook statistics on delivery attempt
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE webhook_registrations
    SET total_deliveries = total_deliveries + 1,
        last_delivery_at = NOW()
    WHERE webhook_id = NEW.webhook_id;
  ELSIF NEW.status = 'failed' OR NEW.status = 'abandoned' THEN
    UPDATE webhook_registrations
    SET failed_deliveries = failed_deliveries + 1
    WHERE webhook_id = NEW.webhook_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_stats_trigger
AFTER INSERT OR UPDATE ON webhook_delivery_attempts
FOR EACH ROW
EXECUTE FUNCTION update_webhook_stats();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE registered_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_agent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization isolation
CREATE POLICY clients_org_isolation ON registered_clients
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY tokens_org_isolation ON external_api_tokens
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY api_logs_org_isolation ON api_access_logs
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY webhooks_org_isolation ON webhook_registrations
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY webhook_attempts_org_isolation ON webhook_delivery_attempts
  FOR ALL
  USING (
    webhook_id IN (
      SELECT webhook_id FROM webhook_registrations
      WHERE organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

CREATE POLICY external_requests_org_isolation ON external_agent_requests
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY rate_limit_org_isolation ON rate_limit_tracking
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM registered_clients
      WHERE organization_id = current_setting('app.current_organization_id', true)::UUID
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check rate limit for a client
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_client_id UUID,
  p_token_id UUID
)
RETURNS TABLE (
  is_limited BOOLEAN,
  requests_this_minute INTEGER,
  requests_this_hour INTEGER,
  requests_this_day INTEGER,
  limit_minute INTEGER,
  limit_hour INTEGER,
  limit_day INTEGER
) AS $$
DECLARE
  v_rate_config JSONB;
  v_current_minute TIMESTAMP WITH TIME ZONE;
  v_current_hour TIMESTAMP WITH TIME ZONE;
  v_current_day DATE;
  v_tracking RECORD;
BEGIN
  -- Get rate limit config
  SELECT rate_limit_config INTO v_rate_config
  FROM external_api_tokens
  WHERE token_id = p_token_id;

  -- Calculate time windows
  v_current_minute := date_trunc('minute', NOW());
  v_current_hour := date_trunc('hour', NOW());
  v_current_day := CURRENT_DATE;

  -- Get or create tracking record
  INSERT INTO rate_limit_tracking (client_id, token_id, window_minute, window_hour, window_day)
  VALUES (p_client_id, p_token_id, v_current_minute, v_current_hour, v_current_day)
  ON CONFLICT (client_id, window_minute) DO NOTHING;

  -- Get current counts
  SELECT * INTO v_tracking
  FROM rate_limit_tracking
  WHERE client_id = p_client_id
    AND window_minute = v_current_minute;

  -- Check limits
  RETURN QUERY SELECT
    (v_tracking.requests_this_minute >= (v_rate_config->>'requestsPerMinute')::INTEGER OR
     v_tracking.requests_this_hour >= (v_rate_config->>'requestsPerHour')::INTEGER OR
     v_tracking.requests_this_day >= (v_rate_config->>'requestsPerDay')::INTEGER) as is_limited,
    v_tracking.requests_this_minute,
    v_tracking.requests_this_hour,
    v_tracking.requests_this_day,
    (v_rate_config->>'requestsPerMinute')::INTEGER as limit_minute,
    (v_rate_config->>'requestsPerHour')::INTEGER as limit_hour,
    (v_rate_config->>'requestsPerDay')::INTEGER as limit_day;
END;
$$ LANGUAGE plpgsql;

-- Increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_client_id UUID,
  p_token_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_current_minute TIMESTAMP WITH TIME ZONE;
  v_current_hour TIMESTAMP WITH TIME ZONE;
  v_current_day DATE;
BEGIN
  v_current_minute := date_trunc('minute', NOW());
  v_current_hour := date_trunc('hour', NOW());
  v_current_day := CURRENT_DATE;

  INSERT INTO rate_limit_tracking (client_id, token_id, window_minute, window_hour, window_day, requests_this_minute, requests_this_hour, requests_this_day)
  VALUES (p_client_id, p_token_id, v_current_minute, v_current_hour, v_current_day, 1, 1, 1)
  ON CONFLICT (client_id, window_minute)
  DO UPDATE SET
    requests_this_minute = rate_limit_tracking.requests_this_minute + 1,
    requests_this_hour = rate_limit_tracking.requests_this_hour + 1,
    requests_this_day = rate_limit_tracking.requests_this_day + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get API analytics for a client
CREATE OR REPLACE FUNCTION get_api_analytics(
  p_client_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  rate_limited_requests BIGINT,
  average_response_time NUMERIC,
  p95_response_time NUMERIC,
  p99_response_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_requests,
    COUNT(*) FILTER (WHERE status = 'rate_limited')::BIGINT as rate_limited_requests,
    AVG(request_duration)::NUMERIC as average_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY request_duration)::NUMERIC as p95_response_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY request_duration)::NUMERIC as p99_response_time
  FROM api_access_logs
  WHERE client_id = p_client_id
    AND timestamp BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get webhook delivery statistics
CREATE OR REPLACE FUNCTION get_webhook_stats(
  p_webhook_id UUID
)
RETURNS TABLE (
  total_attempts BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  pending_deliveries BIGINT,
  average_delivery_time NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT as successful_deliveries,
    COUNT(*) FILTER (WHERE status IN ('failed', 'abandoned'))::BIGINT as failed_deliveries,
    COUNT(*) FILTER (WHERE status IN ('pending', 'retrying'))::BIGINT as pending_deliveries,
    AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) * 1000)::NUMERIC as average_delivery_time,
    (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100) as success_rate
  FROM webhook_delivery_attempts
  WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS (Adjust based on your user roles)
-- =====================================================

-- Grant permissions to api_user (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON registered_clients TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON external_api_tokens TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON api_access_logs TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_registrations TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_delivery_attempts TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON external_agent_requests TO api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_tracking TO api_user;
-- GRANT EXECUTE ON FUNCTION check_rate_limit TO api_user;
-- GRANT EXECUTE ON FUNCTION increment_rate_limit TO api_user;
-- GRANT EXECUTE ON FUNCTION get_api_analytics TO api_user;
-- GRANT EXECUTE ON FUNCTION get_webhook_stats TO api_user;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
