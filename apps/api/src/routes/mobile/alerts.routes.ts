/**
 * Mobile Alerts Routes
 *
 * Provides operational and billing alerts for mobile notifications.
 * Optimized for mobile consumption with compact payloads.
 *
 * Endpoints:
 * - GET /api/mobile/alerts - Recent alerts (ops + billing)
 *
 * Alert types:
 * - ops: Operational alerts (provider down, high latency, errors)
 * - billing: Billing alerts (payment failures, usage limits, upgrades)
 * - system: System notifications (maintenance, updates)
 *
 * Sprint 75 - Track C: Mobile App Foundation
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { authenticateToken } from '../../middleware/auth';
import { captureException } from '../../services/observability.service';
import { shouldPromptUpgrade } from '../../services/account-tier.service';

const router = Router();

// Mobile API version
const MOBILE_API_VERSION = process.env.MOBILE_API_VERSION || '1';

// ============================================================================
// Types
// ============================================================================

interface MobileAlert {
  id: string;
  type: 'ops' | 'billing' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  msg: string; // Compact field name
  ts: string; // Compact timestamp
  read: boolean;
  action?: string; // Optional action URL or identifier
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Add mobile API version header to all responses
 */
function addMobileVersionHeader(req: Request, res: Response, next: Function) {
  res.setHeader('x-mobile-api-version', MOBILE_API_VERSION);
  next();
}

router.use(addMobileVersionHeader);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/mobile/alerts
 *
 * Get recent alerts for mobile notifications
 *
 * Query params:
 * - limit: Max alerts to return (default: 20, max: 50)
 * - unread_only: 'true' to return only unread alerts
 * - type: Filter by type ('ops' | 'billing' | 'system')
 *
 * Returns compact alert array:
 * [
 *   {
 *     id: "uuid",
 *     type: "ops",
 *     severity: "warning",
 *     title: "High API Latency",
 *     msg: "API response time 450ms (threshold: 200ms)",
 *     ts: "2025-01-05T10:30:00Z",
 *     read: false,
 *     action: "view_ops_health"
 *   },
 *   ...
 * ]
 */
