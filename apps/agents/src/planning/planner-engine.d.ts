import type { AgentGoal, AgentTask, ExecutionGraph, PlanningRequest, PlanningResult, TaskExecutionResult, GraphTraversalOptions, GraphExecutionProgress } from '@pravado/types';
export declare class PlannerEngine {
    planTasksFromGoal(request: PlanningRequest): Promise<PlanningResult>;
    private generateExecutionGraph;
    private calculateGraphDepth;
    executeTaskNode(task: AgentTask, goal: AgentGoal, context: Record<string, any>): Promise<TaskExecutionResult>;
    traverseExecutionGraph(goal: AgentGoal, graph: ExecutionGraph, options?: GraphTraversalOptions): Promise<GraphExecutionProgress>;
    private mapToAgentTask;
}
export declare const plannerEngine: PlannerEngine;
//# sourceMappingURL=planner-engine.d.ts.map