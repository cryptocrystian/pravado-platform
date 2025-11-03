// =====================================================
// THRESHOLD SETTINGS TAB PAGE
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState } from 'react';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import { ModerationPanelHeader } from '../../../components/admin/moderation/ModerationPanelHeader';
import { ThresholdEditor } from '../../../components/admin/moderation/ThresholdEditor';
import { AbuseDetectionConfig } from '@pravado/shared-types';

export const ThresholdSettingsTab: React.FC = () => {
  const [config, setConfig] = useState<AbuseDetectionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real implementation, fetch config from API on mount
  // For now, using default config
  React.useEffect(() => {
    // Simulate API call
    setConfig({
      rateLimitExceededThreshold: 10,
      rateLimitBypassThreshold: 5,
      malformedPayloadThreshold: 20,
      malformedPayloadPercentage: 15.0,
      unauthorizedAttemptsThreshold: 10,
      authFailureThreshold: 15,
      tokenReuseThreshold: 5,
      suspiciousTokenPatternThreshold: 3,
      webhookFailureThreshold: 10,
      webhookFailurePercentage: 25.0,
      timeWindowMinutes: 60,
      requestsPerMinuteThreshold: 100,
      errorRateThreshold: 20.0,
      suspiciousScoreThreshold: 50,
      abusiveScoreThreshold: 75,
    });
  }, []);

  const handleSave = async (newConfig: AbuseDetectionConfig): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, save to API
      // await axios.post('/api/moderation/config', newConfig);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setConfig(newConfig);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save thresholds');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConfig({
      rateLimitExceededThreshold: 10,
      rateLimitBypassThreshold: 5,
      malformedPayloadThreshold: 20,
      malformedPayloadPercentage: 15.0,
      unauthorizedAttemptsThreshold: 10,
      authFailureThreshold: 15,
      tokenReuseThreshold: 5,
      suspiciousTokenPatternThreshold: 3,
      webhookFailureThreshold: 10,
      webhookFailurePercentage: 25.0,
      timeWindowMinutes: 60,
      requestsPerMinuteThreshold: 100,
      errorRateThreshold: 20.0,
      suspiciousScoreThreshold: 50,
      abusiveScoreThreshold: 75,
    });
  };

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <ModerationPanelHeader
        title="Threshold Settings"
        subtitle="Configure abuse detection thresholds and scoring weights"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Warning:</strong> Changing these thresholds affects abuse detection across the platform.
          Changes take effect immediately.
        </Typography>
      </Alert>

      <ThresholdEditor config={config} onSave={handleSave} onReset={handleReset} loading={loading} />
    </Box>
  );
};

export default ThresholdSettingsTab;
