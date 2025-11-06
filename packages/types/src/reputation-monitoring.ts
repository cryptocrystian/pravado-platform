// =====================================================
// REPUTATION MONITORING TYPES
// =====================================================

export enum MentionType {
  BRAND = 'BRAND',
  COMPETITOR = 'COMPETITOR',
  INDUSTRY = 'INDUSTRY',
  TOPIC = 'TOPIC',
}

export enum Medium {
  NEWS = 'NEWS',
  BLOG = 'BLOG',
  FORUM = 'FORUM',
  SOCIAL = 'SOCIAL',
  PODCAST = 'PODCAST',
  VIDEO = 'VIDEO',
}

export enum MentionSentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  MIXED = 'MIXED',
}

export enum AlertChannel {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
}

export enum EntityType {
  BRAND = 'BRAND',
  COMPETITOR = 'COMPETITOR',
  TOPIC = 'TOPIC',
  PERSON = 'PERSON',
  PRODUCT = 'PRODUCT',
}

export enum FeedbackType {
  RELEVANT = 'RELEVANT',
  IRRELEVANT = 'IRRELEVANT',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  SPAM = 'SPAM',
}

export enum AlertFrequency {
  IMMEDIATE = 'IMMEDIATE',
  HOURLY = 'HOURLY',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
}

export enum MentionTone {
  PROFESSIONAL = 'PROFESSIONAL',
  CASUAL = 'CASUAL',
  FORMAL = 'FORMAL',
  TECHNICAL = 'TECHNICAL',
  PROMOTIONAL = 'PROMOTIONAL',
}

export enum MentionStance {
  SUPPORTIVE = 'SUPPORTIVE',
  NEUTRAL = 'NEUTRAL',
  CRITICAL = 'CRITICAL',
  BALANCED = 'BALANCED',
}

export enum MentionEmotion {
  JOY = 'JOY',
  TRUST = 'TRUST',
  FEAR = 'FEAR',
  SURPRISE = 'SURPRISE',
  SADNESS = 'SADNESS',
  ANGER = 'ANGER',
  NEUTRAL = 'NEUTRAL',
}

// =====================================================
// DETECTED ENTITIES
// =====================================================

export interface DetectedEntities {
  brands?: string[];
  competitors?: string[];
  products?: string[];
  people?: string[];
  locations?: string[];
  organizations?: string[];
}

export interface EntityTag {
  text: string;
  type: string;
  confidence: number;
}

// =====================================================
// MEDIA MENTION
// =====================================================

export interface MediaMention {
  id: string;

  // Source Information
  sourceUrl: string;
  title: string;
  excerpt: string | null;
  fullContent: string | null;
  publishedAt: Date;

  // Author & Outlet
  author: string | null;
  outlet: string | null;
  outletDomain: string | null;

  // Classification
  topics: string[];
  mentionType: MentionType;
  medium: Medium;

  // NLP Analysis Results
  sentiment: MentionSentiment | null;
  sentimentScore: number | null; // -1.0 to 1.0
  tone: MentionTone | null;
  stance: MentionStance | null;
  emotion: MentionEmotion | null;

  // Relevance & Visibility
  relevanceScore: number;
  visibilityScore: number;
  viralityScore: number;
  isViral: boolean;

  // Entity Extraction
  detectedEntities: DetectedEntities | null;
  entityTags: string[];

  // Engagement Metrics
  shareCount: number;
  commentCount: number;
  reachEstimate: number | null;

  // Vector Embedding
  contentEmbedding: number[] | null;

  // NLP Processing
  nlpProcessed: boolean;
  nlpProcessedAt: Date | null;
  nlpConfidenceScore: number | null;
  nlpTokensUsed: number | null;

  // Deduplication
  contentHash: string | null;
  isDuplicate: boolean;
  originalMentionId: string | null;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMentionInput {
  sourceUrl: string;
  title: string;
  excerpt?: string;
  fullContent?: string;
  publishedAt: Date;
  author?: string;
  outlet?: string;
  outletDomain?: string;
  topics?: string[];
  mentionType: MentionType;
  medium: Medium;
  organizationId: string;
}

export interface UpdateMentionInput {
  sentiment?: MentionSentiment;
  sentimentScore?: number;
  tone?: MentionTone;
  stance?: MentionStance;
  emotion?: MentionEmotion;
  relevanceScore?: number;
  visibilityScore?: number;
  viralityScore?: number;
  detectedEntities?: DetectedEntities;
  entityTags?: string[];
  contentEmbedding?: number[];
  nlpProcessed?: boolean;
  nlpConfidenceScore?: number;
  nlpTokensUsed?: number;
}

// =====================================================
// MONITORING RULE
// =====================================================

export interface MonitoringRule {
  id: string;

  // Rule Configuration
  name: string;
  description: string | null;

  // Query Terms
  queryTerms: string[];
  entityType: EntityType;

  // Filters
  mentionTypes: MentionType[] | null;
  mediums: Medium[] | null;
  minRelevanceScore: number | null;
  minVisibilityScore: number | null;

  // Alert Configuration
  alertChannel: AlertChannel;
  alertFrequency: AlertFrequency;
  thresholdScore: number;

  // Alert Recipients
  alertEmail: string | null;
  alertWebhookUrl: string | null;
  alertSlackChannel: string | null;

