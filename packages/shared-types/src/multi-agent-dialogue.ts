// =====================================================
// MULTI-AGENT DIALOGUE TYPES
// Sprint 50 Phase 4.6
// =====================================================
//
// Purpose: Enable structured multi-agent conversations with turn-taking
// Provides: Dialogue management, turn coordination, role-based protocols
//

// =====================================================
// ENUMS
// =====================================================

export enum TurnType {
  STATEMENT = 'statement',
  QUESTION = 'question',
  RESPONSE = 'response',
  PROPOSAL = 'proposal',
  OBJECTION = 'objection',
  AGREEMENT = 'agreement',
  SUMMARY = 'summary',
  CLARIFICATION = 'clarification',
}

export enum AgentRoleType {
  FACILITATOR = 'facilitator',      // Manages discussion flow
  CONTRIBUTOR = 'contributor',      // Equal participant
  EXPERT = 'expert',                // Subject matter expert
  REVIEWER = 'reviewer',            // Provides feedback/review
  OBSERVER = 'observer',            // Read-only participant
  DECISION_MAKER = 'decision_maker', // Final authority
}

export enum TurnTakingStrategy {
  ROUND_ROBIN = 'round_robin',          // Sequential turns
  ROLE_PRIORITY = 'role_priority',      // Based on role hierarchy
  CONFIDENCE_WEIGHTED = 'confidence_weighted', // Higher confidence speaks more
  AGENT_INITIATED = 'agent_initiated',  // Agents request turn
  FACILITATOR_DIRECTED = 'facilitator_directed', // Facilitator assigns turns
}

export enum DialogueStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  INTERRUPTED = 'interrupted',
  EXPIRED = 'expired',
}

export enum DialogueOutcome {
  CONSENSUS = 'consensus',
  DECISION = 'decision',
  NO_RESOLUTION = 'no_resolution',
  TIMEOUT = 'timeout',
  INTERRUPTED = 'interrupted',
}

