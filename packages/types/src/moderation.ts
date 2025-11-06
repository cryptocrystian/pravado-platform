// =====================================================
// MODERATION & AUDIT TRAIL TYPES
// Sprint 57 Phase 5.4
// =====================================================

/**
 * Types of actions tracked in the audit trail system
 */
export enum AuditActionType {
  // Token Operations
  TOKEN_CREATED = 'token_created',
  TOKEN_ROTATED = 'token_rotated',
  TOKEN_REVOKED = 'token_revoked',
  TOKEN_ACCESSED = 'token_accessed',

  // Agent Configuration
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_DELETED = 'agent_deleted',
  AGENT_CONFIG_CHANGED = 'agent_config_changed',
  AGENT_PERSONALITY_CHANGED = 'agent_personality_changed',

  // Conversation Actions
  ESCALATION_TRIGGERED = 'escalation_triggered',
  HANDOFF_INITIATED = 'handoff_initiated',
  OVERRIDE_APPLIED = 'override_applied',
  CONVERSATION_FLAGGED = 'conversation_flagged',

  // Admin Actions
  ADMIN_LOGIN = 'admin_login',
  ADMIN_PERMISSION_GRANTED = 'admin_permission_granted',
  ADMIN_PERMISSION_REVOKED = 'admin_permission_revoked',
  ADMIN_ACCESS_DENIED = 'admin_access_denied',

  // API & Webhook
  API_KEY_CREATED = 'api_key_created',
  API_KEY_ROTATED = 'api_key_rotated',
  API_KEY_REVOKED = 'api_key_revoked',
  WEBHOOK_REGISTERED = 'webhook_registered',
  WEBHOOK_UPDATED = 'webhook_updated',
  WEBHOOK_DELETED = 'webhook_deleted',

  // Security Events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALFORMED_PAYLOAD = 'malformed_payload',
  TOKEN_REPLAY_DETECTED = 'token_replay_detected',

  // Moderation Actions
  CLIENT_FLAGGED = 'client_flagged',
  CLIENT_BANNED = 'client_banned',
  CLIENT_UNBANNED = 'client_unbanned',
  TOKEN_BANNED = 'token_banned',
}

/**
 * Audit log entry capturing sensitive actions
 */
export interface AuditLogEntry {
  logId: string;
  actorId: string; // User/service that performed the action
  actionType: AuditActionType;
  targetId?: string; // Resource affected (agent_id, token_id, etc.)
  targetType?: string; // Type of target resource
  timestamp: string;
  ipAddress: string;
  userAgent?: string;
  organizationId: string;
  metadata: Record<string, any>; // Flexible data for action context
  success: boolean;
  errorMessage?: string;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  actorId?: string;
  actionTypes?: AuditActionType[];
  targetId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  success?: boolean;
  searchQuery?: string; // Full-text search on metadata
  page?: number;
  pageSize?: number;
}

/**
 * Abuse score classification
 */
export enum AbuseScore {
  NORMAL = 'normal',
  SUSPICIOUS = 'suspicious',
  ABUSIVE = 'abusive',
}

/**
 * Types of abuse patterns detected
 */
export enum AbusePatternType {
  RATE_LIMIT_BYPASS = 'rate_limit_bypass',
  INVALID_PAYLOAD_SPAM = 'invalid_payload_spam',
  UNAUTHORIZED_ACCESS_ATTEMPTS = 'unauthorized_access_attempts',
  TOKEN_REPLAY_ATTACK = 'token_replay_attack',
  EXCESSIVE_WEBHOOK_FAILURES = 'excessive_webhook_failures',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SUSPICIOUS_IP_BEHAVIOR = 'suspicious_ip_behavior',
}

/**
 * Metrics collected for abuse detection
 */
export interface AbuseDetectionMetrics {
  clientId?: string;
  ipAddress?: string;
  tokenId?: string;
  endpoint?: string;
  timeWindowMinutes: number; // Analysis window (e.g., 60 minutes)

  // Rate limiting metrics
  rateLimitExceededCount: number;
  rateLimitBypassAttempts: number;

  // Payload quality metrics
  malformedPayloadCount: number;
  invalidPayloadCount: number;
  totalRequests: number;

  // Authorization metrics
  unauthorizedAttempts: number;
  authenticationFailures: number;

  // Token metrics
  tokenReuseCount: number;
  suspiciousTokenPatterns: number;

  // Webhook metrics
  webhookFailureCount: number;
  webhookTimeoutCount: number;
  totalWebhookAttempts: number;

  // Additional context
  uniqueEndpointsAccessed: number;
  requestsPerMinute: number;
  errorRate: number;
}

/**
 * Abuse report generated from detection system
 */
