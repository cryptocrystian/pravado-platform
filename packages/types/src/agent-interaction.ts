// =====================================================
// AGENT INTERACTION & MESSAGING TYPES
// Sprint 45 Phase 4.1
// =====================================================

import { PersonalityTone, UserAlignment } from './agent-personality';

/**
 * Agent message in a conversation
 */
export interface AgentMessage {
  /** Message ID */
  id: string;

  /** Conversation ID */
  conversationId: string;

  /** Sender type */
  senderType: 'user' | 'agent';

  /** Sender ID (user ID or agent ID) */
  senderId: string;

  /** Message text content */
  text: string;

  /** Message metadata */
  metadata?: MessageMetadata;

  /** Processed context (for agent responses) */
  context?: MessageContext;

  /** Timestamp */
  timestamp: Date;

  /** Was this message edited */
  isEdited?: boolean;

  /** Parent message ID (for threading) */
  parentMessageId?: string;
}

/**
 * Metadata attached to messages
 */
export interface MessageMetadata {
  /** Detected or specified tone */
  tone?: PersonalityTone;

  /** Sentiment analysis */
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';

  /** Message intent */
  intent?: string;

  /** Urgency level */
  urgency?: 'low' | 'medium' | 'high' | 'critical';

  /** Topics mentioned */
  topics?: string[];

  /** Entities referenced */
  entities?: string[];

  /** Context references */
  contextRefs?: string[];

  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * Message processing context
 */
export interface MessageContext {
  /** Agent persona used */
  persona?: {
    tone: PersonalityTone;
    decisionStyle: string;
    userAlignment: UserAlignment;
  };

  /** Context sources used */
  contextSources?: string[];

  /** Memory snippets referenced */
  memorySnippets?: Array<{
    id: string;
    content: string;
    relevance: number;
  }>;

  /** Token usage */
  tokens?: {
    input: number;
    output: number;
    total: number;
  };

  /** Processing metadata */
  processing?: {
    latencyMs: number;
    model: string;
    temperature: number;
  };
}

/**
 * Agent conversation
 */
export interface AgentConversation {
  /** Conversation ID */
  id: string;

  /** User ID */
  userId: string;

  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Conversation title/subject */
  title?: string;

  /** Conversation status */
  status: ConversationStatus;

  /** Message count */
  messageCount: number;

  /** Last message timestamp */
  lastMessageAt?: Date;

  /** Last active timestamp */
  lastActiveAt: Date;

  /** Conversation metadata */
  metadata?: ConversationMetadata;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;

  /** Archived timestamp */
  archivedAt?: Date;
}

/**
 * Conversation status
 */
export type ConversationStatus = 'active' | 'paused' | 'archived' | 'completed';

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  /** Conversation tags */
  tags?: string[];

  /** Primary topic */
  primaryTopic?: string;

  /** Related entities */
  relatedEntities?: string[];

  /** Goal or objective */
  goal?: string;

  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * User-agent turn (one exchange)
 */
export interface UserAgentTurn {
  /** Turn ID */
  id: string;

  /** Conversation ID */
  conversationId: string;

  /** User message ID */
  userMessageId: string;

  /** Agent message ID */
  agentMessageId: string;

  /** Turn number in conversation */
  turnNumber: number;

  /** User message text */
  userMessage: string;

  /** Agent response text */
  agentResponse: string;

  /** Turn metadata */
  metadata?: TurnMetadata;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Turn metadata
 */
export interface TurnMetadata {
  /** User satisfaction rating */
  userRating?: number; // 1-5

  /** Feedback */
  feedback?: string;

  /** Agent confidence in response */
  agentConfidence?: number; // 0-1

  /** Was escalation needed */
  escalationNeeded?: boolean;

  /** Turn duration (ms) */
  durationMs?: number;

  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * Result of message processing
 */
export interface MessageProcessingResult {
  /** Agent message created */
  message: AgentMessage;

  /** Applied personality traits */
  appliedPersonality?: {
    tone: PersonalityTone;
    userAlignment: UserAlignment;
    mirrored: boolean;
  };

  /** Context used */
  contextUsed?: {
    memorySnippets: number;
    recentTurns: number;
    contextSources: string[];
  };

  /** Processing stats */
  stats?: {
    processingTimeMs: number;
    tokensUsed: number;
    confidenceScore: number;
  };

  /** Suggestions for follow-up */
  suggestions?: string[];
}

/**
 * Live interaction session
 */
export interface LiveInteractionSession {
  /** Session ID */
  id: string;

  /** Conversation ID */
  conversationId: string;

  /** User ID */
  userId: string;

  /** Agent ID */
  agentId: string;

  /** Session status */
  status: 'active' | 'idle' | 'ended';

  /** Start time */
  startedAt: Date;

  /** Last activity time */
  lastActivityAt: Date;

  /** End time */
  endedAt?: Date;

