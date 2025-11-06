import { z } from 'zod';
import {
  MentionType,
  Medium,
  MentionSentiment,
  AlertChannel,
  EntityType,
  FeedbackType,
  AlertFrequency,
  MentionTone,
  MentionStance,
  MentionEmotion,
} from '@pravado/types';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const MentionTypeSchema = z.nativeEnum(MentionType);
export const MediumSchema = z.nativeEnum(Medium);
export const MentionSentimentSchema = z.nativeEnum(MentionSentiment);
export const AlertChannelSchema = z.nativeEnum(AlertChannel);
export const EntityTypeSchema = z.nativeEnum(EntityType);
export const FeedbackTypeSchema = z.nativeEnum(FeedbackType);
export const AlertFrequencySchema = z.nativeEnum(AlertFrequency);
export const MentionToneSchema = z.nativeEnum(MentionTone);
export const MentionStanceSchema = z.nativeEnum(MentionStance);
export const MentionEmotionSchema = z.nativeEnum(MentionEmotion);

// =====================================================
// NESTED OBJECT SCHEMAS
// =====================================================

export const DetectedEntitiesSchema = z.object({
  brands: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  organizations: z.array(z.string()).optional(),
});

export const EntityTagSchema = z.object({
  text: z.string().min(1),
  type: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// =====================================================
// MEDIA MENTION SCHEMAS
// =====================================================

export const MediaMentionSchema = z.object({
  id: z.string().uuid(),
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  excerpt: z.string().nullable(),
  fullContent: z.string().nullable(),
  publishedAt: z.date(),
  author: z.string().max(255).nullable(),
  outlet: z.string().max(255).nullable(),
  outletDomain: z.string().max(255).nullable(),
  topics: z.array(z.string()).default([]),
  mentionType: MentionTypeSchema,
  medium: MediumSchema,
  sentiment: MentionSentimentSchema.nullable(),
  sentimentScore: z.number().min(-1).max(1).nullable(),
  tone: MentionToneSchema.nullable(),
  stance: MentionStanceSchema.nullable(),
  emotion: MentionEmotionSchema.nullable(),
  relevanceScore: z.number().min(0).max(100),
  visibilityScore: z.number().min(0).max(100),
  viralityScore: z.number().min(0).max(100),
  isViral: z.boolean(),
  detectedEntities: DetectedEntitiesSchema.nullable(),
  entityTags: z.array(z.string()).default([]),
  shareCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  reachEstimate: z.number().int().nullable(),
  contentEmbedding: z.array(z.number()).nullable(),
  nlpProcessed: z.boolean(),
  nlpProcessedAt: z.date().nullable(),
  nlpConfidenceScore: z.number().min(0).max(1).nullable(),
  nlpTokensUsed: z.number().int().nullable(),
  contentHash: z.string().nullable(),
  isDuplicate: z.boolean(),
  originalMentionId: z.string().uuid().nullable(),
  organizationId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMentionInputSchema = z.object({
  sourceUrl: z.string().url('Invalid source URL'),
  title: z.string().min(1, 'Title is required').max(1000),
  excerpt: z.string().max(2000).optional(),
  fullContent: z.string().optional(),
  publishedAt: z.coerce.date(),
  author: z.string().max(255).optional(),
  outlet: z.string().max(255).optional(),
  outletDomain: z.string().max(255).optional(),
  topics: z.array(z.string()).default([]),
  mentionType: MentionTypeSchema,
  medium: MediumSchema,
  organizationId: z.string().uuid(),
});

export const UpdateMentionInputSchema = z.object({
  sentiment: MentionSentimentSchema.optional(),
  sentimentScore: z.number().min(-1).max(1).optional(),
  tone: MentionToneSchema.optional(),
  stance: MentionStanceSchema.optional(),
  emotion: MentionEmotionSchema.optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
  visibilityScore: z.number().min(0).max(100).optional(),
  viralityScore: z.number().min(0).max(100).optional(),
  detectedEntities: DetectedEntitiesSchema.optional(),
  entityTags: z.array(z.string()).optional(),
  contentEmbedding: z.array(z.number()).optional(),
  nlpProcessed: z.boolean().optional(),
  nlpConfidenceScore: z.number().min(0).max(1).optional(),
  nlpTokensUsed: z.number().int().optional(),
});

// =====================================================
// MONITORING RULE SCHEMAS
// =====================================================

export const MonitoringRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  queryTerms: z.array(z.string().min(1)),
  entityType: EntityTypeSchema,
  mentionTypes: z.array(MentionTypeSchema).nullable(),
  mediums: z.array(MediumSchema).nullable(),
  minRelevanceScore: z.number().min(0).max(100).nullable(),
  minVisibilityScore: z.number().min(0).max(100).nullable(),
  alertChannel: AlertChannelSchema,
  alertFrequency: AlertFrequencySchema,
  thresholdScore: z.number().min(0).max(100),
  alertEmail: z.string().email().max(500).nullable(),
  alertWebhookUrl: z.string().url().nullable(),
  alertSlackChannel: z.string().max(100).nullable(),
  isActive: z.boolean(),
  lastTriggeredAt: z.date().nullable(),
  triggerCount: z.number().int().nonnegative(),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMonitoringRuleInputSchema = z
  .object({
    name: z.string().min(1, 'Rule name is required').max(255),
    description: z.string().max(1000).optional(),
    queryTerms: z.array(z.string().min(1)).min(1, 'At least one query term is required'),
    entityType: EntityTypeSchema,
    mentionTypes: z.array(MentionTypeSchema).optional(),
    mediums: z.array(MediumSchema).optional(),
    minRelevanceScore: z.number().min(0).max(100).optional(),
    minVisibilityScore: z.number().min(0).max(100).optional(),
    alertChannel: AlertChannelSchema,
    alertFrequency: AlertFrequencySchema.default(AlertFrequency.IMMEDIATE),
    thresholdScore: z.number().min(0).max(100).default(70),
    alertEmail: z.string().email('Invalid email address').max(500).optional(),
    alertWebhookUrl: z.string().url('Invalid webhook URL').optional(),
    alertSlackChannel: z.string().max(100).optional(),
    organizationId: z.string().uuid(),
  })
  .refine(
    (data) => {
      if (data.alertChannel === AlertChannel.EMAIL && !data.alertEmail) {
        return false;
      }
      if (data.alertChannel === AlertChannel.WEBHOOK && !data.alertWebhookUrl) {
        return false;
      }
      if (data.alertChannel === AlertChannel.SLACK && !data.alertSlackChannel) {
        return false;
      }
      return true;
    },
    {
      message: 'Alert channel requires corresponding configuration (email, webhook, or slack channel)',
    }
  );

export const UpdateMonitoringRuleInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  queryTerms: z.array(z.string().min(1)).min(1).optional(),
  mentionTypes: z.array(MentionTypeSchema).optional(),
  mediums: z.array(MediumSchema).optional(),
  minRelevanceScore: z.number().min(0).max(100).optional(),
  minVisibilityScore: z.number().min(0).max(100).optional(),
  alertChannel: AlertChannelSchema.optional(),
  alertFrequency: AlertFrequencySchema.optional(),
  thresholdScore: z.number().min(0).max(100).optional(),
  alertEmail: z.string().email().max(500).optional(),
  alertWebhookUrl: z.string().url().optional(),
  alertSlackChannel: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

// =====================================================
// MENTION ALERT SCHEMAS
// =====================================================

export const MentionAlertSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  mentionId: z.string().uuid(),
  alertChannel: AlertChannelSchema,
  triggeredAt: z.date(),
  wasDelivered: z.boolean(),
  deliveredAt: z.date().nullable(),
  deliveryError: z.string().nullable(),
  retryCount: z.number().int().nonnegative(),
  alertTitle: z.string().max(500).nullable(),
  alertMessage: z.string().nullable(),
  wasViewed: z.boolean(),
  viewedAt: z.date().nullable(),
  wasDismissed: z.boolean(),
  dismissedAt: z.date().nullable(),
  organizationId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAlertInputSchema = z.object({
  ruleId: z.string().uuid(),
  mentionId: z.string().uuid(),
  alertChannel: AlertChannelSchema,
  alertTitle: z.string().max(500).optional(),
  alertMessage: z.string().optional(),
  organizationId: z.string().uuid(),
});

// =====================================================
// MENTION FEEDBACK SCHEMAS
// =====================================================

export const MentionFeedbackSchema = z.object({
  id: z.string().uuid(),
  mentionId: z.string().uuid(),
  userId: z.string().uuid(),
  feedbackType: FeedbackTypeSchema,
  comment: z.string().nullable(),
  organizationId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SubmitFeedbackInputSchema = z.object({
  mentionId: z.string().uuid(),
  feedbackType: FeedbackTypeSchema,
  comment: z.string().max(1000).optional(),
  organizationId: z.string().uuid(),
});

// =====================================================
// MONITORING SNAPSHOT SCHEMAS
// =====================================================

export const MonitoringSnapshotSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  snapshotDate: z.date(),
  snapshotType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  totalMentions: z.number().int().nonnegative(),
  brandMentions: z.number().int().nonnegative(),
  competitorMentions: z.number().int().nonnegative(),
  industryMentions: z.number().int().nonnegative(),
  avgSentiment: z.number().min(-1).max(1).nullable(),
  positiveMentions: z.number().int().nonnegative(),
  neutralMentions: z.number().int().nonnegative(),
  negativeMentions: z.number().int().nonnegative(),
  avgVisibilityScore: z.number().min(0).max(100).nullable(),
  avgViralityScore: z.number().min(0).max(100).nullable(),
  totalReachEstimate: z.number().int().nonnegative(),
  viralMentions: z.number().int().nonnegative(),
  topSources: z.array(z.object({ outlet: z.string(), count: z.number().int() })).nullable(),
  topKeywords: z.array(z.string()).default([]),
  topEntities: DetectedEntitiesSchema.nullable(),
  byMedium: z.record(MediumSchema, z.number().int()).nullable(),
  mentionsChangePct: z.number().nullable(),
  sentimentChangePct: z.number().nullable(),
  createdAt: z.date(),
});

// =====================================================
// FILTER & SEARCH SCHEMAS
// =====================================================

export const MentionFiltersSchema = z.object({
  mentionType: z.array(MentionTypeSchema).optional(),
  medium: z.array(MediumSchema).optional(),
  sentiment: z.array(MentionSentimentSchema).optional(),
  minRelevance: z.number().min(0).max(100).optional(),
  minVisibility: z.number().min(0).max(100).optional(),
  isViral: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  outlet: z.string().optional(),
  topics: z.array(z.string()).optional(),
  searchQuery: z.string().optional(),
});

export const MentionSearchParamsSchema = MentionFiltersSchema.extend({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['publishedAt', 'relevanceScore', 'visibilityScore', 'viralityScore']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =====================================================
// NLP ANALYSIS RESULT SCHEMA
// =====================================================

export const NLPAnalysisResultSchema = z.object({
  sentiment: MentionSentimentSchema,
  sentimentScore: z.number().min(-1).max(1),
  tone: MentionToneSchema,
  stance: MentionStanceSchema,
  emotion: MentionEmotionSchema,
  relevanceScore: z.number().min(0).max(100),
  visibilityScore: z.number().min(0).max(100),
  viralityScore: z.number().min(0).max(100),
  detectedEntities: DetectedEntitiesSchema,
  entityTags: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1),
  tokensUsed: z.number().int().nonnegative(),
});
