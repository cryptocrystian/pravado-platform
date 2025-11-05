/**
 * Mobile Data Hooks
 *
 * React Query hooks for mobile API endpoints.
 * Fetches compact JSON for KPIs, alerts, and usage.
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMobileSummary,
  getMobileAlerts,
  markAlertRead,
  markAllAlertsRead,
  getMobileUsage,
  getMobileTier,
} from '../services/api';

/**
 * Get mobile summary (compact KPIs)
 */
export function useMobileSummary(period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['mobile', 'summary', period],
    queryFn: () => getMobileSummary(period),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
  });
}

/**
 * Get mobile alerts
 */
export function useMobileAlerts(options: {
  limit?: number;
  unread_only?: boolean;
  type?: 'ops' | 'billing' | 'system';
} = {}) {
  return useQuery({
    queryKey: ['mobile', 'alerts', options],
    queryFn: () => getMobileAlerts(options),
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000,
  });
}

/**
 * Mark single alert as read
 */
export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => markAlertRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile', 'alerts'] });
    },
  });
}

/**
 * Mark all alerts as read
 */
export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllAlertsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile', 'alerts'] });
    },
  });
}

/**
 * Get usage status
 */
export function useMobileUsage() {
  return useQuery({
    queryKey: ['mobile', 'usage'],
    queryFn: () => getMobileUsage(),
    staleTime: 60000,
  });
}

/**
 * Get tier info
 */
export function useMobileTier() {
  return useQuery({
    queryKey: ['mobile', 'tier'],
    queryFn: () => getMobileTier(),
    staleTime: 300000, // 5 minutes
  });
}
