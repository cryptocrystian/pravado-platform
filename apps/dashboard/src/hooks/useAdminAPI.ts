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

  useEffect() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { routes, webhooks, slowestRequests, loading, error, refetch: fetchMetrics };
}
