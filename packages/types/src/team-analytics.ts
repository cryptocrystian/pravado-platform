// =====================================================
// TEAM ANALYTICS & BEHAVIORAL INSIGHTS TYPES
// Sprint 32: Activity tracking, anomaly detection, coaching
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Activity type enum
 * Types of activities users and agents can perform
 */
export enum ActivityType {
  AGENT_RUN = 'AGENT_RUN',
  FOLLOWUP_SENT = 'FOLLOWUP_SENT',
  GOAL_UPDATED = 'GOAL_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED',
  CONTACT_ADDED = 'CONTACT_ADDED',
  PERSONA_ASSIGNED = 'PERSONA_ASSIGNED',
  PROMPT_CREATED = 'PROMPT_CREATED',
  STRATEGY_UPDATED = 'STRATEGY_UPDATED',
}

/**
 * Anomaly type enum
 * Types of behavioral anomalies that can be detected
 */
export enum AnomalyType {
  LOW_ACTIVITY = 'LOW_ACTIVITY',      // Activity dropped below threshold
  SPIKE = 'SPIKE',                    // Sudden increase in activity
  PATTERN_SHIFT = 'PATTERN_SHIFT',    // Change in typical work pattern
  OUTLIER_BEHAVIOR = 'OUTLIER_BEHAVIOR', // Behavior significantly different from team
}

/**
 * Engagement mode enum
 * How the activity was performed
 */
export enum EngagementMode {
  MANUAL = 'MANUAL',          // User performed action manually
  AI_ASSISTED = 'AI_ASSISTED', // User initiated, AI helped
  AUTONOMOUS = 'AUTONOMOUS',   // Fully autonomous AI action
}

/**
 * Anomaly severity enum
 */
export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Velocity trend enum
 */
export enum VelocityTrend {
  INCREASING = 'increasing',
  STABLE = 'stable',
  DECREASING = 'decreasing',
}

/**
 * Window type for metrics
 */
export enum WindowType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Team Activity Event
 * Single activity record in the feed
 */
export interface TeamActivityEvent {
  id: string;
  organizationId: string;

  // User info
  userId: string;
  userEmail: string;
  userName: string;

  // Activity details
  activityType: ActivityType;
  engagementMode: EngagementMode;

  // Context
  campaignId?: string;
  agentId?: string;
  contactId?: string;
  taskId?: string;

  // Activity metadata
  activityTitle?: string;
  activityDescription?: string;
  metadata: Record<string, any>;

  // Duration tracking (in seconds)
  durationSeconds?: number;

  // Success/quality metrics
  success: boolean;
  qualityScore?: number; // 0.00 to 1.00

  // Timestamps
  occurredAt: string;
  createdAt: string;
}

/**
 * Team Behavior Metrics
 * Aggregated statistics per user over time window
 */
export interface TeamBehaviorMetrics {
  id: string;
  organizationId: string;
  userId: string;

  // Time window
  periodStart: string;
  periodEnd: string;
  windowType: WindowType;

  // Activity counts by type
  agentRuns: number;
  followupsSent: number;
  goalsUpdated: number;
  commentsAdded: number;
  tasksCreated: number;
  tasksCompleted: number;
  reportsGenerated: number;
  reviewsSubmitted: number;

  // Engagement breakdown
  manualActions: number;
  aiAssistedActions: number;
  autonomousActions: number;

  // Performance metrics
  totalActivities: number;
  successRate?: number; // 0.00 to 100.00
  averageQualityScore?: number; // 0.00 to 1.00
  averageDurationSeconds?: number;

  // Productivity metrics
  activeDays: number;
  peakActivityHour?: number; // 0-23
  campaignsTouched: number;

  // Comparison metrics
  teamPercentile?: number; // 0.00 to 100.00
  velocityTrend?: VelocityTrend;

  // Timestamps
  calculatedAt: string;
  createdAt: string;
}

/**
 * Behavioral Anomaly
 * Flagged unusual pattern for review
 */
export interface BehavioralAnomaly {
  id: string;
  organizationId: string;
  userId: string;

  // Anomaly classification
  anomalyType: AnomalyType;
  severity: AnomalySeverity;

  // Detection details
  detectedAt: string;
  detectionWindowStart: string;
  detectionWindowEnd: string;

  // Metrics
  baselineValue?: number;
  observedValue?: number;
  deviationPercent?: number;

  // Context
  metricName: string;
  activityTypes?: ActivityType[];
  campaignId?: string;

  // Analysis
  description: string;
  possibleCauses: string[];
  recommendedActions: string[];

  // Resolution tracking
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;

