// =====================================================
// TENANT ACTIVITY TAB PAGE
// Sprint 56 Phase 5.3 (Frontend)
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { AnalyticsTimeRange } from '@pravado/types';
import { useTenantActivity, useExportTenantActivity } from '../../hooks/useAdminAPI';
import { TenantTable } from '../../components/admin/TenantTable';

export const TenantActivityTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(AnalyticsTimeRange.LAST_7D);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('totalRequests');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const { tenants, total, loading, error, refetch } = useTenantActivity(
    timeRange,
    page,
    pageSize,
    sortBy,
    sortOrder,
    searchQuery || undefined
  );

  const { exportData, exporting, exportError } = useExportTenantActivity();

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleExport = async () => {
    const blob = await exportData(timeRange, searchQuery || undefined);
    if (blob) {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-activity-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportDialogOpen(false);
    }
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" onClose={refetch}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Tenant Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor usage patterns and performance across all tenants
        </Typography>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as AnalyticsTimeRange)}
              label="Time Range"
            >
              <MenuItem value={AnalyticsTimeRange.LAST_24H}>Last 24 Hours</MenuItem>
              <MenuItem value={AnalyticsTimeRange.LAST_7D}>Last 7 Days</MenuItem>
              <MenuItem value={AnalyticsTimeRange.LAST_30D}>Last 30 Days</MenuItem>
              <MenuItem value={AnalyticsTimeRange.LAST_90D}>Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search by organization name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter organization name..."
          />
        </Grid>
      </Grid>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {!loading && tenants && (
        <TenantTable
          tenants={tenants}
          total={total}
          loading={loading}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          onSort={handleSort}
          onExport={() => setExportDialogOpen(true)}
          exporting={exporting}
        />
      )}

      {exportError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {exportError}
        </Alert>
      )}

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Tenant Activity</DialogTitle>
        <DialogContent>
          <Typography>
            Export tenant activity data to CSV for the selected time range ({timeRange})?
          </Typography>
          {searchQuery && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              Filtered by: {searchQuery}
            </Typography>
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

export default TenantActivityTab;
