// =====================================================
// SKELETON LOADING COMPONENT
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { skeletonVariants } from '../../utils/animations';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'text',
  className = '',
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width,
      height,
      backgroundColor: '#e5e7eb',
      backgroundImage:
        'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)',
    };

    switch (variant) {
      case 'text':
        return { ...base, borderRadius: '4px' };
      case 'rectangular':
        return { ...base, borderRadius: '8px' };
      case 'circular':
        return {
          ...base,
          borderRadius: '50%',
          width: typeof width === 'number' ? width : height,
          height,
        };
      default:
        return base;
    }
  };

  return (
    <motion.div
      className={className}
      style={getVariantStyles()}
      variants={skeletonVariants}
      animate="pulse"
      role="status"
      aria-label="Loading"
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`p-6 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton width="60%" height={16} className="mb-2" />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? '80%' : '100%'}
            height={12}
          />
        ))}
      </div>
    </div>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-700 p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={12} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skeleton;
