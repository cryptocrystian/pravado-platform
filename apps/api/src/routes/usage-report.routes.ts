// =====================================================
// USAGE REPORT API ROUTES
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import { Router, Request, Response } from 'express';
import { generateUsageReport } from '../services/usage-report.service';
import {
  getUnbilledUsage,
  getDailyUsageRecords,
  aggregateDailyUsage,
} from '../services/billing-ledger.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/usage-report/:organizationId
 * Generate comprehensive usage report
 */
router.get('/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters required',
      });
    }

    const report = await generateUsageReport(
      organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'No usage data found for this period',
      });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('[UsageReportRoutes] Error generating report', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/usage-report/:organizationId/unbilled
 * Get unbilled usage
 */
router.get('/:organizationId/unbilled', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const unbilled = await getUnbilledUsage(organizationId);

    res.json({ success: true, data: unbilled });
  } catch (error: any) {
    logger.error('[UsageReportRoutes] Error getting unbilled usage', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/usage-report/:organizationId/daily
 * Get daily usage records
 */
router.get('/:organizationId/daily', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate required',
      });
    }

    const records = await getDailyUsageRecords(
      organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({ success: true, data: records });
  } catch (error: any) {
    logger.error('[UsageReportRoutes] Error getting daily records', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/usage-report/:organizationId/aggregate
 * Manually trigger daily aggregation
 */
router.post('/:organizationId/aggregate', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { date } = req.body;

    const aggregation = await aggregateDailyUsage(
      organizationId,
      date ? new Date(date) : new Date()
    );

    if (!aggregation) {
      return res.status(404).json({
        success: false,
        error: 'No usage to aggregate',
      });
    }

    res.json({ success: true, data: aggregation });
  } catch (error: any) {
    logger.error('[UsageReportRoutes] Error aggregating usage', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
