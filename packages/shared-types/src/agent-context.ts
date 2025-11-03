// =====================================================
// AGENT CONTEXT ENHANCEMENT TYPES
// Sprint 43 Phase 3.5.3
// =====================================================

/**
 * Enhanced agent context for task execution
 * Aggregates memory, preferences, history, and trends
 */
export interface EnhancedAgentContext {
  /** Agent identifier */
  agentId: string;

  /** Organization context */
  organizationId: string;

  /** Current task prompt */
  prompt: string;

  /** User identifier */
  userId?: string;

  /** User preferences and settings */
  preferences?: UserPreferences;

  /** Agent-specific settings */
  agentSettings?: AgentSettings;

  /** Relevant memory snippets */
  memorySnippets: MemorySnippet[];

  /** Recent playbook executions */
  recentPlaybooks: PlaybookExecution[];

  /** Past escalations/collaborations */
  pastCollaborations: CollaborationSummary[];

  /** Temporal context */
  temporalContext?: TemporalContext;

  /** Key entities from memory */
  keyEntities?: KeyEntity[];

  /** Trending topics */
  trendingTopics?: string[];

  /** Context metadata */
  metadata?: Record<string, any>;
}

/**
 * User preferences for personalization
 */
export interface UserPreferences {
  /** Communication tone preference */
  tone?: 'professional' | 'casual' | 'conversational' | 'formal';

  /** Preferred communication channels */
  channels?: string[];

  /** Language preference */
  language?: string;

  /** Timezone */
  timezone?: string;

  /** Custom preferences */
  custom?: Record<string, any>;
}

/**
 * Agent-specific settings
 */
export interface AgentSettings {
  /** Agent's default behavior mode */
  behaviorMode?: 'proactive' | 'reactive' | 'balanced';

  /** Verbosity level */
  verbosity?: 'concise' | 'normal' | 'detailed';

  /** Creativity/temperature setting */
  creativity?: number; // 0-1

  /** Maximum context window */
  maxContextTokens?: number;

  /** Custom settings */
  custom?: Record<string, any>;
}

/**
 * Memory snippet from agent memory
 */
export interface MemorySnippet {
  /** Memory ID */
  id: string;

  /** Memory content */
  content: string;

  /** Memory type */
  type: 'conversation' | 'task' | 'knowledge' | 'observation';

  /** Relevance score to current task */
  relevance: number;

  /** Timestamp */
  timestamp: Date;

  /** Source of memory */
  source?: string;

  /** Associated entities */
  entities?: string[];
}

/**
 * Playbook execution summary
 */
export interface PlaybookExecution {
  /** Execution ID */
  executionId: string;

  /** Playbook ID */
  playbookId: string;

  /** Playbook name */
  playbookName: string;

  /** Execution status */
  status: string;

  /** Input data */
  input?: Record<string, any>;

  /** Output data */
  output?: Record<string, any>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Collaboration summary
 */
export interface CollaborationSummary {
  /** Collaboration ID */
  collaborationId: string;

  /** Collaboration type */
  type: 'escalation' | 'delegation' | 'coordination';

  /** Partner agents */
  partnerAgents: string[];

  /** Outcome */
  outcome: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Temporal context for time-aware decisions
 */
export interface TemporalContext {
  /** Current timestamp */
  currentTime: Date;

  /** Day of week */
  dayOfWeek: string;

  /** Time of day */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  /** Recent activity patterns */
  activityPatterns?: ActivityPattern[];

  /** Time-sensitive information */
  timeSensitive?: {
    deadlines?: Date[];
    upcomingEvents?: string[];
  };
}

/**
 * Activity pattern
 */
export interface ActivityPattern {
  /** Pattern type */
  type: string;

  /** Frequency */
  frequency: number;

  /** Last occurrence */
  lastOccurrence: Date;

  /** Pattern description */
  description: string;
}

/**
 * Key entity extracted from memory
 */
export interface KeyEntity {
  /** Entity name */
  name: string;

  /** Entity type */
  type: 'person' | 'organization' | 'product' | 'concept' | 'location' | 'other';

