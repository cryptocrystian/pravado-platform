// =====================================================
// PROMPT TEMPLATE TYPES
// Sprint 38: Agent Prompt Pipeline + Dynamic Slot Filling
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Strategy for resolving prompt slot values at runtime
 */
export enum SlotResolutionStrategy {
  /** Use fixed default value */
  STATIC = 'STATIC',
  /** Extract from runtime context object */
  CONTEXT = 'CONTEXT',
  /** Query agent memory system (Sprint 36) */
  MEMORY = 'MEMORY',
  /** Execute database query */
  DATABASE = 'DATABASE',
  /** Generate with GPT-4 */
  GPT = 'GPT',
}

/**
 * Prompt template use case categories
 */
export enum PromptUseCase {
  CONTENT_GENERATION = 'content_generation',
  OUTREACH = 'outreach',
  ANALYSIS = 'analysis',
  SUMMARIZATION = 'summarization',
  RESEARCH = 'research',
  REVIEW = 'review',
  OPTIMIZATION = 'optimization',
}

/**
 * Slot data types for validation
 */
export enum SlotType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Prompt template status
 */
export enum PromptStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Prompt template with dynamic slot filling
 */
export interface PromptTemplate {
  id: string;
  organizationId: string;

  // Metadata
  name: string;
  description?: string;
  category?: string;
  useCase?: PromptUseCase;

  // Template content
  templateText: string; // Template with {{slot}} syntax
  resolutionStrategies?: string[]; // Allowed strategies

  // Configuration
  metadata?: Record<string, any>;

  // Status and versioning
  active: boolean;
  version: number;
  parentVersionId?: string;

  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relations (populated when needed)
  slots?: PromptSlot[];
  invocations?: PromptInvocation[];
}

/**
 * Slot definition for a prompt template
 */
export interface PromptSlot {
  id: string;
  templateId: string;

  // Slot definition
  slotName: string; // Must match {{slotName}} in template
  slotType: SlotType;
  description?: string;

  // Constraints
  required: boolean;
  defaultValue?: string;
  validationRegex?: string;
  exampleValue?: string;

  // Resolution
  resolutionStrategy: SlotResolutionStrategy;
  sourceReference?: string; // e.g., 'agent.name', 'memory:recent_campaigns'

  // Metadata
  metadata?: Record<string, any>;

  // Audit
  createdAt: string;
}

/**
 * Log of prompt template execution
 */
export interface PromptInvocation {
  id: string;
  organizationId: string;
  templateId?: string;

  // Context
  agentId?: string;
  campaignId?: string;
  userId?: string;

  // Execution
  resolvedPrompt: string; // Final filled prompt
  resolvedSlots: Record<string, any>; // Slot values used

  // Results
  success: boolean;
  errorMessage?: string;
  responseTimeMs?: number;

  // GPT metadata
  gptModel?: string;
  gptTokenCount?: number;
  gptCostUsd?: number;

  // Additional
  metadata?: Record<string, any>;

  // Audit
  createdAt: string;

  // Relations
  template?: PromptTemplate;
}

// =====================================================
// DETAILED TYPES
// =====================================================

/**
 * Detailed template with all relations populated
 */
export interface PromptTemplateWithDetails extends PromptTemplate {
  slots: PromptSlot[];
  recentInvocations?: PromptInvocation[];
  performanceMetrics?: PromptPerformanceMetrics;
}

/**
 * Performance metrics for a template
 */
