import { z } from 'zod';
import {
  InteractionType,
  InteractionDirection,
  InteractionChannel,
  InteractionSentiment,
  RelationshipType,
  FollowUpStatus,
  FollowUpPriority,
  RelationshipTemperature,
} from '../crm';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const InteractionTypeSchema = z.nativeEnum(InteractionType);
export const InteractionDirectionSchema = z.nativeEnum(InteractionDirection);
export const InteractionChannelSchema = z.nativeEnum(InteractionChannel);
export const InteractionSentimentSchema = z.nativeEnum(InteractionSentiment);
export const RelationshipTypeSchema = z.nativeEnum(RelationshipType);
export const FollowUpStatusSchema = z.nativeEnum(FollowUpStatus);
export const FollowUpPrioritySchema = z.nativeEnum(FollowUpPriority);
export const RelationshipTemperatureSchema = z.nativeEnum(RelationshipTemperature);

// =====================================================
// CONTACT INTERACTION SCHEMAS
// =====================================================

export const ContactInteractionSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  userId: z.string().uuid(),

  // Interaction Details
  interactionType: InteractionTypeSchema,
  direction: InteractionDirectionSchema,
  channel: InteractionChannelSchema,

  // Content
  subject: z.string().max(500).nullable(),
  notes: z.string().nullable(),
  outcome: z.string().nullable(),
  sentiment: InteractionSentimentSchema.nullable(),

  // Related Campaign
  relatedCampaignId: z.string().uuid().nullable(),

  // Timing
  occurredAt: z.date(),
  durationMinutes: z.number().int().positive().nullable(),

  // Attachments/Links
  attachments: z.record(z.unknown()).nullable(),
  externalLinks: z.array(z.string().url()).default([]),

  // Organization
  organizationId: z.string().uuid(),

  // Audit
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateInteractionInputSchema = z.object({
  contactId: z.string().uuid(),
  interactionType: InteractionTypeSchema,
  direction: InteractionDirectionSchema,
  channel: InteractionChannelSchema,
  subject: z.string().max(500).optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  sentiment: InteractionSentimentSchema.optional(),
  relatedCampaignId: z.string().uuid().optional(),
  occurredAt: z.coerce.date().default(() => new Date()),
  durationMinutes: z.number().int().positive().optional(),
  attachments: z.record(z.unknown()).optional(),
  externalLinks: z.array(z.string().url()).default([]),
  organizationId: z.string().uuid(),
});

export const UpdateInteractionInputSchema = z.object({
  subject: z.string().max(500).optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  sentiment: InteractionSentimentSchema.optional(),
  occurredAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

// =====================================================
// CONTACT RELATIONSHIP SCHEMAS
// =====================================================

export const ContactRelationshipSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  userId: z.string().uuid(),

  // Relationship Details
  relationshipType: RelationshipTypeSchema,
  notes: z.string().nullable(),

  // Strength Metrics
  strengthScore: z.number().min(0).max(100),
  interactionCount: z.number().int().nonnegative(),
  lastInteractionAt: z.date().nullable(),

  // Status
  isActive: z.boolean(),
  priorityLevel: z.number().int().min(0).max(5),

  // Organization
  organizationId: z.string().uuid(),

  // Audit
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateRelationshipInputSchema = z.object({
  contactId: z.string().uuid(),
  relationshipType: RelationshipTypeSchema.default(RelationshipType.WATCHER),
  notes: z.string().optional(),
  priorityLevel: z.number().int().min(0).max(5).default(0),
  organizationId: z.string().uuid(),
});

export const UpdateRelationshipInputSchema = z.object({
  relationshipType: RelationshipTypeSchema.optional(),
  notes: z.string().optional(),
  priorityLevel: z.number().int().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
});

// =====================================================
// FOLLOW UP SCHEMAS
// =====================================================

export const FollowUpSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  interactionId: z.string().uuid().nullable(),

  // Follow-up Details
  title: z.string().min(1).max(255),
  notes: z.string().nullable(),
  dueDate: z.date(),
  priority: FollowUpPrioritySchema,
  status: FollowUpStatusSchema,

  // Completion
  completedAt: z.date().nullable(),
  completionNotes: z.string().nullable(),

  // Reminders
  reminderSent: z.boolean(),
  reminderSentAt: z.date().nullable(),

  // Organization
  organizationId: z.string().uuid(),

  // Audit
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFollowUpInputSchema = z.object({
  contactId: z.string().uuid(),
  interactionId: z.string().uuid().optional(),
  title: z.string().min(1, 'Follow-up title is required').max(255),
  notes: z.string().optional(),
  dueDate: z.coerce.date().refine(
    (date) => date >= new Date(),
    { message: 'Due date must be in the future' }
  ),
  priority: FollowUpPrioritySchema.default(FollowUpPriority.MEDIUM),
  organizationId: z.string().uuid(),
});

export const UpdateFollowUpInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  notes: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  priority: FollowUpPrioritySchema.optional(),
  status: FollowUpStatusSchema.optional(),
  completionNotes: z.string().optional(),
});

