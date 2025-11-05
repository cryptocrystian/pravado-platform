/**
 * Mobile Push Notification Routes
 *
 * Handles push token registration and topic subscription management.
 * Integrates with Expo Push Notifications.
 *
 * Endpoints:
 * - POST /api/mobile/push/register - Register device push token
 * - POST /api/mobile/push/topics - Update topic subscriptions
 * - POST /api/mobile/push/test - Send test notification (dev only)
 *
 * Sprint 76 - Track A: Mobile Notifications
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { captureException } from '../../services/observability.service';
import {
  registerPushToken,
  updateTokenTopics,
  sendPushToUser,
  type NotificationTopic,
} from '../../services/push.service';

const router = Router();

const MOBILE_API_VERSION = process.env.MOBILE_API_VERSION || '1';

// ============================================================================
// Middleware
// ============================================================================

function addMobileVersionHeader(req: Request, res: Response, next: Function) {
  res.setHeader('x-mobile-api-version', MOBILE_API_VERSION);
  next();
}

router.use(addMobileVersionHeader);

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/mobile/push/register
 *
 * Register a device push token
 *
 * Body:
 * {
 *   token: string,           // Expo push token (ExponentPushToken[...])
 *   platform: 'ios' | 'android',
 *   topics?: NotificationTopic[]
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: { id, token, platform, topics, active }
 * }
 */
router.post(
  '/register',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organization_id;

      if (!userId || !organizationId) {
        return res.status(400).json({
          success: false,
          error: 'User ID and Organization ID required',
          v: MOBILE_API_VERSION,
        });
      }

      const { token, platform, topics } = req.body;

      if (!token || !platform) {
        return res.status(400).json({
          success: false,
          error: 'token and platform are required',
          v: MOBILE_API_VERSION,
        });
      }

      if (!['ios', 'android'].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: 'platform must be ios or android',
          v: MOBILE_API_VERSION,
        });
      }

      // Validate Expo token format
      if (!token.startsWith('ExponentPushToken[')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Expo push token format',
          v: MOBILE_API_VERSION,
        });
      }

      const pushToken = await registerPushToken(
        userId,
        organizationId,
        token,
        platform,
        topics || []
      );

      res.json({
        success: true,
        data: {
          id: pushToken.id,
          token: pushToken.token,
          platform: pushToken.platform,
          topics: pushToken.topics,
          active: pushToken.active,
        },
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/push/register',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to register push token',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

/**
 * POST /api/mobile/push/topics
 *
 * Update topic subscriptions for current device
 *
 * Body:
 * {
 *   tokenId: string,
 *   topics: NotificationTopic[]
 * }
 *
 * Topics: 'ops_incident' | 'billing_event' | 'trial_threshold' | 'plan_upgrade'
 */
router.post(
  '/topics',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { tokenId, topics } = req.body;

      if (!tokenId || !Array.isArray(topics)) {
        return res.status(400).json({
          success: false,
          error: 'tokenId and topics array are required',
          v: MOBILE_API_VERSION,
        });
      }

      // Validate topics
      const validTopics: NotificationTopic[] = [
        'ops_incident',
        'billing_event',
        'trial_threshold',
        'plan_upgrade',
      ];

      for (const topic of topics) {
        if (!validTopics.includes(topic)) {
          return res.status(400).json({
            success: false,
            error: `Invalid topic: ${topic}. Valid topics: ${validTopics.join(', ')}`,
            v: MOBILE_API_VERSION,
          });
        }
      }

      await updateTokenTopics(tokenId, topics);

      res.json({
        success: true,
        data: { tokenId, topics },
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/push/topics',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update topics',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

/**
 * POST /api/mobile/push/test
 *
 * Send test push notification (development only)
 *
 * Body:
 * {
 *   title: string,
 *   body: string,
 *   data?: object
 * }
 */
router.post(
  '/test',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Test notifications not allowed in production',
          v: MOBILE_API_VERSION,
        });
      }

      const userId = (req as any).user?.id;
      const { title, body, data } = req.body;

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          error: 'title and body are required',
          v: MOBILE_API_VERSION,
        });
      }

      await sendPushToUser(userId, title, body, data);

      res.json({
        success: true,
        message: 'Test notification sent',
        v: MOBILE_API_VERSION,
      });
    } catch (error) {
      captureException(error as Error, {
        endpoint: '/api/mobile/push/test',
        user_id: (req as any).user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to send test notification',
        v: MOBILE_API_VERSION,
      });
    }
  }
);

export default router;
