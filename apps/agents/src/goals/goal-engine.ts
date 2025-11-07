// =====================================================
// GOAL ENGINE - Strategic Intelligence & Outcome Attribution
// Sprint 26: Goal-Driven Strategy Layer
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  CampaignGoal,
  GoalOutcome,
  AttributionEvent,
  EnrichedCampaignGoal,
  EnrichedAttributionEvent,
  CreateCampaignGoalInput,
  UpdateCampaignGoalInput,
  TrackAttributionEventInput,
  CalculateGoalProgressInput,
  SummarizeGoalPerformanceInput,
  GetGoalContextInput,
  CampaignGoalsOverview,
  AttributionMap,
  GoalPerformanceSummary,
  GoalContextForAgent,
  GoalSummaryResult,
  GoalType,
  GoalPriority,
  AttributionEventType,
  GoalStatus,
} from '@pravado/types';
import { timelineEngine } from '../timeline/timeline-engine';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Goal Engine
 * Manages campaign goals, outcome tracking, and attribution
 */
export class GoalEngine extends EventEmitter {
  // =====================================================
  // GOAL MANAGEMENT
  // =====================================================

  /**
   * Create a new campaign goal
   */
  async createGoal(input: CreateCampaignGoalInput): Promise<CampaignGoal> {
    const { data, error } = await supabase
      .from('campaign_goals')
      .insert({
        organization_id: input.organizationId,
        campaign_id: input.campaignId,
        goal_type: input.goalType,
        title: input.title,
        description: input.description,
        target_metric: input.targetMetric,
        priority: input.priority || 'IMPORTANT',
        tracking_method: input.trackingMethod || 'CUSTOM',
        success_conditions: input.successConditions || {},
        due_date: input.dueDate,
        created_by: input.createdBy,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }

    const goal = this.mapGoalFromDb(data);

    // Log to timeline
    await timelineEngine.logEvent({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      eventType: 'DECISION_MADE',
      title: `Goal created: ${input.title}`,
      description: `New ${input.goalType} goal with priority ${input.priority}`,
      metadata: {
        goalId: goal.id,
        goalType: input.goalType,
        priority: input.priority,
        targetMetric: input.targetMetric,
      },
      userId: input.createdBy,
    });

    // Emit event
    this.emit('goal-created', { goal });

    return goal;
  }

  /**
   * Update an existing goal
   */
  async updateGoal(input: UpdateCampaignGoalInput): Promise<CampaignGoal> {
    const updates: any = {};

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.targetMetric !== undefined) updates.target_metric = input.targetMetric;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.trackingMethod !== undefined) updates.tracking_method = input.trackingMethod;
    if (input.successConditions !== undefined) updates.success_conditions = input.successConditions;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate;
    if (input.status !== undefined) updates.status = input.status;

    const { data, error } = await supabase
      .from('campaign_goals')
      .update(updates)
      .eq('id', input.goalId)
      .eq('organization_id', input.organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    const goal = this.mapGoalFromDb(data);

    // Emit event
    this.emit('goal-updated', { goal });

    return goal;
  }

