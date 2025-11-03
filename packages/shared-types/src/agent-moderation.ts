// =====================================================
// AGENT MODERATION TYPES
// Sprint 51 Phase 4.7
// =====================================================
//
// Purpose: Safety and moderation layer for agent outputs
// Provides: Content moderation, policy enforcement, safety guardrails
//

// =====================================================
// ENUMS
// =====================================================

export enum ModerationCategory {
  POLICY_VIOLATION = 'policy_violation',
  BRAND_MISMATCH = 'brand_mismatch',
  TONE_VIOLATION = 'tone_violation',
  HALLUCINATION = 'hallucination',
  SENSITIVE_TOPIC = 'sensitive_topic',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  OFFENSIVE_LANGUAGE = 'offensive_language',
  BIAS_DETECTED = 'bias_detected',
  FACTUAL_ERROR = 'factual_error',
  PRIVACY_CONCERN = 'privacy_concern',
}

export enum ModerationAction {
  ALLOW = 'allow',
  REWRITE = 'rewrite',
  WARN = 'warn',
  ESCALATE = 'escalate',
  BLOCK = 'block',
}

export enum ModerationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RuleType {
  REGEX = 'regex',
  KEYWORD = 'keyword',
  SENTIMENT = 'sentiment',
  LENGTH = 'length',
  TONE = 'tone',
  CUSTOM = 'custom',
}

export enum ModerationSource {
  AI_ANALYSIS = 'ai_analysis',
  STATIC_RULES = 'static_rules',
  HYBRID = 'hybrid',
  MANUAL_REVIEW = 'manual_review',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Result of content moderation
 */
export interface ModerationResult {
  flagged: boolean;
  action: ModerationAction;
  categories: ModerationCategory[];
  severity: ModerationSeverity;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  suggestedRewrite?: string;
  flags: ModerationFlag[];
  metadata: {
    source: ModerationSource;
    processingTime: number;
    modelUsed?: string;
    rulesApplied?: string[];
  };
  timestamp: Date;
}

export interface ModerationFlag {
  category: ModerationCategory;
  severity: ModerationSeverity;
  confidence: number;
  location?: {
    start: number;
    end: number;
    text: string;
  };
  reason: string;
  suggestedFix?: string;
}

/**
 * Input for moderation
 */
export interface ModerateAgentOutputInput {
  agentId: string;
  message: string;
  context?: {
    task?: string;
    userId?: string;
    conversationId?: string;
    previousMessages?: string[];
    organizationId?: string;
  };
  rulesetId?: string;
  options?: {
    strictMode?: boolean;
    autoRewrite?: boolean;
    skipCategories?: ModerationCategory[];
  };
}

/**
 * Moderation rule definition
 */
export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  category: ModerationCategory;
  severity: ModerationSeverity;
  enabled: boolean;
  config: {
    pattern?: string; // Regex pattern
    keywords?: string[];
    threshold?: number;
    customLogic?: string;
  };
  action: ModerationAction;
  priority: number; // 1-10, higher = more priority
  organizationId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Moderation ruleset (collection of rules)
 */
export interface ModerationRuleset {
  id: string;
  name: string;
  description: string;
  rules: string[]; // Array of rule IDs
  organizationId?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of applying moderation rules
 */
export interface ModerationActionResult {
  originalMessage: string;
  finalMessage: string;
  action: ModerationAction;
  wasModified: boolean;
  moderationResult: ModerationResult;
  appliedRules: {
    ruleId: string;
    ruleName: string;
    matched: boolean;
    action: ModerationAction;
  }[];
}

/**
 * Input for logging moderation event
 */
export interface LogModerationEventInput {
  agentId: string;
  message: string;
  result: ModerationResult;
  context?: Record<string, any>;
  actionTaken?: string;
  userId?: string;
  organizationId?: string;
}

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

export interface AgentModerationLog {
  id: string;
  agentId: string;
  message: string;
  flags: ModerationFlag[];
  categories: ModerationCategory[];
  severity: ModerationSeverity;
  action: ModerationAction;
  actionTaken?: string;
  confidence: number;
  reasoning: string;
  suggestedRewrite?: string;
  source: ModerationSource;
  context?: Record<string, any>;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ModerationRuleRecord {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  category: ModerationCategory;
  severity: ModerationSeverity;
  enabled: boolean;
  config: Record<string, any>;
  action: ModerationAction;
  priority: number;
  organization_id?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// QUERY & FILTER TYPES
// =====================================================

export interface ModerationHistoryQuery {
  agentId: string;
  categories?: ModerationCategory[];
  severity?: ModerationSeverity;
  action?: ModerationAction;
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

export interface ModerationRuleQuery {
  organizationId?: string;
  category?: ModerationCategory;
  type?: RuleType;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

export interface ModerationMetrics {
  agentId: string;
  totalModerations: number;
  flaggedCount: number;
  flaggedPercentage: number;
  actionDistribution: Record<ModerationAction, number>;
  categoryDistribution: Record<ModerationCategory, number>;
  severityDistribution: Record<ModerationSeverity, number>;
  avgConfidence: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ModerationTrend {
  date: string;
  totalModerations: number;
  flaggedCount: number;
  avgSeverity: number;
  topCategories: {
    category: ModerationCategory;
    count: number;
  }[];
}

export interface CategoryBreakdown {
  category: ModerationCategory;
  count: number;
  percentage: number;
  avgSeverity: ModerationSeverity;
  commonReasons: string[];
}

// =====================================================
// GUARDRAIL CONFIGURATION TYPES
// =====================================================

export interface GuardrailConfig {
  organizationId: string;
  brandGuidelines: {
    tone: string[]; // e.g., ["professional", "empathetic", "concise"]
    prohibitedWords: string[];
    prohibitedTopics: string[];
    requiredPhrases?: string[];
  };
  contentPolicies: {
    maxLength?: number;
    minLength?: number;
    allowedLanguages?: string[];
    sensitiveTopics: string[];
  };
  behavioralNorms: {
    respectfulness: number; // 0-1 threshold
    neutrality: number; // 0-1 threshold
    professionalism: number; // 0-1 threshold
  };
  autoModerationSettings: {
    enabled: boolean;
    autoRewrite: boolean;
    escalationThreshold: ModerationSeverity;
    blockThreshold: ModerationSeverity;
  };
}

// =====================================================
// AI MODERATION TYPES
// =====================================================

export interface AIModerationPrompt {
  systemPrompt: string;
  userPrompt: string;
  examples?: {
    input: string;
    output: string;
    category: ModerationCategory;
  }[];
}

export interface AIModerationResponse {
  flagged: boolean;
  categories: ModerationCategory[];
  severity: ModerationSeverity;
  confidence: number;
  reasoning: string;
  suggestedRewrite?: string;
  specificIssues: {
    category: ModerationCategory;
    location: string;
    explanation: string;
    severity: ModerationSeverity;
  }[];
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Enums
  ModerationCategory,
  ModerationAction,
  ModerationSeverity,
  RuleType,
  ModerationSource,
};
