// =====================================================
// USAGE METRICS CHART COMPONENT
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Error as ErrorIcon,
  Speed,
} from '@mui/icons-material';

// =====================================================
// TYPES
// =====================================================

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsByEndpoint: {
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }[];
  requestsByStatus: {
    status: string;
    count: number;
  }[];
}

interface UsageMetricsChartProps {
  metrics: UsageMetrics;
  loading?: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export const UsageMetricsChart: React.FC<UsageMetricsChartProps> = ({ metrics, loading }) => {
  const [chartType, setChartType] = useState<'endpoint' | 'status' | 'latency'>('endpoint');

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const successRate = metrics.totalRequests > 0
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  const errorRate = metrics.totalRequests > 0
    ? ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  const rateLimitRate = metrics.totalRequests > 0
    ? ((metrics.rateLimitedRequests / metrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  // =====================================================
  // CHART DATA PREPARATION
  // =====================================================

  const statusPieData = metrics.requestsByStatus.map((item) => ({
    name: item.status,
    value: item.count,
  }));

  const endpointBarData = metrics.requestsByEndpoint
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      endpoint: item.endpoint.split('/').pop() || item.endpoint,
      fullEndpoint: item.endpoint,
      requests: item.count,
      avgLatency: item.averageResponseTime,
    }));

  const latencyData = [
    { name: 'Average', value: metrics.averageResponseTime },
    { name: 'P95', value: metrics.p95ResponseTime },
    { name: 'P99', value: metrics.p99ResponseTime },
  ];

  // =====================================================
  // COLORS
  // =====================================================

  const STATUS_COLORS: Record<string, string> = {
    '200': '#4caf50',
    '201': '#66bb6a',
    '400': '#ff9800',
    '401': '#f57c00',
    '403': '#f57c00',
    '404': '#ff5722',
    '429': '#e91e63',
    '500': '#f44336',
    '502': '#d32f2f',
    '503': '#d32f2f',
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || '#9e9e9e';

  // =====================================================
  // STAT CARD COMPONENT
  // =====================================================

  interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, color }) => (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ color: color || 'text.primary', mb: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box>
          {icon}
          {trend && (
            <Box mt={1}>
              {trend === 'up' && <TrendingUp color="success" />}
              {trend === 'down' && <TrendingDown color="error" />}
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );

  // =====================================================
  // RENDERING
  // =====================================================

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading metrics...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Summary Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Requests"
            value={metrics.totalRequests.toLocaleString()}
            subtitle="All time"
            icon={<Speed color="primary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={`${successRate}%`}
            subtitle={`${metrics.successfulRequests.toLocaleString()} successful`}
            icon={<CheckCircle sx={{ color: '#4caf50' }} />}
            trend={Number(successRate) >= 95 ? 'up' : 'down'}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Error Rate"
            value={`${errorRate}%`}
            subtitle={`${metrics.failedRequests.toLocaleString()} failed`}
            icon={<ErrorIcon sx={{ color: '#f44336' }} />}
            trend={Number(errorRate) <= 5 ? 'up' : 'down'}
            color="#f44336"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rate Limited"
            value={`${rateLimitRate}%`}
            subtitle={`${metrics.rateLimitedRequests.toLocaleString()} requests`}
            icon={<ErrorIcon sx={{ color: '#e91e63' }} />}
            color="#e91e63"
          />
        </Grid>
      </Grid>

      {/* Latency Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Average Response Time"
            value={`${metrics.averageResponseTime.toFixed(0)}ms`}
            subtitle="Mean latency"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="P95 Response Time"
            value={`${metrics.p95ResponseTime.toFixed(0)}ms`}
            subtitle="95th percentile"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="P99 Response Time"
            value={`${metrics.p99ResponseTime.toFixed(0)}ms`}
            subtitle="99th percentile"
          />
        </Grid>
      </Grid>

      {/* Chart Toggle */}
      <Box mb={2} display="flex" justifyContent="center">
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, newType) => newType && setChartType(newType)}
          aria-label="chart type"
          size="small"
        >
          <ToggleButton value="endpoint" aria-label="by endpoint">
            By Endpoint
          </ToggleButton>
          <ToggleButton value="status" aria-label="by status">
            By Status
          </ToggleButton>
          <ToggleButton value="latency" aria-label="latency">
            Latency Breakdown
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Charts */}
      <Card>
        <CardContent>
          {chartType === 'endpoint' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Requests by Endpoint
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Top 10 most frequently called endpoints
              </Typography>
              <Divider sx={{ my: 2 }} />
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={endpointBarData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="endpoint"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Paper sx={{ p: 1.5 }}>
                            <Typography variant="caption" display="block">
                              <strong>{payload[0].payload.fullEndpoint}</strong>
                            </Typography>
                            <Typography variant="caption" display="block" color="primary">
                              Requests: {payload[0].value}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Avg Latency: {payload[0].payload.avgLatency.toFixed(0)}ms
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="requests" fill="#1976d2" name="Request Count" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          {chartType === 'status' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Requests by Status Code
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Distribution of HTTP response status codes
              </Typography>
              <Divider sx={{ my: 2 }} />
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Paper sx={{ p: 1.5 }}>
                            <Typography variant="caption" display="block">
                              <strong>Status {payload[0].name}</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                              Count: {payload[0].value}
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}

          {chartType === 'latency' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Response Time Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average, P95, and P99 latency metrics
              </Typography>
              <Divider sx={{ my: 2 }} />
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={latencyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Paper sx={{ p: 1.5 }}>
                            <Typography variant="caption" display="block">
                              <strong>{payload[0].payload.name}</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                              {payload[0].value?.toFixed(2)}ms
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Response Time (ms)"
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default UsageMetricsChart;
