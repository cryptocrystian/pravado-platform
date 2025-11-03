// =====================================================
// ADMIN ACCESS API ROUTES
// Sprint 60 Phase 5.7
// =====================================================

import { Router, Request, Response } from 'express';
import { RoleAccessService } from '../services/roleAccessService';
import {
  AssignRoleRequest,
  RemoveRoleRequest,
  GrantPermissionRequest,
  RevokePermissionRequest,
  RoleAuditFilters,
} from '@pravado/shared-types';

const router = Router();

/**
 * GET /api/admin-access/roles
 * Retrieves all admin roles with their permissions
 */
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const roles = await RoleAccessService.getAdminRoles();
    res.json(roles);
  } catch (error: any) {
    console.error('Error in GET /roles:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch roles',
    });
  }
});

/**
 * GET /api/admin-access/permissions
 * Retrieves all available permissions
 */
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = await RoleAccessService.getAdminPermissions();
    res.json(permissions);
  } catch (error: any) {
    console.error('Error in GET /permissions:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch permissions',
    });
  }
});

/**
 * POST /api/admin-access/assign-role
 * Assigns a role to a user
 */
router.post('/assign-role', async (req: Request, res: Response) => {
  try {
    const request: AssignRoleRequest = req.body;
    const actorId = req.body.actorId || 'system'; // Should come from auth middleware
    const actorEmail = req.body.actorEmail;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    if (!request.userId || !request.role) {
      return res.status(400).json({
        error: 'Missing required fields: userId and role',
      });
    }

    const response = await RoleAccessService.assignRoleToUser(
      request,
      actorId,
      actorEmail,
      ipAddress,
      userAgent
    );

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error in POST /assign-role:', error);
    res.status(500).json({
      error: error.message || 'Failed to assign role',
    });
  }
});

/**
 * POST /api/admin-access/remove-role
 * Removes a role from a user
 */
router.post('/remove-role', async (req: Request, res: Response) => {
  try {
    const request: RemoveRoleRequest = req.body;
    const actorId = req.body.actorId || 'system';
    const actorEmail = req.body.actorEmail;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    if (!request.userId || !request.role) {
      return res.status(400).json({
        error: 'Missing required fields: userId and role',
      });
    }

    const success = await RoleAccessService.removeRoleFromUser(
      request,
      actorId,
      actorEmail,
      ipAddress,
      userAgent
    );

    res.json({ success });
  } catch (error: any) {
    console.error('Error in POST /remove-role:', error);
    res.status(500).json({
      error: error.message || 'Failed to remove role',
    });
  }
});

/**
 * POST /api/admin-access/grant-permission
 * Grants a permission to a role
 */
router.post('/grant-permission', async (req: Request, res: Response) => {
  try {
    const request: GrantPermissionRequest = req.body;
    const actorId = req.body.actorId || 'system';
    const actorEmail = req.body.actorEmail;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    if (!request.role || !request.permission) {
      return res.status(400).json({
        error: 'Missing required fields: role and permission',
      });
    }

    const response = await RoleAccessService.grantPermissionToRole(
      request,
      actorId,
      actorEmail,
      ipAddress,
      userAgent
    );

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error in POST /grant-permission:', error);
    res.status(500).json({
      error: error.message || 'Failed to grant permission',
    });
  }
});

/**
 * POST /api/admin-access/revoke-permission
 * Revokes a permission from a role
 */
router.post('/revoke-permission', async (req: Request, res: Response) => {
  try {
    const request: RevokePermissionRequest = req.body;
    const actorId = req.body.actorId || 'system';
    const actorEmail = req.body.actorEmail;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    if (!request.role || !request.permission) {
      return res.status(400).json({
        error: 'Missing required fields: role and permission',
      });
    }

    const success = await RoleAccessService.revokePermissionFromRole(
      request,
      actorId,
      actorEmail,
      ipAddress,
      userAgent
    );

    res.json({ success });
  } catch (error: any) {
    console.error('Error in POST /revoke-permission:', error);
    res.status(500).json({
      error: error.message || 'Failed to revoke permission',
    });
  }
});

/**
 * GET /api/admin-access/audit-log
 * Retrieves role/permission audit trail
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const filters: RoleAuditFilters = {
      actionType: req.query.actionType as any,
      actorId: req.query.actorId as string,
      targetUserId: req.query.targetUserId as string,
      role: req.query.role as any,
      permission: req.query.permission as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: parseInt(req.query.page as string) || 0,
      pageSize: parseInt(req.query.pageSize as string) || 50,
    };

    const results = await RoleAccessService.getRoleAuditTrail(filters);
    res.json(results);
  } catch (error: any) {
    console.error('Error in GET /audit-log:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch audit log',
    });
  }
});

/**
 * GET /api/admin-access/check-permission/:userId/:permission
 * Checks if a user has a specific permission
 */
router.get('/check-permission/:userId/:permission', async (req: Request, res: Response) => {
  try {
    const { userId, permission } = req.params;

    const result = await RoleAccessService.checkUserPermission(userId, permission as any);
    res.json(result);
  } catch (error: any) {
    console.error('Error in GET /check-permission:', error);
    res.status(500).json({
      error: error.message || 'Failed to check permission',
    });
  }
});

/**
 * GET /api/admin-access/statistics
 * Retrieves role statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = await RoleAccessService.getRoleStatistics();
    res.json(statistics);
  } catch (error: any) {
    console.error('Error in GET /statistics:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch statistics',
    });
  }
});

/**
 * GET /api/admin-access/users
 * Retrieves users with their roles
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const users = await RoleAccessService.getUsersWithRoles(page, pageSize);
    res.json(users);
  } catch (error: any) {
    console.error('Error in GET /users:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch users',
    });
  }
});

export default router;
