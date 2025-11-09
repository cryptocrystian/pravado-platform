// =====================================================
// MODERATION ACTIONS TAB PAGE
// Sprint 58 Phase 5.5
// =====================================================

import React from 'react';
import { Box, Alert, Typography, CircularProgress } from '@mui/material';
import { useCheckFlagged } from '../../../hooks/useAdminAPI';
import { ModerationPanelHeader } from '../../../components/admin/moderation/ModerationPanelHeader';
import { ModerationFlagTable } from '../../../components/admin/moderation/ModerationFlagTable';

export const ModerationActionsTab: React.FC = () => {
  // For demo purposes, showing all active flags
  // In a real implementation, this would filter by client/token/IP
  const { activeFlags, loading, error } = useCheckFlagged();

  if (error) {
    return (
      <Box>
        <ModerationPanelHeader title="Moderation Actions" />
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <ModerationPanelHeader
        title="Moderation Actions"
        subtitle="Active moderation flags and their status"
      />

      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {!loading && activeFlags.length === 0 && (
        <Alert severity="info">No active moderation flags found</Alert>
      )}

      {!loading && activeFlags.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Showing {activeFlags.length} active flag(s)
          </Typography>
          <ModerationFlagTable flags={activeFlags} loading={loading} />
        </>
      )}
    </Box>
  );
};

export default ModerationActionsTab;
