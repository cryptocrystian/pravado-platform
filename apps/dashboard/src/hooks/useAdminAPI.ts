// =====================================================
// ADMIN API HOOKS
// Sprint 56 Phase 5.3
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  OverviewStats,
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
  AnalyticsTimeRange,
  AuditLogEntry,
  AuditLogFilters,
  AbuseReport,
  AbuseReportFilters,
  ModerationFlag,
  FlagClientRequest,
  BanTokenRequest,
  BanTokenResponse,
  ModerationStats,
  ExportFormat,
} from '@pravado/shared-types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// =====================================================
// HOOKS
// =====================================================

/**
 * Hook for fetching overview statistics
 */
export function useOverviewStats(
  timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
  customStartDate?: Date,
  customEndDate?: Date
) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { timeRange };
      if (customStartDate) params.startDate = customStartDate.toISOString();
      if (customEndDate) params.endDate = customEndDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/admin-console/overview`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch overview stats');
      console.error('Error fetching overview stats:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook for fetching tenant activity
 */
export function useTenantActivity(
  filters: TenantActivityFilters,
  timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
  customStartDate?: Date,
  customEndDate?: Date
) {
  const [tenants, setTenants] = useState<TenantActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { ...filters, timeRange };
      if (customStartDate) params.startDate = customStartDate.toISOString();
      if (customEndDate) params.endDate = customEndDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/admin-console/tenants`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setTenants(response.data.tenants);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tenant activity');
      console.error('Error fetching tenant activity:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return { tenants, total, loading, error, refetch: fetchTenants };
}

/**
 * Hook for exporting tenant activity
 */
