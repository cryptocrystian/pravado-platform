"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collabManager = exports.CollabManager = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class CollabManager {
    async joinGoal(input) {
        try {
            logger_1.logger.info('Agent joining goal as collaborator', {
                goalId: input.goalId,
                agentId: input.agentId,
                role: input.role,
                organizationId: input.organizationId,
            });
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
                logger_1.logger.error('Failed to create collaboration', error);
                throw new Error(`Failed to join goal: ${error.message}`);
            }
            return this.mapToCollaboration(data);
        }
        catch (error) {
            logger_1.logger.error('Error joining goal', error);
            throw error;
        }
    }
    async leaveGoal(goalId, agentId, organizationId) {
        try {
            logger_1.logger.info('Agent leaving goal collaboration', {
                goalId,
                agentId,
                organizationId,
            });
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
                logger_1.logger.error('Failed to leave goal', error);
                throw new Error(`Failed to leave goal: ${error.message}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Error leaving goal', error);
            throw error;
        }
    }
    async updateCollaboration(collaborationId, updates, organizationId) {
        try {
            logger_1.logger.info('Updating collaboration', {
                collaborationId,
                updates,
                organizationId,
            });
            await supabase.rpc('set_config', {
                setting_name: 'app.current_organization_id',
                setting_value: organizationId,
            });
            const updateData = {};
            if (updates.status !== undefined) {
                updateData.status = updates.status;
                if (updates.status === 'ACCEPTED') {
                    updateData.accepted_at = new Date().toISOString();
                }
                else if (updates.status === 'DECLINED') {
                    updateData.declined_at = new Date().toISOString();
                }
            }
            if (updates.role !== undefined)
                updateData.role = updates.role;
            if (updates.scope !== undefined)
                updateData.scope = updates.scope;
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
                logger_1.logger.error('Failed to update collaboration', error);
                throw new Error(`Failed to update collaboration: ${error.message}`);
            }
            return this.mapToCollaboration(data);
        }
        catch (error) {
            logger_1.logger.error('Error updating collaboration', error);
            throw error;
        }
    }
    async getGoalCollaborators(goalId, organizationId) {
        try {
            logger_1.logger.info('Fetching goal collaborators', {
                goalId,
                organizationId,
            });
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
                logger_1.logger.error('Failed to fetch collaborators', error);
                throw new Error(`Failed to fetch collaborators: ${error.message}`);
            }
            return (data || []).map(this.mapToCollaboration);
        }
        catch (error) {
            logger_1.logger.error('Error fetching collaborators', error);
            throw error;
        }
    }
    async getActiveCollaborators(goalId, organizationId) {
        try {
            logger_1.logger.info('Fetching active collaborators', {
                goalId,
                organizationId,
            });
            const { data, error } = await supabase.rpc('get_goal_collaborators', {
                p_goal_id: goalId,
                p_organization_id: organizationId,
            });
            if (error) {
                logger_1.logger.error('Failed to fetch active collaborators', error);
                throw new Error(`Failed to fetch active collaborators: ${error.message}`);
            }
            const agentIds = (data || []).map((c) => c.agent_id);
            if (agentIds.length === 0) {
                return [];
            }
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
                logger_1.logger.error('Failed to fetch collaboration details', fetchError);
                throw new Error(`Failed to fetch collaboration details: ${fetchError.message}`);
            }
            return (collaborations || []).map(this.mapToCollaboration);
        }
        catch (error) {
            logger_1.logger.error('Error fetching active collaborators', error);
            throw error;
        }
    }
    async checkTaskPermission(taskId, agentId, organizationId) {
        try {
            logger_1.logger.info('Checking task permission', {
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
                logger_1.logger.error('Failed to check task permission', error);
                return false;
            }
            return data === true;
        }
        catch (error) {
            logger_1.logger.error('Error checking task permission', error);
            return false;
        }
    }
    async getCollaborationByAgent(goalId, agentId, organizationId) {
        try {
            logger_1.logger.info('Fetching agent collaboration', {
                goalId,
                agentId,
                organizationId,
            });
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
                    return null;
                }
                logger_1.logger.error('Failed to fetch collaboration', error);
                throw new Error(`Failed to fetch collaboration: ${error.message}`);
            }
            return this.mapToCollaboration(data);
        }
        catch (error) {
            logger_1.logger.error('Error fetching collaboration', error);
            throw error;
        }
    }
    async hasRole(goalId, agentId, role, organizationId) {
        try {
            const collab = await this.getCollaborationByAgent(goalId, agentId, organizationId);
            return collab !== null && collab.role === role && collab.status === 'ACCEPTED';
        }
        catch (error) {
            logger_1.logger.error('Error checking role', error);
            return false;
        }
    }
    async hasScope(goalId, agentId, requiredScope, organizationId) {
        try {
            const collab = await this.getCollaborationByAgent(goalId, agentId, organizationId);
            if (!collab || collab.status !== 'ACCEPTED') {
                return false;
            }
            if (collab.scope === 'FULL')
                return true;
            if (requiredScope === 'TASK_ONLY' && collab.scope === 'TASK_ONLY')
                return true;
            if (requiredScope === 'SUMMARY_ONLY')
                return true;
            return false;
        }
        catch (error) {
            logger_1.logger.error('Error checking scope', error);
            return false;
        }
    }
    async getCollaborationSummary(goalId, organizationId) {
        try {
            logger_1.logger.info('Fetching collaboration summary', {
                goalId,
                organizationId,
            });
            const collaborators = await this.getActiveCollaborators(goalId, organizationId);
            const { count: handoffCount } = await supabase
                .from('agent_handoffs')
                .select('*', { count: 'exact', head: true })
                .in('status', ['INITIATED', 'ACCEPTED'])
                .eq('organization_id', organizationId);
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching collaboration summary', error);
            throw error;
        }
    }
    mapToCollaboration(row) {
        return {
            id: row.id,
            goalId: row.goal_id,
            agentId: row.agent_id,
            role: row.role,
            scope: row.scope,
            status: row.status,
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
exports.CollabManager = CollabManager;
exports.collabManager = new CollabManager();
//# sourceMappingURL=collab-manager.js.map