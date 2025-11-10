"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalMonitor = exports.GoalMonitor = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const memory_1 = require("../memory");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class GoalMonitor {
    async getGoalSummary(goalId, organizationId) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get goal summary', error);
            return null;
        }
    }
    async checkGoalCompletion(goalId, organizationId) {
        const summary = await this.getGoalSummary(goalId, organizationId);
        if (!summary) {
            return false;
        }
        return (summary.totalTasks > 0 &&
            summary.completedTasks === summary.totalTasks);
    }
    async updateGoalStatus(goalId, status, failureReason) {
        const updates = {
            status,
            updated_at: new Date().toISOString(),
        };
        if (status === 'ACTIVE' && !updates.started_at) {
            updates.started_at = new Date().toISOString();
        }
        else if (status === 'COMPLETED') {
            updates.completed_at = new Date().toISOString();
        }
        else if (status === 'FAILED') {
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
    async logReasoningTrace(taskId, agentId, reasoning, organizationId) {
        try {
            await memory_1.memoryStore.addMemory({
                agentId,
                memoryType: 'REFLECTION',
                content: `Task reasoning: ${reasoning}`,
                organizationId,
                contextTags: ['task', 'reasoning', taskId],
                importanceScore: 0.6,
            });
            logger_1.logger.info('Reasoning trace logged', { taskId, agentId });
        }
        catch (error) {
            logger_1.logger.error('Failed to log reasoning trace', error);
        }
    }
    async getGoalProgress(goalId, organizationId) {
        const summary = await this.getGoalSummary(goalId, organizationId);
        if (!summary || summary.totalTasks === 0) {
            return 0;
        }
        return (summary.completedTasks / summary.totalTasks) * 100;
    }
    async getGoal(goalId, organizationId) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get goal', error);
            return null;
        }
    }
    async requiresApproval(goalId) {
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
    async approveGoal(goalId, approvedBy) {
        await supabase
            .from('agent_goals')
            .update({
            approved_at: new Date().toISOString(),
            approved_by: approvedBy,
            updated_at: new Date().toISOString(),
        })
            .eq('id', goalId);
        logger_1.logger.info('Goal approved', { goalId, approvedBy });
    }
    mapToAgentGoal(row) {
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
exports.GoalMonitor = GoalMonitor;
exports.goalMonitor = new GoalMonitor();
//# sourceMappingURL=goal-monitor.js.map