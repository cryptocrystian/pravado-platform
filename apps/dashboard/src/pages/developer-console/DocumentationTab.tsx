// =====================================================
// DOCUMENTATION TAB PAGE
// Sprint 55 Phase 5.2
// =====================================================

import React from 'react';
import { Box } from '@mui/material';
import { DeveloperDocsPanel } from '../../components/developer/DeveloperDocsPanel';

// =====================================================
// TYPES
// =====================================================

interface DocumentationTabProps {
  apiToken?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const DocumentationTab: React.FC<DocumentationTabProps> = ({ apiToken }) => {
  return (
    <Box>
      <DeveloperDocsPanel apiToken={apiToken} />
    </Box>
  );
};

export default DocumentationTab;
