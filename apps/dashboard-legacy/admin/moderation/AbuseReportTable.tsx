// =====================================================
// ABUSE REPORT TABLE COMPONENT
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { AbuseReport } from '@pravado/types';
import { AbuseScoreBadge } from './AbuseScoreBadge';

export interface AbuseReportTableProps {
  reports: AbuseReport[];
  total: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const AbuseReportDetailModal: React.FC<{
  report: AbuseReport | null;
  open: boolean;
  onClose: () => void;
}> = ({ report, open, onClose }) => {
  if (!report) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Abuse Report Details</DialogTitle>
      <DialogContent>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Report ID
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {report.reportId}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Detected At
            </Typography>
            <Typography variant="body2">
              {new Date(report.detectedAt).toLocaleString()}
            </Typography>
          </Box>
          {report.clientId && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Client ID
              </Typography>
              <Typography variant="body2">{report.clientId}</Typography>
            </Box>
          )}
          {report.ipAddress && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                IP Address
              </Typography>
              <Typography variant="body2">{report.ipAddress}</Typography>
            </Box>
          )}
          {report.tokenId && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Token ID
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {report.tokenId}
              </Typography>
            </Box>
          )}
          {report.endpoint && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Endpoint
              </Typography>
              <Typography variant="body2">{report.endpoint}</Typography>
            </Box>
          )}
        </Box>

        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Abuse Score & Severity
          </Typography>
          <Box display="flex" gap={1}>
            <AbuseScoreBadge score={report.abuseScore} severity={report.severity} size="medium" />
          </Box>
        </Box>

        {report.patterns && report.patterns.length > 0 && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Detected Patterns
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {report.patterns.map((pattern, index) => (
                <Chip key={index} label={pattern.replace(/_/g, ' ')} size="small" color="warning" />
              ))}
            </Box>
          </Box>
        )}

        {report.metrics && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Detection Metrics (JSON)
            </Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
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
                {JSON.stringify(report.metrics, null, 2)}
              </Typography>
            </Box>
          </Box>
        )}

        {report.notes && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Notes
            </Typography>
            <Typography variant="body2">{report.notes}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export const AbuseReportTable: React.FC<AbuseReportTableProps> = ({
  reports,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const [selectedReport, setSelectedReport] = useState<AbuseReport | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleViewDetails = (report: AbuseReport) => {
    setSelectedReport(report);
    setModalOpen(true);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Paper variant="outlined">
        {loading && <LinearProgress />}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Score</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Client/IP/Token</TableCell>
                <TableCell>Patterns</TableCell>
                <TableCell>Detected At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={4}>
                      No abuse reports found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {reports.map((report) => (
                <TableRow key={report.reportId} hover>
                  <TableCell>
                    <AbuseScoreBadge score={report.abuseScore} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={report.severity}
                      size="small"
                      color={
                        report.severity >= 75
                          ? 'error'
                          : report.severity >= 50
                            ? 'warning'
                            : 'success'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {report.clientId || report.ipAddress || report.tokenId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {report.patterns?.length || 0} pattern(s)
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(report.detectedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {report.isResolved ? (
                      <Chip label="Resolved" size="small" color="success" />
                    ) : report.isFlagged ? (
                      <Chip label="Flagged" size="small" color="warning" />
                    ) : (
                      <Chip label="Pending" size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleViewDetails(report)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
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

      <AbuseReportDetailModal
        report={selectedReport}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default AbuseReportTable;
