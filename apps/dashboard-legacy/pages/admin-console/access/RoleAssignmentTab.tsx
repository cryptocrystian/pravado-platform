// =====================================================
// ROLE ASSIGNMENT TAB PAGE
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { AdminRole } from '@pravado/types';
import { RoleAssignmentTable } from '../../../components/admin/access/RoleAssignmentTable';
import {
  useUsersWithRoles,
  useAssignRole,
  useRemoveRole,
} from '../../../hooks/useAdminAccessAPI';

export const RoleAssignmentTab: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const { users, loading, error, refetch } = useUsersWithRoles(page, pageSize);
  const { assignRole, assigning } = useAssignRole();
  const { removeRole, removing } = useRemoveRole();

  // In a real app, this would come from auth context
  const currentUserRole = AdminRole.SUPER_ADMIN; // TODO: Get from auth context
  const currentUserId = 'current-user-id'; // TODO: Get from auth context
  const currentUserEmail = 'admin@pravado.com'; // TODO: Get from auth context

  const handleAssignRole = async (
    userId: string,
    role: AdminRole,
    reason?: string
  ) => {
    const result = await assignRole(
      { userId, role, reason },
      currentUserId,
      currentUserEmail
    );

    if (result) {
      await refetch();
    }
  };

  const handleRemoveRole = async (
    userId: string,
    role: AdminRole,
    reason?: string
  ) => {
    const success = await removeRole(
      { userId, role, reason },
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
          <Typography variant="body2">Failed to load users: {error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Role Assignment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Assign and manage admin roles for users across the platform
        </Typography>
      </Box>

      {currentUserRole !== AdminRole.SUPER_ADMIN && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access. Only Super Admins can assign or remove roles.
        </Alert>
      )}

      <RoleAssignmentTable
        users={users}
        total={users.length}
        page={page}
        pageSize={pageSize}
        loading={loading || assigning || removing}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onAssignRole={handleAssignRole}
        onRemoveRole={handleRemoveRole}
        currentUserRole={currentUserRole}
      />
    </Box>
  );
};

export default RoleAssignmentTab;
