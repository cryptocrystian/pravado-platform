-- =====================================================
-- MEMORY LIFECYCLE MIGRATION
-- Sprint 37: Autonomous memory pruning, aging, and lifespan management
-- =====================================================

-- =====================================================
-- EXTEND AGENT_MEMORY_EPISODES TABLE
-- =====================================================

-- Add lifecycle columns to agent_memory_episodes
ALTER TABLE agent_memory_episodes
ADD COLUMN IF NOT EXISTS age_score DECIMAL(5, 2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS decay_factor DECIMAL(3, 2) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS compressed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compressed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reinforced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reinforcement_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pruned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pruned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retention_priority INTEGER DEFAULT 50;

-- Add comments
COMMENT ON COLUMN agent_memory_episodes.age_score IS 'Current age score (0-100), decays over time unless reinforced';
COMMENT ON COLUMN agent_memory_episodes.decay_factor IS 'Rate of decay per day (0.01 = 1% per day)';
COMMENT ON COLUMN agent_memory_episodes.compressed IS 'Whether memory has been compressed';
COMMENT ON COLUMN agent_memory_episodes.compressed_at IS 'When memory was last compressed';
COMMENT ON COLUMN agent_memory_episodes.archived_at IS 'When memory was archived';
COMMENT ON COLUMN agent_memory_episodes.last_reinforced_at IS 'Last time memory was reinforced (accessed/linked)';
COMMENT ON COLUMN agent_memory_episodes.reinforcement_count IS 'Number of times memory has been reinforced';
COMMENT ON COLUMN agent_memory_episodes.pruned IS 'Whether memory has been pruned (soft delete)';
COMMENT ON COLUMN agent_memory_episodes.pruned_at IS 'When memory was pruned';
COMMENT ON COLUMN agent_memory_episodes.retention_priority IS 'Priority score for retention (0-100)';

-- =====================================================
-- EXTEND AGENT_MEMORY_CHUNKS TABLE
-- =====================================================

-- Add lifecycle columns to agent_memory_chunks
ALTER TABLE agent_memory_chunks
ADD COLUMN IF NOT EXISTS compressed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compressed_content TEXT,
ADD COLUMN IF NOT EXISTS compressed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_size INTEGER,
ADD COLUMN IF NOT EXISTS compressed_size INTEGER,
ADD COLUMN IF NOT EXISTS compression_ratio DECIMAL(5, 2);

-- Add comments
COMMENT ON COLUMN agent_memory_chunks.compressed IS 'Whether chunk has been compressed';
COMMENT ON COLUMN agent_memory_chunks.compressed_content IS 'Compressed version of chunk content';
COMMENT ON COLUMN agent_memory_chunks.compressed_at IS 'When chunk was compressed';
COMMENT ON COLUMN agent_memory_chunks.original_size IS 'Original content size in characters';
COMMENT ON COLUMN agent_memory_chunks.compressed_size IS 'Compressed content size in characters';
COMMENT ON COLUMN agent_memory_chunks.compression_ratio IS 'Compression ratio (compressed/original)';

-- =====================================================
-- CREATE MEMORY LIFECYCLE TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_memory_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES agent_memory_episodes(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'AGED', 'COMPRESSED', 'PRUNED', 'ARCHIVED', 'REINFORCED', 'ASSESSED'
  previous_age_score DECIMAL(5, 2),
  new_age_score DECIMAL(5, 2),
  previous_importance DECIMAL(5, 2),
  new_importance DECIMAL(5, 2),

  -- AI-generated insights
  reasoning TEXT,
  recommendation TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  triggered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lifecycle_events_episode ON agent_memory_lifecycle_events(episode_id);
CREATE INDEX idx_lifecycle_events_org ON agent_memory_lifecycle_events(organization_id);
CREATE INDEX idx_lifecycle_events_type ON agent_memory_lifecycle_events(event_type);
CREATE INDEX idx_lifecycle_events_created ON agent_memory_lifecycle_events(created_at DESC);

-- Add RLS
ALTER TABLE agent_memory_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY lifecycle_events_org_isolation ON agent_memory_lifecycle_events
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- CREATE INDEXES FOR LIFECYCLE QUERIES
-- =====================================================

-- Index for age-based queries
CREATE INDEX IF NOT EXISTS idx_episodes_age_score ON agent_memory_episodes(age_score DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_decay_factor ON agent_memory_episodes(decay_factor);

-- Index for compression queries
CREATE INDEX IF NOT EXISTS idx_episodes_compressed ON agent_memory_episodes(compressed, compressed_at);
CREATE INDEX IF NOT EXISTS idx_chunks_compressed ON agent_memory_chunks(compressed);

-- Index for pruning queries
CREATE INDEX IF NOT EXISTS idx_episodes_pruned ON agent_memory_episodes(pruned, pruned_at);
CREATE INDEX IF NOT EXISTS idx_episodes_archived ON agent_memory_episodes(archived_at);

-- Index for retention queries
CREATE INDEX IF NOT EXISTS idx_episodes_retention ON agent_memory_episodes(retention_priority DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_expires ON agent_memory_episodes(expires_at);

-- Index for reinforcement tracking
CREATE INDEX IF NOT EXISTS idx_episodes_reinforced ON agent_memory_episodes(last_reinforced_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_reinforcement_count ON agent_memory_episodes(reinforcement_count DESC);

-- Composite index for lifecycle operations
CREATE INDEX IF NOT EXISTS idx_episodes_lifecycle ON agent_memory_episodes(
  organization_id,
  pruned,
  archived_at,
  age_score,
  retention_priority
);

-- =====================================================
-- POSTGRESQL FUNCTIONS FOR LIFECYCLE OPERATIONS
-- =====================================================

-- Function to age memory episodes (reduce age score over time)
CREATE OR REPLACE FUNCTION age_memory_episodes(
  p_organization_id UUID,
  p_days_since_last_run INTEGER DEFAULT 1
)
RETURNS TABLE (
  episode_id UUID,
  title TEXT,
  previous_age_score DECIMAL,
  new_age_score DECIMAL,
  decay_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH aged_episodes AS (
    UPDATE agent_memory_episodes
    SET
      age_score = GREATEST(
        0,
        age_score - (decay_factor * p_days_since_last_run)
      ),
      updated_at = NOW()
    WHERE
      organization_id = p_organization_id
      AND pruned = FALSE
      AND archived_at IS NULL
      AND age_score > 0
    RETURNING
      id,
      title,
      age_score + (decay_factor * p_days_since_last_run) AS prev_score,
      age_score AS curr_score,
      (decay_factor * p_days_since_last_run) AS decay_amt
  )
  SELECT
    id,
    title,
    prev_score,
    curr_score,
    decay_amt
  FROM aged_episodes;
END;
$$ LANGUAGE plpgsql;

-- Function to reinforce memory (increase age score on access)
CREATE OR REPLACE FUNCTION reinforce_memory_episode(
  p_episode_id UUID,
  p_reinforcement_amount DECIMAL DEFAULT 10.0
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_memory_episodes
  SET
    age_score = LEAST(100, age_score + p_reinforcement_amount),
    last_reinforced_at = NOW(),
    reinforcement_count = reinforcement_count + 1,
    updated_at = NOW()
  WHERE id = p_episode_id;
END;
$$ LANGUAGE plpgsql;

-- Function to identify compression candidates
CREATE OR REPLACE FUNCTION get_compression_candidates(
  p_organization_id UUID,
  p_age_threshold DECIMAL DEFAULT 30.0,
  p_min_size INTEGER DEFAULT 1000,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  episode_id UUID,
  title TEXT,
  content_length INTEGER,
  age_score DECIMAL,
  importance_score DECIMAL,
  last_accessed_at TIMESTAMPTZ,
  days_since_access INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    LENGTH(e.content),
    e.age_score,
    e.importance_score,
    e.last_accessed_at,
    COALESCE(
      EXTRACT(DAY FROM (NOW() - e.last_accessed_at))::INTEGER,
      EXTRACT(DAY FROM (NOW() - e.created_at))::INTEGER
    )
  FROM agent_memory_episodes e
  WHERE
    e.organization_id = p_organization_id
    AND e.compressed = FALSE
    AND e.pruned = FALSE
    AND e.archived_at IS NULL
    AND e.age_score < p_age_threshold
    AND LENGTH(e.content) > p_min_size
  ORDER BY
    e.age_score ASC,
    LENGTH(e.content) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to identify pruning candidates
CREATE OR REPLACE FUNCTION get_pruning_candidates(
  p_organization_id UUID,
  p_age_threshold DECIMAL DEFAULT 10.0,
  p_importance_threshold DECIMAL DEFAULT 20.0,
  p_days_inactive INTEGER DEFAULT 90,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  episode_id UUID,
  title TEXT,
  age_score DECIMAL,
  importance_score DECIMAL,
  access_count INTEGER,
  days_since_access INTEGER,
  memory_type TEXT,
  retention_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.age_score,
    e.importance_score,
    e.access_count,
    COALESCE(
      EXTRACT(DAY FROM (NOW() - e.last_accessed_at))::INTEGER,
      EXTRACT(DAY FROM (NOW() - e.created_at))::INTEGER
    ),
    e.memory_type::TEXT,
    e.retention_priority
  FROM agent_memory_episodes e
  WHERE
    e.organization_id = p_organization_id
    AND e.pruned = FALSE
    AND e.archived_at IS NULL
    AND (
      (e.age_score < p_age_threshold AND e.importance_score < p_importance_threshold)
      OR (e.expires_at IS NOT NULL AND e.expires_at < NOW())
      OR (
        COALESCE(e.last_accessed_at, e.created_at) < NOW() - (p_days_inactive || ' days')::INTERVAL
        AND e.access_count = 0
      )
    )
  ORDER BY
    e.age_score ASC,
    e.importance_score ASC,
    e.retention_priority ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to archive episodes
CREATE OR REPLACE FUNCTION archive_memory_episodes(
  p_episode_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE agent_memory_episodes
  SET
    status = 'ARCHIVED',
    archived_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(p_episode_ids)
    AND pruned = FALSE;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to prune episodes (soft delete)
CREATE OR REPLACE FUNCTION prune_memory_episodes(
  p_episode_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  pruned_count INTEGER;
BEGIN
  UPDATE agent_memory_episodes
  SET
    pruned = TRUE,
    pruned_at = NOW(),
    status = 'ARCHIVED',
    updated_at = NOW()
  WHERE id = ANY(p_episode_ids)
    AND pruned = FALSE;

  GET DIAGNOSTICS pruned_count = ROW_COUNT;
  RETURN pruned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate retention priority
CREATE OR REPLACE FUNCTION calculate_retention_priority(
  p_episode_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_priority INTEGER;
  v_age_score DECIMAL;
  v_importance DECIMAL;
  v_access_count INTEGER;
  v_reinforcement_count INTEGER;
  v_days_old INTEGER;
BEGIN
  SELECT
    age_score,
    importance_score,
    access_count,
    reinforcement_count,
    EXTRACT(DAY FROM (NOW() - created_at))::INTEGER
  INTO
    v_age_score,
    v_importance,
    v_access_count,
    v_reinforcement_count,
    v_days_old
  FROM agent_memory_episodes
  WHERE id = p_episode_id;

  -- Priority calculation: weighted combination of factors
  -- Age score: 30%, Importance: 40%, Access: 20%, Reinforcement: 10%
  v_priority := ROUND(
    (v_age_score * 0.3) +
    (v_importance * 0.4) +
    (LEAST(100, v_access_count * 10) * 0.2) +
    (LEAST(100, v_reinforcement_count * 5) * 0.1)
  )::INTEGER;

  -- Update the episode
  UPDATE agent_memory_episodes
  SET
    retention_priority = v_priority,
    updated_at = NOW()
  WHERE id = p_episode_id;

  RETURN v_priority;
END;
$$ LANGUAGE plpgsql;

-- Function to get memory lifecycle dashboard
CREATE OR REPLACE FUNCTION get_memory_lifecycle_dashboard(
  p_organization_id UUID
)
RETURNS TABLE (
  total_episodes INTEGER,
  active_episodes INTEGER,
  compressed_episodes INTEGER,
  pruned_episodes INTEGER,
  archived_episodes INTEGER,
  avg_age_score DECIMAL,
  avg_retention_priority DECIMAL,
  compression_candidates INTEGER,
  pruning_candidates INTEGER,
  total_memory_size BIGINT,
  compressed_memory_size BIGINT,
  compression_savings_pct DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE pruned = FALSE AND archived_at IS NULL)::INTEGER,
    COUNT(*) FILTER (WHERE compressed = TRUE)::INTEGER,
    COUNT(*) FILTER (WHERE pruned = TRUE)::INTEGER,
    COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::INTEGER,
    COALESCE(AVG(age_score) FILTER (WHERE pruned = FALSE), 0)::DECIMAL,
    COALESCE(AVG(retention_priority) FILTER (WHERE pruned = FALSE), 0)::DECIMAL,
    COUNT(*) FILTER (WHERE compressed = FALSE AND age_score < 30 AND LENGTH(content) > 1000)::INTEGER,
    COUNT(*) FILTER (WHERE pruned = FALSE AND age_score < 10 AND importance_score < 20)::INTEGER,
    COALESCE(SUM(LENGTH(content)), 0),
    COALESCE(SUM(LENGTH(summary)) FILTER (WHERE compressed = TRUE), 0),
    CASE
      WHEN SUM(LENGTH(content)) > 0 THEN
        ROUND((1 - (COALESCE(SUM(LENGTH(summary)) FILTER (WHERE compressed = TRUE), 0)::DECIMAL / SUM(LENGTH(content)))) * 100, 2)
      ELSE 0
    END
  FROM agent_memory_episodes
  WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC LIFECYCLE MANAGEMENT
-- =====================================================

-- Trigger to automatically reinforce memory on access
CREATE OR REPLACE FUNCTION trigger_reinforce_on_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_count > OLD.access_count THEN
    NEW.age_score := LEAST(100, NEW.age_score + 5);
    NEW.last_reinforced_at := NOW();
    NEW.reinforcement_count := NEW.reinforcement_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reinforce_memory_on_access
  BEFORE UPDATE OF access_count ON agent_memory_episodes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reinforce_on_access();

-- Trigger to set initial age score based on importance
CREATE OR REPLACE FUNCTION trigger_set_initial_age_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.age_score = 100.0 THEN
    NEW.age_score := NEW.importance_score;
  END IF;

  -- Set decay factor based on memory type
  CASE NEW.memory_type
    WHEN 'CORRECTION' THEN
      NEW.decay_factor := 0.005; -- Slower decay for corrections
    WHEN 'INSIGHT' THEN
      NEW.decay_factor := 0.005; -- Slower decay for insights
    WHEN 'GOAL' THEN
      NEW.decay_factor := 0.003; -- Very slow decay for goals
    WHEN 'OBSERVATION' THEN
      NEW.decay_factor := 0.02; -- Faster decay for observations
    WHEN 'CONTEXT' THEN
      NEW.decay_factor := 0.015; -- Medium decay for context
    ELSE
      NEW.decay_factor := 0.01; -- Default decay
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_initial_lifecycle_values
  BEFORE INSERT ON agent_memory_episodes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_initial_age_score();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON agent_memory_lifecycle_events TO authenticated;
GRANT EXECUTE ON FUNCTION age_memory_episodes TO authenticated;
GRANT EXECUTE ON FUNCTION reinforce_memory_episode TO authenticated;
GRANT EXECUTE ON FUNCTION get_compression_candidates TO authenticated;
GRANT EXECUTE ON FUNCTION get_pruning_candidates TO authenticated;
GRANT EXECUTE ON FUNCTION archive_memory_episodes TO authenticated;
GRANT EXECUTE ON FUNCTION prune_memory_episodes TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_retention_priority TO authenticated;
GRANT EXECUTE ON FUNCTION get_memory_lifecycle_dashboard TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_memory_lifecycle_events IS 'Tracks lifecycle events for memory episodes (aging, compression, pruning)';
COMMENT ON FUNCTION age_memory_episodes IS 'Ages all memory episodes by reducing their age score based on decay factor';
COMMENT ON FUNCTION reinforce_memory_episode IS 'Reinforces a memory episode by increasing its age score (called on access)';
COMMENT ON FUNCTION get_compression_candidates IS 'Returns episodes that are candidates for compression';
COMMENT ON FUNCTION get_pruning_candidates IS 'Returns episodes that are candidates for pruning/archival';
COMMENT ON FUNCTION archive_memory_episodes IS 'Archives memory episodes by setting archived_at timestamp';
COMMENT ON FUNCTION prune_memory_episodes IS 'Prunes (soft deletes) memory episodes';
COMMENT ON FUNCTION calculate_retention_priority IS 'Calculates and updates retention priority score for an episode';
COMMENT ON FUNCTION get_memory_lifecycle_dashboard IS 'Returns comprehensive lifecycle metrics for memory management';
