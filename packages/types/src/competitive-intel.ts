// =====================================================
// COMPETITIVE INTELLIGENCE & MARKET TRACKER TYPES
// Sprint 33: Competitor tracking, market trends, AI insights
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Intel event type enum
 * Types of competitive intelligence events
 */
export enum IntelEventType {
  PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',       // New product or feature
  FUNDING = 'FUNDING',                     // Funding round
  HIRING = 'HIRING',                       // Hiring activity
  LAYOFF = 'LAYOFF',                       // Layoffs
  PARTNERSHIP = 'PARTNERSHIP',             // Partnership
  PR_CAMPAIGN = 'PR_CAMPAIGN',             // PR campaign
  SOCIAL_TRACTION = 'SOCIAL_TRACTION',     // Social media traction
  MENTION = 'MENTION',                     // Media mention
  LEGAL = 'LEGAL',                         // Legal issues
  OTHER = 'OTHER',                         // Other events
}

/**
 * Intel source type enum
 * Source of competitive intelligence
 */
export enum IntelSourceType {
  NEWS = 'NEWS',                   // News articles
  SOCIAL = 'SOCIAL',               // Social media
  RSS = 'RSS',                     // RSS feed
  USER_SUBMITTED = 'USER_SUBMITTED', // User submitted
  SYSTEM = 'SYSTEM',               // System detected
}

/**
 * Intel severity enum
 * Impact severity of competitive events
 */
export enum IntelSeverity {
  LOW = 'LOW',           // Minor impact
  MEDIUM = 'MEDIUM',     // Moderate impact
  HIGH = 'HIGH',         // Significant impact
  CRITICAL = 'CRITICAL', // Critical threat/opportunity
}

/**
 * Activity level enum
 */
export enum ActivityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Momentum enum
 */
export enum Momentum {
  RISING = 'rising',
  STABLE = 'stable',
  DECLINING = 'declining',
}

/**
 * Competitor priority enum
 */
export enum CompetitorPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Competitor
 * Company or product being tracked
 */
export interface Competitor {
  id: string;
  organizationId: string;

  // Competitor info
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;

  // Company details
  industry?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: string;
  fundingStage?: string;
  totalFundingUsd?: number;

  // Product info
  primaryProduct?: string;
  productCategories?: string[];
  targetMarket?: string;

  // Social media
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;

  // Tracking metadata
  isActive: boolean;
  priority: CompetitorPriority;
  addedBy?: string;

  // AI-generated insights
  positioningSummary?: string;
  strengths?: string[];
  weaknesses?: string[];
  threatsToUs?: string[];
  lastAnalyzedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Intel Event
 * Individual competitive intelligence event
 */
export interface IntelEvent {
  id: string;
  organizationId: string;
  competitorId: string;

  // Event details
  eventType: IntelEventType;
  severity: IntelSeverity;
  sourceType: IntelSourceType;

  // Content
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;

  // Metadata
  sourceName?: string;
  author?: string;
  publishedAt?: string;
  detectedAt: string;

  // Impact analysis
  impactScore?: number; // 0.00 to 1.00
  relevanceScore?: number; // 0.00 to 1.00
  actionRequired: boolean;
  actionNotes?: string;

  // AI insights
  aiSummary?: string;
  keyInsights?: string[];
  affectedCampaigns?: string[];

  // User tracking
  submittedBy?: string;
  isVerified: boolean;
  verifiedBy?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Intel Trend
 * Market trend or category insight
 */
export interface IntelTrend {
  id: string;
  organizationId: string;

  // Trend details
  trendName: string;
  category: string;
  description?: string;

  // Trend metrics
  momentum?: Momentum;
  growthRate?: number; // % growth
  marketSizeUsd?: number;

  // Time window
  periodStart: string;
  periodEnd: string;

  // Related data
  relatedCompetitors?: string[];
  relatedIntelEvents?: string[];
  keywords?: string[];

  // AI analysis
  opportunityScore?: number; // 0.00 to 1.00
  threatScore?: number; // 0.00 to 1.00
  strategicRecommendations?: string[];
  aiSummary?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Competitor Metrics
 * Aggregated metrics per competitor
 */
export interface CompetitorMetrics {
  id: string;
  organizationId: string;
  competitorId: string;

  // Time window
  periodStart: string;
  periodEnd: string;
  windowType: 'daily' | 'weekly' | 'monthly';

  // Event counts by type
  productLaunches: number;
  fundingEvents: number;
  hiringEvents: number;
  layoffEvents: number;
  partnerships: number;
  prCampaigns: number;
  socialMentions: number;
  mediaMentions: number;
  legalEvents: number;

