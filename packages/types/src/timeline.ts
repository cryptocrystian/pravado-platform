// =====================================================
// TIMELINE TYPES - Unified Activity Feed
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export enum TimelineEventType {
  AGENT_RUN = 'AGENT_RUN',
  FOLLOWUP_SENT = 'FOLLOWUP_SENT',
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  DECISION_MADE = 'DECISION_MADE',
  INSIGHT_GENERATED = 'INSIGHT_GENERATED',
  CRM_INTERACTION = 'CRM_INTERACTION',
  TASK_EXECUTED = 'TASK_EXECUTED',
  GOAL_COMPLETED = 'GOAL_COMPLETED',
  FAILURE = 'FAILURE',
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_LAUNCHED = 'CAMPAIGN_LAUNCHED',
  CONTACT_MATCHED = 'CONTACT_MATCHED',
  CONTACT_APPROVED = 'CONTACT_APPROVED',
  SEQUENCE_GENERATED = 'SEQUENCE_GENERATED',
  MEMORY_STORED = 'MEMORY_STORED',
  KNOWLEDGE_GRAPH_UPDATED = 'KNOWLEDGE_GRAPH_UPDATED',
  HANDOFF_INITIATED = 'HANDOFF_INITIATED',
  COLLABORATION_STARTED = 'COLLABORATION_STARTED',
}

export enum TimelineEntityType {
  AGENT = 'AGENT',
  FOLLOWUP = 'FOLLOWUP',
  REVIEW = 'REVIEW',
  DECISION = 'DECISION',
  INSIGHT = 'INSIGHT',
  INTERACTION = 'INTERACTION',
  TASK = 'TASK',
  GOAL = 'GOAL',
  CAMPAIGN = 'CAMPAIGN',
  CONTACT = 'CONTACT',
  SEQUENCE = 'SEQUENCE',
  MEMORY = 'MEMORY',
  KNOWLEDGE_GRAPH = 'KNOWLEDGE_GRAPH',
  HANDOFF = 'HANDOFF',
  COLLABORATION = 'COLLABORATION',
}

export type TimelineActorType = 'agent' | 'user' | 'system';
export type TimelineStatus = 'success' | 'failure' | 'pending' | 'in_progress';

// =====================================================
// CORE ENTITIES
// =====================================================

export interface TimelineEvent {
  id: string;
  campaignId?: string;
  timestamp: string;
  eventType: TimelineEventType;
  entityType: TimelineEntityType;
  entityId: string;
  summary: string;
  details?: string;
  metadata: Record<string, unknown>;
  actorType?: TimelineActorType;
  actorId?: string;
  actorName?: string;
  status?: TimelineStatus;
  importanceScore: number;
  relatedContactId?: string;
  relatedUserId?: string;
  createdAt: string;
  organizationId: string;
}

export interface EnrichedTimelineEvent extends TimelineEvent {
  campaignName?: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    outlet?: string;
  };
  campaign?: {
    id: string;
    name: string;
    status: string;
  };
}

// =====================================================
// INPUT TYPES
// =====================================================

export interface InsertTimelineEventInput {
  campaignId?: string;
  eventType: TimelineEventType;
  entityType: TimelineEntityType;
  entityId: string;
  summary: string;
  details?: string;
  metadata?: Record<string, unknown>;
  actorType?: TimelineActorType;
  actorId?: string;
  actorName?: string;
  status?: TimelineStatus;
  importanceScore?: number;
  relatedContactId?: string;
  relatedUserId?: string;
  organizationId: string;
  timestamp?: string;
}

export interface GetCampaignTimelineInput {
  campaignId: string;
  organizationId: string;
  limit?: number;
  offset?: number;
  eventTypes?: TimelineEventType[];
  startDate?: string;
  endDate?: string;
}

