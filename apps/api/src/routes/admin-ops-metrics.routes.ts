// =====================================================
// ADMIN OPS METRICS ROUTES
// Sprint 82: Production Launch Hardening + Ops Dashboard
// =====================================================

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { register } from '../services/prometheus-metrics.service';
import { captureException } from '../services/observability.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Middleware - Platform Admin Only
 */
async function requirePlatformAdmin(req: Request, res: Response, next: Function) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('is_platform_admin')
      .eq('id', userId)
      .single();

    if (error || !user?.is_platform_admin) {
      return res.status(403).json({ error: 'Forbidden - Platform admin access required' });
    }

    next();
  } catch (error) {
    captureException(error as Error, { context: 'requirePlatformAdmin' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/v1/admin/ops-metrics
 *
 * Returns comprehensive ops metrics for the dashboard:
 * - System health (uptime, latency)
 * - LLM router metrics (requests, failures, latency)
 * - Top organizations by usage
 * - Recent alerts (placeholder)
 *
 * RBAC: Platform admin only
 */
router.get(
  '/',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      logger.info('[Admin Ops Metrics] Fetching metrics...');

      // 1. Get Prometheus metrics
      const metricsText = await register.metrics();
      const parsedMetrics = parsePrometheusMetrics(metricsText);

      // 2. Get system uptime (process.uptime() in seconds)
      const uptimeSeconds = process.uptime();

      // 3. Get ledger statistics from database
      const ledgerStats = await getLedgerStatistics();

      // 4. Calculate summary KPIs
      const llmRequests = parsedMetrics.llm_router_requests_total || 0;
      const llmFailures = parsedMetrics.llm_router_failures_total || 0;
      const failureRate = llmRequests > 0 ? (llmFailures / llmRequests) * 100 : 0;

      // 5. Get top organizations by usage
      const topOrganizations = await getTopOrganizationsByUsage(10);

      // 6. Build response
      const response = {
        timestamp: new Date().toISOString(),
        system: {
          uptime_seconds: Math.floor(uptimeSeconds),
          uptime_human: formatUptime(uptimeSeconds),
          status: 'healthy',
        },
        llm_router: {
          total_requests: llmRequests,
          total_failures: llmFailures,
          failure_rate_percent: Math.round(failureRate * 100) / 100,
          avg_latency_ms: parsedMetrics.llm_router_latency_ms_avg || 0,
          p95_latency_ms: parsedMetrics.llm_router_latency_ms_p95 || 0,
        },
        ledger: {
          total_records: ledgerStats.totalRecords,
          total_cost_usd: ledgerStats.totalCost,
          last_7_days_cost_usd: ledgerStats.last7DaysCost,
        },
        top_organizations: topOrganizations,
        alerts: [
          // Placeholder for active alerts
          // In production, this would query Prometheus Alertmanager or Sentry
        ],
      };

      logger.info('[Admin Ops Metrics] Successfully fetched metrics');
      res.json(response);
    } catch (error) {
      logger.error('[Admin Ops Metrics] Failed to fetch metrics', { error });
      captureException(error as Error, { context: 'admin-ops-metrics' });

      res.status(500).json({
        error: 'Failed to fetch ops metrics',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * Parse Prometheus metrics text format into key-value pairs
 */
function parsePrometheusMetrics(metricsText: string): Record<string, number> {
  const parsed: Record<string, number> = {};

  // Simple parser for counter and histogram metrics
  const lines = metricsText.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.trim() === '') {
      continue;
    }

    // Parse metric line: metric_name{labels} value
    const match = line.match(/^([a-z_]+)(?:\{[^}]*\})?\s+([0-9.]+)$/);
    if (match) {
      const [, metricName, value] = match;

      // Aggregate counters (sum all label variations)
      if (!parsed[metricName]) {
        parsed[metricName] = 0;
      }
      parsed[metricName] += parseFloat(value);
    }
  }

  return parsed;
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get ledger statistics from database
 */
async function getLedgerStatistics(): Promise<{
  totalRecords: number;
  totalCost: number;
  last7DaysCost: number;
}> {
  try {
    // Total records and cost
    const { count: totalRecords } = await supabase
      .from('ai_usage_ledger')
      .select('*', { count: 'exact', head: true });

    const { data: totalCostData } = await supabase
      .from('ai_usage_ledger')
      .select('estimated_cost_usd');

    const totalCost = totalCostData?.reduce((sum, record) => sum + (record.estimated_cost_usd || 0), 0) || 0;

    // Last 7 days cost
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: last7DaysData } = await supabase
      .from('ai_usage_ledger')
      .select('estimated_cost_usd')
      .gte('created_at', sevenDaysAgo.toISOString());

    const last7DaysCost = last7DaysData?.reduce((sum, record) => sum + (record.estimated_cost_usd || 0), 0) || 0;

    return {
      totalRecords: totalRecords || 0,
      totalCost: Math.round(totalCost * 100) / 100,
      last7DaysCost: Math.round(last7DaysCost * 100) / 100,
    };
  } catch (error) {
    logger.error('[Ledger Statistics] Failed to fetch', { error });
    return {
      totalRecords: 0,
      totalCost: 0,
      last7DaysCost: 0,
    };
  }
}

/**
 * Get top organizations by usage
 */
async function getTopOrganizationsByUsage(limit: number = 10): Promise<
  Array<{
    org_id: string;
    org_name: string | null;
    total_requests: number;
    total_cost_usd: number;
    last_request_at: string | null;
  }>
> {
  try {
    // Query ledger grouped by organization
    const { data, error } = await supabase.rpc('get_top_orgs_by_usage', {
      result_limit: limit,
    });

    if (error) {
      // If RPC doesn't exist, fall back to manual query
      logger.warn('[Top Orgs] RPC not found, using fallback query');

      const { data: ledgerData } = await supabase
        .from('ai_usage_ledger')
        .select('organization_id, estimated_cost_usd, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      // Group by org and aggregate
      const orgMap = new Map<
        string,
        { total_requests: number; total_cost_usd: number; last_request_at: string }
      >();

      ledgerData?.forEach((record) => {
        const orgId = record.organization_id || 'unknown';
        const existing = orgMap.get(orgId) || {
          total_requests: 0,
          total_cost_usd: 0,
          last_request_at: record.created_at,
        };

        existing.total_requests += 1;
        existing.total_cost_usd += record.estimated_cost_usd || 0;

        if (
          !existing.last_request_at ||
          new Date(record.created_at) > new Date(existing.last_request_at)
        ) {
          existing.last_request_at = record.created_at;
        }

        orgMap.set(orgId, existing);
      });

      // Convert to array and sort by cost
      const results = Array.from(orgMap.entries())
        .map(([orgId, stats]) => ({
          org_id: orgId,
          org_name: null,
          total_requests: stats.total_requests,
          total_cost_usd: Math.round(stats.total_cost_usd * 100) / 100,
          last_request_at: stats.last_request_at,
        }))
        .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
        .slice(0, limit);

      return results;
    }

    return data || [];
  } catch (error) {
    logger.error('[Top Orgs] Failed to fetch', { error });
    return [];
  }
}

export default router;
