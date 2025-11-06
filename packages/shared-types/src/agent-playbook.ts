// =====================================================
// AGENT PLAYBOOK ORCHESTRATION TYPES
// Sprint 43 Phase 3.5.1
// =====================================================

import {
  Playbook,
  PlaybookExecution,
  PlaybookStepResult,
} from './playbooks';

/**
 * Agent context for playbook selection
 * Includes all relevant information for the LLM to make intelligent playbook decisions
 */
export interface PlaybookAgentContext {
  /** Unique identifier for the agent */
  agentId: string;

  /** Organization context */
  organizationId: string;

  /** User's original prompt or request */
  userPrompt: string;

  /** Recent conversation history */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;

  /** Agent's memory/knowledge base excerpts */
  relevantMemories?: Array<{
    content: string;
    relevance: number;
    source: string;
  }>;

  /** Current task or goal */
  currentGoal?: string;

  /** Agent's permissions and capabilities */
  permissions?: string[];

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Configuration for chaining multiple playbooks
 */
export interface PlaybookChainConfig {
  /** Chain identifier */
  chainId?: string;

  /** List of playbooks to execute in sequence */
  playbooks: Array<{
    /** Playbook ID to execute */
    playbookId: string;

    /** Input mapping from previous playbook outputs */
    inputMapping?: Record<string, string>;

    /** Whether to continue chain if this playbook fails */
    continueOnFailure?: boolean;

    /** Custom timeout for this playbook in the chain */
    timeoutMs?: number;
  }>;

  /** Initial input for the first playbook */
  initialInput?: Record<string, any>;

  /** Agent context for decision logging */
  agentContext?: PlaybookAgentContext;

  /** Whether to log each step in the chain */
  logChainSteps?: boolean;
}

/**
 * Result from playbook execution or chain
 */
export interface ExecutionResult {
  /** Execution ID (or chain ID if multiple) */
  executionId: string;

  /** Selected playbook(s) */
  selectedPlaybooks: Array<{
    playbookId: string;
    playbookName: string;
    executionId: string;
  }>;

  /** Overall status */
  status: 'success' | 'failure' | 'partial' | 'pending';

  /** Final output from the last playbook */
  output?: Record<string, any>;

  /** Outputs from each playbook in a chain */
  chainOutputs?: Array<{
    playbookId: string;
    output: Record<string, any>;
    status: string;
  }>;

  /** Decision log ID (for tracking reasoning) */
  decisionLogId?: string;

  /** Error message if failed */
  errorMessage?: string;

  /** Execution start time */
  startedAt: Date;

  /** Execution end time */
  completedAt?: Date;

  /** Total duration in milliseconds */
  durationMs?: number;
}

/**
 * Playbook selection decision log
 * Records the LLM's reasoning for playbook selection
 */
export interface AgentPlaybookDecisionLog {
  /** Unique log ID */
  id: string;

  /** Agent that made the decision */
  agentId: string;

  /** Organization context */
  organizationId: string;

  /** User's original prompt */
  userPrompt: string;

  /** Full agent context provided to LLM */
  agentContext: PlaybookAgentContext;

  /** LLM's reasoning for playbook selection */
  reasoning: string;

  /** Selected playbook ID */
  selectedPlaybookId: string | null;

  /** Selected playbook name */
  selectedPlaybookName?: string;

  /** Alternative playbooks considered */
  alternativesConsidered: Array<{
    playbookId: string;
    playbookName: string;
    reason: string;
    score?: number;
  }>;

  /** Confidence score (0-1) */
  confidenceScore: number;

  /** Whether a suitable playbook was found */
  playbookFound: boolean;

  /** Resulting execution ID */
  executionId?: string;

  /** Decision timestamp */
  timestamp: Date;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Input for playbook selection
 */
export interface PlaybookSelectionRequest {
  /** Agent context */
  context: PlaybookAgentContext;

  /** Available playbooks to choose from (optional, otherwise fetches all) */
  availablePlaybooks?: Playbook[];

  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;

  /** Whether to log the decision */
  logDecision?: boolean;
}

/**
 * Response from playbook selection
 */
export interface PlaybookSelectionResponse {
  /** Selected playbook (null if none suitable) */
  playbook: Playbook | null;

  /** Reasoning for selection */
  reasoning: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Alternatives considered */
  alternatives: Array<{
    playbookId: string;
    playbookName: string;
    reason: string;
    score: number;
  }>;

  /** Decision log ID */
  decisionLogId?: string;
}

/**
 * Request to trigger a playbook for an agent
 */
export interface TriggerPlaybookRequest {
  /** Agent ID */
  agentId: string;

  /** User's prompt */
  userPrompt: string;

  /** Additional context */
  additionalContext?: Partial<PlaybookAgentContext>;

  /** Override playbook ID (skip selection) */
  playbookId?: string;

  /** Custom input for playbook */
  input?: Record<string, any>;

  /** Whether to log the decision */
  logDecision?: boolean;
}

/**
 * Database entity for agent_playbook_logs table
 */
export interface AgentPlaybookLogEntity {
  id: string;
  agent_id: string;
  organization_id: string;
  user_prompt: string;
  agent_context: Record<string, any>;
  reasoning: string;
  selected_playbook_id: string | null;
  selected_playbook_name: string | null;
  alternatives_considered: Array<{
    playbook_id: string;
    playbook_name: string;
    reason: string;
    score?: number;
  }>;
  confidence_score: number;
  playbook_found: boolean;
  execution_id: string | null;
  created_at: Date;
  metadata: Record<string, any> | null;
}

/**
 * Input/output mapping for playbook chaining
 */
export interface PlaybookIOMapping {
  /** Source expression (e.g., "$previous_output.userId" or "$input.email") */
  source: string;

  /** Target field in next playbook's input */
  target: string;

  /** Optional transformation function */
  transform?: 'toUpperCase' | 'toLowerCase' | 'parseInt' | 'parseFloat' | 'toString' | 'toJSON';

  /** Default value if source is undefined */
  defaultValue?: any;
}

/**
 * Statistics for playbook selection
 */
export interface PlaybookSelectionStats {
  /** Total decisions made */
  totalDecisions: number;

  /** Successful selections (playbook found) */
  successfulSelections: number;

  /** Failed selections (no suitable playbook) */
  failedSelections: number;

  /** Average confidence score */
  averageConfidence: number;

  /** Most frequently selected playbook */
  mostSelectedPlaybook?: {
    playbookId: string;
    playbookName: string;
    count: number;
  };

  /** Time range */
  periodStart: Date;
  periodEnd: Date;
}
