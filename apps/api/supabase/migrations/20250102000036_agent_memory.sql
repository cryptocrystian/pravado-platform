-- =====================================================
-- AGENT MEMORY + EPISODIC CONTEXT ENGINE
-- Sprint 36: Long-term agent memory and contextual recall
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE memory_type AS ENUM (
  'OBSERVATION',
  'GOAL',
  'DECISION',
  'DIALOGUE',
  'CONTEXT',
  'CORRECTION',
  'INSIGHT'
);

CREATE TYPE memory_status AS ENUM (
  'ACTIVE',
  'ARCHIVED',
  'REDACTED'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Agent Memory Episodes Table
CREATE TABLE agent_memory_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Memory metadata
  memory_type memory_type NOT NULL,
  status memory_status NOT NULL DEFAULT 'ACTIVE',

  -- Context
  agent_id UUID, -- Agent that created this memory
  thread_id TEXT, -- Conversation/interaction thread
  session_id TEXT, -- Session identifier

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,

  -- Contextual data
  context JSONB DEFAULT '{}', -- Situational context
  metadata JSONB DEFAULT '{}', -- Additional metadata

  -- Embeddings (for vector search)
  embedding VECTOR(1536), -- OpenAI embedding vector

  -- Importance and usage
  importance_score DECIMAL(5,2) DEFAULT 50.0 CHECK (importance_score >= 0 AND importance_score <= 100),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Temporal
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory Chunks Table (for large memories)
CREATE TABLE agent_memory_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES agent_memory_episodes(id) ON DELETE CASCADE,

  -- Chunk data
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  chunk_summary TEXT,

  -- Embeddings
  embedding VECTOR(1536),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory Links Table
CREATE TABLE agent_memory_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES agent_memory_episodes(id) ON DELETE CASCADE,

  -- Link targets
  campaign_id UUID,
  contact_id UUID,
  goal_id UUID,
  evaluation_id UUID,
  agent_run_id UUID,

  -- Link metadata
  link_type TEXT, -- 'reference', 'outcome', 'context', etc.
  relevance_score DECIMAL(5,2) DEFAULT 50.0,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory Events Table
CREATE TABLE agent_memory_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES agent_memory_episodes(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'CREATED', 'ACCESSED', 'SUMMARIZED', 'ARCHIVED', 'REDACTED'
  description TEXT,

  -- Event data
  event_data JSONB DEFAULT '{}',

  -- Tracking
  triggered_by UUID, -- User or agent ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Memory Episodes Indexes
CREATE INDEX idx_agent_memory_episodes_org ON agent_memory_episodes(organization_id);
CREATE INDEX idx_agent_memory_episodes_agent ON agent_memory_episodes(agent_id);
CREATE INDEX idx_agent_memory_episodes_thread ON agent_memory_episodes(thread_id);
CREATE INDEX idx_agent_memory_episodes_session ON agent_memory_episodes(session_id);
CREATE INDEX idx_agent_memory_episodes_type ON agent_memory_episodes(memory_type);
CREATE INDEX idx_agent_memory_episodes_status ON agent_memory_episodes(status);
CREATE INDEX idx_agent_memory_episodes_occurred ON agent_memory_episodes(occurred_at DESC);
CREATE INDEX idx_agent_memory_episodes_importance ON agent_memory_episodes(importance_score DESC);
CREATE INDEX idx_agent_memory_episodes_embedding ON agent_memory_episodes USING ivfflat (embedding vector_cosine_ops);

-- Memory Chunks Indexes
CREATE INDEX idx_agent_memory_chunks_episode ON agent_memory_chunks(episode_id);
CREATE INDEX idx_agent_memory_chunks_index ON agent_memory_chunks(chunk_index);
CREATE INDEX idx_agent_memory_chunks_embedding ON agent_memory_chunks USING ivfflat (embedding vector_cosine_ops);

-- Memory Links Indexes
CREATE INDEX idx_agent_memory_links_episode ON agent_memory_links(episode_id);
CREATE INDEX idx_agent_memory_links_campaign ON agent_memory_links(campaign_id);
CREATE INDEX idx_agent_memory_links_contact ON agent_memory_links(contact_id);
CREATE INDEX idx_agent_memory_links_goal ON agent_memory_links(goal_id);
CREATE INDEX idx_agent_memory_links_evaluation ON agent_memory_links(evaluation_id);
CREATE INDEX idx_agent_memory_links_agent_run ON agent_memory_links(agent_run_id);

-- Memory Events Indexes
CREATE INDEX idx_agent_memory_events_episode ON agent_memory_events(episode_id);
CREATE INDEX idx_agent_memory_events_type ON agent_memory_events(event_type);
CREATE INDEX idx_agent_memory_events_created ON agent_memory_events(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE agent_memory_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_events ENABLE ROW LEVEL SECURITY;

-- Memory Episodes Policies
CREATE POLICY agent_memory_episodes_org_isolation ON agent_memory_episodes
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Memory Chunks Policies
CREATE POLICY agent_memory_chunks_org_isolation ON agent_memory_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_memory_episodes
      WHERE agent_memory_episodes.id = agent_memory_chunks.episode_id
      AND agent_memory_episodes.organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- Memory Links Policies
CREATE POLICY agent_memory_links_org_isolation ON agent_memory_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_memory_episodes
      WHERE agent_memory_episodes.id = agent_memory_links.episode_id
      AND agent_memory_episodes.organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- Memory Events Policies
CREATE POLICY agent_memory_events_org_isolation ON agent_memory_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_memory_episodes
      WHERE agent_memory_episodes.id = agent_memory_events.episode_id
      AND agent_memory_episodes.organization_id = current_setting('app.current_organization_id')::UUID
    )
  );

-- =====================================================
-- POSTGRESQL FUNCTIONS
-- =====================================================

/**
 * Store Memory Episode
 * Creates a new memory episode with context
 */
CREATE OR REPLACE FUNCTION store_memory_episode(
  p_organization_id UUID,
  p_memory_type memory_type,
  p_agent_id UUID DEFAULT NULL,
  p_thread_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_title TEXT,
  p_content TEXT,
  p_context JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}',
  p_importance_score DECIMAL DEFAULT 50.0,
  p_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_episode_id UUID;
BEGIN
  -- Create memory episode
  INSERT INTO agent_memory_episodes (
    organization_id,
    memory_type,
    agent_id,
    thread_id,
    session_id,
    title,
    content,
    context,
    metadata,
    importance_score,
    occurred_at,
    created_by
  ) VALUES (
    p_organization_id,
    p_memory_type,
    p_agent_id,
    p_thread_id,
    p_session_id,
    p_title,
    p_content,
    p_context,
    p_metadata,
    p_importance_score,
    p_occurred_at,
    p_created_by
  )
  RETURNING id INTO v_episode_id;

  -- Log creation event
  INSERT INTO agent_memory_events (
    episode_id,
    event_type,
    description,
    event_data,
    triggered_by
  ) VALUES (
    v_episode_id,
    'CREATED',
    'Memory episode created: ' || p_title,
    jsonb_build_object('memory_type', p_memory_type, 'importance', p_importance_score),
    p_created_by
  );

  RETURN v_episode_id;
END;
$$;

/**
 * Link Memory References
 * Associates memory with campaigns, contacts, goals, etc.
 */
CREATE OR REPLACE FUNCTION link_memory_references(
  p_episode_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_goal_id UUID DEFAULT NULL,
  p_evaluation_id UUID DEFAULT NULL,
  p_agent_run_id UUID DEFAULT NULL,
  p_link_type TEXT DEFAULT 'reference',
  p_relevance_score DECIMAL DEFAULT 50.0
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  INSERT INTO agent_memory_links (
    episode_id,
    campaign_id,
    contact_id,
    goal_id,
    evaluation_id,
    agent_run_id,
    link_type,
    relevance_score
  ) VALUES (
    p_episode_id,
    p_campaign_id,
    p_contact_id,
    p_goal_id,
    p_evaluation_id,
    p_agent_run_id,
    p_link_type,
    p_relevance_score
  )
  RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$$;

/**
 * Search Memory
 * Vector-based semantic search
 */
CREATE OR REPLACE FUNCTION search_memory(
  p_organization_id UUID,
  p_query_embedding VECTOR(1536),
  p_memory_type memory_type DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_thread_id TEXT DEFAULT NULL,
  p_min_importance DECIMAL DEFAULT 0,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  episode_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  memory_type memory_type,
  importance_score DECIMAL,
  occurred_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ame.id AS episode_id,
    ame.title,
    ame.content,
    ame.summary,
    ame.memory_type,
    ame.importance_score,
    ame.occurred_at,
    1 - (ame.embedding <=> p_query_embedding) AS similarity
  FROM agent_memory_episodes ame
  WHERE ame.organization_id = p_organization_id
  AND ame.status = 'ACTIVE'
  AND ame.embedding IS NOT NULL
  AND (p_memory_type IS NULL OR ame.memory_type = p_memory_type)
  AND (p_agent_id IS NULL OR ame.agent_id = p_agent_id)
  AND (p_thread_id IS NULL OR ame.thread_id = p_thread_id)
  AND ame.importance_score >= p_min_importance
  ORDER BY ame.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

/**
 * Summarize Memory Episode
 * Get memory summary with stats
 */
CREATE OR REPLACE FUNCTION summarize_memory_episode(
  p_organization_id UUID,
  p_episode_id UUID
)
RETURNS TABLE (
  episode_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  memory_type memory_type,
  importance_score DECIMAL,
  access_count INTEGER,
  last_accessed_at TIMESTAMPTZ,
  linked_campaigns INTEGER,
  linked_contacts INTEGER,
  linked_goals INTEGER,
  total_events INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ame.id AS episode_id,
    ame.title,
    ame.content,
    ame.summary,
    ame.memory_type,
    ame.importance_score,
    ame.access_count,
    ame.last_accessed_at,
    COUNT(DISTINCT aml.campaign_id)::INTEGER AS linked_campaigns,
    COUNT(DISTINCT aml.contact_id)::INTEGER AS linked_contacts,
    COUNT(DISTINCT aml.goal_id)::INTEGER AS linked_goals,
    (
      SELECT COUNT(*)::INTEGER
      FROM agent_memory_events
      WHERE episode_id = p_episode_id
    ) AS total_events
  FROM agent_memory_episodes ame
  LEFT JOIN agent_memory_links aml ON aml.episode_id = ame.id
  WHERE ame.id = p_episode_id
  AND ame.organization_id = p_organization_id
  GROUP BY ame.id;
END;
$$;

/**
 * Get Memory Dashboard
 * Returns comprehensive memory analytics
 */
CREATE OR REPLACE FUNCTION get_memory_dashboard(
  p_organization_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_period_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_period_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_episodes BIGINT,
  active_episodes BIGINT,
  archived_episodes BIGINT,
  total_chunks BIGINT,
  total_links BIGINT,
  avg_importance DECIMAL,
  total_accesses BIGINT,
  episodes_by_type JSONB,
  most_accessed_episodes JSONB,
  recent_episodes JSONB,
  memory_timeline JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Episode counts
    COUNT(*)::BIGINT AS total_episodes,
    COUNT(*) FILTER (WHERE status = 'ACTIVE')::BIGINT AS active_episodes,
    COUNT(*) FILTER (WHERE status = 'ARCHIVED')::BIGINT AS archived_episodes,

    -- Chunk count
    (
      SELECT COUNT(*)::BIGINT
      FROM agent_memory_chunks amc
      JOIN agent_memory_episodes ame ON ame.id = amc.episode_id
      WHERE ame.organization_id = p_organization_id
      AND (p_agent_id IS NULL OR ame.agent_id = p_agent_id)
    ) AS total_chunks,

    -- Link count
    (
      SELECT COUNT(*)::BIGINT
      FROM agent_memory_links aml
      JOIN agent_memory_episodes ame ON ame.id = aml.episode_id
      WHERE ame.organization_id = p_organization_id
      AND (p_agent_id IS NULL OR ame.agent_id = p_agent_id)
    ) AS total_links,

    -- Average importance
    AVG(importance_score)::DECIMAL(5,2) AS avg_importance,

    -- Total accesses
    SUM(access_count)::BIGINT AS total_accesses,

    -- Episodes by type
    (
      SELECT jsonb_object_agg(memory_type, count)
      FROM (
        SELECT
          memory_type::TEXT AS memory_type,
          COUNT(*)::INTEGER AS count
        FROM agent_memory_episodes
        WHERE organization_id = p_organization_id
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND occurred_at >= p_period_start
        AND occurred_at <= p_period_end
        GROUP BY memory_type
      ) type_counts
    ) AS episodes_by_type,

    -- Most accessed episodes
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'episode_id', id,
          'title', title,
          'memory_type', memory_type,
          'access_count', access_count,
          'importance_score', importance_score
        )
        ORDER BY access_count DESC
      )
      FROM (
        SELECT id, title, memory_type, access_count, importance_score
        FROM agent_memory_episodes
        WHERE organization_id = p_organization_id
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND status = 'ACTIVE'
        ORDER BY access_count DESC NULLS LAST
        LIMIT 10
      ) top_accessed
    ) AS most_accessed_episodes,

    -- Recent episodes
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'episode_id', id,
          'title', title,
          'memory_type', memory_type,
          'occurred_at', occurred_at,
          'importance_score', importance_score
        )
        ORDER BY occurred_at DESC
      )
      FROM (
        SELECT id, title, memory_type, occurred_at, importance_score
        FROM agent_memory_episodes
        WHERE organization_id = p_organization_id
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        ORDER BY occurred_at DESC
        LIMIT 10
      ) recent
    ) AS recent_episodes,

    -- Memory timeline
    (
      SELECT jsonb_object_agg(date::TEXT, count)
      FROM (
        SELECT
          DATE(occurred_at) AS date,
          COUNT(*)::INTEGER AS count
        FROM agent_memory_episodes
        WHERE organization_id = p_organization_id
        AND (p_agent_id IS NULL OR agent_id = p_agent_id)
        AND occurred_at >= p_period_start
        AND occurred_at <= p_period_end
        GROUP BY DATE(occurred_at)
        ORDER BY date
      ) timeline
    ) AS memory_timeline

  FROM agent_memory_episodes
  WHERE organization_id = p_organization_id
  AND (p_agent_id IS NULL OR agent_id = p_agent_id)
  AND occurred_at >= p_period_start
  AND occurred_at <= p_period_end;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for agent_memory_episodes
CREATE TRIGGER update_agent_memory_episodes_timestamp
  BEFORE UPDATE ON agent_memory_episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update access count trigger
CREATE OR REPLACE FUNCTION update_memory_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE agent_memory_episodes
  SET
    access_count = COALESCE(access_count, 0) + 1,
    last_accessed_at = NOW()
  WHERE id = NEW.episode_id
  AND NEW.event_type = 'ACCESSED';

  RETURN NEW;
END;
$$;

CREATE TRIGGER track_memory_access
  AFTER INSERT ON agent_memory_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'ACCESSED')
  EXECUTE FUNCTION update_memory_access();