export interface PromptPerformanceMetrics {
  templateId: string;
  periodDays: number;
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  successRate: number; // Percentage
  avgResponseTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

/**
 * Analytics dashboard data
 */
export interface PromptAnalyticsDashboard {
  organizationId: string;
  periodDays: number;
  totalTemplates: number;
  activeTemplates: number;
  totalInvocations: number;
  successRate: number;
  totalTokens: number;
  totalCostUsd: number;
  topTemplates: Array<{
    id: string;
    name: string;
    invocationCount: number;
  }>;
}

// =====================================================
// INPUT TYPES (API Requests)
// =====================================================

/**
 * Create new prompt template
 */
export interface CreatePromptTemplateInput {
  name: string;
  description?: string;
  templateText: string;
  category?: string;
  useCase?: PromptUseCase;
  resolutionStrategies?: SlotResolutionStrategy[];
  metadata?: Record<string, any>;
}

/**
 * Update existing template
 */
export interface UpdatePromptTemplateInput {
  templateId: string;
  name?: string;
  description?: string;
  templateText?: string;
  category?: string;
  useCase?: PromptUseCase;
  active?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Create new prompt slot
 */
export interface CreatePromptSlotInput {
  templateId: string;
  slotName: string;
  slotType: SlotType;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  validationRegex?: string;
  exampleValue?: string;
  resolutionStrategy: SlotResolutionStrategy;
  sourceReference?: string;
  metadata?: Record<string, any>;
}

/**
 * Update existing slot
 */
export interface UpdatePromptSlotInput {
  slotId: string;
  slotName?: string;
  slotType?: SlotType;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  validationRegex?: string;
  resolutionStrategy?: SlotResolutionStrategy;
  sourceReference?: string;
  metadata?: Record<string, any>;
}

/**
 * Resolve prompt with context
 */
export interface ResolvePromptInput {
  templateId: string;
  context: Record<string, any>;
  agentId?: string;
  campaignId?: string;
  userId?: string;
  dryRun?: boolean; // Don't log invocation if true
}

/**
 * Log prompt invocation
 */
export interface LogPromptInvocationInput {
  templateId: string;
  agentId?: string;
  campaignId?: string;
  userId?: string;
  resolvedPrompt: string;
  resolvedSlots: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  responseTimeMs: number;
  gptModel?: string;
  gptTokenCount?: number;
  gptCostUsd?: number;
  metadata?: Record<string, any>;
}

/**
 * Get templates with filters
 */
export interface GetPromptTemplatesInput {
  organizationId?: string;
  category?: string;
  useCase?: PromptUseCase;
  active?: boolean;
  search?: string; // Search in name/description
  limit?: number;
  offset?: number;
}

/**
 * Get template performance
 */
export interface GetTemplatePerformanceInput {
  templateId: string;
  days?: number; // Period to analyze (default 30)
}

/**
 * Get analytics dashboard
 */
export interface GetPromptAnalyticsInput {
  organizationId: string;
  days?: number;
}

// =====================================================
// OUTPUT TYPES (API Responses)
// =====================================================

/**
 * Result of resolving a prompt
 */
export interface ResolvePromptOutput {
  success: boolean;
  resolvedPrompt?: string;
  resolvedSlots?: Record<string, any>;
  template?: PromptTemplate;
  tokensEstimate?: number;
  costEstimateUsd?: number;
  errors?: SlotResolutionError[];
}

/**
 * Error during slot resolution
 */
export interface SlotResolutionError {
  slotName: string;
  strategy: SlotResolutionStrategy;
  error: string;
  sourceReference?: string;
}

/**
 * Slot validation result
 */
export interface SlotValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Template list response
 */
export interface PromptTemplatesResponse {
  templates: PromptTemplate[];
  total: number;
  limit: number;
  offset: number;
}

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

/**
 * UI configuration for resolution strategies
 */
export const SLOT_RESOLUTION_CONFIGS = {
  [SlotResolutionStrategy.STATIC]: {
    label: 'Static Value',
    icon: '📌',
    color: 'gray',
    description: 'Use a fixed default value',
    example: 'default_value: "Hello World"',
  },
  [SlotResolutionStrategy.CONTEXT]: {
    label: 'From Context',
    icon: '🔗',
    color: 'blue',
    description: 'Extract from runtime context object',
    example: 'source_reference: "agent.name"',
  },
  [SlotResolutionStrategy.MEMORY]: {
    label: 'Agent Memory',
    icon: '🧠',
    color: 'purple',
    description: 'Query agent memory system',
    example: 'source_reference: "memory:recent_campaigns"',
  },
  [SlotResolutionStrategy.DATABASE]: {
    label: 'Database Query',
    icon: '💾',
    color: 'green',
    description: 'Execute database query',
    example: 'source_reference: "campaigns.goal WHERE id=:campaign_id"',
  },
  [SlotResolutionStrategy.GPT]: {
    label: 'GPT Generated',
    icon: '✨',
    color: 'orange',
    description: 'Generate value with GPT-4',
    example: 'source_reference: "Generate a catchy headline about {{topic}}"',
  },
} as const;

/**
 * UI configuration for prompt use cases
 */
export const PROMPT_USE_CASE_CONFIGS = {
  [PromptUseCase.CONTENT_GENERATION]: {
    label: 'Content Generation',
    icon: '✍️',
    color: 'blue',
    description: 'Create blog posts, articles, social media content',
  },
  [PromptUseCase.OUTREACH]: {
    label: 'Outreach',
    icon: '📧',
    color: 'green',
    description: 'Personalized emails, PR pitches, follow-ups',
  },
  [PromptUseCase.ANALYSIS]: {
    label: 'Analysis',
    icon: '📊',
    color: 'purple',
    description: 'Data analysis, insights, competitive intel',
  },
  [PromptUseCase.SUMMARIZATION]: {
    label: 'Summarization',
    icon: '📝',
    color: 'yellow',
    description: 'Summarize long content, meetings, research',
  },
  [PromptUseCase.RESEARCH]: {
    label: 'Research',
    icon: '🔍',
    color: 'indigo',
    description: 'Market research, competitor analysis',
  },
  [PromptUseCase.REVIEW]: {
    label: 'Review & QA',
    icon: '✅',
    color: 'red',
    description: 'Quality assurance, content review',
  },
  [PromptUseCase.OPTIMIZATION]: {
    label: 'Optimization',
    icon: '⚡',
    color: 'orange',
    description: 'SEO optimization, performance improvements',
  },
} as const;

/**
 * UI configuration for slot types
 */
export const SLOT_TYPE_CONFIGS = {
  [SlotType.STRING]: {
    label: 'String',
    icon: 'Aa',
    color: 'gray',
    description: 'Text value',
  },
  [SlotType.NUMBER]: {
    label: 'Number',
    icon: '#',
    color: 'blue',
    description: 'Numeric value',
  },
  [SlotType.BOOLEAN]: {
    label: 'Boolean',
    icon: '☑',
    color: 'green',
    description: 'True/false value',
  },
  [SlotType.ARRAY]: {
    label: 'Array',
    icon: '[]',
    color: 'purple',
    description: 'List of values',
  },
  [SlotType.OBJECT]: {
    label: 'Object',
    icon: '{}',
    color: 'orange',
    description: 'Complex object',
  },
} as const;

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Context object for slot resolution
 */
export interface PromptResolutionContext {
  // Agent context
  agent?: {
    id: string;
    name: string;
    type: string;
    metadata?: Record<string, any>;
  };

  // Campaign context
  campaign?: {
    id: string;
    name: string;
    goal: string;
    metadata?: Record<string, any>;
  };

  // User context
  user?: {
    id: string;
    name: string;
    email: string;
  };

  // Organization context
  organization?: {
    id: string;
    name: string;
  };

  // Custom context
  custom?: Record<string, any>;
}

/**
 * Parsed template slot information
 */
export interface ParsedSlot {
  slotName: string;
  startIndex: number;
  endIndex: number;
  fullMatch: string; // The {{slotName}} text
}
