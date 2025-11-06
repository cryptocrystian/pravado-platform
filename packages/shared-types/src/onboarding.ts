// =====================================================
// ONBOARDING TYPES
// =====================================================
// Types for the AI-driven onboarding session management

import { AgentType } from './agent';
import { IntakeStep } from './intake';

export enum OnboardingStatus {
  STARTED = 'STARTED',
  INTAKE_COMPLETE = 'INTAKE_COMPLETE',
  PROCESSING = 'PROCESSING',
  STRATEGY_READY = 'STRATEGY_READY',
  PLANNER_READY = 'PLANNER_READY',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}

// Onboarding Session
export interface OnboardingSession {
  id: string;
  organizationId: string;
  userId: string;

  // Session state
  status: OnboardingStatus;
  currentStep: IntakeStep;
  completedSteps: string[];

  // Timestamps for each phase
  startedAt: Date;
  intakeCompletedAt: Date | null;
  processingStartedAt: Date | null;
  strategyGeneratedAt: Date | null;
  plannerCompletedAt: Date | null;
  completedAt: Date | null;

  // Agent task tracking
  strategyTaskId: string | null;
  plannerTaskId: string | null;

  // Generated asset references
  strategyPlanId: string | null;

  // Error handling
  errorMessage: string | null;
  retryCount: number;

  // Metadata
  metadata: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// Agent Task Result
export interface OnboardingAgentResult {
  id: string;
  sessionId: string;
  agentType: AgentType;

  // Task tracking
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // Results
  result: Record<string, unknown>;

  // Generated asset references
  generatedContentIds: string[];
  generatedPressReleaseId: string | null;
  generatedSeoAuditId: string | null;

  // Performance metrics
  startedAt: Date | null;
  completedAt: Date | null;
  executionTimeMs: number | null;

  // Error handling
  errorMessage: string | null;
  retryCount: number;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// Strategy Agent Output
export interface StrategyAgentOutput {
  strategyPlanId: string;
  plan: {
    prStrategy: {
      objectives: string[];
      keyMessages: string[];
      targetOutlets: string[];
      timeline: string;
    };
    contentStrategy: {
      themes: string[];
      contentPillars: string[];
      cadence: string;
      channels: string[];
    };
    seoStrategy: {
      focusKeywords: string[];
      targetPages: string[];
      contentGaps: string[];
      technicalPriorities: string[];
    };
  };
  executionTimeMs: number;
}

// Planner Agent Output
export interface PlannerAgentOutput {
  contentCalendar: {
    contentIds: string[];
    items: Array<{
      id: string;
      title: string;
      type: string;
      scheduledFor: Date;
      channel: string;
    }>;
  };
  pressRelease: {
    id: string;
    title: string;
    subtitle: string;
  } | null;
  seoAudit: {
    id: string;
    url: string;
    score: number | null;
  } | null;
  executionTimeMs: number;
}

// Combined onboarding result for frontend display
export interface OnboardingResult {
  session: OnboardingSession;
  strategy: StrategyAgentOutput | null;
  planner: PlannerAgentOutput | null;
  intakeSummary: Record<string, unknown>;
}

// Input types for session management
export interface CreateOnboardingSessionInput {
  organizationId: string;
  userId: string;
}

export interface UpdateOnboardingSessionInput {
  status?: OnboardingStatus;
  currentStep?: IntakeStep;
  completedSteps?: string[];
  strategyTaskId?: string;
  plannerTaskId?: string;
  strategyPlanId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

// Progress tracking
export interface OnboardingProgress {
  currentPhase: 'intake' | 'processing' | 'ready' | 'complete';
  percentComplete: number;
  stepsCompleted: number;
  totalSteps: number;
  currentActivity: string;
  estimatedTimeRemaining?: string;
}

// Webhook payload for agent completion
export interface OnboardingWebhookPayload {
  sessionId: string;
  agentType: AgentType;
  status: 'completed' | 'failed';
  result?: StrategyAgentOutput | PlannerAgentOutput;
  error?: string;
}