  // AI insights
  aiAnalysis?: Record<string, any>;
  confidenceScore?: number; // 0.00 to 1.00

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Team Activity Feed Result
 * Result from activity feed query
 */
export interface TeamActivityFeedResult {
  events: TeamActivityEvent[];
  total: number;
}

/**
 * Behavior Metrics Result
 * Result from metrics query
 */
export interface BehaviorMetricsResult {
  metrics: TeamBehaviorMetrics[];
  total: number;
}

/**
 * Anomalies Result
 * Result from anomalies query
 */
export interface AnomaliesResult {
  anomalies: BehavioralAnomaly[];
  total: number;
}

/**
 * Team Summary
 * High-level team behavioral summary
 */
export interface TeamSummary {
  periodStart: string;
  periodEnd: string;
  activeUsers: number;
  totalActivities: number;
  topPerformers: TopPerformer[];
  activityDistribution: Record<string, number>;
  engagementBreakdown: Record<string, number>;
}

/**
 * Top Performer
 */
export interface TopPerformer {
  userId: string;
  userName: string;
  totalActivities: number;
  successRate: number;
}

/**
 * GPT Team Pattern Summary
 * AI-generated insights about team patterns
 */
export interface GptTeamPatternSummary {
  summary: string;
  keyInsights: string[];
  trends: TrendInsight[];
  recommendations: string[];
  generatedAt: string;
}

/**
 * Trend Insight
 */
export interface TrendInsight {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  description: string;
}

/**
 * Coaching Opportunity
 * AI-generated coaching recommendation
 */
export interface CoachingOpportunity {
  userId: string;
  userName: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  issue: string;
  recommendation: string;
  actionItems: string[];
  relatedAnomalies?: string[]; // Anomaly IDs
}

/**
 * Performance Trend
 * User performance over time
 */
export interface PerformanceTrend {
  userId: string;
  userName: string;
  dataPoints: PerformanceDataPoint[];
  trend: VelocityTrend;
  averageActivity: number;
}

/**
 * Performance Data Point
 */
export interface PerformanceDataPoint {
  date: string;
  activityCount: number;
  successRate?: number;
  qualityScore?: number;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Log Team Event Input
 */
export interface LogTeamEventInput {
  organizationId: string;
  userId: string;
  activityType: ActivityType;
  engagementMode?: EngagementMode;
  campaignId?: string;
  agentId?: string;
  contactId?: string;
  taskId?: string;
  activityTitle?: string;
  activityDescription?: string;
  metadata?: Record<string, any>;
  durationSeconds?: number;
  success?: boolean;
  qualityScore?: number;
}

/**
 * Calculate Metrics Input
 */
export interface CalculateMetricsInput {
  organizationId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  windowType?: WindowType;
}

/**
 * Detect Anomalies Input
 */
export interface DetectAnomaliesInput {
  organizationId: string;
  userId: string;
  detectionWindowStart: string;
  detectionWindowEnd: string;
}

/**
 * Get Activity Feed Input
 */
export interface GetActivityFeedInput {
  organizationId: string;
  userId?: string;
  campaignId?: string;
  activityTypes?: ActivityType[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Behavior Metrics Input
 */
export interface GetBehaviorMetricsInput {
  organizationId: string;
  userId?: string;
  windowType?: WindowType;
  periodStart?: string;
  periodEnd?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Anomalies Input
 */
export interface GetAnomaliesInput {
  organizationId: string;
  userId?: string;
  anomalyType?: AnomalyType;
  severity?: AnomalySeverity;
  isResolved?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Summarize Team Patterns Input
 */
export interface SummarizeTeamPatternsInput {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  includeCoaching?: boolean;
}

/**
 * Recommend Coaching Input
 */
export interface RecommendCoachingInput {
  organizationId: string;
  userId?: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Resolve Anomaly Input
 */
export interface ResolveAnomalyInput {
  anomalyId: string;
  organizationId: string;
  resolvedBy: string;
  resolutionNotes?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Log Event Response
 */
export interface LogEventResponse {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Calculate Metrics Response
 */
export interface CalculateMetricsResponse {
  success: boolean;
  metricId?: string;
  metrics?: TeamBehaviorMetrics;
  error?: string;
}

/**
 * Detect Anomalies Response
 */
export interface DetectAnomaliesResponse {
  success: boolean;
  anomalies?: BehavioralAnomaly[];
  totalDetected?: number;
  error?: string;
}

/**
 * Get Activity Feed Response
 */
export interface GetActivityFeedResponse {
  success: boolean;
  events?: TeamActivityEvent[];
  total?: number;
  error?: string;
}

/**
 * Get Behavior Metrics Response
 */
export interface GetBehaviorMetricsResponse {
  success: boolean;
  metrics?: TeamBehaviorMetrics[];
  total?: number;
  error?: string;
}

/**
 * Get Anomalies Response
 */
export interface GetAnomaliesResponse {
  success: boolean;
  anomalies?: BehavioralAnomaly[];
  total?: number;
  error?: string;
}

/**
 * Summarize Team Patterns Response
 */
export interface SummarizeTeamPatternsResponse {
  success: boolean;
  summary?: GptTeamPatternSummary;
  teamSummary?: TeamSummary;
  error?: string;
}

/**
 * Recommend Coaching Response
 */
export interface RecommendCoachingResponse {
  success: boolean;
  opportunities?: CoachingOpportunity[];
  total?: number;
  error?: string;
}

/**
 * Resolve Anomaly Response
 */
export interface ResolveAnomalyResponse {
  success: boolean;
  anomaly?: BehavioralAnomaly;
  error?: string;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

/**
 * Activity Type Configuration
 */
export interface ActivityTypeConfig {
  type: ActivityType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: 'creation' | 'communication' | 'analysis' | 'management';
}

/**
 * Anomaly Type Configuration
 */
export interface AnomalyTypeConfig {
  type: AnomalyType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Engagement Mode Configuration
 */
export interface EngagementModeConfig {
  mode: EngagementMode;
  label: string;
  description: string;
  icon: string;
  color: string;
  badge: string;
}

/**
 * Anomaly Severity Configuration
 */
export interface AnomalySeverityConfig {
  severity: AnomalySeverity;
  label: string;
  color: string;
  icon: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const ACTIVITY_TYPE_CONFIGS: Record<ActivityType, ActivityTypeConfig> = {
  [ActivityType.AGENT_RUN]: {
    type: ActivityType.AGENT_RUN,
    label: 'Agent Run',
    description: 'Executed an AI agent task',
    icon: 'cpu',
    color: '#3B82F6', // blue-500
    category: 'creation',
  },
  [ActivityType.FOLLOWUP_SENT]: {
    type: ActivityType.FOLLOWUP_SENT,
    label: 'Follow-up Sent',
    description: 'Sent a follow-up message',
    icon: 'send',
    color: '#10B981', // green-500
    category: 'communication',
  },
  [ActivityType.GOAL_UPDATED]: {
    type: ActivityType.GOAL_UPDATED,
    label: 'Goal Updated',
    description: 'Updated campaign goals',
    icon: 'target',
    color: '#F59E0B', // amber-500
    category: 'management',
  },
  [ActivityType.COMMENT_ADDED]: {
    type: ActivityType.COMMENT_ADDED,
    label: 'Comment Added',
    description: 'Added a comment or note',
    icon: 'message-square',
    color: '#8B5CF6', // purple-500
    category: 'communication',
  },
  [ActivityType.TASK_CREATED]: {
    type: ActivityType.TASK_CREATED,
    label: 'Task Created',
    description: 'Created a new task',
    icon: 'plus-circle',
    color: '#06B6D4', // cyan-500
    category: 'creation',
  },
  [ActivityType.TASK_COMPLETED]: {
    type: ActivityType.TASK_COMPLETED,
    label: 'Task Completed',
    description: 'Marked a task as complete',
    icon: 'check-circle',
    color: '#10B981', // green-500
    category: 'management',
  },
  [ActivityType.REPORT_GENERATED]: {
    type: ActivityType.REPORT_GENERATED,
    label: 'Report Generated',
    description: 'Generated an analytics report',
    icon: 'file-text',
    color: '#6366F1', // indigo-500
    category: 'analysis',
  },
  [ActivityType.REVIEW_SUBMITTED]: {
    type: ActivityType.REVIEW_SUBMITTED,
    label: 'Review Submitted',
    description: 'Submitted a review or approval',
    icon: 'check-square',
    color: '#EC4899', // pink-500
    category: 'management',
  },
  [ActivityType.CAMPAIGN_CREATED]: {
    type: ActivityType.CAMPAIGN_CREATED,
    label: 'Campaign Created',
    description: 'Created a new campaign',
    icon: 'briefcase',
    color: '#3B82F6', // blue-500
    category: 'creation',
  },
  [ActivityType.CAMPAIGN_UPDATED]: {
    type: ActivityType.CAMPAIGN_UPDATED,
    label: 'Campaign Updated',
    description: 'Updated campaign details',
    icon: 'edit',
    color: '#F59E0B', // amber-500
    category: 'management',
  },
  [ActivityType.CONTACT_ADDED]: {
    type: ActivityType.CONTACT_ADDED,
    label: 'Contact Added',
    description: 'Added a new contact',
    icon: 'user-plus',
    color: '#10B981', // green-500
    category: 'creation',
  },
  [ActivityType.PERSONA_ASSIGNED]: {
    type: ActivityType.PERSONA_ASSIGNED,
    label: 'Persona Assigned',
    description: 'Assigned persona to contact',
    icon: 'users',
    color: '#8B5CF6', // purple-500
    category: 'analysis',
  },
  [ActivityType.PROMPT_CREATED]: {
    type: ActivityType.PROMPT_CREATED,
    label: 'Prompt Created',
    description: 'Created a prompt template',
    icon: 'file-plus',
    color: '#06B6D4', // cyan-500
    category: 'creation',
  },
  [ActivityType.STRATEGY_UPDATED]: {
    type: ActivityType.STRATEGY_UPDATED,
    label: 'Strategy Updated',
    description: 'Updated campaign strategy',
    icon: 'trending-up',
    color: '#F59E0B', // amber-500
    category: 'management',
  },
};

export const ANOMALY_TYPE_CONFIGS: Record<AnomalyType, AnomalyTypeConfig> = {
  [AnomalyType.LOW_ACTIVITY]: {
    type: AnomalyType.LOW_ACTIVITY,
    label: 'Low Activity',
    description: 'Activity dropped significantly below normal',
    icon: 'trending-down',
    color: '#EF4444', // red-500
  },
  [AnomalyType.SPIKE]: {
    type: AnomalyType.SPIKE,
    label: 'Activity Spike',
    description: 'Sudden increase in activity',
    icon: 'trending-up',
    color: '#F59E0B', // amber-500
  },
  [AnomalyType.PATTERN_SHIFT]: {
    type: AnomalyType.PATTERN_SHIFT,
    label: 'Pattern Shift',
    description: 'Change in typical work patterns',
    icon: 'shuffle',
    color: '#8B5CF6', // purple-500
  },
  [AnomalyType.OUTLIER_BEHAVIOR]: {
    type: AnomalyType.OUTLIER_BEHAVIOR,
    label: 'Outlier Behavior',
    description: 'Behavior differs significantly from team',
    icon: 'alert-triangle',
    color: '#F59E0B', // amber-500
  },
};

export const ENGAGEMENT_MODE_CONFIGS: Record<EngagementMode, EngagementModeConfig> = {
  [EngagementMode.MANUAL]: {
    mode: EngagementMode.MANUAL,
    label: 'Manual',
    description: 'User performed action manually',
    icon: 'hand',
    color: '#6B7280', // gray-500
    badge: 'Manual',
  },
  [EngagementMode.AI_ASSISTED]: {
    mode: EngagementMode.AI_ASSISTED,
    label: 'AI Assisted',
    description: 'User initiated with AI assistance',
    icon: 'zap',
    color: '#3B82F6', // blue-500
    badge: 'AI Assisted',
  },
  [EngagementMode.AUTONOMOUS]: {
    mode: EngagementMode.AUTONOMOUS,
    label: 'Autonomous',
    description: 'Fully autonomous AI action',
    icon: 'cpu',
    color: '#8B5CF6', // purple-500
    badge: 'Autonomous',
  },
};

export const SEVERITY_CONFIGS: Record<AnomalySeverity, AnomalySeverityConfig> = {
  [AnomalySeverity.LOW]: {
    severity: AnomalySeverity.LOW,
    label: 'Low',
    color: '#10B981', // green-500
    icon: 'info',
  },
  [AnomalySeverity.MEDIUM]: {
    severity: AnomalySeverity.MEDIUM,
    label: 'Medium',
    color: '#F59E0B', // amber-500
    icon: 'alert-circle',
  },
  [AnomalySeverity.HIGH]: {
    severity: AnomalySeverity.HIGH,
    label: 'High',
    color: '#EF4444', // red-500
    icon: 'alert-triangle',
  },
  [AnomalySeverity.CRITICAL]: {
    severity: AnomalySeverity.CRITICAL,
    label: 'Critical',
    color: '#991B1B', // red-800
    icon: 'alert-octagon',
  },
};

/**
 * Team analytics constants
 */
export const TEAM_ANALYTICS_CONSTANTS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
  DEFAULT_WINDOW_TYPE: WindowType.DAILY,
  LOW_ACTIVITY_THRESHOLD: -50, // % deviation
  SPIKE_THRESHOLD: 100, // % deviation
  HIGH_PERCENTILE: 75,
  LOW_PERCENTILE: 25,
  QUALITY_EXCELLENT_THRESHOLD: 0.8,
  QUALITY_GOOD_THRESHOLD: 0.6,
  QUALITY_FAIR_THRESHOLD: 0.4,
  SUCCESS_RATE_EXCELLENT: 90,
  SUCCESS_RATE_GOOD: 75,
  SUCCESS_RATE_FAIR: 60,
};
