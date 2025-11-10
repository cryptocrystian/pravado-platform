"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerEngine = exports.PlannerEngine = void 0;
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const agent_runner_1 = require("../framework/agent-runner");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class PlannerEngine {
    async planTasksFromGoal(request) {
        try {
            logger_1.logger.info('Generating plan from goal', { goalId: request.goalId });
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
            const tasks = planData.tasks.map((task, idx) => ({
                goalId: request.goalId,
                agentId: task.agentId || 'default-agent',
                stepNumber: idx + 1,
                title: task.title,
                description: task.description,
                strategy: task.strategy || 'PLAN_AND_EXECUTE',
                estimatedDurationMinutes: task.estimatedDurationMinutes || null,
                dependencies: task.dependencies || [],
                organizationId: '',
            }));
            const graph = this.generateExecutionGraph(tasks);
            return {
                tasks,
                graph,
                reasoning: planData.reasoning || 'Plan generated successfully',
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to generate plan from goal', error);
            throw error;
        }
    }
    generateExecutionGraph(tasks) {
        const nodes = [];
        const edges = [];
        nodes.push({
            id: 'start',
            taskId: null,
            type: 'START',
            status: 'COMPLETED',
            data: {},
        });
        tasks.forEach((task, idx) => {
            nodes.push({
                id: `task-${idx}`,
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    title: task.title,
                    agentId: task.agentId,
                },
            });
        });
        nodes.push({
            id: 'end',
            taskId: null,
            type: 'END',
            status: 'PENDING',
            data: {},
        });
        tasks.forEach((task, idx) => {
            if (task.dependencies && task.dependencies.length > 0) {
                task.dependencies.forEach((depIdx) => {
                    edges.push({
                        from: `task-${depIdx}`,
                        to: `task-${idx}`,
                        type: 'SEQUENCE',
                    });
                });
            }
            else if (idx === 0) {
                edges.push({
                    from: 'start',
                    to: `task-${idx}`,
                    type: 'SEQUENCE',
                });
            }
        });
        const lastTasks = tasks.filter((task, idx) => !tasks.some((t) => t.dependencies?.includes(idx)));
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
                riskScore: 0.3,
                requiresApproval: false,
            },
        };
    }
    calculateGraphDepth(nodes, edges) {
        const depths = new Map();
        const visited = new Set();
        const calculateDepth = (nodeId) => {
            if (depths.has(nodeId)) {
                return depths.get(nodeId);
            }
            if (visited.has(nodeId)) {
                return 0;
            }
            visited.add(nodeId);
            const incomingEdges = edges.filter((e) => e.to === nodeId);
            if (incomingEdges.length === 0) {
                depths.set(nodeId, 0);
                return 0;
            }
            const maxParentDepth = Math.max(...incomingEdges.map((e) => calculateDepth(e.from)));
            const depth = maxParentDepth + 1;
            depths.set(nodeId, depth);
            return depth;
        };
        nodes.forEach((node) => calculateDepth(node.id));
        return Math.max(...Array.from(depths.values()));
    }
    async executeTaskNode(task, goal, context) {
        const startTime = Date.now();
        try {
            logger_1.logger.info('Executing task node', { taskId: task.id, title: task.title });
            await supabase
                .from('agent_tasks')
                .update({
                status: 'IN_PROGRESS',
                started_at: new Date().toISOString(),
            })
                .eq('id', task.id);
            const result = await (0, agent_runner_1.runAgent)({
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
            }, {
                taskTitle: task.title,
                taskDescription: task.description,
                ...context,
            }, {
                organizationId: task.organizationId,
                userId: goal.createdBy,
                executionId: task.id,
            });
            const executionTimeMs = Date.now() - startTime;
            if (result.success) {
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
                    status: 'COMPLETED',
                    outputSummary: JSON.stringify(result.data).substring(0, 5000),
                    outputData: result.data,
                    errorMessage: null,
                    executionTimeMs,
                };
            }
            else {
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
                    status: 'FAILED',
                    outputSummary: null,
                    outputData: null,
                    errorMessage: result.error || 'Unknown error',
                    executionTimeMs,
                };
            }
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            logger_1.logger.error('Task execution failed', error);
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
                status: 'FAILED',
                outputSummary: null,
                outputData: null,
                errorMessage: error.message,
                executionTimeMs,
            };
        }
    }
    async traverseExecutionGraph(goal, graph, options = {}) {
        const maxConcurrency = options.maxConcurrency || 3;
        const stopOnFirstFailure = options.stopOnFirstFailure || false;
        const dryRun = options.dryRun || false;
        logger_1.logger.info('Starting graph traversal', {
            goalId: goal.id,
            totalNodes: graph.totalNodes,
            maxConcurrency,
        });
        const progress = {
            goalId: goal.id,
            currentNodeId: null,
            completedNodes: 0,
            totalNodes: graph.graphData.nodes.filter((n) => n.type === 'TASK').length,
            failedNodes: 0,
            status: 'ACTIVE',
            errors: [],
        };
        const { data: tasks, error: tasksError } = await supabase
            .from('agent_tasks')
            .select('*')
            .eq('goal_id', goal.id)
            .order('step_number', { ascending: true });
        if (tasksError) {
            throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
        }
        const taskMap = new Map();
        tasks.forEach((task) => {
            taskMap.set(task.id, this.mapToAgentTask(task));
        });
        const executing = new Set();
        const completed = new Set();
        while (completed.size < tasks.length) {
            const readyTasks = tasks.filter((task) => {
                if (completed.has(task.id) || executing.has(task.id)) {
                    return false;
                }
                const deps = task.dependencies || [];
                return deps.every((depId) => completed.has(depId));
            });
            if (readyTasks.length === 0) {
                if (executing.size === 0) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            const tasksToExecute = readyTasks.slice(0, maxConcurrency - executing.size);
            const executions = tasksToExecute.map(async (taskData) => {
                const task = taskMap.get(taskData.id);
                executing.add(task.id);
                progress.currentNodeId = task.id;
                if (dryRun) {
                    logger_1.logger.info('[DRY RUN] Would execute task', { taskId: task.id });
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
                    }
                    else {
                        progress.failedNodes++;
                        progress.errors.push(result.errorMessage || 'Unknown error');
                        if (stopOnFirstFailure) {
                            throw new Error(`Task failed: ${result.errorMessage}`);
                        }
                    }
                }
                catch (error) {
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
        if (progress.completedNodes === progress.totalNodes) {
            progress.status = 'COMPLETED';
        }
        else if (progress.failedNodes > 0) {
            progress.status = 'FAILED';
        }
        logger_1.logger.info('Graph traversal completed', progress);
        return progress;
    }
    mapToAgentTask(row) {
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
exports.PlannerEngine = PlannerEngine;
exports.plannerEngine = new PlannerEngine();
//# sourceMappingURL=planner-engine.js.map