// =====================================================
// WEBHOOKS TAB PAGE
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Paper,
  Grid,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add,
  Webhook,
  Security,
  Info,
} from '@mui/icons-material';
import { WebhookStatusList } from '../../components/developer/WebhookStatusList';
import { useWebhooks, useRegisterWebhook } from '../../hooks/useDeveloperAPI';

// =====================================================
// TYPES
// =====================================================

interface WebhooksTabProps {
  clientId: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const WebhooksTab: React.FC<WebhooksTabProps> = ({ clientId }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const { webhooks, loading, error, refetch } = useWebhooks(clientId);
  const {
    registerWebhook,
    loading: registerLoading,
    error: registerError,
  } = useRegisterWebhook();

  // =====================================================
  // AVAILABLE WEBHOOK EVENTS
  // =====================================================

  const availableEvents = [
    {
      value: 'agent_response',
      label: 'Agent Response',
      description: 'Triggered when an agent generates a response',
    },
    {
      value: 'task_completed',
      label: 'Task Completed',
      description: 'Triggered when a task is successfully completed',
    },
    {
      value: 'task_failed',
      label: 'Task Failed',
      description: 'Triggered when a task fails',
    },
    {
      value: 'conversation_started',
      label: 'Conversation Started',
      description: 'Triggered when a new conversation begins',
    },
    {
      value: 'conversation_ended',
      label: 'Conversation Ended',
      description: 'Triggered when a conversation ends',
    },
    {
      value: 'agent_error',
      label: 'Agent Error',
      description: 'Triggered when an agent encounters an error',
    },
    {
      value: 'rate_limit_exceeded',
      label: 'Rate Limit Exceeded',
      description: 'Triggered when rate limits are exceeded',
    },
    {
      value: 'token_expiring',
      label: 'Token Expiring',
      description: 'Triggered when an API token is about to expire',
    },
  ];

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleRegisterWebhook = async () => {
    try {
      await registerWebhook({
        url: webhookUrl,
        events: selectedEvents,
        secret: webhookSecret || undefined,
        headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
      });
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      console.error('Failed to register webhook:', err);
    }
  };

  const resetForm = () => {
    setWebhookUrl('');
    setSelectedEvents([]);
    setWebhookSecret('');
    setCustomHeaders({});
    setHeaderKey('');
    setHeaderValue('');
  };

  const handleAddHeader = () => {
    if (headerKey && headerValue) {
      setCustomHeaders({ ...customHeaders, [headerKey]: headerValue });
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...customHeaders };
    delete newHeaders[key];
    setCustomHeaders(newHeaders);
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    setWebhookSecret(secret);
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
            Webhooks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure webhook endpoints to receive real-time event notifications
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Register Webhook
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
        Webhooks allow your application to receive real-time notifications about events in your
        Pravado account. Events are delivered via HTTP POST requests to your endpoint.
      </Alert>

      {/* Security Notice */}
      <Alert severity="warning" icon={<Security />} sx={{ mb: 3 }}>
        Always verify webhook signatures using the secret to ensure requests are from Pravado. Check
        the <code>X-Webhook-Signature</code> header.
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

      {/* Empty State */}
      {!loading && webhooks.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Webhook sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Webhooks Registered
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Register your first webhook to start receiving real-time event notifications
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Register Your First Webhook
          </Button>
        </Paper>
      )}

      {/* Webhook List */}
      {!loading && webhooks.length > 0 && (
        <WebhookStatusList
          webhooks={webhooks}
          loading={loading}
          onWebhookUpdated={refetch}
        />
      )}

      {/* Create Webhook Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Register New Webhook</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Webhook URL */}
            <Grid item xs={12}>
              <TextField
                label="Webhook URL"
                fullWidth
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
                placeholder="https://your-domain.com/webhooks/pravado"
                helperText="The HTTPS endpoint where webhook events will be sent"
              />
            </Grid>

            {/* Event Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Events to Subscribe</InputLabel>
                <Select
                  multiple
                  value={selectedEvents}
                  onChange={(e) => setSelectedEvents(e.target.value as string[])}
                  input={<OutlinedInput label="Events to Subscribe" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const event = availableEvents.find((e) => e.value === value);
                        return <Chip key={value} label={event?.label || value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {availableEvents.map((event) => (
                    <MenuItem key={event.value} value={event.value}>
                      <Box>
                        <Typography variant="body2">{event.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Webhook Secret */}
            <Grid item xs={12}>
              <TextField
                label="Webhook Secret (Optional but Recommended)"
                fullWidth
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Enter a secret or generate one"
                helperText="Used to sign webhook payloads for verification (HMAC-SHA256)"
                InputProps={{
                  endAdornment: (
                    <Button size="small" onClick={generateSecret}>
                      Generate
                    </Button>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Custom Headers */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Custom Headers (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Add custom headers to be included with webhook requests
              </Typography>
            </Grid>

            <Grid item xs={5}>
              <TextField
                label="Header Name"
                fullWidth
                size="small"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                placeholder="X-Custom-Header"
              />
            </Grid>
            <Grid item xs={5}>
              <TextField
                label="Header Value"
                fullWidth
                size="small"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                placeholder="value"
              />
            </Grid>
            <Grid item xs={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleAddHeader}
                disabled={!headerKey || !headerValue}
                sx={{ height: '40px' }}
              >
                Add
              </Button>
            </Grid>

            {Object.keys(customHeaders).length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {Object.entries(customHeaders).map(([key, value]) => (
                    <Box key={key} display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontFamily="monospace">
                        {key}: {value}
                      </Typography>
                      <Button size="small" onClick={() => handleRemoveHeader(key)}>
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Paper>
              </Grid>
            )}
          </Grid>

          {registerError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {registerError}
            </Alert>
          )}

          {/* Webhook Documentation */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Webhook Payload Structure
            </Typography>
            <Typography variant="caption" component="pre" sx={{ mt: 1, display: 'block' }}>
              {`{
  "eventType": "task_completed",
  "eventId": "evt_xxx",
  "timestamp": "2025-11-03T12:00:00Z",
  "data": {
    "requestId": "req_xxx",
    "agentId": "agent_xxx",
    "result": { ... }
  }
}`}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegisterWebhook}
            variant="contained"
            disabled={
              registerLoading ||
              !webhookUrl ||
              selectedEvents.length === 0 ||
              !webhookUrl.startsWith('https://')
            }
            startIcon={registerLoading ? <CircularProgress size={16} /> : <Add />}
          >
            Register Webhook
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebhooksTab;
