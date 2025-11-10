import { EventEmitter } from 'events';
import type { GeneratedReport, MetricsSnapshot, GenerateReportInput } from '@pravado/types';
export declare class ReportEngine extends EventEmitter {
    generateCampaignReport(input: GenerateReportInput): Promise<GeneratedReport>;
    private getMetricsSnapshot;
    private generateExecutiveSummary;
    summarizePerformanceTrends(metrics: MetricsSnapshot, input: GenerateReportInput): Promise<string>;
    summarizeAgentEffectiveness(metrics: MetricsSnapshot, input: GenerateReportInput): Promise<string>;
    private summarizeSentimentTrends;
    generateStrategyInsights(metrics: MetricsSnapshot, input: GenerateReportInput): Promise<string>;
    private buildExecutiveSummaryPrompt;
    private buildPerformanceTrendsPrompt;
    private buildAgentEffectivenessPrompt;
    private buildSentimentTrendsPrompt;
    private buildStrategyInsightsPrompt;
    private buildReportSections;
    private formatMetricsOverview;
    private extractKeyFindings;
    private extractRecommendations;
    private generateCharts;
    getReport(reportId: string, organizationId: string): Promise<GeneratedReport | null>;
    getLatestCampaignReport(campaignId: string, organizationId: string): Promise<GeneratedReport | null>;
    retryReport(reportId: string, organizationId: string): Promise<GeneratedReport>;
    private mapReportFromDb;
}
export declare const reportEngine: ReportEngine;
//# sourceMappingURL=report-engine.d.ts.map