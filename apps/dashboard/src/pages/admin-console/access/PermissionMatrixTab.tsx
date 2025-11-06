// =====================================================
// PERMISSION MATRIX TAB PAGE
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React from 'react';
import {
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { AdminRole, AdminPermission } from '@pravado/types';
import { PermissionMatrix } from '../../../components/admin/access/PermissionMatrix';
import {
  useAdminRoles,
  useGrantPermission,
  useRevokePermission,
} from '../../../hooks/useAdminAccessAPI';

export const PermissionMatrixTab: React.FC = () => {
  const { roles, loading, error, refetch } = useAdminRoles();
  const { grantPermission } = useGrantPermission();
  const { revokePermission } = useRevokePermission();

  // In a real app, this would come from auth context
  const currentUserRole = AdminRole.SUPER_ADMIN; // TODO: Get from auth context
  const currentUserId = 'current-user-id'; // TODO: Get from auth context
  const currentUserEmail = 'admin@pravado.com'; // TODO: Get from auth context

  const canModifyPermissions = currentUserRole === AdminRole.SUPER_ADMIN;

  const handleGrantPermission = async (role: AdminRole, permission: AdminPermission) => {
    const result = await grantPermission(
      { role, permission },
      currentUserId,
      currentUserEmail
    );

    if (result) {
      await refetch();
    }
  };

  const handleRevokePermission = async (
    role: AdminRole,
    permission: AdminPermission
  ) => {
    const success = await revokePermission(
      { role, permission },
      currentUserId,
      currentUserEmail
    );

    if (success) {
      await refetch();
    }
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          <Typography variant="body2">Failed to load roles: {error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Permission Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage permissions assigned to each admin role
        </Typography>
      </Box>

      {!canModifyPermissions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have read-only access to this permission matrix. Only Super Admins can modify
          permissions.
        </Alert>
      )}

      <PermissionMatrix
        roles={roles}
        loading={loading}
        readOnly={!canModifyPermissions}
        onGrantPermission={handleGrantPermission}
        onRevokePermission={handleRevokePermission}
      />
    </Box>
  );
};

export default PermissionMatrixTab;
