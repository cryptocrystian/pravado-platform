// =====================================================
// AUTONOMOUS CAMPAIGN ZOD VALIDATION SCHEMAS
// =====================================================

import { z } from 'zod';
import {
  CampaignStatus,
  CampaignType,
  CampaignTaskType,
} from '../autonomous-campaign';

// =====================================================
// ENUMS
// =====================================================

export const CampaignStatusSchema = z.nativeEnum(CampaignStatus);
export const CampaignTypeSchema = z.nativeEnum(CampaignType);
export const CampaignTaskTypeSchema = z.nativeEnum(CampaignTaskType);

// =====================================================
// SUB-SCHEMAS
// =====================================================

export const CampaignTargetingSchema = z.object({
  outletTypes: z.array(z.string()),
  contactTiers: z.array(z.string()),
  topics: z.array(z.string()),
  locations: z.array(z.string()).optional(),
  minRelationshipScore: z.number().min(0).max(100).optional(),
  maxContactsPerOutlet: z.number().int().positive().optional(),
});

export const PersonalizationStrategySchema = z.object({
  tier1: z.string(),
  tier2: z.string(),
  tier3: z.string().optional(),
  researchDepth: z.enum(['high', 'medium', 'low']),
  includeRecentArticles: z.boolean(),
  includeOutletFocus: z.boolean(),
});

export const WorkflowConfigSchema = z.object({
  batchSize: z.number().int().positive(),
  delayBetweenBatches: z.number().int().positive(),
  followupDays: z.array(z.number().int().positive()),
  maxFollowups: z.number().int().min(0).max(10),
  stopOnResponse: z.boolean(),
});

export const MonitoringSetupSchema = z.object({
  trackMentions: z.boolean(),
  alertOnResponse: z.boolean(),
  alertOnPlacement: z.boolean(),
  thresholds: z.object({
    responseRate: z.number().min(0).max(1).optional(),
    placementRate: z.number().min(0).max(1).optional(),
    minQualityScore: z.number().min(0).max(1).optional(),
  }),
});

export const CampaignKPIsSchema = z.object({
  targetPitches: z.number().int().positive(),
  targetResponseRate: z.number().min(0).max(1),
  targetPlacements: z.number().int().min(0),
  targetReach: z.number().int().positive().optional(),
  timeline: z.string().optional(),
});

export const SuccessCriteriaSchema = z.object({
  minResponseRate: z.number().min(0).max(1).optional(),
  minPlacementRate: z.number().min(0).max(1).optional(),
  minPlacements: z.number().int().min(0).optional(),
  minQualityScore: z.number().min(0).max(1).optional(),
});

export const CampaignPlanningOutputSchema = z.object({
  strategyDoc: z.object({
    objectives: z.array(z.string()),
    targetOutlets: z.array(z.string()),
    timeline: z.string(),
    keyMessages: z.array(z.string()),
  }),
  pitchPlan: z.object({
    themes: z.array(z.string()),
    templates: z.array(z.string()),
    variables: z.record(z.string()),
  }),
  contactCriteria: CampaignTargetingSchema,
  metricsPlan: z.object({
    kpis: CampaignKPIsSchema,
    monitoring: MonitoringSetupSchema,
  }),
});

