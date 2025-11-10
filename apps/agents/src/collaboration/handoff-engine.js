"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handoffEngine = exports.HandoffEngine = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const collab_manager_1 = require("./collab-manager");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class HandoffEngine {
    async initiateHandoff(input) {
        try {
            logger_1.logger.info('Initiating agent handoff', {
                taskId: input.taskId,
                fromAgentId: input.fromAgentId,
                toAgentId: input.toAgentId,
                organizationId: input.organizationId,
            });
            if (input.fromAgentId === input.toAgentId) {
                throw new Error('Cannot handoff task to the same agent');
            }
            const { data: task, error: taskError } = await supabase
                .from('agent_tasks')
                .select('goal_id, agent_id')
                .eq('id', input.taskId)
                .eq('organization_id', input.organizationId)
                .single();
            if (taskError || !task) {
                throw new Error('Task not found');
            }
            const hasPermission = await collab_manager_1.collabManager.checkTaskPermission(input.taskId, input.fromAgentId, input.organizationId);
            if (!hasPermission) {
                throw new Error('Source agent does not have permission for this task');
            }
            const targetCollab = await collab_manager_1.collabManager.getCollaborationByAgent(task.goal_id, input.toAgentId, input.organizationId);
            if (!targetCollab || targetCollab.status !== 'ACCEPTED') {
                throw new Error('Target agent is not a collaborator on this goal');
            }
            const hasScope = await collab_manager_1.collabManager.hasScope(task.goal_id, input.toAgentId, 'TASK_ONLY', input.organizationId);
            if (!hasScope) {
                throw new Error('Target agent does not have task execution scope');
            }
            await supabase.rpc('set_config', {
                setting_name: 'app.current_organization_id',
                setting_value: input.organizationId,
            });
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
                logger_1.logger.error('Failed to create handoff', error);
                throw new Error(`Failed to initiate handoff: ${error.message}`);
            }
            logger_1.logger.info('Handoff initiated successfully', { handoffId: data.id });
            return this.mapToHandoff(data);
        }
        catch (error) {
            logger_1.logger.error('Error initiating handoff', error);
            throw error;
        }
    }
    async approveHandoff(handoffId, input, organizationId) {
        try {
            logger_1.logger.info('Approving handoff', { handoffId, organizationId });
            if (input.status !== 'ACCEPTED') {
                throw new Error('Use approveHandoff only for accepting handoffs');
            }
            const handoff = await this.getHandoff(handoffId, organizationId);
            if (handoff.status !== 'INITIATED') {
                throw new Error('Handoff is not in INITIATED status');
            }
            await supabase.rpc('set_config', {
                setting_name: 'app.current_organization_id',
                setting_value: organizationId,
            });
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
                logger_1.logger.error('Failed to approve handoff', error);
                throw new Error(`Failed to approve handoff: ${error.message}`);
            }
            await this.reassignTask(handoff.taskId, handoff.toAgentId, organizationId);
            logger_1.logger.info('Handoff approved and task reassigned', {
                handoffId,
                taskId: handoff.taskId,
                newAgentId: handoff.toAgentId,
            });
            return this.mapToHandoff(data);
        }
        catch (error) {
            logger_1.logger.error('Error approving handoff', error);
            throw error;
        }
    }
    async rejectHandoff(handoffId, input, organizationId) {
        try {
            logger_1.logger.info('Rejecting handoff', { handoffId, organizationId });
            if (input.status !== 'REJECTED') {
                throw new Error('Use rejectHandoff only for rejecting handoffs');
            }
            const handoff = await this.getHandoff(handoffId, organizationId);
            if (handoff.status !== 'INITIATED') {
                throw new Error('Handoff is not in INITIATED status');
            }
            await supabase.rpc('set_config', {
                setting_name: 'app.current_organization_id',
                setting_value: organizationId,
            });
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
                logger_1.logger.error('Failed to reject handoff', error);
                throw new Error(`Failed to reject handoff: ${error.message}`);
            }
            logger_1.logger.info('Handoff rejected', { handoffId });
            return this.mapToHandoff(data);
        }
        catch (error) {
            logger_1.logger.error('Error rejecting handoff', error);
            throw error;
        }
    }
    async cancelHandoff(handoffId, organizationId) {
        try {
            logger_1.logger.info('Cancelling handoff', { handoffId, organizationId });
            const handoff = await this.getHandoff(handoffId, organizationId);
            if (handoff.status !== 'INITIATED') {
                throw new Error('Can only cancel handoffs in INITIATED status');
            }
            await supabase.rpc('set_config', {
                setting_name: 'app.current_organization_id',
                setting_value: organizationId,
            });
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
                logger_1.logger.error('Failed to cancel handoff', error);
                throw new Error(`Failed to cancel handoff: ${error.message}`);
            }
            logger_1.logger.info('Handoff cancelled', { handoffId });
            return this.mapToHandoff(data);
        }
        catch (error) {
            logger_1.logger.error('Error cancelling handoff', error);
            throw error;
        }
    }
    async completeHandoff(handoffId, organizationId) {
        try {
            logger_1.logger.info('Completing handoff', { handoffId, organizationId });
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
                logger_1.logger.error('Failed to complete handoff', error);
                throw new Error(`Failed to complete handoff: ${error.message}`);
            }
            logger_1.logger.info('Handoff completed', { handoffId });
            return this.mapToHandoff(data);
        }
        catch (error) {
            logger_1.logger.error('Error completing handoff', error);
            throw error;
        }
    }
    async getHandoff(handoffId, organizationId) {
        try {
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
                logger_1.logger.error('Failed to fetch handoff', error);
                throw new Error(`Failed to fetch handoff: ${error.message}`);
            }
            return this.mapToHandoff(data);
        }
        catch (error) {
            logger_1.logger.error('Error fetching handoff', error);
            throw error;
        }
    }
    async getTaskHandoffs(taskId, organizationId) {
        try {
            logger_1.logger.info('Fetching task handoffs', { taskId, organizationId });
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
                logger_1.logger.error('Failed to fetch task handoffs', error);
                throw new Error(`Failed to fetch task handoffs: ${error.message}`);
            }
            return (data || []).map(this.mapToHandoff);
        }
        catch (error) {
            logger_1.logger.error('Error fetching task handoffs', error);
            throw error;
        }
    }
    async getPendingHandoffs(agentId, organizationId) {
        try {
            logger_1.logger.info('Fetching pending handoffs', { agentId, organizationId });
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
                logger_1.logger.error('Failed to fetch pending handoffs', error);
                throw new Error(`Failed to fetch pending handoffs: ${error.message}`);
            }
            return (data || []).map(this.mapToHandoff);
        }
        catch (error) {
            logger_1.logger.error('Error fetching pending handoffs', error);
            throw error;
        }
    }
    async reassignTask(taskId, newAgentId, organizationId) {
        try {
            logger_1.logger.info('Reassigning task', {
                taskId,
                newAgentId,
                organizationId,
            });
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
                logger_1.logger.error('Failed to reassign task', error);
                throw new Error(`Failed to reassign task: ${error.message}`);
            }
            logger_1.logger.info('Task reassigned successfully', { taskId, newAgentId });
        }
        catch (error) {
            logger_1.logger.error('Error reassigning task', error);
            throw error;
        }
    }
    mapToHandoff(row) {
        return {
            id: row.id,
            taskId: row.task_id,
            fromAgentId: row.from_agent_id,
            toAgentId: row.to_agent_id,
            handoffReason: row.handoff_reason,
            handoffMessage: row.handoff_message,
            status: row.status,
            resolutionNotes: row.resolution_notes,
            resolvedBy: row.resolved_by,
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            organizationId: row.organization_id,
        };
    }
}
exports.HandoffEngine = HandoffEngine;
exports.handoffEngine = new HandoffEngine();
//# sourceMappingURL=handoff-engine.js.map