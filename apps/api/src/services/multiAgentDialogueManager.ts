// =====================================================
// MULTI-AGENT DIALOGUE MANAGER SERVICE
// Sprint 50 Phase 4.6
// =====================================================
//
// Purpose: Enable structured multi-agent conversations with turn-taking
// Provides: Dialogue management, turn coordination, role-based protocols
//

import { pool } from '../database/db';
import type {
  MultiAgentConversationSession,
  AgentParticipant,
  DialogueTurn,
  DialogueTurnResult,
  DialogueInterruptionEvent,
  TranscriptWithMetadata,
  InitializeDialogueInput,
  TakeTurnInput,
  InterruptDialogueInput,
  ResolveInterruptionInput,
  TurnAssignment,
  SpeakerEligibility,
  DialogueSessionQuery,
  DialogueTurnQuery,
  DialogueAnalytics,
  AgentRoleType,
  TurnTakingStrategy,
  DialogueStatus,
  TurnType,
  InterruptionReason,
} from '@pravado/shared-types';

// =====================================================
// MULTI-AGENT DIALOGUE MANAGER CLASS
// =====================================================

class MultiAgentDialogueManagerService {
  /**
   * Initialize a multi-agent dialogue session
   */
  async initializeDialogue(input: InitializeDialogueInput): Promise<MultiAgentConversationSession> {
    const {
      agentIds,
      context,
      strategy = 'round_robin' as TurnTakingStrategy,
      roles = {},
      objectives = {},
      priorities = {},
      maxTurns,
      timeLimit,
      createdBy,
      organizationId,
    } = input;

    // Validate input
    if (!agentIds || agentIds.length === 0) {
      throw new Error('At least one agent must be specified');
    }

    // Build participants
    const participants: AgentParticipant[] = agentIds.map((agentId, index) => ({
      agentId,
      role: (roles[agentId] as AgentRoleType) || ('contributor' as AgentRoleType),
      permissions: this.getDefaultPermissions(roles[agentId] as AgentRoleType),
      objective: objectives[agentId],
      priority: priorities[agentId] || 5,
      turnsTaken: 0,
    }));

    // Determine turn order based on strategy
    const turnOrder = this.determineTurnOrder(participants, strategy);

    // Create conversation session
    const query = `
      INSERT INTO multi_agent_conversations (
        participants,
        participant_roles,
        participant_priorities,
        context,
        strategy,
        turn_order,
        max_turns,
        time_limit,
        created_by,
        organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const participantRoles: Record<string, AgentRoleType> = {};
    const participantPriorities: Record<string, number> = {};

    participants.forEach((p) => {
      participantRoles[p.agentId] = p.role;
      participantPriorities[p.agentId] = p.priority;
    });

    const values = [
      agentIds,
      JSON.stringify(participantRoles),
      JSON.stringify(participantPriorities),
      JSON.stringify(context),
      strategy,
      turnOrder,
      maxTurns || null,
      timeLimit || null,
      createdBy || null,
      organizationId || null,
    ];

    const result = await pool.query(query, values);
    return this.mapConversationSession(result.rows[0], participants);
  }

  /**
   * Take a turn in the dialogue
   */
  async takeTurn(input: TakeTurnInput): Promise<DialogueTurnResult> {
    const { agentId, sessionId, input: turnInput, turnType, referencedTurns, actions, confidence } = input;

    // Get session
    const session = await this.getSession(sessionId);

    if (session.status !== 'active' as DialogueStatus) {
      throw new Error(`Dialogue session is ${session.status}, cannot take turn`);
    }

    // Check if it's this agent's turn (for strict strategies)
    if (session.strategy === 'round_robin' as TurnTakingStrategy || session.strategy === 'role_priority' as TurnTakingStrategy) {
      const expectedSpeaker = session.currentSpeaker || session.turnOrder[0];
      if (agentId !== expectedSpeaker) {
        throw new Error(`It's not ${agentId}'s turn. Expected: ${expectedSpeaker}`);
      }
    }

    // Check expiry
    if (await this.checkExpiry(sessionId)) {
      await this.expireSession(sessionId);
      throw new Error('Dialogue session has expired');
    }

    // Check max turns
    if (session.metadata.maxTurns && session.metadata.totalTurns >= session.metadata.maxTurns) {
      await this.completeSession(sessionId, 'timeout' as any);
      throw new Error('Maximum turns reached');
    }

    const startTime = Date.now();

    // Generate agent output (mock for now - in real system would call agent service)
    const output = await this.generateAgentOutput(agentId, turnInput, session);

    const processingTime = Date.now() - startTime;

    // Determine next speaker
    const nextSpeaker = await this.getNextSpeaker(sessionId, session.strategy, agentId);

    // Create turn record
    const turnNumber = session.metadata.totalTurns + 1;

    const turnQuery = `
      INSERT INTO multi_agent_turns (
        session_id,
        agent_id,
        turn_number,
        turn_type,
        input,
        output,
        confidence,
        next_speaker,
        actions,
        referenced_turns,
        processing_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const turnValues = [
      sessionId,
      agentId,
      turnNumber,
      turnType || 'statement',
      turnInput,
      output,
      confidence || null,
      nextSpeaker,
      actions ? JSON.stringify(actions) : null,
      referencedTurns || null,
      processingTime,
    ];

    const turnResult = await pool.query(turnQuery, turnValues);
    const turn = this.mapTurn(turnResult.rows[0]);

    // Update current speaker
    await pool.query(
      'UPDATE multi_agent_conversations SET current_speaker = $1 WHERE id = $2',
      [nextSpeaker, sessionId]
    );

    // Check if dialogue should continue
    const shouldContinue = this.shouldContinueDialogue(session, turnNumber + 1);

    return {
      turn,
      nextSpeaker,
      shouldContinue,
      reasoning: this.generateContinuationReasoning(session, turnNumber + 1, shouldContinue),
    };
  }

  /**
   * Get dialogue transcript with metadata
   */
  async getDialogueTranscript(sessionId: string): Promise<TranscriptWithMetadata> {
    // Get session
    const sessionResult = await pool.query(
      'SELECT * FROM multi_agent_conversations WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const sessionRow = sessionResult.rows[0];

    // Build participants
    const participants: AgentParticipant[] = sessionRow.participants.map((agentId: string) => {
      const roles = JSON.parse(sessionRow.participant_roles);
      const priorities = JSON.parse(sessionRow.participant_priorities);

      return {
        agentId,
        role: roles[agentId] as AgentRoleType,
        permissions: this.getDefaultPermissions(roles[agentId] as AgentRoleType),
        priority: priorities[agentId] || 5,
        turnsTaken: 0,
      };
    });

    const session = this.mapConversationSession(sessionRow, participants);

    // Get turns
    const turnsResult = await pool.query(
      'SELECT * FROM multi_agent_turns WHERE session_id = $1 ORDER BY turn_number ASC',
      [sessionId]
    );

    const turns = turnsResult.rows.map((row) => this.mapTurn(row));

    // Get interruptions
    const interruptionsResult = await pool.query(
      'SELECT * FROM dialogue_interruptions WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    const interruptions = interruptionsResult.rows.map((row) => this.mapInterruption(row));

    // Generate summary
    const summary = await this.generateSummary(session, turns, participants);

    return {
      session,
      turns,
      interruptions,
      summary,
    };
  }

  /**
   * Get next speaker based on strategy
   */
  async getNextSpeaker(
    sessionId: string,
    strategy: TurnTakingStrategy,
    currentSpeaker: string
  ): Promise<string | null> {
    switch (strategy) {
      case 'round_robin':
        return this.getNextSpeakerRoundRobin(sessionId);

      case 'role_priority':
        return this.getNextSpeakerRolePriority(sessionId, currentSpeaker);

      case 'confidence_weighted':
        return this.getNextSpeakerConfidenceWeighted(sessionId, currentSpeaker);

      case 'agent_initiated':
      case 'facilitator_directed':
        // For these strategies, return null and let the system/facilitator decide
        return null;

      default:
        return this.getNextSpeakerRoundRobin(sessionId);
    }
  }

  /**
   * Interrupt a dialogue
   */
  async interruptDialogue(input: InterruptDialogueInput): Promise<DialogueInterruptionEvent> {
    const { sessionId, agentId, reason, details } = input;

    const query = `
      INSERT INTO dialogue_interruptions (
        session_id,
        agent_id,
        reason,
        details
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [sessionId, agentId || null, reason, details];

    const result = await pool.query(query, values);
    return this.mapInterruption(result.rows[0]);
  }

  /**
   * Resolve an interruption
   */
  async resolveInterruption(input: ResolveInterruptionInput): Promise<DialogueInterruptionEvent> {
    const { interruptionId, action, newSpeaker, notes } = input;

    const query = `
      UPDATE dialogue_interruptions
      SET resolved = true,
          resolution_action = $1,
          new_speaker = $2,
          resolution_notes = $3,
          resolved_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const values = [action, newSpeaker || null, notes || null, interruptionId];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Interruption not found');
    }

    const interruption = this.mapInterruption(result.rows[0]);

    // If resuming, update session status
    if (action === 'resume') {
      await pool.query(
        'UPDATE multi_agent_conversations SET status = $1, current_speaker = $2 WHERE id = $3',
        ['active', newSpeaker, interruption.sessionId]
      );
    } else if (action === 'terminate') {
      await this.completeSession(interruption.sessionId, 'interrupted' as any);
    }

    return interruption;
  }

  /**
   * Get dialogue analytics
   */
  async getDialogueAnalytics(sessionId: string): Promise<DialogueAnalytics> {
    const result = await pool.query('SELECT * FROM get_dialogue_analytics($1)', [sessionId]);

    const row = result.rows[0];

    return {
      sessionId,
      totalTurns: row.total_turns || 0,
      avgTurnDuration: parseFloat(row.avg_turn_duration) || 0,
      participantStats: row.participant_stats || [],
      turnDistribution: row.turn_distribution || [],
      interruptionCount: parseInt(row.interruption_count) || 0,
      outcome: row.outcome,
      duration: row.duration || 0,
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private getDefaultPermissions(role?: AgentRoleType) {
    const defaultPerms = {
      canSpeak: true,
      canInterrupt: false,
      canPropose: true,
      canVeto: false,
    };

    if (!role) return defaultPerms;

    switch (role) {
      case 'facilitator':
        return { canSpeak: true, canInterrupt: true, canPropose: true, canVeto: false };
      case 'decision_maker':
        return { canSpeak: true, canInterrupt: true, canPropose: true, canVeto: true };
      case 'observer':
        return { canSpeak: false, canInterrupt: false, canPropose: false, canVeto: false };
      case 'expert':
        return { canSpeak: true, canInterrupt: true, canPropose: true, canVeto: false };
      default:
        return defaultPerms;
    }
  }

  private determineTurnOrder(
    participants: AgentParticipant[],
    strategy: TurnTakingStrategy
  ): string[] {
    const sorted = [...participants];

    switch (strategy) {
      case 'role_priority':
        // Sort by role priority then by priority number
        const rolePriority: Record<AgentRoleType, number> = {
          decision_maker: 1,
          facilitator: 2,
          expert: 3,
          contributor: 4,
          reviewer: 5,
          observer: 6,
        };
        sorted.sort((a, b) => {
          const roleA = rolePriority[a.role] || 999;
          const roleB = rolePriority[b.role] || 999;
          if (roleA !== roleB) return roleA - roleB;
          return b.priority - a.priority;
        });
        break;

      case 'confidence_weighted':
        // For initial order, use priority
        sorted.sort((a, b) => b.priority - a.priority);
        break;

      default:
        // Round-robin: use original order or priority
        sorted.sort((a, b) => b.priority - a.priority);
    }

    return sorted.map((p) => p.agentId);
  }

  private async getSession(sessionId: string): Promise<MultiAgentConversationSession> {
    const result = await pool.query('SELECT * FROM multi_agent_conversations WHERE id = $1', [
      sessionId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Session not found');
    }

    const row = result.rows[0];
    const roles = JSON.parse(row.participant_roles);
    const priorities = JSON.parse(row.participant_priorities);

    const participants: AgentParticipant[] = row.participants.map((agentId: string) => ({
      agentId,
      role: roles[agentId] as AgentRoleType,
      permissions: this.getDefaultPermissions(roles[agentId] as AgentRoleType),
      priority: priorities[agentId] || 5,
      turnsTaken: 0,
    }));

    return this.mapConversationSession(row, participants);
  }

  private async checkExpiry(sessionId: string): Promise<boolean> {
    const result = await pool.query('SELECT check_dialogue_expiry($1) as expired', [sessionId]);
    return result.rows[0].expired;
  }

  private async expireSession(sessionId: string): Promise<void> {
    await pool.query(
      'UPDATE multi_agent_conversations SET status = $1, completed_at = NOW() WHERE id = $2',
      ['expired', sessionId]
    );
  }

  private async completeSession(sessionId: string, outcome: any): Promise<void> {
    await pool.query(
      'UPDATE multi_agent_conversations SET status = $1, outcome = $2, completed_at = NOW() WHERE id = $3',
      ['completed', outcome, sessionId]
    );
  }

  private async generateAgentOutput(
    agentId: string,
    input: string,
    session: MultiAgentConversationSession
  ): Promise<string> {
    // Mock implementation - in real system would call agent service with context
    return `Agent ${agentId} responds to: "${input}" in context of ${session.context.topic}`;
  }

  private async getNextSpeakerRoundRobin(sessionId: string): Promise<string> {
    const result = await pool.query('SELECT get_next_speaker_round_robin($1) as next', [
      sessionId,
    ]);
    return result.rows[0].next;
  }

  private async getNextSpeakerRolePriority(
    sessionId: string,
    currentSpeaker: string
  ): Promise<string> {
    // Similar to round-robin but respects role order
    return this.getNextSpeakerRoundRobin(sessionId);
  }

  private async getNextSpeakerConfidenceWeighted(
    sessionId: string,
    currentSpeaker: string
  ): Promise<string> {
    // In real implementation, would analyze recent confidence scores
    // For now, fallback to round-robin
    return this.getNextSpeakerRoundRobin(sessionId);
  }

  private shouldContinueDialogue(
    session: MultiAgentConversationSession,
    nextTurnNumber: number
  ): boolean {
    if (session.metadata.maxTurns && nextTurnNumber > session.metadata.maxTurns) {
      return false;
    }

    // Could add more sophisticated logic here
    return true;
  }

  private generateContinuationReasoning(
    session: MultiAgentConversationSession,
    nextTurnNumber: number,
    shouldContinue: boolean
  ): string {
    if (!shouldContinue) {
      if (session.metadata.maxTurns && nextTurnNumber > session.metadata.maxTurns) {
        return `Maximum turns (${session.metadata.maxTurns}) reached`;
      }
      return 'Dialogue completion criteria met';
    }

    return `Dialogue continuing with ${session.strategy} strategy`;
  }

  private async generateSummary(
    session: MultiAgentConversationSession,
    turns: DialogueTurn[],
    participants: AgentParticipant[]
  ) {
    // Calculate participant stats
    const participantStats = participants.map((p) => {
      const agentTurns = turns.filter((t) => t.agentId === p.agentId);
      const avgConfidence =
        agentTurns.length > 0
          ? agentTurns.reduce((sum, t) => sum + (t.confidence || 0), 0) / agentTurns.length
          : undefined;

      return {
        agentId: p.agentId,
        role: p.role,
        turnCount: agentTurns.length,
        avgConfidence,
      };
    });

    return {
      totalTurns: turns.length,
      participants: participantStats,
      outcome: session.outcome,
      keyDecisions: [], // Could extract from turns
      actionItems: [], // Could extract from turn actions
    };
  }

  private mapConversationSession(
    row: any,
    participants: AgentParticipant[]
  ): MultiAgentConversationSession {
    return {
      id: row.id,
      participants,
      context: JSON.parse(row.context || '{}'),
      strategy: row.strategy as TurnTakingStrategy,
      status: row.status as DialogueStatus,
      outcome: row.outcome,
      currentSpeaker: row.current_speaker,
      turnOrder: row.turn_order,
      metadata: {
        startedAt: row.started_at,
        completedAt: row.completed_at,
        totalTurns: row.total_turns,
        maxTurns: row.max_turns,
        timeLimit: row.time_limit,
      },
      sharedState: JSON.parse(row.shared_state || '{}'),
      createdBy: row.created_by,
      organizationId: row.organization_id,
    };
  }

  private mapTurn(row: any): DialogueTurn {
    return {
      id: row.id,
      sessionId: row.session_id,
      agentId: row.agent_id,
      turnNumber: row.turn_number,
      turnType: row.turn_type as TurnType,
      input: row.input,
      output: row.output,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      metadata: {
        timestamp: row.created_at,
        processingTime: row.processing_time,
        tokensUsed: row.tokens_used,
        referencedTurns: row.referenced_turns,
      },
      nextSpeaker: row.next_speaker,
      actions: row.actions ? JSON.parse(row.actions) : undefined,
    };
  }

  private mapInterruption(row: any): DialogueInterruptionEvent {
    return {
      id: row.id,
      sessionId: row.session_id,
      agentId: row.agent_id,
      reason: row.reason as InterruptionReason,
      details: row.details,
      timestamp: row.created_at,
      resolved: row.resolved,
      resolution: row.resolved
        ? {
            action: row.resolution_action,
            newSpeaker: row.new_speaker,
            notes: row.resolution_notes,
            resolvedAt: row.resolved_at,
          }
        : undefined,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const multiAgentDialogueManager = new MultiAgentDialogueManagerService();
export default multiAgentDialogueManager;
