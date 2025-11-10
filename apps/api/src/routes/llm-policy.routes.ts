// =====================================================
// LLM POLICY & COST CONTROL API ROUTES
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// REST API for policy management, usage tracking, and telemetry

import { Router, Request, Response } from 'express';
import {
  getPolicyWithDefaults,
  getPolicyWithUsage,
  checkPolicyCompliance,
  getOrganizationUsage,
  getUsageTrend,
  getPolicySummary,
} from '../services/llm-policy.service';
import {
  getBudgetState,
  getDailySpend,
  getRemainingBudget,
  getUsageSummary,
} from '../services/budget-guard.service';
import {
  getRecentTelemetry,
  getProviderTelemetry,
  getCircuitBrokenModels,
  exportTelemetrySnapshot,
} from '@pravado/utils/llm/metrics/telemetry';
import { getGuardrailStatus } from '../middleware/ai-guardrails';
import { logger } from '../lib/logger';

const router = Router();

// =====================================================
// POLICY ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/policy/:organizationId
 * Get policy configuration for an organization
 */
router.get('/policy/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const policy = await getPolicyWithDefaults(organizationId);

    res.json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching policy', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/policy/:organizationId/with-usage
 * Get policy with current usage statistics
 */
router.get('/policy/:organizationId/with-usage', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const policyWithUsage = await getPolicyWithUsage(organizationId);

    res.json({
      success: true,
      data: policyWithUsage,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching policy with usage', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy with usage',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/policy/:organizationId/compliance
 * Check if organization is within policy compliance
 */
router.get('/policy/:organizationId/compliance', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const compliance = await checkPolicyCompliance(organizationId);

    res.json({
      success: true,
      data: compliance,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error checking compliance', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check compliance',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/policy/:organizationId/summary
 * Get policy summary (lightweight version for dashboards)
 */
router.get('/policy/:organizationId/summary', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const summary = await getPolicySummary(organizationId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching policy summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy summary',
      message: error.message,
    });
  }
});

// =====================================================
// BUDGET & USAGE ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/budget/:organizationId/state
 * Get current budget state with usage percentage
 */
router.get('/budget/:organizationId/state', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const budgetState = await getBudgetState(organizationId);

    res.json({
      success: true,
      data: budgetState,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching budget state', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget state',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/budget/:organizationId/daily-spend
 * Get daily spend for today (or specified date)
 */
router.get('/budget/:organizationId/daily-spend', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const dailySpend = await getDailySpend(organizationId, targetDate);

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        spend: dailySpend,
      },
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching daily spend', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily spend',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/budget/:organizationId/remaining
 * Get remaining budget for today
 */
router.get('/budget/:organizationId/remaining', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const remaining = await getRemainingBudget(organizationId);

    res.json({
      success: true,
      data: {
        remainingBudget: remaining,
      },
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching remaining budget', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch remaining budget',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/usage/:organizationId/summary
 * Get usage summary for a date range
 * Query params: startDate, endDate (ISO 8601 format)
 */
router.get('/usage/:organizationId/summary', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const summary = await getUsageSummary(organizationId, start, end);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching usage summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/usage/:organizationId/trend
 * Get usage trend for last N days
 * Query param: days (default: 7)
 */
router.get('/usage/:organizationId/trend', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const trend = await getUsageTrend(organizationId, days);

    res.json({
      success: true,
      data: {
        days,
        trend,
      },
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching usage trend', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage trend',
      message: error.message,
    });
  }
});

// =====================================================
// TELEMETRY ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/telemetry/recent
 * Get recent telemetry for all models (last 24h)
 */
router.get('/telemetry/recent', async (req: Request, res: Response) => {
  try {
    const telemetry = getRecentTelemetry();

    res.json({
      success: true,
      data: telemetry,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching telemetry', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telemetry',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/telemetry/provider/:provider
 * Get telemetry for all models of a specific provider
 */
router.get('/telemetry/provider/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    const telemetry = getProviderTelemetry(provider);

    res.json({
      success: true,
      data: {
        provider,
        models: telemetry,
      },
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching provider telemetry', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider telemetry',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/telemetry/circuit-broken
 * Get list of circuit-broken models
 */
router.get('/telemetry/circuit-broken', async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.5;

    const brokenModels = getCircuitBrokenModels(threshold);

    res.json({
      success: true,
      data: {
        threshold,
        brokenModels,
      },
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching circuit-broken models', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch circuit-broken models',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/telemetry/snapshot
 * Export complete telemetry snapshot for debugging/reporting
 */
router.get('/telemetry/snapshot', async (req: Request, res: Response) => {
  try {
    const snapshot = exportTelemetrySnapshot();

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error exporting telemetry snapshot', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export telemetry snapshot',
      message: error.message,
    });
  }
});

// =====================================================
// GUARDRAIL ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/guardrails/:organizationId/status
 * Get current guardrail status (rate limits, concurrency, budget)
 */
router.get('/guardrails/:organizationId/status', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const status = await getGuardrailStatus(organizationId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('[LLMPolicyRoutes] Error fetching guardrail status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guardrail status',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/ai-ops/health
 * Health check endpoint for AI ops system
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AI Ops system is operational',
    version: '1.0.0',
    sprint: 69,
  });
});

export default router;
