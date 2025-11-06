// =====================================================
// AGENT FEEDBACK TYPES
// Sprint 48 Phase 4.4
// =====================================================
//
// Purpose: Types for agent feedback and continuous improvement
// Provides: Feedback collection, analysis, improvement plans
//

// =====================================================
// ENUMS
// =====================================================

/**
 * Feedback rating types
 */
export enum FeedbackRating {
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  STAR_1 = 'star_1',
  STAR_2 = 'star_2',
  STAR_3 = 'star_3',
  STAR_4 = 'star_4',
  STAR_5 = 'star_5',
}

/**
 * Feedback scope/category
 */
export enum FeedbackScope {
  RESPONSE_QUALITY = 'response_quality',
  TONE = 'tone',
  ACCURACY = 'accuracy',
  HELPFULNESS = 'helpfulness',
  SPEED = 'speed',
  UNDERSTANDING = 'understanding',
  RELEVANCE = 'relevance',
  COMPLETENESS = 'completeness',
  PROFESSIONALISM = 'professionalism',
  OTHER = 'other',
}

/**
 * Improvement task priority
 */
export enum ImprovementPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Improvement task status
 */
export enum ImprovementStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

// =====================================================
// FEEDBACK INPUT/ENTRY
// =====================================================

/**
 * Input for submitting feedback
 */
export interface AgentFeedbackInput {
  agentId: string;
  messageId?: string;
  conversationId?: string;
  turnId?: string;
  rating: FeedbackRating;
  categories: FeedbackScope[];
  notes?: string;
  userId?: string;
  isAnonymous?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Stored feedback entry
 */
export interface AgentFeedbackEntry {
  id: string;
  agentId: string;
  messageId?: string;
  conversationId?: string;
  turnId?: string;
  rating: FeedbackRating;
  categories: FeedbackScope[];
  notes?: string;
  createdBy?: string;
  isAnonymous: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// FEEDBACK METRICS
// =====================================================

/**
 * Aggregate feedback metrics
 */
export interface FeedbackMetrics {
  agentId: string;
  totalFeedback: number;
  avgRating: number; // 0-5 scale
  thumbsUpCount: number;
  thumbsDownCount: number;
  ratingDistribution: {
    star_1: number;
    star_2: number;
    star_3: number;
    star_4: number;
    star_5: number;
  };
  categoryBreakdown: Record<FeedbackScope, number>;
  sentimentCorrelation?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Feedback summary
 */
export interface FeedbackSummary {
  metrics: FeedbackMetrics;
  trendingIssues: IssueSummary[];
  recentFeedback: AgentFeedbackEntry[];
  improvementOpportunities: string[];
}

/**
 * Issue summary from feedback
 */
export interface IssueSummary {
  category: FeedbackScope;
  count: number;
  percentage: number;
  avgRating: number;
  examples: string[]; // Sample feedback notes
}

// =====================================================
// IMPROVEMENT PLANS
// =====================================================

/**
 * Generated improvement plan
 */
export interface ImprovementPlan {
  id: string;
  agentId: string;
  title: string;
  description: string;
  priority: ImprovementPriority;
  status: ImprovementStatus;
  category: FeedbackScope;
  proposedChanges: ProposedChange[];
  reasoning: string;
  estimatedImpact: {
    expectedRatingIncrease: number; // e.g., +0.5 stars
    affectedInteractions: number;
  };
  generatedAt: Date;
  implementedAt?: Date;
  createdBy: string; // 'system' for GPT-4 generated
  metadata?: {
    feedbackSampleSize: number;
    confidence: number; // 0-1
    basedOnPatterns: string[];
  };
}

/**
 * Proposed change within improvement plan
 */
export interface ProposedChange {
  type: 'memory_update' | 'playbook_refinement' | 'personality_adjustment' | 'training_data' | 'system_prompt';
  target: string; // What to change (e.g., memory entry ID, playbook step)
  currentValue?: string;
  proposedValue: string;
  rationale: string;
  confidence: number; // 0-1
}

// =====================================================
// FEEDBACK DISTRIBUTION
// =====================================================

/**
 * Feedback distribution over time
 */
export interface FeedbackDistribution {
  agentId: string;
  interval: 'daily' | 'weekly' | 'monthly';
  dataPoints: FeedbackDataPoint[];
}

/**
 * Single data point in distribution
 */
export interface FeedbackDataPoint {
  date: string;
  totalCount: number;
  avgRating: number;
  thumbsUp: number;
  thumbsDown: number;
  categories: Record<FeedbackScope, number>;
}

// =====================================================
// COMMON ISSUES
// =====================================================

/**
 * Common issues identified from feedback
 */
export interface CommonIssues {
  agentId: string;
  issues: IssuePattern[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Pattern of recurring issue
 */
export interface IssuePattern {
  category: FeedbackScope;
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  examples: FeedbackExample[];
  suggestedFix?: string;
  relatedImprovementPlans?: string[]; // IDs of related plans
}

/**
 * Example feedback for an issue
 */
export interface FeedbackExample {
  feedbackId: string;
  rating: FeedbackRating;
  notes: string;
  date: Date;
}

// =====================================================
// RATING TRENDS
// =====================================================

/**
 * Rating trends over time
 */
export interface RatingTrends {
  agentId: string;
  trends: TrendDataPoint[];
  overallTrend: 'improving' | 'stable' | 'declining';
  changeRate: number; // Percentage change per period
}

/**
 * Single trend data point
 */
export interface TrendDataPoint {
  date: string;
  avgRating: number;
  count: number;
  movingAverage?: number; // 7-day or 30-day moving average
}

// =====================================================
// FEEDBACK FILTER/QUERY
// =====================================================

/**
 * Feedback query options
 */
export interface FeedbackQueryOptions {
  agentId: string;
  startDate?: Date;
  endDate?: Date;
  rating?: FeedbackRating;
  categories?: FeedbackScope[];
  minRating?: number; // For star ratings
  maxRating?: number;
  isAnonymous?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'rating';
  orderDirection?: 'asc' | 'desc';
}

// =====================================================
// IMPROVEMENT TASK APPLICATION
// =====================================================

/**
 * Result of applying an improvement
 */
export interface ImprovementApplicationResult {
  planId: string;
  success: boolean;
  appliedChanges: AppliedChange[];
  errors?: string[];
  timestamp: Date;
}

/**
 * Applied change record
 */
export interface AppliedChange {
  changeType: ProposedChange['type'];
  target: string;
  oldValue?: string;
  newValue: string;
  success: boolean;
  error?: string;
}

// =====================================================
// FEEDBACK ANALYTICS
// =====================================================

/**
 * Advanced feedback analytics
 */
export interface FeedbackAnalytics {
  agentId: string;
  timeframe: string;
  overallScore: number;
  scoreChange: number; // vs previous period
  categoryScores: Record<FeedbackScope, number>;
  topStrengths: Array<{ category: FeedbackScope; score: number }>;
  topWeaknesses: Array<{ category: FeedbackScope; score: number }>;
  userSatisfactionRate: number; // Percentage of thumbs up
  criticalIssuesCount: number;
  improvementVelocity: number; // Rate of score improvement
}

