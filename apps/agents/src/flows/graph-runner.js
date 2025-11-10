"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRunner = void 0;
const events_1 = require("events");
const supabase_1 = require("../lib/supabase");
const agent_runner_1 = require("../framework/agent-runner");
const memory_engine_1 = require("../memory/memory-engine");
const DEFAULT_RETRY_POLICY = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};
class GraphRunner extends events_1.EventEmitter {
    campaignId;
    organizationId;
    parallelism;
    retryPolicy;
    pollIntervalMs;
    timeoutMs;
    graph = new Map();
    runningTasks = new Set();
    isRunning = false;
    startTime = null;
    pollTimer = null;
    constructor(config) {
        super();
        this.campaignId = config.campaignId;
        this.organizationId = config.organizationId;
        this.parallelism = config.parallelism || 5;
        this.retryPolicy = config.retryPolicy || DEFAULT_RETRY_POLICY;
        this.pollIntervalMs = config.pollIntervalMs || 2000;
        this.timeoutMs = config.timeoutMs || 3600000;
    }
    async loadGraph() {
        try {
            const { data, error } = await supabase_1.supabase
                .from('campaign_task_graph')
                .select('*')
                .eq('campaign_id', this.campaignId)
                .eq('organization_id', this.organizationId)
                .order('created_at');
            if (error) {
                throw new Error(`Failed to load graph: ${error.message}`);
            }
            this.graph.clear();
            (data || []).forEach((node) => {
                this.graph.set(node.node_id, this.transformNode(node));
            });
            this.emit('graph-loaded', {
                campaignId: this.campaignId,
                nodeCount: this.graph.size,
            });
        }
        catch (error) {
            console.error('GraphRunner.loadGraph error:', error);
            throw error;
        }
    }
    async start() {
        if (this.isRunning) {
            throw new Error('Execution already running');
        }
        this.isRunning = true;
        this.startTime = Date.now();
        this.emit('execution-started', {
            campaignId: this.campaignId,
            timestamp: new Date(),
        });
        this.executionLoop();
    }
    async stop() {
        this.isRunning = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        this.emit('execution-stopped', {
            campaignId: this.campaignId,
            timestamp: new Date(),
        });
    }
    async executionLoop() {
        try {
            if (this.startTime && Date.now() - this.startTime > this.timeoutMs) {
                this.emit('execution-timeout', {
                    campaignId: this.campaignId,
                    elapsed: Date.now() - this.startTime,
                });
                await this.stop();
                return;
            }
            await this.executeReadyTasks();
            const summary = await this.getExecutionSummary();
            if (summary.isComplete) {
                this.emitGraphEvent({
                    type: summary.hasFailures ? 'graph-failed' : 'graph-completed',
                    campaignId: this.campaignId,
                    data: summary,
                    timestamp: new Date(),
                });
                await this.stop();
                return;
            }
            if (this.isRunning) {
                this.pollTimer = setTimeout(() => this.executionLoop(), this.pollIntervalMs);
            }
        }
        catch (error) {
            console.error('Execution loop error:', error);
            this.emit('execution-error', { error, campaignId: this.campaignId });
            await this.stop();
        }
    }
    async executeReadyTasks() {
        try {
            const { data, error } = await supabase_1.supabase.rpc('get_executable_tasks', {
                p_campaign_id: this.campaignId,
                p_organization_id: this.organizationId,
            });
            if (error) {
                throw new Error(`Failed to get executable tasks: ${error.message}`);
            }
            const executableTasks = (data || []).map((row) => ({
                id: row.id,
                nodeId: row.node_id,
                taskType: row.task_type,
                agentType: row.agent_type,
                metadata: row.metadata,
                config: row.config,
                dependsOn: row.depends_on || [],
                retryCount: row.retry_count || 0,
                maxRetries: row.max_retries || 3,
            }));
            const tasksToRun = executableTasks.filter((task) => !this.runningTasks.has(task.nodeId));
            const availableSlots = this.parallelism - this.runningTasks.size;
            const tasksToStart = tasksToRun.slice(0, availableSlots);
            for (const task of tasksToStart) {
                this.executeTask(task).catch((error) => {
                    console.error(`Task execution error for ${task.nodeId}:`, error);
                });
            }
        }
        catch (error) {
            console.error('GraphRunner.executeReadyTasks error:', error);
            throw error;
        }
    }
    async executeTask(task) {
        const nodeId = task.nodeId;
        this.runningTasks.add(nodeId);
        try {
            await this.updateTaskStatus(nodeId, 'RUNNING');
            this.emitGraphEvent({
                type: 'task-started',
                campaignId: this.campaignId,
                nodeId,
                status: 'RUNNING',
                timestamp: new Date(),
            });
            const dependencyOutputs = await this.getDependencyOutputs(task.dependsOn);
            const context = {
                campaignId: this.campaignId,
                nodeId,
                taskType: task.taskType,
                agentType: task.agentType,
                metadata: task.metadata,
                config: task.config,
                attemptNumber: task.retryCount + 1,
                isRetry: task.retryCount > 0,
                dependencyOutputs,
                organizationId: this.organizationId,
            };
            const startTime = Date.now();
            const result = await this.runTask(context);
            const durationMs = Date.now() - startTime;
            await this.recordExecution({
                graphNodeId: task.id,
                campaignId: this.campaignId,
                nodeId,
                agentId: task.agentType || undefined,
                status: result.status,
                input: context,
                output: result.output,
                errorMessage: result.error,
                errorStack: result.errorStack,
                attemptNumber: context.attemptNumber,
                isRetry: context.isRetry,
                startedAt: new Date(startTime),
                completedAt: new Date(),
                durationMs,
                organizationId: this.organizationId,
            });
            await this.handleTaskResult(nodeId, result);
        }
        catch (error) {
            console.error(`Task execution failed for ${nodeId}:`, error);
            await this.handleTaskResult(nodeId, {
                nodeId,
                status: 'FAILED',
                error: error.message,
                errorStack: error.stack,
                durationMs: 0,
            });
        }
        finally {
            this.runningTasks.delete(nodeId);
        }
    }
    async runTask(context) {
        try {
            if (!context.agentType) {
                return {
                    nodeId: context.nodeId,
                    status: 'COMPLETED',
                    output: { message: 'No-op task completed' },
                    durationMs: 0,
                };
            }
            const agentConfig = {
                agentName: context.agentType,
                agentType: context.agentType,
                systemPrompt: context.config?.systemPrompt || `You are a ${context.agentType} agent executing task: ${context.taskType}`,
                prompt: context.config?.prompt || `Execute ${context.taskType} task for node ${context.nodeId}`,
                outputSchema: context.config?.outputSchema || {},
                tools: context.config?.tools || [],
                contextSources: context.config?.contextSources || [],
                temperature: context.config?.temperature || 0.7,
                maxTokens: context.config?.maxTokens || 4000,
            };
            const input = {
                taskType: context.taskType,
                nodeId: context.nodeId,
                metadata: context.metadata,
                dependencyOutputs: context.dependencyOutputs,
                ...context.config?.input,
            };
            const agentContext = {
                organizationId: context.organizationId,
                campaignId: context.campaignId,
                taskNodeId: context.nodeId,
                attemptNumber: context.attemptNumber,
                isRetry: context.isRetry,
                ...context.metadata,
            };
            const agentResult = await (0, agent_runner_1.runAgent)(agentConfig, input, agentContext);
            if (!agentResult.success) {
                return {
                    nodeId: context.nodeId,
                    status: 'FAILED',
                    error: agentResult.error || 'Agent execution failed',
                    durationMs: agentResult.executionTimeMs || 0,
                };
            }
            return {
                nodeId: context.nodeId,
                status: 'COMPLETED',
                output: agentResult.data,
                durationMs: agentResult.executionTimeMs || 0,
            };
        }
        catch (error) {
            return {
                nodeId: context.nodeId,
                status: 'FAILED',
                error: error.message,
                errorStack: error.stack,
                durationMs: 0,
            };
        }
    }
    async handleTaskResult(nodeId, result) {
        try {
            if (result.status === 'COMPLETED') {
                await this.propagateStatus(nodeId, 'COMPLETED', result.output);
                await this.storeSuccessMemory(nodeId, result);
                this.emitGraphEvent({
                    type: 'task-completed',
                    campaignId: this.campaignId,
                    nodeId,
                    status: 'COMPLETED',
                    data: result.output,
                    timestamp: new Date(),
                });
            }
            else if (result.status === 'FAILED') {
                const node = this.graph.get(nodeId);
                if (node && node.retryCount < node.maxRetries) {
                    await this.retryFailedTask(nodeId);
                }
                else {
                    await this.propagateStatus(nodeId, 'FAILED', undefined, result.error);
                    await this.storeErrorMemory(nodeId, result);
                    this.emitGraphEvent({
                        type: 'task-failed',
                        campaignId: this.campaignId,
                        nodeId,
                        status: 'FAILED',
                        data: { error: result.error },
                        timestamp: new Date(),
                    });
                }
            }
        }
        catch (error) {
            console.error('GraphRunner.handleTaskResult error:', error);
            throw error;
        }
    }
    async retryFailedTask(nodeId) {
        try {
            const node = this.graph.get(nodeId);
            if (!node) {
                throw new Error(`Node ${nodeId} not found`);
            }
            const delay = Math.min(this.retryPolicy.initialDelayMs *
                Math.pow(this.retryPolicy.backoffMultiplier, node.retryCount), this.retryPolicy.maxDelayMs);
            this.emitGraphEvent({
                type: 'task-retrying',
                campaignId: this.campaignId,
                nodeId,
                data: {
                    attemptNumber: node.retryCount + 1,
                    delayMs: delay,
                },
                timestamp: new Date(),
            });
            await new Promise((resolve) => setTimeout(resolve, delay));
            const { data, error } = await supabase_1.supabase.rpc('reset_task_for_retry', {
                p_campaign_id: this.campaignId,
                p_node_id: nodeId,
                p_organization_id: this.organizationId,
            });
            if (error) {
                throw new Error(`Failed to reset task: ${error.message}`);
            }
            if (!data) {
                throw new Error('Max retries exceeded');
            }
            await this.loadGraph();
        }
        catch (error) {
            console.error('GraphRunner.retryFailedTask error:', error);
            throw error;
        }
    }
    async skipBlockedTask(nodeId, reason) {
        try {
            const { data, error } = await supabase_1.supabase.rpc('skip_task', {
                p_campaign_id: this.campaignId,
                p_node_id: nodeId,
                p_organization_id: this.organizationId,
                p_reason: reason || 'Task skipped',
            });
            if (error) {
                throw new Error(`Failed to skip task: ${error.message}`);
            }
            this.emitGraphEvent({
                type: 'task-skipped',
                campaignId: this.campaignId,
                nodeId,
                status: 'SKIPPED',
                data: { reason },
                timestamp: new Date(),
            });
            await this.loadGraph();
        }
        catch (error) {
            console.error('GraphRunner.skipBlockedTask error:', error);
            throw error;
        }
    }
    async getExecutionSummary() {
        try {
            const { data, error } = await supabase_1.supabase.rpc('get_execution_summary', {
                p_campaign_id: this.campaignId,
                p_organization_id: this.organizationId,
            });
            if (error) {
                throw new Error(`Failed to get execution summary: ${error.message}`);
            }
            return {
                campaignId: data.campaign_id,
                totalTasks: data.total_tasks,
                pending: data.pending,
                running: data.running,
                completed: data.completed,
                failed: data.failed,
                blocked: data.blocked,
                skipped: data.skipped,
                progress: parseFloat(data.progress),
                isComplete: data.is_complete,
                hasFailures: data.has_failures,
            };
        }
        catch (error) {
            console.error('GraphRunner.getExecutionSummary error:', error);
            throw error;
        }
    }
    async updateTaskStatus(nodeId, status, output, errorMessage) {
        const updates = {
            status,
            updated_at: new Date().toISOString(),
        };
        if (status === 'RUNNING') {
            updates.started_at = new Date().toISOString();
        }
        if (status === 'COMPLETED' || status === 'FAILED' || status === 'SKIPPED') {
            updates.completed_at = new Date().toISOString();
        }
        if (output) {
            updates.output = output;
        }
        if (errorMessage) {
            updates.error_message = errorMessage;
        }
        await supabase_1.supabase
            .from('campaign_task_graph')
            .update(updates)
            .eq('campaign_id', this.campaignId)
            .eq('node_id', nodeId)
            .eq('organization_id', this.organizationId);
    }
    async propagateStatus(nodeId, status, output, errorMessage) {
        const { data, error } = await supabase_1.supabase.rpc('propagate_task_status', {
            p_campaign_id: this.campaignId,
            p_node_id: nodeId,
            p_new_status: status,
            p_organization_id: this.organizationId,
            p_output: output || null,
            p_error_message: errorMessage || null,
        });
        if (error) {
            throw new Error(`Failed to propagate status: ${error.message}`);
        }
        await this.loadGraph();
        return {
            nodeId: data.node_id,
            newStatus: data.new_status,
            affectedCount: data.affected_count,
            downstreamNodes: data.downstream_nodes || [],
        };
    }
    async getDependencyOutputs(dependsOn) {
        const outputs = {};
        for (const depNodeId of dependsOn) {
            const node = this.graph.get(depNodeId);
            if (node && node.output) {
                outputs[depNodeId] = node.output;
            }
        }
        return outputs;
    }
    async recordExecution(execution) {
        await supabase_1.supabase.from('campaign_task_executions').insert({
            graph_node_id: execution.graphNodeId,
            campaign_id: execution.campaignId,
            node_id: execution.nodeId,
            agent_id: execution.agentId,
            agent_run_id: execution.agentRunId,
            status: execution.status,
            input: execution.input,
            output: execution.output,
            error_message: execution.errorMessage,
            error_stack: execution.errorStack,
            attempt_number: execution.attemptNumber,
            is_retry: execution.isRetry,
            started_at: execution.startedAt,
            completed_at: execution.completedAt,
            duration_ms: execution.durationMs,
            organization_id: execution.organizationId,
        });
    }
    transformNode(row) {
        return {
            id: row.id,
            campaignId: row.campaign_id,
            nodeId: row.node_id,
            taskType: row.task_type,
            agentType: row.agent_type,
            metadata: row.metadata,
            config: row.config,
            dependsOn: row.depends_on || [],
            status: row.status,
            output: row.output,
            errorMessage: row.error_message,
            maxRetries: row.max_retries || 3,
            retryCount: row.retry_count || 0,
            startedAt: row.started_at ? new Date(row.started_at) : null,
            completedAt: row.completed_at ? new Date(row.completed_at) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            organizationId: row.organization_id,
        };
    }
    emitGraphEvent(event) {
        this.emit('graph-event', event);
        this.emit(event.type, event);
    }
    async storeSuccessMemory(nodeId, result) {
        try {
            const node = this.graph.get(nodeId);
            if (!node)
                return;
            const memoryContent = `Task Success: ${node.taskType} (${nodeId})

Agent: ${node.agentType || 'Manual'}
Campaign: ${this.campaignId}

Outcome:
${JSON.stringify(result.output, null, 2)}

Duration: ${result.durationMs}ms`;
            await memory_engine_1.memoryEngine.storeMemory({
                memoryId: `success-${this.campaignId}-${nodeId}-${Date.now()}`,
                agentType: node.agentType || 'graph-executor',
                campaignId: this.campaignId,
                memoryType: 'SUCCESS',
                content: memoryContent,
                metadata: {
                    nodeId,
                    taskType: node.taskType,
                    durationMs: result.durationMs,
                    output: result.output,
                },
                organizationId: this.organizationId,
            });
        }
        catch (error) {
            console.error('Failed to store success memory:', error);
        }
    }
    async storeErrorMemory(nodeId, result) {
        try {
            const node = this.graph.get(nodeId);
            if (!node)
                return;
            const memoryContent = `Task Failure: ${node.taskType} (${nodeId})

Agent: ${node.agentType || 'Manual'}
Campaign: ${this.campaignId}

Error:
${result.error}

${result.errorStack ? `Stack Trace:\n${result.errorStack}` : ''}

Retry Count: ${node.retryCount}`;
            await memory_engine_1.memoryEngine.storeMemory({
                memoryId: `error-${this.campaignId}-${nodeId}-${Date.now()}`,
                agentType: node.agentType || 'graph-executor',
                campaignId: this.campaignId,
                memoryType: 'ERROR',
                content: memoryContent,
                metadata: {
                    nodeId,
                    taskType: node.taskType,
                    error: result.error,
                    errorStack: result.errorStack,
                    retryCount: node.retryCount,
                },
                organizationId: this.organizationId,
            });
        }
        catch (error) {
            console.error('Failed to store error memory:', error);
        }
    }
}
exports.GraphRunner = GraphRunner;
//# sourceMappingURL=graph-runner.js.map