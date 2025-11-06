import { z } from 'zod';
import { CampaignStatus, CampaignType } from '@pravado/types';

export const CampaignStatusSchema = z.nativeEnum(CampaignStatus);
export const CampaignTypeSchema = z.nativeEnum(CampaignType);

export const CampaignGoalSchema = z.object({
  id: z.string().uuid(),
  metric: z.string().min(1),
  target: z.number().positive(),
  current: z.number().nonnegative().default(0),
  unit: z.string(),
});

export const CampaignMetricsSchema = z.object({
  impressions: z.number().nonnegative().default(0),
  engagements: z.number().nonnegative().default(0),
  conversions: z.number().nonnegative().default(0),
  roi: z.number().nullable(),
  customMetrics: z.record(z.number()).default({}),
});

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(500),
  description: z.string().nullable(),
  type: CampaignTypeSchema,
  status: CampaignStatusSchema,
  startDate: z.date(),
  endDate: z.date().nullable(),
  budget: z.number().positive().nullable(),
  organizationId: z.string().uuid(),
  ownerId: z.string().uuid(),
  goals: z.array(CampaignGoalSchema).default([]),
  metrics: CampaignMetricsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCampaignInputSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  type: CampaignTypeSchema,
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().positive().optional(),
  organizationId: z.string().uuid(),
  ownerId: z.string().uuid(),
  goals: z.array(
    z.object({
      metric: z.string(),
      target: z.number().positive(),
      unit: z.string(),
    })
  ).optional(),
});

export const UpdateCampaignInputSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: CampaignStatusSchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budget: z.number().positive().optional(),
});
