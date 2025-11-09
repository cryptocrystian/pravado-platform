// =====================================================
// DEVELOPER CONSOLE - MAIN PAGE
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  Alert,
} from '@mui/material';
import {
  VpnKey,
  BarChart,
  Webhook,
  MenuBook,
  Home,
} from '@mui/icons-material';
import { APIKeysTab } from './APIKeysTab';
import { UsageTab } from './UsageTab';
import { WebhooksTab } from './WebhooksTab';
import { DocumentationTab } from './DocumentationTab';

// =====================================================
// TYPES
// =====================================================

interface DeveloperConsoleProps {
  clientId?: string;
  organizationId?: string;
}

type TabValue = 'api-keys' | 'usage' | 'webhooks' | 'documentation';

// =====================================================
// COMPONENT
// =====================================================

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  clientId: initialClientId,
  organizationId: initialOrganizationId,
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>('api-keys');
  const [clientId, setClientId] = useState<string>(initialClientId || '');
  const [organizationId, setOrganizationId] = useState<string>(initialOrganizationId || '');
  const [mostRecentToken, setMostRecentToken] = useState<string | undefined>(undefined);

  // =====================================================
  // EFFECTS
  // =====================================================

  useEffect(() => {
    // In a real application, fetch clientId and organizationId from auth context
    // For now, we'll use mock values if not provided
    if (!clientId) {
      setClientId('client-' + Math.random().toString(36).substring(7));
    }
    if (!organizationId) {
      setOrganizationId('org-' + Math.random().toString(36).substring(7));
    }
  }, [clientId, organizationId]);

  useEffect(() => {
    // Handle URL hash for tab navigation
    const hash = window.location.hash.replace('#', '');
    if (hash && ['api-keys', 'usage', 'webhooks', 'documentation'].includes(hash)) {
      setActiveTab(hash as TabValue);
    }
  }, []);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleTabChange = (_: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    window.location.hash = newValue;
  };

  // =====================================================
  // RENDERING
  // =====================================================

  if (!clientId || !organizationId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Loading developer console... Please ensure you are authenticated.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/dashboard"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Home fontSize="small" />
            Dashboard
          </Link>
          <Typography color="text.primary">Developer Console</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box mb={4}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="h4" component="h1">
              Developer Console
            </Typography>
            <Chip label="Beta" color="primary" size="small" />
          </Box>
          <Typography variant="body1" color="text.secondary">
            Manage API keys, monitor usage, configure webhooks, and access comprehensive API documentation
          </Typography>
        </Box>

        {/* Main Content */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          {/* Tabs Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="developer console tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                icon={<VpnKey />}
                iconPosition="start"
                label="API Keys"
                value="api-keys"
                sx={{ minHeight: 64 }}
              />
              <Tab
                icon={<BarChart />}
                iconPosition="start"
                label="Usage"
                value="usage"
                sx={{ minHeight: 64 }}
              />
              <Tab
                icon={<Webhook />}
                iconPosition="start"
                label="Webhooks"
                value="webhooks"
                sx={{ minHeight: 64 }}
              />
              <Tab
                icon={<MenuBook />}
                iconPosition="start"
                label="Documentation"
                value="documentation"
                sx={{ minHeight: 64 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ p: 3 }}>
            {activeTab === 'api-keys' && (
              <APIKeysTab
                clientId={clientId}
                organizationId={organizationId}
              />
            )}

            {activeTab === 'usage' && (
              <UsageTab clientId={clientId} />
            )}

            {activeTab === 'webhooks' && (
              <WebhooksTab clientId={clientId} />
            )}

            {activeTab === 'documentation' && (
              <DocumentationTab apiToken={mostRecentToken} />
            )}
          </Box>
        </Paper>

        {/* Footer Info */}
        <Box mt={4} p={3} bgcolor="background.paper" borderRadius={1}>
          <Typography variant="h6" gutterBottom>
            Getting Started with the Pravado API
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The Pravado External Agent API allows you to integrate AI agents into your applications.
            Follow these steps to get started:
          </Typography>
          <Box component="ol" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">
                Create an API token in the <strong>API Keys</strong> tab
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Review the <strong>Documentation</strong> tab for endpoint details and code examples
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Configure <strong>Webhooks</strong> to receive real-time event notifications
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Monitor your integration in the <strong>Usage</strong> tab
              </Typography>
            </li>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Need help? Visit our{' '}
            <Link href="https://docs.pravado.com" target="_blank">
              documentation
            </Link>{' '}
            or contact{' '}
            <Link href="mailto:support@pravado.com">support@pravado.com</Link>
          </Alert>
        </Box>
      </Container>
    </Box>
  );
};

export default DeveloperConsole;
