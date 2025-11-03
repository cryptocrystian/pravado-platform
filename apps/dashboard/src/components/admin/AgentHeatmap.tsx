// =====================================================
// AGENT HEATMAP COMPONENT
// Sprint 56 Phase 5.3 (Frontend)
// =====================================================

import React from 'react';
import { Card, CardContent, Typography, Box, Tooltip as MuiTooltip } from '@mui/material';
import { AgentLoadHeatmapData } from '@pravado/shared-types';

export interface AgentHeatmapProps {
  heatmapData: AgentLoadHeatmapData[];
  loading?: boolean;
}

export const AgentHeatmap: React.FC<AgentHeatmapProps> = ({ heatmapData, loading }) => {
  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography>Loading heatmap data...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (heatmapData.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No heatmap data available. Select agents to view their hourly load distribution.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Get all unique hours from all agents
  const allHours = new Set<string>();
  heatmapData.forEach((agent) => {
    agent.hourlyLoad.forEach((load) => {
      allHours.add(load.hour);
    });
  });
  const hours = Array.from(allHours).sort();

  // Find max request count for color scaling
  const maxRequests = Math.max(
    ...heatmapData.flatMap((agent) => agent.hourlyLoad.map((load) => load.requestCount))
  );

  // Color scale function
  const getColor = (requestCount: number): string => {
    if (requestCount === 0) return '#f5f5f5';
    const intensity = Math.min(requestCount / maxRequests, 1);
    if (intensity < 0.2) return '#bbdefb';
    if (intensity < 0.4) return '#64b5f6';
    if (intensity < 0.6) return '#2196f3';
    if (intensity < 0.8) return '#1976d2';
    return '#0d47a1';
  };

  const cellSize = 40;
  const labelWidth = 150;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Agent Load Heatmap
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Hourly request distribution across selected agents
        </Typography>

        <Box
          sx={{
            overflowX: 'auto',
            mt: 2,
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: 'inline-block',
              minWidth: labelWidth + hours.length * cellSize,
            }}
          >
            {/* Hour labels */}
            <Box display="flex" mb={1}>
              <Box width={labelWidth} />
              {hours.map((hour) => (
                <Box
                  key={hour}
                  width={cellSize}
                  textAlign="center"
                  sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                >
                  {hour}
                </Box>
              ))}
            </Box>

            {/* Heatmap rows */}
            {heatmapData.map((agent) => {
              // Create a map of hour to load data
              const loadMap = new Map(agent.hourlyLoad.map((load) => [load.hour, load]));

              return (
                <Box key={agent.agentId} display="flex" mb={0.5}>
                  {/* Agent name label */}
                  <Box
                    width={labelWidth}
                    display="flex"
                    alignItems="center"
                    pr={1}
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {agent.agentName}
                    </Typography>
                  </Box>

                  {/* Heatmap cells */}
                  {hours.map((hour) => {
                    const load = loadMap.get(hour);
                    const requestCount = load?.requestCount || 0;
                    const avgResponseTime = load?.avgResponseTime || 0;
                    const errorCount = load?.errorCount || 0;

                    return (
                      <MuiTooltip
                        key={hour}
                        title={
                          <Box>
                            <Typography variant="caption" display="block">
                              <strong>{agent.agentName}</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                              Hour: {hour}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Requests: {requestCount}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Avg Response: {avgResponseTime.toFixed(0)}ms
                            </Typography>
                            {errorCount > 0 && (
                              <Typography variant="caption" display="block" color="error">
                                Errors: {errorCount}
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                      >
                        <Box
                          sx={{
                            width: cellSize,
                            height: cellSize,
                            bgcolor: getColor(requestCount),
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: requestCount > maxRequests * 0.5 ? 'white' : 'text.primary',
                            '&:hover': {
                              opacity: 0.8,
                              boxShadow: 1,
                            },
                          }}
                        >
                          {requestCount > 0 ? requestCount : ''}
                        </Box>
                      </MuiTooltip>
                    );
                  })}
                </Box>
              );
            })}

            {/* Legend */}
            <Box display="flex" alignItems="center" gap={2} mt={3} ml={labelWidth}>
              <Typography variant="caption" color="text.secondary">
                Load intensity:
              </Typography>
              {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, index) => (
                <Box key={index} display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: getColor(intensity * maxRequests),
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {intensity === 0 ? '0' : intensity === 1 ? `${maxRequests}+` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AgentHeatmap;
