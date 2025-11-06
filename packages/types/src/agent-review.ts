// =====================================================
// HUMAN-IN-THE-LOOP REVIEW & OVERSIGHT TYPES
// =====================================================

/**
 * Review status enumeration
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_EDIT = 'NEEDS_EDIT',
  ESCALATED = 'ESCALATED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Review type enumeration
 */
export enum ReviewType {
  GOAL_APPROVAL = 'GOAL_APPROVAL',
  CAMPAIGN_PLAN = 'CAMPAIGN_PLAN',
  PITCH_CONTENT = 'PITCH_CONTENT',
  TASK_OUTPUT = 'TASK_OUTPUT',
  AGENT_DECISION = 'AGENT_DECISION',
  HIGH_RISK_ACTION = 'HIGH_RISK_ACTION',
  CONTENT_QUALITY = 'CONTENT_QUALITY',
  STRATEGIC_CHANGE = 'STRATEGIC_CHANGE',
}

/**
 * Review priority enumeration
 */
export enum ReviewPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Reviewable entity type enumeration
 */
export enum ReviewableEntityType {
  AGENT_GOAL = 'AGENT_GOAL',
  AGENT_TASK = 'AGENT_TASK',
  AUTONOMOUS_CAMPAIGN = 'AUTONOMOUS_CAMPAIGN',
  PITCH_WORKFLOW = 'PITCH_WORKFLOW',
  CONTENT_PIECE = 'CONTENT_PIECE',
  AGENT_HANDOFF = 'AGENT_HANDOFF',
  STRATEGIC_DECISION = 'STRATEGIC_DECISION',
}

/**
 * Agent Review
 */
export interface AgentReview {
  id: string;

  // Review metadata
  reviewType: ReviewType;
  status: ReviewStatus;
  priority: ReviewPriority;

  // What is being reviewed
  reviewableEntityType: ReviewableEntityType;
  reviewableEntityId: string;

  // Review content
  title: string;
  description: string | null;
  contentToReview: Record<string, any>; // The actual content
  context: Record<string, any> | null; // Additional context

  // Agent information
  requestingAgentId: string | null;
  agentReasoning: string | null;

  // Review decision
  decisionSummary: string | null;
  decisionReasoning: string | null;
  modifications: Record<string, any> | null;

  // Assignment & tracking
  assignedTo: string | null;
  assignedAt: Date | null;
  assignedBy: string | null;

  // Resolution
  reviewedBy: string | null;
  reviewedAt: Date | null;

  // Deadlines & escalation
  dueDate: Date | null;
  escalatedAt: Date | null;
  escalatedTo: string | null;

  // Lifecycle
  submittedAt: Date;
  withdrawnAt: Date | null;
  withdrawnBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Review Comment
 */
export interface ReviewComment {
  id: string;

  // Relationships
  reviewId: string;
  parentCommentId: string | null;

  // Content
  content: string;
  commentType: string; // 'FEEDBACK', 'QUESTION', 'SUGGESTION', 'CONCERN'

  // Metadata
  isInternal: boolean;
  isResolution: boolean;

  // Highlighting
  highlightedSection: string | null;
  lineNumber: number | null;

  // Author
  authorId: string;
  authorType: string; // 'USER', 'AGENT', 'SYSTEM'

  // Engagement
  upvotes: number;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Review Assignment
 */
export interface ReviewAssignment {
  id: string;

  // Relationships
  reviewId: string;
  assigneeId: string;

  // Assignment metadata
  role: string | null; // 'PRIMARY', 'SECONDARY', 'APPROVER', 'OBSERVER'
  assignmentReason: string | null;

  // Status
  acceptedAt: Date | null;
  declinedAt: Date | null;
  declineReason: string | null;
  completedAt: Date | null;

  // Notifications
  notifiedAt: Date | null;
  lastRemindedAt: Date | null;
  reminderCount: number;

  // Timestamps
  createdAt: Date;
  assignedBy: string | null;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Review Template
 */
export interface ReviewTemplate {
  id: string;

  // Template metadata
  name: string;
  description: string | null;
  reviewType: ReviewType;

  // Configuration
  checklist: Record<string, any> | null;
  guidelines: string | null;
  autoAssignRules: Record<string, any> | null;

  // SLA settings
  defaultPriority: ReviewPriority;
  defaultDueHours: number;
  escalationHours: number;

  // Usage tracking
  usageCount: number;
  isActive: boolean;

  // Ownership
  isSystemTemplate: boolean;
  createdBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string | null;
}

/**
 * Review Metrics
 */
export interface ReviewMetrics {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  avgReviewTimeHours: number;
  overdueReviews: number;
}

/**
 * Pending Review Summary
 */
export interface PendingReviewSummary {
  reviewId: string;
  reviewType: ReviewType;
  priority: ReviewPriority;
  title: string;
  dueDate: Date | null;
  daysPending: number;
}

/**
 * Input for creating a review
 */
export interface CreateAgentReviewInput {
  reviewType: ReviewType;
  priority?: ReviewPriority;
  reviewableEntityType: ReviewableEntityType;
  reviewableEntityId: string;
  title: string;
  description?: string;
  contentToReview: Record<string, any>;
  context?: Record<string, any>;
  requestingAgentId?: string;
  agentReasoning?: string;
  assignedTo?: string;
  dueDate?: Date;
  organizationId: string;
}

/**
 * Input for updating a review
 */
export interface UpdateAgentReviewInput {
  status?: ReviewStatus;
  priority?: ReviewPriority;
  decisionSummary?: string;
  decisionReasoning?: string;
  modifications?: Record<string, any>;
  assignedTo?: string;
}

/**
 * Input for submitting a review decision
 */
export interface SubmitReviewDecisionInput {
  reviewId: string;
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_EDIT';
  decisionSummary: string;
  decisionReasoning?: string;
  modifications?: Record<string, any>;
  reviewedBy: string;
}

/**
 * Input for creating a review comment
 */
export interface CreateReviewCommentInput {
  reviewId: string;
  parentCommentId?: string;
  content: string;
  commentType?: string;
  isInternal?: boolean;
  highlightedSection?: string;
  lineNumber?: number;
  authorId: string;
  organizationId: string;
}

/**
 * Input for creating a review assignment
 */
export interface CreateReviewAssignmentInput {
  reviewId: string;
  assigneeId: string;
  role?: string;
  assignmentReason?: string;
  assignedBy?: string;
  organizationId: string;
}

/**
 * Reviewable Content (what's being reviewed)
 */
export interface ReviewableContent {
  entityType: ReviewableEntityType;
  entityId: string;
  content: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Review Context (additional information)
 */
export interface ReviewContext {
  relatedEntities?: Array<{
    type: string;
    id: string;
    name: string;
  }>;
  historicalData?: Record<string, any>;
  riskFactors?: string[];
  urgencyFactors?: string[];
}

/**
 * Review decision result
 */
export interface ReviewDecisionResult {
  review: AgentReview;
  nextActions: string[];
  agentNotification?: {
    agentId: string;
    message: string;
    learnings?: string[];
  };
}

/**
 * Review queue filters
 */
export interface ReviewQueueFilters {
  status?: ReviewStatus[];
  reviewType?: ReviewType[];
  priority?: ReviewPriority[];
  assignedTo?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
}

/**
 * Review statistics
 */
export interface ReviewStatistics {
  byStatus: Record<ReviewStatus, number>;
  byType: Record<ReviewType, number>;
  byPriority: Record<ReviewPriority, number>;
  avgCompletionTimeHours: number;
  completionRate: number;
}
