// =====================================================
// ADMIN ACCESS CONTROL TYPES
// Sprint 60 Phase 5.7
// =====================================================

/**
 * Admin roles with hierarchical permissions
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ANALYST = 'analyst',
  SUPPORT = 'support',
  MODERATOR = 'moderator',
}

/**
 * Granular permissions for admin actions
 */
export enum AdminPermission {
  // Analytics & Reporting
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',
  VIEW_PERFORMANCE_METRICS = 'view_performance_metrics',
  VIEW_ERROR_LOGS = 'view_error_logs',

  // Moderation
  MANAGE_MODERATION = 'manage_moderation',
  FLAG_CLIENTS = 'flag_clients',
  BAN_TOKENS = 'ban_tokens',
  VIEW_ABUSE_REPORTS = 'view_abuse_reports',
  CONFIGURE_THRESHOLDS = 'configure_thresholds',

  // Debug & Trace
  VIEW_DEBUG_TRACES = 'view_debug_traces',
  LOG_TRACES = 'log_traces',
  EXPORT_TRACES = 'export_traces',

  // User & Role Management
  MANAGE_ROLES = 'manage_roles',
  ASSIGN_ROLES = 'assign_roles',
  MANAGE_PERMISSIONS = 'manage_permissions',
  VIEW_USERS = 'view_users',

  // Tenant Management
  VIEW_TENANTS = 'view_tenants',
  MANAGE_TENANTS = 'manage_tenants',

  // Agent Management
  VIEW_AGENTS = 'view_agents',
  MANAGE_AGENTS = 'manage_agents',
  VIEW_AGENT_ACTIVITY = 'view_agent_activity',

  // System Administration
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_AUDIT_LOGS = 'export_audit_logs',
  MANAGE_SYSTEM_CONFIG = 'manage_system_config',

  // Support Actions
  VIEW_SUPPORT_TICKETS = 'view_support_tickets',
  RESPOND_TO_TICKETS = 'respond_to_tickets',
}

/**
 * Admin user with role assignments
 */
