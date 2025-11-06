// =====================================================
// FOLLOWUP CADENCE TYPES
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export enum FollowupTriggerType {
  TIME_DELAY = 'TIME_DELAY',
  NO_RESPONSE = 'NO_RESPONSE',
  LINK_CLICK = 'LINK_CLICK',
  OPEN_ONLY = 'OPEN_ONLY',
  CUSTOM_CONDITION = 'CUSTOM_CONDITION',
}

export enum FollowupStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SKIPPED = 'SKIPPED',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
}

// =====================================================
// CORE ENTITIES
// =====================================================

export interface FollowupSequence {
  id: string;
  name: string;
  description?: string;
  campaignId?: string;
  isActive: boolean;
  totalSteps: number;
  defaultTimezone: string;
  sendWindowStart: string; // HH:MM:SS
  sendWindowEnd: string; // HH:MM:SS
  minRelationshipTier?: string;
  targetStatuses?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface FollowupStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  stepName?: string;
  triggerType: FollowupTriggerType;
  delayHours: number;
  delayDays: number;
  requiresNoResponse: boolean;
  requiresNoClick: boolean;
  customCondition?: Record<string, unknown>;
  templateRef?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  personalizationFields?: Record<string, unknown>;
  skipIfReplied: boolean;
  maxAttempts: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledFollowup {
  id: string;
  sequenceId: string;
  stepId: string;
  campaignId?: string;
  contactId: string;
  scheduledAt: string;
  sentAt?: string;
  status: FollowupStatus;
  attemptNumber: number;
  lastAttemptAt?: string;
  outcome?: string;
  errorMessage?: string;
  wasOpened: boolean;
  wasClicked: boolean;
  wasReplied: boolean;
  repliedAt?: string;
  subject?: string;
  body?: string;
  sentMessageId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

export interface CreateFollowupSequenceInput {
  name: string;
  description?: string;
  campaignId?: string;
  isActive?: boolean;
  defaultTimezone?: string;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  minRelationshipTier?: string;
  targetStatuses?: string[];
  metadata?: Record<string, unknown>;
  organizationId: string;
}

export interface UpdateFollowupSequenceInput {
  sequenceId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  defaultTimezone?: string;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  minRelationshipTier?: string;
  targetStatuses?: string[];
  metadata?: Record<string, unknown>;
  organizationId: string;
}

export interface CreateFollowupStepInput {
  sequenceId: string;
  stepNumber: number;
  stepName?: string;
  triggerType?: FollowupTriggerType;
  delayHours?: number;
  delayDays?: number;
  requiresNoResponse?: boolean;
  requiresNoClick?: boolean;
  customCondition?: Record<string, unknown>;
  templateRef?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  personalizationFields?: Record<string, unknown>;
  skipIfReplied?: boolean;
  maxAttempts?: number;
  metadata?: Record<string, unknown>;
  organizationId: string;
}

export interface UpdateFollowupStepInput {
  stepId: string;
  stepName?: string;
  triggerType?: FollowupTriggerType;
  delayHours?: number;
  delayDays?: number;
  requiresNoResponse?: boolean;
  requiresNoClick?: boolean;
  customCondition?: Record<string, unknown>;
  templateRef?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  personalizationFields?: Record<string, unknown>;
  skipIfReplied?: boolean;
  maxAttempts?: number;
  metadata?: Record<string, unknown>;
  organizationId: string;
}

export interface GenerateFollowupsInput {
  campaignId: string;
  sequenceId: string;
  contactIds?: string[]; // If null, generates for all approved contacts
  organizationId: string;
}

export interface EvaluateFollowupTriggersInput {
  followupId: string;
  organizationId: string;
}

export interface RescheduleFollowupInput {
  followupId: string;
  newScheduledAt: string;
  reason: string;
  organizationId: string;
}

export interface CancelFollowupSequenceInput {
  contactId: string;
  sequenceId: string;
  reason: string;
  organizationId: string;
}

export interface GetDueFollowupsInput {
  organizationId: string;
  limit?: number;
}

export interface MarkFollowupSentInput {
  followupId: string;
  sentMessageId: string;
  organizationId: string;
}

export interface MarkFollowupFailedInput {
  followupId: string;
  errorMessage: string;
  organizationId: string;
}

export interface ExecuteFollowupInput {
  followupId: string;
  organizationId: string;
  dryRun?: boolean;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

export interface GenerateFollowupsResult {
  success: boolean;
  createdCount: number;
  sequenceId: string;
  campaignId: string;
  message: string;
}

export interface FollowupTriggerEvaluation {
  followupId: string;
  eligible: boolean;
  reasons: string[];
  step: {
    stepNumber: number;
    stepName?: string;
    triggerType: FollowupTriggerType;
  };
}

export interface DueFollowup {
  followupId: string;
  sequenceId: string;
  stepId: string;
  campaignId?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  stepNumber: number;
  stepName?: string;
  subject?: string;
  body?: string;
  scheduledAt: string;
  attemptNumber: number;
}

export interface FollowupExecutionResult {
  success: boolean;
  followupId: string;
  contactId: string;
  contactEmail: string;
  status: FollowupStatus;
  sentAt?: string;
  sentMessageId?: string;
  errorMessage?: string;
  outcome: string;
  durationMs: number;
}

export interface FollowupSequenceSummary {
  sequence: FollowupSequence;
  steps: FollowupStep[];
  statistics: {
    totalScheduled: number;
    totalSent: number;
    totalPending: number;
    totalCanceled: number;
    totalFailed: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgReplyRate: number;
  };
}

export interface FollowupBatchExecutionResult {
  success: boolean;
  totalProcessed: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  executions: FollowupExecutionResult[];
  durationMs: number;
}

export interface ContactFollowupStatus {
  contactId: string;
  contactName: string;
  contactEmail: string;
  sequences: {
    sequenceId: string;
    sequenceName: string;
    currentStep?: number;
    totalSteps: number;
    status: 'active' | 'completed' | 'canceled';
    nextScheduledAt?: string;
    lastSentAt?: string;
    totalSent: number;
    totalPending: number;
  }[];
}

export interface FollowupAnalytics {
  campaignId?: string;
  sequenceId?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalFollowupsSent: number;
    totalFollowupsPending: number;
    totalFollowupsCanceled: number;
    totalFollowupsFailed: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    avgTimeToReply?: number; // in hours
    conversionRate: number; // replies / sent
  };
  byStep: {
    stepNumber: number;
    stepName?: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  }[];
  byTriggerType: {
    triggerType: FollowupTriggerType;
    count: number;
    successRate: number;
  }[];
}

// =====================================================
// QUERY TYPES
// =====================================================

export interface ListFollowupSequencesQuery {
  campaignId?: string;
  isActive?: boolean;
  organizationId: string;
  limit?: number;
  offset?: number;
}

export interface ListScheduledFollowupsQuery {
  campaignId?: string;
  sequenceId?: string;
  contactId?: string;
  status?: FollowupStatus;
  scheduledBefore?: string;
  scheduledAfter?: string;
  organizationId: string;
  limit?: number;
  offset?: number;
}

export interface FollowupSequenceWithSteps extends FollowupSequence {
  steps: FollowupStep[];
}

export interface ScheduledFollowupWithDetails extends ScheduledFollowup {
  sequence: FollowupSequence;
  step: FollowupStep;
  contact: {
    id: string;
    name: string;
    email: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
}
