// =====================================================
// MANUAL FLAG FORM COMPONENT
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Alert,
  Grid,
  Paper,
} from '@mui/material';
import { Flag } from '@mui/icons-material';
import { FlagClientRequest, ModerationFlagType, ModerationSeverity } from '@pravado/types';

export interface ManualFlagFormProps {
  onSubmit: (request: FlagClientRequest) => Promise<boolean>;
  loading?: boolean;
}

export const ManualFlagForm: React.FC<ManualFlagFormProps> = ({ onSubmit, loading }) => {
  const [clientId, setClientId] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagType, setFlagType] = useState<ModerationFlagType>(ModerationFlagType.WARNING);
  const [severity, setSeverity] = useState<ModerationSeverity>(ModerationSeverity.MEDIUM);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!clientId && !tokenId && !ipAddress) {
      setError('At least one identifier (Client ID, Token ID, or IP Address) is required');
      return;
    }

    if (!flagReason.trim()) {
      setError('Flag reason is required');
      return;
    }

    const request: FlagClientRequest = {
      clientId: clientId || undefined,
      tokenId: tokenId || undefined,
      ipAddress: ipAddress || undefined,
      flagReason: flagReason.trim(),
      flagType,
      severity,
      expiresAt: expiresAt || undefined,
    };

    const result = await onSubmit(request);

    if (result) {
      setSuccess(true);
      // Reset form
      setClientId('');
      setTokenId('');
      setIpAddress('');
      setFlagReason('');
      setFlagType(ModerationFlagType.WARNING);
      setSeverity(ModerationSeverity.MEDIUM);
      setExpiresAt('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>
          Manual Flag Entry
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Flag a client, token, or IP address for moderation action
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Flag created successfully!
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Identifiers */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Optional"
              helperText="At least one identifier required"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Optional"
              helperText="At least one identifier required"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="IP Address"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g., 192.168.1.1"
              helperText="At least one identifier required"
            />
          </Grid>

          {/* Flag Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Flag Type</InputLabel>
              <Select
                value={flagType}
                onChange={(e) => setFlagType(e.target.value as ModerationFlagType)}
                label="Flag Type"
              >
                <MenuItem value={ModerationFlagType.WARNING}>Warning</MenuItem>
                <MenuItem value={ModerationFlagType.RESTRICTION}>Restriction</MenuItem>
                <MenuItem value={ModerationFlagType.SUSPENSION}>Suspension</MenuItem>
                <MenuItem value={ModerationFlagType.BAN}>Ban</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Severity */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ModerationSeverity)}
                label="Severity"
              >
                <MenuItem value={ModerationSeverity.LOW}>Low</MenuItem>
                <MenuItem value={ModerationSeverity.MEDIUM}>Medium</MenuItem>
                <MenuItem value={ModerationSeverity.HIGH}>High</MenuItem>
                <MenuItem value={ModerationSeverity.CRITICAL}>Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Expiration */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Expires At (Optional)"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Leave blank for permanent flag"
            />
          </Grid>

          {/* Reason */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Flag Reason"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              multiline
              rows={4}
              required
              placeholder="Describe the reason for flagging this entity..."
            />
          </Grid>

          {/* Submit */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="warning"
              startIcon={<Flag />}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Submitting...' : 'Submit Flag'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default ManualFlagForm;
