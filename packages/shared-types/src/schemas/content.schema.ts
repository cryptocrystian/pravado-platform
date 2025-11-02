import { z } from 'zod';
import {
  ContentType,
  ContentStatus,
  ContentChannel,
  ContentItemStatus,
  ContentFormat,
  TaskStatus,
  TaskType,
} from '../content';

export const ContentTypeSchema = z.nativeEnum(ContentType);
export const ContentStatusSchema = z.nativeEnum(ContentStatus);
export const ContentChannelSchema = z.nativeEnum(ContentChannel);

export const SEODataSchema = z.object({
  metaTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(160),
  keywords: z.array(z.string()).default([]),
  slug: z.string().min(1),
  canonicalUrl: z.string().url().nullable(),
  focusKeyword: z.string().nullable(),
  readabilityScore: z.number().min(0).max(100).nullable(),
  seoScore: z.number().min(0).max(100).nullable(),
});

export const ContentMetadataSchema = z.object({
  wordCount: z.number().nonnegative().default(0),
  readingTime: z.number().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  targetAudience: z.array(z.string()).default([]),
  tone: z.string().default('professional'),
  customFields: z.record(z.unknown()).default({}),
});

export const ContentItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  type: ContentTypeSchema,
  status: ContentStatusSchema,
  channels: z.array(ContentChannelSchema).default([]),
  content: z.string().min(1),
  summary: z.string().nullable(),
  campaignId: z.string().uuid().nullable(),
  authorId: z.string().uuid(),
  publishedAt: z.date().nullable(),
  scheduledFor: z.date().nullable(),
  metadata: ContentMetadataSchema,
  seoData: SEODataSchema.nullable(),
  agentGenerated: z.boolean().default(false),
  agentTaskId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateContentInputSchema = z.object({
  title: z.string().min(1).max(500),
  type: ContentTypeSchema,
  content: z.string().min(1),
  channels: z.array(ContentChannelSchema),
  campaignId: z.string().uuid().optional(),
  authorId: z.string().uuid(),
  summary: z.string().optional(),
  scheduledFor: z.date().optional(),
  metadata: ContentMetadataSchema.partial().optional(),
  seoData: SEODataSchema.partial().optional(),
});

export const UpdateContentInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: ContentStatusSchema.optional(),
  channels: z.array(ContentChannelSchema).optional(),
  scheduledFor: z.date().optional(),
  publishedAt: z.date().optional(),
  metadata: ContentMetadataSchema.partial().optional(),
  seoData: SEODataSchema.partial().optional(),
});

// =====================================================
// NEW CONTENT & SEO SCHEMAS
// =====================================================

export const ContentItemStatusSchema = z.nativeEnum(ContentItemStatus);
export const ContentFormatSchema = z.nativeEnum(ContentFormat);
export const TaskStatusSchema = z.nativeEnum(TaskStatus);
export const TaskTypeSchema = z.nativeEnum(TaskType);

// =====================================================
// KEYWORD CLUSTER SCHEMAS
// =====================================================

export const CreateKeywordClusterSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  clusterKeywords: z.array(z.string().max(100)).min(1).max(100),
  primaryKeyword: z.string().max(255).optional(),
  searchVolume: z.number().int().min(0).default(0),
  difficultyScore: z.number().min(0).max(1).optional(),
  recommendedTopics: z.array(z.string().max(200)).max(50).default([]),
  contentGaps: z.array(z.string().max(200)).max(50).default([]),
  avgCpc: z.number().min(0).optional(),
  competitionLevel: z.string().max(50).optional(),
  trendDirection: z.enum(['rising', 'stable', 'declining']).optional(),
  organizationId: z.string().uuid(),
});

export const UpdateKeywordClusterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  clusterKeywords: z.array(z.string().max(100)).min(1).max(100).optional(),
  primaryKeyword: z.string().max(255).optional(),
  searchVolume: z.number().int().min(0).optional(),
  difficultyScore: z.number().min(0).max(1).optional(),
  recommendedTopics: z.array(z.string().max(200)).max(50).optional(),
  contentGaps: z.array(z.string().max(200)).max(50).optional(),
  avgCpc: z.number().min(0).optional(),
  competitionLevel: z.string().max(50).optional(),
  trendDirection: z.enum(['rising', 'stable', 'declining']).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// =====================================================
