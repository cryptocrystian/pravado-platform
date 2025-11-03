// =====================================================
// AGENT SELF-EVALUATOR SERVICE
// Sprint 49 Phase 4.5
// =====================================================
//
// Purpose: Enable agent meta-cognition and self-evaluation
// Provides: Confidence assessment, contradiction detection, self-improvement
//

import { pool } from '../database/db';
import OpenAI from 'openai';
import type {
  ConfidenceAssessment,
  ConfidenceEvaluationInput,
  ContradictionCheckResult,
  ContradictionDetectionInput,
  SelfImprovementPlan,
  SelfImprovementInput,
  AgentSelfEvalLog,
  SelfImprovementSuggestion,
  SelfEvalLogQuery,
  SelfImprovementSuggestionQuery,
  SelfEvalMetrics,
  ConfidenceLevel,
  NextStepAction,
  EvalType,
  ImprovementCategory,
  SpecificChange,
  ConflictingStatement,
} from '@pravado/shared-types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =====================================================
// AGENT SELF-EVALUATOR CLASS
// =====================================================

class AgentSelfEvaluatorService {
  /**
   * Evaluate agent's confidence in a decision
   */
  async evaluateDecisionConfidence(
    input: ConfidenceEvaluationInput
  ): Promise<ConfidenceAssessment> {
    const { agentId, context, priorHistory } = input;

    // Gather relevant data
    const pastSuccessRate = await this.calculateSuccessRate(agentId, context.task);
    const similarTaskHistory = await this.getSimilarTaskCount(agentId, context.task);
    const memoryRelevance = await this.assessMemoryRelevance(agentId, context.task);
    const contextCompleteness = this.assessContextCompleteness(context);

    // Calculate weighted confidence score
    const confidenceScore = this.calculateConfidenceScore({
      pastSuccessRate,
      similarTaskHistory,
      memoryRelevance,
      contextCompleteness,
    });

    // Determine confidence level
    const confidenceLevel = this.getConfidenceLevel(confidenceScore);

    // Determine suggested next step
    const suggestedNextStep = this.determineSuggestedAction(
      confidenceScore,
      contextCompleteness,
      similarTaskHistory
    );

    // Generate reasons
    const reasonsForLowConfidence: string[] = [];
    const reasonsForHighConfidence: string[] = [];

    if (pastSuccessRate < 0.5) {
      reasonsForLowConfidence.push(`Low historical success rate (${(pastSuccessRate * 100).toFixed(1)}%)`);
    } else if (pastSuccessRate > 0.8) {
      reasonsForHighConfidence.push(`Strong historical success rate (${(pastSuccessRate * 100).toFixed(1)}%)`);
    }

    if (similarTaskHistory < 3) {
      reasonsForLowConfidence.push(`Limited experience with similar tasks (${similarTaskHistory} occurrences)`);
    } else if (similarTaskHistory > 10) {
      reasonsForHighConfidence.push(`Extensive experience with similar tasks (${similarTaskHistory} occurrences)`);
    }

    if (memoryRelevance < 0.3) {
      reasonsForLowConfidence.push('Low relevance of agent memory to current task');
    } else if (memoryRelevance > 0.7) {
      reasonsForHighConfidence.push('Highly relevant agent memory available');
    }

    if (contextCompleteness < 0.5) {
      reasonsForLowConfidence.push('Incomplete context information');
    } else if (contextCompleteness > 0.8) {
      reasonsForHighConfidence.push('Complete and detailed context');
    }

    // Generate analysis
    const analysis = this.generateConfidenceAnalysis({
      confidenceScore,
      confidenceLevel,
      pastSuccessRate,
      similarTaskHistory,
      memoryRelevance,
      contextCompleteness,
      suggestedNextStep,
    });

    const assessment: ConfidenceAssessment = {
      confidenceScore,
      confidenceLevel,
      reasonsForLowConfidence,
      reasonsForHighConfidence,
      suggestedNextStep,
      dataPoints: {
        pastSuccessRate,
        similarTaskHistory,
        memoryRelevance,
        contextCompleteness,
      },
      analysis,
      timestamp: new Date(),
    };

    // Log the evaluation
    await this.logEvaluation({
      agentId,
      evalType: 'confidence' as EvalType,
      context: context as any,
      result: assessment,
      confidenceScore,
      suggestedAction: suggestedNextStep,
      conversationId: context.conversationId,
      userId: context.userId,
    });

    return assessment;
  }

