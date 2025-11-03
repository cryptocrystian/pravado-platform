// =====================================================
// WELCOME SCREEN (Onboarding Page 1)
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

interface Props {
  onNext: () => void;
}

export default function WelcomeScreen({ onNext }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Illustration placeholder */}
        <View style={[styles.illustration, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="displayLarge" style={{ color: theme.colors.primary }}>
            👋
          </Text>
        </View>

        <Text variant="headlineLarge" style={styles.title}>
          Welcome to Pravado
        </Text>

        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Your intelligent PR and media outreach assistant powered by AI agents
        </Text>
      </View>

      <View style={styles.footer}>
        <Button mode="contained" onPress={onNext} style={styles.button} contentStyle={styles.buttonContent}>
          Get Started
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    paddingBottom: 48,
  },
  button: {
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
