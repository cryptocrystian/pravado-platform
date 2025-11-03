// =====================================================
// MANUAL FLAGGING TAB PAGE
// Sprint 58 Phase 5.5
// =====================================================

import React from 'react';
import { Box, Alert } from '@mui/material';
import { useFlagClient } from '../../../hooks/useAdminAPI';
import { ModerationPanelHeader } from '../../../components/admin/moderation/ModerationPanelHeader';
import { ManualFlagForm } from '../../../components/admin/moderation/ManualFlagForm';
import { FlagClientRequest } from '@pravado/shared-types';

export const ManualFlaggingTab: React.FC = () => {
  const { flagClient, flagging, error } = useFlagClient();

  const handleFlagSubmit = async (request: FlagClientRequest): Promise<boolean> => {
    const flagId = await flagClient(request);
    return flagId !== null;
  };

  return (
    <Box>
      <ModerationPanelHeader
        title="Manual Flagging"
        subtitle="Flag clients, tokens, or IP addresses for moderation action"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <ManualFlagForm onSubmit={handleFlagSubmit} loading={flagging} />
    </Box>
  );
};

export default ManualFlaggingTab;