  /**
   * Detect contradictions in agent responses
   */
  async detectContradictions(
    input: ContradictionDetectionInput
  ): Promise<ContradictionCheckResult> {
    const { agentId, context } = input;
    const lookbackDays = context.lookbackDays || 7;

    // Get recent messages and memory
    const recentData = await this.getRecentAgentData(
      agentId,
      context.conversationId,
      lookbackDays
    );

    // Use GPT-4 to detect contradictions
    const contradictionAnalysis = await this.analyzeForContradictions(
      context.currentTask,
      recentData
    );

    const result: ContradictionCheckResult = {
      hasContradictions: contradictionAnalysis.conflictingStatements.length > 0,
      conflictingStatements: contradictionAnalysis.conflictingStatements,
      memoryReferences: contradictionAnalysis.memoryReferences,
      resolutionSuggestion: contradictionAnalysis.resolutionSuggestion,
      severity: contradictionAnalysis.severity,
      detectedAt: new Date(),
    };

    // Log the evaluation
    await this.logEvaluation({
      agentId,
      evalType: 'contradiction' as EvalType,
      context: context as any,
      result: result,
      conversationId: context.conversationId,
    });

    return result;
  }

  /**
   * Generate self-improvement proposal
   */
  async generateSelfImprovementProposal(
    input: SelfImprovementInput
  ): Promise<SelfImprovementPlan> {
    const { agentId, taskOutcome, context, includeHistory = true } = input;

    // Gather context
    let historicalData = null;
    if (includeHistory) {
      historicalData = await this.getAgentPerformanceHistory(agentId);
    }

    // Build GPT-4 prompt
    const prompt = this.buildImprovementPrompt(taskOutcome, context, historicalData);

    // Generate improvement proposal with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI agent self-improvement specialist. Analyze agent performance and generate specific, actionable improvement suggestions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    try {
      const parsedPlan = JSON.parse(responseText);

      // Save the improvement plan
      const savedPlan = await this.saveSelfImprovementPlan({
        agentId,
        category: parsedPlan.category as ImprovementCategory,
        summary: parsedPlan.summary,
        issueDetected: parsedPlan.issueDetected,
        recommendedAction: parsedPlan.recommendedAction,
        specificChanges: parsedPlan.specificChanges,
        confidenceLevel: parsedPlan.confidenceLevel || 0.7,
        relatedMemoryLinks: parsedPlan.relatedMemoryLinks || [],
        relatedFeedbackIds: parsedPlan.relatedFeedbackIds || [],
        priority: parsedPlan.priority || 'medium',
        estimatedImpact: parsedPlan.estimatedImpact || {},
      });

      return savedPlan;
    } catch (error) {
      console.error('Error parsing GPT-4 improvement plan:', error);
      throw new Error('Failed to generate improvement plan');
    }
  }

  /**
   * Get evaluation logs for an agent
   */
  async getEvaluationLogs(query: SelfEvalLogQuery): Promise<AgentSelfEvalLog[]> {
    let sql = 'SELECT * FROM agent_self_eval_logs WHERE agent_id = $1';
    const params: any[] = [query.agentId];
    let paramIndex = 2;

    if (query.evalType) {
      sql += ` AND eval_type = $${paramIndex}`;
      params.push(query.evalType);
      paramIndex++;
    }

    if (query.startDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(query.startDate);
      paramIndex++;
    }

    if (query.endDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(query.endDate);
      paramIndex++;
    }

    if (query.minConfidence !== undefined) {
      sql += ` AND confidence_score >= $${paramIndex}`;
      params.push(query.minConfidence);
      paramIndex++;
    }

    if (query.maxConfidence !== undefined) {
      sql += ` AND confidence_score <= $${paramIndex}`;
      params.push(query.maxConfidence);
      paramIndex++;
    }

    if (query.suggestedAction) {
      sql += ` AND suggested_action = $${paramIndex}`;
      params.push(query.suggestedAction);
      paramIndex++;
    }

    sql += ' ORDER BY created_at DESC';
    sql += ` LIMIT ${query.limit || 50}`;

    if (query.offset) {
      sql += ` OFFSET ${query.offset}`;
    }

    const result = await pool.query(sql, params);
    return result.rows.map((row) => this.mapEvalLog(row));
  }

  /**
   * Get improvement suggestions for an agent
   */
  async getImprovementSuggestions(
    query: SelfImprovementSuggestionQuery
  ): Promise<SelfImprovementSuggestion[]> {
    let sql = 'SELECT * FROM agent_self_improvement_suggestions WHERE agent_id = $1';
    const params: any[] = [query.agentId];
    let paramIndex = 2;

    if (query.category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(query.category);
      paramIndex++;
    }

    if (query.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }

    if (query.priority) {
      sql += ` AND priority = $${paramIndex}`;
      params.push(query.priority);
      paramIndex++;
    }

    if (query.minConfidence !== undefined) {
      sql += ` AND confidence_level >= $${paramIndex}`;
      params.push(query.minConfidence);
      paramIndex++;
    }

    if (query.startDate) {
      sql += ` AND generated_at >= $${paramIndex}`;
      params.push(query.startDate);
      paramIndex++;
    }

    if (query.endDate) {
      sql += ` AND generated_at <= $${paramIndex}`;
      params.push(query.endDate);
      paramIndex++;
    }

    sql += ' ORDER BY generated_at DESC';
    sql += ` LIMIT ${query.limit || 50}`;

    if (query.offset) {
      sql += ` OFFSET ${query.offset}`;
    }

    const result = await pool.query(sql, params);
    return result.rows.map((row) => this.mapImprovementSuggestion(row));
  }

  /**
   * Get self-evaluation metrics
   */
  async getSelfEvalMetrics(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SelfEvalMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const result = await pool.query(
      'SELECT * FROM get_self_eval_metrics($1, $2, $3)',
      [agentId, start, end]
    );

    const row = result.rows[0];

    return {
      agentId,
      totalEvaluations: parseInt(row.total_evaluations) || 0,
      avgConfidenceScore: parseFloat(row.avg_confidence_score) || 0,
      evaluationsByType: row.evaluations_by_type || {},
      actionSuggestions: row.action_suggestions || {},
      contradictionsDetected: parseInt(row.contradictions_detected) || 0,
      improvementSuggestionsGenerated: parseInt(row.improvement_suggestions_generated) || 0,
      improvementSuggestionsApplied: parseInt(row.improvement_suggestions_applied) || 0,
      dateRange: { startDate: start, endDate: end },
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async calculateSuccessRate(agentId: string, task: string): Promise<number> {
    // Mock implementation - in real system, would query playbook execution history
    // For now, return a random value between 0.4 and 0.9
    return 0.6 + Math.random() * 0.3;
  }

  private async getSimilarTaskCount(agentId: string, task: string): Promise<number> {
    // Mock implementation - would query similar task history
    return Math.floor(Math.random() * 15) + 1;
  }

  private async assessMemoryRelevance(agentId: string, task: string): Promise<number> {
    // Mock implementation - would query agent memory and calculate relevance
    return 0.3 + Math.random() * 0.6;
  }

  private assessContextCompleteness(context: any): number {
    let completeness = 0;
    const fields = ['task', 'userId', 'conversationId', 'currentStep', 'additionalContext'];

    fields.forEach((field) => {
      if (context[field]) completeness += 0.2;
    });

    return Math.min(completeness, 1.0);
  }

  private calculateConfidenceScore(dataPoints: {
    pastSuccessRate: number;
    similarTaskHistory: number;
    memoryRelevance: number;
    contextCompleteness: number;
  }): number {
    // Weighted calculation
    const weights = {
      pastSuccessRate: 0.35,
      similarTaskHistory: 0.25,
      memoryRelevance: 0.25,
      contextCompleteness: 0.15,
    };

    // Normalize similarTaskHistory (cap at 20)
    const normalizedTaskHistory = Math.min(dataPoints.similarTaskHistory / 20, 1.0);

    const score =
      dataPoints.pastSuccessRate * weights.pastSuccessRate +
      normalizedTaskHistory * weights.similarTaskHistory +
      dataPoints.memoryRelevance * weights.memoryRelevance +
      dataPoints.contextCompleteness * weights.contextCompleteness;

    return Math.max(0, Math.min(1, score));
  }

  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score < 0.3) return 'very_low' as ConfidenceLevel;
    if (score < 0.5) return 'low' as ConfidenceLevel;
    if (score < 0.7) return 'medium' as ConfidenceLevel;
    if (score < 0.85) return 'high' as ConfidenceLevel;
    return 'very_high' as ConfidenceLevel;
  }

  private determineSuggestedAction(
    confidenceScore: number,
    contextCompleteness: number,
    similarTaskHistory: number
  ): NextStepAction {
    if (confidenceScore < 0.3) {
      return 'escalate' as NextStepAction;
    }

    if (confidenceScore < 0.5) {
      if (contextCompleteness < 0.5) {
        return 'seek_clarification' as NextStepAction;
      }
      if (similarTaskHistory < 3) {
        return 'collaborate' as NextStepAction;
      }
      return 'consult_memory' as NextStepAction;
    }

    if (confidenceScore < 0.7) {
      return 'retry' as NextStepAction;
    }

    return 'proceed' as NextStepAction;
  }

  private generateConfidenceAnalysis(data: any): string {
    const { confidenceScore, confidenceLevel, suggestedNextStep } = data;

    let analysis = `Confidence level: ${confidenceLevel} (${(confidenceScore * 100).toFixed(1)}%). `;

    if (confidenceScore >= 0.7) {
      analysis += 'Agent has strong confidence to proceed with this task based on past experience and available context.';
    } else if (confidenceScore >= 0.5) {
      analysis += 'Agent has moderate confidence. Proceeding with caution is recommended.';
    } else if (confidenceScore >= 0.3) {
      analysis += 'Agent has low confidence. Additional support or clarification recommended before proceeding.';
    } else {
      analysis += 'Agent has very low confidence. Escalation or collaboration strongly recommended.';
    }

    analysis += ` Suggested action: ${suggestedNextStep}.`;

    return analysis;
  }

  private async getRecentAgentData(
    agentId: string,
    conversationId?: string,
    lookbackDays: number = 7
  ): Promise<any> {
    // Mock implementation - would query agent messages and memory
    return {
      messages: [],
      memories: [],
    };
  }

  private async analyzeForContradictions(
    currentTask: string,
    recentData: any
  ): Promise<any> {
    // Use GPT-4 to detect contradictions
    const prompt = `
Analyze the following task and recent agent data for contradictions:

Current Task: ${currentTask}

Recent Data: ${JSON.stringify(recentData, null, 2)}

Identify any contradictory statements, conflicting information, or logical inconsistencies.

Return a JSON object with this structure:
{
  "conflictingStatements": [
    {
      "statement1": "...",
      "statement2": "...",
      "source1": "...",
      "source2": "...",
      "conflictType": "factual|logical|temporal|contextual",
      "confidence": 0.8
    }
  ],
  "memoryReferences": [],
  "resolutionSuggestion": "...",
  "severity": "low|medium|high|critical"
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a contradiction detection specialist. Identify inconsistencies and conflicts in agent responses.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error detecting contradictions:', error);
      return {
        conflictingStatements: [],
        memoryReferences: [],
        resolutionSuggestion: 'Unable to analyze for contradictions',
        severity: 'low',
      };
    }
  }

  private async getAgentPerformanceHistory(agentId: string): Promise<any> {
    // Mock implementation - would query agent performance metrics
    return {
      totalTasks: 100,
      successRate: 0.75,
      commonFailures: [],
    };
  }

  private buildImprovementPrompt(
    taskOutcome: string,
    context: any,
    historicalData: any
  ): string {
    return `
Analyze the following agent task outcome and suggest specific improvements:

Task Outcome: ${taskOutcome}

Context:
- Task: ${context.task}
- What Happened: ${context.what_happened}
${context.expected_result ? `- Expected: ${context.expected_result}` : ''}
${context.actual_result ? `- Actual: ${context.actual_result}` : ''}

${historicalData ? `Historical Performance:
- Total Tasks: ${historicalData.totalTasks}
- Success Rate: ${(historicalData.successRate * 100).toFixed(1)}%
` : ''}

Generate a self-improvement plan in this JSON format:
{
  "category": "tone|accuracy|decision_making|memory_recall|collaboration|clarification|knowledge_gap|reasoning",
  "summary": "Brief summary of the issue",
  "issueDetected": "Detailed description of what went wrong",
  "recommendedAction": "Specific action to take",
  "specificChanges": [
    {
      "type": "prompt_adjustment|memory_update|behavior_modifier|clarification_rule|escalation_trigger",
      "target": "What to change",
      "currentApproach": "Current method (if applicable)",
      "proposedApproach": "New method",
      "rationale": "Why this will help",
      "confidence": 0.8
    }
  ],
  "confidenceLevel": 0.75,
  "relatedMemoryLinks": [],
  "relatedFeedbackIds": [],
  "priority": "low|medium|high|critical",
  "estimatedImpact": {
    "expectedImprovement": "Description of expected benefit",
    "affectedScenarios": ["scenario1", "scenario2"]
  }
}

Focus on:
1. Small, actionable changes
2. Specific behavioral adjustments
3. Measurable improvements
4. High-confidence recommendations (>0.6)
`.trim();
  }

  private async logEvaluation(logData: {
    agentId: string;
    evalType: EvalType;
    context: any;
    result: any;
    confidenceScore?: number;
    suggestedAction?: NextStepAction;
    conversationId?: string;
    userId?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO agent_self_eval_logs (
        agent_id, eval_type, context, result,
        confidence_score, suggested_action,
        conversation_id, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      logData.agentId,
      logData.evalType,
      JSON.stringify(logData.context),
      JSON.stringify(logData.result),
      logData.confidenceScore || null,
      logData.suggestedAction || null,
      logData.conversationId || null,
      logData.userId || null,
    ];

    await pool.query(query, values);
  }

  private async saveSelfImprovementPlan(
    plan: Omit<SelfImprovementPlan, 'id' | 'generatedAt' | 'status'>
  ): Promise<SelfImprovementPlan> {
    const query = `
      INSERT INTO agent_self_improvement_suggestions (
        agent_id, category, summary, issue_detected,
        recommended_action, specific_changes, confidence_level,
        related_memory_links, related_feedback_ids, priority,
        estimated_impact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      plan.agentId,
      plan.category,
      plan.summary,
      plan.issueDetected,
      plan.recommendedAction,
      JSON.stringify(plan.specificChanges),
      plan.confidenceLevel,
      plan.relatedMemoryLinks,
      plan.relatedFeedbackIds,
      plan.priority,
      JSON.stringify(plan.estimatedImpact),
    ];

    const result = await pool.query(query, values);
    return this.mapImprovementSuggestion(result.rows[0]);
  }

  private mapEvalLog(row: any): AgentSelfEvalLog {
    return {
      id: row.id,
      agentId: row.agent_id,
      evalType: row.eval_type as EvalType,
      context: row.context,
      result: row.result,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      suggestedAction: row.suggested_action as NextStepAction,
      playbookExecutionId: row.playbook_execution_id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapImprovementSuggestion(row: any): SelfImprovementSuggestion {
    return {
      id: row.id,
      agentId: row.agent_id,
      category: row.category as ImprovementCategory,
      summary: row.summary,
      issueDetected: row.issue_detected,
      recommendedAction: row.recommended_action,
      specificChanges: JSON.parse(row.specific_changes || '[]'),
      confidenceLevel: parseFloat(row.confidence_level),
      relatedMemoryLinks: row.related_memory_links || [],
      relatedFeedbackIds: row.related_feedback_ids || [],
      relatedEvalLogId: row.related_eval_log_id,
      priority: row.priority,
      status: row.status,
      estimatedImpact: JSON.parse(row.estimated_impact || '{}'),
      generatedAt: row.generated_at,
      appliedAt: row.applied_at,
      rejectedAt: row.rejected_at,
      reviewedBy: row.reviewed_by,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const agentSelfEvaluator = new AgentSelfEvaluatorService();
export default agentSelfEvaluator;
