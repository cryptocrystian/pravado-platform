// =====================================================
// API KEYS TAB PAGE
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  FormHelperText,
  Grid,
  Paper,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  ContentCopy,
  Info,
} from '@mui/icons-material';
import { TokenCard } from '../../components/developer/TokenCard';
import { useAPIKeys, useCreateToken } from '../../hooks/useDeveloperAPI';

// =====================================================
// TYPES
// =====================================================

interface APIKeysTabProps {
  clientId: string;
  organizationId: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const APIKeysTab: React.FC<APIKeysTabProps> = ({ clientId, organizationId }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState('read_only');
  const [rateLimitTier, setRateLimitTier] = useState('free');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number>(365);
  const [copied, setCopied] = useState(false);

  const { tokens, loading, error, refetch } = useAPIKeys(clientId);
  const {
    createToken,
    loading: createLoading,
    error: createError,
    createdToken,
    clearCreatedToken,
  } = useCreateToken();

  // =====================================================
  // AVAILABLE SCOPES
  // =====================================================

  const availableScopes = [
    { value: 'agent:read', label: 'Read Agent Data', description: 'View agent configurations and status' },
    { value: 'agent:write', label: 'Write Agent Data', description: 'Modify agent configurations' },
    { value: 'task:submit', label: 'Submit Tasks', description: 'Submit tasks to agents' },
    { value: 'task:read', label: 'Read Task Results', description: 'View task results and history' },
    { value: 'conversation:read', label: 'Read Conversations', description: 'Access conversation history' },
    { value: 'webhook:manage', label: 'Manage Webhooks', description: 'Register and configure webhooks' },
    { value: 'analytics:read', label: 'Read Analytics', description: 'Access usage analytics' },
  ];

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleCreateToken = async () => {
    const scopes = selectedScopes.map((scope) => ({ scope, permissions: ['read', 'write'] }));
    const expiresIn = expiresInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    try {
      await createToken({
        clientId,
        organizationId,
        name: tokenName,
        description: tokenDescription,
        accessLevel,
        scopes,
        rateLimitTier,
        expiresIn,
      });
      // Don't close dialog yet - show the created token
      refetch();
    } catch (err) {
      console.error('Failed to create token:', err);
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setTokenName('');
    setTokenDescription('');
    setAccessLevel('read_only');
    setRateLimitTier('free');
    setSelectedScopes([]);
    setExpiresInDays(365);
    clearCreatedToken();
  };

  const handleCopyToken = () => {
    if (createdToken?.token) {
      navigator.clipboard.writeText(createdToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  // =====================================================
  // RENDERING
  // =====================================================

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            API Keys
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your API tokens for accessing the Pravado External Agent API
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New Token
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
        API tokens provide secure access to your agents. Keep them secret and never share them publicly.
        You can rotate or revoke tokens at any time.
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Token List */}
      {!loading && tokens.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No API Tokens Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first API token to start integrating with the Pravado API
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Your First Token
          </Button>
        </Paper>
      )}

      {!loading && tokens.length > 0 && (
        <Box>
          {tokens.map((token) => (
            <TokenCard key={token.tokenId} token={token} onTokenUpdated={refetch} />
          ))}
        </Box>
      )}

      {/* Create Token Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New API Token</DialogTitle>
        <DialogContent>
          {createdToken ? (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                API token created successfully!
              </Alert>
              <Typography variant="body2" gutterBottom>
                <strong>Important:</strong> Copy this token now. You won't be able to see it again!
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ wordBreak: 'break-all', flex: 1 }}
                  >
                    {createdToken.token}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy token'}>
                    <IconButton onClick={handleCopyToken} sx={{ color: 'grey.100' }}>
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
              <Alert severity="warning" sx={{ mt: 2 }}>
                Make sure to copy your API token now. You won't be able to see it again once you close
                this dialog!
              </Alert>
            </Box>
          ) : (
            <Box>
              <Grid container spacing={2}>
                {/* Token Name */}
                <Grid item xs={12}>
                  <TextField
                    label="Token Name"
                    fullWidth
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    required
                    placeholder="e.g., Production API, Mobile App, Test Environment"
                    helperText="A descriptive name to help you identify this token"
                  />
                </Grid>

                {/* Token Description */}
                <Grid item xs={12}>
                  <TextField
                    label="Description (Optional)"
                    fullWidth
                    multiline
                    rows={2}
                    value={tokenDescription}
                    onChange={(e) => setTokenDescription(e.target.value)}
                    placeholder="What will this token be used for?"
                  />
                </Grid>

                {/* Access Level */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Access Level</InputLabel>
                    <Select
                      value={accessLevel}
                      label="Access Level"
                      onChange={(e) => setAccessLevel(e.target.value)}
                    >
                      <MenuItem value="read_only">Read Only</MenuItem>
                      <MenuItem value="write">Write</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="full_access">Full Access</MenuItem>
                    </Select>
                    <FormHelperText>
                      {accessLevel === 'read_only' && 'Can only read data'}
                      {accessLevel === 'write' && 'Can read and write data'}
                      {accessLevel === 'admin' && 'Can manage resources'}
                      {accessLevel === 'full_access' && 'Unrestricted access'}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                {/* Rate Limit Tier */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Rate Limit Tier</InputLabel>
                    <Select
                      value={rateLimitTier}
                      label="Rate Limit Tier"
                      onChange={(e) => setRateLimitTier(e.target.value)}
                    >
                      <MenuItem value="free">Free (10 req/min)</MenuItem>
                      <MenuItem value="basic">Basic (60 req/min)</MenuItem>
                      <MenuItem value="professional">Professional (300 req/min)</MenuItem>
                      <MenuItem value="enterprise">Enterprise (1000 req/min)</MenuItem>
                      <MenuItem value="unlimited">Unlimited</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Expiration */}
                <Grid item xs={12}>
                  <TextField
                    label="Expires In (days)"
                    type="number"
                    fullWidth
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    inputProps={{ min: 1, max: 3650 }}
                    helperText="Token will automatically expire after this many days"
                  />
                </Grid>

                {/* Scopes */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Scopes (select at least one)
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {availableScopes.map((scope) => (
                      <Box key={scope.value} mb={1}>
                        <Chip
                          label={scope.label}
                          onClick={() => toggleScope(scope.value)}
                          color={selectedScopes.includes(scope.value) ? 'primary' : 'default'}
                          variant={selectedScopes.includes(scope.value) ? 'filled' : 'outlined'}
                          sx={{ mr: 1, mb: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {scope.description}
                        </Typography>
                        {scope !== availableScopes[availableScopes.length - 1] && (
                          <Divider sx={{ my: 1 }} />
                        )}
                      </Box>
                    ))}
                  </Paper>
                  {selectedScopes.length === 0 && (
                    <FormHelperText error>Please select at least one scope</FormHelperText>
                  )}
                </Grid>
              </Grid>

              {createError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {createError}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>
            {createdToken ? 'Close' : 'Cancel'}
          </Button>
          {!createdToken && (
            <Button
              onClick={handleCreateToken}
              variant="contained"
              disabled={
                createLoading ||
                !tokenName ||
                selectedScopes.length === 0
              }
              startIcon={createLoading ? <CircularProgress size={16} /> : <Add />}
            >
              Create Token
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APIKeysTab;
