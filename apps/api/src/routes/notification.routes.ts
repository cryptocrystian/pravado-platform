// =====================================================
// NOTIFICATION API ROUTES
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import { Router, Request, Response } from 'express';
import { getRecentEvents, logAIEvent, type EventType, type Severity } from '../services/notification.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/notifications/:organizationId
 * Get recent AI ops events/notifications
 */
router.get('/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const minSeverity = (req.query.minSeverity as Severity) || 'info';

    const events = await getRecentEvents(organizationId, limit, minSeverity);

    res.json({ success: true, data: events });
  } catch (error: any) {
    logger.error('[NotificationRoutes] Error getting events', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications
 * Create new notification/event (admin/system only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { eventType, title, message, organizationId, severity, metadata } = req.body;

    if (!eventType || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'eventType, title, and message are required',
      });
    }

    const eventId = await logAIEvent(eventType as EventType, title, message, {
      organizationId,
      severity: severity as Severity,
      metadata,
    });

    if (!eventId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to log event',
      });
    }

    res.json({ success: true, data: { eventId } });
  } catch (error: any) {
    logger.error('[NotificationRoutes] Error creating event', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
