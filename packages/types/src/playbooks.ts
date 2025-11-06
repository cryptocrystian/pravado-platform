// =====================================================
// AI PLAYBOOKS SYSTEM - TYPESCRIPT TYPES
// Sprint 41 Phase 3.4 Days 1-2
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Playbook lifecycle status
 */
export enum PlaybookStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DEPRECATED = 'DEPRECATED',
}

/**
 * Playbook execution instance status
 */
export enum PlaybookExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Types of playbook steps
 */
export enum PlaybookStepType {
  /** Execute an AI agent */
  AGENT_EXECUTION = 'AGENT_EXECUTION',
  /** Transform or process data */
  DATA_TRANSFORM = 'DATA_TRANSFORM',
  /** Conditional branching based on data */
  CONDITIONAL_BRANCH = 'CONDITIONAL_BRANCH',
  /** Execute multiple steps in parallel */
  PARALLEL_EXECUTION = 'PARALLEL_EXECUTION',
  /** Wait for user input */
  WAIT_FOR_INPUT = 'WAIT_FOR_INPUT',
  /** Make an external API call */
  API_CALL = 'API_CALL',
  /** Query the database */
  DATABASE_QUERY = 'DATABASE_QUERY',
  /** Search agent memory */
  MEMORY_SEARCH = 'MEMORY_SEARCH',
  /** Resolve a prompt template */
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  /** Execute custom JavaScript/TypeScript function */
  CUSTOM_FUNCTION = 'CUSTOM_FUNCTION',
}

/**
 * Step execution result status
 */
export enum StepResultStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Trigger source for playbook execution
 */
export enum TriggerSource {
  MANUAL = 'manual',
  API = 'api',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  WEBHOOK = 'webhook',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Playbook metadata and configuration
 */
export interface Playbook {
  id: string;
  organizationId: string;

  // Metadata
  name: string;
  description?: string;
  version: number;
  status: PlaybookStatus;

  // Configuration
  tags?: string[];
  category?: string;
  agentId?: string;

  // Schema versioning
  schemaVersion: number;

  // Input/Output specifications
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;

  // Execution settings
  timeoutSeconds: number;
  maxRetries: number;
  retryDelaySeconds: number;

  // Additional metadata
  metadata?: Record<string, any>;

  // Audit fields
  createdBy?: string;
  updatedBy?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Individual step within a playbook
 */
export interface PlaybookStep {
  id: string;
  playbookId: string;

  // Step identification
  stepName: string;
  stepType: PlaybookStepType;
  stepOrder: number;

  // Step configuration
  description?: string;
  config: Record<string, any>;

  // Input/Output
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  inputMapping: Record<string, any>;

  // Branching logic
  condition?: Record<string, any>;
  onSuccessStepId?: string;
  onFailureStepId?: string;

  // Execution settings
  timeoutSeconds: number;
  maxRetries: number;
  isOptional: boolean;

  // Metadata
  metadata?: Record<string, any>;

  // Audit fields
  createdAt: string;
  updatedAt: string;
}

/**
 * Playbook execution instance
 */
export interface PlaybookExecution {
  id: string;
  playbookId: string;
  organizationId: string;

  // Execution metadata
  executionName?: string;
  status: PlaybookExecutionStatus;

  // Context
  triggeredBy?: string;
  triggerSource: string;

  // Input/Output
  inputData: Record<string, any>;
  outputData: Record<string, any>;

  // Error tracking
  errorMessage?: string;
  errorStack?: string;

  // Timing
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;

  // Progress tracking
  currentStepId?: string;
  completedSteps: number;
  totalSteps?: number;

  // Additional context
  metadata?: Record<string, any>;

  // Audit fields
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of a step execution
 */
export interface PlaybookStepResult {
  id: string;
  executionId: string;
  stepId: string;

  // Result metadata
  status: StepResultStatus;
  attemptNumber: number;

  // Input/Output
  inputData: Record<string, any>;
  outputData: Record<string, any>;

  // Error tracking
  errorMessage?: string;
  errorStack?: string;

  // Timing
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;

  // Metadata
  metadata?: Record<string, any>;

