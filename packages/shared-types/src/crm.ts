// =====================================================
// CRM TYPES
// =====================================================

export enum InteractionType {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  DM = 'DM',
  OTHER = 'OTHER',
}

export enum InteractionDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum InteractionChannel {
  EMAIL = 'EMAIL',
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  PHONE = 'PHONE',
  ZOOM = 'ZOOM',
  SLACK = 'SLACK',
  OTHER = 'OTHER',
}

export enum InteractionSentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

export enum RelationshipType {
  OWNER = 'OWNER',
  COLLABORATOR = 'COLLABORATOR',
  WATCHER = 'WATCHER',
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

export enum FollowUpPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RelationshipTemperature {
  HOT = 'Hot',
  WARM = 'Warm',
  COOL = 'Cool',
  COLD = 'Cold',
}

// =====================================================
// CONTACT INTERACTION
// =====================================================

export interface ContactInteraction {
  id: string;
  contactId: string;
  userId: string;

  // Interaction Details
  interactionType: InteractionType;
  direction: InteractionDirection;
  channel: InteractionChannel;

  // Content
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  sentiment: InteractionSentiment | null;

  // Related Campaign
  relatedCampaignId: string | null;

  // Timing
  occurredAt: Date;
  durationMinutes: number | null;

  // Attachments/Links
  attachments: Record<string, any> | null;
  externalLinks: string[];

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInteractionInput {
  contactId: string;
  interactionType: InteractionType;
  direction: InteractionDirection;
  channel: InteractionChannel;
  subject?: string;
  notes?: string;
  outcome?: string;
  sentiment?: InteractionSentiment;
  relatedCampaignId?: string;
  occurredAt: Date;
  durationMinutes?: number;
  attachments?: Record<string, any>;
  externalLinks?: string[];
  organizationId: string;
}

export interface UpdateInteractionInput {
  subject?: string;
  notes?: string;
  outcome?: string;
  sentiment?: InteractionSentiment;
  occurredAt?: Date;
  durationMinutes?: number;
}

// =====================================================
// CONTACT RELATIONSHIP
// =====================================================

export interface ContactRelationship {
  id: string;
  contactId: string;
  userId: string;

  // Relationship Details
  relationshipType: RelationshipType;
  notes: string | null;

  // Strength Metrics
  strengthScore: number;
  interactionCount: number;
  lastInteractionAt: Date | null;

  // Status
  isActive: boolean;
  priorityLevel: number;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRelationshipInput {
  contactId: string;
  relationshipType: RelationshipType;
  notes?: string;
  priorityLevel?: number;
  organizationId: string;
}

export interface UpdateRelationshipInput {
  relationshipType?: RelationshipType;
  notes?: string;
  priorityLevel?: number;
  isActive?: boolean;
}

// =====================================================
// FOLLOW UP
// =====================================================

export interface FollowUp {
  id: string;
  contactId: string;
  interactionId: string | null;

  // Follow-up Details
  title: string;
  notes: string | null;
  dueDate: Date;
  priority: FollowUpPriority;
  status: FollowUpStatus;

  // Completion
  completedAt: Date | null;
  completionNotes: string | null;

  // Reminders
  reminderSent: boolean;
  reminderSentAt: Date | null;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFollowUpInput {
  contactId: string;
  interactionId?: string;
  title: string;
  notes?: string;
  dueDate: Date;
  priority?: FollowUpPriority;
  organizationId: string;
}

export interface UpdateFollowUpInput {
  title?: string;
  notes?: string;
  dueDate?: Date;
  priority?: FollowUpPriority;
  status?: FollowUpStatus;
  completionNotes?: string;
}

// =====================================================
// VIEWS
// =====================================================

export interface RecentActivityView {
  userId: string;
  contactId: string;
  contactName: string;
  outlet: string | null;
  interactionType: InteractionType;
  direction: InteractionDirection;
  channel: InteractionChannel;
  occurredAt: Date;
  sentiment: InteractionSentiment | null;
  organizationId: string;
}

export interface RelationshipStrengthView {
  userId: string;
  contactId: string;
  contactName: string;
  tier: string;
  outlet: string | null;
  relationshipType: RelationshipType;
  strengthScore: number;
  interactionCount: number;
  lastInteractionAt: Date | null;
  priorityLevel: number;
  isActive: boolean;
  relationshipTemperature: RelationshipTemperature;
  organizationId: string;
}

export interface OverdueFollowUpView {
  id: string;
  contactId: string;
  contactName: string;
  title: string;
  dueDate: Date;
  priority: FollowUpPriority;
  createdBy: string;
  daysOverdue: number;
  organizationId: string;
}

// =====================================================
// CRM STATS
// =====================================================

export interface UserCRMStats {
  totalRelationships: number;
  hotRelationships: number;
  warmRelationships: number;
  coolRelationships: number;
  coldRelationships: number;
  interactionsThisWeek: number;
  interactionsThisMonth: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  avgStrengthScore: number;
}

// =====================================================
// INTERACTION SUMMARY
// =====================================================

export interface InteractionSummary {
  totalInteractions: number;
  byType: Record<InteractionType, number>;
  byChannel: Record<InteractionChannel, number>;
  bySentiment: Record<InteractionSentiment, number>;
  byDirection: Record<InteractionDirection, number>;
  recentInteractions: ContactInteraction[];
}
