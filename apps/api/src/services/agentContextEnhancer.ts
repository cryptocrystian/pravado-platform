// =====================================================
// AGENT CONTEXT ENHANCER SERVICE
// Sprint 43 Phase 3.5.3
// =====================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import {
  EnhancedAgentContext,
  MemorySummary,
  MemorySnippet,
  PlaybookExecution,
  CollaborationSummary,
  TemporalContext,
  KeyEntity,
  UserPreferences,
  AgentSettings,
  BuildContextRequest,
  SummarizeMemoryRequest,
  ContextInjectionResult,
  AgentMemorySummaryEntity,
} from '@pravado/shared-types';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Context cache for performance
const contextCache = new Map<string, { context: EnhancedAgentContext; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Agent Context Enhancer
 * Enriches agent context with memory, preferences, history, and temporal awareness
 */
class AgentContextEnhancer {
  /**
   * Build enhanced context by aggregating data from multiple sources
   */
  async buildEnhancedContext(
    agentId: string,
    taskContext: {
      prompt: string;
      userId?: string;
      organizationId?: string;
      metadata?: Record<string, any>;
    },
    options?: {
      includeMemory?: boolean;
      includePlaybooks?: boolean;
      includeCollaborations?: boolean;
      includePreferences?: boolean;
      maxMemorySnippets?: number;
      maxRecentPlaybooks?: number;
      timeWindowDays?: number;
    }
  ): Promise<EnhancedAgentContext> {
    const {
      includeMemory = true,
      includePlaybooks = true,
      includeCollaborations = true,
      includePreferences = true,
      maxMemorySnippets = 10,
      maxRecentPlaybooks = 5,
      timeWindowDays = 30,
    } = options || {};

    // Check cache first
    const cacheKey = `${agentId}:${taskContext.prompt.slice(0, 50)}`;
    const cached = contextCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.context;
    }

    try {
      // Parallel data fetching for performance
      const [
        memorySnippets,
        recentPlaybooks,
        pastCollaborations,
        preferences,
        agentSettings,
      ] = await Promise.all([
        includeMemory ? this.getRelevantMemory(agentId, taskContext.prompt, maxMemorySnippets, timeWindowDays) : Promise.resolve([]),
        includePlaybooks ? this.getRecentPlaybooks(agentId, maxRecentPlaybooks, timeWindowDays) : Promise.resolve([]),
        includeCollaborations ? this.getPastCollaborations(agentId, timeWindowDays) : Promise.resolve([]),
        includePreferences && taskContext.userId ? this.getUserPreferences(taskContext.userId) : Promise.resolve(undefined),
        this.getAgentSettings(agentId),
      ]);

      // Extract key entities and topics from memory
      const keyEntities = this.extractKeyEntities(memorySnippets);
      const trendingTopics = await this.getTrendingTopics(agentId, 7);

      // Build temporal context
      const temporalContext = this.buildTemporalContext();

      const enhancedContext: EnhancedAgentContext = {
        agentId,
        organizationId: taskContext.organizationId || '',
        prompt: taskContext.prompt,
        userId: taskContext.userId,
        preferences,
        agentSettings,
        memorySnippets,
        recentPlaybooks,
        pastCollaborations,
        temporalContext,
        keyEntities,
        trendingTopics,
        metadata: taskContext.metadata,
      };

      // Cache the context
      contextCache.set(cacheKey, {
        context: enhancedContext,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return enhancedContext;
    } catch (error) {
      console.error('Error building enhanced context:', error);
      // Return minimal context on error
      return {
        agentId,
        organizationId: taskContext.organizationId || '',
        prompt: taskContext.prompt,
        userId: taskContext.userId,
        memorySnippets: [],
        recentPlaybooks: [],
        pastCollaborations: [],
        metadata: taskContext.metadata,
      };
    }
  }

  /**
   * Summarize agent memory using GPT-4
   * Creates condensed summaries for efficient context retrieval
   */
  async summarizeAgentMemory(
    agentId: string,
    scope: 'short_term' | 'long_term',
    organizationId: string,
    options?: {
      summaryType?: 'short_term' | 'long_term' | 'topical' | 'entity_based';
      timeWindowDays?: number;
      maxEntries?: number;
      forceRegenerate?: boolean;
    }
  ): Promise<MemorySummary> {
    const {
      summaryType = scope === 'short_term' ? 'short_term' : 'long_term',
      timeWindowDays = scope === 'short_term' ? 7 : 30,
      maxEntries = 100,
      forceRegenerate = false,
    } = options || {};

    try {
      // Check for existing recent summary
      if (!forceRegenerate) {
        const { data: existingSummary } = await supabase
          .rpc('get_recent_agent_summary', {
            p_agent_id: agentId,
            p_scope: scope,
            p_summary_type: summaryType,
          })
          .single();

        if (existingSummary) {
          const summaryAge = Date.now() - new Date(existingSummary.created_at).getTime();
          const maxAge = scope === 'short_term' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

          if (summaryAge < maxAge) {
            // Return existing summary if recent enough
            return {
              id: existingSummary.id,
              agentId,
              organizationId,
              summaryType,
              scope,
              summaryText: existingSummary.summary_text,
              topics: existingSummary.topics || [],
              entities: existingSummary.entities || [],
              trends: existingSummary.trends || [],
              timePeriod: {
                start: new Date(existingSummary.time_period_start),
                end: new Date(existingSummary.time_period_end),
              },
              entryCount: 0,
              createdAt: new Date(existingSummary.created_at),
            };
          }
        }
      }

      // Fetch memory entries to summarize
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeWindowDays);

      const memoryEntries = await this.getMemoryEntries(agentId, startDate, new Date(), maxEntries);

      if (memoryEntries.length === 0) {
        throw new Error('No memory entries to summarize');
      }

      // Use GPT-4 to generate summary
      const summary = await this.generateMemorySummary(memoryEntries, summaryType, scope);

      // Store summary in database
      const summaryId = uuidv4();
      const summaryEntity: Omit<AgentMemorySummaryEntity, 'created_at'> = {
        id: summaryId,
        agent_id: agentId,
        organization_id: organizationId,
        summary_type: summaryType,
        scope,
        summary_text: summary.summaryText,
        topics: summary.topics,
        entities: summary.entities.map(e => ({
          name: e.name,
          type: e.type,
          mentions: e.mentions,
          context: e.context,
        })),
        trends: summary.trends || [],
        time_period_start: startDate,
        time_period_end: new Date(),
        entry_count: memoryEntries.length,
        metadata: null,
      };

      const { error } = await supabase
        .from('agent_memory_summaries')
        .insert(summaryEntity);

      if (error) {
        console.error('Error storing memory summary:', error);
        throw new Error(`Failed to store summary: ${error.message}`);
      }

      return {
        id: summaryId,
        agentId,
        organizationId,
        summaryType,
        scope,
        summaryText: summary.summaryText,
        topics: summary.topics,
        entities: summary.entities,
        trends: summary.trends,
        timePeriod: {
          start: startDate,
          end: new Date(),
        },
        entryCount: memoryEntries.length,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error summarizing agent memory:', error);
      throw error;
    }
  }

  /**
   * Inject enhanced context into a prompt template
   * Replaces placeholders with actual context data
   */
  injectContextIntoPrompt(
    template: string,
    context: EnhancedAgentContext
  ): ContextInjectionResult {
    let prompt = template;
    const placeholdersReplaced: string[] = [];

    // Replace memory snippets
    if (template.includes('{{memory}}') || template.includes('{{recentMemory}}')) {
      const memoryText = context.memorySnippets
        .map((snippet, i) => `${i + 1}. ${snippet.content} (${snippet.type}, ${new Date(snippet.timestamp).toLocaleDateString()})`)
        .join('\n');

      prompt = prompt.replace(/\{\{memory\}\}/g, memoryText);
      prompt = prompt.replace(/\{\{recentMemory\}\}/g, memoryText);
      placeholdersReplaced.push('memory', 'recentMemory');
    }

    // Replace recent playbooks
    if (template.includes('{{recentPlaybooks}}') || template.includes('{{playbooks}}')) {
      const playbooksText = context.recentPlaybooks
        .map((pb, i) => `${i + 1}. ${pb.playbookName} (${pb.status}) - ${new Date(pb.timestamp).toLocaleDateString()}`)
        .join('\n');

      prompt = prompt.replace(/\{\{recentPlaybooks\}\}/g, playbooksText);
      prompt = prompt.replace(/\{\{playbooks\}\}/g, playbooksText);
      placeholdersReplaced.push('recentPlaybooks', 'playbooks');
    }

    // Replace collaborations
    if (template.includes('{{collaborations}}') || template.includes('{{pastCollaborations}}')) {
      const collaborationsText = context.pastCollaborations
        .map((collab, i) => `${i + 1}. ${collab.type} with ${collab.partnerAgents.join(', ')} - ${collab.outcome}`)
        .join('\n');

      prompt = prompt.replace(/\{\{collaborations\}\}/g, collaborationsText);
      prompt = prompt.replace(/\{\{pastCollaborations\}\}/g, collaborationsText);
      placeholdersReplaced.push('collaborations', 'pastCollaborations');
    }

    // Replace key entities
    if (template.includes('{{entities}}') || template.includes('{{keyEntities}}')) {
      const entitiesText = (context.keyEntities || [])
        .map((entity, i) => `${i + 1}. ${entity.name} (${entity.type}) - ${entity.mentions} mentions`)
        .join('\n');

      prompt = prompt.replace(/\{\{entities\}\}/g, entitiesText);
      prompt = prompt.replace(/\{\{keyEntities\}\}/g, entitiesText);
      placeholdersReplaced.push('entities', 'keyEntities');
    }

    // Replace trending topics
    if (template.includes('{{trendingTopics}}') || template.includes('{{topics}}')) {
      const topicsText = (context.trendingTopics || []).join(', ');

      prompt = prompt.replace(/\{\{trendingTopics\}\}/g, topicsText);
      prompt = prompt.replace(/\{\{topics\}\}/g, topicsText);
      placeholdersReplaced.push('trendingTopics', 'topics');
    }

    // Replace user preferences
    if (template.includes('{{preferences}}') && context.preferences) {
      const preferencesText = JSON.stringify(context.preferences, null, 2);
      prompt = prompt.replace(/\{\{preferences\}\}/g, preferencesText);
      placeholdersReplaced.push('preferences');
    }

    // Replace temporal context
    if (template.includes('{{timeOfDay}}') && context.temporalContext) {
      prompt = prompt.replace(/\{\{timeOfDay\}\}/g, context.temporalContext.timeOfDay);
      placeholdersReplaced.push('timeOfDay');
    }

    if (template.includes('{{dayOfWeek}}') && context.temporalContext) {
      prompt = prompt.replace(/\{\{dayOfWeek\}\}/g, context.temporalContext.dayOfWeek);
      placeholdersReplaced.push('dayOfWeek');
    }

    // Replace current prompt
    if (template.includes('{{prompt}}') || template.includes('{{task}}')) {
      prompt = prompt.replace(/\{\{prompt\}\}/g, context.prompt);
      prompt = prompt.replace(/\{\{task\}\}/g, context.prompt);
      placeholdersReplaced.push('prompt', 'task');
    }

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const tokensUsed = Math.ceil(prompt.length / 4);

    return {
      prompt,
      tokensUsed,
      placeholdersReplaced: [...new Set(placeholdersReplaced)],
      contextSummary: {
        memorySnippets: context.memorySnippets.length,
        recentPlaybooks: context.recentPlaybooks.length,
        collaborations: context.pastCollaborations.length,
        entities: context.keyEntities?.length || 0,
      },
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Get relevant memory snippets for a task
   */
  private async getRelevantMemory(
    agentId: string,
    prompt: string,
    maxSnippets: number,
    timeWindowDays: number
  ): Promise<MemorySnippet[]> {
    try {
      // Mock implementation - replace with actual memory search
      // Would use vector similarity search on agent_memory table
      const mockMemory: MemorySnippet[] = [
        {
          id: 'mem-1',
          content: 'User prefers concise communication style',
          type: 'observation',
          relevance: 0.9,
          timestamp: new Date(),
          source: 'user_interaction',
        },
        {
          id: 'mem-2',
          content: 'Successfully launched marketing campaign in Q3',
          type: 'task',
          relevance: 0.75,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          source: 'playbook_execution',
        },
      ];

      return mockMemory.slice(0, maxSnippets);
    } catch (error) {
      console.error('Error fetching relevant memory:', error);
      return [];
    }
  }

  /**
   * Get recent playbook executions
   */
  private async getRecentPlaybooks(
    agentId: string,
    maxPlaybooks: number,
    timeWindowDays: number
  ): Promise<PlaybookExecution[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeWindowDays);

      const { data, error } = await supabase
        .from('agent_playbook_logs')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(maxPlaybooks);

      if (error) throw error;

      return (data || []).map(log => ({
        executionId: log.execution_id || '',
        playbookId: log.selected_playbook_id || '',
        playbookName: log.selected_playbook_name || '',
        status: log.playbook_found ? 'completed' : 'failed',
        timestamp: new Date(log.created_at),
      }));
    } catch (error) {
      console.error('Error fetching recent playbooks:', error);
      return [];
    }
  }

  /**
   * Get past collaborations
   */
  private async getPastCollaborations(
    agentId: string,
    timeWindowDays: number
  ): Promise<CollaborationSummary[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeWindowDays);

      const { data, error } = await supabase
        .from('agent_collaboration_logs')
        .select('*')
        .or(`initiating_agent_id.eq.${agentId},target_agent_ids.cs.{${agentId}}`)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map(log => ({
        collaborationId: log.id,
        type: log.collaboration_type,
        partnerAgents: log.target_agent_ids,
        outcome: log.status,
        timestamp: new Date(log.created_at),
      }));
    } catch (error) {
      console.error('Error fetching past collaborations:', error);
      return [];
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    // Mock implementation - would fetch from user_profiles table
    return {
      tone: 'conversational',
      channels: ['email', 'slack'],
      language: 'en',
      timezone: 'America/New_York',
    };
  }

  /**
   * Get agent settings
   */
  private async getAgentSettings(agentId: string): Promise<AgentSettings | undefined> {
    // Mock implementation - would fetch from agent_settings table
    return {
      behaviorMode: 'proactive',
      verbosity: 'normal',
      creativity: 0.7,
      maxContextTokens: 4000,
    };
  }

  /**
   * Extract key entities from memory snippets
   */
  private extractKeyEntities(snippets: MemorySnippet[]): KeyEntity[] {
    const entityMap = new Map<string, KeyEntity>();

    snippets.forEach(snippet => {
      snippet.entities?.forEach(entityName => {
        const existing = entityMap.get(entityName);
        if (existing) {
          existing.mentions++;
        } else {
          entityMap.set(entityName, {
            name: entityName,
            type: 'other',
            mentions: 1,
          });
        }
      });
    });

    return Array.from(entityMap.values())
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  }

  /**
   * Get trending topics for agent
   */
  private async getTrendingTopics(agentId: string, days: number): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_topics', {
          p_agent_id: agentId,
          p_days: days,
        });

      if (error) throw error;

      return (data || []).map((row: any) => row.topic);
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      return [];
    }
  }

  /**
   * Build temporal context
   */
  private buildTemporalContext(): TemporalContext {
    const now = new Date();
    const hour = now.getHours();

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      currentTime: now,
      dayOfWeek: daysOfWeek[now.getDay()],
      timeOfDay,
    };
  }

  /**
   * Get memory entries for summarization
   */
  private async getMemoryEntries(
    agentId: string,
    startDate: Date,
    endDate: Date,
    maxEntries: number
  ): Promise<Array<{ content: string; timestamp: Date; type: string }>> {
    // Mock implementation - would query agent_memory table
    return [
      {
        content: 'User requested marketing campaign analysis',
        timestamp: new Date(),
        type: 'task',
      },
      {
        content: 'Completed competitor research for Product X',
        timestamp: new Date(),
        type: 'task',
      },
    ];
  }

  /**
   * Generate memory summary using GPT-4
   */
  private async generateMemorySummary(
    memoryEntries: Array<{ content: string; timestamp: Date; type: string }>,
    summaryType: string,
    scope: string
  ): Promise<{
    summaryText: string;
    topics: string[];
    entities: KeyEntity[];
    trends?: string[];
  }> {
    const systemPrompt = `You are summarizing an AI agent's memory to create a concise context summary.

Analyze the provided memory entries and generate:
1. A concise summary (2-3 paragraphs)
2. Key topics (5-10 topics)
3. Key entities (people, organizations, products, concepts)
4. Trends (patterns or recurring themes)

Response format (JSON):
{
  "summary": "concise summary text",
  "topics": ["topic1", "topic2", ...],
  "entities": [
    {"name": "entity name", "type": "person|organization|product|concept", "mentions": count}
  ],
  "trends": ["trend1", "trend2", ...]
}`;

    const userPrompt = `Memory entries (${memoryEntries.length} total):

${memoryEntries.map((entry, i) => `${i + 1}. [${entry.type}] ${entry.content} (${entry.timestamp.toLocaleDateString()})`).join('\n')}

Generate a ${summaryType} summary for ${scope} scope.`;

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

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from GPT-4');
      }

      const result = JSON.parse(responseContent);

      return {
        summaryText: result.summary,
        topics: result.topics || [],
        entities: result.entities || [],
        trends: result.trends || [],
      };
    } catch (error) {
      console.error('Error generating memory summary with GPT-4:', error);
      // Fallback summary
      return {
        summaryText: `Summary of ${memoryEntries.length} memory entries from ${scope} scope.`,
        topics: ['general'],
        entities: [],
        trends: [],
      };
    }
  }
}

// Export singleton instance
export const agentContextEnhancer = new AgentContextEnhancer();
