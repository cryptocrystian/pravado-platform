// =====================================================
// PROMPT ENGINEERING TYPES
// Sprint 30: Advanced prompt engineering + modular blocks
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Prompt block types
 */
export enum BlockType {
  SYSTEM = 'SYSTEM',                 // System-level instructions
  INSTRUCTION = 'INSTRUCTION',       // Task-specific instructions
  MEMORY = 'MEMORY',                 // Memory/context from previous interactions
  CONTEXT = 'CONTEXT',               // Dynamic context injection
  STRATEGY = 'STRATEGY',             // Strategic guidance and constraints
  OUTPUT_FORMAT = 'OUTPUT_FORMAT',   // Output format specifications
  DEBUG = 'DEBUG',                   // Debug/troubleshooting instructions
}

/**
 * Prompt template use cases
 */
export enum UseCaseTag {
  PLANNING = 'PLANNING',             // Strategic planning agents
  EXECUTION = 'EXECUTION',           // Task execution agents
  HANDOFF = 'HANDOFF',               // Agent-to-agent handoff
  FOLLOWUP = 'FOLLOWUP',             // Follow-up and persistence
  MEMORY = 'MEMORY',                 // Memory formation and recall
  DEBUGGING = 'DEBUGGING',           // Debugging and error recovery
  CUSTOM = 'CUSTOM',                 // Custom use case
}

/**
 * AI model scopes
 */
export enum ModelScope {
  GPT_4 = 'GPT-4',                   // GPT-4 specific
  GPT_3_5 = 'GPT-3.5',               // GPT-3.5 specific
  CLAUDE_3 = 'CLAUDE-3',             // Claude 3 specific
  ALL = 'ALL',                       // All models
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Prompt Block
 * Modular building block for prompts
 */
export interface PromptBlock {
  id: string;
  organizationId: string;

  // Block metadata
  name: string;
  description?: string;
  blockType: BlockType;

  // Content
  content: string;

  // Model compatibility
  modelScope: ModelScope;

  // Versioning
  version: number;
  isActive: boolean;

  // Usage tracking
  usageCount: number;
  lastUsedAt?: string;

  // Template metadata
  tags: string[];
  category?: string;

  // Ownership
  createdBy?: string;
  isSystemBlock: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Prompt Template
 * Ordered collection of prompt blocks
 */
export interface PromptTemplate {
  id: string;
  organizationId: string;

  // Template metadata
  templateName: string;
  description?: string;
  useCaseTag: UseCaseTag;

  // Model compatibility
  modelScope: ModelScope;

  // Block composition
  blocks: string[]; // Ordered array of block IDs
  blockOrder?: number[]; // Explicit ordering

  // Configuration
  maxTokens?: number;
  temperature?: number;
  topP?: number;

  // Validation
  isValidated: boolean;
  validationNotes?: string;
  estimatedTokens?: number;

