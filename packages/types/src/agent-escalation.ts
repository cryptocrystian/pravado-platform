// =====================================================
// AGENT ESCALATION TYPES
// Sprint 51 Phase 4.7
// =====================================================
//
// Purpose: Advanced escalation logic & multi-agent handoff system
// Provides: Escalation chains, adaptive handoff, fallback strategies
//

// =====================================================
// ENUMS
// =====================================================

export enum EscalationType {
  SKILL_BASED = 'skill_based',
  ROLE_BASED = 'role_based',
  LAST_SUCCESSFUL = 'last_successful',
  DEFAULT_CHAIN = 'default_chain',
  MANUAL = 'manual',
  CONFIDENCE_THRESHOLD = 'confidence_threshold',
}

export enum EscalationReason {
  LOW_CONFIDENCE = 'low_confidence',
  MISSING_SKILL = 'missing_skill',
  COMPLEXITY_THRESHOLD = 'complexity_threshold',
  ERROR_OCCURRED = 'error_occurred',
  TIMEOUT = 'timeout',
  MANUAL_OVERRIDE = 'manual_override',
  POLICY_VIOLATION = 'policy_violation',
  MISSING_CONTEXT = 'missing_context',
  USER_REQUESTED = 'user_requested',
  TASK_REASSIGNMENT = 'task_reassignment',
}

export enum EscalationOutcome {
  SUCCESS = 'success',
  FAILED = 'failed',
  NO_AGENT_AVAILABLE = 'no_agent_available',
  TIMEOUT = 'timeout',
  REJECTED = 'rejected',
  PARTIAL = 'partial',
  FALLBACK_USED = 'fallback_used',
}

export enum HandoffMethod {
  DIRECT = 'direct',
  SKILL_MATCH = 'skill_match',
  ROLE_PRIORITY = 'role_priority',
  LAST_SUCCESSFUL = 'last_successful',
  ROUND_ROBIN = 'round_robin',
  LOAD_BALANCED = 'load_balanced',
}

export enum EscalationPathType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  HYBRID = 'hybrid',
}

