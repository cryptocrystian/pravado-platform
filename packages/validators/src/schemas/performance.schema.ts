// =====================================================
// PERFORMANCE INSIGHTS ZOD VALIDATION SCHEMAS
// =====================================================

import { z } from 'zod';
import {
  InsightType,
  MetricType,
  ExperimentStatus,
  VariantType,
} from '@pravado/types';

// =====================================================
// ENUMS
// =====================================================

export const InsightTypeSchema = z.nativeEnum(InsightType);
export const MetricTypeSchema = z.nativeEnum(MetricType);
export const ExperimentStatusSchema = z.nativeEnum(ExperimentStatus);
export const VariantTypeSchema = z.nativeEnum(VariantType);

// =====================================================
// MAIN SCHEMAS
// =====================================================

export const PerformanceInsightSchema = z.object({
  id: z.string().uuid(),

  // What is being measured
  insightType: InsightTypeSchema,
  entityId: z.string().uuid(),

  // Agent context
  agentId: z.string().nullable(),
  agentType: z.string().nullable(),

  // Metrics
  successScore: z.number().min(0).max(1).nullable(),
  qualityScore: z.number().min(0).max(1).nullable(),
  efficiencyScore: z.number().min(0).max(1).nullable(),
  speedScore: z.number().min(0).max(1).nullable(),

  // Detailed metrics
  metrics: z.record(z.any()).nullable(),

  // Performance data
  executionTimeMs: z.number().int().positive().nullable(),
  tokensUsed: z.number().int().positive().nullable(),
  apiCallsMade: z.number().int().min(0).nullable(),
  errorsEncountered: z.number().int().min(0).nullable(),

  // Outcome tracking
  achievedGoal: z.boolean().nullable(),
  goalCompletionPercentage: z.number().min(0).max(100).nullable(),

  // Comparative analysis
  vsBenchmarkDelta: z.number().nullable(),
  vsPreviousDelta: z.number().nullable(),

  // Insights & learnings
  insightSummary: z.string().nullable(),
  keyLearnings: z.array(z.string()).nullable(),
  improvementSuggestions: z.array(z.string()).nullable(),

  // Context
  context: z.record(z.any()).nullable(),

  // Timestamps
  measuredAt: z.date(),
  createdAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const ABExperimentSchema = z.object({
  id: z.string().uuid(),

  // Experiment metadata
  name: z.string(),
  description: z.string().nullable(),
  hypothesis: z.string().nullable(),

  // Configuration
  experimentType: z.string(),
  targetEntityType: InsightTypeSchema,

  // Status
  status: ExperimentStatusSchema,

  // Traffic allocation
  trafficAllocation: z.number().min(0).max(1),

  // Success criteria
  primaryMetric: MetricTypeSchema,
  successThreshold: z.number().nullable(),
  minimumSampleSize: z.number().int().positive(),

  // Results
  winningVariantId: z.string().uuid().nullable(),
  confidenceLevel: z.number().min(0).max(1).nullable(),

  // Lifecycle
  startedAt: z.date().nullable(),
  endedAt: z.date().nullable(),

  // Ownership
  createdBy: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const ExperimentVariantSchema = z.object({
  id: z.string().uuid(),

  // Relationships
  experimentId: z.string().uuid(),

  // Variant metadata
  variantType: VariantTypeSchema,
  variantName: z.string(),
  description: z.string().nullable(),

  // Configuration
  configuration: z.record(z.any()),

  // Traffic allocation
  trafficPercentage: z.number().min(0).max(1),

  // Results
  sampleSize: z.number().int().min(0),
  successCount: z.number().int().min(0),
  totalRuns: z.number().int().min(0),

  // Aggregated metrics
  avgSuccessScore: z.number().min(0).max(1).nullable(),
  avgQualityScore: z.number().min(0).max(1).nullable(),
  avgEfficiencyScore: z.number().min(0).max(1).nullable(),
  avgExecutionTimeMs: z.number().int().positive().nullable(),

  // Detailed metrics
  metricsSummary: z.record(z.any()).nullable(),

  // Performance vs control
  liftVsControl: z.number().nullable(),
  statisticalSignificance: z.number().min(0).max(1).nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const AgentBenchmarkSchema = z.object({
  id: z.string().uuid(),

  // Agent identification
  agentType: z.string(),
  taskType: z.string().nullable(),

  // Benchmark metrics
  expectedSuccessRate: z.number().min(0).max(1),
  expectedQualityScore: z.number().min(0).max(1),
  expectedEfficiencyScore: z.number().min(0).max(1),
  expectedExecutionTimeMs: z.number().int().positive().nullable(),

  // Performance thresholds
  minimumAcceptableSuccess: z.number().min(0).max(1).nullable(),
  minimumAcceptableQuality: z.number().min(0).max(1).nullable(),

  // Context
  description: z.string().nullable(),
  sampleSize: z.number().int().min(0),

  // Metadata
  isSystemBenchmark: z.boolean(),
  isActive: z.boolean(),

  // Timestamps
  lastUpdated: z.date(),
  createdAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid().nullable(),
});

export const PerformanceFeedbackSchema = z.object({
  id: z.string().uuid(),

  // What is being reviewed
  insightId: z.string().uuid().nullable(),
  entityType: InsightTypeSchema,
  entityId: z.string().uuid(),

  // Feedback details
  feedbackType: z.string(),
  feedbackSource: z.string().nullable(),

  // Ratings
  userSatisfactionScore: z.number().min(1).max(5).nullable(),
  qualityRating: z.number().min(1).max(5).nullable(),

  // Qualitative feedback
  feedbackText: z.string().nullable(),
  whatWorkedWell: z.array(z.string()).nullable(),
  whatNeedsImprovement: z.array(z.string()).nullable(),

  // Structured feedback
  ratings: z.record(z.number()).nullable(),

  // Impact tracking
  wasHelpful: z.boolean().nullable(),
  ledToImprovement: z.boolean().nullable(),

  // Timestamps
  submittedBy: z.string().nullable(),
  submittedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

// =====================================================
// INPUT SCHEMAS
// =====================================================

export const CreatePerformanceInsightInputSchema = z.object({
  insightType: InsightTypeSchema,
  entityId: z.string().uuid(),
  agentId: z.string().optional(),
  agentType: z.string().optional(),
  successScore: z.number().min(0).max(1).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  efficiencyScore: z.number().min(0).max(1).optional(),
  speedScore: z.number().min(0).max(1).optional(),
  metrics: z.record(z.any()).optional(),
  executionTimeMs: z.number().int().positive().optional(),
  tokensUsed: z.number().int().positive().optional(),
  apiCallsMade: z.number().int().min(0).optional(),
  errorsEncountered: z.number().int().min(0).optional(),
  achievedGoal: z.boolean().optional(),
  goalCompletionPercentage: z.number().min(0).max(100).optional(),
  vsBenchmarkDelta: z.number().optional(),
  vsPreviousDelta: z.number().optional(),
  insightSummary: z.string().optional(),
  keyLearnings: z.array(z.string()).optional(),
  improvementSuggestions: z.array(z.string()).optional(),
  context: z.record(z.any()).optional(),
  organizationId: z.string().uuid(),
});

export const CreateABExperimentInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  hypothesis: z.string().max(2000).optional(),
  experimentType: z.string().min(1).max(100),
  targetEntityType: InsightTypeSchema,
  trafficAllocation: z.number().min(0).max(1).default(1.0),
  primaryMetric: MetricTypeSchema,
  successThreshold: z.number().optional(),
  minimumSampleSize: z.number().int().positive().default(100),
  organizationId: z.string().uuid(),
});

export const CreateExperimentVariantInputSchema = z.object({
  experimentId: z.string().uuid(),
  variantType: VariantTypeSchema,
  variantName: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  configuration: z.record(z.any()),
  trafficPercentage: z.number().min(0).max(1).default(0.5),
  organizationId: z.string().uuid(),
});

export const CreatePerformanceFeedbackInputSchema = z.object({
  insightId: z.string().uuid().optional(),
  entityType: InsightTypeSchema,
  entityId: z.string().uuid(),
  feedbackType: z.string().min(1).max(50),
  feedbackSource: z.string().max(100).optional(),
  userSatisfactionScore: z.number().min(1).max(5).optional(),
  qualityRating: z.number().min(1).max(5).optional(),
  feedbackText: z.string().max(5000).optional(),
  whatWorkedWell: z.array(z.string()).optional(),
  whatNeedsImprovement: z.array(z.string()).optional(),
  ratings: z.record(z.number()).optional(),
  wasHelpful: z.boolean().optional(),
  organizationId: z.string().uuid(),
});

export const RecordExperimentOutcomeInputSchema = z.object({
  assignmentId: z.string().uuid(),
  successScore: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(1),
  efficiencyScore: z.number().min(0).max(1),
  executionTimeMs: z.number().int().positive(),
});

export const UpdateABExperimentInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: ExperimentStatusSchema.optional(),
  trafficAllocation: z.number().min(0).max(1).optional(),
  successThreshold: z.number().optional(),
  winningVariantId: z.string().uuid().optional(),
});

// =====================================================
// QUERY SCHEMAS
// =====================================================

export const GetPerformanceTrendsQuerySchema = z.object({
  agentId: z.string().optional(),
  days: z.number().int().positive().default(30),
});

export const GetInsightsQuerySchema = z.object({
  insightType: InsightTypeSchema.optional(),
  agentType: z.string().optional(),
  minSuccessScore: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().min(0).default(0),
});

export const GetExperimentsQuerySchema = z.object({
  status: ExperimentStatusSchema.optional(),
  experimentType: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().min(0).default(0),
});
