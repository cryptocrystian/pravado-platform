import { EventEmitter } from 'events';
import type { Competitor, IntelEvent, IntelTrend, CompetitorMetrics, CompetitorProfile, MarketTrendsSummary, CompetitiveDashboardData, GptCompetitorAnalysis, GptMarketAnalysis, CreateCompetitorInput, UpdateCompetitorInput, LogIntelEventInput, UpdateIntelEventInput, CreateTrendInput, CalculateCompetitorMetricsInput, GetCompetitorsInput, GetIntelFeedInput, GetTrendsInput, SummarizeCompetitorInput, SummarizeMarketInput, GetDashboardInput } from '@pravado/types';
export declare class CompetitiveIntelEngine extends EventEmitter {
    constructor();
    createCompetitor(input: CreateCompetitorInput): Promise<Competitor>;
    updateCompetitor(input: UpdateCompetitorInput): Promise<Competitor>;
    getCompetitors(input: GetCompetitorsInput): Promise<{
        competitors: Competitor[];
        total: number;
    }>;
    getCompetitorProfile(organizationId: string, competitorId: string): Promise<CompetitorProfile>;
    logIntelEvent(input: LogIntelEventInput): Promise<string>;
    updateIntelEvent(input: UpdateIntelEventInput): Promise<IntelEvent>;
    getIntelFeed(input: GetIntelFeedInput): Promise<{
        events: IntelEvent[];
        total: number;
    }>;
    calculateMetrics(input: CalculateCompetitorMetricsInput): Promise<CompetitorMetrics>;
    getCompetitorMetrics(organizationId: string, competitorId: string): Promise<{
        metrics: CompetitorMetrics[];
        total: number;
    }>;
    createTrend(input: CreateTrendInput): Promise<IntelTrend>;
    getTrends(input: GetTrendsInput): Promise<{
        trends: IntelTrend[];
        total: number;
    }>;
    getMarketTrends(organizationId: string, category: string, periodStart: string, periodEnd: string): Promise<MarketTrendsSummary>;
    summarizeCompetitor(input: SummarizeCompetitorInput): Promise<GptCompetitorAnalysis>;
    summarizeMarketTrends(input: SummarizeMarketInput): Promise<GptMarketAnalysis>;
    getDashboardSnapshot(input: GetDashboardInput): Promise<CompetitiveDashboardData>;
    private mapCompetitor;
    private mapIntelEvent;
    private mapIntelTrend;
    private mapCompetitorMetrics;
}
export declare const competitiveIntelEngine: CompetitiveIntelEngine;
//# sourceMappingURL=competitive-engine.d.ts.map