export enum FallbackStrategy {
  RETRY_DEFAULT = 'retry_default',
  RETURN_TO_USER = 'return_to_user',
  ESCALATE_TO_HUMAN = 'escalate_to_human',
  USE_LAST_SUCCESSFUL = 'use_last_successful',
  QUEUE_FOR_LATER = 'queue_for_later',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Input for escalating a task
 */
export interface EscalateTaskInput {
  agentId: string;
  context: {
    task?: string;
    taskId?: string;
    conversationId?: string;
    userId?: string;
    organizationId?: string;
    metadata?: Record<string, any>;
  };
  reason: EscalationReason;
  options?: {
    escalationType?: EscalationType;
    preferredAgents?: string[];
    excludeAgents?: string[];
    maxAttempts?: number;
    timeout?: number;
    requireSkills?: string[];
  };
}

/**
 * Result of task escalation
 */
export interface EscalationResult {
  success: boolean;
  nextAgent?: string;
  method: HandoffMethod;
  escalationType: EscalationType;
  reason: EscalationReason;
  outcome: EscalationOutcome;
  attemptedAgents: string[];
  failedAttempts: {
    agentId: string;
    reason: string;
    timestamp: Date;
  }[];
  path?: EscalationPathStep[];
  metadata: {
    processingTime: number;
    retryCount: number;
    fallbackUsed: boolean;
  };
  message?: string;
  timestamp: Date;
}

/**
 * Input for handoff to another agent
 */
export interface HandoffToAgentInput {
  fromAgentId: string;
  toAgentId: string;
  context: {
    task?: string;
    taskId?: string;
    conversationId?: string;
    turnId?: string;
    previousMessages?: string[];
    metadata?: Record<string, any>;
  };
  reason?: string;
  preserveMemory?: boolean;
  transferOwnership?: boolean;
}

/**
 * Result of agent handoff
 */
export interface HandoffResult {
  success: boolean;
  fromAgent: string;
  toAgent: string;
  handoffId: string;
  contextTransferred: boolean;
  memoryPreserved: boolean;
  ownershipTransferred: boolean;
  turnNote?: string;
  metadata: {
    transferredAt: Date;
    contextSize: number;
    memoryItemsTransferred?: number;
  };
  message: string;
}

/**
 * Input for fallback to default
 */
export interface FallbackToDefaultInput {
  agentId: string;
  context: {
    task?: string;
    taskId?: string;
    conversationId?: string;
    organizationId?: string;
    failedAgents?: string[];
  };
  strategy?: FallbackStrategy;
  maxRetries?: number;
}

/**
 * Result of fallback escalation
 */
export interface EscalationFallbackResult {
  success: boolean;
  strategy: FallbackStrategy;
  fallbackAgent?: string;
  outcome: EscalationOutcome;
  retriedAgents: string[];
  userMessage: string;
  suggestions: string[];
  metadata: {
    retryCount: number;
    allAgentsFailed: boolean;
    queuedForLater: boolean;
  };
  timestamp: Date;
}

/**
 * Escalation path definition
 */
export interface EscalationPath {
  id: string;
  name: string;
  description: string;
  pathType: EscalationPathType;
  steps: EscalationPathStep[];
  organizationId?: string;
  triggerConditions?: {
    reason?: EscalationReason[];
    agentRole?: string[];
    skillRequired?: string[];
    confidenceThreshold?: number;
  };
  isDefault: boolean;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Individual step in escalation path
 */
export interface EscalationPathStep {
  stepNumber: number;
  targetAgentId?: string;
  targetRole?: string;
  targetSkill?: string;
  method: HandoffMethod;
  conditions?: {
    requireSkills?: string[];
    minConfidence?: number;
    maxLoad?: number;
    availability?: boolean;
  };
  timeout?: number;
  fallbackBehavior?: FallbackStrategy;
}

/**
 * Escalation log entry
 */
export interface EscalationLog {
  id: string;
  fromAgentId: string;
  toAgentId?: string;
  escalationType: EscalationType;
  reason: EscalationReason;
  outcome: EscalationOutcome;
  method?: HandoffMethod;
  attemptedAgents: string[];
  path?: string; // JSON stringified path
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  userId?: string;
  organizationId?: string;
  createdAt: Date;
}

/**
 * Escalation log database record
 */
export interface EscalationLogRecord {
  id: string;
  from_agent_id: string;
  to_agent_id?: string;
  escalation_type: EscalationType;
  reason: EscalationReason;
  outcome: EscalationOutcome;
  method?: HandoffMethod;
  attempted_agents: string[];
  path?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  user_id?: string;
  organization_id?: string;
  created_at: Date;
}

/**
 * Escalation path database record
 */
export interface EscalationPathRecord {
  id: string;
  name: string;
  description: string;
  path_type: EscalationPathType;
  steps: Record<string, any>[];
  organization_id?: string;
  trigger_conditions?: Record<string, any>;
  is_default: boolean;
  enabled: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// QUERY & FILTER TYPES
// =====================================================

export interface EscalationHistoryQuery {
  agentId?: string;
  fromAgentId?: string;
  toAgentId?: string;
  escalationType?: EscalationType;
  reason?: EscalationReason;
  outcome?: EscalationOutcome;
  startDate?: Date;
  endDate?: Date;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

export interface EscalationPathQuery {
  organizationId?: string;
  pathType?: EscalationPathType;
  enabled?: boolean;
  isDefault?: boolean;
  limit?: number;
  offset?: number;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface EscalationMetrics {
  agentId: string;
  totalEscalations: number;
  successfulEscalations: number;
  failedEscalations: number;
  successRate: number;
  escalationsByReason: Record<EscalationReason, number>;
  escalationsByType: Record<EscalationType, number>;
  outcomeDistribution: Record<EscalationOutcome, number>;
  avgProcessingTime: number;
  avgRetryCount: number;
  topEscalationTargets: {
    agentId: string;
    count: number;
    successRate: number;
  }[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface EscalationTrend {
  date: string;
  totalEscalations: number;
  successfulEscalations: number;
  failedEscalations: number;
  avgProcessingTime: number;
  topReasons: {
    reason: EscalationReason;
    count: number;
  }[];
}

export interface EscalationPathPerformance {
  pathId: string;
  pathName: string;
  totalUses: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgStepsUsed: number;
  avgProcessingTime: number;
  commonFailurePoints: {
    stepNumber: number;
    failureCount: number;
    commonReasons: string[];
  }[];
}

export interface AgentHandoffStats {
  agentId: string;
  handoffsReceived: number;
  handoffsGiven: number;
  netHandoffs: number;
  topSourceAgents: {
    agentId: string;
    count: number;
  }[];
  topTargetAgents: {
    agentId: string;
    count: number;
  }[];
  avgContextSize: number;
  memoryPreservationRate: number;
}

// =====================================================
// AGENT AVAILABILITY TYPES
// =====================================================

export interface AgentAvailability {
  agentId: string;
  available: boolean;
  currentLoad: number;
  maxLoad: number;
  skills: string[];
  role: string;
  confidence: number;
  lastActive: Date;
  estimatedWaitTime?: number;
}

export interface AgentSelectionCriteria {
  requiredSkills?: string[];
  preferredRole?: string;
  minConfidence?: number;
  maxLoad?: number;
  excludeAgents?: string[];
  preferredAgents?: string[];
  sortBy?: 'confidence' | 'load' | 'success_rate' | 'last_active';
}

// =====================================================
// ESCALATION CHAIN TYPES
// =====================================================

export interface EscalationChain {
  chainId: string;
  startAgent: string;
  currentAgent: string;
  targetAgent?: string;
  steps: EscalationChainStep[];
  status: 'active' | 'completed' | 'failed' | 'aborted';
  totalSteps: number;
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface EscalationChainStep {
  stepNumber: number;
  fromAgent: string;
  toAgent: string;
  method: HandoffMethod;
  reason: EscalationReason;
  outcome: EscalationOutcome;
  timestamp: Date;
  duration: number;
}

// =====================================================
// RETRY & TIMEOUT TYPES
// =====================================================

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableOutcomes: EscalationOutcome[];
}

export interface TimeoutConfig {
  escalationTimeout: number;
  handoffTimeout: number;
  agentResponseTimeout: number;
  fallbackTimeout: number;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Enums
  EscalationType,
  EscalationReason,
  EscalationOutcome,
  HandoffMethod,
  EscalationPathType,
  FallbackStrategy,
};
