// =====================================================
// PR CAMPAIGN TYPES
// =====================================================
// Types for PR campaign management, press releases, and pitch tracking

import { ContactTier } from './contact';
import { CampaignStatus } from './campaign';

export enum PressReleaseStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED',
}

export enum InteractionType {
  PITCH_SENT = 'PITCH_SENT',
  EMAIL_OPENED = 'EMAIL_OPENED',
  LINK_CLICKED = 'LINK_CLICKED',
  REPLIED = 'REPLIED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  COVERAGE_RECEIVED = 'COVERAGE_RECEIVED',
  DECLINED = 'DECLINED',
  BOUNCED = 'BOUNCED',
}

// =====================================================
// PR CAMPAIGN
// =====================================================

export interface PRCampaign {
  id: string;

  // Basic Info
  title: string;
  description: string | null;
  goal: string | null;

  // Status & Timeline
  status: CampaignStatus;
  startDate: Date | null;
  endDate: Date | null;

  // Metrics & KPIs
  targetImpressions: number | null;
  targetCoveragePieces: number | null;
  targetEngagementRate: number | null;
  metrics: Record<string, unknown>;

  // Budget
  budget: number | null;
  currency: string;

  // Notes
  notes: string | null;
  internalNotes: string | null;

  // Organization & Team
  organizationId: string;
  teamId: string | null;
  ownerId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreatePRCampaignInput {
  title: string;
  description?: string;
  goal?: string;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  targetImpressions?: number;
  targetCoveragePieces?: number;
  targetEngagementRate?: number;
  budget?: number;
  currency?: string;
  notes?: string;
  internalNotes?: string;
  teamId?: string;
  organizationId: string;
}

export interface UpdatePRCampaignInput {
  title?: string;
  description?: string;
  goal?: string;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  targetImpressions?: number;
  targetCoveragePieces?: number;
  targetEngagementRate?: number;
  budget?: number;
  currency?: string;
  notes?: string;
  internalNotes?: string;
  teamId?: string;
}

// =====================================================
// PRESS RELEASE
// =====================================================

export interface PressRelease {
  id: string;

  // Association
  campaignId: string | null;

  // Content
  title: string;
  slug: string;
  subtitle: string | null;
  bodyMd: string;
  bodyHtml: string | null;

  // AI-Generated Content
  aiSummary: string | null;
  aiHeadlineVariants: string[];
  keyMessages: string[];

  // SEO & Metadata
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];

  // Status & Timeline
  status: PressReleaseStatus;
  embargoDate: Date | null;
  publishedAt: Date | null;
  sentAt: Date | null;

  // Targeting
  targetContactIds: string[];
  targetTiers: ContactTier[];
  targetTopics: string[];
  targetRegions: string[];

  // Targeting Configuration
  targetingScoreThreshold: number;

  // Attachments
  attachments: PressReleaseAttachment[];

  // Distribution Channels
  distributionChannels: string[];

  // Metrics
  pitchCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
  coverageCount: number;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PressReleaseAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface CreatePressReleaseInput {
  campaignId?: string;
  title: string;
  subtitle?: string;
  bodyMd: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  status?: PressReleaseStatus;
  embargoDate?: Date;
  targetContactIds?: string[];
  targetTiers?: ContactTier[];
  targetTopics?: string[];
  targetRegions?: string[];
  targetingScoreThreshold?: number;
  attachments?: PressReleaseAttachment[];
  distributionChannels?: string[];
  organizationId: string;
}

export interface UpdatePressReleaseInput {
  campaignId?: string;
  title?: string;
  subtitle?: string;
  bodyMd?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  status?: PressReleaseStatus;
  embargoDate?: Date;
  targetContactIds?: string[];
  targetTiers?: ContactTier[];
  targetTopics?: string[];
  targetRegions?: string[];
  targetingScoreThreshold?: number;
  attachments?: PressReleaseAttachment[];
  distributionChannels?: string[];
}

// =====================================================
// CAMPAIGN INTERACTION
// =====================================================

export interface CampaignInteraction {
  id: string;

  // Relations
  campaignId: string;
  pressReleaseId: string | null;
  contactId: string;

  // Interaction Details
  interactionType: InteractionType;
  channel: string | null;

  // Pitch Content
  pitchSubject: string | null;
  pitchBody: string | null;
  personalizationData: Record<string, unknown>;

  // Engagement Tracking
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  repliedAt: Date | null;

  // Response
  responseSentiment: string | null;
  responseText: string | null;
  notes: string | null;

  // Coverage
  coverageUrl: string | null;
  coverageTitle: string | null;
  coveragePublishedAt: Date | null;

  // Metadata
  metadata: Record<string, unknown>;

  // Organization
  organizationId: string;
  userId: string | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignInteractionInput {
  campaignId: string;
  pressReleaseId?: string;
  contactId: string;
  interactionType: InteractionType;
  channel?: string;
  pitchSubject?: string;
  pitchBody?: string;
  personalizationData?: Record<string, unknown>;
  sentAt?: Date;
  notes?: string;
  organizationId: string;
}

export interface UpdateCampaignInteractionInput {
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  responseSentiment?: string;
  responseText?: string;
  notes?: string;
  coverageUrl?: string;
  coverageTitle?: string;
  coveragePublishedAt?: Date;
  metadata?: Record<string, unknown>;
}

// =====================================================
// PITCH TEMPLATE
// =====================================================

export interface PitchTemplate {
  id: string;

  // Template Info
  name: string;
  description: string | null;
  templateType: string | null;

  // Template Content
  subjectTemplate: string;
  bodyTemplate: string;

  // Variables
  availableVariables: string[];

  // AI Generation
  aiPrompt: string | null;

  // Usage Stats
  usageCount: number;
  avgOpenRate: number | null;
  avgReplyRate: number | null;

  // Categorization
  tags: string[];
  isDefault: boolean;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreatePitchTemplateInput {
  name: string;
  description?: string;
  templateType?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  availableVariables?: string[];
  aiPrompt?: string;
  tags?: string[];
  isDefault?: boolean;
  organizationId: string;
}

export interface UpdatePitchTemplateInput {
  name?: string;
  description?: string;
  templateType?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  availableVariables?: string[];
  aiPrompt?: string;
  tags?: string[];
  isDefault?: boolean;
}

// =====================================================
// TARGETING & AI
// =====================================================

export interface RecommendedTarget {
  contactId: string;
  contactName: string;
  contactOutlet: string | null;
  contactTier: ContactTier;
  matchScore: number;
  matchReasons: string[];
}

export interface GeneratedPitch {
  subject: string;
  body: string;
  personalizationData: Record<string, unknown>;
  confidence: number;
}

// =====================================================
// STATISTICS & METRICS
// =====================================================

export interface CampaignStats {
  totalReleases: number;
  totalPitches: number;
  totalOpens: number;
  totalClicks: number;
  totalReplies: number;
  totalCoverage: number;
  openRate: number;
  replyRate: number;
  coverageRate: number;
}

export interface PressReleaseStats {
  pitchCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
  coverageCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  coverageRate: number;
  topContacts: Array<{
    contactId: string;
    contactName: string;
    interactionCount: number;
    lastInteraction: Date;
  }>;
}
