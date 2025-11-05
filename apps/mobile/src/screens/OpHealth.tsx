/**
 * Operational Health Screen
 *
 * Provider health status, error tracking, and alerts display.
 * Shows real-time operational metrics and recent alerts.
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useMobileSummary, useMobileAlerts, useMarkAlertRead } from '../hooks/useMobileData';

export function OpHealth() {
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useMobileSummary();
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useMobileAlerts({ limit: 10 });
  const { mutate: markRead } = useMarkAlertRead();

  const isLoading = summaryLoading || alertsLoading;
  const alerts = alertsData?.data || [];

  const getProviderStatus = (status: number): 'healthy' | 'degraded' | 'down' => {
    return status === 1 ? 'healthy' : status === 0 ? 'down' : 'degraded';
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'down'): string => {
    switch (status) {
      case 'healthy':
        return '#10B981';
      case 'degraded':
        return '#F59E0B';
      case 'down':
        return '#EF4444';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return '#3B82F6';
    }
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchAlerts();
  };

  const handleAlertPress = (alertId: string) => {
    markRead(alertId);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Operational Health</Text>
        <Text style={styles.subtitle}>Infrastructure status and alerts</Text>
      </View>

      {summary && (
        <>
          {/* Provider Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provider Status</Text>
            <View style={styles.providersGrid}>
              {[
                { name: 'Database', key: 'db', status: getProviderStatus(summary.providers.db) },
                { name: 'Redis', key: 'redis', status: getProviderStatus(summary.providers.redis) },
                { name: 'OpenAI', key: 'openai', status: getProviderStatus(summary.providers.openai) },
                { name: 'Anthropic', key: 'anthropic', status: getProviderStatus(summary.providers.anthropic) },
              ].map((provider) => (
                <View key={provider.key} style={styles.providerCard}>
                  <View
                    style={[
                      styles.providerStatusDot,
                      { backgroundColor: getStatusColor(provider.status) },
                    ]}
                  />
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={[styles.providerStatus, { color: getStatusColor(provider.status) }]}>
                    {provider.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>API Latency</Text>
                <Text style={styles.metricValue}>{summary.health.api}ms</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (summary.health.api / 1000) * 100)}%`,
                        backgroundColor: summary.health.api < 200 ? '#10B981' : summary.health.api < 500 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Error Rate</Text>
                <Text style={styles.metricValue}>{summary.health.err}%</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, summary.health.err * 10)}%`,
                        backgroundColor: summary.health.err < 1 ? '#10B981' : summary.health.err < 5 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  />
                </View>
              </View>

              {summary.health.cache !== undefined && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Cache Hit Rate</Text>
                  <Text style={styles.metricValue}>{summary.health.cache}%</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${summary.health.cache}%`,
                          backgroundColor: summary.health.cache >= 90 ? '#10B981' : summary.health.cache >= 70 ? '#F59E0B' : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Uptime</Text>
                <Text style={styles.metricValue}>{summary.health.uptime}%</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${summary.health.uptime}%`,
                        backgroundColor: summary.health.uptime >= 99.9 ? '#10B981' : summary.health.uptime >= 99 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Recent Alerts */}
      <View style={styles.section}>
        <View style={styles.alertsHeader}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          {alertsData && (
            <Text style={styles.alertsCount}>
              {alertsData.unread} unread
            </Text>
          )}
        </View>

        {alerts.length > 0 ? (
          <View style={styles.alertsList}>
            {alerts.map((alert: any) => (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertCard, alert.read && styles.alertCardRead]}
                onPress={() => handleAlertPress(alert.id)}
              >
                <View style={styles.alertHeader}>
                  <View
                    style={[
                      styles.alertSeverityBadge,
                      { backgroundColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    <Text style={styles.alertSeverityText}>{alert.severity.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.alertType}>{alert.type}</Text>
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.msg}</Text>
                <Text style={styles.alertTime}>{new Date(alert.ts).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No alerts to display</Text>
          </View>
        )}
      </View>
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  providerStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  providerStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  alertsList: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertCardRead: {
    opacity: 0.6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertSeverityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertType: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
