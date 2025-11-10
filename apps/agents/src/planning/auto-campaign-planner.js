"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoCampaignPlanner = exports.AutoCampaignPlanner = void 0;
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const memory_1 = require("../memory");
const memory_engine_1 = require("../memory/memory-engine");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class AutoCampaignPlanner {
    async planCampaign(request, organizationId) {
        try {
            logger_1.logger.info('[AutoCampaignPlanner] Starting campaign planning', {
                prompt: request.prompt.substring(0, 100),
                campaignType: request.campaignType,
                organizationId,
            });
            const context = await this.gatherOrganizationalContext(organizationId);
            const memories = await this.retrieveCampaignMemories(organizationId, request.prompt);
            const plan = await this.generateCampaignPlan(request, context, memories);
            const enrichedPlan = await this.enrichPlan(plan, organizationId);
            await this.storePlanningMemory(enrichedPlan, request, organizationId);
            logger_1.logger.info('[AutoCampaignPlanner] Campaign planning completed', {
                objectives: enrichedPlan.strategyDoc.objectives.length,
                targetOutlets: enrichedPlan.strategyDoc.targetOutlets.length,
            });
            return enrichedPlan;
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignPlanner] Failed to plan campaign', error);
            throw error;
        }
    }
    async gatherOrganizationalContext(organizationId) {
        try {
            const { data: org } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', organizationId)
                .single();
            const { data: strategy } = await supabase
                .from('strategy_plans')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('is_current', true)
                .single();
            const { count: totalContacts } = await supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);
            const { data: pastCampaigns } = await supabase
                .from('pr_campaigns')
                .select('status, performance_metrics')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(10);
            return {
                organization: org,
                strategy,
                contactStats: {
                    totalContacts: totalContacts || 0,
                },
                pastCampaigns: pastCampaigns || [],
            };
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignPlanner] Failed to gather context', error);
            return {};
        }
    }
    async retrieveCampaignMemories(organizationId, prompt) {
        try {
            const contextResult = await memory_engine_1.memoryEngine.injectContext({
                organizationId,
                agentType: 'campaign-planner',
                queryText: prompt || 'campaign planning strategies and insights',
                maxMemories: 15,
                includeKnowledgeGraph: false,
            });
            if (contextResult.memories.length > 0) {
                return contextResult.memories.map((m) => {
                    const relevance = Math.round(m.similarity * 100);
                    return `[${m.memoryType}] (${relevance}% relevant): ${m.summary || m.content}`;
                });
            }
            const memories = await memory_1.memoryStore.getRecentMemories('campaign-planner', organizationId, 10);
            return memories.map((m) => m.content);
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignPlanner] Failed to retrieve memories', error);
            return [];
        }
    }
    async generateCampaignPlan(request, context, memories) {
        const systemPrompt = `You are an expert PR campaign strategist AI. Your role is to transform campaign goals into detailed, executable PR strategies.

CONTEXT:
- Organization: ${context.organization?.name || 'Unknown'}
- Industry: ${context.strategy?.industry || 'Unknown'}
- Target Audience: ${context.strategy?.target_audience || 'Unknown'}
- Positioning: ${context.strategy?.positioning_statement || 'Unknown'}
- Available Contacts: ${context.contactStats?.totalContacts || 0}

PAST CAMPAIGN LEARNINGS:
${memories.length > 0 ? memories.join('\n') : 'No past campaign data available'}

Your task is to create a comprehensive campaign plan that includes:
1. Strategy Document (objectives, target outlets, timeline, key messages)
2. Pitch Plan (themes, templates, personalization variables)
3. Contact Criteria (targeting rules for journalist selection)
4. Metrics Plan (KPIs and monitoring setup)

Output MUST be valid JSON matching this structure:
{
  "strategyDoc": {
    "objectives": ["objective1", "objective2"],
    "targetOutlets": ["outlet1", "outlet2"],
    "timeline": "2 weeks",
    "keyMessages": ["message1", "message2"]
  },
  "pitchPlan": {
    "themes": ["theme1", "theme2"],
    "templates": ["template1", "template2"],
    "variables": {"var1": "value1"}
  },
  "contactCriteria": {
    "outletTypes": ["Tech Publications"],
    "contactTiers": ["Tier 1", "Tier 2"],
    "topics": ["AI", "Technology"],
    "minRelationshipScore": 50
  },
  "metricsPlan": {
    "kpis": {
      "targetPitches": 50,
      "targetResponseRate": 0.15,
      "targetPlacements": 5,
      "timeline": "2 weeks"
    },
    "monitoring": {
      "trackMentions": true,
      "alertOnResponse": true,
      "alertOnPlacement": true,
      "thresholds": {
        "responseRate": 0.10,
        "minQualityScore": 0.7
      }
    }
  }
}`;
        const userPrompt = `Campaign Goal: ${request.prompt}

${request.campaignType ? `Campaign Type: ${request.campaignType}` : ''}

${request.constraints ? `Constraints:
- Max Contacts: ${request.constraints.maxContacts || 'Not specified'}
- Timeline: ${request.constraints.timeline || 'Not specified'}
- Budget: ${request.constraints.maxBudget ? `$${request.constraints.maxBudget}` : 'Not specified'}` : ''}

${request.preferences ? `Preferences:
- Personalization Level: ${request.preferences.personalizationLevel || 'medium'}
- Preferred Outlet Types: ${request.preferences.outletTypes?.join(', ') || 'Not specified'}
- Preferred Topics: ${request.preferences.topics?.join(', ') || 'Not specified'}` : ''}

Create a comprehensive campaign plan that achieves this goal while considering the organization's context and past learnings.`;
        logger_1.logger.info('[AutoCampaignPlanner] Calling OpenAI for campaign planning');
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 3000,
        });
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('No content returned from OpenAI');
        }
        const plan = JSON.parse(content);
        logger_1.logger.info('[AutoCampaignPlanner] AI planning completed', {
            objectives: plan.strategyDoc.objectives.length,
            themes: plan.pitchPlan.themes.length,
        });
        return plan;
    }
    async enrichPlan(plan, organizationId) {
        const contactCount = await this.estimateTargetContactCount(plan.contactCriteria, organizationId);
        logger_1.logger.info('[AutoCampaignPlanner] Estimated target contacts', {
            count: contactCount,
        });
        if (contactCount < plan.metricsPlan.kpis.targetPitches) {
            logger_1.logger.warn('[AutoCampaignPlanner] Adjusting target pitches to match available contacts', {
                original: plan.metricsPlan.kpis.targetPitches,
                adjusted: contactCount,
            });
            plan.metricsPlan.kpis.targetPitches = contactCount;
        }
        return plan;
    }
    async estimateTargetContactCount(criteria, organizationId) {
        try {
            let query = supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);
            if (criteria.outletTypes && criteria.outletTypes.length > 0) {
                query = query.in('outlet_type', criteria.outletTypes);
            }
            if (criteria.topics && criteria.topics.length > 0) {
            }
            const { count } = await query;
            return count || 0;
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignPlanner] Failed to estimate contact count', error);
            return 0;
        }
    }
    async critiquePlan(plan, organizationId) {
        try {
            const systemPrompt = `You are an expert PR strategist reviewer. Analyze campaign plans for quality, feasibility, and effectiveness.

Rate the plan on a scale of 0-1 based on:
- Strategic clarity and alignment
- Realistic goals and timelines
- Appropriate targeting
- Comprehensive metrics
- Feasibility of execution

Provide specific, actionable feedback.

Output JSON:
{
  "score": 0.85,
  "feedback": ["strength1", "weakness1", "improvement1"]
}`;
            const userPrompt = `Review this campaign plan:

${JSON.stringify(plan, null, 2)}

Provide a quality score and detailed feedback.`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 1000,
            });
            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error('No critique returned from OpenAI');
            }
            const critique = JSON.parse(content);
            logger_1.logger.info('[AutoCampaignPlanner] Plan critique completed', {
                score: critique.score,
                feedbackCount: critique.feedback.length,
            });
            return critique;
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignPlanner] Failed to critique plan', error);
            return { score: 0.5, feedback: ['Could not generate critique'] };
        }
    }
    async storePlanningMemory(plan, request, organizationId) {
        try {
            const memoryContent = `Campaign Planning: ${request.prompt}

Key Decisions:
- Campaign Type: ${plan.campaignType}
- Objectives: ${plan.strategyDoc.objectives.join(', ')}
- Target Outlets: ${plan.strategyDoc.targetOutlets.length} outlets
- Expected Results: ${plan.strategyDoc.expectedResults.join(', ')}

Strategy Summary:
${plan.strategyDoc.strategySummary}`;
            await memory_engine_1.memoryEngine.storeMemory({
                memoryId: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                agentType: 'campaign-planner',
                agentId: 'auto-planner',
                memoryType: 'PLANNING',
                content: memoryContent,
                metadata: {
                    campaignType: plan.campaignType,
                    objectives: plan.strategyDoc.objectives,
                    targetOutlets: plan.strategyDoc.targetOutlets,
                },
                organizationId,
            });
            logger_1.logger.info('[AutoCampaignPlanner] Planning memory stored');
        }
        catch (error) {
            logger_1.logger.error('[AutoCampaignPlanner] Failed to store planning memory', error);
        }
    }
}
exports.AutoCampaignPlanner = AutoCampaignPlanner;
exports.autoCampaignPlanner = new AutoCampaignPlanner();
//# sourceMappingURL=auto-campaign-planner.js.map