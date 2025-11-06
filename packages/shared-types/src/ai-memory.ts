// =====================================================
// AI MEMORY + LONG-TERM STRATEGY TYPES
// =====================================================

/**
 * Memory type enumeration
 */
/**
 * Knowledge graph node type
 */
export enum KGNodeType {
  CAMPAIGN = 'CAMPAIGN',
  CONTACT = 'CONTACT',
  TOPIC = 'TOPIC',
  MESSAGE = 'MESSAGE',
  OUTCOME = 'OUTCOME',
  DECISION = 'DECISION',
  INSIGHT = 'INSIGHT',
  PATTERN = 'PATTERN',
  STRATEGY = 'STRATEGY',
}

/**
 * Knowledge graph edge type
 */
export enum KGEdgeType {
  TARGETS = 'TARGETS',
  RELATES_TO = 'RELATES_TO',
  INFLUENCES = 'INFLUENCES',
  RESULTS_IN = 'RESULTS_IN',
  CAUSED_BY = 'CAUSED_BY',
  SIMILAR_TO = 'SIMILAR_TO',
  PART_OF = 'PART_OF',
  DEPENDS_ON = 'DEPENDS_ON',
  LEADS_TO = 'LEADS_TO',
}

/**
 * Agent Memory
 */
export interface AgentMemory {
  id: string;

  // Memory identification
  memoryId: string;

  // Agent context
  agentType: string;
  agentId: string | null;

  // Campaign context
  campaignId: string | null;

  // Memory classification
  memoryType: MemoryType;

  // Memory content
  content: string;
  summary: string | null;

  // Vector embedding
  embedding: number[] | null;

  // Importance scoring
  importanceScore: number;

  // Memory metadata
  metadata: Record<string, any> | null;

  // Related entities
  relatedEntities: Record<string, any> | null;

  // Access tracking
  accessCount: number;
  lastAccessedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Knowledge Graph Node
 */
export interface KnowledgeGraphNode {
  id: string;

  // Node identification
  nodeId: string;

  // Campaign context
  campaignId: string;

  // Node classification
  nodeType: KGNodeType;

  // Node content
  label: string;
  description: string | null;

  // Node properties
  properties: Record<string, any> | null;

  // Vector embedding
  embedding: number[] | null;

  // Importance scoring
  importanceScore: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Knowledge Graph Edge
 */
export interface KnowledgeGraphEdge {
  id: string;

  // Edge identification
  fromNodeId: string;
  toNodeId: string;

  // Campaign context
  campaignId: string;

  // Edge classification
  edgeType: KGEdgeType;

  // Edge properties
  weight: number;
  properties: Record<string, any> | null;

  // Timestamps
  createdAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Memory query result
 */
export interface MemoryQueryResult {
  memoryId: string;
  content: string;
  summary: string | null;
  memoryType: MemoryType;
  agentType: string;
  campaignId: string | null;
  importanceScore: number;
  similarity: number;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

/**
 * Input for storing memory
 */
export interface StoreMemoryInput {
  memoryId: string;
  agentType: string;
  agentId?: string;
  campaignId?: string;
  memoryType: MemoryType;
  content: string;
  summary?: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  organizationId: string;
}

/**
 * Input for querying memories
 */
export interface QueryMemoriesInput {
  queryEmbedding: number[];
  organizationId: string;
  agentType?: string;
  campaignId?: string;
  memoryTypes?: MemoryType[];
  limit?: number;
  minSimilarity?: number;
}

/**
 * Campaign memory context
 */
export interface CampaignMemoryContext {
  campaignId: string;
  memories: Array<{
    memoryId: string;
    content: string;
    summary: string | null;
    memoryType: MemoryType;
    agentType: string;
    importanceScore: number;
    createdAt: Date;
  }>;
  count: number;
}

/**
 * Input for inserting knowledge graph node
 */
export interface InsertKGNodeInput {
  nodeId: string;
  campaignId: string;
  nodeType: KGNodeType;
  label: string;
  description?: string;
  properties?: Record<string, any>;
  embedding?: number[];
  importanceScore?: number;
  organizationId: string;
}

/**
 * Input for linking knowledge graph nodes
 */
export interface LinkKGNodesInput {
  fromNodeId: string;
  toNodeId: string;
  campaignId: string;
  edgeType: KGEdgeType;
  weight?: number;
  properties?: Record<string, any>;
  organizationId: string;
}

/**
 * Campaign knowledge graph
 */
export interface CampaignKnowledgeGraph {
  campaignId: string;
  nodes: Array<{
    nodeId: string;
    type: KGNodeType;
    label: string;
    description: string | null;
    properties: Record<string, any> | null;
    importance: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: KGEdgeType;
    weight: number;
    properties: Record<string, any> | null;
  }>;
}

/**
 * Similar node result
 */
export interface SimilarNodeResult {
  nodeId: string;
  nodeType: KGNodeType;
  label: string;
  description: string | null;
  properties: Record<string, any> | null;
  importanceScore: number;
  similarity: number;
}

/**
 * Memory summary request
 */
export interface MemorySummaryRequest {
  memories: AgentMemory[];
  organizationId: string;
}

/**
 * Memory summary result
 */
export interface MemorySummaryResult {
  summary: string;
  keyInsights: string[];
  patterns: string[];
  recommendations: string[];
}

/**
 * Context injection input
 */
export interface ContextInjectionInput {
  campaignId?: string;
  agentType?: string;
  queryText?: string;
  maxMemories?: number;
  includeKnowledgeGraph?: boolean;
  organizationId: string;
}

/**
 * Memory compression request
 */
export interface MemoryCompressionRequest {
  campaignId?: string;
  agentType?: string;
  oldMemoryThreshold: number; // Days
  organizationId: string;
}

/**
 * Memory compression result
 */
/**
 * Memory analytics
 */
export interface MemoryAnalytics {
  totalMemories: number;
  memoryByType: Record<MemoryType, number>;
  memoryByAgent: Record<string, number>;
  avgImportance: number;
  mostAccessedMemories: Array<{
    memoryId: string;
    content: string;
    accessCount: number;
  }>;
  recentMemories: AgentMemory[];
  oldestMemories: AgentMemory[];
}

/**
 * Knowledge graph analytics
 */
export interface KnowledgeGraphAnalytics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<KGNodeType, number>;
  edgesByType: Record<KGEdgeType, number>;
  avgNodeImportance: number;
  centralNodes: Array<{
    nodeId: string;
    label: string;
    connections: number;
    importance: number;
  }>;
  clusters: Array<{
    clusterId: string;
    nodes: string[];
    theme: string;
  }>;
}

/**
 * Learning insight
 */
export interface LearningInsight {
  insightId: string;
  campaignId: string | null;
  agentType: string;
  insight: string;
  evidence: string[];
  confidence: number;
  actionable: boolean;
  recommendations: string[];
  createdAt: Date;
}

/**
 * Strategic pattern
 */
export interface StrategicPattern {
  patternId: string;
  name: string;
  description: string;
  occurrences: number;
  successRate: number;
  contexts: Array<{
    campaignId: string;
    outcome: string;
    timestamp: Date;
  }>;
  recommendations: string[];
}

/**
 * Memory search request
 */
export interface MemorySearchRequest {
  query: string;
  organizationId: string;
  agentType?: string;
  campaignId?: string;
  memoryTypes?: MemoryType[];
  limit?: number;
}

/**
 * Memory search result
 */
