// =====================================================
// WEBHOOK STATUS LIST COMPONENT
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Refresh,
  Edit,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Replay,
} from '@mui/icons-material';
import {
  useWebhookStats,
  useRetryWebhook,
  useUpdateWebhook,
} from '../../hooks/useDeveloperAPI';

// =====================================================
// TYPES
// =====================================================

interface WebhookRegistration {
  webhookId: string;
  url: string;
  events: string[];
  isActive: boolean;
  totalDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt?: string;
}

interface WebhookStatusListProps {
  webhooks: WebhookRegistration[];
  loading?: boolean;
  onWebhookUpdated?: () => void;
}

// =====================================================
// WEBHOOK ROW COMPONENT
// =====================================================

const WebhookRow: React.FC<{
  webhook: WebhookRegistration;
  onWebhookUpdated?: () => void;
}> = ({ webhook, onWebhookUpdated }) => {
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedUrl, setEditedUrl] = useState(webhook.url);
  const [editedEvents, setEditedEvents] = useState(webhook.events.join(', '));

  const { stats, loading: statsLoading, refetch } = useWebhookStats(open ? webhook.webhookId : undefined);
  const { retryWebhook, loading: retryLoading } = useRetryWebhook();
  const { updateWebhook, loading: updateLoading, error: updateError } = useUpdateWebhook();

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleToggleExpand = () => {
    setOpen(!open);
    if (!open) {
      refetch();
    }
  };

  const handleRetryAll = async () => {
    // In a real implementation, you would get failed attemptIds from stats
    // For now, this is a placeholder
    try {
      await retryWebhook(webhook.webhookId, 'latest-failed-attempt-id');
      refetch();
      if (onWebhookUpdated) {
        onWebhookUpdated();
      }
    } catch (err) {
      console.error('Failed to retry webhook:', err);
    }
  };

  const handleUpdate = async () => {
    try {
      const events = editedEvents.split(',').map((e) => e.trim()).filter(Boolean);
      await updateWebhook(webhook.webhookId, {
        url: editedUrl,
        events,
      });
      setEditDialogOpen(false);
      if (onWebhookUpdated) {
        onWebhookUpdated();
      }
    } catch (err) {
      console.error('Failed to update webhook:', err);
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateWebhook(webhook.webhookId, {
        isActive: !webhook.isActive,
      });
      if (onWebhookUpdated) {
        onWebhookUpdated();
      }
    } catch (err) {
      console.error('Failed to toggle webhook status:', err);
    }
  };

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const successRate = webhook.totalDeliveries > 0
    ? (((webhook.totalDeliveries - webhook.failedDeliveries) / webhook.totalDeliveries) * 100).toFixed(1)
    : '100';

  const getHealthStatus = () => {
    const rate = Number(successRate);
    if (rate >= 95) return { label: 'Healthy', color: 'success' as const, icon: <CheckCircle /> };
    if (rate >= 80) return { label: 'Degraded', color: 'warning' as const, icon: <Warning /> };
    return { label: 'Unhealthy', color: 'error' as const, icon: <ErrorIcon /> };
  };

  const health = getHealthStatus();

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

  // =====================================================
  // RENDERING
  // =====================================================

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={handleToggleExpand}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
            {webhook.url}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={webhook.isActive ? 'Active' : 'Inactive'}
            color={webhook.isActive ? 'success' : 'default'}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Chip
            label={health.label}
            color={health.color}
            size="small"
            icon={health.icon}
          />
        </TableCell>
        <TableCell align="right">
          {webhook.totalDeliveries.toLocaleString()}
        </TableCell>
        <TableCell align="right">
          {webhook.failedDeliveries > 0 ? (
            <Typography variant="body2" color="error">
              {webhook.failedDeliveries.toLocaleString()}
            </Typography>
          ) : (
            <Typography variant="body2">0</Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {formatDate(webhook.lastDeliveryAt)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Tooltip title="Edit webhook">
            <IconButton size="small" onClick={() => setEditDialogOpen(true)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={webhook.isActive ? 'Disable webhook' : 'Enable webhook'}>
            <IconButton size="small" onClick={handleToggleActive} disabled={updateLoading}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              {statsLoading && <LinearProgress />}
              {stats && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Webhook Statistics
                  </Typography>

                  {/* Summary Stats */}
                  <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2} mb={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Attempts
                      </Typography>
                      <Typography variant="h5">{stats.totalAttempts.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Successful Deliveries
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {stats.successfulDeliveries.toLocaleString()}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Failed Deliveries
                      </Typography>
                      <Typography variant="h5" color="error.main">
                        {stats.failedDeliveries.toLocaleString()}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Delivery Time
                      </Typography>
                      <Typography variant="h5">
                        {stats.averageDeliveryTime.toFixed(0)}ms
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Retry Rate
                      </Typography>
                      <Typography variant="h5">
                        {(stats.retryRate * 100).toFixed(1)}%
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Events Breakdown */}
                  <Typography variant="subtitle2" gutterBottom>
                    Deliveries by Event Type
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Event Type</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Success Rate</TableCell>
                          <TableCell width="50%">
                            <Typography variant="caption">Success Rate</Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.deliveriesByEvent.map((event) => (
                          <TableRow key={event.eventType}>
                            <TableCell>
                              <Chip label={event.eventType} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">{event.count.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              {(event.successRate * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <LinearProgress
                                variant="determinate"
                                value={event.successRate * 100}
                                color={event.successRate >= 0.95 ? 'success' : event.successRate >= 0.8 ? 'warning' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Actions */}
                  {stats.failedDeliveries > 0 && (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        This webhook has {stats.failedDeliveries} failed deliveries
                      </Alert>
                      <Button
                        variant="outlined"
                        startIcon={<Replay />}
                        onClick={handleRetryAll}
                        disabled={retryLoading}
                      >
                        Retry Failed Deliveries
                      </Button>
                    </Box>
                  )}

                  {/* Subscribed Events */}
                  <Box mt={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Subscribed Events ({webhook.events.length})
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {webhook.events.map((event, index) => (
                        <Chip key={index} label={event} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Webhook</DialogTitle>
        <DialogContent>
          <TextField
            label="Webhook URL"
            fullWidth
            value={editedUrl}
            onChange={(e) => setEditedUrl(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
            placeholder="https://your-domain.com/webhook"
          />
          <TextField
            label="Events (comma-separated)"
            fullWidth
            multiline
            rows={3}
            value={editedEvents}
            onChange={(e) => setEditedEvents(e.target.value)}
            placeholder="agent_response, task_completed, task_failed"
            helperText="Enter event types separated by commas"
          />
          {updateError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {updateError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={updateLoading}>
            Update Webhook
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const WebhookStatusList: React.FC<WebhookStatusListProps> = ({
  webhooks,
  loading,
  onWebhookUpdated,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Loading webhooks...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (webhooks.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No webhooks registered yet. Create your first webhook to start receiving event notifications.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width={50} />
            <TableCell>URL</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Health</TableCell>
            <TableCell align="right">Total Deliveries</TableCell>
            <TableCell align="right">Failed</TableCell>
            <TableCell>Last Delivery</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {webhooks.map((webhook) => (
            <WebhookRow
              key={webhook.webhookId}
              webhook={webhook}
              onWebhookUpdated={onWebhookUpdated}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WebhookStatusList;
