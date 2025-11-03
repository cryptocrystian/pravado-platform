// =====================================================
// AGENT SELF-EVALUATION TYPES
// Sprint 49 Phase 4.5
// =====================================================
//
// Purpose: Meta-cognitive capabilities for agent self-evaluation
// Provides: Confidence assessment, contradiction detection, self-improvement
//

// =====================================================
// ENUMS
// =====================================================

export enum EvalType {
  CONFIDENCE = 'confidence',
  CONTRADICTION = 'contradiction',
  IMPROVEMENT = 'improvement',
  PATTERN_ANALYSIS = 'pattern_analysis',
}

export enum NextStepAction {
  PROCEED = 'proceed',
  RETRY = 'retry',
  ESCALATE = 'escalate',
  COLLABORATE = 'collaborate',
  SEEK_CLARIFICATION = 'seek_clarification',
  CONSULT_MEMORY = 'consult_memory',
}

export enum ConfidenceLevel {
  VERY_LOW = 'very_low',      // < 0.3
  LOW = 'low',                // 0.3 - 0.5
  MEDIUM = 'medium',          // 0.5 - 0.7
  HIGH = 'high',              // 0.7 - 0.85
  VERY_HIGH = 'very_high',    // > 0.85
}

export enum ImprovementCategory {
  TONE = 'tone',
  ACCURACY = 'accuracy',
  DECISION_MAKING = 'decision_making',
  MEMORY_RECALL = 'memory_recall',
  COLLABORATION = 'collaboration',
  CLARIFICATION = 'clarification',
  KNOWLEDGE_GAP = 'knowledge_gap',
  REASONING = 'reasoning',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  APPLIED = 'applied',
  REJECTED = 'rejected',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Confidence assessment for agent decisions
 */
export interface ConfidenceAssessment {
  confidenceScore: number; // 0.0 - 1.0
  confidenceLevel: ConfidenceLevel;
  reasonsForLowConfidence: string[];
  reasonsForHighConfidence: string[];
  suggestedNextStep: NextStepAction;
  dataPoints: {
    pastSuccessRate?: number;
    similarTaskHistory?: number;
    memoryRelevance?: number;
    contextCompleteness?: number;
  };
  analysis: string;
  timestamp: Date;
}

/**
 * Input for confidence evaluation
 */
export interface ConfidenceEvaluationInput {
  agentId: string;
  context: {
    task: string;
    userId?: string;
    conversationId?: string;
    playbookId?: string;
    currentStep?: string;
    additionalContext?: Record<string, any>;
  };
  priorHistory?: {
    recentTasks?: string[];
    recentOutcomes?: ('success' | 'failure' | 'partial')[];
  };
}

/**
 * Result of contradiction detection
 */
export interface ContradictionCheckResult {
  hasContradictions: boolean;
  conflictingStatements: ConflictingStatement[];
  memoryReferences: MemoryReference[];
  resolutionSuggestion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
}

export interface ConflictingStatement {
  statement1: string;
  statement2: string;
  source1: string; // e.g., "message_id:xyz", "memory_id:abc"
  source2: string;
  timestamp1: Date;
  timestamp2: Date;
  conflictType: 'factual' | 'logical' | 'temporal' | 'contextual';
  confidence: number; // How confident we are this is a contradiction
}

export interface MemoryReference {
  memoryId: string;
  content: string;
  relevance: number;
  timestamp: Date;
}

/**
 * Input for contradiction detection
 */
export interface ContradictionDetectionInput {
  agentId: string;
  context: {
    currentTask: string;
    recentMessages?: string[];
    conversationId?: string;
    lookbackDays?: number; // How far back to check
  };
}

/**
 * Self-improvement proposal
 */
export interface SelfImprovementPlan {
  id: string;
  agentId: string;
  category: ImprovementCategory;
  summary: string;
  issueDetected: string;
  recommendedAction: string;
  specificChanges: SpecificChange[];
  confidenceLevel: number; // 0.0 - 1.0
  relatedMemoryLinks: string[];
  relatedFeedbackIds: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: {
    expectedImprovement: string;
    affectedScenarios: string[];
  };
  status: SuggestionStatus;
  generatedAt: Date;
  appliedAt?: Date;
  rejectedAt?: Date;
  metadata?: {
    triggeringEvent?: string;
    analysisDepth?: number;
    basedOnPatterns?: string[];
  };
}

export interface SpecificChange {
  type: 'prompt_adjustment' | 'memory_update' | 'behavior_modifier' | 'clarification_rule' | 'escalation_trigger';
  target: string;
  currentApproach?: string;
  proposedApproach: string;
  rationale: string;
  confidence: number;
}

/**
 * Input for generating self-improvement proposal
 */
export interface SelfImprovementInput {
  agentId: string;
  taskOutcome: 'success' | 'failure' | 'partial';
  context: {
    task: string;
    what_happened: string;
    expected_result?: string;
    actual_result?: string;
    conversationId?: string;
    playbookId?: string;
  };
  includeHistory?: boolean;
}

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

/**
 * Agent self-evaluation log entry
 */
export interface AgentSelfEvalLog {
  id: string;
  agentId: string;
  evalType: EvalType;
  context: Record<string, any>;
  result: Record<string, any>; // Stores ConfidenceAssessment or ContradictionCheckResult
  confidenceScore?: number;
  suggestedAction?: NextStepAction;
  playbookExecutionId?: string;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Self-improvement suggestion record
 */
export interface SelfImprovementSuggestion {
  id: string;
  agentId: string;
  category: ImprovementCategory;
  summary: string;
  issueDetected: string;
  recommendedAction: string;
  specificChanges: SpecificChange[];
  confidenceLevel: number;
  relatedMemoryLinks: string[];
  relatedFeedbackIds: string[];
  relatedEvalLogId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: SuggestionStatus;
  estimatedImpact: Record<string, any>;
  generatedAt: Date;
  appliedAt?: Date;
  rejectedAt?: Date;
  reviewedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// QUERY & FILTER TYPES
// =====================================================

export interface SelfEvalLogQuery {
  agentId: string;
  evalType?: EvalType;
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  maxConfidence?: number;
  suggestedAction?: NextStepAction;
  limit?: number;
  offset?: number;
}

export interface SelfImprovementSuggestionQuery {
  agentId: string;
  category?: ImprovementCategory;
  status?: SuggestionStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface SelfEvalMetrics {
  agentId: string;
  totalEvaluations: number;
  avgConfidenceScore: number;
  evaluationsByType: Record<EvalType, number>;
  actionSuggestions: Record<NextStepAction, number>;
  contradictionsDetected: number;
  improvementSuggestionsGenerated: number;
  improvementSuggestionsApplied: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ContradictionTrend {
  date: string;
  count: number;
  severity: Record<'low' | 'medium' | 'high' | 'critical', number>;
}

export interface ConfidenceTrend {
  date: string;
  avgConfidence: number;
  evaluationCount: number;
}

// =====================================================
// PATTERN ANALYSIS TYPES
// =====================================================

export interface FailurePattern {
  pattern: string;
  frequency: number;
  examples: string[];
  suggestedFixes: string[];
  relatedCategory: ImprovementCategory;
}

export interface DecisionPattern {
  decisionType: string;
  successRate: number;
  avgConfidence: number;
  totalOccurrences: number;
  commonContext: string[];
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Enums
  EvalType,
  NextStepAction,
  ConfidenceLevel,
  ImprovementCategory,
  SuggestionStatus,
};