export interface GetGlobalTimelineInput {
  organizationId: string;
  limit?: number;
  offset?: number;
  campaignIds?: string[];
  eventTypes?: TimelineEventType[];
  entityTypes?: TimelineEntityType[];
  actorIds?: string[];
  startDate?: string;
  endDate?: string;
  minImportance?: number;
}

export interface GetTimelineStatsInput {
  organizationId: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

export interface CampaignTimelineResult {
  success: boolean;
  events: TimelineEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface GlobalTimelineResult {
  success: boolean;
  events: EnrichedTimelineEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface TimelineStats {
  totalEvents: number;
  eventTypeCounts: Record<string, number>;
  entityTypeCounts: Record<string, number>;
  recentActivity: {
    hour: string;
    count: number;
  }[];
}

export interface TimelineEventDetails {
  event: TimelineEvent;
  contact?: {
    id: string;
    name: string;
    email: string;
    outlet?: string;
  };
  campaign?: {
    id: string;
    name: string;
    status: string;
  };
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface TimelineFilter {
  campaignIds?: string[];
  eventTypes?: TimelineEventType[];
  entityTypes?: TimelineEntityType[];
  actorIds?: string[];
  startDate?: string;
  endDate?: string;
  minImportance?: number;
  searchQuery?: string;
}

export interface TimelineGrouping {
  groupBy: 'day' | 'week' | 'month' | 'campaign' | 'actor' | 'eventType';
  groups: TimelineGroup[];
}

export interface TimelineGroup {
  key: string;
  label: string;
  events: TimelineEvent[];
  count: number;
}

export interface TimelineActivitySummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  topEventTypes: {
    eventType: TimelineEventType;
    count: number;
  }[];
  topActors: {
    actorId: string;
    actorName: string;
    count: number;
  }[];
  recentHighImportance: TimelineEvent[];
}

// =====================================================
// EVENT-SPECIFIC METADATA TYPES
// =====================================================

export interface AgentRunMetadata {
  agentName: string;
  executionId: string;
  tokensUsed?: number;
  durationMs: number;
  confidence?: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface FollowupSentMetadata {
  followupId: string;
  sequenceId: string;
  stepNumber: number;
  contactEmail: string;
  subject: string;
  messageId?: string;
}

export interface ReviewSubmittedMetadata {
  reviewId: string;
  reviewType: string;
  priority: string;
  assignedTo?: string;
  contentPreview?: string;
}

export interface DecisionMadeMetadata {
  reviewId: string;
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_EDIT';
  feedback?: string;
  modifications?: Record<string, unknown>;
}

export interface InsightGeneratedMetadata {
  insightType: string;
  confidence: number;
  recommendation?: string;
  dataPoints?: Record<string, unknown>;
}

export interface CRMInteractionMetadata {
  interactionType: string;
  channel: string;
  subject?: string;
  sentiment?: string;
  notes?: string;
}

export interface TaskExecutedMetadata {
  taskId: string;
  taskType: string;
  graphId?: string;
  durationMs: number;
  retryCount?: number;
  output?: Record<string, unknown>;
}

export interface GoalCompletedMetadata {
  goalId: string;
  goalType: string;
  completionRate: number;
  metrics?: Record<string, unknown>;
}

export interface FailureMetadata {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  recoveryAction?: string;
}

// =====================================================
// SUMMARY GENERATION
// =====================================================

export interface SummarizeEventInput {
  eventType: TimelineEventType;
  entityType: TimelineEntityType;
  metadata: Record<string, unknown>;
  actorName?: string;
  status?: TimelineStatus;
}

export interface SummarizeEventResult {
  summary: string;
  details?: string;
  importanceScore: number;
}

// =====================================================
// QUERY TYPES
// =====================================================

export interface ListTimelineEventsQuery {
  campaignId?: string;
  eventTypes?: TimelineEventType[];
  entityTypes?: TimelineEntityType[];
  actorIds?: string[];
  startDate?: string;
  endDate?: string;
  minImportance?: number;
  limit?: number;
  offset?: number;
  organizationId: string;
}
