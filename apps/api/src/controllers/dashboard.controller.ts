// =====================================================
// DASHBOARD CONTROLLER
// =====================================================

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as service from '../services/dashboard.service';
import { DashboardFilters, CreateReportSnapshotInput, ScorecardCategory } from '@pravado/types';

// =====================================================
// STRATEGY METRICS
// =====================================================

export async function getStrategyMetrics(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate, campaigns, contentFormats, tiers } = req.query;

    const filters: DashboardFilters = {
      startDate: (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: (endDate as string) || new Date().toISOString().split('T')[0],
      campaigns: campaigns ? (campaigns as string).split(',') : undefined,
      contentFormats: contentFormats ? (contentFormats as string).split(',') : undefined,
      tiers: tiers ? (tiers as string).split(',') : undefined,
    };

    const metrics = await service.getStrategyDashboardMetrics(req.user!.organizationId, filters);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// REPORT SNAPSHOTS
// =====================================================

export async function createReportSnapshot(req: AuthRequest, res: Response) {
  try {
    const snapshot = await service.generateReportSnapshot(
      req.body as CreateReportSnapshotInput,
      req.user!.id
    );
    res.status(201).json(snapshot);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function listReportSnapshots(req: AuthRequest, res: Response) {
  try {
    const snapshots = await service.getReportSnapshots(req.user!.organizationId);
    res.json(snapshots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// SCORECARDS
// =====================================================

export async function createScorecard(req: AuthRequest, res: Response) {
  try {
    const { periodStart, periodEnd, category } = req.body;

    const scorecard = await service.calculateStrategyScorecard(
      req.user!.organizationId,
      new Date(periodStart),
      new Date(periodEnd),
      category as ScorecardCategory
    );

    res.status(201).json(scorecard);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