export enum InterruptionReason {
  USER_REQUEST = 'user_request',
  AGENT_CONFUSION = 'agent_confusion',
  CONTRADICTION_DETECTED = 'contradiction_detected',
  LOW_CONFIDENCE = 'low_confidence',
  ESCALATION_NEEDED = 'escalation_needed',
  TIME_LIMIT_REACHED = 'time_limit_reached',
  ERROR_OCCURRED = 'error_occurred',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Multi-agent conversation session
 */
export interface MultiAgentConversationSession {
  id: string;
  participants: AgentParticipant[];
  context: DialogueContext;
  strategy: TurnTakingStrategy;
  status: DialogueStatus;
  outcome?: DialogueOutcome;
  currentSpeaker?: string; // agentId
  turnOrder: string[]; // Array of agentIds
  metadata: {
    startedAt: Date;
    completedAt?: Date;
    totalTurns: number;
    maxTurns?: number;
    timeLimit?: number; // seconds
  };
  sharedState: Record<string, any>; // Shared context/data
  createdBy?: string;
  organizationId?: string;
}

export interface AgentParticipant {
  agentId: string;
  role: AgentRoleType;
  permissions: {
    canSpeak: boolean;
    canInterrupt: boolean;
    canPropose: boolean;
    canVeto: boolean;
  };
  objective?: string;
  priority: number; // 1-10, higher = more priority
  turnsTaken: number;
}

export interface DialogueContext {
  topic: string;
  goal?: string;
  constraints?: string[];
  backgroundInfo?: Record<string, any>;
  relatedConversationIds?: string[];
}

/**
 * Single turn in a dialogue
 */
export interface DialogueTurn {
  id: string;
  sessionId: string;
  agentId: string;
  turnNumber: number;
  turnType: TurnType;
  input: string;
  output: string;
  confidence?: number;
  metadata: {
    timestamp: Date;
    processingTime?: number; // milliseconds
    tokensUsed?: number;
    referencedTurns?: string[]; // IDs of previous turns referenced
  };
  nextSpeaker?: string; // Suggested next speaker
  actions?: TurnAction[];
}

export interface TurnAction {
  type: 'propose' | 'agree' | 'disagree' | 'clarify' | 'summarize' | 'defer' | 'escalate';
  target?: string; // agentId or turn reference
  details?: string;
}

/**
 * Result of taking a turn
 */
export interface DialogueTurnResult {
  turn: DialogueTurn;
  nextSpeaker: string | null;
  shouldContinue: boolean;
  reasoning?: string;
  suggestedActions?: string[];
}

/**
 * Dialogue interruption event
 */
export interface DialogueInterruptionEvent {
  id: string;
  sessionId: string;
  agentId?: string; // Who triggered interruption
  reason: InterruptionReason;
  details: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: {
    action: 'resume' | 'terminate' | 'redirect';
    newSpeaker?: string;
    notes?: string;
    resolvedAt?: Date;
  };
}

/**
 * Transcript with full metadata
 */
export interface TranscriptWithMetadata {
  session: MultiAgentConversationSession;
  turns: DialogueTurn[];
  interruptions: DialogueInterruptionEvent[];
  summary?: {
    totalTurns: number;
    participants: {
      agentId: string;
      role: AgentRoleType;
      turnCount: number;
      avgConfidence?: number;
    }[];
    outcome?: DialogueOutcome;
    keyDecisions?: string[];
    actionItems?: string[];
  };
}

// =====================================================
// INPUT TYPES
// =====================================================

export interface InitializeDialogueInput {
  agentIds: string[];
  context: DialogueContext;
  strategy?: TurnTakingStrategy;
  roles?: { [agentId: string]: AgentRoleType };
  objectives?: { [agentId: string]: string };
  priorities?: { [agentId: string]: number };
  maxTurns?: number;
  timeLimit?: number; // seconds
  createdBy?: string;
  organizationId?: string;
}

export interface TakeTurnInput {
  agentId: string;
  sessionId: string;
  input: string;
  turnType?: TurnType;
  referencedTurns?: string[];
  actions?: TurnAction[];
  confidence?: number;
}

export interface InterruptDialogueInput {
  sessionId: string;
  agentId?: string;
  reason: InterruptionReason;
  details: string;
}

export interface ResolveInterruptionInput {
  interruptionId: string;
  action: 'resume' | 'terminate' | 'redirect';
  newSpeaker?: string;
  notes?: string;
}

// =====================================================
// QUERY & FILTER TYPES
// =====================================================

export interface DialogueSessionQuery {
  organizationId?: string;
  status?: DialogueStatus;
  strategy?: TurnTakingStrategy;
  participantAgentId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface DialogueTurnQuery {
  sessionId: string;
  agentId?: string;
  turnType?: TurnType;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface DialogueAnalytics {
  sessionId: string;
  totalTurns: number;
  avgTurnDuration: number;
  participantStats: {
    agentId: string;
    role: AgentRoleType;
    turnCount: number;
    avgConfidence: number;
    turnTypes: Record<TurnType, number>;
  }[];
  turnDistribution: {
    agentId: string;
    percentage: number;
  }[];
  interruptionCount: number;
  outcome?: DialogueOutcome;
  duration: number; // seconds
}

export interface TurnPattern {
  pattern: string; // e.g., "Manager → Strategist → Analyst"
  frequency: number;
  avgOutcome: string;
  successful: boolean;
}

// =====================================================
// TURN-TAKING LOGIC TYPES
// =====================================================

export interface TurnAssignment {
  nextSpeaker: string; // agentId
  reasoning: string;
  confidence: number;
  alternatives?: string[]; // Other possible speakers
}

export interface SpeakerEligibility {
  agentId: string;
  eligible: boolean;
  score: number;
  reasons: string[];
}

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

export interface MultiAgentConversationRecord {
  id: string;
  participants: string[]; // Array of agentIds
  participant_roles: Record<string, AgentRoleType>;
  participant_priorities: Record<string, number>;
  context: DialogueContext;
  strategy: TurnTakingStrategy;
  status: DialogueStatus;
  outcome?: DialogueOutcome;
  current_speaker?: string;
  turn_order: string[];
  total_turns: number;
  max_turns?: number;
  time_limit?: number;
  shared_state: Record<string, any>;
  started_at: Date;
  completed_at?: Date;
  created_by?: string;
  organization_id?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiAgentTurnRecord {
  id: string;
  session_id: string;
  agent_id: string;
  turn_number: number;
  turn_type: TurnType;
  input: string;
  output: string;
  confidence?: number;
  next_speaker?: string;
  actions?: TurnAction[];
  referenced_turns?: string[];
  processing_time?: number;
  tokens_used?: number;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface DialogueInterruptionRecord {
  id: string;
  session_id: string;
  agent_id?: string;
  reason: InterruptionReason;
  details: string;
  resolved: boolean;
  resolution_action?: 'resume' | 'terminate' | 'redirect';
  new_speaker?: string;
  resolution_notes?: string;
  resolved_at?: Date;
  created_at: Date;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Enums
  TurnType,
  AgentRoleType,
  TurnTakingStrategy,
  DialogueStatus,
  DialogueOutcome,
  InterruptionReason,
};
