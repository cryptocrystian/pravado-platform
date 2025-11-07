// =====================================================
// INSIGHT ENGINE
// =====================================================
// Generates performance insights after task/goal/campaign runs

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  PerformanceInsight,
  CreatePerformanceInsightInput,
  InsightType,
  AgentBenchmark,
  InsightSummary,
  AgentPerformanceComparison,
} from '@pravado/types';
import { CreatePerformanceInsightInputSchema } from '@pravado/types';
import { memoryService } from '../memory/memory-service';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// INSIGHT ENGINE CLASS
// =====================================================

export class InsightEngine {
  /**
   * Generate insight after agent task/goal/campaign execution
   */
  async generateInsight(
    input: CreatePerformanceInsightInput
  ): Promise<PerformanceInsight> {
    // Validate input
    const validatedInput = CreatePerformanceInsightInputSchema.parse(input);

    // Set organization context
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: validatedInput.organizationId,
    });

    // Get benchmark if available
    const benchmark = await this.getBenchmark(
      validatedInput.agentType || '',
      validatedInput.organizationId
    );

    // Get previous performance
    const previousPerformance = await this.getPreviousPerformance(
      validatedInput.insightType,
      validatedInput.agentId || '',
      validatedInput.organizationId
    );

    // Calculate comparative metrics
    const vsBenchmarkDelta = benchmark
      ? this.calculateBenchmarkDelta(validatedInput, benchmark)
      : null;

    const vsPreviousDelta = previousPerformance
      ? this.calculatePreviousDelta(validatedInput, previousPerformance)
      : null;

    // Generate AI-powered insights
    const aiInsights = await this.generateAIInsights(
      validatedInput,
      benchmark,
      previousPerformance
    );

    // Insert insight
    const { data: insight, error } = await supabase
      .from('performance_insights')
      .insert({
        insight_type: validatedInput.insightType,
        entity_id: validatedInput.entityId,
        agent_id: validatedInput.agentId || null,
        agent_type: validatedInput.agentType || null,
        success_score: validatedInput.successScore || null,
        quality_score: validatedInput.qualityScore || null,
        efficiency_score: validatedInput.efficiencyScore || null,
        speed_score: validatedInput.speedScore || null,
        metrics: validatedInput.metrics || null,
        execution_time_ms: validatedInput.executionTimeMs || null,
        tokens_used: validatedInput.tokensUsed || null,
        api_calls_made: validatedInput.apiCallsMade || null,
        errors_encountered: validatedInput.errorsEncountered || null,
        achieved_goal: validatedInput.achievedGoal || null,
        goal_completion_percentage: validatedInput.goalCompletionPercentage || null,
        vs_benchmark_delta: vsBenchmarkDelta,
        vs_previous_delta: vsPreviousDelta,
        insight_summary: aiInsights.summary,
        key_learnings: aiInsights.learnings,
        improvement_suggestions: aiInsights.suggestions,
        context: validatedInput.context || null,
        measured_at: new Date(),
        organization_id: validatedInput.organizationId,
      })
      .select()
      .single();

    if (error) {
      console.error('[InsightEngine] Failed to create insight:', error);
      throw new Error(`Failed to create insight: ${error.message}`);
    }

    // Store learnings in agent memory
    if (validatedInput.agentId) {
      await this.storeInsightInMemory(
        validatedInput.agentId,
        this.mapDbInsightToType(insight),
        validatedInput.organizationId
      );
    }

    console.log(`[InsightEngine] Created insight ${insight.id} for ${validatedInput.insightType}`);

    return this.mapDbInsightToType(insight);
  }

  /**
   * Get benchmark for agent type
   */
  private async getBenchmark(
    agentType: string,
    organizationId: string
  ): Promise<AgentBenchmark | null> {
    if (!agentType) return null;

    const { data, error } = await supabase
      .from('agent_benchmarks')
      .select('*')
      .eq('agent_type', agentType)
      .eq('is_active', true)
      .or(`organization_id.eq.${organizationId},is_system_benchmark.eq.true`)
      .order('is_system_benchmark', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;

    return this.mapDbBenchmarkToType(data);
  }

  /**
   * Get previous performance for comparison
   */
  private async getPreviousPerformance(
    insightType: InsightType,
    agentId: string,
    organizationId: string
  ): Promise<PerformanceInsight | null> {
    if (!agentId) return null;

    const { data, error } = await supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('insight_type', insightType)
      .eq('agent_id', agentId)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return this.mapDbInsightToType(data);
  }

  /**
   * Calculate delta vs benchmark
   */
  private calculateBenchmarkDelta(
    input: CreatePerformanceInsightInput,
    benchmark: AgentBenchmark
  ): number {
    const scores = [
      input.successScore || 0,
      input.qualityScore || 0,
      input.efficiencyScore || 0,
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const benchmarkScores = [
      benchmark.expectedSuccessRate,
      benchmark.expectedQualityScore,
      benchmark.expectedEfficiencyScore,
    ];
    const avgBenchmark = benchmarkScores.reduce((a, b) => a + b, 0) / benchmarkScores.length;

    return ((avgScore - avgBenchmark) / avgBenchmark) * 100;
  }

  /**
   * Calculate delta vs previous run
   */
  private calculatePreviousDelta(
    input: CreatePerformanceInsightInput,
    previous: PerformanceInsight
  ): number {
    const currentScore = input.successScore || 0;
    const previousScore = previous.successScore || 0;

    if (previousScore === 0) return 0;

    return ((currentScore - previousScore) / previousScore) * 100;
  }

  /**
   * Generate AI-powered insights using OpenAI
   */
  private async generateAIInsights(
    input: CreatePerformanceInsightInput,
    benchmark: AgentBenchmark | null,
    previous: PerformanceInsight | null
  ): Promise<{
    summary: string;
    learnings: string[];
    suggestions: string[];
  }> {
    try {
      const prompt = this.buildInsightPrompt(input, benchmark, previous);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a performance analyst for AI agents. Analyze the performance data and provide concise, actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content from OpenAI');
      }

      const result = JSON.parse(content);

      return {
        summary: result.summary || 'Performance analysis completed.',
        learnings: result.learnings || [],
        suggestions: result.suggestions || [],
      };
    } catch (error) {
      console.error('[InsightEngine] Failed to generate AI insights:', error);

      // Fallback to basic insights
      return {
        summary: this.generateBasicSummary(input),
        learnings: [],
        suggestions: [],
      };
    }
  }

  /**
   * Build prompt for AI insight generation
   */
  private buildInsightPrompt(
    input: CreatePerformanceInsightInput,
    benchmark: AgentBenchmark | null,
    previous: PerformanceInsight | null
  ): string {
    let prompt = `Analyze this agent performance data:\n\n`;
    prompt += `Type: ${input.insightType}\n`;
    prompt += `Agent Type: ${input.agentType || 'Unknown'}\n`;
    prompt += `Success Score: ${input.successScore?.toFixed(2) || 'N/A'}\n`;
    prompt += `Quality Score: ${input.qualityScore?.toFixed(2) || 'N/A'}\n`;
    prompt += `Efficiency Score: ${input.efficiencyScore?.toFixed(2) || 'N/A'}\n`;
    prompt += `Execution Time: ${input.executionTimeMs || 'N/A'}ms\n`;
    prompt += `Tokens Used: ${input.tokensUsed || 'N/A'}\n`;
    prompt += `Errors: ${input.errorsEncountered || 0}\n`;
    prompt += `Goal Achieved: ${input.achievedGoal ? 'Yes' : 'No'}\n\n`;

    if (benchmark) {
      prompt += `Benchmark:\n`;
      prompt += `Expected Success: ${benchmark.expectedSuccessRate.toFixed(2)}\n`;
      prompt += `Expected Quality: ${benchmark.expectedQualityScore.toFixed(2)}\n`;
      prompt += `Expected Efficiency: ${benchmark.expectedEfficiencyScore.toFixed(2)}\n\n`;
    }

    if (previous) {
      prompt += `Previous Performance:\n`;
      prompt += `Success Score: ${previous.successScore?.toFixed(2) || 'N/A'}\n`;
      prompt += `Quality Score: ${previous.qualityScore?.toFixed(2) || 'N/A'}\n\n`;
    }

    prompt += `Provide a JSON response with:\n`;
    prompt += `- summary: A 1-2 sentence performance summary\n`;
    prompt += `- learnings: Array of 2-4 key learnings (strings)\n`;
    prompt += `- suggestions: Array of 2-4 improvement suggestions (strings)\n`;

    return prompt;
  }

  /**
   * Generate basic summary without AI
   */
  private generateBasicSummary(input: CreatePerformanceInsightInput): string {
    const successScore = input.successScore || 0;

    if (successScore >= 0.9) {
      return 'Excellent performance - significantly exceeding expectations.';
    } else if (successScore >= 0.7) {
      return 'Good performance - meeting expectations with room for optimization.';
    } else if (successScore >= 0.5) {
      return 'Acceptable performance - notable areas for improvement identified.';
    } else {
      return 'Below expectations - significant optimization required.';
    }
  }

  /**
   * Store insight in agent memory for learning
   */
  private async storeInsightInMemory(
    agentId: string,
    insight: PerformanceInsight,
    organizationId: string
  ): Promise<void> {
    try {
      await memoryService.storeMemory({
        agentId,
        content: `Performance: ${insight.insightSummary}. Success: ${(insight.successScore || 0).toFixed(2)}, Quality: ${(insight.qualityScore || 0).toFixed(2)}`,
        memoryType: 'PROCEDURAL',
        category: 'performance_insight',
        importance: this.calculateInsightImportance(insight),
        metadata: {
          insightId: insight.id,
          successScore: insight.successScore,
          qualityScore: insight.qualityScore,
          learnings: insight.keyLearnings,
        },
        organizationId,
      });

      console.log(`[InsightEngine] Stored insight in memory for agent ${agentId}`);
    } catch (error) {
      console.error('[InsightEngine] Failed to store insight in memory:', error);
    }
  }

  /**
   * Calculate importance of insight for memory storage
   */
  private calculateInsightImportance(insight: PerformanceInsight): number {
    const successScore = insight.successScore || 0;
    const qualityScore = insight.qualityScore || 0;

    // Higher importance for exceptional or poor performance
    if (successScore >= 0.9 || successScore <= 0.5) {
      return 0.9;
    } else if (qualityScore >= 0.9 || qualityScore <= 0.5) {
      return 0.8;
    }

    return 0.6;
  }

  /**
   * Get insights for an agent
   */
  async getInsightsForAgent(
    agentId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<PerformanceInsight[]> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    const { data, error } = await supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('agent_id', agentId)
      .order('measured_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[InsightEngine] Failed to get insights:', error);
      return [];
    }

    return (data || []).map(this.mapDbInsightToType);
  }

  /**
   * Get insight summary for dashboard
   */
  async getInsightSummary(
    organizationId: string,
    days: number = 30
  ): Promise<InsightSummary> {
    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    const { data, error } = await supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('measured_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('measured_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return {
        totalInsights: 0,
        avgSuccessScore: 0,
        avgQualityScore: 0,
        trendDirection: 'STABLE',
        topPerformingAgents: [],
        topImprovementAreas: [],
      };
    }

    const insights = data.map(this.mapDbInsightToType);

    // Calculate averages
    const avgSuccessScore =
      insights.reduce((sum, i) => sum + (i.successScore || 0), 0) / insights.length;
    const avgQualityScore =
      insights.reduce((sum, i) => sum + (i.qualityScore || 0), 0) / insights.length;

    // Calculate trend direction
    const halfwayPoint = Math.floor(insights.length / 2);
    const recentAvg =
      insights
        .slice(0, halfwayPoint)
        .reduce((sum, i) => sum + (i.successScore || 0), 0) / halfwayPoint;
    const olderAvg =
      insights
        .slice(halfwayPoint)
        .reduce((sum, i) => sum + (i.successScore || 0), 0) /
      (insights.length - halfwayPoint);

    let trendDirection: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (recentAvg > olderAvg + 0.05) trendDirection = 'UP';
    else if (recentAvg < olderAvg - 0.05) trendDirection = 'DOWN';

    // Top performing agents
    const agentPerformance = new Map<string, number[]>();
    insights.forEach((i) => {
      if (i.agentType) {
        const scores = agentPerformance.get(i.agentType) || [];
        scores.push(i.successScore || 0);
        agentPerformance.set(i.agentType, scores);
      }
    });

    const topPerformingAgents = Array.from(agentPerformance.entries())
      .map(([agentType, scores]) => ({
        agentType,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    // Top improvement areas
    const improvementAreas: string[] = [];
    insights.forEach((i) => {
      if (i.improvementSuggestions) {
        improvementAreas.push(...i.improvementSuggestions);
      }
    });

    // Count occurrences and get top 5
    const areaCounts = new Map<string, number>();
    improvementAreas.forEach((area) => {
      areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
    });

    const topImprovementAreas = Array.from(areaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area]) => area);

    return {
      totalInsights: insights.length,
      avgSuccessScore,
      avgQualityScore,
      trendDirection,
      topPerformingAgents,
      topImprovementAreas,
    };
  }

  /**
   * Compare agent performance to benchmark
   */
  async compareToBenchmark(
    agentType: string,
    organizationId: string,
    days: number = 30
  ): Promise<AgentPerformanceComparison | null> {
    const benchmark = await this.getBenchmark(agentType, organizationId);
    if (!benchmark) return null;

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    const { data, error } = await supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('agent_type', agentType)
      .gte('measured_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error || !data || data.length === 0) return null;

    const insights = data.map(this.mapDbInsightToType);

    const avgSuccessScore =
      insights.reduce((sum, i) => sum + (i.successScore || 0), 0) / insights.length;
    const avgQualityScore =
      insights.reduce((sum, i) => sum + (i.qualityScore || 0), 0) / insights.length;
    const avgEfficiencyScore =
      insights.reduce((sum, i) => sum + (i.efficiencyScore || 0), 0) / insights.length;

    const successDelta =
      ((avgSuccessScore - benchmark.expectedSuccessRate) / benchmark.expectedSuccessRate) * 100;
    const qualityDelta =
      ((avgQualityScore - benchmark.expectedQualityScore) / benchmark.expectedQualityScore) * 100;
    const efficiencyDelta =
      ((avgEfficiencyScore - benchmark.expectedEfficiencyScore) /
        benchmark.expectedEfficiencyScore) *
      100;

    // Determine performance level
    let performanceLevel: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'BELOW_EXPECTATION';
    const avgDelta = (successDelta + qualityDelta + efficiencyDelta) / 3;

    if (avgDelta > 10) performanceLevel = 'EXCELLENT';
    else if (avgDelta > 0) performanceLevel = 'GOOD';
    else if (avgDelta > -10) performanceLevel = 'ACCEPTABLE';
    else performanceLevel = 'BELOW_EXPECTATION';

    return {
      agentType,
      currentPerformance: {
        successScore: avgSuccessScore,
        qualityScore: avgQualityScore,
        efficiencyScore: avgEfficiencyScore,
      },
      benchmark: {
        expectedSuccessRate: benchmark.expectedSuccessRate,
        expectedQualityScore: benchmark.expectedQualityScore,
        expectedEfficiencyScore: benchmark.expectedEfficiencyScore,
      },
      delta: {
        successDelta,
        qualityDelta,
        efficiencyDelta,
      },
      performanceLevel,
    };
  }

  /**
   * Map database insight to TypeScript type
   */
  private mapDbInsightToType(dbInsight: any): PerformanceInsight {
    return {
      id: dbInsight.id,
      insightType: dbInsight.insight_type,
      entityId: dbInsight.entity_id,
      agentId: dbInsight.agent_id,
      agentType: dbInsight.agent_type,
      successScore: dbInsight.success_score ? parseFloat(dbInsight.success_score) : null,
      qualityScore: dbInsight.quality_score ? parseFloat(dbInsight.quality_score) : null,
      efficiencyScore: dbInsight.efficiency_score ? parseFloat(dbInsight.efficiency_score) : null,
      speedScore: dbInsight.speed_score ? parseFloat(dbInsight.speed_score) : null,
      metrics: dbInsight.metrics,
      executionTimeMs: dbInsight.execution_time_ms,
      tokensUsed: dbInsight.tokens_used,
      apiCallsMade: dbInsight.api_calls_made,
      errorsEncountered: dbInsight.errors_encountered,
      achievedGoal: dbInsight.achieved_goal,
      goalCompletionPercentage: dbInsight.goal_completion_percentage
        ? parseFloat(dbInsight.goal_completion_percentage)
        : null,
      vsBenchmarkDelta: dbInsight.vs_benchmark_delta
        ? parseFloat(dbInsight.vs_benchmark_delta)
        : null,
      vsPreviousDelta: dbInsight.vs_previous_delta
        ? parseFloat(dbInsight.vs_previous_delta)
        : null,
      insightSummary: dbInsight.insight_summary,
      keyLearnings: dbInsight.key_learnings,
      improvementSuggestions: dbInsight.improvement_suggestions,
      context: dbInsight.context,
      measuredAt: new Date(dbInsight.measured_at),
      createdAt: new Date(dbInsight.created_at),
      organizationId: dbInsight.organization_id,
    };
  }

  /**
   * Map database benchmark to TypeScript type
   */
  private mapDbBenchmarkToType(dbBenchmark: any): AgentBenchmark {
    return {
      id: dbBenchmark.id,
      agentType: dbBenchmark.agent_type,
      taskType: dbBenchmark.task_type,
      expectedSuccessRate: parseFloat(dbBenchmark.expected_success_rate),
      expectedQualityScore: parseFloat(dbBenchmark.expected_quality_score),
      expectedEfficiencyScore: parseFloat(dbBenchmark.expected_efficiency_score),
      expectedExecutionTimeMs: dbBenchmark.expected_execution_time_ms,
      minimumAcceptableSuccess: dbBenchmark.minimum_acceptable_success
        ? parseFloat(dbBenchmark.minimum_acceptable_success)
        : null,
      minimumAcceptableQuality: dbBenchmark.minimum_acceptable_quality
        ? parseFloat(dbBenchmark.minimum_acceptable_quality)
        : null,
      description: dbBenchmark.description,
      sampleSize: dbBenchmark.sample_size,
      isSystemBenchmark: dbBenchmark.is_system_benchmark,
      isActive: dbBenchmark.is_active,
      lastUpdated: new Date(dbBenchmark.last_updated),
      createdAt: new Date(dbBenchmark.created_at),
      organizationId: dbBenchmark.organization_id,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const insightEngine = new InsightEngine();
