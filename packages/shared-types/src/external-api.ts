// =====================================================
// EXTERNAL API LAYER TYPES
// Sprint 54 Phase 5.1
// =====================================================

/**
 * Rate limit tiers for API clients
 */
export enum RateLimitTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  UNLIMITED = 'unlimited',
}

/**
 * Access levels for API tokens
 */
export enum AccessLevel {
  READ_ONLY = 'read_only',
  WRITE = 'write',
  ADMIN = 'admin',
  FULL_ACCESS = 'full_access',
}

/**
 * Types of API clients
 */
export enum APIClientType {
  WEB_APP = 'web_app',
  MOBILE_APP = 'mobile_app',
  SERVER = 'server',
  CLI = 'cli',
  INTEGRATION = 'integration',
  WEBHOOK = 'webhook',
  CUSTOM = 'custom',
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  AGENT_RESPONSE = 'agent_response',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  CONVERSATION_STARTED = 'conversation_started',
  CONVERSATION_ENDED = 'conversation_ended',
  AGENT_STATUS_CHANGE = 'agent_status_change',
  ERROR_OCCURRED = 'error_occurred',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

/**
 * API request status
 */
export enum APIRequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RATE_LIMITED = 'rate_limited',
  UNAUTHORIZED = 'unauthorized',
}

/**
 * Webhook delivery status
 */
export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  ABANDONED = 'abandoned',
}

/**
 * API access scope
 */
export interface APIAccessScope {
  resource: string; // e.g., 'agents', 'conversations', 'tasks'
  actions: string[]; // e.g., ['read', 'write', 'delete']
  conditions?: {
    agentIds?: string[];
    organizationId?: string;
    maxRequestsPerHour?: number;
    ipWhitelist?: string[];
  };
}

/**
 * External API token
 */
export interface ExternalAPIToken {
  tokenId: string;
  clientId: string;
  organizationId: string;
  tokenHash: string; // Hashed version of the token
  tokenPrefix: string; // First 8 chars for identification
  name: string;
  description?: string;
  accessLevel: AccessLevel;
  scopes: APIAccessScope[];
  rateLimitTier: RateLimitTier;
  rateLimitConfig: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  createdBy: string;
  revokedAt?: Date;
  revokedBy?: string;
  metadata?: Record<string, any>;
}

/**
 * Registered API client
 */
