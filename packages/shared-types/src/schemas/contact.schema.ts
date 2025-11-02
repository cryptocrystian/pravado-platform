import { z } from 'zod';
import {
  ContactTier,
  PitchMethod,
  ContactRole,
  EnrichmentStatus,
} from '../contact';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const ContactTierSchema = z.nativeEnum(ContactTier);
export const PitchMethodSchema = z.nativeEnum(PitchMethod);
export const ContactRoleSchema = z.nativeEnum(ContactRole);
export const EnrichmentStatusSchema = z.nativeEnum(EnrichmentStatus);

// =====================================================
// NESTED OBJECT SCHEMAS
// =====================================================

export const RecentArticleSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  publishedAt: z.coerce.date(),
  outlet: z.string().optional(),
});

// =====================================================
// CONTACT TAG SCHEMAS
// =====================================================

export const ContactTagSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable(), // Hex color validation
  usageCount: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateContactTagInputSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1, 'Tag name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code').optional(),
});

export const UpdateContactTagInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

// =====================================================
// CONTACT SCHEMAS
// =====================================================

export const ContactSchema = z.object({
  id: z.string().uuid(),

  // Basic Information
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().min(1).max(500),
  title: z.string().max(500).nullable(),
  email: z.string().email().max(500).nullable(),
  phone: z.string().max(50).nullable(),

  // Organization/Outlet Info
  outlet: z.string().max(500).nullable(),
  role: ContactRoleSchema,

  // Classification
  tier: ContactTierSchema,

  // Topics & Coverage
  topics: z.array(z.string()).default([]),

  // Geographic & Language
  regions: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),

  // Social & Professional Links
  linkedinUrl: z.string().url().max(500).nullable(),
  twitterUrl: z.string().url().max(500).nullable(),
  websiteUrl: z.string().url().max(500).nullable(),

  // Engagement Preferences
  preferredPitchMethod: PitchMethodSchema,

  // Tags
  tagIds: z.array(z.string().uuid()).default([]),

  // Enrichment Data
  bio: z.string().nullable(),
  followerCount: z.number().int().positive().nullable(),
  recentArticles: z.array(RecentArticleSchema).default([]),

  // Metadata
  source: z.string().max(100).nullable(),
  notes: z.string().nullable(),
  lastContactedAt: z.date().nullable(),

  // Custom Fields
  customFields: z.record(z.unknown()).default({}),

  // Audit
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const CreateContactInputSchema = z.object({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  fullName: z.string().min(1, 'Full name is required').max(500),
  title: z.string().max(500).optional(),
  email: z.string().email('Invalid email address').max(500).optional(),
  phone: z.string().max(50).optional(),
  outlet: z.string().max(500).optional(),
  role: ContactRoleSchema.default(ContactRole.JOURNALIST),
  tier: ContactTierSchema.default(ContactTier.TIER_3),
  topics: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').max(500).optional(),
  twitterUrl: z.string().url('Invalid Twitter URL').max(500).optional(),
  websiteUrl: z.string().url('Invalid website URL').max(500).optional(),
  preferredPitchMethod: PitchMethodSchema.default(PitchMethod.EMAIL),
  tagIds: z.array(z.string().uuid()).default([]),
  bio: z.string().optional(),
  source: z.string().max(100).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).default({}),
  organizationId: z.string().uuid(),
});

export const UpdateContactInputSchema = z.object({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  fullName: z.string().min(1).max(500).optional(),
  title: z.string().max(500).optional(),
  email: z.string().email().max(500).optional(),
  phone: z.string().max(50).optional(),
  outlet: z.string().max(500).optional(),
  role: ContactRoleSchema.optional(),
  tier: ContactTierSchema.optional(),
  topics: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().max(500).optional(),
  twitterUrl: z.string().url().max(500).optional(),
  websiteUrl: z.string().url().max(500).optional(),
  preferredPitchMethod: PitchMethodSchema.optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  bio: z.string().optional(),
  followerCount: z.number().int().positive().optional(),
  recentArticles: z.array(RecentArticleSchema).optional(),
  notes: z.string().optional(),
  lastContactedAt: z.coerce.date().optional(),
  customFields: z.record(z.unknown()).optional(),
});

// =====================================================
// SEARCH & FILTER SCHEMAS
// =====================================================

export const ContactFiltersSchema = z.object({
  search: z.string().optional(),
  tier: z.array(ContactTierSchema).optional(),
  topics: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  outlet: z.string().optional(),
  role: z.array(ContactRoleSchema).optional(),
  hasEmail: z.boolean().optional(),
  hasLinkedIn: z.boolean().optional(),
  hasTwitter: z.boolean().optional(),
});

export const ContactSearchParamsSchema = ContactFiltersSchema.extend({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['name', 'outlet', 'tier', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =====================================================
// ENRICHMENT SCHEMAS
// =====================================================

export const ContactEnrichmentJobSchema = z.object({
  id: z.string().uuid(),
  contactIds: z.array(z.string().uuid()),
  status: EnrichmentStatusSchema,
  organizationId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  result: z.object({
    enriched: z.array(z.string().uuid()),
    failed: z.array(z.string().uuid()),
    updates: z.record(z.unknown()),
  }).default({ enriched: [], failed: [], updates: {} }),
  errorMessage: z.string().nullable(),
  totalContacts: z.number().int().positive(),
  enrichedCount: z.number().int().default(0),
  failedCount: z.number().int().default(0),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  executionTimeMs: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TriggerEnrichmentInputSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact must be selected').max(100, 'Maximum 100 contacts can be enriched at once'),
  organizationId: z.string().uuid(),
});

export const EnrichmentResultSchema = z.object({
  contactId: z.string().uuid(),
  success: z.boolean(),
  updates: UpdateContactInputSchema.partial().optional(),
  error: z.string().optional(),
  source: z.string().optional(),
});

// =====================================================
// INTERACTION SCHEMAS
// =====================================================

export const ContactInteractionSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  interactionType: z.string().min(1).max(50),
  channel: z.string().max(50).nullable(),
  subject: z.string().nullable(),
  notes: z.string().nullable(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.date(),
});

export const CreateContactInteractionInputSchema = z.object({
  contactId: z.string().uuid(),
  interactionType: z.string().min(1, 'Interaction type is required').max(50),
  channel: z.string().max(50).optional(),
  subject: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.string().uuid(),
});

// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================

export const BulkUpdateContactsInputSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact must be selected'),
  updates: UpdateContactInputSchema,
});

export const BulkDeleteContactsInputSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact must be selected'),
});

export const ImportContactsInputSchema = z.object({
  contacts: z.array(CreateContactInputSchema).min(1, 'At least one contact must be provided'),
  source: z.string().default('import'),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

// Validate email uniqueness within organization
export const validateUniqueEmail = (email: string, organizationId: string) => {
  return z.string().email().refine(
    async (email) => {
      // This would check against database
      // Implementation in service layer
      return true;
    },
    { message: 'Email already exists in your contact database' }
  );
};

// Validate at least one contact method (email, phone, or social)
export const validateContactMethod = () => {
  return z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    linkedinUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
  }).refine(
    (data) => data.email || data.phone || data.linkedinUrl || data.twitterUrl,
    {
      message: 'At least one contact method (email, phone, LinkedIn, or Twitter) is required',
    }
  );
};
