// =====================================================
// AGENT AUTONOMY, PLANNING & EXECUTION GRAPHS TYPES
// =====================================================

/**
 * Agent goal status enumeration
 */
export enum AgentGoalStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Task status enumeration
 */
export enum PlanTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

/**
 * Task execution strategy
 */
export enum TaskStrategy {
  PLAN_ONLY = 'PLAN_ONLY', // Only plan, don't execute
  EXECUTE_ONLY = 'EXECUTE_ONLY', // Execute without planning
  PLAN_AND_EXECUTE = 'PLAN_AND_EXECUTE', // Plan and execute
}

/**
 * Agent goal - high-level objective
 */
export interface AgentGoal {
  id: string;
  agentId: string;
  title: string;
  description: string | null;

  // Status
  status: AgentGoalStatus;
  priority: number; // 1-10

  // Metadata
  tags: string[];
  riskScore: number; // 0-1
  requiresApproval: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;

  // Relationships
  targetContactId: string | null;
  targetCampaignId: string | null;
  dueDate: Date | null;

  // Execution tracking
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a new goal
 */
export interface CreateAgentGoalInput {
  agentId: string;
  title: string;
  description?: string;
  priority?: number;
  tags?: string[];
  requiresApproval?: boolean;
  targetContactId?: string;
  targetCampaignId?: string;
  dueDate?: Date;
  organizationId: string;
  createdBy: string;
}

/**
 * Input for updating a goal
 */
export interface UpdateAgentGoalInput {
  title?: string;
  description?: string;
  status?: AgentGoalStatus;
  priority?: number;
  tags?: string[];
  dueDate?: Date;
}

/**
 * Agent planning task - individual execution step within a goal
 */
export interface AgentPlanTask {
  id: string;
  goalId: string;
  parentTaskId: string | null;

  // Task definition
  agentId: string;
  stepNumber: number;
  title: string;
  description: string | null;
  strategy: TaskStrategy;

  // Status
  status: PlanTaskStatus;

  // Execution
  agentExecutionId: string | null;
  outputSummary: string | null;
  outputData: Record<string, any> | null;
  errorMessage: string | null;

  // Planning metadata
  plannedByAgent: string | null;
  estimatedDurationMinutes: number | null;
  dependencies: string[]; // Task IDs

  // Timing
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a new planning task
 */
export interface CreateAgentPlanTaskInput {
  goalId: string;
  agentId: string;
  stepNumber: number;
  title: string;
  description?: string;
  strategy?: TaskStrategy;
  parentTaskId?: string;
  plannedByAgent?: string;
  estimatedDurationMinutes?: number;
  dependencies?: string[];
  organizationId: string;
}

/**
 * Input for updating a planning task
 */
export interface UpdateAgentPlanTaskInput {
  status?: PlanTaskStatus;
  outputSummary?: string;
  outputData?: Record<string, any>;
  errorMessage?: string;
  agentExecutionId?: string;
}

/**
 * Graph node representing a task
 */
export interface GraphNode {
  id: string;
  taskId: string | null;
  type: 'START' | 'TASK' | 'DECISION' | 'END';
  status: PlanTaskStatus;
  data: Record<string, any>;
  position?: { x: number; y: number }; // For visualization
}

/**
 * Graph edge representing a dependency
 */
export interface GraphEdge {
  from: string; // Node ID
  to: string; // Node ID
  type: 'SEQUENCE' | 'CONDITIONAL' | 'PARALLEL';
  condition?: string; // Expression for conditional edges
}

/**
 * Execution graph metadata
 */
export interface ExecutionGraphMetadata {
  maxDepth: number;
  estimatedDuration: number;
  riskScore: number;
  requiresApproval: boolean;
}

/**
 * Complete execution graph
 */
export interface ExecutionGraph {
  id: string;
  goalId: string;
  agentId: string;

  // Graph structure
  graphData: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: ExecutionGraphMetadata;
  };

  // Metadata
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  maxDepth: number;

  // Execution tracking
  executionStatus: AgentGoalStatus;
  currentNodeId: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating an execution graph
 */
export interface CreateExecutionGraphInput {
  goalId: string;
  agentId: string;
  graphData: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: ExecutionGraphMetadata;
  };
  organizationId: string;
}

/**
 * Goal summary with task statistics
 */
export interface GoalSummary {
  goalId: string;
  title: string;
  status: AgentGoalStatus;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  taskId: string;
  status: PlanTaskStatus;
  outputSummary: string | null;
  outputData: Record<string, any> | null;
  errorMessage: string | null;
  executionTimeMs: number;
}

/**
 * Planning request for generating tasks from a goal
 */
export interface PlanningRequest {
  goalId: string;
  goalDescription: string;
  context?: Record<string, any>;
  maxTasks?: number;
  maxDepth?: number;
}

/**
 * Planning result with generated tasks and graph
 */
export interface PlanningResult {
  tasks: CreateAgentPlanTaskInput[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: ExecutionGraphMetadata;
  };
  reasoning: string; // GPT-4 explanation of the plan
}

/**
 * Graph traversal options
 */
export interface GraphTraversalOptions {
  maxConcurrency?: number;
  stopOnFirstFailure?: boolean;
  dryRun?: boolean;
}

/**
 * Graph execution progress
 */
export interface GraphExecutionProgress {
  goalId: string;
  currentNodeId: string | null;
  completedNodes: number;
  totalNodes: number;
  failedNodes: number;
  status: AgentGoalStatus;
  errors: string[];
}
