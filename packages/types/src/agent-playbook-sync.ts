// =====================================================
// AGENT PLAYBOOK SYNC & DRIFT DETECTION TYPES
// Sprint 53 Phase 4.9
// =====================================================

import { Playbook as CanonicalPlaybook } from './playbooks';

/**
 * Types of drift that can occur between agent behavior and playbook
 */
export enum DriftType {
  TONE_DRIFT = 'tone_drift',
  ESCALATION_BEHAVIOR = 'escalation_behavior',
  POLICY_ADHERENCE = 'policy_adherence',
  DECISION_MAKING = 'decision_making',
  KNOWLEDGE_GAP = 'knowledge_gap',
  PERSONALITY_SHIFT = 'personality_shift',
  OBJECTIVE_MISALIGNMENT = 'objective_misalignment',
  COMMUNICATION_STYLE = 'communication_style',
  PRIORITY_MISMATCH = 'priority_mismatch',
}

/**
 * Types of corrections that can be applied to fix drift
 */
export enum CorrectionType {
  MEMORY_UPDATE = 'memory_update',
  PERSONALITY_ADJUSTMENT = 'personality_adjustment',
  BEHAVIOR_MODIFIER = 'behavior_modifier',
  KNOWLEDGE_INJECTION = 'knowledge_injection',
  OBJECTIVE_REALIGNMENT = 'objective_realignment',
  RULESET_UPDATE = 'ruleset_update',
  ESCALATION_PATH_UPDATE = 'escalation_path_update',
  COMMUNICATION_TEMPLATE = 'communication_template',
}

/**
 * Status of a sync operation
 */
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Source of playbook mapping
 */
export enum PlaybookMappingSource {
  ORGANIZATION_PLAYBOOK = 'organization_playbook',
  TEAM_PLAYBOOK = 'team_playbook',
  ROLE_TEMPLATE = 'role_template',
  CUSTOM_CONFIG = 'custom_config',
  AI_GENERATED = 'ai_generated',
  MANUAL_OVERRIDE = 'manual_override',
}

/**
 * Severity of detected drift
 */
export enum DriftSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NEGLIGIBLE = 'negligible',
}

/**
 * Individual drift item detected
 */
