-- =====================================================
-- AGENT MEMORY SUMMARIES TABLE
-- Sprint 43 Phase 3.5.3
-- =====================================================
--
-- Purpose: Store GPT-4 generated summaries of agent memory
-- Enables efficient context retrieval and temporal awareness
--

-- Create memory scope enum
CREATE TYPE memory_scope AS ENUM ('short_term', 'long_term', 'session', 'historical');

-- Create summary type enum
CREATE TYPE summary_type AS ENUM ('short_term', 'long_term', 'topical', 'entity_based');

-- Create agent_memory_summaries table
CREATE TABLE IF NOT EXISTS agent_memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent and organization
  agent_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Summary classification
  summary_type summary_type NOT NULL,
  scope memory_scope NOT NULL,

  -- Summary content
  summary_text TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  entities JSONB NOT NULL DEFAULT '[]',
  trends TEXT[] NOT NULL DEFAULT '{}',

  -- Time period covered
  time_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Summary metadata
  entry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for querying by agent
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_agent_id
  ON agent_memory_summaries(agent_id);

-- Index for querying by organization
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_organization_id
  ON agent_memory_summaries(organization_id);

-- Index for querying by summary type
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_summary_type
  ON agent_memory_summaries(summary_type);

-- Index for querying by scope
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_scope
  ON agent_memory_summaries(scope);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_created_at
  ON agent_memory_summaries(created_at DESC);

-- Index for time period queries
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_time_period
  ON agent_memory_summaries(time_period_start, time_period_end);

-- Composite index for agent + scope + type
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_agent_scope_type
  ON agent_memory_summaries(agent_id, scope, summary_type, created_at DESC);

-- Composite index for organization analytics
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_org_created
  ON agent_memory_summaries(organization_id, created_at DESC);

-- GIN index for topics array
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_topics
  ON agent_memory_summaries USING GIN (topics);

-- GIN index for trends array
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_trends
  ON agent_memory_summaries USING GIN (trends);

-- GIN index for entities JSONB
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_entities
  ON agent_memory_summaries USING GIN (entities);

-- GIN index for metadata JSONB
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_metadata
  ON agent_memory_summaries USING GIN (metadata);

-- Full text search index on summary text
CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_summary_text_fts
  ON agent_memory_summaries USING GIN (to_tsvector('english', summary_text));

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE agent_memory_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view summaries from their organization
CREATE POLICY agent_memory_summaries_select_policy ON agent_memory_summaries
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only insert summaries for their organization
CREATE POLICY agent_memory_summaries_insert_policy ON agent_memory_summaries
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only update summaries from their organization
CREATE POLICY agent_memory_summaries_update_policy ON agent_memory_summaries
  FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Policy: Users can only delete summaries from their organization
CREATE POLICY agent_memory_summaries_delete_policy ON agent_memory_summaries
  FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get recent summary for agent
