// =====================================================
// PERSONA INTELLIGENCE TYPES
// Sprint 31: Persona-based adaptive communication
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Tone archetypes for communication
 */
export enum ToneArchetype {
  ANALYTICAL = 'ANALYTICAL',     // Factual, data-oriented, logical
  WARM = 'WARM',                // Friendly, empathetic, relationship-focused
  ASSERTIVE = 'ASSERTIVE',       // Direct, confident, outcome-driven
  EXPRESSIVE = 'EXPRESSIVE',     // Enthusiastic, creative, energetic
  AMIABLE = 'AMIABLE',          // Supportive, patient, collaborative
}

/**
 * Voice modes (formality levels)
 */
export enum VoiceMode {
  FORMAL = 'FORMAL',                  // Professional, structured language
  CONVERSATIONAL = 'CONVERSATIONAL',  // Natural, friendly but professional
  CASUAL = 'CASUAL',                  // Informal, relaxed tone
}

/**
 * Confidence levels for persona assignment
 */
export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Assignment sources
 */
export enum AssignmentSource {
  INFERRED = 'INFERRED',     // System inferred from behavior
  MANUAL = 'MANUAL',         // Manually set by user
  ML_MODEL = 'ML_MODEL',     // Machine learning model prediction
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Persona Definition
 * Archetype definition with communication traits
 */
export interface PersonaDefinition {
  id: string;

  // Persona metadata
  name: string;
  description: string;

  // Default communication attributes
  defaultTone: ToneArchetype;
  defaultVoice: VoiceMode;

  // Behavioral characteristics
  characteristics: PersonaCharacteristics;

  // Communication guidelines
  doList: string[];   // Recommended approaches
  dontList: string[]; // Things to avoid

  // Example content
  examplePhrases: string[];

  // Status
  isSystemPersona: boolean;
  isActive: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Persona Characteristics
 */
export interface PersonaCharacteristics {
  traits: string[];
  [key: string]: any;
}

/**
 * Persona Strategy
 * Communication strategy for a persona
 */
export interface PersonaStrategy {
  id: string;

  // Link to persona
  personaId: string;

  // Strategy configuration
  recommendedTone: ToneArchetype;
  recommendedVoice: VoiceMode;

  // Strategic guidance
  strategyName: string;
  strategyNotes?: string;

  // Content guidelines
  contentStructure?: Record<string, any>;
  messagingFocus: string[];

  // Response patterns
  optimalEmailLength: 'concise' | 'moderate' | 'detailed';
  preferredCtaStyle: 'direct' | 'soft' | 'collaborative' | 'enthusiastic';

  // Use case specific
  useCaseTag?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Contact Persona
 * Persona assignment for a contact
 */
export interface ContactPersona {
  id: string;
  organizationId: string;

  // Contact reference
  contactId: string;

  // Persona assignment
  personaId: string;
  persona?: PersonaDefinition; // Populated when joined

  // Confidence metrics
  confidenceScore: number; // 0.0 to 1.0
  confidenceLevel: ConfidenceLevel;

  // Source of assignment
  assignmentSource: AssignmentSource;
  assignedBy?: string;

  // Supporting data
  inferenceSignals: Record<string, any>;
  behavioralStats: Record<string, any>;

  // Effectiveness tracking
  messagesSent: number;
  positiveResponses: number;
  negativeResponses: number;
  effectivenessScore?: number;

  // Status
  isVerified: boolean;
  lastUpdatedAt: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * User Voice Preference
 * Manual overrides for tone and voice
 */
export interface UserVoicePreference {
  id: string;
  organizationId: string;

  // Contact reference
  contactId: string;

  // Preference overrides
  preferredTone?: ToneArchetype;
  preferredVoice?: VoiceMode;

  // Context
  overrideReason?: string;
  appliesToCampaigns?: string[];

  // Set by
  setBy?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Persona Event Log
 * Audit trail of persona events
 */
export interface PersonaEventLog {
  id: string;
  organizationId: string;

  // Contact reference
  contactId: string;

  // Event details
  eventType: string;

  // Before/after state
  oldPersonaId?: string;
  newPersonaId?: string;
  oldConfidence?: number;
  newConfidence?: number;

  // Context
  triggerSource?: string;
  campaignId?: string;
  initiatedBy?: string;

  // Additional data
  reason?: string;
  metadata: Record<string, any>;

  // Timestamp
  createdAt: string;
}

/**
 * Adaptive Voice Strategy
 * Complete strategy recommendation for a contact
 */
export interface AdaptiveVoiceStrategy {
  // Persona info
  personaId: string;
  personaName: string;

  // Tone & voice
  tone: ToneArchetype;
  voice: VoiceMode;

  // Strategy notes
  strategyNotes?: string;
  messagingFocus?: string[];

  // Confidence
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  isVerified: boolean;

  // Override info
  overridden?: boolean;
  overrideReason?: string;

