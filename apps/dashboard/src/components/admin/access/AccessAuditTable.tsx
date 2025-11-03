// =====================================================
// ACCESS AUDIT TABLE COMPONENT
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Block,
  Add,
  Remove,
  Edit,
  Delete,
} from '@mui/icons-material';
import { RoleAuditEntry, RoleAuditActionType } from '@pravado/shared-types';
import { RoleTag } from './RoleTag';

export interface AccessAuditTableProps {
  entries: RoleAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const AccessAuditTable: React.FC<AccessAuditTableProps> = ({
  entries,
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
}) => {
  const getActionIcon = (actionType: RoleAuditActionType) => {
    switch (actionType) {
      case RoleAuditActionType.ROLE_ASSIGNED:
      case RoleAuditActionType.PERMISSION_GRANTED:
        return <Add fontSize="small" color="success" />;
      case RoleAuditActionType.ROLE_REMOVED:
      case RoleAuditActionType.PERMISSION_REVOKED:
        return <Remove fontSize="small" color="error" />;
      case RoleAuditActionType.ROLE_CREATED:
        return <CheckCircle fontSize="small" color="success" />;
      case RoleAuditActionType.ROLE_UPDATED:
        return <Edit fontSize="small" color="primary" />;
      case RoleAuditActionType.ROLE_DELETED:
        return <Delete fontSize="small" color="error" />;
      case RoleAuditActionType.ACCESS_DENIED:
        return <Block fontSize="small" color="warning" />;
      default:
        return null;
    }
  };

  const getActionColor = (actionType: RoleAuditActionType) => {
    switch (actionType) {
      case RoleAuditActionType.ROLE_ASSIGNED:
      case RoleAuditActionType.PERMISSION_GRANTED:
      case RoleAuditActionType.ROLE_CREATED:
        return 'success';
      case RoleAuditActionType.ROLE_REMOVED:
      case RoleAuditActionType.PERMISSION_REVOKED:
      case RoleAuditActionType.ROLE_DELETED:
        return 'error';
      case RoleAuditActionType.ACCESS_DENIED:
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatActionType = (actionType: RoleAuditActionType) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <Typography>Loading audit logs...</Typography>
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          No audit entries found
        </Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Target User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Permission</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.auditId} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getActionIcon(entry.actionType)}
                    <Chip
                      label={formatActionType(entry.actionType)}
                      size="small"
                      color={getActionColor(entry.actionType)}
                      variant="outlined"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{entry.actorEmail || entry.actorId}</Typography>
                  {entry.actorEmail && (
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                      {entry.actorId.substring(0, 8)}...
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {entry.targetUserId ? (
                    <Tooltip title={entry.targetUserId}>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                        {entry.targetUserId.substring(0, 8)}...
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {entry.targetRole ? (
                    <RoleTag role={entry.targetRole} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {entry.permission ? (
                    <Chip
                      label={entry.permission.replace(/_/g, ' ')}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {entry.reason ? (
                    <Tooltip title={entry.reason}>
                      <Typography variant="body2" noWrap maxWidth={200}>
                        {entry.reason}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontFamily="monospace">
                    {entry.ipAddress || '-'}
                  </Typography>
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
  );
};

export default AccessAuditTable;
