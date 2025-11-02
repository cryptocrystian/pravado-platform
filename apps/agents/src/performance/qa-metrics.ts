// =====================================================
// QA METRICS MODULE
// =====================================================
// Quality scoring calculations with review learning integration

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { QualityMetrics } from '@pravado/shared-types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// QA METRICS CLASS
// =====================================================

export class QAMetrics {
  /**
   * Calculate quality metrics for generated content
   */
  async calculateQualityMetrics(params: {
    content: string;
    contentType: string; // 'pitch', 'campaign-plan', 'strategy', etc.
    context?: Record<string, any>;
    includeAIAnalysis?: boolean;
  }): Promise<QualityMetrics> {
    const { content, contentType, context, includeAIAnalysis = true } = params;

    // Basic quality checks
    const basicMetrics = this.calculateBasicMetrics(content);

    // AI-powered quality analysis
    let aiMetrics: Partial<QualityMetrics> = {};
    if (includeAIAnalysis) {
      try {
        aiMetrics = await this.getAIQualityAnalysis(content, contentType, context);
      } catch (error) {
        console.error('[QAMetrics] AI analysis failed:', error);
      }
    }

    // Combine metrics
    const dimensions = {
      accuracy: aiMetrics.dimensions?.accuracy || basicMetrics.accuracy,
      completeness: aiMetrics.dimensions?.completeness || basicMetrics.completeness,
      relevance: aiMetrics.dimensions?.relevance || basicMetrics.relevance,
      creativity: aiMetrics.dimensions?.creativity || basicMetrics.creativity,
      professionalism: aiMetrics.dimensions?.professionalism || basicMetrics.professionalism,
    };

    // Calculate overall score
    const overallScore =
      (dimensions.accuracy +
        dimensions.completeness +
        dimensions.relevance +
        dimensions.creativity +
        dimensions.professionalism) /
      5;

    return {
      overallScore,
      dimensions,
      strengths: aiMetrics.strengths || this.identifyStrengths(dimensions),
      weaknesses: aiMetrics.weaknesses || this.identifyWeaknesses(dimensions),
      improvementRecommendations:
        aiMetrics.improvementRecommendations ||
        this.generateRecommendations(dimensions),
    };
  }

  /**
   * Calculate basic quality metrics without AI
   */
  private calculateBasicMetrics(content: string): {
    accuracy: number;
    completeness: number;
    relevance: number;
    creativity: number;
    professionalism: number;
  } {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordLength =
      content.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / wordCount;

    // Heuristic scoring (0-1)
    const lengthScore = Math.min(wordCount / 200, 1); // Ideal ~200 words
    const varietyScore = Math.min(avgWordLength / 6, 1); // Variety in word length
    const structureScore = Math.min(sentenceCount / 10, 1); // Good sentence count

    return {
      accuracy: 0.7, // Default, requires AI or human review
      completeness: lengthScore * 0.8 + structureScore * 0.2,
      relevance: 0.7, // Default, requires context analysis
      creativity: varietyScore,
      professionalism: this.checkProfessionalism(content),
    };
  }

  /**
   * Check professionalism heuristically
   */
  private checkProfessionalism(content: string): number {
    let score = 1.0;

    // Deduct for unprofessional patterns
    if (/\b(hey|yo|sup|lol|omg)\b/i.test(content)) score -= 0.3;
    if (/!{2,}/.test(content)) score -= 0.1; // Multiple exclamation marks
    if (/\?{2,}/.test(content)) score -= 0.1; // Multiple question marks
    if (/[A-Z]{5,}/.test(content)) score -= 0.2; // Excessive caps
    if (/(fuck|shit|damn|hell)/i.test(content)) score -= 0.5; // Profanity

    return Math.max(score, 0);
  }

