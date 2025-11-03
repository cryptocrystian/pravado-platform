// =====================================================
// PRODUCTION FLAGS CONFIGURATION
// Sprint 61 Phase 5.8
// =====================================================

import { ProductionFlags, SystemLockdown } from '@pravado/shared-types';

/**
 * In-memory production flags (can be toggled via API)
 * In production, these should be backed by Redis or a database
 */
let productionFlags: ProductionFlags = {
  ENABLE_PUBLIC_API_ACCESS: process.env.ENABLE_PUBLIC_API_ACCESS === 'true',
  DISABLE_MODERATION_AUTOFLOW: process.env.DISABLE_MODERATION_AUTOFLOW === 'true',
  AUDIT_LOGGING_ENABLED: process.env.AUDIT_LOGGING_ENABLED !== 'false', // Enabled by default
  TRACE_LOGGING_ENABLED: process.env.TRACE_LOGGING_ENABLED === 'true',
  RATE_LIMIT_TUNING_MODE: process.env.RATE_LIMIT_TUNING_MODE === 'true',
};

/**
 * System lockdown state
 */
let systemLockdown: SystemLockdown = {
  isLocked: false,
  affectedSystems: [],
};

/**
 * Get current production flags
 */
export function getProductionFlags(): ProductionFlags {
  return { ...productionFlags };
}

/**
 * Update a specific production flag
 */
export function setProductionFlag(
  flagName: keyof ProductionFlags,
  value: boolean
): ProductionFlags {
  productionFlags[flagName] = value;
  return { ...productionFlags };
}

/**
 * Get system lockdown status
 */
export function getSystemLockdown(): SystemLockdown {
  return { ...systemLockdown };
}

/**
 * Enable system lockdown
 */
export function enableSystemLockdown(
  reason: string,
  lockedBy: string,
  affectedSystems: string[] = ['api', 'webhooks', 'agents', 'conversations']
): SystemLockdown {
  systemLockdown = {
    isLocked: true,
    reason,
    lockedBy,
    lockedAt: new Date(),
    affectedSystems,
  };
  return { ...systemLockdown };
}

/**
 * Disable system lockdown
 */
export function disableSystemLockdown(): SystemLockdown {
  systemLockdown = {
    isLocked: false,
    affectedSystems: [],
  };
  return { ...systemLockdown };
}

/**
 * Check if a specific system is locked
 */
export function isSystemLocked(systemName?: string): boolean {
  if (!systemLockdown.isLocked) {
    return false;
  }

  if (!systemName) {
    return true;
  }

  return systemLockdown.affectedSystems.includes(systemName);
}

/**
 * Reset all flags to default values
 */
export function resetProductionFlags(): ProductionFlags {
  productionFlags = {
    ENABLE_PUBLIC_API_ACCESS: false,
    DISABLE_MODERATION_AUTOFLOW: false,
    AUDIT_LOGGING_ENABLED: true,
    TRACE_LOGGING_ENABLED: false,
    RATE_LIMIT_TUNING_MODE: false,
  };
  return { ...productionFlags };
}

/**
 * Get flag descriptions for documentation
 */
export const FLAG_DESCRIPTIONS: Record<keyof ProductionFlags, string> = {
  ENABLE_PUBLIC_API_ACCESS:
    'Allow unauthenticated access to public API endpoints. Disable to require authentication for all endpoints.',
  DISABLE_MODERATION_AUTOFLOW:
    'Prevent automatic moderation actions. When enabled, all moderation requires manual review.',
  AUDIT_LOGGING_ENABLED:
    'Enable comprehensive audit logging for all administrative actions. Critical for compliance.',
  TRACE_LOGGING_ENABLED:
    'Enable detailed trace logging for agent conversations and task processing. May impact performance.',
  RATE_LIMIT_TUNING_MODE:
    'Enable rate limit tuning mode. Logs rate limit hits without enforcing. Use for testing rate limit configurations.',
};

/**
 * Validate flag configuration
 */
export function validateFlags(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // In production, trace logging should be disabled by default
  if (
    process.env.NODE_ENV === 'production' &&
    productionFlags.TRACE_LOGGING_ENABLED
  ) {
    errors.push(
      'Warning: TRACE_LOGGING_ENABLED is true in production. This may impact performance.'
    );
  }

  // Audit logging should always be enabled in production
  if (
    process.env.NODE_ENV === 'production' &&
    !productionFlags.AUDIT_LOGGING_ENABLED
  ) {
    errors.push(
      'Critical: AUDIT_LOGGING_ENABLED is false in production. This violates compliance requirements.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
