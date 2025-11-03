// =====================================================
// AGENT PLAYBOOK SYNC API ROUTES
// Sprint 53 Phase 4.9
// =====================================================

import express, { Request, Response } from 'express';
import { agentPlaybookSyncEngine } from '../services/agentPlaybookSyncEngine';
import type {
  SyncAgentWithPlaybookInput,
  DetectDriftInput,
  AutoCorrectDriftInput,
  SyncLogQuery,
  DriftLogQuery,
} from '@pravado/shared-types';

const router = express.Router();

/**
 * POST /api/agent-playbook-sync/sync
 * Sync agent with organizational playbook
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const input: SyncAgentWithPlaybookInput = req.body;

    if (!input.agentId || !input.playbookId || !input.organizationId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'agentId, playbookId, and organizationId are required',
      });
    }

    const result = await agentPlaybookSyncEngine.syncAgentWithPlaybook(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error syncing agent with playbook:', error);
    res.status(500).json({
      error: 'Failed to sync agent with playbook',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-playbook-sync/detect-drift
 * Detect drift from playbook expectations
 */
router.post('/detect-drift', async (req: Request, res: Response) => {
  try {
    const input: DetectDriftInput = req.body;

    if (!input.agentId || !input.organizationId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'agentId and organizationId are required',
      });
    }

    const report = await agentPlaybookSyncEngine.detectDriftFromPlaybook(input);

    res.status(200).json({ success: true, report });
  } catch (error: any) {
    console.error('Error detecting drift:', error);
    res.status(500).json({
      error: 'Failed to detect drift',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent-playbook-sync/correct-drift
 * Auto-correct detected drift
 */
router.post('/correct-drift', async (req: Request, res: Response) => {
  try {
    const input: AutoCorrectDriftInput = req.body;

    if (!input.agentId || !input.organizationId) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'agentId and organizationId are required',
      });
    }

    const result = await agentPlaybookSyncEngine.autoCorrectDrift(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error correcting drift:', error);
    res.status(500).json({
      error: 'Failed to correct drift',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-playbook-sync/sync-logs/:agentId
 * Get sync logs for an agent
 */
router.get('/sync-logs/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      playbookId,
      organizationId,
      status,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const query: SyncLogQuery = {
      agentId,
      playbookId: playbookId as string,
      organizationId: organizationId as string,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const logs = await agentPlaybookSyncEngine.getSyncLogs(query);

    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({
      error: 'Failed to fetch sync logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-playbook-sync/drift-logs/:agentId
 * Get drift detection logs for an agent
 */
router.get('/drift-logs/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      playbookId,
      organizationId,
      severity,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const query: DriftLogQuery = {
      agentId,
      playbookId: playbookId as string,
      organizationId: organizationId as string,
      severity: severity as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const logs = await agentPlaybookSyncEngine.getDriftLogs(query);

    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    console.error('Error fetching drift logs:', error);
    res.status(500).json({
      error: 'Failed to fetch drift logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-playbook-sync/drift-metrics
 * Get drift metrics
 */
router.get('/drift-metrics', async (req: Request, res: Response) => {
  try {
    const { agentId, organizationId, startDate, endDate } = req.query;

    const metrics = await agentPlaybookSyncEngine.getDriftMetrics(
      agentId as string,
      organizationId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching drift metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch drift metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-playbook-sync/sync-metrics
 * Get sync metrics
 */
router.get('/sync-metrics', async (req: Request, res: Response) => {
  try {
    const { agentId, organizationId, startDate, endDate } = req.query;

    const metrics = await agentPlaybookSyncEngine.getSyncMetrics(
      agentId as string,
      organizationId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({ success: true, metrics });
  } catch (error: any) {
    console.error('Error fetching sync metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch sync metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/agent-playbook-sync/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-playbook-sync',
  });
});

export default router;
