-- =====================================================
-- AI MEMORY + LONG-TERM STRATEGY LAYER
-- Migration: 20250102000022_ai_memory_strategy.sql
-- =====================================================

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ENUMS
-- =====================================================

/**
 * Memory type enumeration
 */
CREATE TYPE memory_type AS ENUM (
  'PLANNING',
  'INSIGHT',
  'ERROR',
  'SUCCESS',
  'STRATEGY',
  'LEARNING',
  'DECISION',
  'OUTCOME'
);

/**
 * Knowledge graph node type
 */
CREATE TYPE kg_node_type AS ENUM (
  'CAMPAIGN',
  'CONTACT',
  'TOPIC',
  'MESSAGE',
  'OUTCOME',
  'DECISION',
  'INSIGHT',
  'PATTERN',
  'STRATEGY'
);

/**
 * Knowledge graph edge type
 */
CREATE TYPE kg_edge_type AS ENUM (
  'TARGETS',
  'RELATES_TO',
  'INFLUENCES',
  'RESULTS_IN',
  'CAUSED_BY',
  'SIMILAR_TO',
  'PART_OF',
  'DEPENDS_ON',
  'LEADS_TO'
);

-- =====================================================
-- AGENT MEMORIES
-- =====================================================

/**
 * agent_memories - Long-term agent memory storage with vector embeddings
 */
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Memory identification
  memory_id VARCHAR(255) UNIQUE NOT NULL,

  -- Agent context
  agent_type VARCHAR(100) NOT NULL,
  agent_id VARCHAR(255),

  -- Campaign context (optional)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Memory classification
  memory_type memory_type NOT NULL,

  -- Memory content
  content TEXT NOT NULL,
  summary TEXT,

  -- Vector embedding for semantic search (1536 dimensions for OpenAI ada-002)
  embedding vector(1536),

  -- Importance scoring
  importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),

  -- Memory metadata
  metadata JSONB,

  -- Related entities
  related_entities JSONB,

  -- Access tracking
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for agent_memories
CREATE INDEX idx_agent_memories_agent_type ON agent_memories(agent_type);
CREATE INDEX idx_agent_memories_campaign ON agent_memories(campaign_id);
CREATE INDEX idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX idx_agent_memories_org ON agent_memories(organization_id);
CREATE INDEX idx_agent_memories_importance ON agent_memories(importance_score DESC);
CREATE INDEX idx_agent_memories_created ON agent_memories(created_at DESC);

-- Vector similarity search index
CREATE INDEX idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =====================================================
-- CAMPAIGN KNOWLEDGE GRAPH
-- =====================================================

/**
 * campaign_knowledge_graph - Nodes and edges for campaign knowledge representation
 */
CREATE TABLE IF NOT EXISTS campaign_knowledge_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Node identification
  node_id VARCHAR(255) NOT NULL,

  -- Campaign context
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Node classification
  node_type kg_node_type NOT NULL,

  -- Node content
  label VARCHAR(500) NOT NULL,
  description TEXT,

  -- Node properties
  properties JSONB,

  -- Vector embedding for semantic search
  embedding vector(1536),

  -- Importance scoring
  importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(campaign_id, node_id)
);

/**
 * campaign_knowledge_edges - Relationships between knowledge graph nodes
 */
CREATE TABLE IF NOT EXISTS campaign_knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Edge identification
  from_node_id VARCHAR(255) NOT NULL,
  to_node_id VARCHAR(255) NOT NULL,

  -- Campaign context
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Edge classification
  edge_type kg_edge_type NOT NULL,

  -- Edge properties
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  properties JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Multi-tenancy
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(campaign_id, from_node_id, to_node_id, edge_type)
);

