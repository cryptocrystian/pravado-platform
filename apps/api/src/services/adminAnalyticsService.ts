// =====================================================
// ADMIN ANALYTICS SERVICE
// Sprint 56 Phase 5.3
// =====================================================

import { Pool } from 'pg';
import {
  AnalyticsTimeRange,
  ErrorCategory,
  ErrorSeverity,
  OverviewStats,
  PeakUsageWindow,
  ErrorBreakdownItem,
  HourlyRequestData,
  TenantActivity,
  TenantActivityFilters,
  AgentActivity,
  AgentLoadHeatmapData,
  AgentActivityFilters,
  ErrorLogEntry,
  ErrorLogFilters,
  StatusCodeDistribution,
  RoutePerformanceMetrics,
  WebhookDeliveryPerformance,
  SlowestRequest,
  PerformanceMetricsFilters,
} from '@pravado/shared-types';

export class AdminAnalyticsService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  // =====================================================
  // OVERVIEW STATISTICS
  // =====================================================

  /**
   * Get global overview statistics
   */
  async getOverviewStats(
    timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<OverviewStats> {
    const { startDate, endDate } = this.getDateRange(timeRange, customStartDate, customEndDate);

    // Get main stats
    const statsResult = await this.db.query(
      `SELECT * FROM get_admin_overview_stats($1, $2)`,
      [startDate, endDate]
    );

    const stats = statsResult.rows[0];

    // Get peak usage windows
    const peakWindowsResult = await this.db.query(
      `SELECT * FROM get_peak_usage_windows($1, $2, 10)`,
      [startDate, endDate]
    );

    const peakUsageWindows: PeakUsageWindow[] = peakWindowsResult.rows.map((row) => ({
      timestamp: row.hour_timestamp.toISOString(),
      hour: row.hour_of_day,
      requestCount: parseInt(row.request_count),
      avgResponseTime: parseFloat(row.avg_response_time),
    }));

    // Get error breakdown
    const errorBreakdownResult = await this.db.query(
      `SELECT * FROM get_error_breakdown($1, $2)`,
      [startDate, endDate]
    );

    const errorBreakdown: ErrorBreakdownItem[] = errorBreakdownResult.rows.map((row) => ({
      category: row.category as ErrorCategory,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage),
      severity: row.severity as ErrorSeverity,
    }));

    // Get hourly request data
    const hourlyDataResult = await this.db.query(
      `SELECT * FROM get_hourly_request_data($1, $2)`,
      [startDate, endDate]
    );

    const requestsByHour: HourlyRequestData[] = hourlyDataResult.rows.map((row) => ({
      hour: row.hour_timestamp.toISOString().substring(11, 16),
      timestamp: row.hour_timestamp.toISOString(),
      totalRequests: parseInt(row.total_requests),
      successfulRequests: parseInt(row.successful_requests),
      failedRequests: parseInt(row.failed_requests),
      avgResponseTime: parseFloat(row.avg_response_time),
    }));

    return {
      timeRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRequests: parseInt(stats.total_requests) || 0,
      successfulRequests: parseInt(stats.successful_requests) || 0,
      failedRequests: parseInt(stats.failed_requests) || 0,
      averageResponseTime: parseFloat(stats.avg_response_time) || 0,
      p95ResponseTime: parseFloat(stats.p95_response_time) || 0,
      p99ResponseTime: parseFloat(stats.p99_response_time) || 0,
      errorRate: parseFloat(stats.error_rate) || 0,
      uniqueTenants: parseInt(stats.unique_tenants) || 0,
      activeAgents: parseInt(stats.active_agents) || 0,
      peakUsageWindows,
      errorBreakdown,
      requestsByHour,
    };
  }

  // =====================================================
  // TENANT ACTIVITY
  // =====================================================

  /**
   * Get tenant activity summary
   */
  async getTenantActivity(
    filters: TenantActivityFilters,
    timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<{ tenants: TenantActivity[]; total: number }> {
    const { startDate, endDate } = this.getDateRange(timeRange, customStartDate, customEndDate);

    const result = await this.db.query(
      `SELECT * FROM get_tenant_activity($1, $2, $3, $4, $5, $6, $7)`,
      [
        startDate,
        endDate,
        filters.searchTerm || null,
        filters.sortBy || 'total_requests',
        filters.sortOrder || 'desc',
        filters.limit || 100,
        filters.offset || 0,
      ]
    );

    const tenants: TenantActivity[] = result.rows.map((row) => ({
      tenantId: row.organization_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      totalRequests: parseInt(row.total_requests),
      successfulRequests: parseInt(row.successful_requests),
      failedRequests: parseInt(row.failed_requests),
      errorRate: parseFloat(row.error_rate),
      activeAgents: parseInt(row.active_agents),
      totalAgents: parseInt(row.total_agents),
      averageResponseTime: parseFloat(row.avg_response_time),
      rateLimitTier: row.rate_limit_tier,
      lastActivityAt: row.last_activity_at?.toISOString(),
      createdAt: row.created_at.toISOString(),
    }));

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM organizations WHERE ($1 IS NULL OR name ILIKE '%' || $1 || '%')`,
      [filters.searchTerm || null]
    );

    const total = parseInt(countResult.rows[0].count);

    return { tenants, total };
  }

  /**
   * Export tenant activity to CSV format
   */
  async exportTenantActivity(
    filters: TenantActivityFilters,
    timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D
  ): Promise<string> {
    const { tenants } = await this.getTenantActivity(filters, timeRange);

    const headers = [
      'Organization Name',
      'Organization ID',
      'Total Requests',
      'Successful Requests',
      'Failed Requests',
      'Error Rate (%)',
      'Active Agents',
      'Total Agents',
      'Avg Response Time (ms)',
      'Rate Limit Tier',
      'Last Activity',
      'Created At',
    ].join(',');

    const rows = tenants.map((t) =>
      [
        `"${t.organizationName}"`,
        t.organizationId,
        t.totalRequests,
        t.successfulRequests,
        t.failedRequests,
        t.errorRate.toFixed(2),
        t.activeAgents,
        t.totalAgents,
        t.averageResponseTime.toFixed(2),
        t.rateLimitTier,
        t.lastActivityAt || '',
        t.createdAt,
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }

  // =====================================================
  // AGENT ACTIVITY
  // =====================================================

  /**
   * Get agent activity statistics
   */
  async getAgentActivity(
    filters: AgentActivityFilters,
    timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<{ agents: AgentActivity[]; total: number }> {
    const { startDate, endDate } = this.getDateRange(timeRange, customStartDate, customEndDate);

    const result = await this.db.query(
      `SELECT * FROM get_agent_activity($1, $2, $3, $4, $5)`,
      [
        startDate,
        endDate,
        filters.organizationId || null,
        filters.limit || 100,
        filters.offset || 0,
      ]
    );

    const agents: AgentActivity[] = result.rows.map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      agentType: row.agent_type,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      requestsHandled: parseInt(row.requests_handled),
      successfulRequests: parseInt(row.successful_requests),
      failedRequests: parseInt(row.failed_requests),
      averageResponseTime: parseFloat(row.avg_response_time),
      p95ResponseTime: parseFloat(row.p95_response_time),
      errorRate: parseFloat(row.error_rate),
      escalationRate: parseFloat(row.escalation_rate),
      contradictionCount: parseInt(row.contradiction_count),
      conflictCount: parseInt(row.conflict_count),
      lastActiveAt: row.last_active_at?.toISOString(),
      status: row.status,
    }));

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM agents WHERE is_active = true AND ($1 IS NULL OR organization_id = $1)`,
      [filters.organizationId || null]
    );

    const total = parseInt(countResult.rows[0].count);

    return { agents, total };
  }

  /**
   * Get agent load heatmap data
   */
  async getAgentLoadHeatmap(
    agentIds: string[],
    timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_24H,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<AgentLoadHeatmapData[]> {
    const { startDate, endDate } = this.getDateRange(timeRange, customStartDate, customEndDate);

    const result = await this.db.query(
      `SELECT * FROM get_agent_load_heatmap($1, $2, $3)`,
      [startDate, endDate, agentIds.length > 0 ? agentIds : null]
    );

    // Group by agent
    const agentMap = new Map<string, AgentLoadHeatmapData>();

    result.rows.forEach((row) => {
      if (!agentMap.has(row.agent_id)) {
        agentMap.set(row.agent_id, {
          agentId: row.agent_id,
          agentName: row.agent_name,
          hourlyLoad: [],
        });
      }

      const agentData = agentMap.get(row.agent_id)!;
      agentData.hourlyLoad.push({
        hour: row.hour_timestamp.toISOString().substring(11, 16),
        timestamp: row.hour_timestamp.toISOString(),
        requestCount: parseInt(row.request_count),
        avgResponseTime: parseFloat(row.avg_response_time),
        errorCount: parseInt(row.error_count),
      });
    });

    return Array.from(agentMap.values());
  }

  // =====================================================
  // ERROR LOGS
  // =====================================================

  /**
   * Get error logs with filters
   */
  async getErrorLogs(
    filters: ErrorLogFilters
  ): Promise<{ logs: ErrorLogEntry[]; total: number; statusCodeDistribution: StatusCodeDistribution[] }> {
    const query = `
      SELECT
        log_id,
        timestamp,
        error_type,
        error_message,
        error_category,
        severity,
        status_code,
        endpoint,
        method,
        organization_id,
        agent_id,
        user_id,
        request_id,
        trace_id,
        stack_trace,
        metadata
      FROM error_logs
      WHERE 1=1
        ${filters.startDate ? 'AND timestamp >= $1' : ''}
        ${filters.endDate ? 'AND timestamp <= $2' : ''}
        ${filters.errorCategory ? 'AND error_category = $3' : ''}
        ${filters.severity ? 'AND severity = $4' : ''}
        ${filters.statusCode ? 'AND status_code = $5' : ''}
        ${filters.endpoint ? 'AND endpoint ILIKE $6' : ''}
        ${filters.organizationId ? 'AND organization_id = $7' : ''}
        ${filters.agentId ? 'AND agent_id = $8' : ''}
        ${filters.searchTerm ? 'AND (error_message ILIKE $9 OR error_type ILIKE $9)' : ''}
      ORDER BY timestamp DESC
      LIMIT ${filters.limit || 100}
      OFFSET ${filters.offset || 0}
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) params.push(filters.startDate);
    if (filters.endDate) params.push(filters.endDate);
    if (filters.errorCategory) params.push(filters.errorCategory);
    if (filters.severity) params.push(filters.severity);
    if (filters.statusCode) params.push(filters.statusCode);
    if (filters.endpoint) params.push(`%${filters.endpoint}%`);
    if (filters.organizationId) params.push(filters.organizationId);
    if (filters.agentId) params.push(filters.agentId);
    if (filters.searchTerm) params.push(`%${filters.searchTerm}%`);

    const result = await this.db.query(query, params);

    // Get organization names
    const orgIds = [...new Set(result.rows.map((r) => r.organization_id).filter(Boolean))];
    const orgNamesMap = new Map<string, string>();

    if (orgIds.length > 0) {
      const orgResult = await this.db.query(
        `SELECT organization_id, name FROM organizations WHERE organization_id = ANY($1)`,
        [orgIds]
      );
      orgResult.rows.forEach((row) => {
        orgNamesMap.set(row.organization_id, row.name);
      });
    }

    const logs: ErrorLogEntry[] = result.rows.map((row) => ({
      logId: row.log_id,
      timestamp: row.timestamp.toISOString(),
      errorType: row.error_type,
      errorMessage: row.error_message,
      errorCategory: row.error_category as ErrorCategory,
      severity: row.severity as ErrorSeverity,
      statusCode: row.status_code,
      endpoint: row.endpoint,
      method: row.method,
      tenantId: row.organization_id,
      organizationName: row.organization_id ? orgNamesMap.get(row.organization_id) : undefined,
      agentId: row.agent_id,
      userId: row.user_id,
      requestId: row.request_id,
      traceId: row.trace_id,
      stackTrace: row.stack_trace,
      metadata: row.metadata,
    }));

    // Get total count
    const countResult = await this.db.query(`SELECT COUNT(*) FROM error_logs`);
    const total = parseInt(countResult.rows[0].count);

    // Get status code distribution
    const statusDistResult = await this.db.query(
      `SELECT * FROM get_status_code_distribution($1, $2)`,
      [filters.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), filters.endDate || new Date()]
    );

    const statusCodeDistribution: StatusCodeDistribution[] = statusDistResult.rows.map((row) => ({
      statusCode: row.status_code,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage),
      category: row.category as '2xx' | '3xx' | '4xx' | '5xx',
    }));

    return { logs, total, statusCodeDistribution };
  }

  // =====================================================
  // PERFORMANCE METRICS
  // =====================================================

  /**
   * Get performance metrics for API routes
   */
  async getPerformanceMetrics(
    filters: PerformanceMetricsFilters,
    timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<{
    routes: RoutePerformanceMetrics[];
    webhooks: WebhookDeliveryPerformance[];
    slowestRequests: SlowestRequest[];
  }> {
    const { startDate, endDate } = this.getDateRange(timeRange, customStartDate, customEndDate);

    // Get route performance metrics
    const routesResult = await this.db.query(
      `SELECT * FROM get_route_performance_metrics($1, $2, $3)`,
      [startDate, endDate, filters.limit || 50]
    );

    const routes: RoutePerformanceMetrics[] = routesResult.rows.map((row) => ({
      endpoint: row.endpoint,
      method: row.method,
      totalRequests: parseInt(row.total_requests),
      successfulRequests: parseInt(row.successful_requests),
      failedRequests: parseInt(row.failed_requests),
      averageResponseTime: parseFloat(row.avg_response_time),
      minResponseTime: parseFloat(row.min_response_time),
      maxResponseTime: parseFloat(row.max_response_time),
      p50ResponseTime: parseFloat(row.p50_response_time),
      p95ResponseTime: parseFloat(row.p95_response_time),
      p99ResponseTime: parseFloat(row.p99_response_time),
      errorRate: parseFloat(row.error_rate),
      requestsPerMinute: parseFloat(row.requests_per_minute),
    }));

    // Get webhook delivery performance
    const webhooksResult = await this.db.query(
      `SELECT * FROM get_webhook_delivery_performance($1, $2, $3)`,
      [startDate, endDate, filters.limit || 50]
    );

    const webhooks: WebhookDeliveryPerformance[] = webhooksResult.rows.map((row) => ({
      webhookId: row.webhook_id,
      webhookUrl: row.webhook_url,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      totalDeliveries: parseInt(row.total_deliveries),
      successfulDeliveries: parseInt(row.successful_deliveries),
      failedDeliveries: parseInt(row.failed_deliveries),
      averageDeliveryTime: parseFloat(row.avg_delivery_time),
      p95DeliveryTime: parseFloat(row.p95_delivery_time),
      retryRate: parseFloat(row.retry_rate),
      lastDeliveryAt: row.last_delivery_at?.toISOString(),
    }));

    // Get slowest requests
    const slowestResult = await this.db.query(
      `SELECT * FROM get_slowest_requests($1, $2, $3)`,
      [startDate, endDate, filters.limit || 100]
    );

    const slowestRequests: SlowestRequest[] = slowestResult.rows.map((row) => ({
      requestId: row.request_id,
      timestamp: row.timestamp.toISOString(),
      endpoint: row.endpoint,
      method: row.method,
      responseTime: parseFloat(row.response_time),
      statusCode: row.status_code,
      organizationName: row.organization_name,
      errorMessage: row.error_message,
    }));

    return { routes, webhooks, slowestRequests };
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  /**
   * Get date range based on time range enum or custom dates
   */
  private getDateRange(
    timeRange: AnalyticsTimeRange,
    customStartDate?: Date,
    customEndDate?: Date
  ): { startDate: Date; endDate: Date } {
    if (timeRange === AnalyticsTimeRange.CUSTOM && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case AnalyticsTimeRange.LAST_24H:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_7D:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_30D:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_90D:
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Verify admin permissions
   */
  async verifyAdminAccess(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM admin_users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get admin permissions
   */
  async getAdminPermissions(userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT role, permissions FROM admin_users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      role: result.rows[0].role,
      permissions: result.rows[0].permissions,
    };
  }
}
