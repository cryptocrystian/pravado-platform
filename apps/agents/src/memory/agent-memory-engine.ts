// =====================================================
// AGENT MEMORY + EPISODIC CONTEXT ENGINE
// Sprint 36: Long-term agent memory and contextual recall
// =====================================================

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  MemoryEpisode,
  MemoryChunk,
  MemoryLink,
  MemoryEvent,
  MemoryEpisodeWithDetails,
  MemorySearchResult,
  MemoryTimeline,
  MemoryDashboard,
  GptMemorySummary,
  GptMemoryCompression,
  MemoryContextForAgent,
  MemoryInjectionPrompt,
  StoreMemoryEpisodeInput,
  UpdateMemoryEpisodeInput,
  EmbedMemoryChunksInput,
  LinkMemoryReferencesInput,
  SearchMemoryInput,
  GetMemoryEpisodesInput,
  GetMemoryTimelineInput,
  GetMemoryDashboardInput,
  SummarizeMemoryInput,
  CompressMemoryInput,
  LogMemoryEventInput,
  MemoryType,
  MemoryStatus,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

class AgentMemoryEngine extends EventEmitter {
  // =====================================================
  // MEMORY INGESTION
  // =====================================================

  /**
   * Store a memory episode
   */
  async storeEpisode(input: StoreMemoryEpisodeInput): Promise<string> {
    const { data: episodeId, error } = await supabase.rpc('store_memory_episode', {
      p_organization_id: input.organizationId,
      p_memory_type: input.memoryType,
      p_agent_id: input.agentId,
      p_thread_id: input.threadId,
      p_session_id: input.sessionId,
      p_title: input.title,
      p_content: input.content,
      p_context: input.context || {},
      p_metadata: input.metadata || {},
      p_importance_score: input.importanceScore || 50,
      p_occurred_at: input.occurredAt,
      p_created_by: input.createdBy,
    });

    if (error) {
      throw new Error(`Failed to store memory episode: ${error.message}`);
    }

    // Generate embedding for the episode
    try {
      await this.generateEmbedding(episodeId, input.content);
    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }

    this.emit('memory-stored', { episodeId, memoryType: input.memoryType });
    return episodeId;
  }