-- Indexes for knowledge graph
CREATE INDEX idx_kg_nodes_campaign ON campaign_knowledge_graph(campaign_id);
CREATE INDEX idx_kg_nodes_type ON campaign_knowledge_graph(node_type);
CREATE INDEX idx_kg_nodes_org ON campaign_knowledge_graph(organization_id);
CREATE INDEX idx_kg_nodes_importance ON campaign_knowledge_graph(importance_score DESC);
CREATE INDEX idx_kg_nodes_embedding ON campaign_knowledge_graph USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_kg_edges_campaign ON campaign_knowledge_edges(campaign_id);
CREATE INDEX idx_kg_edges_from ON campaign_knowledge_edges(from_node_id);
CREATE INDEX idx_kg_edges_to ON campaign_knowledge_edges(to_node_id);
CREATE INDEX idx_kg_edges_type ON campaign_knowledge_edges(edge_type);
CREATE INDEX idx_kg_edges_org ON campaign_knowledge_edges(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_knowledge_edges ENABLE ROW LEVEL SECURITY;

-- agent_memories policies
CREATE POLICY agent_memories_org_isolation ON agent_memories
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- campaign_knowledge_graph policies
CREATE POLICY campaign_knowledge_graph_org_isolation ON campaign_knowledge_graph
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- campaign_knowledge_edges policies
CREATE POLICY campaign_knowledge_edges_org_isolation ON campaign_knowledge_edges
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- =====================================================
-- MEMORY FUNCTIONS
-- =====================================================

/**
 * Store agent memory with automatic importance scoring
 */
CREATE OR REPLACE FUNCTION store_agent_memory(
  p_memory_id VARCHAR,
  p_agent_type VARCHAR,
  p_agent_id VARCHAR,
  p_campaign_id UUID,
  p_memory_type memory_type,
  p_content TEXT,
  p_summary TEXT,
  p_embedding vector,
  p_metadata JSONB,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_memory_id UUID;
  v_importance DECIMAL;
BEGIN
  -- Calculate importance based on memory type
  v_importance := CASE p_memory_type
    WHEN 'ERROR' THEN 0.8
    WHEN 'SUCCESS' THEN 0.7
    WHEN 'STRATEGY' THEN 0.9
    WHEN 'INSIGHT' THEN 0.75
    WHEN 'DECISION' THEN 0.85
    WHEN 'OUTCOME' THEN 0.8
    ELSE 0.5
  END;

  -- Insert memory
  INSERT INTO agent_memories (
    memory_id,
    agent_type,
    agent_id,
    campaign_id,
    memory_type,
    content,
    summary,
    embedding,
    importance_score,
    metadata,
    organization_id
  ) VALUES (
    p_memory_id,
    p_agent_type,
    p_agent_id,
    p_campaign_id,
    p_memory_type,
    p_content,
    p_summary,
    p_embedding,
    v_importance,
    p_metadata,
    p_organization_id
  )
  ON CONFLICT (memory_id) DO UPDATE SET
    content = EXCLUDED.content,
    summary = EXCLUDED.summary,
    embedding = EXCLUDED.embedding,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Query relevant memories using semantic similarity
 */
CREATE OR REPLACE FUNCTION query_relevant_memories(
  p_query_embedding vector,
  p_organization_id UUID,
  p_agent_type VARCHAR DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_memory_types memory_type[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_min_similarity DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  summary TEXT,
  memory_type memory_type,
  agent_type VARCHAR,
  campaign_id UUID,
  importance_score DECIMAL,
  similarity DECIMAL,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.summary,
    m.memory_type,
    m.agent_type,
    m.campaign_id,
    m.importance_score,
    ROUND((1 - (m.embedding <=> p_query_embedding))::DECIMAL, 3) AS similarity,
    m.metadata,
    m.created_at
  FROM agent_memories m
  WHERE m.organization_id = p_organization_id
    AND (p_agent_type IS NULL OR m.agent_type = p_agent_type)
    AND (p_campaign_id IS NULL OR m.campaign_id = p_campaign_id)
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND (1 - (m.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY
    m.importance_score DESC,
    (m.embedding <=> p_query_embedding) ASC
  LIMIT p_limit;

  -- Update access tracking
  UPDATE agent_memories m
  SET
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE m.id IN (
    SELECT memory_id FROM (
      SELECT id AS memory_id FROM agent_memories m2
      WHERE m2.organization_id = p_organization_id
        AND (p_agent_type IS NULL OR m2.agent_type = p_agent_type)
        AND (p_campaign_id IS NULL OR m2.campaign_id = p_campaign_id)
        AND (1 - (m2.embedding <=> p_query_embedding)) >= p_min_similarity
      ORDER BY (m2.embedding <=> p_query_embedding) ASC
      LIMIT p_limit
    ) AS relevant_memories
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Get campaign context memories
 */
CREATE OR REPLACE FUNCTION get_campaign_memory_context(
  p_campaign_id UUID,
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  summary TEXT,
  memory_type memory_type,
  agent_type VARCHAR,
  importance_score DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.summary,
    m.memory_type,
    m.agent_type,
    m.importance_score,
    m.created_at
  FROM agent_memories m
  WHERE m.campaign_id = p_campaign_id
    AND m.organization_id = p_organization_id
  ORDER BY
    m.importance_score DESC,
    m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- KNOWLEDGE GRAPH FUNCTIONS
-- =====================================================

/**
 * Insert knowledge graph node
 */
CREATE OR REPLACE FUNCTION insert_knowledge_graph_node(
  p_node_id VARCHAR,
  p_campaign_id UUID,
  p_node_type kg_node_type,
  p_label VARCHAR,
  p_description TEXT,
  p_properties JSONB,
  p_embedding vector,
  p_importance_score DECIMAL,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_node_id UUID;
BEGIN
  INSERT INTO campaign_knowledge_graph (
    node_id,
    campaign_id,
    node_type,
    label,
    description,
    properties,
    embedding,
    importance_score,
    organization_id
  ) VALUES (
    p_node_id,
    p_campaign_id,
    p_node_type,
    p_label,
    p_description,
    p_properties,
    p_embedding,
    COALESCE(p_importance_score, 0.5),
    p_organization_id
  )
  ON CONFLICT (campaign_id, node_id) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    properties = EXCLUDED.properties,
    embedding = EXCLUDED.embedding,
    importance_score = EXCLUDED.importance_score,
    updated_at = NOW()
  RETURNING id INTO v_node_id;

  RETURN v_node_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Link knowledge graph nodes
 */
CREATE OR REPLACE FUNCTION link_knowledge_graph_nodes(
  p_from_node_id VARCHAR,
  p_to_node_id VARCHAR,
  p_campaign_id UUID,
  p_edge_type kg_edge_type,
  p_weight DECIMAL,
  p_properties JSONB,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_edge_id UUID;
BEGIN
  INSERT INTO campaign_knowledge_edges (
    from_node_id,
    to_node_id,
    campaign_id,
    edge_type,
    weight,
    properties,
    organization_id
  ) VALUES (
    p_from_node_id,
    p_to_node_id,
    p_campaign_id,
    p_edge_type,
    COALESCE(p_weight, 1.0),
    p_properties,
    p_organization_id
  )
  ON CONFLICT (campaign_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
    weight = EXCLUDED.weight,
    properties = EXCLUDED.properties
  RETURNING id INTO v_edge_id;

  RETURN v_edge_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Get knowledge graph context for campaign
 */
CREATE OR REPLACE FUNCTION get_graph_context_for_campaign(
  p_campaign_id UUID,
  p_organization_id UUID,
  p_node_types kg_node_type[] DEFAULT NULL,
  p_min_importance DECIMAL DEFAULT 0.5
)
RETURNS JSONB AS $$
DECLARE
  v_nodes JSONB;
  v_edges JSONB;
  v_result JSONB;
BEGIN
  -- Get nodes
  SELECT jsonb_agg(
    jsonb_build_object(
      'nodeId', n.node_id,
      'type', n.node_type,
      'label', n.label,
      'description', n.description,
      'properties', n.properties,
      'importance', n.importance_score
    )
  )
  INTO v_nodes
  FROM campaign_knowledge_graph n
  WHERE n.campaign_id = p_campaign_id
    AND n.organization_id = p_organization_id
    AND (p_node_types IS NULL OR n.node_type = ANY(p_node_types))
    AND n.importance_score >= p_min_importance
  ORDER BY n.importance_score DESC;

  -- Get edges
  SELECT jsonb_agg(
    jsonb_build_object(
      'from', e.from_node_id,
      'to', e.to_node_id,
      'type', e.edge_type,
      'weight', e.weight,
      'properties', e.properties
    )
  )
  INTO v_edges
  FROM campaign_knowledge_edges e
  WHERE e.campaign_id = p_campaign_id
    AND e.organization_id = p_organization_id;

  -- Build result
  v_result := jsonb_build_object(
    'campaignId', p_campaign_id,
    'nodes', COALESCE(v_nodes, '[]'::jsonb),
    'edges', COALESCE(v_edges, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * Find similar nodes using vector similarity
 */
CREATE OR REPLACE FUNCTION find_similar_kg_nodes(
  p_query_embedding vector,
  p_campaign_id UUID,
  p_organization_id UUID,
  p_node_types kg_node_type[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_min_similarity DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
  node_id VARCHAR,
  node_type kg_node_type,
  label VARCHAR,
  description TEXT,
  properties JSONB,
  importance_score DECIMAL,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.node_id,
    n.node_type,
    n.label,
    n.description,
    n.properties,
    n.importance_score,
    ROUND((1 - (n.embedding <=> p_query_embedding))::DECIMAL, 3) AS similarity
  FROM campaign_knowledge_graph n
  WHERE n.campaign_id = p_campaign_id
    AND n.organization_id = p_organization_id
    AND (p_node_types IS NULL OR n.node_type = ANY(p_node_types))
    AND (1 - (n.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY
    (n.embedding <=> p_query_embedding) ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_memories IS 'Long-term agent memory storage with vector embeddings for semantic search';
COMMENT ON TABLE campaign_knowledge_graph IS 'Knowledge graph nodes representing campaign entities and insights';
COMMENT ON TABLE campaign_knowledge_edges IS 'Relationships between knowledge graph nodes';

COMMENT ON FUNCTION store_agent_memory IS 'Store agent memory with automatic importance scoring';
COMMENT ON FUNCTION query_relevant_memories IS 'Semantic search for relevant memories using vector similarity';
COMMENT ON FUNCTION get_campaign_memory_context IS 'Get top memories for campaign context';
COMMENT ON FUNCTION insert_knowledge_graph_node IS 'Insert or update knowledge graph node';
COMMENT ON FUNCTION link_knowledge_graph_nodes IS 'Create relationship between knowledge graph nodes';
COMMENT ON FUNCTION get_graph_context_for_campaign IS 'Get complete knowledge graph for campaign';
COMMENT ON FUNCTION find_similar_kg_nodes IS 'Find semantically similar nodes using vector search';
