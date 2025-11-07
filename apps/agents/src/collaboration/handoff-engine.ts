// =====================================================
// HANDOFF ENGINE
// =====================================================
// Manages task delegation and hand-offs between agents

import { createClient } from '@supabase/supabase-js';
import type {
  AgentHandoff,
  CreateAgentHandoffInput,
  ResolveAgentHandoffInput,
  HandoffStatus,
  HandoffRequest,
} from '@pravado/types';
import { logger } from '../../../api/src/lib/logger';
import { collabManager } from './collab-manager';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Handoff Engine - Manages task delegation between agents
 */
export class HandoffEngine {
  /**
   * Initiate a handoff request from one agent to another
   */
  async initiateHandoff(input: CreateAgentHandoffInput): Promise<AgentHandoff> {
    try {
      logger.info('Initiating agent handoff', {
        taskId: input.taskId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        organizationId: input.organizationId,
      });

      // Validate that agents are different
      if (input.fromAgentId === input.toAgentId) {
        throw new Error('Cannot handoff task to the same agent');
      }

      // Get task details to find the goal
      const { data: task, error: taskError } = await supabase
        .from('agent_tasks')
        .select('goal_id, agent_id')
        .eq('id', input.taskId)
        .eq('organization_id', input.organizationId)
        .single();

      if (taskError || !task) {
        throw new Error('Task not found');
      }

      // Verify source agent has permission
      const hasPermission = await collabManager.checkTaskPermission(
        input.taskId,
        input.fromAgentId,
        input.organizationId
      );

      if (!hasPermission) {
        throw new Error('Source agent does not have permission for this task');
      }

      // Verify target agent is a collaborator on the goal
      const targetCollab = await collabManager.getCollaborationByAgent(
        task.goal_id,
        input.toAgentId,
        input.organizationId
      );

      if (!targetCollab || targetCollab.status !== 'ACCEPTED') {
        throw new Error('Target agent is not a collaborator on this goal');
      }

      // Check target agent has appropriate scope
      const hasScope = await collabManager.hasScope(
        task.goal_id,
        input.toAgentId,
        'TASK_ONLY',
        input.organizationId
      );

      if (!hasScope) {
        throw new Error('Target agent does not have task execution scope');
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: input.organizationId,
      });

      // Create handoff record
      const { data, error } = await supabase
        .from('agent_handoffs')
        .insert({
          task_id: input.taskId,
          from_agent_id: input.fromAgentId,
          to_agent_id: input.toAgentId,
          handoff_reason: input.handoffReason,
          handoff_message: input.handoffMessage || null,
          status: 'INITIATED',
          organization_id: input.organizationId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create handoff', error);
        throw new Error(`Failed to initiate handoff: ${error.message}`);
      }

      logger.info('Handoff initiated successfully', { handoffId: data.id });
      return this.mapToHandoff(data);
    } catch (error) {
      logger.error('Error initiating handoff', error);
      throw error;
    }
  }

