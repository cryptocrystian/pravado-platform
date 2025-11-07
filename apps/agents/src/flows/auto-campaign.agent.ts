// =====================================================
// AUTONOMOUS CAMPAIGN ORCHESTRATOR AGENT
// =====================================================
// High-level orchestrator that coordinates full campaign lifecycle with
// delegation to specialized agents

import { createClient } from '@supabase/supabase-js';
import type {
  AutonomousCampaign,
  CampaignPlanningRequest,
  CampaignPlanningOutput,
  CampaignType,
  CampaignStatus,
  CreateAgentGoalInput,
} from '@pravado/types';
import { logger } from '../lib/logger';
import { autoCampaignPlanner } from '../planning/auto-campaign-planner';
import {
  getCampaignTemplate,
  createExecutionGraphFromTemplate,
} from '../planning/campaign-templates';
import { plannerEngine } from '../planning';
import { memoryStore } from '../memory';
import { collabManager } from '../collaboration';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Autonomous Campaign Orchestrator
 *
 * The "maestro" agent that coordinates specialized agents to plan and execute
 * PR campaigns autonomously from natural language prompts
 */
export class AutoCampaignAgent {
  /**
   * Create and plan a campaign from natural language prompt
   */
  async createCampaign(
    request: CampaignPlanningRequest,
    organizationId: string,
    userId: string
  ): Promise<AutonomousCampaign> {
    try {
      logger.info('[AutoCampaignAgent] Creating autonomous campaign', {
        prompt: request.prompt.substring(0, 100),
        organizationId,
      });

      // Step 1: Plan the campaign using AI planner
      logger.info('[AutoCampaignAgent] Step 1: Planning campaign strategy');
      const planningOutput = await autoCampaignPlanner.planCampaign(request, organizationId);

      // Step 2: Self-critique the plan
      logger.info('[AutoCampaignAgent] Step 2: Critiquing campaign plan');
      const critique = await autoCampaignPlanner.critiquePlan(planningOutput, organizationId);

      // Step 3: Create campaign record in database
      logger.info('[AutoCampaignAgent] Step 3: Creating campaign record');
      const campaign = await this.storeCampaign({
        title: planningOutput.strategyDoc.objectives[0] || 'Autonomous Campaign',
        description: request.prompt,
        campaignType: request.campaignType || ('CUSTOM' as CampaignType),
        originalPrompt: request.prompt,
        planningOutput,
        qualityScore: critique.score,
        organizationId,
        userId,
      });

      // Step 4: Store planning learnings in memory
      await this.storeMemory(campaign, planningOutput, critique, organizationId);

      logger.info('[AutoCampaignAgent] Campaign created successfully', {
        campaignId: campaign.id,
        qualityScore: critique.score,
      });

      return campaign;
    } catch (error) {
      logger.error('[AutoCampaignAgent] Failed to create campaign', error);
      throw error;
    }
  }

  /**
   * Execute an autonomous campaign
   */
  async executeCampaign(
    campaignId: string,
    organizationId: string,
    dryRun: boolean = false
  ): Promise<void> {
    try {
      logger.info('[AutoCampaignAgent] Starting campaign execution', {
        campaignId,
        dryRun,
      });

      // Get campaign details
      const campaign = await this.getCampaign(campaignId, organizationId);

      if (!campaign.planningOutput) {
        throw new Error('Campaign has no planning output');
      }

      // Update status to RUNNING
      await this.updateCampaignStatus(campaignId, 'RUNNING' as CampaignStatus, organizationId);

      // Step 1: Create execution graph from template
      logger.info('[AutoCampaignAgent] Creating execution graph');
      const template = getCampaignTemplate(campaign.campaignType);

      if (!template) {
        throw new Error(`No template found for campaign type: ${campaign.campaignType}`);
      }

      const executionGraph = createExecutionGraphFromTemplate(
        template,
        campaign.planningOutput,
        campaignId
      );

      // Step 2: Create agent goal for campaign execution
      logger.info('[AutoCampaignAgent] Creating execution goal');
      const goal = await this.createExecutionGoal(campaign, organizationId, campaign.createdBy!);

      // Step 3: Store execution graph
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

      // Update campaign with graph ID
      await supabase
        .from('autonomous_campaigns')
        .update({ execution_graph_id: graphData.id })
        .eq('id', campaignId)
        .eq('organization_id', organizationId);

      // Step 4: Set up agent collaboration for the goal
      logger.info('[AutoCampaignAgent] Setting up agent collaboration');
      await this.setupCollaboration(goal.id, organizationId);

      // Step 5: Execute the graph (unless dry run)
      if (!dryRun) {
        logger.info('[AutoCampaignAgent] Executing campaign graph');
        await plannerEngine.executeGraph(goal.id, organizationId);
      } else {
        logger.info('[AutoCampaignAgent] Dry run - skipping execution');
      }

      logger.info('[AutoCampaignAgent] Campaign execution initiated', {
        campaignId,
        goalId: goal.id,
        graphId: graphData.id,
      });
    } catch (error) {
      logger.error('[AutoCampaignAgent] Campaign execution failed', error);

      // Update campaign status to FAILED
      await this.updateCampaignStatus(
        campaignId,
        'FAILED' as CampaignStatus,
        organizationId,
        (error as Error).message
      );

      throw error;
    }
  }

