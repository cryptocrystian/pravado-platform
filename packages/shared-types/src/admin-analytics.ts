// =====================================================
// ADMIN ANALYTICS TYPES
// Sprint 56 Phase 5.3
// =====================================================

/**
 * Time range for analytics queries
 */
export enum AnalyticsTimeRange {
  LAST_24H = '24h',
  LAST_7D = '7d',
  LAST_30D = '30d',
  LAST_90D = '90d',
  CUSTOM = 'custom',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Error category types
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  AGENT_ERROR = 'agent_error',
  WEBHOOK_DELIVERY = 'webhook_delivery',
  DATABASE = 'database',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// =====================================================
// OVERVIEW STATISTICS
// =====================================================

/**
 * Global overview statistics
 */
export interface OverviewStats {
  timeRange: AnalyticsTimeRange;
  startDate: string;
  endDate: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  uniqueTenants: number;
  activeAgents: number;
  peakUsageWindows: PeakUsageWindow[];
  errorBreakdown: ErrorBreakdownItem[];
  requestsByHour: HourlyRequestData[];
}

/**
 * Peak usage time window
 */
export interface PeakUsageWindow {
  timestamp: string;
  hour: number;
  requestCount: number;
  avgResponseTime: number;
}

/**
 * Error breakdown by category
 */
export interface ErrorBreakdownItem {
  category: ErrorCategory;
  count: number;
  percentage: number;
  severity: ErrorSeverity;
}

/**
 * Hourly request data for charts
 */
export interface HourlyRequestData {
  hour: string;
  timestamp: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
}

// =====================================================
// TENANT ACTIVITY
// =====================================================

/**
 * Tenant activity summary
 */
export interface TenantActivity {
  tenantId: string;
  organizationId: string;
  organizationName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  activeAgents: number;
  totalAgents: number;
  averageResponseTime: number;
  rateLimitTier: string;
  lastActivityAt: string;
  createdAt: string;
}

/**
 * Tenant activity query filters
 */
export interface TenantActivityFilters {
  searchTerm?: string;
  minRequests?: number;
  maxRequests?: number;
  minErrorRate?: number;
  maxErrorRate?: number;
  rateLimitTier?: string;
  sortBy?: 'requests' | 'errorRate' | 'lastActivity' | 'organizationName';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Tenant activity export data
 */
export interface TenantActivityExport {
  exportDate: string;
  timeRange: {
    start: string;
    end: string;
  };
  tenants: TenantActivity[];
  summary: {
    totalTenants: number;
    totalRequests: number;
    averageErrorRate: number;
  };
}

// =====================================================
// AGENT ACTIVITY
// =====================================================

/**
 * Agent activity statistics
 */
export interface AgentActivity {
  agentId: string;
  agentName: string;
  agentType: string;
  organizationId: string;
  organizationName: string;
  requestsHandled: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  escalationRate: number;
  contradictionCount: number;
  conflictCount: number;
  lastActiveAt: string;
  status: 'active' | 'idle' | 'error' | 'offline';
}

/**
 * Agent load heatmap data point
 */
export interface AgentLoadHeatmapData {
  agentId: string;
  agentName: string;
  hourlyLoad: {
    hour: string;
    timestamp: string;
    requestCount: number;
    avgResponseTime: number;
    errorCount: number;
  }[];
}

/**
 * Agent activity filters
 */
export interface AgentActivityFilters {
  searchTerm?: string;
  organizationId?: string;
  agentType?: string;
  status?: 'active' | 'idle' | 'error' | 'offline';
  minRequests?: number;
  maxErrorRate?: number;
  sortBy?: 'requests' | 'errorRate' | 'responseTime' | 'agentName';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =====================================================
// ERROR LOGS
// =====================================================

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  logId: string;
  timestamp: string;
  errorType: string;
  errorMessage: string;
  errorCategory: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  endpoint: string;
  method: string;
  tenantId?: string;
  organizationName?: string;
  agentId?: string;
  agentName?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

/**
 * Error log filters
 */
export interface ErrorLogFilters {
  startDate?: string;
  endDate?: string;
  errorType?: string;
  errorCategory?: ErrorCategory;
  severity?: ErrorSeverity;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  tenantId?: string;
  organizationId?: string;
  agentId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

/**
 * Status code distribution
 */
export interface StatusCodeDistribution {
  statusCode: number;
  count: number;
  percentage: number;
  category: '2xx' | '3xx' | '4xx' | '5xx';
}

// =====================================================
// PERFORMANCE METRICS
// =====================================================

/**
 * API route performance metrics
 */
export interface RoutePerformanceMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
}

/**
 * Webhook delivery performance
 */
export interface WebhookDeliveryPerformance {
  webhookId: string;
  webhookUrl: string;
  organizationId: string;
  organizationName: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  p95DeliveryTime: number;
  retryRate: number;
  lastDeliveryAt: string;
}

/**
 * Slowest requests data
 */
export interface SlowestRequest {
  requestId: string;
  timestamp: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  organizationName?: string;
  agentName?: string;
  errorMessage?: string;
}

/**
 * Performance metrics filters
 */
export interface PerformanceMetricsFilters {
  startDate?: string;
  endDate?: string;
  endpoint?: string;
  method?: string;
  minResponseTime?: number;
  sortBy?: 'requests' | 'avgResponseTime' | 'errorRate';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =====================================================
// ADMIN DASHBOARD REQUESTS
// =====================================================

/**
 * Request for overview statistics
 */
export interface GetOverviewStatsRequest {
  timeRange?: AnalyticsTimeRange;
  startDate?: string;
  endDate?: string;
}

/**
 * Request for tenant activity
 */
export interface GetTenantActivityRequest extends TenantActivityFilters {
  timeRange?: AnalyticsTimeRange;
  startDate?: string;
  endDate?: string;
}

/**
 * Request for agent activity
 */
export interface GetAgentActivityRequest extends AgentActivityFilters {
  timeRange?: AnalyticsTimeRange;
  startDate?: string;
  endDate?: string;
}

/**
 * Request for error logs
 */
export interface GetErrorLogsRequest extends ErrorLogFilters {}

/**
 * Request for performance metrics
 */
export interface GetPerformanceMetricsRequest extends PerformanceMetricsFilters {}

// =====================================================
// ADMIN DASHBOARD RESPONSES
// =====================================================

/**
 * Response for overview statistics
 */
export interface GetOverviewStatsResponse {
  success: boolean;
  stats: OverviewStats;
}

/**
 * Response for tenant activity
 */
export interface GetTenantActivityResponse {
  success: boolean;
  tenants: TenantActivity[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Response for agent activity
 */
export interface GetAgentActivityResponse {
  success: boolean;
  agents: AgentActivity[];
  heatmapData?: AgentLoadHeatmapData[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Response for error logs
 */
export interface GetErrorLogsResponse {
  success: boolean;
  logs: ErrorLogEntry[];
  statusCodeDistribution: StatusCodeDistribution[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Response for performance metrics
 */
export interface GetPerformanceMetricsResponse {
  success: boolean;
  routes: RoutePerformanceMetrics[];
  webhooks: WebhookDeliveryPerformance[];
  slowestRequests: SlowestRequest[];
  total: number;
}

// =====================================================
// ADMIN PERMISSIONS
// =====================================================

/**
 * Admin role types
 */
/**
 * Admin user permissions
 */
export interface AdminPermissions {
  canViewGlobalStats: boolean;
  canViewTenantData: boolean;
  canViewErrorLogs: boolean;
  canViewPerformanceMetrics: boolean;
  canExportData: boolean;
  canAccessSensitiveData: boolean;
}
