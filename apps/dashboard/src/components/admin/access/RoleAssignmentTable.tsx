// =====================================================
// ROLE ASSIGNMENT TABLE COMPONENT
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { UserRoleSummary, AdminRole, ROLE_DISPLAY_NAMES } from '@pravado/types';
import { RoleTag } from './RoleTag';

export interface RoleAssignmentTableProps {
  users: UserRoleSummary[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onAssignRole: (userId: string, role: AdminRole, reason?: string) => Promise<void>;
  onRemoveRole: (userId: string, role: AdminRole, reason?: string) => Promise<void>;
  currentUserRole?: AdminRole;
}

export const RoleAssignmentTable: React.FC<RoleAssignmentTableProps> = ({
  users,
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onAssignRole,
  onRemoveRole,
  currentUserRole,
}) => {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRoleSummary | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | ''>('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canModifyRoles = currentUserRole === AdminRole.SUPER_ADMIN;

  const handlePageChange = (_event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  const openAssignDialog = (user: UserRoleSummary) => {
    setSelectedUser(user);
    setSelectedRole('');
    setReason('');
    setError(null);
    setAssignDialogOpen(true);
  };

  const openRemoveDialog = (user: UserRoleSummary, role: AdminRole) => {
    setSelectedUser(user);
    setSelectedRole(role);
    setReason('');
    setError(null);
    setRemoveDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setActionLoading(true);
      setError(null);
      await onAssignRole(selectedUser.userId, selectedRole as AdminRole, reason || undefined);
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to assign role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setActionLoading(true);
      setError(null);
      await onRemoveRole(selectedUser.userId, selectedRole as AdminRole, reason || undefined);
      setRemoveDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to remove role');
    } finally {
      setActionLoading(false);
    }
  };

  const availableRoles = Object.values(AdminRole).filter(
    (role) => !selectedUser?.roles.includes(role)
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <Typography>Loading users...</Typography>
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          No users found
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Assigned Roles</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId} hover>
                  <TableCell>
                    <Tooltip title={user.userId}>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                        {user.userId.substring(0, 8)}...
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <RoleTag
                            key={role}
                            role={role}
                            onDelete={
                              canModifyRoles ? () => openRemoveDialog(user, role) : undefined
                            }
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No roles assigned
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.lastUpdated ? (
                      <>
                        <Typography variant="body2">
                          {new Date(user.lastUpdated).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(user.lastUpdated).toLocaleTimeString()}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {canModifyRoles && (
                      <Tooltip title="Assign Role">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openAssignDialog(user)}
                        >
                          <Add />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Role to User</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              User: <strong>{selectedUser?.email || selectedUser?.userId}</strong>
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {ROLE_DISPLAY_NAMES[role]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Reason (optional)"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this role is being assigned..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignRole}
            variant="contained"
            disabled={!selectedRole || actionLoading}
          >
            {actionLoading ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Role Dialog */}
      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Role from User</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2">
              Are you sure you want to remove the <strong>{selectedRole && ROLE_DISPLAY_NAMES[selectedRole as AdminRole]}</strong> role from{' '}
              <strong>{selectedUser?.email || selectedUser?.userId}</strong>?
            </Typography>

            <TextField
              label="Reason (optional)"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this role is being removed..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRemoveRole}
            variant="contained"
            color="error"
            disabled={actionLoading}
          >
            {actionLoading ? 'Removing...' : 'Remove Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RoleAssignmentTable;
