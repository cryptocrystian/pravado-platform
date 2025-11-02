// =====================================================
// PR CAMPAIGN VALIDATION SCHEMAS
// =====================================================
// Zod schemas for runtime validation of PR campaign data

import { z } from 'zod';
import { ContactTier } from '../contact';

// =====================================================
// ENUMS
// =====================================================

export const CampaignStatusSchema = z.enum([
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);

export const PressReleaseStatusSchema = z.enum([
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'CANCELLED',
]);

export const InteractionTypeSchema = z.enum([
  'PITCH_SENT',
  'EMAIL_OPENED',
  'LINK_CLICKED',
  'REPLIED',
  'MEETING_SCHEDULED',
  'COVERAGE_RECEIVED',
  'DECLINED',
  'BOUNCED',
]);

// =====================================================
// PR CAMPAIGN SCHEMAS
// =====================================================

export const CreatePRCampaignSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  goal: z.string().max(1000).optional(),
  status: CampaignStatusSchema.default('PLANNED'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  targetImpressions: z.number().int().positive().optional(),
  targetCoveragePieces: z.number().int().positive().optional(),
  targetEngagementRate: z.number().min(0).max(1).optional(),
  budget: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
  teamId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
}).refine(
  (data) => {
    // If both dates provided, startDate must be before endDate
    if (data.startDate && data.endDate) {
      return data.startDate < data.endDate;
    }
    return true;
  },
  {
    message: 'Start date must be before end date',
    path: ['endDate'],
  }
);

export const UpdatePRCampaignSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  goal: z.string().max(1000).optional(),
  status: CampaignStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  targetImpressions: z.number().int().positive().optional(),
  targetCoveragePieces: z.number().int().positive().optional(),
  targetEngagementRate: z.number().min(0).max(1).optional(),
  budget: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
  teamId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// =====================================================
// PRESS RELEASE SCHEMAS
// =====================================================

export const PressReleaseAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  type: z.string().min(1).max(100),
  size: z.number().int().positive().optional(),
});

export const CreatePressReleaseSchema = z.object({
  campaignId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  subtitle: z.string().max(500).optional(),
  bodyMd: z.string().min(1).max(50000),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  status: PressReleaseStatusSchema.default('DRAFT'),
  embargoDate: z.coerce.date().optional(),
  targetContactIds: z.array(z.string().uuid()).max(1000).default([]),
  targetTiers: z.array(z.nativeEnum(ContactTier)).max(5).default([]),
  targetTopics: z.array(z.string().max(100)).max(50).default([]),
  targetRegions: z.array(z.string().max(100)).max(50).default([]),
  targetingScoreThreshold: z.number().min(0).max(1).default(0.5),
  attachments: z.array(PressReleaseAttachmentSchema).max(10).default([]),
  distributionChannels: z.array(z.string().max(100)).max(20).default([]),
  organizationId: z.string().uuid(),
}).refine(
  (data) => {
    // If embargo date is set, it must be in the future
    if (data.embargoDate) {
      return data.embargoDate > new Date();
    }
    return true;
  },
  {
    message: 'Embargo date must be in the future',
    path: ['embargoDate'],
  }
);

export const UpdatePressReleaseSchema = z.object({
  campaignId: z.string().uuid().optional(),
  title: z.string().min(1).max(500).optional(),
  subtitle: z.string().max(500).optional(),
  bodyMd: z.string().min(1).max(50000).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  status: PressReleaseStatusSchema.optional(),
  embargoDate: z.coerce.date().optional(),
  targetContactIds: z.array(z.string().uuid()).max(1000).optional(),
  targetTiers: z.array(z.nativeEnum(ContactTier)).max(5).optional(),
  targetTopics: z.array(z.string().max(100)).max(50).optional(),
  targetRegions: z.array(z.string().max(100)).max(50).optional(),
  targetingScoreThreshold: z.number().min(0).max(1).optional(),
  attachments: z.array(PressReleaseAttachmentSchema).max(10).optional(),
  distributionChannels: z.array(z.string().max(100)).max(20).optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// =====================================================
// CAMPAIGN INTERACTION SCHEMAS
// =====================================================

export const CreateCampaignInteractionSchema = z.object({
  campaignId: z.string().uuid(),
  pressReleaseId: z.string().uuid().optional(),
  contactId: z.string().uuid(),
  interactionType: InteractionTypeSchema,
  channel: z.string().max(100).optional(),
  pitchSubject: z.string().max(500).optional(),
  pitchBody: z.string().max(10000).optional(),
  personalizationData: z.record(z.unknown()).default({}),
  sentAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  organizationId: z.string().uuid(),
});

export const UpdateCampaignInteractionSchema = z.object({
  openedAt: z.coerce.date().optional(),
  clickedAt: z.coerce.date().optional(),
  repliedAt: z.coerce.date().optional(),
  responseSentiment: z.string().max(50).optional(),
  responseText: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
  coverageUrl: z.string().url().optional(),
  coverageTitle: z.string().max(500).optional(),
  coveragePublishedAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// =====================================================
// PITCH TEMPLATE SCHEMAS
// =====================================================

export const CreatePitchTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  templateType: z.string().max(100).optional(),
  subjectTemplate: z.string().min(1).max(500),
  bodyTemplate: z.string().min(1).max(10000),
  availableVariables: z.array(z.string().max(100)).max(50).default([]),
  aiPrompt: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  isDefault: z.boolean().default(false),
  organizationId: z.string().uuid(),
});

export const UpdatePitchTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  templateType: z.string().max(100).optional(),
  subjectTemplate: z.string().min(1).max(500).optional(),
  bodyTemplate: z.string().min(1).max(10000).optional(),
  availableVariables: z.array(z.string().max(100)).max(50).optional(),
  aiPrompt: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isDefault: z.boolean().optional(),
}).refine(
  (data) => {
    // At least one field must be provided
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// =====================================================
// AI & TARGETING SCHEMAS
// =====================================================

export const GeneratePitchRequestSchema = z.object({
  pressReleaseId: z.string().uuid(),
  contactId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  customInstructions: z.string().max(1000).optional(),
});

export const GetRecommendedTargetsSchema = z.object({
  pressReleaseId: z.string().uuid(),
  maxResults: z.number().int().min(1).max(500).default(50),
  minScore: z.number().min(0).max(1).default(0.5),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type CreatePRCampaignInput = z.infer<typeof CreatePRCampaignSchema>;
export type UpdatePRCampaignInput = z.infer<typeof UpdatePRCampaignSchema>;
export type CreatePressReleaseInput = z.infer<typeof CreatePressReleaseSchema>;
export type UpdatePressReleaseInput = z.infer<typeof UpdatePressReleaseSchema>;
export type CreateCampaignInteractionInput = z.infer<typeof CreateCampaignInteractionSchema>;
export type UpdateCampaignInteractionInput = z.infer<typeof UpdateCampaignInteractionSchema>;
export type CreatePitchTemplateInput = z.infer<typeof CreatePitchTemplateSchema>;
export type UpdatePitchTemplateInput = z.infer<typeof UpdatePitchTemplateSchema>;
export type GeneratePitchRequest = z.infer<typeof GeneratePitchRequestSchema>;
export type GetRecommendedTargetsRequest = z.infer<typeof GetRecommendedTargetsSchema>;
