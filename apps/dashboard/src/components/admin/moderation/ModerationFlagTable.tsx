// =====================================================
// MODERATION FLAG TABLE COMPONENT
// Sprint 58 Phase 5.5
// =====================================================

import React from 'react';
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
  LinearProgress,
  Box,
} from '@mui/material';
import { ModerationFlag } from '@pravado/types';

export interface ModerationFlagTableProps {
  flags: ModerationFlag[];
  loading?: boolean;
}

export const ModerationFlagTable: React.FC<ModerationFlagTableProps> = ({ flags, loading }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ban':
        return 'error';
      case 'suspension':
        return 'warning';
      case 'restriction':
        return 'info';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
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
    <Paper variant="outlined">
      {loading && <LinearProgress />}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Flagged By</TableCell>
              <TableCell>Flagged At</TableCell>
              <TableCell>Expires At</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flags.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No moderation flags found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {flags.map((flag) => (
              <TableRow key={flag.flagId} hover>
                <TableCell>
                  <Chip label={flag.flagType} size="small" color={getTypeColor(flag.flagType)} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={flag.severity}
                    size="small"
                    color={getSeverityColor(flag.severity)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {flag.clientId || flag.tokenId || flag.ipAddress || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                    {flag.flagReason}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{flag.flaggedBy}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(flag.flaggedAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {flag.expiresAt ? formatTimestamp(flag.expiresAt) : 'Permanent'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {flag.isActive ? (
                    <Chip label="Active" size="small" color="warning" />
                  ) : (
                    <Chip label="Resolved" size="small" color="success" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ModerationFlagTable;
