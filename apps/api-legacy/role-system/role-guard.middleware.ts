// =====================================================
// ROLE GUARD MIDDLEWARE
// Sprint 39 Phase 3.3.1: Role-based access control middleware
// =====================================================

import { Request, Response, NextFunction } from 'express';
import { UserRole, RolePermissions } from '@pravado/types';
import { roleDetectionService } from '../services/role-detection.service';

/**
 * Extend Express Request to include role context
 */
declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
      userPermissions?: RolePermissions;
      userId?: string;
      organizationId?: string;
    }
  }
}

/**
 * Middleware to detect and attach user role to request
 * Should be applied early in the middleware chain
 */
export async function detectUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract user context from headers
    const userId = req.headers['x-user-id'] as string;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Missing user or organization context' });
      return;
    }

    // Detect role
    const roleResult = await roleDetectionService.detectRole({
      userId,
      organizationId,
      session: req.session,
      context: req.body?.context || {},
    });

    // Attach to request
    req.userId = userId;
    req.organizationId = organizationId;
    req.userRole = roleResult.role;
    req.userPermissions = roleResult.permissions;

    next();
  } catch (error) {
    console.error('Error detecting user role:', error);
    res.status(500).json({ error: 'Failed to detect user role' });
  }
}

/**
 * Middleware factory to require specific roles
 * Usage: requireRole([UserRole.ADMIN, UserRole.DEVELOPER])
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({ error: 'User role not detected. Apply detectUserRole middleware first.' });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        error: 'Access denied',
        message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole: req.userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory to require specific permission
 * Usage: requirePermission('canManageCampaigns')
 */
export function requirePermission(permission: keyof RolePermissions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userPermissions) {
      res.status(401).json({ error: 'User permissions not detected. Apply detectUserRole middleware first.' });
      return;
    }

    if (!req.userPermissions[permission]) {
      res.status(403).json({
        error: 'Access denied',
        message: `This endpoint requires the '${permission}' permission`,
        userRole: req.userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory to require any of the specified permissions
 * Usage: requireAnyPermission(['canManageCampaigns', 'canManageContent'])
 */
export function requireAnyPermission(permissions: Array<keyof RolePermissions>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userPermissions) {
      res.status(401).json({ error: 'User permissions not detected. Apply detectUserRole middleware first.' });
      return;
    }

    const hasAnyPermission = permissions.some(
      (permission) => req.userPermissions![permission] === true
    );

    if (!hasAnyPermission) {
      res.status(403).json({
        error: 'Access denied',
        message: `This endpoint requires one of the following permissions: ${permissions.join(', ')}`,
        userRole: req.userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory to require all specified permissions
 * Usage: requireAllPermissions(['canManageCampaigns', 'canViewAnalytics'])
 */
export function requireAllPermissions(permissions: Array<keyof RolePermissions>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userPermissions) {
      res.status(401).json({ error: 'User permissions not detected. Apply detectUserRole middleware first.' });
      return;
    }

    const missingPermissions = permissions.filter(
      (permission) => !req.userPermissions![permission]
    );

    if (missingPermissions.length > 0) {
      res.status(403).json({
        error: 'Access denied',
        message: `This endpoint requires all of the following permissions: ${permissions.join(', ')}`,
        missingPermissions,
        userRole: req.userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check admin access
 * Shorthand for requireRole([UserRole.ADMIN])
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole([UserRole.ADMIN])(req, res, next);
}

/**
 * Middleware to check developer or admin access
 * Common pattern for technical endpoints
 */
export function requireDeveloperAccess(req: Request, res: Response, next: NextFunction): void {
  return requireRole([UserRole.ADMIN, UserRole.DEVELOPER])(req, res, next);
}

/**
 * Middleware to verify organization ownership
 * Ensures user belongs to the organization they're trying to access
 */
export async function verifyOrganizationAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const requestedOrgId = req.params.organizationId || req.body.organizationId || req.organizationId;

    if (!userId || !requestedOrgId) {
      res.status(400).json({ error: 'Missing user or organization ID' });
      return;
    }

    // Get all user roles across organizations
    const userRoles = await roleDetectionService.detectAllUserRoles(userId);

    // Check if user has access to requested organization
    const hasAccess = userRoles.some((role) => role.organizationId === requestedOrgId);

    if (!hasAccess) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this organization',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error verifying organization access:', error);
    res.status(500).json({ error: 'Failed to verify organization access' });
  }
}

/**
 * Example usage in routes:
 *
 * // Apply role detection globally
 * app.use('/api', detectUserRole);
 *
 * // Require specific role
 * router.get('/admin/users', requireRole([UserRole.ADMIN]), getUsers);
 *
 * // Require specific permission
 * router.post('/campaigns', requirePermission('canManageCampaigns'), createCampaign);
 *
 * // Require any permission
 * router.get('/analytics', requireAnyPermission(['canViewAnalytics', 'canExportData']), getAnalytics);
 *
 * // Require all permissions
 * router.delete('/critical', requireAllPermissions(['canManageSettings', 'canManageRoles']), deleteCritical);
 *
 * // Shorthand for admin
 * router.post('/system/config', requireAdmin, updateConfig);
 *
 * // Developer access
 * router.get('/api/keys', requireDeveloperAccess, getApiKeys);
 *
 * // Verify org access for multi-tenant routes
 * router.get('/org/:organizationId/data', verifyOrganizationAccess, getData);
 */
