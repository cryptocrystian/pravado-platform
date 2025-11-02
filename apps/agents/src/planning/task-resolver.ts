// =====================================================
// TASK RESOLVER
// =====================================================
// Resolves tasks using tools and agent capabilities

import { createClient } from '@supabase/supabase-js';
import type { AgentTask, TaskStatus } from '@pravado/shared-types';
import { logger } from '../lib/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Task categories for routing to appropriate agents
 */
export enum TaskCategory {
  RESEARCH = 'RESEARCH',
  WRITE = 'WRITE',
  ANALYZE = 'ANALYZE',
  OUTREACH = 'OUTREACH',
  PLAN = 'PLAN',
  REVIEW = 'REVIEW',
}

/**
 * Task Resolver - Maps tasks to appropriate agents and tools
 */
export class TaskResolver {
  /**
   * Categorize a task based on its title and description
   */
  categorizeTask(task: AgentTask): TaskCategory {
    const text = `${task.title} ${task.description || ''}`.toLowerCase();

    if (text.includes('research') || text.includes('find') || text.includes('gather')) {
      return TaskCategory.RESEARCH;
    }
    if (text.includes('write') || text.includes('draft') || text.includes('compose')) {
      return TaskCategory.WRITE;
    }
    if (text.includes('analyze') || text.includes('evaluate') || text.includes('assess')) {
      return TaskCategory.ANALYZE;
    }
    if (text.includes('outreach') || text.includes('contact') || text.includes('pitch')) {
      return TaskCategory.OUTREACH;
    }
    if (text.includes('plan') || text.includes('strategy') || text.includes('organize')) {
      return TaskCategory.PLAN;
    }
    if (text.includes('review') || text.includes('check') || text.includes('verify')) {
      return TaskCategory.REVIEW;
    }

    return TaskCategory.PLAN; // Default
  }

  /**
   * Get recommended agent for a task category
   */
  getAgentForCategory(category: TaskCategory): string {
    switch (category) {
      case TaskCategory.RESEARCH:
        return 'research-agent';
      case TaskCategory.WRITE:
        return 'content-writer-agent';
      case TaskCategory.ANALYZE:
        return 'analysis-agent';
      case TaskCategory.OUTREACH:
        return 'outreach-agent';
      case TaskCategory.PLAN:
        return 'planning-agent';
      case TaskCategory.REVIEW:
        return 'review-agent';
      default:
        return 'default-agent';
    }
  }

  /**
   * Check if task can be executed (all dependencies met)
   */
  async canExecuteTask(taskId: string): Promise<boolean> {
    try {
      const { data: task, error } = await supabase
        .from('agent_tasks')
        .select('dependencies')
        .eq('id', taskId)
        .single();

      if (error || !task) {
        return false;
      }

      if (!task.dependencies || task.dependencies.length === 0) {
        return true;
      }

      // Check if all dependencies are completed
      const { data: deps, error: depsError } = await supabase
        .from('agent_tasks')
        .select('status')
        .in('id', task.dependencies);

      if (depsError) {
        return false;
      }

      return deps.every((dep: any) =>
        ['COMPLETED', 'SKIPPED'].includes(dep.status)
      );
    } catch (error) {
      logger.error('Error checking task executability', error);
      return false;
    }
  }

  /**
   * Get next executable tasks for a goal
   */
  async getNextExecutableTasks(
    goalId: string,
    limit: number = 5
  ): Promise<AgentTask[]> {
    try {
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('goal_id', goalId)
        .eq('status', 'PENDING')
        .order('step_number', { ascending: true })
        .limit(limit * 2); // Get more than needed to filter

      if (error || !tasks) {
        return [];
      }

      // Filter to only executable tasks
      const executable: AgentTask[] = [];
      for (const taskData of tasks) {
        const task = this.mapToAgentTask(taskData);
        const canExecute = await this.canExecuteTask(task.id);
        if (canExecute) {
          executable.push(task);
          if (executable.length >= limit) {
            break;
          }
        }
      }

      return executable;
    } catch (error) {
      logger.error('Error getting next executable tasks', error);
      return [];
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    outputData?: any
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'IN_PROGRESS') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
      if (outputData) {
        updates.output_data = outputData;
        updates.output_summary = JSON.stringify(outputData).substring(0, 5000);
      }
    } else if (status === 'FAILED') {
      updates.failed_at = new Date().toISOString();
    }

    await supabase
      .from('agent_tasks')
      .update(updates)
      .eq('id', taskId);
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
export const taskResolver = new TaskResolver();