  // Rule Status
  isActive: boolean;
  lastTriggeredAt: Date | null;
  triggerCount: number;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMonitoringRuleInput {
  name: string;
  description?: string;
  queryTerms: string[];
  entityType: EntityType;
  mentionTypes?: MentionType[];
  mediums?: Medium[];
  minRelevanceScore?: number;
  minVisibilityScore?: number;
  alertChannel: AlertChannel;
  alertFrequency?: AlertFrequency;
  thresholdScore?: number;
  alertEmail?: string;
  alertWebhookUrl?: string;
  alertSlackChannel?: string;
  organizationId: string;
}

export interface UpdateMonitoringRuleInput {
  name?: string;
  description?: string;
  queryTerms?: string[];
  mentionTypes?: MentionType[];
  mediums?: Medium[];
  minRelevanceScore?: number;
  minVisibilityScore?: number;
  alertChannel?: AlertChannel;
  alertFrequency?: AlertFrequency;
  thresholdScore?: number;
  alertEmail?: string;
  alertWebhookUrl?: string;
  alertSlackChannel?: string;
  isActive?: boolean;
}

// =====================================================
// MENTION ALERT
// =====================================================

export interface MentionAlert {
  id: string;

  // Relations
  ruleId: string;
  mentionId: string;

  // Alert Details
  alertChannel: AlertChannel;
  triggeredAt: Date;

  // Delivery Status
  wasDelivered: boolean;
  deliveredAt: Date | null;
  deliveryError: string | null;
  retryCount: number;

  // Alert Content
  alertTitle: string | null;
  alertMessage: string | null;

  // User Interaction
  wasViewed: boolean;
  viewedAt: Date | null;
  wasDismissed: boolean;
  dismissedAt: Date | null;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertInput {
  ruleId: string;
  mentionId: string;
  alertChannel: AlertChannel;
  alertTitle?: string;
  alertMessage?: string;
  organizationId: string;
}

// =====================================================
// MENTION FEEDBACK
// =====================================================

export interface MentionFeedback {
  id: string;
  mentionId: string;
  userId: string;
  feedbackType: FeedbackType;
  comment: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitFeedbackInput {
  mentionId: string;
  feedbackType: FeedbackType;
  comment?: string;
  organizationId: string;
}

// =====================================================
// MONITORING SNAPSHOT
// =====================================================

export interface MonitoringSnapshot {
  id: string;

  // Snapshot Metadata
  organizationId: string;
  snapshotDate: Date;
  snapshotType: string; // 'DAILY', 'WEEKLY', 'MONTHLY'

  // Overall Metrics
  totalMentions: number;
  brandMentions: number;
  competitorMentions: number;
  industryMentions: number;

  // Sentiment Analysis
  avgSentiment: number | null;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;

  // Visibility & Engagement
  avgVisibilityScore: number | null;
  avgViralityScore: number | null;
  totalReachEstimate: number;
  viralMentions: number;

  // Top Sources & Keywords
  topSources: Array<{ outlet: string; count: number }> | null;
  topKeywords: string[];
  topEntities: DetectedEntities | null;

  // Medium Breakdown
  byMedium: Record<Medium, number> | null;

  // Trend Indicators
  mentionsChangePct: number | null;
  sentimentChangePct: number | null;

  // Audit
  createdAt: Date;
}

// =====================================================
// FILTERS & QUERY PARAMS
// =====================================================

export interface MentionFilters {
  mentionType?: MentionType[];
  medium?: Medium[];
  sentiment?: MentionSentiment[];
  minRelevance?: number;
  minVisibility?: number;
  isViral?: boolean;
  startDate?: Date;
  endDate?: Date;
  outlet?: string;
  topics?: string[];
  searchQuery?: string;
}

export interface MentionSearchParams extends MentionFilters {
  limit?: number;
  offset?: number;
  sortBy?: 'publishedAt' | 'relevanceScore' | 'visibilityScore' | 'viralityScore';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// TRENDS & ANALYTICS
// =====================================================

export interface MentionTrend {
  date: string;
  totalMentions: number;
  brandMentions: number;
  competitorMentions: number;
  avgSentiment: number;
  avgVisibility: number;
  avgVirality: number;
}

export interface MentionTrendsResponse {
  trends: MentionTrend[];
  startDate: Date;
  endDate: Date;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
}

export interface MediumBreakdown {
  NEWS: number;
  BLOG: number;
  FORUM: number;
  SOCIAL: number;
  PODCAST: number;
  VIDEO: number;
}

export interface MonitoringStats {
  totalMentions: number;
  mentionsByType: Record<MentionType, number>;
  mentionsByMedium: MediumBreakdown;
  sentimentBreakdown: SentimentBreakdown;
  avgRelevanceScore: number;
  avgVisibilityScore: number;
  avgViralityScore: number;
  viralMentionsCount: number;
  topOutlets: Array<{ outlet: string; count: number }>;
  topKeywords: string[];
}

// =====================================================
// NLP ANALYSIS RESULT
// =====================================================

export interface NLPAnalysisResult {
  sentiment: MentionSentiment;
  sentimentScore: number;
  tone: MentionTone;
  stance: MentionStance;
  emotion: MentionEmotion;
  relevanceScore: number;
  visibilityScore: number;
  viralityScore: number;
  detectedEntities: DetectedEntities;
  entityTags: string[];
  confidenceScore: number;
  tokensUsed: number;
}

// =====================================================
// SIMILAR MENTION
// =====================================================

export interface SimilarMention {
  mention: MediaMention;
  similarityScore: number;
}

// =====================================================
// ALERT DELIVERY
// =====================================================

export interface AlertDeliveryResult {
  success: boolean;
  channel: AlertChannel;
  deliveredAt?: Date;
  error?: string;
}
