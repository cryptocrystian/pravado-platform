"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoCampaignAgent = exports.AutoCampaignAgent = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const auto_campaign_planner_1 = require("../planning/auto-campaign-planner");
const campaign_templates_1 = require("../planning/campaign-templates");
const planning_1 = require("../planning");
const memory_1 = require("../memory");
const collaboration_1 = require("../collaboration");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class AutoCampaignAgent {
    async createCampaign(request, organizationId, userId) {
        try {
            logger_1.logger.info('[AutoCampaignAgent] Creating autonomous campaign', {
                prompt: request.prompt.substring(0, 100),
                organizationId,
            });
            logger_1.logger.info('[AutoCampaignAgent] Step 1: Planning campaign strategy');
            const planningOutput = await auto_campaign_planner_1.autoCampaignPlanner.planCampaign(request, organizationId);
            logger_1.logger.info('[AutoCampaignAgent] Step 2: Critiquing campaign plan');
            const critique = await auto_campaign_planner_1.autoCampaignPlanner.critiquePlan(planningOutput, organizationId);
            logger_1.logger.info('[AutoCampaignAgent] Step 3: Creating campaign record');
            const campaign = await this.storeCampaign({
                title: planningOutput.strategyDoc.objectives[0] || 'Autonomous Campaign',
                description: request.prompt,
                campaignType: request.campaignType || 'CUSTOM',
                originalPrompt: request.prompt,
                planningOutput,
                qualityScore: critique.score,
                organizationId,
                userId,
            });
            await this.storeMemory(campaign, planningOutput, critique, organizationId);
            logger_1.logger.info('[AutoCampaignAgent] Campaign created successfully', {
                campaignId: campaign.id,
                qualityScore: critique.score,
            });
            return campaign;
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignAgent] Failed to create campaign', error);
            throw error;
        }
    }
    async executeCampaign(campaignId, organizationId, dryRun = false) {
        try {
            logger_1.logger.info('[AutoCampaignAgent] Starting campaign execution', {
                campaignId,
                dryRun,
            });
            const campaign = await this.getCampaign(campaignId, organizationId);
            if (!campaign.planningOutput) {
                throw new Error('Campaign has no planning output');
            }
            await this.updateCampaignStatus(campaignId, 'RUNNING', organizationId);
            logger_1.logger.info('[AutoCampaignAgent] Creating execution graph');
            const template = (0, campaign_templates_1.getCampaignTemplate)(campaign.campaignType);
            if (!template) {
                throw new Error(`No template found for campaign type: ${campaign.campaignType}`);
            }
            const executionGraph = (0, campaign_templates_1.createExecutionGraphFromTemplate)(template, campaign.planningOutput, campaignId);
            logger_1.logger.info('[AutoCampaignAgent] Creating execution goal');
            const goal = await this.createExecutionGoal(campaign, organizationId, campaign.createdBy);
            const { data: graphData, error: graphError } = await supabase
                .from('execution_graphs')
                .insert({
                goal_id: goal.id,
                agent_id: 'auto-campaign-orchestrator',
                graph_data: executionGraph,
                total_nodes: executionGraph.nodes.length,
                max_depth: executionGraph.metadata.maxDepth,
                execution_status: 'PENDING',
                organization_id: organizationId,
            })
                .select()
                .single();
            if (graphError) {
                throw new Error(`Failed to store execution graph: ${graphError.message}`);
            }
            await supabase
                .from('autonomous_campaigns')
                .update({ execution_graph_id: graphData.id })
                .eq('id', campaignId)
                .eq('organization_id', organizationId);
            logger_1.logger.info('[AutoCampaignAgent] Setting up agent collaboration');
            await this.setupCollaboration(goal.id, organizationId);
            if (!dryRun) {
                logger_1.logger.info('[AutoCampaignAgent] Executing campaign graph');
                await planning_1.plannerEngine.executeGraph(goal.id, organizationId);
            }
            else {
                logger_1.logger.info('[AutoCampaignAgent] Dry run - skipping execution');
            }
            logger_1.logger.info('[AutoCampaignAgent] Campaign execution initiated', {
                campaignId,
                goalId: goal.id,
                graphId: graphData.id,
            });
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignAgent] Campaign execution failed', error);
            await this.updateCampaignStatus(campaignId, 'FAILED', organizationId, error.message);
            throw error;
        }
    }
    async updateCampaignProgress(campaignId, organizationId) {
        try {
            const campaign = await this.getCampaign(campaignId, organizationId);
            if (!campaign.executionGraphId) {
                return;
            }
            const { data: graph } = await supabase
                .from('execution_graphs')
                .select('*')
                .eq('id', campaign.executionGraphId)
                .single();
            if (!graph) {
                return;
            }
            const { data: stats } = await supabase.rpc('get_campaign_statistics', {
                p_campaign_id: campaignId,
                p_organization_id: organizationId,
            });
            if (stats && stats.length > 0) {
                const progress = stats[0];
                await supabase
                    .from('autonomous_campaigns')
                    .update({
                    execution_metadata: {
                        ...(campaign.executionMetadata || {}),
                        progress: {
                            totalTasks: progress.total_tasks,
                            completedTasks: progress.completed_tasks,
                            failedTasks: progress.failed_tasks,
                            percentage: progress.progress_percentage,
                        },
                    },
                })
                    .eq('id', campaignId)
                    .eq('organization_id', organizationId);
            }
            if (graph.execution_status === 'COMPLETED') {
                await this.completeCampaign(campaignId, organizationId);
            }
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignAgent] Failed to update progress', error);
        }
    }
    async storeCampaign(input) {
        const { data, error } = await supabase
            .from('autonomous_campaigns')
            .insert({
            title: input.title,
            description: input.description,
            campaign_type: input.campaignType,
            original_prompt: input.originalPrompt,
            planning_output: input.planningOutput,
            quality_score: input.qualityScore,
            planning_agent_id: 'auto-campaign-planner',
            orchestrator_agent_id: 'auto-campaign-orchestrator',
            organization_id: input.organizationId,
            created_by: input.userId,
            status: 'PLANNING',
            target_contact_criteria: input.planningOutput.contactCriteria,
            target_outlet_types: input.planningOutput.contactCriteria.outletTypes,
            target_topics: input.planningOutput.contactCriteria.topics,
            kpis: input.planningOutput.metricsPlan.kpis,
            monitoring_setup: input.planningOutput.metricsPlan.monitoring,
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to store campaign: ${error.message}`);
        }
        return this.mapToCampaign(data);
    }
    async createExecutionGoal(campaign, organizationId, userId) {
        const goalInput = {
            agentId: 'auto-campaign-orchestrator',
            title: `Execute: ${campaign.title}`,
            description: `Autonomous execution of campaign: ${campaign.description}`,
            priority: 8,
            requiresApproval: campaign.requiresApproval,
            organizationId,
            createdBy: userId,
        };
        const { data, error } = await supabase
            .from('agent_goals')
            .insert(goalInput)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create execution goal: ${error.message}`);
        }
        return data;
    }
    async setupCollaboration(goalId, organizationId) {
        const agents = [
            { agentId: 'crm-agent', role: 'CONTRIBUTOR' },
            { agentId: 'content-agent', role: 'CONTRIBUTOR' },
            { agentId: 'workflow-agent', role: 'CONTRIBUTOR' },
            { agentId: 'execution-agent', role: 'CONTRIBUTOR' },
            { agentId: 'monitoring-agent', role: 'CONTRIBUTOR' },
        ];
        for (const agent of agents) {
            try {
                await collaboration_1.collabManager.joinGoal({
                    goalId,
                    agentId: agent.agentId,
                    role: agent.role,
                    scope: 'TASK_ONLY',
                    organizationId,
                });
            }
            catch (error) {
                logger_1.logger.error(`[AutoCampaignAgent] Failed to add collaborator: ${agent.agentId}`, error);
            }
        }
    }
    async completeCampaign(campaignId, organizationId) {
        logger_1.logger.info('[AutoCampaignAgent] Completing campaign', { campaignId });
        const { data: successScore } = await supabase.rpc('calculate_campaign_success', {
            p_campaign_id: campaignId,
            p_organization_id: organizationId,
        });
        await supabase
            .from('autonomous_campaigns')
            .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            execution_metadata: {
                successScore: successScore || 0,
                completedAt: new Date().toISOString(),
            },
        })
            .eq('id', campaignId)
            .eq('organization_id', organizationId);
        logger_1.logger.info('[AutoCampaignAgent] Campaign completed', {
            campaignId,
            successScore,
        });
    }
    async storeMemory(campaign, planningOutput, critique, organizationId) {
        const memoryContent = `Campaign planned: ${campaign.title}
Strategy: ${planningOutput.strategyDoc.objectives.join(', ')}
Quality Score: ${critique.score}
Feedback: ${critique.feedback.join('; ')}`;
        await memory_1.memoryStore.addMemory({
            agentId: 'auto-campaign-planner',
            memoryType: 'DECISION',
            content: memoryContent,
            organizationId,
            importanceScore: critique.score,
            contextTags: ['campaign-planning', campaign.campaignType],
        });
    }
    async getCampaign(campaignId, organizationId) {
        const { data, error } = await supabase
            .from('autonomous_campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('organization_id', organizationId)
            .single();
        if (error || !data) {
            throw new Error('Campaign not found');
        }
        return this.mapToCampaign(data);
    }
    async updateCampaignStatus(campaignId, status, organizationId, failureReason) {
        const updates = { status };
        if (status === 'RUNNING') {
            updates.started_at = new Date().toISOString();
        }
        else if (status === 'FAILED') {
            updates.failed_at = new Date().toISOString();
            updates.failure_reason = failureReason;
        }
        await supabase
            .from('autonomous_campaigns')
            .update(updates)
            .eq('id', campaignId)
            .eq('organization_id', organizationId);
    }
    mapToCampaign(row) {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            campaignType: row.campaign_type,
            status: row.status,
            agentCreated: row.agent_created,
            planningAgentId: row.planning_agent_id,
            orchestratorAgentId: row.orchestrator_agent_id,
            originalPrompt: row.original_prompt,
            planningOutput: row.planning_output,
            executionMetadata: row.execution_metadata,
            executionGraphId: row.execution_graph_id,
            targetContactCriteria: row.target_contact_criteria,
            targetOutletTypes: row.target_outlet_types || [],
            targetTopics: row.target_topics || [],
            personalizationStrategy: row.personalization_strategy,
            pitchTheme: row.pitch_theme,
            workflowConfig: row.workflow_config,
            batchSize: row.batch_size,
            delayBetweenBatches: row.delay_between_batches,
            monitoringSetup: row.monitoring_setup,
            kpis: row.kpis,
            successCriteria: row.success_criteria,
            totalContactsTargeted: row.total_contacts_targeted,
            pitchesSent: row.pitches_sent,
            responsesReceived: row.responses_received,
            placementsAchieved: row.placements_achieved,
            qualityScore: row.quality_score,
            learnings: row.learnings,
            scheduledStart: row.scheduled_start ? new Date(row.scheduled_start) : null,
            startedAt: row.started_at ? new Date(row.started_at) : null,
            completedAt: row.completed_at ? new Date(row.completed_at) : null,
            failedAt: row.failed_at ? new Date(row.failed_at) : null,
            failureReason: row.failure_reason,
            requiresApproval: row.requires_approval,
            approvedAt: row.approved_at ? new Date(row.approved_at) : null,
            approvedBy: row.approved_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by,
            organizationId: row.organization_id,
        };
    }
}
exports.AutoCampaignAgent = AutoCampaignAgent;
exports.autoCampaignAgent = new AutoCampaignAgent();
//# sourceMappingURL=auto-campaign.agent.js.map