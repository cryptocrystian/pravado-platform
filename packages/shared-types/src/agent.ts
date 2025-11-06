// Import PlaybookAgentContext from agent-playbook (canonical source)
import { PlaybookAgentContext } from './agent-playbook';

export enum AgentType {
  CONTENT_GENERATOR = 'CONTENT_GENERATOR',
  SEO_OPTIMIZER = 'SEO_OPTIMIZER',
  OUTREACH_COMPOSER = 'OUTREACH_COMPOSER',
  KEYWORD_RESEARCHER = 'KEYWORD_RESEARCHER',
  STRATEGY_PLANNER = 'STRATEGY_PLANNER',
  COMPETITOR_ANALYZER = 'COMPETITOR_ANALYZER',
}

export enum AgentTaskStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AgentPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface AgentTask {
  id: string;
  type: AgentType;
  status: AgentTaskStatus;
  priority: AgentPriority;
  context: PlaybookAgentContext;
  output: AgentOutput | null;
  error: AgentError | null;
  userId: string;
  organizationId: string;
  parentTaskId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedDuration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConstraints {
  maxTokens?: number;
  temperature?: number;
  tone?: string;
  targetAudience?: string[];
  styleGuide?: string;
  brandVoice?: string;
}

export interface AgentOutput {
  result: unknown;
  confidence: number;
  tokensUsed: number;
  model: string;
  metadata: AgentOutputMetadata;
}

export interface AgentOutputMetadata {
  reasoning: string[];
  alternatives: unknown[];
  suggestedNextSteps: string[];
  warnings: string[];
}

export interface AgentError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  retryable: boolean;
  retryCount: number;
}

export interface AgentLog {
  id: string;
  taskId: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type CreateAgentTaskInput = Pick<
  AgentTask,
  'type' | 'priority' | 'context' | 'userId' | 'organizationId'
> & {
  parentTaskId?: string;
  estimatedDuration?: number;
};

export type UpdateAgentTaskInput = {
  status?: AgentTaskStatus;
  output?: AgentOutput;
  error?: AgentError;
  startedAt?: Date;
  completedAt?: Date;
};
