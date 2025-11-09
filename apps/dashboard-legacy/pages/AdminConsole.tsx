// =====================================================
// ADMIN CONSOLE MAIN PAGE
// Sprint 56 Phase 5.3 (Frontend)
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Breadcrumbs,
  Link,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Dashboard,
  Business,
  SmartToy,
  Error as ErrorIcon,
  Speed,
  Home,
  AdminPanelSettings,
  Security,
  BugReport,
  Shield,
} from '@mui/icons-material';
import { OverviewTab } from './admin-console/OverviewTab';
import { TenantActivityTab } from './admin-console/TenantActivityTab';
import { AgentActivityTab } from './admin-console/AgentActivityTab';
import { ErrorExplorerTab } from './admin-console/ErrorExplorerTab';
import { PerformanceTab } from './admin-console/PerformanceTab';
import { ModerationTab } from './admin-console/ModerationTab';
import { AgentDebugTabs } from './admin-console/debug/AgentDebugTabs';
import { AccessControlTabs } from './admin-console/access/AccessControlTabs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box py={3}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export const AdminConsole: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check admin access on mount
    const checkAdminAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Verify admin access by calling health endpoint
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin-console/health`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          setIsAdmin(true);
        } else if (response.status === 403) {
          setIsAdmin(false);
        } else {
          throw new Error('Failed to verify admin access');
        }
      } catch (err: any) {
        console.error('Error checking admin access:', err);
        setError(err.message || 'Failed to verify admin access');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Access Denied screen
  if (!isAdmin) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <Card variant="outlined" sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <AdminPanelSettings sx={{ fontSize: 80, color: 'error.main', mb: 3 }} />
              <Typography variant="h4" gutterBottom fontWeight={600}>
                Access Denied
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                You do not have permission to access the Admin Console. This area is restricted to
                administrators only.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                If you believe you should have access, please contact your system administrator.
              </Typography>
              <Button variant="contained" href="/" sx={{ mt: 3 }}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="xl">
        <Box py={4}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  // Main Admin Console
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          color="inherit"
          href="/"
        >
          <Home sx={{ mr: 0.5 }} fontSize="small" />
          Home
        </Link>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <AdminPanelSettings sx={{ mr: 0.5 }} fontSize="small" />
          Admin Console
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Admin Console
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Platform-wide analytics, monitoring, and system administration
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="admin console tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
            },
          }}
        >
          <Tab
            icon={<Dashboard />}
            iconPosition="start"
            label="Overview"
            {...a11yProps(0)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<Business />}
            iconPosition="start"
            label="Tenant Activity"
            {...a11yProps(1)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<SmartToy />}
            iconPosition="start"
            label="Agent Activity"
            {...a11yProps(2)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<ErrorIcon />}
            iconPosition="start"
            label="Error Explorer"
            {...a11yProps(3)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<Speed />}
            iconPosition="start"
            label="Performance"
            {...a11yProps(4)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<Security />}
            iconPosition="start"
            label="Moderation"
            {...a11yProps(5)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<BugReport />}
            iconPosition="start"
            label="Debug Tools"
            {...a11yProps(6)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
          <Tab
            icon={<Shield />}
            iconPosition="start"
            label="Access Controls"
            {...a11yProps(7)}
            sx={{ textTransform: 'none', fontSize: '0.95rem' }}
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box>
        <TabPanel value={currentTab} index={0}>
          <OverviewTab />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <TenantActivityTab />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <AgentActivityTab />
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          <ErrorExplorerTab />
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          <PerformanceTab />
        </TabPanel>
        <TabPanel value={currentTab} index={5}>
          <ModerationTab />
        </TabPanel>
        <TabPanel value={currentTab} index={6}>
          <AgentDebugTabs />
        </TabPanel>
        <TabPanel value={currentTab} index={7}>
          <AccessControlTabs />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default AdminConsole;
