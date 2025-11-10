import { EventEmitter } from 'events';
import type { LeadScore, LeadScoreSummary, LeadPerformanceSummary, LeadTrendResult, RecalculateLeadScoreInput, UpdateLeadStageInput, AutoQualifyInput, SummarizeLeadPerformanceInput, TopLeadsResult, QualifiedLeadsResult, DisqualifiedLeadsResult } from '@pravado/types';
export declare class LeadScoringEngine extends EventEmitter {
    calculateLeadScore(input: RecalculateLeadScoreInput): Promise<LeadScore>;
    getLeadScore(contactId: string, campaignId: string | undefined, organizationId: string): Promise<LeadScore | null>;
    updateStage(input: UpdateLeadStageInput): Promise<boolean>;
    autoQualify(input: AutoQualifyInput): Promise<boolean>;
    getLeadScoreSummary(campaignId: string, organizationId: string): Promise<LeadScoreSummary>;
    getLeadTrends(contactId: string, organizationId: string): Promise<LeadTrendResult>;
    summarizeLeadPerformance(input: SummarizeLeadPerformanceInput): Promise<LeadPerformanceSummary>;
    private buildPerformanceSummaryPrompt;
    getTopLeads(campaignId: string, organizationId: string, limit?: number): Promise<TopLeadsResult>;
    getQualifiedLeads(organizationId: string, campaignId?: string): Promise<QualifiedLeadsResult>;
    getDisqualifiedLeads(organizationId: string, campaignId?: string): Promise<DisqualifiedLeadsResult>;
    private mapLeadScoreFromDb;
}
export declare const leadScoringEngine: LeadScoringEngine;
//# sourceMappingURL=lead-engine.d.ts.map