// =====================================================
// AGENT COLLABORATION & ESCALATION TYPES
// Sprint 43 Phase 3.5.2
// =====================================================

import { PlaybookAgentContext } from './agent-playbook';
import { CollaborationStats } from './collaboration';
import { EscalationResult as AgentEscalationResult } from './agent-escalation';

/**
 * Escalation request to transfer task to higher-permission agent
 */
export interface EscalationRequest {
  /** Agent initiating the escalation */
  agentId: string;

  /** Organization context */
  organizationId: string;

  /** Task context that needs escalation */
  taskContext: {
    /** Original user prompt or task description */
    prompt: string;

    /** Playbook being executed (if any) */
    playbookId?: string;

    /** Execution ID (if escalating from failed execution) */
    executionId?: string;

    /** Current step that failed or needs escalation */
    currentStep?: string;

    /** Input data for the task */
    input?: Record<string, any>;
  };

  /** Reason for escalation */
  failureReason?: 'low_confidence' | 'insufficient_permissions' | 'complexity' | 'policy_violation' | 'user_request' | 'other';

  /** Confidence score that triggered escalation */
  confidenceScore?: number;

  /** Specific target agent ID (optional - will use GPT if not provided) */
  targetAgentId?: string;

  /** Required capabilities for escalation target */
  requiredCapabilities?: string[];

  /** Whether to log the escalation */
  logEscalation?: boolean;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

// EscalationResult imported from './agent-escalation' as AgentEscalationResult
// Note: The comprehensive EscalationResult type is defined in agent-escalation.ts

/**
 * Delegation request to assign task to specialized agent
 */
export interface DelegationRequest {
  /** Agent delegating the task */
  delegatingAgentId: string;

  /** Organization context */
  organizationId: string;

  /** Task to delegate */
  task: {
    /** Task description */
    description: string;

    /** Task type (for matching to agent specialization) */
    type?: string;

    /** Input data */
    input?: Record<string, any>;

    /** Expected output schema */
    expectedOutput?: Record<string, any>;

    /** Timeout for delegated task */
    timeoutMs?: number;
  };

  /** Specific target agent (optional - will use GPT if not provided) */
  targetAgentId?: string;

  /** Delegation mode */
  mode: 'synchronous' | 'asynchronous';

  /** Whether to wait for completion (synchronous only) */
  waitForCompletion?: boolean;

  /** Callback URL for async completion notification */
  callbackUrl?: string;

  /** Whether to log the delegation */
  logDelegation?: boolean;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of delegation operation
 */
export interface DelegationResult {
  /** Whether delegation was successful */
  success: boolean;

  /** Delegated to agent */
  delegatedTo: {
    agentId: string;
    agentName?: string;
    specialization?: string;
  } | null;

  /** Task ID for tracking */
  taskId: string;

  /** Execution ID (if task started) */
  executionId?: string;

  /** Task output (if synchronous and completed) */
  output?: Record<string, any>;

  /** Task status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  /** Delegation log ID */
  delegationLogId?: string;

  /** Error message if delegation failed */
  errorMessage?: string;
}

/**
 * Collaboration request for multi-agent workflow coordination
 */
export interface CollaborationRequest {
  /** Agent initiating collaboration */
  initiatingAgentId: string;

  /** Organization context */
  organizationId: string;

  /** Workflow description */
  workflow: {
    /** Workflow name */
    name: string;

    /** Workflow description */
    description: string;

    /** Initial input */
    input?: Record<string, any>;

    /** Expected final output */
    expectedOutput?: Record<string, any>;
  };

  /** Agent roles needed for workflow */
  requiredRoles?: string[];

  /** Specific agents to include (optional) */
  participatingAgents?: Array<{
    agentId: string;
    role?: string;
    step?: number;
  }>;

  /** Whether to use GPT to construct agent chain */
  autoConstruct?: boolean;

  /** Whether to log collaboration */
  logCollaboration?: boolean;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of collaboration coordination
 */
export interface CollaborationResult {
  /** Whether coordination was successful */
  success: boolean;

  /** Collaboration ID for tracking */
  collaborationId: string;