  /**
   * Get AI-powered quality analysis
   */
  private async getAIQualityAnalysis(
    content: string,
    contentType: string,
    context?: Record<string, any>
  ): Promise<Partial<QualityMetrics>> {
    const prompt = this.buildQualityPrompt(content, contentType, context);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a quality assurance expert for PR and marketing content. Analyze content objectively and provide detailed quality assessments.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      dimensions: {
        accuracy: result.accuracy || 0.7,
        completeness: result.completeness || 0.7,
        relevance: result.relevance || 0.7,
        creativity: result.creativity || 0.7,
        professionalism: result.professionalism || 0.7,
      },
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      improvementRecommendations: result.recommendations || [],
    };
  }

  /**
   * Build prompt for quality analysis
   */
  private buildQualityPrompt(
    content: string,
    contentType: string,
    context?: Record<string, any>
  ): string {
    let prompt = `Analyze this ${contentType} content for quality:\n\n`;
    prompt += `Content:\n${content}\n\n`;

    if (context) {
      prompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    }

    prompt += `Rate the following dimensions on a scale of 0-1:\n`;
    prompt += `- Accuracy: How factually correct and precise is the content?\n`;
    prompt += `- Completeness: Does it cover all necessary points?\n`;
    prompt += `- Relevance: How well does it match the intended purpose?\n`;
    prompt += `- Creativity: Is it engaging and original?\n`;
    prompt += `- Professionalism: Does it maintain appropriate tone and quality?\n\n`;

    prompt += `Also identify:\n`;
    prompt += `- strengths: Array of 2-4 notable strengths\n`;
    prompt += `- weaknesses: Array of 2-4 areas needing improvement\n`;
    prompt += `- recommendations: Array of 2-4 actionable suggestions\n\n`;

    prompt += `Return JSON with these fields.`;

    return prompt;
  }

  /**
   * Identify strengths from dimension scores
   */
  private identifyStrengths(dimensions: Record<string, number>): string[] {
    const strengths: string[] = [];

    Object.entries(dimensions).forEach(([dim, score]) => {
      if (score >= 0.8) {
        strengths.push(`Strong ${dim} (${(score * 100).toFixed(0)}%)`);
      }
    });

    return strengths.length > 0
      ? strengths
      : ['Content meets baseline quality standards'];
  }

  /**
   * Identify weaknesses from dimension scores
   */
  private identifyWeaknesses(dimensions: Record<string, number>): string[] {
    const weaknesses: string[] = [];

    Object.entries(dimensions).forEach(([dim, score]) => {
      if (score < 0.6) {
        weaknesses.push(`${dim} needs improvement (${(score * 100).toFixed(0)}%)`);
      }
    });

    return weaknesses;
  }

  /**
   * Generate recommendations from dimension scores
   */
  private generateRecommendations(dimensions: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if (dimensions.accuracy < 0.7) {
      recommendations.push('Verify facts and claims with authoritative sources');
    }

    if (dimensions.completeness < 0.7) {
      recommendations.push('Expand content to cover all key points thoroughly');
    }

    if (dimensions.relevance < 0.7) {
      recommendations.push('Better align content with target audience and objectives');
    }

    if (dimensions.creativity < 0.7) {
      recommendations.push('Add more engaging hooks and unique angles');
    }

    if (dimensions.professionalism < 0.7) {
      recommendations.push('Refine tone and language for professional context');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining high quality standards');
    }

    return recommendations;
  }

  /**
   * Calculate quality from review feedback
   * Integrates human review decisions into quality scoring
   */
  async calculateQualityFromReviews(params: {
    entityType: string;
    entityId: string;
    organizationId: string;
  }): Promise<number> {
    const { entityType, entityId, organizationId } = params;

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    // Get reviews for this entity
    const { data: reviews } = await supabase
      .from('agent_reviews')
      .select('status, decision_summary')
      .eq('reviewable_entity_type', entityType.toUpperCase())
      .eq('reviewable_entity_id', entityId)
      .eq('organization_id', organizationId);

    if (!reviews || reviews.length === 0) {
      return 0.7; // Default quality score
    }

    // Calculate score based on review outcomes
    let qualityScore = 0;
    let totalWeight = 0;

    reviews.forEach((review: any) => {
      let weight = 1;
      let score = 0.5;

      switch (review.status) {
        case 'APPROVED':
          score = 0.9;
          weight = 1.0;
          break;
        case 'NEEDS_EDIT':
          score = 0.6;
          weight = 0.8;
          break;
        case 'REJECTED':
          score = 0.3;
          weight = 1.0;
          break;
        default:
          score = 0.5;
          weight = 0.5;
      }

      qualityScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? qualityScore / totalWeight : 0.7;
  }

  /**
   * Get quality trends over time
   */
  async getQualityTrends(params: {
    agentId?: string;
    agentType?: string;
    organizationId: string;
    days?: number;
  }): Promise<Array<{ date: string; avgQuality: number; count: number }>> {
    const { agentId, agentType, organizationId, days = 30 } = params;

    await supabase.rpc('set_config', {
      setting: 'app.current_organization_id',
      value: organizationId,
    });

    let query = supabase
      .from('performance_insights')
      .select('measured_at, quality_score')
      .eq('organization_id', organizationId)
      .gte('measured_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .not('quality_score', 'is', null);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    } else if (agentType) {
      query = query.eq('agent_type', agentType);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    // Group by date
    const dateMap = new Map<string, number[]>();

    data.forEach((item: any) => {
      const date = new Date(item.measured_at).toISOString().split('T')[0];
      const scores = dateMap.get(date) || [];
      scores.push(parseFloat(item.quality_score));
      dateMap.set(date, scores);
    });

    // Calculate averages
    return Array.from(dateMap.entries())
      .map(([date, scores]) => ({
        date,
        avgQuality: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get quality benchmark comparison
   */
  async compareQualityToBenchmark(params: {
    agentType: string;
    organizationId: string;
    days?: number;
  }): Promise<{
    currentQuality: number;
    benchmarkQuality: number;
    delta: number;
    performanceLevel: string;
  } | null> {
    const { agentType, organizationId, days = 30 } = params;

    // Get benchmark
    const { data: benchmark } = await supabase
      .from('agent_benchmarks')
      .select('expected_quality_score')
      .eq('agent_type', agentType)
      .eq('is_active', true)
      .or(`organization_id.eq.${organizationId},is_system_benchmark.eq.true`)
      .order('is_system_benchmark', { ascending: true })
      .limit(1)
      .single();

    if (!benchmark) return null;

    // Get recent quality scores
    const { data: insights } = await supabase
      .from('performance_insights')
      .select('quality_score')
      .eq('organization_id', organizationId)
      .eq('agent_type', agentType)
      .gte('measured_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .not('quality_score', 'is', null);

    if (!insights || insights.length === 0) return null;

    const currentQuality =
      insights.reduce((sum: number, i: any) => sum + parseFloat(i.quality_score), 0) /
      insights.length;

    const benchmarkQuality = parseFloat(benchmark.expected_quality_score);
    const delta = ((currentQuality - benchmarkQuality) / benchmarkQuality) * 100;

    let performanceLevel: string;
    if (delta > 10) performanceLevel = 'EXCELLENT';
    else if (delta > 0) performanceLevel = 'GOOD';
    else if (delta > -10) performanceLevel = 'ACCEPTABLE';
    else performanceLevel = 'BELOW_EXPECTATION';

    return {
      currentQuality,
      benchmarkQuality,
      delta,
      performanceLevel,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const qaMetrics = new QAMetrics();
