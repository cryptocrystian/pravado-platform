// =====================================================
// GRAPH RUNNER - DAG-based Task Execution Engine
// =====================================================

import { EventEmitter } from 'events';
import { supabase } from '../lib/supabase';
import { runAgent } from '../framework/agent-runner';
import { memoryEngine } from '../memory/memory-engine';
import type {
  CampaignTaskGraph,
  CampaignTaskExecution,
  ExecutableTask,
  ExecutionSummary,
  TaskStatus,
  TaskExecutionResult,
  GraphRunnerConfig,
  RetryPolicy,
  TaskExecutionContext,
  GraphEvent,
  StatusPropagationResult,
} from '@pravado/shared-types';

/**
 * Default retry policy
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Graph Runner - DAG Execution Engine
 * Handles parallel execution, dependencies, retries, and status propagation
 */
export class GraphRunner extends EventEmitter {
  private campaignId: string;
  private organizationId: string;
  private parallelism: number;
  private retryPolicy: RetryPolicy;
  private pollIntervalMs: number;
  private timeoutMs: number;

  private graph: Map<string, CampaignTaskGraph> = new Map();
  private runningTasks: Set<string> = new Set();
  private isRunning: boolean = false;
  private startTime: number | null = null;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: GraphRunnerConfig) {
    super();
    this.campaignId = config.campaignId;
    this.organizationId = config.organizationId;
    this.parallelism = config.parallelism || 5;
    this.retryPolicy = config.retryPolicy || DEFAULT_RETRY_POLICY;
    this.pollIntervalMs = config.pollIntervalMs || 2000;
    this.timeoutMs = config.timeoutMs || 3600000; // 1 hour default
  }

  /**
   * Load graph from database
   */
  async loadGraph(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('campaign_task_graph')
        .select('*')
        .eq('campaign_id', this.campaignId)
        .eq('organization_id', this.organizationId)
        .order('created_at');

      if (error) {
        throw new Error(`Failed to load graph: ${error.message}`);
      }

      // Build graph map
      this.graph.clear();
      (data || []).forEach((node) => {
        this.graph.set(node.node_id, this.transformNode(node));
      });

      this.emit('graph-loaded', {
        campaignId: this.campaignId,
        nodeCount: this.graph.size,
      });
    } catch (error) {
      console.error('GraphRunner.loadGraph error:', error);
      throw error;
    }
  }

  /**
   * Start execution
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Execution already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();

    this.emit('execution-started', {
      campaignId: this.campaignId,
      timestamp: new Date(),
    });

    // Start execution loop
    this.executionLoop();
  }

  /**
   * Stop execution
   */
  async stop(): Promise<void> {
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

  /**
   * Main execution loop
   */
  private async executionLoop(): Promise<void> {
    try {
      // Check timeout
      if (this.startTime && Date.now() - this.startTime > this.timeoutMs) {
        this.emit('execution-timeout', {
          campaignId: this.campaignId,
          elapsed: Date.now() - this.startTime,
        });
        await this.stop();
        return;
      }

      // Execute ready tasks
      await this.executeReadyTasks();

      // Check if execution is complete
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

      // Continue if still running
      if (this.isRunning) {
        this.pollTimer = setTimeout(() => this.executionLoop(), this.pollIntervalMs);
      }
    } catch (error) {
      console.error('Execution loop error:', error);
      this.emit('execution-error', { error, campaignId: this.campaignId });
      await this.stop();
    }
  }

  /**
   * Execute all ready tasks (parallel-safe)
   */
  async executeReadyTasks(): Promise<void> {
    try {
      // Get executable tasks from database
      const { data, error } = await supabase.rpc('get_executable_tasks', {
        p_campaign_id: this.campaignId,
        p_organization_id: this.organizationId,
      });

      if (error) {
        throw new Error(`Failed to get executable tasks: ${error.message}`);
      }

      const executableTasks: ExecutableTask[] = (data || []).map((row: any) => ({
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

      // Filter out already running tasks
      const tasksToRun = executableTasks.filter(
        (task) => !this.runningTasks.has(task.nodeId)
      );

      // Respect parallelism limit
      const availableSlots = this.parallelism - this.runningTasks.size;
      const tasksToStart = tasksToRun.slice(0, availableSlots);

      // Execute tasks in parallel
      for (const task of tasksToStart) {
        this.executeTask(task).catch((error) => {
          console.error(`Task execution error for ${task.nodeId}:`, error);
        });
      }
    } catch (error) {
      console.error('GraphRunner.executeReadyTasks error:', error);
      throw error;
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: ExecutableTask): Promise<void> {
    const nodeId = task.nodeId;
    this.runningTasks.add(nodeId);

    try {
      // Mark as running
      await this.updateTaskStatus(nodeId, 'RUNNING');

      this.emitGraphEvent({
        type: 'task-started',
        campaignId: this.campaignId,
        nodeId,
        status: 'RUNNING',
        timestamp: new Date(),
      });

      // Get dependency outputs
      const dependencyOutputs = await this.getDependencyOutputs(task.dependsOn);

      // Build execution context
      const context: TaskExecutionContext = {
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

      // Execute task
      const result = await this.runTask(context);

      const durationMs = Date.now() - startTime;

      // Record execution
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

      // Handle result
      await this.handleTaskResult(nodeId, result);
    } catch (error: any) {
      console.error(`Task execution failed for ${nodeId}:`, error);

      // Handle unexpected error
      await this.handleTaskResult(nodeId, {
        nodeId,
        status: 'FAILED',
        error: error.message,
        errorStack: error.stack,
        durationMs: 0,
      });
    } finally {
      this.runningTasks.delete(nodeId);
    }
  }

  /**
   * Run task using appropriate agent
   */
  private async runTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    try {
      if (!context.agentType) {
        // No agent - treat as manual task that auto-completes
        return {
          nodeId: context.nodeId,
          status: 'COMPLETED',
          output: { message: 'No-op task completed' },
          durationMs: 0,
        };
      }

      // Build agent configuration
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

      // Build input
      const input = {
        taskType: context.taskType,
        nodeId: context.nodeId,
        metadata: context.metadata,
        dependencyOutputs: context.dependencyOutputs,
        ...context.config?.input,
      };

      // Build context
      const agentContext = {
        organizationId: context.organizationId,
        campaignId: context.campaignId,
        taskNodeId: context.nodeId,
        attemptNumber: context.attemptNumber,
        isRetry: context.isRetry,
        ...context.metadata,
      };

      // Run agent
      const agentResult = await runAgent(agentConfig, input, agentContext);

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
    } catch (error: any) {
      return {
        nodeId: context.nodeId,
        status: 'FAILED',
        error: error.message,
        errorStack: error.stack,
        durationMs: 0,
      };
    }
  }

  /**
   * Handle task result
   */
  async handleTaskResult(
    nodeId: string,
    result: TaskExecutionResult
  ): Promise<void> {
    try {
      if (result.status === 'COMPLETED') {
        // Task succeeded - propagate success
        await this.propagateStatus(nodeId, 'COMPLETED', result.output);

        // Store success memory
        await this.storeSuccessMemory(nodeId, result);

        this.emitGraphEvent({
          type: 'task-completed',
          campaignId: this.campaignId,
          nodeId,
          status: 'COMPLETED',
          data: result.output,
          timestamp: new Date(),
        });
      } else if (result.status === 'FAILED') {
        // Check if we should retry
        const node = this.graph.get(nodeId);
        if (node && node.retryCount < node.maxRetries) {
          // Schedule retry
          await this.retryFailedTask(nodeId);
        } else {
          // Max retries exceeded - propagate failure
          await this.propagateStatus(nodeId, 'FAILED', undefined, result.error);

          // Store error memory
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
    } catch (error) {
      console.error('GraphRunner.handleTaskResult error:', error);
      throw error;
    }
  }

  /**
   * Retry a failed task with exponential backoff
   */
  async retryFailedTask(nodeId: string): Promise<void> {
    try {
      const node = this.graph.get(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      // Calculate backoff delay
      const delay = Math.min(
        this.retryPolicy.initialDelayMs *
          Math.pow(this.retryPolicy.backoffMultiplier, node.retryCount),
        this.retryPolicy.maxDelayMs
      );

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

      // Wait for backoff
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Reset task for retry
      const { data, error } = await supabase.rpc('reset_task_for_retry', {
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

      // Reload graph to get updated state
      await this.loadGraph();
    } catch (error) {
      console.error('GraphRunner.retryFailedTask error:', error);
      throw error;
    }
  }

  /**
   * Skip a blocked task
   */
  async skipBlockedTask(nodeId: string, reason?: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('skip_task', {
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

      // Reload graph
      await this.loadGraph();
    } catch (error) {
      console.error('GraphRunner.skipBlockedTask error:', error);
      throw error;
    }
  }

  /**
   * Get execution summary
   */
  async getExecutionSummary(): Promise<ExecutionSummary> {
    try {
      const { data, error } = await supabase.rpc('get_execution_summary', {
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
    } catch (error) {
      console.error('GraphRunner.getExecutionSummary error:', error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    nodeId: string,
    status: TaskStatus,
    output?: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
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

    await supabase
      .from('campaign_task_graph')
      .update(updates)
      .eq('campaign_id', this.campaignId)
      .eq('node_id', nodeId)
      .eq('organization_id', this.organizationId);
  }

  /**
   * Propagate status through DAG
   */
  private async propagateStatus(
    nodeId: string,
    status: TaskStatus,
    output?: Record<string, any>,
    errorMessage?: string
  ): Promise<StatusPropagationResult> {
    const { data, error } = await supabase.rpc('propagate_task_status', {
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

    // Reload graph after propagation
    await this.loadGraph();

    return {
      nodeId: data.node_id,
      newStatus: data.new_status,
      affectedCount: data.affected_count,
      downstreamNodes: data.downstream_nodes || [],
    };
  }

  /**
   * Get dependency outputs
   */
  private async getDependencyOutputs(
    dependsOn: string[]
  ): Promise<Record<string, any>> {
    const outputs: Record<string, any> = {};

    for (const depNodeId of dependsOn) {
      const node = this.graph.get(depNodeId);
      if (node && node.output) {
        outputs[depNodeId] = node.output;
      }
    }

    return outputs;
  }

  /**
   * Record task execution
   */
  private async recordExecution(execution: any): Promise<void> {
    await supabase.from('campaign_task_executions').insert({
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

  /**
   * Transform database node to type
   */
  private transformNode(row: any): CampaignTaskGraph {
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

  /**
   * Emit graph event
   */
  private emitGraphEvent(event: GraphEvent): void {
    this.emit('graph-event', event);
    this.emit(event.type, event);
  }

  /**
   * Store success memory for learning
   */
  private async storeSuccessMemory(
    nodeId: string,
    result: TaskExecutionResult
  ): Promise<void> {
    try {
      const node = this.graph.get(nodeId);
      if (!node) return;

      const memoryContent = `Task Success: ${node.taskType} (${nodeId})

Agent: ${node.agentType || 'Manual'}
Campaign: ${this.campaignId}

Outcome:
${JSON.stringify(result.output, null, 2)}

Duration: ${result.durationMs}ms`;

      await memoryEngine.storeMemory({
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
    } catch (error) {
      console.error('Failed to store success memory:', error);
      // Don't throw - memory is non-critical
    }
  }

  /**
   * Store error memory for learning
   */
  private async storeErrorMemory(
    nodeId: string,
    result: TaskExecutionResult
  ): Promise<void> {
    try {
      const node = this.graph.get(nodeId);
      if (!node) return;

      const memoryContent = `Task Failure: ${node.taskType} (${nodeId})

Agent: ${node.agentType || 'Manual'}
Campaign: ${this.campaignId}

Error:
${result.error}

${result.errorStack ? `Stack Trace:\n${result.errorStack}` : ''}

Retry Count: ${node.retryCount}`;

      await memoryEngine.storeMemory({
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
    } catch (error) {
      console.error('Failed to store error memory:', error);
      // Don't throw - memory is non-critical
    }
  }
}
