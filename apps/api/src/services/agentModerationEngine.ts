// =====================================================
// AGENT MODERATION ENGINE SERVICE
// Sprint 51 Phase 4.7
// =====================================================
//
// Purpose: Safety and moderation layer for agent outputs
// Provides: Content moderation, policy enforcement, safety guardrails
//

import { db } from '../database/client';
import { openai } from '../lib/openai';
import type {
  ModerateAgentOutputInput,
  ModerationResult,
  ModerationFlag,
  ModerationAction,
  ModerationCategory,
  ModerationSeverity,
  ModerationSource,
  LogModerationEventInput,
  ModerationHistoryQuery,
  ModerationMetrics,
  ModerationTrend,
  CategoryBreakdown,
  ModerationRule,
  ModerationRuleQuery,
  ModerationActionResult,
  AIModerationResponse,
  GuardrailConfig,
} from '@pravado/types';

// =====================================================
// AGENT MODERATION ENGINE CLASS
// =====================================================

class AgentModerationEngine {
  /**
   * Moderate agent output using AI analysis + static rules
   */
  async moderateAgentOutput(
    input: ModerateAgentOutputInput
  ): Promise<ModerationResult> {
    const startTime = Date.now();

    try {
      const { agentId, message, context, rulesetId, options } = input;

      // Get applicable rules
      const rules = await this.getApplicableRules(
        context?.organizationId,
        rulesetId
      );

      // Apply static rules first
      const staticRuleResult = await this.applyStaticRules(
        message,
        rules,
        options?.skipCategories || []
      );

      // Determine if AI analysis is needed
      const needsAIAnalysis =
        !staticRuleResult.flagged || options?.strictMode === true;

      let aiResult: AIModerationResponse | null = null;
      if (needsAIAnalysis) {
        aiResult = await this.performAIModerationAnalysis(
          message,
          context,
          options?.skipCategories || []
        );
      }

      // Combine results
      const combinedResult = this.combineResults(
        staticRuleResult,
        aiResult,
        options?.autoRewrite
      );

      const processingTime = Date.now() - startTime;

      // Build final moderation result
      const moderationResult: ModerationResult = {
        flagged: combinedResult.flagged,
        action: combinedResult.action,
        categories: combinedResult.categories,
        severity: combinedResult.severity,
        confidence: combinedResult.confidence,
        reasoning: combinedResult.reasoning,
        suggestedRewrite: combinedResult.suggestedRewrite,
        flags: combinedResult.flags,
        metadata: {
          source: aiResult ? 'hybrid' : 'static_rules',
          processingTime,
          modelUsed: aiResult ? 'gpt-4' : undefined,
          rulesApplied: staticRuleResult.rulesApplied,
        },
        timestamp: new Date(),
      };

      // Log the moderation event
      await this.logModerationEvent({
        agentId,
        message,
        result: moderationResult,
        context,
        userId: context?.userId,
        organizationId: context?.organizationId,
      });

      return moderationResult;
    } catch (error: any) {
      console.error('Error in moderateAgentOutput:', error);

      // Return a safe default on error
      return {
        flagged: false,
        action: 'allow' as ModerationAction,
        categories: [],
        severity: 'low' as ModerationSeverity,
        confidence: 0,
        reasoning: `Moderation error: ${error.message}`,
        flags: [],
        metadata: {
          source: 'ai_analysis' as ModerationSource,
          processingTime: Date.now() - startTime,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Apply static moderation rules
   */
  private async applyStaticRules(
    message: string,
    rules: ModerationRule[],
    skipCategories: ModerationCategory[]
  ): Promise<{
    flagged: boolean;
    flags: ModerationFlag[];
    categories: ModerationCategory[];
    severity: ModerationSeverity;
    action: ModerationAction;
    rulesApplied: string[];
  }> {
    const flags: ModerationFlag[] = [];
    const categories: Set<ModerationCategory> = new Set();
    let highestSeverity: ModerationSeverity = 'low';
    let highestPriorityAction: ModerationAction = 'allow';
    const rulesApplied: string[] = [];

    // Filter and sort rules by priority
    const applicableRules = rules
      .filter((rule) => rule.enabled && !skipCategories.includes(rule.category))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      const matched = this.matchRule(message, rule);

      if (matched) {
        rulesApplied.push(rule.id);
        categories.add(rule.category);

        // Update severity
        if (this.compareSeverity(rule.severity, highestSeverity) > 0) {
          highestSeverity = rule.severity;
        }

        // Update action
        if (this.compareAction(rule.action, highestPriorityAction) > 0) {
          highestPriorityAction = rule.action;
        }

        // Add flag
        const location = this.findMatchLocation(message, rule);
        flags.push({
          category: rule.category,
          severity: rule.severity,
          confidence: 1.0, // Static rules have 100% confidence
          location,
          reason: `Matched rule: ${rule.name}`,
          suggestedFix: this.generateRuleFix(message, rule, location),
        });
      }
    }

    return {
      flagged: flags.length > 0,
      flags,
      categories: Array.from(categories),
      severity: highestSeverity,
      action: highestPriorityAction,
      rulesApplied,
    };
  }

  /**
   * Match a message against a rule
   */
  private matchRule(message: string, rule: ModerationRule): boolean {
    const { type, config } = rule;

    switch (type) {
      case 'regex':
        if (config.pattern) {
          const regex = new RegExp(config.pattern, 'i');
          return regex.test(message);
        }
        return false;

      case 'keyword':
        if (config.keywords && config.keywords.length > 0) {
          const lowerMessage = message.toLowerCase();
          return config.keywords.some((keyword) =>
            lowerMessage.includes(keyword.toLowerCase())
          );
        }
        return false;

      case 'length':
        if (config.threshold !== undefined) {
          return message.length > config.threshold;
        }
        return false;

      case 'sentiment':
      case 'tone':
      case 'custom':
        // These require AI analysis, skip in static rules
        return false;

      default:
        return false;
    }
  }

  /**
   * Find the location of a match in the message
   */
  private findMatchLocation(
    message: string,
    rule: ModerationRule
  ): { start: number; end: number; text: string } | undefined {
    const { type, config } = rule;

    if (type === 'regex' && config.pattern) {
      const regex = new RegExp(config.pattern, 'i');
      const match = message.match(regex);
      if (match && match.index !== undefined) {
        return {
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        };
      }
    }

    if (type === 'keyword' && config.keywords) {
      const lowerMessage = message.toLowerCase();
      for (const keyword of config.keywords) {
        const index = lowerMessage.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          return {
            start: index,
            end: index + keyword.length,
            text: message.substring(index, index + keyword.length),
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Generate a suggested fix based on a rule
   */
  private generateRuleFix(
    message: string,
    rule: ModerationRule,
    location?: { start: number; end: number; text: string }
  ): string | undefined {
    if (!location) return undefined;

    if (rule.type === 'keyword') {
      return (
        message.substring(0, location.start) +
        '[REDACTED]' +
        message.substring(location.end)
      );
    }

    if (rule.type === 'regex') {
      return (
        message.substring(0, location.start) +
        '[FILTERED]' +
        message.substring(location.end)
      );
    }

    return undefined;
  }

  /**
   * Perform AI-powered moderation analysis using GPT-4
   */
  private async performAIModerationAnalysis(
    message: string,
    context?: ModerateAgentOutputInput['context'],
    skipCategories: ModerationCategory[] = []
  ): Promise<AIModerationResponse> {
    const systemPrompt = `You are an expert content moderation AI. Analyze the following agent output for safety, policy compliance, and brand alignment.

Check for:
- Policy violations (inappropriate content, harmful advice)
- Brand mismatches (off-brand tone or messaging)
- Tone violations (inappropriate formality, rudeness)
- Hallucinations (factually incorrect or unsupported claims)
- Sensitive topics (requires careful handling)
- Inappropriate content (offensive, explicit)
- Offensive language (slurs, insults)
- Bias (unfair prejudice or discrimination)
- Factual errors (verifiably incorrect information)
- Privacy concerns (exposed personal data)

Respond with a JSON object following this structure:
{
  "flagged": boolean,
  "categories": ["category1", "category2"],
  "severity": "low" | "medium" | "high" | "critical",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "suggestedRewrite": "Improved version if flagged (optional)",
  "specificIssues": [
    {
      "category": "category_name",
      "location": "quoted text",
      "explanation": "what's wrong",
      "severity": "low" | "medium" | "high" | "critical"
    }
  ]
}`;

    const userPrompt = `Agent Output to Moderate:
"${message}"

${context?.task ? `Task Context: ${context.task}` : ''}
${context?.conversationId ? `Conversation ID: ${context.conversationId}` : ''}
${skipCategories.length > 0 ? `Skip Categories: ${skipCategories.join(', ')}` : ''}

Analyze this output and provide your moderation assessment.`;

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

      return {
        flagged: parsed.flagged || false,
        categories: parsed.categories || [],
        severity: parsed.severity || 'low',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No issues detected',
        suggestedRewrite: parsed.suggestedRewrite,
        specificIssues: parsed.specificIssues || [],
      };
    } catch (error: any) {
      console.error('Error in AI moderation analysis:', error);
      return {
        flagged: false,
        categories: [],
        severity: 'low',
        confidence: 0,
        reasoning: `AI analysis failed: ${error.message}`,
        specificIssues: [],
      };
    }
  }

  /**
   * Combine static and AI moderation results
   */
  private combineResults(
    staticResult: {
      flagged: boolean;
      flags: ModerationFlag[];
      categories: ModerationCategory[];
      severity: ModerationSeverity;
      action: ModerationAction;
    },
    aiResult: AIModerationResponse | null,
    autoRewrite?: boolean
  ): {
    flagged: boolean;
    action: ModerationAction;
    categories: ModerationCategory[];
    severity: ModerationSeverity;
    confidence: number;
    reasoning: string;
    suggestedRewrite?: string;
    flags: ModerationFlag[];
  } {
    if (!aiResult) {
      return {
        flagged: staticResult.flagged,
        action: staticResult.action,
        categories: staticResult.categories,
        severity: staticResult.severity,
        confidence: 1.0,
        reasoning: staticResult.flagged
          ? `Matched ${staticResult.flags.length} rule(s)`
          : 'No rules matched',
        flags: staticResult.flags,
      };
    }

    // Combine categories
    const combinedCategories = Array.from(
      new Set([...staticResult.categories, ...aiResult.categories])
    );

    // Determine highest severity
    const highestSeverity =
      this.compareSeverity(staticResult.severity, aiResult.severity) > 0
        ? staticResult.severity
        : aiResult.severity;

    // Combine flags
    const aiFlags: ModerationFlag[] = aiResult.specificIssues.map((issue) => ({
      category: issue.category as ModerationCategory,
      severity: issue.severity as ModerationSeverity,
      confidence: aiResult.confidence,
      location: issue.location
        ? {
            start: 0,
            end: issue.location.length,
            text: issue.location,
          }
        : undefined,
      reason: issue.explanation,
    }));

    const combinedFlags = [...staticResult.flags, ...aiFlags];

    // Determine action
    const flagged = staticResult.flagged || aiResult.flagged;
    let action: ModerationAction = staticResult.action;

    if (aiResult.flagged && this.compareAction(staticResult.action, 'warn') <= 0) {
      // AI suggests escalation
      if (aiResult.severity === 'critical') {
        action = 'block';
      } else if (aiResult.severity === 'high') {
        action = autoRewrite ? 'rewrite' : 'escalate';
      } else if (aiResult.severity === 'medium') {
        action = autoRewrite ? 'rewrite' : 'warn';
      } else {
        action = 'warn';
      }
    }

    return {
      flagged,
      action,
      categories: combinedCategories,
      severity: highestSeverity,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      suggestedRewrite: aiResult.suggestedRewrite,
      flags: combinedFlags,
    };
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(
    a: ModerationSeverity,
    b: ModerationSeverity
  ): number {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    return order[a] - order[b];
  }

  /**
   * Compare action priority
   */
  private compareAction(a: ModerationAction, b: ModerationAction): number {
    const order = { allow: 1, warn: 2, rewrite: 3, escalate: 4, block: 5 };
    return order[a] - order[b];
  }

  /**
   * Get applicable moderation rules
   */
  private async getApplicableRules(
    organizationId?: string,
    rulesetId?: string
  ): Promise<ModerationRule[]> {
    try {
      let query = `
        SELECT * FROM moderation_rules
        WHERE enabled = true
      `;

      const params: any[] = [];

      if (rulesetId) {
        // Get rules from specific ruleset
        query = `
          SELECT mr.* FROM moderation_rules mr
          JOIN moderation_rulesets mrs ON mr.id = ANY(mrs.rule_ids)
          WHERE mr.enabled = true AND mrs.id = $1
        `;
        params.push(rulesetId);
      } else if (organizationId) {
        // Get organization-specific + global rules
        query += ` AND (organization_id = $1 OR organization_id IS NULL)`;
        params.push(organizationId);
      } else {
        // Get only global rules
        query += ` AND organization_id IS NULL`;
      }

      query += ` ORDER BY priority DESC`;

      const result = await db.query(query, params);

      return result.rows.map(this.mapRuleRow);
    } catch (error) {
      console.error('Error fetching moderation rules:', error);
      return [];
    }
  }

  /**
   * Map database row to ModerationRule
   */
  private mapRuleRow(row: any): ModerationRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      category: row.category,
      severity: row.severity,
      enabled: row.enabled,
      config: row.config || {},
      action: row.action,
      priority: row.priority,
      organizationId: row.organization_id,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Log moderation event to database
   */
  async logModerationEvent(input: LogModerationEventInput): Promise<void> {
    try {
      const { agentId, message, result, context, actionTaken, userId, organizationId } = input;

      await db.query(
        `
        INSERT INTO agent_moderation_log (
          agent_id, message, flags, categories, severity, action, action_taken,
          confidence, reasoning, suggested_rewrite, source, context, user_id,
          organization_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
        [
          agentId,
          message,
          JSON.stringify(result.flags),
          result.categories,
          result.severity,
          result.action,
          actionTaken || null,
          result.confidence,
          result.reasoning,
          result.suggestedRewrite || null,
          result.metadata.source,
          context ? JSON.stringify(context) : null,
          userId || null,
          organizationId || null,
          JSON.stringify(result.metadata),
        ]
      );
    } catch (error) {
      console.error('Error logging moderation event:', error);
      // Don't throw - logging failure shouldn't break moderation
    }
  }

  /**
   * Get moderation history with filters
   */
  async getModerationHistory(
    query: ModerationHistoryQuery
  ): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_moderation_history($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          query.agentId,
          query.categories || null,
          query.severity || null,
          query.action || null,
          query.startDate || null,
          query.endDate || null,
          query.minConfidence || null,
          query.organizationId || null,
          query.limit || 100,
          query.offset || 0,
        ]
      );

      return result.rows.map((row) => ({
        ...row,
        flags: row.flags || [],
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error fetching moderation history:', error);
      throw new Error(`Failed to fetch moderation history: ${(error as Error).message}`);
    }
  }

  /**
   * Get moderation metrics for an agent
   */
  async getModerationMetrics(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ModerationMetrics> {
    try {
      const result = await db.query(
        `SELECT * FROM get_moderation_metrics($1, $2, $3)`,
        [agentId, startDate, endDate]
      );

      const row = result.rows[0];

      return {
        agentId,
        totalModerations: parseInt(row.total_moderations),
        flaggedCount: parseInt(row.flagged_count),
        flaggedPercentage: parseFloat(row.flagged_percentage),
        actionDistribution: row.action_distribution || {},
        categoryDistribution: row.category_distribution || {},
        severityDistribution: row.severity_distribution || {},
        avgConfidence: parseFloat(row.avg_confidence),
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      console.error('Error fetching moderation metrics:', error);
      throw new Error(`Failed to fetch moderation metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Get moderation trends over time
   */
  async getModerationTrends(
    agentId: string,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<ModerationTrend[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_moderation_trends($1, $2, $3, $4)`,
        [agentId, startDate, endDate, interval]
      );

      return result.rows.map((row) => ({
        date: row.date,
        totalModerations: parseInt(row.total_moderations),
        flaggedCount: parseInt(row.flagged_count),
        avgSeverity: parseFloat(row.avg_severity),
        topCategories: row.top_categories || [],
      }));
    } catch (error) {
      console.error('Error fetching moderation trends:', error);
      throw new Error(`Failed to fetch moderation trends: ${(error as Error).message}`);
    }
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CategoryBreakdown[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_category_breakdown($1, $2, $3)`,
        [agentId, startDate, endDate]
      );

      return result.rows.map((row) => ({
        category: row.category as ModerationCategory,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage),
        avgSeverity: row.avg_severity as ModerationSeverity,
        commonReasons: row.common_reasons || [],
      }));
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      throw new Error(`Failed to fetch category breakdown: ${(error as Error).message}`);
    }
  }

  /**
   * Get moderation rules
   */
  async getModerationRules(query: ModerationRuleQuery): Promise<ModerationRule[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_moderation_rules($1, $2, $3, $4, $5, $6)`,
        [
          query.organizationId || null,
          query.category || null,
          query.type || null,
          query.enabled !== undefined ? query.enabled : null,
          query.limit || 100,
          query.offset || 0,
        ]
      );

      return result.rows.map(this.mapRuleRow);
    } catch (error) {
      console.error('Error fetching moderation rules:', error);
      throw new Error(`Failed to fetch moderation rules: ${(error as Error).message}`);
    }
  }

  /**
   * Apply moderation with automatic action execution
   */
  async applyModerationRules(
    agentId: string,
    message: string,
    context?: ModerateAgentOutputInput['context']
  ): Promise<ModerationActionResult> {
    const moderationResult = await this.moderateAgentOutput({
      agentId,
      message,
      context,
      options: { autoRewrite: true },
    });

    let finalMessage = message;
    let wasModified = false;

    switch (moderationResult.action) {
      case 'rewrite':
        if (moderationResult.suggestedRewrite) {
          finalMessage = moderationResult.suggestedRewrite;
          wasModified = true;
        }
        break;

      case 'block':
        finalMessage = '[Content blocked due to policy violation]';
        wasModified = true;
        break;

      case 'warn':
      case 'escalate':
      case 'allow':
      default:
        // No modification needed
        break;
    }

    // Get applied rules
    const appliedRules = moderationResult.metadata.rulesApplied || [];
    const rules = await this.getModerationRules({
      organizationId: context?.organizationId,
    });

    return {
      originalMessage: message,
      finalMessage,
      action: moderationResult.action,
      wasModified,
      moderationResult,
      appliedRules: appliedRules.map((ruleId) => {
        const rule = rules.find((r) => r.id === ruleId);
        return {
          ruleId,
          ruleName: rule?.name || 'Unknown',
          matched: true,
          action: rule?.action || 'allow',
        };
      }),
    };
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const agentModerationEngine = new AgentModerationEngine();
