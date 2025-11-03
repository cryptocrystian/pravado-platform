// =====================================================
// AGENT ESCALATION ORCHESTRATOR SERVICE
// Sprint 51 Phase 4.7
// =====================================================
//
// Purpose: Advanced escalation logic & multi-agent handoff system
// Provides: Escalation chains, adaptive handoff, fallback strategies
//

import { db } from '../database/client';
import type {
  EscalateTaskInput,
  EscalationResult,
  HandoffToAgentInput,
  HandoffResult,
  FallbackToDefaultInput,
  EscalationFallbackResult,
  EscalationPath,
  EscalationPathStep,
  EscalationType,
  EscalationReason,
  EscalationOutcome,
  HandoffMethod,
  FallbackStrategy,
  EscalationHistoryQuery,
  EscalationMetrics,
  EscalationTrend,
  EscalationPathPerformance,
  AgentHandoffStats,
  AgentAvailability,
  AgentSelectionCriteria,
} from '@pravado/shared-types';

// =====================================================
// AGENT ESCALATION ORCHESTRATOR CLASS
// =====================================================

class AgentEscalationOrchestrator {
  /**
   * Escalate a task to another agent
   */
  async escalateTask(input: EscalateTaskInput): Promise<EscalationResult> {
    const startTime = Date.now();
    const { agentId, context, reason, options } = input;

    const failedAttempts: { agentId: string; reason: string; timestamp: Date }[] = [];
    const attemptedAgents: string[] = [agentId];

    try {
      // Find appropriate escalation path
      const escalationPath = await this.findEscalationPath(
        agentId,
        reason,
        options?.escalationType || 'default_chain',
        context.organizationId
      );

      let nextAgent: string | undefined;
      let method: HandoffMethod = 'direct';
      let outcome: EscalationOutcome = 'failed';

      if (escalationPath) {
        // Try escalation path steps
        const result = await this.executeEscalationPath(
          escalationPath,
          agentId,
          context,
          options?.excludeAgents || [],
          options?.maxAttempts || 3
        );

        nextAgent = result.nextAgent;
        method = result.method;
        outcome = result.outcome;
        failedAttempts.push(...result.failedAttempts);
        attemptedAgents.push(...result.attemptedAgents);
      } else {
        // No path found, try direct agent selection
        const agent = await this.findBestAgent({
          requiredSkills: options?.requireSkills,
          excludeAgents: [...(options?.excludeAgents || []), agentId],
          preferredAgents: options?.preferredAgents,
          sortBy: 'success_rate',
        });

        if (agent) {
          nextAgent = agent.agentId;
          method = 'skill_match';
          outcome = 'success';
        } else {
          outcome = 'no_agent_available';
        }
      }

      const processingTime = Date.now() - startTime;

      const escalationResult: EscalationResult = {
        success: !!nextAgent,
        nextAgent,
        method,
        escalationType: options?.escalationType || 'default_chain',
        reason,
        outcome,
        attemptedAgents,
        failedAttempts,
        path: escalationPath?.steps,
        metadata: {
          processingTime,
          retryCount: failedAttempts.length,
          fallbackUsed: false,
        },
        message: this.buildEscalationMessage(outcome, nextAgent),
        timestamp: new Date(),
      };

      // Log escalation event
      await this.logEscalation(
        agentId,
        nextAgent,
        options?.escalationType || 'default_chain',
        reason,
        outcome,
        method,
        attemptedAgents,
        escalationPath?.id,
        context
      );

      return escalationResult;
    } catch (error: any) {
      console.error('Error in escalateTask:', error);

      const processingTime = Date.now() - startTime;

      return {
        success: false,
        method: 'direct',
        escalationType: options?.escalationType || 'default_chain',
        reason,
        outcome: 'failed',
        attemptedAgents,
        failedAttempts,
        metadata: {
          processingTime,
          retryCount: failedAttempts.length,
          fallbackUsed: false,
        },
        message: `Escalation failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute an escalation path
   */
  private async executeEscalationPath(
    path: EscalationPath,
    fromAgentId: string,
    context: EscalateTaskInput['context'],
    excludeAgents: string[],
    maxAttempts: number
  ): Promise<{
    nextAgent?: string;
    method: HandoffMethod;
    outcome: EscalationOutcome;
    attemptedAgents: string[];
    failedAttempts: { agentId: string; reason: string; timestamp: Date }[];
  }> {
    const attemptedAgents: string[] = [];
    const failedAttempts: { agentId: string; reason: string; timestamp: Date }[] = [];

    for (const step of path.steps) {
      if (attemptedAgents.length >= maxAttempts) {
        break;
      }

      // Find agent for this step
      const agent = await this.findAgentForStep(step, excludeAgents);

      if (!agent) {
        failedAttempts.push({
          agentId: 'unknown',
          reason: 'No agent matched step criteria',
          timestamp: new Date(),
        });
        continue;
      }

      attemptedAgents.push(agent.agentId);

      // Check agent availability
      const available = await this.checkAgentAvailability(agent.agentId, step.conditions);

      if (available) {
        return {
          nextAgent: agent.agentId,
          method: step.method,
          outcome: 'success',
          attemptedAgents,
          failedAttempts,
        };
      } else {
        failedAttempts.push({
          agentId: agent.agentId,
          reason: 'Agent not available',
          timestamp: new Date(),
        });
      }
    }

    return {
      method: 'direct',
      outcome: 'no_agent_available',
      attemptedAgents,
      failedAttempts,
    };
  }

  /**
   * Find escalation path
   */
  private async findEscalationPath(
    agentId: string,
    reason: EscalationReason,
    escalationType: EscalationType,
    organizationId?: string
  ): Promise<EscalationPath | null> {
    try {
      const query = `
        SELECT * FROM agent_escalation_paths
        WHERE enabled = true
          AND (organization_id = $1 OR organization_id IS NULL)
          AND (
            trigger_conditions IS NULL OR
            trigger_conditions->>'reason' IS NULL OR
            trigger_conditions->>'reason' @> $2::JSONB
          )
        ORDER BY priority DESC, is_default DESC
        LIMIT 1
      `;

      const result = await db.query(query, [
        organizationId || null,
        JSON.stringify([reason]),
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapPathRow(result.rows[0]);
    } catch (error) {
      console.error('Error finding escalation path:', error);
      return null;
    }
  }

  /**
   * Find agent for escalation path step
   */
  private async findAgentForStep(
    step: EscalationPathStep,
    excludeAgents: string[]
  ): Promise<{ agentId: string } | null> {
    // Direct agent ID
    if (step.targetAgentId) {
      if (!excludeAgents.includes(step.targetAgentId)) {
        return { agentId: step.targetAgentId };
      }
      return null;
    }

    // Find by role or skill
    const criteria: AgentSelectionCriteria = {
      requiredSkills: step.targetSkill ? [step.targetSkill] : step.conditions?.requireSkills,
      preferredRole: step.targetRole,
      minConfidence: step.conditions?.minConfidence,
      maxLoad: step.conditions?.maxLoad,
      excludeAgents,
      sortBy: 'success_rate',
    };

    return await this.findBestAgent(criteria);
  }

  /**
   * Find best agent based on criteria
   */
  private async findBestAgent(
    criteria: AgentSelectionCriteria
  ): Promise<{ agentId: string } | null> {
    try {
      // This is a simplified implementation
      // In production, you'd query actual agent data with skills, roles, etc.

      // For now, return a mock result
      // TODO: Implement actual agent selection logic with skills/roles matching

      return null; // No agent found
    } catch (error) {
      console.error('Error finding best agent:', error);
      return null;
    }
  }

  /**
   * Check agent availability
   */
  private async checkAgentAvailability(
    agentId: string,
    conditions?: EscalationPathStep['conditions']
  ): Promise<boolean> {
    // Simplified availability check
    // In production, you'd check:
    // - Current agent load
    // - Agent status (active/inactive)
    // - Required skills
    // - Confidence score

    return true; // Assume available for now
  }

  /**
   * Handoff task to another agent
   */
  async handoffToAgent(input: HandoffToAgentInput): Promise<HandoffResult> {
    const { fromAgentId, toAgentId, context, reason, preserveMemory, transferOwnership } = input;

    try {
      const handoffId = this.generateHandoffId();

      // Transfer context
      const contextTransferred = await this.transferContext(
        fromAgentId,
        toAgentId,
        context,
        handoffId
      );

      // Preserve memory if requested
      let memoryItemsTransferred = 0;
      if (preserveMemory !== false) {
        memoryItemsTransferred = await this.transferMemory(fromAgentId, toAgentId, context);
      }

      // Build turn note
      const turnNote = `Handed off from ${fromAgentId} to ${toAgentId}${reason ? ` due to: ${reason}` : ''}`;

      // Log the handoff
      await this.logEscalation(
        fromAgentId,
        toAgentId,
        'manual',
        'task_reassignment',
        'success',
        'direct',
        [fromAgentId, toAgentId],
        undefined,
        context
      );

      const result: HandoffResult = {
        success: true,
        fromAgent: fromAgentId,
        toAgent: toAgentId,
        handoffId,
        contextTransferred,
        memoryPreserved: preserveMemory !== false,
        ownershipTransferred: transferOwnership === true,
        turnNote,
        metadata: {
          transferredAt: new Date(),
          contextSize: JSON.stringify(context).length,
          memoryItemsTransferred,
        },
        message: `Successfully handed off task from ${fromAgentId} to ${toAgentId}`,
      };

      return result;
    } catch (error: any) {
      console.error('Error in handoffToAgent:', error);

      return {
        success: false,
        fromAgent: fromAgentId,
        toAgent: toAgentId,
        handoffId: this.generateHandoffId(),
        contextTransferred: false,
        memoryPreserved: false,
        ownershipTransferred: false,
        metadata: {
          transferredAt: new Date(),
          contextSize: 0,
        },
        message: `Handoff failed: ${error.message}`,
      };
    }
  }

  /**
   * Transfer context between agents
   */
  private async transferContext(
    fromAgentId: string,
    toAgentId: string,
    context: HandoffToAgentInput['context'],
    handoffId: string
  ): Promise<boolean> {
    try {
      // Store context transfer record
      // In production, this would write to a context_transfers table
      // For now, we'll just return success

      return true;
    } catch (error) {
      console.error('Error transferring context:', error);
      return false;
    }
  }

  /**
   * Transfer memory between agents
   */
  private async transferMemory(
    fromAgentId: string,
    toAgentId: string,
    context: HandoffToAgentInput['context']
  ): Promise<number> {
    try {
      // This would integrate with the agent memory system from Sprint 43
      // For now, return 0 items transferred

      return 0;
    } catch (error) {
      console.error('Error transferring memory:', error);
      return 0;
    }
  }

  /**
   * Fallback to default escalation targets
   */
  async fallbackToDefault(input: FallbackToDefaultInput): Promise<EscalationFallbackResult> {
    const { agentId, context, strategy, maxRetries } = input;
    const retriedAgents: string[] = [];
    const effectiveStrategy = strategy || 'retry_default';

    try {
      let fallbackAgent: string | undefined;
      let outcome: EscalationOutcome = 'failed';

      switch (effectiveStrategy) {
        case 'retry_default':
          // Get default escalation path
          const defaultPath = await this.getDefaultEscalationPath(context.organizationId);
          if (defaultPath) {
            const result = await this.executeEscalationPath(
              defaultPath,
              agentId,
              context,
              context.failedAgents || [],
              maxRetries || 2
            );
            fallbackAgent = result.nextAgent;
            outcome = result.outcome;
            retriedAgents.push(...result.attemptedAgents);
          }
          break;

        case 'use_last_successful':
          // Find agent with highest success rate for this task type
          fallbackAgent = await this.findLastSuccessfulAgent(agentId, context);
          if (fallbackAgent) {
            outcome = 'success';
            retriedAgents.push(fallbackAgent);
          }
          break;

        case 'escalate_to_human':
          outcome = 'fallback_used';
          break;

        case 'return_to_user':
        case 'queue_for_later':
          outcome = 'partial';
          break;
      }

      const result: EscalationFallbackResult = {
        success: !!fallbackAgent || effectiveStrategy === 'escalate_to_human',
        strategy: effectiveStrategy,
        fallbackAgent,
        outcome,
        retriedAgents,
        userMessage: this.buildFallbackMessage(effectiveStrategy, outcome, fallbackAgent),
        suggestions: this.buildFallbackSuggestions(effectiveStrategy, outcome),
        metadata: {
          retryCount: retriedAgents.length,
          allAgentsFailed: !fallbackAgent && retriedAgents.length > 0,
          queuedForLater: effectiveStrategy === 'queue_for_later',
        },
        timestamp: new Date(),
      };

      // Log fallback event
      await this.logEscalation(
        agentId,
        fallbackAgent,
        'default_chain',
        'error_occurred',
        outcome,
        'direct',
        retriedAgents,
        undefined,
        context
      );

      return result;
    } catch (error: any) {
      console.error('Error in fallbackToDefault:', error);

      return {
        success: false,
        strategy: effectiveStrategy,
        outcome: 'failed',
        retriedAgents,
        userMessage: 'All escalation attempts failed. Please contact support.',
        suggestions: ['Contact support directly', 'Try again later'],
        metadata: {
          retryCount: retriedAgents.length,
          allAgentsFailed: true,
          queuedForLater: false,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get default escalation path
   */
  private async getDefaultEscalationPath(organizationId?: string): Promise<EscalationPath | null> {
    try {
      const result = await db.query(
        `
        SELECT * FROM agent_escalation_paths
        WHERE is_default = true
          AND enabled = true
          AND (organization_id = $1 OR organization_id IS NULL)
        ORDER BY priority DESC
        LIMIT 1
      `,
        [organizationId || null]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapPathRow(result.rows[0]);
    } catch (error) {
      console.error('Error getting default escalation path:', error);
      return null;
    }
  }

  /**
   * Find last successful agent for task type
   */
  private async findLastSuccessfulAgent(
    agentId: string,
    context: FallbackToDefaultInput['context']
  ): Promise<string | undefined> {
    try {
      // This would query agent_playbook_logs to find agents with highest success rate
      // For now, return undefined

      return undefined;
    } catch (error) {
      console.error('Error finding last successful agent:', error);
      return undefined;
    }
  }

  /**
   * Log escalation event
   */
  private async logEscalation(
    fromAgentId: string,
    toAgentId: string | undefined,
    escalationType: EscalationType,
    reason: EscalationReason,
    outcome: EscalationOutcome,
    method: HandoffMethod | undefined,
    attemptedAgents: string[],
    pathId: string | undefined,
    context: any
  ): Promise<void> {
    try {
      await db.query(
        `
        INSERT INTO agent_escalation_logs (
          from_agent_id, to_agent_id, escalation_type, reason, outcome, method,
          attempted_agents, path, context, metadata, user_id, organization_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        [
          fromAgentId,
          toAgentId || null,
          escalationType,
          reason,
          outcome,
          method || null,
          attemptedAgents,
          pathId || null,
          context ? JSON.stringify(context) : null,
          JSON.stringify({ timestamp: new Date() }),
          context?.userId || null,
          context?.organizationId || null,
        ]
      );
    } catch (error) {
      console.error('Error logging escalation:', error);
      // Don't throw - logging failure shouldn't break escalation
    }
  }

  /**
   * Get escalation history
   */
  async getEscalationHistory(query: EscalationHistoryQuery): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_escalation_history($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          query.agentId || null,
          query.fromAgentId || null,
          query.toAgentId || null,
          query.escalationType || null,
          query.reason || null,
          query.outcome || null,
          query.startDate || null,
          query.endDate || null,
          query.organizationId || null,
          query.limit || 100,
          query.offset || 0,
        ]
      );

