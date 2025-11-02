// =====================================================
// CONTENT & SEO TYPES
// =====================================================

export enum ContentType {
  BLOG_POST = 'BLOG_POST',
  PRESS_RELEASE = 'PRESS_RELEASE',
  SOCIAL_POST = 'SOCIAL_POST',
  EMAIL = 'EMAIL',
  LANDING_PAGE = 'LANDING_PAGE',
  VIDEO_SCRIPT = 'VIDEO_SCRIPT',
  WHITEPAPER = 'WHITEPAPER',
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// New content statuses for content planning
export enum ContentItemStatus {
  IDEA = 'IDEA',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContentFormat {
  BLOG = 'BLOG',
  VIDEO = 'VIDEO',
  SOCIAL = 'SOCIAL',
  PODCAST = 'PODCAST',
  INFOGRAPHIC = 'INFOGRAPHIC',
  WHITEPAPER = 'WHITEPAPER',
  CASE_STUDY = 'CASE_STUDY',
  EMAIL = 'EMAIL',
  LANDING_PAGE = 'LANDING_PAGE',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskType {
  WRITE = 'WRITE',
  EDIT = 'EDIT',
  IMAGE = 'IMAGE',
  SEO = 'SEO',
  REVIEW = 'REVIEW',
  PUBLISH = 'PUBLISH',
  PROMOTE = 'PROMOTE',
}

export enum ContentChannel {
  WEBSITE = 'WEBSITE',
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  EMAIL = 'EMAIL',
  MEDIUM = 'MEDIUM',
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  channels: ContentChannel[];
  content: string;
  summary: string | null;
  campaignId: string | null;
  authorId: string;
  publishedAt: Date | null;
  scheduledFor: Date | null;
  metadata: ContentMetadata;
  seoData: SEOData | null;
  agentGenerated: boolean;
  agentTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentMetadata {
  wordCount: number;
  readingTime: number;
  tags: string[];
  targetAudience: string[];
  tone: string;
  customFields: Record<string, unknown>;
}

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  canonicalUrl: string | null;
  focusKeyword: string | null;
  readabilityScore: number | null;
  seoScore: number | null;
}

export type CreateContentInput = Pick<
  ContentItem,
  'title' | 'type' | 'content' | 'channels' | 'campaignId' | 'authorId'
> & {
  summary?: string;
  scheduledFor?: Date;
  metadata?: Partial<ContentMetadata>;
  seoData?: Partial<SEOData>;
};

export type UpdateContentInput = Partial<
  Pick<
    ContentItem,
    'title' | 'content' | 'summary' | 'status' | 'channels' | 'scheduledFor' | 'publishedAt'
  >
> & {
  metadata?: Partial<ContentMetadata>;
  seoData?: Partial<SEOData>;
};

// =====================================================
// KEYWORD CLUSTERS
// =====================================================

export interface KeywordCluster {
  id: string;
  name: string;
  description: string | null;
  clusterKeywords: string[];
  primaryKeyword: string | null;
  searchVolume: number;
  difficultyScore: number | null;
  recommendedTopics: string[];
  contentGaps: string[];
  avgCpc: number | null;
  competitionLevel: string | null;
  trendDirection: string | null;
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateKeywordClusterInput {
  name: string;
  description?: string;
  clusterKeywords: string[];
  primaryKeyword?: string;
  searchVolume?: number;
  difficultyScore?: number;
  recommendedTopics?: string[];
  contentGaps?: string[];
  avgCpc?: number;
  competitionLevel?: string;
  trendDirection?: string;
  organizationId: string;
}

export interface UpdateKeywordClusterInput {
  name?: string;
  description?: string;
  clusterKeywords?: string[];
  primaryKeyword?: string;
  searchVolume?: number;
  difficultyScore?: number;
  recommendedTopics?: string[];
  contentGaps?: string[];
  avgCpc?: number;
  competitionLevel?: string;
  trendDirection?: string;
}

// =====================================================
// CONTENT ITEMS (New Schema)
// =====================================================

export interface ContentItemNew {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyMd: string | null;
  bodyHtml: string | null;
  status: ContentItemStatus;
  format: ContentFormat;
  scheduledDate: Date | null;
  publishedAt: Date | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  seoScore: number | null;
  readabilityScore: number | null;
  wordCount: number;
  keywordClusterId: string | null;
  strategyId: string | null;
  aiSummary: string | null;
  aiOutline: string[];
  aiKeywordsSuggested: string[];
  featuredImageUrl: string | null;
  attachments: ContentAttachment[];
  targetAudience: string | null;
  buyerStage: string | null;
  distributionChannels: string[];
  canonicalUrl: string | null;
  views: number;
  shares: number;
  engagementScore: number | null;
  organizationId: string;
  teamId: string | null;
  assignedTo: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ContentAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface CreateContentItemInput {
  title: string;
  slug?: string;
  excerpt?: string;
  bodyMd?: string;
  status?: ContentItemStatus;
  format: ContentFormat;
  scheduledDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  keywordClusterId?: string;
  strategyId?: string;
  featuredImageUrl?: string;
  attachments?: ContentAttachment[];
  targetAudience?: string;
  buyerStage?: string;
  distributionChannels?: string[];
  canonicalUrl?: string;
  teamId?: string;
  assignedTo?: string;
  organizationId: string;
}

export interface UpdateContentItemInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  bodyMd?: string;
  status?: ContentItemStatus;
  format?: ContentFormat;
  scheduledDate?: Date;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  seoScore?: number;
  readabilityScore?: number;
  keywordClusterId?: string;
  strategyId?: string;
  featuredImageUrl?: string;
  attachments?: ContentAttachment[];
  targetAudience?: string;
  buyerStage?: string;
  distributionChannels?: string[];
  canonicalUrl?: string;
  views?: number;
  shares?: number;
  engagementScore?: number;
  teamId?: string;
  assignedTo?: string;
}

// =====================================================
// CONTENT CALENDARS
// =====================================================

export interface ContentCalendar {
  id: string;
  month: number;
  year: number;
  contentItemIds: string[];
  theme: string | null;
  goals: string | null;
  notes: string | null;
  plannedItemsCount: number;
  completedItemsCount: number;
  completionRate: number | null;
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CalendarDay {
  date: Date;
  contentItems: ContentItemNew[];
}

export interface CreateContentCalendarInput {
  month: number;
  year: number;
  theme?: string;
  goals?: string;
  notes?: string;
  organizationId: string;
}

export interface UpdateContentCalendarInput {
  theme?: string;
  goals?: string;
  notes?: string;
}

// =====================================================
// SEO AUDITS
// =====================================================

export interface SEOAudit {
  id: string;
  url: string;
  title: string | null;
  auditScore: number | null;
  performanceScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  issues: SEOIssue[];
  suggestions: SEOSuggestion[];
  metaData: Record<string, unknown>;
  headings: Record<string, unknown>;
  imagesAnalyzed: number;
  linksAnalyzed: number;
  pageLoadTimeMs: number | null;
  pageSizeKb: number | null;
  totalRequests: number | null;
  primaryKeywords: string[];
  keywordDensity: Record<string, number>;
  missingKeywords: string[];
  wordCount: number | null;
  readabilityScore: number | null;
  contentQualityScore: number | null;
  backlinksCount: number | null;
  domainAuthority: number | null;
  pageAuthority: number | null;
  mobileFriendly: boolean | null;
  mobileIssues: SEOIssue[];
  auditType: string | null;
  auditedAt: Date;
  contentItemId: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface SEOIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
}

export interface SEOSuggestion {
  priority: 'high' | 'medium' | 'low';
  action: string;
  impact?: string;
}

export interface CreateSEOAuditInput {
  url: string;
  title?: string;
  contentItemId?: string;
  organizationId: string;
}

// =====================================================
// CONTENT TASKS
// =====================================================

export interface ContentTask {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  dueDate: Date | null;
  completedAt: Date | null;
  assignedTo: string | null;
  contentItemId: string;
  notes: string | null;
  attachments: ContentAttachment[];
  estimatedHours: number | null;
  actualHours: number | null;
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateContentTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  status?: TaskStatus;
  priority?: number;
  dueDate?: Date;
  assignedTo?: string;
  contentItemId: string;
  notes?: string;
  attachments?: ContentAttachment[];
  estimatedHours?: number;
  organizationId: string;
}

export interface UpdateContentTaskInput {
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: number;
  dueDate?: Date;
  completedAt?: Date;
  assignedTo?: string;
  notes?: string;
  attachments?: ContentAttachment[];
  estimatedHours?: number;
  actualHours?: number;
}

// =====================================================
// AI CONTENT GENERATION
// =====================================================

export interface GenerateContentIdeasInput {
  strategyId?: string;
  keywordClusterId?: string;
  format?: ContentFormat;
  count?: number;
  targetAudience?: string;
  buyerStage?: string;
}

export interface GeneratedContentIdea {
  title: string;
  slug: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  outline: string[];
  format: ContentFormat;
  confidence: number;
}

// =====================================================
// STATISTICS
// =====================================================

export interface ContentStats {
  totalContent: number;
  ideasCount: number;
  plannedCount: number;
  inProgressCount: number;
  completedCount: number;
  avgSeoScore: number | null;
  topPerforming: ContentPerformance[];
}

export interface ContentPerformance {
  id: string;
  title: string;
  views: number;
  engagementScore: number | null;
}