  /**
   * Approve a handoff request
   */
  async approveHandoff(
    handoffId: string,
    input: ResolveAgentHandoffInput,
    organizationId: string
  ): Promise<AgentHandoff> {
    try {
      logger.info('Approving handoff', { handoffId, organizationId });

      if (input.status !== 'ACCEPTED') {
        throw new Error('Use approveHandoff only for accepting handoffs');
      }

      // Get handoff details
      const handoff = await this.getHandoff(handoffId, organizationId);

      if (handoff.status !== 'INITIATED') {
        throw new Error('Handoff is not in INITIATED status');
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      // Update handoff status
      const { data, error } = await supabase
        .from('agent_handoffs')
        .update({
          status: 'ACCEPTED',
          resolution_notes: input.resolutionNotes || null,
          resolved_by: input.resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', handoffId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to approve handoff', error);
        throw new Error(`Failed to approve handoff: ${error.message}`);
      }

      // Reassign the task to the target agent
      await this.reassignTask(handoff.taskId, handoff.toAgentId, organizationId);

      logger.info('Handoff approved and task reassigned', {
        handoffId,
        taskId: handoff.taskId,
        newAgentId: handoff.toAgentId,
      });

      return this.mapToHandoff(data);
    } catch (error) {
      logger.error('Error approving handoff', error);
      throw error;
    }
  }

  /**
   * Reject a handoff request
   */
  async rejectHandoff(
    handoffId: string,
    input: ResolveAgentHandoffInput,
    organizationId: string
  ): Promise<AgentHandoff> {
    try {
      logger.info('Rejecting handoff', { handoffId, organizationId });

      if (input.status !== 'REJECTED') {
        throw new Error('Use rejectHandoff only for rejecting handoffs');
      }

      // Get handoff details
      const handoff = await this.getHandoff(handoffId, organizationId);

      if (handoff.status !== 'INITIATED') {
        throw new Error('Handoff is not in INITIATED status');
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      // Update handoff status
      const { data, error } = await supabase
        .from('agent_handoffs')
        .update({
          status: 'REJECTED',
          resolution_notes: input.resolutionNotes || null,
          resolved_by: input.resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', handoffId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to reject handoff', error);
        throw new Error(`Failed to reject handoff: ${error.message}`);
      }

      logger.info('Handoff rejected', { handoffId });
      return this.mapToHandoff(data);
    } catch (error) {
      logger.error('Error rejecting handoff', error);
      throw error;
    }
  }

  /**
   * Cancel a handoff (initiated by the source agent)
   */
  async cancelHandoff(
    handoffId: string,
    organizationId: string
  ): Promise<AgentHandoff> {
    try {
      logger.info('Cancelling handoff', { handoffId, organizationId });

      // Get handoff details
      const handoff = await this.getHandoff(handoffId, organizationId);

      if (handoff.status !== 'INITIATED') {
        throw new Error('Can only cancel handoffs in INITIATED status');
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      // Update handoff status
      const { data, error } = await supabase
        .from('agent_handoffs')
        .update({
          status: 'CANCELLED',
        })
        .eq('id', handoffId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to cancel handoff', error);
        throw new Error(`Failed to cancel handoff: ${error.message}`);
      }

      logger.info('Handoff cancelled', { handoffId });
      return this.mapToHandoff(data);
    } catch (error) {
      logger.error('Error cancelling handoff', error);
      throw error;
    }
  }

  /**
   * Mark a handoff as completed
   */
  async completeHandoff(
    handoffId: string,
    organizationId: string
  ): Promise<AgentHandoff> {
    try {
      logger.info('Completing handoff', { handoffId, organizationId });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_handoffs')
        .update({
          status: 'COMPLETED',
        })
        .eq('id', handoffId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to complete handoff', error);
        throw new Error(`Failed to complete handoff: ${error.message}`);
      }

      logger.info('Handoff completed', { handoffId });
      return this.mapToHandoff(data);
    } catch (error) {
      logger.error('Error completing handoff', error);
      throw error;
    }
  }

  /**
   * Get handoff by ID
   */
  async getHandoff(handoffId: string, organizationId: string): Promise<AgentHandoff> {
    try {
      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_handoffs')
        .select('*')
        .eq('id', handoffId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        logger.error('Failed to fetch handoff', error);
        throw new Error(`Failed to fetch handoff: ${error.message}`);
      }

      return this.mapToHandoff(data);
    } catch (error) {
      logger.error('Error fetching handoff', error);
      throw error;
    }
  }

  /**
   * Get all handoffs for a task
   */
  async getTaskHandoffs(
    taskId: string,
    organizationId: string
  ): Promise<AgentHandoff[]> {
    try {
      logger.info('Fetching task handoffs', { taskId, organizationId });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_handoffs')
        .select('*')
        .eq('task_id', taskId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch task handoffs', error);
        throw new Error(`Failed to fetch task handoffs: ${error.message}`);
      }

      return (data || []).map(this.mapToHandoff);
    } catch (error) {
      logger.error('Error fetching task handoffs', error);
      throw error;
    }
  }

  /**
   * Get pending handoffs for an agent (as recipient)
   */
  async getPendingHandoffs(
    agentId: string,
    organizationId: string
  ): Promise<AgentHandoff[]> {
    try {
      logger.info('Fetching pending handoffs', { agentId, organizationId });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_handoffs')
        .select('*')
        .eq('to_agent_id', agentId)
        .eq('status', 'INITIATED')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch pending handoffs', error);
        throw new Error(`Failed to fetch pending handoffs: ${error.message}`);
      }

      return (data || []).map(this.mapToHandoff);
    } catch (error) {
      logger.error('Error fetching pending handoffs', error);
      throw error;
    }
  }

  /**
   * Reassign a task to a different agent
   */
  private async reassignTask(
    taskId: string,
    newAgentId: string,
    organizationId: string
  ): Promise<void> {
    try {
      logger.info('Reassigning task', {
        taskId,
        newAgentId,
        organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { error } = await supabase
        .from('agent_tasks')
        .update({
          agent_id: newAgentId,
        })
        .eq('id', taskId)
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Failed to reassign task', error);
        throw new Error(`Failed to reassign task: ${error.message}`);
      }

      logger.info('Task reassigned successfully', { taskId, newAgentId });
    } catch (error) {
      logger.error('Error reassigning task', error);
      throw error;
    }
  }

  /**
   * Map database row to AgentHandoff type
   */
  private mapToHandoff(row: any): AgentHandoff {
    return {
      id: row.id,
      taskId: row.task_id,
      fromAgentId: row.from_agent_id,
      toAgentId: row.to_agent_id,
      handoffReason: row.handoff_reason,
      handoffMessage: row.handoff_message,
      status: row.status as HandoffStatus,
      resolutionNotes: row.resolution_notes,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      organizationId: row.organization_id,
    };
  }
}

// Singleton instance
export const handoffEngine = new HandoffEngine();
