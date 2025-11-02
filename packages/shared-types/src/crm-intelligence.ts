// =====================================================
// CRM INTELLIGENCE & RELATIONSHIP SCORING TYPES
// =====================================================

/**
 * Relationship tier enumeration
 */
export enum RelationshipTier {
  A = 'A', // Top tier: Strong relationship, high responsiveness
  B = 'B', // Mid tier: Established relationship, moderate engagement
  C = 'C', // Lower tier: New or cold relationship
  UNRATED = 'UNRATED', // No relationship data yet
}

/**
 * Interaction type enumeration
 */
export enum InteractionType {
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_OPENED = 'EMAIL_OPENED',
  EMAIL_CLICKED = 'EMAIL_CLICKED',
  EMAIL_REPLIED = 'EMAIL_REPLIED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_COMPLETED = 'MEETING_COMPLETED',
  PHONE_CALL = 'PHONE_CALL',
  SOCIAL_ENGAGEMENT = 'SOCIAL_ENGAGEMENT',
  PITCH_ACCEPTED = 'PITCH_ACCEPTED',
  PITCH_REJECTED = 'PITCH_REJECTED',
  ARTICLE_PUBLISHED = 'ARTICLE_PUBLISHED',
  BACKLINK_RECEIVED = 'BACKLINK_RECEIVED',
  FOLLOW_UP = 'FOLLOW_UP',
  REFERRAL_GIVEN = 'REFERRAL_GIVEN',
  NOTE_ADDED = 'NOTE_ADDED',
}

/**
 * Score source enumeration
 */
export enum ScoreSource {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  AI_GENERATED = 'AI_GENERATED',
  INTERACTION_BASED = 'INTERACTION_BASED',
  AGENT_CALCULATED = 'AGENT_CALCULATED',
}

/**
 * Relationship status enumeration
 */
export enum RelationshipStatus {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  COLD = 'COLD',
  NURTURING = 'NURTURING',
  ARCHIVED = 'ARCHIVED',
}

/**
 * CRM Insight
 */
export interface CrmInsight {
  id: string;

  // Contact reference
  contactId: string;

  // AI-generated insights
  bioSummary: string | null;
  beatSummary: string | null;
  toneAnalysis: string | null;
  expertiseAreas: string[] | null;
  recentArticles: Array<{
    title: string;
    url: string;
    publishedAt: string;
    analysis: string;
  }> | null;

  // Historical collaboration
  pastCollaborations: Array<{
    date: string;
    type: string;
    outcome: string;
  }> | null;
  collaborationSummary: string | null;
  successPatterns: Record<string, any> | null;

  // Preferences and notes
  pitchPreferences: string | null;
  bestContactTimes: string | null;
  topicsToAvoid: string | null;

  // Social media insights
  socialProfiles: Record<string, string> | null;
  socialActivityLevel: string | null;
  socialEngagementTopics: string[] | null;

  // Behavioral insights
  avgResponseTimeHours: number | null;
  preferredContentTypes: string[] | null;
  pitchResonanceScore: number | null;

  // Intelligence metadata
  lastEnrichedAt: Date | null;
  enrichmentSource: string | null;
  confidenceScore: number | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Relationship Score
 */
export interface RelationshipScore {
  id: string;

  // Relationship context
  contactId: string;
  userId: string | null;
  agentId: string | null;

  // Score components
  compositeScore: number;
  relationshipTier: RelationshipTier;

  // Factor breakdown
  recencyScore: number | null;
  frequencyScore: number | null;
  qualityScore: number | null;
  outcomeScore: number | null;
  engagementScore: number | null;

  // Scoring metadata
  scoreRationale: string | null;
  scoreSource: ScoreSource;
  lastScoredAt: Date;

  // Relationship status
  relationshipStatus: RelationshipStatus;
  statusReason: string | null;

  // Interaction summary
  totalInteractions: number;
  successfulOutcomes: number;
  lastInteractionAt: Date | null;
  lastInteractionType: InteractionType | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * CRM Interaction
 */
export interface CrmInteraction {
  id: string;

  // Interaction context
  contactId: string;
  userId: string | null;
  agentId: string | null;

  // Interaction details
  interactionType: InteractionType;
  interactionChannel: string | null;

  // Content
  subject: string | null;
  description: string | null;
  contentSnippet: string | null;

  // Outcome tracking
  wasSuccessful: boolean | null;
  outcomeType: string | null;
  outcomeValue: number | null;

  // Response tracking
  responseTimeHours: number | null;
  sentiment: string | null;

  // Related entities
  campaignId: string | null;
  pitchWorkflowId: string | null;

  // Metadata
  metadata: Record<string, any> | null;

  // Timestamps
  occurredAt: Date;
  createdAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Relationship Model
 */
export interface RelationshipModel {
  id: string;

  // Model configuration
  modelName: string;
  description: string | null;

  // Scoring weights
  recencyWeight: number;
  frequencyWeight: number;
  qualityWeight: number;
  outcomeWeight: number;
  engagementWeight: number;

  // Tier thresholds
  tierAThreshold: number;
  tierBThreshold: number;
  tierCThreshold: number;

  // Recency decay settings
  recencyHalfLifeDays: number;