export const ExecutionMetadataSchema = z.object({
  dagConfig: z.record(z.any()),
  taskResults: z.record(z.any()),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const CampaignLearningsSchema = z.object({
  whatWorked: z.array(z.string()),
  whatDidntWork: z.array(z.string()),
  improvements: z.array(z.string()),
  reusableStrategies: z.array(z.string()),
});

// =====================================================
// MAIN SCHEMAS
// =====================================================

export const AutonomousCampaignSchema = z.object({
  id: z.string().uuid(),

  // Campaign metadata
  title: z.string(),
  description: z.string().nullable(),
  campaignType: CampaignTypeSchema,

  // Lifecycle
  status: CampaignStatusSchema,
  agentCreated: z.boolean(),

  // Agent information
  planningAgentId: z.string().nullable(),
  orchestratorAgentId: z.string().nullable(),

  // Prompt & planning
  originalPrompt: z.string().nullable(),
  planningOutput: CampaignPlanningOutputSchema.nullable(),

  // Execution
  executionMetadata: ExecutionMetadataSchema.nullable(),
  executionGraphId: z.string().uuid().nullable(),

  // Targeting
  targetContactCriteria: CampaignTargetingSchema.nullable(),
  targetOutletTypes: z.array(z.string()),
  targetTopics: z.array(z.string()),

  // Personalization
  personalizationStrategy: PersonalizationStrategySchema.nullable(),
  pitchTheme: z.string().nullable(),

  // Workflow
  workflowConfig: WorkflowConfigSchema.nullable(),
  batchSize: z.number().int().positive(),
  delayBetweenBatches: z.number().int().positive(),

  // Monitoring
  monitoringSetup: MonitoringSetupSchema.nullable(),
  kpis: CampaignKPIsSchema.nullable(),
  successCriteria: SuccessCriteriaSchema.nullable(),

  // Results
  totalContactsTargeted: z.number().int().min(0),
  pitchesSent: z.number().int().min(0),
  responsesReceived: z.number().int().min(0),
  placementsAchieved: z.number().int().min(0),

  // Quality & learning
  qualityScore: z.number().min(0).max(1).nullable(),
  learnings: CampaignLearningsSchema.nullable(),

  // Scheduling
  scheduledStart: z.date().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  failureReason: z.string().nullable(),

  // Approval
  requiresApproval: z.boolean(),
  approvedAt: z.date().nullable(),
  approvedBy: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const CampaignTemplateSchema = z.object({
  id: z.string().uuid(),

  // Template metadata
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  campaignType: CampaignTypeSchema,

  // Template configuration
  templateConfig: z.record(z.any()),
  executionGraphTemplate: z.record(z.any()).nullable(),

  // Usage tracking
  usageCount: z.number().int().min(0),
  successRate: z.number().min(0).max(1).nullable(),

  // Ownership
  isSystemTemplate: z.boolean(),
  createdByAgent: z.string().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),

  // Multi-tenancy
  organizationId: z.string().uuid().nullable(),
});

export const CampaignTaskSchema = z.object({
  id: z.string().uuid(),

  // Relationships
  campaignId: z.string().uuid(),
  agentTaskId: z.string().uuid().nullable(),

  // Task metadata
  taskType: CampaignTaskTypeSchema,
  taskOrder: z.number().int().min(1),

  // Configuration & results
  taskConfig: z.record(z.any()).nullable(),
  taskOutput: z.record(z.any()).nullable(),

  // Timestamps
  createdAt: z.date(),
  completedAt: z.date().nullable(),

  // Multi-tenancy
  organizationId: z.string().uuid(),
});

export const CampaignStatisticsSchema = z.object({
  campaignId: z.string().uuid(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  failedTasks: z.number().int().min(0),
  pendingTasks: z.number().int().min(0),
  progressPercentage: z.number().min(0).max(100),
});

// =====================================================
// INPUT SCHEMAS
// =====================================================

export const CreateAutonomousCampaignInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  campaignType: CampaignTypeSchema.default(CampaignType.CUSTOM),
  originalPrompt: z.string().min(10, 'Campaign prompt must be at least 10 characters').max(5000),
  requiresApproval: z.boolean().default(false),
  scheduledStart: z.date().optional(),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
});

export const UpdateAutonomousCampaignInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: CampaignStatusSchema.optional(),
  planningOutput: CampaignPlanningOutputSchema.optional(),
  executionMetadata: ExecutionMetadataSchema.optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  learnings: CampaignLearningsSchema.optional(),
});

export const CampaignPlanningRequestSchema = z.object({
  prompt: z.string().min(10).max(5000),
  campaignType: CampaignTypeSchema.optional(),
  constraints: z.object({
    maxContacts: z.number().int().positive().optional(),
    maxBudget: z.number().positive().optional(),
    timeline: z.string().optional(),
  }).optional(),
  preferences: z.object({
    personalizationLevel: z.enum(['high', 'medium', 'low']).optional(),
    outletTypes: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
  }).optional(),
});

export const CampaignExecutionRequestSchema = z.object({
  campaignId: z.string().uuid(),
  dryRun: z.boolean().default(false),
  skipApproval: z.boolean().default(false),
});

export const CampaignProgressUpdateSchema = z.object({
  campaignId: z.string().uuid(),
  currentTask: z.string(),
  completedTasks: z.number().int().min(0),
  totalTasks: z.number().int().min(1),
  status: CampaignStatusSchema,
  errors: z.array(z.string()),
});
