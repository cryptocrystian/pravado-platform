// =====================================================
// ACCESS CONTROL TABS WRAPPER
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { People, Lock, History } from '@mui/icons-material';
import { RoleAssignmentTab } from './RoleAssignmentTab';
import { PermissionMatrixTab } from './PermissionMatrixTab';
import { AccessAuditTab } from './AccessAuditTab';

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
      id={`access-tabpanel-${index}`}
      aria-labelledby={`access-tab-${index}`}
      {...other}
    >
      {value === index && <Box py={3}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `access-tab-${index}`,
    'aria-controls': `access-tabpanel-${index}`,
  };
}

export const AccessControlTabs: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="access control tabs"
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab
            icon={<People />}
            iconPosition="start"
            label="Role Assignment"
            {...a11yProps(0)}
            sx={{ textTransform: 'none' }}
          />
          <Tab
            icon={<Lock />}
            iconPosition="start"
            label="Permission Matrix"
            {...a11yProps(1)}
            sx={{ textTransform: 'none' }}
          />
          <Tab
            icon={<History />}
            iconPosition="start"
            label="Audit Trail"
            {...a11yProps(2)}
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Paper>

      <TabPanel value={currentTab} index={0}>
        <RoleAssignmentTab />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <PermissionMatrixTab />
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <AccessAuditTab />
      </TabPanel>
    </Box>
  );
};

export default AccessControlTabs;
