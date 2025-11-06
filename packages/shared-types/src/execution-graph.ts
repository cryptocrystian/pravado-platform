// =====================================================
// EXECUTION GRAPH TYPES - DAG-based Campaign Execution
// =====================================================

/**
 * Execution graph task status enumeration
 */
export enum GraphTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
}

/**
 * Campaign Task Graph Node
 */
export interface CampaignTaskGraph {
  id: string;

  // Campaign reference
  campaignId: string;

  // Node identification
  nodeId: string;

  // Task definition
  taskType: string;
  agentType: string | null;

  // Task configuration
  metadata: Record<string, any> | null;
  config: Record<string, any> | null;

  // Dependencies (DAG edges)
  dependsOn: string[];

  // Execution state
  status: GraphTaskStatus;
  output: Record<string, any> | null;
  errorMessage: string | null;

  // Retry configuration
  maxRetries: number;
  retryCount: number;

  // Execution timing
  startedAt: Date | null;
  completedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Campaign Task Execution
 */
export interface CampaignTaskExecution {
  id: string;

  // Graph node reference
  graphNodeId: string;
  campaignId: string;
  nodeId: string;

  // Agent execution
  agentId: string | null;
  agentRunId: string | null;

  // Execution details
  status: GraphTaskStatus;
  input: Record<string, any> | null;
  output: Record<string, any> | null;
  errorMessage: string | null;
  errorStack: string | null;

  // Retry information
  attemptNumber: number;
  isRetry: boolean;

  // Performance metrics
  durationMs: number | null;

