// =====================================================
// DEBUG TRACE EXPLORER TAB PAGE
// Sprint 59 Phase 5.6
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { Visibility, Error as ErrorIcon, Warning as WarningIcon, CheckCircle } from '@mui/icons-material';
import {
  TraceSearchFilters,
  AgentTraceSummary,
  TraceSearchResults,
} from '@pravado/shared-types';
import { AgentTraceSearchInput } from '../../../components/admin/debug/AgentTraceSearchInput';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface DebugTraceExplorerTabProps {
  onViewTrace?: (traceId: string) => void;
}

export const DebugTraceExplorerTab: React.FC<DebugTraceExplorerTabProps> = ({ onViewTrace }) => {
  const [traces, setTraces] = useState<AgentTraceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TraceSearchFilters>({});

  useEffect(() => {
    fetchTraces();
  }, [page, pageSize]);

  const fetchTraces = async (searchFilters?: TraceSearchFilters) => {
    try {
      setLoading(true);
      setError(null);

      const currentFilters = searchFilters || filters;

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      // Add filters to params
      if (currentFilters.query) params.append('query', currentFilters.query);
      if (currentFilters.agentId) params.append('agentId', currentFilters.agentId);
      if (currentFilters.conversationId) params.append('conversationId', currentFilters.conversationId);
      if (currentFilters.turnId) params.append('turnId', currentFilters.turnId);
      if (currentFilters.severity) params.append('severity', currentFilters.severity);
      if (currentFilters.nodeType) params.append('nodeType', currentFilters.nodeType);
      if (currentFilters.hasErrors !== undefined) params.append('hasErrors', currentFilters.hasErrors.toString());
      if (currentFilters.minDuration) params.append('minDuration', currentFilters.minDuration.toString());
      if (currentFilters.maxDuration) params.append('maxDuration', currentFilters.maxDuration.toString());
      if (currentFilters.tags && currentFilters.tags.length > 0) {
        params.append('tags', currentFilters.tags.join(','));
      }

      const response = await axios.get(`${API_BASE_URL}/agent-debug/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      const results: TraceSearchResults = response.data;
      setTraces(results.traces);
      setTotal(results.total);
    } catch (err: any) {
      console.error('Error fetching traces:', err);
      setError(err.response?.data?.error || 'Failed to fetch traces');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchFilters: TraceSearchFilters) => {
    setFilters(searchFilters);
    setPage(0); // Reset to first page on new search
    fetchTraces(searchFilters);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: 'success' | 'partial_failure' | 'failure') => {
    switch (status) {
      case 'success':
        return 'success';
      case 'partial_failure':
        return 'warning';
      case 'failure':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: 'success' | 'partial_failure' | 'failure') => {
    switch (status) {
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'partial_failure':
        return <WarningIcon fontSize="small" />;
      case 'failure':
        return <ErrorIcon fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Trace Explorer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search and filter agent execution traces for debugging and analysis
        </Typography>
      </Box>

      {/* Search Input */}
      <AgentTraceSearchInput onSearch={handleSearch} loading={loading} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Summary */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Searching...' : `Found ${total} trace(s)`}
        </Typography>
      </Box>

      {/* Results Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Trace ID</TableCell>
              <TableCell>Agent ID</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Steps</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Errors/Warnings</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress size={40} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            )}

            {!loading && traces.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No traces found. Try adjusting your search filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              traces.map((trace) => (
                <TableRow key={trace.traceId} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {trace.traceId.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {trace.agentId.substring(0, 8)}...
                    </Typography>
                    {trace.agentName && (
                      <Typography variant="caption" color="text.secondary">
                        {trace.agentName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(trace.startTime).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(trace.startTime).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatDuration(trace.totalDuration)}
                      size="small"
                      variant="outlined"
                      color={trace.totalDuration > 5000 ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{trace.totalSteps}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(trace.status)}
                      label={trace.status.replace('_', ' ')}
                      size="small"
                      color={getStatusColor(trace.status)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {trace.errorCount > 0 && (
                        <Tooltip title={`${trace.errorCount} error(s)`}>
                          <Chip
                            label={trace.errorCount}
                            size="small"
                            color="error"
                            icon={<ErrorIcon fontSize="small" />}
                          />
                        </Tooltip>
                      )}
                      {trace.warningCount > 0 && (
                        <Tooltip title={`${trace.warningCount} warning(s)`}>
                          <Chip
                            label={trace.warningCount}
                            size="small"
                            color="warning"
                            icon={<WarningIcon fontSize="small" />}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {trace.tags && trace.tags.length > 0 && (
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {trace.tags.slice(0, 2).map((tag) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                        {trace.tags.length > 2 && (
                          <Chip label={`+${trace.tags.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onViewTrace && onViewTrace(trace.traceId)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>
    </Box>
  );
};

export default DebugTraceExplorerTab;