export interface DriftItem {
  driftId: string;
  type: DriftType;
  severity: DriftSeverity;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  detectedAt: Date;
  confidence: number;
  evidence: {
    recentMessages?: string[];
    recentDecisions?: string[];
    behaviorPatterns?: string[];
    policyViolations?: string[];
  };
  suggestedCorrection?: {
    type: CorrectionType;
    description: string;
    priority: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Report of all drift detected for an agent
 */
export interface DriftReport {
  agentId: string;
  playbookId?: string;
  totalDriftItems: number;
  overallSeverity: DriftSeverity;
  driftItems: DriftItem[];
  summary: string;
  recommendedActions: string[];
  detectedAt: Date;
  context?: {
    taskId?: string;
    conversationId?: string;
    organizationId?: string;
    timeRange?: {
      start: Date;
      end: Date;
    };
  };
}

/**
 * Result of a playbook sync operation
 */
export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  agentId: string;
  playbookId: string;
  syncedAt: Date;
  mappings: PlaybookMapping[];
  appliedChanges: AppliedChange[];
  failedMappings?: FailedMapping[];
  summary: string;
  confidence: number;
  metadata?: {
    source: PlaybookMappingSource;
    processingTime: number;
    rulesApplied: number;
    knowledgeInjected: number;
    behaviorsUpdated: number;
  };
}

/**
 * Mapping between playbook rule and agent configuration
 */
export interface PlaybookMapping {
  mappingId: string;
  playbookRuleId: string;
  ruleName: string;
  ruleType: string;
  targetProperty: string;
  targetValue: any;
  previousValue?: any;
  source: PlaybookMappingSource;
  appliedAt: Date;
  confidence: number;
}

/**
 * Change applied during sync
 */
export interface AppliedChange {
  changeId: string;
  changeType: CorrectionType;
  description: string;
  targetProperty: string;
  oldValue?: any;
  newValue: any;
  impact: 'high' | 'medium' | 'low';
  appliedAt: Date;
}

/**
 * Failed mapping during sync
 */
export interface FailedMapping {
  playbookRuleId: string;
  ruleName: string;
  reason: string;
  error?: string;
  attemptedAt: Date;
}

/**
 * Summary of sync operations for an agent
 */
export interface SyncSummary {
  agentId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncAt?: Date;
  averageConfidence: number;
  commonFailures: {
    reason: string;
    count: number;
  }[];
  syncHistory: {
    syncId: string;
    playbookId: string;
    status: SyncStatus;
    syncedAt: Date;
    changesApplied: number;
  }[];
}

/**
 * Alignment between agent behavior and playbook expectations
 */
export interface BehaviorAlignment {
  agentId: string;
  playbookId: string;
  overallAlignment: number; // 0-1 score
  dimensions: {
    dimension: string;
    expectedValue: any;
    actualValue: any;
    alignmentScore: number; // 0-1
    drift?: DriftType;
  }[];
  lastEvaluatedAt: Date;
  trends: {
    improving: boolean;
    changeRate: number;
    historicalAlignment: {
      timestamp: Date;
      score: number;
    }[];
  };
}

/**
 * Plan for correcting drift
 */
export interface CorrectionPlan {
  planId: string;
  agentId: string;
  driftItems: DriftItem[];
  corrections: PlannedCorrection[];
  executionOrder: string[]; // Array of correction IDs in order
  estimatedImpact: {
    severityReduction: DriftSeverity;
    alignmentImprovement: number;
    confidence: number;
  };
  createdAt: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

/**
 * Individual correction in a plan
 */
export interface PlannedCorrection {
  correctionId: string;
  type: CorrectionType;
  description: string;
  targetDrift: DriftType;
  action: {
    method: string;
    parameters: Record<string, any>;
  };
  dependencies?: string[]; // IDs of corrections that must execute first
  priority: number;
  estimatedDuration?: number; // in milliseconds
}

/**
 * Result of applying drift corrections
 */
export interface CorrectionResult {
  success: boolean;
  agentId: string;
  correctionsApplied: number;
  correctionsFailed: number;
  appliedCorrections: {
    correctionId: string;
    type: CorrectionType;
    success: boolean;
    error?: string;
    appliedAt: Date;
  }[];
  beforeAlignment: number;
  afterAlignment: number;
  alignmentImprovement: number;
  summary: string;
  metadata?: {
    processingTime: number;
    memoryUpdates: number;
    personalityAdjustments: number;
    behaviorModifiers: number;
  };
}

/**
 * Drift detection configuration
 */
export interface DriftDetectionConfig {
  enabled: boolean;
  checkInterval?: number; // in minutes
  severityThreshold?: DriftSeverity;
  autoCorrect?: boolean;
  notifyOnDrift?: boolean;
  excludeDriftTypes?: DriftType[];
  customRules?: {
    ruleId: string;
    condition: string;
    action: string;
  }[];
}

// Playbook imported from './playbooks' as CanonicalPlaybook
// Note: Using simplified sync-specific interface below for backwards compatibility

/**
 * Simplified playbook for sync operations
 */
export interface PlaybookSyncInfo {
  playbookId: string;
  name: string;
  description: string;
  version: string;
  organizationId: string;
  rules: PlaybookRule[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Individual playbook rule
 */
export interface PlaybookRule {
  ruleId: string;
  name: string;
  description: string;
  category: string;
  ruleType: 'tone' | 'escalation' | 'policy' | 'decision' | 'knowledge' | 'behavior';
  definition: {
    property: string;
    operator: string;
    value: any;
    conditions?: Record<string, any>;
  };
  priority: number;
  isRequired: boolean;
  metadata?: Record<string, any>;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for syncing agent with playbook
 */
export interface SyncAgentWithPlaybookInput {
  agentId: string;
  playbookId: string;
  organizationId: string;
  options?: {
    forceSync?: boolean; // Override existing mappings
    dryRun?: boolean; // Preview changes without applying
    selectiveSync?: string[]; // Only sync specific rule IDs
    preserveCustomizations?: boolean; // Keep manual overrides
  };
  context?: {
    taskId?: string;
    conversationId?: string;
    userId?: string;
  };
}

/**
 * Input for detecting drift
 */
export interface DetectDriftInput {
  agentId: string;
  playbookId?: string;
  organizationId: string;
  options?: {
    severityThreshold?: DriftSeverity;
    excludeDriftTypes?: DriftType[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    includeEvidence?: boolean;
  };
  context?: {
    taskId?: string;
    conversationId?: string;
  };
}

/**
 * Input for auto-correcting drift
 */
export interface AutoCorrectDriftInput {
  agentId: string;
  driftItems?: DriftItem[]; // If not provided, will detect first
  playbookId?: string;
  organizationId: string;
  options?: {
    autoApply?: boolean; // Apply corrections immediately
    severityThreshold?: DriftSeverity; // Only correct above this severity
    maxCorrections?: number; // Limit number of corrections
    dryRun?: boolean; // Preview corrections without applying
  };
  context?: {
    taskId?: string;
    conversationId?: string;
    userId?: string;
  };
}

/**
 * Input for querying sync logs
 */
export interface SyncLogQuery {
  agentId?: string;
  playbookId?: string;
  organizationId?: string;
  status?: SyncStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Input for querying drift logs
 */
export interface DriftLogQuery {
  agentId?: string;
  playbookId?: string;
  organizationId?: string;
  driftType?: DriftType;
  severity?: DriftSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Drift metrics
 */
export interface DriftMetrics {
  agentId?: string;
  organizationId?: string;
  totalDriftDetections: number;
  driftByType: {
    type: DriftType;
    count: number;
    averageSeverity: DriftSeverity;
  }[];
  driftBySeverity: {
    severity: DriftSeverity;
    count: number;
  }[];
  correctionStats: {
    totalCorrections: number;
    successfulCorrections: number;
    failedCorrections: number;
    averageImpact: number;
  };
  trends: {
    period: string;
    driftCount: number;
    averageSeverity: DriftSeverity;
  }[];
}

/**
 * Sync metrics
 */
export interface SyncMetrics {
  agentId?: string;
  organizationId?: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageConfidence: number;
  syncsByPlaybook: {
    playbookId: string;
    playbookName: string;
    syncCount: number;
    successRate: number;
  }[];
  trends: {
    period: string;
    syncCount: number;
    successRate: number;
  }[];
}
