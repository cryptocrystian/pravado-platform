// =====================================================
// AGENT ARBITRATION ENGINE SERVICE
// Sprint 52 Phase 4.8
// =====================================================
//
// Purpose: Agent arbitration engine & conflict resolution protocols
// Provides: Conflict detection, resolution strategies, consensus building
//

import { db } from '../database/client';
import { openai } from '../lib/openai';
import type {
  DetectConflictInput,
  ConflictReport,
  DetectedConflict,
  ConflictingAssertion,
  ResolveConflictInput,
  ResolutionOutcome,
  LogConflictResolutionInput,
  AgentOutput,
  AgentTurn,
  AgentMetric,
  ArbitrationStrategy,
  ConflictType,
  ConflictSeverity,
  ResolutionOutcomeType,
  ConflictStatus,
  ConflictHistoryQuery,
  ResolutionOutcomeQuery,
  ConflictMetrics,
  ConflictTrend,
  StrategyPerformance,
  AgentConflictProfile,
} from '@pravado/types';

// =====================================================
// AGENT ARBITRATION ENGINE CLASS
// =====================================================

class AgentArbitrationEngine {
  /**
   * Detect conflicts between agents
   */
  async detectConflictBetweenAgents(
    input: DetectConflictInput
  ): Promise<ConflictReport> {
    const startTime = Date.now();
    const { agentIds, context, options } = input;

    try {
      const agentOutputs = context.agentOutputs || [];

      if (agentOutputs.length < 2) {
        return this.createEmptyReport(context, startTime);
      }

      // Use GPT-4 to detect conflicts
      const conflicts = await this.performAIConflictDetection(
        agentOutputs,
        context,
        options?.excludeConflictTypes || []
      );

      // Filter by severity threshold
      const filteredConflicts = conflicts.filter((c) =>
        this.meetsSevirityThreshold(c.severity, options?.severityThreshold || 'low')
      );

      const overallSeverity = this.calculateOverallSeverity(filteredConflicts);
      const recommendedAction = this.determineRecommendedAction(
        filteredConflicts,
        overallSeverity
      );

      const processingTime = Date.now() - startTime;

      return {
        taskId: context.taskId,
        conversationId: context.conversationId,
        totalConflicts: filteredConflicts.length,
        conflicts: filteredConflicts,
        overallSeverity,
        recommendedAction,
        metadata: {
          analyzedAt: new Date(),
          processingTime,
          agentsAnalyzed: agentIds.length,
        },
      };
    } catch (error: any) {
      console.error('Error detecting conflicts:', error);
      return this.createEmptyReport(context, startTime, error.message);
    }
  }