  // Metadata
  isDefault: boolean;
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string | null;
}

/**
 * Input for creating CRM insight
 */
export interface CreateCrmInsightInput {
  contactId: string;
  bioSummary?: string;
  beatSummary?: string;
  toneAnalysis?: string;
  expertiseAreas?: string[];
  recentArticles?: Array<{
    title: string;
    url: string;
    publishedAt: string;
    analysis: string;
  }>;
  pastCollaborations?: Array<{
    date: string;
    type: string;
    outcome: string;
  }>;
  collaborationSummary?: string;
  successPatterns?: Record<string, any>;
  pitchPreferences?: string;
  bestContactTimes?: string;
  topicsToAvoid?: string;
  socialProfiles?: Record<string, string>;
  socialActivityLevel?: string;
  socialEngagementTopics?: string[];
  avgResponseTimeHours?: number;
  preferredContentTypes?: string[];
  pitchResonanceScore?: number;
  enrichmentSource?: string;
  confidenceScore?: number;
  organizationId: string;
}

/**
 * Input for updating CRM insight
 */
export interface UpdateCrmInsightInput {
  bioSummary?: string;
  beatSummary?: string;
  toneAnalysis?: string;
  expertiseAreas?: string[];
  recentArticles?: Array<{
    title: string;
    url: string;
    publishedAt: string;
    analysis: string;
  }>;
  pitchPreferences?: string;
  bestContactTimes?: string;
  topicsToAvoid?: string;
  socialProfiles?: Record<string, string>;
  confidenceScore?: number;
}

/**
 * Input for creating relationship score
 */
export interface CreateRelationshipScoreInput {
  contactId: string;
  userId?: string;
  agentId?: string;
  compositeScore: number;
  relationshipTier?: RelationshipTier;
  recencyScore?: number;
  frequencyScore?: number;
  qualityScore?: number;
  outcomeScore?: number;
  engagementScore?: number;
  scoreRationale?: string;
  scoreSource?: ScoreSource;
  relationshipStatus?: RelationshipStatus;
  organizationId: string;
}

/**
 * Input for creating CRM interaction
 */
export interface CreateCrmInteractionInput {
  contactId: string;
  userId?: string;
  agentId?: string;
  interactionType: InteractionType;
  interactionChannel?: string;
  subject?: string;
  description?: string;
  contentSnippet?: string;
  wasSuccessful?: boolean;
  outcomeType?: string;
  outcomeValue?: number;
  responseTimeHours?: number;
  sentiment?: string;
  campaignId?: string;
  pitchWorkflowId?: string;
  metadata?: Record<string, any>;
  occurredAt?: Date;
  organizationId: string;
}

/**
 * Contact relationship summary
 */
export interface ContactRelationshipSummary {
  contactId: string;
  contactName: string;
  outlet: string | null;

  // Insights
  bioSummary: string | null;
  beatSummary: string | null;
  toneAnalysis: string | null;

  // Score
  relationshipTier: RelationshipTier;
  compositeScore: number;
  scoreBreakdown: {
    recency: number;
    frequency: number;
    quality: number;
    outcome: number;
    engagement: number;
  };

  // Interaction summary
  totalInteractions: number;
  successfulOutcomes: number;
  successRate: number;
  lastInteractionAt: Date | null;
  lastInteractionType: InteractionType | null;

  // Status
  relationshipStatus: RelationshipStatus;
  statusReason: string | null;
}

/**
 * Enrichment request
 */
export interface EnrichmentRequest {
  contactId: string;
  enrichmentTypes: Array<'BIO' | 'BEAT' | 'TONE' | 'SOCIAL' | 'COLLABORATION'>;
  organizationId: string;
}

/**
 * Enrichment result
 */
export interface EnrichmentResult {
  contactId: string;
  insight: CrmInsight;
  enrichedFields: string[];
  confidenceScore: number;
  source: string;
}

/**
 * Score calculation request
 */
export interface ScoreCalculationRequest {
  contactId: string;
  userId?: string;
  agentId?: string;
  modelId?: string;
  organizationId: string;
}

/**
 * Score calculation result
 */
export interface ScoreCalculationResult {
  score: RelationshipScore;
  factors: {
    recency: {
      score: number;
      weight: number;
      contribution: number;
      lastInteractionDays: number;
    };
    frequency: {
      score: number;
      weight: number;
      contribution: number;
      interactionsLast6Months: number;
    };
    quality: {
      score: number;
      weight: number;
      contribution: number;
      replyRate: number;
    };
    outcome: {
      score: number;
      weight: number;
      contribution: number;
      successRate: number;
    };
    engagement: {
      score: number;
      weight: number;
      contribution: number;
      engagementRate: number;
    };
  };
  rationale: string;
  recommendations: string[];
}

/**
 * Interaction summary
 */
export interface InteractionSummary {
  contactId: string;
  totalInteractions: number;
  interactionsByType: Record<InteractionType, number>;
  interactionsByChannel: Record<string, number>;
  successRate: number;
  avgResponseTimeHours: number;
  recentInteractions: CrmInteraction[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

/**
 * Tier distribution
 */
export interface TierDistribution {
  tierA: number;
  tierB: number;
  tierC: number;
  unrated: number;
  total: number;
}

/**
 * Relationship health metrics
 */
export interface RelationshipHealthMetrics {
  totalContacts: number;
  activeRelationships: number;
  dormantRelationships: number;
  coldRelationships: number;
  tierDistribution: TierDistribution;
  avgCompositeScore: number;
  avgInteractionsPerContact: number;
  overallSuccessRate: number;
  needsAttention: Array<{
    contactId: string;
    contactName: string;
    reason: string;
    lastInteractionAt: Date | null;
  }>;
}
