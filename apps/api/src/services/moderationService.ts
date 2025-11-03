// =====================================================
// MODERATION SERVICE
// Sprint 57 Phase 5.4
// =====================================================

import { Pool, PoolClient } from 'pg';
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditActionType,
  AbuseReport,
  AbuseReportFilters,
  AbuseScore,
  AbusePatternType,
  AbuseDetectionMetrics,
  AbuseDetectionConfig,
  ModerationFlag,
  FlagClientRequest,
  BanTokenRequest,
  BanTokenResponse,
  ExportFormat,
  ModerationStats,
  ModeratorPermissions,
  ModerationFlagType,
  ModerationSeverity,
} from '@pravado/shared-types';

export class ModerationService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  // =====================================================
  // AUDIT LOGGING METHODS
  // =====================================================

  /**
   * Log an audit trail entry for a sensitive action
   */
  async logAuditEntry(entry: Omit<AuditLogEntry, 'logId' | 'timestamp'>): Promise<string> {
    const result = await this.db.query(
      `INSERT INTO audit_logs (
        actor_id, action_type, target_id, target_type, ip_address,
        user_agent, organization_id, metadata, success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING log_id`,
      [
        entry.actorId,
        entry.actionType,
        entry.targetId || null,
        entry.targetType || null,
        entry.ipAddress,
        entry.userAgent || null,
        entry.organizationId,
        JSON.stringify(entry.metadata || {}),
        entry.success !== undefined ? entry.success : true,
        entry.errorMessage || null,
      ]
    );

    return result.rows[0].log_id;
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters: AuditLogFilters): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      actorId,
      actionTypes,
      targetId,
      organizationId,
      startDate,
      endDate,
      ipAddress,
      success,
      searchQuery,
      page = 0,
      pageSize = 50,
    } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(actorId);
    }

    if (actionTypes && actionTypes.length > 0) {
      conditions.push(`action_type = ANY($${paramIndex++})`);
      params.push(actionTypes);
    }

    if (targetId) {
      conditions.push(`target_id = $${paramIndex++}`);
      params.push(targetId);
    }

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(organizationId);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (ipAddress) {
      conditions.push(`ip_address = $${paramIndex++}`);
      params.push(ipAddress);
    }

    if (success !== undefined) {
      conditions.push(`success = $${paramIndex++}`);
      params.push(success);
    }

    if (searchQuery) {
      conditions.push(`(
        metadata::text ILIKE $${paramIndex} OR
        action_type ILIKE $${paramIndex} OR
        target_id ILIKE $${paramIndex}
      )`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated logs
    const offset = page * pageSize;
    params.push(pageSize, offset);

    const logsResult = await this.db.query(
      `SELECT
        log_id, actor_id, action_type, target_id, target_type,
        timestamp, ip_address, user_agent, organization_id,
        metadata, success, error_message
      FROM audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const logs: AuditLogEntry[] = logsResult.rows.map((row) => ({
      logId: row.log_id,
      actorId: row.actor_id,
      actionType: row.action_type as AuditActionType,
      targetId: row.target_id,
      targetType: row.target_type,
      timestamp: row.timestamp.toISOString(),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      organizationId: row.organization_id,
      metadata: row.metadata || {},
      success: row.success,
      errorMessage: row.error_message,
    }));

    return {
      logs,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Export audit logs to CSV or JSON
   */
  async exportAuditLogs(
    format: ExportFormat,
    filters: AuditLogFilters
  ): Promise<string | object[]> {
    // Get all logs without pagination
    const { logs } = await this.getAuditLogs({ ...filters, pageSize: 10000 });

    if (format === 'json') {
      return logs;
    }

    // CSV format
    const headers = [
      'Log ID',
      'Actor ID',
      'Action Type',
      'Target ID',
      'Target Type',
      'Timestamp',
      'IP Address',
      'Organization ID',
      'Success',
      'Error Message',
      'Metadata',
    ];

    const rows = logs.map((log) => [
      log.logId,
      log.actorId,
      log.actionType,
      log.targetId || '',
      log.targetType || '',
      log.timestamp,
      log.ipAddress,
      log.organizationId,
      log.success ? 'true' : 'false',
      log.errorMessage || '',
      JSON.stringify(log.metadata),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  }

  // =====================================================
  // ABUSE DETECTION METHODS
  // =====================================================

  /**
   * Get abuse detection configuration
   */
  async getAbuseDetectionConfig(organizationId?: string): Promise<AbuseDetectionConfig> {
    const result = await this.db.query(
      `SELECT * FROM get_abuse_detection_config($1)`,
      [organizationId || null]
    );

    if (result.rows.length === 0) {
      // Return default config
      return this.getDefaultAbuseConfig();
    }

    const config = result.rows[0];
    return {
      rateLimitExceededThreshold: config.rate_limit_exceeded_threshold,
      rateLimitBypassThreshold: config.rate_limit_bypass_threshold,
      malformedPayloadThreshold: config.malformed_payload_threshold,
      malformedPayloadPercentage: parseFloat(config.malformed_payload_percentage),
      unauthorizedAttemptsThreshold: config.unauthorized_attempts_threshold,
      authFailureThreshold: config.auth_failure_threshold,
      tokenReuseThreshold: config.token_reuse_threshold,
      suspiciousTokenPatternThreshold: config.suspicious_token_pattern_threshold,
      webhookFailureThreshold: config.webhook_failure_threshold,
      webhookFailurePercentage: parseFloat(config.webhook_failure_percentage),
      timeWindowMinutes: config.time_window_minutes,
      requestsPerMinuteThreshold: config.requests_per_minute_threshold,
      errorRateThreshold: parseFloat(config.error_rate_threshold),
      suspiciousScoreThreshold: config.suspicious_score_threshold,
      abusiveScoreThreshold: config.abusive_score_threshold,
    };
  }

  private getDefaultAbuseConfig(): AbuseDetectionConfig {
    return {
      rateLimitExceededThreshold: 10,
      rateLimitBypassThreshold: 5,
      malformedPayloadThreshold: 20,
      malformedPayloadPercentage: 15.0,
      unauthorizedAttemptsThreshold: 10,
      authFailureThreshold: 15,
      tokenReuseThreshold: 5,
      suspiciousTokenPatternThreshold: 3,
      webhookFailureThreshold: 10,
      webhookFailurePercentage: 25.0,
      timeWindowMinutes: 60,
      requestsPerMinuteThreshold: 100,
      errorRateThreshold: 20.0,
      suspiciousScoreThreshold: 50,
      abusiveScoreThreshold: 75,
    };
  }

  /**
   * Detect abuse based on metrics and return score
   */
  async detectAbuse(
    metrics: AbuseDetectionMetrics,
    organizationId?: string
  ): Promise<{ score: AbuseScore; severity: number; patterns: AbusePatternType[] }> {
    const config = await this.getAbuseDetectionConfig(organizationId);
    const patterns: AbusePatternType[] = [];
    let severityScore = 0;

    // Check rate limiting abuse
    if (metrics.rateLimitExceededCount >= config.rateLimitExceededThreshold) {
      patterns.push(AbusePatternType.RATE_LIMIT_BYPASS);
      severityScore += 15;
    }

    if (metrics.rateLimitBypassAttempts >= config.rateLimitBypassThreshold) {
      patterns.push(AbusePatternType.RATE_LIMIT_BYPASS);
      severityScore += 20;
    }

    // Check payload quality
    const malformedPercentage =
      metrics.totalRequests > 0
        ? (metrics.malformedPayloadCount / metrics.totalRequests) * 100
        : 0;

    if (
      metrics.malformedPayloadCount >= config.malformedPayloadThreshold ||
      malformedPercentage >= config.malformedPayloadPercentage
    ) {
      patterns.push(AbusePatternType.INVALID_PAYLOAD_SPAM);
      severityScore += 10;
    }

    // Check authorization abuse
    if (metrics.unauthorizedAttempts >= config.unauthorizedAttemptsThreshold) {
      patterns.push(AbusePatternType.UNAUTHORIZED_ACCESS_ATTEMPTS);
      severityScore += 25;
    }

    if (metrics.authenticationFailures >= config.authFailureThreshold) {
      patterns.push(AbusePatternType.BRUTE_FORCE_ATTEMPT);
      severityScore += 30;
    }

    // Check token security
    if (metrics.tokenReuseCount >= config.tokenReuseThreshold) {
      patterns.push(AbusePatternType.TOKEN_REPLAY_ATTACK);
      severityScore += 35;
    }

    if (metrics.suspiciousTokenPatterns >= config.suspiciousTokenPatternThreshold) {
      patterns.push(AbusePatternType.TOKEN_REPLAY_ATTACK);
      severityScore += 20;
    }

    // Check webhook abuse
    const webhookFailurePercentage =
      metrics.totalWebhookAttempts > 0
        ? (metrics.webhookFailureCount / metrics.totalWebhookAttempts) * 100
        : 0;

    if (
      metrics.webhookFailureCount >= config.webhookFailureThreshold ||
      webhookFailurePercentage >= config.webhookFailurePercentage
    ) {
      patterns.push(AbusePatternType.EXCESSIVE_WEBHOOK_FAILURES);
      severityScore += 10;
    }

    // Check general suspicious behavior
    if (metrics.requestsPerMinute >= config.requestsPerMinuteThreshold) {
      patterns.push(AbusePatternType.SUSPICIOUS_IP_BEHAVIOR);
      severityScore += 15;
    }

    if (metrics.errorRate >= config.errorRateThreshold) {
      patterns.push(AbusePatternType.SUSPICIOUS_IP_BEHAVIOR);
      severityScore += 10;
    }

    // Determine abuse score
    let score: AbuseScore;
    if (severityScore >= config.abusiveScoreThreshold) {
      score = AbuseScore.ABUSIVE;
    } else if (severityScore >= config.suspiciousScoreThreshold) {
      score = AbuseScore.SUSPICIOUS;
    } else {
      score = AbuseScore.NORMAL;
    }

    return {
      score,
      severity: Math.min(severityScore, 100),
      patterns: Array.from(new Set(patterns)), // Remove duplicates
    };
  }

  /**
   * Create an abuse report
   */
  async createAbuseReport(
    metrics: AbuseDetectionMetrics,
    organizationId?: string
  ): Promise<string> {
    const detection = await this.detectAbuse(metrics, organizationId);

    const result = await this.db.query(
      `INSERT INTO abuse_reports (
        client_id, ip_address, token_id, endpoint,
        abuse_score, patterns, metrics, organization_id, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING report_id`,
      [
        metrics.clientId || null,
        metrics.ipAddress || null,
        metrics.tokenId || null,
        metrics.endpoint || null,
        detection.score,
        JSON.stringify(detection.patterns),
        JSON.stringify(metrics),
        organizationId || null,
        detection.severity,
      ]
    );

    return result.rows[0].report_id;
  }

  /**
   * Get abuse reports with filtering
   */
  async getAbuseReports(filters: AbuseReportFilters): Promise<{
    reports: AbuseReport[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      abuseScore,
      patterns,
      clientId,
      ipAddress,
      tokenId,
      organizationId,
      startDate,
      endDate,
      minSeverity,
      maxSeverity,
      isFlagged,
      isResolved,
      page = 0,
      pageSize = 50,
    } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (abuseScore) {
      conditions.push(`abuse_score = $${paramIndex++}`);
      params.push(abuseScore);
    }

    if (patterns && patterns.length > 0) {
      conditions.push(`patterns ?| $${paramIndex++}`);
      params.push(patterns);
    }

    if (clientId) {
      conditions.push(`client_id = $${paramIndex++}`);
      params.push(clientId);
    }

    if (ipAddress) {
      conditions.push(`ip_address = $${paramIndex++}`);
      params.push(ipAddress);
    }

    if (tokenId) {
      conditions.push(`token_id = $${paramIndex++}`);
      params.push(tokenId);
    }

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(organizationId);
    }

    if (startDate) {
      conditions.push(`detected_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`detected_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (minSeverity !== undefined) {
      conditions.push(`severity >= $${paramIndex++}`);
      params.push(minSeverity);
    }

    if (maxSeverity !== undefined) {
      conditions.push(`severity <= $${paramIndex++}`);
      params.push(maxSeverity);
    }

    if (isFlagged !== undefined) {
      conditions.push(`is_flagged = $${paramIndex++}`);
      params.push(isFlagged);
    }

    if (isResolved !== undefined) {
      conditions.push(`is_resolved = $${paramIndex++}`);
      params.push(isResolved);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM abuse_reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated reports
    const offset = page * pageSize;
    params.push(pageSize, offset);

    const reportsResult = await this.db.query(
      `SELECT * FROM abuse_reports
      ${whereClause}
      ORDER BY detected_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const reports: AbuseReport[] = reportsResult.rows.map((row) => ({
      reportId: row.report_id,
      clientId: row.client_id,
      ipAddress: row.ip_address,
      tokenId: row.token_id,
      endpoint: row.endpoint,
      abuseScore: row.abuse_score as AbuseScore,
      patterns: row.patterns || [],
      metrics: row.metrics || {},
      detectedAt: row.detected_at.toISOString(),
      organizationId: row.organization_id,
      severity: row.severity,
      isFlagged: row.is_flagged,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at?.toISOString(),
      resolvedBy: row.resolved_by,
      notes: row.notes,
    }));

    return {
      reports,
      total,
      page,
      pageSize,
    };
  }

  // =====================================================
  // MODERATION FLAG METHODS
  // =====================================================

  /**
   * Flag a client with moderation action
   */
  async flagClient(
    request: FlagClientRequest,
    flaggedBy: string
  ): Promise<string> {
    const expiresAt = request.expiresAt || null;

    const result = await this.db.query(
      `INSERT INTO moderation_flags (
        client_id, token_id, ip_address, organization_id,
        flag_reason, flag_type, severity, flagged_by, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING flag_id`,
      [
        request.clientId || null,
        request.tokenId || null,
        request.ipAddress || null,
        request.organizationId || null,
        request.flagReason,
        request.flagType,
        request.severity,
        flaggedBy,
        expiresAt,
        JSON.stringify(request.metadata || {}),
      ]
    );

    const flagId = result.rows[0].flag_id;

    // Log audit entry
    await this.logAuditEntry({
      actorId: flaggedBy,
      actionType: AuditActionType.CLIENT_FLAGGED,
      targetId: request.clientId || request.tokenId || request.ipAddress || 'unknown',
      targetType: request.clientId ? 'client' : request.tokenId ? 'token' : 'ip_address',
      ipAddress: '0.0.0.0', // System action
      organizationId: request.organizationId || '00000000-0000-0000-0000-000000000000',
      metadata: {
        flagId,
        flagType: request.flagType,
        severity: request.severity,
        reason: request.flagReason,
      },
      success: true,
    });

    return flagId;
  }

  /**
   * Ban a token and optionally notify client
   */
  async banToken(request: BanTokenRequest, bannedBy: string): Promise<BanTokenResponse> {
    const expiresAt = request.banDurationHours
      ? new Date(Date.now() + request.banDurationHours * 60 * 60 * 1000)
      : null;

    const flagId = await this.flagClient(
      {
        tokenId: request.tokenId,
        flagReason: request.reason,
        flagType: ModerationFlagType.BAN,
        severity: ModerationSeverity.CRITICAL,
        expiresAt: expiresAt?.toISOString(),
        metadata: request.metadata,
      },
      bannedBy
    );

    // Log audit entry
    await this.logAuditEntry({
      actorId: bannedBy,
      actionType: AuditActionType.TOKEN_BANNED,
      targetId: request.tokenId,
      targetType: 'token',
      ipAddress: '0.0.0.0', // System action
      organizationId: '00000000-0000-0000-0000-000000000000',
      metadata: {
        flagId,
        reason: request.reason,
        expiresAt: expiresAt?.toISOString(),
        notifyClient: request.notifyClient,
      },
      success: true,
    });

    // TODO: If notifyClient is true, send notification webhook/email

    return {
      success: true,
      tokenId: request.tokenId,
      flagId,
      expiresAt: expiresAt?.toISOString(),
      message: `Token ${request.tokenId} has been banned${expiresAt ? ` until ${expiresAt.toISOString()}` : ' permanently'}`,
    };
  }

  /**
   * Check if a client, token, or IP is flagged
   */
  async isFlagged(
    clientId?: string,
    tokenId?: string,
    ipAddress?: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `SELECT is_flagged($1, $2, $3) AS flagged`,
      [clientId || null, tokenId || null, ipAddress || null]
    );

    return result.rows[0].flagged;
  }

  /**
   * Get active moderation flags
   */
  async getActiveFlags(
    clientId?: string,
    tokenId?: string,
    ipAddress?: string
  ): Promise<ModerationFlag[]> {
    let result;

    if (clientId) {
      result = await this.db.query(`SELECT * FROM get_active_flags_for_client($1)`, [clientId]);
    } else if (tokenId) {
      result = await this.db.query(`SELECT * FROM get_active_flags_for_token($1)`, [tokenId]);
    } else if (ipAddress) {
      result = await this.db.query(`SELECT * FROM get_active_flags_for_ip($1)`, [ipAddress]);
    } else {
      return [];
    }

    return result.rows.map((row) => ({
      flagId: row.flag_id,
      flagType: row.flag_type,
      severity: row.severity,
      flagReason: row.flag_reason,
      flaggedAt: row.flagged_at.toISOString(),
      expiresAt: row.expires_at?.toISOString(),
      clientId,
      tokenId,
      ipAddress,
      organizationId: undefined,
      flaggedBy: '',
      isActive: true,
      metadata: {},
    }));
  }

  // =====================================================
  // STATISTICS & REPORTING
  // =====================================================

  /**
   * Get moderation dashboard statistics
   */
  async getModerationStats(timeRange: string = '7d'): Promise<ModerationStats> {
    const startDate = this.getStartDateForRange(timeRange);

    // Get total audit logs
    const auditLogsResult = await this.db.query(
      `SELECT COUNT(*) FROM audit_logs WHERE timestamp >= $1`,
      [startDate]
    );

    // Get total abuse reports
    const abuseReportsResult = await this.db.query(
      `SELECT COUNT(*) FROM abuse_reports WHERE detected_at >= $1`,
      [startDate]
    );

    // Get active flags
    const activeFlagsResult = await this.db.query(
      `SELECT COUNT(*) FROM moderation_flags WHERE is_active = true`
    );

    // Get resolved flags
    const resolvedFlagsResult = await this.db.query(
      `SELECT COUNT(*) FROM moderation_flags
       WHERE is_active = false AND resolved_at >= $1`,
      [startDate]
    );

    // Get abuse score distribution
    const scoreDistResult = await this.db.query(
      `SELECT abuse_score, COUNT(*) as count
       FROM abuse_reports
       WHERE detected_at >= $1
       GROUP BY abuse_score`
    );

    const scoreDistribution = {
      normal: 0,
      suspicious: 0,
      abusive: 0,
    };

    scoreDistResult.rows.forEach((row) => {
      if (row.abuse_score in scoreDistribution) {
        scoreDistribution[row.abuse_score as keyof typeof scoreDistribution] = parseInt(
          row.count
        );
      }
    });

    // Get top patterns
    const patternsResult = await this.db.query(
      `SELECT jsonb_array_elements_text(patterns) as pattern, COUNT(*) as count
       FROM abuse_reports
       WHERE detected_at >= $1
       GROUP BY pattern
       ORDER BY count DESC
       LIMIT 10`
    );

    const topPatterns = patternsResult.rows.map((row) => ({
      pattern: row.pattern as AbusePatternType,
      count: parseInt(row.count),
    }));

    // Get top flagged clients
    const clientsResult = await this.db.query(
      `SELECT client_id, COUNT(*) as count, MAX(severity) as latest_severity
       FROM moderation_flags
       WHERE client_id IS NOT NULL AND flagged_at >= $1
       GROUP BY client_id
       ORDER BY count DESC
       LIMIT 10`
    );

    const topFlaggedClients = clientsResult.rows.map((row) => ({
      clientId: row.client_id,
      flagCount: parseInt(row.count),
      latestSeverity: row.latest_severity as ModerationSeverity,
    }));

    // Get top flagged IPs
    const ipsResult = await this.db.query(
      `SELECT ip_address::text, COUNT(*) as count, MAX(severity) as latest_severity
       FROM moderation_flags
       WHERE ip_address IS NOT NULL AND flagged_at >= $1
       GROUP BY ip_address
       ORDER BY count DESC
       LIMIT 10`
    );

    const topFlaggedIPs = ipsResult.rows.map((row) => ({
      ipAddress: row.ip_address,
      flagCount: parseInt(row.count),
      latestSeverity: row.latest_severity as ModerationSeverity,
    }));

    return {
      timeRange,
      totalAuditLogs: parseInt(auditLogsResult.rows[0].count),
      totalAbuseReports: parseInt(abuseReportsResult.rows[0].count),
      activeFlags: parseInt(activeFlagsResult.rows[0].count),
      resolvedFlags: parseInt(resolvedFlagsResult.rows[0].count),
      abuseScoreDistribution: scoreDistribution,
      topPatterns,
      topFlaggedClients,
      topFlaggedIPs,
    };
  }

  private getStartDateForRange(range: string): Date {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Verify moderator permissions
   */
  async verifyModeratorAccess(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT EXISTS(
        SELECT 1 FROM admin_users
        WHERE user_id = $1
        AND role IN ('super_admin', 'admin', 'moderator')
      ) AS is_moderator`,
      [userId]
    );

    return result.rows[0].is_moderator;
  }

  /**
   * Get moderator permissions
   */
  async getModeratorPermissions(userId: string): Promise<ModeratorPermissions> {
    const result = await this.db.query(
      `SELECT role FROM admin_users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        canViewAuditLogs: false,
        canExportAuditLogs: false,
        canViewAbuseReports: false,
        canFlagClients: false,
        canBanTokens: false,
        canResolveFlags: false,
        canConfigureDetection: false,
      };
    }

    const role = result.rows[0].role;

    return {
      canViewAuditLogs: ['super_admin', 'admin', 'moderator'].includes(role),
      canExportAuditLogs: ['super_admin', 'admin'].includes(role),
      canViewAbuseReports: ['super_admin', 'admin', 'moderator'].includes(role),
      canFlagClients: ['super_admin', 'admin', 'moderator'].includes(role),
      canBanTokens: ['super_admin', 'admin'].includes(role),
      canResolveFlags: ['super_admin', 'admin', 'moderator'].includes(role),
      canConfigureDetection: ['super_admin'].includes(role),
    };
  }
}

export const moderationService = new ModerationService(
  // Database pool will be injected
  {} as Pool
);