      return result.rows.map((row) => ({
        ...row,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error fetching escalation history:', error);
      throw new Error(`Failed to fetch escalation history: ${(error as Error).message}`);
    }
  }

  /**
   * Get escalation metrics
   */
  async getEscalationMetrics(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EscalationMetrics> {
    try {
      const result = await db.query(
        `SELECT * FROM get_escalation_metrics($1, $2, $3)`,
        [agentId, startDate, endDate]
      );

      const row = result.rows[0];

      return {
        agentId,
        totalEscalations: parseInt(row.total_escalations),
        successfulEscalations: parseInt(row.successful_escalations),
        failedEscalations: parseInt(row.failed_escalations),
        successRate: parseFloat(row.success_rate),
        escalationsByReason: row.escalations_by_reason || {},
        escalationsByType: row.escalations_by_type || {},
        outcomeDistribution: row.outcome_distribution || {},
        avgProcessingTime: parseFloat(row.avg_processing_time),
        avgRetryCount: parseFloat(row.avg_retry_count),
        topEscalationTargets: row.top_escalation_targets || [],
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      console.error('Error fetching escalation metrics:', error);
      throw new Error(`Failed to fetch escalation metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Get escalation trends
   */
  async getEscalationTrends(
    agentId: string,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<EscalationTrend[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_escalation_trends($1, $2, $3, $4)`,
        [agentId, startDate, endDate, interval]
      );

      return result.rows.map((row) => ({
        date: row.date,
        totalEscalations: parseInt(row.total_escalations),
        successfulEscalations: parseInt(row.successful_escalations),
        failedEscalations: parseInt(row.failed_escalations),
        avgProcessingTime: parseFloat(row.avg_processing_time),
        topReasons: row.top_reasons || [],
      }));
    } catch (error) {
      console.error('Error fetching escalation trends:', error);
      throw new Error(`Failed to fetch escalation trends: ${(error as Error).message}`);
    }
  }

  /**
   * Get escalation path performance
   */
  async getEscalationPathPerformance(
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EscalationPathPerformance[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_escalation_path_performance($1, $2, $3)`,
        [organizationId || null, startDate || null, endDate || null]
      );

      return result.rows.map((row) => ({
        pathId: row.path_id,
        pathName: row.path_name,
        totalUses: parseInt(row.total_uses),
        successCount: parseInt(row.success_count),
        failureCount: parseInt(row.failure_count),
        successRate: parseFloat(row.success_rate),
        avgStepsUsed: parseFloat(row.avg_steps_used),
        avgProcessingTime: parseFloat(row.avg_processing_time),
        commonFailurePoints: [],
      }));
    } catch (error) {
      console.error('Error fetching path performance:', error);
      throw new Error(`Failed to fetch path performance: ${(error as Error).message}`);
    }
  }

  /**
   * Get agent handoff statistics
   */
  async getAgentHandoffStats(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AgentHandoffStats> {
    try {
      const result = await db.query(
        `SELECT * FROM get_agent_handoff_stats($1, $2, $3)`,
        [agentId, startDate, endDate]
      );

      const row = result.rows[0];

      return {
        agentId,
        handoffsReceived: parseInt(row.handoffs_received),
        handoffsGiven: parseInt(row.handoffs_given),
        netHandoffs: parseInt(row.net_handoffs),
        topSourceAgents: row.top_source_agents || [],
        topTargetAgents: row.top_target_agents || [],
        avgContextSize: parseFloat(row.avg_context_size),
        memoryPreservationRate: parseFloat(row.memory_preservation_rate),
      };
    } catch (error) {
      console.error('Error fetching handoff stats:', error);
      throw new Error(`Failed to fetch handoff stats: ${(error as Error).message}`);
    }
  }

  /**
   * Map database row to EscalationPath
   */
  private mapPathRow(row: any): EscalationPath {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      pathType: row.path_type,
      steps: row.steps || [],
      organizationId: row.organization_id,
      triggerConditions: row.trigger_conditions,
      isDefault: row.is_default,
      enabled: row.enabled,
      priority: row.priority,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Generate unique handoff ID
   */
  private generateHandoffId(): string {
    return `handoff_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Build escalation message
   */
  private buildEscalationMessage(outcome: EscalationOutcome, nextAgent?: string): string {
    switch (outcome) {
      case 'success':
        return `Successfully escalated to agent: ${nextAgent}`;
      case 'no_agent_available':
        return 'No suitable agent available for escalation';
      case 'timeout':
        return 'Escalation timed out';
      case 'rejected':
        return 'Escalation was rejected';
      case 'failed':
        return 'Escalation failed';
      default:
        return 'Escalation completed';
    }
  }

  /**
   * Build fallback message
   */
  private buildFallbackMessage(
    strategy: FallbackStrategy,
    outcome: EscalationOutcome,
    fallbackAgent?: string
  ): string {
    if (fallbackAgent) {
      return `Task has been reassigned to agent: ${fallbackAgent}`;
    }

    switch (strategy) {
      case 'escalate_to_human':
        return 'Your request has been escalated to a human representative. Someone will assist you shortly.';
      case 'return_to_user':
        return 'We were unable to process your request automatically. Please try rephrasing or contact support.';
      case 'queue_for_later':
        return 'Your request has been queued and will be processed when an agent becomes available.';
      case 'retry_default':
        return 'We encountered an issue but will retry with alternative agents.';
      default:
        return 'Unable to complete your request at this time.';
    }
  }

  /**
   * Build fallback suggestions
   */
  private buildFallbackSuggestions(strategy: FallbackStrategy, outcome: EscalationOutcome): string[] {
    const suggestions: string[] = [];

    if (outcome === 'no_agent_available') {
      suggestions.push('Try again in a few moments');
      suggestions.push('Simplify your request');
    }

    if (strategy === 'return_to_user') {
      suggestions.push('Rephrase your request');
      suggestions.push('Break down complex tasks into smaller steps');
    }

    if (strategy === 'escalate_to_human') {
      suggestions.push('Wait for human assistance');
      suggestions.push('Check back later for updates');
    }

    return suggestions;
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const agentEscalationOrchestrator = new AgentEscalationOrchestrator();
