// =====================================================
// AGENT RUNNER - Universal Execution Engine
// =====================================================

import OpenAI from 'openai';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  AgentRunnerConfig,
  AgentRunnerInput,
  AgentResult,
  AgentStep,
  AgentContext,
  AgentTool,
  AgentMemory,
  MemoryType,
} from '@pravado/shared-types';
import { memoryStore, calculateMemoryImportance } from '../memory';
import { collabManager, handoffEngine, messageCenter } from '../collaboration';
import { reviewEngine } from '../review/review-engine';
import { followupEngine } from '../followup/followup-engine';
import { timelineEngine } from '../timeline/timeline-engine';
import { goalEngine } from '../goals/goal-engine';
import type {
  ReviewableEntityType,
  ReviewType,
  ReviewPriority,
  AgentReview,
  GoalContextForAgent,
  AttributionEventType,
} from '@pravado/shared-types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// AGENT RUNNER CLASS
// =====================================================

export class AgentRunner {
  private config: AgentRunnerConfig;
  private context: AgentContext;
  private input: Record<string, any>;
  private steps: AgentStep[] = [];
  private currentStepId: string | null = null;
  private tokensUsed: number = 0;
  private startTime: number = 0;

  constructor(runnerInput: AgentRunnerInput) {
    this.config = runnerInput.config;
    this.context = runnerInput.context;
    this.input = runnerInput.input;
  }

  // =====================================================
  // MAIN EXECUTION
  // =====================================================

  async execute(): Promise<AgentResult> {
    this.startTime = Date.now();

    try {
      logger.info(`[AgentRunner] Starting execution: ${this.config.agentName}`);

      // Step 1: Validate input
      await this.addStep('validate-input', 'Validating input data');
      this.validateInput();
      await this.completeCurrentStep({ validated: true });

      // Step 2: Gather context
      await this.addStep('gather-context', 'Gathering context data');
      await this.gatherContext();
      await this.completeCurrentStep({ contextGathered: true });

      // Step 3: Execute agent with OpenAI
      await this.addStep('execute-agent', 'Executing AI agent');
      const result = await this.executeAgent();
      await this.completeCurrentStep({ resultGenerated: true });

      // Step 4: Validate output
      await this.addStep('validate-output', 'Validating output data');
      const validatedResult = this.validateOutput(result);
      await this.completeCurrentStep({ outputValidated: true });

      // Step 5: Persist memory (optional, don't fail execution if this fails)
      try {
        await this.persistMemory(validatedResult);
      } catch (memoryError) {
        logger.error('[AgentRunner] Failed to persist memory', memoryError);
        // Don't fail the execution for memory persistence issues
      }

      // Step 6: Handle followup cancellation if contact replied
      try {
        await this.handleFollowupCancellation(validatedResult);
      } catch (followupError) {
        logger.error('[AgentRunner] Failed to handle followup cancellation', followupError);
        // Don't fail the execution for followup handling issues
      }

      // Step 7: Log timeline event
      try {
        await this.logTimelineEvent('success', validatedResult);
      } catch (timelineError) {
        logger.error('[AgentRunner] Failed to log timeline event', timelineError);
        // Don't fail the execution for timeline logging issues
      }

      // Step 8: Track outcome events for goal attribution
      try {
        await this.trackOutcomeEvents(validatedResult);
      } catch (outcomeError) {
        logger.error('[AgentRunner] Failed to track outcome events', outcomeError);
        // Don't fail the execution for outcome tracking issues
      }

      logger.info(`[AgentRunner] Execution completed: ${this.config.agentName}`);

      return {
        success: true,
        data: validatedResult,
        steps: this.steps,
        tokensUsed: this.tokensUsed,
        executionTimeMs: Date.now() - this.startTime,
        confidence: this.calculateConfidence(validatedResult),
      };
    } catch (error: any) {
      logger.error(`[AgentRunner] Execution failed: ${error.message}`);

      if (this.currentStepId) {
        await this.failCurrentStep(error.message);
      }

      // Log timeline event for failure
      try {
        await this.logTimelineEvent('failure', undefined, error.message);
      } catch (timelineError) {
        logger.error('[AgentRunner] Failed to log timeline failure event', timelineError);
      }

      return {
        success: false,
        error: error.message,
        steps: this.steps,
        tokensUsed: this.tokensUsed,
        executionTimeMs: Date.now() - this.startTime,
      };
    }
  }

  // =====================================================
  // CONTEXT GATHERING
  // =====================================================

  private async gatherContext(): Promise<void> {
    const { organizationId, userId } = this.context;
    const sources = this.config.contextSources || [];

    for (const source of sources) {
      switch (source) {
        case 'strategy':
          await this.gatherStrategy(organizationId);
          break;
        case 'contacts':
          await this.gatherContacts(organizationId);
          break;
        case 'keywordClusters':
          await this.gatherKeywordClusters(organizationId);
          break;
        case 'campaigns':
          await this.gatherCampaigns(organizationId);
          break;
        case 'crm':
          await this.gatherCRM(organizationId, userId);
          break;
        case 'memory':
          await this.gatherMemory(organizationId);
          break;
        case 'collaboration':
          await this.gatherCollaboration(organizationId);
          break;
        case 'review':
          await this.gatherReview(organizationId);
          break;
        case 'goals':
          await this.gatherGoals(organizationId);
          break;
      }
    }

    logger.info(`[AgentRunner] Context gathered from ${sources.length} sources`);
  }

