/**
 * Push Notification Service
 *
 * Sends push notifications via Expo Push Notifications.
 * Supports segmented notifications for ops incidents, billing events,
 * trial thresholds, and plan upgrades.
 *
 * Sprint 76 - Track A: Mobile Notifications
 */

import { supabase } from '../config/supabase';
import { captureException } from './observability.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN || '';
const MOBILE_PUSH_PROVIDER = process.env.MOBILE_PUSH_PROVIDER || 'expo';

// ============================================================================
// Types
// ============================================================================

export type NotificationTopic =
  | 'ops_incident'
  | 'billing_event'
  | 'trial_threshold'
  | 'plan_upgrade';

export interface PushNotification {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

export interface PushToken {
  id: string;
  user_id: string;
  organization_id: string;
  token: string;
  platform: 'ios' | 'android';
  topics: NotificationTopic[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Register a push token for a user
 */
export async function registerPushToken(
  userId: string,
  organizationId: string,
  token: string,
  platform: 'ios' | 'android',
  topics: NotificationTopic[] = []
): Promise<PushToken> {
  // Deactivate old tokens for this user
  await supabase
    .from('push_tokens')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('platform', platform);

  // Insert new token
  const { data, error } = await supabase
    .from('push_tokens')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      token,
      platform,
      topics,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register push token: ${error.message}`);
  }

  return data;
}

/**
 * Get all active tokens for a user
 */
export async function getUserTokens(userId: string): Promise<PushToken[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to get user tokens: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all tokens subscribed to a topic
 */
export async function getTokensByTopic(topic: NotificationTopic): Promise<PushToken[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .contains('topics', [topic])
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to get tokens by topic: ${error.message}`);
  }

  return data || [];
}

/**
 * Update topics for a token
 */
export async function updateTokenTopics(
  tokenId: string,
  topics: NotificationTopic[]
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ topics })
    .eq('id', tokenId);

  if (error) {
    throw new Error(`Failed to update token topics: ${error.message}`);
  }
}

// ============================================================================
// Push Notification Sending
// ============================================================================

/**
 * Send push notification via Expo
 */
async function sendExpoPush(notification: PushNotification): Promise<void> {
  if (!EXPO_ACCESS_TOKEN) {
    console.warn('EXPO_ACCESS_TOKEN not configured, skipping push notification');
    return;
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify([notification]),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Expo push failed: ${error}`);
    }

    const result = await response.json();
    if (result.data && result.data[0]?.status === 'error') {
      throw new Error(`Expo push error: ${result.data[0].message}`);
    }
  } catch (error) {
    captureException(error as Error, { notification });
    throw error;
  }
}

/**
 * Send push notification to a user
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const tokens = await getUserTokens(userId);

  if (tokens.length === 0) {
    console.log(`No push tokens found for user ${userId}`);
    return;
  }

  for (const token of tokens) {
    try {
      await sendExpoPush({
        to: token.token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      });
    } catch (error) {
      console.error(`Failed to send push to token ${token.id}:`, error);
    }
  }
}

/**
 * Send push notification to all users subscribed to a topic
 */
export async function sendPushToTopic(
  topic: NotificationTopic,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const tokens = await getTokensByTopic(topic);

  if (tokens.length === 0) {
    console.log(`No tokens subscribed to topic ${topic}`);
    return;
  }

  console.log(`Sending ${topic} notification to ${tokens.length} devices`);

  for (const token of tokens) {
    try {
      await sendExpoPush({
        to: token.token,
        title,
        body,
        data: {
          ...data,
          topic,
        },
        sound: 'default',
        priority: 'high',
      });
    } catch (error) {
      console.error(`Failed to send push to token ${token.id}:`, error);
    }
  }
}

/**
 * Send push notification to organization (all users)
 */
export async function sendPushToOrganization(
  organizationId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true);

  if (error || !tokens || tokens.length === 0) {
    console.log(`No push tokens found for organization ${organizationId}`);
    return;
  }

  for (const token of tokens) {
    try {
      await sendExpoPush({
        to: token.token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      });
    } catch (error) {
      console.error(`Failed to send push to token ${token.id}:`, error);
    }
  }
}

// ============================================================================
// Notification Triggers
// ============================================================================

/**
 * Send ops incident alert
 */
export async function sendOpsIncidentAlert(
  organizationId: string,
  provider: string,
  incident: string
): Promise<void> {
  await sendPushToTopic(
    'ops_incident',
    `${provider} Incident`,
    incident,
    {
      screen: 'OpHealth',
      provider,
    }
  );
}

/**
 * Send billing event alert
 */
export async function sendBillingAlert(
  userId: string,
  title: string,
  message: string,
  action?: string
): Promise<void> {
  await sendPushToUser(userId, title, message, {
    screen: 'Billing',
    action,
  });
}

/**
 * Send trial threshold alert
 */
export async function sendTrialThresholdAlert(
  userId: string,
  daysRemaining: number
): Promise<void> {
  await sendPushToUser(
    userId,
    'Trial Ending Soon',
    `Your trial ends in ${daysRemaining} days. Upgrade to continue using Pravado.`,
    {
      screen: 'Pricing',
      action: 'upgrade',
    }
  );
}

/**
 * Send plan upgrade recommendation
 */
export async function sendUpgradeRecommendation(
  userId: string,
  reason: string,
  recommendedTier: string
): Promise<void> {
  await sendPushToUser(
    userId,
    'Upgrade Recommended',
    reason,
    {
      screen: 'Pricing',
      tier: recommendedTier,
      action: 'upgrade',
    }
  );
}
