"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStore = exports.MemoryStore = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class MemoryStore {
    async addMemory(input) {
        try {
            logger_1.logger.info('Adding agent memory', {
                agentId: input.agentId,
                memoryType: input.memoryType,
                organizationId: input.organizationId,
            });
            const { data, error } = await supabase.rpc('insert_agent_memory', {
                p_agent_id: input.agentId,
                p_memory_type: input.memoryType,
                p_content: input.content,
                p_content_embedding: input.contentEmbedding || null,
                p_organization_id: input.organizationId,
                p_agent_execution_id: input.agentExecutionId || null,
                p_related_contact_id: input.relatedContactId || null,
                p_related_campaign_id: input.relatedCampaignId || null,
                p_importance_score: input.importanceScore || 0.5,
                p_context_tags: input.contextTags || [],
                p_expires_at: input.expiresAt || null,
            });
            if (error) {
                logger_1.logger.error('Failed to add agent memory', error);
                throw new Error(`Failed to add memory: ${error.message}`);
            }
            const { data: memory, error: fetchError } = await supabase
                .from('agent_memories')
                .select('*')
                .eq('id', data)
                .single();
            if (fetchError || !memory) {
                throw new Error('Failed to fetch created memory');
            }
            return this.mapToAgentMemory(memory);
        }
        catch (error) {
            logger_1.logger.error('Error adding memory', error);
            throw error;
        }
    }
    async searchMemory(params) {
        try {
            logger_1.logger.info('Searching agent memories', {
                agentId: params.agentId,
                hasEmbedding: !!params.queryEmbedding,
                topK: params.topK,
            });
            const { data, error } = await supabase.rpc('get_agent_memory_context', {
                p_agent_id: params.agentId,
                p_organization_id: params.organizationId,
                p_tags: params.tags || null,
                p_query_embedding: params.queryEmbedding || null,
                p_top_k: params.topK || 10,
                p_similarity_threshold: params.similarityThreshold || 0.7,
                p_min_importance: params.minImportance || 0.3,
            });
            if (error) {
                logger_1.logger.error('Failed to search memories', error);
                throw new Error(`Failed to search memories: ${error.message}`);
            }
            const memories = data.map((row) => ({
                id: row.id,
                agentId: params.agentId,
                memoryType: row.memory_type,
                content: row.content,
                contentEmbedding: null,
                agentExecutionId: null,
                relatedContactId: null,
                relatedCampaignId: null,
                importanceScore: parseFloat(row.importance_score),
                contextTags: row.context_tags,
                createdAt: new Date(row.created_at),
                expiresAt: null,
                organizationId: params.organizationId,
                similarity: row.similarity ? parseFloat(row.similarity) : undefined,
            }));
            const avgImportance = memories.length > 0
                ? memories.reduce((sum, m) => sum + m.importanceScore, 0) / memories.length
                : 0;
            const avgSimilarity = memories.length > 0 && memories[0].similarity !== undefined
                ? memories.reduce((sum, m) => sum + (m.similarity || 0), 0) / memories.length
                : undefined;
            return {
                memories,
                totalCount: memories.length,
                avgImportance,
                avgSimilarity,
            };
        }
        catch (error) {
            logger_1.logger.error('Error searching memories', error);
            throw error;
        }
    }
    async getRecentMemories(agentId, organizationId, limit = 50, memoryTypes) {
        try {
            logger_1.logger.info('Getting recent memories', { agentId, limit });
            const { data, error } = await supabase.rpc('get_recent_agent_memories', {
                p_agent_id: agentId,
                p_organization_id: organizationId,
                p_limit: limit,
                p_memory_types: memoryTypes || null,
            });
            if (error) {
                logger_1.logger.error('Failed to get recent memories', error);
                throw new Error(`Failed to get recent memories: ${error.message}`);
            }
            return data.map((row) => ({
                id: row.id,
                agentId,
                memoryType: row.memory_type,
                content: row.content,
                contentEmbedding: null,
                agentExecutionId: row.agent_execution_id,
                relatedContactId: row.related_contact_id,
                relatedCampaignId: row.related_campaign_id,
                importanceScore: parseFloat(row.importance_score),
                contextTags: row.context_tags,
                createdAt: new Date(row.created_at),
                expiresAt: null,
                organizationId,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting recent memories', error);
            throw error;
        }
    }
    async getMemoryById(id, organizationId) {
        try {
            const { data, error } = await supabase
                .from('agent_memories')
                .select('*')
                .eq('id', id)
                .eq('organization_id', organizationId)
                .single();
            if (error || !data) {
                return null;
            }
            return this.mapToAgentMemory(data);
        }
        catch (error) {
            logger_1.logger.error('Error getting memory by ID', error);
            return null;
        }
    }
    async getMemoryStats(agentId, organizationId) {
        try {
            const { data: memories, error } = await supabase
                .from('agent_memories')
                .select('memory_type, importance_score, created_at')
                .eq('agent_id', agentId)
                .eq('organization_id', organizationId);
            if (error) {
                throw new Error(`Failed to get memory stats: ${error.message}`);
            }
            const { data: snapshots, error: snapshotError } = await supabase
                .from('agent_memory_snapshots')
                .select('id')
                .eq('agent_id', agentId)
                .eq('organization_id', organizationId);
            if (snapshotError) {
                throw new Error(`Failed to get snapshot count: ${snapshotError.message}`);
            }
            const memoriesByType = {};
            let totalImportance = 0;
            let oldestMemory = null;
            let newestMemory = null;
            memories.forEach((memory) => {
                memoriesByType[memory.memory_type] = (memoriesByType[memory.memory_type] || 0) + 1;
                totalImportance += parseFloat(memory.importance_score);
                const createdAt = new Date(memory.created_at);
                if (!oldestMemory || createdAt < oldestMemory) {
                    oldestMemory = createdAt;
                }
                if (!newestMemory || createdAt > newestMemory) {
                    newestMemory = createdAt;
                }
            });
            return {
                totalMemories: memories.length,
                memoriesByType: memoriesByType,
                avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
                oldestMemory,
                newestMemory,
                totalSnapshots: snapshots.length,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting memory stats', error);
            throw error;
        }
    }
    async pruneMemories(params) {
        try {
            logger_1.logger.info('Pruning agent memories', params);
            const { data, error } = await supabase.rpc('prune_agent_memories', {
                p_agent_id: params.agentId,
                p_organization_id: params.organizationId,
                p_older_than_days: params.olderThanDays || 90,
                p_max_importance: params.maxImportance || 0.3,
            });
            if (error) {
                logger_1.logger.error('Failed to prune memories', error);
                throw new Error(`Failed to prune memories: ${error.message}`);
            }
            return {
                deletedCount: data,
                pruned: data > 0,
            };
        }
        catch (error) {
            logger_1.logger.error('Error pruning memories', error);
            throw error;
        }
    }
    async deleteMemory(id, organizationId) {
        try {
            const { error } = await supabase
                .from('agent_memories')
                .delete()
                .eq('id', id)
                .eq('organization_id', organizationId);
            if (error) {
                logger_1.logger.error('Failed to delete memory', error);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting memory', error);
            return false;
        }
    }
    mapToAgentMemory(row) {
        return {
            id: row.id,
            agentId: row.agent_id,
            memoryType: row.memory_type,
            content: row.content,
            contentEmbedding: row.content_embedding,
            agentExecutionId: row.agent_execution_id,
            relatedContactId: row.related_contact_id,
            relatedCampaignId: row.related_campaign_id,
            importanceScore: parseFloat(row.importance_score),
            contextTags: row.context_tags,
            createdAt: new Date(row.created_at),
            expiresAt: row.expires_at ? new Date(row.expires_at) : null,
            organizationId: row.organization_id,
        };
    }
}
exports.MemoryStore = MemoryStore;
exports.memoryStore = new MemoryStore();
//# sourceMappingURL=memory-store.js.map