  private async gatherStrategy(organizationId: string): Promise<void> {
    const { data } = await supabase
      .from('strategy_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .single();

    if (data) {
      this.context.strategy = data;
    }
  }

  private async gatherContacts(organizationId: string): Promise<void> {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(100); // Limit for performance

    if (data) {
      this.context.contacts = data;
    }
  }

  private async gatherKeywordClusters(organizationId: string): Promise<void> {
    const { data } = await supabase
      .from('keyword_clusters')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(50);

    if (data) {
      this.context.keywordClusters = data;
    }
  }

  private async gatherCampaigns(organizationId: string): Promise<void> {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(20);

    if (data) {
      this.context.campaigns = data;
    }
  }

  private async gatherCRM(organizationId: string, userId: string): Promise<void> {
    // Gather CRM statistics
    const { data: stats } = await supabase.rpc('get_user_crm_stats', {
      user_uuid: userId,
    });

    if (stats && stats.length > 0) {
      this.context.crmStats = {
        totalRelationships: stats[0].total_relationships || 0,
        hotRelationships: stats[0].hot_relationships || 0,
        warmRelationships: stats[0].warm_relationships || 0,
        coolRelationships: stats[0].cool_relationships || 0,
        coldRelationships: stats[0].cold_relationships || 0,
        interactionsThisWeek: stats[0].interactions_this_week || 0,
        interactionsThisMonth: stats[0].interactions_this_month || 0,
        pendingFollowUps: stats[0].pending_follow_ups || 0,
        overdueFollowUps: stats[0].overdue_follow_ups || 0,
        avgStrengthScore: parseFloat(stats[0].avg_strength_score) || 0,
      };
    }

    // Gather recent activity (last 7 days)
    const { data: recentActivity } = await supabase
      .from('recent_contact_activity')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .limit(50);

    if (recentActivity) {
      this.context.recentActivity = recentActivity;
    }

    // Gather top relationship strengths
    const { data: relationships } = await supabase
      .from('relationship_strengths')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('strength_score', { ascending: false })
      .limit(20);

    if (relationships) {
      this.context.relationshipStrengths = relationships;
    }

    // Gather pending follow-ups
    const { data: followUps } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('created_by', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'PENDING')
      .order('due_date', { ascending: true })
      .limit(20);

    if (followUps) {
      this.context.pendingFollowUps = followUps;
    }

    logger.info('[AgentRunner] CRM context gathered');
  }

  private async gatherMemory(organizationId: string): Promise<void> {
    try {
      // Get recent high-importance memories
      const recentMemories = await memoryStore.getRecentMemories(
        this.config.agentName,
        organizationId,
        20
      );

      // Filter by context tags if provided in input
      const contextTags = this.input.contextTags || [];
      let relevantMemories: AgentMemory[] = [];

      if (contextTags.length > 0) {
        // Search with tags
        const searchResult = await memoryStore.searchMemory({
          agentId: this.config.agentName,
          organizationId,
          tags: contextTags,
          topK: 10,
          minImportance: 0.5,
        });
        relevantMemories = searchResult.memories;
      }

      // Store memories in context
      this.context.memory = recentMemories;
      this.context.relevantMemory = relevantMemories;

      logger.info(`[AgentRunner] Memory context gathered: ${recentMemories.length} recent, ${relevantMemories.length} relevant`);
    } catch (error) {
      logger.error('[AgentRunner] Failed to gather memory context', error);
      // Don't fail execution, just log the error
      this.context.memory = [];
      this.context.relevantMemory = [];
    }
  }

  private async gatherCollaboration(organizationId: string): Promise<void> {
    try {
      // Check if this agent is collaborating on any goals
      const goalId = this.input.goalId;
      const taskId = this.input.taskId;

      if (!goalId && !taskId) {
        logger.info('[AgentRunner] No goal or task context for collaboration');
        return;
      }

      // Get collaboration information for the goal
      if (goalId) {
        const collaborators = await collabManager.getActiveCollaborators(
          goalId,
          organizationId
        );

        // Find this agent's collaboration
        const myCollab = collaborators.find(
          (c) => c.agentId === this.config.agentName
        );

        this.context.collaboration = {
          goalId,
          myRole: myCollab?.role || null,
          myScope: myCollab?.scope || null,
          collaborators: collaborators.map((c) => ({
            agentId: c.agentId,
            role: c.role,
            scope: c.scope,
          })),
        };

        // Get active threads for this goal
        const threads = await messageCenter.getGoalThreads(goalId, organizationId);
        this.context.collaborationThreads = threads;

        logger.info(
          `[AgentRunner] Collaboration context gathered: ${collaborators.length} collaborators, ${threads.length} threads`
        );
      }

      // Get pending handoffs if this is a task context
      if (taskId) {
        const handoffs = await handoffEngine.getTaskHandoffs(taskId, organizationId);
        this.context.taskHandoffs = handoffs;

        // Get pending handoffs for this agent
        const myHandoffs = await handoffEngine.getPendingHandoffs(
          this.config.agentName,
          organizationId
        );
        this.context.pendingHandoffs = myHandoffs;

        logger.info(
          `[AgentRunner] Handoff context gathered: ${handoffs.length} task handoffs, ${myHandoffs.length} pending`
        );
      }
    } catch (error) {
      logger.error('[AgentRunner] Failed to gather collaboration context', error);
      // Don't fail execution, just log the error
      this.context.collaboration = null;
      this.context.collaborationThreads = [];
      this.context.taskHandoffs = [];
      this.context.pendingHandoffs = [];
    }
  }

  private async persistMemory(result: any): Promise<void> {
    const { organizationId, userId, executionId } = this.context;

    if (!this.config.persistMemory) {
      logger.info('[AgentRunner] Memory persistence disabled for this agent');
      return;
    }

    // Create a summary of the execution as a TASK memory
    const taskSummary = `Executed ${this.config.agentName}: ${JSON.stringify(result).substring(0, 500)}`;
    const taskImportance = calculateMemoryImportance(
      taskSummary,
      'TASK' as MemoryType,
      {
        taskSuccess: true,
        ageInDays: 0,
      }
    );

    await memoryStore.addMemory({
      agentId: this.config.agentName,
      memoryType: 'TASK' as MemoryType,
      content: taskSummary,
      organizationId,
      agentExecutionId: executionId,
      importanceScore: taskImportance,
      contextTags: this.input.contextTags || [],
      relatedContactId: this.input.contactId,
      relatedCampaignId: this.input.campaignId,
    });

    logger.info(`[AgentRunner] Memory persisted for execution: ${executionId}`);
  }

  /**
   * Handle automatic followup cancellation when contact replies
   */
  private async handleFollowupCancellation(result: any): Promise<void> {
    const { organizationId } = this.context;
    const contactId = this.input.contactId || result.contactId;

    if (!contactId) {
      // No contact context, skip followup handling
      return;
    }

    // Check if a reply was detected in this execution
    const replyDetected =
      this.input.interactionType === 'EMAIL_REPLIED' ||
      result.interactionType === 'EMAIL_REPLIED' ||
      result.wasReplied === true;

    if (!replyDetected) {
      // No reply detected, skip cancellation
      return;
    }

    logger.info(
      `[AgentRunner] Reply detected for contact ${contactId}, checking for active followup sequences`
    );

    // Get all active followup sequences for this contact
    const { data: activeFollowups } = await supabase
      .from('scheduled_followups')
      .select('sequence_id')
      .eq('contact_id', contactId)
      .eq('organization_id', organizationId)
      .eq('status', 'PENDING')
      .order('sequence_id');

    if (!activeFollowups || activeFollowups.length === 0) {
      logger.info(`[AgentRunner] No active followup sequences found for contact ${contactId}`);
      return;
    }

    // Get unique sequence IDs
    const sequenceIds = [...new Set(activeFollowups.map((f) => f.sequence_id))];

    logger.info(
      `[AgentRunner] Canceling ${sequenceIds.length} followup sequences for contact ${contactId}`
    );

    // Cancel each sequence
    let totalCanceled = 0;
    for (const sequenceId of sequenceIds) {
      try {
        const canceledCount = await followupEngine.cancelSequenceForContact({
          contactId,
          sequenceId,
          reason: `Contact replied - auto-canceled by ${this.config.agentName}`,
          organizationId,
        });

        totalCanceled += canceledCount;

        logger.info(
          `[AgentRunner] Canceled ${canceledCount} followups in sequence ${sequenceId}`
        );
      } catch (error: any) {
        logger.error(
          `[AgentRunner] Failed to cancel sequence ${sequenceId}: ${error.message}`
        );
      }
    }

    if (totalCanceled > 0) {
      logger.info(
        `[AgentRunner] Successfully canceled ${totalCanceled} total followups for contact ${contactId}`
      );

      // Emit event for tracking
      followupEngine.emit('auto-canceled-on-reply', {
        contactId,
        sequenceIds,
        totalCanceled,
        agentName: this.config.agentName,
      });
    }
  }

  /**
   * Log timeline event for agent execution
   */
  private async logTimelineEvent(
    status: 'success' | 'failure',
    result?: any,
    error?: string
  ): Promise<void> {
    const { organizationId, executionId } = this.context;
    const campaignId = this.input.campaignId;
    const contactId = this.input.contactId || result?.contactId;

    await timelineEngine.logAgentRun(
      this.config.agentName,
      executionId || `exec-${Date.now()}`,
      campaignId,
      organizationId,
      {
        status,
        tokensUsed: this.tokensUsed,
        durationMs: Date.now() - this.startTime,
        confidence: status === 'success' ? this.calculateConfidence(result) : undefined,
        result: status === 'success' ? result : undefined,
        error,
        relatedContactId: contactId,
      }
    );

    logger.info(`[AgentRunner] Timeline event logged for ${this.config.agentName} (${status})`);
  }

  /**
   * Track outcome events for goal attribution
   * Analyzes agent results and creates attribution events for goals
   */
  private async trackOutcomeEvents(result: any): Promise<void> {
    const { organizationId, executionId } = this.context;
    const campaignId = this.input.campaignId;
    const contactId = this.input.contactId || result?.contactId;

    if (!campaignId || !organizationId) {
      logger.info('[AgentRunner] No campaign context for outcome tracking');
      return;
    }

    const events: { type: AttributionEventType; description?: string; value?: number; context?: any }[] = [];

    // Detect reply events
    if (result.wasReplied === true || result.interactionType === 'EMAIL_REPLIED' || result.replyDetected === true) {
      events.push({
        type: 'REPLY_RECEIVED',
        description: 'Contact replied to outreach',
        context: {
          agentName: this.config.agentName,
          interactionType: result.interactionType,
        },
      });
    }

    // Detect coverage events
    if (result.coverageSecured === true || result.placementObtained === true) {
      events.push({
        type: 'COVERAGE_SECURED',
        description: result.outletName ? `Coverage secured at ${result.outletName}` : 'Media coverage obtained',
        context: {
          agentName: this.config.agentName,
          outletName: result.outletName,
          tier: result.outletTier,
        },
      });
    }

    // Detect meeting scheduled events
    if (result.meetingScheduled === true || result.callScheduled === true) {
      events.push({
        type: 'MEETING_SCHEDULED',
        description: 'Meeting or call scheduled with contact',
        context: {
          agentName: this.config.agentName,
          meetingType: result.meetingType,
        },
      });
    }

    // Detect lead qualified events
    if (result.leadQualified === true || result.qualificationScore) {
      events.push({
        type: 'LEAD_QUALIFIED',
        description: 'Lead qualified for follow-up',
        value: result.qualificationScore,
        context: {
          agentName: this.config.agentName,
          qualificationScore: result.qualificationScore,
        },
      });
    }

    // Detect conversion events
    if (result.conversionMade === true || result.saleCompleted === true) {
      events.push({
        type: 'CONVERSION_MADE',
        description: 'Conversion or sale completed',
        value: result.conversionValue || result.dealValue,
        context: {
          agentName: this.config.agentName,
          conversionValue: result.conversionValue,
        },
      });
    }

    // Detect partnership events
    if (result.partnershipFormed === true || result.agreementSigned === true) {
      events.push({
        type: 'PARTNERSHIP_FORMED',
        description: 'Strategic partnership established',
        context: {
          agentName: this.config.agentName,
          partnershipType: result.partnershipType,
        },
      });
    }

    // Detect referral events
    if (result.referralReceived === true || result.introductionMade === true) {
      events.push({
        type: 'REFERRAL_RECEIVED',
        description: 'Referral obtained from contact',
        context: {
          agentName: this.config.agentName,
          referralTo: result.referralTo,
        },
      });
    }

    // Detect content published events
    if (result.contentPublished === true || result.articleLive === true) {
      events.push({
        type: 'CONTENT_PUBLISHED',
        description: 'Content successfully published',
        context: {
          agentName: this.config.agentName,
          contentUrl: result.contentUrl,
          publishedAt: result.publishedAt,
        },
      });
    }

    // Detect opportunity created events
    if (result.opportunityCreated === true || result.pipelineAdded === true) {
      events.push({
        type: 'OPPORTUNITY_CREATED',
        description: 'Sales opportunity created',
        value: result.opportunityValue,
        context: {
          agentName: this.config.agentName,
          opportunityStage: result.opportunityStage,
        },
      });
    }

    // Track each event
    for (const event of events) {
      try {
        const eventId = await goalEngine.trackOutcomeEvent({
          organizationId,
          eventType: event.type,
          campaignId,
          contactId,
          agentRunId: executionId,
          description: event.description,
          value: event.value,
          context: event.context,
          attributionWeight: 1.0,
        });

        logger.info(`[AgentRunner] Outcome tracked: ${event.type} (${eventId})`);
      } catch (error: any) {
        logger.error(`[AgentRunner] Failed to track outcome event ${event.type}:`, error.message);
        // Continue with other events even if one fails
      }
    }

    if (events.length > 0) {
      logger.info(`[AgentRunner] Tracked ${events.length} outcome event(s) for goal attribution`);
    } else {
      logger.info('[AgentRunner] No outcome events detected for goal attribution');
    }
  }

  // =====================================================
  // AGENT EXECUTION
  // =====================================================

  private async executeAgent(): Promise<any> {
    const systemPrompt = this.interpolateTemplate(this.config.systemPrompt);
    const userPrompt = this.buildUserPrompt();

    logger.info(`[AgentRunner] Calling OpenAI with model: ${this.config.model || 'gpt-4-turbo-preview'}`);

    const completion = await openai.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2000,
    });

