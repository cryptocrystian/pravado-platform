// =====================================================
// EMPTY STATE COMPONENT
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { fadeVariants, slideVariants } from '../../utils/animations';

type EmptyStateType = 'no-data' | 'error' | 'loading' | 'search' | 'offline';

interface EmptyStateProps {
  type: EmptyStateType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  action,
  className = '',
}) => {
  const getIllustration = () => {
    // Placeholder for Lottie animations
    // In production, replace with actual Lottie player
    const illustrations: Record<EmptyStateType, string> = {
      'no-data': '📊',
      error: '⚠️',
      loading: '⏳',
      search: '🔍',
      offline: '📡',
    };
    return illustrations[type];
  };

  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
    >
      <motion.div
        className="text-6xl mb-6"
        variants={slideVariants.down}
        role="img"
        aria-label={`${type} illustration`}
      >
        {getIllustration()}
      </motion.div>

      <motion.h3
        className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
        variants={slideVariants.up}
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6"
          variants={slideVariants.up}
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          variants={slideVariants.up}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
