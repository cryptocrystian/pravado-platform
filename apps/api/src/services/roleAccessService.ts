// =====================================================
// ROLE ACCESS SERVICE
// Sprint 60 Phase 5.7
// =====================================================
// Provides centralized role and permission management with audit logging

import { supabase } from '../config/supabase';
import {
  AdminRole,
  AdminPermission,
  AdminUser,
  AdminRoleAssignment,
  RoleDetails,
  AssignRoleRequest,
  AssignRoleResponse,
  RemoveRoleRequest,
  GrantPermissionRequest,
  GrantPermissionResponse,
  RevokePermissionRequest,
  RoleAuditEntry,
  RoleAuditActionType,
  RoleAuditFilters,
  RoleAuditResults,
  PermissionCheckResult,
  RoleStatistics,
  UserRoleSummary,
} from '@pravado/types';

export class RoleAccessService {
  /**
   * Gets all admin roles with their permissions
   */
  static async getAdminRoles(): Promise<RoleDetails[]> {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('role_name');

      if (rolesError) {
        console.error('Error fetching admin roles:', rolesError);
        throw new Error(`Failed to fetch admin roles: ${rolesError.message}`);
      }

      // For each role, fetch permissions and user count
      const roleDetails: RoleDetails[] = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: permissions } = await supabase
            .from('admin_role_permissions')
            .select(`
              admin_permissions (
                permission_name
              )
            `)
            .eq('role_id', role.role_id);

