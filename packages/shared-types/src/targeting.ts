// =====================================================
// INTELLIGENT TARGETING & CAMPAIGN READINESS TYPES
// =====================================================

/**
 * Match reason enumeration
 */
export enum MatchReason {
  RELATIONSHIP_SCORE = 'RELATIONSHIP_SCORE',
  TOPIC_ALIGNMENT = 'TOPIC_ALIGNMENT',
  PAST_SUCCESS = 'PAST_SUCCESS',
  BEAT_MATCH = 'BEAT_MATCH',
  OUTLET_MATCH = 'OUTLET_MATCH',
  TIER_QUALIFICATION = 'TIER_QUALIFICATION',
  ENGAGEMENT_HISTORY = 'ENGAGEMENT_HISTORY',
  AGENT_RECOMMENDATION = 'AGENT_RECOMMENDATION',
  MANUAL_SELECTION = 'MANUAL_SELECTION',
}

/**
 * Targeting mode enumeration
 */
export enum TargetingMode {
  AUTO = 'AUTO', // Fully automatic contact selection
  SEMI_AUTO = 'SEMI_AUTO', // Suggestions with human approval
  MANUAL = 'MANUAL', // Human-only selection
}

/**
 * Readiness status enumeration
 */
export enum ReadinessStatus {
  READY = 'READY',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  INSUFFICIENT_CONTACTS = 'INSUFFICIENT_CONTACTS',
  NOT_READY = 'NOT_READY',
}

/**
 * Campaign Contact Match
 */
export interface CampaignContactMatch {
  id: string;

  // Relationship context
  campaignId: string;
  contactId: string;

  // Match scoring
  matchScore: number;
  matchReasons: MatchReason[];
  matchRationale: string | null;

  // Score factor breakdown
  relationshipScoreFactor: number | null;
  topicAlignmentFactor: number | null;
  pastSuccessFactor: number | null;
  engagementFactor: number | null;

  // Exclusion and approval
  isExcluded: boolean;
  excludedReason: string | null;
  excludedBy: string | null;
  excludedAt: Date | null;

  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;

  // Agent involvement
  suggestedByAgent: string | null;
  agentConfidence: number | null;

  // Metadata
  metadata: Record<string, any> | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Contact Suitability Cache
 */
export interface ContactSuitabilityCache {
  id: string;
  contactId: string;

  // Preferences
  preferredTopics: string[] | null;
  preferredContentTypes: string[] | null;
  avoidanceTopics: string[] | null;

  // Behavioral patterns
  bestOutreachDays: string[] | null;
  bestOutreachTimes: string[] | null;
  avgResponseTimeHours: number | null;

  // Engagement indicators
  openRate: number | null;
  clickRate: number | null;
  replyRate: number | null;
  meetingAcceptanceRate: number | null;

  // Overall engagement level
  engagementLevel: string | null;

  // Cache metadata
  lastCalculatedAt: Date;
  dataFreshness: number | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Targeting Criteria
 */
export interface TargetingCriteria {
  // Relationship filters
  minRelationshipTier?: 'A' | 'B' | 'C';
  minRelationshipScore?: number;

  // Topic filters
  requiredTopics?: string[];
  preferredTopics?: string[];

  // Outlet filters
  targetOutlets?: string[];
  outletTypes?: string[];

  // Beat filters
  targetBeats?: string[];

  // Behavioral filters
  minEngagementScore?: number;
  minOpenRate?: number;
  minReplyRate?: number;

  // Past performance
  requirePastSuccess?: boolean;
  minSuccessRate?: number;

  // Exclusions
  excludedContacts?: string[];
  excludeRecentlyContacted?: boolean;
  recentlyContactedDays?: number;

  // Limits
  maxContacts?: number;
  minContacts?: number;

  // Agent preferences
  agentId?: string;
  useAgentRecommendations?: boolean;
}

/**
 * Contact Match Result
 */
export interface ContactMatchResult {
  contactId: string;
  contactName: string;
  outlet: string | null;
  beat: string | null;

  // Scoring
  matchScore: number;
  matchReasons: MatchReason[];
  matchRationale: string | null;

  // Score breakdown
  relationshipScoreFactor: number | null;
  topicAlignmentFactor: number | null;
  pastSuccessFactor: number | null;
  engagementFactor: number | null;

  // Relationship context
  relationshipTier: string | null;
  relationshipScore: number | null;
  totalInteractions: number;
  successfulOutcomes: number;
  lastInteractionAt: Date | null;

