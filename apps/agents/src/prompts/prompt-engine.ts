// =====================================================
// PROMPT ENGINE
// Sprint 30: Advanced prompt engineering + modular blocks
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  PromptBlock,
  PromptTemplate,
  AssembledPrompt,
  PromptBlockSummary,
  PromptValidation,
  PromptPreviewResult,
  PromptImprovementResult,
  PromptSuggestion,
  CreatePromptBlockInput,
  UpdatePromptBlockInput,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  AssemblePromptInput,
  InjectContextInput,
  ValidatePromptInput,
  ImprovePromptInput,
  TokenEstimationResult,
  BlockType,
  UseCaseTag,
  ModelScope,
  TOKEN_ESTIMATION,
  PROMPT_VALIDATION_THRESHOLDS,
} from '@pravado/shared-types';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Prompt Engine
 * Manages modular prompt blocks and templates
 */
export class PromptEngine extends EventEmitter {
  // =====================================================
  // PROMPT BLOCK MANAGEMENT
  // =====================================================

  /**
   * Create prompt block
   */
  async createPromptBlock(input: CreatePromptBlockInput): Promise<PromptBlock> {
    const { data, error } = await supabase
      .from('prompt_blocks')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        description: input.description,
        block_type: input.blockType,
        content: input.content,
        model_scope: input.modelScope || 'ALL',
        tags: input.tags || [],
        category: input.category,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create prompt block: ${error.message}`);
    }

    const block = this.mapBlockFromDb(data);

    this.emit('block-created', { block });

    return block;
  }

  /**
   * Update prompt block
   */
  async updatePromptBlock(input: UpdatePromptBlockInput): Promise<PromptBlock> {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.modelScope !== undefined) updateData.model_scope = input.modelScope;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    // Increment version on content change
    if (input.content !== undefined) {
      updateData.version = supabase.raw('version + 1');
    }

    const { data, error } = await supabase
      .from('prompt_blocks')
      .update(updateData)
      .eq('id', input.blockId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update prompt block: ${error.message}`);
    }

    const block = this.mapBlockFromDb(data);

    this.emit('block-updated', { block });

    return block;
  }

  /**
   * Delete prompt block (soft delete)
   */
  async deletePromptBlock(blockId: string, organizationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('prompt_blocks')
      .update({ is_active: false })
      .eq('id', blockId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to delete prompt block: ${error.message}`);
    }

    this.emit('block-deleted', { blockId });

    return true;
  }

  /**
   * Get prompt block by ID
   */
  async getPromptBlock(blockId: string, organizationId: string): Promise<PromptBlock | null> {
    const { data, error } = await supabase
      .from('prompt_blocks')
      .select('*')
      .eq('id', blockId)
      .or(`organization_id.eq.${organizationId},is_system_block.eq.true`)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapBlockFromDb(data);
  }

  /**
   * List prompt blocks
   */
  async listPromptBlocks(
    organizationId: string,
    filters?: {
      blockType?: BlockType;
      modelScope?: ModelScope;
      tags?: string[];
      category?: string;
    }
  ): Promise<PromptBlock[]> {
    let query = supabase
      .from('prompt_blocks')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_system_block.eq.true`)
      .eq('is_active', true);

    if (filters?.blockType) {
      query = query.eq('block_type', filters.blockType);
    }

    if (filters?.modelScope) {
      query = query.eq('model_scope', filters.modelScope);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list prompt blocks: ${error.message}`);
    }

    return (data || []).map((d) => this.mapBlockFromDb(d));
  }

  // =====================================================
  // PROMPT TEMPLATE MANAGEMENT
  // =====================================================

  /**
   * Create prompt template
   */
  async createPromptTemplate(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .insert({
        organization_id: input.organizationId,
        template_name: input.templateName,
        description: input.description,
        use_case_tag: input.useCaseTag,
        model_scope: input.modelScope || 'ALL',
        blocks: input.blocks,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        top_p: input.topP,
        is_default: input.isDefault || false,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create prompt template: ${error.message}`);
    }

    const template = this.mapTemplateFromDb(data);

    // Auto-validate new template
    await this.validatePromptTemplate(template.id, input.organizationId);

    this.emit('template-created', { template });

    return template;
  }

  /**
   * Update prompt template
   */
  async updatePromptTemplate(input: UpdatePromptTemplateInput): Promise<PromptTemplate> {
    const updateData: any = {};

    if (input.templateName !== undefined) updateData.template_name = input.templateName;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.useCaseTag !== undefined) updateData.use_case_tag = input.useCaseTag;
    if (input.blocks !== undefined) updateData.blocks = input.blocks;
    if (input.blockOrder !== undefined) updateData.block_order = input.blockOrder;
    if (input.maxTokens !== undefined) updateData.max_tokens = input.maxTokens;
    if (input.temperature !== undefined) updateData.temperature = input.temperature;
    if (input.topP !== undefined) updateData.top_p = input.topP;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

    // Mark as not validated if blocks changed
    if (input.blocks !== undefined) {
      updateData.is_validated = false;
    }

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', input.templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update prompt template: ${error.message}`);
    }

    const template = this.mapTemplateFromDb(data);

    // Re-validate if blocks changed
    if (input.blocks !== undefined) {
      await this.validatePromptTemplate(template.id, template.organizationId);
    }

    this.emit('template-updated', { template });

    return template;
  }

  /**
   * Delete prompt template (soft delete)
   */
  async deletePromptTemplate(templateId: string, organizationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('prompt_templates')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to delete prompt template: ${error.message}`);
    }

    this.emit('template-deleted', { templateId });

    return true;
  }

  /**
   * Get prompt template by ID
   */
  async getPromptTemplate(
    templateId: string,
    organizationId: string
  ): Promise<PromptTemplate | null> {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', templateId)
      .or(`organization_id.eq.${organizationId},is_system_template.eq.true`)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapTemplateFromDb(data);
  }

  /**
   * List prompt templates
   */
  async listPromptTemplates(
    organizationId: string,
    filters?: {
      useCaseTag?: UseCaseTag;
      modelScope?: ModelScope;
    }
  ): Promise<PromptTemplate[]> {
    let query = supabase
      .from('prompt_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_system_template.eq.true`)
      .eq('is_active', true);

    if (filters?.useCaseTag) {
      query = query.eq('use_case_tag', filters.useCaseTag);
    }

    if (filters?.modelScope) {
      query = query.eq('model_scope', filters.modelScope);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list prompt templates: ${error.message}`);
    }

    return (data || []).map((d) => this.mapTemplateFromDb(d));
  }

  // =====================================================
  // PROMPT ASSEMBLY
  // =====================================================

  /**
   * Assemble prompt from template
   */
  async assemblePrompt(input: AssemblePromptInput): Promise<AssembledPrompt> {
    // Validate first if requested
    if (input.validateBeforeAssembly) {
      const validation = await this.validatePromptTemplate(input.templateId, input.organizationId);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.warnings.join(', ')}`);
      }
    }

    // Call database function to assemble
    const { data: assembledPrompt, error: assembleError } = await supabase.rpc('assemble_prompt', {
      p_template_id: input.templateId,
      p_organization_id: input.organizationId,
    });

    if (assembleError) {
      throw new Error(`Failed to assemble prompt: ${assembleError.message}`);
    }

    // Get template and blocks details
    const template = await this.getPromptTemplate(input.templateId, input.organizationId);
    if (!template) {
      throw new Error('Template not found');
    }

    const { data: blocksData, error: blocksError } = await supabase.rpc('get_prompt_blocks', {
      p_template_id: input.templateId,
      p_organization_id: input.organizationId,
    });

    if (blocksError) {
      throw new Error(`Failed to get blocks: ${blocksError.message}`);
    }

    // Inject dynamic context if provided
    let finalPrompt = assembledPrompt;
    if (input.contextInjection) {
      finalPrompt = await this.injectContext({
        prompt: assembledPrompt,
        contextData: input.contextInjection,
        contextType: 'CUSTOM',
      });
    }

    // Build block summaries
    const blockSummaries: PromptBlockSummary[] = blocksData.blocks.map((b: any) => ({
      id: b.id,
      name: b.name,
      blockType: b.blockType,
      contentLength: b.content.length,
      estimatedTokens: Math.ceil(b.content.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN_AVG),
    }));

    // Estimate tokens
    const estimatedTokens = this.estimateTokens(finalPrompt);

    // Validate assembled prompt
    const validation = await this.validatePrompt({
      prompt: finalPrompt,
      maxTokens: template.maxTokens,
    });

    const assembled: AssembledPrompt = {
      templateId: input.templateId,
      templateName: template.templateName,
      prompt: finalPrompt,
      blocks: blockSummaries,
      metadata: {
        totalLength: finalPrompt.length,
        totalBlocks: blockSummaries.length,
        estimatedTokens,
        modelScope: template.modelScope,
        useCaseTag: template.useCaseTag,
        assembledAt: new Date().toISOString(),
      },
      validation,
    };

    this.emit('prompt-assembled', { assembled });

    return assembled;
  }

  /**
   * Get prompt preview with GPT summary
   */
  async getPromptPreview(
    templateId: string,
    organizationId: string
  ): Promise<PromptPreviewResult> {
    const assembled = await this.assemblePrompt({
      templateId,
      organizationId,
    });

    // Generate GPT summary of what the prompt does
    const gptSummary = await this.summarizePrompt(assembled.prompt);

    const preview: PromptPreviewResult = {
      templateId,
      templateName: assembled.templateName,
      assembledPrompt: assembled.prompt,
      blocks: assembled.blocks,
      estimatedTokens: assembled.metadata.estimatedTokens,
      validation: assembled.validation,
      gptSummary,
    };

    this.emit('prompt-previewed', { preview });

    return preview;
  }

  // =====================================================
  // CONTEXT INJECTION
  // =====================================================

  /**
   * Inject context into prompt dynamically
   */
  async injectContext(input: InjectContextInput): Promise<string> {
    let prompt = input.prompt;

    // Build context block based on type
    let contextBlock = '';

    switch (input.contextType) {
      case 'MEMORY':
        contextBlock = this.buildMemoryContext(input.contextData);
        break;
      case 'GOALS':
        contextBlock = this.buildGoalsContext(input.contextData);
        break;
      case 'CAMPAIGN':
        contextBlock = this.buildCampaignContext(input.contextData);
        break;
      case 'CONTACT':
        contextBlock = this.buildContactContext(input.contextData);
        break;
      case 'CUSTOM':
        contextBlock = this.buildCustomContext(input.contextData);
        break;
    }

    // Inject context (replace placeholder or append)
    if (prompt.includes('{{CONTEXT}}')) {
      prompt = prompt.replace('{{CONTEXT}}', contextBlock);
    } else {
      // Append before the last section
      prompt = prompt + '\n\n## DYNAMIC CONTEXT\n\n' + contextBlock;
    }

    return prompt;
  }

  private buildMemoryContext(data: Record<string, any>): string {
    let context = 'Previous interactions and memory:\n\n';

    if (data.recentMemories) {
      data.recentMemories.forEach((memory: any) => {
        context += `- ${memory.content}\n`;
      });
    }

    return context;
  }

  private buildGoalsContext(data: Record<string, any>): string {
    let context = 'Active goals and objectives:\n\n';

    if (data.goals) {
      data.goals.forEach((goal: any) => {
        context += `- ${goal.title}: ${goal.description} (Target: ${goal.target})\n`;
      });
    }

    return context;
  }

  private buildCampaignContext(data: Record<string, any>): string {
    let context = 'Campaign information:\n\n';

    if (data.campaignName) context += `Campaign: ${data.campaignName}\n`;
    if (data.objective) context += `Objective: ${data.objective}\n`;
    if (data.targetAudience) context += `Target: ${data.targetAudience}\n`;

    return context;
  }

  private buildContactContext(data: Record<string, any>): string {
    let context = 'Contact information:\n\n';

    if (data.name) context += `Name: ${data.name}\n`;
    if (data.email) context += `Email: ${data.email}\n`;
    if (data.company) context += `Company: ${data.company}\n`;
    if (data.notes) context += `Notes: ${data.notes}\n`;

    return context;
  }

  private buildCustomContext(data: Record<string, any>): string {
    return JSON.stringify(data, null, 2);
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  /**
   * Validate prompt content
   */
  async validatePrompt(input: ValidatePromptInput): Promise<PromptValidation> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check length
    if (input.checkLength !== false) {
      if (input.prompt.length > PROMPT_VALIDATION_THRESHOLDS.MAX_LENGTH_CHARS) {
        warnings.push(
          `Prompt is very long (${input.prompt.length} chars). Consider splitting into smaller blocks.`
        );
      }
    }

    // Check token limit
    if (input.maxTokens) {
      const estimatedTokens = this.estimateTokens(input.prompt);
      if (estimatedTokens > input.maxTokens) {
        errors.push(
          `Estimated tokens (${estimatedTokens}) exceeds max tokens (${input.maxTokens})`
        );
      }
    }

    // Check for repetition
    if (input.checkRepetition !== false) {
      const hasRepetition = this.checkRepetition(input.prompt);
      if (hasRepetition) {
        warnings.push('Prompt contains repetitive content. Consider consolidating.');
      }
    }

    // Check for ambiguity
    if (input.checkAmbiguity !== false) {
      const ambiguousTerms = this.checkAmbiguity(input.prompt);
      if (ambiguousTerms.length > 0) {
        suggestions.push(
          `Consider clarifying these terms: ${ambiguousTerms.join(', ')}`
        );
      }
    }

    // Calculate score
    let score = 100;
    score -= errors.length * 25;
    score -= warnings.length * 10;
    score -= suggestions.length * 5;
    score = Math.max(0, score);

    const validation: PromptValidation = {
      isValid: errors.length === 0,
      warnings,
      errors,
      suggestions,
      score,
    };

    return validation;
  }

  /**
   * Validate prompt template using database function
   */
  async validatePromptTemplate(
    templateId: string,
    organizationId: string
  ): Promise<PromptValidation> {
    const { data, error } = await supabase.rpc('validate_prompt_template', {
      p_template_id: templateId,
      p_organization_id: organizationId,
    });

    if (error) {
      throw new Error(`Failed to validate template: ${error.message}`);
    }

    return {
      isValid: data.isValid,
      warnings: data.warnings || [],
      errors: [],
      suggestions: [],
      score: data.isValid ? 100 : 70,
    };
  }

  private checkRepetition(prompt: string): boolean {
    const lines = prompt.split('\n');
    const lineSet = new Set(lines);

    // If more than 30% of lines are duplicates, flag as repetitive
    const uniqueRatio = lineSet.size / lines.length;
    return uniqueRatio < (1 - PROMPT_VALIDATION_THRESHOLDS.REPETITION_THRESHOLD);
  }

  private checkAmbiguity(prompt: string): string[] {
    const ambiguousTerms: string[] = [];
    const ambiguousWords = ['it', 'they', 'this', 'that', 'these', 'those', 'thing', 'stuff'];

    const lowerPrompt = prompt.toLowerCase();
    ambiguousWords.forEach((word) => {
      // Check if word appears frequently (more than 5 times)
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerPrompt.match(regex);
      if (matches && matches.length > 5) {
        ambiguousTerms.push(word);
      }
    });

    return ambiguousTerms;
  }

  // =====================================================
  // GPT-POWERED FEATURES
  // =====================================================

  /**
   * Summarize prompt (GPT-powered)
   */
  async summarizePrompt(prompt: string): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at analyzing AI prompts. Provide a concise 2-3 sentence summary of what the following prompt instructs an AI to do.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Recommend prompt improvements (GPT-powered)
   */
  async recommendPromptImprovements(input: ImprovePromptInput): Promise<PromptImprovementResult> {
    const promptForGPT = this.buildImprovementPrompt(input);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert prompt engineer. Analyze prompts and provide specific, actionable improvements.',
        },
        {
          role: 'user',
          content: promptForGPT,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(response);

    const suggestions: PromptSuggestion[] = (parsed.suggestions || []).map((s: any) => ({
      type: s.type || 'CLARITY',
      priority: s.priority || 'MEDIUM',
      issue: s.issue,
      suggestion: s.suggestion,
      example: s.example,
    }));

    const result: PromptImprovementResult = {
      originalPrompt: input.prompt,
      improvedPrompt: parsed.improvedPrompt,
      suggestions,
      overallScore: parsed.score || 70,
      gptAnalysis: parsed.analysis || '',
    };

    this.emit('prompt-improved', { result });

    return result;
  }

  private buildImprovementPrompt(input: ImprovePromptInput): string {
    let prompt = 'Analyze this AI prompt and provide improvements:\n\n';
    prompt += '```\n' + input.prompt + '\n```\n\n';

    if (input.currentIssues && input.currentIssues.length > 0) {
      prompt += 'Current issues:\n';
      input.currentIssues.forEach((issue) => {
        prompt += `- ${issue}\n`;
      });
      prompt += '\n';
    }

    if (input.targetUseCase) {
      prompt += `Target use case: ${input.targetUseCase}\n`;
    }

    if (input.modelScope) {
      prompt += `Target model: ${input.modelScope}\n`;
    }

    prompt += '\nProvide response in JSON format with:\n';
    prompt += '- analysis: Overall assessment (2-3 sentences)\n';
    prompt += '- score: Overall quality score (0-100)\n';
    prompt += '- suggestions: Array of improvement suggestions with type, priority, issue, suggestion, example\n';
    prompt += '- improvedPrompt: (optional) Rewritten version if major improvements needed\n';

    return prompt;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Estimate tokens for text
   */
  estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN_AVG);
  }

  /**
   * Get token estimation details
   */
  getTokenEstimation(text: string, model: string = 'gpt-4'): TokenEstimationResult {
    const characterCount = text.length;
    const estimatedTokens = this.estimateTokens(text);

    return {
      text,
      characterCount,
      estimatedTokens,
      model,
      method: 'ESTIMATED', // Could integrate tiktoken for exact counting
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private mapBlockFromDb(data: any): PromptBlock {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description,
      blockType: data.block_type,
      content: data.content,
      modelScope: data.model_scope,
      version: data.version,
      isActive: data.is_active,
      usageCount: data.usage_count || 0,
      lastUsedAt: data.last_used_at,
      tags: data.tags || [],
      category: data.category,
      createdBy: data.created_by,
      isSystemBlock: data.is_system_block,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapTemplateFromDb(data: any): PromptTemplate {
    return {
      id: data.id,
      organizationId: data.organization_id,
      templateName: data.template_name,
      description: data.description,
      useCaseTag: data.use_case_tag,
      modelScope: data.model_scope,
      blocks: data.blocks || [],
      blockOrder: data.block_order,
      maxTokens: data.max_tokens,
      temperature: data.temperature,
      topP: data.top_p,
      isValidated: data.is_validated,
      validationNotes: data.validation_notes,
      estimatedTokens: data.estimated_tokens,
      usageCount: data.usage_count || 0,
      lastUsedAt: data.last_used_at,
      isActive: data.is_active,
      isDefault: data.is_default,
      createdBy: data.created_by,
      isSystemTemplate: data.is_system_template,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Singleton instance
export const promptEngine = new PromptEngine();
