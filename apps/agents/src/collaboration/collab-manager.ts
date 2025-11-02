// =====================================================
// COLLABORATION MANAGER
// =====================================================
// Manages agent collaborations on shared goals with role-based access control

import { createClient } from '@supabase/supabase-js';
import type {
  AgentCollaboration,
  CreateAgentCollaborationInput,
  UpdateAgentCollaborationInput,
  CollaborationRole,
  CollaborationScope,
  CollaborationStatus,
  CollaborationSummary,
} from '@pravado/shared-types';
import { logger } from '../../../api/src/lib/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Collaboration Manager - Interface for managing multi-agent collaborations
 */
export class CollabManager {
  /**
   * Add an agent as a collaborator to a goal
   */
  async joinGoal(input: CreateAgentCollaborationInput): Promise<AgentCollaboration> {
    try {
      logger.info('Agent joining goal as collaborator', {
        goalId: input.goalId,
        agentId: input.agentId,
        role: input.role,
        organizationId: input.organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: input.organizationId,
      });

      const { data, error } = await supabase
        .from('agent_collaborations')
        .insert({
          goal_id: input.goalId,
          agent_id: input.agentId,
          role: input.role,
          scope: input.scope || 'FULL',
          collaboration_notes: input.collaborationNotes || null,
          invited_by: input.invitedBy || null,
          organization_id: input.organizationId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create collaboration', error);
        throw new Error(`Failed to join goal: ${error.message}`);
      }

      return this.mapToCollaboration(data);
    } catch (error) {
      logger.error('Error joining goal', error);
      throw error;
    }
  }

  /**
   * Remove an agent from a goal collaboration
   */
  async leaveGoal(
    goalId: string,
    agentId: string,
    organizationId: string
  ): Promise<void> {
    try {
      logger.info('Agent leaving goal collaboration', {
        goalId,
        agentId,
        organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { error } = await supabase
        .from('agent_collaborations')
        .delete()
        .eq('goal_id', goalId)
        .eq('agent_id', agentId)
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Failed to leave goal', error);
        throw new Error(`Failed to leave goal: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error leaving goal', error);
      throw error;
    }
  }

  /**
   * Update a collaboration (change role, scope, or status)
   */
  async updateCollaboration(
    collaborationId: string,
    updates: UpdateAgentCollaborationInput,
    organizationId: string
  ): Promise<AgentCollaboration> {
    try {
      logger.info('Updating collaboration', {
        collaborationId,
        updates,
        organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const updateData: any = {};
      if (updates.status !== undefined) {
        updateData.status = updates.status;

        // Set timestamps based on status
        if (updates.status === 'ACCEPTED') {
          updateData.accepted_at = new Date().toISOString();
        } else if (updates.status === 'DECLINED') {
          updateData.declined_at = new Date().toISOString();
        }
      }
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.scope !== undefined) updateData.scope = updates.scope;
      if (updates.collaborationNotes !== undefined) {
        updateData.collaboration_notes = updates.collaborationNotes;
      }

      const { data, error } = await supabase
        .from('agent_collaborations')
        .update(updateData)
        .eq('id', collaborationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update collaboration', error);
        throw new Error(`Failed to update collaboration: ${error.message}`);
      }

      return this.mapToCollaboration(data);
    } catch (error) {
      logger.error('Error updating collaboration', error);
      throw error;
    }
  }

  /**
   * Get all collaborators for a goal
   */
  async getGoalCollaborators(
    goalId: string,
    organizationId: string
  ): Promise<AgentCollaboration[]> {
    try {
      logger.info('Fetching goal collaborators', {
        goalId,
        organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_collaborations')
        .select('*')
        .eq('goal_id', goalId)
        .eq('organization_id', organizationId)
        .order('role', { ascending: true });

      if (error) {
        logger.error('Failed to fetch collaborators', error);
        throw new Error(`Failed to fetch collaborators: ${error.message}`);
      }

      return (data || []).map(this.mapToCollaboration);
    } catch (error) {
      logger.error('Error fetching collaborators', error);
      throw error;
    }
  }

  /**
   * Get active collaborators for a goal (accepted only)
   */
  async getActiveCollaborators(
    goalId: string,
    organizationId: string
  ): Promise<AgentCollaboration[]> {
    try {
      logger.info('Fetching active collaborators', {
        goalId,
        organizationId,
      });

      // Use the PostgreSQL function
      const { data, error } = await supabase.rpc('get_goal_collaborators', {
        p_goal_id: goalId,
        p_organization_id: organizationId,
      });

      if (error) {
        logger.error('Failed to fetch active collaborators', error);
        throw new Error(`Failed to fetch active collaborators: ${error.message}`);
      }

      // Fetch full collaboration details for each agent
      const agentIds = (data || []).map((c: any) => c.agent_id);

      if (agentIds.length === 0) {
        return [];
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data: collaborations, error: fetchError } = await supabase
        .from('agent_collaborations')
        .select('*')
        .eq('goal_id', goalId)
        .eq('status', 'ACCEPTED')
        .in('agent_id', agentIds)
        .eq('organization_id', organizationId);

      if (fetchError) {
        logger.error('Failed to fetch collaboration details', fetchError);
        throw new Error(`Failed to fetch collaboration details: ${fetchError.message}`);
      }

      return (collaborations || []).map(this.mapToCollaboration);
    } catch (error) {
      logger.error('Error fetching active collaborators', error);
      throw error;
    }
  }

  /**
   * Check if an agent has permission to execute a task
   */
  async checkTaskPermission(
    taskId: string,
    agentId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      logger.info('Checking task permission', {
        taskId,
        agentId,
        organizationId,
      });

      const { data, error } = await supabase.rpc('check_agent_task_permission', {
        p_task_id: taskId,
        p_agent_id: agentId,
        p_organization_id: organizationId,
      });

      if (error) {
        logger.error('Failed to check task permission', error);
        return false;
      }

      return data === true;
    } catch (error) {
      logger.error('Error checking task permission', error);
      return false;
    }
  }

  /**
   * Get collaboration by agent and goal
   */
  async getCollaborationByAgent(
    goalId: string,
    agentId: string,
    organizationId: string
  ): Promise<AgentCollaboration | null> {
    try {
      logger.info('Fetching agent collaboration', {
        goalId,
        agentId,
        organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_collaborations')
        .select('*')
        .eq('goal_id', goalId)
        .eq('agent_id', agentId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('Failed to fetch collaboration', error);
        throw new Error(`Failed to fetch collaboration: ${error.message}`);
      }

      return this.mapToCollaboration(data);
    } catch (error) {
      logger.error('Error fetching collaboration', error);
      throw error;
    }
  }

  /**
   * Check if an agent has a specific role for a goal
   */
  async hasRole(
    goalId: string,
    agentId: string,
    role: CollaborationRole,
    organizationId: string
  ): Promise<boolean> {
    try {
      const collab = await this.getCollaborationByAgent(goalId, agentId, organizationId);
      return collab !== null && collab.role === role && collab.status === 'ACCEPTED';
    } catch (error) {
      logger.error('Error checking role', error);
      return false;
    }
  }

  /**
   * Check if an agent has at least a specific scope for a goal
   */
  async hasScope(
    goalId: string,
    agentId: string,
    requiredScope: CollaborationScope,
    organizationId: string
  ): Promise<boolean> {
    try {
      const collab = await this.getCollaborationByAgent(goalId, agentId, organizationId);

      if (!collab || collab.status !== 'ACCEPTED') {
        return false;
      }

      // FULL scope has access to everything
      if (collab.scope === 'FULL') return true;

      // Check specific scopes
      if (requiredScope === 'TASK_ONLY' && collab.scope === 'TASK_ONLY') return true;
      if (requiredScope === 'SUMMARY_ONLY') return true; // All scopes include summary

      return false;
    } catch (error) {
      logger.error('Error checking scope', error);
      return false;
    }
  }

  /**
   * Get collaboration summary for a goal
   */
  async getCollaborationSummary(
    goalId: string,
    organizationId: string
  ): Promise<CollaborationSummary> {
    try {
      logger.info('Fetching collaboration summary', {
        goalId,
        organizationId,
      });

      const collaborators = await this.getActiveCollaborators(goalId, organizationId);

      // Get handoff count
      const { count: handoffCount } = await supabase
        .from('agent_handoffs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['INITIATED', 'ACCEPTED'])
        .eq('organization_id', organizationId);

      // Get message count
      const { count: messageCount } = await supabase
        .from('agent_messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      return {
        goalId,
        collaborators: collaborators.map((c) => ({
          agentId: c.agentId,
          role: c.role,
          scope: c.scope,
        })),
        activeHandoffs: handoffCount || 0,
        totalMessages: messageCount || 0,
      };
    } catch (error) {
      logger.error('Error fetching collaboration summary', error);
      throw error;
    }
  }

  /**
   * Map database row to AgentCollaboration type
   */
  private mapToCollaboration(row: any): AgentCollaboration {
    return {
      id: row.id,
      goalId: row.goal_id,
      agentId: row.agent_id,
      role: row.role as CollaborationRole,
      scope: row.scope as CollaborationScope,
      status: row.status as CollaborationStatus,
      collaborationNotes: row.collaboration_notes,
      invitedBy: row.invited_by,
      invitedAt: new Date(row.invited_at),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
      declinedAt: row.declined_at ? new Date(row.declined_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      organizationId: row.organization_id,
    };
  }
}

// Singleton instance
export const collabManager = new CollabManager();
