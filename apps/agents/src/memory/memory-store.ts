// =====================================================
// AGENT MEMORY STORE
// =====================================================
// Core interface for adding, searching, and retrieving agent memories

import { createClient } from '@supabase/supabase-js';
import type {
  AgentMemory,
  CreateAgentMemoryInput,
  AgentMemorySearchParams,
  MemorySearchResult,
  MemoryStats,
  MemoryType,
  PruneMemoriesParams,
  PruneMemoriesResult,
} from '@pravado/types';
import { logger } from '../../../api/src/lib/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Memory Store - Interface for agent memory persistence and retrieval
 */
export class MemoryStore {
  /**
   * Add a new memory to the store
   */
  async addMemory(input: CreateAgentMemoryInput): Promise<AgentMemory> {
    try {
      logger.info('Adding agent memory', {
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
        logger.error('Failed to add agent memory', error);
        throw new Error(`Failed to add memory: ${error.message}`);
      }

      // Fetch the created memory
      const { data: memory, error: fetchError } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError || !memory) {
        throw new Error('Failed to fetch created memory');
      }

      return this.mapToAgentMemory(memory);
    } catch (error) {
      logger.error('Error adding memory', error);
      throw error;
    }
  }

  /**
   * Search memories using semantic search and metadata filtering
   */
  async searchMemory(params: AgentMemorySearchParams): Promise<MemorySearchResult> {
    try {
      logger.info('Searching agent memories', {
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
        logger.error('Failed to search memories', error);
        throw new Error(`Failed to search memories: ${error.message}`);
      }

      const memories = data.map((row: any) => ({
        id: row.id,
        agentId: params.agentId,
        memoryType: row.memory_type,
        content: row.content,
        contentEmbedding: null, // Don't return embeddings in search results
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
    } catch (error) {
      logger.error('Error searching memories', error);
      throw error;
    }
  }

  /**
   * Get recent memories for an agent
   */
  async getRecentMemories(
    agentId: string,
    organizationId: string,
    limit: number = 50,
    memoryTypes?: MemoryType[]
  ): Promise<AgentMemory[]> {
    try {
      logger.info('Getting recent memories', { agentId, limit });

      const { data, error } = await supabase.rpc('get_recent_agent_memories', {
        p_agent_id: agentId,
        p_organization_id: organizationId,
        p_limit: limit,
        p_memory_types: memoryTypes || null,
      });

      if (error) {
        logger.error('Failed to get recent memories', error);
        throw new Error(`Failed to get recent memories: ${error.message}`);
      }

      return data.map((row: any) => ({
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
    } catch (error) {
      logger.error('Error getting recent memories', error);
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(id: string, organizationId: string): Promise<AgentMemory | null> {
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
    } catch (error) {
      logger.error('Error getting memory by ID', error);
      return null;
    }
  }

  /**
   * Get memory statistics for an agent
   */
  async getMemoryStats(agentId: string, organizationId: string): Promise<MemoryStats> {
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

      const memoriesByType: Record<string, number> = {};
      let totalImportance = 0;
      let oldestMemory: Date | null = null;
      let newestMemory: Date | null = null;

      memories.forEach((memory: any) => {
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
        memoriesByType: memoriesByType as any,
        avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
        oldestMemory,
        newestMemory,
        totalSnapshots: snapshots.length,
      };
    } catch (error) {
      logger.error('Error getting memory stats', error);
      throw error;
    }
  }

  /**
   * Prune old low-importance memories
   */
  async pruneMemories(params: PruneMemoriesParams): Promise<PruneMemoriesResult> {
    try {
      logger.info('Pruning agent memories', params);

      const { data, error } = await supabase.rpc('prune_agent_memories', {
        p_agent_id: params.agentId,
        p_organization_id: params.organizationId,
        p_older_than_days: params.olderThanDays || 90,
        p_max_importance: params.maxImportance || 0.3,
      });

      if (error) {
        logger.error('Failed to prune memories', error);
        throw new Error(`Failed to prune memories: ${error.message}`);
      }

      return {
        deletedCount: data,
        pruned: data > 0,
      };
    } catch (error) {
      logger.error('Error pruning memories', error);
      throw error;
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(id: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_memories')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Failed to delete memory', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting memory', error);
      return false;
    }
  }

  /**
   * Map database row to AgentMemory type
   */
  private mapToAgentMemory(row: any): AgentMemory {
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

// Export singleton instance
export const memoryStore = new MemoryStore();
