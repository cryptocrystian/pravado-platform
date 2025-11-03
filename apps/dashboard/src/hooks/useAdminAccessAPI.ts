// =====================================================
// ADMIN ACCESS API HOOKS
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  RoleDetails,
  AdminPermission,
  AssignRoleRequest,
  AssignRoleResponse,
  RemoveRoleRequest,
  GrantPermissionRequest,
  GrantPermissionResponse,
  RevokePermissionRequest,
  RoleAuditFilters,
  RoleAuditResults,
  RoleStatistics,
  UserRoleSummary,
} from '@pravado/shared-types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Hook for fetching all admin roles with their permissions
 */
export function useAdminRoles() {
  const [roles, setRoles] = useState<RoleDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/admin-access/roles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setRoles(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return { roles, loading, error, refetch: fetchRoles };
}

/**
 * Hook for fetching all available permissions
 */
export function useAdminPermissions() {
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/admin-access/permissions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setPermissions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch permissions');
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, error, refetch: fetchPermissions };
}

/**
 * Hook for assigning a role to a user
 */
export function useAssignRole() {
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const assignRole = async (
    request: AssignRoleRequest,
    actorId: string,
    actorEmail?: string
  ): Promise<AssignRoleResponse | null> => {
    try {
      setAssigning(true);
      setError(null);
      setSuccess(false);

      const response = await axios.post(
        `${API_BASE_URL}/admin-access/assign-role`,
        {
          ...request,
          actorId,
          actorEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setSuccess(true);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign role');
      console.error('Error assigning role:', err);
      return null;
    } finally {
      setAssigning(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(false);
  };

  return { assignRole, assigning, error, success, resetState };
}

/**
 * Hook for removing a role from a user
 */
export function useRemoveRole() {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const removeRole = async (
    request: RemoveRoleRequest,
    actorId: string,
    actorEmail?: string
  ): Promise<boolean> => {
    try {
      setRemoving(true);
      setError(null);
      setSuccess(false);

      const response = await axios.post(
        `${API_BASE_URL}/admin-access/remove-role`,
        {
          ...request,
          actorId,
          actorEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setSuccess(true);
      return response.data.success;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove role');
      console.error('Error removing role:', err);
      return false;
    } finally {
      setRemoving(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(false);
  };

  return { removeRole, removing, error, success, resetState };
}

/**
 * Hook for granting a permission to a role
 */
export function useGrantPermission() {
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const grantPermission = async (
    request: GrantPermissionRequest,
    actorId: string,
    actorEmail?: string
  ): Promise<GrantPermissionResponse | null> => {
    try {
      setGranting(true);
      setError(null);
      setSuccess(false);

      const response = await axios.post(
        `${API_BASE_URL}/admin-access/grant-permission`,
        {
          ...request,
          actorId,
          actorEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setSuccess(true);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to grant permission');
      console.error('Error granting permission:', err);
      return null;
    } finally {
      setGranting(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(false);
  };

  return { grantPermission, granting, error, success, resetState };
}

/**
 * Hook for revoking a permission from a role
 */
export function useRevokePermission() {
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const revokePermission = async (
    request: RevokePermissionRequest,
    actorId: string,
    actorEmail?: string
  ): Promise<boolean> => {
    try {
      setRevoking(true);
      setError(null);
      setSuccess(false);

      const response = await axios.post(
        `${API_BASE_URL}/admin-access/revoke-permission`,
        {
          ...request,
          actorId,
          actorEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setSuccess(true);
      return response.data.success;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke permission');
      console.error('Error revoking permission:', err);
      return false;
    } finally {
      setRevoking(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(false);
  };

  return { revokePermission, revoking, error, success, resetState };
}

/**
 * Hook for fetching access audit logs
 */
export function useAccessAuditLogs(filters: RoleAuditFilters) {
  const [auditLogs, setAuditLogs] = useState<RoleAuditResults>({
    entries: [],
    total: 0,
    page: 0,
    pageSize: 50,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.actorId) params.append('actorId', filters.actorId);
      if (filters.targetUserId) params.append('targetUserId', filters.targetUserId);
      if (filters.role) params.append('role', filters.role);
      if (filters.permission) params.append('permission', filters.permission);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      const response = await axios.get(`${API_BASE_URL}/admin-access/audit-log?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setAuditLogs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return { auditLogs, loading, error, refetch: fetchAuditLogs };
}

/**
 * Hook for fetching role statistics
 */
export function useRoleStatistics() {
  const [statistics, setStatistics] = useState<RoleStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/admin-access/statistics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setStatistics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return { statistics, loading, error, refetch: fetchStatistics };
}

/**
 * Hook for fetching users with their roles
 */
export function useUsersWithRoles(page: number = 0, pageSize: number = 50) {
  const [users, setUsers] = useState<UserRoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/admin-access/users?page=${page}&pageSize=${pageSize}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}
