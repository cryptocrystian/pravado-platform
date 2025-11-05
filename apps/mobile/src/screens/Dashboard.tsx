/**
 * Dashboard Screen
 *
 * Main mobile dashboard with KPI tiles and summary metrics.
 * Displays MRR/ARR/ARPU, customer counts, and trial conversion.
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useMobileSummary } from '../hooks/useMobileData';
import { KpiTile } from '../components/KpiTile';

export function Dashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: summary, isLoading, refetch } = useMobileSummary(period);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Executive Dashboard</Text>
        <Text style={styles.subtitle}>Business metrics at a glance</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['7d', '30d', '90d'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p as '7d' | '30d' | '90d')}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Tiles */}
      {summary && (
        <View style={styles.tilesContainer}>
          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <KpiTile label="MRR" value={formatCurrency(summary.mrr)} delta={summary.growth} />
            </View>
            <View style={styles.tile}>
              <KpiTile label="ARR" value={formatCurrency(summary.arr)} />
            </View>
          </View>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <KpiTile label="ARPU" value={formatCurrency(summary.arpu)} />
            </View>
            <View style={styles.tile}>
              <KpiTile
                label="Customers"
                value={summary.customers}
                delta={summary.new}
                subtitle={`${summary.new} new`}
              />
            </View>
          </View>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <KpiTile
                label="Trial→Paid"
                value={`${summary.trials.conv}%`}
                subtitle={`${summary.trials.active} active trials`}
                status={summary.trials.conv >= 30 ? 'good' : summary.trials.conv >= 20 ? 'warning' : 'error'}
              />
            </View>
            <View style={styles.tile}>
              <KpiTile label="Churn" value={`${summary.churn}%`} status={summary.churn < 3 ? 'good' : 'warning'} />
            </View>
          </View>

          {/* Ops Health Summary */}
          <View style={styles.fullWidthTile}>
            <Text style={styles.sectionTitle}>Operational Health</Text>
            <View style={styles.opsRow}>
              <View style={styles.opsMetric}>
                <Text style={styles.opsLabel}>API Latency</Text>
                <Text style={styles.opsValue}>{summary.health.api}ms</Text>
              </View>
              <View style={styles.opsMetric}>
                <Text style={styles.opsLabel}>Error Rate</Text>
                <Text style={styles.opsValue}>{summary.health.err}%</Text>
              </View>
              <View style={styles.opsMetric}>
                <Text style={styles.opsLabel}>Uptime</Text>
                <Text style={styles.opsValue}>{summary.health.uptime}%</Text>
              </View>
            </View>
          </View>

          {/* AI Metrics */}
          <View style={styles.fullWidthTile}>
            <Text style={styles.sectionTitle}>AI Operations</Text>
            <View style={styles.opsRow}>
              <View style={styles.opsMetric}>
                <Text style={styles.opsLabel}>Requests</Text>
                <Text style={styles.opsValue}>{summary.ai.reqs.toLocaleString()}</Text>
              </View>
              <View style={styles.opsMetric}>
                <Text style={styles.opsLabel}>Total Cost</Text>
                <Text style={styles.opsValue}>${summary.ai.cost.toFixed(2)}</Text>
              </View>
              <View style={styles.opsMetric}>
                <Text style={styles.opsLabel}>Avg Cost</Text>
                <Text style={styles.opsValue}>${summary.ai.avg.toFixed(4)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {!summary && isLoading && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      )}

      {/* Timestamp */}
      {summary && (
        <Text style={styles.timestamp}>
          Last updated: {new Date(summary.ts).toLocaleString()}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  periodTextActive: {
    color: '#fff',
  },
  tilesContainer: {
    padding: 16,
    gap: 12,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
  },
  fullWidthTile: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  opsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  opsMetric: {
    alignItems: 'center',
  },
  opsLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  opsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 16,
  },
});