  // Usage tracking
  usageCount: number;
  lastUsedAt?: string;

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Ownership
  createdBy?: string;
  isSystemTemplate: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Assembled Prompt
 * Complete prompt ready for AI model
 */
export interface AssembledPrompt {
  templateId: string;
  templateName: string;
  prompt: string;
  blocks: PromptBlockSummary[];
  metadata: PromptMetadata;
  validation: PromptValidation;
}

/**
 * Prompt Block Summary
 * Lightweight block info for assembled prompts
 */
export interface PromptBlockSummary {
  id: string;
  name: string;
  blockType: BlockType;
  contentLength: number;
  estimatedTokens: number;
}

/**
 * Prompt Metadata
 * Information about assembled prompt
 */
export interface PromptMetadata {
  totalLength: number;
  totalBlocks: number;
  estimatedTokens: number;
  modelScope: ModelScope;
  useCaseTag: UseCaseTag;
  assembledAt: string;
}

/**
 * Prompt Validation
 * Validation results for prompt
 */
export interface PromptValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  score: number; // 0-100
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Create Prompt Block Input
 */
export interface CreatePromptBlockInput {
  organizationId: string;
  name: string;
  description?: string;
  blockType: BlockType;
  content: string;
  modelScope?: ModelScope;
  tags?: string[];
  category?: string;
  createdBy?: string;
}

/**
 * Update Prompt Block Input
 */
export interface UpdatePromptBlockInput {
  blockId: string;
  name?: string;
  description?: string;
  content?: string;
  modelScope?: ModelScope;
  tags?: string[];
  category?: string;
  isActive?: boolean;
}

/**
 * Create Prompt Template Input
 */
export interface CreatePromptTemplateInput {
  organizationId: string;
  templateName: string;
  description?: string;
  useCaseTag: UseCaseTag;
  modelScope?: ModelScope;
  blocks: string[]; // Block IDs
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  isDefault?: boolean;
  createdBy?: string;
}

/**
 * Update Prompt Template Input
 */
export interface UpdatePromptTemplateInput {
  templateId: string;
  templateName?: string;
  description?: string;
  useCaseTag?: UseCaseTag;
  blocks?: string[];
  blockOrder?: number[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Assemble Prompt Input
 */
export interface AssemblePromptInput {
  templateId: string;
  organizationId: string;
  contextInjection?: Record<string, any>; // Dynamic context to inject
  validateBeforeAssembly?: boolean;
}

/**
 * Inject Context Input
 */
export interface InjectContextInput {
  prompt: string;
  contextData: Record<string, any>;
  contextType: 'MEMORY' | 'GOALS' | 'CAMPAIGN' | 'CONTACT' | 'CUSTOM';
}

/**
 * Validate Prompt Input
 */
export interface ValidatePromptInput {
  prompt: string;
  maxTokens?: number;
  checkRepetition?: boolean;
  checkAmbiguity?: boolean;
  checkLength?: boolean;
}

/**
 * Improve Prompt Input
 */
export interface ImprovePromptInput {
  prompt: string;
  currentIssues?: string[];
  targetUseCase?: UseCaseTag;
  modelScope?: ModelScope;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Prompt Preview Result
 */
export interface PromptPreviewResult {
  templateId: string;
  templateName: string;
  assembledPrompt: string;
  blocks: PromptBlockSummary[];
  estimatedTokens: number;
  validation: PromptValidation;
  gptSummary?: string; // GPT-generated summary of what prompt does
}

/**
 * Prompt Improvement Result
 */
export interface PromptImprovementResult {
  originalPrompt: string;
  improvedPrompt?: string;
  suggestions: PromptSuggestion[];
  overallScore: number; // 0-100
  gptAnalysis: string;
}

/**
 * Prompt Suggestion
 */
export interface PromptSuggestion {
  type: 'CLARITY' | 'CONCISENESS' | 'SPECIFICITY' | 'STRUCTURE' | 'TONE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string;
  suggestion: string;
  example?: string;
}

/**
 * Prompt Blocks Result
 */
export interface PromptBlocksResult {
  blocks: PromptBlock[];
  total: number;
}

/**
 * Prompt Templates Result
 */
export interface PromptTemplatesResult {
  templates: PromptTemplate[];
  total: number;
}

/**
 * Token Estimation Result
 */
export interface TokenEstimationResult {
  text: string;
  characterCount: number;
  estimatedTokens: number;
  model: string;
  method: 'EXACT' | 'ESTIMATED';
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Create Block Response
 */
export interface CreateBlockResponse {
  success: boolean;
  block?: PromptBlock;
  error?: string;
}

/**
 * Get Blocks Response
 */
export interface GetBlocksResponse {
  success: boolean;
  blocks?: PromptBlock[];
  total?: number;
  error?: string;
}

/**
 * Create Template Response
 */
export interface CreateTemplateResponse {
  success: boolean;
  template?: PromptTemplate;
  error?: string;
}

/**
 * Get Templates Response
 */
export interface GetTemplatesResponse {
  success: boolean;
  templates?: PromptTemplate[];
  total?: number;
  error?: string;
}

/**
 * Assemble Prompt Response
 */
export interface AssemblePromptResponse {
  success: boolean;
  assembled?: AssembledPrompt;
  error?: string;
}

/**
 * Preview Prompt Response
 */
export interface PreviewPromptResponse {
  success: boolean;
  preview?: PromptPreviewResult;
  error?: string;
}

/**
 * Validate Prompt Response
 */
export interface ValidatePromptResponse {
  success: boolean;
  validation?: PromptValidation;
  error?: string;
}

/**
 * Improve Prompt Response
 */
export interface ImprovePromptResponse {
  success: boolean;
  improvement?: PromptImprovementResult;
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Block Type Configuration
 */
export interface BlockTypeConfig {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultContent?: string;
}

/**
 * Use Case Tag Configuration
 */
export interface UseCaseTagConfig {
  tag: UseCaseTag;
  label: string;
  description: string;
  icon: string;
  color: string;
  recommendedBlocks: BlockType[];
}

/**
 * Model Scope Configuration
 */
export interface ModelScopeConfig {
  scope: ModelScope;
  label: string;
  description: string;
  icon: string;
  maxTokens: number;
}

// =====================================================
// CONSTANTS
// =====================================================

export const BLOCK_TYPE_CONFIGS: Record<BlockType, BlockTypeConfig> = {
  [BlockType.SYSTEM]: {
    type: BlockType.SYSTEM,
    label: 'System',
    description: 'System-level role and behavior instructions',
    icon: 'settings',
    color: '#8B5CF6', // purple-500
    defaultContent: 'You are a helpful AI assistant...',
  },
  [BlockType.INSTRUCTION]: {
    type: BlockType.INSTRUCTION,
    label: 'Instruction',
    description: 'Task-specific instructions and requirements',
    icon: 'list',
    color: '#3B82F6', // blue-500
    defaultContent: 'Your task is to...',
  },
  [BlockType.MEMORY]: {
    type: BlockType.MEMORY,
    label: 'Memory',
    description: 'Context from previous interactions',
    icon: 'brain',
    color: '#F59E0B', // amber-500
    defaultContent: 'Previous context:\n...',
  },
  [BlockType.CONTEXT]: {
    type: BlockType.CONTEXT,
    label: 'Context',
    description: 'Dynamic context injection (goals, data, etc.)',
    icon: 'database',
    color: '#10B981', // green-500
    defaultContent: 'Relevant context:\n...',
  },
  [BlockType.STRATEGY]: {
    type: BlockType.STRATEGY,
    label: 'Strategy',
    description: 'Strategic guidance and constraints',
    icon: 'target',
    color: '#EF4444', // red-500
    defaultContent: 'Strategic considerations:\n...',
  },
  [BlockType.OUTPUT_FORMAT]: {
    type: BlockType.OUTPUT_FORMAT,
    label: 'Output Format',
    description: 'Output format specifications',
    icon: 'file-text',
    color: '#6366F1', // indigo-500
    defaultContent: 'Format your response as:\n...',
  },
  [BlockType.DEBUG]: {
    type: BlockType.DEBUG,
    label: 'Debug',
    description: 'Debug and troubleshooting instructions',
    icon: 'bug',
    color: '#EC4899', // pink-500
    defaultContent: 'Debug mode: Show your reasoning...',
  },
};

export const USE_CASE_TAG_CONFIGS: Record<UseCaseTag, UseCaseTagConfig> = {
  [UseCaseTag.PLANNING]: {
    tag: UseCaseTag.PLANNING,
    label: 'Planning',
    description: 'Strategic planning and decision making',
    icon: 'map',
    color: '#8B5CF6', // purple-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.STRATEGY, BlockType.CONTEXT, BlockType.OUTPUT_FORMAT],
  },
  [UseCaseTag.EXECUTION]: {
    tag: UseCaseTag.EXECUTION,
    label: 'Execution',
    description: 'Task execution and implementation',
    icon: 'play',
    color: '#3B82F6', // blue-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.INSTRUCTION, BlockType.CONTEXT, BlockType.OUTPUT_FORMAT],
  },
  [UseCaseTag.HANDOFF]: {
    tag: UseCaseTag.HANDOFF,
    label: 'Handoff',
    description: 'Agent-to-agent communication',
    icon: 'arrow-right',
    color: '#10B981', // green-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.MEMORY, BlockType.CONTEXT, BlockType.INSTRUCTION],
  },
  [UseCaseTag.FOLLOWUP]: {
    tag: UseCaseTag.FOLLOWUP,
    label: 'Follow-up',
    description: 'Follow-up and persistence',
    icon: 'repeat',
    color: '#F59E0B', // amber-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.MEMORY, BlockType.CONTEXT, BlockType.STRATEGY],
  },
  [UseCaseTag.MEMORY]: {
    tag: UseCaseTag.MEMORY,
    label: 'Memory',
    description: 'Memory formation and recall',
    icon: 'brain',
    color: '#EC4899', // pink-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.MEMORY, BlockType.INSTRUCTION, BlockType.OUTPUT_FORMAT],
  },
  [UseCaseTag.DEBUGGING]: {
    tag: UseCaseTag.DEBUGGING,
    label: 'Debugging',
    description: 'Debugging and error recovery',
    icon: 'bug',
    color: '#EF4444', // red-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.DEBUG, BlockType.CONTEXT, BlockType.OUTPUT_FORMAT],
  },
  [UseCaseTag.CUSTOM]: {
    tag: UseCaseTag.CUSTOM,
    label: 'Custom',
    description: 'Custom use case',
    icon: 'file-text',
    color: '#6B7280', // gray-500
    recommendedBlocks: [BlockType.SYSTEM, BlockType.INSTRUCTION],
  },
};

export const MODEL_SCOPE_CONFIGS: Record<ModelScope, ModelScopeConfig> = {
  [ModelScope.GPT_4]: {
    scope: ModelScope.GPT_4,
    label: 'GPT-4',
    description: 'OpenAI GPT-4 models',
    icon: 'zap',
    maxTokens: 8192,
  },
  [ModelScope.GPT_3_5]: {
    scope: ModelScope.GPT_3_5,
    label: 'GPT-3.5',
    description: 'OpenAI GPT-3.5 models',
    icon: 'zap',
    maxTokens: 4096,
  },
  [ModelScope.CLAUDE_3]: {
    scope: ModelScope.CLAUDE_3,
    label: 'Claude 3',
    description: 'Anthropic Claude 3 models',
    icon: 'cpu',
    maxTokens: 200000,
  },
  [ModelScope.ALL]: {
    scope: ModelScope.ALL,
    label: 'All Models',
    description: 'Compatible with all AI models',
    icon: 'globe',
    maxTokens: 4096, // Conservative default
  },
};

/**
 * Token estimation constants
 */
export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN_AVG: 4, // Average characters per token
  CHARS_PER_TOKEN_CONSERVATIVE: 3, // Conservative estimate
};

/**
 * Prompt validation thresholds
 */
export const PROMPT_VALIDATION_THRESHOLDS = {
  MAX_LENGTH_CHARS: 10000,
  MAX_BLOCKS: 10,
  MIN_BLOCKS: 1,
  REPETITION_THRESHOLD: 0.3, // 30% similarity triggers warning
};
