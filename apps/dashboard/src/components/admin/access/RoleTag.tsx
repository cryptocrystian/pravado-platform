// =====================================================
// ROLE TAG COMPONENT
// Sprint 60 Phase 5.7 (Frontend)
// =====================================================

import React from 'react';
import { Chip } from '@mui/material';
import { AdminRole, ROLE_DISPLAY_NAMES } from '@pravado/shared-types';

export interface RoleTagProps {
  role: AdminRole;
  size?: 'small' | 'medium';
  onDelete?: () => void;
}

export const RoleTag: React.FC<RoleTagProps> = ({ role, size = 'small', onDelete }) => {
  const getRoleColor = (role: AdminRole) => {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return 'error';
      case AdminRole.ADMIN:
        return 'primary';
      case AdminRole.ANALYST:
        return 'info';
      case AdminRole.SUPPORT:
        return 'success';
      case AdminRole.MODERATOR:
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={ROLE_DISPLAY_NAMES[role] || role}
      size={size}
      color={getRoleColor(role)}
      onDelete={onDelete}
      sx={{ fontWeight: 600 }}
    />
  );
};

export default RoleTag;