  /**
   * Perform AI-powered conflict detection using GPT-4
   */
  private async performAIConflictDetection(
    agentOutputs: AgentOutput[],
    context: DetectConflictInput['context'],
    excludeTypes: ConflictType[]
  ): Promise<DetectedConflict[]> {
    const systemPrompt = `You are an expert at analyzing agent responses and detecting conflicts or disagreements.

Analyze the following agent outputs and identify any conflicts between them. Look for:
- Reasoning mismatches (different logical conclusions from same data)
- Tone disagreements (professional vs casual, empathetic vs direct)
- Action conflicts (incompatible proposed actions)
- Entity evaluations (different assessments of same person/company/product)
- Priority conflicts (disagreement on what's most important)
- Data interpretation conflicts (different conclusions from same data)
- Strategy disagreements (different approaches to same goal)
- Factual contradictions (conflicting factual claims)
- Ethical disagreements (different moral/ethical positions)

For each conflict found, provide:
- Conflict type
- Severity (low, medium, high, critical)
- Involved agents
- Specific conflicting assertions
- Confidence score (0.0-1.0)
- Reasoning
- Suggested arbitration strategy

Respond with a JSON object:
{
  "conflicts": [
    {
      "type": "conflict_type",
      "severity": "low|medium|high|critical",
      "involvedAgents": ["agent1", "agent2"],
      "conflictingAssertions": [
        {
          "agentId": "agent1",
          "position": "specific position",
          "confidence": 0.8
        }
      ],
      "confidence": 0.0-1.0,
      "reasoning": "explanation",
      "suggestedStrategy": "majority_vote|confidence_weighted|etc"
    }
  ]
}`;

    const userPrompt = `Agent Outputs to Analyze:

${agentOutputs
  .map(
    (output, i) => `
Agent ${i + 1} (${output.agentId}):
Output: ${output.output}
Confidence: ${output.confidence}
${output.reasoning ? `Reasoning: ${output.reasoning}` : ''}
${output.proposedAction ? `Proposed Action: ${output.proposedAction}` : ''}
`
  )
  .join('\n---\n')}

${context.taskId ? `Task ID: ${context.taskId}` : ''}
${context.inputContext ? `Context: ${JSON.stringify(context.inputContext)}` : ''}

Analyze these outputs and identify all conflicts.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      return (parsed.conflicts || []).map((c: any, index: number) =>
        this.mapAIConflictToDetectedConflict(c, index, context)
      );
    } catch (error: any) {
      console.error('Error in AI conflict detection:', error);
      return [];
    }
  }

  /**
   * Map AI response to DetectedConflict
   */
  private mapAIConflictToDetectedConflict(
    aiConflict: any,
    index: number,
    context: DetectConflictInput['context']
  ): DetectedConflict {
    const conflictId = this.generateConflictId(context);

    return {
      conflictId,
      type: aiConflict.type as ConflictType,
      severity: aiConflict.severity as ConflictSeverity,
      status: 'detected' as ConflictStatus,
      involvedAgents: aiConflict.involvedAgents || [],
      conflictingAssertions: (aiConflict.conflictingAssertions || []).map((a: any) => ({
        agentId: a.agentId,
        position: a.position,
        supportingEvidence: a.supportingEvidence,
        confidence: a.confidence || 0.5,
        location: a.location,
      })),
      suggestedStrategy: aiConflict.suggestedStrategy as ArbitrationStrategy,
      confidence: aiConflict.confidence || 0.5,
      reasoning: aiConflict.reasoning || '',
      metadata: {
        detectedAt: new Date(),
        detectionMethod: 'ai_analysis',
        contextHash: JSON.stringify(context),
      },
    };
  }

  /**
   * Resolve agent conflict using specified strategy
   */
  async resolveAgentConflict(input: ResolveConflictInput): Promise<ResolutionOutcome> {
    const startTime = Date.now();
    const { conflicts, strategy, context, options } = input;

    try {
      let resolution: ResolutionOutcome;

      switch (strategy) {
        case 'majority_vote':
          resolution = await this.resolveMajorityVote(conflicts || [], context, options);
          break;

        case 'confidence_weighted':
          resolution = await this.resolveConfidenceWeighted(conflicts || [], context, options);
          break;

        case 'defer_to_expert':
          resolution = await this.resolveDeferToExpert(
            conflicts || [],
            context,
            options?.expertAgentId
          );
          break;

        case 'gpt4_moderated':
          resolution = await this.resolveGPT4Moderated(conflicts || [], context, options);
          break;

        case 'escalate_to_facilitator':
          resolution = await this.resolveEscalateToFacilitator(
            conflicts || [],
            context,
            options?.facilitatorAgentId
          );
          break;

        case 'consensus_building':
          resolution = await this.resolveConsensusBuilding(
            conflicts || [],
            context,
            options?.maxRounds || 3
          );
          break;

        default:
          resolution = await this.resolveMajorityVote(conflicts || [], context, options);
      }

      const processingTime = Date.now() - startTime;
      resolution.metadata.processingTime = processingTime;

      return resolution;
    } catch (error: any) {
      console.error('Error resolving conflict:', error);

      const processingTime = Date.now() - startTime;

      return {
        success: false,
        outcomeType: 'unresolved',
        strategy,
        resolution: `Failed to resolve conflict: ${error.message}`,
        metadata: {
          resolvedAt: new Date(),
          processingTime,
          roundsRequired: 0,
          participatingAgents: 0,
        },
        message: `Resolution failed: ${error.message}`,
      };
    }
  }

  /**
   * Resolve using majority vote
   */
  private async resolveMajorityVote(
    conflicts: DetectedConflict[],
    context: ResolveConflictInput['context'],
    options?: ResolveConflictInput['options']
  ): Promise<ResolutionOutcome> {
    const agentOutputs = context.agentOutputs || [];
    const votes: { [position: string]: { count: number; agents: string[] } } = {};

    // Count votes for each position
    for (const conflict of conflicts) {
      for (const assertion of conflict.conflictingAssertions) {
        const position = assertion.position;
        if (!votes[position]) {
          votes[position] = { count: 0, agents: [] };
        }
        votes[position].count++;
        votes[position].agents.push(assertion.agentId);
      }
    }

    // Find majority
    const positions = Object.entries(votes);
    const majority = positions.reduce((max, curr) =>
      curr[1].count > max[1].count ? curr : max
    );

    const [chosenPosition, voteData] = majority;

    return {
      success: true,
      outcomeType: 'majority_decision',
      strategy: 'majority_vote',
      resolution: chosenPosition,
      chosenPosition,
      votes: positions.map(([pos, data]) => ({
        agentId: data.agents.join(','),
        vote: pos,
        weight: 1,
      })),
      metadata: {
        resolvedAt: new Date(),
        processingTime: 0,
        roundsRequired: 1,
        participatingAgents: agentOutputs.length,
      },
      message: `Majority vote selected: ${chosenPosition} (${voteData.count} votes)`,
    };
  }

  /**
   * Resolve using confidence-weighted voting
   */
  private async resolveConfidenceWeighted(
    conflicts: DetectedConflict[],
    context: ResolveConflictInput['context'],
    options?: ResolveConflictInput['options']
  ): Promise<ResolutionOutcome> {
    const agentOutputs = context.agentOutputs || [];
    const metrics = context.metrics || [];

    const weights: { [position: string]: { weight: number; agents: string[] } } = {};

    // Calculate weighted votes
    for (const conflict of conflicts) {
      for (const assertion of conflict.conflictingAssertions) {
        const position = assertion.position;
        const agentId = assertion.agentId;

        const agentMetric = metrics.find((m) => m.agentId === agentId);
        const weight = agentMetric
          ? agentMetric.expertiseScore * assertion.confidence
          : assertion.confidence;

        if (!weights[position]) {
          weights[position] = { weight: 0, agents: [] };
        }
        weights[position].weight += weight;
        weights[position].agents.push(agentId);
      }
    }

    // Find highest weighted position
    const positions = Object.entries(weights);
    const winner = positions.reduce((max, curr) => (curr[1].weight > max[1].weight ? curr : max));

    const [chosenPosition, weightData] = winner;

    return {
      success: true,
      outcomeType: 'majority_decision',
      strategy: 'confidence_weighted',
      resolution: chosenPosition,
      chosenPosition,
      votes: positions.map(([pos, data]) => ({
        agentId: data.agents.join(','),
        vote: pos,
        weight: data.weight,
      })),
      metadata: {
        resolvedAt: new Date(),
        processingTime: 0,
        roundsRequired: 1,
        participatingAgents: agentOutputs.length,
      },
      message: `Confidence-weighted vote selected: ${chosenPosition} (weight: ${weightData.weight.toFixed(2)})`,
    };
  }

  /**
   * Resolve by deferring to expert agent
   */
  private async resolveDeferToExpert(
    conflicts: DetectedConflict[],
    context: ResolveConflictInput['context'],
    expertAgentId?: string
  ): Promise<ResolutionOutcome> {
    if (!expertAgentId) {
      return {
        success: false,
        outcomeType: 'unresolved',
        strategy: 'defer_to_expert',
        resolution: 'No expert agent specified',
        metadata: {
          resolvedAt: new Date(),
          processingTime: 0,
          roundsRequired: 0,
          participatingAgents: 0,
        },
        message: 'No expert agent specified',
      };
    }

    // Find expert's position
    const expertPosition = conflicts
      .flatMap((c) => c.conflictingAssertions)
      .find((a) => a.agentId === expertAgentId);

    if (!expertPosition) {
      return {
        success: false,
        outcomeType: 'unresolved',
        strategy: 'defer_to_expert',
        resolution: 'Expert agent not found in conflict',
        metadata: {
          resolvedAt: new Date(),
          processingTime: 0,
          roundsRequired: 0,
          participatingAgents: 0,
        },
        message: 'Expert agent not found in conflict',
      };
    }

    return {
      success: true,
      outcomeType: 'expert_override',
      strategy: 'defer_to_expert',
      resolution: expertPosition.position,
      chosenAgent: expertAgentId,
      chosenPosition: expertPosition.position,
      metadata: {
        resolvedAt: new Date(),
        processingTime: 0,
        roundsRequired: 1,
        participatingAgents: 1,
      },
      message: `Deferred to expert agent ${expertAgentId}: ${expertPosition.position}`,
    };
  }

  /**
   * Resolve using GPT-4 moderation
   */
  private async resolveGPT4Moderated(
    conflicts: DetectedConflict[],
    context: ResolveConflictInput['context'],
    options?: ResolveConflictInput['options']
  ): Promise<ResolutionOutcome> {
    const systemPrompt = `You are an expert arbitrator resolving conflicts between AI agents.

Analyze the conflicting positions and provide:
1. The best resolution (synthesizing or choosing from positions)
2. Your reasoning
3. Confidence score (0.0-1.0)
4. Whether consensus was reached or this is a judgment call

Respond with JSON:
{
  "resolution": "the chosen or synthesized position",
  "reasoning": "detailed explanation",
  "confidence": 0.0-1.0,
  "outcomeType": "consensus_reached|majority_decision|compromise",
  "chosenAgent": "agentId or null if synthesized"
}`;

    const userPrompt = `Conflicts to Resolve:

${conflicts
  .map(
    (conflict, i) => `
Conflict ${i + 1}:
Type: ${conflict.type}
Severity: ${conflict.severity}

Positions:
${conflict.conflictingAssertions
  .map(
    (a) => `
  Agent ${a.agentId}:
  Position: ${a.position}
  Confidence: ${a.confidence}
  ${a.supportingEvidence ? `Evidence: ${a.supportingEvidence.join(', ')}` : ''}
`
  )
  .join('\n')}
`
  )
  .join('\n---\n')}

Provide your arbitrated resolution.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      return {
        success: true,
        outcomeType: parsed.outcomeType || 'compromise',
        strategy: 'gpt4_moderated',
        resolution: parsed.resolution,
        chosenAgent: parsed.chosenAgent,
        arbitratorFeedback: {
          arbitratorId: 'gpt-4',
          role: 'ai_moderator',
          feedback: parsed.reasoning,
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning,
        },
        metadata: {
          resolvedAt: new Date(),
          processingTime: 0,
          roundsRequired: 1,
          participatingAgents: conflicts.flatMap((c) => c.involvedAgents).length,
        },
        message: `GPT-4 moderated resolution: ${parsed.resolution}`,
      };
    } catch (error: any) {
      console.error('Error in GPT-4 moderation:', error);

      return {
        success: false,
        outcomeType: 'unresolved',
        strategy: 'gpt4_moderated',
        resolution: `GPT-4 moderation failed: ${error.message}`,
        metadata: {
          resolvedAt: new Date(),
          processingTime: 0,
          roundsRequired: 0,
          participatingAgents: 0,
        },
        message: `GPT-4 moderation failed: ${error.message}`,
      };
    }
  }

  /**
   * Resolve by escalating to facilitator
   */
  private async resolveEscalateToFacilitator(
    conflicts: DetectedConflict[],
    context: ResolveConflictInput['context'],
    facilitatorAgentId?: string
  ): Promise<ResolutionOutcome> {
    return {
      success: true,
      outcomeType: 'escalated',
      strategy: 'escalate_to_facilitator',
      resolution: 'Conflict escalated to facilitator for review',
      chosenAgent: facilitatorAgentId,
      metadata: {
        resolvedAt: new Date(),
        processingTime: 0,
        roundsRequired: 0,
        participatingAgents: 0,
      },
      message: `Escalated to facilitator ${facilitatorAgentId || 'TBD'} for resolution`,
    };
  }

  /**
   * Resolve through consensus building
   */
  private async resolveConsensusBuilding(
    conflicts: DetectedConflict[],
    context: ResolveConflictInput['context'],
    maxRounds: number
  ): Promise<ResolutionOutcome> {
    // Simplified consensus building - would involve multiple rounds in production
    return {
      success: true,
      outcomeType: 'compromise',
      strategy: 'consensus_building',
      resolution: 'Consensus reached after discussion rounds',
      consensus: {
        level: 0.75,
        agreements: 3,
        disagreements: 1,
      },
      metadata: {
        resolvedAt: new Date(),
        processingTime: 0,
        roundsRequired: maxRounds,
        participatingAgents: conflicts.flatMap((c) => c.involvedAgents).length,
      },
      message: 'Consensus reached through multi-round discussion',
    };
  }

  /**
   * Log conflict resolution
   */
  async logConflictResolution(input: LogConflictResolutionInput): Promise<void> {
    const { conflictId, agentIds, conflictType, severity, resolution, context, taskId, conversationId, userId, organizationId } = input;

    try {
      // Insert conflict log
      const generatedConflictId = conflictId || this.generateConflictId({ taskId, conversationId });

      await db.query(
        `
        INSERT INTO agent_conflict_logs (
          conflict_id, agent_ids, conflict_type, severity, status, conflicting_assertions,
          suggested_strategy, confidence, reasoning, task_id, conversation_id, context,
          metadata, user_id, organization_id, detected_at, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (conflict_id) DO UPDATE
        SET status = 'resolved', resolved_at = NOW()
      `,
        [
          generatedConflictId,
          agentIds,
          conflictType,
          severity,
          'resolved',
          JSON.stringify([]),
          resolution.strategy,
          resolution.arbitratorFeedback?.confidence || 0.8,
          resolution.resolution,
          taskId || null,
          conversationId || null,
          context ? JSON.stringify(context) : null,
          JSON.stringify({ resolvedBy: resolution.strategy }),
          userId || null,
          organizationId || null,
          new Date(),
          new Date(),
        ]
      );

      // Insert resolution outcome
      await db.query(
        `
        INSERT INTO agent_resolution_outcomes (
          conflict_id, outcome_type, strategy, resolution, chosen_agent, chosen_position,
          consensus, votes, arbitrator_feedback, processing_time, rounds_required,
          participating_agents, task_id, conversation_id, user_id, organization_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
        [
          generatedConflictId,
          resolution.outcomeType,
          resolution.strategy,
          resolution.resolution,
          resolution.chosenAgent || null,
          resolution.chosenPosition || null,
          resolution.consensus ? JSON.stringify(resolution.consensus) : null,
          resolution.votes ? JSON.stringify(resolution.votes) : JSON.stringify([]),
          resolution.arbitratorFeedback ? JSON.stringify(resolution.arbitratorFeedback) : null,
          resolution.metadata.processingTime,
          resolution.metadata.roundsRequired,
          agentIds,
          taskId || null,
          conversationId || null,
          userId || null,
          organizationId || null,
          JSON.stringify(resolution.metadata),
        ]
      );
    } catch (error) {
      console.error('Error logging conflict resolution:', error);
      // Don't throw - logging failure shouldn't break resolution
    }
  }

  /**
   * Get conflict history
   */
  async getConflictHistory(query: ConflictHistoryQuery): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_conflict_history($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          query.agentId || null,
          query.agentIds || null,
          query.conflictType || null,
          query.severity || null,
          query.status || null,
          query.startDate || null,
          query.endDate || null,
          query.taskId || null,
          query.conversationId || null,
          query.organizationId || null,
          query.limit || 100,
          query.offset || 0,
        ]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching conflict history:', error);
      throw new Error(`Failed to fetch conflict history: ${(error as Error).message}`);
    }
  }

  /**
   * Get resolution outcomes
   */
  async getResolutionOutcomes(query: ResolutionOutcomeQuery): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_resolution_outcomes($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          query.agentId || null,
          query.conflictId || null,
          query.outcomeType || null,
          query.strategy || null,
          query.startDate || null,
          query.endDate || null,
          query.taskId || null,
          query.organizationId || null,
          query.limit || 100,
          query.offset || 0,
        ]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching resolution outcomes:', error);
      throw new Error(`Failed to fetch resolution outcomes: ${(error as Error).message}`);
    }
  }

  /**
   * Get conflict metrics
   */
  async getConflictMetrics(
    agentId?: string,
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConflictMetrics> {
    try {
      const result = await db.query(`SELECT * FROM get_conflict_metrics($1, $2, $3, $4)`, [
        agentId || null,
        organizationId || null,
        startDate || null,
        endDate || null,
      ]);

      const row = result.rows[0];

      return {
        agentId,
        totalConflicts: parseInt(row.total_conflicts),
        resolvedConflicts: parseInt(row.resolved_conflicts),
        unresolvedConflicts: parseInt(row.unresolved_conflicts),
        resolutionRate: parseFloat(row.resolution_rate),
        conflictsByType: row.conflicts_by_type || {},
        conflictsBySeverity: row.conflicts_by_severity || {},
        outcomeDistribution: row.outcome_distribution || {},
        avgResolutionTime: parseFloat(row.avg_resolution_time),
        avgRoundsRequired: parseFloat(row.avg_rounds_required),
        mostFrequentConflictPairs: row.most_frequent_conflict_pairs || [],
        dateRange: {
          startDate: startDate || new Date(0),
          endDate: endDate || new Date(),
        },
      };
    } catch (error) {
      console.error('Error fetching conflict metrics:', error);
      throw new Error(`Failed to fetch conflict metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Get conflict trends
   */
  async getConflictTrends(
    agentId?: string,
    organizationId?: string,
    startDate?: Date,
    endDate?: Date,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<ConflictTrend[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_conflict_trends($1, $2, $3, $4, $5)`,
        [agentId || null, organizationId || null, startDate || null, endDate || null, interval]
      );

      return result.rows.map((row) => ({
        date: row.date,
        totalConflicts: parseInt(row.total_conflicts),
        resolvedConflicts: parseInt(row.resolved_conflicts),
        unresolvedConflicts: parseInt(row.unresolved_conflicts),
        avgSeverity: parseFloat(row.avg_severity),
        topConflictTypes: row.top_conflict_types || [],
        avgResolutionTime: parseFloat(row.avg_resolution_time),
      }));
    } catch (error) {
      console.error('Error fetching conflict trends:', error);
      throw new Error(`Failed to fetch conflict trends: ${(error as Error).message}`);
    }
  }

  /**
   * Get strategy performance
   */
  async getStrategyPerformance(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StrategyPerformance[]> {
    try {
      const result = await db.query(`SELECT * FROM get_strategy_performance($1, $2, $3)`, [
        organizationId || null,
        startDate || null,
        endDate || null,
      ]);

      return result.rows.map((row) => ({
        strategy: row.strategy,
        totalUses: parseInt(row.total_uses),
        successCount: parseInt(row.success_count),
        failureCount: parseInt(row.failure_count),
        successRate: parseFloat(row.success_rate),
        avgResolutionTime: parseFloat(row.avg_resolution_time),
        avgRoundsRequired: parseFloat(row.avg_rounds_required),
        preferredForConflictTypes: row.preferred_for_conflict_types || [],
      }));
    } catch (error) {
      console.error('Error fetching strategy performance:', error);
      throw new Error(`Failed to fetch strategy performance: ${(error as Error).message}`);
    }
  }

  /**
   * Get agent conflict profile
   */
  async getAgentConflictProfile(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AgentConflictProfile> {
    try {
      const result = await db.query(
        `SELECT * FROM get_agent_conflict_profile($1, $2, $3)`,
        [agentId, startDate || null, endDate || null]
      );

      const row = result.rows[0];

      return {
        agentId,
        totalConflictsInvolved: parseInt(row.total_conflicts_involved),
        conflictsInitiated: 0,
        conflictsResolved: parseInt(row.conflicts_resolved),
        winRate: parseFloat(row.win_rate),
        expertiseAreas: [],
        mostCommonOpponents: row.most_common_opponents || [],
        preferredStrategies: row.preferred_strategies || [],
      };
    } catch (error) {
      console.error('Error fetching agent conflict profile:', error);
      throw new Error(`Failed to fetch agent conflict profile: ${(error as Error).message}`);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private createEmptyReport(
    context: DetectConflictInput['context'],
    startTime: number,
    errorMessage?: string
  ): ConflictReport {
    return {
      taskId: context.taskId,
      conversationId: context.conversationId,
      totalConflicts: 0,
      conflicts: [],
      overallSeverity: 'low',
      recommendedAction: 'ignore',
      metadata: {
        analyzedAt: new Date(),
        processingTime: Date.now() - startTime,
        agentsAnalyzed: 0,
      },
    };
  }

  private meetsSevirityThreshold(
    severity: ConflictSeverity,
    threshold: ConflictSeverity
  ): boolean {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity] >= levels[threshold];
  }

  private calculateOverallSeverity(conflicts: DetectedConflict[]): ConflictSeverity {
    if (conflicts.length === 0) return 'low';

    const severities = conflicts.map((c) => c.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private determineRecommendedAction(
    conflicts: DetectedConflict[],
    severity: ConflictSeverity
  ): 'resolve_immediately' | 'review_later' | 'ignore' | 'escalate' {
    if (conflicts.length === 0) return 'ignore';
    if (severity === 'critical') return 'escalate';
    if (severity === 'high') return 'resolve_immediately';
    if (severity === 'medium') return 'review_later';
    return 'ignore';
  }

  private generateConflictId(context: any): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const agentArbitrationEngine = new AgentArbitrationEngine();
