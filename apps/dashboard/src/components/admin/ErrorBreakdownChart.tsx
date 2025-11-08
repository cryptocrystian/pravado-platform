// =====================================================
// ERROR BREAKDOWN CHART COMPONENT
// Sprint 56 Phase 5.3 (Frontend)
// =====================================================

import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ErrorBreakdownItem, ErrorSeverity } from '@pravado/types';

export interface ErrorBreakdownChartProps {
  errorBreakdown: ErrorBreakdownItem[];
  loading?: boolean;
}

const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  critical: '#d32f2f',
  error: '#f57c00',
  warning: '#fbc02d',
  info: '#1976d2',
};

const CATEGORY_COLORS: Record<string, string> = {
  authentication: '#e91e63',
  authorization: '#9c27b0',
  rate_limit: '#ff9800',
  validation: '#3f51b5',
  agent_error: '#f44336',
  webhook_delivery: '#00bcd4',
  database: '#4caf50',
  network: '#ff5722',
  timeout: '#795548',
  unknown: '#9e9e9e',
};

export const ErrorBreakdownChart: React.FC<ErrorBreakdownChartProps> = ({
  errorBreakdown,
  loading,
}) => {
  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography>Loading error breakdown...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (errorBreakdown.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No errors in the selected time range
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const chartData = errorBreakdown.map((item) => ({
    name: item.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: item.count,
    percentage: item.percentage,
    severity: item.severity,
  }));

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Error Breakdown by Category
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Distribution of errors across different categories
        </Typography>

        <Box sx={{ width: '100%', height: 300, mt: 2 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[errorBreakdown[index].category] || '#9e9e9e'}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
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
                          <strong>{payload[0].name}</strong>
                        </Typography>
                        <Typography variant="caption" display="block">
                          Count: {payload[0].value}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Percentage: {payload[0].payload.percentage}%
                        </Typography>
                        <Box mt={0.5}>
                          <Chip
                            label={payload[0].payload.severity}
                            size="small"
                            sx={{
                              bgcolor: SEVERITY_COLORS[payload[0].payload.severity as ErrorSeverity],
                              color: 'white',
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Error Summary List */}
        <Box mt={2}>
          {errorBreakdown.map((item, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: CATEGORY_COLORS[item.category] || '#9e9e9e',
                  }}
                />
                <Typography variant="body2">
                  {item.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" fontWeight={600}>
                  {item.count.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({item.percentage}%)
                </Typography>
                <Chip
                  label={item.severity}
                  size="small"
                  sx={{
                    bgcolor: SEVERITY_COLORS[item.severity],
                    color: 'white',
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ErrorBreakdownChart;
