/**
 * Admin Metrics Routes
 *
 * REST endpoints for executive dashboard KPIs.
 * RBAC: Only accessible to platform admins (is_platform_admin = true)
 *
 * Endpoints:
 * - GET /api/admin-metrics/overview - Comprehensive KPI overview
 * - GET /api/admin-metrics/revenue - Revenue metrics and trends
 * - GET /api/admin-metrics/funnels - Trial-to-paid funnel breakdown
 * - GET /api/admin-metrics/ops - Operational health metrics
 *
 * Sprint 75 - Track A: Executive Admin Console
 */

import { Router, Request, Response } from 'express';
import {
  getAdminOverview,
  getRevenueMetrics,
  getRevenueTrends,
  getTrialFunnelMetrics,
  getOpsMetrics,
  calculateNRR,
  calculatePaybackPeriod,
} from '../services/admin-metrics.service';
import { supabase } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import { captureException } from '../services/observability.service';

const router = Router();

// ============================================================================
// Middleware - Platform Admin Only
// ============================================================================

/**
 * Verify user is platform admin
 */
async function requirePlatformAdmin(req: Request, res: Response, next: Function) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is platform admin
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

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/admin-metrics/overview
 *
 * Comprehensive KPI overview for executive dashboard
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (default: '30d')
 *
 * Returns:
 * - revenue_metrics: MRR, ARR, ARPU, revenue by tier
 * - customer_metrics: Active customers, churn, LTV:CAC
 * - trial_metrics: Conversions, active trials
 * - ops_metrics: Latency, errors, provider health
 */
router.get(
  '/overview',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as '7d' | '30d' | '90d') || '30d';
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const overview = await getAdminOverview(organizationId, period);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/admin-metrics/overview',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin overview',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/admin-metrics/revenue
 *
 * Revenue metrics and historical trends
 *
 * Query params:
 * - start_date: ISO date string (default: 90 days ago)
 * - end_date: ISO date string (default: today)
 *
 * Returns:
 * - current_metrics: Current MRR, ARR, ARPU
 * - trends: Daily MRR snapshots with movements
 * - nrr: Net Revenue Retention percentage
 */
router.get(
  '/revenue',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const endDate = req.query.end_date
        ? new Date(req.query.end_date as string)
        : new Date();

      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const [currentMetrics, trends, nrr] = await Promise.all([
        getRevenueMetrics(organizationId, startDate),
        getRevenueTrends(organizationId, startDate, endDate),
        calculateNRR(organizationId, startDate, endDate),
      ]);

      res.json({
        success: true,
        data: {
          current_metrics: currentMetrics,
          trends,
          nrr,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/admin-metrics/revenue',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue metrics',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/admin-metrics/funnels
 *
 * Trial-to-paid conversion funnel breakdown
 *
 * Query params:
 * - start_date: ISO date string (default: 30 days ago)
 *
 * Returns:
 * - funnel_stages: Count and conversion rate for each stage
 * - overall_conversion: Trial → paid conversion rate
 * - avg_conversion_time: Average days to convert
 */
router.get(
  '/funnels',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const funnelMetrics = await getTrialFunnelMetrics(organizationId, startDate);

      // Calculate overall conversion rate
      const trialStarted = funnelMetrics.find(m => m.stage === 'trial_started');
      const trialConverted = funnelMetrics.find(m => m.stage === 'trial_converted');

      const overallConversion = trialStarted && trialStarted.count > 0
        ? ((trialConverted?.count || 0) / trialStarted.count) * 100
        : 0;

      // Calculate average conversion time (sum of all stage times)
      const avgConversionTime = funnelMetrics.reduce(
        (sum, m) => sum + m.avg_time_in_stage_hours,
        0
      ) / 24; // Convert to days

      res.json({
        success: true,
        data: {
          funnel_stages: funnelMetrics,
          overall_conversion: overallConversion,
          avg_conversion_time_days: avgConversionTime,
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/admin-metrics/funnels',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch funnel metrics',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/admin-metrics/ops
 *
 * Operational health and infrastructure metrics
 *
 * Query params:
 * - start_date: ISO date string (default: 24 hours ago)
 *
 * Returns:
 * - api_metrics: Latency, error rate, cache hit rate
 * - provider_health: Status of each provider (DB, Redis, AI)
 * - ai_metrics: Total requests, tokens, costs
 * - uptime: System uptime percentage
 */
router.get(
  '/ops',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const opsMetrics = await getOpsMetrics(organizationId, startDate);

      res.json({
        success: true,
        data: {
          api_metrics: {
            avg_latency_ms: opsMetrics.avg_api_latency_ms,
            error_rate_percent: opsMetrics.error_rate_percent,
            cache_hit_rate_percent: opsMetrics.cache_hit_rate_percent,
          },
          provider_health: opsMetrics.provider_health,
          ai_metrics: opsMetrics.ai_metrics,
          uptime_percent: opsMetrics.uptime_percent,
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/admin-metrics/ops',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch ops metrics',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/admin-metrics/calculations
 *
 * On-demand calculations for specific metrics
 *
 * Query params:
 * - metric: 'payback_period' | 'nrr' | 'ltv_cac'
 * - cac: Customer acquisition cost (for payback_period)
 * - arpu: Average revenue per user (for payback_period)
 * - start_date: ISO date string (for nrr)
 * - end_date: ISO date string (for nrr)
 *
 * Returns:
 * - metric_value: Calculated metric
 * - inputs: Input parameters used
 */
router.get(
  '/calculations',
  authenticateToken,
  requirePlatformAdmin,
  async (req: Request, res: Response) => {
    try {
      const { metric, cac, arpu, start_date, end_date } = req.query;
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      let result: any = {};

      switch (metric) {
        case 'payback_period':
          if (!cac || !arpu) {
            return res.status(400).json({ error: 'CAC and ARPU required for payback period' });
          }
          const paybackMonths = calculatePaybackPeriod(
            Number(cac),
            Number(arpu),
            0.964 // Gross margin from pricing validation
          );
          result = {
            metric: 'payback_period',
            value: paybackMonths,
            unit: 'months',
            inputs: { cac: Number(cac), arpu: Number(arpu), gross_margin: 0.964 },
          };
          break;

        case 'nrr':
          const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          const endDate = end_date ? new Date(end_date as string) : new Date();
          const nrr = await calculateNRR(organizationId, startDate, endDate);
          result = {
            metric: 'nrr',
            value: nrr,
            unit: 'percent',
            inputs: { start_date: startDate.toISOString(), end_date: endDate.toISOString() },
          };
          break;

        default:
          return res.status(400).json({ error: 'Invalid metric. Supported: payback_period, nrr' });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/admin-metrics/calculations',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to calculate metric',
        message: (error as Error).message,
      });
    }
  }
);

export default router;
