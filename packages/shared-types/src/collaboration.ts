// =====================================================
// COLLABORATION TYPES - Advanced Collaboration & Handoff System
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export enum HandoffStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum HandoffType {
  REVIEW = 'REVIEW',
  EXECUTION = 'EXECUTION',
  ESCALATION = 'ESCALATION',
  STRATEGY_INPUT = 'STRATEGY_INPUT',
  QA_REVIEW = 'QA_REVIEW',
}

export enum CollaborationVisibility {
  INTERNAL = 'INTERNAL',
  ORG_WIDE = 'ORG_WIDE',
  CAMPAIGN_ONLY = 'CAMPAIGN_ONLY',
}

export type ThreadParticipantRole = 'creator' | 'participant' | 'viewer';

// =====================================================
// HANDOFF TYPES
// =====================================================

export interface HandoffRequest {
  id: string;
  campaignId: string;
  fromUserId: string;
  toUserId: string;
  handoffType: HandoffType;
  message: string;
  metadata: Record<string, unknown>;
  status: HandoffStatus;
  responseMessage?: string;
  respondedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface EnrichedHandoffRequest extends HandoffRequest {
  campaignName: string;
  fromUser: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  toUser: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
}

// =====================================================
// COLLABORATION THREAD TYPES
// =====================================================

export interface CollaborationThread {
  id: string;
  campaignId: string;
  title: string;
  description?: string;
  createdBy: string;
  isPrivate: boolean;
  visibility: CollaborationVisibility;
  lastActivityAt: string;
  commentCount: number;
  isLocked: boolean;
  isPinned: boolean;
  summary?: string;
  summaryGeneratedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface CollaborationComment {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  mentions: string[];
  attachments: CollaborationAttachment[];
  parentCommentId?: string;
  isEdited: boolean;
  editedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  organizationId: string;
}

export interface CollaborationAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ThreadParticipant {
  id: string;
  threadId: string;
  userId: string;
  role: ThreadParticipantRole;
  joinedAt: string;
  lastReadAt?: string;
  isWatching: boolean;
  organizationId: string;
}

// =====================================================
// ENRICHED TYPES (with related data)
// =====================================================

export interface EnrichedCollaborationThread extends CollaborationThread {
  creator: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  participants?: ThreadParticipant[];
  comments?: CollaborationComment[];
  unreadCount?: number;
}

export interface EnrichedCollaborationComment extends CollaborationComment {
  author: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  mentionedUsers?: {
    id: string;
    name: string;
  }[];
  replies?: EnrichedCollaborationComment[];
}

// =====================================================
// INPUT TYPES
// =====================================================

export interface CreateHandoffRequestInput {
  campaignId: string;
  toUserId: string;
  handoffType: HandoffType;
  message: string;
  metadata?: Record<string, unknown>;
  expiresInHours?: number;
  organizationId: string;
}

export interface AcceptHandoffInput {
  requestId: string;
  userId: string;
  responseMessage?: string;
  organizationId: string;
}

export interface DeclineHandoffInput {
  requestId: string;
  userId: string;
  responseMessage?: string;
  organizationId: string;
}

export interface CancelHandoffInput {
  requestId: string;
  userId: string;
  reason?: string;
  organizationId: string;
}

export interface CreateCollaborationThreadInput {
  campaignId: string;
  title: string;
  description?: string;
  isPrivate?: boolean;
  visibility?: CollaborationVisibility;
  organizationId: string;
}

export interface UpdateCollaborationThreadInput {
  threadId: string;
  title?: string;
  description?: string;
  isLocked?: boolean;
  isPinned?: boolean;
  organizationId: string;
}

export interface CreateCollaborationCommentInput {
  threadId: string;
  content: string;
  mentions?: string[];
  attachments?: CollaborationAttachment[];
  parentCommentId?: string;
  organizationId: string;
}

export interface UpdateCollaborationCommentInput {
  commentId: string;
  content: string;
  organizationId: string;
}

export interface AddThreadParticipantInput {
  threadId: string;
  userId: string;
  role?: ThreadParticipantRole;
  organizationId: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

export interface HandoffRequestResult {
  success: boolean;
  request: HandoffRequest;
  message?: string;
}

export interface HandoffActionResult {
  success: boolean;
  requestId: string;
  status: HandoffStatus;
  message?: string;
}

export interface UserHandoffQueue {
  success: boolean;
  requests: EnrichedHandoffRequest[];
  total: number;
}

export interface CollaborationThreadResult {
  success: boolean;
  thread: CollaborationThread;
  message?: string;
}

export interface CollaborationCommentResult {
  success: boolean;
  comment: CollaborationComment;
  message?: string;
}

export interface CampaignCollaborationContext {
  threads: EnrichedCollaborationThread[];
  comments: Record<string, CollaborationComment[]>;
  participants?: Record<string, ThreadParticipant[]>;
  totalThreads: number;
  totalComments: number;
}

export interface ThreadSummary {
  threadId: string;
  summaryText: string;
  generatedAt: string;
  generatedBy: string;
  keyPoints?: string[];
  actionItems?: string[];
  participants?: string[];
}

// =====================================================
// QUERY TYPES
// =====================================================

export interface ListHandoffRequestsQuery {
  campaignId?: string;
  fromUserId?: string;
  toUserId?: string;
  status?: HandoffStatus;
  handoffType?: HandoffType;
  limit?: number;
  offset?: number;
  organizationId: string;
}

export interface ListCollaborationThreadsQuery {
  campaignId?: string;
  createdBy?: string;
  visibility?: CollaborationVisibility;
  isPrivate?: boolean;
  isLocked?: boolean;
  isPinned?: boolean;
  limit?: number;
  offset?: number;
  organizationId: string;
}

export interface ListCollaborationCommentsQuery {
  threadId: string;
  authorId?: string;
  limit?: number;
  offset?: number;
  organizationId: string;
}

// =====================================================
// MENTION TYPES
// =====================================================

export interface MentionSuggestion {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
}

export interface MentionNotification {
  id: string;
  threadId: string;
  commentId: string;
  mentionedUserId: string;
  mentionedBy: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

// =====================================================
// COLLABORATION STATISTICS
// =====================================================

export interface CollaborationStats {
  totalThreads: number;
  totalComments: number;
  activeThreads: number;
  privateThreads: number;
  totalParticipants: number;
  avgCommentsPerThread: number;
  recentActivity: {
    date: string;
    threadCount: number;
    commentCount: number;
  }[];
  topContributors: {
    userId: string;
    name: string;
    commentCount: number;
  }[];
}

export interface HandoffStats {
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  declinedRequests: number;
  expiredRequests: number;
  avgResponseTime?: number; // in hours
  byType: Record<HandoffType, number>;
  recentHandoffs: EnrichedHandoffRequest[];
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export interface CollaborationNotification {
  id: string;
  type: 'mention' | 'comment' | 'handoff_request' | 'handoff_response' | 'thread_update';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

// =====================================================
// REAL-TIME EVENTS
// =====================================================

export interface CollaborationEvent {
  type: 'thread_created' | 'thread_updated' | 'comment_added' | 'comment_updated' | 'comment_deleted' | 'participant_added' | 'participant_removed';
  threadId?: string;
  commentId?: string;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface HandoffEvent {
  type: 'handoff_requested' | 'handoff_accepted' | 'handoff_declined' | 'handoff_canceled' | 'handoff_expired';
  requestId: string;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// =====================================================
// PERMISSIONS
// =====================================================

export interface CollaborationPermissions {
  canCreateThread: boolean;
  canComment: boolean;
  canMention: boolean;
  canViewPrivateThreads: boolean;
  canManageThreads: boolean;
  canRequestHandoff: boolean;
  canAcceptHandoff: boolean;
}

// =====================================================
// AI SUMMARIZATION
// =====================================================

export interface SummarizeThreadInput {
  threadId: string;
  organizationId: string;
  maxLength?: number;
  includeActionItems?: boolean;
}

export interface SummarizeThreadResult {
  success: boolean;
  summary: ThreadSummary;
}
