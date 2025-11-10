import { EventEmitter } from 'events';
import type { Goal, GoalProgress, OkrSnapshot, GoalWithProgress, GoalMetrics, GoalTimeline, GoalDashboard, GptGoalSummary, AlignmentValidation, StretchGoalRecommendations, CreateGoalInput, UpdateGoalInput, LogGoalEventInput, UpdateGoalProgressInput, CalculateGoalMetricsInput, GenerateOkrSnapshotInput, SummarizeGoalInput, ValidateAlignmentInput, RecommendStretchGoalsInput, GetGoalsInput, GetGoalTimelineInput, GetGoalDashboardInput } from '@pravado/types';
declare class UnifiedGoalEngine extends EventEmitter {
    createGoal(input: CreateGoalInput): Promise<Goal>;
    updateGoal(input: UpdateGoalInput): Promise<Goal>;
    getGoals(input: GetGoalsInput): Promise<{
        goals: Goal[];
        total: number;
    }>;
    getGoalById(organizationId: string, goalId: string): Promise<GoalWithProgress>;
    logGoalEvent(input: LogGoalEventInput): Promise<string>;
    updateGoalProgress(input: UpdateGoalProgressInput): Promise<GoalProgress>;
    calculateGoalMetrics(input: CalculateGoalMetricsInput): Promise<GoalMetrics>;
    generateOkrSnapshot(input: GenerateOkrSnapshotInput): Promise<OkrSnapshot>;
    summarizeGoal(input: SummarizeGoalInput): Promise<GptGoalSummary>;
    validateAlignment(input: ValidateAlignmentInput): Promise<AlignmentValidation>;
    recommendStretchGoals(input: RecommendStretchGoalsInput): Promise<StretchGoalRecommendations>;
    getGoalTimeline(input: GetGoalTimelineInput): Promise<GoalTimeline>;
    getGoalDashboard(input: GetGoalDashboardInput): Promise<GoalDashboard>;
}
export declare const unifiedGoalEngine: UnifiedGoalEngine;
export {};
//# sourceMappingURL=unified-goal-engine.d.ts.map