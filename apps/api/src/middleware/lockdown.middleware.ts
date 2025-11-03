// =====================================================
// LOCKDOWN MIDDLEWARE
// Sprint 61 Phase 5.8
// =====================================================

import { Request, Response, NextFunction } from 'express';
import { getSystemLockdown, isSystemLocked } from '../config/productionFlags';

/**
 * Middleware to enforce system lockdown
 * Blocks all requests except system control endpoints when lockdown is active
 */
export function lockdownMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow system control endpoints even during lockdown
  const systemControlPaths = [
    '/api/system/status',
    '/api/system/health',
    '/api/system/readiness',
    '/api/system/unlock',
  ];

  if (systemControlPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // Check if system is locked
  if (isSystemLocked()) {
    const lockdown = getSystemLockdown();
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'System is currently in lockdown mode',
      reason: lockdown.reason,
      lockedAt: lockdown.lockedAt,
      lockedBy: lockdown.lockedBy,
    });
  }

  next();
}

/**
 * Middleware to enforce lockdown for specific systems
 */
export function systemSpecificLockdown(systemName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isSystemLocked(systemName)) {
      const lockdown = getSystemLockdown();
      return res.status(503).json({
        error: 'Service Unavailable',
        message: `${systemName} is currently locked`,
        reason: lockdown.reason,
        lockedAt: lockdown.lockedAt,
        lockedBy: lockdown.lockedBy,
      });
    }

    next();
  };
}

/**
 * Middleware to check if API access is enabled
 */
export function apiAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  const { getProductionFlags } = require('../config/productionFlags');
  const flags = getProductionFlags();

  // Always allow authenticated requests
  if (req.headers.authorization) {
    return next();
  }

  // Check if public API access is enabled
  if (!flags.ENABLE_PUBLIC_API_ACCESS) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Public API access is disabled. Authentication required.',
    });
  }

  next();
}
