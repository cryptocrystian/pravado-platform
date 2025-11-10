import type { TimelineEvent, EnrichedTimelineEvent, InsertTimelineEventInput, GetCampaignTimelineInput, GetGlobalTimelineInput, GetTimelineStatsInput, TimelineStats, TimelineEventDetails, SummarizeEventInput, SummarizeEventResult } from '@pravado/types';
export declare class TimelineEngine {
    logEvent(input: InsertTimelineEventInput): Promise<string>;
    private shouldGenerateAISummary;
    summarizeEvent(input: SummarizeEventInput): Promise<SummarizeEventResult>;
    private buildSummaryPrompt;
    getCampaignTimeline(input: GetCampaignTimelineInput): Promise<TimelineEvent[]>;
    getGlobalTimeline(input: GetGlobalTimelineInput): Promise<EnrichedTimelineEvent[]>;
    getTimelineStats(input: GetTimelineStatsInput): Promise<TimelineStats>;
    getEventDetails(eventId: string, organizationId: string): Promise<TimelineEventDetails | null>;
    cleanupOldEvents(retentionDays?: number, minImportance?: number): Promise<number>;
    logAgentRun(agentName: string, executionId: string, campaignId: string | undefined, organizationId: string, options: {
        status: 'success' | 'failure';
        tokensUsed?: number;
        durationMs: number;
        confidence?: number;
        result?: Record<string, unknown>;
        error?: string;
        relatedContactId?: string;
    }): Promise<string>;
    logFollowupSent(followupId: string, sequenceId: string, stepNumber: number, contactId: string, contactEmail: string, subject: string, campaignId: string | undefined, organizationId: string, messageId?: string): Promise<string>;
    logReviewSubmitted(reviewId: string, reviewType: string, priority: string, title: string, agentName: string, campaignId: string | undefined, organizationId: string, assignedTo?: string): Promise<string>;
    logDecisionMade(reviewId: string, decision: 'APPROVED' | 'REJECTED' | 'NEEDS_EDIT', userId: string, userName: string, feedback: string | undefined, campaignId: string | undefined, organizationId: string): Promise<string>;
    logCRMInteraction(interactionId: string, interactionType: string, channel: string, contactId: string, contactName: string, subject: string | undefined, campaignId: string | undefined, organizationId: string, userId?: string, userName?: string): Promise<string>;
    logTaskExecuted(taskId: string, taskType: string, agentName: string | undefined, status: 'success' | 'failure', durationMs: number, campaignId: string | undefined, organizationId: string, output?: Record<string, unknown>, error?: string): Promise<string>;
    private mapTimelineEvent;
    private mapEnrichedTimelineEvent;
}
export declare const timelineEngine: TimelineEngine;
//# sourceMappingURL=timeline-engine.d.ts.map