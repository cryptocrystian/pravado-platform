// =====================================================
// AGENT COLLABORATION ZOD VALIDATION SCHEMAS
// =====================================================

import { z } from 'zod';
import {
  CollaborationRole,
  CollaborationScope,
  CollaborationStatus,
  HandoffStatus,
  AgentMessageType,
} from '@pravado/types';

// =====================================================
// ENUMS
// =====================================================

export const CollaborationRoleSchema = z.nativeEnum(CollaborationRole);
export const CollaborationScopeSchema = z.nativeEnum(CollaborationScope);
export const CollaborationStatusSchema = z.nativeEnum(CollaborationStatus);
export const HandoffStatusSchema = z.nativeEnum(HandoffStatus);
export const AgentMessageTypeSchema = z.nativeEnum(AgentMessageType);

// =====================================================
// COLLABORATION SCHEMAS
// =====================================================

export const CreateAgentCollaborationInputSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID'),
  agentId: z.string().min(1, 'Agent ID is required'),
  role: CollaborationRoleSchema,
  scope: CollaborationScopeSchema.default(CollaborationScope.FULL),
  collaborationNotes: z.string().max(5000, 'Notes too long').optional(),
  invitedBy: z.string().uuid('Invalid user ID').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
});

export const UpdateAgentCollaborationInputSchema = z.object({
  status: CollaborationStatusSchema.optional(),
  role: CollaborationRoleSchema.optional(),
  scope: CollaborationScopeSchema.optional(),
  collaborationNotes: z.string().max(5000, 'Notes too long').optional(),
});

export const AgentCollaborationSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  agentId: z.string(),

  role: CollaborationRoleSchema,
  scope: CollaborationScopeSchema,
  status: CollaborationStatusSchema,

  collaborationNotes: z.string().nullable(),

  invitedBy: z.string().nullable(),
  invitedAt: z.date(),
  acceptedAt: z.date().nullable(),
  declinedAt: z.date().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),

  organizationId: z.string().uuid(),
});

// =====================================================
// HANDOFF SCHEMAS
// =====================================================

export const CreateAgentHandoffInputSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  fromAgentId: z.string().min(1, 'Source agent ID is required'),
  toAgentId: z.string().min(1, 'Target agent ID is required'),
  handoffReason: z.string().min(1, 'Handoff reason is required').max(2000, 'Reason too long'),
  handoffMessage: z.string().max(5000, 'Message too long').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
}).refine(
  (data) => data.fromAgentId !== data.toAgentId,
  { message: 'Cannot handoff task to the same agent', path: ['toAgentId'] }
);

export const ResolveAgentHandoffInputSchema = z.object({
  status: z.union([
    z.literal(HandoffStatus.ACCEPTED),
    z.literal(HandoffStatus.REJECTED),
  ]),
  resolutionNotes: z.string().max(5000, 'Notes too long').optional(),
  resolvedBy: z.string().min(1, 'Resolver ID is required'),
});

export const AgentHandoffSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),

  fromAgentId: z.string(),
  toAgentId: z.string(),

  handoffReason: z.string(),
  handoffMessage: z.string().nullable(),
  status: HandoffStatusSchema,

  resolutionNotes: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.date().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),

  organizationId: z.string().uuid(),
});

// =====================================================
// CHAT THREAD SCHEMAS
// =====================================================

export const CreateAgentChatThreadInputSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID').optional(),
  taskId: z.string().uuid('Invalid task ID').optional(),
  title: z.string().max(500, 'Title too long').optional(),
  participants: z.array(z.string()).min(1, 'At least one participant required'),
  humanObserver: z.string().uuid('Invalid user ID').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
}).refine(
  (data) => data.goalId || data.taskId,
  { message: 'Either goalId or taskId must be provided' }
);

export const AgentChatThreadSchema = z.object({
  id: z.string().uuid(),

  goalId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),

  title: z.string().nullable(),
  participants: z.array(z.string()),
  humanObserver: z.string().nullable(),

  isActive: z.boolean(),
  closedAt: z.date().nullable(),
  closedBy: z.string().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
  lastMessageAt: z.date().nullable(),

  organizationId: z.string().uuid(),
});

// =====================================================
// MESSAGE SCHEMAS
// =====================================================

export const CreateAgentMessageInputSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
  senderAgentId: z.string().optional(),
  senderUserId: z.string().uuid('Invalid user ID').optional(),
  senderType: z.enum(['agent', 'system', 'user']),
  messageType: AgentMessageTypeSchema,
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
  metadata: z.record(z.any()).optional(),
  inReplyTo: z.string().uuid('Invalid message ID').optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
}).refine(
  (data) => {
    if (data.senderType === 'agent') return !!data.senderAgentId;
    if (data.senderType === 'user') return !!data.senderUserId;
    return true; // System messages don't need a sender ID
  },
  { message: 'Sender ID must match sender type', path: ['senderType'] }
);

export const AgentMessageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),

  senderAgentId: z.string().nullable(),
  senderUserId: z.string().nullable(),
  senderType: z.enum(['agent', 'system', 'user']),

  messageType: AgentMessageTypeSchema,
  content: z.string(),
  metadata: z.record(z.any()).nullable(),

  readBy: z.array(z.string()),
  readAt: z.date().nullable(),

  inReplyTo: z.string().nullable(),

  createdAt: z.date(),

  organizationId: z.string().uuid(),
});

// =====================================================
// REQUEST SCHEMAS (Agent Operations)
// =====================================================

export const HandoffRequestSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  targetAgent: z.string().min(1, 'Target agent is required'),
  reason: z.string().min(1, 'Reason is required').max(2000, 'Reason too long'),
  message: z.string().max(5000, 'Message too long').optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const MessageRequestSchema = z.object({
  recipients: z.array(z.string()).min(1, 'At least one recipient required'),
  messageType: AgentMessageTypeSchema,
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  requiresResponse: z.boolean().default(false),
  deadline: z.date().optional(),
});

export const EscalationRequestSchema = z.object({
  taskId: z.string().uuid('Invalid task ID').optional(),
  goalId: z.string().uuid('Invalid goal ID').optional(),
  reason: z.string().min(1, 'Reason is required').max(2000, 'Reason too long'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  requestedAction: z.string().max(1000, 'Requested action too long').optional(),
}).refine(
  (data) => data.taskId || data.goalId,
  { message: 'Either taskId or goalId must be provided' }
);

// =====================================================
// SUMMARY SCHEMAS
// =====================================================

export const CollaborationSummarySchema = z.object({
  goalId: z.string().uuid(),
  collaborators: z.array(z.object({
    agentId: z.string(),
    role: CollaborationRoleSchema,
    scope: CollaborationScopeSchema,
  })),
  activeHandoffs: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
});
