// =====================================================
// CHANNEL INTELLIGENCE TYPES
// Sprint 27: Channel effectiveness and sentiment analysis
// =====================================================

// =====================================================
// ENUMS
// =====================================================

/**
 * Channel types for outreach
 */
export enum ChannelType {
  EMAIL = 'EMAIL',
  LINKEDIN = 'LINKEDIN',
  PHONE = 'PHONE',
  TWITTER = 'TWITTER',
  OTHER = 'OTHER',
}

/**
 * Engagement sentiment classification
 */
export enum EngagementSentiment {
  POSITIVE = 'POSITIVE',           // Enthusiastic, friendly, interested
  NEUTRAL = 'NEUTRAL',             // Professional, neutral tone
  NEGATIVE = 'NEGATIVE',           // Dismissive, annoyed, uninterested
  UNDETERMINED = 'UNDETERMINED',   // Cannot determine from data
}

/**
 * Types of engagement events
 */
export enum EngagementType {
  OPEN = 'OPEN',                      // Email opened
  CLICK = 'CLICK',                    // Link clicked
  REPLY = 'REPLY',                    // Reply received
  CONNECT = 'CONNECT',                // LinkedIn connection accepted
  COMMENT = 'COMMENT',                // Comment on post
  CALL = 'CALL',                      // Phone call answered
  VOICEMAIL = 'VOICEMAIL',            // Voicemail left
  DISMISS = 'DISMISS',                // Unsubscribe, block, negative action
  FORWARD = 'FORWARD',                // Email forwarded
  DOWNLOAD = 'DOWNLOAD',              // Attachment downloaded
  MEETING_SCHEDULED = 'MEETING_SCHEDULED', // Meeting/call scheduled
}

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Channel Engagement Event
 * Individual interaction tracking
 */
export interface ChannelEngagement {
  id: string;
  organizationId: string;

  // Context
  campaignId?: string;
  contactId: string;
  agentId?: string;

  // Engagement details
  channelType: ChannelType;
  engagementType: EngagementType;
  sentiment: EngagementSentiment;

  // Metrics
  engagementScore: number; // 0.0 to 1.0

  // Content
  rawMessage?: string;
  metadata: Record<string, unknown>;

  // Timing
  engagedAt: string;
  createdAt: string;
}

/**
 * Channel Performance Aggregate
 * Statistical summary of channel performance
 */
export interface ChannelPerformance {
  id: string;
  organizationId: string;

  // Scope
  contactId?: string;
  campaignId?: string;

  // Channel
  channelType: ChannelType;

  // Aggregate metrics
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalConnected: number;
  totalDismissed: number;

  // Calculated rates (0.0 to 1.0)
  openRate: number;
  clickRate: number;
  replyRate: number;
  connectRate: number;

  // Sentiment metrics
  avgSentimentScore: number; // 0.0 to 1.0
  positiveRatio: number;
  negativeRatio: number;

  // Contact receptiveness (0-100)
  contactReceptivenessScore: number;

  // Timing intelligence
  preferredHour?: number; // 0-23
  preferredDayOfWeek?: number; // 0-6, Sunday=0
  avgResponseTimeHours?: number;

  // Metadata
  lastEngagementAt?: string;
  updatedAt: string;
  createdAt: string;
}

// =====================================================
// ENRICHED TYPES
// =====================================================

/**
 * Enriched Channel Engagement with contact details
 */
export interface EnrichedChannelEngagement extends ChannelEngagement {
  contactName?: string;
  contactEmail?: string;
  campaignName?: string;
}

/**
 * Channel Recommendation
 * Suggested channel and tone for outreach
 */
