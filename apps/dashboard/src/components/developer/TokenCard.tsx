// =====================================================
// TOKEN CARD COMPONENT
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ContentCopy,
  Refresh,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useRotateToken, useRevokeToken } from '../../hooks/useDeveloperAPI';

// =====================================================
// TYPES
// =====================================================

interface TokenCardProps {
  token: {
    tokenId: string;
    clientId: string;
    name: string;
    description?: string;
    tokenPrefix: string;
    accessLevel: string;
    rateLimitTier: string;
    scopes: any[];
    isActive: boolean;
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
  };
  onTokenUpdated?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const TokenCard: React.FC<TokenCardProps> = ({ token, onTokenUpdated }) => {
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(365);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { rotateToken, loading: rotateLoading, error: rotateError } = useRotateToken();
  const { revokeToken, loading: revokeLoading, error: revokeError } = useRevokeToken();

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleCopyPrefix = () => {
    navigator.clipboard.writeText(token.tokenPrefix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRotatedToken = () => {
    if (rotatedToken) {
      navigator.clipboard.writeText(rotatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRotate = async () => {
    try {
      const expiresIn = expiresInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
      const result = await rotateToken(token.tokenId, expiresIn);
      setRotatedToken(result.newToken);
      if (onTokenUpdated) {
        onTokenUpdated();
      }
    } catch (err) {
      console.error('Failed to rotate token:', err);
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeToken(token.tokenId, revokeReason);
      setShowRevokeDialog(false);
      if (onTokenUpdated) {
        onTokenUpdated();
      }
    } catch (err) {
      console.error('Failed to revoke token:', err);
    }
  };

  const handleCloseRotateDialog = () => {
    setShowRotateDialog(false);
    setRotatedToken(null);
    setExpiresInDays(365);
  };

  // =====================================================
  // RENDERING
  // =====================================================

  const getStatusColor = () => {
    if (!token.isActive) return 'error';
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return 'warning';
    return 'success';
  };

  const getStatusLabel = () => {
    if (!token.isActive) return 'Revoked';
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return 'Expired';
    return 'Active';
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" component="div" gutterBottom>
                {token.name}
              </Typography>
              {token.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {token.description}
                </Typography>
              )}
            </Box>
            <Chip
              label={getStatusLabel()}
              color={getStatusColor()}
              size="small"
              icon={token.isActive ? <CheckCircle /> : <ErrorIcon />}
            />
          </Box>

          {/* Token Prefix */}
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Token Prefix
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="body2"
                fontFamily="monospace"
                sx={{
                  bgcolor: 'grey.100',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'inline-block',
                }}
              >
                {token.tokenPrefix}...
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy prefix'}>
                <IconButton size="small" onClick={handleCopyPrefix}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Metadata */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Access Level
              </Typography>
              <Typography variant="body2">{token.accessLevel}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Rate Limit Tier
              </Typography>
              <Chip
                label={token.rateLimitTier}
                size="small"
                color={getRateLimitColor(token.rateLimitTier)}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Created
              </Typography>
              <Typography variant="body2">{formatDate(token.createdAt)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Last Used
              </Typography>
              <Typography variant="body2">{formatDate(token.lastUsedAt)}</Typography>
            </Box>
          </Box>

          {/* Scopes */}
          {token.scopes && token.scopes.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Scopes ({token.scopes.length})
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {token.scopes.slice(0, 5).map((scope: any, index: number) => (
                  <Chip
                    key={index}
                    label={typeof scope === 'string' ? scope : scope.scope}
                    size="small"
                    variant="outlined"
                  />
                ))}
                {token.scopes.length > 5 && (
                  <Chip label={`+${token.scopes.length - 5} more`} size="small" variant="outlined" />
                )}
              </Box>
            </Box>
          )}

          {/* Expiration Warning */}
          {token.expiresAt && (
            <Box mt={2}>
              <Alert severity={new Date(token.expiresAt) < new Date() ? 'error' : 'info'}>
                {new Date(token.expiresAt) < new Date()
                  ? `Expired on ${formatDate(token.expiresAt)}`
                  : `Expires on ${formatDate(token.expiresAt)}`}
              </Alert>
            </Box>
          )}
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<Refresh />}
            onClick={() => setShowRotateDialog(true)}
            disabled={!token.isActive || rotateLoading}
          >
            Rotate
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<Delete />}
            onClick={() => setShowRevokeDialog(true)}
            disabled={!token.isActive || revokeLoading}
          >
            Revoke
          </Button>
        </CardActions>
      </Card>

      {/* Rotate Token Dialog */}
      <Dialog open={showRotateDialog} onClose={handleCloseRotateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Rotate API Token</DialogTitle>
        <DialogContent>
          {rotatedToken ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Token rotated successfully! The old token has been revoked.
              </Alert>
              <Typography variant="body2" gutterBottom>
                New Token (save this now - it won't be shown again):
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{
                    bgcolor: 'grey.100',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    flex: 1,
                    wordBreak: 'break-all',
                  }}
                >
                  {rotatedToken}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy token'}>
                  <IconButton onClick={handleCopyRotatedToken}>
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
              </Box>
              <Alert severity="warning">
                Make sure to copy this token now. You won't be able to see it again!
              </Alert>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" gutterBottom>
                Rotating this token will generate a new token and immediately revoke the old one.
                Make sure to update any applications using this token.
              </Typography>
              <TextField
                label="Expires In (days)"
                type="number"
                fullWidth
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                sx={{ mt: 2 }}
                inputProps={{ min: 1, max: 3650 }}
              />
              {rotateError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {rotateError}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRotateDialog}>
            {rotatedToken ? 'Close' : 'Cancel'}
          </Button>
          {!rotatedToken && (
            <Button
              onClick={handleRotate}
              variant="contained"
              disabled={rotateLoading}
              startIcon={rotateLoading ? <CircularProgress size={16} /> : null}
            >
              Rotate Token
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Revoke Token Dialog */}
      <Dialog open={showRevokeDialog} onClose={() => setShowRevokeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke API Token</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Are you sure you want to revoke this token? This action cannot be undone. Any
            applications using this token will immediately lose access.
          </Typography>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            rows={3}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="e.g., Token compromised, no longer needed, etc."
          />
          {revokeError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {revokeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRevokeDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRevoke}
            variant="contained"
            color="error"
            disabled={revokeLoading}
            startIcon={revokeLoading ? <CircularProgress size={16} /> : null}
          >
            Revoke Token
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TokenCard;
