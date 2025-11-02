-- =====================================================
-- AGENT MEMORY & LONG-TERM INTELLIGENCE
-- =====================================================
-- Memory architecture for agents to persist and recall past interactions
-- Supports semantic search, importance scoring, and temporal summarization

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE memory_type AS ENUM (
  'CONVERSATION',
  'TASK',
  'FACT',
  'SUMMARY',
  'REFLECTION'
);

-- =====================================================
-- AGENT MEMORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    memory_type memory_type NOT NULL,
    content TEXT NOT NULL,
    content_embedding VECTOR(1536),

    -- Context and relationships
    agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    related_campaign_id UUID,

    -- Metadata
    importance_score DECIMAL(3, 2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    context_tags TEXT[] DEFAULT '{}',

    -- Temporal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    -- Indexes
    CONSTRAINT valid_importance_score CHECK (importance_score >= 0 AND importance_score <= 1)
);

-- Indexes for performance
CREATE INDEX idx_agent_memories_agent_id ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_organization_id ON agent_memories(organization_id);
CREATE INDEX idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX idx_agent_memories_importance ON agent_memories(importance_score DESC);
CREATE INDEX idx_agent_memories_created_at ON agent_memories(created_at DESC);
CREATE INDEX idx_agent_memories_tags ON agent_memories USING GIN(context_tags);
CREATE INDEX idx_agent_memories_contact ON agent_memories(related_contact_id) WHERE related_contact_id IS NOT NULL;
CREATE INDEX idx_agent_memories_campaign ON agent_memories(related_campaign_id) WHERE related_campaign_id IS NOT NULL;

-- Vector index for semantic search
CREATE INDEX idx_agent_memories_embedding ON agent_memories
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE content_embedding IS NOT NULL;

-- =====================================================
-- AGENT MEMORY SNAPSHOTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_memory_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    snapshot_text TEXT NOT NULL,

    -- Time window for this snapshot
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    -- Metadata
    memory_count INTEGER DEFAULT 0,
    context_tags TEXT[] DEFAULT '{}',
    avg_importance DECIMAL(3, 2),

    -- Temporal
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Multi-tenancy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

    CONSTRAINT valid_time_window CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_agent_memory_snapshots_agent_id ON agent_memory_snapshots(agent_id);
