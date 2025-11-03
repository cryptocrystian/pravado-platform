// =====================================================
// ABUSE REPORTS TAB PAGE
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material';
import { AbuseScore } from '@pravado/shared-types';
import { useAbuseReports } from '../../../hooks/useAdminAPI';
import { ModerationPanelHeader } from '../../../components/admin/moderation/ModerationPanelHeader';
import { AbuseReportTable } from '../../../components/admin/moderation/AbuseReportTable';

export const AbuseReportsTab: React.FC = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [abuseScore, setAbuseScore] = useState<string>('all');
  const [clientId, setClientId] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  const { reports, total, loading, error, refetch } = useAbuseReports({
    abuseScore: abuseScore !== 'all' ? (abuseScore as AbuseScore) : undefined,
    clientId: clientId || undefined,
    ipAddress: ipAddress || undefined,
    page,
    pageSize,
  });

  if (error) {
    return (
      <Box>
        <ModerationPanelHeader title="Abuse Reports" />
        <Alert severity="error" onClose={refetch}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <ModerationPanelHeader
        title="Abuse Reports"
        subtitle="Automated abuse detection reports sorted by severity"
      />

      {/* Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Abuse Score</InputLabel>
            <Select
              value={abuseScore}
              onChange={(e) => {
                setAbuseScore(e.target.value);
                setPage(0);
              }}
              label="Abuse Score"
            >
              <MenuItem value="all">All Scores</MenuItem>
              <MenuItem value={AbuseScore.NORMAL}>Normal</MenuItem>
              <MenuItem value={AbuseScore.SUSPICIOUS}>Suspicious</MenuItem>
              <MenuItem value={AbuseScore.ABUSIVE}>Abusive</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Client ID"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by client ID"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="IP Address"
            value={ipAddress}
            onChange={(e) => {
              setIpAddress(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by IP address"
          />
        </Grid>
      </Grid>

      {/* Table */}
      <AbuseReportTable
        reports={reports}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />
    </Box>
  );
};

export default AbuseReportsTab;