export interface AdminUser {
  userId: string;
  email: string;
  name?: string;
  roles: AdminRole[];
  permissions: AdminPermission[]; // Derived from roles
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role assignment linking user to role
 */
export interface AdminRoleAssignment {
  assignmentId: string;
  userId: string;
  role: AdminRole;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  reason?: string;
}

/**
 * Permission mapping for a role
 */
export interface AdminPermissionMap {
  role: AdminRole;
  permissions: AdminPermission[];
  description?: string;
}

/**
 * Request to create or update a role
 */
export interface RoleCreationRequest {
  roleName: string;
  description?: string;
  permissions: AdminPermission[];
  isCustomRole?: boolean;
}

/**
 * Request to assign a role to a user
 */
export interface AssignRoleRequest {
  userId: string;
  role: AdminRole;
  expiresAt?: Date;
  reason?: string;
}

/**
 * Request to remove a role from a user
 */
export interface RemoveRoleRequest {
  userId: string;
  role: AdminRole;
  reason?: string;
}

/**
 * Request to grant a permission to a role
 */
export interface GrantPermissionRequest {
  role: AdminRole;
  permission: AdminPermission;
  reason?: string;
}

/**
 * Request to revoke a permission from a role
 */
export interface RevokePermissionRequest {
  role: AdminRole;
  permission: AdminPermission;
  reason?: string;
}

/**
 * Audit entry for role/permission changes
 */
export interface RoleAuditEntry {
  auditId: string;
  actionType: RoleAuditActionType;
  actorId: string;
  actorEmail?: string;
  targetUserId?: string;
  targetRole?: AdminRole;
  permission?: AdminPermission;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Types of role audit actions
 */
export enum RoleAuditActionType {
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  ACCESS_DENIED = 'access_denied',
}

/**
 * Role details with permissions
 */
export interface RoleDetails {
  role: AdminRole;
  displayName: string;
  description: string;
  permissions: AdminPermission[];
  userCount: number;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  userId: string;
  permission: AdminPermission;
  grantedBy?: AdminRole[];
  deniedReason?: string;
}

/**
 * Filters for role audit logs
 */
export interface RoleAuditFilters {
  actionType?: RoleAuditActionType;
  actorId?: string;
  targetUserId?: string;
  role?: AdminRole;
  permission?: AdminPermission;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated role audit results
 */
export interface RoleAuditResults {
  entries: RoleAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Role assignment response
 */
export interface AssignRoleResponse {
  assignmentId: string;
  success: boolean;
  message?: string;
}

/**
 * Permission grant response
 */
export interface GrantPermissionResponse {
  success: boolean;
  role: AdminRole;
  permission: AdminPermission;
  message?: string;
}

/**
 * Role statistics
 */
export interface RoleStatistics {
  role: AdminRole;
  activeAssignments: number;
  totalAssignments: number;
  permissionCount: number;
  recentActivity: number; // Last 30 days
}

/**
 * User role summary
 */
export interface UserRoleSummary {
  userId: string;
  email: string;
  name?: string;
  roles: AdminRole[];
  totalPermissions: number;
  lastActivity?: Date;
  isActive: boolean;
}

/**
 * Default role configurations
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    // All permissions
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.EXPORT_DATA,
    AdminPermission.VIEW_PERFORMANCE_METRICS,
    AdminPermission.VIEW_ERROR_LOGS,
    AdminPermission.MANAGE_MODERATION,
    AdminPermission.FLAG_CLIENTS,
    AdminPermission.BAN_TOKENS,
    AdminPermission.VIEW_ABUSE_REPORTS,
    AdminPermission.CONFIGURE_THRESHOLDS,
    AdminPermission.VIEW_DEBUG_TRACES,
    AdminPermission.LOG_TRACES,
    AdminPermission.EXPORT_TRACES,
    AdminPermission.MANAGE_ROLES,
    AdminPermission.ASSIGN_ROLES,
    AdminPermission.MANAGE_PERMISSIONS,
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_TENANTS,
    AdminPermission.MANAGE_TENANTS,
    AdminPermission.VIEW_AGENTS,
    AdminPermission.MANAGE_AGENTS,
    AdminPermission.VIEW_AGENT_ACTIVITY,
    AdminPermission.VIEW_AUDIT_LOGS,
    AdminPermission.EXPORT_AUDIT_LOGS,
    AdminPermission.MANAGE_SYSTEM_CONFIG,
    AdminPermission.VIEW_SUPPORT_TICKETS,
    AdminPermission.RESPOND_TO_TICKETS,
  ],
  [AdminRole.ADMIN]: [
    // Most permissions except role/permission management
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.EXPORT_DATA,
    AdminPermission.VIEW_PERFORMANCE_METRICS,
    AdminPermission.VIEW_ERROR_LOGS,
    AdminPermission.MANAGE_MODERATION,
    AdminPermission.FLAG_CLIENTS,
    AdminPermission.BAN_TOKENS,
    AdminPermission.VIEW_ABUSE_REPORTS,
    AdminPermission.CONFIGURE_THRESHOLDS,
    AdminPermission.VIEW_DEBUG_TRACES,
    AdminPermission.LOG_TRACES,
    AdminPermission.EXPORT_TRACES,
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_TENANTS,
    AdminPermission.VIEW_AGENTS,
    AdminPermission.MANAGE_AGENTS,
    AdminPermission.VIEW_AGENT_ACTIVITY,
    AdminPermission.VIEW_AUDIT_LOGS,
    AdminPermission.VIEW_SUPPORT_TICKETS,
    AdminPermission.RESPOND_TO_TICKETS,
  ],
  [AdminRole.ANALYST]: [
    // Analytics and reporting focused
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.EXPORT_DATA,
    AdminPermission.VIEW_PERFORMANCE_METRICS,
    AdminPermission.VIEW_ERROR_LOGS,
    AdminPermission.VIEW_AGENTS,
    AdminPermission.VIEW_AGENT_ACTIVITY,
    AdminPermission.VIEW_TENANTS,
    AdminPermission.VIEW_DEBUG_TRACES,
    AdminPermission.EXPORT_TRACES,
  ],
  [AdminRole.SUPPORT]: [
    // Support and troubleshooting
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.VIEW_ERROR_LOGS,
    AdminPermission.VIEW_AGENTS,
    AdminPermission.VIEW_AGENT_ACTIVITY,
    AdminPermission.VIEW_DEBUG_TRACES,
    AdminPermission.VIEW_SUPPORT_TICKETS,
    AdminPermission.RESPOND_TO_TICKETS,
    AdminPermission.VIEW_ABUSE_REPORTS,
  ],
  [AdminRole.MODERATOR]: [
    // Moderation focused
    AdminPermission.MANAGE_MODERATION,
    AdminPermission.FLAG_CLIENTS,
    AdminPermission.BAN_TOKENS,
    AdminPermission.VIEW_ABUSE_REPORTS,
    AdminPermission.VIEW_AUDIT_LOGS,
  ],
};

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Super Administrator',
  [AdminRole.ADMIN]: 'Administrator',
  [AdminRole.ANALYST]: 'Analyst',
  [AdminRole.SUPPORT]: 'Support Engineer',
  [AdminRole.MODERATOR]: 'Moderator',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Full system access with role and permission management capabilities',
  [AdminRole.ADMIN]: 'Comprehensive administrative access excluding role management',
  [AdminRole.ANALYST]: 'Analytics, reporting, and data export capabilities',
  [AdminRole.SUPPORT]: 'Support ticket management and troubleshooting access',
  [AdminRole.MODERATOR]: 'Content and user moderation capabilities',
};
