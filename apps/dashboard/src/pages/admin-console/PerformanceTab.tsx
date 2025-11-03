// =====================================================
// PERFORMANCE TAB PAGE
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AnalyticsTimeRange } from '@pravado/shared-types';
import { usePerformanceMetrics } from '../../hooks/useAdminAPI';
import { StatsCard } from '../../components/admin/StatsCard';

export const PerformanceTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(AnalyticsTimeRange.LAST_7D);

  const { metrics, loading, error, refetch } = usePerformanceMetrics(timeRange);

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
          Performance Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor API route latency, webhook delivery, and request performance
        </Typography>
      </Box>

      {/* Time Range Selector */}
      <Box mb={3}>
        <FormControl variant="outlined" sx={{ minWidth: 200 }}>
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
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {!loading && metrics && (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Routes"
                value={metrics.routeLatencies.length}
                subtitle="API endpoints tracked"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Webhook Success Rate"
                value={`${metrics.webhookMetrics.successRate.toFixed(1)}%`}
                subtitle={`${metrics.webhookMetrics.deliveredCount}/${metrics.webhookMetrics.totalAttempts} delivered`}
                color={
                  metrics.webhookMetrics.successRate >= 95
                    ? '#4caf50'
                    : metrics.webhookMetrics.successRate >= 80
                      ? '#ff9800'
                      : '#f44336'
                }
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Avg Webhook Latency"
                value={`${metrics.webhookMetrics.averageLatency.toFixed(0)}ms`}
                subtitle={`P95: ${metrics.webhookMetrics.p95Latency.toFixed(0)}ms`}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Failed Webhooks"
                value={metrics.webhookMetrics.failedCount}
                subtitle="Requires investigation"
                color={metrics.webhookMetrics.failedCount > 0 ? '#f44336' : '#4caf50'}
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Route Latency Chart */}
          <Card variant="outlined" sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Route Latency Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average, P95, and P99 response times by endpoint
              </Typography>
              <Box sx={{ width: '100%', height: 400, mt: 2 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics.routeLatencies} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="route"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box
                              sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                              }}
                            >
                              <Typography variant="caption" display="block">
                                <strong>{data.method} {data.route}</strong>
                              </Typography>
                              <Typography variant="caption" display="block">
                                Requests: {data.requestCount}
                              </Typography>
                              <Typography variant="caption" display="block" color="primary">
                                Avg: {data.averageLatency.toFixed(2)}ms
                              </Typography>
                              <Typography variant="caption" display="block" color="warning.main">
                                P95: {data.p95Latency.toFixed(2)}ms
                              </Typography>
                              <Typography variant="caption" display="block" color="error">
                                P99: {data.p99Latency.toFixed(2)}ms
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="averageLatency" fill="#1976d2" name="Avg Latency" />
                    <Bar dataKey="p95Latency" fill="#ff9800" name="P95 Latency" />
                    <Bar dataKey="p99Latency" fill="#f44336" name="P99 Latency" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Top 10 Slowest Requests */}
          <Paper variant="outlined" sx={{ mb: 4 }}>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Top 10 Slowest Requests
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Individual requests with highest response times
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Tenant</TableCell>
                    <TableCell align="right">Response Time</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.slowestRequests.map((request, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {request.method} {request.endpoint}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{request.organizationName || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${request.responseTime.toFixed(0)}ms`}
                          size="small"
                          color={
                            request.responseTime > 5000
                              ? 'error'
                              : request.responseTime > 2000
                                ? 'warning'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={request.statusCode}
                          size="small"
                          color={
                            request.statusCode >= 200 && request.statusCode < 300
                              ? 'success'
                              : request.statusCode >= 400
                                ? 'error'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(request.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Webhook Metrics Details */}
          <Paper variant="outlined">
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Webhook Delivery Metrics
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Detailed webhook delivery statistics
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Attempts</TableCell>
                    <TableCell align="right">{metrics.webhookMetrics.totalAttempts}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Delivered</TableCell>
                    <TableCell align="right">
                      <Chip label={metrics.webhookMetrics.deliveredCount} size="small" color="success" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Failed</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={metrics.webhookMetrics.failedCount}
                        size="small"
                        color={metrics.webhookMetrics.failedCount > 0 ? 'error' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Success Rate</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${metrics.webhookMetrics.successRate.toFixed(2)}%`}
                        size="small"
                        color={
                          metrics.webhookMetrics.successRate >= 95
                            ? 'success'
                            : metrics.webhookMetrics.successRate >= 80
                              ? 'warning'
                              : 'error'
                        }
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Average Latency</TableCell>
                    <TableCell align="right">
                      {metrics.webhookMetrics.averageLatency.toFixed(2)}ms
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>P95 Latency</TableCell>
                    <TableCell align="right">{metrics.webhookMetrics.p95Latency.toFixed(2)}ms</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>P99 Latency</TableCell>
                    <TableCell align="right">{metrics.webhookMetrics.p99Latency.toFixed(2)}ms</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default PerformanceTab;
