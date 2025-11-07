// =====================================================
// TIMELINE ENGINE - Unified Activity Feed
// =====================================================

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  TimelineEvent,
  EnrichedTimelineEvent,
  InsertTimelineEventInput,
  GetCampaignTimelineInput,
  GetGlobalTimelineInput,
  GetTimelineStatsInput,
  TimelineStats,
  TimelineEventDetails,
  SummarizeEventInput,
  SummarizeEventResult,
  TimelineEventType,
  TimelineEntityType,
} from '@pravado/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// TIMELINE ENGINE
// =====================================================

export class TimelineEngine {
  /**
   * Log a timeline event
   */
  async logEvent(input: InsertTimelineEventInput): Promise<string> {
    // Generate AI summary if needed and metadata is complex
    let summary = input.summary;
    let details = input.details;
    let importanceScore = input.importanceScore || 0.5;

    // For certain event types, use AI to generate better summaries
    if (this.shouldGenerateAISummary(input.eventType)) {
      try {
        const aiSummary = await this.summarizeEvent({
          eventType: input.eventType,
          entityType: input.entityType,
          metadata: input.metadata || {},
          actorName: input.actorName,
          status: input.status,
        });

        summary = aiSummary.summary;
        details = aiSummary.details || details;
        importanceScore = aiSummary.importanceScore;
      } catch (error) {
        console.error('[TimelineEngine] Failed to generate AI summary:', error);
        // Fall back to provided summary
      }
    }

    // Insert event
    const { data, error } = await supabase.rpc('insert_timeline_event', {
      p_campaign_id: input.campaignId || null,
      p_event_type: input.eventType,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_summary: summary,
      p_details: details || null,
      p_metadata: input.metadata || {},
      p_actor_type: input.actorType || null,
      p_actor_id: input.actorId || null,
      p_actor_name: input.actorName || null,
      p_status: input.status || null,
      p_importance_score: importanceScore,
      p_related_contact_id: input.relatedContactId || null,
      p_related_user_id: input.relatedUserId || null,
      p_organization_id: input.organizationId,
      p_timestamp: input.timestamp || new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to insert timeline event: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Determine if event should use AI summarization
   */
  private shouldGenerateAISummary(eventType: TimelineEventType): boolean {
    const aiSummaryTypes: TimelineEventType[] = [
      'INSIGHT_GENERATED',
      'DECISION_MADE',
      'AGENT_RUN',
      'REVIEW_SUBMITTED',
      'GOAL_COMPLETED',
    ];

    return aiSummaryTypes.includes(eventType);
  }

  /**
   * Generate AI-powered summary for event
   */
  async summarizeEvent(input: SummarizeEventInput): Promise<SummarizeEventResult> {
    const prompt = this.buildSummaryPrompt(input);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at creating concise, clear summaries of campaign events. Create a 1-2 sentence summary that captures the key information. Also provide a brief details section (2-3 sentences) and an importance score from 0.0 to 1.0.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 300,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content) as {
      summary: string;
      details?: string;
      importanceScore: number;
    };

    return {
      summary: result.summary,
      details: result.details,
      importanceScore: Math.min(Math.max(result.importanceScore, 0.0), 1.0),
    };
  }

  /**
   * Build prompt for AI summarization
   */
  private buildSummaryPrompt(input: SummarizeEventInput): string {
    let prompt = `Event Type: ${input.eventType}\n`;
    prompt += `Entity Type: ${input.entityType}\n`;
    if (input.actorName) {
      prompt += `Actor: ${input.actorName}\n`;
    }
    if (input.status) {
      prompt += `Status: ${input.status}\n`;
    }
    prompt += `\nMetadata:\n${JSON.stringify(input.metadata, null, 2)}\n\n`;
    prompt += `Please provide:\n`;
    prompt += `1. A concise summary (1-2 sentences)\n`;
    prompt += `2. Brief details (2-3 sentences) explaining what happened\n`;
    prompt += `3. An importance score from 0.0 (routine) to 1.0 (critical)\n\n`;
    prompt += `Return as JSON with keys: summary, details, importanceScore`;

    return prompt;
  }

  /**
   * Get campaign timeline
   */
  async getCampaignTimeline(
    input: GetCampaignTimelineInput
  ): Promise<TimelineEvent[]> {
    const { data, error } = await supabase.rpc('get_campaign_timeline', {
      p_campaign_id: input.campaignId,
      p_organization_id: input.organizationId,
      p_limit: input.limit || 50,
      p_offset: input.offset || 0,
      p_event_types: input.eventTypes || null,
      p_start_date: input.startDate || null,
      p_end_date: input.endDate || null,
    });

    if (error) {
      throw new Error(`Failed to get campaign timeline: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapTimelineEvent(row));
  }

  /**
   * Get global timeline
   */
  async getGlobalTimeline(
    input: GetGlobalTimelineInput
  ): Promise<EnrichedTimelineEvent[]> {
    const { data, error } = await supabase.rpc('get_global_timeline', {
      p_organization_id: input.organizationId,
      p_limit: input.limit || 50,
      p_offset: input.offset || 0,
      p_campaign_ids: input.campaignIds || null,
      p_event_types: input.eventTypes || null,
      p_entity_types: input.entityTypes || null,
      p_actor_ids: input.actorIds || null,
      p_start_date: input.startDate || null,
      p_end_date: input.endDate || null,
      p_min_importance: input.minImportance || null,
    });

    if (error) {
      throw new Error(`Failed to get global timeline: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapEnrichedTimelineEvent(row));
  }

  /**
   * Get timeline statistics
   */
  async getTimelineStats(input: GetTimelineStatsInput): Promise<TimelineStats> {
    const { data, error } = await supabase.rpc('get_timeline_stats', {
      p_organization_id: input.organizationId,
      p_campaign_id: input.campaignId || null,
      p_start_date: input.startDate || null,
      p_end_date: input.endDate || null,
    });

    if (error) {
      throw new Error(`Failed to get timeline stats: ${error.message}`);
    }

    return data as TimelineStats;
  }

  /**
   * Get event details
   */
  async getEventDetails(
    eventId: string,
    organizationId: string
  ): Promise<TimelineEventDetails | null> {
    const { data, error } = await supabase.rpc('get_timeline_event_details', {
      p_event_id: eventId,
      p_organization_id: organizationId,
    });

    if (error) {
      throw new Error(`Failed to get event details: ${error.message}`);
    }

    return data as TimelineEventDetails | null;
  }

  /**
   * Cleanup old events
   */
  async cleanupOldEvents(
    retentionDays: number = 90,
    minImportance: number = 0.3
  ): Promise<number> {
    const { data, error } = await supabase.rpc('cleanup_old_timeline_events', {
      p_retention_days: retentionDays,
      p_min_importance: minImportance,
    });

    if (error) {
      throw new Error(`Failed to cleanup old events: ${error.message}`);
    }

    return data as number;
  }

  // =====================================================
  // CONVENIENCE METHODS
  // =====================================================

  /**
   * Log agent run event
   */
  async logAgentRun(
    agentName: string,
    executionId: string,
    campaignId: string | undefined,
    organizationId: string,
    options: {
      status: 'success' | 'failure';
      tokensUsed?: number;
      durationMs: number;
      confidence?: number;
      result?: Record<string, unknown>;
      error?: string;
      relatedContactId?: string;
    }
  ): Promise<string> {
    return this.logEvent({
      campaignId,
      eventType: options.status === 'success' ? 'AGENT_RUN' : 'FAILURE',
      entityType: 'AGENT',
      entityId: executionId,
      summary: `${agentName} ${options.status === 'success' ? 'completed successfully' : 'failed'}`,
      metadata: {
        agentName,
        executionId,
        tokensUsed: options.tokensUsed,
        durationMs: options.durationMs,
        confidence: options.confidence,
        result: options.result,
        error: options.error,
      },
      actorType: 'agent',
      actorId: agentName,
      actorName: agentName,
      status: options.status,
      importanceScore: options.status === 'failure' ? 0.8 : 0.5,
      relatedContactId: options.relatedContactId,
      organizationId,
    });
  }

  /**
   * Log followup sent event
   */
  async logFollowupSent(
    followupId: string,
    sequenceId: string,
    stepNumber: number,
    contactId: string,
    contactEmail: string,
    subject: string,
    campaignId: string | undefined,
    organizationId: string,
    messageId?: string
  ): Promise<string> {
    return this.logEvent({
      campaignId,
      eventType: 'FOLLOWUP_SENT',
      entityType: 'FOLLOWUP',
      entityId: followupId,
      summary: `Follow-up email sent to ${contactEmail}`,
      details: `Step ${stepNumber}: ${subject}`,
      metadata: {
        followupId,
        sequenceId,
        stepNumber,
        contactEmail,
        subject,
        messageId,
      },
      actorType: 'system',
      actorId: 'followup-engine',
      actorName: 'Followup Engine',
      status: 'success',
      importanceScore: 0.6,
      relatedContactId: contactId,
      organizationId,
    });
  }

  /**
   * Log review submitted event
   */
  async logReviewSubmitted(
    reviewId: string,
    reviewType: string,
    priority: string,
    title: string,
    agentName: string,
    campaignId: string | undefined,
    organizationId: string,
    assignedTo?: string
  ): Promise<string> {
    return this.logEvent({
      campaignId,
      eventType: 'REVIEW_SUBMITTED',
      entityType: 'REVIEW',
      entityId: reviewId,
      summary: `${agentName} submitted ${reviewType} for review`,
      details: title,
      metadata: {
        reviewId,
        reviewType,
        priority,
        assignedTo,
      },
      actorType: 'agent',
      actorId: agentName,
      actorName: agentName,
      status: 'pending',
      importanceScore: priority === 'HIGH' || priority === 'CRITICAL' ? 0.9 : 0.6,
      organizationId,
    });
  }

  /**
   * Log decision made event
   */
  async logDecisionMade(
    reviewId: string,
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_EDIT',
    userId: string,
    userName: string,
    feedback: string | undefined,
    campaignId: string | undefined,
    organizationId: string
  ): Promise<string> {
    return this.logEvent({
      campaignId,
      eventType: 'DECISION_MADE',
      entityType: 'DECISION',
      entityId: reviewId,
      summary: `${userName} ${decision.toLowerCase()} review`,
      details: feedback,
      metadata: {
        reviewId,
        decision,
        feedback,
      },
      actorType: 'user',
      actorId: userId,
      actorName: userName,
      status: 'success',
      importanceScore: 0.7,
      relatedUserId: userId,
      organizationId,
    });
  }

  /**
   * Log CRM interaction event
   */
  async logCRMInteraction(
    interactionId: string,
    interactionType: string,
    channel: string,
    contactId: string,
    contactName: string,
    subject: string | undefined,
    campaignId: string | undefined,
    organizationId: string,
    userId?: string,
    userName?: string
  ): Promise<string> {
    return this.logEvent({
      campaignId,
      eventType: 'CRM_INTERACTION',
      entityType: 'INTERACTION',
      entityId: interactionId,
      summary: `${interactionType} with ${contactName} via ${channel}`,
      details: subject,
      metadata: {
        interactionType,
        channel,
        subject,
      },
      actorType: userId ? 'user' : 'system',
      actorId: userId || 'system',
      actorName: userName || 'System',
      status: 'success',
      importanceScore: 0.5,
      relatedContactId: contactId,
      relatedUserId: userId,
      organizationId,
    });
  }

  /**
   * Log task executed event
   */
  async logTaskExecuted(
    taskId: string,
    taskType: string,
    agentName: string | undefined,
    status: 'success' | 'failure',
    durationMs: number,
    campaignId: string | undefined,
    organizationId: string,
    output?: Record<string, unknown>,
    error?: string
  ): Promise<string> {
    return this.logEvent({
      campaignId,
      eventType: 'TASK_EXECUTED',
      entityType: 'TASK',
      entityId: taskId,
      summary: `${taskType} ${status === 'success' ? 'completed' : 'failed'}`,
      metadata: {
        taskId,
        taskType,
        durationMs,
        output,
        error,
      },
      actorType: agentName ? 'agent' : 'system',
      actorId: agentName || 'system',
      actorName: agentName || 'System',
      status,
      importanceScore: status === 'failure' ? 0.7 : 0.5,
      organizationId,
    });
  }

  // =====================================================
  // MAPPERS
  // =====================================================

  private mapTimelineEvent(row: any): TimelineEvent {
    return {
      id: row.event_id,
      campaignId: row.campaign_id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      details: row.details,
      metadata: row.metadata || {},
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorName: row.actor_name,
      status: row.status,
      importanceScore: parseFloat(row.importance_score),
      relatedContactId: row.related_contact_id,
      relatedUserId: row.related_user_id,
      createdAt: row.created_at,
      organizationId: row.organization_id,
    };
  }

  private mapEnrichedTimelineEvent(row: any): EnrichedTimelineEvent {
    const baseEvent = this.mapTimelineEvent(row);

    return {
      ...baseEvent,
      campaignName: row.campaign_name,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const timelineEngine = new TimelineEngine();
