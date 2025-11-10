"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memorySummarizer = exports.MemorySummarizer = void 0;
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class MemorySummarizer {
    async generateSnapshot(params) {
        try {
            logger_1.logger.info('Generating memory snapshot', {
                agentId: params.agentId,
                startTime: params.startTime,
                endTime: params.endTime,
            });
            const memories = await this.getMemoriesInTimeWindow(params.agentId, params.organizationId, params.startTime, params.endTime, params.tags);
            if (memories.length === 0) {
                logger_1.logger.warn('No memories found in time window', params);
                throw new Error('No memories found in specified time window');
            }
            const snapshotText = await this.summarizeMemories(memories, params.agentId);
            const { data, error } = await supabase.rpc('generate_memory_snapshot', {
                p_agent_id: params.agentId,
                p_organization_id: params.organizationId,
                p_start_time: params.startTime.toISOString(),
                p_end_time: params.endTime.toISOString(),
                p_snapshot_text: snapshotText,
            });
            if (error) {
                logger_1.logger.error('Failed to store snapshot', error);
                throw new Error(`Failed to store snapshot: ${error.message}`);
            }
            const { data: snapshot, error: fetchError } = await supabase
                .from('agent_memory_snapshots')
                .select('*')
                .eq('id', data)
                .single();
            if (fetchError || !snapshot) {
                throw new Error('Failed to fetch created snapshot');
            }
            return this.mapToSnapshot(snapshot);
        }
        catch (error) {
            logger_1.logger.error('Error generating snapshot', error);
            throw error;
        }
    }
    async getSnapshots(agentId, organizationId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('agent_memory_snapshots')
                .select('*')
                .eq('agent_id', agentId)
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                logger_1.logger.error('Failed to get snapshots', error);
                throw new Error(`Failed to get snapshots: ${error.message}`);
            }
            return data.map((row) => this.mapToSnapshot(row));
        }
        catch (error) {
            logger_1.logger.error('Error getting snapshots', error);
            throw error;
        }
    }
    async summarizeDailyMemories(agentId, organizationId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return this.generateSnapshot({
            agentId,
            organizationId,
            startTime: startOfDay,
            endTime: endOfDay,
        });
    }
    async summarizeWeeklyMemories(agentId, organizationId, weekStartDate) {
        const startOfWeek = new Date(weekStartDate);
        const endOfWeek = new Date(weekStartDate);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        return this.generateSnapshot({
            agentId,
            organizationId,
            startTime: startOfWeek,
            endTime: endOfWeek,
        });
    }
    async getMemoriesInTimeWindow(agentId, organizationId, startTime, endTime, tags) {
        let query = supabase
            .from('agent_memories')
            .select('*')
            .eq('agent_id', agentId)
            .eq('organization_id', organizationId)
            .gte('created_at', startTime.toISOString())
            .lt('created_at', endTime.toISOString())
            .order('created_at', { ascending: true });
        if (tags && tags.length > 0) {
            query = query.contains('context_tags', tags);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to fetch memories: ${error.message}`);
        }
        return data.map((row) => ({
            id: row.id,
            agentId: row.agent_id,
            memoryType: row.memory_type,
            content: row.content,
            contentEmbedding: null,
            agentExecutionId: row.agent_execution_id,
            relatedContactId: row.related_contact_id,
            relatedCampaignId: row.related_campaign_id,
            importanceScore: parseFloat(row.importance_score),
            contextTags: row.context_tags,
            createdAt: new Date(row.created_at),
            expiresAt: row.expires_at ? new Date(row.expires_at) : null,
            organizationId: row.organization_id,
        }));
    }
    async summarizeMemories(memories, agentId) {
        try {
            const memoriesByType = memories.reduce((acc, memory) => {
                if (!acc[memory.memoryType]) {
                    acc[memory.memoryType] = [];
                }
                acc[memory.memoryType].push(memory);
                return acc;
            }, {});
            const memoriesText = Object.entries(memoriesByType)
                .map(([type, mems]) => {
                const items = mems
                    .map((m, idx) => `${idx + 1}. [${m.importanceScore.toFixed(2)}] ${m.content}`)
                    .join('\n');
                return `### ${type}\n${items}`;
            })
                .join('\n\n');
            const systemPrompt = `You are a memory consolidation system for an AI agent (ID: ${agentId}).

Your task is to create a concise, coherent summary of the agent's memories over a time period.

Instructions:
1. Synthesize key learnings, facts, and insights
2. Preserve important context about tasks completed
3. Note any patterns or trends in conversations
4. Highlight significant achievements or failures
5. Maintain chronological coherence
6. Importance scores (0-1) indicate memory priority
7. Create a narrative summary that will help the agent recall this period

Output a well-structured summary in 200-500 words.`;
            const userPrompt = `Summarize the following memories:\n\n${memoriesText}`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 1000,
            });
            const summary = completion.choices[0]?.message?.content;
            if (!summary) {
                throw new Error('Failed to generate summary from GPT-4');
            }
            logger_1.logger.info('Generated memory summary', {
                agentId,
                memoryCount: memories.length,
                summaryLength: summary.length,
                tokensUsed: completion.usage?.total_tokens,
            });
            return summary;
        }
        catch (error) {
            logger_1.logger.error('Error summarizing memories with GPT-4', error);
            throw error;
        }
    }
    mapToSnapshot(row) {
        return {
            id: row.id,
            agentId: row.agent_id,
            snapshotText: row.snapshot_text,
            startTime: new Date(row.start_time),
            endTime: new Date(row.end_time),
            memoryCount: row.memory_count,
            contextTags: row.context_tags,
            avgImportance: row.avg_importance ? parseFloat(row.avg_importance) : null,
            createdAt: new Date(row.created_at),
            organizationId: row.organization_id,
        };
    }
}
exports.MemorySummarizer = MemorySummarizer;
exports.memorySummarizer = new MemorySummarizer();
//# sourceMappingURL=memory-summarizer.js.map