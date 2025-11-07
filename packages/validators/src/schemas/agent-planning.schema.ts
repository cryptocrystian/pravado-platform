// =====================================================
// AGENT PLANNING ZOD VALIDATION SCHEMAS
// =====================================================

import { z } from 'zod';
import { AgentGoalStatus, PlanTaskStatus, TaskStrategy } from '@pravado/types';

// =====================================================
// ENUMS
// =====================================================

export const AgentGoalStatusSchema = z.nativeEnum(AgentGoalStatus);
export const PlanTaskStatusSchema = z.nativeEnum(PlanTaskStatus);
export const TaskStrategySchema = z.nativeEnum(TaskStrategy);

// =====================================================
// GOAL SCHEMAS
// =====================================================

export const CreateAgentGoalInputSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  priority: z.number().int().min(1).max(10).default(5),
  tags: z.array(z.string()).default([]),
  requiresApproval: z.boolean().default(false),
  targetContactId: z.string().uuid().optional(),
  targetCampaignId: z.string().uuid().optional(),
  dueDate: z.date().optional(),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
});

export const UpdateAgentGoalInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: AgentGoalStatusSchema.optional(),
  priority: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.date().optional(),
});

export const AgentGoalSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().min(1),
  title: z.string(),
  description: z.string().nullable(),

  status: AgentGoalStatusSchema,
  priority: z.number().int().min(1).max(10),

  tags: z.array(z.string()),
  riskScore: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
  approvedAt: z.date().nullable(),
  approvedBy: z.string().nullable(),

  targetContactId: z.string().nullable(),
  targetCampaignId: z.string().nullable(),
  dueDate: z.date().nullable(),

  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  failureReason: z.string().nullable(),

  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  organizationId: z.string().uuid(),
});

// =====================================================
// TASK SCHEMAS
// =====================================================

export const CreateAgentTaskInputSchema = z.object({
  goalId: z.string().uuid(),
  agentId: z.string().min(1, 'Agent ID is required'),
  stepNumber: z.number().int().min(1, 'Step number must be positive'),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  strategy: TaskStrategySchema.default(TaskStrategy.PLAN_AND_EXECUTE),
  parentTaskId: z.string().uuid().optional(),
  plannedByAgent: z.string().optional(),
  estimatedDurationMinutes: z.number().int().min(0).optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  organizationId: z.string().uuid(),
});

export const UpdateAgentTaskInputSchema = z.object({
  status: PlanTaskStatusSchema.optional(),
  outputSummary: z.string().max(5000).optional(),
  outputData: z.record(z.any()).optional(),
  errorMessage: z.string().max(2000).optional(),
  agentExecutionId: z.string().uuid().optional(),
});

export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable(),

  agentId: z.string(),
  stepNumber: z.number().int().min(1),
  title: z.string(),
  description: z.string().nullable(),
  strategy: TaskStrategySchema,

  status: PlanTaskStatusSchema,

  agentExecutionId: z.string().nullable(),
  outputSummary: z.string().nullable(),
  outputData: z.record(z.any()).nullable(),
  errorMessage: z.string().nullable(),

  plannedByAgent: z.string().nullable(),
  estimatedDurationMinutes: z.number().nullable(),
  dependencies: z.array(z.string()),

  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

  organizationId: z.string().uuid(),
});

// =====================================================
// EXECUTION GRAPH SCHEMAS
// =====================================================

export const GraphNodeSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  type: z.enum(['START', 'TASK', 'DECISION', 'END']),
  status: PlanTaskStatusSchema,
  data: z.record(z.any()),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['SEQUENCE', 'CONDITIONAL', 'PARALLEL']),
  condition: z.string().optional(),
});

export const ExecutionGraphMetadataSchema = z.object({
  maxDepth: z.number().int().min(0).max(20),
  estimatedDuration: z.number().min(0),
  riskScore: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
});

export const ExecutionGraphDataSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  metadata: ExecutionGraphMetadataSchema,
});

export const CreateExecutionGraphInputSchema = z.object({
  goalId: z.string().uuid(),
  agentId: z.string().min(1),
  graphData: ExecutionGraphDataSchema,
  organizationId: z.string().uuid(),
});

export const ExecutionGraphSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  agentId: z.string(),

  graphData: ExecutionGraphDataSchema,

  totalNodes: z.number().int().min(0),
  completedNodes: z.number().int().min(0),
  failedNodes: z.number().int().min(0),
  maxDepth: z.number().int().min(0).max(20),

  executionStatus: AgentGoalStatusSchema,
  currentNodeId: z.string().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),

  organizationId: z.string().uuid(),
});

// =====================================================
// PLANNING SCHEMAS
// =====================================================

export const PlanningRequestSchema = z.object({
  goalId: z.string().uuid(),
  goalDescription: z.string().min(1, 'Goal description is required'),
  context: z.record(z.any()).optional(),
  maxTasks: z.number().int().min(1).max(50).default(10),
  maxDepth: z.number().int().min(1).max(10).default(5),
});

export const PlanningResultSchema = z.object({
  tasks: z.array(CreateAgentTaskInputSchema),
  graph: ExecutionGraphDataSchema,
  reasoning: z.string(),
});

export const GraphTraversalOptionsSchema = z.object({
  maxConcurrency: z.number().int().min(1).max(10).default(3),
  stopOnFirstFailure: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export const GoalSummarySchema = z.object({
  goalId: z.string().uuid(),
  title: z.string(),
  status: AgentGoalStatusSchema,
  totalTasks: z.number().int().min(0),
  pendingTasks: z.number().int().min(0),
  inProgressTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  failedTasks: z.number().int().min(0),
});

export const TaskExecutionResultSchema = z.object({
  taskId: z.string().uuid(),
  status: PlanTaskStatusSchema,
  outputSummary: z.string().nullable(),
  outputData: z.record(z.any()).nullable(),
  errorMessage: z.string().nullable(),
  executionTimeMs: z.number().min(0),
});

export const GraphExecutionProgressSchema = z.object({
  goalId: z.string().uuid(),
  currentNodeId: z.string().nullable(),
  completedNodes: z.number().int().min(0),
  totalNodes: z.number().int().min(0),
  failedNodes: z.number().int().min(0),
  status: AgentGoalStatusSchema,
  errors: z.array(z.string()),
});