export const CompleteFollowUpInputSchema = z.object({
  completionNotes: z.string().optional(),
});

// =====================================================
// VIEW SCHEMAS
// =====================================================

export const RecentActivityViewSchema = z.object({
  userId: z.string().uuid(),
  contactId: z.string().uuid(),
  contactName: z.string(),
  outlet: z.string().nullable(),
  interactionType: InteractionTypeSchema,
  direction: InteractionDirectionSchema,
  channel: InteractionChannelSchema,
  occurredAt: z.date(),
  sentiment: InteractionSentimentSchema.nullable(),
  organizationId: z.string().uuid(),
});

export const RelationshipStrengthViewSchema = z.object({
  userId: z.string().uuid(),
  contactId: z.string().uuid(),
  contactName: z.string(),
  tier: z.string(),
  outlet: z.string().nullable(),
  relationshipType: RelationshipTypeSchema,
  strengthScore: z.number().min(0).max(100),
  interactionCount: z.number().int().nonnegative(),
  lastInteractionAt: z.date().nullable(),
  priorityLevel: z.number().int().min(0).max(5),
  isActive: z.boolean(),
  relationshipTemperature: RelationshipTemperatureSchema,
  organizationId: z.string().uuid(),
});

export const OverdueFollowUpViewSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  contactName: z.string(),
  title: z.string(),
  dueDate: z.date(),
  priority: FollowUpPrioritySchema,
  createdBy: z.string().uuid(),
  daysOverdue: z.number().int().nonnegative(),
  organizationId: z.string().uuid(),
});

// =====================================================
// CRM STATS SCHEMAS
// =====================================================

export const UserCRMStatsSchema = z.object({
  totalRelationships: z.number().int().nonnegative(),
  hotRelationships: z.number().int().nonnegative(),
  warmRelationships: z.number().int().nonnegative(),
  coolRelationships: z.number().int().nonnegative(),
  coldRelationships: z.number().int().nonnegative(),
  interactionsThisWeek: z.number().int().nonnegative(),
  interactionsThisMonth: z.number().int().nonnegative(),
  pendingFollowUps: z.number().int().nonnegative(),
  overdueFollowUps: z.number().int().nonnegative(),
  avgStrengthScore: z.number().min(0).max(100),
});

// =====================================================
// INTERACTION SUMMARY SCHEMAS
// =====================================================

export const InteractionSummarySchema = z.object({
  totalInteractions: z.number().int().nonnegative(),
  byType: z.record(InteractionTypeSchema, z.number().int().nonnegative()),
  byChannel: z.record(InteractionChannelSchema, z.number().int().nonnegative()),
  bySentiment: z.record(InteractionSentimentSchema, z.number().int().nonnegative()),
  byDirection: z.record(InteractionDirectionSchema, z.number().int().nonnegative()),
  recentInteractions: z.array(ContactInteractionSchema),
});

// =====================================================
// FILTER & QUERY SCHEMAS
// =====================================================

export const InteractionFiltersSchema = z.object({
  contactId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  interactionType: z.array(InteractionTypeSchema).optional(),
  channel: z.array(InteractionChannelSchema).optional(),
  direction: z.array(InteractionDirectionSchema).optional(),
  sentiment: z.array(InteractionSentimentSchema).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  relatedCampaignId: z.string().uuid().optional(),
});

export const RelationshipFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  relationshipType: z.array(RelationshipTypeSchema).optional(),
  isActive: z.boolean().optional(),
  minStrength: z.number().min(0).max(100).optional(),
  maxStrength: z.number().min(0).max(100).optional(),
  temperature: z.array(RelationshipTemperatureSchema).optional(),
  priorityLevel: z.array(z.number().int().min(0).max(5)).optional(),
});

export const FollowUpFiltersSchema = z.object({
  contactId: z.string().uuid().optional(),
  status: z.array(FollowUpStatusSchema).optional(),
  priority: z.array(FollowUpPrioritySchema).optional(),
  dueDateStart: z.coerce.date().optional(),
  dueDateEnd: z.coerce.date().optional(),
  isOverdue: z.boolean().optional(),
});

export const CRMQueryParamsSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['occurredAt', 'createdAt', 'strengthScore', 'dueDate', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================

export const BulkUpdateFollowUpsInputSchema = z.object({
  followUpIds: z.array(z.string().uuid()).min(1, 'At least one follow-up must be selected'),
  updates: UpdateFollowUpInputSchema,
});

export const BulkCompleteFollowUpsInputSchema = z.object({
  followUpIds: z.array(z.string().uuid()).min(1, 'At least one follow-up must be selected'),
  completionNotes: z.string().optional(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

// Validate that due date is not in the past
export const validateFutureDueDate = (date: Date) => {
  return date >= new Date();
};

// Validate that interaction occurred date is not in the future
export const validatePastOccurredDate = (date: Date) => {
  return date <= new Date();
};

// Validate that strength score is between 0 and 100
export const validateStrengthScore = (score: number) => {
  return score >= 0 && score <= 100;
};
