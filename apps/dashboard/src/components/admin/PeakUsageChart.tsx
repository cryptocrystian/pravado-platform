// =====================================================
// PEAK USAGE CHART COMPONENT
// Sprint 56 Phase 5.3 (Frontend)
// =====================================================

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PeakUsageWindow } from '@pravado/types';

export interface PeakUsageChartProps {
  peakWindows: PeakUsageWindow[];
  loading?: boolean;
  chartType?: 'line' | 'bar';
}

export const PeakUsageChart: React.FC<PeakUsageChartProps> = ({
  peakWindows,
  loading,
  chartType = 'bar',
}) => {
  const chartData = peakWindows.map((window) => ({
    hour: `${window.hour}:00`,
    requests: window.requestCount,
    avgResponseTime: window.avgResponseTime,
    timestamp: window.timestamp,
  }));

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography>Loading peak usage data...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No peak usage data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Peak Usage Windows
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Top 10 busiest hours by request volume
        </Typography>
        <Box sx={{ width: '100%', height: 300, mt: 2 }}>
          <ResponsiveContainer>
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
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
                            <strong>Hour:</strong> {payload[0].payload.hour}
                          </Typography>
                          <Typography variant="caption" display="block" color="primary">
                            <strong>Requests:</strong> {payload[0].value?.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" display="block" color="success.main">
                            <strong>Avg Response:</strong> {payload[1]?.value?.toFixed(2)}ms
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="requests" fill="#1976d2" name="Request Count" />
                <Bar
                  yAxisId="right"
                  dataKey="avgResponseTime"
                  fill="#4caf50"
                  name="Avg Response Time (ms)"
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#1976d2"
                  strokeWidth={2}
                  name="Request Count"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PeakUsageChart;
