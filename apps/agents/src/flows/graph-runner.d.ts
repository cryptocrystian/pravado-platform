import { EventEmitter } from 'events';
import type { ExecutionSummary, TaskExecutionResult, GraphRunnerConfig } from '@pravado/types';
export declare class GraphRunner extends EventEmitter {
    private campaignId;
    private organizationId;
    private parallelism;
    private retryPolicy;
    private pollIntervalMs;
    private timeoutMs;
    private graph;
    private runningTasks;
    private isRunning;
    private startTime;
    private pollTimer;
    constructor(config: GraphRunnerConfig);
    loadGraph(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private executionLoop;
    executeReadyTasks(): Promise<void>;
    private executeTask;
    private runTask;
    handleTaskResult(nodeId: string, result: TaskExecutionResult): Promise<void>;
    retryFailedTask(nodeId: string): Promise<void>;
    skipBlockedTask(nodeId: string, reason?: string): Promise<void>;
    getExecutionSummary(): Promise<ExecutionSummary>;
    private updateTaskStatus;
    private propagateStatus;
    private getDependencyOutputs;
    private recordExecution;
    private transformNode;
    private emitGraphEvent;
    private storeSuccessMemory;
    private storeErrorMemory;
}
//# sourceMappingURL=graph-runner.d.ts.map