  // Audit fields
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// EXTENDED INTERFACES WITH RELATIONS
// =====================================================

/**
 * Playbook with steps included
 */
export interface PlaybookWithSteps extends Playbook {
  steps: PlaybookStep[];
}

/**
 * Playbook execution with step results
 */
export interface PlaybookExecutionWithResults extends PlaybookExecution {
  stepResults: PlaybookStepResult[];
  playbook?: Playbook;
  currentStep?: PlaybookStep;
}

/**
 * Playbook with execution summary
 */
export interface PlaybookWithSummary extends Playbook {
  summary: PlaybookExecutionSummary;
  steps: PlaybookStep[];
}

// =====================================================
// INPUT/OUTPUT TYPES
// =====================================================

/**
 * Input for creating a new playbook
 */
export interface CreatePlaybookInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  agentId?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  timeoutSeconds?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  metadata?: Record<string, any>;
}

/**
 * Input for updating a playbook
 */
export interface UpdatePlaybookInput {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: PlaybookStatus;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  timeoutSeconds?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  metadata?: Record<string, any>;
}

/**
 * Input for creating a playbook step
 */
export interface CreatePlaybookStepInput {
  stepName: string;
  stepType: PlaybookStepType;
  stepOrder: number;
  description?: string;
  config: Record<string, any>;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  inputMapping?: Record<string, any>;
  condition?: Record<string, any>;
  timeoutSeconds?: number;
  maxRetries?: number;
  isOptional?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Input for updating a playbook step
 */
export interface UpdatePlaybookStepInput {
  stepName?: string;
  description?: string;
  config?: Record<string, any>;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  inputMapping?: Record<string, any>;
  condition?: Record<string, any>;
  onSuccessStepId?: string;
  onFailureStepId?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  isOptional?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Input for executing a playbook
 */
export interface ExecutePlaybookInput {
  playbookId: string;
  executionName?: string;
  inputData: Record<string, any>;
  triggerSource?: TriggerSource;
  metadata?: Record<string, any>;
}

/**
 * Input for step execution
 */
export interface ExecuteStepInput {
  stepId: string;
  inputData: Record<string, any>;
  attemptNumber?: number;
}

// =====================================================
// SUMMARY AND ANALYTICS TYPES
// =====================================================

/**
 * Playbook execution summary
 */
export interface PlaybookExecutionSummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  runningExecutions: number;
  avgDurationMs: number;
  lastExecutionAt?: string;
  successRate: number;
}

/**
 * Execution progress information
 */
export interface ExecutionProgress {
  executionId: string;
  status: PlaybookExecutionStatus;
  progressPercentage: number;
  currentStepName?: string;
  completedSteps: number;
  totalSteps: number;
  elapsedTimeMs: number;
}

/**
 * Step statistics
 */
export interface StepStatistics {
  stepId: string;
  stepName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDurationMs: number;
  successRate: number;
}

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

/**
 * Default timeout values (in seconds)
 */
export const DEFAULT_TIMEOUTS = {
  PLAYBOOK: 3600, // 1 hour
  STEP: 300, // 5 minutes
  AGENT_EXECUTION: 600, // 10 minutes
  API_CALL: 30, // 30 seconds
  DATABASE_QUERY: 60, // 1 minute
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_SECONDS: 30,
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Playbook status configurations for UI rendering
 */
export const PLAYBOOK_STATUS_CONFIGS = {
  [PlaybookStatus.DRAFT]: {
    label: 'Draft',
    color: 'gray',
    icon: '📝',
    description: 'Playbook is being created or edited',
  },
  [PlaybookStatus.ACTIVE]: {
    label: 'Active',
    color: 'green',
    icon: '✅',
    description: 'Playbook is ready for execution',
  },
  [PlaybookStatus.ARCHIVED]: {
    label: 'Archived',
    color: 'blue',
    icon: '📦',
    description: 'Playbook is archived but can be restored',
  },
  [PlaybookStatus.DEPRECATED]: {
    label: 'Deprecated',
    color: 'red',
    icon: '⚠️',
    description: 'Playbook is outdated and should not be used',
  },
};

/**
 * Execution status configurations for UI rendering
 */
export const EXECUTION_STATUS_CONFIGS = {
  [PlaybookExecutionStatus.PENDING]: {
    label: 'Pending',
    color: 'gray',
    icon: '⏳',
    description: 'Execution is queued',
  },
  [PlaybookExecutionStatus.RUNNING]: {
    label: 'Running',
    color: 'blue',
    icon: '▶️',
    description: 'Execution is in progress',
  },
  [PlaybookExecutionStatus.PAUSED]: {
    label: 'Paused',
    color: 'yellow',
    icon: '⏸️',
    description: 'Execution is paused',
  },
  [PlaybookExecutionStatus.COMPLETED]: {
    label: 'Completed',
    color: 'green',
    icon: '✅',
    description: 'Execution completed successfully',
  },
  [PlaybookExecutionStatus.FAILED]: {
    label: 'Failed',
    color: 'red',
    icon: '❌',
    description: 'Execution failed with errors',
  },
  [PlaybookExecutionStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'orange',
    icon: '🚫',
    description: 'Execution was cancelled by user',
  },
  [PlaybookExecutionStatus.TIMEOUT]: {
    label: 'Timeout',
    color: 'red',
    icon: '⏱️',
    description: 'Execution exceeded time limit',
  },
};

/**
 * Step type configurations for UI rendering
 */
export const STEP_TYPE_CONFIGS = {
  [PlaybookStepType.AGENT_EXECUTION]: {
    label: 'Agent Execution',
    icon: '🤖',
    color: 'purple',
    description: 'Execute an AI agent',
    defaultTimeout: DEFAULT_TIMEOUTS.AGENT_EXECUTION,
  },
  [PlaybookStepType.DATA_TRANSFORM]: {
    label: 'Data Transform',
    icon: '🔄',
    color: 'blue',
    description: 'Transform or process data',
    defaultTimeout: DEFAULT_TIMEOUTS.STEP,
  },
  [PlaybookStepType.CONDITIONAL_BRANCH]: {
    label: 'Conditional Branch',
    icon: '🔀',
    color: 'yellow',
    description: 'Branch based on conditions',
    defaultTimeout: DEFAULT_TIMEOUTS.STEP,
  },
  [PlaybookStepType.PARALLEL_EXECUTION]: {
    label: 'Parallel Execution',
    icon: '⚡',
    color: 'orange',
    description: 'Execute multiple steps in parallel',
    defaultTimeout: DEFAULT_TIMEOUTS.STEP,
  },
  [PlaybookStepType.WAIT_FOR_INPUT]: {
    label: 'Wait for Input',
    icon: '⏸️',
    color: 'gray',
    description: 'Pause and wait for user input',
    defaultTimeout: 0, // No timeout for user input
  },
  [PlaybookStepType.API_CALL]: {
    label: 'API Call',
    icon: '🌐',
    color: 'green',
    description: 'Call an external API',
    defaultTimeout: DEFAULT_TIMEOUTS.API_CALL,
  },
  [PlaybookStepType.DATABASE_QUERY]: {
    label: 'Database Query',
    icon: '🗄️',
    color: 'indigo',
    description: 'Query the database',
    defaultTimeout: DEFAULT_TIMEOUTS.DATABASE_QUERY,
  },
  [PlaybookStepType.MEMORY_SEARCH]: {
    label: 'Memory Search',
    icon: '🧠',
    color: 'pink',
    description: 'Search agent memory',
    defaultTimeout: DEFAULT_TIMEOUTS.STEP,
  },
  [PlaybookStepType.PROMPT_TEMPLATE]: {
    label: 'Prompt Template',
    icon: '💬',
    color: 'cyan',
    description: 'Resolve a prompt template',
    defaultTimeout: DEFAULT_TIMEOUTS.STEP,
  },
  [PlaybookStepType.CUSTOM_FUNCTION]: {
    label: 'Custom Function',
    icon: '⚙️',
    color: 'teal',
    description: 'Execute custom code',
    defaultTimeout: DEFAULT_TIMEOUTS.STEP,
  },
};

/**
 * Step result status configurations
 */
export const STEP_RESULT_STATUS_CONFIGS = {
  [StepResultStatus.PENDING]: {
    label: 'Pending',
    color: 'gray',
    icon: '⏳',
  },
  [StepResultStatus.RUNNING]: {
    label: 'Running',
    color: 'blue',
    icon: '▶️',
  },
  [StepResultStatus.COMPLETED]: {
    label: 'Completed',
    color: 'green',
    icon: '✅',
  },
  [StepResultStatus.FAILED]: {
    label: 'Failed',
    color: 'red',
    icon: '❌',
  },
  [StepResultStatus.SKIPPED]: {
    label: 'Skipped',
    color: 'yellow',
    icon: '⏭️',
  },
  [StepResultStatus.TIMEOUT]: {
    label: 'Timeout',
    color: 'orange',
    icon: '⏱️',
  },
};

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * List response with pagination
 */
export interface PlaybooksListResponse {
  playbooks: Playbook[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Executions list response with pagination
 */
export interface ExecutionsListResponse {
  executions: PlaybookExecution[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Filters for querying playbooks
 */
export interface PlaybooksQueryFilters {
  status?: PlaybookStatus | PlaybookStatus[];
  category?: string;
  tags?: string[];
  agentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at' | 'name';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Filters for querying executions
 */
export interface ExecutionsQueryFilters {
  playbookId?: string;
  status?: PlaybookExecutionStatus | PlaybookExecutionStatus[];
  triggeredBy?: string;
  triggerSource?: TriggerSource;
  startedAfter?: string;
  startedBefore?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'started_at' | 'completed_at';
  orderDirection?: 'asc' | 'desc';
}
