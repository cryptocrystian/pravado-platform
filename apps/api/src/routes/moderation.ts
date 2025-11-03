// =====================================================
// MODERATION API ROUTES
// Sprint 57 Phase 5.4
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import { ModerationService } from '../services/moderationService';
import {
  AuditLogFilters,
  AbuseReportFilters,
  FlagClientRequest,
  BanTokenRequest,
  ExportFormat,
} from '@pravado/shared-types';

const router = Router();

// Initialize moderation service (database will be injected via middleware)
let moderationService: ModerationService;

// Middleware to initialize service with database
export function initModerationService(service: ModerationService) {
  moderationService = service;
}

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Middleware to verify moderator access
 */
async function requireModeratorAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - authentication required',
      });
    }

    const isModerator = await moderationService.verifyModeratorAccess(userId);

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - moderator access required',
      });
    }

    // Attach moderator permissions to request
    const permissions = await moderationService.getModeratorPermissions(userId);
    (req as any).moderatorPermissions = permissions;

    next();
  } catch (error: any) {
    console.error('Moderator authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
}

// Apply moderator middleware to all routes
router.use(requireModeratorAccess);

// =====================================================
// AUDIT LOG ROUTES
// =====================================================

/**
 * GET /api/moderation/audit-logs
 * Get audit logs with filtering and pagination
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).moderatorPermissions;

    if (!permissions.canViewAuditLogs) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view audit logs',
      });
    }

    const filters: AuditLogFilters = {
      actorId: req.query.actorId as string,
      actionTypes: req.query.actionTypes
        ? JSON.parse(req.query.actionTypes as string)
        : undefined,
      targetId: req.query.targetId as string,
      organizationId: req.query.organizationId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      ipAddress: req.query.ipAddress as string,
      success: req.query.success ? req.query.success === 'true' : undefined,
      searchQuery: req.query.searchQuery as string,
      page: req.query.page ? parseInt(req.query.page as string) : 0,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    };

    const result = await moderationService.getAuditLogs(filters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/moderation/audit-logs/export
 * Export audit logs to CSV or JSON
 */
router.get('/audit-logs/export', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).moderatorPermissions;

    if (!permissions.canExportAuditLogs) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to export audit logs',
      });
    }

    const format = (req.query.format as ExportFormat) || 'csv';

    const filters: AuditLogFilters = {
      actorId: req.query.actorId as string,
      actionTypes: req.query.actionTypes
        ? JSON.parse(req.query.actionTypes as string)
        : undefined,
      targetId: req.query.targetId as string,
      organizationId: req.query.organizationId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      ipAddress: req.query.ipAddress as string,
      success: req.query.success ? req.query.success === 'true' : undefined,
      searchQuery: req.query.searchQuery as string,
    };

    const data = await moderationService.exportAuditLogs(format, filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      );
      res.send(data);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.json`
      );
      res.json(data);
    }
  } catch (error: any) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
      message: error.message,
    });
  }
});

// =====================================================
// ABUSE REPORT ROUTES
// =====================================================

/**
 * GET /api/moderation/abuse-reports
 * Get abuse reports with filtering
 */
router.get('/abuse-reports', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).moderatorPermissions;

    if (!permissions.canViewAbuseReports) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view abuse reports',
      });
    }

    const filters: AbuseReportFilters = {
      abuseScore: req.query.abuseScore as any,
      patterns: req.query.patterns ? JSON.parse(req.query.patterns as string) : undefined,
      clientId: req.query.clientId as string,
      ipAddress: req.query.ipAddress as string,
      tokenId: req.query.tokenId as string,
      organizationId: req.query.organizationId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      minSeverity: req.query.minSeverity ? parseInt(req.query.minSeverity as string) : undefined,
      maxSeverity: req.query.maxSeverity ? parseInt(req.query.maxSeverity as string) : undefined,
      isFlagged: req.query.isFlagged ? req.query.isFlagged === 'true' : undefined,
      isResolved: req.query.isResolved ? req.query.isResolved === 'true' : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 0,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    };

    const result = await moderationService.getAbuseReports(filters);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error fetching abuse reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch abuse reports',
      message: error.message,
    });
  }
});

// =====================================================
// MODERATION ACTION ROUTES
// =====================================================

/**
 * POST /api/moderation/flag-client
 * Flag a client with moderation action
 */
router.post('/flag-client', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).moderatorPermissions;

    if (!permissions.canFlagClients) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to flag clients',
      });
    }

    const userId = (req as any).user?.userId;
    const request: FlagClientRequest = req.body;

    // Validate request
    if (!request.clientId && !request.tokenId && !request.ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'At least one identifier (clientId, tokenId, or ipAddress) is required',
      });
    }

    if (!request.flagReason || !request.flagType || !request.severity) {
      return res.status(400).json({
        success: false,
        error: 'flagReason, flagType, and severity are required',
      });
    }

    const flagId = await moderationService.flagClient(request, userId);

    res.json({
      success: true,
      flagId,
      message: 'Client flagged successfully',
    });
  } catch (error: any) {
    console.error('Error flagging client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag client',
      message: error.message,
    });
  }
});

/**
 * POST /api/moderation/ban-token
 * Ban a token and revoke access
 */
router.post('/ban-token', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).moderatorPermissions;

    if (!permissions.canBanTokens) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to ban tokens',
      });
    }

    const userId = (req as any).user?.userId;
    const request: BanTokenRequest = req.body;

    // Validate request
    if (!request.tokenId || !request.reason) {
      return res.status(400).json({
        success: false,
        error: 'tokenId and reason are required',
      });
    }

    const result = await moderationService.banToken(request, userId);

    res.json(result);
  } catch (error: any) {
    console.error('Error banning token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ban token',
      message: error.message,
    });
  }
});

/**
 * GET /api/moderation/check-flagged
 * Check if a client/token/IP is flagged
 */
router.get('/check-flagged', async (req: Request, res: Response) => {
  try {
    const { clientId, tokenId, ipAddress } = req.query;

    if (!clientId && !tokenId && !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'At least one identifier (clientId, tokenId, or ipAddress) is required',
      });
    }

    const isFlagged = await moderationService.isFlagged(
      clientId as string,
      tokenId as string,
      ipAddress as string
    );

    const activeFlags = await moderationService.getActiveFlags(
      clientId as string,
      tokenId as string,
      ipAddress as string
    );

    res.json({
      success: true,
      isFlagged,
      activeFlags,
    });
  } catch (error: any) {
    console.error('Error checking flagged status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check flagged status',
      message: error.message,
    });
  }
});

// =====================================================
// STATISTICS ROUTES
// =====================================================

/**
 * GET /api/moderation/stats
 * Get moderation dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '7d';

    const stats = await moderationService.getModerationStats(timeRange);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation statistics',
      message: error.message,
    });
  }
});

/**
 * GET /api/moderation/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'moderation',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

export default router;