router.get(
  '/alerts',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organization_id;
      const userId = (req as any).user?.id;

      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const unreadOnly = req.query.unread_only === 'true';
      const typeFilter = req.query.type as 'ops' | 'billing' | 'system' | undefined;

      // Get operational alerts from ai_ops_events
      const opsAlertsPromise = getOpsAlerts(organizationId, limit, unreadOnly);

      // Get billing alerts
      const billingAlertsPromise = getBillingAlerts(organizationId, limit);

      // Get system notifications
      const systemAlertsPromise = getSystemAlerts(organizationId, limit);

      const [opsAlerts, billingAlerts, systemAlerts] = await Promise.all([
        opsAlertsPromise,
        billingAlertsPromise,
        systemAlertsPromise,
      ]);

      // Combine and filter alerts
      let allAlerts = [...opsAlerts, ...billingAlerts, ...systemAlerts];

      if (typeFilter) {
        allAlerts = allAlerts.filter(alert => alert.type === typeFilter);
      }

      // Sort by timestamp (newest first) and limit
      allAlerts = allAlerts
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, limit);

      res.json({
        success: true,
        data: allAlerts,
        count: allAlerts.length,
        unread: allAlerts.filter(a => !a.read).length,
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/alerts',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

/**
 * POST /api/mobile/alerts/:id/read
 *
 * Mark alert as read
 */
router.post(
  '/alerts/:id/read',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      const userId = (req as any).user?.id;

      // Update alert read status in notifications table
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/alerts/:id/read',
        alert_id: req.params.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to mark alert as read',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

/**
 * POST /api/mobile/alerts/read-all
 *
 * Mark all alerts as read for current user
 */
router.post(
  '/alerts/read-all',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/alerts/read-all',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to mark alerts as read',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get operational alerts from ai_ops_events
 */
async function getOpsAlerts(
  organizationId: string,
  limit: number,
  unreadOnly: boolean
): Promise<MobileAlert[]> {
  // Get recent error/timeout events
  const { data: events } = await supabase
    .from('ai_ops_events')
    .select('id, event_type, provider, created_at, metadata')
    .eq('organization_id', organizationId)
    .in('event_type', ['error', 'timeout', 'rate_limit'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!events) return [];

  return events.map(event => ({
    id: event.id,
    type: 'ops' as const,
    severity: event.event_type === 'error' ? 'error' : 'warning',
    title: getOpsAlertTitle(event.event_type, event.provider),
    msg: getOpsAlertMessage(event),
    ts: event.created_at,
    read: false, // Ops events don't have read status, always show as unread
    action: 'view_ops_health',
  }));
}

/**
 * Get billing alerts
 */
async function getBillingAlerts(
  organizationId: string,
  limit: number
): Promise<MobileAlert[]> {
  const alerts: MobileAlert[] = [];

  // Check for upgrade triggers
  const upgradeCheck = await shouldPromptUpgrade(organizationId);

  if (upgradeCheck.should_upgrade) {
    alerts.push({
      id: `upgrade-${organizationId}`,
      type: 'billing',
      severity: 'warning',
      title: 'Upgrade Recommended',
      msg: upgradeCheck.reason || 'You are approaching your plan limits',
      ts: new Date().toISOString(),
      read: false,
      action: 'upgrade_plan',
    });
  }

  // Check for payment failures
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('failed_payment_count, payment_status')
    .eq('organization_id', organizationId)
    .single();

  if (customer && customer.failed_payment_count > 0) {
    alerts.push({
      id: `payment-${organizationId}`,
      type: 'billing',
      severity: customer.failed_payment_count >= 2 ? 'error' : 'warning',
      title: 'Payment Issue',
      msg: `${customer.failed_payment_count} failed payment${customer.failed_payment_count > 1 ? 's' : ''}. Update your payment method.`,
      ts: new Date().toISOString(),
      read: false,
      action: 'update_payment',
    });
  }

  // Check for upcoming renewal
  const { data: subscription } = await supabase
    .from('stripe_subscriptions')
    .select('current_period_end')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  if (subscription) {
    const daysUntilRenewal = Math.ceil(
      (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
      alerts.push({
        id: `renewal-${organizationId}`,
        type: 'billing',
        severity: 'info',
        title: 'Renewal Coming Up',
        msg: `Your subscription renews in ${daysUntilRenewal} day${daysUntilRenewal > 1 ? 's' : ''}`,
        ts: new Date().toISOString(),
        read: false,
      });
    }
  }

  return alerts;
}

/**
 * Get system notifications
 */
async function getSystemAlerts(
  organizationId: string,
  limit: number
): Promise<MobileAlert[]> {
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, message, severity, created_at, read')
    .eq('organization_id', organizationId)
    .eq('notification_type', 'system')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!notifications) return [];

  return notifications.map(notif => ({
    id: notif.id,
    type: 'system' as const,
    severity: notif.severity || 'info',
    title: notif.title,
    msg: notif.message,
    ts: notif.created_at,
    read: notif.read,
  }));
}

/**
 * Generate ops alert title
 */
function getOpsAlertTitle(eventType: string, provider: string): string {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  switch (eventType) {
    case 'error':
      return `${providerName} Error`;
    case 'timeout':
      return `${providerName} Timeout`;
    case 'rate_limit':
      return `${providerName} Rate Limit`;
    default:
      return `${providerName} Issue`;
  }
}

/**
 * Generate ops alert message
 */
function getOpsAlertMessage(event: any): string {
  const metadata = event.metadata || {};

  if (event.event_type === 'error') {
    return metadata.error_message || 'An error occurred with the AI provider';
  }

  if (event.event_type === 'timeout') {
    return `Request timed out after ${metadata.duration_ms || 'unknown'}ms`;
  }

  if (event.event_type === 'rate_limit') {
    return 'API rate limit reached. Requests are being throttled.';
  }

  return 'Provider issue detected';
}

export default router;
