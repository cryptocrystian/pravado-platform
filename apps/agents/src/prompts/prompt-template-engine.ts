// =====================================================
// PROMPT TEMPLATE ENGINE
// Core Infrastructure: Agent Prompt Pipeline + Dynamic Slot Filling
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { agentMemoryEngine } from '../memory/agent-memory-engine';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  PromptTemplate,
  PromptSlot,
  SlotResolutionStrategy,
  PromptResolutionContext,
  ResolvePromptOutput,
  ParsedSlot,
  SlotValidationResult,
  SlotResolutionError,
} from '@pravado/types';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Core engine for prompt template resolution
 *
 * Responsibilities:
 * - Parse template text to extract slots
 * - Resolve slot values using appropriate strategies
 * - Assemble final prompts with resolved values
 * - Validate slot values
 * - Log invocations for analytics
 */
export class PromptTemplateEngine {
  // Initialize resolver instances
  private staticResolver = new StaticSlotResolver();
  private contextResolver = new ContextSlotResolver();
  private memoryResolver = new MemorySlotResolver();
  private databaseResolver = new DatabaseSlotResolver();
  private gptResolver = new GptSlotResolver();
  /**
   * Resolve a complete prompt template with given context
   *
   * Flow:
   * 1. Fetch template from database
   * 2. Extract all slots from template text
   * 3. For each slot, resolve value using its strategy
   * 4. Replace {{slot}} syntax with resolved values
   * 5. Validate final prompt
   * 6. Log invocation to database
   *
   * @param templateId - UUID of template to resolve
   * @param context - Runtime context with values for resolution
   * @returns Resolved prompt with metadata
   *
   * @example
   * ```typescript
   * const result = await engine.resolvePrompt(
   *   'template-uuid-here',
   *   {
   *     agent: { id: 'agent-1', name: 'ContentBot' },
   *     campaign: { id: 'camp-1', goal: 'Increase awareness' },
   *     custom: { topic: 'AI in Healthcare' }
   *   }
   * );
   * // result.resolvedPrompt = "Write about AI in Healthcare for ContentBot..."
   * ```
   */
  async resolvePrompt(
    templateId: string,
    context: PromptResolutionContext
  ): Promise<ResolvePromptOutput> {
    const startTime = Date.now();
    const errors: SlotResolutionError[] = [];
    const slotResults: Array<{
      slot: string;
      value: string;
      source: SlotResolutionStrategy;
      confidence?: number;
      notes?: string;
    }> = [];

    try {
      // 1. Fetch template from database
      const { data: template, error: templateError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // 2. Fetch slots for this template
      const { data: slots, error: slotsError } = await supabase
        .from('prompt_slots')
        .select('*')
        .eq('template_id', templateId)
        .order('slot_name', { ascending: true });

      if (slotsError) {
        throw new Error(`Failed to fetch slots: ${slotsError.message}`);
      }

      // 3. Extract slot names from template text
      const parsedSlots = this.extractSlots(template.template_text);
      const slotNames = parsedSlots.map((s) => s.slotName);

      // 4. Resolve each slot
      const resolvedSlots: Record<string, any> = {};

      for (const slotDef of slots || []) {
        try {
          // Resolve the slot value
          const value = await this.resolveSlot(slotDef, context);

          // Validate the resolved value
          const validation = this.validateSlotValue(slotDef, value);

          if (!validation.valid) {
            errors.push({
              slotName: slotDef.slot_name,
              strategy: slotDef.resolution_strategy as SlotResolutionStrategy,
              error: validation.errors.join(', '),
              sourceReference: slotDef.source_reference,
            });

            // Use default value if validation fails
            resolvedSlots[slotDef.slot_name] = slotDef.default_value || '';
          } else {
            resolvedSlots[slotDef.slot_name] = value;
          }

          // Record slot result
          slotResults.push({
            slot: slotDef.slot_name,
            value: String(value),
            source: slotDef.resolution_strategy as SlotResolutionStrategy,
            notes: slotDef.description || undefined,
          });
        } catch (error) {
          errors.push({
            slotName: slotDef.slot_name,
            strategy: slotDef.resolution_strategy as SlotResolutionStrategy,
            error: error instanceof Error ? error.message : 'Unknown error',
            sourceReference: slotDef.source_reference,
          });

          // Use default value on error
          resolvedSlots[slotDef.slot_name] = slotDef.default_value || '';
        }
      }

      // 5. Replace slots in template
      const filledPrompt = this.replaceSlotsInTemplate(template.template_text, resolvedSlots);

      // 6. Estimate tokens and cost
      const tokensEstimate = this.estimateTokenCount(filledPrompt);
      const costEstimateUsd = this.estimateCost('gpt-4', tokensEstimate);

      // 7. Log invocation (don't block on this)
      const responseTimeMs = Date.now() - startTime;
      this.logInvocation({
        templateId,
        agentId: context.agent?.id,
        campaignId: context.campaign?.id,
        userId: context.user?.id,
        organizationId: context.organization?.id || '',
        resolvedPrompt: filledPrompt,
        resolvedSlots,
        responseTimeMs,
        gptTokenCount: tokensEstimate,
        gptModel: 'gpt-4',
        gptCostUsd: costEstimateUsd,
        success: errors.length === 0,
        errorMessage: errors.length > 0 ? errors.map((e) => e.error).join('; ') : undefined,
        metadata: { slotResults },
      }).catch((error) => {
        console.error('Failed to log invocation:', error);
      });

      // 8. Return result
      return {
        success: errors.length === 0,
        resolvedPrompt: filledPrompt,
        resolvedSlots,
        template,
        tokensEstimate,
        costEstimateUsd,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      // Log failure
      this.logInvocation({
        templateId,
        agentId: context.agent?.id,
        campaignId: context.campaign?.id,
        userId: context.user?.id,
        organizationId: context.organization?.id || '',
        resolvedPrompt: '',
        resolvedSlots: {},
        responseTimeMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch((logError) => {
        console.error('Failed to log invocation:', logError);
      });

      return {
        success: false,
        errors: [
          {
            slotName: 'system',
            strategy: 'STATIC' as SlotResolutionStrategy,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Resolve a single slot value using its defined strategy
   *
   * Strategy implementations:
   * - STATIC: Return slot.defaultValue
   * - CONTEXT: Extract from context using slot.sourceReference path
   * - MEMORY: Query agent memory system (Sprint 36/37)
   * - DATABASE: Execute parameterized SQL query
   * - GPT: Use GPT-4 to generate value dynamically
   *
   * @param slot - Slot definition with resolution strategy
   * @param context - Runtime context for resolution
   * @returns Resolved value for the slot
   *
   * @example
   * ```typescript
   * // STATIC strategy
   * const staticSlot = { resolutionStrategy: 'STATIC', defaultValue: 'Hello' };
   * const value = await engine.resolveSlot(staticSlot, context);
   * // value = 'Hello'
   *
   * // CONTEXT strategy
   * const contextSlot = {
   *   resolutionStrategy: 'CONTEXT',
   *   sourceReference: 'agent.name'
   * };
   * const value = await engine.resolveSlot(contextSlot, { agent: { name: 'Bot' } });
   * // value = 'Bot'
   * ```
   */
  async resolveSlot(
    slot: PromptSlot,
    context: PromptResolutionContext
  ): Promise<any> {
    try {
      let value: any;

      // Route to appropriate resolver based on strategy
      switch (slot.resolutionStrategy) {
        case 'STATIC':
          value = await this.staticResolver.resolve(slot, context);
          break;

        case 'CONTEXT':
          value = await this.contextResolver.resolve(slot, context);
          break;

        case 'MEMORY':
          value = await this.memoryResolver.resolve(slot, context);
          break;

        case 'DATABASE':
          value = await this.databaseResolver.resolve(slot, context);
          break;

        case 'GPT':
          value = await this.gptResolver.resolve(slot, context);
          break;

        default:
          console.warn(`Unknown resolution strategy: ${slot.resolutionStrategy}`);
          value = slot.defaultValue || '';
      }

      return value;
    } catch (error) {
      console.error(`Error resolving slot '${slot.slotName}':`, error);
      return slot.defaultValue || '';
    }
  }

  /**
   * Extract slot definitions from template text
   *
   * Uses regex to find all {{slotName}} patterns in template
   * Returns parsed slot information including positions
   *
   * @param templateText - Template with {{slot}} syntax
   * @returns Array of parsed slots with positions
   *
   * @example
   * ```typescript
   * const template = "Hello {{name}} from {{location}}! Your goal is {{goal}}.";
   * const slots = engine.extractSlots(template);
   * // slots = [
   * //   { slotName: 'name', startIndex: 6, endIndex: 14, fullMatch: '{{name}}' },
   * //   { slotName: 'location', startIndex: 20, endIndex: 32, fullMatch: '{{location}}' },
   * //   { slotName: 'goal', startIndex: 48, endIndex: 56, fullMatch: '{{goal}}' }
   * // ]
   * ```
   */
  extractSlots(templateText: string): ParsedSlot[] {
    const slots: ParsedSlot[] = [];
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(templateText)) !== null) {
      slots.push({
        slotName: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        fullMatch: match[0],
      });
    }

    return slots;
  }

  /**
   * Log a prompt invocation to database for analytics
   *
   * Stores:
   * - Template used
   * - Context (agent, campaign, user)
   * - Resolved prompt text
   * - Slot values used
   * - Performance metrics (time, tokens, cost)
   * - Success/error status
   *
   * @param params - Invocation parameters
   *
   * @example
   * ```typescript
   * await engine.logInvocation({
   *   templateId: 'template-uuid',
   *   agentId: 'agent-1',
   *   campaignId: 'campaign-1',
   *   resolvedPrompt: 'Final prompt text...',
   *   resolvedSlots: { name: 'Bot', goal: 'Awareness' },
   *   responseTimeMs: 250,
   *   gptTokenCount: 150,
   *   gptModel: 'gpt-4',
   *   success: true
   * });
   * ```
   */
  async logInvocation(params: {
    templateId: string;
    agentId?: string;
    campaignId?: string;
    userId?: string;
    organizationId: string;
    resolvedPrompt: string;
    resolvedSlots: Record<string, any>;
    responseTimeMs: number;
    gptTokenCount?: number;
    gptModel?: string;
    gptCostUsd?: number;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('prompt_invocations').insert({
        organization_id: params.organizationId,
        template_id: params.templateId,
        agent_id: params.agentId || null,
        campaign_id: params.campaignId || null,
        user_id: params.userId || null,
        resolved_prompt: params.resolvedPrompt,
        resolved_slots: params.resolvedSlots,
        success: params.success,
        error_message: params.errorMessage || null,
        response_time_ms: params.responseTimeMs,
        gpt_model: params.gptModel || null,
        gpt_token_count: params.gptTokenCount || null,
        gpt_cost_usd: params.gptCostUsd || null,
        metadata: params.metadata || {},
      });

      if (error) {
        console.error('Failed to log prompt invocation:', error);
      }
    } catch (error) {
      console.error('Error logging prompt invocation:', error);
    }
  }

  /**
   * Validate a slot value against its definition
   *
   * Checks:
   * - Required validation (if slot.required && !value)
   * - Type validation (string, number, boolean, array, object)
   * - Regex validation (if slot.validationRegex)
   * - Custom validation rules
   *
   * @param slot - Slot definition with validation rules
   * @param value - Value to validate
   * @returns Validation result with errors if any
   *
   * @example
   * ```typescript
   * const emailSlot = {
   *   slotName: 'email',
   *   required: true,
   *   slotType: 'string',
   *   validationRegex: '^[^@]+@[^@]+\\.[^@]+$'
   * };
   *
   * const result1 = engine.validateSlotValue(emailSlot, 'user@example.com');
   * // result1 = { valid: true, errors: [] }
   *
   * const result2 = engine.validateSlotValue(emailSlot, 'invalid-email');
   * // result2 = { valid: false, errors: ['Value does not match regex pattern'] }
   * ```
   */
  validateSlotValue(
    slot: PromptSlot,
    value: any
  ): SlotValidationResult {
    const errors: string[] = [];

    // 1. Required validation
    if (slot.required && (value === undefined || value === null || value === '')) {
      errors.push(`Required slot '${slot.slotName}' is missing or empty`);
      return { valid: false, errors };
    }

    // If value is empty and not required, skip other validations
    if (value === undefined || value === null || value === '') {
      return { valid: true, errors: [] };
    }

    // 2. Type validation
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    const expectedType = slot.slotType.toLowerCase();

    if (expectedType === 'string' && valueType !== 'string') {
      errors.push(`Expected string but got ${valueType}`);
    } else if (expectedType === 'number' && valueType !== 'number') {
      errors.push(`Expected number but got ${valueType}`);
    } else if (expectedType === 'boolean' && valueType !== 'boolean') {
      errors.push(`Expected boolean but got ${valueType}`);
    } else if (expectedType === 'array' && !Array.isArray(value)) {
      errors.push(`Expected array but got ${valueType}`);
    } else if (expectedType === 'object' && (valueType !== 'object' || Array.isArray(value))) {
      errors.push(`Expected object but got ${valueType}`);
    }

    // 3. Regex validation
    if (slot.validationRegex && typeof value === 'string') {
      try {
        const pattern = new RegExp(slot.validationRegex);
        if (!pattern.test(value)) {
          errors.push(`Value does not match pattern ${slot.validationRegex}`);
        }
      } catch (error) {
        errors.push(`Invalid regex pattern: ${slot.validationRegex}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Replace slot syntax with resolved values in template
   *
   * Takes template text and replaces all {{slotName}} patterns
   * with corresponding values from resolvedSlots map
   *
   * @param templateText - Template with {{slot}} syntax
   * @param resolvedSlots - Map of slot names to resolved values
   * @returns Final text with slots replaced
   *
   * @example
   * ```typescript
   * const template = "Hello {{name}}, your goal is {{goal}}.";
   * const slots = { name: 'Alice', goal: 'Learn' };
   * const result = engine.replaceSlotsInTemplate(template, slots);
   * // result = "Hello Alice, your goal is Learn."
   * ```
   */
  protected replaceSlotsInTemplate(
    templateText: string,
    resolvedSlots: Record<string, any>
  ): string {
    return templateText.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, slotName) => {
      const value = resolvedSlots[slotName];

      // Handle different value types
      if (value === undefined || value === null) {
        return '';
      }

      if (typeof value === 'object') {
        // Convert objects/arrays to JSON string
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Estimate token count for a prompt
   *
   * Uses approximation: ~1 token per 4 characters for English
   * More accurate estimation would use tiktoken library
   *
   * @param text - Text to estimate tokens for
   * @returns Estimated token count
   */
  protected estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate GPT API cost
   *
   * Based on model and token count
   * Prices as of 2025 (may change):
   * - GPT-4: $0.03 per 1K tokens (input)
   * - GPT-3.5: $0.002 per 1K tokens (input)
   *
   * @param model - GPT model name
   * @param tokens - Token count
   * @returns Estimated cost in USD
   */
  protected estimateCost(model: string, tokens: number): number {
    const prices: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.002,
    };

    const pricePerK = prices[model] || 0.01;
    return (tokens / 1000) * pricePerK;
  }
}

// =====================================================
// RESOLUTION STRATEGIES (Stubs for Day 3-4)
// =====================================================

/**
 * Static slot resolver
 * Simply returns the default value
 */
class StaticSlotResolver {
  async resolve(slot: PromptSlot, context: PromptResolutionContext): Promise<any> {
    return slot.defaultValue || '';
  }
}

/**
 * Context slot resolver
 * Extracts value from context object using path
 * e.g., 'agent.name' → context.agent.name
 */
class ContextSlotResolver {
  async resolve(slot: PromptSlot, context: PromptResolutionContext): Promise<any> {
    if (!slot.sourceReference) {
      return slot.defaultValue || '';
    }

    // Parse dot-notation path (e.g., 'agent.name', 'campaign.goal')
    const path = slot.sourceReference.split('.');
    let value: any = context;

    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Path not found, return default
        return slot.defaultValue || '';
      }
    }

    return value ?? slot.defaultValue ?? '';
  }
}

/**
 * Memory slot resolver
 * Queries agent memory system (Sprint 36/37)
 */
class MemorySlotResolver {
  async resolve(slot: PromptSlot, context: PromptResolutionContext): Promise<any> {
    if (!slot.sourceReference || !context.organization?.id) {
      return slot.defaultValue || '';
    }

    // Parse sourceReference (e.g., 'memory:recent_campaigns' or just the query)
    const query = slot.sourceReference.replace(/^memory:/, '');

    try {
      // Search agent memory using semantic search
      const results = await agentMemoryEngine.searchMemory({
        organizationId: context.organization.id,
        query,
        agentId: context.agent?.id,
        limit: 3, // Get top 3 most relevant memories
      });

      if (results.length === 0) {
        return slot.defaultValue || '';
      }

      // Return the most relevant memory content
      // You can customize this to return summary, full content, or combine multiple results
      if (results.length === 1) {
        return results[0].episode.summary || results[0].episode.content;
      }

      // Combine multiple relevant memories
      return results
        .map((r, i) => `${i + 1}. ${r.episode.summary || r.episode.content.substring(0, 200)}`)
        .join('\n');
    } catch (error) {
      console.error('Memory slot resolution error:', error);
      return slot.defaultValue || '';
    }
  }
}

/**
 * Database slot resolver
 * Executes parameterized SQL query
 */
class DatabaseSlotResolver {
  async resolve(slot: PromptSlot, context: PromptResolutionContext): Promise<any> {
    if (!slot.sourceReference) {
      return slot.defaultValue || '';
    }

    try {
      // Parse sourceReference
      // Format: "table.column" or "table.column WHERE condition"
      // Examples: "campaigns.goal", "users.name WHERE id=:user.id"
      const parts = slot.sourceReference.split(' WHERE ');
      const [tableDotColumn] = parts;
      const whereClause = parts[1];

      const [tableName, columnName] = tableDotColumn.split('.');

      if (!tableName || !columnName) {
        console.warn(`Invalid database reference: ${slot.sourceReference}`);
        return slot.defaultValue || '';
      }

      // Build query
      let query = supabase.from(tableName).select(columnName);

      // Apply WHERE conditions if specified
      if (whereClause) {
        // Parse WHERE clause (simple implementation)
        // Example: "id=:campaign.id" -> eq('id', context.campaign.id)
        const conditionMatch = whereClause.match(/(\w+)\s*=\s*:(\S+)/);
        if (conditionMatch) {
          const [, field, contextPath] = conditionMatch;
          const value = this.resolveContextPath(context, contextPath);

          if (value) {
            query = query.eq(field, value);
          }
        }
      }

      // Execute query
      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        return slot.defaultValue || '';
      }

      return data[columnName] || slot.defaultValue || '';
    } catch (error) {
      console.error('Database slot resolution error:', error);
      return slot.defaultValue || '';
    }
  }

  /**
   * Resolve a context path (e.g., 'campaign.id' -> context.campaign.id)
   */
  private resolveContextPath(context: PromptResolutionContext, path: string): any {
    const keys = path.split('.');
    let value: any = context;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

/**
 * GPT slot resolver
 * Uses GPT-4 to generate value dynamically
 */
class GptSlotResolver {
  async resolve(slot: PromptSlot, context: PromptResolutionContext): Promise<any> {
    if (!slot.sourceReference) {
      return slot.defaultValue || '';
    }

    try {
      // sourceReference contains the GPT prompt
      // Can include context variables like {{topic}}
      let promptText = slot.sourceReference;

      // Replace any context placeholders in the GPT prompt
      promptText = promptText.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, path) => {
        const value = this.resolveContextPath(context, path);
        return value !== undefined ? String(value) : '';
      });

      // Call OpenAI to generate the slot value
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Fill in the following slot based on the context provided. Return ONLY the requested value, no explanations.',
          },
          {
            role: 'user',
            content: `${promptText}\n\nFill the slot "${slot.slotName}":`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const generatedValue = completion.choices[0].message.content?.trim() || '';

      return generatedValue || slot.defaultValue || '';
    } catch (error) {
      console.error('GPT slot resolution error:', error);
      return slot.defaultValue || '';
    }
  }

  /**
   * Resolve a context path (e.g., 'campaign.goal' -> context.campaign.goal)
   */
  private resolveContextPath(context: PromptResolutionContext, path: string): any {
    const keys = path.split('.');
    let value: any = context;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

/**
 * Singleton instance of PromptTemplateEngine
 * Use this for all prompt resolution operations
 */
export const promptTemplateEngine = new PromptTemplateEngine();
