// =====================================================
// AUDIT TRAIL TAB PAGE
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { AuditActionType, ExportFormat } from '@pravado/shared-types';
import { useAuditLogs, useExportAuditLogs } from '../../../hooks/useAdminAPI';
import { ModerationPanelHeader } from '../../../components/admin/moderation/ModerationPanelHeader';
import { AuditLogTable } from '../../../components/admin/moderation/AuditLogTable';

export const AuditTrailTab: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [actionType, setActionType] = useState<string>('all');
  const [actorId, setActorId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

  const { logs, total, loading, error, refetch } = useAuditLogs({
    actionTypes: actionType !== 'all' ? [actionType as AuditActionType] : undefined,
    actorId: actorId || undefined,
    searchQuery: searchQuery || undefined,
    page,
    pageSize,
  });

  const { exportLogs, exporting, error: exportError } = useExportAuditLogs();

  const handleExport = async () => {
    const data = await exportLogs(exportFormat, {
      actionTypes: actionType !== 'all' ? [actionType as AuditActionType] : undefined,
      actorId: actorId || undefined,
      searchQuery: searchQuery || undefined,
    });

    if (data && exportFormat === 'csv') {
      // Download CSV
      const url = window.URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else if (data && exportFormat === 'json') {
      // Download JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    setExportDialogOpen(false);
  };

  if (error) {
    return (
      <Box>
        <ModerationPanelHeader title="Audit Trail" />
        <Alert severity="error" onClose={refetch}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <ModerationPanelHeader
        title="Audit Trail"
        subtitle="Comprehensive log of all sensitive platform actions"
      >
        <Button
          startIcon={<FileDownload />}
          onClick={() => setExportDialogOpen(true)}
          variant="outlined"
        >
          Export
        </Button>
      </ModerationPanelHeader>

      {/* Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Action Type</InputLabel>
            <Select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setPage(0);
              }}
              label="Action Type"
            >
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value={AuditActionType.TOKEN_CREATED}>Token Created</MenuItem>
              <MenuItem value={AuditActionType.TOKEN_REVOKED}>Token Revoked</MenuItem>
              <MenuItem value={AuditActionType.AGENT_CREATED}>Agent Created</MenuItem>
              <MenuItem value={AuditActionType.AGENT_UPDATED}>Agent Updated</MenuItem>
              <MenuItem value={AuditActionType.ESCALATION_TRIGGERED}>Escalation Triggered</MenuItem>
              <MenuItem value={AuditActionType.ADMIN_LOGIN}>Admin Login</MenuItem>
              <MenuItem value={AuditActionType.CLIENT_FLAGGED}>Client Flagged</MenuItem>
              <MenuItem value={AuditActionType.CLIENT_BANNED}>Client Banned</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Actor ID"
            value={actorId}
            onChange={(e) => {
              setActorId(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by user/service"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search in metadata, action type, or target ID..."
          />
        </Grid>
      </Grid>

      {/* Table */}
      <AuditLogTable
        logs={logs}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Audit Logs</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              label="Export Format"
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
            </Select>
          </FormControl>
          {exportError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {exportError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} variant="contained" disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditTrailTab;
