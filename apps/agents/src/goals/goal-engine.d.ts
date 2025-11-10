import { EventEmitter } from 'events';
import type { CampaignGoal, EnrichedCampaignGoal, CreateCampaignGoalInput, UpdateCampaignGoalInput, TrackAttributionEventInput, CalculateGoalProgressInput, SummarizeGoalPerformanceInput, GetGoalContextInput, CampaignGoalsOverview, AttributionMap, GoalPerformanceSummary, GoalContextForAgent } from '@pravado/types';
export declare class GoalEngine extends EventEmitter {
    createGoal(input: CreateCampaignGoalInput): Promise<CampaignGoal>;
    updateGoal(input: UpdateCampaignGoalInput): Promise<CampaignGoal>;
    getCampaignGoals(campaignId: string, organizationId: string): Promise<EnrichedCampaignGoal[]>;
    getGoal(goalId: string, organizationId: string): Promise<EnrichedCampaignGoal | null>;
    trackOutcomeEvent(input: TrackAttributionEventInput): Promise<string>;
    calculateGoalProgress(input: CalculateGoalProgressInput): Promise<void>;
    getAttributionMap(campaignId: string, organizationId: string): Promise<AttributionMap[]>;
    getCampaignGoalsOverview(campaignId: string, organizationId: string): Promise<CampaignGoalsOverview>;
    summarizeGoalPerformance(input: SummarizeGoalPerformanceInput): Promise<GoalPerformanceSummary>;
    private buildGoalSummaryPrompt;
    private calculateVelocityTrend;
    injectGoalContext(input: GetGoalContextInput): Promise<GoalContextForAgent>;
    private buildCriticalGoalsSummary;
    private buildStrategicDirective;
    private getEventTitle;
    private getEventDescription;
    private mapGoalFromDb;
    private mapOutcomeFromDb;
    private mapGoalSummaryFromDb;
    private enrichGoalWithOutcome;
    private mapAttributionEventFromDb;
}
export declare const goalEngine: GoalEngine;
//# sourceMappingURL=goal-engine.d.ts.map