// =====================================================
// PERMISSION MATRIX COMPONENT
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Box,
  Chip,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Lock } from '@mui/icons-material';
import {
  RoleDetails,
  AdminRole,
  AdminPermission,
  ROLE_DISPLAY_NAMES,
} from '@pravado/types';

export interface PermissionMatrixProps {
  roles: RoleDetails[];
  loading?: boolean;
  readOnly?: boolean;
  onGrantPermission: (role: AdminRole, permission: AdminPermission) => Promise<void>;
  onRevokePermission: (role: AdminRole, permission: AdminPermission) => Promise<void>;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  roles,
  loading = false,
  readOnly = false,
  onGrantPermission,
  onRevokePermission,
}) => {
  const [processingCell, setProcessingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract all unique permissions across all roles
  const allPermissions = Array.from(
    new Set(roles.flatMap((role) => role.permissions))
  ).sort();

  // Group permissions by category
  const permissionsByCategory: Record<string, AdminPermission[]> = {};
  allPermissions.forEach((permission) => {
    const category = permission.split('_')[0]; // First word is category
    if (!permissionsByCategory[category]) {
      permissionsByCategory[category] = [];
    }
    permissionsByCategory[category].push(permission);
  });

  const hasPermission = (role: RoleDetails, permission: AdminPermission): boolean => {
    return role.permissions.includes(permission);
  };

  const handleTogglePermission = async (role: RoleDetails, permission: AdminPermission) => {
    if (readOnly || role.isSystemRole) return;

    const cellKey = `${role.role}-${permission}`;
    setProcessingCell(cellKey);
    setError(null);

    try {
      const hasIt = hasPermission(role, permission);
      if (hasIt) {
        await onRevokePermission(role.role, permission);
      } else {
        await onGrantPermission(role.role, permission);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update permission');
    } finally {
      setProcessingCell(null);
    }
  };

  const formatPermissionName = (permission: AdminPermission): string => {
    return permission
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatCategoryName = (category: string): string => {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (roles.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          No roles available
        </Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined">
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {readOnly && (
        <Alert severity="info" sx={{ m: 2 }}>
          You have read-only access to this permission matrix. Only Super Admins can modify permissions.
        </Alert>
      )}

      <TableContainer sx={{ maxHeight: 800 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  backgroundColor: 'background.paper',
                  minWidth: 250,
                }}
              >
                Permission
              </TableCell>
              {roles.map((role) => (
                <TableCell
                  key={role.role}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'background.paper',
                    minWidth: 120,
                  }}
                >
                  <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                    <Typography variant="body2" fontWeight={700}>
                      {ROLE_DISPLAY_NAMES[role.role]}
                    </Typography>
                    {role.isSystemRole && (
                      <Tooltip title="System role - protected">
                        <Lock fontSize="small" color="disabled" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(permissionsByCategory).map(([category, permissions]) => (
              <React.Fragment key={category}>
                {/* Category Header Row */}
                <TableRow>
                  <TableCell
                    colSpan={roles.length + 1}
                    sx={{
                      backgroundColor: 'action.hover',
                      fontWeight: 700,
                      py: 1,
                    }}
                  >
                    <Chip
                      label={formatCategoryName(category)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>

                {/* Permission Rows */}
                {permissions.map((permission) => (
                  <TableRow key={permission} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatPermissionName(permission)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {permission}
                      </Typography>
                    </TableCell>
                    {roles.map((role) => {
                      const cellKey = `${role.role}-${permission}`;
                      const isProcessing = processingCell === cellKey;
                      const checked = hasPermission(role, permission);
                      const isDisabled = readOnly || role.isSystemRole || isProcessing;

                      return (
                        <TableCell key={role.role} align="center">
                          {isProcessing ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Checkbox
                              checked={checked}
                              onChange={() => handleTogglePermission(role, permission)}
                              disabled={isDisabled}
                              color="primary"
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box p={2} borderTop={1} borderColor="divider">
        <Typography variant="caption" color="text.secondary">
          Total Permissions: {allPermissions.length} | Total Roles: {roles.length}
        </Typography>
      </Box>
    </Paper>
  );
};

export default PermissionMatrix;
