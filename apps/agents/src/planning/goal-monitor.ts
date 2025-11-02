// =====================================================
// GOAL MONITOR
// =====================================================
// Monitors goal progress and completion

import { createClient } from '@supabase/supabase-js';
import type {
  AgentGoal,
  GoalStatus,
  GoalSummary,
} from '@pravado/shared-types';
import { logger } from '../lib/logger';
import { memoryStore } from '../memory';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Goal Monitor - Tracks goal progress and completion
 */
export class GoalMonitor {
  /**
   * Get goal summary with task statistics
   */
  async getGoalSummary(goalId: string, organizationId: string): Promise<GoalSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_goal_summary', {
        p_goal_id: goalId,
        p_organization_id: organizationId,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];

      return {
        goalId: row.goal_id,
        title: row.title,
        status: row.status,
        totalTasks: row.total_tasks,
        pendingTasks: row.pending_tasks,
        inProgressTasks: row.in_progress_tasks,
        completedTasks: row.completed_tasks,
        failedTasks: row.failed_tasks,
      };
    } catch (error) {
      logger.error('Failed to get goal summary', error);
      return null;
    }
  }

  /**
   * Check if goal is completed
   */
  async checkGoalCompletion(goalId: string, organizationId: string): Promise<boolean> {
    const summary = await this.getGoalSummary(goalId, organizationId);

    if (!summary) {
      return false;
    }

    return (
      summary.totalTasks > 0 &&
      summary.completedTasks === summary.totalTasks
    );
  }

  /**
   * Update goal status
   */
  async updateGoalStatus(
    goalId: string,
    status: GoalStatus,
    failureReason?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'ACTIVE' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    } else if (status === 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'FAILED') {
      updates.failed_at = new Date().toISOString();
      if (failureReason) {
        updates.failure_reason = failureReason;
      }
    }

    await supabase
      .from('agent_goals')
      .update(updates)
      .eq('id', goalId);
  }

  /**
   * Log reasoning trace for a task
   */
  async logReasoningTrace(
    taskId: string,
    agentId: string,
    reasoning: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Store reasoning as a REFLECTION memory
      await memoryStore.addMemory({
        agentId,
        memoryType: 'REFLECTION',
        content: `Task reasoning: ${reasoning}`,
        organizationId,
        contextTags: ['task', 'reasoning', taskId],
        importanceScore: 0.6,
      });

      logger.info('Reasoning trace logged', { taskId, agentId });
    } catch (error) {
      logger.error('Failed to log reasoning trace', error);
    }
  }

  /**
   * Get goal progress percentage
   */
  async getGoalProgress(goalId: string, organizationId: string): Promise<number> {
    const summary = await this.getGoalSummary(goalId, organizationId);

    if (!summary || summary.totalTasks === 0) {
      return 0;
    }

    return (summary.completedTasks / summary.totalTasks) * 100;
  }

  /**
   * Get goal by ID
   */
  async getGoal(goalId: string, organizationId: string): Promise<AgentGoal | null> {
    try {
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('id', goalId)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToAgentGoal(data);
    } catch (error) {
      logger.error('Failed to get goal', error);
      return null;
    }
  }

  /**
   * Check if goal requires approval
   */
  async requiresApproval(goalId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('agent_goals')
      .select('requires_approval, approved_at')
        .eq('id', goalId)
        .single();

    if (error || !data) {
      return false;
    }

    return data.requires_approval && !data.approved_at;
  }

  /**
   * Approve goal for execution
   */
  async approveGoal(goalId: string, approvedBy: string): Promise<void> {
    await supabase
      .from('agent_goals')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId);

    logger.info('Goal approved', { goalId, approvedBy });
  }

  /**
   * Map database row to AgentGoal
   */
  private mapToAgentGoal(row: any): AgentGoal {
    return {
      id: row.id,
      agentId: row.agent_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      tags: row.tags || [],
      riskScore: parseFloat(row.risk_score),
      requiresApproval: row.requires_approval,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      approvedBy: row.approved_by,
      targetContactId: row.target_contact_id,
      targetCampaignId: row.target_campaign_id,
      dueDate: row.due_date ? new Date(row.due_date) : null,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      failedAt: row.failed_at ? new Date(row.failed_at) : null,
      failureReason: row.failure_reason,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      organizationId: row.organization_id,
    };
  }
}

// Export singleton instance
export const goalMonitor = new GoalMonitor();