  /**
   * Monitor and update campaign progress
   */
  async updateCampaignProgress(
    campaignId: string,
    organizationId: string
  ): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId, organizationId);

      if (!campaign.executionGraphId) {
        return;
      }

      // Get execution graph status
      const { data: graph } = await supabase
        .from('execution_graphs')
        .select('*')
        .eq('id', campaign.executionGraphId)
        .single();

      if (!graph) {
        return;
      }

      // Get task statistics
      const { data: stats } = await supabase.rpc('get_campaign_statistics', {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
      });

      if (stats && stats.length > 0) {
        const progress = stats[0];

        // Update campaign with progress
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

      // Check if campaign is complete
      if (graph.execution_status === 'COMPLETED') {
        await this.completeCampaign(campaignId, organizationId);
      }
    } catch (error) {
      logger.error('[AutoCampaignAgent] Failed to update progress', error);
    }
  }

  /**
   * Store campaign in database
   */
  private async storeCampaign(input: {
    title: string;
    description: string;
    campaignType: CampaignType;
    originalPrompt: string;
    planningOutput: CampaignPlanningOutput;
    qualityScore: number;
    organizationId: string;
    userId: string;
  }): Promise<AutonomousCampaign> {
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
        // Extract targeting from planning output
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

  /**
   * Create agent goal for campaign execution
   */
  private async createExecutionGoal(
    campaign: AutonomousCampaign,
    organizationId: string,
    userId: string
  ): Promise<any> {
    const goalInput: CreateAgentGoalInput = {
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

  /**
   * Set up collaboration for specialized agents
   */
  private async setupCollaboration(goalId: string, organizationId: string): Promise<void> {
    // Add specialized agents as collaborators
    const agents = [
      { agentId: 'crm-agent', role: 'CONTRIBUTOR' as any },
      { agentId: 'content-agent', role: 'CONTRIBUTOR' as any },
      { agentId: 'workflow-agent', role: 'CONTRIBUTOR' as any },
      { agentId: 'execution-agent', role: 'CONTRIBUTOR' as any },
      { agentId: 'monitoring-agent', role: 'CONTRIBUTOR' as any },
    ];

    for (const agent of agents) {
      try {
        await collabManager.joinGoal({
          goalId,
          agentId: agent.agentId,
          role: agent.role,
          scope: 'TASK_ONLY' as any,
          organizationId,
        });
      } catch (error) {
        logger.error(`[AutoCampaignAgent] Failed to add collaborator: ${agent.agentId}`, error);
      }
    }
  }

  /**
   * Complete campaign and calculate final metrics
   */
  private async completeCampaign(campaignId: string, organizationId: string): Promise<void> {
    logger.info('[AutoCampaignAgent] Completing campaign', { campaignId });

    // Calculate success score
    const { data: successScore } = await supabase.rpc('calculate_campaign_success', {
      p_campaign_id: campaignId,
      p_organization_id: organizationId,
    });

    // Update campaign status
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

    logger.info('[AutoCampaignAgent] Campaign completed', {
      campaignId,
      successScore,
    });
  }

  /**
   * Store campaign planning in memory for future learning
   */
  private async storeMemory(
    campaign: AutonomousCampaign,
    planningOutput: CampaignPlanningOutput,
    critique: { score: number; feedback: string[] },
    organizationId: string
  ): Promise<void> {
    const memoryContent = `Campaign planned: ${campaign.title}
Strategy: ${planningOutput.strategyDoc.objectives.join(', ')}
Quality Score: ${critique.score}
Feedback: ${critique.feedback.join('; ')}`;

    await memoryStore.addMemory({
      agentId: 'auto-campaign-planner',
      memoryType: 'DECISION' as any,
      content: memoryContent,
      organizationId,
      importanceScore: critique.score,
      contextTags: ['campaign-planning', campaign.campaignType],
    });
  }

  /**
   * Get campaign by ID
   */
  private async getCampaign(campaignId: string, organizationId: string): Promise<AutonomousCampaign> {
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

  /**
   * Update campaign status
   */
  private async updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus,
    organizationId: string,
    failureReason?: string
  ): Promise<void> {
    const updates: any = { status };

    if (status === 'RUNNING') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'FAILED') {
      updates.failed_at = new Date().toISOString();
      updates.failure_reason = failureReason;
    }

    await supabase
      .from('autonomous_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .eq('organization_id', organizationId);
  }

  /**
   * Map database row to AutonomousCampaign type
   */
  private mapToCampaign(row: any): AutonomousCampaign {
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

// Singleton instance
export const autoCampaignAgent = new AutoCampaignAgent();
