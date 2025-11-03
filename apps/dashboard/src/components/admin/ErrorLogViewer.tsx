// =====================================================
// ERROR LOG VIEWER COMPONENT
// Sprint 56 Phase 5.3 (Frontend)
// =====================================================

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  IconButton,
  Collapse,
  Box,
  Button,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  ContentCopy,
  Error as ErrorIcon,
  Warning,
  Info,
} from '@mui/icons-material';
import { ErrorLogEntry, ErrorSeverity } from '@pravado/shared-types';

export interface ErrorLogViewerProps {
  logs: ErrorLogEntry[];
  loading?: boolean;
}

const ErrorLogRow: React.FC<{ log: ErrorLogEntry }> = ({ log }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'error':
        return <ErrorIcon fontSize="small" sx={{ color: '#f57c00' }} />;
      case 'warning':
        return <Warning fontSize="small" color="warning" />;
      default:
        return <Info fontSize="small" color="info" />;
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'error' as const;
      case 'error':
        return 'warning' as const;
      case 'warning':
        return 'warning' as const;
      default:
        return 'info' as const;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            {getSeverityIcon(log.severity)}
            <Chip label={log.severity} size="small" color={getSeverityColor(log.severity)} />
          </Box>
        </TableCell>
        <TableCell>
          <Chip label={log.statusCode} size="small" variant="outlined" />
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {log.errorType}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {log.errorCategory.replace(/_/g, ' ')}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
            {log.errorMessage}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{log.organizationName || '-'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {formatTimestamp(log.timestamp)}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Error Details
              </Typography>

              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  <strong>Full Message:</strong>
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {log.errorMessage}
                </Typography>
              </Box>

              <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Endpoint
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.method} {log.endpoint}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status Code
                  </Typography>
                  <Typography variant="body2">{log.statusCode}</Typography>
                </Box>
                {log.requestId && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Request ID
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                        {log.requestId}
                      </Typography>
                      <Tooltip title={copied ? 'Copied!' : 'Copy Request ID'}>
                        <IconButton size="small" onClick={() => handleCopy(log.requestId!)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
                {log.traceId && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Trace ID
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                        {log.traceId}
                      </Typography>
                      <Tooltip title={copied ? 'Copied!' : 'Copy Trace ID'}>
                        <IconButton size="small" onClick={() => handleCopy(log.traceId!)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
              </Box>

              {log.stackTrace && (
                <Box sx={{ bgcolor: 'grey.900', color: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography variant="caption" color="grey.400">
                      Stack Trace
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={() => handleCopy(log.stackTrace!)}
                      sx={{ color: 'grey.400' }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Box>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    {log.stackTrace}
                  </Typography>
                </Box>
              )}

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Metadata (JSON)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={() => handleCopy(JSON.stringify(log.metadata, null, 2))}
                    >
                      {copied ? 'Copied!' : 'Copy JSON'}
                    </Button>
                  </Box>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(log.metadata, null, 2)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const ErrorLogViewer: React.FC<ErrorLogViewerProps> = ({ logs, loading }) => {
  if (loading) {
    return (
      <Paper variant="outlined">
        <LinearProgress />
        <Box p={2}>
          <Typography>Loading error logs...</Typography>
        </Box>
      </Paper>
    );
  }

  if (logs.length === 0) {
    return (
      <Paper variant="outlined">
        <Box p={4} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            No error logs found for the selected filters
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width={50} />
            <TableCell>Severity</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Error Type</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Tenant</TableCell>
            <TableCell>Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <ErrorLogRow key={log.logId} log={log} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ErrorLogViewer;