CREATE INDEX idx_agent_memory_snapshots_organization_id ON agent_memory_snapshots(organization_id);
CREATE INDEX idx_agent_memory_snapshots_time ON agent_memory_snapshots(start_time, end_time);
CREATE INDEX idx_agent_memory_snapshots_created_at ON agent_memory_snapshots(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get agent memory context with semantic + metadata filtering
CREATE OR REPLACE FUNCTION get_agent_memory_context(
    p_agent_id VARCHAR(255),
    p_organization_id UUID,
    p_tags TEXT[] DEFAULT NULL,
    p_query_embedding VECTOR(1536) DEFAULT NULL,
    p_top_k INTEGER DEFAULT 10,
    p_similarity_threshold DECIMAL DEFAULT 0.7,
    p_min_importance DECIMAL DEFAULT 0.3
) RETURNS TABLE (
    id UUID,
    memory_type memory_type,
    content TEXT,
    importance_score DECIMAL,
    context_tags TEXT[],
    created_at TIMESTAMPTZ,
    similarity DECIMAL
) AS $$
BEGIN
    -- If query embedding is provided, do semantic search
    IF p_query_embedding IS NOT NULL THEN
        RETURN QUERY
        SELECT
            m.id,
            m.memory_type,
            m.content,
            m.importance_score,
            m.context_tags,
            m.created_at,
            (1 - (m.content_embedding <=> p_query_embedding))::DECIMAL AS similarity
        FROM agent_memories m
        WHERE
            m.agent_id = p_agent_id
            AND m.organization_id = p_organization_id
            AND m.importance_score >= p_min_importance
            AND (m.expires_at IS NULL OR m.expires_at > NOW())
            AND m.content_embedding IS NOT NULL
            AND (p_tags IS NULL OR m.context_tags && p_tags)
            AND (1 - (m.content_embedding <=> p_query_embedding)) >= p_similarity_threshold
        ORDER BY
            (1 - (m.content_embedding <=> p_query_embedding)) DESC,
            m.importance_score DESC,
            m.created_at DESC
        LIMIT p_top_k;
    ELSE
        -- Otherwise, retrieve by metadata and importance
        RETURN QUERY
        SELECT
            m.id,
            m.memory_type,
            m.content,
            m.importance_score,
            m.context_tags,
            m.created_at,
            NULL::DECIMAL AS similarity
        FROM agent_memories m
        WHERE
            m.agent_id = p_agent_id
            AND m.organization_id = p_organization_id
            AND m.importance_score >= p_min_importance
            AND (m.expires_at IS NULL OR m.expires_at > NOW())
            AND (p_tags IS NULL OR m.context_tags && p_tags)
        ORDER BY
            m.importance_score DESC,
            m.created_at DESC
        LIMIT p_top_k;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to insert agent memory with validation
CREATE OR REPLACE FUNCTION insert_agent_memory(
    p_agent_id VARCHAR(255),
    p_memory_type memory_type,
    p_content TEXT,
    p_content_embedding VECTOR(1536),
    p_organization_id UUID,
    p_agent_execution_id UUID DEFAULT NULL,
    p_related_contact_id UUID DEFAULT NULL,
    p_related_campaign_id UUID DEFAULT NULL,
    p_importance_score DECIMAL DEFAULT 0.5,
    p_context_tags TEXT[] DEFAULT '{}',
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_memory_id UUID;
BEGIN
    INSERT INTO agent_memories (
        agent_id,
        memory_type,
        content,
        content_embedding,
        organization_id,
        agent_execution_id,
        related_contact_id,
        related_campaign_id,
        importance_score,
        context_tags,
        expires_at
    ) VALUES (
        p_agent_id,
        p_memory_type,
        p_content,
        p_content_embedding,
        p_organization_id,
        p_agent_execution_id,
        p_related_contact_id,
        p_related_campaign_id,
        LEAST(GREATEST(p_importance_score, 0), 1),
        p_context_tags,
        p_expires_at
    )
    RETURNING id INTO v_memory_id;

    RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate memory snapshot for a time window
CREATE OR REPLACE FUNCTION generate_memory_snapshot(
    p_agent_id VARCHAR(255),
    p_organization_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_snapshot_text TEXT
) RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_memory_count INTEGER;
    v_avg_importance DECIMAL;
    v_all_tags TEXT[];
BEGIN
    -- Calculate statistics from memories in the time window
    SELECT
        COUNT(*),
        AVG(importance_score),
        ARRAY_AGG(DISTINCT tag)
    INTO
        v_memory_count,
        v_avg_importance,
        v_all_tags
    FROM agent_memories m,
         UNNEST(m.context_tags) AS tag
    WHERE
        m.agent_id = p_agent_id
        AND m.organization_id = p_organization_id
        AND m.created_at >= p_start_time
        AND m.created_at < p_end_time;

    -- Insert snapshot
    INSERT INTO agent_memory_snapshots (
        agent_id,
        snapshot_text,
        start_time,
        end_time,
        memory_count,
        context_tags,
        avg_importance,
        organization_id
    ) VALUES (
        p_agent_id,
        p_snapshot_text,
        p_start_time,
        p_end_time,
        COALESCE(v_memory_count, 0),
        COALESCE(v_all_tags, '{}'),
        v_avg_importance,
        p_organization_id
    )
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent memories for an agent
CREATE OR REPLACE FUNCTION get_recent_agent_memories(
    p_agent_id VARCHAR(255),
    p_organization_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_memory_types memory_type[] DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    memory_type memory_type,
    content TEXT,
    importance_score DECIMAL,
    context_tags TEXT[],
    created_at TIMESTAMPTZ,
    related_contact_id UUID,
    related_campaign_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.memory_type,
        m.content,
        m.importance_score,
        m.context_tags,
        m.created_at,
        m.related_contact_id,
        m.related_campaign_id
    FROM agent_memories m
    WHERE
        m.agent_id = p_agent_id
        AND m.organization_id = p_organization_id
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
        AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    ORDER BY
        m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to prune old low-importance memories
CREATE OR REPLACE FUNCTION prune_agent_memories(
    p_agent_id VARCHAR(255),
    p_organization_id UUID,
    p_older_than_days INTEGER DEFAULT 90,
    p_max_importance DECIMAL DEFAULT 0.3
) RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM agent_memories
    WHERE
        agent_id = p_agent_id
        AND organization_id = p_organization_id
        AND importance_score <= p_max_importance
        AND created_at < NOW() - (p_older_than_days || ' days')::INTERVAL
        AND (expires_at IS NULL OR expires_at > NOW());

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies for agent_memories
CREATE POLICY agent_memories_org_isolation ON agent_memories
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_memories_insert ON agent_memories
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Policies for agent_memory_snapshots
CREATE POLICY agent_memory_snapshots_org_isolation ON agent_memory_snapshots
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY agent_memory_snapshots_insert ON agent_memory_snapshots
    FOR INSERT
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_memories IS 'Stores agent memory entries with semantic embeddings for context-aware agent execution';
COMMENT ON TABLE agent_memory_snapshots IS 'Periodic summaries of agent memory for long-term storage and reflection';
COMMENT ON FUNCTION get_agent_memory_context IS 'Retrieve agent memories using semantic search and metadata filtering';
COMMENT ON FUNCTION insert_agent_memory IS 'Insert a new agent memory with validation';
COMMENT ON FUNCTION generate_memory_snapshot IS 'Create a temporal summary of agent memories';
COMMENT ON FUNCTION get_recent_agent_memories IS 'Get recent memories for an agent, optionally filtered by type';
COMMENT ON FUNCTION prune_agent_memories IS 'Delete old low-importance memories to manage storage';
