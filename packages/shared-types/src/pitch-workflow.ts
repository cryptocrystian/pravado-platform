// =====================================================
// PITCH WORKFLOW TYPES
// =====================================================
// Automated pitching system with agent-powered personalization

export enum PitchWorkflowStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum PitchJobStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  REPLIED = 'REPLIED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED',
}

export enum PitchEventType {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  REPLIED = 'REPLIED',
  BOUNCED = 'BOUNCED',
  SPAM = 'SPAM',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

// =====================================================
// CONTACT FILTERS
// =====================================================

export interface PitchContactFilters {
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3';
  topics?: string[];
  regions?: string[];
  outletType?: string;
  limit?: number;
}

// =====================================================
// PITCH WORKFLOW
// =====================================================

export interface PitchWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: PitchWorkflowStatus;

  // Agent Configuration
  agentTemplateId: string | null;
  agentInputData: Record<string, any>;

  // Contact Filters
  contactFilters: PitchContactFilters;
  totalContacts: number;

  // Pitch Template
  pitchTemplateId: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
  customVariables: Record<string, any>;

  // Scheduling
  scheduledAt: Date | null;
  sendWindowStart: string | null; // HH:MM format
  sendWindowEnd: string | null;
  timezone: string;
  batchSize: number;
  batchDelayMinutes: number;

  // Execution Tracking
  startedAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;

  // Stats
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  bouncedCount: number;
  failedCount: number;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreatePitchWorkflowInput {
  name: string;
  description?: string;
  agentTemplateId?: string;
  agentInputData?: Record<string, any>;
  contactFilters: PitchContactFilters;
  pitchTemplateId?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  customVariables?: Record<string, any>;
  scheduledAt?: Date;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  timezone?: string;
  batchSize?: number;
  batchDelayMinutes?: number;
  organizationId: string;
}

export interface UpdatePitchWorkflowInput {
  name?: string;
  description?: string;
  agentTemplateId?: string;
  agentInputData?: Record<string, any>;
  contactFilters?: PitchContactFilters;
  pitchTemplateId?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  customVariables?: Record<string, any>;
  scheduledAt?: Date;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  timezone?: string;
  batchSize?: number;
  batchDelayMinutes?: number;
  status?: PitchWorkflowStatus;
}

// =====================================================
// PITCH JOB
// =====================================================

export interface PitchJob {
  id: string;
  workflowId: string;
  contactId: string;
  status: PitchJobStatus;

  // Generated Content
  subject: string;
  body: string;
  personalizationData: Record<string, any> | null;

  // Email Metadata
  emailProvider: string | null;
  messageId: string | null;
  fromEmail: string | null;
  toEmail: string | null;

  // Timestamps
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  repliedAt: Date | null;
  bouncedAt: Date | null;

  // Error Handling
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePitchJobInput {
  workflowId: string;
  contactId: string;
  subject: string;
  body: string;
  personalizationData?: Record<string, any>;
  organizationId: string;
}

export interface UpdatePitchJobInput {
  status?: PitchJobStatus;
  messageId?: string;
  emailProvider?: string;
  fromEmail?: string;
  toEmail?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  bouncedAt?: Date;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  retryCount?: number;
  nextRetryAt?: Date;
}

// =====================================================
// PITCH EVENT
// =====================================================

export interface PitchEvent {
  id: string;
  jobId: string;
  workflowId: string;
  eventType: PitchEventType;
  occurredAt: Date;

  // Event Data
  userAgent: string | null;
  ipAddress: string | null;
  location: {
    city?: string;
    country?: string;
    region?: string;
  } | null;
  linkUrl: string | null;
  webhookData: Record<string, any> | null;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
}

export interface CreatePitchEventInput {
  jobId: string;
  workflowId: string;
  eventType: PitchEventType;
  occurredAt?: Date;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
  };
  linkUrl?: string;
  webhookData?: Record<string, any>;
  organizationId: string;
}

// =====================================================
// WORKFLOW STATS
// =====================================================

export interface PitchWorkflowStats {
  workflow: PitchWorkflow;
  jobs: PitchJob[];
  recentEvents: PitchEvent[];
  metrics: {
    totalContacts: number;
    sentRate: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
  };
}

// =====================================================
// EMAIL PROVIDER
// =====================================================

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  customData?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
