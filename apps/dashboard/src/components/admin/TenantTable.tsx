// =====================================================
// TENANT TABLE COMPONENT
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
  TablePagination,
  TableSortLabel,
  Paper,
  Chip,
  Typography,
  LinearProgress,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { TenantActivity } from '@pravado/shared-types';

export interface TenantTableProps {
  tenants: TenantActivity[];
  total: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSort: (sortBy: string) => void;
  onExport?: () => void;
  exporting?: boolean;
}

export const TenantTable: React.FC<TenantTableProps> = ({
  tenants,
  total,
  loading,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onPageSizeChange,
  onSort,
  onExport,
  exporting,
}) => {
  const [orderBy, setOrderBy] = useState(sortBy || 'totalRequests');
  const [order, setOrder] = useState<'asc' | 'desc'>(sortOrder || 'desc');

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
    onSort(column);
  };

  const getRateLimitColor = (tier: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning'> = {
      free: 'default',
      basic: 'primary',
      professional: 'secondary',
      enterprise: 'success',
      unlimited: 'warning',
    };
    return colors[tier.toLowerCase()] || 'default';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Paper variant="outlined">
      {loading && <LinearProgress />}

      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
        <Typography variant="h6">Tenant Activity</Typography>
        {onExport && (
          <Tooltip title="Export to CSV">
            <IconButton onClick={onExport} disabled={exporting || loading}>
              <FileDownload />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'organizationName'}
                  direction={orderBy === 'organizationName' ? order : 'asc'}
                  onClick={() => handleSort('organizationName')}
                >
                  Organization
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'totalRequests'}
                  direction={orderBy === 'totalRequests' ? order : 'asc'}
                  onClick={() => handleSort('totalRequests')}
                >
                  Total Requests
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Success</TableCell>
              <TableCell align="right">Failed</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'errorRate'}
                  direction={orderBy === 'errorRate' ? order : 'asc'}
                  onClick={() => handleSort('errorRate')}
                >
                  Error Rate
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Agents</TableCell>
              <TableCell align="right">Avg Response</TableCell>
              <TableCell>Rate Tier</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'lastActivity'}
                  direction={orderBy === 'lastActivity' ? order : 'asc'}
                  onClick={() => handleSort('lastActivity')}
                >
                  Last Activity
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No tenant data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {tenants.map((tenant) => (
              <TableRow key={tenant.tenantId} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {tenant.organizationName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tenant.organizationId.substring(0, 8)}...
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>
                    {tenant.totalRequests.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="success.main">
                    {tenant.successfulRequests.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="error.main">
                    {tenant.failedRequests.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${tenant.errorRate.toFixed(2)}%`}
                    size="small"
                    color={tenant.errorRate > 10 ? 'error' : tenant.errorRate > 5 ? 'warning' : 'success'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {tenant.activeAgents} / {tenant.totalAgents}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{tenant.averageResponseTime.toFixed(0)}ms</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={tenant.rateLimitTier}
                    size="small"
                    color={getRateLimitColor(tenant.rateLimitTier)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(tenant.lastActivityAt)}
                  </Typography>
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
  );
};

export default TenantTable;