    const usage = completion.usage;
    if (usage) {
      this.tokensUsed = usage.total_tokens;
      logger.info(`[AgentRunner] Tokens used: ${this.tokensUsed}`);
    }

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    return JSON.parse(content);
  }

  private buildUserPrompt(): string {
    let prompt = 'Input Data:\n';
    prompt += JSON.stringify(this.input, null, 2);
    prompt += '\n\n';

    if (this.context.strategy) {
      prompt += 'Strategy Context:\n';
      prompt += `Goals: ${this.context.strategy.goals || 'N/A'}\n`;
      prompt += `Audience: ${this.context.strategy.target_audience || 'N/A'}\n`;
      prompt += `Positioning: ${this.context.strategy.positioning_statement || 'N/A'}\n\n`;
    }

    if (this.context.keywordClusters && this.context.keywordClusters.length > 0) {
      prompt += 'Keyword Clusters:\n';
      this.context.keywordClusters.slice(0, 5).forEach((cluster: any) => {
        prompt += `- ${cluster.primary_keyword}: ${cluster.cluster_keywords?.join(', ') || ''}\n`;
      });
      prompt += '\n';
    }

    if (this.context.contacts && this.context.contacts.length > 0) {
      prompt += `Available Contacts: ${this.context.contacts.length} contacts\n\n`;
    }

    if (this.context.campaigns && this.context.campaigns.length > 0) {
      prompt += `Active Campaigns: ${this.context.campaigns.length} campaigns\n\n`;
    }

    if (this.context.crmStats) {
      prompt += 'CRM Statistics:\n';
      prompt += `Total Relationships: ${this.context.crmStats.totalRelationships}\n`;
      prompt += `Hot Relationships: ${this.context.crmStats.hotRelationships}\n`;
      prompt += `Warm Relationships: ${this.context.crmStats.warmRelationships}\n`;
      prompt += `Cool Relationships: ${this.context.crmStats.coolRelationships}\n`;
      prompt += `Cold Relationships: ${this.context.crmStats.coldRelationships}\n`;
      prompt += `Interactions This Week: ${this.context.crmStats.interactionsThisWeek}\n`;
      prompt += `Interactions This Month: ${this.context.crmStats.interactionsThisMonth}\n`;
      prompt += `Pending Follow-Ups: ${this.context.crmStats.pendingFollowUps}\n`;
      prompt += `Overdue Follow-Ups: ${this.context.crmStats.overdueFollowUps}\n`;
      prompt += `Avg Relationship Strength: ${this.context.crmStats.avgStrengthScore.toFixed(1)}/100\n\n`;
    }

    if (this.context.relationshipStrengths && this.context.relationshipStrengths.length > 0) {
      prompt += 'Top Relationships:\n';
      this.context.relationshipStrengths.slice(0, 10).forEach((rel: any) => {
        prompt += `- ${rel.contact_name} (${rel.outlet || 'Unknown'}): Strength ${rel.strength_score}/100, ${rel.relationship_temperature}\n`;
      });
      prompt += '\n';
    }

    if (this.context.recentActivity && this.context.recentActivity.length > 0) {
      prompt += `Recent Interactions (Last 7 Days): ${this.context.recentActivity.length} interactions\n`;
      this.context.recentActivity.slice(0, 5).forEach((activity: any) => {
        prompt += `- ${activity.contact_name}: ${activity.interaction_type} via ${activity.channel}\n`;
      });
      prompt += '\n';
    }

    if (this.context.pendingFollowUps && this.context.pendingFollowUps.length > 0) {
      prompt += 'Upcoming Follow-Ups:\n';
      this.context.pendingFollowUps.slice(0, 5).forEach((followUp: any) => {
        const dueDate = new Date(followUp.due_date).toLocaleDateString();
        prompt += `- ${followUp.title} (Due: ${dueDate}, Priority: ${followUp.priority})\n`;
      });
      prompt += '\n';
    }

    if (this.context.memory && this.context.memory.length > 0) {
      prompt += 'Recent Memories:\n';
      this.context.memory.slice(0, 10).forEach((memory: AgentMemory) => {
        const date = new Date(memory.createdAt).toLocaleDateString();
        prompt += `- [${memory.memoryType}] ${memory.content.substring(0, 150)}... (${date})\n`;
      });
      prompt += '\n';
    }

    if (this.context.relevantMemory && this.context.relevantMemory.length > 0) {
      prompt += 'Relevant Memories (context-specific):\n';
      this.context.relevantMemory.forEach((memory: AgentMemory) => {
        const tags = memory.contextTags.join(', ');
        prompt += `- [${memory.importanceScore.toFixed(2)}] ${memory.content.substring(0, 150)}... (Tags: ${tags})\n`;
      });
      prompt += '\n';
    }

    if (this.context.collaboration) {
      prompt += 'Collaboration Context:\n';
      prompt += `My Role: ${this.context.collaboration.myRole || 'None'}\n`;
      prompt += `My Scope: ${this.context.collaboration.myScope || 'None'}\n`;
      prompt += `Collaborators:\n`;
      this.context.collaboration.collaborators.forEach((collab: any) => {
        prompt += `  - ${collab.agentId}: ${collab.role} (${collab.scope})\n`;
      });
      prompt += '\n';
    }

    if (this.context.collaborationThreads && this.context.collaborationThreads.length > 0) {
      prompt += `Active Communication Threads: ${this.context.collaborationThreads.length} threads\n\n`;
    }

    if (this.context.taskHandoffs && this.context.taskHandoffs.length > 0) {
      prompt += 'Task Handoffs:\n';
      this.context.taskHandoffs.forEach((handoff: any) => {
        prompt += `- From ${handoff.fromAgentId} to ${handoff.toAgentId}: ${handoff.status}\n`;
        prompt += `  Reason: ${handoff.handoffReason}\n`;
      });
      prompt += '\n';
    }

    if (this.context.pendingHandoffs && this.context.pendingHandoffs.length > 0) {
      prompt += 'Pending Handoffs (to you):\n';
      this.context.pendingHandoffs.forEach((handoff: any) => {
        prompt += `- From ${handoff.fromAgentId}: ${handoff.handoffReason}\n`;
        if (handoff.handoffMessage) {
          prompt += `  Message: ${handoff.handoffMessage}\n`;
        }
      });
      prompt += '\n';
    }

    if (this.context.reviewLearnings && this.context.reviewLearnings.length > 0) {
      prompt += 'Review Feedback Learnings:\n';
      prompt += 'Based on past human reviews of your work, here are key learnings to incorporate:\n';
      this.context.reviewLearnings.forEach((learning: any) => {
        const reviewedDate = new Date(learning.reviewedAt).toLocaleDateString();
        const statusEmoji = learning.status === 'APPROVED' ? '✓' : '✗';
        prompt += `${statusEmoji} [${learning.reviewType}] ${learning.feedback}\n`;
        if (learning.reasoning) {
          prompt += `   Reasoning: ${learning.reasoning}\n`;
        }
        prompt += `   (Reviewed: ${reviewedDate})\n`;
      });
      prompt += '\n';
      prompt += 'Please incorporate these learnings into your current work to align with human expectations.\n\n';
    }

    if (this.context.goalContext) {
      prompt += '=== CAMPAIGN GOALS & STRATEGIC OBJECTIVES ===\n';
      prompt += 'This campaign has the following goals. Your work should contribute to these objectives:\n\n';

      if (this.context.goalContext.activeGoals.length > 0) {
        prompt += this.context.goalContext.criticalGoalsSummary + '\n\n';

        prompt += 'Strategic Directive:\n';
        prompt += this.context.goalContext.strategicDirective + '\n\n';

        prompt += 'All Active Goals:\n';
        this.context.goalContext.activeGoals.forEach((goal: any) => {
          const targetKey = Object.keys(goal.targetMetric)[0];
          const targetValue = goal.targetMetric[targetKey];
          const currentValue = goal.currentMetric[targetKey] || 0;
          const percentage = goal.completionScore.toFixed(0);

          prompt += `- [${goal.priority}] ${goal.title} (${goal.goalType})\n`;
          prompt += `  Progress: ${currentValue}/${targetValue} ${targetKey} (${percentage}%)\n`;

          if (goal.daysUntilDue !== undefined) {
            if (goal.daysUntilDue < 0) {
              prompt += `  ⚠️ OVERDUE\n`;
            } else if (goal.daysUntilDue <= 7) {
              prompt += `  ⏰ ${goal.daysUntilDue} days remaining\n`;
            }
          }
        });
        prompt += '\n';
        prompt += 'IMPORTANT: Align your outputs and recommendations with these goals. Track successes that contribute to goal progress.\n\n';
      }
    }

    if (this.context.customData) {
      prompt += 'Additional Context:\n';
      prompt += JSON.stringify(this.context.customData, null, 2);
      prompt += '\n';
    }

    return prompt;
  }

  // =====================================================
  // TEMPLATE INTERPOLATION
  // =====================================================

  private interpolateTemplate(template: string): string {
    let interpolated = template;

    // Replace {{input.field}} with actual values
    const inputMatches = template.match(/\{\{input\.(\w+)\}\}/g);
    if (inputMatches) {
      inputMatches.forEach((match) => {
        const field = match.replace(/\{\{input\.(\w+)\}\}/, '$1');
        const value = this.input[field] || '';
        interpolated = interpolated.replace(match, String(value));
      });
    }

    // Replace {{context.field}} with context values
    const contextMatches = template.match(/\{\{context\.(\w+)\}\}/g);
    if (contextMatches) {
      contextMatches.forEach((match) => {
        const field = match.replace(/\{\{context\.(\w+)\}\}/, '$1');
        const value = (this.context as any)[field] || '';
        interpolated = interpolated.replace(match, String(value));
      });
    }

    return interpolated;
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  private validateInput(): void {
    try {
      const schema = z.object(this.config.inputSchema);
      schema.parse(this.input);
    } catch (error: any) {
      throw new Error(`Input validation failed: ${error.message}`);
    }
  }

  private validateOutput(output: any): any {
    try {
      const schema = z.object(this.config.outputSchema);
      return schema.parse(output);
    } catch (error: any) {
      throw new Error(`Output validation failed: ${error.message}`);
    }
  }

  // =====================================================
  // STEP MANAGEMENT
  // =====================================================

  private async addStep(id: string, name: string, description?: string): Promise<void> {
    const step: AgentStep = {
      id,
      name,
      description,
      status: 'running',
      startedAt: new Date(),
    };

    this.steps.push(step);
    this.currentStepId = id;

    logger.info(`[AgentRunner] Step started: ${name}`);
  }

  private async completeCurrentStep(output?: any): Promise<void> {
    if (!this.currentStepId) return;

    const step = this.steps.find((s) => s.id === this.currentStepId);
    if (step) {
      step.status = 'completed';
      step.completedAt = new Date();
      step.output = output;
    }

    logger.info(`[AgentRunner] Step completed: ${step?.name}`);
    this.currentStepId = null;
  }

  private async failCurrentStep(error: string): Promise<void> {
    if (!this.currentStepId) return;

    const step = this.steps.find((s) => s.id === this.currentStepId);
    if (step) {
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = error;
    }

    logger.error(`[AgentRunner] Step failed: ${step?.name} - ${error}`);
    this.currentStepId = null;
  }

  // =====================================================
  // TOOLS EXECUTION
  // =====================================================

  async executeTool(toolName: string, input: any): Promise<any> {
    const tool = this.config.tools?.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    logger.info(`[AgentRunner] Executing tool: ${toolName}`);

    try {
      const result = await tool.execute(input, this.context);
      logger.info(`[AgentRunner] Tool executed successfully: ${toolName}`);
      return result;
    } catch (error: any) {
      logger.error(`[AgentRunner] Tool execution failed: ${toolName} - ${error.message}`);
      throw error;
    }
  }

  // =====================================================
  // COLLABORATION METHODS
  // =====================================================

  /**
   * Check if this agent has permission to execute a specific task
   */
  async checkTaskPermission(taskId: string): Promise<boolean> {
    const { organizationId } = this.context;
    return await collabManager.checkTaskPermission(
      taskId,
      this.config.agentName,
      organizationId
    );
  }

  /**
   * Request a handoff of the current task to another agent
   */
  async requestHandoff(
    taskId: string,
    targetAgent: string,
    reason: string,
    message?: string
  ): Promise<void> {
    const { organizationId } = this.context;

    logger.info(`[AgentRunner] Requesting handoff to ${targetAgent}`, {
      taskId,
      reason,
    });

    await handoffEngine.initiateHandoff({
      taskId,
      fromAgentId: this.config.agentName,
      toAgentId: targetAgent,
      handoffReason: reason,
      handoffMessage: message,
      organizationId,
    });
  }

  /**
   * Send a message to other agents in the collaboration
   */
  async sendMessage(
    recipients: string[],
    content: string,
    messageType: 'INFO' | 'REQUEST' | 'RESPONSE' = 'INFO'
  ): Promise<void> {
    const { organizationId } = this.context;
    const goalId = this.input.goalId;
    const taskId = this.input.taskId;

    logger.info(`[AgentRunner] Sending message to agents: ${recipients.join(', ')}`);

    await messageCenter.broadcastMessage(
      {
        recipients,
        messageType,
        content,
      },
      this.config.agentName,
      organizationId,
      goalId,
      taskId
    );
  }

  /**
   * Escalate an issue to human oversight
   */
  async escalate(
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    requestedAction?: string
  ): Promise<void> {
    const { organizationId } = this.context;
    const goalId = this.input.goalId;
    const taskId = this.input.taskId;

    logger.warn(`[AgentRunner] Escalating issue: ${reason}`, { severity });

    await messageCenter.escalate(
      {
        goalId,
        taskId,
        reason,
        severity,
        requestedAction,
      },
      this.config.agentName,
      organizationId
    );
  }

  // =====================================================
  // REVIEW METHODS
  // =====================================================

  /**
   * Gather review context - past reviews and learnings
   */
  private async gatherReview(organizationId: string): Promise<void> {
    try {
      // Get past reviews for this agent
      const { data: pastReviews } = await supabase
        .from('agent_reviews')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('requesting_agent_id', this.config.agentName)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pastReviews) {
        // Extract learnings from approved and rejected reviews
        const learnings = pastReviews
          .filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED')
          .map((r) => ({
            status: r.status,
            reviewType: r.review_type,
            feedback: r.decision_summary,
            reasoning: r.decision_reasoning,
            reviewedAt: r.reviewed_at,
          }));

        this.context.reviewLearnings = learnings;

        logger.info(
          `[AgentRunner] Review context gathered: ${pastReviews.length} past reviews, ${learnings.length} learnings`
        );
      }
    } catch (error) {
      logger.error('[AgentRunner] Failed to gather review context', error);
      this.context.reviewLearnings = [];
    }
  }

  /**
   * Gather goal context for agent planning
   */
  private async gatherGoals(organizationId: string): Promise<void> {
    try {
      const campaignId = this.input.campaignId;

      if (!campaignId) {
        logger.info('[AgentRunner] No campaign context for goals');
        return;
      }

      // Get goal context for this campaign
      const goalContext = await goalEngine.injectGoalContext({
        campaignId,
        organizationId,
        includeOnlyActive: true,
      });

      this.context.goalContext = goalContext;

      logger.info(
        `[AgentRunner] Goal context gathered: ${goalContext.activeGoals.length} active goals, ${goalContext.criticalGoalsSummary}`
      );
    } catch (error) {
      logger.error('[AgentRunner] Failed to gather goal context', error);
      this.context.goalContext = null;
    }
  }

  /**
   * Check if a specific entity/action requires human review
   */
  async checkReviewRequired(
    entityType: ReviewableEntityType,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<{
    requiresReview: boolean;
    reviewType?: ReviewType;
    priority?: ReviewPriority;
    reason?: string;
  }> {
    const { organizationId } = this.context;

    return await reviewEngine.shouldTriggerReview(
      entityType,
      entityId,
      organizationId,
      metadata
    );
  }

  /**
   * Submit content for human review and return review ID
   * This should pause agent execution until review is complete
   */
  async submitForReview(params: {
    reviewType: ReviewType;
    reviewableEntityType: ReviewableEntityType;
    reviewableEntityId: string;
    title: string;
    description?: string;
    contentToReview: Record<string, any>;
    priority?: ReviewPriority;
    agentReasoning: string;
    assignedTo?: string;
  }): Promise<AgentReview> {
    const { organizationId } = this.context;

    logger.info(
      `[AgentRunner] Submitting ${params.reviewableEntityType} for review: ${params.title}`
    );

    const review = await reviewEngine.createReviewRequest({
      reviewType: params.reviewType,
      priority: params.priority || 'MEDIUM',
      reviewableEntityType: params.reviewableEntityType,
      reviewableEntityId: params.reviewableEntityId,
      title: params.title,
      description: params.description,
      contentToReview: params.contentToReview,
      requestingAgentId: this.config.agentName,
      agentReasoning: params.agentReasoning,
      assignedTo: params.assignedTo,
      organizationId,
    });

    logger.info(`[AgentRunner] Review created: ${review.id}`);

    return review;
  }

  /**
   * Wait for a review to be completed and return the decision
   * This is typically called after submitForReview() to pause execution
   */
  async waitForReview(
    reviewId: string,
    pollIntervalMs: number = 5000,
    timeoutMs: number = 3600000 // 1 hour default
  ): Promise<AgentReview> {
    const { organizationId } = this.context;
    const startTime = Date.now();

    logger.info(`[AgentRunner] Waiting for review ${reviewId} to be completed`);

    while (Date.now() - startTime < timeoutMs) {
      const review = await reviewEngine.getReview(reviewId, organizationId);

      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }

      // Check if review is completed
      if (review.status === 'APPROVED') {
        logger.info(`[AgentRunner] Review ${reviewId} approved`);
        return review;
      }

      if (review.status === 'REJECTED') {
        logger.warn(`[AgentRunner] Review ${reviewId} rejected`);
        throw new Error(
          `Review rejected: ${review.decisionSummary || 'No reason provided'}`
        );
      }

      if (review.status === 'NEEDS_EDIT') {
        logger.info(`[AgentRunner] Review ${reviewId} needs edits`);
        return review; // Return with modifications
      }

      // Still pending, wait and poll again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Review ${reviewId} timed out after ${timeoutMs}ms`);
  }

  /**
   * Apply review feedback to agent output
   * This merges the reviewer's modifications with the agent's original output
   */
  applyReviewModifications(
    originalOutput: Record<string, any>,
    review: AgentReview
  ): Record<string, any> {
    if (!review.modifications || Object.keys(review.modifications).length === 0) {
      return originalOutput;
    }

    logger.info(
      `[AgentRunner] Applying review modifications from review ${review.id}`
    );

    // Deep merge modifications into original output
    const modified = { ...originalOutput };

    for (const [key, value] of Object.entries(review.modifications)) {
      if (key in modified) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Merge nested objects
          modified[key] = { ...(modified[key] as Record<string, any>), ...value };
        } else {
          // Replace value
          modified[key] = value;
        }
      } else {
        // Add new field
        modified[key] = value;
      }
    }

    return modified;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private calculateConfidence(result: any): number {
    // Simple heuristic: check if result has expected fields
    if (!result || typeof result !== 'object') return 0.5;

    const outputKeys = Object.keys(this.config.outputSchema);
    const resultKeys = Object.keys(result);
    const matchingKeys = resultKeys.filter((k) => outputKeys.includes(k));

    return matchingKeys.length / outputKeys.length;
  }
}

// =====================================================
// CONVENIENCE FUNCTION
// =====================================================

export async function runAgent(
  config: AgentRunnerConfig,
  input: Record<string, any>,
  context: AgentContext
): Promise<AgentResult> {
  const runner = new AgentRunner({ config, input, context });
  return await runner.execute();
}
