// =====================================================
// ACCESS AUDIT TAB PAGE
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
} from '@mui/material';
import { Search, Download, Clear } from '@mui/icons-material';
import {
  RoleAuditFilters,
  AdminRole,
  AdminPermission,
  RoleAuditActionType,
} from '@pravado/types';
import { AccessAuditTable } from '../../../components/admin/access/AccessAuditTable';
import { useAccessAuditLogs } from '../../../hooks/useAdminAccessAPI';

export const AccessAuditTab: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<RoleAuditFilters>({
    page,
    pageSize,
  });
  const [tempFilters, setTempFilters] = useState<RoleAuditFilters>({
    page,
    pageSize,
  });

  const { auditLogs, loading, error } = useAccessAuditLogs({
    ...filters,
    page,
    pageSize,
  });

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setPage(0);
  };

  const handleClearFilters = () => {
    const clearedFilters: RoleAuditFilters = { page: 0, pageSize };
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setPage(0);
  };

  const handleExportCSV = () => {
    if (auditLogs.entries.length === 0) return;

    const headers = [
      'Action',
      'Actor ID',
      'Actor Email',
      'Target User ID',
      'Role',
      'Permission',
      'Reason',
      'Timestamp',
      'IP Address',
    ];

    const rows = auditLogs.entries.map((entry) => [
      entry.actionType,
      entry.actorId,
      entry.actorEmail || '',
      entry.targetUserId || '',
      entry.targetRole || '',
      entry.permission || '',
      entry.reason || '',
      new Date(entry.timestamp).toISOString(),
      entry.ipAddress || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `access_audit_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          <Typography variant="body2">Failed to load audit logs: {error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Access Audit Trail
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track all role assignments, permission changes, and access control modifications
        </Typography>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Action Type</InputLabel>
              <Select
                value={tempFilters.actionType || ''}
                label="Action Type"
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    actionType: e.target.value as RoleAuditActionType,
                  })
                }
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(RoleAuditActionType).map((action) => (
                  <MenuItem key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={tempFilters.role || ''}
                label="Role"
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, role: e.target.value as AdminRole })
                }
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(AdminRole).map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Permission</InputLabel>
              <Select
                value={tempFilters.permission || ''}
                label="Permission"
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    permission: e.target.value as AdminPermission,
                  })
                }
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(AdminPermission).map((permission) => (
                  <MenuItem key={permission} value={permission}>
                    {permission.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Actor ID"
              value={tempFilters.actorId || ''}
              onChange={(e) =>
                setTempFilters({ ...tempFilters, actorId: e.target.value })
              }
              placeholder="Filter by actor..."
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Target User ID"
              value={tempFilters.targetUserId || ''}
              onChange={(e) =>
                setTempFilters({ ...tempFilters, targetUserId: e.target.value })
              }
              placeholder="Filter by target user..."
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Start Date"
              value={
                tempFilters.startDate
                  ? tempFilters.startDate.toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                setTempFilters({
                  ...tempFilters,
                  startDate: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="End Date"
              value={
                tempFilters.endDate ? tempFilters.endDate.toISOString().split('T')[0] : ''
              }
              onChange={(e) =>
                setTempFilters({
                  ...tempFilters,
                  endDate: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={handleApplyFilters}
                fullWidth
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Export Button */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExportCSV}
          disabled={auditLogs.entries.length === 0}
        >
          Export to CSV
        </Button>
      </Box>

      {/* Audit Table */}
      <AccessAuditTable
        entries={auditLogs.entries}
        total={auditLogs.total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Box>
  );
};

export default AccessAuditTab;