  /** Session metadata */
  metadata?: {
    /** User is currently typing */
    userTyping?: boolean;

    /** Agent is processing */
    agentProcessing?: boolean;

    /** Session duration (ms) */
    durationMs?: number;

    /** Turn count */
    turnCount?: number;
  };
}

/**
 * Request to send message to agent
 */
export interface SendMessageRequest {
  /** Conversation ID */
  conversationId: string;

  /** Message text */
  text: string;

  /** User ID */
  userId: string;

  /** Message metadata */
  metadata?: MessageMetadata;

  /** Options */
  options?: {
    /** Wait for response */
    waitForResponse?: boolean;

    /** Mirror user tone */
    mirrorTone?: boolean;

    /** Include context */
    includeContext?: boolean;

    /** Maximum tokens for response */
    maxTokens?: number;
  };
}

/**
 * Request to start conversation
 */
export interface StartConversationRequest {
  /** User ID */
  userId: string;

  /** Agent ID */
  agentId: string;

  /** Organization ID */
  organizationId: string;

  /** Initial message (optional) */
  initialMessage?: string;

  /** Conversation title */
  title?: string;

  /** Metadata */
  metadata?: ConversationMetadata;
}

/**
 * Request to get conversation history
 */
export interface GetConversationHistoryRequest {
  /** Conversation ID */
  conversationId: string;

  /** Limit */
  limit?: number;

  /** Offset */
  offset?: number;

  /** Include metadata */
  includeMetadata?: boolean;

  /** Include context */
  includeContext?: boolean;
}

/**
 * Request to mirror personality traits
 */
export interface MirrorPersonalityRequest {
  /** Agent ID */
  agentId: string;

  /** User ID */
  userId: string;

  /** Conversation ID (for context) */
  conversationId?: string;

  /** Recent turns to analyze */
  recentTurns?: number;
}

/**
 * Applied tone and style from mirroring
 */
export interface AppliedToneStyle {
  /** Base agent tone */
  baseTone: PersonalityTone;

  /** Mirrored user tone */
  mirroredTone?: PersonalityTone;

  /** Final applied tone */
  appliedTone: PersonalityTone;

  /** User alignment */
  userAlignment: UserAlignment;

  /** Mirroring confidence */
  mirroringConfidence: number;

  /** Adjustments made */
  adjustments?: string[];
}

/**
 * Request to update agent memory from turn
 */
export interface UpdateMemoryRequest {
  /** Agent ID */
  agentId: string;

  /** Turn data */
  turn: UserAgentTurn;

  /** Organization ID */
  organizationId: string;

  /** Options */
  options?: {
    /** Extract entities */
    extractEntities?: boolean;

    /** Extract topics */
    extractTopics?: boolean;

    /** Update long-term memory */
    updateLongTerm?: boolean;
  };
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  /** Conversation ID */
  conversationId: string;

  /** Summary text */
  summary: string;

  /** Key topics discussed */
  topics: string[];

  /** Key entities mentioned */
  entities: string[];

  /** Outcomes/decisions */
  outcomes?: string[];

  /** Action items */
  actionItems?: string[];

  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Message sentiment analysis
 */
export interface SentimentAnalysis {
  /** Overall sentiment */
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';

  /** Confidence score */
  confidence: number;

  /** Emotion breakdown */
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };

  /** Tone indicators */
  toneIndicators?: string[];
}

/**
 * Conversation analytics
 */
export interface ConversationAnalytics {
  /** Conversation ID */
  conversationId: string;

  /** Total turns */
  totalTurns: number;

  /** Average response time (ms) */
  avgResponseTime: number;

  /** User satisfaction (1-5) */
  avgUserRating?: number;

  /** Sentiment distribution */
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  /** Top topics */
  topTopics: Array<{
    topic: string;
    count: number;
  }>;

  /** Escalation count */
  escalationCount: number;

  /** Session duration (ms) */
  totalDuration: number;
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  /** Conversation ID */
  conversationId: string;

  /** User or agent */
  actor: 'user' | 'agent';

  /** Actor ID */
  actorId: string;

  /** Is typing */
  isTyping: boolean;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Message read receipt
 */
export interface MessageReadReceipt {
  /** Message ID */
  messageId: string;

  /** Reader ID */
  readerId: string;

  /** Read timestamp */
  readAt: Date;
}

/**
 * Database entity for agent_messages table
 */
export interface AgentMessageEntity {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'agent';
  sender_id: string;
  text: string;
  metadata: Record<string, any> | null;
  context: Record<string, any> | null;
  is_edited: boolean;
  parent_message_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database entity for agent_conversations table
 */
export interface AgentConversationEntity {
  id: string;
  user_id: string;
  agent_id: string;
  organization_id: string;
  title: string | null;
  status: ConversationStatus;
  message_count: number;
  last_message_at: Date | null;
  last_active_at: Date;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

/**
 * Database entity for user_agent_turns table
 */
export interface UserAgentTurnEntity {
  id: string;
  conversation_id: string;
  user_message_id: string;
  agent_message_id: string;
  turn_number: number;
  user_message: string;
  agent_response: string;
  metadata: Record<string, any> | null;
  created_at: Date;
}
