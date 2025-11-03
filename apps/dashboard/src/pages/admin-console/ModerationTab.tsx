// =====================================================
// MODERATION TAB PAGE
// Sprint 58 Phase 5.5
// =====================================================

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { Gavel, Report, Flag, Rule, Timeline } from '@mui/icons-material';
import { AuditTrailTab } from './moderation/AuditTrailTab';
import { AbuseReportsTab } from './moderation/AbuseReportsTab';
import { ModerationActionsTab } from './moderation/ModerationActionsTab';
import { ManualFlaggingTab } from './moderation/ManualFlaggingTab';
import { ThresholdSettingsTab } from './moderation/ThresholdSettingsTab';

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
      id={`moderation-tabpanel-${index}`}
      aria-labelledby={`moderation-tab-${index}`}
      {...other}
    >
      {value === index && <Box py={3}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `moderation-tab-${index}`,
    'aria-controls': `moderation-tabpanel-${index}`,
  };
}

export const ModerationTab: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      {/* Nested Tabs for Moderation */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="moderation tabs"
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
            icon={<Timeline />}
            iconPosition="start"
            label="Audit Trail"
            {...a11yProps(0)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          />
          <Tab
            icon={<Report />}
            iconPosition="start"
            label="Abuse Reports"
            {...a11yProps(1)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          />
          <Tab
            icon={<Gavel />}
            iconPosition="start"
            label="Moderation Actions"
            {...a11yProps(2)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          />
          <Tab
            icon={<Flag />}
            iconPosition="start"
            label="Manual Flagging"
            {...a11yProps(3)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          />
          <Tab
            icon={<Rule />}
            iconPosition="start"
            label="Threshold Settings"
            {...a11yProps(4)}
            sx={{ textTransform: 'none', fontSize: '0.9rem' }}
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box>
        <TabPanel value={currentTab} index={0}>
          <AuditTrailTab />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <AbuseReportsTab />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <ModerationActionsTab />
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          <ManualFlaggingTab />
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          <ThresholdSettingsTab />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default ModerationTab;
