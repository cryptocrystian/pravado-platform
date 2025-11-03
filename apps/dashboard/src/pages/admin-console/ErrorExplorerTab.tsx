// =====================================================
// ERROR EXPLORER TAB PAGE
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
  Alert,
  CircularProgress,
  Typography,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import { AnalyticsTimeRange, ErrorSeverity, ErrorCategory } from '@pravado/shared-types';
import { useErrorLogs } from '../../hooks/useAdminAPI';
import { ErrorLogViewer } from '../../components/admin/ErrorLogViewer';

export const ErrorExplorerTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(AnalyticsTimeRange.LAST_7D);
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ErrorCategory | 'all'>('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);

  const { logs, total, loading, error, refetch } = useErrorLogs(
    timeRange,
    severityFilter === 'all' ? undefined : severityFilter,
    categoryFilter === 'all' ? undefined : categoryFilter,
    page,
    pageSize
  );

  const handleSeverityChange = (event: SelectChangeEvent<string>) => {
    setSeverityFilter(event.target.value as ErrorSeverity | 'all');
    setPage(0);
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setCategoryFilter(event.target.value as ErrorCategory | 'all');
    setPage(0);
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
          Error Explorer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse and analyze error logs with detailed stack traces and context
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
              onChange={(e) => {
                setTimeRange(e.target.value as AnalyticsTimeRange);
                setPage(0);
              }}
              label="Time Range"
            >
              <MenuItem value={AnalyticsTimeRange.LAST_24H}>Last 24 Hours</MenuItem>
              <MenuItem value={AnalyticsTimeRange.LAST_7D}>Last 7 Days</MenuItem>
              <MenuItem value={AnalyticsTimeRange.LAST_30D}>Last 30 Days</MenuItem>
              <MenuItem value={AnalyticsTimeRange.LAST_90D}>Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="severity-filter-label">Severity</InputLabel>
            <Select
              labelId="severity-filter-label"
              value={severityFilter}
              onChange={handleSeverityChange}
              label="Severity"
            >
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value={ErrorSeverity.CRITICAL}>Critical</MenuItem>
              <MenuItem value={ErrorSeverity.ERROR}>Error</MenuItem>
              <MenuItem value={ErrorSeverity.WARNING}>Warning</MenuItem>
              <MenuItem value={ErrorSeverity.INFO}>Info</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              labelId="category-filter-label"
              value={categoryFilter}
              onChange={handleCategoryChange}
              label="Category"
            >
              <MenuItem value="all">All Categories</MenuItem>
              <MenuItem value={ErrorCategory.AUTHENTICATION}>Authentication</MenuItem>
              <MenuItem value={ErrorCategory.AUTHORIZATION}>Authorization</MenuItem>
              <MenuItem value={ErrorCategory.RATE_LIMIT}>Rate Limit</MenuItem>
              <MenuItem value={ErrorCategory.VALIDATION}>Validation</MenuItem>
              <MenuItem value={ErrorCategory.AGENT_ERROR}>Agent Error</MenuItem>
              <MenuItem value={ErrorCategory.WEBHOOK_DELIVERY}>Webhook Delivery</MenuItem>
              <MenuItem value={ErrorCategory.DATABASE}>Database</MenuItem>
              <MenuItem value={ErrorCategory.NETWORK}>Network</MenuItem>
              <MenuItem value={ErrorCategory.TIMEOUT}>Timeout</MenuItem>
              <MenuItem value={ErrorCategory.UNKNOWN}>Unknown</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Active Filters */}
      {(severityFilter !== 'all' || categoryFilter !== 'all') && (
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary" mr={1}>
            Active filters:
          </Typography>
          {severityFilter !== 'all' && (
            <Chip
              label={`Severity: ${severityFilter}`}
              size="small"
              onDelete={() => {
                setSeverityFilter('all');
                setPage(0);
              }}
            />
          )}
          {categoryFilter !== 'all' && (
            <Chip
              label={`Category: ${categoryFilter.replace(/_/g, ' ')}`}
              size="small"
              onDelete={() => {
                setCategoryFilter('all');
                setPage(0);
              }}
            />
          )}
        </Box>
      )}

      {/* Results Summary */}
      {!loading && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            Showing {logs.length} of {total} error logs
          </Typography>
        </Box>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {!loading && logs && <ErrorLogViewer logs={logs} loading={loading} />}

      {/* Pagination */}
      {!loading && total > pageSize && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Box display="flex" gap={1}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '8px 16px',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <Typography variant="body2" sx={{ alignSelf: 'center', mx: 2 }}>
              Page {page + 1} of {Math.ceil(total / pageSize)}
            </Typography>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / pageSize) - 1}
              style={{
                padding: '8px 16px',
                cursor: page >= Math.ceil(total / pageSize) - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= Math.ceil(total / pageSize) - 1 ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ErrorExplorerTab;
