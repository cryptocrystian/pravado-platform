"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptTemplateEngine = exports.PromptTemplateEngine = void 0;
const agent_memory_engine_1 = require("../memory/agent-memory-engine");
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class PromptTemplateEngine {
    staticResolver = new StaticSlotResolver();
    contextResolver = new ContextSlotResolver();
    memoryResolver = new MemorySlotResolver();
    databaseResolver = new DatabaseSlotResolver();
    gptResolver = new GptSlotResolver();
    async resolvePrompt(templateId, context) {
        const startTime = Date.now();
        const errors = [];
        const slotResults = [];
        try {
            const { data: template, error: templateError } = await supabase
                .from('prompt_templates')
                .select('*')
                .eq('id', templateId)
                .single();
            if (templateError || !template) {
                throw new Error(`Template not found: ${templateId}`);
            }
            const { data: slots, error: slotsError } = await supabase
                .from('prompt_slots')
                .select('*')
                .eq('template_id', templateId)
                .order('slot_name', { ascending: true });
            if (slotsError) {
                throw new Error(`Failed to fetch slots: ${slotsError.message}`);
            }
            const parsedSlots = this.extractSlots(template.template_text);
            const slotNames = parsedSlots.map((s) => s.slotName);
            const resolvedSlots = {};
            for (const slotDef of slots || []) {
                try {
                    const value = await this.resolveSlot(slotDef, context);
                    const validation = this.validateSlotValue(slotDef, value);
                    if (!validation.valid) {
                        errors.push({
                            slotName: slotDef.slot_name,
                            strategy: slotDef.resolution_strategy,
                            error: validation.errors.join(', '),
                            sourceReference: slotDef.source_reference,
                        });
                        resolvedSlots[slotDef.slot_name] = slotDef.default_value || '';
                    }
                    else {
                        resolvedSlots[slotDef.slot_name] = value;
                    }
                    slotResults.push({
                        slot: slotDef.slot_name,
                        value: String(value),
                        source: slotDef.resolution_strategy,
                        notes: slotDef.description || undefined,
                    });
                }
                catch (error) {
                    errors.push({
                        slotName: slotDef.slot_name,
                        strategy: slotDef.resolution_strategy,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        sourceReference: slotDef.source_reference,
                    });
                    resolvedSlots[slotDef.slot_name] = slotDef.default_value || '';
                }
            }
            const filledPrompt = this.replaceSlotsInTemplate(template.template_text, resolvedSlots);
            const tokensEstimate = this.estimateTokenCount(filledPrompt);
            const costEstimateUsd = this.estimateCost('gpt-4', tokensEstimate);
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
            return {
                success: errors.length === 0,
                resolvedPrompt: filledPrompt,
                resolvedSlots,
                template,
                tokensEstimate,
                costEstimateUsd,
                errors: errors.length > 0 ? errors : undefined,
            };
        }
        catch (error) {
            const responseTimeMs = Date.now() - startTime;
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
                        strategy: 'STATIC',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                ],
            };
        }
    }
    async resolveSlot(slot, context) {
        try {
            let value;
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
        }
        catch (error) {
            console.error(`Error resolving slot '${slot.slotName}':`, error);
            return slot.defaultValue || '';
        }
    }
    extractSlots(templateText) {
        const slots = [];
        const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
        let match;
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
    async logInvocation(params) {
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
        }
        catch (error) {
            console.error('Error logging prompt invocation:', error);
        }
    }
    validateSlotValue(slot, value) {
        const errors = [];
        if (slot.required && (value === undefined || value === null || value === '')) {
            errors.push(`Required slot '${slot.slotName}' is missing or empty`);
            return { valid: false, errors };
        }
        if (value === undefined || value === null || value === '') {
            return { valid: true, errors: [] };
        }
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        const expectedType = slot.slotType.toLowerCase();
        if (expectedType === 'string' && valueType !== 'string') {
            errors.push(`Expected string but got ${valueType}`);
        }
        else if (expectedType === 'number' && valueType !== 'number') {
            errors.push(`Expected number but got ${valueType}`);
        }
        else if (expectedType === 'boolean' && valueType !== 'boolean') {
            errors.push(`Expected boolean but got ${valueType}`);
        }
        else if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Expected array but got ${valueType}`);
        }
        else if (expectedType === 'object' && (valueType !== 'object' || Array.isArray(value))) {
            errors.push(`Expected object but got ${valueType}`);
        }
        if (slot.validationRegex && typeof value === 'string') {
            try {
                const pattern = new RegExp(slot.validationRegex);
                if (!pattern.test(value)) {
                    errors.push(`Value does not match pattern ${slot.validationRegex}`);
                }
            }
            catch (error) {
                errors.push(`Invalid regex pattern: ${slot.validationRegex}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    replaceSlotsInTemplate(templateText, resolvedSlots) {
        return templateText.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, slotName) => {
            const value = resolvedSlots[slotName];
            if (value === undefined || value === null) {
                return '';
            }
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }
    estimateTokenCount(text) {
        return Math.ceil(text.length / 4);
    }
    estimateCost(model, tokens) {
        const prices = {
            'gpt-4': 0.03,
            'gpt-4-turbo': 0.01,
            'gpt-3.5-turbo': 0.002,
        };
        const pricePerK = prices[model] || 0.01;
        return (tokens / 1000) * pricePerK;
    }
}
exports.PromptTemplateEngine = PromptTemplateEngine;
class StaticSlotResolver {
    async resolve(slot, context) {
        return slot.defaultValue || '';
    }
}
class ContextSlotResolver {
    async resolve(slot, context) {
        if (!slot.sourceReference) {
            return slot.defaultValue || '';
        }
        const path = slot.sourceReference.split('.');
        let value = context;
        for (const key of path) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            }
            else {
                return slot.defaultValue || '';
            }
        }
        return value ?? slot.defaultValue ?? '';
    }
}
class MemorySlotResolver {
    async resolve(slot, context) {
        if (!slot.sourceReference || !context.organization?.id) {
            return slot.defaultValue || '';
        }
        const query = slot.sourceReference.replace(/^memory:/, '');
        try {
            const results = await agent_memory_engine_1.agentMemoryEngine.searchMemory({
                organizationId: context.organization.id,
                query,
                agentId: context.agent?.id,
                limit: 3,
            });
            if (results.length === 0) {
                return slot.defaultValue || '';
            }
            if (results.length === 1) {
                return results[0].episode.summary || results[0].episode.content;
            }
            return results
                .map((r, i) => `${i + 1}. ${r.episode.summary || r.episode.content.substring(0, 200)}`)
                .join('\n');
        }
        catch (error) {
            console.error('Memory slot resolution error:', error);
            return slot.defaultValue || '';
        }
    }
}
class DatabaseSlotResolver {
    async resolve(slot, context) {
        if (!slot.sourceReference) {
            return slot.defaultValue || '';
        }
        try {
            const parts = slot.sourceReference.split(' WHERE ');
            const [tableDotColumn] = parts;
            const whereClause = parts[1];
            const [tableName, columnName] = tableDotColumn.split('.');
            if (!tableName || !columnName) {
                console.warn(`Invalid database reference: ${slot.sourceReference}`);
                return slot.defaultValue || '';
            }
            let query = supabase.from(tableName).select(columnName);
            if (whereClause) {
                const conditionMatch = whereClause.match(/(\w+)\s*=\s*:(\S+)/);
                if (conditionMatch) {
                    const [, field, contextPath] = conditionMatch;
                    const value = this.resolveContextPath(context, contextPath);
                    if (value) {
                        query = query.eq(field, value);
                    }
                }
            }
            const { data, error } = await query.limit(1).single();
            if (error || !data) {
                return slot.defaultValue || '';
            }
            return data[columnName] || slot.defaultValue || '';
        }
        catch (error) {
            console.error('Database slot resolution error:', error);
            return slot.defaultValue || '';
        }
    }
    resolveContextPath(context, path) {
        const keys = path.split('.');
        let value = context;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
}
class GptSlotResolver {
    async resolve(slot, context) {
        if (!slot.sourceReference) {
            return slot.defaultValue || '';
        }
        try {
            let promptText = slot.sourceReference;
            promptText = promptText.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, path) => {
                const value = this.resolveContextPath(context, path);
                return value !== undefined ? String(value) : '';
            });
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
        }
        catch (error) {
            console.error('GPT slot resolution error:', error);
            return slot.defaultValue || '';
        }
    }
    resolveContextPath(context, path) {
        const keys = path.split('.');
        let value = context;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
}
exports.promptTemplateEngine = new PromptTemplateEngine();
//# sourceMappingURL=prompt-template-engine.js.map