export function useExportTenantActivity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (filters: TenantActivityFilters, timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D) => {
      try {
        setLoading(true);
        setError(null);

        const params: any = { ...filters, timeRange };

        const response = await axios.get(`${API_BASE_URL}/admin-console/tenants/export`, {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          responseType: 'blob',
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `tenant-activity-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to export data');
        console.error('Error exporting data:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { exportData, loading, error };
}

/**
 * Hook for fetching agent activity
 */
export function useAgentActivity(
  filters: AgentActivityFilters,
  timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
  customStartDate?: Date,
  customEndDate?: Date
) {
  const [agents, setAgents] = useState<AgentActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { ...filters, timeRange };
      if (customStartDate) params.startDate = customStartDate.toISOString();
      if (customEndDate) params.endDate = customEndDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/admin-console/agents`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setAgents(response.data.agents);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch agent activity');
      console.error('Error fetching agent activity:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, total, loading, error, refetch: fetchAgents };
}

/**
 * Hook for fetching agent load heatmap
 */
export function useAgentHeatmap(
  agentIds: string[],
  timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_24H,
  customStartDate?: Date,
  customEndDate?: Date
) {
  const [heatmapData, setHeatmapData] = useState<AgentLoadHeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    if (agentIds.length === 0) {
      setHeatmapData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: any = {
        agentIds: agentIds.join(','),
        timeRange,
      };
      if (customStartDate) params.startDate = customStartDate.toISOString();
      if (customEndDate) params.endDate = customEndDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/admin-console/agents/heatmap`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setHeatmapData(response.data.heatmapData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch heatmap data');
      console.error('Error fetching heatmap:', err);
    } finally {
      setLoading(false);
    }
  }, [agentIds, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  return { heatmapData, loading, error, refetch: fetchHeatmap };
}

/**
 * Hook for fetching error logs
 */
export function useErrorLogs(filters: ErrorLogFilters) {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [statusCodeDistribution, setStatusCodeDistribution] = useState<StatusCodeDistribution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/admin-console/errors`, {
        params: filters,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setLogs(response.data.logs);
      setStatusCodeDistribution(response.data.statusCodeDistribution);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch error logs');
      console.error('Error fetching error logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, statusCodeDistribution, total, loading, error, refetch: fetchLogs };
}

/**
 * Hook for fetching performance metrics
 */
export function usePerformanceMetrics(
  filters: PerformanceMetricsFilters,
  timeRange: AnalyticsTimeRange = AnalyticsTimeRange.LAST_7D,
  customStartDate?: Date,
  customEndDate?: Date
) {
  const [routes, setRoutes] = useState<RoutePerformanceMetrics[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookDeliveryPerformance[]>([]);
  const [slowestRequests, setSlowestRequests] = useState<SlowestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { ...filters, timeRange };
      if (customStartDate) params.startDate = customStartDate.toISOString();
      if (customEndDate) params.endDate = customEndDate.toISOString();

      const response = await axios.get(`${API_BASE_URL}/admin-console/performance`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setRoutes(response.data.routes);
      setWebhooks(response.data.webhooks);
      setSlowestRequests(response.data.slowestRequests);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch performance metrics');
      console.error('Error fetching performance metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { routes, webhooks, slowestRequests, loading, error, refetch: fetchMetrics };
}

// =====================================================
// MODERATION HOOKS
// Sprint 58 Phase 5.5
// =====================================================

/**
 * Hook for fetching audit logs
 */
export function useAuditLogs(filters: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/moderation/audit-logs`, {
        params: filters,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, total, loading, error, refetch: fetchLogs };
}

/**
 * Hook for exporting audit logs
 */
export function useExportAuditLogs() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportLogs = async (format: ExportFormat, filters: AuditLogFilters) => {
    try {
      setExporting(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/moderation/audit-logs/export`, {
        params: { ...filters, format },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        return new Blob([response.data], { type: 'text/csv' });
      } else {
        return response.data;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export audit logs');
      console.error('Error exporting audit logs:', err);
      return null;
    } finally {
      setExporting(false);
    }
  };

  return { exportLogs, exporting, error };
}

/**
 * Hook for fetching abuse reports
 */
export function useAbuseReports(filters: AbuseReportFilters) {
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/moderation/abuse-reports`, {
        params: filters,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setReports(response.data.reports);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch abuse reports');
      console.error('Error fetching abuse reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, total, loading, error, refetch: fetchReports };
}

/**
 * Hook for flagging a client
 */
export function useFlagClient() {
  const [flagging, setFlagging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flagClient = async (request: FlagClientRequest): Promise<string | null> => {
    try {
      setFlagging(true);
      setError(null);

      const response = await axios.post(
        `${API_BASE_URL}/moderation/flag-client`,
        request,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      return response.data.flagId;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to flag client');
      console.error('Error flagging client:', err);
      return null;
    } finally {
      setFlagging(false);
    }
  };

  return { flagClient, flagging, error };
}

/**
 * Hook for banning a token
 */
export function useBanToken() {
  const [banning, setBanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const banToken = async (request: BanTokenRequest): Promise<BanTokenResponse | null> => {
    try {
      setBanning(true);
      setError(null);

      const response = await axios.post(
        `${API_BASE_URL}/moderation/ban-token`,
        request,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to ban token');
      console.error('Error banning token:', err);
      return null;
    } finally {
      setBanning(false);
    }
  };

  return { banToken, banning, error };
}

/**
 * Hook for checking if an entity is flagged
 */
export function useCheckFlagged(clientId?: string, tokenId?: string, ipAddress?: string) {
  const [isFlagged, setIsFlagged] = useState(false);
  const [activeFlags, setActiveFlags] = useState<ModerationFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkFlagged = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (clientId) params.clientId = clientId;
      if (tokenId) params.tokenId = tokenId;
      if (ipAddress) params.ipAddress = ipAddress;

      const response = await axios.get(`${API_BASE_URL}/moderation/check-flagged`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setIsFlagged(response.data.isFlagged);
      setActiveFlags(response.data.activeFlags);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check flagged status');
      console.error('Error checking flagged status:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, tokenId, ipAddress]);

  useEffect(() => {
    if (clientId || tokenId || ipAddress) {
      checkFlagged();
    }
  }, [checkFlagged, clientId, tokenId, ipAddress]);

  return { isFlagged, activeFlags, loading, error, refetch: checkFlagged };
}

/**
 * Hook for fetching moderation statistics
 */
export function useModerationStats(timeRange: string = '7d') {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/moderation/stats`, {
        params: { timeRange },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch moderation stats');
      console.error('Error fetching moderation stats:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