  // Effectiveness
  effectivenessScore?: number;
}

/**
 * Persona Profile
 * Complete persona profile for a contact (enriched)
 */
export interface PersonaProfile {
  contactId: string;
  contactName?: string;
  contactEmail?: string;

  // Persona assignment
  persona: PersonaDefinition;
  confidence: number;
  confidenceLevel: ConfidenceLevel;

  // Strategy
  adaptiveStrategy: AdaptiveVoiceStrategy;

  // Stats
  messagesSent: number;
  effectivenessScore?: number;

  // Override info
  hasOverride: boolean;
  overrideReason?: string;

  // Metadata
  lastUpdatedAt: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Create Persona Definition Input
 */
export interface CreatePersonaDefinitionInput {
  organizationId?: string;
  name: string;
  description: string;
  defaultTone: ToneArchetype;
  defaultVoice?: VoiceMode;
  characteristics: PersonaCharacteristics;
  doList: string[];
  dontList: string[];
  examplePhrases?: string[];
}

/**
 * Update Persona Definition Input
 */
export interface UpdatePersonaDefinitionInput {
  personaId: string;
  name?: string;
  description?: string;
  defaultTone?: ToneArchetype;
  defaultVoice?: VoiceMode;
  characteristics?: PersonaCharacteristics;
  doList?: string[];
  dontList?: string[];
  examplePhrases?: string[];
  isActive?: boolean;
}

/**
 * Infer Persona Input
 */
export interface InferPersonaInput {
  contactId: string;
  organizationId: string;
  forceRefresh?: boolean; // Re-infer even if exists
}

/**
 * Override Persona Input
 */
export interface OverridePersonaInput {
  contactId: string;
  organizationId: string;
  personaId: string;
  reason?: string;
  setBy?: string;
}

/**
 * Override Tone Input
 */
export interface OverrideToneInput {
  contactId: string;
  organizationId: string;
  preferredTone?: ToneArchetype;
  preferredVoice?: VoiceMode;
  reason?: string;
  appliesToCampaigns?: string[];
  setBy?: string;
}

/**
 * Update Persona from Engagement Input
 */
export interface UpdatePersonaFromEngagementInput {
  contactId: string;
  organizationId: string;
  interactionType: string;
  sentimentScore?: number;
  responsePositive?: boolean;
  campaignId?: string;
}

/**
 * Get Adaptive Strategy Input
 */
export interface GetAdaptiveStrategyInput {
  contactId: string;
  organizationId: string;
  useCaseTag?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Persona Inference Result
 */
export interface PersonaInferenceResult {
  contactId: string;
  persona: PersonaDefinition;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  inferenceSignals: Record<string, any>;
  assignmentSource: AssignmentSource;
}

/**
 * Persona Match Result
 */
export interface PersonaMatchResult {
  personaId: string;
  confidence: number;
  signals: Record<string, any>;
}

/**
 * Personas List Result
 */
export interface PersonasListResult {
  personas: PersonaDefinition[];
  total: number;
}

/**
 * Contact Personas Result
 */
export interface ContactPersonasResult {
  contactPersonas: ContactPersona[];
  total: number;
}

/**
 * Persona Event Log Result
 */
export interface PersonaEventLogResult {
  events: PersonaEventLog[];
  total: number;
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Get Persona Response
 */
export interface GetPersonaResponse {
  success: boolean;
  persona?: PersonaDefinition;
  error?: string;
}

/**
 * Get Personas Response
 */
export interface GetPersonasResponse {
  success: boolean;
  personas?: PersonaDefinition[];
  total?: number;
  error?: string;
}

/**
 * Get Contact Persona Response
 */
export interface GetContactPersonaResponse {
  success: boolean;
  profile?: PersonaProfile;
  error?: string;
}

/**
 * Infer Persona Response
 */
export interface InferPersonaResponse {
  success: boolean;
  result?: PersonaInferenceResult;
  error?: string;
}

/**
 * Override Persona Response
 */
export interface OverridePersonaResponse {
  success: boolean;
  profile?: PersonaProfile;
  message?: string;
  error?: string;
}

/**
 * Get Adaptive Strategy Response
 */
export interface GetAdaptiveStrategyResponse {
  success: boolean;
  strategy?: AdaptiveVoiceStrategy;
  error?: string;
}

/**
 * Update from Engagement Response
 */
export interface UpdateFromEngagementResponse {
  success: boolean;
  updated?: boolean;
  newConfidence?: number;
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Tone Archetype Configuration
 */
export interface ToneArchetypeConfig {
  tone: ToneArchetype;
  label: string;
  description: string;
  icon: string;
  color: string;
  characteristics: string[];
}

/**
 * Voice Mode Configuration
 */
export interface VoiceModeConfig {
  mode: VoiceMode;
  label: string;
  description: string;
  icon: string;
  examples: string[];
}

/**
 * Confidence Level Configuration
 */
export interface ConfidenceLevelConfig {
  level: ConfidenceLevel;
  label: string;
  color: string;
  minScore: number;
  maxScore: number;
}

// =====================================================
// CONSTANTS
// =====================================================

export const TONE_ARCHETYPE_CONFIGS: Record<ToneArchetype, ToneArchetypeConfig> = {
  [ToneArchetype.ANALYTICAL]: {
    tone: ToneArchetype.ANALYTICAL,
    label: 'Analytical',
    description: 'Factual, data-oriented, and logical',
    icon: 'bar-chart-2',
    color: '#3B82F6', // blue-500
    characteristics: ['Data-driven', 'Precise', 'Methodical', 'Evidence-based'],
  },
  [ToneArchetype.WARM]: {
    tone: ToneArchetype.WARM,
    label: 'Warm',
    description: 'Friendly, empathetic, and relationship-focused',
    icon: 'heart',
    color: '#F59E0B', // amber-500
    characteristics: ['Empathetic', 'Patient', 'Supportive', 'Personal'],
  },
  [ToneArchetype.ASSERTIVE]: {
    tone: ToneArchetype.ASSERTIVE,
    label: 'Assertive',
    description: 'Direct, confident, and outcome-driven',
    icon: 'zap',
    color: '#EF4444', // red-500
    characteristics: ['Direct', 'Confident', 'Results-focused', 'Efficient'],
  },
  [ToneArchetype.EXPRESSIVE]: {
    tone: ToneArchetype.EXPRESSIVE,
    label: 'Expressive',
    description: 'Enthusiastic, creative, and energetic',
    icon: 'star',
    color: '#8B5CF6', // purple-500
    characteristics: ['Enthusiastic', 'Creative', 'Dynamic', 'Visionary'],
  },
  [ToneArchetype.AMIABLE]: {
    tone: ToneArchetype.AMIABLE,
    label: 'Amiable',
    description: 'Supportive, patient, and collaborative',
    icon: 'users',
    color: '#10B981', // green-500
    characteristics: ['Collaborative', 'Patient', 'Harmonious', 'Team-oriented'],
  },
};

export const VOICE_MODE_CONFIGS: Record<VoiceMode, VoiceModeConfig> = {
  [VoiceMode.FORMAL]: {
    mode: VoiceMode.FORMAL,
    label: 'Formal',
    description: 'Professional, structured language',
    icon: 'briefcase',
    examples: ['Dear Mr. Smith,', 'I would like to propose...', 'Per our discussion...'],
  },
  [VoiceMode.CONVERSATIONAL]: {
    mode: VoiceMode.CONVERSATIONAL,
    label: 'Conversational',
    description: 'Natural, friendly but professional',
    icon: 'message-circle',
    examples: ['Hi John,', 'I wanted to reach out...', 'Let me know what you think...'],
  },
  [VoiceMode.CASUAL]: {
    mode: VoiceMode.CASUAL,
    label: 'Casual',
    description: 'Informal, relaxed tone',
    icon: 'smile',
    examples: ['Hey!', 'Quick question...', 'Catch you later!'],
  },
};

export const CONFIDENCE_LEVEL_CONFIGS: Record<ConfidenceLevel, ConfidenceLevelConfig> = {
  [ConfidenceLevel.VERY_HIGH]: {
    level: ConfidenceLevel.VERY_HIGH,
    label: 'Very High',
    color: '#10B981',
    minScore: 0.9,
    maxScore: 1.0,
  },
  [ConfidenceLevel.HIGH]: {
    level: ConfidenceLevel.HIGH,
    label: 'High Confidence',
    color: '#10B981', // green-500
    minScore: 0.8,
    maxScore: 1.0,
  },
  [ConfidenceLevel.MEDIUM]: {
    level: ConfidenceLevel.MEDIUM,
    label: 'Medium Confidence',
    color: '#F59E0B', // amber-500
    minScore: 0.5,
    maxScore: 0.79,
  },
  [ConfidenceLevel.LOW]: {
    level: ConfidenceLevel.LOW,
    label: 'Low Confidence',
    color: '#EF4444', // red-500
    minScore: 0.0,
    maxScore: 0.49,
  },
};

/**
 * Persona intelligence constants
 */
export const PERSONA_CONSTANTS = {
  MIN_CONFIDENCE: 0.1,
  MAX_CONFIDENCE: 1.0,
  DEFAULT_CONFIDENCE: 0.5,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  LOW_CONFIDENCE_THRESHOLD: 0.5,
  CONFIDENCE_INCREASE_POSITIVE: 0.05,
  CONFIDENCE_DECREASE_NEGATIVE: 0.1,
  MIN_INTERACTIONS_FOR_HIGH_CONFIDENCE: 5,
};

/**
 * Persona names for common reference
 */
export const PERSONA_NAMES = {
  ANALYTICAL: 'Analytical',
  WARM: 'Warm',
  ASSERTIVE: 'Assertive',
  EXPRESSIVE: 'Expressive',
  AMIABLE: 'Amiable',
} as const;
