// =====================================================
// AGENT PERSONALITY & BEHAVIOR MODELING TYPES
// Sprint 44 Phase 3.5.4
// =====================================================

/**
 * Agent personality configuration
 * Defines tone, style, and behavioral preferences
 */
export interface AgentPersona {
  /** Agent identifier */
  agentId: string;

  /** Organization context */
  organizationId: string;

  /** Communication tone */
  tone: PersonalityTone;

  /** Decision-making style */
  decisionStyle: DecisionStyle;

  /** Collaboration approach */
  collaborationStyle: CollaborationStyle;

  /** Memory orientation */
  memoryStyle: MemoryStyle;

  /** User interaction alignment */
  userAlignment: UserAlignment;

  /** Cognitive biases and tendencies */
  biases?: CognitiveBias[];

  /** Custom personality traits */
  customTraits?: Record<string, any>;

  /** Personality confidence score (0-1) */
  confidenceScore?: number;

  /** Metadata */
  metadata?: {
    generatedAt: Date;
    dataSourcesUsed: string[];
    analysisPeriodDays: number;
  };
}

/**
 * Communication tone options
 */
export type PersonalityTone =
  | 'formal'
  | 'casual'
  | 'witty'
  | 'assertive'
  | 'friendly'
  | 'professional'
  | 'empathetic'
  | 'direct'
  | 'diplomatic';

/**
 * Decision-making style
 */
export type DecisionStyle =
  | 'cautious'
  | 'confident'
  | 'exploratory'
  | 'analytical'
  | 'intuitive'
  | 'deliberate'
  | 'reactive';

/**
 * Collaboration style
 */
export type CollaborationStyle =
  | 'independent'
  | 'team-oriented'
  | 'hierarchical'
  | 'collaborative'
  | 'delegative'
  | 'consultative';

/**
 * Memory orientation
 */
export type MemoryStyle =
  | 'short-term'
  | 'long-term'
  | 'balanced'
  | 'detail-oriented'
  | 'summary-focused';

/**
 * User alignment style
 */
export type UserAlignment =
  | 'analytical'
  | 'empathetic'
  | 'persuasive'
  | 'instructional'
  | 'supportive'
  | 'challenging';

/**
 * Cognitive biases
 */
export interface CognitiveBias {
  /** Bias type */
  type: BiasType;

  /** Strength of bias (0-1) */
  strength: number;

  /** Description */
  description?: string;
}

/**
 * Types of cognitive biases
 */
export type BiasType =
  | 'optimism'
  | 'pessimism'
  | 'risk-aversion'
  | 'risk-seeking'
  | 'confirmation'
  | 'recency'
  | 'anchoring'
  | 'availability';

/**
 * Personality traits analytics
 */
export interface PersonaTraitsAnalytics {
  /** Agent identifier */
  agentId: string;

  /** Organization context */
  organizationId: string;

  /** Analysis time period */
  analysisPeriod: {
    start: Date;
    end: Date;
    days: number;
  };

  /** Tone usage frequency */
  toneUsage: {
    tone: PersonalityTone;
    frequency: number;
    percentage: number;
  }[];

  /** Collaboration patterns */
  collaborationPatterns: {
    escalationRate: number;
    delegationRate: number;
    independentTaskRate: number;
    avgCollaboratorsPerTask: number;
  };

  /** Decision-making metrics */
  decisionMetrics: {
    avgDecisionLatencyMs: number;
    decisionsWithHighConfidence: number;
    decisionsWithLowConfidence: number;
    exploratoryDecisions: number;
  };

  /** Behavioral trends */
  behavioralTrends: {
    trend: string;
    strength: number;
    examples: string[];
  }[];

  /** Detected biases */
  detectedBiases: CognitiveBias[];

  /** Communication style analysis */
  communicationAnalysis: {
    avgPromptLength: number;
    formalityScore: number; // 0-1
    empathyScore: number; // 0-1
    assertivenessScore: number; // 0-1
  };

  /** Task performance patterns */
  taskPatterns: {
    preferredTaskTypes: string[];
    avgSuccessRate: number;
    commonFailureReasons: string[];
  };
}

/**
 * Personality profile (database entity)
 */
export interface PersonalityProfile {
  /** Profile ID */
  id: string;

  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Personality configuration */
  persona: AgentPersona;

  /** Is this the active profile */
  isActive: boolean;

  /** Profile version */
  version: number;

  /** Analysis period used for generation */
  analysisPeriodDays: number;

  /** Confidence score for this profile */
  confidenceScore: number;

  /** Traits extracted */
  traits: Record<string, any>;

  /** Behavioral patterns */
  behavioralPatterns: Record<string, any>;

  /** Metadata */
  metadata?: Record<string, any>;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Request to generate agent persona
 */
export interface GeneratePersonaRequest {
  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Options for persona generation */
  options?: {
    /** Analysis period in days */
    analysisPeriodDays?: number;

    /** Include agent settings */
    includeSettings?: boolean;

    /** Include memory summaries */
    includeMemory?: boolean;

    /** Include collaboration logs */
    includeCollaborations?: boolean;

    /** Include playbook logs */
    includePlaybooks?: boolean;

    /** Force regeneration even if recent profile exists */
    forceRegenerate?: boolean;

    /** Save to database */
    saveProfile?: boolean;
  };
}

/**
 * Request to apply personality to prompt
 */
export interface ApplyPersonalityRequest {
  /** Base prompt */
  prompt: string;