// CONTENT ITEM SCHEMAS
// =====================================================

export const ContentAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  type: z.string().max(100),
  size: z.number().int().positive().optional(),
});

export const CreateContentItemSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().max(500).optional(),
  excerpt: z.string().max(1000).optional(),
  bodyMd: z.string().max(100000).optional(),
  status: ContentItemStatusSchema.default('IDEA'),
  format: ContentFormatSchema,
  scheduledDate: z.coerce.date().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  keywords: z.array(z.string().max(100)).max(50).default([]),
  keywordClusterId: z.string().uuid().optional(),
  strategyId: z.string().uuid().optional(),
  featuredImageUrl: z.string().url().optional(),
  attachments: z.array(ContentAttachmentSchema).max(10).default([]),
  targetAudience: z.string().max(255).optional(),
  buyerStage: z.enum(['awareness', 'consideration', 'decision']).optional(),
  distributionChannels: z.array(z.string().max(100)).max(20).default([]),
  canonicalUrl: z.string().url().optional(),
  teamId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
});

export const UpdateContentItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().max(500).optional(),
  excerpt: z.string().max(1000).optional(),
  bodyMd: z.string().max(100000).optional(),
  status: ContentItemStatusSchema.optional(),
  format: ContentFormatSchema.optional(),
  scheduledDate: z.coerce.date().optional(),
  publishedAt: z.coerce.date().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  seoScore: z.number().min(0).max(1).optional(),
  readabilityScore: z.number().int().min(0).max(100).optional(),
  keywordClusterId: z.string().uuid().optional(),
  strategyId: z.string().uuid().optional(),
  featuredImageUrl: z.string().url().optional(),
  attachments: z.array(ContentAttachmentSchema).max(10).optional(),
  targetAudience: z.string().max(255).optional(),
  buyerStage: z.enum(['awareness', 'consideration', 'decision']).optional(),
  distributionChannels: z.array(z.string().max(100)).max(20).optional(),
  canonicalUrl: z.string().url().optional(),
  views: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  engagementScore: z.number().min(0).optional(),
  teamId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// =====================================================
// CONTENT CALENDAR SCHEMAS
// =====================================================

export const CreateContentCalendarSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  theme: z.string().max(255).optional(),
  goals: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  organizationId: z.string().uuid(),
});

export const UpdateContentCalendarSchema = z.object({
  theme: z.string().max(255).optional(),
  goals: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// =====================================================
// SEO AUDIT SCHEMAS
// =====================================================

export const CreateSEOAuditSchema = z.object({
  url: z.string().url(),
  title: z.string().max(500).optional(),
  contentItemId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
});

// =====================================================
// CONTENT TASK SCHEMAS
// =====================================================

export const CreateContentTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  type: TaskTypeSchema,
  status: TaskStatusSchema.default('TODO'),
  priority: z.number().int().min(1).max(5).default(3),
  dueDate: z.coerce.date().optional(),
  assignedTo: z.string().uuid().optional(),
  contentItemId: z.string().uuid(),
  notes: z.string().max(5000).optional(),
  attachments: z.array(ContentAttachmentSchema).max(10).default([]),
  estimatedHours: z.number().min(0).max(1000).optional(),
  organizationId: z.string().uuid(),
});

export const UpdateContentTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  type: TaskTypeSchema.optional(),
  status: TaskStatusSchema.optional(),
  priority: z.number().int().min(1).max(5).optional(),
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  attachments: z.array(ContentAttachmentSchema).max(10).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  actualHours: z.number().min(0).max(1000).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// =====================================================
// AI CONTENT GENERATION SCHEMAS
// =====================================================

export const GenerateContentIdeasSchema = z.object({
  strategyId: z.string().uuid().optional(),
  keywordClusterId: z.string().uuid().optional(),
  format: ContentFormatSchema.optional(),
  count: z.number().int().min(1).max(20).default(5),
  targetAudience: z.string().max(255).optional(),
  buyerStage: z.enum(['awareness', 'consideration', 'decision']).optional(),
});