CREATE OR REPLACE FUNCTION get_recent_agent_summary(
  p_agent_id UUID,
  p_scope memory_scope,
  p_summary_type summary_type DEFAULT 'short_term'
)
RETURNS TABLE(
  id UUID,
  summary_text TEXT,
  topics TEXT[],
  entities JSONB,
  trends TEXT[],
  time_period_start TIMESTAMP WITH TIME ZONE,
  time_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ams.id,
    ams.summary_text,
    ams.topics,
    ams.entities,
    ams.trends,
    ams.time_period_start,
    ams.time_period_end,
    ams.created_at
  FROM agent_memory_summaries ams
  WHERE ams.agent_id = p_agent_id
    AND ams.scope = p_scope
    AND ams.summary_type = p_summary_type
  ORDER BY ams.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get summaries for time range
CREATE OR REPLACE FUNCTION get_summaries_for_time_range(
  p_agent_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  id UUID,
  summary_type summary_type,
  scope memory_scope,
  summary_text TEXT,
  topics TEXT[],
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ams.id,
    ams.summary_type,
    ams.scope,
    ams.summary_text,
    ams.topics,
    ams.created_at
  FROM agent_memory_summaries ams
  WHERE ams.agent_id = p_agent_id
    AND ams.time_period_start >= p_start_date
    AND ams.time_period_end <= p_end_date
  ORDER BY ams.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get top topics across all summaries for an agent
CREATE OR REPLACE FUNCTION get_agent_top_topics(
  p_agent_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  topic TEXT,
  occurrence_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(topics) as topic,
    COUNT(*) as occurrence_count
  FROM agent_memory_summaries
  WHERE agent_id = p_agent_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY topic
  ORDER BY occurrence_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get top entities across all summaries for an agent
CREATE OR REPLACE FUNCTION get_agent_top_entities(
  p_agent_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  entity_name TEXT,
  entity_type TEXT,
  mention_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (entity->>'name')::TEXT as entity_name,
    (entity->>'type')::TEXT as entity_type,
    SUM((entity->>'mentions')::INTEGER)::BIGINT as mention_count
  FROM agent_memory_summaries,
       jsonb_array_elements(entities) as entity
  WHERE agent_id = p_agent_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY entity_name, entity_type
  ORDER BY mention_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get trending topics (topics appearing in recent summaries)
CREATE OR REPLACE FUNCTION get_trending_topics(
  p_agent_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  topic TEXT,
  trend_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_topics AS (
    SELECT
      unnest(topics) as topic,
      created_at
    FROM agent_memory_summaries
    WHERE agent_id = p_agent_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  ),
  topic_frequency AS (
    SELECT
      topic,
      COUNT(*) as count,
      MAX(created_at) as last_seen
    FROM recent_topics
    GROUP BY topic
  )
  SELECT
    tf.topic,
    (tf.count::DECIMAL * (1 + EXTRACT(EPOCH FROM (NOW() - tf.last_seen)) / 86400)) as trend_score
  FROM topic_frequency tf
  ORDER BY trend_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function: Search summaries by text
CREATE OR REPLACE FUNCTION search_agent_summaries(
  p_agent_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  summary_text TEXT,
  topics TEXT[],
  relevance REAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ams.id,
    ams.summary_text,
    ams.topics,
    ts_rank(to_tsvector('english', ams.summary_text), plainto_tsquery('english', p_search_query)) as relevance,
    ams.created_at
  FROM agent_memory_summaries ams
  WHERE ams.agent_id = p_agent_id
    AND to_tsvector('english', ams.summary_text) @@ plainto_tsquery('english', p_search_query)
  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Cleanup old short-term summaries (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_short_term_summaries()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM agent_memory_summaries
  WHERE scope = 'short_term'
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_old_summaries
  AFTER INSERT ON agent_memory_summaries
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_short_term_summaries();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_memory_summaries IS 'GPT-4 generated summaries of agent memory for efficient context retrieval';
COMMENT ON COLUMN agent_memory_summaries.id IS 'Unique identifier for the summary';
COMMENT ON COLUMN agent_memory_summaries.agent_id IS 'ID of the agent this summary belongs to';
COMMENT ON COLUMN agent_memory_summaries.organization_id IS 'Organization context for multi-tenancy';
COMMENT ON COLUMN agent_memory_summaries.summary_type IS 'Type of summary (short_term, long_term, topical, entity_based)';
COMMENT ON COLUMN agent_memory_summaries.scope IS 'Temporal scope of the summary';
COMMENT ON COLUMN agent_memory_summaries.summary_text IS 'GPT-4 generated summary text';
COMMENT ON COLUMN agent_memory_summaries.topics IS 'Array of key topics extracted from memory';
COMMENT ON COLUMN agent_memory_summaries.entities IS 'JSONB array of key entities (people, orgs, concepts)';
COMMENT ON COLUMN agent_memory_summaries.trends IS 'Array of identified trends';
COMMENT ON COLUMN agent_memory_summaries.time_period_start IS 'Start of time period covered by summary';
COMMENT ON COLUMN agent_memory_summaries.time_period_end IS 'End of time period covered by summary';
COMMENT ON COLUMN agent_memory_summaries.entry_count IS 'Number of memory entries summarized';
COMMENT ON COLUMN agent_memory_summaries.metadata IS 'Additional summary metadata';
COMMENT ON COLUMN agent_memory_summaries.created_at IS 'Timestamp when summary was created';

COMMENT ON FUNCTION get_recent_agent_summary IS 'Get the most recent summary for an agent by scope and type';
COMMENT ON FUNCTION get_summaries_for_time_range IS 'Get all summaries covering a specific time range';
COMMENT ON FUNCTION get_agent_top_topics IS 'Get the most frequently occurring topics for an agent';
COMMENT ON FUNCTION get_agent_top_entities IS 'Get the most frequently mentioned entities for an agent';
COMMENT ON FUNCTION get_trending_topics IS 'Get currently trending topics for an agent';
COMMENT ON FUNCTION search_agent_summaries IS 'Full-text search across agent summaries';
