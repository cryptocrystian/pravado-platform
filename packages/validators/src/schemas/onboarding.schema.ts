import { z } from 'zod';
import { IntakeStep, OnboardingStatus, AgentType } from '@pravado/types';

// =====================================================
// INTAKE STEP SCHEMAS
// =====================================================

// Business Information Schema
export const BusinessInfoSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(255),
  industry: z.string().min(1, 'Industry is required').max(255),
  website: z.string().url('Please enter a valid URL').max(500),
  companySize: z.enum(['SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
});

// Goals Schema
export const GoalsSchema = z.object({
  primaryGoals: z.array(z.string()).min(1, 'Select at least one primary goal').max(10),
  successMetrics: z.array(z.string()).min(1, 'Select at least one success metric').max(10),
  timeline: z.string().optional(),
  budgetRange: z.string().optional(),
});

// Competitor Schema
export const CompetitorSchema = z.object({
  name: z.string().min(1, 'Competitor name is required'),
  website: z.string().url('Please enter a valid URL').optional(),
  strengths: z.string().optional(),
});

// Competitive Information Schema
export const CompetitiveInfoSchema = z.object({
  competitors: z.array(CompetitorSchema).min(1, 'Add at least one competitor').max(10),
  marketPosition: z.enum(['LEADER', 'CHALLENGER', 'FOLLOWER', 'NICHE']).optional(),
  uniqueValueProposition: z.string().min(10, 'Please describe your unique value proposition').max(1000),
});

// Target Audience Schema
export const TargetAudienceSchema = z.object({
  demographics: z.object({
    ageRange: z.string().optional(),
    location: z.string().optional(),
    jobTitles: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
  }).optional(),
  psychographics: z.object({
    interests: z.array(z.string()).optional(),
    challenges: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
  }).optional(),
  painPoints: z.array(z.string()).optional(),
});

// Brand Voice Schema
export const BrandVoiceSchema = z.object({
  brandTone: z.array(z.string()).min(1, 'Select at least one tone attribute').max(10),
  brandAttributes: z.array(z.string()).min(1, 'Select at least one brand attribute').max(10),
  targetAudience: TargetAudienceSchema,
  brandPersonality: z.string().max(1000).optional(),
});

// Channel Priorities Schema
export const ChannelPrioritiesSchema = z.object({
  prPriority: z.number().int().min(1).max(5),
  contentPriority: z.number().int().min(1).max(5),
  seoPriority: z.number().int().min(1).max(5),
  preferredContentTypes: z.array(z.string()).min(1, 'Select at least one content type'),
});