  /**
   * Get all goals for a campaign
   */
  async getCampaignGoals(
    campaignId: string,
    organizationId: string
  ): Promise<EnrichedCampaignGoal[]> {
    // Use the get_goal_summary function
    const { data, error } = await supabase.rpc('get_goal_summary', {
      p_campaign_id: campaignId,
      p_organization_id: organizationId,
    });

    if (error) {
      throw new Error(`Failed to get campaign goals: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapGoalSummaryFromDb(row));
  }

  /**
   * Get a single goal with outcome data
   */
  async getGoal(goalId: string, organizationId: string): Promise<EnrichedCampaignGoal | null> {
    const { data: goalData, error: goalError } = await supabase
      .from('campaign_goals')
      .select('*')
      .eq('id', goalId)
      .eq('organization_id', organizationId)
      .single();

    if (goalError || !goalData) {
      return null;
    }

    const { data: outcomeData } = await supabase
      .from('goal_outcomes')
      .select('*')
      .eq('goal_id', goalId)
      .single();

    const goal = this.mapGoalFromDb(goalData);
    const outcome = outcomeData ? this.mapOutcomeFromDb(outcomeData) : null;

    return this.enrichGoalWithOutcome(goal, outcome);
  }

  // =====================================================
  // OUTCOME TRACKING
  // =====================================================

  /**
   * Track an attribution event
   */
  async trackOutcomeEvent(input: TrackAttributionEventInput): Promise<string> {
    // Use the insert_attribution_event function
    const { data, error } = await supabase.rpc('insert_attribution_event', {
      p_organization_id: input.organizationId,
      p_event_type: input.eventType,
      p_campaign_id: input.campaignId,
      p_contact_id: input.contactId,
      p_agent_run_id: input.agentRunId,
      p_goal_id: input.goalId,
      p_description: input.description,
      p_value: input.value,
      p_context: input.context || {},
      p_attribution_weight: input.attributionWeight || 1.0,
      p_attributed_to_user_id: input.attributedToUserId,
      p_event_subtype: input.eventSubtype,
    });

    if (error) {
      throw new Error(`Failed to track attribution event: ${error.message}`);
    }

    const eventId = data;

    // Log to timeline
    if (input.campaignId) {
      await timelineEngine.logEvent({
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        eventType: 'OUTCOME_ACHIEVED',
        title: this.getEventTitle(input.eventType),
        description: input.description || this.getEventDescription(input.eventType),
        metadata: {
          eventId,
          eventType: input.eventType,
          goalId: input.goalId,
          value: input.value,
          context: input.context,
        },
        contactId: input.contactId,
      });
    }

    // Emit event
    this.emit('outcome-tracked', {
      eventId,
      eventType: input.eventType,
      campaignId: input.campaignId,
      goalId: input.goalId,
    });

    return eventId;
  }

  /**
   * Calculate goal progress
   * (This is handled automatically by the database function, but can be triggered manually)
   */
  async calculateGoalProgress(input: CalculateGoalProgressInput): Promise<void> {
    const { error } = await supabase.rpc('calculate_goal_progress', {
      p_goal_id: input.goalId,
      p_organization_id: input.organizationId,
    });

    if (error) {
      throw new Error(`Failed to calculate goal progress: ${error.message}`);
    }

    // Emit event
    this.emit('goal-progress-calculated', {
      goalId: input.goalId,
    });
  }

  // =====================================================
  // ATTRIBUTION & ANALYTICS
  // =====================================================

  /**
   * Get attribution map for a campaign
   * Shows which events contributed to which goals
   */
  async getAttributionMap(
    campaignId: string,
    organizationId: string
  ): Promise<AttributionMap[]> {
    const goals = await this.getCampaignGoals(campaignId, organizationId);

    const maps: AttributionMap[] = [];

    for (const goal of goals) {
      const { data: eventsData, error } = await supabase.rpc('get_goal_attribution_events', {
        p_goal_id: goal.id,
        p_organization_id: organizationId,
        p_limit: 1000,
      });

      if (error) {
        console.error(`Failed to get attribution events for goal ${goal.id}:`, error);
        continue;
      }

      const events = (eventsData || []).map((row: any) => this.mapAttributionEventFromDb(row));

      // Calculate top contributors
      const contributorMap = new Map<string, { name: string; count: number; value: number }>();

      events.forEach((event) => {
        if (event.contactId && event.contactName) {
          const existing = contributorMap.get(event.contactId) || {
            name: event.contactName,
            count: 0,
            value: 0,
          };
          existing.count += 1;
          existing.value += event.value || 0;
          contributorMap.set(event.contactId, existing);
        }
      });

      const topContributors = Array.from(contributorMap.entries())
        .map(([contactId, data]) => ({
          contactId,
          contactName: data.name,
          eventCount: data.count,
          totalValue: data.value,
        }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      maps.push({
        goalId: goal.id,
        goalTitle: goal.title,
        goalType: goal.goalType,
        events,
        totalEvents: events.length,
        totalValue: events.reduce((sum, e) => sum + (e.value || 0), 0),
        topContributors,
      });
    }

    return maps;
  }

  /**
   * Get campaign goals overview
   */
  async getCampaignGoalsOverview(
    campaignId: string,
    organizationId: string
  ): Promise<CampaignGoalsOverview> {
    const goals = await this.getCampaignGoals(campaignId, organizationId);

    const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length;
    const atRiskGoals = goals.filter((g) => g.status === 'AT_RISK' || g.status === 'FAILED').length;
    const criticalGoals = goals.filter((g) => g.priority === 'CRITICAL').length;

    const totalScore = goals.reduce((sum, g) => sum + g.completionScore, 0);
    const averageCompletionScore = goals.length > 0 ? totalScore / goals.length : 0;

    return {
      campaignId,
      goals,
      totalGoals: goals.length,
      completedGoals,
      atRiskGoals,
      criticalGoals,
      averageCompletionScore,
    };
  }

  // =====================================================
  // AI-POWERED SUMMARIZATION
  // =====================================================

  /**
   * Summarize goal performance using GPT-4
   */
  async summarizeGoalPerformance(
    input: SummarizeGoalPerformanceInput
  ): Promise<GoalPerformanceSummary> {
    let goals: EnrichedCampaignGoal[];
    let attributionMaps: AttributionMap[] = [];

    // Get goals to summarize
    if (input.goalId) {
      const goal = await this.getGoal(input.goalId, input.organizationId);
      if (!goal) {
        throw new Error('Goal not found');
      }
      goals = [goal];
    } else if (input.campaignId) {
      goals = await this.getCampaignGoals(input.campaignId, input.organizationId);
    } else {
      throw new Error('Either goalId or campaignId must be provided');
    }

    // Get attribution data if requested
    if (input.includeAttributionBreakdown && input.campaignId) {
      attributionMaps = await this.getAttributionMap(input.campaignId, input.organizationId);
    }

    // Build GPT prompt
    const prompt = this.buildGoalSummaryPrompt(goals, attributionMaps, input);

    // Call GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a strategic analyst helping evaluate campaign goal performance. Provide concise, actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(response);

    // Calculate overall score
    const overallScore =
      goals.reduce((sum, g) => sum + g.completionScore, 0) / (goals.length || 1);

    // Determine velocity trend
    const velocityTrend = this.calculateVelocityTrend(goals);

    // Build attribution breakdown if requested
    let attributionBreakdown: GoalPerformanceSummary['attributionBreakdown'];
    if (input.includeAttributionBreakdown && attributionMaps.length > 0) {
      const eventCounts = new Map<AttributionEventType, { count: number; value: number }>();

      attributionMaps.forEach((map) => {
        map.events.forEach((event) => {
          const existing = eventCounts.get(event.eventType) || { count: 0, value: 0 };
          existing.count += 1;
          existing.value += event.value || 0;
          eventCounts.set(event.eventType, existing);
        });
      });

      const totalEvents = Array.from(eventCounts.values()).reduce((sum, e) => sum + e.count, 0);

      attributionBreakdown = Array.from(eventCounts.entries())
        .map(([eventType, data]) => ({
          eventType,
          count: data.count,
          percentage: (data.count / totalEvents) * 100,
          totalValue: data.value > 0 ? data.value : undefined,
        }))
        .sort((a, b) => b.count - a.count);
    }

    return {
      goalId: input.goalId,
      campaignId: input.campaignId,
      summaryText: parsed.summary || '',
      generatedAt: new Date().toISOString(),
      keyAchievements: parsed.keyAchievements || [],
      challenges: parsed.challenges || [],
      recommendations: input.includeRecommendations ? parsed.recommendations || [] : undefined,
      attributionBreakdown,
      overallScore,
      velocityTrend,
      projectedCompletion: parsed.projectedCompletion,
    };
  }

  /**
   * Build GPT prompt for goal summarization
   */
  private buildGoalSummaryPrompt(
    goals: EnrichedCampaignGoal[],
    attributionMaps: AttributionMap[],
    input: SummarizeGoalPerformanceInput
  ): string {
    let prompt = '# Campaign Goals Performance Analysis\n\n';

    // Add goals information
    prompt += '## Goals\n\n';
    goals.forEach((goal) => {
      prompt += `### ${goal.title} (${goal.goalType})\n`;
      prompt += `- **Priority**: ${goal.priority}\n`;
      prompt += `- **Status**: ${goal.status}\n`;
      prompt += `- **Completion**: ${goal.completionScore.toFixed(1)}%\n`;
      prompt += `- **Target**: ${JSON.stringify(goal.targetMetric)}\n`;
      prompt += `- **Current**: ${JSON.stringify(goal.currentMetric)}\n`;
      prompt += `- **Total Events**: ${goal.totalAttributedEvents}\n`;

      if (goal.dueDate) {
        prompt += `- **Due Date**: ${goal.dueDate}\n`;
        if (goal.isOverdue) {
          prompt += `- **Status**: OVERDUE\n`;
        } else if (goal.daysUntilDue !== undefined) {
          prompt += `- **Days Until Due**: ${goal.daysUntilDue}\n`;
        }
      }

      prompt += '\n';
    });

    // Add attribution data if available
    if (attributionMaps.length > 0) {
      prompt += '## Attribution Events\n\n';
      attributionMaps.forEach((map) => {
        prompt += `### ${map.goalTitle}\n`;
        prompt += `- Total Events: ${map.totalEvents}\n`;
        if (map.totalValue > 0) {
          prompt += `- Total Value: $${map.totalValue.toFixed(2)}\n`;
        }

        if (map.topContributors.length > 0) {
          prompt += '\nTop Contributors:\n';
          map.topContributors.slice(0, 5).forEach((contributor) => {
            prompt += `- ${contributor.contactName}: ${contributor.eventCount} events`;
            if (contributor.totalValue > 0) {
              prompt += ` ($${contributor.totalValue.toFixed(2)})`;
            }
            prompt += '\n';
          });
        }

        prompt += '\n';
      });
    }

    // Add instructions
    prompt += '\n## Analysis Instructions\n\n';
    prompt += 'Please provide a comprehensive analysis in JSON format with the following keys:\n\n';
    prompt += '1. **summary**: A concise 2-3 sentence overview of goal performance\n';
    prompt += '2. **keyAchievements**: Array of 3-5 key achievements (strings)\n';
    prompt += '3. **challenges**: Array of 2-4 challenges or areas of concern (strings)\n';

    if (input.includeRecommendations) {
      prompt += '4. **recommendations**: Array of 3-5 actionable recommendations (strings)\n';
    }

    prompt += '5. **projectedCompletion**: Estimated completion date for remaining goals (ISO date string, or null)\n\n';

    prompt += 'Focus on:\n';
    prompt += '- Overall progress toward strategic objectives\n';
    prompt += '- Which goal types are performing best/worst\n';
    prompt += '- Timeline risks and opportunities\n';
    prompt += '- Attribution patterns (if data is available)\n';

    return prompt;
  }

