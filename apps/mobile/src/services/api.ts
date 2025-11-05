/**
 * Mobile API Service
 *
 * API client for mobile endpoints with version header.
 * Adds x-mobile-api-version: 1 to all requests.
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import { getSupabaseSession } from './auth/supabaseAuth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.pravado.com';
const MOBILE_API_VERSION = '1';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  v: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const session = await getSupabaseSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-mobile-api-version': MOBILE_API_VERSION,
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Get mobile summary (compact KPIs)
 */
export async function getMobileSummary(period: '7d' | '30d' | '90d' = '30d') {
  const res = await fetchWithAuth(`${API_BASE}/mobile/summary?period=${period}`);

  if (!res.ok) {
    throw new Error('Failed to fetch mobile summary');
  }

  const json: ApiResponse<any> = await res.json();
  return json.data;
}

/**
 * Get mobile alerts
 */
export async function getMobileAlerts(options: {
  limit?: number;
  unread_only?: boolean;
  type?: 'ops' | 'billing' | 'system';
} = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.unread_only) params.append('unread_only', 'true');
  if (options.type) params.append('type', options.type);

  const res = await fetchWithAuth(`${API_BASE}/mobile/alerts?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch alerts');
  }

  const json: ApiResponse<any> = await res.json();
  return json;
}

/**
 * Mark alert as read
 */
export async function markAlertRead(alertId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/mobile/alerts/${alertId}/read`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to mark alert as read');
  }
}

/**
 * Mark all alerts as read
 */
export async function markAllAlertsRead(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/mobile/alerts/read-all`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to mark all alerts as read');
  }
}

/**
 * Get usage status
 */
export async function getMobileUsage() {
  const res = await fetchWithAuth(`${API_BASE}/mobile/usage`);

  if (!res.ok) {
    throw new Error('Failed to fetch usage');
  }

  const json: ApiResponse<any> = await res.json();
  return json.data;
}

/**
 * Get tier info
 */
export async function getMobileTier() {
  const res = await fetchWithAuth(`${API_BASE}/mobile/tier`);

  if (!res.ok) {
    throw new Error('Failed to fetch tier info');
  }

  const json: ApiResponse<any> = await res.json();
  return json.data;
}
