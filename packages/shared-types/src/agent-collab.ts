// =====================================================
// MULTI-AGENT COLLABORATION & HAND-OFFS TYPES
// =====================================================

/**
 * Collaboration role enumeration
 */
export enum CollaborationRole {
  OWNER = 'OWNER', // Primary responsible agent
  CONTRIBUTOR = 'CONTRIBUTOR', // Can execute tasks
  REVIEWER = 'REVIEWER', // Reviews outputs
  OBSERVER = 'OBSERVER', // Read-only access
}

/**
 * Collaboration scope enumeration
 */
export enum CollaborationScope {
  FULL = 'FULL', // Full access to all goal aspects
  TASK_ONLY = 'TASK_ONLY', // Only task execution
  SUMMARY_ONLY = 'SUMMARY_ONLY', // Read-only summaries
}

/**
 * Collaboration status enumeration
 */
export enum CollaborationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

/**
 * Handoff status enumeration
 */
export enum HandoffStatus {
  INITIATED = 'INITIATED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Agent message type enumeration
 */
export enum AgentMessageType {
  INFO = 'INFO', // Informational message
  REQUEST = 'REQUEST', // Request for help/action
  RESPONSE = 'RESPONSE', // Response to request
  ESCALATION = 'ESCALATION', // Escalation to human/manager
  SYSTEM = 'SYSTEM', // System-generated message
}

/**
 * Agent collaboration - multi-agent work on shared goals
 */
export interface AgentCollaboration {
  id: string;
  goalId: string;
  agentId: string;

  // Collaboration metadata
  role: CollaborationRole;
  scope: CollaborationScope;
  status: CollaborationStatus;

  // Notes and context
  collaborationNotes: string | null;

  // Audit
  invitedBy: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a collaboration
 */
export interface CreateAgentCollaborationInput {
  goalId: string;
  agentId: string;
  role: CollaborationRole;
  scope?: CollaborationScope;
  collaborationNotes?: string;
  invitedBy?: string;
  organizationId: string;
}

/**
 * Input for updating a collaboration
 */
export interface UpdateAgentCollaborationInput {
  status?: CollaborationStatus;
  role?: CollaborationRole;
  scope?: CollaborationScope;
  collaborationNotes?: string;
}

/**
 * Agent handoff - task delegation between agents
 */
export interface AgentHandoff {
  id: string;
  taskId: string;

  // Agent information
  fromAgentId: string;
  toAgentId: string;

  // Handoff details
  handoffReason: string;
  handoffMessage: string | null;
  status: HandoffStatus;

  // Resolution
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a handoff
 */
export interface CreateAgentHandoffInput {
  taskId: string;
  fromAgentId: string;
  toAgentId: string;
  handoffReason: string;
  handoffMessage?: string;
  organizationId: string;
}

/**
 * Input for resolving a handoff
 */
export interface ResolveAgentHandoffInput {
  status: HandoffStatus.ACCEPTED | HandoffStatus.REJECTED;
  resolutionNotes?: string;
  resolvedBy: string;
}

/**
 * Agent chat thread - communication between agents
 */
export interface AgentChatThread {
  id: string;

  // Context
  goalId: string | null;
  taskId: string | null;

  // Metadata
  title: string | null;
  participants: string[]; // Agent IDs
  humanObserver: string | null; // User ID

  // Status
  isActive: boolean;
  closedAt: Date | null;
  closedBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a chat thread
 */
export interface CreateAgentChatThreadInput {
  goalId?: string;
  taskId?: string;
  title?: string;
  participants: string[];
  humanObserver?: string;
  organizationId: string;
}

/**
 * Agent message - individual message in thread
 */
export interface AgentMessage {
  id: string;
  threadId: string;

  // Sender
  senderAgentId: string | null;
  senderUserId: string | null;
  senderType: 'agent' | 'system' | 'user';

  // Message content
  messageType: AgentMessageType;
  content: string;
  metadata: Record<string, any> | null;

  // Read status
  readBy: string[];
  readAt: Date | null;

  // Reply to
  inReplyTo: string | null;

  // Timestamps
  createdAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a message
 */
export interface CreateAgentMessageInput {
  threadId: string;
  senderAgentId?: string;
  senderUserId?: string;
  senderType: 'agent' | 'system' | 'user';
  messageType: AgentMessageType;
  content: string;
  metadata?: Record<string, any>;
  inReplyTo?: string;
  organizationId: string;
}

/**
 * Collaboration summary
 */
export interface CollaborationSummary {
  goalId: string;
  collaborators: {
    agentId: string;
    role: CollaborationRole;
    scope: CollaborationScope;
  }[];
  activeHandoffs: number;
  totalMessages: number;
}

/**
 * Handoff request from agent
 */
export interface HandoffRequest {
  taskId: string;
  targetAgent: string;
  reason: string;
  message?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Message request from agent
 */
export interface MessageRequest {
  recipients: string[]; // Agent IDs
  messageType: AgentMessageType;
  content: string;
  requiresResponse?: boolean;
  deadline?: Date;
}

/**
 * Escalation request
 */
export interface EscalationRequest {
  taskId?: string;
  goalId?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requestedAction?: string;
}
