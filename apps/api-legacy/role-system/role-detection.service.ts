// =====================================================
// ROLE DETECTION SERVICE
// Sprint 39 Phase 3.3.1: Role-Aware Defaults System
// =====================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserRole,
  RoleDetectionInput,
  RoleDetectionResult,
  RoleConfig,
  RolePermissions,
  ROLE_CONFIGS,
} from '@pravado/types';

/**
 * Service for detecting user roles from various sources
 * Supports session, database, JWT, and fallback detection
 */
export class RoleDetectionService {
  private static instance: RoleDetectionService;
  private supabase: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RoleDetectionService {
    if (!RoleDetectionService.instance) {
      RoleDetectionService.instance = new RoleDetectionService();
    }
    return RoleDetectionService.instance;
  }

  /**
   * Detect user role from input
   * Priority: session > database > JWT > default
   */
  async detectRole(input: RoleDetectionInput): Promise<RoleDetectionResult> {
    // 1. Try to get role from session
    const sessionRole = this.detectRoleFromSession(input);
    if (sessionRole) {
      return this.buildResult(sessionRole, 1.0, 'session');
    }

    // 2. Try to get role from database
    if (input.userId && input.organizationId) {
      const dbRole = await this.detectRoleFromDatabase(input.userId, input.organizationId);
      if (dbRole) {
        return this.buildResult(dbRole, 0.95, 'database');
      }
    }

    // 3. Try to infer role from context
    const inferredRole = this.inferRoleFromContext(input);
    if (inferredRole) {
      return this.buildResult(inferredRole, 0.6, 'inferred');
    }

    // 4. Fallback to default guest role
    return this.buildResult(UserRole.GUEST, 0.3, 'default');
  }

  /**
   * Detect role from session object
   */
  private detectRoleFromSession(input: RoleDetectionInput): UserRole | null {
    if (!input.session) return null;

    // Check for role in session
    const sessionRole = input.session.user?.role || input.session.role;
    if (sessionRole && this.isValidRole(sessionRole)) {
      return sessionRole as UserRole;
    }

    return null;
  }

  /**
   * Detect role from database (user_organizations table)
   */
  private async detectRoleFromDatabase(
    userId: string,
    organizationId: string
  ): Promise<UserRole | null> {
    try {
      // Query user_organizations table for role
      const { data, error } = await this.supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('active', true)
        .single();

      if (error || !data) {
        return null;
      }

      if (this.isValidRole(data.role)) {
        return data.role as UserRole;
      }

      return null;
    } catch (error) {
      console.error('Error detecting role from database:', error);
      return null;
    }
  }

  /**
   * Infer role from context clues
   */
  private inferRoleFromContext(input: RoleDetectionInput): UserRole | null {
    if (!input.context) return null;

    // Check for specific context flags
    const context = input.context;

    // If context has isAdmin flag
    if (context.isAdmin === true) {
      return UserRole.ADMIN;
    }

    // If context has isDeveloper flag
    if (context.isDeveloper === true) {
      return UserRole.DEVELOPER;
    }

    // If context has isClient flag
    if (context.isClient === true) {
      return UserRole.CLIENT;
    }

    // If context has agentAccess flag
    if (context.agentAccess === true) {
      return UserRole.AGENT;
    }

    // If context has campaignManagement flag
    if (context.campaignManagement === true) {
      return UserRole.CAMPAIGN_MANAGER;
    }

    // If context has contentCreation flag
    if (context.contentCreation === true) {
      return UserRole.CONTENT_CREATOR;
    }

    return null;
  }

  /**
   * Build RoleDetectionResult with config and permissions
   */
  private buildResult(
    role: UserRole,
    confidence: number,
    source: 'session' | 'database' | 'default' | 'inferred'
  ): RoleDetectionResult {
    const roleConfig = ROLE_CONFIGS[role];

    return {
      role,
      roleConfig,
      permissions: roleConfig.permissions,
      confidence,
      source,
    };
  }

  /**
   * Validate if a string is a valid UserRole
   */
  private isValidRole(role: string): boolean {
    return Object.values(UserRole).includes(role as UserRole);
  }

  /**
   * Get role config by role
   */
  public getRoleConfig(role: UserRole): RoleConfig {
    return ROLE_CONFIGS[role];
  }

  /**
   * Get permissions for a role
   */
  public getRolePermissions(role: UserRole): RolePermissions {
    return ROLE_CONFIGS[role].permissions;
  }

  /**
   * Check if user has specific permission
   */
  public hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
    const permissions = this.getRolePermissions(role);
    return permissions[permission] === true;
  }

  /**
   * Get default route for role
   */
  public getDefaultRoute(role: UserRole): string {
    return ROLE_CONFIGS[role].defaultRoute;
  }

  /**
   * Detect multiple roles for a user (across organizations)
   */
  async detectAllUserRoles(userId: string): Promise<Array<{
    organizationId: string;
    role: UserRole;
    roleConfig: RoleConfig;
    permissions: RolePermissions;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', userId)
        .eq('active', true);

      if (error || !data) {
        return [];
      }

      return data
        .filter((row) => this.isValidRole(row.role))
        .map((row) => ({
          organizationId: row.organization_id,
          role: row.role as UserRole,
          roleConfig: ROLE_CONFIGS[row.role as UserRole],
          permissions: ROLE_CONFIGS[row.role as UserRole].permissions,
        }));
    } catch (error) {
      console.error('Error detecting all user roles:', error);
      return [];
    }
  }

  /**
   * Update user role in database
   */
  async updateUserRole(
    userId: string,
    organizationId: string,
    newRole: UserRole
  ): Promise<boolean> {
    try {
      if (!this.isValidRole(newRole)) {
        throw new Error(`Invalid role: ${newRole}`);
      }

      const { error } = await this.supabase
        .from('user_organizations')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  /**
   * Create user-organization relationship with role
   */
  async assignUserRole(
    userId: string,
    organizationId: string,
    role: UserRole
  ): Promise<boolean> {
    try {
      if (!this.isValidRole(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      const { error } = await this.supabase.from('user_organizations').insert({
        user_id: userId,
        organization_id: organizationId,
        role,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error assigning user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error assigning user role:', error);
      return false;
    }
  }

  /**
   * Remove user from organization (soft delete)
   */
  async removeUserRole(userId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_organizations')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error removing user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing user role:', error);
      return false;
    }
  }
}

// Export singleton instance
export const roleDetectionService = RoleDetectionService.getInstance();
