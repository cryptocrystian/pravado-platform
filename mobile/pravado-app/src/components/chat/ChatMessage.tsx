// =====================================================
// CHAT MESSAGE COMPONENT
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// Enhanced with animations and improved styling
// =====================================================

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInLeft,
  FadeInRight,
} from 'react-native-reanimated';
import { Message } from '@types/index';
import { formatTimestamp } from '@utils/index';

interface Props {
  message: Message;
  index?: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export default function ChatMessage({ message, index = 0 }: Props) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
    });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Different border radius for user vs agent
  const bubbleStyle = isUser
    ? {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 4,
      }
    : {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 16,
      };

  return (
    <AnimatedView
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.agentContainer,
        animatedStyle,
      ]}
      entering={isUser ? FadeInRight.delay(index * 50) : FadeInLeft.delay(index * 50)}
    >
      <Surface
        style={[
          styles.bubble,
          bubbleStyle,
          isUser
            ? {
                backgroundColor: theme.colors.primary,
                elevation: 2,
              }
            : {
                backgroundColor: theme.colors.surfaceVariant,
                elevation: 1,
              },
        ]}
      >
        <Text
          style={[
            styles.message,
            { color: isUser ? '#FFFFFF' : theme.colors.onSurface },
          ]}
        >
          {message.content}
        </Text>
        <View style={styles.footer}>
          <Text
            style={[
              styles.timestamp,
              { color: isUser ? 'rgba(255,255,255,0.7)' : theme.colors.onSurfaceVariant },
            ]}
          >
            {formatTimestamp(message.timestamp)}
          </Text>
          {isUser && (
            <Text style={styles.readReceipt}>✓</Text>
          )}
        </View>
      </Surface>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  agentContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  readReceipt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
});