  // Aggregate metrics
  totalEvents: number;
  averageSeverityScore?: number;
  averageImpactScore?: number;
  averageRelevanceScore?: number;

  // Activity indicators
  activityLevel: ActivityLevel;
  trendingUp: boolean;

  // Timestamps
  calculatedAt: string;
  createdAt: string;
}

/**
 * Competitor Profile
 * Enriched competitor data with events and metrics
 */
export interface CompetitorProfile {
  competitor: Competitor;
  recentEvents: IntelEvent[];
  metrics?: CompetitorMetrics;
}

/**
 * Market Trends Summary
 * Category-level market insights
 */
export interface MarketTrendsSummary {
  category: string;
  periodStart: string;
  periodEnd: string;
  trends: IntelTrend[];
  totalEvents: number;
  topCompetitors: Array<{
    competitorId: string;
    competitorName: string;
    eventCount: number;
  }>;
}

/**
 * Competitive Dashboard Data
 * Overview data for dashboard
 */
export interface CompetitiveDashboardData {
  periodStart: string;
  periodEnd: string;
  totalCompetitors: number;
  activeCompetitors: number;
  totalEvents: number;
  criticalEvents: number;
  topCompetitors: Array<{
    competitorId: string;
    competitorName: string;
    eventCount: number;
    criticalCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    competitorName: string;
    eventType: IntelEventType;
    title: string;
    detectedAt: string;
  }>;
  eventDistribution: Record<string, number>;
}

/**
 * GPT Competitor Analysis
 * AI-generated competitive analysis
 */
export interface GptCompetitorAnalysis {
  competitorId: string;
  competitorName: string;
  positioningSummary: string;
  strengths: string[];
  weaknesses: string[];
  threatsToUs: string[];
  opportunities: string[];
  strategicRecommendations: string[];
  keyTakeaways: string[];
  generatedAt: string;
}

/**
 * GPT Market Analysis
 * AI-generated market trend analysis
 */
export interface GptMarketAnalysis {
  category: string;
  summary: string;
  categoryMomentum: Momentum;
  keyTrends: string[];
  threats: string[];
  opportunities: string[];
  strategicRecommendations: string[];
  topMovers: Array<{
    competitorName: string;
    activity: string;
  }>;
  generatedAt: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Create Competitor Input
 */
export interface CreateCompetitorInput {
  organizationId?: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  industry?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: string;
  fundingStage?: string;
  totalFundingUsd?: number;
  primaryProduct?: string;
  productCategories?: string[];
  targetMarket?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  priority?: CompetitorPriority;
  addedBy?: string;
}

/**
 * Update Competitor Input
 */
export interface UpdateCompetitorInput {
  competitorId: string;
  name?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  industry?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: string;
  fundingStage?: string;
  totalFundingUsd?: number;
  primaryProduct?: string;
  productCategories?: string[];
  targetMarket?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  priority?: CompetitorPriority;
  isActive?: boolean;
}

/**
 * Log Intel Event Input
 */
export interface LogIntelEventInput {
  organizationId?: string;
  competitorId: string;
  eventType: IntelEventType;
  severity: IntelSeverity;
  sourceType: IntelSourceType;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  sourceName?: string;
  author?: string;
  publishedAt?: string;
  impactScore?: number;
  relevanceScore?: number;
  submittedBy?: string;
}

/**
 * Update Intel Event Input
 */
export interface UpdateIntelEventInput {
  eventId: string;
  title?: string;
  description?: string;
  severity?: IntelSeverity;
  impactScore?: number;
  relevanceScore?: number;
  actionRequired?: boolean;
  actionNotes?: string;
  aiSummary?: string;
  keyInsights?: string[];
  affectedCampaigns?: string[];
  isVerified?: boolean;
}

/**
 * Create Trend Input
 */
export interface CreateTrendInput {
  organizationId?: string;
  trendName: string;
  category: string;
  description?: string;
  momentum?: Momentum;
  growthRate?: number;
  marketSizeUsd?: number;
  periodStart: string;
  periodEnd: string;
  relatedCompetitors?: string[];
  relatedIntelEvents?: string[];
  keywords?: string[];
}

/**
 * Calculate Metrics Input
 */
export interface CalculateCompetitorMetricsInput {
  organizationId: string;
  competitorId: string;
  periodStart: string;
  periodEnd: string;
  windowType?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Get Competitors Input
 */
export interface GetCompetitorsInput {
  organizationId: string;
  isActive?: boolean;
  priority?: CompetitorPriority;
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Intel Feed Input
 */
export interface GetIntelFeedInput {
  organizationId: string;
  competitorId?: string;
  eventTypes?: IntelEventType[];
  severity?: IntelSeverity;
  sourceType?: IntelSourceType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Trends Input
 */
export interface GetTrendsInput {
  organizationId: string;
  category?: string;
  periodStart?: string;
  periodEnd?: string;
  limit?: number;
  offset?: number;
}

/**
 * Summarize Competitor Input
 */
export interface SummarizeCompetitorInput {
  organizationId: string;
  competitorId: string;
  includeRecent?: boolean;
}

/**
 * Summarize Market Input
 */
export interface SummarizeMarketInput {
  organizationId: string;
  category: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Get Dashboard Input
 */
export interface GetDashboardInput {
  organizationId: string;
  periodStart?: string;
  periodEnd?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Get Competitors Response
 */
export interface GetCompetitorsResponse {
  success: boolean;
  competitors?: Competitor[];
  total?: number;
  error?: string;
}

/**
 * Get Competitor Response
 */
export interface GetCompetitorResponse {
  success: boolean;
  competitor?: Competitor;
  error?: string;
}

/**
 * Get Intel Feed Response
 */
export interface GetIntelFeedResponse {
  success: boolean;
  events?: IntelEvent[];
  total?: number;
  error?: string;
}

/**
 * Get Trends Response
 */
export interface GetTrendsResponse {
  success: boolean;
  trends?: IntelTrend[];
  total?: number;
  error?: string;
}

/**
 * Get Metrics Response
 */
export interface GetMetricsResponse {
  success: boolean;
  metrics?: CompetitorMetrics[];
  total?: number;
  error?: string;
}

/**
 * Summarize Competitor Response
 */
export interface SummarizeCompetitorResponse {
  success: boolean;
  analysis?: GptCompetitorAnalysis;
  profile?: CompetitorProfile;
  error?: string;
}

/**
 * Summarize Market Response
 */
export interface SummarizeMarketResponse {
  success: boolean;
  analysis?: GptMarketAnalysis;
  summary?: MarketTrendsSummary;
  error?: string;
}

/**
 * Get Dashboard Response
 */
export interface GetDashboardResponse {
  success: boolean;
  data?: CompetitiveDashboardData;
  error?: string;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

/**
 * Event Type Configuration
 */
export interface EventTypeConfig {
  type: IntelEventType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: 'product' | 'financial' | 'organizational' | 'marketing' | 'legal';
}

/**
 * Source Type Configuration
 */
export interface SourceTypeConfig {
  type: IntelSourceType;
  label: string;
  icon: string;
  color: string;
}

/**
 * Intelligence Severity Configuration
 */
export interface IntelSeverityConfig {
  severity: IntelSeverity;
  label: string;
  color: string;
  icon: string;
}

/**
 * Activity Level Configuration
 */
export interface ActivityLevelConfig {
  level: ActivityLevel;
  label: string;
  color: string;
  minEvents: number;
}

// =====================================================
// CONSTANTS
// =====================================================

export const INTEL_EVENT_TYPE_CONFIGS: Record<IntelEventType, EventTypeConfig> = {
  [IntelEventType.PRODUCT_LAUNCH]: {
    type: IntelEventType.PRODUCT_LAUNCH,
    label: 'Product Launch',
    description: 'New product or feature announcement',
    icon: 'rocket',
    color: '#3B82F6', // blue-500
    category: 'product',
  },
  [IntelEventType.FUNDING]: {
    type: IntelEventType.FUNDING,
    label: 'Funding Round',
    description: 'Investment or funding announcement',
    icon: 'dollar-sign',
    color: '#10B981', // green-500
    category: 'financial',
  },
  [IntelEventType.HIRING]: {
    type: IntelEventType.HIRING,
    label: 'Hiring Activity',
    description: 'Significant hiring or team expansion',
    icon: 'user-plus',
    color: '#8B5CF6', // purple-500
    category: 'organizational',
  },
  [IntelEventType.LAYOFF]: {
    type: IntelEventType.LAYOFF,
    label: 'Layoffs',
    description: 'Layoffs or workforce reduction',
    icon: 'user-minus',
    color: '#EF4444', // red-500
    category: 'organizational',
  },
  [IntelEventType.PARTNERSHIP]: {
    type: IntelEventType.PARTNERSHIP,
    label: 'Partnership',
    description: 'Strategic partnership announcement',
    icon: 'handshake',
    color: '#F59E0B', // amber-500
    category: 'organizational',
  },
  [IntelEventType.PR_CAMPAIGN]: {
    type: IntelEventType.PR_CAMPAIGN,
    label: 'PR Campaign',
    description: 'Major PR or marketing campaign',
    icon: 'megaphone',
    color: '#EC4899', // pink-500
    category: 'marketing',
  },
  [IntelEventType.SOCIAL_TRACTION]: {
    type: IntelEventType.SOCIAL_TRACTION,
    label: 'Social Traction',
    description: 'Viral social media activity',
    icon: 'trending-up',
    color: '#06B6D4', // cyan-500
    category: 'marketing',
  },
  [IntelEventType.MENTION]: {
    type: IntelEventType.MENTION,
    label: 'Media Mention',
    description: 'Press or media coverage',
    icon: 'newspaper',
    color: '#6366F1', // indigo-500
    category: 'marketing',
  },
  [IntelEventType.LEGAL]: {
    type: IntelEventType.LEGAL,
    label: 'Legal Issue',
    description: 'Legal issues or disputes',
    icon: 'gavel',
    color: '#991B1B', // red-800
    category: 'legal',
  },
  [IntelEventType.OTHER]: {
    type: IntelEventType.OTHER,
    label: 'Other Event',
    description: 'Other competitive activity',
    icon: 'info',
    color: '#6B7280', // gray-500
    category: 'product',
  },
};

export const INTEL_SOURCE_TYPE_CONFIGS: Record<IntelSourceType, SourceTypeConfig> = {
  [IntelSourceType.NEWS]: {
    type: IntelSourceType.NEWS,
    label: 'News',
    icon: 'newspaper',
    color: '#3B82F6', // blue-500
  },
  [IntelSourceType.SOCIAL]: {
    type: IntelSourceType.SOCIAL,
    label: 'Social Media',
    icon: 'share-2',
    color: '#EC4899', // pink-500
  },
  [IntelSourceType.RSS]: {
    type: IntelSourceType.RSS,
    label: 'RSS Feed',
    icon: 'rss',
    color: '#F59E0B', // amber-500
  },
  [IntelSourceType.USER_SUBMITTED]: {
    type: IntelSourceType.USER_SUBMITTED,
    label: 'User Submitted',
    icon: 'user',
    color: '#8B5CF6', // purple-500
  },
  [IntelSourceType.SYSTEM]: {
    type: IntelSourceType.SYSTEM,
    label: 'System',
    icon: 'cpu',
    color: '#6B7280', // gray-500
  },
};

export const INTEL_SEVERITY_CONFIGS: Record<IntelSeverity, IntelSeverityConfig> = {
  [IntelSeverity.LOW]: {
    severity: IntelSeverity.LOW,
    label: 'Low',
    color: '#10B981', // green-500
    icon: 'info',
  },
  [IntelSeverity.MEDIUM]: {
    severity: IntelSeverity.MEDIUM,
    label: 'Medium',
    color: '#F59E0B', // amber-500
    icon: 'alert-circle',
  },
  [IntelSeverity.HIGH]: {
    severity: IntelSeverity.HIGH,
    label: 'High',
    color: '#EF4444', // red-500
    icon: 'alert-triangle',
  },
  [IntelSeverity.CRITICAL]: {
    severity: IntelSeverity.CRITICAL,
    label: 'Critical',
    color: '#991B1B', // red-800
    icon: 'alert-octagon',
  },
};

export const ACTIVITY_LEVEL_CONFIGS: Record<ActivityLevel, ActivityLevelConfig> = {
  [ActivityLevel.LOW]: {
    level: ActivityLevel.LOW,
    label: 'Low Activity',
    color: '#6B7280', // gray-500
    minEvents: 0,
  },
  [ActivityLevel.MEDIUM]: {
    level: ActivityLevel.MEDIUM,
    label: 'Medium Activity',
    color: '#3B82F6', // blue-500
    minEvents: 5,
  },
  [ActivityLevel.HIGH]: {
    level: ActivityLevel.HIGH,
    label: 'High Activity',
    color: '#F59E0B', // amber-500
    minEvents: 10,
  },
  [ActivityLevel.VERY_HIGH]: {
    level: ActivityLevel.VERY_HIGH,
    label: 'Very High Activity',
    color: '#EF4444', // red-500
    minEvents: 20,
  },
};

/**
 * Competitive intelligence constants
 */
export const COMPETITIVE_INTEL_CONSTANTS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
  DEFAULT_WINDOW_TYPE: 'weekly',
  RECENT_EVENTS_DAYS: 30,
  HIGH_IMPACT_THRESHOLD: 0.7,
  HIGH_RELEVANCE_THRESHOLD: 0.7,
  CRITICAL_EVENT_THRESHOLD: 5, // Critical events in dashboard
};
