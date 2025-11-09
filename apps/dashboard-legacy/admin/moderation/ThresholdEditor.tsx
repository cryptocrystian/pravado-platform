// =====================================================
// THRESHOLD EDITOR COMPONENT
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import { Save, RestartAlt } from '@mui/icons-material';
import { AbuseDetectionConfig } from '@pravado/types';

export interface ThresholdEditorProps {
  config: AbuseDetectionConfig | null;
  onSave: (config: AbuseDetectionConfig) => Promise<boolean>;
  onReset?: () => void;
  loading?: boolean;
}

const DEFAULT_CONFIG: AbuseDetectionConfig = {
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
};

export const ThresholdEditor: React.FC<ThresholdEditorProps> = ({
  config,
  onSave,
  onReset,
  loading,
}) => {
  const [formData, setFormData] = useState<AbuseDetectionConfig>(config || DEFAULT_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (field: keyof AbuseDetectionConfig, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (formData.suspiciousScoreThreshold >= formData.abusiveScoreThreshold) {
      setError('Suspicious threshold must be less than abusive threshold');
      return;
    }

    const result = await onSave(formData);

    if (result) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Failed to save thresholds');
    }
  };

  const handleResetClick = () => {
    setFormData(DEFAULT_CONFIG);
    if (onReset) {
      onReset();
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Abuse Detection Thresholds</Typography>
          <Button
            startIcon={<RestartAlt />}
            onClick={handleResetClick}
            disabled={loading}
            size="small"
          >
            Reset to Default
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Thresholds saved successfully!
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Rate Limiting */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Rate Limiting
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Rate Limit Exceeded Threshold"
              value={formData.rateLimitExceededThreshold}
              onChange={(e) =>
                handleChange('rateLimitExceededThreshold', parseInt(e.target.value))
              }
              helperText="Count within time window"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Rate Limit Bypass Threshold"
              value={formData.rateLimitBypassThreshold}
              onChange={(e) => handleChange('rateLimitBypassThreshold', parseInt(e.target.value))}
              helperText="Bypass attempts count"
            />
          </Grid>

          {/* Payload Quality */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Payload Quality
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Malformed Payload Threshold"
              value={formData.malformedPayloadThreshold}
              onChange={(e) => handleChange('malformedPayloadThreshold', parseInt(e.target.value))}
              helperText="Absolute count"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Malformed Payload Percentage"
              value={formData.malformedPayloadPercentage}
              onChange={(e) =>
                handleChange('malformedPayloadPercentage', parseFloat(e.target.value))
              }
              helperText="Percentage of total requests"
              inputProps={{ step: 0.1 }}
            />
          </Grid>

          {/* Authorization */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Authorization
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Unauthorized Attempts Threshold"
              value={formData.unauthorizedAttemptsThreshold}
              onChange={(e) =>
                handleChange('unauthorizedAttemptsThreshold', parseInt(e.target.value))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Auth Failure Threshold"
              value={formData.authFailureThreshold}
              onChange={(e) => handleChange('authFailureThreshold', parseInt(e.target.value))}
            />
          </Grid>

          {/* Token Security */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Token Security
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Token Reuse Threshold"
              value={formData.tokenReuseThreshold}
              onChange={(e) => handleChange('tokenReuseThreshold', parseInt(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Suspicious Token Pattern Threshold"
              value={formData.suspiciousTokenPatternThreshold}
              onChange={(e) =>
                handleChange('suspiciousTokenPatternThreshold', parseInt(e.target.value))
              }
            />
          </Grid>

          {/* Webhook */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Webhook
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Webhook Failure Threshold"
              value={formData.webhookFailureThreshold}
              onChange={(e) => handleChange('webhookFailureThreshold', parseInt(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Webhook Failure Percentage"
              value={formData.webhookFailurePercentage}
              onChange={(e) => handleChange('webhookFailurePercentage', parseFloat(e.target.value))}
              inputProps={{ step: 0.1 }}
            />
          </Grid>

          {/* General */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              General Thresholds
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Time Window (minutes)"
              value={formData.timeWindowMinutes}
              onChange={(e) => handleChange('timeWindowMinutes', parseInt(e.target.value))}
              helperText="Analysis window"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Requests Per Minute Threshold"
              value={formData.requestsPerMinuteThreshold}
              onChange={(e) =>
                handleChange('requestsPerMinuteThreshold', parseInt(e.target.value))
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Error Rate Threshold (%)"
              value={formData.errorRateThreshold}
              onChange={(e) => handleChange('errorRateThreshold', parseFloat(e.target.value))}
              inputProps={{ step: 0.1 }}
            />
          </Grid>

          {/* Scoring */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Score Thresholds
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Suspicious Score Threshold"
              value={formData.suspiciousScoreThreshold}
              onChange={(e) => handleChange('suspiciousScoreThreshold', parseInt(e.target.value))}
              helperText="0-100 scale"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Abusive Score Threshold"
              value={formData.abusiveScoreThreshold}
              onChange={(e) => handleChange('abusiveScoreThreshold', parseInt(e.target.value))}
              helperText="0-100 scale"
            />
          </Grid>

          {/* Submit */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<Save />}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Saving...' : 'Save Thresholds'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default ThresholdEditor;