          const { count } = await supabase
            .from('admin_role_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.role_id)
            .eq('is_active', true);

          return {
            role: role.role_name as AdminRole,
            displayName: role.display_name,
            description: role.description || '',
            permissions: (permissions || [])
              .map((p: any) => p.admin_permissions?.permission_name as AdminPermission)
              .filter(Boolean),
            userCount: count || 0,
            isSystemRole: role.is_system_role,
            createdAt: new Date(role.created_at),
            updatedAt: new Date(role.updated_at),
          };
        })
      );

      return roleDetails;
    } catch (error: any) {
      console.error('Error in getAdminRoles:', error);
      throw error;
    }
  }

  /**
   * Gets all available permissions
   */
  static async getAdminPermissions(): Promise<AdminPermission[]> {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('permission_name')
        .eq('is_active', true)
        .order('permission_name');

      if (error) {
        console.error('Error fetching permissions:', error);
        throw new Error(`Failed to fetch permissions: ${error.message}`);
      }

      return (data || []).map((p) => p.permission_name as AdminPermission);
    } catch (error: any) {
      console.error('Error in getAdminPermissions:', error);
      throw error;
    }
  }

  /**
   * Assigns a role to a user
   */
  static async assignRoleToUser(
    request: AssignRoleRequest,
    actorId: string,
    actorEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AssignRoleResponse> {
    try {
      const { userId, role, expiresAt, reason } = request;

      // Get role_id from role name
      const { data: roleData, error: roleError } = await supabase
        .from('admin_roles')
        .select('role_id')
        .eq('role_name', role)
        .single();

      if (roleError || !roleData) {
        throw new Error(`Role ${role} not found`);
      }

      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('admin_role_assignments')
        .select('assignment_id')
        .eq('user_id', userId)
        .eq('role_id', roleData.role_id)
        .single();

      if (existing) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('admin_role_assignments')
          .update({
            is_active: true,
            expires_at: expiresAt,
            reason,
            assigned_by: actorId,
            assigned_at: new Date().toISOString(),
          })
          .eq('assignment_id', existing.assignment_id);

        if (updateError) {
          throw new Error(`Failed to update assignment: ${updateError.message}`);
        }

        // Log audit entry
        await this.logRoleChange(
          RoleAuditActionType.ROLE_ASSIGNED,
          actorId,
          actorEmail,
          userId,
          role,
          undefined,
          reason,
          { updated: true },
          ipAddress,
          userAgent
        );

        return {
          assignmentId: existing.assignment_id,
          success: true,
          message: `Role ${role} updated for user`,
        };
      }

      // Create new assignment
      const { data: assignment, error: assignError } = await supabase
        .from('admin_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleData.role_id,
          assigned_by: actorId,
          expires_at: expiresAt,
          reason,
          is_active: true,
        })
        .select('assignment_id')
        .single();

      if (assignError) {
        console.error('Error assigning role:', assignError);
        throw new Error(`Failed to assign role: ${assignError.message}`);
      }

      // Log audit entry
      await this.logRoleChange(
        RoleAuditActionType.ROLE_ASSIGNED,
        actorId,
        actorEmail,
        userId,
        role,
        undefined,
        reason,
        { expiresAt },
        ipAddress,
        userAgent
      );

      return {
        assignmentId: assignment.assignment_id,
        success: true,
        message: `Role ${role} assigned to user`,
      };
    } catch (error: any) {
      console.error('Error in assignRoleToUser:', error);
      throw error;
    }
  }

  /**
   * Removes a role from a user
   */
  static async removeRoleFromUser(
    request: RemoveRoleRequest,
    actorId: string,
    actorEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const { userId, role, reason } = request;

      // Get role_id from role name
      const { data: roleData, error: roleError } = await supabase
        .from('admin_roles')
        .select('role_id')
        .eq('role_name', role)
        .single();

      if (roleError || !roleData) {
        throw new Error(`Role ${role} not found`);
      }

      // Deactivate the assignment
      const { error: updateError } = await supabase
        .from('admin_role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleData.role_id);

      if (updateError) {
        console.error('Error removing role:', updateError);
        throw new Error(`Failed to remove role: ${updateError.message}`);
      }

      // Log audit entry
      await this.logRoleChange(
        RoleAuditActionType.ROLE_REMOVED,
        actorId,
        actorEmail,
        userId,
        role,
        undefined,
        reason,
        {},
        ipAddress,
        userAgent
      );

      return true;
    } catch (error: any) {
      console.error('Error in removeRoleFromUser:', error);
      throw error;
    }
  }

  /**
   * Grants a permission to a role
   */
  static async grantPermissionToRole(
    request: GrantPermissionRequest,
    actorId: string,
    actorEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<GrantPermissionResponse> {
    try {
      const { role, permission, reason } = request;

      // Get role_id and permission_id
      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role_id')
        .eq('role_name', role)
        .single();

      const { data: permData } = await supabase
        .from('admin_permissions')
        .select('permission_id')
        .eq('permission_name', permission)
        .single();

      if (!roleData || !permData) {
        throw new Error('Role or permission not found');
      }

      // Grant permission (will ignore if already exists due to UNIQUE constraint)
      const { error: grantError } = await supabase
        .from('admin_role_permissions')
        .insert({
          role_id: roleData.role_id,
          permission_id: permData.permission_id,
          granted_by: actorId,
        });

      if (grantError && !grantError.message.includes('duplicate')) {
        throw new Error(`Failed to grant permission: ${grantError.message}`);
      }

      // Log audit entry
      await this.logRoleChange(
        RoleAuditActionType.PERMISSION_GRANTED,
        actorId,
        actorEmail,
        undefined,
        role,
        permission,
        reason,
        {},
        ipAddress,
        userAgent
      );

      return {
        success: true,
        role,
        permission,
        message: `Permission ${permission} granted to role ${role}`,
      };
    } catch (error: any) {
      console.error('Error in grantPermissionToRole:', error);
      throw error;
    }
  }

  /**
   * Revokes a permission from a role
   */
  static async revokePermissionFromRole(
    request: RevokePermissionRequest,
    actorId: string,
    actorEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const { role, permission, reason } = request;

      // Get role_id and permission_id
      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role_id')
        .eq('role_name', role)
        .single();

      const { data: permData } = await supabase
        .from('admin_permissions')
        .select('permission_id')
        .eq('permission_name', permission)
        .single();

      if (!roleData || !permData) {
        throw new Error('Role or permission not found');
      }

      // Revoke permission
      const { error: revokeError } = await supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', roleData.role_id)
        .eq('permission_id', permData.permission_id);

      if (revokeError) {
        throw new Error(`Failed to revoke permission: ${revokeError.message}`);
      }

      // Log audit entry
      await this.logRoleChange(
        RoleAuditActionType.PERMISSION_REVOKED,
        actorId,
        actorEmail,
        undefined,
        role,
        permission,
        reason,
        {},
        ipAddress,
        userAgent
      );

      return true;
    } catch (error: any) {
      console.error('Error in revokePermissionFromRole:', error);
      throw error;
    }
  }

  /**
   * Logs a role/permission change to the audit trail
   */
  static async logRoleChange(
    actionType: RoleAuditActionType,
    actorId: string,
    actorEmail?: string,
    targetUserId?: string,
    targetRole?: AdminRole,
    permission?: AdminPermission,
    reason?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabase.from('role_audit_logs').insert({
        action_type: actionType,
        actor_id: actorId,
        actor_email: actorEmail,
        target_user_id: targetUserId,
        target_role: targetRole,
        permission,
        reason,
        metadata: metadata || {},
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (error: any) {
      console.error('Error logging role change:', error);
      // Don't throw - audit logging should not break main operations
    }
  }

  /**
   * Gets the role audit trail with optional filters
   */
  static async getRoleAuditTrail(filters: RoleAuditFilters): Promise<RoleAuditResults> {
    try {
      const {
        actionType,
        actorId,
        targetUserId,
        role,
        permission,
        startDate,
        endDate,
        page = 0,
        pageSize = 50,
      } = filters;

      let query = supabase.from('role_audit_logs').select('*', { count: 'exact' });

      // Apply filters
      if (actionType) query = query.eq('action_type', actionType);
      if (actorId) query = query.eq('actor_id', actorId);
      if (targetUserId) query = query.eq('target_user_id', targetUserId);
      if (role) query = query.eq('target_role', role);
      if (permission) query = query.eq('permission', permission);
      if (startDate) query = query.gte('timestamp', startDate.toISOString());
      if (endDate) query = query.lte('timestamp', endDate.toISOString());

      // Pagination
      const offset = page * pageSize;
      query = query.range(offset, offset + pageSize - 1).order('timestamp', { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        console.error('Error fetching audit trail:', error);
        throw new Error(`Failed to fetch audit trail: ${error.message}`);
      }

      const entries: RoleAuditEntry[] = (data || []).map((entry) => ({
        auditId: entry.audit_id,
        actionType: entry.action_type as RoleAuditActionType,
        actorId: entry.actor_id,
        actorEmail: entry.actor_email,
        targetUserId: entry.target_user_id,
        targetRole: entry.target_role as AdminRole,
        permission: entry.permission as AdminPermission,
        reason: entry.reason,
        metadata: entry.metadata,
        timestamp: new Date(entry.timestamp),
        ipAddress: entry.ip_address,
        userAgent: entry.user_agent,
      }));

      return {
        entries,
        total: count || 0,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error('Error in getRoleAuditTrail:', error);
      throw error;
    }
  }

  /**
   * Checks if a user has a specific permission
   */
  static async checkUserPermission(userId: string, permission: AdminPermission): Promise<PermissionCheckResult> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_permission_name: permission,
      });

      if (error) {
        console.error('Error checking permission:', error);
        return {
          hasPermission: false,
          userId,
          permission,
          deniedReason: 'Error checking permission',
        };
      }

      // If has permission, get which roles granted it
      if (data) {
        const { data: roles } = await supabase.rpc('get_user_permissions', {
          p_user_id: userId,
        });

        const grantedBy = (roles || [])
          .filter((r: any) => r.permission_name === permission)
          .map((r: any) => r.granted_by_role as AdminRole);

        return {
          hasPermission: true,
          userId,
          permission,
          grantedBy,
        };
      }

      return {
        hasPermission: false,
        userId,
        permission,
        deniedReason: 'User does not have this permission',
      };
    } catch (error: any) {
      console.error('Error in checkUserPermission:', error);
      return {
        hasPermission: false,
        userId,
        permission,
        deniedReason: error.message,
      };
    }
  }

  /**
   * Gets role statistics
   */
  static async getRoleStatistics(): Promise<RoleStatistics[]> {
    try {
      const { data, error } = await supabase.rpc('get_role_statistics');

      if (error) {
        console.error('Error fetching role statistics:', error);
        throw new Error(`Failed to fetch role statistics: ${error.message}`);
      }

      return (data || []).map((stat: any) => ({
        role: stat.role_name as AdminRole,
        activeAssignments: parseInt(stat.active_assignments),
        totalAssignments: parseInt(stat.total_assignments),
        permissionCount: parseInt(stat.permission_count),
        recentActivity: 0, // Can be calculated separately if needed
      }));
    } catch (error: any) {
      console.error('Error in getRoleStatistics:', error);
      throw error;
    }
  }

  /**
   * Gets users with their roles
   */
  static async getUsersWithRoles(page: number = 0, pageSize: number = 50): Promise<UserRoleSummary[]> {
    try {
      const offset = page * pageSize;

      const { data, error } = await supabase
        .from('admin_role_assignments')
        .select(`
          user_id,
          admin_roles (
            role_name
          )
        `)
        .eq('is_active', true)
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching users with roles:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      // Group by user_id
      const userMap = new Map<string, UserRoleSummary>();

      (data || []).forEach((assignment: any) => {
        const userId = assignment.user_id;
        const roleName = assignment.admin_roles?.role_name;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            email: '', // Would need to join with users table
            roles: [],
            totalPermissions: 0,
            isActive: true,
          });
        }

        const user = userMap.get(userId)!;
        if (roleName && !user.roles.includes(roleName as AdminRole)) {
          user.roles.push(roleName as AdminRole);
        }
      });

      return Array.from(userMap.values());
    } catch (error: any) {
      console.error('Error in getUsersWithRoles:', error);
      throw error;
    }
  }
}
