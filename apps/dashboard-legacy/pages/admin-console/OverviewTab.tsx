// =====================================================
// OVERVIEW TAB PAGE
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
} from '@mui/material';
import {
  Assessment,
  CheckCircle,
  Error as ErrorIcon,
  Speed,
  Business,
  SmartToy,
} from '@mui/icons-material';
import { AnalyticsTimeRange } from '@pravado/types';
import { useOverviewStats } from '../../hooks/useAdminAPI';
import { StatsCard } from '../../components/admin/StatsCard';
import { PeakUsageChart } from '../../components/admin/PeakUsageChart';
import { ErrorBreakdownChart } from '../../components/admin/ErrorBreakdownChart';

export const OverviewTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(AnalyticsTimeRange.LAST_7D);
  const { stats, loading, error, refetch } = useOverviewStats(timeRange);

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
      {/* Time Range Selector */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Platform Overview
        </Typography>
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

      {!loading && stats && (
        <>
          {/* Summary Stats Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard
                title="Total Requests"
                value={stats.totalRequests.toLocaleString()}
                subtitle={`${stats.startDate.split('T')[0]} - ${stats.endDate.split('T')[0]}`}
                icon={<Assessment sx={{ fontSize: 32, color: '#1976d2' }} />}
                color="#1976d2"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard
                title="Successful Requests"
                value={stats.successfulRequests.toLocaleString()}
                subtitle={`${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}% success rate`}
                icon={<CheckCircle sx={{ fontSize: 32, color: '#4caf50' }} />}
                color="#4caf50"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard
                title="Failed Requests"
                value={stats.failedRequests.toLocaleString()}
                subtitle={`${stats.errorRate.toFixed(2)}% error rate`}
                icon={<ErrorIcon sx={{ fontSize: 32, color: '#f44336' }} />}
                color="#f44336"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard
                title="Avg Response Time"
                value={`${stats.averageResponseTime.toFixed(0)}ms`}
                subtitle={`P95: ${stats.p95ResponseTime.toFixed(0)}ms | P99: ${stats.p99ResponseTime.toFixed(0)}ms`}
                icon={<Speed sx={{ fontSize: 32, color: '#ff9800' }} />}
                color="#ff9800"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard
                title="Active Tenants"
                value={stats.uniqueTenants.toLocaleString()}
                subtitle="Organizations with activity"
                icon={<Business sx={{ fontSize: 32, color: '#9c27b0' }} />}
                color="#9c27b0"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard
                title="Active Agents"
                value={stats.activeAgents.toLocaleString()}
                subtitle="Agents processing requests"
                icon={<SmartToy sx={{ fontSize: 32, color: '#00bcd4' }} />}
                color="#00bcd4"
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <PeakUsageChart peakWindows={stats.peakUsageWindows} loading={loading} chartType="bar" />
            </Grid>
            <Grid item xs={12} lg={4}>
              <ErrorBreakdownChart errorBreakdown={stats.errorBreakdown} loading={loading} />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default OverviewTab;
