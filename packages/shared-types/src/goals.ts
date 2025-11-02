// =====================================================
// GOALS & ATTRIBUTION TYPES
// Sprint 26: Goal-Driven Strategy Layer
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Types of campaign goals
 */
export enum GoalType {
  AWARENESS = 'AWARENESS',           // Brand visibility and reach
  COVERAGE = 'COVERAGE',             // Media placements and mentions
  LEADS = 'LEADS',                   // Lead generation and acquisition
  PARTNERSHIPS = 'PARTNERSHIPS',     // Strategic partnerships formed
  REFERRALS = 'REFERRALS',          // Referral generation
  CONVERSIONS = 'CONVERSIONS',       // Sales or conversion events
  POSITIONING = 'POSITIONING',       // Brand positioning and messaging
}

/**
 * Goal priority levels
 */
export enum GoalPriority {
  CRITICAL = 'CRITICAL',             // Must-have, campaign success depends on it
  IMPORTANT = 'IMPORTANT',           // Should-have, significant impact
  NICE_TO_HAVE = 'NICE_TO_HAVE',    // Optional, nice bonus if achieved
}

/**
 * How goals are tracked
 */
export enum TrackingMethod {
  ENGAGEMENT = 'ENGAGEMENT',         // Tracked via engagement metrics
  INTERACTIONS = 'INTERACTIONS',     // Tracked via interaction counts
  PLACEMENTS = 'PLACEMENTS',         // Tracked via media placements
  CUSTOM = 'CUSTOM',                 // Custom tracking logic
}

/**
 * Attribution event types
 */
export enum AttributionEventType {
  REPLY_RECEIVED = 'REPLY_RECEIVED',             // Contact replied to outreach
  COVERAGE_SECURED = 'COVERAGE_SECURED',         // Media coverage obtained
  CONVERSION_MADE = 'CONVERSION_MADE',           // Conversion or sale completed
  PARTNERSHIP_FORMED = 'PARTNERSHIP_FORMED',     // Partnership established
  REFERRAL_RECEIVED = 'REFERRAL_RECEIVED',       // Referral obtained
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',       // Meeting or call scheduled
  CONTENT_PUBLISHED = 'CONTENT_PUBLISHED',       // Content went live
  ENGAGEMENT_MILESTONE = 'ENGAGEMENT_MILESTONE', // Engagement threshold reached
  LEAD_QUALIFIED = 'LEAD_QUALIFIED',             // Lead qualified
  OPPORTUNITY_CREATED = 'OPPORTUNITY_CREATED',   // Sales opportunity created
  CUSTOM_EVENT = 'CUSTOM_EVENT',                 // Custom attribution event
}

/**
 * Goal status
 */
export enum GoalStatus {
  DRAFT = 'DRAFT',           // Not yet active
  ACTIVE = 'ACTIVE',         // Currently being tracked
  ON_TRACK = 'ON_TRACK',     // Making good progress
  AT_RISK = 'AT_RISK',       // Behind schedule or underperforming
  COMPLETED = 'COMPLETED',   // Successfully achieved
  FAILED = 'FAILED',         // Did not achieve target
  CANCELED = 'CANCELED',     // Goal was canceled
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Campaign Goal
 * Strategic objective with measurable targets
 */
export interface CampaignGoal {
  id: string;
  organizationId: string;
  campaignId: string;

  // Goal definition
  goalType: GoalType;
  title: string;
  description?: string;

  // Target metrics (flexible structure)
  // Examples:
  // { reach: 100000, impressions: 500000 }
  // { placements: 10, tier1_outlets: 3 }
  // { leads: 50, qualified_leads: 20 }
  targetMetric: Record<string, number>;

  // Goal metadata
  priority: GoalPriority;
  trackingMethod: TrackingMethod;

  // Success criteria
  successConditions?: Record<string, unknown>;

  // Timeline
  dueDate?: string;

  // Status tracking
  status: GoalStatus;
  completionScore: number; // 0-100

  // User tracking
  createdBy: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Goal Outcome
 * Real-time tracking of goal progress
 */
export interface GoalOutcome {
  id: string;
  organizationId: string;
  goalId: string;

