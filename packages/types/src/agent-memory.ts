// =====================================================
// AGENT MEMORY + EPISODIC CONTEXT ENGINE TYPES
// Sprint 36: Long-term agent memory and contextual recall
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export enum MemoryType {
  OBSERVATION = 'OBSERVATION',
  GOAL = 'GOAL',
  DECISION = 'DECISION',
  DIALOGUE = 'DIALOGUE',
  CONTEXT = 'CONTEXT',
  CORRECTION = 'CORRECTION',
  INSIGHT = 'INSIGHT',
}

export enum MemoryStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  REDACTED = 'REDACTED',
}

export enum MemoryEventType {
  CREATED = 'CREATED',
  ACCESSED = 'ACCESSED',
  SUMMARIZED = 'SUMMARIZED',
  ARCHIVED = 'ARCHIVED',
  REDACTED = 'REDACTED',
  LINKED = 'LINKED',
  COMPRESSED = 'COMPRESSED',
}

// =====================================================
// MAIN INTERFACES
// =====================================================

export interface MemoryEpisode {
  id: string;
  organization_id: string;

  // Memory metadata
  memory_type: MemoryType;
  status: MemoryStatus;

  // Context
  agent_id?: string;
  thread_id?: string;
  session_id?: string;

  // Content
  title: string;
  content: string;
  summary?: string;

  // Contextual data
  context: Record<string, any>;
  metadata: Record<string, any>;

  // Embeddings
  embedding?: number[];

  // Importance and usage
  importance_score: number;
  access_count: number;
  last_accessed_at?: string;

  // Temporal
  occurred_at: string;
  expires_at?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryChunk {
  id: string;
  episode_id: string;

  // Chunk data
  chunk_index: number;
  chunk_content: string;
  chunk_summary?: string;

  // Embeddings
  embedding?: number[];

  // Metadata
  metadata: Record<string, any>;

  created_at: string;
}

export interface MemoryLink {
  id: string;
  episode_id: string;

  // Link targets
  campaign_id?: string;
  contact_id?: string;
  goal_id?: string;
  evaluation_id?: string;
  agent_run_id?: string;

  // Link metadata
  link_type?: string;
  relevance_score: number;

  metadata: Record<string, any>;

  created_at: string;
}

export interface MemoryEvent {
  id: string;
  episode_id: string;

  // Event details
  event_type: string;
  description?: string;

  // Event data
  event_data: Record<string, any>;

  // Tracking
  triggered_by?: string;
  created_at: string;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

export interface MemoryTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
  defaultImportance: number;
}

export interface MemoryStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
}

export interface MemoryEventTypeConfig {
  label: string;
  color: string;
  icon: string;
}

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

export const MEMORY_TYPE_CONFIGS: Record<MemoryType, MemoryTypeConfig> = {
  [MemoryType.OBSERVATION]: {
    label: 'Observation',
    description: 'Factual observation or data point',
    color: 'blue',
    icon: 'Eye',
    defaultImportance: 40,
  },
  [MemoryType.GOAL]: {
    label: 'Goal',
    description: 'Goal setting or objective',
    color: 'green',
    icon: 'Target',
    defaultImportance: 70,
  },
  [MemoryType.DECISION]: {
    label: 'Decision',
    description: 'Decision made or action taken',
    color: 'purple',
    icon: 'GitBranch',
    defaultImportance: 60,
  },
  [MemoryType.DIALOGUE]: {
    label: 'Dialogue',
    description: 'Conversation or interaction',
    color: 'indigo',
    icon: 'MessageSquare',
    defaultImportance: 50,
  },
  [MemoryType.CONTEXT]: {
    label: 'Context',
    description: 'Background context or situational info',
    color: 'gray',
    icon: 'Info',
    defaultImportance: 45,
  },
  [MemoryType.CORRECTION]: {
    label: 'Correction',
    description: 'Correction or learning from mistake',
    color: 'orange',
    icon: 'AlertCircle',
    defaultImportance: 80,
  },
  [MemoryType.INSIGHT]: {
    label: 'Insight',
    description: 'Key insight or learning',
    color: 'yellow',
    icon: 'Lightbulb',
    defaultImportance: 75,
  },
};