  /** Agent chain constructed */
  agentChain: Array<{
    agentId: string;
    agentName?: string;
    role?: string;
    stepNumber: number;
    responsibility: string;
  }>;

  /** Playbook chain configuration (if using playbooks) */
  playbookChain?: Array<{
    playbookId: string;
    playbookName?: string;
    assignedTo: string;
  }>;

  /** Execution status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  /** Collaboration reasoning */
  reasoning: string;

  /** Final output (if completed) */
  output?: Record<string, any>;

  /** Collaboration log ID */
  collaborationLogId?: string;

  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Agent collaboration log entity
 */
export interface AgentCollaborationLog {
  /** Unique log ID */
  id: string;

  /** Type of collaboration */
  collaborationType: 'escalation' | 'delegation' | 'coordination';

  /** Initiating agent */
  initiatingAgentId: string;

  /** Target/receiving agent(s) */
  targetAgentIds: string[];

  /** Organization context */
  organizationId: string;

  /** Task context */
  taskContext: Record<string, any>;

  /** Reasoning for collaboration */
  reasoning: string;

  /** Confidence score */
  confidenceScore: number;

  /** Alternatives considered */
  alternativesConsidered: Array<{
    agentId: string;
    agentName?: string;
    reason: string;
    score?: number;
  }>;

  /** Resulting execution IDs */
  executionIds: string[];

  /** Collaboration status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  /** Final outcome */
  outcome?: Record<string, any>;

  /** Timestamp */
  createdAt: Date;

  /** Completion timestamp */
  completedAt?: Date;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Database entity for agent_collaboration_logs table
 */
export interface AgentCollaborationLogEntity {
  id: string;
  collaboration_type: 'escalation' | 'delegation' | 'coordination';
  initiating_agent_id: string;
  target_agent_ids: string[];
  organization_id: string;
  task_context: Record<string, any>;
  reasoning: string;
  confidence_score: number;
  alternatives_considered: Array<{
    agent_id: string;
    agent_name?: string;
    reason: string;
    score?: number;
  }>;
  execution_ids: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  outcome: Record<string, any> | null;
  created_at: Date;
  completed_at: Date | null;
  metadata: Record<string, any> | null;
}

/**
 * Agent role hierarchy
 */
export interface AgentRoleHierarchy {
  role: string;
  level: number;
  capabilities: string[];
  canEscalateTo: string[];
}

/**
 * Agent profile for collaboration
 */
export interface AgentProfile {
  agentId: string;
  agentName: string;
  role: string;
  roleLevel: number;
  capabilities: string[];
  specializations: string[];
  organizationId: string;
  isAvailable: boolean;
  currentLoad?: number;
  maxConcurrentTasks?: number;
}

/**
 * Request to find suitable agents
 */
export interface FindAgentRequest {
  organizationId: string;
  requiredCapabilities?: string[];
  requiredRole?: string;
  minRoleLevel?: number;
  specialization?: string;
  excludeAgentIds?: string[];
  maxResults?: number;
}

/**
 * Agent matching result
 */
export interface AgentMatch {
  agent: AgentProfile;
  matchScore: number;
  matchReason: string;
  capabilitiesMatch: number;
  roleMatch: boolean;
}


/**
 * Escalation policy configuration
 */
export interface EscalationPolicy {
  /** Policy ID */
  id: string;

  /** Organization ID */
  organizationId: string;

  /** Policy name */
  name: string;

  /** Triggers for automatic escalation */
  triggers: Array<{
    type: 'confidence_threshold' | 'failure_count' | 'timeout' | 'permission_denied';
    value: number;
    targetRole?: string;
  }>;

  /** Whether policy is active */
  isActive: boolean;
}

/**
 * Task handoff configuration
 */
export interface TaskHandoff {
  /** Source agent */
  fromAgentId: string;

  /** Target agent */
  toAgentId: string;

  /** Task context */
  taskContext: Record<string, any>;

  /** Input data */
  input: Record<string, any>;

  /** Handoff notes */
  notes?: string;

  /** Priority */
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  /** Due date */
  dueDate?: Date;
}
