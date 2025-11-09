// =====================================================
// USAGE TAB PAGE
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  ButtonGroup,
  Paper,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Refresh,
  FileDownload,
  DateRange,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { UsageMetricsChart } from '../../components/developer/UsageMetricsChart';
import { useUsageAnalytics } from '../../hooks/useDeveloperAPI';

// =====================================================
// TYPES
// =====================================================

interface UsageTabProps {
  clientId: string;
}

type TimeRange = '24h' | '7d' | '30d' | '90d' | 'custom';

// =====================================================
// COMPONENT
// =====================================================

export const UsageTab: React.FC<UsageTabProps> = ({ clientId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Calculate date range based on selection
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    let startDate = new Date();

    if (timeRange === 'custom') {
      return {
        startDate: customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: customEndDate || endDate,
      };
    }

    switch (timeRange) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const { metrics, loading, error, refetch } = useUsageAnalytics(clientId, startDate, endDate);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleExportData = () => {
    if (!metrics) return;

    const data = {
      exportDate: new Date().toISOString(),
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        rateLimitedRequests: metrics.rateLimitedRequests,
        averageResponseTime: metrics.averageResponseTime,
        p95ResponseTime: metrics.p95ResponseTime,
        p99ResponseTime: metrics.p99ResponseTime,
      },
      requestsByEndpoint: metrics.requestsByEndpoint,
      requestsByStatus: metrics.requestsByStatus,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-usage-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // =====================================================
  // RENDERING
  // =====================================================

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Usage Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor your API usage, performance metrics, and request patterns
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refetch}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportData}
            disabled={!metrics || loading}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Time Range Selector */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <DateRange color="action" />
            <Typography variant="subtitle2">Time Range:</Typography>
            <ButtonGroup size="small">
              <Button
                variant={timeRange === '24h' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('24h')}
              >
                24 Hours
              </Button>
              <Button
                variant={timeRange === '7d' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === '30d' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === '90d' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('90d')}
              >
                90 Days
              </Button>
              <Button
                variant={timeRange === 'custom' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('custom')}
              >
                Custom
              </Button>
            </ButtonGroup>
          </Box>

          {/* Custom Date Range Picker */}
          {timeRange === 'custom' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Start Date"
                    value={customStartDate}
                    onChange={(date) => setCustomStartDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="End Date"
                    value={customEndDate}
                    onChange={(date) => setCustomEndDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          )}

          {/* Current Range Display */}
          <Typography variant="caption" color="text.secondary">
            Showing data from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load usage analytics: {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {/* No Data State */}
      {!loading && !error && metrics && metrics.totalRequests === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Usage Data
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            No API requests have been made in the selected time range.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Try selecting a different time range or make some API calls to see usage data here.
          </Typography>
        </Paper>
      )}

      {/* Metrics Chart */}
      {!loading && !error && metrics && metrics.totalRequests > 0 && (
        <UsageMetricsChart metrics={metrics} loading={loading} />
      )}

      {/* Additional Information */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Understanding Your Metrics
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 0 }}>
          <li>
            <Typography variant="body2">
              <strong>Success Rate:</strong> Percentage of requests that returned a 2xx status code
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Error Rate:</strong> Percentage of requests that returned a 4xx or 5xx status code
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>P95 Response Time:</strong> 95% of requests complete in this time or less
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>P99 Response Time:</strong> 99% of requests complete in this time or less
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Rate Limited:</strong> Requests that were rejected due to exceeding rate limits
            </Typography>
          </li>
        </Box>
      </Paper>

      {/* Rate Limit Warning */}
      {metrics && metrics.rateLimitedRequests > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          You have {metrics.rateLimitedRequests.toLocaleString()} rate-limited requests ({((metrics.rateLimitedRequests / metrics.totalRequests) * 100).toFixed(2)}% of total).
          Consider upgrading your rate limit tier or optimizing your request patterns.
        </Alert>
      )}

      {/* Performance Warning */}
      {metrics && metrics.p99ResponseTime > 5000 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Your P99 response time is {metrics.p99ResponseTime.toFixed(0)}ms. If you're experiencing slow
          response times, check the performance of your endpoints and consider optimizing your requests.
        </Alert>
      )}
    </Box>
  );
};

export default UsageTab;
