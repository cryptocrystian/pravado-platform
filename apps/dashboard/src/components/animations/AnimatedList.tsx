// =====================================================
// ANIMATED LIST COMPONENT
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { listContainerVariants, listItemVariants } from '../../utils/animations';

interface AnimatedListProps extends Omit<HTMLMotionProps<'ul'>, 'children'> {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.ul
      className={className}
      initial="hidden"
      animate="visible"
      variants={listContainerVariants}
      {...props}
    >
      {children}
    </motion.ul>
  );
};

interface AnimatedListItemProps extends Omit<HTMLMotionProps<'li'>, 'children'> {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.li className={className} variants={listItemVariants} {...props}>
      {children}
    </motion.li>
  );
};

export default AnimatedList;
