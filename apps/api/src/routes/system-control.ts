// =====================================================
// SYSTEM CONTROL API ROUTES
// Sprint 61 Phase 5.8
// =====================================================

import { Router, Request, Response } from 'express';
import { SystemControlService } from '../services/systemControlService';
import {
  getProductionFlags,
  setProductionFlag,
  FLAG_DESCRIPTIONS,
  validateFlags,
} from '../config/productionFlags';
import { LockdownRequest, UnlockRequest, FlagUpdateRequest } from '@pravado/types';

const router = Router();

/**
 * GET /api/system/status
 * Get comprehensive system status including lockdown, flags, and health
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await SystemControlService.getSystemStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Error in GET /status:', error);
    res.status(500).json({
      error: error.message || 'Failed to get system status',
    });
  }
});

/**
 * GET /api/system/health
 * Get detailed system health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await SystemControlService.getSystemHealth();

    // Set HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error: any) {
    console.error('Error in GET /health:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      checks: [],
      uptime: 0,
      version: '1.0.0',
      error: error.message || 'Health check failed',
    });
  }
});

/**
 * GET /api/system/readiness
 * Get system readiness status
 */
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    const readiness = await SystemControlService.getSystemReadiness();

    // Set HTTP status based on readiness
    const statusCode = readiness.ready ? 200 : 503;

    res.status(statusCode).json(readiness);
  } catch (error: any) {
    console.error('Error in GET /readiness:', error);
    res.status(503).json({
      ready: false,
      timestamp: new Date(),
      checks: {
        database: false,
        redis: false,
        openai: false,
        migrations: false,
      },
      message: error.message || 'Readiness check failed',
    });
  }
});

/**
 * POST /api/system/lockdown
 * Enable system lockdown
 */
router.post('/lockdown', async (req: Request, res: Response) => {
  try {
    const request: LockdownRequest = req.body;

    if (!request.reason) {
      return res.status(400).json({
        error: 'Missing required field: reason',
      });
    }

    if (!request.actorId) {
      return res.status(400).json({
        error: 'Missing required field: actorId',
      });
    }

    await SystemControlService.lockSystem(
      request.reason,
      request.actorId,
      request.actorEmail,
      request.affectedSystems
    );

    res.json({
      success: true,
      message: 'System lockdown enabled',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error in POST /lockdown:', error);
    res.status(500).json({
      error: error.message || 'Failed to enable lockdown',
    });
  }
});

/**
 * POST /api/system/unlock
 * Disable system lockdown
 */
router.post('/unlock', async (req: Request, res: Response) => {
  try {
    const request: UnlockRequest = req.body;

    if (!request.actorId) {
      return res.status(400).json({
        error: 'Missing required field: actorId',
      });
    }

    await SystemControlService.unlockSystem(
      request.actorId,
      request.actorEmail,
      request.reason
    );

    res.json({
      success: true,
      message: 'System lockdown disabled',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error in POST /unlock:', error);
    res.status(500).json({
      error: error.message || 'Failed to disable lockdown',
    });
  }
});

/**
 * GET /api/system/flags
 * Get all production flags
 */
router.get('/flags', async (req: Request, res: Response) => {
  try {
    const flags = getProductionFlags();
    const validation = validateFlags();

    res.json({
      flags,
      descriptions: FLAG_DESCRIPTIONS,
      validation,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error in GET /flags:', error);
    res.status(500).json({
      error: error.message || 'Failed to get flags',
    });
  }
});

/**
 * PUT /api/system/flags/:flagName
 * Update a specific production flag
 */
router.put('/flags/:flagName', async (req: Request, res: Response) => {
  try {
    const { flagName } = req.params;
    const request: FlagUpdateRequest = {
      flagName: flagName as any,
      ...req.body,
    };

    if (typeof request.value !== 'boolean') {
      return res.status(400).json({
        error: 'Missing or invalid field: value (must be boolean)',
      });
    }

    if (!request.actorId) {
      return res.status(400).json({
        error: 'Missing required field: actorId',
      });
    }

    // Validate flag name
    const validFlags = [
      'ENABLE_PUBLIC_API_ACCESS',
      'DISABLE_MODERATION_AUTOFLOW',
      'AUDIT_LOGGING_ENABLED',
      'TRACE_LOGGING_ENABLED',
      'RATE_LIMIT_TUNING_MODE',
    ];

    if (!validFlags.includes(flagName)) {
      return res.status(400).json({
        error: `Invalid flag name. Valid flags: ${validFlags.join(', ')}`,
      });
    }

    await SystemControlService.updateProductionFlag(
      flagName,
      request.value,
      request.actorId,
      request.actorEmail,
      request.reason
    );

    const updatedFlags = getProductionFlags();

    res.json({
      success: true,
      message: `Flag ${flagName} updated to ${request.value}`,
      flags: updatedFlags,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error in PUT /flags/:flagName:', error);
    res.status(500).json({
      error: error.message || 'Failed to update flag',
    });
  }
});

/**
 * GET /api/system/config-sync
 * Get configuration sync status
 */
router.get('/config-sync', async (req: Request, res: Response) => {
  try {
    const syncStatus = await SystemControlService.getConfigSyncStatus();
    res.json(syncStatus);
  } catch (error: any) {
    console.error('Error in GET /config-sync:', error);
    res.status(500).json({
      error: error.message || 'Failed to get config sync status',
    });
  }
});

/**
 * GET /api/system/production-readiness
 * Get production readiness report
 */
router.get('/production-readiness', async (req: Request, res: Response) => {
  try {
    const report = await SystemControlService.getProductionReadinessReport();
    res.json(report);
  } catch (error: any) {
    console.error('Error in GET /production-readiness:', error);
    res.status(500).json({
      error: error.message || 'Failed to get production readiness report',
    });
  }
});

/**
 * GET /api/system/version
 * Get system version information
 */
router.get('/version', async (req: Request, res: Response) => {
  try {
    res.json({
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error in GET /version:', error);
    res.status(500).json({
      error: error.message || 'Failed to get version',
    });
  }
});

export default router;
