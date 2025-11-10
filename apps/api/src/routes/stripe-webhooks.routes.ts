// =====================================================
// STRIPE WEBHOOKS ROUTES
// Sprint 72: Automated Billing & Revenue Operations Integration
// =====================================================

import { Router, Request, Response } from 'express';
import { verifyWebhookSignature, processWebhookEvent } from '../services/stripe-webhooks.service';
import { logger } from '../services/logger.service';

const router = Router();

// =====================================================
// WEBHOOK ENDPOINT
// =====================================================

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This endpoint must be configured with raw body parsing
 * to properly verify webhook signatures. See app.ts for configuration.
 */
router.post(
  '/stripe',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.warn('Missing Stripe signature header');
      res.status(400).json({
        success: false,
        error: 'Missing Stripe signature',
      });
      return;
    }

    try {
      // Get webhook secret from environment
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.error('STRIPE_WEBHOOK_SECRET not configured');
        res.status(500).json({
          success: false,
          error: 'Webhook secret not configured',
        });
        return;
      }

      // Verify signature and construct event
      // req.body should be raw buffer for signature verification
      const event = verifyWebhookSignature(req.body, signature, webhookSecret);

      logger.info('Received Stripe webhook', {
        eventId: event.id,
        eventType: event.type,
      });

      // Process event asynchronously
      processWebhookEvent(event)
        .then(() => {
          logger.info('Webhook event processed successfully', {
            eventId: event.id,
            eventType: event.type,
          });
        })
        .catch((err) => {
          logger.error('Failed to process webhook event', {
            eventId: event.id,
            eventType: event.type,
            error: err.message,
          });
        });

      // Return 200 immediately to acknowledge receipt
      // Stripe expects a 200 response within a few seconds
      res.status(200).json({
        success: true,
        received: true,
        eventId: event.id,
      });
    } catch (err: any) {
      logger.error('Webhook signature verification failed', {
        error: err.message,
      });

      res.status(400).json({
        success: false,
        error: 'Webhook signature verification failed',
      });
    }
  }
);

// =====================================================
// WEBHOOK STATUS ENDPOINT (For Testing)
// =====================================================

/**
 * GET /webhooks/stripe/status
 * Check webhook configuration status
 */
router.get('/stripe/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const hasSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    const hasApiKey = !!process.env.STRIPE_SECRET_KEY;

    res.json({
      success: true,
      data: {
        webhookSecretConfigured: hasSecret,
        stripeApiKeyConfigured: hasApiKey,
        ready: hasSecret && hasApiKey,
      },
    });
  } catch (err: any) {
    logger.error('Failed to check webhook status', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
