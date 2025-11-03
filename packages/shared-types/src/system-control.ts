// =====================================================
// SYSTEM CONTROL TYPES
// Sprint 61 Phase 5.8
// =====================================================

/**
 * Global production feature flags
 */
export interface ProductionFlags {
  ENABLE_PUBLIC_API_ACCESS: boolean;
  DISABLE_MODERATION_AUTOFLOW: boolean;
  AUDIT_LOGGING_ENABLED: boolean;
  TRACE_LOGGING_ENABLED: boolean;
  RATE_LIMIT_TUNING_MODE: boolean;
}

/**
 * System lockdown status
 */
export interface SystemLockdown {
  isLocked: boolean;
  reason?: string;
  lockedBy?: string;
  lockedAt?: Date;
  affectedSystems: string[];
}

/**
 * System health check result
 */
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  lastChecked: Date;
}

/**
 * Overall system health status
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
}

/**
 * System readiness status
 */
export interface SystemReadiness {
  ready: boolean;
  timestamp: Date;
  checks: {
    database: boolean;
    redis: boolean;
    openai: boolean;
    migrations: boolean;
  };
  message?: string;
}

/**
 * Complete system status
 */
export interface SystemStatus {
  lockdown: SystemLockdown;
  flags: ProductionFlags;
  health: SystemHealth;
  environment: string;
  timestamp: Date;
}

/**
 * Lockdown request payload
 */
export interface LockdownRequest {
  reason: string;
  actorId: string;
  actorEmail?: string;
  affectedSystems?: string[];
}

/**
 * Unlock request payload
 */
export interface UnlockRequest {
  actorId: string;
  actorEmail?: string;
  reason?: string;
}

/**
 * Flag update request
 */
export interface FlagUpdateRequest {
  flagName: keyof ProductionFlags;
  value: boolean;
  actorId: string;
  actorEmail?: string;
  reason?: string;
}

/**
 * System configuration sync status
 */
export interface ConfigSyncStatus {
  lastSynced: Date;
  version: string;
  configurations: {
    abuseDetection: boolean;
    rateLimits: boolean;
    defaultRoles: boolean;
    moderationThresholds: boolean;
  };
  driftDetected: boolean;
  driftDetails?: string[];
}

/**
 * Production checklist item
 */
export interface ChecklistItem {
  id: string;
  category: 'security' | 'performance' | 'monitoring' | 'configuration' | 'testing';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

/**
 * Production readiness report
 */
export interface ProductionReadinessReport {
  overallStatus: 'ready' | 'not_ready' | 'partially_ready';
  timestamp: Date;
  items: ChecklistItem[];
  blockers: ChecklistItem[];
  warnings: ChecklistItem[];
  completionPercentage: number;
}

/**
 * Emergency rollback plan
 */
export interface EmergencyRollbackPlan {
  triggeredBy: string;
  triggeredAt: Date;
  reason: string;
  targetVersion: string;
  steps: RollbackStep[];
  estimatedDowntime: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Rollback step
 */
export interface RollbackStep {
  order: number;
  description: string;
  command?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * System freeze notification
 */
export interface SystemFreezeNotification {
  freezeId: string;
  reason: string;
  startTime: Date;
  endTime?: Date;
  affectedServices: string[];
  contactPerson: string;
  severity: 'info' | 'warning' | 'critical';
}