// Geographic Targeting Schema
export const GeographicTargetingSchema = z.object({
  primaryRegions: z.array(z.string()).min(1, 'Select at least one region'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  localConsiderations: z.string().max(1000).optional(),
});

// Additional Context Schema
export const AdditionalContextSchema = z.object({
  additionalContext: z.string().max(2000).optional(),
  challenges: z.array(z.string()).max(20),
  existingAssets: z.object({
    hasWebsite: z.boolean().optional(),
    hasBlog: z.boolean().optional(),
    hasSocialMedia: z.boolean().optional(),
    hasPressCoverage: z.boolean().optional(),
    hasEmailList: z.boolean().optional(),
  }).optional(),
});

// =====================================================
// INTAKE RESPONSE SCHEMAS
// =====================================================

export const IntakeStepSchema = z.nativeEnum(IntakeStep);

// Full intake response schema (matches database)
export const IntakeResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  step: IntakeStepSchema,

  // Business Info
  businessName: z.string().max(255).nullable(),
  industry: z.string().max(255).nullable(),
  website: z.string().max(500).nullable(),
  companySize: z.string().max(50).nullable(),
  foundedYear: z.number().int().nullable(),

  // Goals
  primaryGoals: z.array(z.string()).nullable(),
  successMetrics: z.array(z.string()).nullable(),
  timeline: z.string().max(100).nullable(),
  budgetRange: z.string().max(100).nullable(),

  // Competitors
  competitors: z.array(CompetitorSchema).nullable(),
  marketPosition: z.string().max(100).nullable(),
  uniqueValueProposition: z.string().nullable(),

  // Brand Voice
  brandTone: z.array(z.string()).nullable(),
  brandAttributes: z.array(z.string()).nullable(),
  targetAudience: TargetAudienceSchema.nullable(),
  brandPersonality: z.string().nullable(),

  // Channels
  prPriority: z.number().int().min(1).max(5).nullable(),
  contentPriority: z.number().int().min(1).max(5).nullable(),
  seoPriority: z.number().int().min(1).max(5).nullable(),
  preferredContentTypes: z.array(z.string()).nullable(),

  // Regions
  primaryRegions: z.array(z.string()).nullable(),
  languages: z.array(z.string()).nullable(),
  localConsiderations: z.string().nullable(),

  // Additional
  additionalContext: z.string().nullable(),
  challenges: z.array(z.string()).nullable(),
  existingAssets: z.record(z.unknown()).nullable(),

  responseData: z.record(z.unknown()).default({}),

  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create intake response input
export const CreateIntakeResponseInputSchema = z.object({
  sessionId: z.string().uuid(),
  step: IntakeStepSchema,
}).and(
  z.union([
    BusinessInfoSchema.partial(),
    GoalsSchema.partial(),
    CompetitiveInfoSchema.partial(),
    BrandVoiceSchema.partial(),
    ChannelPrioritiesSchema.partial(),
    GeographicTargetingSchema.partial().merge(AdditionalContextSchema.partial()),
  ])
);

// =====================================================
// ONBOARDING SESSION SCHEMAS
// =====================================================

export const OnboardingStatusSchema = z.nativeEnum(OnboardingStatus);
export const AgentTypeSchema = z.nativeEnum(AgentType);

export const OnboardingSessionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),

  status: OnboardingStatusSchema,
  currentStep: IntakeStepSchema,
  completedSteps: z.array(z.string()).default([]),

  startedAt: z.date(),
  intakeCompletedAt: z.date().nullable(),
  processingStartedAt: z.date().nullable(),
  strategyGeneratedAt: z.date().nullable(),
  plannerCompletedAt: z.date().nullable(),
  completedAt: z.date().nullable(),

  strategyTaskId: z.string().uuid().nullable(),
  plannerTaskId: z.string().uuid().nullable(),

  strategyPlanId: z.string().uuid().nullable(),

  errorMessage: z.string().nullable(),
  retryCount: z.number().int().default(0),

  metadata: z.record(z.unknown()).default({}),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateOnboardingSessionInputSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const UpdateOnboardingSessionInputSchema = z.object({
  status: OnboardingStatusSchema.optional(),
  currentStep: IntakeStepSchema.optional(),
  completedSteps: z.array(z.string()).optional(),
  strategyTaskId: z.string().uuid().optional(),
  plannerTaskId: z.string().uuid().optional(),
  strategyPlanId: z.string().uuid().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// =====================================================
// AGENT RESULT SCHEMAS
// =====================================================

export const OnboardingAgentResultSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  agentType: AgentTypeSchema,

  taskId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),

  result: z.record(z.unknown()).default({}),

  generatedContentIds: z.array(z.string().uuid()).default([]),
  generatedPressReleaseId: z.string().uuid().nullable(),
  generatedSeoAuditId: z.string().uuid().nullable(),

  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  executionTimeMs: z.number().int().nullable(),

  errorMessage: z.string().nullable(),
  retryCount: z.number().int().default(0),

  createdAt: z.date(),
  updatedAt: z.date(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

// Map step to appropriate validation schema
export const getStepValidationSchema = (step: IntakeStep): z.ZodSchema => {
  switch (step) {
    case IntakeStep.BUSINESS_INFO:
      return BusinessInfoSchema;
    case IntakeStep.GOALS:
      return GoalsSchema;
    case IntakeStep.COMPETITORS:
      return CompetitiveInfoSchema;
    case IntakeStep.BRAND_VOICE:
      return BrandVoiceSchema;
    case IntakeStep.CHANNELS:
      return ChannelPrioritiesSchema;
    case IntakeStep.REGIONS:
      return GeographicTargetingSchema.merge(AdditionalContextSchema);
    default:
      throw new Error(`Unknown intake step: ${step}`);
  }
};

// Validate complete intake (all steps)
export const validateCompleteIntake = (data: unknown) => {
  const schema = z.object({
    businessInfo: BusinessInfoSchema,
    goals: GoalsSchema,
    competitiveInfo: CompetitiveInfoSchema,
    brandVoice: BrandVoiceSchema,
    channelPriorities: ChannelPrioritiesSchema,
    geographicTargeting: GeographicTargetingSchema,
    additionalContext: AdditionalContextSchema.optional(),
  });

  return schema.parse(data);
};
