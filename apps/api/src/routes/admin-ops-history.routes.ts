// =====================================================
// ADMIN OPS HISTORY ROUTES
// Sprint 83: Post-Launch Reliability & SLO Automation
// =====================================================

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { captureException } from '../services/observability.service';
import { getRecentCostAnomalies } from '../services/cost-anomaly.service';
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
 * GET /api/v1/admin/ops-history
 *
 * Returns 30 days of SLO metrics and cost trends for dashboard visualization
 *
 * Response:
 * {
 *   slo_metrics: Array<{ date, uptime_percent, avg_latency_ms, error_rate_percent, llm_failure_rate_percent, status }>,
 *   cost_trends: Array<{ date, total_cost_usd, total_requests }>,
 *   anomalies: Array<{ org_id, date, current_cost_usd, baseline_cost_usd, percent_increase, severity }>
 * }
 *
 * RBAC: Platform admin only
 */
router.get(
  '/',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      logger.info('[Admin Ops History] Fetching historical metrics...');

      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // 1. Fetch SLO metrics from ops_slo_metrics table
      const { data: sloData, error: sloError } = await supabase
        .from('ops_slo_metrics')
        .select('date, uptime_percent, avg_latency_ms, error_rate_percent, llm_failure_rate_percent, status')
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      if (sloError) {
        logger.error('[Admin Ops History] Failed to fetch SLO metrics', { error: sloError });
        throw sloError;
      }

      // 2. Fetch cost trends from ai_usage_ledger
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('ai_usage_ledger')
        .select('created_at, estimated_cost_usd')
        .gte('created_at', startDate.toISOString());

      if (ledgerError) {
        logger.error('[Admin Ops History] Failed to fetch ledger data', { error: ledgerError });
        throw ledgerError;
      }

      // Aggregate ledger data by date
      const costByDate = new Map<string, { total_cost: number; total_requests: number }>();

      ledgerData?.forEach((record) => {
        const date = record.created_at.split('T')[0];
        const existing = costByDate.get(date) || { total_cost: 0, total_requests: 0 };
        existing.total_cost += record.estimated_cost_usd || 0;
        existing.total_requests += 1;
        costByDate.set(date, existing);
      });

      const costTrends = Array.from(costByDate.entries())
        .map(([date, stats]) => ({
          date,
          total_cost_usd: Math.round(stats.total_cost * 100) / 100,
          total_requests: stats.total_requests,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 3. Fetch recent cost anomalies
      const anomalies = await getRecentCostAnomalies();

      // 4. Build response
      const response = {
        timestamp: new Date().toISOString(),
        period_days: days,
        start_date: startDateStr,
        slo_metrics: sloData || [],
        cost_trends: costTrends,
        anomalies: anomalies,
        summary: {
          total_slo_records: sloData?.length || 0,
          total_cost_days: costTrends.length,
          total_anomalies: anomalies.length,
          avg_uptime: sloData?.length
            ? (sloData.reduce((sum, d) => sum + Number(d.uptime_percent), 0) / sloData.length).toFixed(2)
            : '0.00',
          avg_latency_ms: sloData?.length
            ? (sloData.reduce((sum, d) => sum + Number(d.avg_latency_ms), 0) / sloData.length).toFixed(2)
            : '0.00',
        },
      };

      logger.info('[Admin Ops History] Successfully fetched historical metrics', {
        slo_records: response.summary.total_slo_records,
        cost_days: response.summary.total_cost_days,
        anomalies: response.summary.total_anomalies,
      });

      res.json(response);
    } catch (error) {
      logger.error('[Admin Ops History] Failed to fetch metrics', { error });
      captureException(error as Error, { context: 'admin-ops-history' });

      res.status(500).json({
        error: 'Failed to fetch ops history',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/v1/admin/ops-history/summary
 *
 * Returns summarized SLO compliance for a period
 *
 * Response:
 * {
 *   period_days: number,
 *   slo_compliance: {
 *     uptime_met: boolean,
 *     latency_met: boolean,
 *     error_rate_met: boolean,
 *     llm_failure_rate_met: boolean
 *   },
 *   avg_metrics: { ... }
 * }
 */
router.get(
  '/summary',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      logger.info('[Admin Ops History] Fetching SLO summary...');

      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch SLO metrics
      const { data: sloData, error } = await supabase
        .from('ops_slo_metrics')
        .select('uptime_percent, avg_latency_ms, error_rate_percent, llm_failure_rate_percent, status')
        .gte('date', startDateStr);

      if (error) {
        logger.error('[Admin Ops History] Failed to fetch SLO data', { error });
        throw error;
      }

      if (!sloData || sloData.length === 0) {
        return res.json({
          period_days: days,
          message: 'No SLO data available for this period',
          slo_compliance: null,
          avg_metrics: null,
        });
      }

      // Calculate averages
      const avgUptime =
        sloData.reduce((sum, d) => sum + Number(d.uptime_percent), 0) / sloData.length;
      const avgLatency =
        sloData.reduce((sum, d) => sum + Number(d.avg_latency_ms), 0) / sloData.length;
      const avgErrorRate =
        sloData.reduce((sum, d) => sum + Number(d.error_rate_percent), 0) / sloData.length;
      const avgLLMFailureRate =
        sloData.reduce((sum, d) => sum + Number(d.llm_failure_rate_percent), 0) / sloData.length;

      // Check SLO compliance
      const sloCompliance = {
        uptime_met: avgUptime >= 99.9,
        latency_met: avgLatency < 1500,
        error_rate_met: avgErrorRate < 1.0,
        llm_failure_rate_met: avgLLMFailureRate < 10.0,
      };

      const allSlosMet = Object.values(sloCompliance).every((met) => met);

      // Count days by status
      const statusCounts = sloData.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const response = {
        period_days: days,
        start_date: startDateStr,
        slo_compliance: {
          ...sloCompliance,
          all_slos_met: allSlosMet,
        },
        avg_metrics: {
          uptime_percent: Math.round(avgUptime * 100) / 100,
          avg_latency_ms: Math.round(avgLatency * 100) / 100,
          error_rate_percent: Math.round(avgErrorRate * 100) / 100,
          llm_failure_rate_percent: Math.round(avgLLMFailureRate * 100) / 100,
        },
        status_distribution: statusCounts,
        total_days_tracked: sloData.length,
      };

      logger.info('[Admin Ops History] SLO summary generated', {
        all_slos_met: allSlosMet,
        days_tracked: sloData.length,
      });

      res.json(response);
    } catch (error) {
      logger.error('[Admin Ops History] Failed to fetch SLO summary', { error });
      captureException(error as Error, { context: 'admin-ops-history-summary' });

      res.status(500).json({
        error: 'Failed to fetch SLO summary',
        message: (error as Error).message,
      });
    }
  }
);

export default router;