export interface AbuseReport {
  reportId: string;
  clientId?: string;
  ipAddress?: string;
  tokenId?: string;
  endpoint?: string;
  abuseScore: AbuseScore;
  patterns: AbusePatternType[];
  metrics: AbuseDetectionMetrics;
  detectedAt: string;
  organizationId?: string;
  severity: number; // 0-100 score
  isFlagged: boolean;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Filters for querying abuse reports
 */
export interface AbuseReportFilters {
  abuseScore?: AbuseScore;
  patterns?: AbusePatternType[];
  clientId?: string;
  ipAddress?: string;
  tokenId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  minSeverity?: number;
  maxSeverity?: number;
  isFlagged?: boolean;
  isResolved?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Moderation flag applied to client or token
 */
export interface ModerationFlag {
  flagId: string;
  clientId?: string;
  tokenId?: string;
  ipAddress?: string;
  organizationId?: string;
  flagReason: string;
  flagType: ModerationFlagType;
  flaggedBy: string; // Admin/moderator who flagged
  flaggedAt: string;
  isActive: boolean;
  expiresAt?: string;
  severity: ModerationSeverity;
  metadata: Record<string, any>;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

/**
 * Types of moderation flags
 */
export enum ModerationFlagType {
  WARNING = 'warning',
  RESTRICTION = 'restriction',
  SUSPENSION = 'suspension',
  BAN = 'ban',
}

/**
 * Severity levels for moderation flags
 */
export enum ModerationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Request to flag a client
 */
export interface FlagClientRequest {
  clientId?: string;
  tokenId?: string;
  ipAddress?: string;
  organizationId?: string;
  flagReason: string;
  flagType: ModerationFlagType;
  severity: ModerationSeverity;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Request to ban a token
 */
export interface BanTokenRequest {
  tokenId: string;
  reason: string;
  notifyClient: boolean;
  banDurationHours?: number; // Permanent if not specified
  metadata?: Record<string, any>;
}

/**
 * Response from ban token operation
 */
export interface BanTokenResponse {
  success: boolean;
  tokenId: string;
  flagId: string;
  expiresAt?: string;
  message: string;
}

/**
 * Abuse detection configuration thresholds
 */
export interface AbuseDetectionConfig {
  // Rate limiting thresholds
  rateLimitExceededThreshold: number; // Count within time window
  rateLimitBypassThreshold: number;

  // Payload quality thresholds
  malformedPayloadThreshold: number;
  malformedPayloadPercentage: number; // Percentage of total requests

  // Authorization thresholds
  unauthorizedAttemptsThreshold: number;
  authFailureThreshold: number;

  // Token security thresholds
  tokenReuseThreshold: number;
  suspiciousTokenPatternThreshold: number;

  // Webhook thresholds
  webhookFailureThreshold: number;
  webhookFailurePercentage: number;

  // General thresholds
  timeWindowMinutes: number; // Analysis window
  requestsPerMinuteThreshold: number;
  errorRateThreshold: number; // Percentage

  // Scoring weights
  suspiciousScoreThreshold: number; // 0-100
  abusiveScoreThreshold: number; // 0-100
}

/**
 * Alert webhook payload for abuse detection
 */
export interface AbuseAlertWebhook {
  alertId: string;
  timestamp: string;
  abuseReport: AbuseReport;
  organizationId?: string;
  alertType: 'threshold_breach' | 'pattern_detected' | 'client_flagged';
  severity: ModerationSeverity;
  message: string;
  recommendedActions: string[];
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Audit log export request
 */
export interface AuditLogExportRequest {
  format: ExportFormat;
  filters: AuditLogFilters;
  includeMetadata: boolean;
}

/**
 * Moderation dashboard statistics
 */
export interface ModerationStats {
  timeRange: string;
  totalAuditLogs: number;
  totalAbuseReports: number;
  activeFlags: number;
  resolvedFlags: number;
  abuseScoreDistribution: {
    normal: number;
    suspicious: number;
    abusive: number;
  };
  topPatterns: Array<{
    pattern: AbusePatternType;
    count: number;
  }>;
  topFlaggedClients: Array<{
    clientId: string;
    flagCount: number;
    latestSeverity: ModerationSeverity;
  }>;
  topFlaggedIPs: Array<{
    ipAddress: string;
    flagCount: number;
    latestSeverity: ModerationSeverity;
  }>;
}

/**
 * Permissions for moderation access
 */
export interface ModeratorPermissions {
  canViewAuditLogs: boolean;
  canExportAuditLogs: boolean;
  canViewAbuseReports: boolean;
  canFlagClients: boolean;
  canBanTokens: boolean;
  canResolveFlags: boolean;
  canConfigureDetection: boolean;
}
