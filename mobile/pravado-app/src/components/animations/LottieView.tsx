// =====================================================
// LOTTIE ANIMATION COMPONENT
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

interface AnimatedLottieProps {
  animation: any; // Lottie JSON or require() path
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: ViewStyle;
  onAnimationFinish?: () => void;
}

export const AnimatedLottie: React.FC<AnimatedLottieProps> = ({
  animation,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  onAnimationFinish,
}) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (autoPlay) {
      animationRef.current?.play();
    }
  }, [autoPlay]);

  return (
    <LottieView
      ref={animationRef}
      source={animation}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={[styles.animation, style]}
      onAnimationFinish={onAnimationFinish}
    />
  );
};

// Pre-defined loading animations
export const LoadingAnimation: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  // In production, replace with actual Lottie JSON file
  const loadingAnimation = require('../../assets/animations/loading.json');

  return (
    <AnimatedLottie
      animation={loadingAnimation}
      style={[{ width: 100, height: 100 }, style]}
    />
  );
};

// Success animation
export const SuccessAnimation: React.FC<{
  style?: ViewStyle;
  onFinish?: () => void;
}> = ({ style, onFinish }) => {
  // In production, replace with actual Lottie JSON file
  const successAnimation = require('../../assets/animations/success.json');

  return (
    <AnimatedLottie
      animation={successAnimation}
      loop={false}
      style={[{ width: 150, height: 150 }, style]}
      onAnimationFinish={onFinish}
    />
  );
};

// Error animation
export const ErrorAnimation: React.FC<{
  style?: ViewStyle;
  onFinish?: () => void;
}> = ({ style, onFinish }) => {
  // In production, replace with actual Lottie JSON file
  const errorAnimation = require('../../assets/animations/error.json');

  return (
    <AnimatedLottie
      animation={errorAnimation}
      loop={false}
      style={[{ width: 150, height: 150 }, style]}
      onAnimationFinish={onFinish}
    />
  );
};

// Empty state animation
export const EmptyStateAnimation: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  // In production, replace with actual Lottie JSON file
  const emptyAnimation = require('../../assets/animations/empty.json');

  return (
    <AnimatedLottie
      animation={emptyAnimation}
      style={[{ width: 200, height: 200 }, style]}
    />
  );
};

const styles = StyleSheet.create({
  animation: {
    width: 100,
    height: 100,
  },
});

export default AnimatedLottie;
