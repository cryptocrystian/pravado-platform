import type { AgentGoal, GoalStatus, GoalSummary } from '@pravado/types';
export declare class GoalMonitor {
    getGoalSummary(goalId: string, organizationId: string): Promise<GoalSummary | null>;
    checkGoalCompletion(goalId: string, organizationId: string): Promise<boolean>;
    updateGoalStatus(goalId: string, status: GoalStatus, failureReason?: string): Promise<void>;
    logReasoningTrace(taskId: string, agentId: string, reasoning: string, organizationId: string): Promise<void>;
    getGoalProgress(goalId: string, organizationId: string): Promise<number>;
    getGoal(goalId: string, organizationId: string): Promise<AgentGoal | null>;
    requiresApproval(goalId: string): Promise<boolean>;
    approveGoal(goalId: string, approvedBy: string): Promise<void>;
    private mapToAgentGoal;
}
export declare const goalMonitor: GoalMonitor;
//# sourceMappingURL=goal-monitor.d.ts.map