  /**
   * Calculate velocity trend
   */
  private calculateVelocityTrend(
    goals: EnrichedCampaignGoal[]
  ): 'ACCELERATING' | 'STEADY' | 'SLOWING' | 'STALLED' {
    // Simple heuristic based on completion scores and recent activity
    const averageCompletion = goals.reduce((sum, g) => sum + g.completionScore, 0) / goals.length;

    const recentlyActive = goals.filter(
      (g) => g.lastEventAt && new Date(g.lastEventAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const stalledGoals = goals.filter(
      (g) =>
        !g.lastEventAt ||
        new Date(g.lastEventAt) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    if (stalledGoals.length === goals.length) {
      return 'STALLED';
    }

    if (averageCompletion > 75 && recentlyActive.length > goals.length * 0.7) {
      return 'ACCELERATING';
    }

    if (averageCompletion < 30 || recentlyActive.length < goals.length * 0.3) {
      return 'SLOWING';
    }

    return 'STEADY';
  }

  // =====================================================
  // AGENT INTEGRATION
  // =====================================================

  /**
   * Get goal context for agent planning
   * Injects goal information into agent context
   */
  async injectGoalContext(input: GetGoalContextInput): Promise<GoalContextForAgent> {
    const goals = await this.getCampaignGoals(input.campaignId, input.organizationId);

    // Filter to active goals if requested
    const activeGoals = input.includeOnlyActive
      ? goals.filter((g) => g.status === 'ACTIVE' || g.status === 'ON_TRACK' || g.status === 'AT_RISK')
      : goals;

    // Build active goals array
    const activeGoalsForAgent = activeGoals.map((g) => ({
      goalId: g.id,
      goalType: g.goalType,
      title: g.title,
      priority: g.priority,
      targetMetric: g.targetMetric,
      currentMetric: g.currentMetric,
      completionScore: g.completionScore,
      dueDate: g.dueDate,
      daysUntilDue: g.daysUntilDue,
    }));

    // Build critical goals summary
    const criticalGoals = activeGoalsForAgent.filter((g) => g.priority === 'CRITICAL');
    const criticalGoalsSummary = this.buildCriticalGoalsSummary(criticalGoals);

    // Build strategic directive
    const strategicDirective = this.buildStrategicDirective(activeGoalsForAgent);

    return {
      campaignId: input.campaignId,
      activeGoals: activeGoalsForAgent,
      criticalGoalsSummary,
      strategicDirective,
    };
  }

  /**
   * Build critical goals summary for agents
   */
  private buildCriticalGoalsSummary(
    criticalGoals: GoalContextForAgent['activeGoals']
  ): string {
    if (criticalGoals.length === 0) {
      return 'No critical goals are currently active.';
    }

    let summary = `${criticalGoals.length} CRITICAL goal(s):\n`;

    criticalGoals.forEach((goal) => {
      const targetKey = Object.keys(goal.targetMetric)[0];
      const targetValue = goal.targetMetric[targetKey];
      const currentValue = goal.currentMetric[targetKey] || 0;

      summary += `- ${goal.title}: ${currentValue}/${targetValue} ${targetKey} (${goal.completionScore.toFixed(0)}% complete)`;

      if (goal.daysUntilDue !== undefined) {
        if (goal.daysUntilDue < 0) {
          summary += ` - OVERDUE`;
        } else if (goal.daysUntilDue <= 7) {
          summary += ` - ${goal.daysUntilDue} days remaining`;
        }
      }

      summary += '\n';
    });

    return summary;
  }

  /**
   * Build strategic directive for agents
   */
  private buildStrategicDirective(activeGoals: GoalContextForAgent['activeGoals']): string {
    if (activeGoals.length === 0) {
      return 'Focus on general campaign execution.';
    }

    // Prioritize by: CRITICAL > IMPORTANT > NICE_TO_HAVE
    // Within priority, sort by lowest completion score (needs most attention)
    const sortedGoals = [...activeGoals].sort((a, b) => {
      const priorityWeight = { CRITICAL: 1, IMPORTANT: 2, NICE_TO_HAVE: 3 };
      const aPriority = priorityWeight[a.priority] || 2;
      const bPriority = priorityWeight[b.priority] || 2;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.completionScore - b.completionScore;
    });

    const topGoal = sortedGoals[0];
    const targetKey = Object.keys(topGoal.targetMetric)[0];

    let directive = `Primary focus: ${topGoal.title} (${topGoal.priority} priority). `;
    directive += `Target: ${topGoal.targetMetric[targetKey]} ${targetKey}. `;

    if (topGoal.completionScore < 50) {
      directive += `Currently at ${topGoal.completionScore.toFixed(0)}% - needs significant progress. `;
    } else if (topGoal.completionScore < 75) {
      directive += `Currently at ${topGoal.completionScore.toFixed(0)}% - maintain momentum. `;
    } else {
      directive += `Currently at ${topGoal.completionScore.toFixed(0)}% - close to target! `;
    }

    // Add urgency if due soon
    if (topGoal.daysUntilDue !== undefined && topGoal.daysUntilDue <= 7) {
      directive += `URGENT: Only ${topGoal.daysUntilDue} days remaining.`;
    }

    return directive;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private getEventTitle(eventType: AttributionEventType): string {
    const titles: Record<AttributionEventType, string> = {
      REPLY_RECEIVED: 'Reply Received',
      COVERAGE_SECURED: 'Coverage Secured',
      CONVERSION_MADE: 'Conversion Made',
      PARTNERSHIP_FORMED: 'Partnership Formed',
      REFERRAL_RECEIVED: 'Referral Received',
      MEETING_SCHEDULED: 'Meeting Scheduled',
      CONTENT_PUBLISHED: 'Content Published',
      ENGAGEMENT_MILESTONE: 'Engagement Milestone',
      LEAD_QUALIFIED: 'Lead Qualified',
      OPPORTUNITY_CREATED: 'Opportunity Created',
      CUSTOM_EVENT: 'Custom Event',
    };
    return titles[eventType] || eventType;
  }

  private getEventDescription(eventType: AttributionEventType): string {
    const descriptions: Record<AttributionEventType, string> = {
      REPLY_RECEIVED: 'Contact responded to outreach',
      COVERAGE_SECURED: 'Media coverage placement obtained',
      CONVERSION_MADE: 'Conversion or sale completed',
      PARTNERSHIP_FORMED: 'Strategic partnership established',
      REFERRAL_RECEIVED: 'Referral obtained from contact',
      MEETING_SCHEDULED: 'Meeting or call scheduled',
      CONTENT_PUBLISHED: 'Content successfully published',
      ENGAGEMENT_MILESTONE: 'Engagement threshold reached',
      LEAD_QUALIFIED: 'Lead qualified for follow-up',
      OPPORTUNITY_CREATED: 'Sales opportunity created',
      CUSTOM_EVENT: 'Custom attribution event',
    };
    return descriptions[eventType] || '';
  }

  private mapGoalFromDb(data: any): CampaignGoal {
    return {
      id: data.id,
      organizationId: data.organization_id,
      campaignId: data.campaign_id,
      goalType: data.goal_type as GoalType,
      title: data.title,
      description: data.description,
      targetMetric: data.target_metric,
      priority: data.priority as GoalPriority,
      trackingMethod: data.tracking_method,
      successConditions: data.success_conditions,
      dueDate: data.due_date,
      status: data.status as GoalStatus,
      completionScore: parseFloat(data.completion_score) || 0,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapOutcomeFromDb(data: any): GoalOutcome {
    return {
      id: data.id,
      organizationId: data.organization_id,
      goalId: data.goal_id,
      currentMetric: data.current_metric,
      totalAttributedEvents: data.total_attributed_events,
      lastEventAt: data.last_event_at,
      dailyProgress: data.daily_progress,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapGoalSummaryFromDb(data: any): EnrichedCampaignGoal {
    return {
      id: data.goal_id,
      organizationId: '', // Not returned by function
      campaignId: '', // Not returned by function
      goalType: data.goal_type as GoalType,
      title: data.title,
      description: data.description,
      targetMetric: data.target_metric,
      priority: data.priority as GoalPriority,
      trackingMethod: 'CUSTOM', // Not returned by function
      successConditions: {},
      dueDate: data.due_date,
      status: data.status as GoalStatus,
      completionScore: parseFloat(data.completion_score) || 0,
      createdBy: '', // Not returned by function
      createdAt: '', // Not returned by function
      updatedAt: '', // Not returned by function
      currentMetric: data.current_metric,
      totalAttributedEvents: data.total_events,
      lastEventAt: undefined,
      isOverdue: data.is_overdue,
      daysUntilDue: data.days_until_due,
      progressPercentage: parseFloat(data.completion_score) || 0,
    };
  }

  private enrichGoalWithOutcome(
    goal: CampaignGoal,
    outcome: GoalOutcome | null
  ): EnrichedCampaignGoal {
    const now = new Date();
    const dueDate = goal.dueDate ? new Date(goal.dueDate) : null;

    return {
      ...goal,
      currentMetric: outcome?.currentMetric || {},
      totalAttributedEvents: outcome?.totalAttributedEvents || 0,
      lastEventAt: outcome?.lastEventAt,
      isOverdue: dueDate ? dueDate < now : false,
      daysUntilDue: dueDate
        ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
      progressPercentage: goal.completionScore,
    };
  }

  private mapAttributionEventFromDb(data: any): EnrichedAttributionEvent {
    return {
      id: data.event_id,
      organizationId: '', // Not returned by function
      eventType: data.event_type as AttributionEventType,
      eventSubtype: data.event_subtype,
      campaignId: undefined,
      contactId: undefined,
      agentRunId: undefined,
      goalId: undefined,
      description: data.description,
      value: data.value ? parseFloat(data.value) : undefined,
      context: data.context,
      attributionWeight: parseFloat(data.attribution_weight) || 1.0,
      attributedToUserId: undefined,
      eventTimestamp: data.event_timestamp,
      createdAt: data.event_timestamp,
      contactName: data.contact_name,
    };
  }
}

// Export singleton instance
export const goalEngine = new GoalEngine();
