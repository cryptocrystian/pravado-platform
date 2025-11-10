// =====================================================
// AUTONOMOUS AGENT EVALUATOR ENGINE
// Core Infrastructure: Agent performance evaluation framework
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  EvaluationSource,
  EvaluationStatus,
  EvaluationCriteria,
  EVALUATION_CRITERIA_CONFIGS,
} from '@pravado/types';
import type {
  AgentEvaluation,
  EvaluationEvent,
  EvaluationTemplate,
  EvaluationWithDetails,
  EvaluationSummary,
  EvaluationDashboard,
  GptEvaluationAnalysis,
  ImprovementRecommendations,
  AgentPerformanceReport,
  EvaluateRunInput,
  SummarizeEvaluationInput,
  UpdateEvaluationInput,
  LogEvaluationEventInput,
  CreateEvaluationTemplateInput,
  UpdateEvaluationTemplateInput,
  GetEvaluationsInput,
  GetEvaluationEventsInput,
  GetEvaluationDashboardInput,
  RecommendImprovementsInput,
  GetTemplatesInput,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

class AgentEvaluatorEngine extends EventEmitter {
  // =====================================================
  // EVALUATION OPERATIONS
  // =====================================================

  /**
   * Evaluate an agent run
   */
  async evaluateRun(input: EvaluateRunInput): Promise<string> {
    // Create evaluation using database function
    const { data: evaluationId, error } = await supabase.rpc('evaluate_agent_run', {
      p_organization_id: input.organizationId,
      p_agent_run_id: input.agentRunId,
      p_campaign_id: input.campaignId,
      p_contact_id: input.contactId,
      p_template_id: input.templateId,
      p_source: input.source || EvaluationSource.GPT,
      p_evaluated_by: input.evaluatedBy,
      p_evaluation_context: input.evaluationContext || {},
    });

    if (error) {
      throw new Error(`Failed to evaluate agent run: ${error.message}`);
    }

    // If GPT source, trigger GPT analysis
    if (input.source === EvaluationSource.GPT || !input.source) {
      try {
        await this.performGptAnalysis(evaluationId, input.organizationId, input.agentRunId, input.evaluationContext);
      } catch (error) {
        console.error('GPT analysis failed:', error);
        // Mark evaluation as failed
        await supabase
          .from('agent_evaluations')
          .update({ status: EvaluationStatus.FAILED })
          .eq('id', evaluationId);
      }
    }

    this.emit('evaluation-created', { evaluationId, agentRunId: input.agentRunId });
    return evaluationId;
  }

  /**
   * Perform GPT-4 analysis for an evaluation
   */
  private async performGptAnalysis(
    evaluationId: string,
    organizationId: string,
    agentRunId: string,
    context?: Record<string, any>
  ): Promise<GptEvaluationAnalysis> {
    // Get evaluation template
    const { data: evaluation } = await supabase
      .from('agent_evaluations')
      .select('*, evaluation_templates(*)')
      .eq('id', evaluationId)
      .single();

    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    const template = evaluation.evaluation_templates;

    // Build GPT prompt
    const prompt = this.buildEvaluationPrompt(agentRunId, template, context || {});

    // Call GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert agent performance evaluator. You analyze agent executions and provide structured, objective assessments based on defined criteria. Provide honest, constructive feedback that helps improve agent performance.`,
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

    // Calculate overall score
    const { data: overallScore } = await supabase.rpc('calculate_score_breakdown', {
      p_evaluation_id: evaluationId,
      p_score_breakdown: analysis.score_breakdown || {},
      p_criteria_weights: evaluation.criteria_weights || {},
    });

    // Update evaluation with GPT analysis
    await supabase
      .from('agent_evaluations')
      .update({
        score_breakdown: analysis.score_breakdown || {},
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        improvement_suggestions: analysis.improvement_suggestions || [],
        coaching_prompts: analysis.coaching_prompts || [],
        overall_score: overallScore,
        status: EvaluationStatus.COMPLETED,
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', evaluationId);

    // Log GPT analysis event
    await this.logEvaluationEvent({
      evaluationId,
      eventType: 'GPT_ANALYSIS',
      description: 'GPT-4 completed automated evaluation',
      newValue: {
        overall_score: overallScore,
        confidence: analysis.confidence,
      },
    });

    const result: GptEvaluationAnalysis = {
      evaluation_id: evaluationId,
      score_breakdown: analysis.score_breakdown || {},
      overall_score: overallScore,
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      detailed_feedback: analysis.detailed_feedback || [],
      improvement_suggestions: analysis.improvement_suggestions || [],
      coaching_prompts: analysis.coaching_prompts || [],
      confidence: analysis.confidence || 0.8,
      analysis_summary: analysis.analysis_summary || '',
      generated_at: new Date().toISOString(),
    };

    this.emit('gpt-analysis-completed', result);
    return result;
  }

  /**
   * Build GPT evaluation prompt
   */
  private buildEvaluationPrompt(
    agentRunId: string,
    template: any,
    context: Record<string, any>
  ): string {
    const criteria = template?.criteria || Object.values(EvaluationCriteria);
    const criteriaWeights = template?.criteria_weights || {};
    const scoringGuidance = template?.scoring_guidance || {};

    let prompt = `# Agent Execution Evaluation

## Agent Run ID
${agentRunId}

## Context
${JSON.stringify(context, null, 2)}

## Evaluation Criteria

Evaluate the agent's performance on the following criteria (scale 0-100):

`;

    criteria.forEach((criterion: EvaluationCriteria) => {
      const config = EVALUATION_CRITERIA_CONFIGS[criterion];
      const weight = criteriaWeights[criterion] || config.defaultWeight;
      const guidance = scoringGuidance[criterion] || config.scoringGuidance;

      prompt += `### ${config.label} (Weight: ${weight}x)
**Description:** ${config.description}
**Scoring Guidance:** ${guidance}

`;
    });

    prompt += `## Required Response Format (JSON)

Provide your evaluation in JSON format with the following structure:

\`\`\`json
{
  "score_breakdown": {
    "${criteria[0]}": <score 0-100>,
    "${criteria[1]}": <score 0-100>,
    ...
  },
  "detailed_feedback": [
    {
      "criteria": "${criteria[0]}",
      "score": <score>,
      "reasoning": "<why this score>",
      "examples": ["<specific example from execution>"]
    },
    ...
  ],
  "strengths": [
    "<key strength 1>",
    "<key strength 2>",
    ...
  ],
  "weaknesses": [
    "<weakness 1>",
    "<weakness 2>",
    ...
  ],
  "improvement_suggestions": [
    "<specific, actionable suggestion 1>",
    "<specific, actionable suggestion 2>",
    ...
  ],
  "coaching_prompts": [
    "<coaching question or prompt 1>",
    "<coaching question or prompt 2>",
    ...
  ],
  "analysis_summary": "<2-3 sentence overall summary>",
  "confidence": <0-1 confidence in this evaluation>
}
\`\`\`

## Evaluation Guidelines

1. **Be Specific**: Reference concrete examples from the agent's execution
2. **Be Constructive**: Focus on actionable improvements
3. **Be Objective**: Base scores on observable behaviors and outcomes
4. **Be Consistent**: Use the same standards across all criteria
5. **Consider Context**: Factor in the difficulty and constraints of the task

Provide your evaluation now:`;

    return prompt;
  }

  /**
   * Update an evaluation
   */
  async updateEvaluation(input: UpdateEvaluationInput): Promise<AgentEvaluation> {
    const { evaluationId, ...updates } = input;

    const updateData: any = {};
    if (updates.scoreBreakdown) updateData.score_breakdown = updates.scoreBreakdown;
    if (updates.strengths) updateData.strengths = updates.strengths;
    if (updates.weaknesses) updateData.weaknesses = updates.weaknesses;
    if (updates.improvementSuggestions) updateData.improvement_suggestions = updates.improvementSuggestions;
    if (updates.coachingPrompts) updateData.coaching_prompts = updates.coachingPrompts;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { data: evaluation, error } = await supabase
      .from('agent_evaluations')
      .update(updateData)
      .eq('id', evaluationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update evaluation: ${error.message}`);
    }

    this.emit('evaluation-updated', evaluation);
    return evaluation;
  }

  /**
   * Get evaluations with filters
   */
  async getEvaluations(input: GetEvaluationsInput): Promise<{ evaluations: AgentEvaluation[]; total: number }> {
    let query = supabase
      .from('agent_evaluations')
      .select('*', { count: 'exact' })
      .eq('organization_id', input.organizationId);

    if (input.agentRunId) query = query.eq('agent_run_id', input.agentRunId);
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId);
    if (input.contactId) query = query.eq('contact_id', input.contactId);
    if (input.source) query = query.eq('source', input.source);
    if (input.status) query = query.eq('status', input.status);
    if (input.templateId) query = query.eq('template_id', input.templateId);
    if (input.minScore !== undefined) query = query.gte('overall_score', input.minScore);
    if (input.maxScore !== undefined) query = query.lte('overall_score', input.maxScore);
    if (input.startDate) query = query.gte('created_at', input.startDate);
    if (input.endDate) query = query.lte('created_at', input.endDate);

    query = query.order('created_at', { ascending: false });

    if (input.limit) query = query.limit(input.limit);
    if (input.offset) query = query.range(input.offset, input.offset + (input.limit || 50) - 1);

    const { data: evaluations, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get evaluations: ${error.message}`);
    }

    return {
      evaluations: evaluations || [],
      total: count || 0,
    };
  }

  /**
   * Get evaluation by ID with details
   */
  async getEvaluationById(organizationId: string, evaluationId: string): Promise<EvaluationWithDetails> {
    const { data: evaluation, error } = await supabase
      .from('agent_evaluations')
      .select('*, evaluation_templates(*)')
      .eq('id', evaluationId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to get evaluation: ${error.message}`);
    }

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('evaluation_events')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate score grade
    const scoreGrade = this.calculateScoreGrade(evaluation.overall_score);

    // Check if passing
    const passThreshold = evaluation.evaluation_templates?.pass_threshold || 70;
    const isPassing = (evaluation.overall_score || 0) >= passThreshold;

    // Build criteria scores array
    const criteriaScores = Object.entries(evaluation.score_breakdown || {}).map(([criteria, score]) => {
      const weight = evaluation.criteria_weights?.[criteria] || 1;
      return {
        criteria: criteria as EvaluationCriteria,
        score: score as number,
        weight,
        weighted_score: (score as number) * weight,
      };
    });

    return {
      ...evaluation,
      template: evaluation.evaluation_templates,
      recent_events: recentEvents || [],
      score_grade: scoreGrade,
      is_passing: isPassing,
      criteria_scores: criteriaScores,
    };
  }

  /**
   * Calculate score grade (A, B, C, D, F)
   */
  private calculateScoreGrade(score?: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (!score) return 'F';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Log an evaluation event
   */
  async logEvaluationEvent(input: LogEvaluationEventInput): Promise<string> {
    const { data: event, error } = await supabase
      .from('evaluation_events')
      .insert({
        evaluation_id: input.evaluationId,
        event_type: input.eventType,
        description: input.description,
        old_value: input.oldValue,
        new_value: input.newValue,
        triggered_by: input.triggeredBy,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log evaluation event: ${error.message}`);
    }

    this.emit('evaluation-event-logged', event);
    return event.id;
  }

  /**
   * Get evaluation events
   */
  async getEvaluationEvents(input: GetEvaluationEventsInput): Promise<{ events: EvaluationEvent[]; total: number }> {
    let query = supabase
      .from('evaluation_events')
      .select('*', { count: 'exact' })
      .eq('evaluation_id', input.evaluationId);

    if (input.eventType) query = query.eq('event_type', input.eventType);

    query = query.order('created_at', { ascending: false });

    if (input.limit) query = query.limit(input.limit);
    if (input.offset) query = query.range(input.offset, input.offset + (input.limit || 50) - 1);

    const { data: events, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get evaluation events: ${error.message}`);
    }

    return {
      events: events || [],
      total: count || 0,
    };
  }

  // =====================================================
  // TEMPLATE OPERATIONS
  // =====================================================

  /**
   * Create evaluation template
   */
  async createTemplate(input: CreateEvaluationTemplateInput): Promise<string> {
    const { data: templateId, error } = await supabase.rpc('create_evaluation_template', {
      p_organization_id: input.organizationId,
      p_name: input.name,
      p_description: input.description,
      p_criteria: input.criteria,
      p_criteria_weights: input.criteriaWeights,
      p_scoring_guidance: input.scoringGuidance || {},
      p_pass_threshold: input.passThreshold || 70,
      p_is_default: input.isDefault || false,
      p_applicable_to: input.applicableTo,
      p_created_by: input.createdBy,
    });

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    this.emit('template-created', { templateId });
    return templateId;
  }

  /**
   * Update evaluation template
   */
  async updateTemplate(input: UpdateEvaluationTemplateInput): Promise<EvaluationTemplate> {
    const { templateId, ...updates } = input;

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.criteria) updateData.criteria = updates.criteria;
    if (updates.criteriaWeights) updateData.criteria_weights = updates.criteriaWeights;
    if (updates.scoringGuidance) updateData.scoring_guidance = updates.scoringGuidance;
    if (updates.passThreshold !== undefined) updateData.pass_threshold = updates.passThreshold;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.applicableTo) updateData.applicable_to = updates.applicableTo;

    const { data: template, error } = await supabase
      .from('evaluation_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    this.emit('template-updated', template);
    return template;
  }

  /**
   * Get templates
   */
  async getTemplates(input: GetTemplatesInput): Promise<EvaluationTemplate[]> {
    let query = supabase
      .from('evaluation_templates')
      .select('*')
      .eq('organization_id', input.organizationId);

    if (input.isActive !== undefined) query = query.eq('is_active', input.isActive);
    if (input.isDefault !== undefined) query = query.eq('is_default', input.isDefault);
    if (input.applicableTo) query = query.contains('applicable_to', [input.applicableTo]);

    query = query.order('created_at', { ascending: false });

    const { data: templates, error } = await query;

    if (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }

    return templates || [];
  }

  // =====================================================
  // DASHBOARD & ANALYTICS
  // =====================================================

  /**
   * Get evaluation dashboard
   */
  async getEvaluatorDashboard(input: GetEvaluationDashboardInput): Promise<EvaluationDashboard> {
    const { data, error } = await supabase.rpc('get_evaluation_dashboard', {
      p_organization_id: input.organizationId,
      p_campaign_id: input.campaignId,
      p_period_start: input.periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_period_end: input.periodEnd || new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to get evaluation dashboard: ${error.message}`);
    }

    return data as EvaluationDashboard;
  }

  /**
   * Summarize evaluation with GPT-4
   */
  async summarizeEvaluation(input: SummarizeEvaluationInput): Promise<string> {
    const evaluation = await this.getEvaluationById(input.organizationId, input.evaluationId);

    const prompt = `Provide a concise executive summary of this agent evaluation:

**Overall Score:** ${evaluation.overall_score}/100 (Grade: ${evaluation.score_grade})

**Criteria Breakdown:**
${evaluation.criteria_scores.map(c => `- ${EVALUATION_CRITERIA_CONFIGS[c.criteria].label}: ${c.score}/100`).join('\n')}

**Strengths:**
${evaluation.strengths?.map(s => `- ${s}`).join('\n') || 'None noted'}

**Weaknesses:**
${evaluation.weaknesses?.map(w => `- ${w}`).join('\n') || 'None noted'}

**Improvement Suggestions:**
${evaluation.improvement_suggestions?.map(i => `- ${i}`).join('\n') || 'None provided'}

Provide a 2-3 sentence executive summary highlighting the key findings and overall assessment.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at synthesizing performance evaluations into concise executive summaries.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Recommend agent improvements with GPT-4
   */
  async recommendAgentImprovements(input: RecommendImprovementsInput): Promise<ImprovementRecommendations> {
    const evaluation = await this.getEvaluationById(input.organizationId, input.evaluationId);

    const prompt = `Based on this agent evaluation, provide detailed improvement recommendations:

**Current Performance:**
- Overall Score: ${evaluation.overall_score}/100
- Grade: ${evaluation.score_grade}
- Passing: ${evaluation.is_passing ? 'Yes' : 'No'}

**Criteria Performance:**
${evaluation.criteria_scores.map(c => `- ${EVALUATION_CRITERIA_CONFIGS[c.criteria].label}: ${c.score}/100`).join('\n')}

**Identified Weaknesses:**
${evaluation.weaknesses?.map(w => `- ${w}`).join('\n') || 'None identified'}

**Current Suggestions:**
${evaluation.improvement_suggestions?.map(i => `- ${i}`).join('\n') || 'None provided'}

Provide comprehensive improvement recommendations in JSON format:

\`\`\`json
{
  "immediate_actions": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM",
      "category": "<category>",
      "recommendation": "<specific action>",
      "expected_impact": "<impact description>"
    }
  ],
  "skill_development": [
    {
      "skill_area": "<skill name>",
      "current_level": "<assessment>",
      "target_level": "<goal>",
      "development_path": ["<step 1>", "<step 2>", ...]
    }
  ],
  "coaching_focus_areas": ["<area 1>", "<area 2>", ...],
  "suggested_training": ["<training 1>", "<training 2>", ...],
  "recurring_issues": ["<issue 1>", ...],
  "emerging_strengths": ["<strength 1>", ...]
}
\`\`\``;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert agent performance coach specializing in actionable improvement strategies.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const recommendations = JSON.parse(completion.choices[0].message.content || '{}');

    const result: ImprovementRecommendations = {
      evaluation_id: input.evaluationId,
      agent_run_id: evaluation.agent_run_id,
      immediate_actions: recommendations.immediate_actions || [],
      skill_development: recommendations.skill_development || [],
      coaching_focus_areas: recommendations.coaching_focus_areas || [],
      suggested_training: recommendations.suggested_training || [],
      recurring_issues: recommendations.recurring_issues,
      emerging_strengths: recommendations.emerging_strengths,
      generated_at: new Date().toISOString(),
    };

    this.emit('improvements-recommended', result);
    return result;
  }
}

export const agentEvaluatorEngine = new AgentEvaluatorEngine();
