// =====================================================
// AGENT PLANNER ENGINE
// =====================================================
// Autonomous planning and multi-step execution using DAG traversal

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type {
  AgentGoal,
  AgentTask,
  ExecutionGraph,
  GraphNode,
  GraphEdge,
  PlanningRequest,
  PlanningResult,
  TaskExecutionResult,
  GraphTraversalOptions,
  GraphExecutionProgress,
  CreateAgentTaskInput,
  TaskStatus,
  GoalStatus,
  TaskStrategy,
} from '@pravado/types';
import { logger } from '../lib/logger';
import { runAgent } from '../framework/agent-runner';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Planner Engine - Autonomous planning and execution
 */
export class PlannerEngine {
  /**
   * Generate a plan (tasks + execution graph) from a goal
   */
  async planTasksFromGoal(request: PlanningRequest): Promise<PlanningResult> {
    try {
      logger.info('Generating plan from goal', { goalId: request.goalId });

      const systemPrompt = `You are an expert AI task planner for autonomous agent systems.

Your task is to break down a high-level goal into a series of concrete, executable tasks that form a directed acyclic graph (DAG).

Guidelines:
1. Create tasks that are specific and actionable
2. Identify dependencies between tasks
3. Estimate duration for each task (in minutes)
4. Assign appropriate agents to each task
5. Keep the graph simple and avoid unnecessary complexity
6. Maximum ${request.maxTasks || 10} tasks
7. Maximum depth of ${request.maxDepth || 5} levels

Output a JSON object with:
{
  "tasks": [
    {
      "stepNumber": 1,
      "title": "Task title",
      "description": "Detailed description",
      "agentId": "agent-name",
      "strategy": "PLAN_AND_EXECUTE",
      "estimatedDurationMinutes": 30,
      "dependencies": []
    }
  ],
  "reasoning": "Explanation of the plan"
}`;

      const userPrompt = `Goal: ${request.goalDescription}

${request.context ? `Context:\n${JSON.stringify(request.context, null, 2)}` : ''}

Generate a task breakdown and execution plan.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from GPT-4');
      }

      const planData = JSON.parse(content);

      // Convert to proper task inputs
      const tasks: CreateAgentTaskInput[] = planData.tasks.map((task: any, idx: number) => ({
        goalId: request.goalId,
        agentId: task.agentId || 'default-agent',
        stepNumber: idx + 1,
        title: task.title,
        description: task.description,
        strategy: (task.strategy as TaskStrategy) || 'PLAN_AND_EXECUTE',
        estimatedDurationMinutes: task.estimatedDurationMinutes || null,
        dependencies: task.dependencies || [],
        organizationId: '', // Will be filled by caller
      }));

      // Generate execution graph
      const graph = this.generateExecutionGraph(tasks);

      return {
        tasks,
        graph,
        reasoning: planData.reasoning || 'Plan generated successfully',
      };
    } catch (error) {
      logger.error('Failed to generate plan from goal', error);
      throw error;
    }
  }

  /**
   * Generate execution graph from tasks
   */
  private generateExecutionGraph(tasks: CreateAgentTaskInput[]): {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: any;
  } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Create START node
    nodes.push({
      id: 'start',
      taskId: null,
      type: 'START',
      status: 'COMPLETED' as TaskStatus,
      data: {},
    });

    // Create task nodes
    tasks.forEach((task, idx) => {
      nodes.push({
        id: `task-${idx}`,
        taskId: null, // Will be filled when task is created
        type: 'TASK',
        status: 'PENDING' as TaskStatus,
        data: {
          title: task.title,
          agentId: task.agentId,
        },
      });
    });

    // Create END node
    nodes.push({
      id: 'end',
      taskId: null,
      type: 'END',
      status: 'PENDING' as TaskStatus,
      data: {},
    });

    // Create edges based on dependencies
    tasks.forEach((task, idx) => {
      if (task.dependencies && task.dependencies.length > 0) {
        // This task depends on other tasks
        task.dependencies.forEach((depIdx: any) => {
          edges.push({
            from: `task-${depIdx}`,
            to: `task-${idx}`,
            type: 'SEQUENCE',
          });
        });
      } else if (idx === 0) {
        // First task depends on START
        edges.push({
          from: 'start',
          to: `task-${idx}`,
          type: 'SEQUENCE',
        });
      }
    });

    // Connect last tasks to END
    const lastTasks = tasks.filter(
      (task, idx) => !tasks.some((t) => t.dependencies?.includes(idx))
    );
    lastTasks.forEach((task, idx) => {
      const taskIdx = tasks.indexOf(task);
      edges.push({
        from: `task-${taskIdx}`,
        to: 'end',
        type: 'SEQUENCE',
      });
    });

    const maxDepth = this.calculateGraphDepth(nodes, edges);

    return {
      nodes,
      edges,
      metadata: {
        maxDepth,
        estimatedDuration: tasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes || 0), 0),
        riskScore: 0.3, // Default risk
        requiresApproval: false,
      },
    };
  }

  /**
   * Calculate maximum depth of the graph
   */
  private calculateGraphDepth(nodes: GraphNode[], edges: GraphEdge[]): number {
    const depths = new Map<string, number>();
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string): number => {
      if (depths.has(nodeId)) {
        return depths.get(nodeId)!;
      }

      if (visited.has(nodeId)) {
        // Cycle detected
        return 0;
      }

      visited.add(nodeId);

      const incomingEdges = edges.filter((e) => e.to === nodeId);
      if (incomingEdges.length === 0) {
        depths.set(nodeId, 0);
        return 0;
      }

      const maxParentDepth = Math.max(
        ...incomingEdges.map((e) => calculateDepth(e.from))
      );

      const depth = maxParentDepth + 1;
      depths.set(nodeId, depth);
      return depth;
    };

    nodes.forEach((node) => calculateDepth(node.id));

    return Math.max(...Array.from(depths.values()));
  }

  /**
   * Execute a single task node
   */
  async executeTaskNode(
    task: AgentTask,
    goal: AgentGoal,
    context: Record<string, any>
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();

    try {
      logger.info('Executing task node', { taskId: task.id, title: task.title });

      // Update task status to IN_PROGRESS
      await supabase
        .from('agent_tasks')
        .update({
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      // Execute the task using agent runner
      const result = await runAgent(
        {
          agentName: task.agentId,
          systemPrompt: `You are ${task.agentId}, executing the following task:
Title: ${task.title}
Description: ${task.description || 'No description provided'}

Goal Context:
${goal.title}
${goal.description || ''}

Complete this task and return your results in JSON format.`,
          inputSchema: {},
          outputSchema: {},
          contextSources: ['memory'],
        },
        {
          taskTitle: task.title,
          taskDescription: task.description,
          ...context,
        },
        {
          organizationId: task.organizationId,
          userId: goal.createdBy,
          executionId: task.id,
        }
      );

      const executionTimeMs = Date.now() - startTime;

      if (result.success) {
        // Update task as completed
        await supabase
          .from('agent_tasks')
          .update({
            status: 'COMPLETED',
            output_summary: JSON.stringify(result.data).substring(0, 5000),
            output_data: result.data,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        return {
          taskId: task.id,
          status: 'COMPLETED' as TaskStatus,
          outputSummary: JSON.stringify(result.data).substring(0, 5000),
          outputData: result.data,
          errorMessage: null,
          executionTimeMs,
        };
      } else {
        // Update task as failed
        await supabase
          .from('agent_tasks')
          .update({
            status: 'FAILED',
            error_message: result.error || 'Unknown error',
            failed_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        return {
          taskId: task.id,
          status: 'FAILED' as TaskStatus,
          outputSummary: null,
          outputData: null,
          errorMessage: result.error || 'Unknown error',
          executionTimeMs,
        };
      }
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      logger.error('Task execution failed', error);

      // Update task as failed
      await supabase
        .from('agent_tasks')
        .update({
          status: 'FAILED',
          error_message: error.message,
          failed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      return {
        taskId: task.id,
        status: 'FAILED' as TaskStatus,
        outputSummary: null,
        outputData: null,
        errorMessage: error.message,
        executionTimeMs,
      };
    }
  }

  /**
   * Traverse and execute an execution graph
   */
  async traverseExecutionGraph(
    goal: AgentGoal,
    graph: ExecutionGraph,
    options: GraphTraversalOptions = {}
  ): Promise<GraphExecutionProgress> {
    const maxConcurrency = options.maxConcurrency || 3;
    const stopOnFirstFailure = options.stopOnFirstFailure || false;
    const dryRun = options.dryRun || false;

    logger.info('Starting graph traversal', {
      goalId: goal.id,
      totalNodes: graph.totalNodes,
      maxConcurrency,
    });

    const progress: GraphExecutionProgress = {
      goalId: goal.id,
      currentNodeId: null,
      completedNodes: 0,
      totalNodes: graph.graphData.nodes.filter((n) => n.type === 'TASK').length,
      failedNodes: 0,
      status: 'ACTIVE' as GoalStatus,
      errors: [],
    };

    // Get all tasks for this goal
    const { data: tasks, error: tasksError } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('goal_id', goal.id)
      .order('step_number', { ascending: true });

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    // Build dependency map
    const taskMap = new Map<string, AgentTask>();
    tasks.forEach((task: any) => {
      taskMap.set(task.id, this.mapToAgentTask(task));
    });

    // Execute tasks in topological order
    const executing = new Set<string>();
    const completed = new Set<string>();

    while (completed.size < tasks.length) {
      // Find tasks ready to execute (all dependencies completed)
      const readyTasks = tasks.filter((task: any) => {
        if (completed.has(task.id) || executing.has(task.id)) {
          return false;
        }

        const deps = task.dependencies || [];
        return deps.every((depId: string) => completed.has(depId));
      });

      if (readyTasks.length === 0) {
        // No more tasks can execute - check if we're done or deadlocked
        if (executing.size === 0) {
          // Deadlock or completion
          break;
        }
        // Wait for executing tasks
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Execute tasks (up to maxConcurrency at a time)
      const tasksToExecute = readyTasks.slice(0, maxConcurrency - executing.size);

      const executions = tasksToExecute.map(async (taskData: any) => {
        const task = taskMap.get(taskData.id)!;
        executing.add(task.id);
        progress.currentNodeId = task.id;

        if (dryRun) {
          logger.info('[DRY RUN] Would execute task', { taskId: task.id });
          completed.add(task.id);
          executing.delete(task.id);
          progress.completedNodes++;
          return;
        }

        try {
          const result = await this.executeTaskNode(task, goal, {});

          executing.delete(task.id);

          if (result.status === 'COMPLETED') {
            completed.add(task.id);
            progress.completedNodes++;
          } else {
            progress.failedNodes++;
            progress.errors.push(result.errorMessage || 'Unknown error');

            if (stopOnFirstFailure) {
              throw new Error(`Task failed: ${result.errorMessage}`);
            }
          }
        } catch (error: any) {
          executing.delete(task.id);
          progress.failedNodes++;
          progress.errors.push(error.message);

          if (stopOnFirstFailure) {
            throw error;
          }
        }
      });

      await Promise.all(executions);
    }

    // Update final status
    if (progress.completedNodes === progress.totalNodes) {
      progress.status = 'COMPLETED' as GoalStatus;
    } else if (progress.failedNodes > 0) {
      progress.status = 'FAILED' as GoalStatus;
    }

    logger.info('Graph traversal completed', progress);

    return progress;
  }

  /**
   * Map database row to AgentTask
   */
  private mapToAgentTask(row: any): AgentTask {
    return {
      id: row.id,
      goalId: row.goal_id,
      parentTaskId: row.parent_task_id,
      agentId: row.agent_id,
      stepNumber: row.step_number,
      title: row.title,
      description: row.description,
      strategy: row.strategy,
      status: row.status,
      agentExecutionId: row.agent_execution_id,
      outputSummary: row.output_summary,
      outputData: row.output_data,
      errorMessage: row.error_message,
      plannedByAgent: row.planned_by_agent,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      dependencies: row.dependencies || [],
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      failedAt: row.failed_at ? new Date(row.failed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      organizationId: row.organization_id,
    };
  }
}

// Export singleton instance
export const plannerEngine = new PlannerEngine();