  /**
   * Generate embedding for memory episode
   */
  private async generateEmbedding(episodeId: string, content: string): Promise<void> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
    });

    const embedding = response.data[0].embedding;

    await supabase
      .from('agent_memory_episodes')
      .update({ embedding })
      .eq('id', episodeId);
  }

  /**
   * Embed memory episode into chunks
   */
  async embedEpisodeChunks(input: EmbedMemoryChunksInput): Promise<MemoryChunk[]> {
    const chunkSize = input.chunkSize || 500;
    const overlapSize = input.overlapSize || 50;

    // Get episode
    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .select('content')
      .eq('id', input.episodeId)
      .single();

    if (error || !episode) {
      throw new Error('Episode not found');
    }

    // Split into chunks
    const chunks = this.splitIntoChunks(episode.content, chunkSize, overlapSize);

    // Create chunks with embeddings
    const createdChunks: MemoryChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];

      // Generate embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunkContent,
      });

      const embedding = response.data[0].embedding;

      // Store chunk
      const { data: chunk, error: chunkError } = await supabase
        .from('agent_memory_chunks')
        .insert({
          episode_id: input.episodeId,
          chunk_index: i,
          chunk_content: chunkContent,
          embedding,
        })
        .select()
        .single();

      if (!chunkError && chunk) {
        createdChunks.push(chunk);
      }
    }

    this.emit('chunks-embedded', { episodeId: input.episodeId, chunkCount: createdChunks.length });
    return createdChunks;
  }

  /**
   * Split content into overlapping chunks
   */
  private splitIntoChunks(content: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const words = content.split(' ');

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);

      if (i + chunkSize >= words.length) break;
    }

    return chunks;
  }

  /**
   * Link memory to references
   */
  async linkReferences(input: LinkMemoryReferencesInput): Promise<string> {
    const { data: linkId, error } = await supabase.rpc('link_memory_references', {
      p_episode_id: input.episodeId,
      p_campaign_id: input.campaignId,
      p_contact_id: input.contactId,
      p_goal_id: input.goalId,
      p_evaluation_id: input.evaluationId,
      p_agent_run_id: input.agentRunId,
      p_link_type: input.linkType || 'reference',
      p_relevance_score: input.relevanceScore || 50,
    });

    if (error) {
      throw new Error(`Failed to link memory: ${error.message}`);
    }

    // Log linking event
    await this.logMemoryEvent({
      episodeId: input.episodeId,
      eventType: 'LINKED',
      description: `Memory linked to ${input.linkType || 'reference'}`,
      eventData: {
        campaignId: input.campaignId,
        contactId: input.contactId,
        goalId: input.goalId,
      },
    });

    this.emit('memory-linked', { linkId, episodeId: input.episodeId });
    return linkId;
  }

  // =====================================================
  // MEMORY RECALL & SEARCH
  // =====================================================

  /**
   * Retrieve relevant episodes using vector search
   */
  async retrieveRelevantEpisodes(input: SearchMemoryInput): Promise<MemorySearchResult[]> {
    // Generate query embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: input.query,
    });

    const queryEmbedding = response.data[0].embedding;

    // Search using database function
    const { data: results, error } = await supabase.rpc('search_memory', {
      p_organization_id: input.organizationId,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_memory_type: input.memoryType,
      p_agent_id: input.agentId,
      p_thread_id: input.threadId,
      p_min_importance: input.minImportance || 0,
      p_limit: input.limit || 10,
    });

    if (error) {
      throw new Error(`Failed to search memory: ${error.message}`);
    }

    // Log access events
    for (const result of results || []) {
      await this.logMemoryEvent({
        episodeId: result.episode_id,
        eventType: 'ACCESSED',
        description: 'Memory accessed via vector search',
        eventData: { query: input.query, similarity: result.similarity },
      });
    }

    return (results || []).map((r: any) => ({
      episode: {
        id: r.episode_id,
        title: r.title,
        content: r.content,
        summary: r.summary,
        memory_type: r.memory_type,
        importance_score: r.importance_score,
        occurred_at: r.occurred_at,
      } as MemoryEpisode,
      similarity: r.similarity,
    }));
  }

  /**
   * Search memory episodes
   */
  async searchMemory(input: SearchMemoryInput): Promise<MemorySearchResult[]> {
    return this.retrieveRelevantEpisodes(input);
  }

  /**
   * Get memory episodes with filters
   */
  async getMemoryEpisodes(input: GetMemoryEpisodesInput): Promise<{ episodes: MemoryEpisode[]; total: number }> {
    let query = supabase
      .from('agent_memory_episodes')
      .select('*', { count: 'exact' })
      .eq('organization_id', input.organizationId);

    if (input.memoryType) query = query.eq('memory_type', input.memoryType);
    if (input.status) query = query.eq('status', input.status);
    if (input.agentId) query = query.eq('agent_id', input.agentId);
    if (input.threadId) query = query.eq('thread_id', input.threadId);
    if (input.sessionId) query = query.eq('session_id', input.sessionId);
    if (input.minImportance !== undefined) query = query.gte('importance_score', input.minImportance);
    if (input.maxImportance !== undefined) query = query.lte('importance_score', input.maxImportance);
    if (input.startDate) query = query.gte('occurred_at', input.startDate);
    if (input.endDate) query = query.lte('occurred_at', input.endDate);

    query = query.order('occurred_at', { ascending: false });

    if (input.limit) query = query.limit(input.limit);
    if (input.offset) query = query.range(input.offset, input.offset + (input.limit || 50) - 1);

    const { data: episodes, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get memory episodes: ${error.message}`);
    }

    return {
      episodes: episodes || [],
      total: count || 0,
    };
  }

  /**
   * Get memory episode by ID with details
   */
  async getEpisodeById(organizationId: string, episodeId: string): Promise<MemoryEpisodeWithDetails> {
    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .select('*')
      .eq('id', episodeId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to get episode: ${error.message}`);
    }

    // Get chunks
    const { data: chunks } = await supabase
      .from('agent_memory_chunks')
      .select('*')
      .eq('episode_id', episodeId)
      .order('chunk_index', { ascending: true });

    // Get links
    const { data: links } = await supabase
      .from('agent_memory_links')
      .select('*')
      .eq('episode_id', episodeId);

    // Get recent events
    const { data: events } = await supabase
      .from('agent_memory_events')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...episode,
      chunks: chunks || [],
      links: links || [],
      recent_events: events || [],
      total_chunks: chunks?.length || 0,
      total_links: links?.length || 0,
      total_events: events?.length || 0,
    };
  }

  // =====================================================
  // AI-POWERED OPERATIONS
  // =====================================================

  /**
   * Summarize memory episode with GPT-4
   */
  async summarizeEpisode(input: SummarizeMemoryInput): Promise<GptMemorySummary> {
    const episode = await this.getEpisodeById(input.organizationId, input.episodeId);

    const prompt = `Analyze and summarize the following memory episode:

**Title:** ${episode.title}
**Type:** ${episode.memory_type}
**Content:**
${episode.content}

**Context:**
${JSON.stringify(episode.context, null, 2)}

Provide a comprehensive analysis in JSON format with:
1. summary: Concise summary (2-3 sentences)
2. key_points: Array of key points (3-5 items)
3. extracted_entities: Object with arrays for people, organizations, locations, dates, concepts
4. importance_reasoning: Why this memory is important
5. suggested_importance: Suggested importance score (0-100)
6. tags: Array of relevant tags`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing and summarizing agent memories for future retrieval and context.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    const summary: GptMemorySummary = {
      episode_id: input.episodeId,
      summary: analysis.summary,
      key_points: analysis.key_points || [],
      extracted_entities: analysis.extracted_entities || {},
      importance_reasoning: analysis.importance_reasoning || '',
      suggested_importance: analysis.suggested_importance || episode.importance_score,
      tags: analysis.tags || [],
      generated_at: new Date().toISOString(),
    };

    // Update episode with summary
    await supabase
      .from('agent_memory_episodes')
      .update({
        summary: analysis.summary,
        importance_score: analysis.suggested_importance || episode.importance_score,
      })
      .eq('id', input.episodeId);

    // Log summarization event
    await this.logMemoryEvent({
      episodeId: input.episodeId,
      eventType: 'SUMMARIZED',
      description: 'Memory summarized by GPT-4',
      eventData: { summary: analysis.summary },
    });

    this.emit('memory-summarized', summary);
    return summary;
  }

  /**
   * Compress multiple memories with GPT-4
   */
  async compressMemories(input: CompressMemoryInput): Promise<GptMemoryCompression> {
    // Get all episodes
    const episodes: MemoryEpisode[] = [];
    for (const episodeId of input.episodeIds) {
      const episode = await this.getEpisodeById(input.organizationId, episodeId);
      episodes.push(episode);
    }

    const prompt = `Compress the following ${episodes.length} memory episodes into a single consolidated memory:

${episodes.map((e, i) => `
### Episode ${i + 1}: ${e.title}
**Type:** ${e.memory_type}
**Occurred:** ${e.occurred_at}
**Content:**
${e.content}
${e.summary ? `**Summary:** ${e.summary}` : ''}
`).join('\n---\n')}

Create a compressed version that:
1. Preserves essential information
2. Removes redundancy
3. Maintains temporal ordering
4. Keeps key details

Provide compression result in JSON format with:
1. compressed_content: The consolidated memory text
2. summary: Brief summary of consolidated memory
3. preserved_details: Array of critical details preserved
4. compression_ratio: Estimated compression ratio (0-1)
5. information_loss_assessment: Assessment of information loss`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at memory compression, preserving essential information while reducing redundancy.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    const compression: GptMemoryCompression = {
      original_episode_ids: input.episodeIds,
      compressed_content: result.compressed_content,
      summary: result.summary,
      preserved_details: result.preserved_details || [],
      compression_ratio: result.compression_ratio || 0.5,
      information_loss_assessment: result.information_loss_assessment,
      generated_at: new Date().toISOString(),
    };

    this.emit('memories-compressed', compression);
    return compression;
  }

  /**
   * Get memory context for agent
   */
  async getMemoryContext(
    organizationId: string,
    query: string,
    agentId?: string,
    threadId?: string,
    limit = 5
  ): Promise<MemoryContextForAgent> {
    const startTime = Date.now();

    // Search for relevant memories
    const searchResults = await this.retrieveRelevantEpisodes({
      organizationId,
      query,
      agentId,
      threadId,
      limit,
    });

    // Generate context summary with GPT-4
    const prompt = `Based on these relevant memories, provide context for the agent:

**Query:** ${query}

**Relevant Memories:**
${searchResults.map((r, i) => `
${i + 1}. ${r.episode.title} (Similarity: ${(r.similarity * 100).toFixed(1)}%)
${r.episode.summary || r.episode.content.substring(0, 200)}...
`).join('\n')}

Provide in JSON format:
1. context_summary: Summary of relevant context (2-3 sentences)
2. key_insights: Array of key insights to remember (3-5 items)
3. suggested_actions: Optional array of suggested actions based on history`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at synthesizing memory context for AI agents.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    const retrievalTime = Date.now() - startTime;

    return {
      relevant_episodes: searchResults.map((r) => ({
        episode: r.episode,
        similarity: r.similarity,
        why_relevant: analysis.context_summary || 'Semantically similar content',
      })),
      context_summary: analysis.context_summary || '',
      key_insights: analysis.key_insights || [],
      suggested_actions: analysis.suggested_actions,
      total_episodes_searched: searchResults.length,
      retrieval_time_ms: retrievalTime,
    };
  }

  /**
   * Inject memory context into prompt
   */
  async injectMemoryPrompt(
    organizationId: string,
    query: string,
    agentId?: string,
    threadId?: string
  ): Promise<MemoryInjectionPrompt> {
    const context = await this.getMemoryContext(organizationId, query, agentId, threadId);

    return {
      prompt_prefix: 'You have access to the following relevant memories and context:',
      memory_context: context.context_summary,
      key_facts: context.key_insights,
      relevant_history: context.relevant_episodes.map(
        (e) => `- ${e.episode.title}: ${e.episode.summary || e.episode.content.substring(0, 100)}...`
      ),
      constraints: ['Use this context to inform your response', 'Reference specific memories when relevant'],
    };
  }

  // =====================================================
  // MEMORY MANAGEMENT
  // =====================================================

  /**
   * Update memory episode
   */
  async updateEpisode(input: UpdateMemoryEpisodeInput): Promise<MemoryEpisode> {
    const { episodeId, ...updates } = input;

    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.content) updateData.content = updates.content;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.status) updateData.status = updates.status;
    if (updates.importanceScore !== undefined) updateData.importance_score = updates.importanceScore;
    if (updates.context) updateData.context = updates.context;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { data: episode, error } = await supabase
      .from('agent_memory_episodes')
      .update(updateData)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update episode: ${error.message}`);
    }

    this.emit('memory-updated', episode);
    return episode;
  }

  /**
   * Log memory event
   */
  async logMemoryEvent(input: LogMemoryEventInput): Promise<string> {
    const { data: event, error } = await supabase
      .from('agent_memory_events')
      .insert({
        episode_id: input.episodeId,
        event_type: input.eventType,
        description: input.description,
        event_data: input.eventData || {},
        triggered_by: input.triggeredBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log memory event: ${error.message}`);
    }

    return event.id;
  }

  // =====================================================
  // DASHBOARD & ANALYTICS
  // =====================================================

  /**
   * Get memory timeline
   */
  async getMemoryTimeline(input: GetMemoryTimelineInput): Promise<MemoryTimeline> {
    let query = supabase
      .from('agent_memory_episodes')
      .select('*', { count: 'exact' })
      .eq('organization_id', input.organizationId);

    if (input.threadId) query = query.eq('thread_id', input.threadId);
    if (input.agentId) query = query.eq('agent_id', input.agentId);
    if (input.startDate) query = query.gte('occurred_at', input.startDate);
    if (input.endDate) query = query.lte('occurred_at', input.endDate);

    query = query.order('occurred_at', { ascending: true });

    const { data: episodes, count } = await query;

    const timeSpan =
      episodes && episodes.length > 0
        ? {
            start: episodes[0].occurred_at,
            end: episodes[episodes.length - 1].occurred_at,
          }
        : { start: new Date().toISOString(), end: new Date().toISOString() };

    return {
      thread_id: input.threadId,
      agent_id: input.agentId,
      episodes: episodes || [],
      total_episodes: count || 0,
      time_span: timeSpan,
    };
  }

  /**
   * Get memory dashboard
   */
  async getMemoryDashboard(input: GetMemoryDashboardInput): Promise<MemoryDashboard> {
    const { data, error } = await supabase.rpc('get_memory_dashboard', {
      p_organization_id: input.organizationId,
      p_agent_id: input.agentId,
      p_period_start: input.periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_period_end: input.periodEnd || new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to get memory dashboard: ${error.message}`);
    }

    return data as MemoryDashboard;
  }
}

export const agentMemoryEngine = new AgentMemoryEngine();
