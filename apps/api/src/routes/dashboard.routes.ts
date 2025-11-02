// =====================================================
// DASHBOARD ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

// STRATEGY METRICS
router.get('/strategy-metrics', controller.getStrategyMetrics);

// REPORT SNAPSHOTS
router.post('/report-snapshots', requireRole('CONTRIBUTOR'), controller.createReportSnapshot);
router.get('/report-snapshots', controller.listReportSnapshots);

// SCORECARDS
router.post('/scorecards', requireRole('CONTRIBUTOR'), controller.createScorecard);

export default router;