export interface ChannelRecommendation {
  channel: ChannelType;
  score: number; // 0-100 confidence score
  rationale: string;
  recommendedTone: 'friendly' | 'professional' | 'assertive' | 'consultative';
  bestTimeWindow?: {
    hour: number;
    dayOfWeek: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

/**
 * Contact Channel Profile
 * Comprehensive view of contact's channel preferences
 */
export interface ContactChannelProfile {
  contactId: string;
  contactName?: string;
  performances: ChannelPerformance[];
  recommendations: ChannelRecommendation[];
  overallReceptiveness: number; // 0-100
  preferredChannel?: ChannelType;
  sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  recentEngagements: EnrichedChannelEngagement[];
}

/**
 * Campaign Channel Statistics
 * Channel performance across entire campaign
 */
export interface CampaignChannelStats {
  campaignId: string;
  campaignName?: string;
  performances: ChannelPerformance[];
  bestPerformingChannel?: ChannelType;
  worstPerformingChannel?: ChannelType;
  totalEngagements: number;
  avgSentimentScore: number;
  topContacts: {
    contactId: string;
    contactName: string;
    receptivenessScore: number;
  }[];
}

/**
 * Sentiment Trend
 * Historical sentiment analysis
 */
export interface SentimentTrend {
  date: string;
  channel: ChannelType;
  sentiment: EngagementSentiment;
  engagementType: EngagementType;
  sentimentScore: number;
  messagePreview?: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for logging an engagement
 */
export interface LogEngagementInput {
  organizationId: string;
  contactId: string;
  campaignId?: string;
  channelType: ChannelType;
  engagementType: EngagementType;
  sentiment?: EngagementSentiment;
  engagementScore?: number;
  rawMessage?: string;
  metadata?: Record<string, unknown>;
  agentId?: string;
  engagedAt?: string;
}

/**
 * Input for analyzing sentiment
 */
export interface AnalyzeSentimentInput {
  message: string;
  channelType: ChannelType;
  engagementType: EngagementType;
  contactContext?: {
    name: string;
    previousSentiment?: EngagementSentiment;
    relationship?: string;
  };
}

/**
 * Input for getting channel recommendations
 */
export interface GetChannelRecommendationsInput {
  contactId: string;
  organizationId: string;
  campaignId?: string;
  excludeChannels?: ChannelType[];
}

/**
 * Input for summarizing sentiment trends
 */
export interface SummarizeSentimentTrendsInput {
  contactId: string;
  organizationId: string;
  channelType?: ChannelType;
  timeframe?: 'week' | 'month' | 'quarter' | 'all';
  includeRecommendations?: boolean;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Result from sentiment analysis
 */
export interface SentimentAnalysisResult {
  sentiment: EngagementSentiment;
  sentimentScore: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  reasoning?: string;
  detectedTone: string;
  keywords: string[];
}

/**
 * Result from channel statistics query
 */
export interface ChannelStatsResult {
  channel: ChannelType;
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  openRate: number;
  replyRate: number;
  avgSentimentScore: number;
}

/**
 * Best time to contact recommendation
 */
export interface BestTimeToContact {
  channel: ChannelType;
  preferredHour: number; // 0-23
  preferredDayOfWeek: number; // 0-6
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
}

/**
 * Sentiment trend summary (GPT-powered)
 */
export interface SentimentTrendSummary {
  contactId: string;
  overallTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  summaryText: string;
  generatedAt: string;

  // Structured insights
  keyObservations?: string[];
  recommendations?: string[];

  // Trend data
  trendsData: SentimentTrend[];
  avgSentimentByChannel: Record<ChannelType, number>;
  mostEngagedChannel?: ChannelType;
}

/**
 * Tone recommendation
 */
export interface ToneRecommendation {
  recommendedTone: 'friendly' | 'professional' | 'assertive' | 'consultative' | 'empathetic';
  reasoning: string;
  examplePhrases: string[];
  thingsToAvoid: string[];
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Standard response for engagement logging
 */
export interface LogEngagementResponse {
  success: boolean;
  engagementId?: string;
  error?: string;
}

/**
 * Response for channel recommendations
 */
export interface ChannelRecommendationsResponse {
  success: boolean;
  recommendations?: ChannelRecommendation[];
  error?: string;
}

/**
 * Response for contact profile
 */
export interface ContactChannelProfileResponse {
  success: boolean;
  profile?: ContactChannelProfile;
  error?: string;
}

/**
 * Response for campaign stats
 */
export interface CampaignChannelStatsResponse {
  success: boolean;
  stats?: CampaignChannelStats;
  error?: string;
}

/**
 * Response for sentiment trends
 */
export interface SentimentTrendsResponse {
  success: boolean;
  trends?: SentimentTrend[];
  summary?: SentimentTrendSummary;
  error?: string;
}

/**
 * Response for best time to contact
 */
export interface BestTimeToContactResponse {
  success: boolean;
  recommendations?: BestTimeToContact[];
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Channel configuration for UI
 */
export interface ChannelConfig {
  type: ChannelType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Sentiment configuration for UI
 */
export interface SentimentConfig {
  sentiment: EngagementSentiment;
  label: string;
  color: string;
  icon: string;
}

/**
 * Engagement type configuration for UI
 */
export interface EngagementTypeConfig {
  type: EngagementType;
  label: string;
  icon: string;
  category: 'positive' | 'neutral' | 'negative';
}

// =====================================================
// CONSTANTS
// =====================================================

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.EMAIL]: {
    type: ChannelType.EMAIL,
    label: 'Email',
    icon: 'mail',
    color: '#3B82F6', // blue-500
    description: 'Email outreach and follow-ups',
  },
  [ChannelType.LINKEDIN]: {
    type: ChannelType.LINKEDIN,
    label: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2', // LinkedIn blue
    description: 'Professional networking on LinkedIn',
  },
  [ChannelType.PHONE]: {
    type: ChannelType.PHONE,
    label: 'Phone',
    icon: 'phone',
    color: '#10B981', // green-500
    description: 'Phone calls and voicemails',
  },
  [ChannelType.TWITTER]: {
    type: ChannelType.TWITTER,
    label: 'Twitter/X',
    icon: 'twitter',
    color: '#000000', // X black
    description: 'Social media engagement on Twitter/X',
  },
  [ChannelType.OTHER]: {
    type: ChannelType.OTHER,
    label: 'Other',
    icon: 'message-circle',
    color: '#6B7280', // gray-500
    description: 'Other communication channels',
  },
};

export const SENTIMENT_CONFIGS: Record<EngagementSentiment, SentimentConfig> = {
  [EngagementSentiment.POSITIVE]: {
    sentiment: EngagementSentiment.POSITIVE,
    label: 'Positive',
    color: '#10B981', // green-500
    icon: 'smile',
  },
  [EngagementSentiment.NEUTRAL]: {
    sentiment: EngagementSentiment.NEUTRAL,
    label: 'Neutral',
    color: '#6B7280', // gray-500
    icon: 'meh',
  },
  [EngagementSentiment.NEGATIVE]: {
    sentiment: EngagementSentiment.NEGATIVE,
    label: 'Negative',
    color: '#EF4444', // red-500
    icon: 'frown',
  },
  [EngagementSentiment.UNDETERMINED]: {
    sentiment: EngagementSentiment.UNDETERMINED,
    label: 'Unknown',
    color: '#9CA3AF', // gray-400
    icon: 'help-circle',
  },
};

export const ENGAGEMENT_TYPE_CONFIGS: Record<EngagementType, EngagementTypeConfig> = {
  [EngagementType.OPEN]: {
    type: EngagementType.OPEN,
    label: 'Opened',
    icon: 'eye',
    category: 'neutral',
  },
  [EngagementType.CLICK]: {
    type: EngagementType.CLICK,
    label: 'Clicked',
    icon: 'mouse-pointer',
    category: 'positive',
  },
  [EngagementType.REPLY]: {
    type: EngagementType.REPLY,
    label: 'Replied',
    icon: 'message-square',
    category: 'positive',
  },
  [EngagementType.CONNECT]: {
    type: EngagementType.CONNECT,
    label: 'Connected',
    icon: 'user-plus',
    category: 'positive',
  },
  [EngagementType.COMMENT]: {
    type: EngagementType.COMMENT,
    label: 'Commented',
    icon: 'message-circle',
    category: 'positive',
  },
  [EngagementType.CALL]: {
    type: EngagementType.CALL,
    label: 'Answered Call',
    icon: 'phone',
    category: 'positive',
  },
  [EngagementType.VOICEMAIL]: {
    type: EngagementType.VOICEMAIL,
    label: 'Voicemail',
    icon: 'voicemail',
    category: 'neutral',
  },
  [EngagementType.DISMISS]: {
    type: EngagementType.DISMISS,
    label: 'Dismissed/Unsubscribed',
    icon: 'x-circle',
    category: 'negative',
  },
  [EngagementType.FORWARD]: {
    type: EngagementType.FORWARD,
    label: 'Forwarded',
    icon: 'share',
    category: 'positive',
  },
  [EngagementType.DOWNLOAD]: {
    type: EngagementType.DOWNLOAD,
    label: 'Downloaded',
    icon: 'download',
    category: 'positive',
  },
  [EngagementType.MEETING_SCHEDULED]: {
    type: EngagementType.MEETING_SCHEDULED,
    label: 'Meeting Scheduled',
    icon: 'calendar',
    category: 'positive',
  },
};

/**
 * Tone templates for different scenarios
 */
export const TONE_TEMPLATES = {
  friendly: {
    greeting: ['Hi', 'Hey', 'Hello'],
    closing: ['Best', 'Cheers', 'Talk soon'],
    style: 'casual and warm',
  },
  professional: {
    greeting: ['Hello', 'Good morning', 'Good afternoon'],
    closing: ['Best regards', 'Sincerely', 'Kind regards'],
    style: 'formal and respectful',
  },
  assertive: {
    greeting: ['Hello', 'Hi'],
    closing: ['Best', 'Regards'],
    style: 'direct and confident',
  },
  consultative: {
    greeting: ['Hi', 'Hello'],
    closing: ['Looking forward to your thoughts', 'Happy to discuss further'],
    style: 'collaborative and advisory',
  },
  empathetic: {
    greeting: ['Hi', 'Hello'],
    closing: ['Here to help', 'Let me know how I can assist'],
    style: 'understanding and supportive',
  },
};
