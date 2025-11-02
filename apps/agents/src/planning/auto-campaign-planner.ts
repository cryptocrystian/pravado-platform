// =====================================================
// AUTONOMOUS CAMPAIGN PLANNER
// =====================================================
// AI-powered campaign planning engine that transforms natural language goals
// into comprehensive, executable campaign strategies

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type {
  CampaignPlanningRequest,
  CampaignPlanningOutput,
  CampaignType,
  CampaignTargeting,
  PersonalizationStrategy,
  WorkflowConfig,
  MonitoringSetup,
  CampaignKPIs,
} from '@pravado/shared-types';
import { logger } from '../lib/logger';
import { memoryStore } from '../memory';
import { memoryEngine } from '../memory/memory-engine';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Autonomous Campaign Planner
 *
 * Transforms natural language campaign goals into structured, executable plans
 */
export class AutoCampaignPlanner {
  /**
   * Plan a campaign from natural language prompt
   */
  async planCampaign(
    request: CampaignPlanningRequest,
    organizationId: string
  ): Promise<CampaignPlanningOutput> {
    try {
      logger.info('[AutoCampaignPlanner] Starting campaign planning', {
        prompt: request.prompt.substring(0, 100),
        campaignType: request.campaignType,
        organizationId,
      });

      // Gather organizational context
      const context = await this.gatherOrganizationalContext(organizationId);

      // Retrieve relevant campaign memories using semantic search
      const memories = await this.retrieveCampaignMemories(organizationId, request.prompt);

      // Generate campaign plan using AI
      const plan = await this.generateCampaignPlan(request, context, memories);

      // Validate and enrich the plan
      const enrichedPlan = await this.enrichPlan(plan, organizationId);

      // Store planning insights as memory
      await this.storePlanningMemory(enrichedPlan, request, organizationId);

      logger.info('[AutoCampaignPlanner] Campaign planning completed', {
        objectives: enrichedPlan.strategyDoc.objectives.length,
        targetOutlets: enrichedPlan.strategyDoc.targetOutlets.length,
      });

      return enrichedPlan;
    } catch (error) {
      logger.error('[AutoCampaignPlanner] Failed to plan campaign', error);
      throw error;
    }
  }

  /**
   * Gather organizational context for planning
   */
  private async gatherOrganizationalContext(organizationId: string): Promise<any> {
    try {
      // Get organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      // Get current strategy
      const { data: strategy } = await supabase
        .from('strategy_plans')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_current', true)
        .single();

      // Get contact statistics
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get past campaign stats
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
    } catch (error) {
      logger.error('[AutoCampaignPlanner] Failed to gather context', error);
      return {};
    }
  }

  /**
   * Retrieve relevant campaign memories using semantic search
   */
  private async retrieveCampaignMemories(
    organizationId: string,
    prompt?: string
  ): Promise<string[]> {
    try {
      // Use new memory engine with semantic search
      const contextResult = await memoryEngine.injectContext({
        organizationId,
        agentType: 'campaign-planner',
        queryText: prompt || 'campaign planning strategies and insights',
        maxMemories: 15,
        includeKnowledgeGraph: false,
      });

      // Return formatted memory content
      if (contextResult.memories.length > 0) {
        return contextResult.memories.map((m) => {
          const relevance = Math.round(m.similarity * 100);
          return `[${m.memoryType}] (${relevance}% relevant): ${m.summary || m.content}`;
        });
      }

      // Fallback to old memory store if no results from new engine
      const memories = await memoryStore.getRecentMemories(
        'campaign-planner',
        organizationId,
        10
      );

      return memories.map((m) => m.content);
    } catch (error) {
      logger.error('[AutoCampaignPlanner] Failed to retrieve memories', error);
      return [];
    }
  }

  /**
   * Generate campaign plan using AI
   */
  private async generateCampaignPlan(
    request: CampaignPlanningRequest,
    context: any,
    memories: string[]
  ): Promise<CampaignPlanningOutput> {
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

    logger.info('[AutoCampaignPlanner] Calling OpenAI for campaign planning');

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

    const plan = JSON.parse(content) as CampaignPlanningOutput;

    logger.info('[AutoCampaignPlanner] AI planning completed', {
      objectives: plan.strategyDoc.objectives.length,
      themes: plan.pitchPlan.themes.length,
    });

    return plan;
  }

  /**
   * Enrich and validate the generated plan
   */
  private async enrichPlan(
    plan: CampaignPlanningOutput,
    organizationId: string
  ): Promise<CampaignPlanningOutput> {
    // Validate contact criteria are achievable
    const contactCount = await this.estimateTargetContactCount(
      plan.contactCriteria,
      organizationId
    );

    logger.info('[AutoCampaignPlanner] Estimated target contacts', {
      count: contactCount,
    });

    // Adjust KPIs if necessary based on available contacts
    if (contactCount < plan.metricsPlan.kpis.targetPitches) {
      logger.warn('[AutoCampaignPlanner] Adjusting target pitches to match available contacts', {
        original: plan.metricsPlan.kpis.targetPitches,
        adjusted: contactCount,
      });

      plan.metricsPlan.kpis.targetPitches = contactCount;
    }

    return plan;
  }

  /**
   * Estimate how many contacts match the criteria
   */
  private async estimateTargetContactCount(
    criteria: CampaignTargeting,
    organizationId: string
  ): Promise<number> {
    try {
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Apply outlet type filter if specified
      if (criteria.outletTypes && criteria.outletTypes.length > 0) {
        query = query.in('outlet_type', criteria.outletTypes);
      }

      // Apply topic filter if specified
      if (criteria.topics && criteria.topics.length > 0) {
        // This would require a more complex query with topic matching
        // For now, we'll use a simple approach
      }

      const { count } = await query;

      return count || 0;
    } catch (error) {
      logger.error('[AutoCampaignPlanner] Failed to estimate contact count', error);
      return 0;
    }
  }

  /**
   * Generate a self-critique of the plan
   */
  async critiquePlan(
    plan: CampaignPlanningOutput,
    organizationId: string
  ): Promise<{ score: number; feedback: string[] }> {
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

      logger.info('[AutoCampaignPlanner] Plan critique completed', {
        score: critique.score,
        feedbackCount: critique.feedback.length,
      });

      return critique;
    } catch (error) {
      logger.error('[AutoCampaignPlanner] Failed to critique plan', error);
      return { score: 0.5, feedback: ['Could not generate critique'] };
    }
  }

  /**
   * Store planning insights as memory
   */
  private async storePlanningMemory(
    plan: CampaignPlanningOutput,
    request: CampaignPlanningRequest,
    organizationId: string
  ): Promise<void> {
    try {
      // Create memory content
      const memoryContent = `Campaign Planning: ${request.prompt}

Key Decisions:
- Campaign Type: ${plan.campaignType}
- Objectives: ${plan.strategyDoc.objectives.join(', ')}
- Target Outlets: ${plan.strategyDoc.targetOutlets.length} outlets
- Expected Results: ${plan.strategyDoc.expectedResults.join(', ')}

Strategy Summary:
${plan.strategyDoc.strategySummary}`;

      // Store as planning memory
      await memoryEngine.storeMemory({
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

      logger.info('[AutoCampaignPlanner] Planning memory stored');
    } catch (error) {
      logger.error('[AutoCampaignPlanner] Failed to store planning memory', error);
      // Don't throw - memory storage is non-critical
    }
  }
}

// Singleton instance
export const autoCampaignPlanner = new AutoCampaignPlanner();
