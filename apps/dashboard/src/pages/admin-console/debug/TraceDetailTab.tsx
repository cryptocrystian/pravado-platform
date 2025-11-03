// =====================================================
// TRACE DETAIL TAB PAGE
// Sprint 59 Phase 5.6
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import { ArrowBack, Timeline } from '@mui/icons-material';
import { AgentTraceTree, TracePerformanceMetrics } from '@pravado/shared-types';
import { TraceNodeCard } from '../../../components/admin/debug/TraceNodeCard';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface TraceDetailTabProps {
  traceId?: string;
  onBack?: () => void;
}

export const TraceDetailTab: React.FC<TraceDetailTabProps> = ({ traceId, onBack }) => {
  const [trace, setTrace] = useState<AgentTraceTree | null>(null);
  const [metrics, setMetrics] = useState<TracePerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId) {
      fetchTraceDetails();
    }
  }, [traceId]);

  const fetchTraceDetails = async () => {
    if (!traceId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch trace summary first to get the turn ID
      const summaryResponse = await axios.get(`${API_BASE_URL}/agent-debug/summary/${traceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      const summary = summaryResponse.data;

      // Fetch full trace by turn ID if available
      if (summary.turnId) {
        const traceResponse = await axios.get(`${API_BASE_URL}/agent-debug/turn/${summary.turnId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        setTrace(traceResponse.data);
      }

      // Fetch performance metrics
      const metricsResponse = await axios.get(`${API_BASE_URL}/agent-debug/metrics/${traceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      setMetrics(metricsResponse.data);
    } catch (err: any) {
      console.error('Error fetching trace details:', err);
      setError(err.response?.data?.error || 'Failed to fetch trace details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {onBack && (
          <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
            Back to Traces
          </Button>
        )}
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!trace) {
    return (
      <Box>
        {onBack && (
          <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
            Back to Traces
          </Button>
        )}
        <Alert severity="info">No trace data available</Alert>
      </Box>
    );
  }

  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          {onBack && (
            <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 1 }}>
              Back to Traces
            </Button>
          )}
          <Typography variant="h5" fontWeight={700}>
            Trace Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trace ID: {trace.traceId}
          </Typography>
        </Box>
        <Timeline fontSize="large" color="primary" />
      </Box>

      {/* Summary Information */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Agent ID
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {trace.agentId}
            </Typography>
          </Grid>

          {trace.conversationId && (
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Conversation ID
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {trace.conversationId}
              </Typography>
            </Grid>
          )}

          {trace.turnId && (
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Turn ID
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {trace.turnId}
              </Typography>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Total Duration
            </Typography>
            <Typography variant="body2">
              {formatDuration(trace.totalDuration)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Start Time
            </Typography>
            <Typography variant="body2">
              {new Date(trace.startTime).toLocaleString()}
            </Typography>
          </Grid>

          {trace.endTime && (
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                End Time
              </Typography>
              <Typography variant="body2">
                {new Date(trace.endTime).toLocaleString()}
              </Typography>
            </Grid>
          )}

          {trace.tags && trace.tags.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Tags
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {trace.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Performance Metrics */}
      {metrics && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Performance Metrics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Average Step Duration
              </Typography>
              <Typography variant="body2">
                {formatDuration(Math.round(metrics.averageStepDuration))}
              </Typography>
            </Grid>

            {metrics.slowestSteps.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Slowest Steps
                </Typography>
                <Box mt={1}>
                  {metrics.slowestSteps.map((step, idx) => (
                    <Box key={idx} display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">{step.label}</Typography>
                      <Chip
                        label={formatDuration(step.duration)}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}

            {Object.keys(metrics.severityBreakdown).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Severity Breakdown
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                  {Object.entries(metrics.severityBreakdown).map(([severity, count]) => (
                    <Chip
                      key={severity}
                      label={`${severity}: ${count}`}
                      size="small"
                      color={
                        severity === 'error' || severity === 'critical'
                          ? 'error'
                          : severity === 'warning'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Trace Tree */}
      <Typography variant="h6" gutterBottom>
        Execution Trace Tree
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Expand nodes to see detailed information about each step in the agent's execution.
      </Typography>

      <Box>
        {trace.rootNodes.map((node, index) => (
          <TraceNodeCard key={node.nodeId || index} node={node} />
        ))}
      </Box>

      {trace.rootNodes.length === 0 && (
        <Alert severity="info">No trace nodes available</Alert>
      )}
    </Box>
  );
};

export default TraceDetailTab;
