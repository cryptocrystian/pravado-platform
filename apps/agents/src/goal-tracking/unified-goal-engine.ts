// =====================================================
// UNIFIED GOAL TRACKING ENGINE
// Core Infrastructure: Multi-level goals, OKR snapshots, AI insights
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  Goal,
  GoalProgress,
  OkrSnapshot,
  GoalEvent,
  GoalWithProgress,
  GoalMetrics,
  GoalTimeline,
  GoalDashboard,
  GptGoalSummary,
  AlignmentValidation,
  StretchGoalRecommendations,
  CreateGoalInput,
  UpdateGoalInput,
  LogGoalEventInput,
  UpdateGoalProgressInput,
  CalculateGoalMetricsInput,
  GenerateOkrSnapshotInput,
  SummarizeGoalInput,
  ValidateAlignmentInput,
  RecommendStretchGoalsInput,
  GetGoalsInput,
  GetGoalTimelineInput,
  GetGoalDashboardInput,
  GoalScope,
  GoalType,
  GoalStatus,
  GoalEventType,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

class UnifiedGoalEngine extends EventEmitter {
  // =====================================================
  // GOAL CRUD OPERATIONS
  // =====================================================

  /**
   * Create a new goal
   */
  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        organization_id: input.organizationId,
        scope: input.scope,
        scope_id: input.scopeId,
        parent_goal_id: input.parentGoalId,
        goal_type: input.goalType,
        title: input.title,
        description: input.description,
        target_value: input.targetValue,
        current_value: 0,
        unit: input.unit,
        status: GoalStatus.DRAFT,
        start_date: input.startDate,
        end_date: input.endDate,
        owner_id: input.ownerId,
        metadata: input.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }

    // Log creation event
    await this.logGoalEvent({
      goalId: goal.id,
      eventType: GoalEventType.CREATED,
      description: `Goal "${input.title}" created`,
      newValue: { title: input.title, target: input.targetValue },
    });

    this.emit('goal-created', goal);
    return goal;
  }

  /**
   * Update an existing goal
   */
  async updateGoal(input: UpdateGoalInput): Promise<Goal> {
    const { goalId, ...updates } = input;

    // Get current goal for logging
    const { data: currentGoal } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.targetValue) updateData.target_value = updates.targetValue;
    if (updates.unit) updateData.unit = updates.unit;
    if (updates.endDate) updateData.end_date = updates.endDate;
    if (updates.ownerId) updateData.owner_id = updates.ownerId;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { data: goal, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    // Log update event
    await this.logGoalEvent({
      goalId,
      eventType: GoalEventType.UPDATED,
      description: 'Goal updated',
      oldValue: currentGoal,
      newValue: updates,
    });

    this.emit('goal-updated', goal);
    return goal;
  }

  /**
   * Get goals with optional filters
   */
  async getGoals(input: GetGoalsInput): Promise<{ goals: Goal[]; total: number }> {
    let query = supabase
      .from('goals')
      .select('*', { count: 'exact' })
      .eq('organization_id', input.organizationId);

    if (input.scope) {
      query = query.eq('scope', input.scope);
    }

    if (input.scopeId) {
      query = query.eq('scope_id', input.scopeId);
    }

    if (input.goalType) {
      query = query.eq('goal_type', input.goalType);
    }

    if (input.status) {
      query = query.eq('status', input.status);
    }

    if (input.ownerId) {
      query = query.eq('owner_id', input.ownerId);
    }

    if (input.parentGoalId !== undefined) {
      if (input.parentGoalId === null) {
        query = query.is('parent_goal_id', null);
      } else {
        query = query.eq('parent_goal_id', input.parentGoalId);
      }
    }

    query = query.order('created_at', { ascending: false });

    if (input.limit) {
      query = query.limit(input.limit);
    }

    if (input.offset) {
      query = query.range(input.offset, input.offset + (input.limit || 50) - 1);
    }

    const { data: goals, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get goals: ${error.message}`);
    }

    return {
      goals: goals || [],
      total: count || 0,
    };
  }

  /**
   * Get a single goal by ID with related data
   */
  async getGoalById(organizationId: string, goalId: string): Promise<GoalWithProgress> {
    const { data: goal, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to get goal: ${error.message}`);
    }

    // Get progress history
    const { data: progressHistory } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('goal_id', goalId)
      .order('recorded_at', { ascending: false })
      .limit(20);

    // Get child goals
    const { data: childGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('parent_goal_id', goalId);

    // Get parent goal
    let parentGoal = null;
    if (goal.parent_goal_id) {
      const { data: parent } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goal.parent_goal_id)
        .single();
      parentGoal = parent;
    }

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('goal_events')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate derived metrics
    const completionPercentage = goal.target_value > 0
      ? Math.min((goal.current_value / goal.target_value) * 100, 100)
      : 0;

    const endDate = new Date(goal.end_date);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isOverdue = now > endDate && goal.status !== GoalStatus.COMPLETED;

    return {
      ...goal,
      progress_history: progressHistory || [],
      child_goals: childGoals || [],
      parent_goal: parentGoal,
      recent_events: recentEvents || [],
      completion_percentage: completionPercentage,
      days_remaining: daysRemaining,
      is_overdue: isOverdue,
    };
  }

  // =====================================================
  // PROGRESS TRACKING
  // =====================================================

  /**
   * Log a goal event
   */
  async logGoalEvent(input: LogGoalEventInput): Promise<string> {
    const { data: event, error } = await supabase
      .from('goal_events')
      .insert({
        goal_id: input.goalId,
        event_type: input.eventType,
        description: input.description,
        old_value: input.oldValue,
        new_value: input.newValue,
        triggered_by: input.triggeredBy,
        metadata: input.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log goal event: ${error.message}`);
    }

    this.emit('goal-event-logged', event);
    return event.id;
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(input: UpdateGoalProgressInput): Promise<GoalProgress> {
    // Call the database function
    const { data, error } = await supabase.rpc('update_goal_progress', {
      p_goal_id: input.goalId,
      p_value: input.value,
      p_notes: input.notes,
      p_logged_by: input.loggedBy,
      p_metadata: input.metadata,
    });

    if (error) {
      throw new Error(`Failed to update goal progress: ${error.message}`);
    }

    // Get the progress record
    const { data: progress } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('goal_id', input.goalId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    this.emit('goal-progress-updated', progress);
    return progress!;
  }

  /**
   * Calculate goal metrics
   */
  async calculateGoalMetrics(input: CalculateGoalMetricsInput): Promise<GoalMetrics> {
    const { data, error } = await supabase.rpc('calculate_goal_metrics', {
      p_organization_id: input.organizationId,
      p_goal_id: input.goalId,
    });

    if (error) {
      throw new Error(`Failed to calculate goal metrics: ${error.message}`);
    }

    this.emit('goal-metrics-calculated', data);
    return data as GoalMetrics;
  }

  /**
   * Generate OKR snapshot
   */
  async generateOkrSnapshot(input: GenerateOkrSnapshotInput): Promise<OkrSnapshot> {
    const { data, error } = await supabase.rpc('generate_okr_snapshot', {
      p_organization_id: input.organizationId,
      p_scope: input.scope,
      p_scope_id: input.scopeId,
    });

    if (error) {
      throw new Error(`Failed to generate OKR snapshot: ${error.message}`);
    }

    this.emit('okr-snapshot-generated', data);
    return data as OkrSnapshot;
  }

  // =====================================================
  // AI-POWERED INSIGHTS
  // =====================================================

  /**
   * Summarize goal progress with GPT-4
   */
  async summarizeGoal(input: SummarizeGoalInput): Promise<GptGoalSummary> {
    // Get goal with full context
    const goal = await this.getGoalById(input.organizationId, input.goalId);

    const prompt = `You are an expert business analyst reviewing goal progress. Analyze the following goal and provide insights.

GOAL DETAILS:
- Title: ${goal.title}
- Description: ${goal.description || 'N/A'}
- Type: ${goal.goal_type}
- Target: ${goal.target_value} ${goal.unit}
- Current: ${goal.current_value} ${goal.unit}
- Progress: ${goal.completion_percentage.toFixed(1)}%
- Status: ${goal.status}
- Start Date: ${goal.start_date}
- End Date: ${goal.end_date}
- Days Remaining: ${goal.days_remaining}
- Velocity: ${goal.progress_velocity || 'N/A'}

PROGRESS HISTORY (Last 10 entries):
${goal.progress_history?.slice(0, 10).map(p =>
  `- ${p.recorded_at}: ${p.value} ${goal.unit} (Δ ${p.delta > 0 ? '+' : ''}${p.delta})${p.notes ? ` - ${p.notes}` : ''}`
).join('\n') || 'No progress history'}

RECENT EVENTS:
${goal.recent_events?.map(e =>
  `- ${e.created_at}: ${e.event_type} - ${e.description}`
).join('\n') || 'No recent events'}

CHILD GOALS:
${goal.child_goals?.map(c =>
  `- ${c.title}: ${((c.current_value / c.target_value) * 100).toFixed(1)}% complete`
).join('\n') || 'No child goals'}

Provide a comprehensive analysis in JSON format with:
1. summary: Brief overview of goal progress (2-3 sentences)
2. key_achievements: Array of notable achievements or milestones (3-5 items)
3. challenges: Array of obstacles or concerns (2-4 items)
4. recommendations: Array of objects with {priority: 'HIGH'|'MEDIUM'|'LOW', category: string, recommendation: string} (3-5 recommendations)
5. sentiment: Overall sentiment ('POSITIVE', 'NEUTRAL', or 'NEGATIVE')
6. confidence: Your confidence level in this analysis (0-1)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business analyst specializing in goal tracking and OKR management. Provide insightful, actionable analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    const summary: GptGoalSummary = {
      goal_id: input.goalId,
      summary: analysis.summary,
      key_achievements: analysis.key_achievements || [],
      challenges: analysis.challenges || [],
      recommendations: analysis.recommendations || [],
      sentiment: analysis.sentiment || 'NEUTRAL',
      confidence: analysis.confidence || 0.7,
      generated_at: new Date().toISOString(),
    };

    this.emit('goal-summarized', summary);
    return summary;
  }

  /**
   * Validate goal alignment with GPT-4
   */
  async validateAlignment(input: ValidateAlignmentInput): Promise<AlignmentValidation> {
    const goal = await this.getGoalById(input.organizationId, input.goalId);

    let parentGoal = null;
    if (input.parentGoalId || goal.parent_goal_id) {
      const parentId = input.parentGoalId || goal.parent_goal_id;
      parentGoal = await this.getGoalById(input.organizationId, parentId!);
    }

    const prompt = `You are an expert in organizational goal alignment and OKR frameworks. Assess the alignment between these goals.

CHILD GOAL:
- Title: ${goal.title}
- Description: ${goal.description || 'N/A'}
- Type: ${goal.goal_type}
- Scope: ${goal.scope}
- Target: ${goal.target_value} ${goal.unit}

${parentGoal ? `PARENT GOAL:
- Title: ${parentGoal.title}
- Description: ${parentGoal.description || 'N/A'}
- Type: ${parentGoal.goal_type}
- Scope: ${parentGoal.scope}
- Target: ${parentGoal.target_value} ${parentGoal.unit}` : 'NO PARENT GOAL - Assess if this goal needs alignment with higher-level objectives'}

Provide an alignment analysis in JSON format with:
1. alignment_score: Numeric score from 0-1 indicating alignment strength
2. is_aligned: Boolean indicating if goals are well-aligned (score >= 0.7)
3. alignment_analysis: Detailed explanation of alignment (2-3 sentences)
4. gaps: Array of alignment gaps or concerns (2-4 items)
5. suggestions: Array of suggestions to improve alignment (2-4 items)
6. confidence: Your confidence in this assessment (0-1)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in strategic goal alignment, OKR frameworks, and organizational planning. Provide thorough, constructive analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    // Update goal alignment score
    if (analysis.alignment_score !== undefined) {
      await supabase
        .from('goals')
        .update({ alignment_score: analysis.alignment_score })
        .eq('id', input.goalId);
    }

    const validation: AlignmentValidation = {
      goal_id: input.goalId,
      parent_goal_id: input.parentGoalId || goal.parent_goal_id,
      alignment_score: analysis.alignment_score || 0.5,
      is_aligned: analysis.is_aligned || false,
      alignment_analysis: analysis.alignment_analysis,
      gaps: analysis.gaps || [],
      suggestions: analysis.suggestions || [],
      confidence: analysis.confidence || 0.7,
      validated_at: new Date().toISOString(),
    };

    this.emit('alignment-validated', validation);
    return validation;
  }

  /**
   * Recommend stretch goals with GPT-4
   */
  async recommendStretchGoals(input: RecommendStretchGoalsInput): Promise<StretchGoalRecommendations> {
    // Get current goals in scope
    const { goals } = await this.getGoals({
      organizationId: input.organizationId,
      scope: input.scope,
      scopeId: input.scopeId,
      status: GoalStatus.ACTIVE,
    });

    const prompt = `You are an expert in goal setting and performance optimization. Based on current goals and performance, recommend ambitious but achievable stretch goals.

CURRENT ACTIVE GOALS:
${goals.map(g => `
- ${g.title}
  Type: ${g.goal_type}
  Target: ${g.target_value} ${g.unit}
  Current: ${g.current_value} ${g.unit}
  Progress: ${((g.current_value / g.target_value) * 100).toFixed(1)}%
  Velocity: ${g.progress_velocity || 'N/A'}
`).join('\n')}

CONTEXT:
- Scope: ${input.scope}
- Period: ${input.periodStart || 'Current'} to ${input.periodEnd || 'Future'}

Based on this performance data, recommend 3-5 stretch goals that would challenge the team/individual to exceed current trajectories.

Provide recommendations in JSON format with:
1. overall_analysis: Brief analysis of current performance and opportunities (2-3 sentences)
2. recommendations: Array of objects with:
   - recommended_goal: {title, description, goal_type, target_value, unit}
   - rationale: Why this stretch goal makes sense
   - potential_impact: Expected impact of achieving this goal
   - confidence: Your confidence in this recommendation (0-1)
   - based_on_goals: Array of goal IDs this is based on`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in goal setting, OKRs, and performance optimization. Recommend ambitious yet achievable stretch goals.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    const recommendations: StretchGoalRecommendations = {
      scope: input.scope,
      scope_id: input.scopeId,
      recommendations: analysis.recommendations || [],
      overall_analysis: analysis.overall_analysis,
      generated_at: new Date().toISOString(),
    };

    this.emit('stretch-goals-recommended', recommendations);
    return recommendations;
  }

  // =====================================================
  // DASHBOARD & ANALYTICS
  // =====================================================

  /**
   * Get goal timeline with events and progress
   */
  async getGoalTimeline(input: GetGoalTimelineInput): Promise<GoalTimeline> {
    const goal = await this.getGoalById(input.organizationId, input.goalId);

    // Get all events
    let eventsQuery = supabase
      .from('goal_events')
      .select('*', { count: 'exact' })
      .eq('goal_id', input.goalId)
      .order('created_at', { ascending: false });

    if (input.limit) {
      eventsQuery = eventsQuery.limit(input.limit);
    }

    if (input.offset) {
      eventsQuery = eventsQuery.range(input.offset, input.offset + (input.limit || 50) - 1);
    }

    const { data: events, count } = await eventsQuery;

    // Get all progress records
    const { data: progressHistory } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('goal_id', input.goalId)
      .order('recorded_at', { ascending: false });

    return {
      goal,
      events: events || [],
      progress_history: progressHistory || [],
      total_events: count || 0,
    };
  }

  /**
   * Get comprehensive goal dashboard
   */
  async getGoalDashboard(input: GetGoalDashboardInput): Promise<GoalDashboard> {
    // Build base query
    let query = supabase
      .from('goals')
      .select('*')
      .eq('organization_id', input.organizationId);

    if (input.scope) {
      query = query.eq('scope', input.scope);
    }

    if (input.scopeId) {
      query = query.eq('scope_id', input.scopeId);
    }

    const { data: allGoals } = await query;
    const goals = allGoals || [];

    // Calculate summary stats
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === GoalStatus.ACTIVE || g.status === GoalStatus.ON_TRACK).length;
    const completedGoals = goals.filter(g => g.status === GoalStatus.COMPLETED).length;
    const atRiskGoals = goals.filter(g => g.status === GoalStatus.AT_RISK).length;
    const avgCompletionRate = goals.length > 0
      ? goals.reduce((sum, g) => sum + (g.current_value / g.target_value), 0) / goals.length * 100
      : 0;

    // Group by type
    const byType: Map<GoalType, { count: number; totalCompletion: number }> = new Map();
    goals.forEach(g => {
      const current = byType.get(g.goal_type) || { count: 0, totalCompletion: 0 };
      byType.set(g.goal_type, {
        count: current.count + 1,
        totalCompletion: current.totalCompletion + (g.current_value / g.target_value),
      });
    });

    // Group by status
    const byStatus: Map<GoalStatus, number> = new Map();
    goals.forEach(g => {
      byStatus.set(g.status, (byStatus.get(g.status) || 0) + 1);
    });

    // Find top performers
    const topPerformers = goals
      .filter(g => g.target_value > 0)
      .map(g => ({
        goal: g as GoalWithProgress,
        completion_rate: (g.current_value / g.target_value) * 100,
      }))
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, 5);

    // Find at-risk goals
    const atRiskGoalsList = goals
      .filter(g => g.risk_level && ['HIGH', 'CRITICAL'].includes(g.risk_level))
      .map(g => ({
        goal: g as GoalWithProgress,
        risk_level: g.risk_level!,
        reason: g.status === GoalStatus.AT_RISK ? 'Behind schedule' : 'Low velocity',
      }))
      .slice(0, 5);

    // Recent completions
    const recentCompletions = goals
      .filter(g => g.status === GoalStatus.COMPLETED)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5) as GoalWithProgress[];

    // Get OKR snapshot if requested
    let okrSnapshot = null;
    if (input.scope && input.scopeId) {
      try {
        okrSnapshot = await this.generateOkrSnapshot({
          organizationId: input.organizationId,
          scope: input.scope,
          scopeId: input.scopeId,
        });
      } catch (error) {
        // OKR snapshot optional
      }
    }

    return {
      summary: {
        total_goals: totalGoals,
        active_goals: activeGoals,
        completed_goals: completedGoals,
        at_risk_goals: atRiskGoals,
        avg_completion_rate: avgCompletionRate,
      },
      by_type: Array.from(byType.entries()).map(([goal_type, data]) => ({
        goal_type,
        count: data.count,
        avg_completion: (data.totalCompletion / data.count) * 100,
      })),
      by_status: Array.from(byStatus.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      top_performers: topPerformers,
      at_risk_goals: atRiskGoalsList,
      recent_completions: recentCompletions,
      okr_snapshot: okrSnapshot || undefined,
    };
  }
}

export const unifiedGoalEngine = new UnifiedGoalEngine();
