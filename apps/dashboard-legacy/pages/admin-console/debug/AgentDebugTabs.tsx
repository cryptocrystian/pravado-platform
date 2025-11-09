// =====================================================
// AGENT DEBUG TABS PAGE
// Sprint 59 Phase 5.6
// =====================================================

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import { Search, Timeline, BugReport } from '@mui/icons-material';
import { DebugTraceExplorerTab } from './DebugTraceExplorerTab';
import { TraceDetailTab } from './TraceDetailTab';

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
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
    >
      {value === index && <Box py={3}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `debug-tab-${index}`,
    'aria-controls': `debug-tabpanel-${index}`,
  };
}

export const AgentDebugTabs: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleViewTrace = (traceId: string) => {
    setSelectedTraceId(traceId);
    setCurrentTab(1); // Switch to Trace Detail tab
  };

  const handleBackToExplorer = () => {
    setSelectedTraceId(null);
    setCurrentTab(0); // Switch back to Explorer tab
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Agent Debug Tools
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Internal tools for debugging and tracing agent behavior
        </Typography>
      </Box>

      {/* Tabs Navigation */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="agent debug tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 56,
            },
          }}
        >
          <Tab
            icon={<Search />}
            iconPosition="start"
            label="Trace Explorer"
            {...a11yProps(0)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          />
          <Tab
            icon={<Timeline />}
            iconPosition="start"
            label="Trace Details"
            {...a11yProps(1)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
            disabled={!selectedTraceId}
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box>
        <TabPanel value={currentTab} index={0}>
          <DebugTraceExplorerTab onViewTrace={handleViewTrace} />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <TraceDetailTab traceId={selectedTraceId || undefined} onBack={handleBackToExplorer} />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default AgentDebugTabs;
