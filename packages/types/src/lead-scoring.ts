// =====================================================
// LEAD SCORING TYPES
// Sprint 28: Lead scoring and qualification pipeline
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Lead qualification stages
 */
export enum LeadStage {
  UNQUALIFIED = 'UNQUALIFIED',     // New lead, not yet scored
  IN_PROGRESS = 'IN_PROGRESS',     // Being nurtured/evaluated
  QUALIFIED = 'QUALIFIED',         // Meets qualification criteria
  DISQUALIFIED = 'DISQUALIFIED',   // Does not meet criteria
}

/**
 * Disqualification reasons
 */
export enum DisqualificationReason {
  BOUNCED = 'BOUNCED',                 // Email bounced
  NO_BUDGET = 'NO_BUDGET',             // Budget constraints
  NOT_INTERESTED = 'NOT_INTERESTED',   // Explicitly not interested
  BAD_FIT = 'BAD_FIT',                 // Not a good fit for offering
  WRONG_PERSONA = 'WRONG_PERSONA',     // Not the right decision maker
  TIMING = 'TIMING',                   // Bad timing (maybe later)
  COMPETITOR = 'COMPETITOR',           // Using competitor
  OTHER = 'OTHER',                     // Other reason
}

/**
 * Lead score source
 */
export enum LeadScoreSource {
  SYSTEM = 'SYSTEM',    // Automatically calculated
  MANUAL = 'MANUAL',    // Manually set by user
  AI = 'AI',            // GPT-powered evaluation
  RULE = 'RULE',        // Rule-based update
}

/**
 * RAG status (Red/Amber/Green)
 */
export enum RAGStatus {
  RED = 'RED',       // Score < 40
  AMBER = 'AMBER',   // Score 40-69
  GREEN = 'GREEN',   // Score >= 70
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Lead Score
 * Primary scoring entity for contacts
 */
export interface LeadScore {
  id: string;
  organizationId: string;

  // References
  contactId: string;
  campaignId?: string;

  // Scoring
  rawScore: number; // 0-100
  confidenceScore: number; // 0.0-1.0

  // Stage
  stage: LeadStage;
  disqualificationReason?: DisqualificationReason;
  disqualificationNotes?: string;

  // Component scores
  engagementScore: number; // 0-100
  sentimentScore: number; // 0-100
  behaviorScore: number; // 0-100
  fitScore: number; // 0-100

  // Metadata
  lastCalculatedAt: string;
  lastStageChangeAt: string;
  calculatedBy: LeadScoreSource;

  // RAG status (auto-calculated from rawScore)
  ragStatus: RAGStatus;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Lead Score History
 * Audit trail of score changes
 */
export interface LeadScoreHistory {
  id: string;
  organizationId: string;

  // References
  leadScoreId: string;
  contactId: string;

  // What changed
  changeType: 'SCORE_UPDATE' | 'STAGE_CHANGE' | 'DISQUALIFICATION';

  // Before/after
  beforeScore?: number;
  afterScore?: number;
  beforeStage?: LeadStage;
  afterStage?: LeadStage;

  // Context
  source: LeadScoreSource;
  agentId?: string;
  userId?: string;
  reason?: string;

  // Metadata
  metadata: Record<string, unknown>;
  timestamp: string;
}

// =====================================================
// ENRICHED TYPES
// =====================================================

/**
 * Enriched Lead Score with contact details
 */
export interface EnrichedLeadScore extends LeadScore {
  contactName?: string;
  contactEmail?: string;
  campaignName?: string;

  // Trend indicators
  scoreChange?: number; // Change from last calculation
  trendDirection?: 'UP' | 'DOWN' | 'STABLE';

  // Additional context
  daysInStage?: number;
  lastEngagementDate?: string;
}

/**
 * Lead Score Summary (campaign-level)
 */
export interface LeadScoreSummary {
  campaignId?: string;

  // Counts by stage
  totalLeads: number;
  qualifiedCount: number;
  disqualifiedCount: number;
  inProgressCount: number;
  unqualifiedCount: number;

  // Score statistics
  avgScore: number;

  // RAG distribution
  greenCount: number;
  amberCount: number;
  redCount: number;

