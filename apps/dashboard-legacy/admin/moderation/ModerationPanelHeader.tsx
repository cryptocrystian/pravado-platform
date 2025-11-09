// =====================================================
// MODERATION PANEL HEADER COMPONENT
// Sprint 58 Phase 5.5
// =====================================================

import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { Home, AdminPanelSettings, Security } from '@mui/icons-material';

export interface ModerationPanelHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const ModerationPanelHeader: React.FC<ModerationPanelHeaderProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <Box mb={3}>
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
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          color="inherit"
          href="/admin"
        >
          <AdminPanelSettings sx={{ mr: 0.5 }} fontSize="small" />
          Admin Console
        </Link>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <Security sx={{ mr: 0.5 }} fontSize="small" />
          Moderation
        </Typography>
      </Breadcrumbs>

      {/* Title and Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {children && <Box>{children}</Box>}
      </Box>
    </Box>
  );
};

export default ModerationPanelHeader;