  // Engagement metrics
  openRate: number | null;
  replyRate: number | null;
  engagementLevel: string | null;

  // Topics
  matchingTopics: string[] | null;
  expertiseAreas: string[] | null;
}

/**
 * Campaign Readiness Result
 */
export interface CampaignReadinessResult {
  campaignId: string;
  readinessScore: number;
  readinessStatus: ReadinessStatus;

  // Match summary
  totalMatches: number;
  approvedMatches: number;
  avgMatchScore: number;

  // Tier distribution
  tierACount: number;
  tierBCount: number;
  tierCCount: number;

  // Issues
  issues: string[];
  recommendations: string[];

  // Metadata
  calculatedAt: Date;
}

/**
 * Input for matching contacts to campaign
 */
export interface MatchContactsRequest {
  campaignId: string;
  criteria: TargetingCriteria;
  organizationId: string;
  limit?: number;
}

/**
 * Input for calculating campaign readiness
 */
export interface CampaignReadinessRequest {
  campaignId: string;
  organizationId: string;
}

/**
 * Input for getting suitable contacts by topics
 */
export interface SuitableContactsRequest {
  topics: string[];
  organizationId: string;
  minRelationshipTier?: 'A' | 'B' | 'C';
  limit?: number;
}

/**
 * Input for creating campaign contact match
 */
export interface CreateCampaignContactMatchInput {
  campaignId: string;
  contactId: string;
  matchScore: number;
  matchReasons: MatchReason[];
  matchRationale?: string;
  relationshipScoreFactor?: number;
  topicAlignmentFactor?: number;
  pastSuccessFactor?: number;
  engagementFactor?: number;
  suggestedByAgent?: string;
  agentConfidence?: number;
  metadata?: Record<string, any>;
  organizationId: string;
}

/**
 * Input for updating campaign contact match
 */
export interface UpdateCampaignContactMatchInput {
  isExcluded?: boolean;
  excludedReason?: string;
  isApproved?: boolean;
}

/**
 * Bulk match operation result
 */
export interface BulkMatchResult {
  campaignId: string;
  matchesCreated: number;
  matchesUpdated: number;
  topMatches: ContactMatchResult[];
  readiness: CampaignReadinessResult;
}

/**
 * Targeting suggestions
 */
export interface TargetingSuggestion {
  contactId: string;
  contactName: string;
  outlet: string | null;
  suggestionReason: string;
  confidence: number;
  estimatedSuccessRate: number;
  relationshipTier: string | null;
  matchingTopics: string[];
}

/**
 * Targeting analytics
 */
export interface TargetingAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Match statistics
  totalMatchesCreated: number;
  avgMatchScore: number;
  matchesByReason: Record<MatchReason, number>;

  // Approval statistics
  approvalRate: number;
  avgTimeToApproval: number;
  topApprovers: Array<{
    userId: string;
    userName: string;
    approvalsCount: number;
  }>;

  // Effectiveness
  matchToSuccessRate: number;
  tierAEffectiveness: number;
  tierBEffectiveness: number;
  tierCEffectiveness: number;

  // Agent performance
  agentSuggestionAccuracy: number;
  topPerformingAgents: Array<{
    agentId: string;
    agentName: string;
    accuracy: number;
    suggestionsCount: number;
  }>;
}

/**
 * Campaign targeting summary
 */
export interface CampaignTargetingSummary {
  campaignId: string;
  campaignName: string;
  targetingMode: TargetingMode;

  // Criteria
  criteria: TargetingCriteria;

  // Matches
  totalMatches: number;
  approvedMatches: number;
  excludedMatches: number;
  pendingApproval: number;

  // Quality
  avgMatchScore: number;
  topMatchScore: number;
  lowMatchScore: number;

  // Readiness
  readinessScore: number;
  readinessStatus: ReadinessStatus;
  issues: string[];

  // Timeline
  lastMatchedAt: Date | null;
  lastApprovedAt: Date | null;
}

/**
 * Contact targeting profile
 */
export interface ContactTargetingProfile {
  contactId: string;
  contactName: string;
  outlet: string | null;

  // Suitability
  suitabilityCache: ContactSuitabilityCache | null;

  // Active matches
  activeCampaignMatches: Array<{
    campaignId: string;
    campaignName: string;
    matchScore: number;
    isApproved: boolean;
    createdAt: Date;
  }>;

  // Match history
  totalMatchesReceived: number;
  approvalRate: number;
  avgMatchScore: number;

  // Performance
  campaignsParticipated: number;
  successfulCampaigns: number;
  successRate: number;
}
