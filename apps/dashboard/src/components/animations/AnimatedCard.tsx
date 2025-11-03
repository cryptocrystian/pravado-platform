// =====================================================
// ANIMATED CARD COMPONENT
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { scaleVariants, hoverAnimation, tapAnimation } from '../../utils/animations';

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  hoverable?: boolean;
  clickable?: boolean;
  className?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  hoverable = false,
  clickable = false,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleVariants}
      whileHover={hoverable ? hoverAnimation : undefined}
      whileTap={clickable ? tapAnimation : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
