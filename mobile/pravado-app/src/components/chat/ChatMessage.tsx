// =====================================================
// CHAT MESSAGE COMPONENT
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { Message } from '@types/index';
import { formatTimestamp } from '@utils/index';

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.agentContainer]}>
      <Surface
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.colors.primary }
            : { backgroundColor: theme.colors.surfaceVariant },
        ]}
        elevation={1}
      >
        <Text
          style={[
            styles.message,
            { color: isUser ? '#FFFFFF' : theme.colors.onSurface },
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.timestamp,
            { color: isUser ? 'rgba(255,255,255,0.7)' : theme.colors.onSurfaceVariant },
          ]}
        >
          {formatTimestamp(message.timestamp)}
        </Text>
      </Surface>
    </View>
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
    borderRadius: 16,
    padding: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
});
