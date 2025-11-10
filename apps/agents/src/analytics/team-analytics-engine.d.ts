import { EventEmitter } from 'events';
import type { LogTeamEventInput, CalculateMetricsInput, DetectAnomaliesInput, GetActivityFeedInput, GetBehaviorMetricsInput, GetAnomaliesInput, SummarizeTeamPatternsInput, RecommendCoachingInput, ResolveAnomalyInput, TeamBehaviorMetrics, BehavioralAnomaly, TeamActivityFeedResult, BehaviorMetricsResult, AnomaliesResult, TeamSummary, GptTeamPatternSummary, CoachingOpportunity, PerformanceTrend } from '@pravado/types';
export declare class TeamAnalyticsEngine extends EventEmitter {
    constructor();
    logTeamEvent(input: LogTeamEventInput): Promise<string>;
    calculateBehaviorMetrics(input: CalculateMetricsInput): Promise<TeamBehaviorMetrics>;
    calculateMetricsForAllUsers(organizationId: string, periodStart: string, periodEnd: string, windowType?: 'daily' | 'weekly' | 'monthly'): Promise<void>;
    detectBehavioralAnomalies(input: DetectAnomaliesInput): Promise<BehavioralAnomaly[]>;
    detectAnomaliesForAllUsers(organizationId: string, detectionWindowStart: string, detectionWindowEnd: string): Promise<void>;
    resolveAnomaly(input: ResolveAnomalyInput): Promise<BehavioralAnomaly>;
    getTeamActivityFeed(input: GetActivityFeedInput): Promise<TeamActivityFeedResult>;
    getBehaviorMetrics(input: GetBehaviorMetricsInput): Promise<BehaviorMetricsResult>;
    getAnomalies(input: GetAnomaliesInput): Promise<AnomaliesResult>;
    private getAnomaliesByIds;
    summarizeTeamPatterns(input: SummarizeTeamPatternsInput): Promise<{
        summary: GptTeamPatternSummary;
        teamSummary: TeamSummary;
    }>;
    recommendCoachingOpportunities(input: RecommendCoachingInput): Promise<CoachingOpportunity[]>;
    getPerformanceTrend(organizationId: string, userId: string, periodStart: string, periodEnd: string): Promise<PerformanceTrend>;
    private mapTeamActivityEvent;
    private mapBehaviorMetrics;
    private mapBehavioralAnomaly;
}
export declare const teamAnalyticsEngine: TeamAnalyticsEngine;
//# sourceMappingURL=team-analytics-engine.d.ts.map