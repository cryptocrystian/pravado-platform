import type { AgentTask, TaskStatus } from '@pravado/types';
export declare enum TaskCategory {
    RESEARCH = "RESEARCH",
    WRITE = "WRITE",
    ANALYZE = "ANALYZE",
    OUTREACH = "OUTREACH",
    PLAN = "PLAN",
    REVIEW = "REVIEW"
}
export declare class TaskResolver {
    categorizeTask(task: AgentTask): TaskCategory;
    getAgentForCategory(category: TaskCategory): string;
    canExecuteTask(taskId: string): Promise<boolean>;
    getNextExecutableTasks(goalId: string, limit?: number): Promise<AgentTask[]>;
    updateTaskStatus(taskId: string, status: TaskStatus, outputData?: any): Promise<void>;
    private mapToAgentTask;
}
export declare const taskResolver: TaskResolver;
//# sourceMappingURL=task-resolver.d.ts.map