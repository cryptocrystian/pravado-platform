// =====================================================
// AGENT FEEDBACK ENGINE SERVICE
// Sprint 48 Phase 4.4
// =====================================================
//
// Purpose: Collect and analyze agent feedback for continuous improvement
// Provides: Feedback recording, analysis, improvement plan generation
//

import { pool } from '../database/db';
import OpenAI from 'openai';
import type {
  AgentFeedbackInput,
  AgentFeedbackEntry,
  FeedbackMetrics,
  FeedbackSummary,
  IssueSummary,
  ImprovementPlan,
  ProposedChange,
  FeedbackDistribution,
  CommonIssues,
  RatingTrends,
  FeedbackQueryOptions,
  ImprovementApplicationResult,
  FeedbackScope,
  FeedbackRating,
  ImprovementPriority,
  ImprovementStatus,
} from '@pravado/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// FEEDBACK ENGINE CLASS
// =====================================================

class AgentFeedbackEngineService {
  /**
   * Record agent feedback
   */
  async recordAgentFeedback(feedback: AgentFeedbackInput): Promise<AgentFeedbackEntry> {
    const query = `
      INSERT INTO agent_feedback_log (
        agent_id,
        message_id,
        conversation_id,
        turn_id,
        rating,
        categories,
        notes,
        created_by,
        is_anonymous,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      feedback.agentId,
      feedback.messageId || null,
      feedback.conversationId || null,
      feedback.turnId || null,
      feedback.rating,
      feedback.categories || [],
      feedback.notes || null,
      feedback.isAnonymous ? null : feedback.userId,
      feedback.isAnonymous || false,
      feedback.metadata || null,
    ];

    const result = await pool.query(query, values);
    return this.mapFeedbackEntry(result.rows[0]);
  }

  /**
   * Get feedback summary for an agent
   */
  async getFeedbackSummary(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FeedbackSummary> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get metrics
    const metrics = await this.getFeedbackMetrics(agentId, start, end);

    // Get trending issues
    const issuesResult = await pool.query(
      'SELECT * FROM get_common_issues($1, $2, $3, $4)',
      [agentId, start, end, 10]
    );

    const trendingIssues: IssueSummary[] = issuesResult.rows.map((row) => ({
      category: row.category as FeedbackScope,
      count: parseInt(row.frequency),
      percentage: (parseInt(row.frequency) / metrics.totalFeedback) * 100,
      avgRating: parseFloat(row.avg_rating),
      examples: (row.sample_notes || []).slice(0, 3),
    }));

    // Get recent feedback
    const recentFeedback = await this.queryFeedback({
      agentId,
      startDate: start,
      endDate: end,
      limit: 10,
      orderBy: 'created_at',
      orderDirection: 'desc',
    });

    // Generate improvement opportunities
    const improvementOpportunities = trendingIssues
      .filter((issue) => issue.avgRating < 3)
      .map((issue) => `Improve ${issue.category}: ${issue.count} reports, avg rating ${issue.avgRating.toFixed(1)}/5`);

    return {
      metrics,
      trendingIssues,
      recentFeedback,
      improvementOpportunities,
    };
  }

  /**
   * Get feedback metrics
   */
  async getFeedbackMetrics(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FeedbackMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const result = await pool.query(
      'SELECT * FROM get_feedback_metrics($1, $2, $3)',
      [agentId, start, end]
    );

    const row = result.rows[0];

    // Get category breakdown
    const categoryResult = await pool.query(
      'SELECT * FROM get_feedback_distribution($1, $2, $3)',
      [agentId, start, end]
    );

    const categoryBreakdown: Record<FeedbackScope, number> = {} as any;
    categoryResult.rows.forEach((r) => {
      categoryBreakdown[r.category as FeedbackScope] = parseInt(r.count);
    });

    return {
      agentId,
      totalFeedback: parseInt(row.total_feedback) || 0,
      avgRating: parseFloat(row.avg_rating) || 0,
      thumbsUpCount: parseInt(row.thumbs_up_count) || 0,
      thumbsDownCount: parseInt(row.thumbs_down_count) || 0,
      ratingDistribution: {
        star_1: parseInt(row.star_1_count) || 0,
        star_2: parseInt(row.star_2_count) || 0,
        star_3: parseInt(row.star_3_count) || 0,
        star_4: parseInt(row.star_4_count) || 0,
        star_5: parseInt(row.star_5_count) || 0,
      },
      categoryBreakdown,
      dateRange: { startDate: start, endDate: end },
    };
  }

  /**
   * Generate improvement tasks using GPT-4
   */
  async generateAgentImprovementTasks(
    agentId: string,
    options?: {
      lookbackDays?: number;
      minFeedbackCount?: number;
    }
  ): Promise<ImprovementPlan[]> {
    const lookbackDays = options?.lookbackDays || 30;
    const minFeedbackCount = options?.minFeedbackCount || 5;

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get feedback summary
    const summary = await this.getFeedbackSummary(agentId, startDate, endDate);

    if (summary.metrics.totalFeedback < minFeedbackCount) {
      return [];
    }

    // Build GPT-4 prompt
    const prompt = this.buildImprovementPrompt(summary);

    // Generate improvement tasks with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI agent improvement specialist. Analyze feedback and generate actionable improvement plans.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    try {
      const parsedPlans = JSON.parse(responseText);
      const plans: ImprovementPlan[] = [];

      for (const plan of parsedPlans.improvements || []) {
        const savedPlan = await this.saveImprovementPlan({
          agentId,
          title: plan.title,
          description: plan.description,
          priority: plan.priority as ImprovementPriority,
          category: plan.category as FeedbackScope,
          proposedChanges: plan.proposedChanges,
          reasoning: plan.reasoning,
          estimatedImpact: plan.estimatedImpact,
        });

        plans.push(savedPlan);
      }

      return plans;
    } catch (error) {
      console.error('Error parsing GPT-4 improvement plans:', error);
      return [];
    }
  }

  /**
   * Build improvement prompt for GPT-4
   */
  private buildImprovementPrompt(summary: FeedbackSummary): string {
    const { metrics, trendingIssues } = summary;

    return `
Analyze the following agent feedback data and generate 3-5 specific, actionable improvement plans.

FEEDBACK METRICS:
- Total Feedback: ${metrics.totalFeedback}
- Average Rating: ${metrics.avgRating.toFixed(2)}/5
- Thumbs Up: ${metrics.thumbsUpCount} (${((metrics.thumbsUpCount / metrics.totalFeedback) * 100).toFixed(1)}%)
- Thumbs Down: ${metrics.thumbsDownCount} (${((metrics.thumbsDownCount / metrics.totalFeedback) * 100).toFixed(1)}%)

TRENDING ISSUES:
${trendingIssues
  .slice(0, 5)
  .map(
    (issue) =>
      `- ${issue.category}: ${issue.count} reports (${issue.percentage.toFixed(1)}%), avg rating ${issue.avgRating.toFixed(1)}/5
  Examples: ${issue.examples.slice(0, 2).join('; ')}`
  )
  .join('\n')}

Generate improvement plans in this JSON format:
{
  "improvements": [
    {
      "title": "Short title",
      "description": "Detailed description",
      "priority": "critical|high|medium|low",
      "category": "response_quality|tone|accuracy|helpfulness|etc",
      "proposedChanges": [
        {
          "type": "memory_update|playbook_refinement|personality_adjustment|training_data|system_prompt",
          "target": "What to change",
          "proposedValue": "New value or approach",
          "rationale": "Why this change will help",
          "confidence": 0.8
        }
      ],
      "reasoning": "Why this improvement is needed",
      "estimatedImpact": {
        "expectedRatingIncrease": 0.5,
        "affectedInteractions": 100
      }
    }
  ]
}

Focus on:
1. Issues with highest frequency and lowest ratings
2. Specific, measurable changes
3. Changes that can be implemented programmatically
4. High-confidence recommendations (>0.7)
`.trim();
  }

  /**
   * Save improvement plan to database
   */
  private async saveImprovementPlan(plan: Omit<ImprovementPlan, 'id' | 'generatedAt' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>): Promise<ImprovementPlan> {
    const query = `
      INSERT INTO agent_improvement_plans (
        agent_id,
        title,
        description,
        priority,
        category,
        proposed_changes,
        reasoning,
        estimated_impact,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const metadata = {
      feedbackSampleSize: 0,
      confidence: 0.8,
      basedOnPatterns: [],
    };

    const values = [
      plan.agentId,
      plan.title,
      plan.description,
      plan.priority,
      plan.category,
      JSON.stringify(plan.proposedChanges),
      plan.reasoning,
      JSON.stringify(plan.estimatedImpact),
      JSON.stringify(metadata),
    ];

    const result = await pool.query(query, values);
    return this.mapImprovementPlan(result.rows[0]);
  }

  /**
   * Query feedback with filters
   */
  async queryFeedback(options: FeedbackQueryOptions): Promise<AgentFeedbackEntry[]> {
    let query = `
      SELECT * FROM agent_feedback_log
      WHERE agent_id = $1
    `;

    const params: any[] = [options.agentId];
    let paramIndex = 2;

    if (options.startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    if (options.rating) {
      query += ` AND rating = $${paramIndex}`;
      params.push(options.rating);
      paramIndex++;
    }

    query += ` ORDER BY ${options.orderBy || 'created_at'} ${options.orderDirection || 'DESC'}`;
    query += ` LIMIT ${options.limit || 50}`;

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await pool.query(query, params);
    return result.rows.map((row) => this.mapFeedbackEntry(row));
  }

  /**
   * Map database row to FeedbackEntry
   */
  private mapFeedbackEntry(row: any): AgentFeedbackEntry {
    return {
      id: row.id,
      agentId: row.agent_id,
      messageId: row.message_id,
      conversationId: row.conversation_id,
      turnId: row.turn_id,
      rating: row.rating as FeedbackRating,
      categories: row.categories as FeedbackScope[],
      notes: row.notes,
      createdBy: row.created_by,
      isAnonymous: row.is_anonymous,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to ImprovementPlan
   */
  private mapImprovementPlan(row: any): ImprovementPlan {
    return {
      id: row.id,
      agentId: row.agent_id,
      title: row.title,
      description: row.description,
      priority: row.priority as ImprovementPriority,
      status: row.status as ImprovementStatus,
      category: row.category as FeedbackScope,
      proposedChanges: JSON.parse(row.proposed_changes || '[]'),
      reasoning: row.reasoning,
      estimatedImpact: JSON.parse(row.estimated_impact || '{}'),
      generatedAt: row.generated_at,
      implementedAt: row.implemented_at,
      createdBy: row.created_by,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  /**
   * Get improvement plans for an agent
   */
  async getImprovementPlans(agentId: string, status?: ImprovementStatus): Promise<ImprovementPlan[]> {
    let query = 'SELECT * FROM agent_improvement_plans WHERE agent_id = $1';
    const params: any[] = [agentId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows.map((row) => this.mapImprovementPlan(row));
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const agentFeedbackEngine = new AgentFeedbackEngineService();
export default agentFeedbackEngine;
