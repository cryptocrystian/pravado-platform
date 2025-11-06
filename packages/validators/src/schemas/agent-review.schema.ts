// =====================================================
// AGENT REVIEW ZOD VALIDATION SCHEMAS
// =====================================================

import { z } from 'zod';
import {
  ReviewStatus,
  ReviewType,
  ReviewPriority,
  ReviewableEntityType,
} from '@pravado/types';

// =====================================================
// ENUMS
// =====================================================

export const ReviewStatusSchema = z.nativeEnum(ReviewStatus);
export const ReviewTypeSchema = z.nativeEnum(ReviewType);
export const ReviewPrioritySchema = z.nativeEnum(ReviewPriority);
export const ReviewableEntityTypeSchema = z.nativeEnum(ReviewableEntityType);

// =====================================================
// MAIN SCHEMAS
// =====================================================

export const AgentReviewSchema = z.object({
  id: z.string().uuid(),

  // Review metadata
  reviewType: ReviewTypeSchema,
  status: ReviewStatusSchema,
  priority: ReviewPrioritySchema,

  // What is being reviewed
  reviewableEntityType: ReviewableEntityTypeSchema,
  reviewableEntityId: z.string().uuid(),

  // Review content
  title: z.string(),
  description: z.string().nullable(),
  contentToReview: z.record(z.any()),
  context: z.record(z.any()).nullable(),

  // Agent information
  requestingAgentId: z.string().nullable(),
  agentReasoning: z.string().nullable(),

  // Review decision
  decisionSummary: z.string().nullable(),
  decisionReasoning: z.string().nullable(),
  modifications: z.record(z.any()).nullable(),

  // Assignment & tracking
  assignedTo: z.string().nullable(),
  assignedAt: z.date().nullable(),
  assignedBy: z.string().nullable(),

  // Resolution
  reviewedBy: z.string().nullable(),
  reviewedAt: z.date().nullable(),

  // Deadlines & escalation
  dueDate: z.date().nullable(),
  escalatedAt: z.date().nullable(),
  escalatedTo: z.string().nullable(),

  // Lifecycle
  submittedAt: z.date(),
  withdrawnAt: z.date().nullable(),
  withdrawnBy: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const ReviewCommentSchema = z.object({
  id: z.string().uuid(),

  // Relationships
  reviewId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable(),

  // Content
  content: z.string().min(1, 'Comment content is required'),
  commentType: z.string(),

  // Metadata
  isInternal: z.boolean(),
  isResolution: z.boolean(),

  // Highlighting
  highlightedSection: z.string().nullable(),
  lineNumber: z.number().int().positive().nullable(),

  // Author
  authorId: z.string(),
  authorType: z.string(),

  // Engagement
  upvotes: z.number().int().min(0),
  isResolved: z.boolean(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const ReviewAssignmentSchema = z.object({
  id: z.string().uuid(),

  // Relationships
  reviewId: z.string().uuid(),
  assigneeId: z.string().uuid(),

  // Assignment metadata
  role: z.string().nullable(),
  assignmentReason: z.string().nullable(),

  // Status
  acceptedAt: z.date().nullable(),
  declinedAt: z.date().nullable(),
  declineReason: z.string().nullable(),
  completedAt: z.date().nullable(),

  // Notifications
  notifiedAt: z.date().nullable(),
  lastRemindedAt: z.date().nullable(),
  reminderCount: z.number().int().min(0),

  // Timestamps
  createdAt: z.date(),
  assignedBy: z.string().nullable(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const ReviewTemplateSchema = z.object({
  id: z.string().uuid(),

  // Template metadata
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  reviewType: ReviewTypeSchema,

  // Configuration
  checklist: z.record(z.any()).nullable(),
  guidelines: z.string().nullable(),
  autoAssignRules: z.record(z.any()).nullable(),

  // SLA settings
  defaultPriority: ReviewPrioritySchema,
  defaultDueHours: z.number().int().positive(),
  escalationHours: z.number().int().positive(),

  // Usage tracking
  usageCount: z.number().int().min(0),
  isActive: z.boolean(),

  // Ownership
  isSystemTemplate: z.boolean(),
  createdBy: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid().nullable(),
});

// =====================================================
// INPUT SCHEMAS
// =====================================================

export const CreateAgentReviewInputSchema = z.object({
  reviewType: ReviewTypeSchema,
  priority: ReviewPrioritySchema.default(ReviewPriority.MEDIUM),
  reviewableEntityType: ReviewableEntityTypeSchema,
  reviewableEntityId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  contentToReview: z.record(z.any()),
  context: z.record(z.any()).optional(),
  requestingAgentId: z.string().optional(),
  agentReasoning: z.string().max(2000, 'Reasoning too long').optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.date().optional(),
  organizationId: z.string().uuid(),
});

export const UpdateAgentReviewInputSchema = z.object({
  status: ReviewStatusSchema.optional(),
  priority: ReviewPrioritySchema.optional(),
  decisionSummary: z.string().max(1000, 'Summary too long').optional(),
  decisionReasoning: z.string().max(5000, 'Reasoning too long').optional(),
  modifications: z.record(z.any()).optional(),
  assignedTo: z.string().uuid().optional(),
});

export const SubmitReviewDecisionInputSchema = z.object({
  reviewId: z.string().uuid(),
  decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_EDIT']),
  decisionSummary: z.string().min(1, 'Decision summary is required').max(1000, 'Summary too long'),
  decisionReasoning: z.string().max(5000, 'Reasoning too long').optional(),
  modifications: z.record(z.any()).optional(),
  reviewedBy: z.string().uuid(),
});

export const CreateReviewCommentInputSchema = z.object({
  reviewId: z.string().uuid(),
  parentCommentId: z.string().uuid().optional(),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  commentType: z.string().default('FEEDBACK'),
  isInternal: z.boolean().default(false),
  highlightedSection: z.string().max(1000).optional(),
  lineNumber: z.number().int().positive().optional(),
  authorId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export const CreateReviewAssignmentInputSchema = z.object({
  reviewId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  role: z.string().max(100).optional(),
  assignmentReason: z.string().max(500).optional(),
  assignedBy: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
});

export const ReviewQueueFiltersSchema = z.object({
  status: z.array(ReviewStatusSchema).optional(),
  reviewType: z.array(ReviewTypeSchema).optional(),
  priority: z.array(ReviewPrioritySchema).optional(),
  assignedTo: z.string().uuid().optional(),
  dueDateBefore: z.date().optional(),
  dueDateAfter: z.date().optional(),
});

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

export const ReviewMetricsSchema = z.object({
  totalReviews: z.number().int().min(0),
  pendingReviews: z.number().int().min(0),
  approvedReviews: z.number().int().min(0),
  rejectedReviews: z.number().int().min(0),
  avgReviewTimeHours: z.number().min(0),
  overdueReviews: z.number().int().min(0),
});

export const PendingReviewSummarySchema = z.object({
  reviewId: z.string().uuid(),
  reviewType: ReviewTypeSchema,
  priority: ReviewPrioritySchema,
  title: z.string(),
  dueDate: z.date().nullable(),
  daysPending: z.number().int().min(0),
});

export const ReviewContextSchema = z.object({
  relatedEntities: z.array(z.object({
    type: z.string(),
    id: z.string(),
    name: z.string(),
  })).optional(),
  historicalData: z.record(z.any()).optional(),
  riskFactors: z.array(z.string()).optional(),
  urgencyFactors: z.array(z.string()).optional(),
});

export const ReviewDecisionResultSchema = z.object({
  review: AgentReviewSchema,
  nextActions: z.array(z.string()),
  agentNotification: z.object({
    agentId: z.string(),
    message: z.string(),
    learnings: z.array(z.string()).optional(),
  }).optional(),
});
