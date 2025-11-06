// =====================================================
// AUDIT LOG TABLE COMPONENT
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Typography,
  LinearProgress,
  Box,
  IconButton,
  Collapse,
  Tooltip,
  Button,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Error as ErrorIcon,
  FileDownload,
} from '@mui/icons-material';
import { AuditLogEntry } from '@pravado/types';

export interface AuditLogTableProps {
  logs: AuditLogEntry[];
  total: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onExport?: () => void;
  exporting?: boolean;
}

const AuditLogRow: React.FC<{ log: AuditLogEntry }> = ({ log }) => {
  const [open, setOpen] = useState(false);

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
            {log.success ? (
              <CheckCircle fontSize="small" color="success" />
            ) : (
              <ErrorIcon fontSize="small" color="error" />
            )}
            <Chip
              label={log.success ? 'Success' : 'Failed'}
              size="small"
              color={log.success ? 'success' : 'error'}
            />
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {log.actionType.replace(/_/g, ' ')}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
            {log.actorId}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
            {log.targetId || '-'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{log.ipAddress}</Typography>
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
                Audit Log Details
              </Typography>

              <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Log ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.logId}
                  </Typography>
                </Box>
                {log.targetType && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Target Type
                    </Typography>
                    <Typography variant="body2">{log.targetType}</Typography>
                  </Box>
                )}
                {log.userAgent && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                      {log.userAgent}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Organization ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {log.organizationId}
                  </Typography>
                </Box>
              </Box>

              {log.errorMessage && (
                <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" color="error.dark" gutterBottom display="block">
                    <strong>Error Message:</strong>
                  </Typography>
                  <Typography variant="body2" color="error.dark">
                    {log.errorMessage}
                  </Typography>
                </Box>
              )}

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    <strong>Metadata (JSON):</strong>
                  </Typography>
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

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onExport,
  exporting,
}) => {
  return (
    <Paper variant="outlined">
      {loading && <LinearProgress />}

      {onExport && (
        <Box display="flex" justifyContent="flex-end" p={2}>
          <Tooltip title="Export to CSV/JSON">
            <Button
              startIcon={<FileDownload />}
              onClick={onExport}
              disabled={exporting || loading}
              variant="outlined"
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </Tooltip>
        </Box>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No audit logs found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <AuditLogRow key={log.logId} log={log} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
};

export default AuditLogTable;
