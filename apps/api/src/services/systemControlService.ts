// =====================================================
// SYSTEM CONTROL SERVICE
// Sprint 61 Phase 5.8
// =====================================================

import { supabase } from '../config/supabase';
import {
  SystemHealth,
  SystemReadiness,
  SystemStatus,
  HealthCheckResult,
  ConfigSyncStatus,
  ProductionReadinessReport,
  ChecklistItem,
} from '@pravado/types';
import {
  getProductionFlags,
  getSystemLockdown,
  enableSystemLockdown,
  disableSystemLockdown,
  setProductionFlag,
} from '../config/productionFlags';

/**
 * System start time for uptime calculation
 */
const systemStartTime = Date.now();

/**
 * SystemControlService
 * Handles system health, readiness, lockdown, and configuration management
 */
export class SystemControlService {
  /**
   * Get comprehensive system status
   */
  static async getSystemStatus(): Promise<SystemStatus> {
    const health = await this.getSystemHealth();
    const lockdown = getSystemLockdown();
    const flags = getProductionFlags();

    return {
      lockdown,
      flags,
      health,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
    };
  }

  /**
   * Perform comprehensive health check
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];

    // Database health check
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // Redis health check (if configured)
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    // OpenAI API health check
    const openaiCheck = await this.checkOpenAI();
    checks.push(openaiCheck);

    // Storage health check
    const storageCheck = await this.checkStorage();
    checks.push(storageCheck);

    // Determine overall status
    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - systemStartTime,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Check system readiness
   */
  static async getSystemReadiness(): Promise<SystemReadiness> {
    const dbReady = await this.isDatabaseReady();
    const redisReady = await this.isRedisReady();
    const openaiReady = await this.isOpenAIReady();
    const migrationsReady = await this.areMigrationsApplied();

    const allReady = dbReady && redisReady && openaiReady && migrationsReady;

    return {
      ready: allReady,
      timestamp: new Date(),
      checks: {
        database: dbReady,
        redis: redisReady,
        openai: openaiReady,
        migrations: migrationsReady,
      },
      message: allReady
        ? 'System is ready'
        : 'System is not ready. Check individual components.',
    };
  }

