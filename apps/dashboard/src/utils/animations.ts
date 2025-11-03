// =====================================================
// ANIMATION SYSTEM
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import { Variants } from 'framer-motion';

/**
 * Motion Curve Presets
 * Based on Material Design and iOS guidelines
 */
export const easings = {
  // Standard easing - most common use case
  standard: [0.4, 0.0, 0.2, 1],

  // Decelerate - elements entering the screen
  decelerate: [0.0, 0.0, 0.2, 1],

  // Accelerate - elements leaving the screen
  accelerate: [0.4, 0.0, 1, 1],

  // Sharp - quick, precise movements
  sharp: [0.4, 0.0, 0.6, 1],

  // Smooth - gentle, organic movements
  smooth: [0.25, 0.1, 0.25, 1],

  // Bounce - playful spring effect
  bounce: [0.68, -0.55, 0.265, 1.55],

  // Elastic - elastic spring effect
  elastic: [0.68, -0.6, 0.32, 1.6],
};

/**
 * Standard Timing Durations (in seconds)
 */
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
  slowest: 1.0,
};

/**
 * Fade Animations
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    },
  },
};

/**
 * Slide Animations
 */
export const slideVariants = {
  up: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: durations.normal,
        ease: easings.decelerate,
      },
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: {
        duration: durations.fast,
        ease: easings.accelerate,
      },
    },
  },
  down: {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: durations.normal,
        ease: easings.decelerate,
      },
    },
    exit: {
      y: 20,
      opacity: 0,
      transition: {
        duration: durations.fast,
        ease: easings.accelerate,
      },
    },
  },
  left: {
    hidden: { x: 20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: durations.normal,
        ease: easings.decelerate,
      },
    },
    exit: {
      x: -20,
      opacity: 0,
      transition: {
        duration: durations.fast,
        ease: easings.accelerate,
      },
    },
  },
  right: {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: durations.normal,
        ease: easings.decelerate,
      },
    },
    exit: {
      x: 20,
      opacity: 0,
      transition: {
        duration: durations.fast,
        ease: easings.accelerate,
      },
    },
  },
};

/**
 * Scale Animations
 */
export const scaleVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: durations.instant,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: durations.fast,
    },
  },
};

/**
 * Modal/Overlay Animations
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.decelerate,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
    },
  },
};

/**
 * Tab Transition Animations
 */
export const tabVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.decelerate,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    },
  }),
};

/**
 * List Item Stagger Animation
 */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.decelerate,
    },
  },
};

/**
 * Chart Animation Variants
 */
export const chartVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.slow,
      ease: easings.smooth,
      staggerChildren: 0.1,
    },
  },
};

export const chartBarVariants: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: {
      duration: durations.slow,
      ease: easings.elastic,
    },
  },
};

export const chartLineVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: durations.slower,
      ease: easings.standard,
    },
  },
};

/**
 * Button Interaction Animations
 */
export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      duration: durations.instant,
      ease: easings.standard,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: durations.instant,
    },
  },
  loading: {
    scale: 1,
    transition: {
      duration: durations.normal,
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
};

/**
 * Toast/Alert Animations
 */
export const toastVariants: Variants = {
  hidden: {
    x: 400,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.decelerate,
    },
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    },
  },
};

/**
 * Skeleton Loading Animation
 */
export const skeletonVariants: Variants = {
  pulse: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: easings.standard,
    },
  },
};

/**
 * Collapse/Expand Animation
 */
export const collapseVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: durations.normal,
        ease: easings.standard,
      },
      opacity: {
        duration: durations.fast,
        delay: 0.1,
      },
    },
  },
};

/**
 * Page Transition Variants
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.decelerate,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: durations.fast,
      ease: easings.accelerate,
    },
  },
};

/**
 * Utility Functions
 */

/**
 * Create a custom spring animation
 */
export const spring = (stiffness = 100, damping = 10, mass = 1) => ({
  type: 'spring',
  stiffness,
  damping,
  mass,
});

/**
 * Create a custom tween animation
 */
export const tween = (duration = durations.normal, ease = easings.standard) => ({
  type: 'tween',
  duration,
  ease,
});

/**
 * Stagger children animation
 */
export const stagger = (staggerChildren = 0.05, delayChildren = 0) => ({
  staggerChildren,
  delayChildren,
});

/**
 * Create hover animation
 */
export const hoverAnimation = {
  scale: 1.05,
  transition: { duration: durations.fast },
};

/**
 * Create tap animation
 */
export const tapAnimation = {
  scale: 0.95,
  transition: { duration: durations.instant },
};

/**
 * Create focus ring animation
 */
export const focusRingVariants: Variants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: durations.fast,
      ease: easings.decelerate,
    },
  },
};