  // Current metrics (auto-updated)
  currentMetric: Record<string, number>;

  // Performance tracking
  totalAttributedEvents: number;
  lastEventAt?: string;

  // Trend analysis
  dailyProgress?: GoalProgressSnapshot[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Daily progress snapshot
 */
export interface GoalProgressSnapshot {
  date: string;
  metric: Record<string, number>;
  eventsCount: number;
}

/**
 * Attribution Event
 * Tracks individual success events contributing to goals
 */
export interface AttributionEvent {
  id: string;
  organizationId: string;

  // Event classification
  eventType: AttributionEventType;
  eventSubtype?: string;

  // Entity references
  campaignId?: string;
  contactId?: string;
  agentRunId?: string;
  goalId?: string;

  // Event details
  description?: string;
  value?: number; // Monetary or numeric value

  // Context metadata
  context: Record<string, unknown>;

  // Attribution weight (for multi-touch attribution)
  attributionWeight: number; // 0.0-1.0

  // User attribution
  attributedToUserId?: string;

  // Timestamps
  eventTimestamp: string;
  createdAt: string;
}

// =====================================================
// ENRICHED TYPES
// =====================================================

/**
 * Enriched Campaign Goal with outcome data
 */
export interface EnrichedCampaignGoal extends CampaignGoal {
  // Outcome data
  currentMetric: Record<string, number>;
  totalAttributedEvents: number;
  lastEventAt?: string;

  // Calculated fields
  isOverdue: boolean;
  daysUntilDue?: number;
  progressPercentage: number; // Derived from completion_score

  // Creator info
  creator?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
}

/**
 * Attribution Event with enriched context
 */
export interface EnrichedAttributionEvent extends AttributionEvent {
  // Contact details
  contactName?: string;
  contactEmail?: string;

  // Goal details
  goalTitle?: string;
  goalType?: GoalType;

  // Campaign details
  campaignName?: string;

  // User details
  attributedToUserName?: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for creating a campaign goal
 */
export interface CreateCampaignGoalInput {
  organizationId: string;
  campaignId: string;
  goalType: GoalType;
  title: string;
  description?: string;
  targetMetric: Record<string, number>;
  priority?: GoalPriority;
  trackingMethod?: TrackingMethod;
  successConditions?: Record<string, unknown>;
  dueDate?: string;
  createdBy: string;
}

/**
 * Input for updating a campaign goal
 */
export interface UpdateCampaignGoalInput {
  goalId: string;
  organizationId: string;
  title?: string;
  description?: string;
  targetMetric?: Record<string, number>;
  priority?: GoalPriority;
  trackingMethod?: TrackingMethod;
  successConditions?: Record<string, unknown>;
  dueDate?: string;
  status?: GoalStatus;
}

/**
 * Input for tracking an attribution event
 */
export interface TrackAttributionEventInput {
  organizationId: string;
  eventType: AttributionEventType;
  eventSubtype?: string;
  campaignId?: string;
  contactId?: string;
  agentRunId?: string;
  goalId?: string;
  description?: string;
  value?: number;
  context?: Record<string, unknown>;
  attributionWeight?: number;
  attributedToUserId?: string;
}

/**
 * Input for calculating goal progress
 */
export interface CalculateGoalProgressInput {
  goalId: string;
  organizationId: string;
}

/**
 * Input for summarizing goal performance (GPT-powered)
 */
export interface SummarizeGoalPerformanceInput {
  goalId?: string; // If not provided, summarize all campaign goals
  campaignId?: string;
  organizationId: string;
  includeRecommendations?: boolean;
  includeAttributionBreakdown?: boolean;
}

/**
 * Input for getting goal context for agents
 */
export interface GetGoalContextInput {
  campaignId: string;
  organizationId: string;
  includeOnlyActive?: boolean;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Goal summary result (from get_goal_summary function)
 */
export interface GoalSummaryResult {
  goalId: string;
  goalType: GoalType;
  title: string;
  description?: string;
  priority: GoalPriority;
  status: GoalStatus;
  targetMetric: Record<string, number>;
  currentMetric: Record<string, number>;
  completionScore: number;
  totalEvents: number;
  dueDate?: string;
  isOverdue: boolean;
  daysUntilDue?: number;
}

/**
 * Campaign goals overview
 */
export interface CampaignGoalsOverview {
  campaignId: string;
  goals: EnrichedCampaignGoal[];
  totalGoals: number;
  completedGoals: number;
  atRiskGoals: number;
  criticalGoals: number;
  averageCompletionScore: number;
}

/**
 * Attribution map (shows which events contributed to which goals)
 */
export interface AttributionMap {
  goalId: string;
  goalTitle: string;
  goalType: GoalType;
  events: EnrichedAttributionEvent[];
  totalEvents: number;
  totalValue: number;
  topContributors: {
    contactId: string;
    contactName: string;
    eventCount: number;
    totalValue: number;
  }[];
}

/**
 * Goal performance summary (GPT-generated)
 */
export interface GoalPerformanceSummary {
  goalId?: string;
  campaignId?: string;
  summaryText: string;
  generatedAt: string;

  // Structured insights
  keyAchievements?: string[];
  challenges?: string[];
  recommendations?: string[];

  // Attribution breakdown
  attributionBreakdown?: {
    eventType: AttributionEventType;
    count: number;
    percentage: number;
    totalValue?: number;
  }[];

  // Performance metrics
  overallScore: number; // 0-100
  velocityTrend: 'ACCELERATING' | 'STEADY' | 'SLOWING' | 'STALLED';
  projectedCompletion?: string; // Estimated completion date
}

/**
 * Goal context for agents (injected into planning)
 */
export interface GoalContextForAgent {
  campaignId: string;
  activeGoals: {
    goalId: string;
    goalType: GoalType;
    title: string;
    priority: GoalPriority;
    targetMetric: Record<string, number>;
    currentMetric: Record<string, number>;
    completionScore: number;
    dueDate?: string;
    daysUntilDue?: number;
  }[];
  criticalGoalsSummary: string; // Human-readable summary for agent
  strategicDirective: string; // What the agent should focus on
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Standard response for goal operations
 */
export interface GoalOperationResponse {
  success: boolean;
  goal?: CampaignGoal;
  error?: string;
}

/**
 * Response for attribution event tracking
 */
export interface AttributionEventResponse {
  success: boolean;
  eventId?: string;
  updatedGoals?: string[]; // IDs of goals that were recalculated
  error?: string;
}

/**
 * Response for goal summary
 */
export interface GoalSummaryResponse {
  success: boolean;
  goals?: GoalSummaryResult[];
  totalGoals?: number;
  error?: string;
}

/**
 * Response for attribution log
 */
export interface AttributionLogResponse {
  success: boolean;
  events?: EnrichedAttributionEvent[];
  totalEvents?: number;
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Goal type display configuration
 */
export interface GoalTypeConfig {
  type: GoalType;
  label: string;
  description: string;
  icon: string;
  defaultTrackingMethod: TrackingMethod;
  defaultMetricKeys: string[];
}

/**
 * Goal priority display configuration
 */
export interface GoalPriorityConfig {
  priority: GoalPriority;
  label: string;
  color: string;
  weight: number; // For sorting
}

/**
 * Goal status display configuration
 */
export interface GoalStatusConfig {
  status: GoalStatus;
  label: string;
  color: string;
  icon: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const GOAL_TYPE_CONFIGS: Record<GoalType, GoalTypeConfig> = {
  [GoalType.AWARENESS]: {
    type: GoalType.AWARENESS,
    label: 'Brand Awareness',
    description: 'Build visibility and reach',
    icon: 'eye',
    defaultTrackingMethod: TrackingMethod.ENGAGEMENT,
    defaultMetricKeys: ['reach', 'impressions', 'engagement'],
  },
  [GoalType.COVERAGE]: {
    type: GoalType.COVERAGE,
    label: 'Media Coverage',
    description: 'Secure media placements',
    icon: 'newspaper',
    defaultTrackingMethod: TrackingMethod.PLACEMENTS,
    defaultMetricKeys: ['placements', 'tier1_outlets', 'mentions'],
  },
  [GoalType.LEADS]: {
    type: GoalType.LEADS,
    label: 'Lead Generation',
    description: 'Generate qualified leads',
    icon: 'users',
    defaultTrackingMethod: TrackingMethod.INTERACTIONS,
    defaultMetricKeys: ['leads', 'qualified_leads', 'responses'],
  },
  [GoalType.PARTNERSHIPS]: {
    type: GoalType.PARTNERSHIPS,
    label: 'Partnerships',
    description: 'Form strategic partnerships',
    icon: 'handshake',
    defaultTrackingMethod: TrackingMethod.CUSTOM,
    defaultMetricKeys: ['partnerships', 'agreements', 'collaborations'],
  },
  [GoalType.REFERRALS]: {
    type: GoalType.REFERRALS,
    label: 'Referrals',
    description: 'Generate referrals',
    icon: 'share',
    defaultTrackingMethod: TrackingMethod.CUSTOM,
    defaultMetricKeys: ['referrals', 'introductions'],
  },
  [GoalType.CONVERSIONS]: {
    type: GoalType.CONVERSIONS,
    label: 'Conversions',
    description: 'Drive sales and conversions',
    icon: 'dollar-sign',
    defaultTrackingMethod: TrackingMethod.CUSTOM,
    defaultMetricKeys: ['conversions', 'revenue', 'deals'],
  },
  [GoalType.POSITIONING]: {
    type: GoalType.POSITIONING,
    label: 'Brand Positioning',
    description: 'Establish thought leadership',
    icon: 'award',
    defaultTrackingMethod: TrackingMethod.ENGAGEMENT,
    defaultMetricKeys: ['mentions', 'sentiment_score', 'share_of_voice'],
  },
};

export const GOAL_PRIORITY_CONFIGS: Record<GoalPriority, GoalPriorityConfig> = {
  [GoalPriority.CRITICAL]: {
    priority: GoalPriority.CRITICAL,
    label: 'Critical',
    color: '#EF4444', // red-500
    weight: 1,
  },
  [GoalPriority.IMPORTANT]: {
    priority: GoalPriority.IMPORTANT,
    label: 'Important',
    color: '#F59E0B', // amber-500
    weight: 2,
  },
  [GoalPriority.NICE_TO_HAVE]: {
    priority: GoalPriority.NICE_TO_HAVE,
    label: 'Nice to Have',
    color: '#10B981', // green-500
    weight: 3,
  },
};

export const GOAL_STATUS_CONFIGS: Record<GoalStatus, GoalStatusConfig> = {
  [GoalStatus.DRAFT]: {
    status: GoalStatus.DRAFT,
    label: 'Draft',
    color: '#6B7280', // gray-500
    icon: 'file',
  },
  [GoalStatus.ACTIVE]: {
    status: GoalStatus.ACTIVE,
    label: 'Active',
    color: '#3B82F6', // blue-500
    icon: 'activity',
  },
  [GoalStatus.ON_TRACK]: {
    status: GoalStatus.ON_TRACK,
    label: 'On Track',
    color: '#10B981', // green-500
    icon: 'trending-up',
  },
  [GoalStatus.AT_RISK]: {
    status: GoalStatus.AT_RISK,
    label: 'At Risk',
    color: '#F59E0B', // amber-500
    icon: 'alert-triangle',
  },
  [GoalStatus.COMPLETED]: {
    status: GoalStatus.COMPLETED,
    label: 'Completed',
    color: '#10B981', // green-500
    icon: 'check-circle',
  },
  [GoalStatus.FAILED]: {
    status: GoalStatus.FAILED,
    label: 'Failed',
    color: '#EF4444', // red-500
    icon: 'x-circle',
  },
  [GoalStatus.CANCELED]: {
    status: GoalStatus.CANCELED,
    label: 'Canceled',
    color: '#6B7280', // gray-500
    icon: 'slash',
  },
};
