// =====================================================
// ADMIN CONSOLE API ROUTES
// Sprint 56 Phase 5.3
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import { AdminAnalyticsService } from '../services/adminAnalyticsService';
import { dbPool } from '../config/database';
import {
  AnalyticsTimeRange,
  ErrorCategory,
  ErrorSeverity,
} from '@pravado/shared-types';

const router = Router();
const adminAnalyticsService = new AdminAnalyticsService(dbPool);

// =====================================================
// MIDDLEWARE - ADMIN AUTHENTICATION
// =====================================================

async function requireAdminAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - authentication required',
      });
    }

    const isAdmin = await adminAnalyticsService.verifyAdminAccess(userId);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - admin access required',
      });
    }

    // Attach admin permissions to request
    const permissions = await adminAnalyticsService.getAdminPermissions(userId);
    (req as any).adminPermissions = permissions;

    next();
  } catch (error: any) {
    console.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
}

// Apply admin middleware to all routes
router.use(requireAdminAccess);

// =====================================================
// OVERVIEW STATISTICS ROUTES
// =====================================================

/**
 * GET /api/admin-console/overview
 * Get global overview statistics
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as AnalyticsTimeRange) || AnalyticsTimeRange.LAST_7D;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await adminAnalyticsService.getOverviewStats(timeRange, startDate, endDate);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview statistics',
      message: error.message,
    });
  }
});

// =====================================================
// TENANT ACTIVITY ROUTES
// =====================================================

/**
 * GET /api/admin-console/tenants
 * Get tenant activity data
 */
router.get('/tenants', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as AnalyticsTimeRange) || AnalyticsTimeRange.LAST_7D;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const filters = {
      searchTerm: req.query.searchTerm as string,
      minRequests: req.query.minRequests ? parseInt(req.query.minRequests as string) : undefined,
      maxRequests: req.query.maxRequests ? parseInt(req.query.maxRequests as string) : undefined,
      minErrorRate: req.query.minErrorRate ? parseFloat(req.query.minErrorRate as string) : undefined,
      maxErrorRate: req.query.maxErrorRate ? parseFloat(req.query.maxErrorRate as string) : undefined,
      rateLimitTier: req.query.rateLimitTier as string,
      sortBy: req.query.sortBy as 'requests' | 'errorRate' | 'lastActivity' | 'organizationName',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const { tenants, total } = await adminAnalyticsService.getTenantActivity(
      filters,
      timeRange,
      startDate,
      endDate
    );

    const page = Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1;

    res.json({
      success: true,
      tenants,
      total,
      page,
      pageSize: filters.limit || 100,
    });
  } catch (error: any) {
    console.error('Error fetching tenant activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant activity',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin-console/tenants/export
 * Export tenant activity to CSV
 */
router.get('/tenants/export', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).adminPermissions;
    if (!permissions?.permissions?.canExportData) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - export permission required',
      });
    }

    const timeRange = (req.query.timeRange as AnalyticsTimeRange) || AnalyticsTimeRange.LAST_7D;

    const filters = {
      searchTerm: req.query.searchTerm as string,
      sortBy: req.query.sortBy as 'requests' | 'errorRate' | 'lastActivity' | 'organizationName',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: 10000, // Max export limit
      offset: 0,
    };

    const csvData = await adminAnalyticsService.exportTenantActivity(filters, timeRange);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tenant-activity-${Date.now()}.csv`);
    res.send(csvData);
  } catch (error: any) {
    console.error('Error exporting tenant activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export tenant activity',
      message: error.message,
    });
  }
});

// =====================================================
// AGENT ACTIVITY ROUTES
// =====================================================

/**
 * GET /api/admin-console/agents
 * Get agent activity statistics
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as AnalyticsTimeRange) || AnalyticsTimeRange.LAST_7D;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const filters = {
      searchTerm: req.query.searchTerm as string,
      organizationId: req.query.organizationId as string,
      agentType: req.query.agentType as string,
      status: req.query.status as 'active' | 'idle' | 'error' | 'offline',
      minRequests: req.query.minRequests ? parseInt(req.query.minRequests as string) : undefined,
      maxErrorRate: req.query.maxErrorRate ? parseFloat(req.query.maxErrorRate as string) : undefined,
      sortBy: req.query.sortBy as 'requests' | 'errorRate' | 'responseTime' | 'agentName',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const { agents, total } = await adminAnalyticsService.getAgentActivity(
      filters,
      timeRange,
      startDate,
      endDate
    );

    const page = Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1;

    res.json({
      success: true,
      agents,
      total,
      page,
      pageSize: filters.limit || 100,
    });
  } catch (error: any) {
    console.error('Error fetching agent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent activity',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin-console/agents/heatmap
 * Get agent load heatmap data
 */
router.get('/agents/heatmap', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as AnalyticsTimeRange) || AnalyticsTimeRange.LAST_24H;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const agentIds = req.query.agentIds ? (req.query.agentIds as string).split(',') : [];

    const heatmapData = await adminAnalyticsService.getAgentLoadHeatmap(
      agentIds,
      timeRange,
      startDate,
      endDate
    );

    res.json({
      success: true,
      heatmapData,
    });
  } catch (error: any) {
    console.error('Error fetching agent heatmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent heatmap data',
      message: error.message,
    });
  }
});

// =====================================================
// ERROR LOGS ROUTES
// =====================================================

/**
 * GET /api/admin-console/errors
 * Get error logs with filters
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).adminPermissions;
    if (!permissions?.permissions?.canViewErrorLogs) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - error log access required',
      });
    }

    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      errorType: req.query.errorType as string,
      errorCategory: req.query.errorCategory as ErrorCategory,
      severity: req.query.severity as ErrorSeverity,
      statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
      endpoint: req.query.endpoint as string,
      method: req.query.method as string,
      tenantId: req.query.tenantId as string,
      organizationId: req.query.organizationId as string,
      agentId: req.query.agentId as string,
      searchTerm: req.query.searchTerm as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const { logs, total, statusCodeDistribution } = await adminAnalyticsService.getErrorLogs(
      filters
    );

    const page = Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1;

    res.json({
      success: true,
      logs,
      statusCodeDistribution,
      total,
      page,
      pageSize: filters.limit || 100,
    });
  } catch (error: any) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error logs',
      message: error.message,
    });
  }
});

// =====================================================
// PERFORMANCE METRICS ROUTES
// =====================================================

/**
 * GET /api/admin-console/performance
 * Get performance metrics
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const permissions = (req as any).adminPermissions;
    if (!permissions?.permissions?.canViewPerformanceMetrics) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - performance metrics access required',
      });
    }

    const timeRange = (req.query.timeRange as AnalyticsTimeRange) || AnalyticsTimeRange.LAST_7D;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const filters = {
      endpoint: req.query.endpoint as string,
      method: req.query.method as string,
      minResponseTime: req.query.minResponseTime ? parseFloat(req.query.minResponseTime as string) : undefined,
      sortBy: req.query.sortBy as 'requests' | 'avgResponseTime' | 'errorRate',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const { routes, webhooks, slowestRequests } = await adminAnalyticsService.getPerformanceMetrics(
      filters,
      timeRange,
      startDate,
      endDate
    );

    res.json({
      success: true,
      routes,
      webhooks,
      slowestRequests,
      total: routes.length + webhooks.length,
    });
  } catch (error: any) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
      message: error.message,
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/admin-console/health
 * Admin console health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