export const MEMORY_STATUS_CONFIGS: Record<MemoryStatus, MemoryStatusConfig> = {
  [MemoryStatus.ACTIVE]: {
    label: 'Active',
    description: 'Memory is active and accessible',
    color: 'green',
    icon: 'CheckCircle',
  },
  [MemoryStatus.ARCHIVED]: {
    label: 'Archived',
    description: 'Memory is archived but retrievable',
    color: 'gray',
    icon: 'Archive',
  },
  [MemoryStatus.REDACTED]: {
    label: 'Redacted',
    description: 'Memory has been redacted or invalidated',
    color: 'red',
    icon: 'XCircle',
  },
};

export const MEMORY_EVENT_TYPE_CONFIGS: Record<string, MemoryEventTypeConfig> = {
  CREATED: {
    label: 'Created',
    color: 'blue',
    icon: 'Plus',
  },
  ACCESSED: {
    label: 'Accessed',
    color: 'green',
    icon: 'Eye',
  },
  SUMMARIZED: {
    label: 'Summarized',
    color: 'purple',
    icon: 'FileText',
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'gray',
    icon: 'Archive',
  },
  REDACTED: {
    label: 'Redacted',
    color: 'red',
    icon: 'XCircle',
  },
  LINKED: {
    label: 'Linked',
    color: 'indigo',
    icon: 'Link',
  },
  COMPRESSED: {
    label: 'Compressed',
    color: 'yellow',
    icon: 'Minimize',
  },
};

// =====================================================
// INPUT TYPES
// =====================================================

export interface StoreMemoryEpisodeInput {
  organizationId: string;
  memoryType: MemoryType;
  agentId?: string;
  threadId?: string;
  sessionId?: string;
  title: string;
  content: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  importanceScore?: number;
  occurredAt?: string;
  createdBy?: string;
}