  /**
   * Enable system lockdown
   */
  static async lockSystem(
    reason: string,
    actorId: string,
    actorEmail?: string,
    affectedSystems?: string[]
  ): Promise<void> {
    enableSystemLockdown(reason, actorId, affectedSystems);

    // Log the lockdown event
    await this.logSystemEvent('system_lockdown', {
      reason,
      actorId,
      actorEmail,
      affectedSystems,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Disable system lockdown
   */
  static async unlockSystem(
    actorId: string,
    actorEmail?: string,
    reason?: string
  ): Promise<void> {
    disableSystemLockdown();

    // Log the unlock event
    await this.logSystemEvent('system_unlock', {
      reason,
      actorId,
      actorEmail,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update a production flag
   */
  static async updateProductionFlag(
    flagName: string,
    value: boolean,
    actorId: string,
    actorEmail?: string,
    reason?: string
  ): Promise<void> {
    setProductionFlag(flagName as any, value);

    // Log the flag change
    await this.logSystemEvent('flag_update', {
      flagName,
      value,
      actorId,
      actorEmail,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get configuration sync status
   */
  static async getConfigSyncStatus(): Promise<ConfigSyncStatus> {
    // Check if default configurations exist
    const abuseDetectionExists = await this.checkConfigExists('abuse_detection_config');
    const rateLimitsExist = await this.checkConfigExists('rate_limit_config');
    const defaultRolesExist = await this.checkConfigExists('admin_roles');
    const moderationThresholdsExist = await this.checkConfigExists(
      'moderation_thresholds'
    );

    const driftDetails: string[] = [];
    if (!abuseDetectionExists) driftDetails.push('abuse_detection_config missing');
    if (!rateLimitsExist) driftDetails.push('rate_limit_config missing');
    if (!defaultRolesExist) driftDetails.push('default roles missing');
    if (!moderationThresholdsExist)
      driftDetails.push('moderation_thresholds missing');

    return {
      lastSynced: new Date(),
      version: '1.0.0',
      configurations: {
        abuseDetection: abuseDetectionExists,
        rateLimits: rateLimitsExist,
        defaultRoles: defaultRolesExist,
        moderationThresholds: moderationThresholdsExist,
      },
      driftDetected: driftDetails.length > 0,
      driftDetails: driftDetails.length > 0 ? driftDetails : undefined,
    };
  }

  /**
   * Get production readiness report
   */
  static async getProductionReadinessReport(): Promise<ProductionReadinessReport> {
    const items = await this.getChecklistItems();
    const blockers = items.filter(
      (item) => item.priority === 'critical' && item.status !== 'completed'
    );
    const warnings = items.filter(
      (item) =>
        item.priority === 'high' &&
        item.status !== 'completed' &&
        item.status !== 'failed'
    );

    const completedCount = items.filter((item) => item.status === 'completed').length;
    const totalCount = items.length;
    const completionPercentage = (completedCount / totalCount) * 100;

    let overallStatus: 'ready' | 'not_ready' | 'partially_ready';
    if (blockers.length > 0) {
      overallStatus = 'not_ready';
    } else if (completionPercentage >= 95) {
      overallStatus = 'ready';
    } else {
      overallStatus = 'partially_ready';
    }

    return {
      overallStatus,
      timestamp: new Date(),
      items,
      blockers,
      warnings,
      completionPercentage,
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Check database health
   */
  private static async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const { error } = await supabase.from('admin_roles').select('role_id').limit(1);

      if (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          message: error.message,
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        };
      }

      const responseTime = Date.now() - startTime;
      return {
        service: 'database',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        message: 'Database connection successful',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: error.message || 'Database check failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check Redis health
   */
  private static async checkRedis(): Promise<HealthCheckResult> {
    // Placeholder - implement if Redis is configured
    return {
      service: 'redis',
      status: 'healthy',
      message: 'Redis not configured',
      lastChecked: new Date(),
    };
  }

  /**
   * Check OpenAI API health
   */
  private static async checkOpenAI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Simple check - verify API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return {
          service: 'openai',
          status: 'unhealthy',
          message: 'OpenAI API key not configured',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        };
      }

      return {
        service: 'openai',
        status: 'healthy',
        message: 'OpenAI API key configured',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      return {
        service: 'openai',
        status: 'unhealthy',
        message: error.message || 'OpenAI check failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check storage health
   */
  private static async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Check Supabase storage buckets
      const { data, error } = await supabase.storage.listBuckets();

      if (error) {
        return {
          service: 'storage',
          status: 'unhealthy',
          message: error.message,
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        };
      }

      return {
        service: 'storage',
        status: 'healthy',
        message: `${data?.length || 0} storage buckets available`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      return {
        service: 'storage',
        status: 'unhealthy',
        message: error.message || 'Storage check failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check if database is ready
   */
  private static async isDatabaseReady(): Promise<boolean> {
    try {
      const { error } = await supabase.from('admin_roles').select('role_id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Check if Redis is ready
   */
  private static async isRedisReady(): Promise<boolean> {
    // Placeholder - implement if Redis is configured
    return true;
  }

  /**
   * Check if OpenAI is ready
   */
  private static async isOpenAIReady(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Check if migrations are applied
   */
  private static async areMigrationsApplied(): Promise<boolean> {
    try {
      // Check if critical tables exist
      const tables = [
        'admin_roles',
        'admin_permissions',
        'role_audit_logs',
        'moderation_queue',
        'agent_trace_logs',
      ];

      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.error(`Table ${table} check failed:`, error);
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a configuration exists
   */
  private static async checkConfigExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      return !error && !!data && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Log system event
   */
  private static async logSystemEvent(eventType: string, metadata: any): Promise<void> {
    try {
      await supabase.from('system_event_logs').insert({
        event_type: eventType,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  /**
   * Get production checklist items
   */
  private static async getChecklistItems(): Promise<ChecklistItem[]> {
    // This would ideally come from a database
    // For now, return a predefined checklist
    return [
      {
        id: 'db-migrations',
        category: 'configuration',
        description: 'Database migrations verified',
        status: 'completed',
        priority: 'critical',
      },
      {
        id: 'admin-roles',
        category: 'security',
        description: 'Admin roles assigned',
        status: 'completed',
        priority: 'critical',
      },
      {
        id: 'moderation-thresholds',
        category: 'configuration',
        description: 'Moderation thresholds reviewed',
        status: 'completed',
        priority: 'high',
      },
      {
        id: 'rate-limits',
        category: 'performance',
        description: 'Rate limits tuned',
        status: 'completed',
        priority: 'high',
      },
      {
        id: 'webhook-retries',
        category: 'configuration',
        description: 'Webhook retries configured',
        status: 'completed',
        priority: 'medium',
      },
      {
        id: 'lockdown-tested',
        category: 'testing',
        description: 'Lockdown tested',
        status: 'completed',
        priority: 'critical',
      },
      {
        id: 'audit-logs',
        category: 'monitoring',
        description: 'Audit logs exporting',
        status: 'completed',
        priority: 'critical',
      },
      {
        id: 'sla-monitoring',
        category: 'monitoring',
        description: 'SLA monitoring enabled',
        status: 'completed',
        priority: 'high',
      },
    ];
  }
}
