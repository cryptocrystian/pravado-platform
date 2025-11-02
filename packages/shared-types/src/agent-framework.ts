// =====================================================
// AGENT FRAMEWORK TYPES
// =====================================================
// Universal types for scalable AI agent system

export enum AgentExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AgentCategory {
  PR = 'PR',
  CONTENT = 'CONTENT',
  SEO = 'SEO',
  RESEARCH = 'RESEARCH',
  ANALYSIS = 'ANALYSIS',
  GENERAL = 'GENERAL',
}

// =====================================================
// CORE AGENT TYPES
// =====================================================

export interface AgentStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
}

export interface AgentContext {
  organizationId: string;
  userId: string;
  strategy?: any;
  contacts?: any[];
  keywordClusters?: any[];
  campaigns?: any[];
  customData?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (input: any, context: AgentContext) => Promise<any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  steps: AgentStep[];
  tokensUsed?: number;
  executionTimeMs?: number;
  confidence?: number;
}

// =====================================================
// AGENT TEMPLATE
// =====================================================

export interface AgentTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: AgentCategory;
  systemPrompt: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  exampleInput: Record<string, any> | null;
  exampleOutput: Record<string, any> | null;
  model: string;
  temperature: number;
  maxTokens: number;
  requiredTools: string[];
  contextSources: string[];
  executionCount: number;
  avgExecutionTimeMs: number | null;
  successRate: number | null;
  version: number;
  isActive: boolean;
  parentTemplateId: string | null;
  tags: string[];
  isPublic: boolean;
  organizationId: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateAgentTemplateInput {
  name: string;
  slug?: string;
  description?: string;
  category: AgentCategory;
  systemPrompt: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  exampleInput?: Record<string, any>;
  exampleOutput?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  requiredTools?: string[];
  contextSources?: string[];
  tags?: string[];
  isPublic?: boolean;
  organizationId?: string;
}

export interface UpdateAgentTemplateInput {
  name?: string;
  description?: string;
  category?: AgentCategory;
  systemPrompt?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  exampleInput?: Record<string, any>;
  exampleOutput?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  requiredTools?: string[];
  contextSources?: string[];
  tags?: string[];
  isPublic?: boolean;
  isActive?: boolean;
}

// =====================================================
// AGENT EXECUTION
// =====================================================

export interface AgentExecution {
  id: string;
  templateId: string | null;
  agentName: string;
  status: AgentExecutionStatus;
  inputData: Record<string, any>;
  outputData: Record<string, any> | null;
  startedAt: Date | null;
  completedAt: Date | null;
  executionTimeMs: number | null;
  steps: AgentStep[];
  currentStep: number;
  totalSteps: number;
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;
  retryCount: number;
  contextData: Record<string, any> | null;
  tokensUsed: number | null;
  estimatedCost: number | null;
  confidenceScore: number | null;
  qualityScore: number | null;
  organizationId: string;
  triggeredBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentExecutionInput {
  templateId?: string;
  agentName: string;
  inputData: Record<string, any>;
  contextData?: Record<string, any>;
  organizationId: string;
}

export interface UpdateAgentExecutionInput {
  status?: AgentExecutionStatus;
  outputData?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  steps?: AgentStep[];
  currentStep?: number;
  totalSteps?: number;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  tokensUsed?: number;
  estimatedCost?: number;
  confidenceScore?: number;
  qualityScore?: number;
}

// =====================================================
// AGENT EXECUTION RESULT
// =====================================================

export interface AgentExecutionResult {
  id: string;
  executionId: string;
  resultType: string;
  resultData: Record<string, any>;
  title: string | null;
  summary: string | null;
  applied: boolean;
  appliedAt: Date | null;
  appliedTo: string | null;
  appliedToId: string | null;
  organizationId: string;
  createdAt: Date;
}

export interface CreateAgentExecutionResultInput {
  executionId: string;
  resultType: string;
  resultData: Record<string, any>;
  title?: string;
  summary?: string;
  organizationId: string;
}

// =====================================================
// AGENT STATISTICS
// =====================================================

export interface AgentStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number | null;
  totalTokensUsed: number | null;
  totalCost: number | null;
  popularAgents: AgentPopularity[];
}

export interface AgentPopularity {
  agentName: string;
  executionCount: number;
  successRate: number;
}

// =====================================================
// AGENT RUNNER TYPES
// =====================================================

export interface AgentRunnerConfig {
  templateId?: string;
  agentName: string;
  systemPrompt: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: AgentTool[];
  contextSources?: string[];
}

export interface AgentRunnerInput {
  config: AgentRunnerConfig;
  input: Record<string, any>;
  context: AgentContext;
}

// =====================================================
// TEMPLATE INTERPOLATION
// =====================================================

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: any;
}

export interface InterpolatedTemplate {
  prompt: string;
  variables: Record<string, any>;
}
