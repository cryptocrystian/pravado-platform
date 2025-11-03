// =====================================================
// DEVELOPER DOCS PANEL COMPONENT
// Sprint 55 Phase 5.2
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  Paper,
  Divider,
  LinearProgress,
  Link,
  Button,
  TextField,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Code,
  Lock,
  PlayArrow,
  ExpandMore,
  ContentCopy,
} from '@mui/icons-material';
import { useOpenAPISchema } from '../../hooks/useDeveloperAPI';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

// =====================================================
// TYPES
// =====================================================

interface DeveloperDocsPanelProps {
  apiToken?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const DeveloperDocsPanel: React.FC<DeveloperDocsPanelProps> = ({ apiToken }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showAuthInstructions, setShowAuthInstructions] = useState(true);
  const { schema, loading, error } = useOpenAPISchema();

  // =====================================================
  // RENDERING HELPER COMPONENTS
  // =====================================================

  const AuthInstructions = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const curlExample = apiToken
      ? `curl -X POST https://api.pravado.com/api/external-agent/submit-task \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "your-agent-id",
    "taskType": "generate_content",
    "input": {
      "prompt": "Write a blog post about AI"
    }
  }'`
      : `curl -X POST https://api.pravado.com/api/external-agent/submit-task \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "your-agent-id",
    "taskType": "generate_content",
    "input": {
      "prompt": "Write a blog post about AI"
    }
  }'`;

    const javascriptExample = apiToken
      ? `const axios = require('axios');

const response = await axios.post(
  'https://api.pravado.com/api/external-agent/submit-task',
  {
    agentId: 'your-agent-id',
    taskType: 'generate_content',
    input: {
      prompt: 'Write a blog post about AI'
    }
  },
  {
    headers: {
      'Authorization': 'Bearer ${apiToken}',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);`
      : `const axios = require('axios');

const response = await axios.post(
  'https://api.pravado.com/api/external-agent/submit-task',
  {
    agentId: 'your-agent-id',
    taskType: 'generate_content',
    input: {
      prompt: 'Write a blog post about AI'
    }
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);`;

    const pythonExample = apiToken
      ? `import requests

response = requests.post(
    'https://api.pravado.com/api/external-agent/submit-task',
    json={
        'agentId': 'your-agent-id',
        'taskType': 'generate_content',
        'input': {
            'prompt': 'Write a blog post about AI'
        }
    },
    headers={
        'Authorization': 'Bearer ${apiToken}',
        'Content-Type': 'application/json'
    }
)

print(response.json())`
      : `import requests

response = requests.post(
    'https://api.pravado.com/api/external-agent/submit-task',
    json={
        'agentId': 'your-agent-id',
        'taskType': 'generate_content',
        'input': {
            'prompt': 'Write a blog post about AI'
        }
    },
    headers={
        'Authorization': 'Bearer YOUR_API_TOKEN',
        'Content-Type': 'application/json'
    }
)

print(response.json())`;

    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Lock color="primary" />
              <Typography variant="h6">Authentication</Typography>
            </Box>
            <IconButton
              onClick={() => setShowAuthInstructions(!showAuthInstructions)}
              size="small"
            >
              <ExpandMore
                sx={{
                  transform: showAuthInstructions ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: '0.3s',
                }}
              />
            </IconButton>
          </Box>

          <Collapse in={showAuthInstructions}>
            <Typography variant="body2" paragraph>
              All API requests must include your API token in the Authorization header using the Bearer
              scheme:
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Authorization Header
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontFamily="monospace">
                  Authorization: Bearer {apiToken || 'YOUR_API_TOKEN'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(`Bearer ${apiToken || 'YOUR_API_TOKEN'}`)}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            </Paper>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Quick Start Examples
            </Typography>

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="cURL" />
              <Tab label="JavaScript" />
              <Tab label="Python" />
            </Tabs>

