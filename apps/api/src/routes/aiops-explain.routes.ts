// =====================================================
// AIOPS EXPLAINABILITY API ROUTES
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// REST API for decision logs and explainability

import { Router, Request, Response } from 'express';
import {
  getDecisionHistory,
  getLatestDecisionForOrg,
  getDecisionById,
  getDecisionSummary,
  explainDecisionById,
  explainLatestDecision,
  exportDecisions,
  getTrendingDecisions,
  isExplainabilityEnabled,
  getExplainabilityConfig,
} from '../services/aiops-explain.service';
import { logger } from '../lib/logger';

const router = Router();

// =====================================================
// DECISION HISTORY ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/explain/:organizationId/history
 * Get decision history for an organization
 * Query params: limit, taskCategory, provider, startDate, endDate
 */
router.get('/explain/:organizationId/history', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
        message: 'Set ENABLE_LLM_EXPLAINABILITY=true to enable this feature',
      });
    }

    const { organizationId } = req.params;
    const { limit, taskCategory, provider, startDate, endDate } = req.query;

    const history = await getDecisionHistory({
      organizationId,
      limit: limit ? parseInt(limit as string) : undefined,
      taskCategory: taskCategory as string,
      provider: provider as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({
      success: true,
      data: {
        organizationId,
        count: history.length,
        decisions: history,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error fetching decision history', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch decision history',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/explain/:organizationId/latest
 * Get latest decision for an organization
 */
router.get('/explain/:organizationId/latest', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId } = req.params;

    const decision = await getLatestDecisionForOrg(organizationId);

    if (!decision) {
      return res.status(404).json({
        success: false,
        error: 'No decisions found for this organization',
      });
    }

    res.json({
      success: true,
      data: decision,
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error fetching latest decision', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest decision',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/explain/:organizationId/decision/:decisionId
 * Get specific decision by ID
 */
router.get('/explain/:organizationId/decision/:decisionId', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId, decisionId } = req.params;

    const decision = await getDecisionById(organizationId, decisionId);

    if (!decision) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found',
      });
    }

    res.json({
      success: true,
      data: decision,
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error fetching decision by ID', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch decision',
      message: error.message,
    });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/explain/:organizationId/summary
 * Get decision summary for an organization
 * Query params: period (1h, 24h, 7d, 30d, all)
 */
router.get('/explain/:organizationId/summary', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId } = req.params;
    const period = (req.query.period as '1h' | '24h' | '7d' | '30d' | 'all') || '24h';

    const summary = await getDecisionSummary(organizationId, period);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error fetching decision summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch decision summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/explain/:organizationId/trending
 * Get trending decisions (most commonly selected models)
 * Query params: limit (default: 5)
 */
router.get('/explain/:organizationId/trending', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    const trending = await getTrendingDecisions(organizationId, limit);

    res.json({
      success: true,
      data: {
        organizationId,
        limit,
        trending,
      },
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error fetching trending decisions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending decisions',
      message: error.message,
    });
  }
});

// =====================================================
// EXPLAINABILITY ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/explain/:organizationId/decision/:decisionId/explain
 * Get detailed explanation for a specific decision
 */
router.get('/explain/:organizationId/decision/:decisionId/explain', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId, decisionId } = req.params;

    const explanation = await explainDecisionById(organizationId, decisionId);

    if (!explanation) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found',
      });
    }

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error explaining decision', error);
    res.status(500).json({
      success: false,
      error: 'Failed to explain decision',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-ops/explain/:organizationId/latest/explain
 * Get explanation for latest decision
 */
router.get('/explain/:organizationId/latest/explain', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId } = req.params;

    const explanation = await explainLatestDecision(organizationId);

    if (!explanation) {
      return res.status(404).json({
        success: false,
        error: 'No decisions found for this organization',
      });
    }

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error explaining latest decision', error);
    res.status(500).json({
      success: false,
      error: 'Failed to explain latest decision',
      message: error.message,
    });
  }
});

// =====================================================
// EXPORT ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/explain/:organizationId/export
 * Export all decision logs for an organization
 */
router.get('/explain/:organizationId/export', async (req: Request, res: Response) => {
  try {
    if (!isExplainabilityEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Explainability is not enabled',
      });
    }

    const { organizationId } = req.params;

    const exportData = await exportDecisions(organizationId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="decision-logs-${organizationId}-${new Date().toISOString()}.json"`
    );

    res.json(exportData);
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error exporting decisions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export decisions',
      message: error.message,
    });
  }
});

// =====================================================
// CONFIG ENDPOINTS
// =====================================================

/**
 * GET /api/ai-ops/explain/config
 * Get explainability configuration
 */
router.get('/explain/config', (req: Request, res: Response) => {
  try {
    const config = getExplainabilityConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('[AIOpsExplainRoutes] Error fetching config', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch config',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/ai-ops/explain/health
 * Health check for explainability system
 */
router.get('/explain/health', (req: Request, res: Response) => {
  const enabled = isExplainabilityEnabled();

  res.json({
    success: true,
    message: enabled
      ? 'Explainability system is operational'
      : 'Explainability system is disabled',
    enabled,
    version: '1.0.0',
    sprint: 70,
  });
});

export default router;
