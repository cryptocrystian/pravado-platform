// =====================================================
// NOTIFICATION SERVICE
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export type EventType =
  | 'provider_disabled'
  | 'provider_enabled'
  | 'budget_breach'
  | 'policy_adapted'
  | 'cache_cleanup'
  | 'circuit_breaker_triggered'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'usage_threshold_80'
  | 'usage_threshold_100';

export type Severity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface AIEvent {
  id: string;
  organizationId?: string;
  eventType: EventType;
  severity: Severity;
  title: string;
  message: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export async function logAIEvent(
  eventType: EventType,
  title: string,
  message: string,
  options?: {
    organizationId?: string;
    severity?: Severity;
    metadata?: Record<string, any>;
    relatedProvider?: string;
    relatedModel?: string;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_ops_events')
      .insert({
        organization_id: options?.organizationId,
        event_type: eventType,
        severity: options?.severity || 'info',
        title,
        message,
        metadata: options?.metadata || {},
        actor_type: 'system',
        related_provider: options?.relatedProvider,
        related_model: options?.relatedModel,
      })
      .select()
      .single();

    if (error) {
      logger.error('[Notification] Failed to log event', error);
      return null;
    }

    logger.info('[Notification] Event logged', {
      eventId: data.id,
      eventType,
      severity: options?.severity,
    });

    return data.id;
  } catch (error) {
    logger.error('[Notification] Exception logging event', error);
    return null;
  }
}

export async function getRecentEvents(
  organizationId: string,
  limit: number = 50,
  minSeverity: Severity = 'info'
): Promise<AIEvent[]> {
  try {
    const { data, error } = await supabase.rpc('get_recent_events', {
      org_id: organizationId,
      limit_count: limit,
      min_severity: minSeverity,
    });

    if (error) {
      logger.error('[Notification] Failed to get events', error);
      return [];
    }

    return (data || []).map((e: any) => ({
      id: e.id,
      organizationId: e.organization_id,
      eventType: e.event_type,
      severity: e.severity,
      title: e.title,
      message: e.message,
      metadata: e.metadata || {},
      createdAt: new Date(e.created_at),
    }));
  } catch (error) {
    logger.error('[Notification] Exception getting events', error);
    return [];
  }
}
