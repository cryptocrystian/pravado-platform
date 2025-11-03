// =====================================================
// ABUSE SCORE BADGE COMPONENT
// Sprint 58 Phase 5.5
// =====================================================

import React from 'react';
import { Chip } from '@mui/material';
import { AbuseScore } from '@pravado/shared-types';

export interface AbuseScoreBadgeProps {
  score: AbuseScore;
  severity?: number;
  size?: 'small' | 'medium';
}

export const AbuseScoreBadge: React.FC<AbuseScoreBadgeProps> = ({ score, severity, size = 'small' }) => {
  const getColor = () => {
    switch (score) {
      case AbuseScore.ABUSIVE:
        return 'error';
      case AbuseScore.SUSPICIOUS:
        return 'warning';
      case AbuseScore.NORMAL:
        return 'success';
      default:
        return 'default';
    }
  };

  const getLabel = () => {
    if (severity !== undefined) {
      return `${score.toUpperCase()} (${severity})`;
    }
    return score.toUpperCase();
  };

  return (
    <Chip
      label={getLabel()}
      color={getColor()}
      size={size}
      sx={{ fontWeight: 600 }}
    />
  );
};

export default AbuseScoreBadge;