  // Percentages
  qualificationRate: number; // % qualified
  disqualificationRate: number; // % disqualified
}

/**
 * Lead Score Trend Point
 */
export interface LeadScoreTrendPoint {
  timestamp: string;
  score: number;
  stage: LeadStage;
  changeType: string;
  source: LeadScoreSource;
}

/**
 * Lead Performance Summary (GPT-powered)
 */
export interface LeadPerformanceSummary {
  contactId: string;
  contactName?: string;
  currentScore: number;
  currentStage: LeadStage;

  // AI-generated insights
  summaryText: string;
  generatedAt: string;

  // Structured insights
  strengths?: string[];
  weaknesses?: string[];
  recommendedActions?: string[];

  // Scoring breakdown
  componentScores: {
    engagement: number;
    sentiment: number;
    behavior: number;
    fit: number;
  };

  // Qualification recommendation
  shouldQualify?: boolean;
  qualificationReasoning?: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for recalculating lead score
 */
export interface RecalculateLeadScoreInput {
  contactId: string;
  campaignId?: string;
  organizationId: string;
}

/**
 * Input for updating lead stage
 */
export interface UpdateLeadStageInput {
  contactId: string;
  campaignId?: string;
  organizationId: string;
  newStage: LeadStage;
  disqualificationReason?: DisqualificationReason;
  disqualificationNotes?: string;
  userId?: string;
  source?: LeadScoreSource;
}

/**
 * Input for manual score adjustment
 */
export interface ManualScoreAdjustmentInput {
  contactId: string;
  campaignId?: string;
  organizationId: string;
  newScore: number;
  reason: string;
  userId: string;
}

/**
 * Input for auto-qualification check
 */
export interface AutoQualifyInput {
  contactId: string;
  campaignId?: string;
  organizationId: string;
  threshold?: number; // Minimum score for auto-qualify (default 70)
}

/**
 * Input for lead performance summary
 */
export interface SummarizeLeadPerformanceInput {
  contactId: string;
  organizationId: string;
  campaignId?: string;
  includeRecommendations?: boolean;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Top leads result
 */
export interface TopLeadsResult {
  leads: EnrichedLeadScore[];
  total: number;
  avgScore: number;
}

/**
 * Disqualified leads result
 */
export interface DisqualifiedLeadsResult {
  leads: EnrichedLeadScore[];
  total: number;
  byReason: Record<DisqualificationReason, number>;
}

/**
 * Qualified leads result
 */
export interface QualifiedLeadsResult {
  leads: EnrichedLeadScore[];
  total: number;
  avgScore: number;
  recentlyQualified: EnrichedLeadScore[]; // Last 7 days
}

/**
 * Lead trend result
 */
export interface LeadTrendResult {
  contactId: string;
  trends: LeadScoreTrendPoint[];
  currentScore: number;
  highestScore: number;
  lowestScore: number;
  avgScore: number;
  trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Standard response for lead operations
 */
export interface LeadScoreResponse {
  success: boolean;
  score?: LeadScore;
  error?: string;
}

/**
 * Response for score calculation
 */
export interface CalculateScoreResponse {
  success: boolean;
  score?: number;
  leadScore?: LeadScore;
  error?: string;
}

/**
 * Response for stage update
 */
export interface UpdateStageResponse {
  success: boolean;
  leadScore?: LeadScore;
  message?: string;
  error?: string;
}

/**
 * Response for lead summary
 */
export interface LeadSummaryResponse {
  success: boolean;
  summary?: LeadScoreSummary;
  error?: string;
}

/**
 * Response for lead history
 */
export interface LeadHistoryResponse {
  success: boolean;
  history?: LeadScoreHistory[];
  total?: number;
  error?: string;
}

/**
 * Response for lead trend
 */
export interface LeadTrendResponse {
  success: boolean;
  trend?: LeadTrendResult;
  error?: string;
}

/**
 * Response for lead performance summary
 */
export interface LeadPerformanceSummaryResponse {
  success: boolean;
  summary?: LeadPerformanceSummary;
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Lead stage configuration for UI
 */
export interface LeadStageConfig {
  stage: LeadStage;
  label: string;
  color: string;
  icon: string;
  description: string;
}

/**
 * RAG status configuration for UI
 */
export interface RAGStatusConfig {
  status: RAGStatus;
  label: string;
  color: string;
  minScore: number;
  maxScore: number;
}

/**
 * Disqualification reason configuration
 */
export interface DisqualificationReasonConfig {
  reason: DisqualificationReason;
  label: string;
  icon: string;
  description: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const LEAD_STAGE_CONFIGS: Record<LeadStage, LeadStageConfig> = {
  [LeadStage.UNQUALIFIED]: {
    stage: LeadStage.UNQUALIFIED,
    label: 'Unqualified',
    color: '#9CA3AF', // gray-400
    icon: 'circle',
    description: 'New lead, not yet evaluated',
  },
  [LeadStage.IN_PROGRESS]: {
    stage: LeadStage.IN_PROGRESS,
    label: 'In Progress',
    color: '#3B82F6', // blue-500
    icon: 'clock',
    description: 'Being nurtured and evaluated',
  },
  [LeadStage.QUALIFIED]: {
    stage: LeadStage.QUALIFIED,
    label: 'Qualified',
    color: '#10B981', // green-500
    icon: 'check-circle',
    description: 'Meets qualification criteria',
  },
  [LeadStage.DISQUALIFIED]: {
    stage: LeadStage.DISQUALIFIED,
    label: 'Disqualified',
    color: '#EF4444', // red-500
    icon: 'x-circle',
    description: 'Does not meet criteria',
  },
};

export const RAG_STATUS_CONFIGS: Record<RAGStatus, RAGStatusConfig> = {
  [RAGStatus.RED]: {
    status: RAGStatus.RED,
    label: 'Red',
    color: '#EF4444', // red-500
    minScore: 0,
    maxScore: 39,
  },
  [RAGStatus.AMBER]: {
    status: RAGStatus.AMBER,
    label: 'Amber',
    color: '#F59E0B', // amber-500
    minScore: 40,
    maxScore: 69,
  },
  [RAGStatus.GREEN]: {
    status: RAGStatus.GREEN,
    label: 'Green',
    color: '#10B981', // green-500
    minScore: 70,
    maxScore: 100,
  },
};

export const DISQUALIFICATION_REASON_CONFIGS: Record<DisqualificationReason, DisqualificationReasonConfig> = {
  [DisqualificationReason.BOUNCED]: {
    reason: DisqualificationReason.BOUNCED,
    label: 'Email Bounced',
    icon: 'mail-x',
    description: 'Email address is invalid or inbox is full',
  },
  [DisqualificationReason.NO_BUDGET]: {
    reason: DisqualificationReason.NO_BUDGET,
    label: 'No Budget',
    icon: 'dollar-sign',
    description: 'Budget constraints prevent purchase',
  },
  [DisqualificationReason.NOT_INTERESTED]: {
    reason: DisqualificationReason.NOT_INTERESTED,
    label: 'Not Interested',
    icon: 'thumbs-down',
    description: 'Explicitly stated no interest',
  },
  [DisqualificationReason.BAD_FIT]: {
    reason: DisqualificationReason.BAD_FIT,
    label: 'Bad Fit',
    icon: 'slash',
    description: 'Not a good fit for our offering',
  },
  [DisqualificationReason.WRONG_PERSONA]: {
    reason: DisqualificationReason.WRONG_PERSONA,
    label: 'Wrong Persona',
    icon: 'user-x',
    description: 'Not the right decision maker',
  },
  [DisqualificationReason.TIMING]: {
    reason: DisqualificationReason.TIMING,
    label: 'Bad Timing',
    icon: 'calendar-x',
    description: 'Interested but timing is not right',
  },
  [DisqualificationReason.COMPETITOR]: {
    reason: DisqualificationReason.COMPETITOR,
    label: 'Using Competitor',
    icon: 'shield',
    description: 'Already using a competitor solution',
  },
  [DisqualificationReason.OTHER]: {
    reason: DisqualificationReason.OTHER,
    label: 'Other',
    icon: 'help-circle',
    description: 'Other disqualification reason',
  },
};

/**
 * Score thresholds for auto-qualification
 */
export const SCORE_THRESHOLDS = {
  AUTO_QUALIFY: 70,      // Automatically qualify if score >= 70
  NEEDS_REVIEW: 40,      // Needs manual review if 40-69
  AUTO_DISQUALIFY: 20,   // Consider disqualifying if < 20
};

/**
 * Component score weights (must sum to 1.0)
 */
export const SCORE_WEIGHTS = {
  ENGAGEMENT: 0.35,  // 35%
  SENTIMENT: 0.25,   // 25%
  BEHAVIOR: 0.20,    // 20%
  FIT: 0.20,         // 20%
};
