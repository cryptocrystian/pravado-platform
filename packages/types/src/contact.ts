// =====================================================
// CONTACT TYPES
// =====================================================
// Types for media contact management system

import { ContactInteraction } from './crm';

export enum ContactTier {
  TIER_1 = '1', // Top-tier (major publications, high-reach influencers)
  TIER_2 = '2', // Mid-tier (niche publications, growing influencers)
  TIER_3 = '3', // Entry-tier (local/regional, micro-influencers)
  TIER_4 = '4', // Prospective/unverified
}

export enum PitchMethod {
  EMAIL = 'EMAIL',
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  PHONE = 'PHONE',
  PR_PLATFORM = 'PR_PLATFORM',
  NOT_SPECIFIED = 'NOT_SPECIFIED',
}

export enum ContactRole {
  JOURNALIST = 'JOURNALIST',
  EDITOR = 'EDITOR',
  REPORTER = 'REPORTER',
  COLUMNIST = 'COLUMNIST',
  PRODUCER = 'PRODUCER',
  BLOGGER = 'BLOGGER',
  INFLUENCER = 'INFLUENCER',
  PODCASTER = 'PODCASTER',
  ANALYST = 'ANALYST',
  OTHER = 'OTHER',
}

export enum EnrichmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

// Contact Tag
export interface ContactTag {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null; // Hex color
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Recent Article (stored in JSONB)
export interface RecentArticle {
  title: string;
  url: string;
  publishedAt: Date;
  outlet?: string;
}

// Main Contact Interface
export interface Contact {
  id: string;

  // Basic Information
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  title: string | null;
  email: string | null;
  phone: string | null;

  // Organization/Outlet Info
  outlet: string | null;
  role: ContactRole;

  // Classification
  tier: ContactTier;

  // Topics & Coverage
  topics: string[];

  // Geographic & Language
  regions: string[];
  languages: string[];

  // Social & Professional Links
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;

  // Engagement Preferences
  preferredPitchMethod: PitchMethod;

  // Tags
  tagIds: string[];

  // Enrichment Data
  bio: string | null;
  followerCount: number | null;
  recentArticles: RecentArticle[];

  // Metadata
  source: string | null; // 'import', 'manual', 'enrichment', etc.
  notes: string | null;
  lastContactedAt: Date | null;

  // Custom Fields (extensible)
  customFields: Record<string, unknown>;

  // Audit
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Contact with populated tags (for display)
export interface ContactWithTags extends Contact {
  tags: ContactTag[];
}

// Contact Enrichment Job
export interface ContactEnrichmentJob {
  id: string;

  // Job Details
  contactIds: string[];
  status: EnrichmentStatus;

  // Tracking
  organizationId: string;
  requestedBy: string;

  // Results
  result: {
    enriched: string[]; // Contact IDs successfully enriched
    failed: string[]; // Contact IDs that failed
    updates: Record<string, unknown>; // Map of contact ID to updates
  };
  errorMessage: string | null;

  // Metrics
  totalContacts: number;
  enrichedCount: number;
  failedCount: number;

  // Performance
  startedAt: Date | null;
  completedAt: Date | null;
  executionTimeMs: number | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// Input Types
export interface CreateContactInput {
  firstName?: string;
  lastName?: string;
  fullName: string;
  title?: string;
  email?: string;
  phone?: string;
  outlet?: string;
  role?: ContactRole;
  tier?: ContactTier;
  topics?: string[];
  regions?: string[];
  languages?: string[];
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  preferredPitchMethod?: PitchMethod;
  tagIds?: string[];
  bio?: string;
  source?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  organizationId: string;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  outlet?: string;
  role?: ContactRole;
  tier?: ContactTier;
  topics?: string[];
  regions?: string[];
  languages?: string[];
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  preferredPitchMethod?: PitchMethod;
  tagIds?: string[];
  bio?: string;
  followerCount?: number;
  recentArticles?: RecentArticle[];
  notes?: string;
  lastContactedAt?: Date;
  customFields?: Record<string, unknown>;
}

// Search & Filter Types
export interface ContactFilters {
  search?: string;
  tier?: ContactTier[];
  topics?: string[];
  regions?: string[];
  tagIds?: string[];
  outlet?: string;
  role?: ContactRole[];
  hasEmail?: boolean;
  hasLinkedIn?: boolean;
  hasTwitter?: boolean;
}

export interface ContactSearchParams extends ContactFilters {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'outlet' | 'tier' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContactSearchResult {
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
}

// Tag Input Types
export interface CreateContactTagInput {
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateContactTagInput {
  name?: string;
  description?: string;
  color?: string;
}

// Enrichment Input Types
export interface TriggerEnrichmentInput {
  contactIds: string[];
  organizationId: string;
}

// Enrichment Result
export interface EnrichmentResult {
  contactId: string;
  success: boolean;
  updates?: Partial<UpdateContactInput>;
  error?: string;
  source?: string; // 'clearbit', 'hunter', 'linkedin', etc.
}

// Contact Statistics
export interface ContactStats {
  total: number;
  byTier: Record<ContactTier, number>;
  byRole: Record<ContactRole, number>;
  enriched: number;
  withEmail: number;
  withSocial: number;
}