            {activeTab === 0 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="grey.400">
                    cURL
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(curlExample)}>
                    <ContentCopy fontSize="small" sx={{ color: 'grey.400' }} />
                  </IconButton>
                </Box>
                <pre style={{ margin: 0, overflow: 'auto' }}>
                  <code>{curlExample}</code>
                </pre>
              </Paper>
            )}

            {activeTab === 1 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="grey.400">
                    JavaScript (Node.js)
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(javascriptExample)}>
                    <ContentCopy fontSize="small" sx={{ color: 'grey.400' }} />
                  </IconButton>
                </Box>
                <pre style={{ margin: 0, overflow: 'auto' }}>
                  <code>{javascriptExample}</code>
                </pre>
              </Paper>
            )}

            {activeTab === 2 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="grey.400">
                    Python
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(pythonExample)}>
                    <ContentCopy fontSize="small" sx={{ color: 'grey.400' }} />
                  </IconButton>
                </Box>
                <pre style={{ margin: 0, overflow: 'auto' }}>
                  <code>{pythonExample}</code>
                </pre>
              </Paper>
            )}

            {!apiToken && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Create an API token in the <strong>API Keys</strong> tab to see examples with your
                actual token.
              </Alert>
            )}
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const RateLimitsInfo = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <PlayArrow color="primary" />
          <Typography variant="h6">Rate Limits</Typography>
        </Box>
        <Typography variant="body2" paragraph>
          API requests are rate-limited based on your subscription tier. Rate limits are enforced per
          minute, hour, and day:
        </Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>
                Tier
              </th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                Requests/Minute
              </th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                Requests/Hour
              </th>
              <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                Requests/Day
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Free</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>10</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>100</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>1,000</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Basic</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>60</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>1,000</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>10,000</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Professional</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>300</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>5,000</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>50,000</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Enterprise</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>1,000</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>20,000</td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #eee' }}>200,000</td>
            </tr>
            <tr>
              <td style={{ padding: '8px' }}>Unlimited</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>999,999</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>999,999</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>999,999</td>
            </tr>
          </tbody>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          Rate limit information is included in response headers: <code>X-RateLimit-Limit-Minute</code>,{' '}
          <code>X-RateLimit-Remaining-Minute</code>, <code>X-RateLimit-Reset-Minute</code>
        </Alert>
      </CardContent>
    </Card>
  );

  // =====================================================
  // MAIN RENDERING
  // =====================================================

  if (loading) {
    return (
      <Box>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading API documentation...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load API documentation: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        API Documentation
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Complete reference for the Pravado External Agent API. Use the interactive documentation below to
        explore endpoints and test API calls.
      </Typography>

      <AuthInstructions />
      <RateLimitsInfo />

      {/* OpenAPI Spec */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Code color="primary" />
            <Typography variant="h6">API Reference</Typography>
          </Box>
          {schema ? (
            <SwaggerUI
              spec={schema}
              onComplete={(swaggerUI: any) => {
                // Auto-inject API token if available
                if (apiToken) {
                  swaggerUI.preauthorizeApiKey('BearerAuth', apiToken);
                }
              }}
            />
          ) : (
            <Alert severity="warning">
              OpenAPI schema is not available. Please contact support.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Additional Resources
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Link href="https://docs.pravado.com/api" target="_blank">
                Full API Documentation
              </Link>
            </li>
            <li>
              <Link href="https://docs.pravado.com/webhooks" target="_blank">
                Webhook Integration Guide
              </Link>
            </li>
            <li>
              <Link href="https://docs.pravado.com/sdks" target="_blank">
                Official SDKs
              </Link>
            </li>
            <li>
              <Link href="https://docs.pravado.com/examples" target="_blank">
                Code Examples & Tutorials
              </Link>
            </li>
            <li>
              <Link href="https://status.pravado.com" target="_blank">
                API Status & Uptime
              </Link>
            </li>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DeveloperDocsPanel;