export interface RegisteredClient {
  clientId: string;
  organizationId: string;
  name: string;
  description?: string;
  clientType: APIClientType;
  allowedOrigins?: string[];
  allowedIPs?: string[];
  webhookUrl?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

/**
 * API log event
 */
export interface APILogEvent {
  logId: string;
  clientId: string;
  tokenId: string;
  organizationId: string;
  endpoint: string;
  method: string;
  status: APIRequestStatus;
  statusCode: number;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  requestDuration: number; // milliseconds
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * External agent request
 */
export interface ExternalAgentRequest {
  requestId: string;
  clientId: string;
  organizationId: string;
  agentId: string;
  taskType: 'conversation' | 'task' | 'query' | 'command';
  input: {
    message?: string;
    context?: Record<string, any>;
    parameters?: Record<string, any>;
    attachments?: {
      type: string;
      url: string;
      metadata?: Record<string, any>;
    }[];
  };
  status: APIRequestStatus;
  response?: {
    agentResponse: string;
    confidence?: number;
    reasoning?: string;
    actions?: string[];
    metadata?: Record<string, any>;
  };
  conversationId?: string;
  processingTime?: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Webhook registration
 */
export interface WebhookRegistration {
  webhookId: string;
  clientId: string;
  organizationId: string;
  url: string;
  events: WebhookEventType[];
  secret: string; // For signature validation
  isActive: boolean;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  headers?: Record<string, string>;
  createdAt: Date;
  lastDeliveryAt?: Date;
  totalDeliveries: number;
  failedDeliveries: number;
  metadata?: Record<string, any>;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDeliveryAttempt {
  attemptId: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: Record<string, any>;
  status: WebhookDeliveryStatus;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  attemptNumber: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  clientId: string;
  tier: RateLimitTier;
  limits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  current: {
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsThisDay: number;
  };
  remaining: {
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsThisDay: number;
  };
  resetAt: {
    minute: Date;
    hour: Date;
    day: Date;
  };
  isLimited: boolean;
}

/**
 * Agent status response
 */
export interface AgentStatusResponse {
  agentId: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  availability: boolean;
  currentLoad: number;
  capabilities: string[];
  lastActiveAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Conversation log entry
 */
export interface ConversationLogEntry {
  messageId: string;
  conversationId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * API documentation metadata
 */
export interface APIDocumentation {
  version: string;
  title: string;
  description: string;
  endpoints: APIEndpointDoc[];
  schemas: Record<string, any>;
  securitySchemes: Record<string, any>;
}

/**
 * API endpoint documentation
 */
export interface APIEndpointDoc {
  path: string;
  method: string;
  summary: string;
  description: string;
  parameters?: APIParameterDoc[];
  requestBody?: {
    required: boolean;
    content: Record<string, any>;
  };
  responses: Record<string, APIResponseDoc>;
  security?: string[];
}

/**
 * API parameter documentation
 */
export interface APIParameterDoc {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description: string;
  required: boolean;
  schema: Record<string, any>;
}

/**
 * API response documentation
 */
export interface APIResponseDoc {
  description: string;
  content?: Record<string, any>;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for creating API token
 */
export interface CreateAPITokenInput {
  organizationId: string;
  clientId: string;
  name: string;
  description?: string;
  accessLevel: AccessLevel;
  scopes: APIAccessScope[];
  rateLimitTier?: RateLimitTier;
  expiresIn?: number; // days
  metadata?: Record<string, any>;
}

/**
 * Input for validating API token
 */
export interface ValidateAPITokenInput {
  token: string;
  requiredScopes?: APIAccessScope[];
  endpoint?: string;
  method?: string;
}

/**
 * Input for revoking API token
 */
export interface RevokeAPITokenInput {
  tokenId: string;
  revokedBy: string;
  reason?: string;
}

/**
 * Input for rotating API token
 */
export interface RotateAPITokenInput {
  tokenId: string;
  expiresIn?: number; // days
}

/**
 * Input for registering client
 */
export interface RegisterClientInput {
  organizationId: string;
  name: string;
  description?: string;
  clientType: APIClientType;
  allowedOrigins?: string[];
  allowedIPs?: string[];
  webhookUrl?: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

/**
 * Input for submitting external agent task
 */
export interface SubmitExternalTaskInput {
  agentId: string;
  taskType: 'conversation' | 'task' | 'query' | 'command';
  message?: string;
  context?: Record<string, any>;
  parameters?: Record<string, any>;
  attachments?: {
    type: string;
    url: string;
    metadata?: Record<string, any>;
  }[];
  conversationId?: string;
  webhookUrl?: string;
}

/**
 * Input for registering webhook
 */
export interface RegisterWebhookInput {
  clientId: string;
  organizationId: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  maxRetries?: number;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Input for triggering webhook
 */
export interface TriggerWebhookInput {
  webhookId: string;
  eventType: WebhookEventType;
  payload: Record<string, any>;
}

/**
 * Input for querying API logs
 */
export interface QueryAPILogsInput {
  clientId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: APIRequestStatus;
  endpoint?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

/**
 * Token creation response
 */
export interface CreateTokenResponse {
  success: boolean;
  token: string; // Plain text token (only returned on creation)
  tokenId: string;
  tokenPrefix: string;
  expiresAt?: Date;
  rateLimitTier: RateLimitTier;
  scopes: APIAccessScope[];
}

/**
 * Token validation response
 */
export interface ValidateTokenResponse {
  valid: boolean;
  clientId?: string;
  organizationId?: string;
  accessLevel?: AccessLevel;
  scopes?: APIAccessScope[];
  rateLimitStatus?: RateLimitStatus;
  errorMessage?: string;
}

/**
 * Token rotation response
 */
export interface RotateTokenResponse {
  success: boolean;
  newToken: string;
  newTokenId: string;
  oldTokenId: string;
  expiresAt?: Date;
}

/**
 * External task submission response
 */
export interface SubmitTaskResponse {
  success: boolean;
  requestId: string;
  status: APIRequestStatus;
  conversationId?: string;
  estimatedCompletionTime?: number; // milliseconds
  webhookRegistered?: boolean;
}

/**
 * External task result
 */
export interface ExternalTaskResult {
  requestId: string;
  status: APIRequestStatus;
  agentResponse?: string;
  confidence?: number;
  reasoning?: string;
  actions?: string[];
  conversationId?: string;
  processingTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Webhook registration response
 */
export interface RegisterWebhookResponse {
  success: boolean;
  webhookId: string;
  secret: string;
  events: WebhookEventType[];
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

/**
 * API analytics summary
 */
export interface APIAnalytics {
  clientId?: string;
  organizationId?: string;
  period: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsByEndpoint: {
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }[];
  requestsByStatus: {
    status: APIRequestStatus;
    count: number;
  }[];
  topErrors: {
    error: string;
    count: number;
  }[];
}

/**
 * Webhook analytics
 */
export interface WebhookAnalytics {
  webhookId: string;
  totalAttempts: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  retryRate: number;
  lastDeliveryAt?: Date;
  deliveriesByEvent: {
    eventType: WebhookEventType;
    count: number;
    successRate: number;
  }[];
}

/**
 * API health status
 */
export interface APIHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime: number;
  timestamp: Date;
  services: {
    auth: 'up' | 'down';
    agent: 'up' | 'down';
    webhook: 'up' | 'down';
    database: 'up' | 'down';
  };
  metrics: {
    activeTokens: number;
    activeClients: number;
    activeWebhooks: number;
    requestsLastHour: number;
    averageLatency: number;
  };
}