  /** Mention count */
  mentions: number;

  /** Context */
  context?: string;

  /** Related entities */
  relatedEntities?: string[];
}

/**
 * Memory summary
 */
export interface MemorySummary {
  /** Summary ID */
  id: string;

  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Summary type */
  summaryType: 'short_term' | 'long_term' | 'topical' | 'entity_based';

  /** Scope of summary */
  scope: MemoryScope;

  /** Summary text */
  summaryText: string;

  /** Key topics */
  topics: string[];

  /** Key entities */
  entities: KeyEntity[];

  /** Trends identified */
  trends?: string[];

  /** Time period covered */
  timePeriod: {
    start: Date;
    end: Date;
  };

  /** Entry count summarized */
  entryCount: number;

  /** Created timestamp */
  createdAt: Date;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Memory scope
 */
export type MemoryScope = 'short_term' | 'long_term' | 'session' | 'historical';

/**
 * Database entity for agent_memory_summaries table
 */
export interface AgentMemorySummaryEntity {
  id: string;
  agent_id: string;
  organization_id: string;
  summary_type: 'short_term' | 'long_term' | 'topical' | 'entity_based';
  scope: MemoryScope;
  summary_text: string;
  topics: string[];
  entities: Record<string, any>[];
  trends: string[];
  time_period_start: Date;
  time_period_end: Date;
  entry_count: number;
  metadata: Record<string, any> | null;
  created_at: Date;
}

/**
 * Request to build enhanced context
 */
export interface BuildContextRequest {
  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Task context */
  taskContext: {
    prompt: string;
    userId?: string;
    metadata?: Record<string, any>;
  };

  /** Options for context building */
  options?: {
    /** Include memory snippets */
    includeMemory?: boolean;

    /** Include recent playbooks */
    includePlaybooks?: boolean;

    /** Include collaborations */
    includeCollaborations?: boolean;

    /** Include preferences */
    includePreferences?: boolean;

    /** Maximum memory snippets */
    maxMemorySnippets?: number;

    /** Maximum recent playbooks */
    maxRecentPlaybooks?: number;

    /** Time window for context (days) */
    timeWindowDays?: number;
  };
}

/**
 * Request to summarize memory
 */
export interface SummarizeMemoryRequest {
  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Scope of summarization */
  scope: MemoryScope;

  /** Summary type */
  summaryType?: 'short_term' | 'long_term' | 'topical' | 'entity_based';

  /** Time window (days) */
  timeWindowDays?: number;

  /** Maximum entries to summarize */
  maxEntries?: number;

  /** Force regeneration even if recent summary exists */
  forceRegenerate?: boolean;
}

/**
 * Context injection template
 */
export interface ContextTemplate {
  /** Template string with placeholders */
  template: string;

  /** Available placeholders */
  placeholders: string[];

  /** Template metadata */
  metadata?: Record<string, any>;
}

/**
 * Context injection result
 */
export interface ContextInjectionResult {
  /** Injected prompt */
  prompt: string;

  /** Tokens used (estimated) */
  tokensUsed: number;

  /** Placeholders replaced */
  placeholdersReplaced: string[];

  /** Context summary */
  contextSummary: {
    memorySnippets: number;
    recentPlaybooks: number;
    collaborations: number;
    entities: number;
  };
}

/**
 * Context cache entry
 */
export interface ContextCacheEntry {
  /** Cache key */
  key: string;

  /** Cached context */
  context: EnhancedAgentContext;

  /** Cache timestamp */
  cachedAt: Date;

  /** Expiration time */
  expiresAt: Date;

  /** Hit count */
  hits: number;
}

/**
 * Context building statistics
 */
export interface ContextBuildingStats {
  /** Total contexts built */
  totalContextsBuilt: number;

  /** Average build time (ms) */
  avgBuildTimeMs: number;

  /** Cache hit rate */
  cacheHitRate: number;

  /** Average memory snippets included */
  avgMemorySnippets: number;

  /** Most frequent entities */
  topEntities: Array<{
    entity: string;
    count: number;
  }>;
}
