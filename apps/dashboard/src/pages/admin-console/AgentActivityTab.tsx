// =====================================================
// AGENT ACTIVITY TAB PAGE
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { AnalyticsTimeRange } from '@pravado/shared-types';
import { useAgentActivity, useAgentLoadHeatmap } from '../../hooks/useAdminAPI';
import { AgentHeatmap } from '../../components/admin/AgentHeatmap';
import { StatsCard } from '../../components/admin/StatsCard';

export const AgentActivityTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(AnalyticsTimeRange.LAST_7D);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const { agents, loading, error, refetch } = useAgentActivity(timeRange);
  const {
    heatmapData,
    loading: heatmapLoading,
    error: heatmapError,
  } = useAgentLoadHeatmap(selectedAgentIds, timeRange);

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgentIds.length === agents.length) {
      setSelectedAgentIds([]);
    } else {
      setSelectedAgentIds(agents.map((agent) => agent.agentId));
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

  const totalAgents = agents.length;
  const avgConversations = agents.reduce((sum, a) => sum + a.totalConversations, 0) / totalAgents || 0;
  const avgEscalations = agents.reduce((sum, a) => sum + a.escalationCount, 0) / totalAgents || 0;
  const avgContradictions = agents.reduce((sum, a) => sum + a.contradictionCount, 0) / totalAgents || 0;

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Agent Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor AI agent performance, escalations, and load distribution
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

      {!loading && agents && (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Agents"
                value={totalAgents}
                subtitle="Active in time range"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Avg Conversations"
                value={avgConversations.toFixed(1)}
                subtitle="Per agent"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Avg Escalations"
                value={avgEscalations.toFixed(1)}
                subtitle="Per agent"
                color="#ff9800"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Avg Contradictions"
                value={avgContradictions.toFixed(1)}
                subtitle="Per agent"
                color="#f44336"
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Agent Performance Table */}
          <Box mb={4}>
            <Paper variant="outlined">
              <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Agent Performance Metrics</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedAgentIds.length === agents.length && agents.length > 0}
                      indeterminate={
                        selectedAgentIds.length > 0 && selectedAgentIds.length < agents.length
                      }
                      onChange={handleSelectAll}
                    />
                  }
                  label="Select all for heatmap"
                />
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Typography variant="caption">Heatmap</Typography>
                      </TableCell>
                      <TableCell>Agent Name</TableCell>
                      <TableCell align="right">Conversations</TableCell>
                      <TableCell align="right">Escalations</TableCell>
                      <TableCell align="right">Contradictions</TableCell>
                      <TableCell align="right">Avg Response</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.agentId} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedAgentIds.includes(agent.agentId)}
                            onChange={() => handleAgentToggle(agent.agentId)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {agent.agentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {agent.agentId.substring(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {agent.totalConversations.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={agent.escalationCount}
                            size="small"
                            color={agent.escalationCount > 10 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={agent.contradictionCount}
                            size="small"
                            color={agent.contradictionCount > 5 ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {agent.averageResponseTime.toFixed(0)}ms
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${agent.successRate.toFixed(1)}%`}
                            size="small"
                            color={
                              agent.successRate >= 95
                                ? 'success'
                                : agent.successRate >= 85
                                  ? 'warning'
                                  : 'error'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          {/* Agent Load Heatmap */}
          {heatmapError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {heatmapError}
            </Alert>
          )}
          <AgentHeatmap heatmapData={heatmapData} loading={heatmapLoading} />
        </>
      )}
    </Box>
  );
};

export default AgentActivityTab;
