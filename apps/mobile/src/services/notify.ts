/**
 * Mobile Push Notification Service
 *
 * Handles Expo push notification registration, permissions,
 * and deep linking to screens.
 *
 * Sprint 76 - Track A: Mobile Notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSupabaseSession } from './auth/supabaseAuth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.pravado.com';

export type NotificationTopic =
  | 'ops_incident'
  | 'billing_event'
  | 'trial_threshold'
  | 'plan_upgrade';

// ============================================================================
// Configuration
// ============================================================================

// Configure how notifications are displayed when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// Permission & Registration
// ============================================================================

/**
 * Request push notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return false;
  }

  return true;
}

/**
 * Get Expo push token
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
export async function registerPushToken(
  topics: NotificationTopic[] = ['ops_incident', 'billing_event', 'trial_threshold', 'plan_upgrade']
): Promise<{ success: boolean; tokenId?: string }> {
  try {
    const token = await getExpoPushToken();
    if (!token) {
      return { success: false };
    }

    const session = await getSupabaseSession();
    if (!session?.access_token) {
      console.error('No auth session found');
      return { success: false };
    }

    const platform = Platform.OS as 'ios' | 'android';

    const response = await fetch(`${API_BASE}/mobile/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-mobile-api-version': '1',
      },
      body: JSON.stringify({
        token,
        platform,
        topics,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to register push token:', error);
      return { success: false };
    }

    const data = await response.json();
    return { success: true, tokenId: data.data.id };
  } catch (error) {
    console.error('Error registering push token:', error);
    return { success: false };
  }
}

/**
 * Update topic subscriptions
 */
export async function updateTopicSubscriptions(
  tokenId: string,
  topics: NotificationTopic[]
): Promise<boolean> {
  try {
    const session = await getSupabaseSession();
    if (!session?.access_token) {
      return false;
    }

    const response = await fetch(`${API_BASE}/mobile/push/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-mobile-api-version': '1',
      },
      body: JSON.stringify({
        tokenId,
        topics,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating topic subscriptions:', error);
    return false;
  }
}

// ============================================================================
// Notification Handling
// ============================================================================

/**
 * Handle notification received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification tapped by user
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get navigation params from notification data
 */
export function getNavigationFromNotification(
  notification: Notifications.Notification | Notifications.NotificationResponse
): { screen?: string; params?: any } | null {
  const data = 'notification' in notification
    ? notification.notification.request.content.data
    : notification.request.content.data;

  if (!data || !data.screen) {
    return null;
  }

  return {
    screen: data.screen,
    params: data,
  };
}

/**
 * Send test notification (development only)
 */
export async function sendTestNotification(
  title: string = 'Test Notification',
  body: string = 'This is a test notification from Pravado mobile',
  data?: any
): Promise<boolean> {
  try {
    const session = await getSupabaseSession();
    if (!session?.access_token) {
      return false;
    }

    const response = await fetch(`${API_BASE}/mobile/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-mobile-api-version': '1',
      },
      body: JSON.stringify({
        title,
        body,
        data,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