  // Timestamps
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Executable task (ready to run)
 */
export interface ExecutableTask {
  id: string;
  nodeId: string;
  taskType: string;
  agentType: string | null;
  metadata: Record<string, any> | null;
  config: Record<string, any> | null;
  dependsOn: string[];
  retryCount: number;
  maxRetries: number;
}

/**
 * Status propagation result
 */
export interface StatusPropagationResult {
  nodeId: string;
  newStatus: GraphTaskStatus;
  affectedCount: number;
  downstreamNodes: string[];
}

/**
 * Execution summary
 */
export interface ExecutionSummary {
  campaignId: string;
  totalTasks: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  blocked: number;
  skipped: number;
  progress: number;
  isComplete: boolean;
  hasFailures: boolean;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  nodeId: string;
  status: GraphTaskStatus;
  output?: Record<string, any>;
  error?: string;
  errorStack?: string;
  durationMs: number;
}

/**
 * Graph execution status
 */
export interface GraphExecutionStatus {
  campaignId: string;
  summary: ExecutionSummary;
  tasks: CampaignTaskGraph[];
  recentExecutions: CampaignTaskExecution[];
  executableTasks: ExecutableTask[];
  isRunning: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Input for creating task graph node
 */
export interface CreateTaskGraphNodeInput {
  campaignId: string;
  nodeId: string;
  taskType: string;
  agentType?: string;
  metadata?: Record<string, any>;
  config?: Record<string, any>;
  dependsOn?: string[];
  maxRetries?: number;
  organizationId: string;
}

/**
 * Input for updating task status
 */
export interface UpdateTaskStatusInput {
  campaignId: string;
  nodeId: string;
  status: GraphTaskStatus;
  output?: Record<string, any>;
  errorMessage?: string;
  organizationId: string;
}

/**
 * Input for creating task execution
 */
export interface CreateTaskExecutionInput {
  graphNodeId: string;
  campaignId: string;
  nodeId: string;
  agentId?: string;
  agentRunId?: string;
  status: GraphTaskStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  errorMessage?: string;
  errorStack?: string;
  attemptNumber: number;
  isRetry: boolean;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  organizationId: string;
}

/**
 * Retry request
 */
export interface RetryTaskRequest {
  campaignId: string;
  nodeId: string;
  organizationId: string;
}

/**
 * Skip request
 */
export interface SkipTaskRequest {
  campaignId: string;
  nodeId: string;
  reason?: string;
  organizationId: string;
}

/**
 * Skip result
 */
export interface SkipTaskResult {
  success: boolean;
  error?: string;
  propagation?: StatusPropagationResult;
}

/**
 * Task execution log entry
 */
export interface TaskExecutionLog {
  nodeId: string;
  taskType: string;
  status: GraphTaskStatus;
  attempts: CampaignTaskExecution[];
  totalAttempts: number;
  totalDurationMs: number;
  lastError: string | null;
  output: Record<string, any> | null;
}

/**
 * Execution logs response
 */
export interface ExecutionLogs {
  campaignId: string;
  logs: TaskExecutionLog[];
  summary: ExecutionSummary;
}

/**
 * DAG validation result
 */
export interface DAGValidationResult {
  isValid: boolean;
  hasCycles: boolean;
  unreachableNodes: string[];
  missingDependencies: string[];
  errors: string[];
}

/**
 * Task graph definition (for bulk creation)
 */
export interface TaskGraphDefinition {
  nodes: Array<{
    nodeId: string;
    taskType: string;
    agentType?: string;
    metadata?: Record<string, any>;
    config?: Record<string, any>;
    dependsOn?: string[];
    maxRetries?: number;
  }>;
}

/**
 * Graph creation request
 */
export interface CreateGraphRequest {
  campaignId: string;
  graph: TaskGraphDefinition;
  organizationId: string;
  validate?: boolean;
}

/**
 * Graph creation result
 */
export interface CreateGraphResult {
  campaignId: string;
  nodesCreated: number;
  validation: DAGValidationResult;
  graph: CampaignTaskGraph[];
}

/**
 * Execution start request
 */
export interface StartExecutionRequest {
  campaignId: string;
  organizationId: string;
  parallelism?: number;
  dryRun?: boolean;
}

/**
 * Execution start result
 */
export interface StartExecutionResult {
  campaignId: string;
  started: boolean;
  executableTasks: number;
  summary: ExecutionSummary;
}

/**
 * Task retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Graph runner configuration
 */
export interface GraphRunnerConfig {
  campaignId: string;
  organizationId: string;
  parallelism?: number;
  retryPolicy?: RetryPolicy;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

/**
 * Task execution context
 */
export interface TaskExecutionContext {
  campaignId: string;
  nodeId: string;
  taskType: string;
  agentType: string | null;
  metadata: Record<string, any> | null;
  config: Record<string, any> | null;
  attemptNumber: number;
  isRetry: boolean;
  dependencyOutputs: Record<string, any>;
  organizationId: string;
}

/**
 * Graph event
 */
export interface GraphEvent {
  type:
    | 'task-started'
    | 'task-completed'
    | 'task-failed'
    | 'task-retrying'
    | 'task-skipped'
    | 'graph-completed'
    | 'graph-failed';
  campaignId: string;
  nodeId?: string;
  status?: GraphTaskStatus;
  data?: Record<string, any>;
  timestamp: Date;
}

/**
 * Execution analytics
 */
export interface ExecutionAnalytics {
  campaignId: string;
  totalExecutionTime: number;
  avgTaskDuration: number;
  taskDurations: Record<string, number>;
  retryRate: number;
  failureRate: number;
  parallelismUtilization: number;
  bottlenecks: Array<{
    nodeId: string;
    reason: string;
    impact: number;
  }>;
}

/**
 * Graph visualization node
 */
export interface GraphVisualizationNode {
  id: string;
  label: string;
  type: string;
  status: GraphTaskStatus;
  dependencies: string[];
  metadata?: Record<string, any>;
}

/**
 * Graph visualization data
 */
export interface GraphVisualization {
  campaignId: string;
  nodes: GraphVisualizationNode[];
  edges: Array<{
    from: string;
    to: string;
  }>;
  layout: {
    layers: string[][];
    criticalPath: string[];
  };
}
