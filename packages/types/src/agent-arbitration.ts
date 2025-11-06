// =====================================================
// AGENT ARBITRATION TYPES
// Sprint 52 Phase 4.8
// =====================================================
//
// Purpose: Agent arbitration engine & conflict resolution protocols
// Provides: Conflict detection, resolution strategies, consensus building
//

// =====================================================
// ENUMS
// =====================================================

export enum ArbitrationStrategy {
  MAJORITY_VOTE = 'majority_vote',
  CONFIDENCE_WEIGHTED = 'confidence_weighted',
  ESCALATE_TO_FACILITATOR = 'escalate_to_facilitator',
  DEFER_TO_EXPERT = 'defer_to_expert',
  GPT4_MODERATED = 'gpt4_moderated',
  CONSENSUS_BUILDING = 'consensus_building',
  ROUND_ROBIN_REVIEW = 'round_robin_review',
}

export enum ConflictType {
  REASONING_MISMATCH = 'reasoning_mismatch',
  TONE_DISAGREEMENT = 'tone_disagreement',
  ACTION_CONFLICT = 'action_conflict',
  ENTITY_EVALUATION = 'entity_evaluation',
  PRIORITY_CONFLICT = 'priority_conflict',
  DATA_INTERPRETATION = 'data_interpretation',
  STRATEGY_DISAGREEMENT = 'strategy_disagreement',
  FACTUAL_CONTRADICTION = 'factual_contradiction',
  ETHICAL_DISAGREEMENT = 'ethical_disagreement',
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ResolutionOutcomeType {
  CONSENSUS_REACHED = 'consensus_reached',
  MAJORITY_DECISION = 'majority_decision',
  EXPERT_OVERRIDE = 'expert_override',
  ESCALATED = 'escalated',
  COMPROMISE = 'compromise',
  DEFERRED = 'deferred',
  UNRESOLVED = 'unresolved',
}

export enum ConflictStatus {
  DETECTED = 'detected',
  UNDER_REVIEW = 'under_review',
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  EXPIRED = 'expired',
}

export enum ArbitratorRole {
  FACILITATOR = 'facilitator',
  EXPERT = 'expert',
  NEUTRAL_THIRD_PARTY = 'neutral_third_party',
  AI_MODERATOR = 'ai_moderator',
  HUMAN_REVIEWER = 'human_reviewer',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Input for detecting conflicts between agents
 */
export interface DetectConflictInput {
  agentIds: string[];
  context: {
    taskId?: string;
    conversationId?: string;
    turnIds?: string[];
    inputContext?: Record<string, any>;
    agentOutputs?: ArbitrationAgentOutput[];
  };
  options?: {
    severityThreshold?: ConflictSeverity;
    excludeConflictTypes?: ConflictType[];
    includeMinorDisagreements?: boolean;
  };
}

/**
 * Agent output for conflict detection
 */
export interface ArbitrationAgentOutput {
  agentId: string;
  output: string;
  confidence: number;
  reasoning?: string;
  proposedAction?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Detected conflict between agents
 */
export interface DetectedConflict {
  conflictId: string;
  type: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  involvedAgents: string[];
  conflictingAssertions: ConflictingAssertion[];
  suggestedStrategy?: ArbitrationStrategy;
  confidence: number;
  reasoning: string;
  metadata: {
    detectedAt: Date;
    detectionMethod: 'ai_analysis' | 'rule_based' | 'hybrid';
    contextHash?: string;
  };
}

/**
 * Conflicting assertion from an agent
 */
export interface ConflictingAssertion {
  agentId: string;
  position: string;
  supportingEvidence?: string[];
  confidence: number;
  location?: {
    start: number;
    end: number;
    text: string;
  };
}

/**
 * Conflict report with all detected conflicts
 */
export interface ConflictReport {
  taskId?: string;
  conversationId?: string;
  totalConflicts: number;
  conflicts: DetectedConflict[];
  overallSeverity: ConflictSeverity;
  recommendedAction: 'resolve_immediately' | 'review_later' | 'ignore' | 'escalate';
  metadata: {
    analyzedAt: Date;
    processingTime: number;
    agentsAnalyzed: number;
  };
}

/**
 * Input for resolving agent conflict
 */
export interface ResolveConflictInput {
  conflictId?: string;
  conflicts?: DetectedConflict[];
  strategy: ArbitrationStrategy;
  context: {
    agentTurns?: AgentTurn[];
    agentOutputs?: ArbitrationAgentOutput[];
    metrics?: AgentMetric[];
    taskId?: string;
    conversationId?: string;
  };
  options?: {
    requireUnanimous?: boolean;
    expertAgentId?: string;
    facilitatorAgentId?: string;
    maxRounds?: number;
    timeout?: number;
  };
}

/**
 * Agent turn for conflict resolution
 */
export interface AgentTurn {
  agentId: string;
  turnId: string;
  content: string;
  confidence: number;
  vote?: string;
  timestamp: Date;
}

/**
 * Agent metric for weighted resolution
 */
export interface AgentMetric {
  agentId: string;
  successRate: number;
  expertiseScore: number;
  reputationScore: number;
  pastConflictResolutions: number;
}

/**
 * Resolution outcome
 */
export interface ResolutionOutcome {
  success: boolean;
  outcomeType: ResolutionOutcomeType;
  strategy: ArbitrationStrategy;
  resolution: string;
  chosenAgent?: string;
  chosenPosition?: string;
  consensus?: {
    level: number; // 0.0 - 1.0
    agreements: number;
    disagreements: number;
  };
  votes?: {
    agentId: string;
    vote: string;
    weight: number;
  }[];
  arbitratorFeedback?: ArbitratorFeedback;
  metadata: {
    resolvedAt: Date;
    processingTime: number;
    roundsRequired: number;
    participatingAgents: number;
  };
  message: string;
}

/**
 * Arbitrator feedback on resolution
 */
export interface ArbitratorFeedback {
  arbitratorId: string;
  role: ArbitratorRole;
  feedback: string;
  confidence: number;
  reasoning: string;
  suggestedImprovements?: string[];
}

/**
 * Input for logging conflict resolution
 */
export interface LogConflictResolutionInput {
  conflictId?: string;
  agentIds: string[];
  conflictType: ConflictType;
  severity: ConflictSeverity;
  resolution: ResolutionOutcome;
  context?: Record<string, any>;
  taskId?: string;
  conversationId?: string;
  userId?: string;
  organizationId?: string;
}

/**
 * Resolution proposal during arbitration
 */
export interface ResolutionProposal {
  proposalId: string;
  proposedBy: string;
  proposal: string;
  rationale: string;
  supportingAgents: string[];
  opposingAgents: string[];
  confidence: number;
  votes?: {
    agentId: string;
    vote: 'support' | 'oppose' | 'abstain';
    reasoning?: string;
  }[];
}

/**
 * Conflict context for arbitration
 */
export interface ConflictContext {
  taskId?: string;
  conversationId?: string;
  turnIds?: string[];
  topic?: string;
  domain?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  stakeholders?: string[];
  deadline?: Date;
  metadata?: Record<string, any>;
}

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

export interface AgentConflictLog {
  id: string;
  conflictId: string;
  agentIds: string[];
  conflictType: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  conflictingAssertions: ConflictingAssertion[];
  suggestedStrategy?: ArbitrationStrategy;
  confidence: number;
  reasoning: string;
  taskId?: string;
  conversationId?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  userId?: string;
  organizationId?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface AgentResolutionOutcome {
  id: string;
  conflictId: string;
  outcomeType: ResolutionOutcomeType;
  strategy: ArbitrationStrategy;
  resolution: string;
  chosenAgent?: string;
  chosenPosition?: string;
  consensus?: Record<string, any>;
  votes?: Record<string, any>[];
  arbitratorFeedback?: Record<string, any>;
  processingTime: number;
  roundsRequired: number;
  participatingAgents: string[];
  taskId?: string;
  conversationId?: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ConflictLogRecord {
  id: string;
  conflict_id: string;
  agent_ids: string[];
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  conflicting_assertions: Record<string, any>[];
  suggested_strategy?: ArbitrationStrategy;
  confidence: number;
  reasoning: string;
  task_id?: string;
  conversation_id?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  user_id?: string;
  organization_id?: string;
  detected_at: Date;
  resolved_at?: Date;
  expires_at?: Date;
  created_at: Date;
}

export interface ResolutionOutcomeRecord {
  id: string;
  conflict_id: string;
  outcome_type: ResolutionOutcomeType;
  strategy: ArbitrationStrategy;
  resolution: string;
  chosen_agent?: string;
  chosen_position?: string;
  consensus?: Record<string, any>;
  votes?: Record<string, any>[];
  arbitrator_feedback?: Record<string, any>;
  processing_time: number;
  rounds_required: number;
  participating_agents: string[];
  task_id?: string;
  conversation_id?: string;
  user_id?: string;
  organization_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

// =====================================================
// QUERY & FILTER TYPES
// =====================================================

export interface ConflictHistoryQuery {
  agentId?: string;
  agentIds?: string[];
  conflictType?: ConflictType;
  severity?: ConflictSeverity;
  status?: ConflictStatus;
  startDate?: Date;
  endDate?: Date;
  taskId?: string;
  conversationId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

export interface ResolutionOutcomeQuery {
  agentId?: string;
  conflictId?: string;
  outcomeType?: ResolutionOutcomeType;
  strategy?: ArbitrationStrategy;
  startDate?: Date;
  endDate?: Date;
  taskId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface ConflictMetrics {
  agentId?: string;
  totalConflicts: number;
  resolvedConflicts: number;
  unresolvedConflicts: number;
  resolutionRate: number;
  conflictsByType: Record<ConflictType, number>;
  conflictsBySeverity: Record<ConflictSeverity, number>;
  outcomeDistribution: Record<ResolutionOutcomeType, number>;
  avgResolutionTime: number;
  avgRoundsRequired: number;
  mostFrequentConflictPairs: {
    agentPair: [string, string];
    count: number;
    topConflictTypes: ConflictType[];
  }[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ConflictTrend {
  date: string;
  totalConflicts: number;
  resolvedConflicts: number;
  unresolvedConflicts: number;
  avgSeverity: number;
  topConflictTypes: {
    type: ConflictType;
    count: number;
  }[];
  avgResolutionTime: number;
}

export interface ArbitrationStrategyPerformance {
  strategy: ArbitrationStrategy;
  totalUses: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResolutionTime: number;
  avgRoundsRequired: number;
  preferredForConflictTypes: ConflictType[];
}

export interface AgentConflictProfile {
  agentId: string;
  totalConflictsInvolved: number;
  conflictsInitiated: number;
  conflictsResolved: number;
  winRate: number; // Percentage of times agent's position was chosen
  expertiseAreas: {
    topic: string;
    conflictCount: number;
    winRate: number;
  }[];
  mostCommonOpponents: {
    agentId: string;
    conflictCount: number;
    conflictTypes: ConflictType[];
  }[];
  preferredStrategies: {
    strategy: ArbitrationStrategy;
    count: number;
    successRate: number;
  }[];
}

// =====================================================
// VOTING & CONSENSUS TYPES
// =====================================================

export interface VotingRound {
  roundNumber: number;
  proposals: ResolutionProposal[];
  votes: {
    agentId: string;
    proposalId: string;
    vote: 'support' | 'oppose' | 'abstain';
    weight: number;
    reasoning?: string;
  }[];
  outcome: 'consensus' | 'majority' | 'deadlock' | 'continue';
  consensusLevel: number; // 0.0 - 1.0
}

export interface ConsensusAnalysis {
  achieved: boolean;
  level: number; // 0.0 - 1.0
  agreements: number;
  disagreements: number;
  abstentions: number;
  strongSupport: number;
  weakSupport: number;
  opposition: number;
  keyStickingPoints: string[];
  possibleCompromises: string[];
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Enums
  ArbitrationStrategy,
  ConflictType,
  ConflictSeverity,
  ResolutionOutcomeType,
  ConflictStatus,
  ArbitratorRole,
};
