// =====================================================
// AGENT PLAYBOOK SYNC ENGINE
// Sprint 53 Phase 4.9
// =====================================================

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import type {
  SyncAgentWithPlaybookInput,
  DetectDriftInput,
  AutoCorrectDriftInput,
  SyncResult,
  DriftReport,
  DriftItem,
  CorrectionResult,
  PlaybookMapping,
  AppliedChange,
  FailedMapping,
  SyncLogQuery,
  DriftLogQuery,
  DriftMetrics,
  SyncMetrics,
  Playbook,
  PlaybookRule,
  DriftType,
  DriftSeverity,
  CorrectionType,
  SyncStatus,
  PlaybookMappingSource,
  BehaviorAlignment,
} from '@pravado/shared-types';
import { db } from '../database';

/**
 * Agent Playbook Sync Engine
 *
 * Enables agents to align with organization-level knowledge sources and playbooks
 * in real time — synchronizing behavior, updating memory, and correcting drift.
 */
class AgentPlaybookSyncEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // =====================================================
  // CORE METHODS
  // =====================================================

  /**
   * Sync agent with playbook
   * Maps playbook rules to agent memory + behavior modifiers
   */
  async syncAgentWithPlaybook(
    input: SyncAgentWithPlaybookInput
  ): Promise<SyncResult> {
    const {
      agentId,
      playbookId,
      organizationId,
      options = {},
      context = {},
    } = input;

    const startTime = Date.now();
    const syncId = uuidv4();

    try {
      // Fetch playbook
      const playbook = await this.getPlaybookById(playbookId, organizationId);
      if (!playbook) {
        throw new Error(`Playbook ${playbookId} not found`);
      }

      // Fetch agent
      const agent = await this.getAgentById(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Filter rules if selective sync
      let rulesToSync = playbook.rules;
      if (options.selectiveSync && options.selectiveSync.length > 0) {
        rulesToSync = playbook.rules.filter((r) =>
          options.selectiveSync!.includes(r.ruleId)
        );
      }

      // Generate mappings
      const mappings: PlaybookMapping[] = [];
      const appliedChanges: AppliedChange[] = [];
      const failedMappings: FailedMapping[] = [];

      for (const rule of rulesToSync) {
        try {
          const mapping = await this.createPlaybookMapping(
            agent,
            rule,
            playbookId,
            organizationId,
            options.forceSync || false,
            options.preserveCustomizations || false
          );

          mappings.push(mapping);

          // Apply the change if not dry run
          if (!options.dryRun) {
            const change = await this.applyMappingToAgent(
              agentId,
              mapping,
              syncId
            );
            appliedChanges.push(change);
          }
        } catch (error: any) {
          failedMappings.push({
            playbookRuleId: rule.ruleId,
            ruleName: rule.name,
            reason: error.message,
            error: error.toString(),
            attemptedAt: new Date(),
          });
        }
      }

      // Calculate overall confidence
      const confidence =
        mappings.length > 0
          ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
          : 0;

      // Determine status
      let status: SyncStatus = 'completed';
      if (failedMappings.length === rulesToSync.length) {
        status = 'failed';
      } else if (failedMappings.length > 0) {
        status = 'partial';
      }

      const summary = this.generateSyncSummary(
        mappings,
        appliedChanges,
        failedMappings,
        playbook.name
      );

      const processingTime = Date.now() - startTime;

      const result: SyncResult = {
        success: status !== 'failed',
        status,
        agentId,
        playbookId,
        syncedAt: new Date(),
        mappings,
        appliedChanges,
        failedMappings: failedMappings.length > 0 ? failedMappings : undefined,
        summary,
        confidence,
        metadata: {
          source: 'organization_playbook' as PlaybookMappingSource,
          processingTime,
          rulesApplied: appliedChanges.length,
          knowledgeInjected: appliedChanges.filter((c) =>
            c.changeType === 'knowledge_injection'
          ).length,
          behaviorsUpdated: appliedChanges.filter((c) =>
            c.changeType === 'behavior_modifier'
          ).length,
        },
      };

      // Log the sync (if not dry run)
      if (!options.dryRun) {
        await this.logSyncOperation(syncId, result, organizationId, context);
      }

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      const failedResult: SyncResult = {
        success: false,
        status: 'failed',
        agentId,
        playbookId,
        syncedAt: new Date(),
        mappings: [],
        appliedChanges: [],
        summary: `Sync failed: ${error.message}`,
        confidence: 0,
        metadata: {
          source: 'organization_playbook' as PlaybookMappingSource,
          processingTime,
          rulesApplied: 0,
          knowledgeInjected: 0,
          behaviorsUpdated: 0,
        },
      };

      // Log the failed sync
      await this.logSyncOperation(syncId, failedResult, organizationId, context);

      throw error;
    }
  }

  /**
   * Detect drift from playbook
   * Analyzes deviations using GPT-4 pattern matching
   */
  async detectDriftFromPlaybook(
    input: DetectDriftInput
  ): Promise<DriftReport> {
    const {
      agentId,
      playbookId,
      organizationId,
      options = {},
      context = {},
    } = input;

    try {
      // Fetch agent
      const agent = await this.getAgentById(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Fetch playbook if specified
      let playbook: Playbook | null = null;
      if (playbookId) {
        playbook = await this.getPlaybookById(playbookId, organizationId);
      } else {
        // Get the most recently synced playbook for this agent
        playbook = await this.getLastSyncedPlaybook(agentId, organizationId);
      }

      if (!playbook) {
        throw new Error('No playbook found for drift detection');
      }

      // Get recent agent activity for drift analysis
      const recentActivity = await this.getRecentAgentActivity(
        agentId,
        options.timeRange
      );

      // Use GPT-4 to detect drift
      const driftItems = await this.performAIDriftDetection(
        agent,
        playbook,
        recentActivity,
        options.excludeDriftTypes || [],
        options.includeEvidence || false
      );

      // Filter by severity threshold
      const filteredDriftItems = driftItems.filter((item) =>
        this.meetsSevirityThreshold(
          item.severity,
          options.severityThreshold || 'low'
        )
      );

      // Calculate overall severity
      const overallSeverity = this.calculateOverallSeverity(filteredDriftItems);

      // Generate recommended actions
      const recommendedActions = this.generateRecommendedActions(
        filteredDriftItems
      );

      const summary = this.generateDriftSummary(
        filteredDriftItems,
        overallSeverity,
        playbook.name
      );

      const report: DriftReport = {
        agentId,
        playbookId: playbook.playbookId,
        totalDriftItems: filteredDriftItems.length,
        overallSeverity,
        driftItems: filteredDriftItems,
        summary,
        recommendedActions,
        detectedAt: new Date(),
        context: {
          taskId: context.taskId,
          conversationId: context.conversationId,
          organizationId,
          timeRange: options.timeRange,
        },
      };

      // Log the drift detection
      await this.logDriftDetection(report, organizationId);

      return report;
    } catch (error: any) {
      console.error('Error detecting drift:', error);
      throw error;
    }
  }

  /**
   * Auto-correct drift
   * Adjusts memory, personality, and modifiers to realign with playbooks
   */
  async autoCorrectDrift(
    input: AutoCorrectDriftInput
  ): Promise<CorrectionResult> {
    const {
      agentId,
      driftItems: providedDriftItems,
      playbookId,
      organizationId,
      options = {},
      context = {},
    } = input;

    const startTime = Date.now();

    try {
      // Get drift items (either provided or detect them)
      let driftItems = providedDriftItems;
      if (!driftItems || driftItems.length === 0) {
        const driftReport = await this.detectDriftFromPlaybook({
          agentId,
          playbookId,
          organizationId,
          options: {
            severityThreshold: options.severityThreshold,
          },
          context,
        });
        driftItems = driftReport.driftItems;
      }

      // Filter by severity threshold
      const itemsToCorrect = driftItems.filter((item) =>
        this.meetsSevirityThreshold(
          item.severity,
          options.severityThreshold || 'low'
        )
      );

      // Limit corrections if specified
      const limitedItems = options.maxCorrections
        ? itemsToCorrect.slice(0, options.maxCorrections)
        : itemsToCorrect;

      // Measure alignment before corrections
      const beforeAlignment = await this.measureAgentAlignment(
        agentId,
        playbookId || undefined
      );

      // Apply corrections
      const appliedCorrections: CorrectionResult['appliedCorrections'] = [];
      let memoryUpdates = 0;
      let personalityAdjustments = 0;
      let behaviorModifiers = 0;

      for (const driftItem of limitedItems) {
        if (!driftItem.suggestedCorrection) {
          continue;
        }

        const correctionId = uuidv4();
        const correctionType = driftItem.suggestedCorrection.type;

        try {
          if (!options.dryRun && options.autoApply !== false) {
            await this.applyCorrectionToAgent(
              agentId,
              driftItem,
              driftItem.suggestedCorrection
            );

            // Track correction type
            if (correctionType === 'memory_update') memoryUpdates++;
            if (correctionType === 'personality_adjustment') personalityAdjustments++;
            if (correctionType === 'behavior_modifier') behaviorModifiers++;
          }

          appliedCorrections.push({
            correctionId,
            type: correctionType,
            success: true,
            appliedAt: new Date(),
          });
        } catch (error: any) {
          appliedCorrections.push({
            correctionId,
            type: correctionType,
            success: false,
            error: error.message,
            appliedAt: new Date(),
          });
        }
      }

      // Measure alignment after corrections
      const afterAlignment = await this.measureAgentAlignment(
        agentId,
        playbookId || undefined
      );

      const correctionsApplied = appliedCorrections.filter((c) => c.success).length;
      const correctionsFailed = appliedCorrections.filter((c) => !c.success).length;
      const alignmentImprovement = afterAlignment - beforeAlignment;

      const summary = this.generateCorrectionSummary(
        correctionsApplied,
        correctionsFailed,
        alignmentImprovement
      );

      const processingTime = Date.now() - startTime;

      const result: CorrectionResult = {
        success: correctionsApplied > 0,
        agentId,
        correctionsApplied,
        correctionsFailed,
        appliedCorrections,
        beforeAlignment,
        afterAlignment,
        alignmentImprovement,
        summary,
        metadata: {
          processingTime,
          memoryUpdates,
          personalityAdjustments,
          behaviorModifiers,
        },
      };

      // Log the correction (if not dry run)
      if (!options.dryRun) {
        await this.logDriftCorrection(result, organizationId, context);
      }

      return result;
    } catch (error: any) {
      console.error('Error correcting drift:', error);
      throw error;
    }
  }

  // =====================================================
  // AI-POWERED DRIFT DETECTION
  // =====================================================

  private async performAIDriftDetection(
    agent: any,
    playbook: Playbook,
    recentActivity: any,
    excludeDriftTypes: DriftType[],
    includeEvidence: boolean
  ): Promise<DriftItem[]> {
    const prompt = this.buildDriftDetectionPrompt(
      agent,
      playbook,
      recentActivity,
      excludeDriftTypes
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert AI agent behavior analyst. Analyze agent behavior against playbook expectations and identify drift.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(content);

      const driftItems: DriftItem[] = (analysis.driftItems || []).map(
        (item: any) => ({
          driftId: uuidv4(),
          type: item.type as DriftType,
          severity: item.severity as DriftSeverity,
          description: item.description,
          expectedBehavior: item.expectedBehavior,
          actualBehavior: item.actualBehavior,
          detectedAt: new Date(),
          confidence: item.confidence || 0.8,
          evidence: includeEvidence
            ? {
                recentMessages: item.evidence?.recentMessages || [],
                recentDecisions: item.evidence?.recentDecisions || [],
                behaviorPatterns: item.evidence?.behaviorPatterns || [],
                policyViolations: item.evidence?.policyViolations || [],
              }
            : {},
          suggestedCorrection: item.suggestedCorrection
            ? {
                type: item.suggestedCorrection.type as CorrectionType,
                description: item.suggestedCorrection.description,
                priority: item.suggestedCorrection.priority || 1,
              }
            : undefined,
          metadata: item.metadata || {},
        })
      );

      return driftItems;
    } catch (error: any) {
      console.error('Error in AI drift detection:', error);
      return [];
    }
  }

  private buildDriftDetectionPrompt(
    agent: any,
    playbook: Playbook,
    recentActivity: any,
    excludeDriftTypes: DriftType[]
  ): string {
    const driftTypesToCheck = [
      'tone_drift',
      'escalation_behavior',
      'policy_adherence',
      'decision_making',
      'knowledge_gap',
      'personality_shift',
      'objective_misalignment',
      'communication_style',
      'priority_mismatch',
    ].filter((type) => !excludeDriftTypes.includes(type as DriftType));

    return `
Analyze the following agent's behavior against the organizational playbook and identify any drift.

**Agent Information:**
- ID: ${agent.agent_id}
- Name: ${agent.name}
- Role: ${agent.role}
- Current Personality: ${JSON.stringify(agent.personality || {})}
- Current Objectives: ${JSON.stringify(agent.objectives || [])}

**Playbook Expectations:**
${JSON.stringify(playbook.rules, null, 2)}

**Recent Agent Activity:**
${JSON.stringify(recentActivity, null, 2)}

**Drift Types to Check:**
${driftTypesToCheck.join(', ')}

**Instructions:**
1. Compare the agent's recent behavior with playbook expectations
2. Identify specific instances of drift
3. For each drift item, provide:
   - type: one of ${driftTypesToCheck.join(', ')}
   - severity: critical, high, medium, low, or negligible
   - description: clear explanation of the drift
   - expectedBehavior: what the playbook expects
   - actualBehavior: what the agent is doing
   - confidence: 0-1 score of detection confidence
   - evidence: {recentMessages, recentDecisions, behaviorPatterns, policyViolations}
   - suggestedCorrection: {type, description, priority}

Return JSON in this format:
{
  "driftItems": [
    {
      "type": "tone_drift",
      "severity": "medium",
      "description": "...",
      "expectedBehavior": "...",
      "actualBehavior": "...",
      "confidence": 0.85,
      "evidence": {...},
      "suggestedCorrection": {
        "type": "personality_adjustment",
        "description": "...",
        "priority": 1
      }
    }
  ]
}
`;
  }

  // =====================================================
  // MAPPING & APPLICATION
  // =====================================================

  private async createPlaybookMapping(
    agent: any,
    rule: PlaybookRule,
    playbookId: string,
    organizationId: string,
    forceSync: boolean,
    preserveCustomizations: boolean
  ): Promise<PlaybookMapping> {
    const mappingId = uuidv4();

    // Determine target property and value from rule
    const targetProperty = rule.definition.property;
    const targetValue = rule.definition.value;

    // Get current value (if exists)
    const previousValue = this.extractAgentProperty(agent, targetProperty);

    // Check if we should preserve customization
    if (preserveCustomizations && previousValue && !forceSync) {
      // Don't override custom value
      throw new Error(
        `Preserving customization for ${targetProperty} (use forceSync to override)`
      );
    }

    const mapping: PlaybookMapping = {
      mappingId,
      playbookRuleId: rule.ruleId,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      targetProperty,
      targetValue,
      previousValue,
      source: 'organization_playbook' as PlaybookMappingSource,
      appliedAt: new Date(),
      confidence: rule.isRequired ? 1.0 : 0.85,
    };

    return mapping;
  }

  private async applyMappingToAgent(
    agentId: string,
    mapping: PlaybookMapping,
    syncId: string
  ): Promise<AppliedChange> {
    const changeId = uuidv4();

    // Apply the change to the agent
    await this.updateAgentProperty(
      agentId,
      mapping.targetProperty,
      mapping.targetValue
    );

    // Store the mapping
    await this.storeMappingInDB(agentId, mapping, syncId);

    const change: AppliedChange = {
      changeId,
      changeType: this.inferCorrectionType(mapping.ruleType),
      description: `Applied ${mapping.ruleName} to ${mapping.targetProperty}`,
      targetProperty: mapping.targetProperty,
      oldValue: mapping.previousValue,
      newValue: mapping.targetValue,
      impact: mapping.confidence > 0.9 ? 'high' : mapping.confidence > 0.7 ? 'medium' : 'low',
      appliedAt: new Date(),
    };

    return change;
  }

  private async applyCorrectionToAgent(
    agentId: string,
    driftItem: DriftItem,
    correction: { type: CorrectionType; description: string; priority: number }
  ): Promise<void> {
    switch (correction.type) {
      case 'memory_update':
        await this.updateAgentMemory(agentId, driftItem, correction);
        break;
      case 'personality_adjustment':
        await this.adjustAgentPersonality(agentId, driftItem, correction);
        break;
      case 'behavior_modifier':
        await this.updateBehaviorModifier(agentId, driftItem, correction);
        break;
      case 'knowledge_injection':
        await this.injectKnowledge(agentId, driftItem, correction);
        break;
      case 'objective_realignment':
        await this.realignObjectives(agentId, driftItem, correction);
        break;
      case 'ruleset_update':
        await this.updateRuleset(agentId, driftItem, correction);
        break;
      case 'escalation_path_update':
        await this.updateEscalationPath(agentId, driftItem, correction);
        break;
      case 'communication_template':
        await this.updateCommunicationTemplate(agentId, driftItem, correction);
        break;
      default:
        throw new Error(`Unknown correction type: ${correction.type}`);
    }
  }

  // =====================================================
  // AGENT PROPERTY UPDATES
  // =====================================================

  private async updateAgentMemory(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Create memory entry to reinforce expected behavior
    await db.query(
      `INSERT INTO agent_memory (agent_id, memory_type, content, importance, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        agentId,
        'behavioral_guideline',
        `Expected behavior: ${driftItem.expectedBehavior}. Correction: ${correction.description}`,
        0.9,
        JSON.stringify({ driftId: driftItem.driftId, correctionType: correction.type }),
      ]
    );
  }

  private async adjustAgentPersonality(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Update agent personality traits
    if (driftItem.type === 'tone_drift') {
      await db.query(
        `UPDATE agents
         SET personality = jsonb_set(
           COALESCE(personality, '{}'::jsonb),
           '{tone}',
           $1
         )
         WHERE agent_id = $2`,
        [JSON.stringify(driftItem.expectedBehavior), agentId]
      );
    }
  }

  private async updateBehaviorModifier(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Add or update behavior modifier
    await db.query(
      `UPDATE agents
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{behaviorModifiers}',
         COALESCE(metadata->'behaviorModifiers', '[]'::jsonb) || $1
       )
       WHERE agent_id = $2`,
      [
        JSON.stringify({
          type: driftItem.type,
          correction: correction.description,
          appliedAt: new Date().toISOString(),
        }),
        agentId,
      ]
    );
  }

  private async injectKnowledge(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Inject knowledge into agent memory
    await this.updateAgentMemory(agentId, driftItem, {
      ...correction,
      type: 'knowledge_injection',
    });
  }

  private async realignObjectives(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Update agent objectives
    await db.query(
      `UPDATE agents
       SET objectives = jsonb_set(
         COALESCE(objectives, '[]'::jsonb),
         '{0}',
         $1
       )
       WHERE agent_id = $2`,
      [JSON.stringify(driftItem.expectedBehavior), agentId]
    );
  }

  private async updateRuleset(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Update agent ruleset
    await db.query(
      `UPDATE agents
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{rulesets}',
         COALESCE(metadata->'rulesets', '[]'::jsonb) || $1
       )
       WHERE agent_id = $2`,
      [
        JSON.stringify({
          rule: correction.description,
          appliedAt: new Date().toISOString(),
        }),
        agentId,
      ]
    );
  }

  private async updateEscalationPath(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Update escalation path in metadata
    await db.query(
      `UPDATE agents
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{escalationPath}',
         $1
       )
       WHERE agent_id = $2`,
      [JSON.stringify(driftItem.expectedBehavior), agentId]
    );
  }

  private async updateCommunicationTemplate(
    agentId: string,
    driftItem: DriftItem,
    correction: any
  ): Promise<void> {
    // Update communication template
    await db.query(
      `UPDATE agents
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{communicationTemplate}',
         $1
       )
       WHERE agent_id = $2`,
      [JSON.stringify(correction.description), agentId]
    );
  }

  // =====================================================
  // DATABASE OPERATIONS
  // =====================================================

  private async logSyncOperation(
    syncId: string,
    result: SyncResult,
    organizationId: string,
    context: any
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 day TTL

    await db.query(
      `INSERT INTO agent_playbook_sync_logs (
        sync_id, agent_id, playbook_id, organization_id, status,
        mappings, applied_changes, failed_mappings,
        confidence, rules_applied, knowledge_injected, behaviors_updated,
        summary, source, processing_time,
        task_id, conversation_id, user_id, context,
        synced_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        syncId,
        result.agentId,
        result.playbookId,
        organizationId,
        result.status,
        JSON.stringify(result.mappings),
        JSON.stringify(result.appliedChanges),
        JSON.stringify(result.failedMappings || []),
        result.confidence,
        result.metadata?.rulesApplied || 0,
        result.metadata?.knowledgeInjected || 0,
        result.metadata?.behaviorsUpdated || 0,
        result.summary,
        result.metadata?.source || 'organization_playbook',
        result.metadata?.processingTime || 0,
        context.taskId || null,
        context.conversationId || null,
        context.userId || null,
        JSON.stringify(context),
        result.syncedAt,
        expiresAt,
      ]
    );
  }

  private async logDriftDetection(
    report: DriftReport,
    organizationId: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 day TTL

    await db.query(
      `INSERT INTO agent_drift_detection_logs (
        agent_id, playbook_id, organization_id,
        total_drift_items, overall_severity, drift_items,
        summary, recommended_actions,
        task_id, conversation_id, time_range, context,
        detected_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING drift_detection_id`,
      [
        report.agentId,
        report.playbookId || null,
        organizationId,
        report.totalDriftItems,
        report.overallSeverity,
        JSON.stringify(report.driftItems),
        report.summary,
        report.recommendedActions,
        report.context?.taskId || null,
        report.context?.conversationId || null,
        JSON.stringify(report.context?.timeRange || {}),
        JSON.stringify(report.context || {}),
        report.detectedAt,
        expiresAt,
      ]
    );
  }

  private async logDriftCorrection(
    result: CorrectionResult,
    organizationId: string,
    context: any
  ): Promise<void> {
    await db.query(
      `INSERT INTO agent_drift_corrections (
        agent_id, organization_id,
        corrections_applied, corrections_failed, applied_corrections,
        before_alignment, after_alignment, alignment_improvement,
        summary, success,
        processing_time, memory_updates, personality_adjustments, behavior_modifiers,
        task_id, conversation_id, user_id, context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        result.agentId,
        organizationId,
        result.correctionsApplied,
        result.correctionsFailed,
        JSON.stringify(result.appliedCorrections),
        result.beforeAlignment,
        result.afterAlignment,
        result.alignmentImprovement,
        result.summary,
        result.success,
        result.metadata?.processingTime || 0,
        result.metadata?.memoryUpdates || 0,
        result.metadata?.personalityAdjustments || 0,
        result.metadata?.behaviorModifiers || 0,
        context.taskId || null,
        context.conversationId || null,
        context.userId || null,
        JSON.stringify(context),
      ]
    );
  }

  private async storeMappingInDB(
    agentId: string,
    mapping: PlaybookMapping,
    syncId: string
  ): Promise<void> {
    // Get playbook_id from mapping
    const playbookResult = await db.query(
      `SELECT playbook_id FROM agent_playbook_sync_logs WHERE sync_id = $1`,
      [syncId]
    );

    const playbookId = playbookResult.rows[0]?.playbook_id;

    await db.query(
      `INSERT INTO agent_playbook_mappings (
        mapping_id, agent_id, playbook_id, sync_id,
        playbook_rule_id, rule_name, rule_type,
        target_property, target_value, previous_value,
        source, confidence, is_active, applied_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (agent_id, playbook_rule_id, is_active)
      WHERE is_active = true
      DO UPDATE SET
        target_value = EXCLUDED.target_value,
        applied_at = EXCLUDED.applied_at,
        confidence = EXCLUDED.confidence`,
      [
        mapping.mappingId,
        agentId,
        playbookId,
        syncId,
        mapping.playbookRuleId,
        mapping.ruleName,
        mapping.ruleType,
        mapping.targetProperty,
        JSON.stringify(mapping.targetValue),
        JSON.stringify(mapping.previousValue),
        mapping.source,
        mapping.confidence,
        true,
        mapping.appliedAt,
      ]
    );
  }

  // =====================================================
  // QUERY METHODS
  // =====================================================

  async getSyncLogs(query: SyncLogQuery): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.agentId) {
      conditions.push(`agent_id = $${paramIndex++}`);
      params.push(query.agentId);
    }

    if (query.playbookId) {
      conditions.push(`playbook_id = $${paramIndex++}`);
      params.push(query.playbookId);
    }

    if (query.organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(query.organizationId);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.startDate) {
      conditions.push(`synced_at >= $${paramIndex++}`);
      params.push(query.startDate);
    }

    if (query.endDate) {
      conditions.push(`synced_at <= $${paramIndex++}`);
      params.push(query.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const result = await db.query(
      `SELECT * FROM agent_playbook_sync_logs
       ${whereClause}
       ORDER BY synced_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  async getDriftLogs(query: DriftLogQuery): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.agentId) {
      conditions.push(`agent_id = $${paramIndex++}`);
      params.push(query.agentId);
    }

    if (query.playbookId) {
      conditions.push(`playbook_id = $${paramIndex++}`);
      params.push(query.playbookId);
    }

    if (query.organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(query.organizationId);
    }

    if (query.severity) {
      conditions.push(`overall_severity = $${paramIndex++}`);
      params.push(query.severity);
    }

    if (query.startDate) {
      conditions.push(`detected_at >= $${paramIndex++}`);
      params.push(query.startDate);
    }

    if (query.endDate) {
      conditions.push(`detected_at <= $${paramIndex++}`);
      params.push(query.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const result = await db.query(
      `SELECT * FROM agent_drift_detection_logs
       ${whereClause}
       ORDER BY detected_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  async getDriftMetrics(
    agentId?: string,
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DriftMetrics> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (agentId) {
      conditions.push(`agent_id = $${paramIndex++}`);
      params.push(agentId);
    }

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(organizationId);
    }

    if (startDate) {
      conditions.push(`detected_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`detected_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total drift detections
    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM agent_drift_detection_logs ${whereClause}`,
      params
    );
    const totalDriftDetections = parseInt(totalResult.rows[0]?.total || '0');

    // Drift by severity
    const severityResult = await db.query(
      `SELECT overall_severity as severity, COUNT(*) as count
       FROM agent_drift_detection_logs
       ${whereClause}
       GROUP BY overall_severity`,
      params
    );

    // Correction stats
    const correctionResult = await db.query(
      `SELECT
         COUNT(*) as total_corrections,
         SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_corrections,
         SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_corrections,
         AVG(alignment_improvement) as average_impact
       FROM agent_drift_corrections
       ${whereClause.replace('detected_at', 'applied_at')}`,
      params
    );

    return {
      agentId,
      organizationId,
      totalDriftDetections,
      driftByType: [], // Would need to parse drift_items JSONB
      driftBySeverity: severityResult.rows.map((row) => ({
        severity: row.severity,
        count: parseInt(row.count),
      })),
      correctionStats: {
        totalCorrections: parseInt(correctionResult.rows[0]?.total_corrections || '0'),
        successfulCorrections: parseInt(
          correctionResult.rows[0]?.successful_corrections || '0'
        ),
        failedCorrections: parseInt(correctionResult.rows[0]?.failed_corrections || '0'),
        averageImpact: parseFloat(correctionResult.rows[0]?.average_impact || '0'),
      },
      trends: [], // Would need time-series query
    };
  }

  async getSyncMetrics(
    agentId?: string,
    organizationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncMetrics> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (agentId) {
      conditions.push(`agent_id = $${paramIndex++}`);
      params.push(agentId);
    }

    if (organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      params.push(organizationId);
    }

    if (startDate) {
      conditions.push(`synced_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`synced_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total syncs
    const statsResult = await db.query(
      `SELECT
         COUNT(*) as total_syncs,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_syncs,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_syncs,
         AVG(confidence) as average_confidence
       FROM agent_playbook_sync_logs
       ${whereClause}`,
      params
    );

    return {
      agentId,
      organizationId,
      totalSyncs: parseInt(statsResult.rows[0]?.total_syncs || '0'),
      successfulSyncs: parseInt(statsResult.rows[0]?.successful_syncs || '0'),
      failedSyncs: parseInt(statsResult.rows[0]?.failed_syncs || '0'),
      averageConfidence: parseFloat(statsResult.rows[0]?.average_confidence || '0'),
      syncsByPlaybook: [], // Would need GROUP BY playbook_id
      trends: [], // Would need time-series query
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async getPlaybookById(
    playbookId: string,
    organizationId: string
  ): Promise<Playbook | null> {
    const result = await db.query(
      `SELECT * FROM playbooks WHERE playbook_id = $1 AND organization_id = $2`,
      [playbookId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      playbookId: row.playbook_id,
      name: row.name,
      description: row.description,
      version: row.version,
      organizationId: row.organization_id,
      rules: row.rules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
      metadata: row.metadata,
    };
  }

  private async getLastSyncedPlaybook(
    agentId: string,
    organizationId: string
  ): Promise<Playbook | null> {
    const result = await db.query(
      `SELECT p.* FROM playbooks p
       INNER JOIN agent_playbook_sync_logs s ON p.playbook_id = s.playbook_id
       WHERE s.agent_id = $1 AND p.organization_id = $2
       ORDER BY s.synced_at DESC
       LIMIT 1`,
      [agentId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      playbookId: row.playbook_id,
      name: row.name,
      description: row.description,
      version: row.version,
      organizationId: row.organization_id,
      rules: row.rules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
      metadata: row.metadata,
    };
  }

  private async getAgentById(agentId: string): Promise<any> {
    const result = await db.query(`SELECT * FROM agents WHERE agent_id = $1`, [
      agentId,
    ]);
    return result.rows[0] || null;
  }

  private async getRecentAgentActivity(
    agentId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    const startDate = timeRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = timeRange?.end || new Date();

    // Get recent messages
    const messages = await db.query(
      `SELECT * FROM agent_messages
       WHERE agent_id = $1 AND sent_at BETWEEN $2 AND $3
       ORDER BY sent_at DESC
       LIMIT 50`,
      [agentId, startDate, endDate]
    );

    // Get recent decisions (from planning or execution logs)
    const decisions = await db.query(
      `SELECT * FROM agent_planning_logs
       WHERE agent_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC
       LIMIT 20`,
      [agentId, startDate, endDate]
    );

    return {
      messages: messages.rows,
      decisions: decisions.rows,
      timeRange: { start: startDate, end: endDate },
    };
  }

  private extractAgentProperty(agent: any, property: string): any {
    const parts = property.split('.');
    let value = agent;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async updateAgentProperty(
    agentId: string,
    property: string,
    value: any
  ): Promise<void> {
    // Parse property path (e.g., "personality.tone" -> ["personality", "tone"])
    const parts = property.split('.');
    const column = parts[0];

    if (parts.length === 1) {
      // Simple property
      await db.query(`UPDATE agents SET ${column} = $1 WHERE agent_id = $2`, [
        JSON.stringify(value),
        agentId,
      ]);
    } else {
      // Nested JSONB property
      const path = `{${parts.slice(1).join(',')}}`;
      await db.query(
        `UPDATE agents
         SET ${column} = jsonb_set(
           COALESCE(${column}, '{}'::jsonb),
           $1,
           $2
         )
         WHERE agent_id = $3`,
        [path, JSON.stringify(value), agentId]
      );
    }
  }

  private async measureAgentAlignment(
    agentId: string,
    playbookId?: string
  ): Promise<number> {
    // Use the database function
    const result = await db.query(
      `SELECT get_agent_alignment_score($1, $2) as score`,
      [agentId, playbookId || null]
    );

    return parseFloat(result.rows[0]?.score || '0');
  }

  private meetsSevirityThreshold(
    severity: DriftSeverity,
    threshold: DriftSeverity
  ): boolean {
    const severityLevels = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      negligible: 1,
    };

    return severityLevels[severity] >= severityLevels[threshold];
  }

  private calculateOverallSeverity(driftItems: DriftItem[]): DriftSeverity {
    if (driftItems.length === 0) return 'negligible';

    const severities = driftItems.map((item) => item.severity);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    if (severities.includes('low')) return 'low';

    return 'negligible';
  }

  private generateRecommendedActions(driftItems: DriftItem[]): string[] {
    const actions: string[] = [];

    const criticalItems = driftItems.filter((item) => item.severity === 'critical');
    if (criticalItems.length > 0) {
      actions.push(
        `Immediately correct ${criticalItems.length} critical drift items to prevent policy violations`
      );
    }

    const highItems = driftItems.filter((item) => item.severity === 'high');
    if (highItems.length > 0) {
      actions.push(
        `Address ${highItems.length} high-severity drift items within 24 hours`
      );
    }

    if (driftItems.some((item) => item.type === 'tone_drift')) {
      actions.push('Review and adjust agent personality settings to match brand guidelines');
    }

    if (driftItems.some((item) => item.type === 'policy_adherence')) {
      actions.push('Reinforce policy guidelines through memory updates');
    }

    return actions;
  }

  private inferCorrectionType(ruleType: string): CorrectionType {
    switch (ruleType) {
      case 'tone':
        return 'personality_adjustment';
      case 'knowledge':
        return 'knowledge_injection';
      case 'behavior':
        return 'behavior_modifier';
      case 'policy':
        return 'ruleset_update';
      case 'escalation':
        return 'escalation_path_update';
      case 'decision':
        return 'objective_realignment';
      default:
        return 'memory_update';
    }
  }

  private generateSyncSummary(
    mappings: PlaybookMapping[],
    appliedChanges: AppliedChange[],
    failedMappings: FailedMapping[],
    playbookName: string
  ): string {
    const total = mappings.length + failedMappings.length;
    const successful = appliedChanges.length;
    const failed = failedMappings.length;

    if (failed === 0) {
      return `Successfully synced agent with "${playbookName}". Applied ${successful} of ${total} playbook rules.`;
    } else if (successful === 0) {
      return `Failed to sync agent with "${playbookName}". All ${failed} playbook rules failed to apply.`;
    } else {
      return `Partially synced agent with "${playbookName}". Applied ${successful} of ${total} playbook rules. ${failed} rules failed.`;
    }
  }

  private generateDriftSummary(
    driftItems: DriftItem[],
    overallSeverity: DriftSeverity,
    playbookName: string
  ): string {
    if (driftItems.length === 0) {
      return `No drift detected. Agent is aligned with "${playbookName}".`;
    }

    const types = Array.from(new Set(driftItems.map((item) => item.type)));
    return `Detected ${driftItems.length} drift items (${overallSeverity} severity) from "${playbookName}". Drift types: ${types.join(', ')}.`;
  }

  private generateCorrectionSummary(
    correctionsApplied: number,
    correctionsFailed: number,
    alignmentImprovement: number
  ): string {
    const total = correctionsApplied + correctionsFailed;

    if (correctionsFailed === 0) {
      return `Successfully applied ${correctionsApplied} corrections. Alignment improved by ${(alignmentImprovement * 100).toFixed(1)}%.`;
    } else if (correctionsApplied === 0) {
      return `Failed to apply all ${correctionsFailed} corrections. No alignment improvement.`;
    } else {
      return `Applied ${correctionsApplied} of ${total} corrections. ${correctionsFailed} failed. Alignment improved by ${(alignmentImprovement * 100).toFixed(1)}%.`;
    }
  }
}

// Export singleton instance
export const agentPlaybookSyncEngine = new AgentPlaybookSyncEngine();
