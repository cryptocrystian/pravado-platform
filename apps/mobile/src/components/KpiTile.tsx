/**
 * KPI Tile Component
 *
 * Reusable tile component for displaying key metrics.
 * Optimized for mobile with compact layout.
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface KpiTileProps {
  label: string;
  value: string | number;
  delta?: number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'error';
}

export function KpiTile({ label, value, delta, subtitle, status }: KpiTileProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {status && (
          <View
            style={[
              styles.statusDot,
              status === 'good' && styles.statusGood,
              status === 'warning' && styles.statusWarning,
              status === 'error' && styles.statusError,
            ]}
          />
        )}
      </View>

      <Text style={styles.value}>{value}</Text>

      {delta !== undefined && (
        <View style={styles.deltaRow}>
          <Text
            style={[
              styles.delta,
              delta > 0 && styles.deltaPositive,
              delta < 0 && styles.deltaNegative,
            ]}
          >
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta).toFixed(1)}%
          </Text>
        </View>
      )}

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusGood: {
    backgroundColor: '#10B981',
  },
  statusWarning: {
    backgroundColor: '#F59E0B',
  },
  statusError: {
    backgroundColor: '#EF4444',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  deltaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  delta: {
    fontSize: 14,
    fontWeight: '600',
  },
  deltaPositive: {
    color: '#10B981',
  },
  deltaNegative: {
    color: '#EF4444',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
});