  /** Agent persona */
  persona: AgentPersona;

  /** Options for application */
  options?: {
    /** Include tone modifiers */
    includeTone?: boolean;

    /** Include style guidance */
    includeStyle?: boolean;

    /** Include bias reminders */
    includeBiases?: boolean;

    /** Template type */
    templateType?: 'system' | 'user' | 'assistant';
  };
}

/**
 * Result of applying personality to prompt
 */
export interface ApplyPersonalityResult {
  /** Modified prompt */
  prompt: string;

  /** Original prompt */
  originalPrompt: string;

  /** Applied modifications */
  modifications: {
    tone?: string;
    style?: string;
    biases?: string[];
    customTraits?: string[];
  };

  /** Tokens added (estimated) */
  tokensAdded: number;

  /** Total tokens (estimated) */
  totalTokens: number;
}

/**
 * Request to get persona traits analytics
 */
export interface GetPersonaTraitsRequest {
  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Analysis period in days */
  analysisPeriodDays?: number;
}

/**
 * Personality dimension scores
 */
export interface PersonalityDimensions {
  /** Big Five personality dimensions */
  openness: number; // 0-1
  conscientiousness: number; // 0-1
  extraversion: number; // 0-1
  agreeableness: number; // 0-1
  neuroticism: number; // 0-1

  /** Additional dimensions */
  creativity: number; // 0-1
  analyticalThinking: number; // 0-1
  emotionalIntelligence: number; // 0-1
  riskTolerance: number; // 0-1
}

/**
 * Tone modifier templates
 */
export interface ToneModifier {
  /** Tone type */
  tone: PersonalityTone;

  /** System prompt fragment */
  systemPrompt: string;

  /** Example phrases */
  examplePhrases: string[];

  /** Guidelines */
  guidelines: string[];
}

/**
 * Style modifier templates
 */
export interface StyleModifier {
  /** Decision style */
  decisionStyle: DecisionStyle;

  /** Collaboration style */
  collaborationStyle: CollaborationStyle;

  /** Memory style */
  memoryStyle: MemoryStyle;

  /** User alignment */
  userAlignment: UserAlignment;

  /** System prompt fragment */
  systemPrompt: string;

  /** Behavioral guidelines */
  guidelines: string[];
}

/**
 * Personality evolution tracking
 */
export interface PersonalityEvolution {
  /** Agent ID */
  agentId: string;

  /** Time series of personality changes */
  timeline: {
    date: Date;
    persona: AgentPersona;
    confidenceScore: number;
  }[];

  /** Detected shifts */
  shifts: {
    date: Date;
    dimension: string;
    oldValue: any;
    newValue: any;
    reason?: string;
  }[];

  /** Stability score (0-1) */
  stabilityScore: number;
}

/**
 * Persona comparison
 */
export interface PersonaComparison {
  /** First agent */
  agentA: {
    agentId: string;
    persona: AgentPersona;
  };

  /** Second agent */
  agentB: {
    agentId: string;
    persona: AgentPersona;
  };

  /** Similarity score (0-1) */
  similarityScore: number;

  /** Differences */
  differences: {
    dimension: string;
    agentAValue: any;
    agentBValue: any;
    divergence: number;
  }[];

  /** Commonalities */
  commonalities: {
    dimension: string;
    value: any;
  }[];
}

/**
 * Personality template
 */
export interface PersonalityTemplate {
  /** Template ID */
  id: string;

  /** Template name */
  name: string;

  /** Description */
  description: string;

  /** Persona configuration */
  persona: Partial<AgentPersona>;

  /** Use cases */
  useCases: string[];

  /** Tags */
  tags: string[];
}

/**
 * A/B testing for personality variants
 */
export interface PersonalityABTest {
  /** Test ID */
  testId: string;

  /** Agent ID */
  agentId: string;

  /** Variant A */
  variantA: {
    name: string;
    persona: AgentPersona;
  };

  /** Variant B */
  variantB: {
    name: string;
    persona: AgentPersona;
  };

  /** Metrics being tracked */
  metrics: string[];

  /** Test results */
  results?: {
    variantA: Record<string, number>;
    variantB: Record<string, number>;
    winner?: 'A' | 'B' | 'tie';
  };

  /** Status */
  status: 'active' | 'completed' | 'paused';

  /** Start date */
  startDate: Date;

  /** End date */
  endDate?: Date;
}

/**
 * Database entity for agent_personality_profiles table
 */
export interface AgentPersonalityProfileEntity {
  id: string;
  agent_id: string;
  organization_id: string;
  tone: PersonalityTone;
  decision_style: DecisionStyle;
  collaboration_style: CollaborationStyle;
  memory_style: MemoryStyle;
  user_alignment: UserAlignment;
  biases: Record<string, any>[];
  custom_traits: Record<string, any> | null;
  confidence_score: number;
  is_active: boolean;
  version: number;
  analysis_period_days: number;
  traits: Record<string, any>;
  behavioral_patterns: Record<string, any>;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}