export interface UpdateMemoryEpisodeInput {
  episodeId: string;
  title?: string;
  content?: string;
  summary?: string;
  status?: MemoryStatus;
  importanceScore?: number;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EmbedMemoryChunksInput {
  episodeId: string;
  chunkSize?: number;
  overlapSize?: number;
}

export interface LinkMemoryReferencesInput {
  episodeId: string;
  campaignId?: string;
  contactId?: string;
  goalId?: string;
  evaluationId?: string;
  agentRunId?: string;
  linkType?: string;
  relevanceScore?: number;
}

export interface SearchMemoryInput {
  organizationId: string;
  query: string;
  memoryType?: MemoryType;
  agentId?: string;
  threadId?: string;
  minImportance?: number;
  limit?: number;
}

export interface GetMemoryEpisodesInput {
  organizationId: string;
  memoryType?: MemoryType;
  status?: MemoryStatus;
  agentId?: string;
  threadId?: string;
  sessionId?: string;
  minImportance?: number;
  maxImportance?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetMemoryTimelineInput {
  organizationId: string;
  threadId?: string;
  agentId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetMemoryDashboardInput {
  organizationId: string;
  agentId?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface SummarizeMemoryInput {
  organizationId: string;
  episodeId: string;
}

export interface CompressMemoryInput {
  organizationId: string;
  episodeIds: string[];
}

export interface LogMemoryEventInput {
  episodeId: string;
  eventType: string;
  description?: string;
  eventData?: Record<string, any>;
  triggeredBy?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

export interface MemoryEpisodeWithDetails extends MemoryEpisode {
  chunks?: MemoryChunk[];
  links?: MemoryLink[];
  recent_events?: MemoryEvent[];
  total_chunks: number;
  total_links: number;
  total_events: number;
}

export interface MemorySearchResult {
  episode: MemoryEpisode;
  similarity: number;
  relevance_reason?: string;
  matched_chunks?: MemoryChunk[];
}

export interface MemoryTimeline {
  thread_id?: string;
  agent_id?: string;
  episodes: MemoryEpisode[];
  total_episodes: number;
  time_span: {
    start: string;
    end: string;
  };
}

export interface MemoryDashboard {
  total_episodes: number;
  active_episodes: number;
  archived_episodes: number;
  total_chunks: number;
  total_links: number;
  avg_importance: number;
  total_accesses: number;
  episodes_by_type: Record<string, number>;
  most_accessed_episodes: Array<{
    episode_id: string;
    title: string;
    memory_type: MemoryType;
    access_count: number;
    importance_score: number;
  }>;
  recent_episodes: Array<{
    episode_id: string;
    title: string;
    memory_type: MemoryType;
    occurred_at: string;
    importance_score: number;
  }>;
  memory_timeline: Record<string, number>;
}

export interface MemorySummaryData {
  episode_id: string;
  title: string;
  content: string;
  summary: string;
  memory_type: MemoryType;
  importance_score: number;
  access_count: number;
  last_accessed_at?: string;
  linked_campaigns: number;
  linked_contacts: number;
  linked_goals: number;
  total_events: number;
}

// =====================================================
// GPT-POWERED TYPES
// =====================================================

export interface GptMemorySummary {
  episode_id: string;
  summary: string;
  key_points: string[];
  extracted_entities: {
    people?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
    concepts?: string[];
  };
  importance_reasoning: string;
  suggested_importance: number;
  tags: string[];
  generated_at: string;
}

export interface GptMemoryCompression {
  original_episode_ids: string[];
  compressed_content: string;
  summary: string;
  preserved_details: string[];
  compression_ratio: number;
  information_loss_assessment: string;
  generated_at: string;
}

export interface MemoryContextForAgent {
  relevant_episodes: Array<{
    episode: MemoryEpisode;
    similarity: number;
    why_relevant: string;
  }>;
  context_summary: string;
  key_insights: string[];
  suggested_actions?: string[];
  total_episodes_searched: number;
  retrieval_time_ms: number;
}

export interface MemoryInjectionPrompt {
  prompt_prefix: string;
  memory_context: string;
  key_facts: string[];
  relevant_history: string[];
  constraints?: string[];
}

// =====================================================
// CHART DATA TYPES
// =====================================================

export interface MemoryHeatmapData {
  date: string;
  hour: number;
  access_count: number;
  memory_type?: MemoryType;
}

export interface MemoryTypeDistributionData {
  memory_type: MemoryType;
  count: number;
  avg_importance: number;
  percentage: number;
}

export interface MemoryAccessTrendData {
  date: string;
  access_count: number;
  unique_episodes: number;
}

export interface MemoryImportanceDistributionData {
  importance_range: string;
  count: number;
  percentage: number;
}

export interface MemoryAgingData {
  age_range: string; // '0-7d', '7-30d', '30-90d', '90d+'
  count: number;
  avg_access_count: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface MemoryFilters {
  memoryTypes?: MemoryType[];
  status?: MemoryStatus[];
  importanceRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  agentId?: string;
  threadId?: string;
}

export interface MemorySortOptions {
  field: 'importance_score' | 'occurred_at' | 'access_count' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface ChunkingConfig {
  chunk_size: number;
  overlap_size: number;
  preserve_paragraphs: boolean;
}

export interface EmbeddingConfig {
  model: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  dimensions?: number;
}

export interface MemoryRetentionPolicy {
  max_age_days?: number;
  min_importance_to_keep?: number;
  max_episodes_per_thread?: number;
  auto_archive_threshold?: number;
}

// =====================================================
// MEMORY LIFECYCLE TYPES (Sprint 37)
// =====================================================

export interface MemoryLifecycleEvent {
  id: string;
  organization_id: string;
  episode_id: string;

  // Event details
  event_type: 'AGED' | 'COMPRESSED' | 'PRUNED' | 'ARCHIVED' | 'REINFORCED' | 'ASSESSED';
  previous_age_score?: number;
  new_age_score?: number;
  previous_importance?: number;
  new_importance?: number;

  // AI insights
  reasoning?: string;
  recommendation?: string;

  // Metadata
  metadata: Record<string, any>;

  // Tracking
  triggered_by?: string;
  created_at: string;
}

export interface MemoryEpisodeLifecycle extends MemoryEpisode {
  // Lifecycle fields
  age_score: number;
  decay_factor: number;
  compressed: boolean;
  compressed_at?: string;
  archived_at?: string;
  last_reinforced_at?: string;
  reinforcement_count: number;
  pruned: boolean;
  pruned_at?: string;
  retention_priority: number;
}

export interface MemoryChunkLifecycle extends MemoryChunk {
  // Compression fields
  compressed: boolean;
  compressed_content?: string;
  compressed_at?: string;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
}

export interface MemoryRetentionPlan {
  organization_id: string;
  generated_at: string;

  // Statistics
  total_episodes: number;
  episodes_to_compress: number;
  episodes_to_archive: number;
  episodes_to_prune: number;
  episodes_to_retain: number;

  // Candidates
  compression_candidates: Array<{
    episode_id: string;
    title: string;
    age_score: number;
    importance_score: number;
    content_length: number;
    days_since_access: number;
    reasoning: string;
  }>;

  archival_candidates: Array<{
    episode_id: string;
    title: string;
    age_score: number;
    importance_score: number;
    retention_priority: number;
    days_since_access: number;
    reasoning: string;
  }>;

  pruning_candidates: Array<{
    episode_id: string;
    title: string;
    age_score: number;
    importance_score: number;
    retention_priority: number;
    access_count: number;
    memory_type: MemoryType;
    reasoning: string;
  }>;

  // Recommendations
  recommended_actions: Array<{
    action: 'COMPRESS' | 'ARCHIVE' | 'PRUNE' | 'RETAIN';
    episode_ids: string[];
    priority: number;
    reason: string;
    estimated_savings_bytes?: number;
  }>;
}

export interface MemoryLifecycleSummary {
  organization_id: string;
  period_start: string;
  period_end: string;

  // Aging metrics
  avg_age_score: number;
  age_score_distribution: Record<string, number>; // '0-20', '20-40', etc.
  episodes_aged: number;
  total_decay_amount: number;

  // Reinforcement metrics
  episodes_reinforced: number;
  total_reinforcements: number;
  avg_reinforcements_per_episode: number;
  top_reinforced_episodes: Array<{
    episode_id: string;
    title: string;
    reinforcement_count: number;
    age_score: number;
  }>;

  // Compression metrics
  episodes_compressed: number;
  total_bytes_saved: number;
  avg_compression_ratio: number;
  compression_efficiency: number; // percentage

  // Pruning/Archival metrics
  episodes_pruned: number;
  episodes_archived: number;
  pruning_reasons: Record<string, number>;

  // Retention metrics
  retention_rate: number; // percentage of episodes retained
  avg_retention_priority: number;
  episodes_by_priority: Record<string, number>; // '0-20', '20-40', etc.
}

export interface MemoryAgingMetrics {
  episode_id: string;
  title: string;

  // Current state
  current_age_score: number;
  current_importance: number;
  current_retention_priority: number;

  // Historical trends
  age_score_trend: Array<{ date: string; score: number }>;
  importance_trend: Array<{ date: string; score: number }>;

  // Decay analysis
  decay_factor: number;
  days_until_zero: number; // estimated days until age_score reaches 0
  projected_age_score_30d: number;
  projected_age_score_90d: number;

  // Access patterns
  access_frequency: number; // accesses per day
  last_accessed_days_ago: number;
  reinforcement_frequency: number; // reinforcements per day

  // Recommendations
  should_compress: boolean;
  should_archive: boolean;
  should_prune: boolean;
  recommended_action: 'COMPRESS' | 'ARCHIVE' | 'PRUNE' | 'RETAIN' | 'REINFORCE';
  action_reasoning: string;
}

export interface MemoryCompressionResult {
  episode_id: string;
  original_content: string;
  compressed_content: string;
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  key_points_preserved: string[];
  information_loss_assessment: string;
  compressed_at: string;
}

export interface MemoryArchivalRecommendation {
  episode_id: string;
  title: string;
  memory_type: MemoryType;

  // Scores
  age_score: number;
  importance_score: number;
  retention_priority: number;

  // Usage
  access_count: number;
  days_since_last_access: number;
  reinforcement_count: number;

  // Recommendation
  recommended_action: 'ARCHIVE' | 'COMPRESS' | 'RETAIN';
  confidence: number; // 0-100
  reasoning: string;
  risk_assessment: string;

  // Impact analysis
  storage_impact: number; // bytes
  related_episodes: number;
  estimated_value_loss: number; // 0-100
}

export interface MemoryImportanceAssessment {
  episode_id: string;
  title: string;
  content_preview: string;

  // Current state
  current_importance: number;
  suggested_importance: number;
  confidence: number; // 0-100

  // Analysis
  strategic_value: number; // 0-100
  recency_value: number; // 0-100
  uniqueness_value: number; // 0-100
  relationship_value: number; // 0-100 (based on links)

  // Reasoning
  importance_factors: string[];
  reasoning: string;
  adjustment_recommended: boolean;

  // Context
  related_goals: number;
  related_campaigns: number;
  related_contacts: number;
  linked_episodes: number;
}

// =====================================================
// INPUT TYPES FOR LIFECYCLE OPERATIONS
// =====================================================

export interface AgeMemoryInput {
  organizationId: string;
  daysSinceLastRun?: number;
}

export interface CompressMemoryInput {
  episodeId: string;
  preserveKeyPoints?: boolean;
  targetCompressionRatio?: number; // 0.0-1.0
}

export interface PruneMemoryInput {
  organizationId: string;
  episodeIds?: string[];
  ageThreshold?: number;
  importanceThreshold?: number;
  daysInactive?: number;
  dryRun?: boolean; // if true, returns candidates without pruning
}

export interface ArchiveMemoryInput {
  episodeIds: string[];
  reason?: string;
}

export interface MarkForArchivalInput {
  episodeId: string;
  expiresAt: string;
  reason?: string;
}

export interface RecommendArchivalInput {
  organizationId: string;
  limit?: number;
  ageThreshold?: number;
  importanceThreshold?: number;
}

export interface AssessImportanceInput {
  episodeId: string;
  context?: {
    recentGoals?: string[];
    activeCampaigns?: string[];
    strategicPriorities?: string[];
  };
}

export interface GetRetentionPlanInput {
  organizationId: string;
  agentId?: string;
  threadId?: string;
}

export interface ReinforceMemoryInput {
  episodeId: string;
  reinforcementAmount?: number;
}

export interface GetLifecycleDashboardInput {
  organizationId: string;
  agentId?: string;
  periodStart?: string;
  periodEnd?: string;
}

// =====================================================
// OUTPUT TYPES FOR LIFECYCLE OPERATIONS
// =====================================================

export interface AgeMemoryResult {
  episodes_aged: number;
  total_decay_amount: number;
  avg_new_age_score: number;
  episodes: Array<{
    episode_id: string;
    title: string;
    previous_age_score: number;
    new_age_score: number;
    decay_amount: number;
  }>;
}

export interface CompressMemoryResult {
  episode_id: string;
  compressed: boolean;
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  bytes_saved: number;
}

export interface PruneMemoryResult {
  episodes_pruned: number;
  bytes_freed: number;
  episodes: Array<{
    episode_id: string;
    title: string;
    reason: string;
  }>;
}

export interface ArchiveMemoryResult {
  episodes_archived: number;
  episodes: Array<{
    episode_id: string;
    title: string;
    archived_at: string;
  }>;
}

export interface MemoryLifecycleDashboard {
  // Overview
  total_episodes: number;
  active_episodes: number;
  compressed_episodes: number;
  pruned_episodes: number;
  archived_episodes: number;

  // Age metrics
  avg_age_score: number;
  avg_retention_priority: number;
  age_distribution: Record<string, number>;

  // Candidates
  compression_candidates: number;
  pruning_candidates: number;

  // Storage metrics
  total_memory_size: number; // bytes
  compressed_memory_size: number; // bytes
  compression_savings_pct: number;

  // Recent activity
  episodes_aged_today: number;
  episodes_compressed_today: number;
  episodes_pruned_today: number;
  episodes_reinforced_today: number;

  // Health indicators
  health_score: number; // 0-100
  storage_efficiency: number; // 0-100
  retention_health: number; // 0-100
}
