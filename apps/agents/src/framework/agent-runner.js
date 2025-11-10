"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRunner = void 0;
exports.runAgent = runAgent;
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const logger_1 = require("../lib/logger");
const memory_1 = require("../memory");
const collaboration_1 = require("../collaboration");
const review_engine_1 = require("../review/review-engine");
const followup_engine_1 = require("../followup/followup-engine");
const timeline_engine_1 = require("../timeline/timeline-engine");
const goal_engine_1 = require("../goals/goal-engine");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
class AgentRunner {
    config;
    context;
    input;
    steps = [];
    currentStepId = null;
    tokensUsed = 0;
    startTime = 0;
    constructor(runnerInput) {
        this.config = runnerInput.config;
        this.context = runnerInput.context;
        this.input = runnerInput.input;
    }
    async execute() {
        this.startTime = Date.now();
        try {
            logger_1.logger.info(`[AgentRunner] Starting execution: ${this.config.agentName}`);
            await this.addStep('validate-input', 'Validating input data');
            this.validateInput();
            await this.completeCurrentStep({ validated: true });
            await this.addStep('gather-context', 'Gathering context data');
            await this.gatherContext();
            await this.completeCurrentStep({ contextGathered: true });
            await this.addStep('execute-agent', 'Executing AI agent');
            const result = await this.executeAgent();
            await this.completeCurrentStep({ resultGenerated: true });
            await this.addStep('validate-output', 'Validating output data');
            const validatedResult = this.validateOutput(result);
            await this.completeCurrentStep({ outputValidated: true });
            try {
                await this.persistMemory(validatedResult);
            }
            catch (memoryError) {
                logger_1.logger.error('[AgentRunner] Failed to persist memory', memoryError);
            }
            try {
                await this.handleFollowupCancellation(validatedResult);
            }
            catch (followupError) {
                logger_1.logger.error('[AgentRunner] Failed to handle followup cancellation', followupError);
            }
            try {
                await this.logTimelineEvent('success', validatedResult);
            }
            catch (timelineError) {
                logger_1.logger.error('[AgentRunner] Failed to log timeline event', timelineError);
            }
            try {
                await this.trackOutcomeEvents(validatedResult);
            }
            catch (outcomeError) {
                logger_1.logger.error('[AgentRunner] Failed to track outcome events', outcomeError);
            }
            logger_1.logger.info(`[AgentRunner] Execution completed: ${this.config.agentName}`);
            return {
                success: true,
                data: validatedResult,
                steps: this.steps,
                tokensUsed: this.tokensUsed,
                executionTimeMs: Date.now() - this.startTime,
                confidence: this.calculateConfidence(validatedResult),
            };
        }
        catch (error) {
            logger_1.logger.error(`[AgentRunner] Execution failed: ${error.message}`);
            if (this.currentStepId) {
                await this.failCurrentStep(error.message);
            }
            try {
                await this.logTimelineEvent('failure', undefined, error.message);
            }
            catch (timelineError) {
                logger_1.logger.error('[AgentRunner] Failed to log timeline failure event', timelineError);
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
    async gatherContext() {
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
        logger_1.logger.info(`[AgentRunner] Context gathered from ${sources.length} sources`);
    }
    async gatherStrategy(organizationId) {
        const { data } = await supabase_1.supabase
            .from('strategy_plans')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_current', true)
            .single();
        if (data) {
            this.context.strategy = data;
        }
    }
    async gatherContacts(organizationId) {
        const { data } = await supabase_1.supabase
            .from('contacts')
            .select('*')
            .eq('organization_id', organizationId)
            .limit(100);
        if (data) {
            this.context.contacts = data;
        }
    }
    async gatherKeywordClusters(organizationId) {
        const { data } = await supabase_1.supabase
            .from('keyword_clusters')
            .select('*')
            .eq('organization_id', organizationId)
            .limit(50);
        if (data) {
            this.context.keywordClusters = data;
        }
    }
    async gatherCampaigns(organizationId) {
        const { data } = await supabase_1.supabase
            .from('campaigns')
            .select('*')
            .eq('organization_id', organizationId)
            .limit(20);
        if (data) {
            this.context.campaigns = data;
        }
    }
    async gatherCRM(organizationId, userId) {
        const { data: stats } = await supabase_1.supabase.rpc('get_user_crm_stats', {
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
        const { data: recentActivity } = await supabase_1.supabase
            .from('recent_contact_activity')
            .select('*')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .limit(50);
        if (recentActivity) {
            this.context.recentActivity = recentActivity;
        }
        const { data: relationships } = await supabase_1.supabase
            .from('relationship_strengths')
            .select('*')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .order('strength_score', { ascending: false })
            .limit(20);
        if (relationships) {
            this.context.relationshipStrengths = relationships;
        }
        const { data: followUps } = await supabase_1.supabase
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
        logger_1.logger.info('[AgentRunner] CRM context gathered');
    }
    async gatherMemory(organizationId) {
        try {
            const recentMemories = await memory_1.memoryStore.getRecentMemories(this.config.agentName, organizationId, 20);
            const contextTags = this.input.contextTags || [];
            let relevantMemories = [];
            if (contextTags.length > 0) {
                const searchResult = await memory_1.memoryStore.searchMemory({
                    agentId: this.config.agentName,
                    organizationId,
                    tags: contextTags,
                    topK: 10,
                    minImportance: 0.5,
                });
                relevantMemories = searchResult.memories;
            }
            this.context.memory = recentMemories;
            this.context.relevantMemory = relevantMemories;
            logger_1.logger.info(`[AgentRunner] Memory context gathered: ${recentMemories.length} recent, ${relevantMemories.length} relevant`);
        }
        catch (error) {
            logger_1.logger.error('[AgentRunner] Failed to gather memory context', error);
            this.context.memory = [];
            this.context.relevantMemory = [];
        }
    }
    async gatherCollaboration(organizationId) {
        try {
            const goalId = this.input.goalId;
            const taskId = this.input.taskId;
            if (!goalId && !taskId) {
                logger_1.logger.info('[AgentRunner] No goal or task context for collaboration');
                return;
            }
            if (goalId) {
                const collaborators = await collaboration_1.collabManager.getActiveCollaborators(goalId, organizationId);
                const myCollab = collaborators.find((c) => c.agentId === this.config.agentName);
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
                const threads = await collaboration_1.messageCenter.getGoalThreads(goalId, organizationId);
                this.context.collaborationThreads = threads;
                logger_1.logger.info(`[AgentRunner] Collaboration context gathered: ${collaborators.length} collaborators, ${threads.length} threads`);
            }
            if (taskId) {
                const handoffs = await collaboration_1.handoffEngine.getTaskHandoffs(taskId, organizationId);
                this.context.taskHandoffs = handoffs;
                const myHandoffs = await collaboration_1.handoffEngine.getPendingHandoffs(this.config.agentName, organizationId);
                this.context.pendingHandoffs = myHandoffs;
                logger_1.logger.info(`[AgentRunner] Handoff context gathered: ${handoffs.length} task handoffs, ${myHandoffs.length} pending`);
            }
        }
        catch (error) {
            logger_1.logger.error('[AgentRunner] Failed to gather collaboration context', error);
            this.context.collaboration = null;
            this.context.collaborationThreads = [];
            this.context.taskHandoffs = [];
            this.context.pendingHandoffs = [];
        }
    }
    async persistMemory(result) {
        const { organizationId, userId, executionId } = this.context;
        if (!this.config.persistMemory) {
            logger_1.logger.info('[AgentRunner] Memory persistence disabled for this agent');
            return;
        }
        const taskSummary = `Executed ${this.config.agentName}: ${JSON.stringify(result).substring(0, 500)}`;
        const taskImportance = (0, memory_1.calculateMemoryImportance)(taskSummary, 'TASK', {
            taskSuccess: true,
            ageInDays: 0,
        });
        await memory_1.memoryStore.addMemory({
            agentId: this.config.agentName,
            memoryType: 'TASK',
            content: taskSummary,
            organizationId,
            agentExecutionId: executionId,
            importanceScore: taskImportance,
            contextTags: this.input.contextTags || [],
            relatedContactId: this.input.contactId,
            relatedCampaignId: this.input.campaignId,
        });
        logger_1.logger.info(`[AgentRunner] Memory persisted for execution: ${executionId}`);
    }
    async handleFollowupCancellation(result) {
        const { organizationId } = this.context;
        const contactId = this.input.contactId || result.contactId;
        if (!contactId) {
            return;
        }
        const replyDetected = this.input.interactionType === 'EMAIL_REPLIED' ||
            result.interactionType === 'EMAIL_REPLIED' ||
            result.wasReplied === true;
        if (!replyDetected) {
            return;
        }
        logger_1.logger.info(`[AgentRunner] Reply detected for contact ${contactId}, checking for active followup sequences`);
        const { data: activeFollowups } = await supabase_1.supabase
            .from('scheduled_followups')
            .select('sequence_id')
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId)
            .eq('status', 'PENDING')
            .order('sequence_id');
        if (!activeFollowups || activeFollowups.length === 0) {
            logger_1.logger.info(`[AgentRunner] No active followup sequences found for contact ${contactId}`);
            return;
        }
        const sequenceIds = [...new Set(activeFollowups.map((f) => f.sequence_id))];
        logger_1.logger.info(`[AgentRunner] Canceling ${sequenceIds.length} followup sequences for contact ${contactId}`);
        let totalCanceled = 0;
        for (const sequenceId of sequenceIds) {
            try {
                const canceledCount = await followup_engine_1.followupEngine.cancelSequenceForContact({
                    contactId,
                    sequenceId,
                    reason: `Contact replied - auto-canceled by ${this.config.agentName}`,
                    organizationId,
                });
                totalCanceled += canceledCount;
                logger_1.logger.info(`[AgentRunner] Canceled ${canceledCount} followups in sequence ${sequenceId}`);
            }
            catch (error) {
                logger_1.logger.error(`[AgentRunner] Failed to cancel sequence ${sequenceId}: ${error.message}`);
            }
        }
        if (totalCanceled > 0) {
            logger_1.logger.info(`[AgentRunner] Successfully canceled ${totalCanceled} total followups for contact ${contactId}`);
            followup_engine_1.followupEngine.emit('auto-canceled-on-reply', {
                contactId,
                sequenceIds,
                totalCanceled,
                agentName: this.config.agentName,
            });
        }
    }
    async logTimelineEvent(status, result, error) {
        const { organizationId, executionId } = this.context;
        const campaignId = this.input.campaignId;
        const contactId = this.input.contactId || result?.contactId;
        await timeline_engine_1.timelineEngine.logAgentRun(this.config.agentName, executionId || `exec-${Date.now()}`, campaignId, organizationId, {
            status,
            tokensUsed: this.tokensUsed,
            durationMs: Date.now() - this.startTime,
            confidence: status === 'success' ? this.calculateConfidence(result) : undefined,
            result: status === 'success' ? result : undefined,
            error,
            relatedContactId: contactId,
        });
        logger_1.logger.info(`[AgentRunner] Timeline event logged for ${this.config.agentName} (${status})`);
    }
    async trackOutcomeEvents(result) {
        const { organizationId, executionId } = this.context;
        const campaignId = this.input.campaignId;
        const contactId = this.input.contactId || result?.contactId;
        if (!campaignId || !organizationId) {
            logger_1.logger.info('[AgentRunner] No campaign context for outcome tracking');
            return;
        }
        const events = [];
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
        for (const event of events) {
            try {
                const eventId = await goal_engine_1.goalEngine.trackOutcomeEvent({
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
                logger_1.logger.info(`[AgentRunner] Outcome tracked: ${event.type} (${eventId})`);
            }
            catch (error) {
                logger_1.logger.error(`[AgentRunner] Failed to track outcome event ${event.type}:`, error.message);
            }
        }
        if (events.length > 0) {
            logger_1.logger.info(`[AgentRunner] Tracked ${events.length} outcome event(s) for goal attribution`);
        }
        else {
            logger_1.logger.info('[AgentRunner] No outcome events detected for goal attribution');
        }
    }
    async executeAgent() {
        const systemPrompt = this.interpolateTemplate(this.config.systemPrompt);
        const userPrompt = this.buildUserPrompt();
        logger_1.logger.info(`[AgentRunner] Calling OpenAI with model: ${this.config.model || 'gpt-4-turbo-preview'}`);
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
            logger_1.logger.info(`[AgentRunner] Tokens used: ${this.tokensUsed}`);
        }
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('No content returned from OpenAI');
        }
        return JSON.parse(content);
    }
    buildUserPrompt() {
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
            this.context.keywordClusters.slice(0, 5).forEach((cluster) => {
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
            this.context.relationshipStrengths.slice(0, 10).forEach((rel) => {
                prompt += `- ${rel.contact_name} (${rel.outlet || 'Unknown'}): Strength ${rel.strength_score}/100, ${rel.relationship_temperature}\n`;
            });
            prompt += '\n';
        }
        if (this.context.recentActivity && this.context.recentActivity.length > 0) {
            prompt += `Recent Interactions (Last 7 Days): ${this.context.recentActivity.length} interactions\n`;
            this.context.recentActivity.slice(0, 5).forEach((activity) => {
                prompt += `- ${activity.contact_name}: ${activity.interaction_type} via ${activity.channel}\n`;
            });
            prompt += '\n';
        }
        if (this.context.pendingFollowUps && this.context.pendingFollowUps.length > 0) {
            prompt += 'Upcoming Follow-Ups:\n';
            this.context.pendingFollowUps.slice(0, 5).forEach((followUp) => {
                const dueDate = new Date(followUp.due_date).toLocaleDateString();
                prompt += `- ${followUp.title} (Due: ${dueDate}, Priority: ${followUp.priority})\n`;
            });
            prompt += '\n';
        }
        if (this.context.memory && this.context.memory.length > 0) {
            prompt += 'Recent Memories:\n';
            this.context.memory.slice(0, 10).forEach((memory) => {
                const date = new Date(memory.createdAt).toLocaleDateString();
                prompt += `- [${memory.memoryType}] ${memory.content.substring(0, 150)}... (${date})\n`;
            });
            prompt += '\n';
        }
        if (this.context.relevantMemory && this.context.relevantMemory.length > 0) {
            prompt += 'Relevant Memories (context-specific):\n';
            this.context.relevantMemory.forEach((memory) => {
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
            this.context.collaboration.collaborators.forEach((collab) => {
                prompt += `  - ${collab.agentId}: ${collab.role} (${collab.scope})\n`;
            });
            prompt += '\n';
        }
        if (this.context.collaborationThreads && this.context.collaborationThreads.length > 0) {
            prompt += `Active Communication Threads: ${this.context.collaborationThreads.length} threads\n\n`;
        }
        if (this.context.taskHandoffs && this.context.taskHandoffs.length > 0) {
            prompt += 'Task Handoffs:\n';
            this.context.taskHandoffs.forEach((handoff) => {
                prompt += `- From ${handoff.fromAgentId} to ${handoff.toAgentId}: ${handoff.status}\n`;
                prompt += `  Reason: ${handoff.handoffReason}\n`;
            });
            prompt += '\n';
        }
        if (this.context.pendingHandoffs && this.context.pendingHandoffs.length > 0) {
            prompt += 'Pending Handoffs (to you):\n';
            this.context.pendingHandoffs.forEach((handoff) => {
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
            this.context.reviewLearnings.forEach((learning) => {
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
                this.context.goalContext.activeGoals.forEach((goal) => {
                    const targetKey = Object.keys(goal.targetMetric)[0];
                    const targetValue = goal.targetMetric[targetKey];
                    const currentValue = goal.currentMetric[targetKey] || 0;
                    const percentage = goal.completionScore.toFixed(0);
                    prompt += `- [${goal.priority}] ${goal.title} (${goal.goalType})\n`;
                    prompt += `  Progress: ${currentValue}/${targetValue} ${targetKey} (${percentage}%)\n`;
                    if (goal.daysUntilDue !== undefined) {
                        if (goal.daysUntilDue < 0) {
                            prompt += `  ⚠️ OVERDUE\n`;
                        }
                        else if (goal.daysUntilDue <= 7) {
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
    interpolateTemplate(template) {
        let interpolated = template;
        const inputMatches = template.match(/\{\{input\.(\w+)\}\}/g);
        if (inputMatches) {
            inputMatches.forEach((match) => {
                const field = match.replace(/\{\{input\.(\w+)\}\}/, '$1');
                const value = this.input[field] || '';
                interpolated = interpolated.replace(match, String(value));
            });
        }
        const contextMatches = template.match(/\{\{context\.(\w+)\}\}/g);
        if (contextMatches) {
            contextMatches.forEach((match) => {
                const field = match.replace(/\{\{context\.(\w+)\}\}/, '$1');
                const value = this.context[field] || '';
                interpolated = interpolated.replace(match, String(value));
            });
        }
        return interpolated;
    }
    validateInput() {
        try {
            const schema = zod_1.z.object(this.config.inputSchema);
            schema.parse(this.input);
        }
        catch (error) {
            throw new Error(`Input validation failed: ${error.message}`);
        }
    }
    validateOutput(output) {
        try {
            const schema = zod_1.z.object(this.config.outputSchema);
            return schema.parse(output);
        }
        catch (error) {
            throw new Error(`Output validation failed: ${error.message}`);
        }
    }
    async addStep(id, name, description) {
        const step = {
            id,
            name,
            description,
            status: 'running',
            startedAt: new Date(),
        };
        this.steps.push(step);
        this.currentStepId = id;
        logger_1.logger.info(`[AgentRunner] Step started: ${name}`);
    }
    async completeCurrentStep(output) {
        if (!this.currentStepId)
            return;
        const step = this.steps.find((s) => s.id === this.currentStepId);
        if (step) {
            step.status = 'completed';
            step.completedAt = new Date();
            step.output = output;
        }
        logger_1.logger.info(`[AgentRunner] Step completed: ${step?.name}`);
        this.currentStepId = null;
    }
    async failCurrentStep(error) {
        if (!this.currentStepId)
            return;
        const step = this.steps.find((s) => s.id === this.currentStepId);
        if (step) {
            step.status = 'failed';
            step.completedAt = new Date();
            step.error = error;
        }
        logger_1.logger.error(`[AgentRunner] Step failed: ${step?.name} - ${error}`);
        this.currentStepId = null;
    }
    async executeTool(toolName, input) {
        const tool = this.config.tools?.find((t) => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        logger_1.logger.info(`[AgentRunner] Executing tool: ${toolName}`);
        try {
            const result = await tool.execute(input, this.context);
            logger_1.logger.info(`[AgentRunner] Tool executed successfully: ${toolName}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`[AgentRunner] Tool execution failed: ${toolName} - ${error.message}`);
            throw error;
        }
    }
    async checkTaskPermission(taskId) {
        const { organizationId } = this.context;
        return await collaboration_1.collabManager.checkTaskPermission(taskId, this.config.agentName, organizationId);
    }
    async requestHandoff(taskId, targetAgent, reason, message) {
        const { organizationId } = this.context;
        logger_1.logger.info(`[AgentRunner] Requesting handoff to ${targetAgent}`, {
            taskId,
            reason,
        });
        await collaboration_1.handoffEngine.initiateHandoff({
            taskId,
            fromAgentId: this.config.agentName,
            toAgentId: targetAgent,
            handoffReason: reason,
            handoffMessage: message,
            organizationId,
        });
    }
    async sendMessage(recipients, content, messageType = 'INFO') {
        const { organizationId } = this.context;
        const goalId = this.input.goalId;
        const taskId = this.input.taskId;
        logger_1.logger.info(`[AgentRunner] Sending message to agents: ${recipients.join(', ')}`);
        await collaboration_1.messageCenter.broadcastMessage({
            recipients,
            messageType,
            content,
        }, this.config.agentName, organizationId, goalId, taskId);
    }
    async escalate(reason, severity = 'medium', requestedAction) {
        const { organizationId } = this.context;
        const goalId = this.input.goalId;
        const taskId = this.input.taskId;
        logger_1.logger.warn(`[AgentRunner] Escalating issue: ${reason}`, { severity });
        await collaboration_1.messageCenter.escalate({
            goalId,
            taskId,
            reason,
            severity,
            requestedAction,
        }, this.config.agentName, organizationId);
    }
    async gatherReview(organizationId) {
        try {
            const { data: pastReviews } = await supabase_1.supabase
                .from('agent_reviews')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('requesting_agent_id', this.config.agentName)
                .order('created_at', { ascending: false })
                .limit(10);
            if (pastReviews) {
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
                logger_1.logger.info(`[AgentRunner] Review context gathered: ${pastReviews.length} past reviews, ${learnings.length} learnings`);
            }
        }
        catch (error) {
            logger_1.logger.error('[AgentRunner] Failed to gather review context', error);
            this.context.reviewLearnings = [];
        }
    }
    async gatherGoals(organizationId) {
        try {
            const campaignId = this.input.campaignId;
            if (!campaignId) {
                logger_1.logger.info('[AgentRunner] No campaign context for goals');
                return;
            }
            const goalContext = await goal_engine_1.goalEngine.injectGoalContext({
                campaignId,
                organizationId,
                includeOnlyActive: true,
            });
            this.context.goalContext = goalContext;
            logger_1.logger.info(`[AgentRunner] Goal context gathered: ${goalContext.activeGoals.length} active goals, ${goalContext.criticalGoalsSummary}`);
        }
        catch (error) {
            logger_1.logger.error('[AgentRunner] Failed to gather goal context', error);
            this.context.goalContext = null;
        }
    }
    async checkReviewRequired(entityType, entityId, metadata) {
        const { organizationId } = this.context;
        return await review_engine_1.reviewEngine.shouldTriggerReview(entityType, entityId, organizationId, metadata);
    }
    async submitForReview(params) {
        const { organizationId } = this.context;
        logger_1.logger.info(`[AgentRunner] Submitting ${params.reviewableEntityType} for review: ${params.title}`);
        const review = await review_engine_1.reviewEngine.createReviewRequest({
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
        logger_1.logger.info(`[AgentRunner] Review created: ${review.id}`);
        return review;
    }
    async waitForReview(reviewId, pollIntervalMs = 5000, timeoutMs = 3600000) {
        const { organizationId } = this.context;
        const startTime = Date.now();
        logger_1.logger.info(`[AgentRunner] Waiting for review ${reviewId} to be completed`);
        while (Date.now() - startTime < timeoutMs) {
            const review = await review_engine_1.reviewEngine.getReview(reviewId, organizationId);
            if (!review) {
                throw new Error(`Review ${reviewId} not found`);
            }
            if (review.status === 'APPROVED') {
                logger_1.logger.info(`[AgentRunner] Review ${reviewId} approved`);
                return review;
            }
            if (review.status === 'REJECTED') {
                logger_1.logger.warn(`[AgentRunner] Review ${reviewId} rejected`);
                throw new Error(`Review rejected: ${review.decisionSummary || 'No reason provided'}`);
            }
            if (review.status === 'NEEDS_EDIT') {
                logger_1.logger.info(`[AgentRunner] Review ${reviewId} needs edits`);
                return review;
            }
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
        throw new Error(`Review ${reviewId} timed out after ${timeoutMs}ms`);
    }
    applyReviewModifications(originalOutput, review) {
        if (!review.modifications || Object.keys(review.modifications).length === 0) {
            return originalOutput;
        }
        logger_1.logger.info(`[AgentRunner] Applying review modifications from review ${review.id}`);
        const modified = { ...originalOutput };
        for (const [key, value] of Object.entries(review.modifications)) {
            if (key in modified) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    modified[key] = { ...modified[key], ...value };
                }
                else {
                    modified[key] = value;
                }
            }
            else {
                modified[key] = value;
            }
        }
        return modified;
    }
    calculateConfidence(result) {
        if (!result || typeof result !== 'object')
            return 0.5;
        const outputKeys = Object.keys(this.config.outputSchema);
        const resultKeys = Object.keys(result);
        const matchingKeys = resultKeys.filter((k) => outputKeys.includes(k));
        return matchingKeys.length / outputKeys.length;
    }
}
exports.AgentRunner = AgentRunner;
async function runAgent(config, input, context) {
    const runner = new AgentRunner({ config, input, context });
    return await runner.execute();
}
//# sourceMappingURL=agent-runner.js.map