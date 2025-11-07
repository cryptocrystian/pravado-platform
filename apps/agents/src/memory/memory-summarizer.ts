// =====================================================
// AGENT MEMORY SUMMARIZER
// =====================================================
// GPT-4 driven summarization of agent memories into snapshots

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type {
  AgentMemory,
  AgentMemorySnapshot,
  GenerateSnapshotParams,
  CreateMemorySnapshotInput,
} from '@pravado/types';
import { logger } from '../../../api/src/lib/logger';
import { memoryStore } from './memory-store';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Memory Summarizer - Creates temporal summaries of agent memories
 */
export class MemorySummarizer {
  /**
   * Generate a snapshot summary for a time window
   */
  async generateSnapshot(params: GenerateSnapshotParams): Promise<AgentMemorySnapshot> {
    try {
      logger.info('Generating memory snapshot', {
        agentId: params.agentId,
        startTime: params.startTime,
        endTime: params.endTime,
      });

      // Fetch memories in the time window
      const memories = await this.getMemoriesInTimeWindow(
        params.agentId,
        params.organizationId,
        params.startTime,
        params.endTime,
        params.tags
      );

      if (memories.length === 0) {
        logger.warn('No memories found in time window', params);
        throw new Error('No memories found in specified time window');
      }

      // Generate summary using GPT-4
      const snapshotText = await this.summarizeMemories(memories, params.agentId);

      // Store snapshot in database
      const { data, error } = await supabase.rpc('generate_memory_snapshot', {
        p_agent_id: params.agentId,
        p_organization_id: params.organizationId,
        p_start_time: params.startTime.toISOString(),
        p_end_time: params.endTime.toISOString(),
        p_snapshot_text: snapshotText,
      });

      if (error) {
        logger.error('Failed to store snapshot', error);
        throw new Error(`Failed to store snapshot: ${error.message}`);
      }

      // Fetch the created snapshot
      const { data: snapshot, error: fetchError } = await supabase
        .from('agent_memory_snapshots')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError || !snapshot) {
        throw new Error('Failed to fetch created snapshot');
      }

      return this.mapToSnapshot(snapshot);
    } catch (error) {
      logger.error('Error generating snapshot', error);
      throw error;
    }
  }

  /**
   * Get snapshots for an agent
   */
  async getSnapshots(
    agentId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<AgentMemorySnapshot[]> {
    try {
      const { data, error } = await supabase
        .from('agent_memory_snapshots')
        .select('*')
        .eq('agent_id', agentId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get snapshots', error);
        throw new Error(`Failed to get snapshots: ${error.message}`);
      }

      return data.map((row: any) => this.mapToSnapshot(row));
    } catch (error) {
      logger.error('Error getting snapshots', error);
      throw error;
    }
  }

  /**
   * Summarize daily memories (useful for cron jobs)
   */
  async summarizeDailyMemories(agentId: string, organizationId: string, date: Date): Promise<AgentMemorySnapshot> {
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

  /**
   * Summarize weekly memories
   */
  async summarizeWeeklyMemories(agentId: string, organizationId: string, weekStartDate: Date): Promise<AgentMemorySnapshot> {
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

  /**
   * Get memories within a time window
   */
  private async getMemoriesInTimeWindow(
    agentId: string,
    organizationId: string,
    startTime: Date,
    endTime: Date,
    tags?: string[]
  ): Promise<AgentMemory[]> {
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

    return data.map((row: any) => ({
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

  /**
   * Use GPT-4 to summarize a collection of memories
   */
  private async summarizeMemories(memories: AgentMemory[], agentId: string): Promise<string> {
    try {
      // Group memories by type
      const memoriesByType = memories.reduce((acc, memory) => {
        if (!acc[memory.memoryType]) {
          acc[memory.memoryType] = [];
        }
        acc[memory.memoryType].push(memory);
        return acc;
      }, {} as Record<string, AgentMemory[]>);

      // Build context for GPT-4
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

      logger.info('Generated memory summary', {
        agentId,
        memoryCount: memories.length,
        summaryLength: summary.length,
        tokensUsed: completion.usage?.total_tokens,
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing memories with GPT-4', error);
      throw error;
    }
  }

  /**
   * Map database row to AgentMemorySnapshot type
   */
  private mapToSnapshot(row: any): AgentMemorySnapshot {
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

// Export singleton instance
export const memorySummarizer = new MemorySummarizer();
