/**
 * Mobile Summary Routes
 *
 * Compact JSON endpoints optimized for mobile app consumption.
 * Returns lean, stable payloads with mobile API versioning.
 *
 * Endpoints:
 * - GET /api/mobile/summary - Executive KPIs summary for mobile dashboard
 *
 * Response format:
 * - Compact field names to reduce bandwidth
 * - Stable schema with API versioning (x-mobile-api-version header)
 * - Pagination support for large datasets
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import { Router, Request, Response } from 'express';
import { getAdminOverview } from '../../services/admin-metrics.service';
import { getUsageStatus } from '../../services/account-tier.service';
import { authenticateToken } from '../../middleware/auth';
import { captureException } from '../../services/observability.service';

const router = Router();

// Mobile API version
const MOBILE_API_VERSION = process.env.MOBILE_API_VERSION || '1';

// ============================================================================
// Middleware
// ============================================================================

/**
 * Add mobile API version header to all responses
 */
function addMobileVersionHeader(req: Request, res: Response, next: Function) {
  res.setHeader('x-mobile-api-version', MOBILE_API_VERSION);
  next();
}

router.use(addMobileVersionHeader);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/mobile/summary
 *
 * Executive summary for mobile dashboard
 * Compact JSON with essential KPIs
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (default: '30d')
 *
 * Returns compact summary:
 * {
 *   mrr: 127407,
 *   arr: 1528884,
 *   arpu: 750,
 *   customers: 150,
 *   trials: { active: 12, conv: 3.2 },
 *   health: { api: 145, err: 0.3, uptime: 99.9 }
 * }
 */
router.get(
  '/summary',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as '7d' | '30d' | '90d') || '30d';
      const organizationId = (req as any).user?.organization_id;
      const userId = (req as any).user?.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Check if user is platform admin (required for admin metrics)
      const { data: user } = await require('../../config/supabase').supabase
        .from('users')
        .select('is_platform_admin')
        .eq('id', userId)
        .single();

      if (!user?.is_platform_admin) {
        return res.status(403).json({ error: 'Platform admin access required' });
      }

      // Get admin overview
      const overview = await getAdminOverview(organizationId, period);

      // Build compact response
      const summary = {
        // Revenue metrics (compact field names)
        mrr: Math.round(overview.revenue_metrics.mrr),
        arr: Math.round(overview.revenue_metrics.arr),
        arpu: Math.round(overview.revenue_metrics.arpu),
        growth: Number(overview.revenue_metrics.mrr_growth_percent.toFixed(1)),

        // Customer metrics
        customers: overview.customer_metrics.active_customers,
        new: overview.customer_metrics.new_customers,
        churn: Number(overview.customer_metrics.churn_rate_percent.toFixed(1)),

        // Trial metrics
        trials: {
          active: overview.trial_metrics.active_trials,
          conv: Number(overview.trial_metrics.conversion_rate_percent.toFixed(1)),
          days: Math.round(overview.trial_metrics.avg_days_to_convert),
        },

        // Ops health
        health: {
          api: Math.round(overview.ops_metrics.avg_api_latency_ms),
          err: Number(overview.ops_metrics.error_rate_percent.toFixed(2)),
          cache: Number(overview.ops_metrics.cache_hit_rate_percent.toFixed(1)),
          uptime: Number(overview.ops_metrics.uptime_percent.toFixed(2)),
        },

        // Provider status (simplified)
        providers: {
          db: overview.ops_metrics.provider_health.supabase === 'healthy' ? 1 : 0,
          redis: overview.ops_metrics.provider_health.redis === 'healthy' ? 1 : 0,
          openai: overview.ops_metrics.provider_health.openai === 'healthy' ? 1 : 0,
          anthropic: overview.ops_metrics.provider_health.anthropic === 'healthy' ? 1 : 0,
        },

        // AI metrics
        ai: {
          reqs: overview.ops_metrics.ai_metrics.total_requests,
          cost: Number(overview.ops_metrics.ai_metrics.total_cost_usd.toFixed(2)),
          avg: Number(overview.ops_metrics.ai_metrics.avg_cost_per_request.toFixed(4)),
        },

        // Metadata
        period,
        ts: overview.as_of,
      };

      res.json({
        success: true,
        data: summary,
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/summary',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch mobile summary',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

/**
 * GET /api/mobile/usage
 *
 * Feature usage summary for current organization
 * Shows limits and utilization for mobile display
 *
 * Returns compact usage array:
 * [
 *   { f: "Contacts", u: 450, l: 5000, p: 9 },
 *   { f: "AI", u: 320, l: 500, p: 64 },
 *   ...
 * ]
 *
 * f = feature name
 * u = used
 * l = limit (null = unlimited)
 * p = utilization percent
 */
router.get(
  '/usage',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Get usage status
      const usageStatus = await getUsageStatus(organizationId);

      // Build compact usage array
      const usage = usageStatus.map(status => ({
        f: status.feature,
        u: status.used,
        l: status.limit,
        p: status.utilization_percent ? Math.round(status.utilization_percent) : null,
        warn: status.is_approaching_limit,
        max: status.is_at_limit,
      }));

      res.json({
        success: true,
        data: usage,
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/usage',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage summary',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

/**
 * GET /api/mobile/tier
 *
 * Current plan tier and pricing information
 *
 * Returns:
 * {
 *   tier: "pro",
 *   price: 599,
 *   next: "premium",
 *   features: { api: false, white_label: false, ... }
 * }
 */
router.get(
  '/tier',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organization_id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Get organization tier
      const { data: org } = await require('../../config/supabase').supabase
        .from('organizations')
        .select('plan_tier')
        .eq('id', organizationId)
        .single();

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get tier features from plan_policies
      const { data: policy } = await require('../../config/supabase').supabase
        .from('plan_policies')
        .select('*')
        .eq('tier', org.plan_tier)
        .single();

      if (!policy) {
        return res.status(404).json({ error: 'Plan policy not found' });
      }

      // Get next tier
      const { getNextTier } = require('../../services/account-tier.service');
      const nextTier = getNextTier(org.plan_tier);

      // Build compact response
      const tierInfo = {
        tier: org.plan_tier,
        price: policy.monthly_price_usd,
        next: nextTier,

        // Feature flags (compact)
        features: {
          api: policy.api_access,
          wl: policy.white_label_reports, // white-label
          ci: policy.custom_integrations,
          csm: policy.dedicated_csm,
        },

        // Limits (compact)
        limits: {
          contacts: policy.journalist_contacts_limit,
          ai: policy.ai_generations_monthly,
          searches: policy.media_searches_monthly,
          users: policy.max_users,
          podcast: policy.podcast_syndications_monthly,
          citemind: policy.citemind_queries_monthly,
        },
      };

      res.json({
        success: true,
        data: tierInfo,
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/tier',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch tier info',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

export default router;
