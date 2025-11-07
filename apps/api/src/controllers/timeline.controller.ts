// =====================================================
// TIMELINE CONTROLLER - Unified Activity Feed API
// =====================================================

import { Request, Response } from 'express';
import { timelineEngine } from '../../../agents/src/timeline/timeline-engine';
import type {
  GetCampaignTimelineInput,
  GetGlobalTimelineInput,
  GetTimelineStatsInput,
  TimelineEventType,
  TimelineEntityType,
} from '@pravado/types';

// =====================================================
// TIMELINE QUERIES
// =====================================================

/**
 * Get campaign timeline
 * GET /api/v1/timeline/campaign/:campaignId
 */
export async function getCampaignTimeline(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const {
      limit = 50,
      offset = 0,
      eventTypes,
      startDate,
      endDate,
    } = req.query;

    const input: GetCampaignTimelineInput = {
      campaignId,
      organizationId,
      limit: Number(limit),
      offset: Number(offset),
      eventTypes: eventTypes
        ? (eventTypes as string).split(',') as TimelineEventType[]
        : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    };

    const events = await timelineEngine.getCampaignTimeline(input);

    res.json({
      success: true,
      events,
      total: events.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('Get campaign timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to get campaign timeline' });
  }
}

/**
 * Get global timeline
 * GET /api/v1/timeline/global
 */
export async function getGlobalTimeline(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const {
      limit = 50,
      offset = 0,
      campaignIds,
      eventTypes,
      entityTypes,
      actorIds,
      startDate,
      endDate,
      minImportance,
    } = req.query;

    const input: GetGlobalTimelineInput = {
      organizationId,
      limit: Number(limit),
      offset: Number(offset),
      campaignIds: campaignIds ? (campaignIds as string).split(',') : undefined,
      eventTypes: eventTypes
        ? (eventTypes as string).split(',') as TimelineEventType[]
        : undefined,
      entityTypes: entityTypes
        ? (entityTypes as string).split(',') as TimelineEntityType[]
        : undefined,
      actorIds: actorIds ? (actorIds as string).split(',') : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      minImportance: minImportance ? parseFloat(minImportance as string) : undefined,
    };

    const events = await timelineEngine.getGlobalTimeline(input);

    res.json({
      success: true,
      events,
      total: events.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('Get global timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to get global timeline' });
  }
}

/**
 * Get timeline statistics
 * GET /api/v1/timeline/stats
 */
export async function getTimelineStats(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { campaignId, startDate, endDate } = req.query;

    const input: GetTimelineStatsInput = {
      organizationId,
      campaignId: campaignId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    };

    const stats = await timelineEngine.getTimelineStats(input);

    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Get timeline stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get timeline stats' });
  }
}

/**
 * Get event details
 * GET /api/v1/timeline/events/:eventId
 */
export async function getEventDetails(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { eventId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const details = await timelineEngine.getEventDetails(eventId, organizationId);

    if (!details) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true, details });
  } catch (error: any) {
    console.error('Get event details error:', error);
    res.status(500).json({ error: error.message || 'Failed to get event details' });
  }
}

/**
 * Cleanup old events (admin only)
 * POST /api/v1/timeline/cleanup
 */
export async function cleanupOldEvents(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const userRole = req.user?.role;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    // Only allow admins to cleanup
    if (userRole !== 'admin' && userRole !== 'owner') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { retentionDays = 90, minImportance = 0.3 } = req.body;

    const deletedCount = await timelineEngine.cleanupOldEvents(
      Number(retentionDays),
      Number(minImportance)
    );

    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} old timeline events`,
    });
  } catch (error: any) {
    console.error('Cleanup old events error:', error);
    res.status(500).json({ error: error.message || 'Failed to cleanup old events' });
  }
}
