import { EventEmitter } from 'events';
import type { ChannelRecommendation, ContactChannelProfile, CampaignChannelStats, SentimentTrend, LogEngagementInput, AnalyzeSentimentInput, GetChannelRecommendationsInput, SummarizeSentimentTrendsInput, SentimentAnalysisResult, BestTimeToContact, SentimentTrendSummary, ChannelType } from '@pravado/types';
export declare class ChannelEngine extends EventEmitter {
    logEngagement(input: LogEngagementInput): Promise<string>;
    analyzeSentiment(input: AnalyzeSentimentInput): Promise<SentimentAnalysisResult>;
    private buildSentimentPrompt;
    getBestChannelForContact(input: GetChannelRecommendationsInput): Promise<ChannelRecommendation[]>;
    private recommendTone;
    getContactChannelProfile(contactId: string, organizationId: string): Promise<ContactChannelProfile>;
    getCampaignChannelStats(campaignId: string, organizationId: string): Promise<CampaignChannelStats>;
    getSentimentTrends(contactId: string, organizationId: string, channelType?: ChannelType): Promise<SentimentTrend[]>;
    summarizeSentimentTrends(input: SummarizeSentimentTrendsInput): Promise<SentimentTrendSummary>;
    private buildSentimentSummaryPrompt;
    getBestTimeToContact(contactId: string, organizationId: string): Promise<BestTimeToContact[]>;
    private formatTimeRationale;
    private calculateSentimentTrend;
    private mapEngagementFromDb;
    private mapPerformanceFromDb;
}
export declare const channelEngine: ChannelEngine;
//# sourceMappingURL=channel-engine.d.ts.map