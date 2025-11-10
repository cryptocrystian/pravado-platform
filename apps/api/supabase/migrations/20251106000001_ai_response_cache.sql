-- =====================================================
-- AI RESPONSE CACHE MIGRATION
-- Sprint 70: LLM Insights & Explainability Layer
-- =====================================================
-- Performance caching layer to reduce cost and latency
-- for repeated LLM requests via prompt-hash cache

-- =====================================================
-- AI RESPONSE CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Cache key (SHA-256 hash of prompt + model + params)
  prompt_hash TEXT NOT NULL UNIQUE,

  -- Provider and model used
  provider TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Cached response
  response_json JSONB NOT NULL,

  -- Token usage
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,

  -- Cache metadata
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Indexing
  CONSTRAINT valid_tokens CHECK (tokens_in >= 0 AND tokens_out >= 0),
  CONSTRAINT valid_cost CHECK (estimated_cost_usd >= 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup index
CREATE INDEX idx_ai_response_cache_prompt_hash
  ON ai_response_cache(prompt_hash);

-- Provider/model analysis
CREATE INDEX idx_ai_response_cache_provider_model
  ON ai_response_cache(provider, model);

-- Expiration cleanup
CREATE INDEX idx_ai_response_cache_expires_at
  ON ai_response_cache(expires_at);

-- Hot cache analysis
CREATE INDEX idx_ai_response_cache_hit_count
  ON ai_response_cache(hit_count DESC);

-- Full-text search on response
CREATE INDEX idx_ai_response_cache_response_gin
  ON ai_response_cache USING gin(response_json);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get cache hit rate for a time period
 * Returns percentage of cache hits vs total requests
 */
CREATE OR REPLACE FUNCTION get_cache_hit_rate(
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now() - INTERVAL '24 hours',
  end_time TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS NUMERIC AS $$
DECLARE
  total_hits INTEGER;
  total_requests INTEGER;
BEGIN
  -- Count cache hits
  SELECT COALESCE(SUM(hit_count), 0)
  INTO total_hits
  FROM ai_response_cache
  WHERE last_accessed_at BETWEEN start_time AND end_time;

  -- Count total requests (from usage ledger)
  SELECT COALESCE(COUNT(*), 0)
  INTO total_requests
  FROM ai_usage_ledger
  WHERE created_at BETWEEN start_time AND end_time;

  -- Calculate hit rate
  IF total_requests = 0 THEN
    RETURN 0;
  END IF;

  RETURN (total_hits::NUMERIC / (total_hits + total_requests)::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get cache statistics summary
 */
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  total_entries BIGINT,
  total_hits BIGINT,
  avg_hits_per_entry NUMERIC,
  cache_size_mb NUMERIC,
  oldest_entry TIMESTAMP WITH TIME ZONE,
  newest_entry TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_entries,
    COALESCE(SUM(hit_count), 0)::BIGINT as total_hits,
    COALESCE(AVG(hit_count), 0) as avg_hits_per_entry,
    COALESCE(pg_total_relation_size('ai_response_cache')::NUMERIC / 1024 / 1024, 0) as cache_size_mb,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
  FROM ai_response_cache;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Cleanup expired cache entries
 * Returns number of entries deleted
 */
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_response_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

/**
 * Get most frequently cached prompts
 */
CREATE OR REPLACE FUNCTION get_hot_cache_entries(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  prompt_hash TEXT,
  provider TEXT,
  model TEXT,
  hit_count INTEGER,
  estimated_savings_usd NUMERIC,
  last_accessed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.prompt_hash,
    c.provider,
    c.model,
    c.hit_count,
    (c.estimated_cost_usd * c.hit_count) as estimated_savings_usd,
    c.last_accessed_at
  FROM ai_response_cache c
  ORDER BY c.hit_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- AUTOMATIC CLEANUP TRIGGER
-- =====================================================

/**
 * Function to update last_accessed_at on cache hit
 */
CREATE OR REPLACE FUNCTION update_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/**
 * Trigger to auto-update last_accessed_at
 */
CREATE TRIGGER trigger_update_cache_access
  BEFORE UPDATE ON ai_response_cache
  FOR EACH ROW
  WHEN (OLD.hit_count < NEW.hit_count)
  EXECUTE FUNCTION update_cache_access();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE ai_response_cache IS 'Sprint 70: LLM response cache for cost and latency optimization';
COMMENT ON COLUMN ai_response_cache.prompt_hash IS 'SHA-256 hash of prompt + model + params';
COMMENT ON COLUMN ai_response_cache.hit_count IS 'Number of times this cache entry was used';
COMMENT ON COLUMN ai_response_cache.expires_at IS 'Cache expiration timestamp (default 24h from creation)';

-- =====================================================
-- GRANTS (if using RLS)
-- =====================================================

-- Cache is global (not per-organization) for efficiency
-- No RLS needed since prompt_hash is anonymized
