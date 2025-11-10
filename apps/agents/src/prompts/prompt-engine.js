"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptEngine = exports.PromptEngine = void 0;
const events_1 = require("events");
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class PromptEngine extends events_1.EventEmitter {
    async createPromptBlock(input) {
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
    async updatePromptBlock(input) {
        const updateData = {};
        if (input.name !== undefined)
            updateData.name = input.name;
        if (input.description !== undefined)
            updateData.description = input.description;
        if (input.content !== undefined)
            updateData.content = input.content;
        if (input.modelScope !== undefined)
            updateData.model_scope = input.modelScope;
        if (input.tags !== undefined)
            updateData.tags = input.tags;
        if (input.category !== undefined)
            updateData.category = input.category;
        if (input.isActive !== undefined)
            updateData.is_active = input.isActive;
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
    async deletePromptBlock(blockId, organizationId) {
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
    async getPromptBlock(blockId, organizationId) {
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
    async listPromptBlocks(organizationId, filters) {
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
    async createPromptTemplate(input) {
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
        await this.validatePromptTemplate(template.id, input.organizationId);
        this.emit('template-created', { template });
        return template;
    }
    async updatePromptTemplate(input) {
        const updateData = {};
        if (input.templateName !== undefined)
            updateData.template_name = input.templateName;
        if (input.description !== undefined)
            updateData.description = input.description;
        if (input.useCaseTag !== undefined)
            updateData.use_case_tag = input.useCaseTag;
        if (input.blocks !== undefined)
            updateData.blocks = input.blocks;
        if (input.blockOrder !== undefined)
            updateData.block_order = input.blockOrder;
        if (input.maxTokens !== undefined)
            updateData.max_tokens = input.maxTokens;
        if (input.temperature !== undefined)
            updateData.temperature = input.temperature;
        if (input.topP !== undefined)
            updateData.top_p = input.topP;
        if (input.isActive !== undefined)
            updateData.is_active = input.isActive;
        if (input.isDefault !== undefined)
            updateData.is_default = input.isDefault;
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
        if (input.blocks !== undefined) {
            await this.validatePromptTemplate(template.id, template.organizationId);
        }
        this.emit('template-updated', { template });
        return template;
    }
    async deletePromptTemplate(templateId, organizationId) {
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
    async getPromptTemplate(templateId, organizationId) {
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
    async listPromptTemplates(organizationId, filters) {
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
    async assemblePrompt(input) {
        if (input.validateBeforeAssembly) {
            const validation = await this.validatePromptTemplate(input.templateId, input.organizationId);
            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.warnings.join(', ')}`);
            }
        }
        const { data: assembledPrompt, error: assembleError } = await supabase.rpc('assemble_prompt', {
            p_template_id: input.templateId,
            p_organization_id: input.organizationId,
        });
        if (assembleError) {
            throw new Error(`Failed to assemble prompt: ${assembleError.message}`);
        }
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
        let finalPrompt = assembledPrompt;
        if (input.contextInjection) {
            finalPrompt = await this.injectContext({
                prompt: assembledPrompt,
                contextData: input.contextInjection,
                contextType: 'CUSTOM',
            });
        }
        const blockSummaries = blocksData.blocks.map((b) => ({
            id: b.id,
            name: b.name,
            blockType: b.blockType,
            contentLength: b.content.length,
            estimatedTokens: Math.ceil(b.content.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN_AVG),
        }));
        const estimatedTokens = this.estimateTokens(finalPrompt);
        const validation = await this.validatePrompt({
            prompt: finalPrompt,
            maxTokens: template.maxTokens,
        });
        const assembled = {
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
    async getPromptPreview(templateId, organizationId) {
        const assembled = await this.assemblePrompt({
            templateId,
            organizationId,
        });
        const gptSummary = await this.summarizePrompt(assembled.prompt);
        const preview = {
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
    async injectContext(input) {
        let prompt = input.prompt;
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
        if (prompt.includes('{{CONTEXT}}')) {
            prompt = prompt.replace('{{CONTEXT}}', contextBlock);
        }
        else {
            prompt = prompt + '\n\n## DYNAMIC CONTEXT\n\n' + contextBlock;
        }
        return prompt;
    }
    buildMemoryContext(data) {
        let context = 'Previous interactions and memory:\n\n';
        if (data.recentMemories) {
            data.recentMemories.forEach((memory) => {
                context += `- ${memory.content}\n`;
            });
        }
        return context;
    }
    buildGoalsContext(data) {
        let context = 'Active goals and objectives:\n\n';
        if (data.goals) {
            data.goals.forEach((goal) => {
                context += `- ${goal.title}: ${goal.description} (Target: ${goal.target})\n`;
            });
        }
        return context;
    }
    buildCampaignContext(data) {
        let context = 'Campaign information:\n\n';
        if (data.campaignName)
            context += `Campaign: ${data.campaignName}\n`;
        if (data.objective)
            context += `Objective: ${data.objective}\n`;
        if (data.targetAudience)
            context += `Target: ${data.targetAudience}\n`;
        return context;
    }
    buildContactContext(data) {
        let context = 'Contact information:\n\n';
        if (data.name)
            context += `Name: ${data.name}\n`;
        if (data.email)
            context += `Email: ${data.email}\n`;
        if (data.company)
            context += `Company: ${data.company}\n`;
        if (data.notes)
            context += `Notes: ${data.notes}\n`;
        return context;
    }
    buildCustomContext(data) {
        return JSON.stringify(data, null, 2);
    }
    async validatePrompt(input) {
        const warnings = [];
        const errors = [];
        const suggestions = [];
        if (input.checkLength !== false) {
            if (input.prompt.length > PROMPT_VALIDATION_THRESHOLDS.MAX_LENGTH_CHARS) {
                warnings.push(`Prompt is very long (${input.prompt.length} chars). Consider splitting into smaller blocks.`);
            }
        }
        if (input.maxTokens) {
            const estimatedTokens = this.estimateTokens(input.prompt);
            if (estimatedTokens > input.maxTokens) {
                errors.push(`Estimated tokens (${estimatedTokens}) exceeds max tokens (${input.maxTokens})`);
            }
        }
        if (input.checkRepetition !== false) {
            const hasRepetition = this.checkRepetition(input.prompt);
            if (hasRepetition) {
                warnings.push('Prompt contains repetitive content. Consider consolidating.');
            }
        }
        if (input.checkAmbiguity !== false) {
            const ambiguousTerms = this.checkAmbiguity(input.prompt);
            if (ambiguousTerms.length > 0) {
                suggestions.push(`Consider clarifying these terms: ${ambiguousTerms.join(', ')}`);
            }
        }
        let score = 100;
        score -= errors.length * 25;
        score -= warnings.length * 10;
        score -= suggestions.length * 5;
        score = Math.max(0, score);
        const validation = {
            isValid: errors.length === 0,
            warnings,
            errors,
            suggestions,
            score,
        };
        return validation;
    }
    async validatePromptTemplate(templateId, organizationId) {
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
    checkRepetition(prompt) {
        const lines = prompt.split('\n');
        const lineSet = new Set(lines);
        const uniqueRatio = lineSet.size / lines.length;
        return uniqueRatio < (1 - PROMPT_VALIDATION_THRESHOLDS.REPETITION_THRESHOLD);
    }
    checkAmbiguity(prompt) {
        const ambiguousTerms = [];
        const ambiguousWords = ['it', 'they', 'this', 'that', 'these', 'those', 'thing', 'stuff'];
        const lowerPrompt = prompt.toLowerCase();
        ambiguousWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = lowerPrompt.match(regex);
            if (matches && matches.length > 5) {
                ambiguousTerms.push(word);
            }
        });
        return ambiguousTerms;
    }
    async summarizePrompt(prompt) {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing AI prompts. Provide a concise 2-3 sentence summary of what the following prompt instructs an AI to do.',
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
    async recommendPromptImprovements(input) {
        const promptForGPT = this.buildImprovementPrompt(input);
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert prompt engineer. Analyze prompts and provide specific, actionable improvements.',
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
        const suggestions = (parsed.suggestions || []).map((s) => ({
            type: s.type || 'CLARITY',
            priority: s.priority || 'MEDIUM',
            issue: s.issue,
            suggestion: s.suggestion,
            example: s.example,
        }));
        const result = {
            originalPrompt: input.prompt,
            improvedPrompt: parsed.improvedPrompt,
            suggestions,
            overallScore: parsed.score || 70,
            gptAnalysis: parsed.analysis || '',
        };
        this.emit('prompt-improved', { result });
        return result;
    }
    buildImprovementPrompt(input) {
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
    estimateTokens(text) {
        return Math.ceil(text.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN_AVG);
    }
    getTokenEstimation(text, model = 'gpt-4') {
        const characterCount = text.length;
        const estimatedTokens = this.estimateTokens(text);
        return {
            text,
            characterCount,
            estimatedTokens,
            model,
            method: 'ESTIMATED',
        };
    }
    mapBlockFromDb(data) {
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
    mapTemplateFromDb(data) {
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
exports.PromptEngine = PromptEngine;
exports.promptEngine = new PromptEngine();
//# sourceMappingURL=prompt-engine.js.map