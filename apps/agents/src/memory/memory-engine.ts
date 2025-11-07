// =====================================================
// MEMORY ENGINE - AI Memory & Long-Term Strategy
// =====================================================

import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import type {
  AgentMemory,
  MemoryType,
  StoreMemoryInput,
  QueryMemoriesInput,
  MemoryQueryResult,
  CampaignMemoryContext,
  InsertKGNodeInput,
  LinkKGNodesInput,
  CampaignKnowledgeGraph,
  KGNodeType,
  MemorySummaryRequest,
  MemorySummaryResult,
  ContextInjectionInput,
  ContextInjectionResult,
} from '@pravado/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Memory Engine
 * Handles long-term memory storage, retrieval, and knowledge graph management
 */
export class MemoryEngine {
  /**
   * Store agent memory with automatic embedding generation
   */
  async storeMemory(input: StoreMemoryInput): Promise<string> {
    try {
      // Generate embedding if not provided
      let embedding = input.embedding;
      if (!embedding) {
        embedding = await this.generateEmbedding(input.content);
      }

      // Generate summary if not provided
      let summary = input.summary;
      if (!summary && input.content.length > 200) {
        summary = await this.generateSummary(input.content);
      }

      // Store memory using database function
      const { data, error } = await supabase.rpc('store_agent_memory', {
        p_memory_id: input.memoryId,
        p_agent_type: input.agentType,
        p_agent_id: input.agentId || null,
        p_campaign_id: input.campaignId || null,
        p_memory_type: input.memoryType,
        p_content: input.content,
        p_summary: summary || null,
        p_embedding: embedding,
        p_metadata: input.metadata || null,
        p_organization_id: input.organizationId,
      });

      if (error) {
        throw new Error(`Failed to store memory: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('MemoryEngine.storeMemory error:', error);
      throw error;
    }
  }

  /**
   * Query relevant memories using semantic search
   */
  async getRelevantMemories(input: QueryMemoriesInput): Promise<MemoryQueryResult[]> {
    try {
      const { data, error } = await supabase.rpc('query_relevant_memories', {
        p_query_embedding: input.queryEmbedding,
        p_organization_id: input.organizationId,
        p_agent_type: input.agentType || null,
        p_campaign_id: input.campaignId || null,
        p_memory_types: input.memoryTypes || null,
        p_limit: input.limit || 10,
        p_min_similarity: input.minSimilarity || 0.7,
      });

      if (error) {
        throw new Error(`Failed to query memories: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        memoryId: row.memory_id,
        content: row.content,
        summary: row.summary,
        memoryType: row.memory_type as MemoryType,
        agentType: row.agent_type,
        campaignId: row.campaign_id,
        importanceScore: parseFloat(row.importance_score),
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('MemoryEngine.getRelevantMemories error:', error);
      throw error;
    }
  }

  /**
   * Load campaign context memories
   */
  async loadCampaignContext(
    campaignId: string,
    organizationId: string,
    limit: number = 20
  ): Promise<CampaignMemoryContext> {
    try {
      const { data, error } = await supabase.rpc('get_campaign_memory_context', {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
        p_limit: limit,
      });

      if (error) {
        throw new Error(`Failed to load campaign context: ${error.message}`);
      }

      return {
        campaignId,
        memories: (data || []).map((row: any) => ({
          memoryId: row.memory_id,
          content: row.content,
          summary: row.summary,
          memoryType: row.memory_type as MemoryType,
          agentType: row.agent_type,
          importanceScore: parseFloat(row.importance_score),
          createdAt: new Date(row.created_at),
        })),
        count: data?.length || 0,
      };
    } catch (error) {
      console.error('MemoryEngine.loadCampaignContext error:', error);
      throw error;
    }
  }

  /**
   * Summarize memories for compression
   */
  async summarizeMemories(request: MemorySummaryRequest): Promise<MemorySummaryResult> {
    try {
      // Prepare memory content for summarization
      const memoryTexts = request.memories.map(
        (m, i) => `[${i + 1}] ${m.memoryType}: ${m.content}`
      );

      const prompt = `Analyze and summarize the following agent memories. Extract key insights, identify patterns, and provide actionable recommendations.

Memories:
${memoryTexts.join('\n\n')}

Provide:
1. A concise summary of the memories
2. Key insights (3-5 bullet points)
3. Observed patterns (2-3 bullet points)
4. Actionable recommendations (2-3 bullet points)

Format as JSON:
{
  "summary": "...",
  "keyInsights": ["...", "..."],
  "patterns": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant analyzing agent memories to extract insights and patterns.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        summary: result.summary || '',
        keyInsights: result.keyInsights || [],
        patterns: result.patterns || [],
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      console.error('MemoryEngine.summarizeMemories error:', error);
      throw error;
    }
  }

  /**
   * Insert knowledge graph node
   */
  async insertKGNode(input: InsertKGNodeInput): Promise<string> {
    try {
      // Generate embedding if not provided
      let embedding = input.embedding;
      if (!embedding && input.description) {
        embedding = await this.generateEmbedding(
          `${input.label} ${input.description}`
        );
      }

      const { data, error } = await supabase.rpc('insert_knowledge_graph_node', {
        p_node_id: input.nodeId,
        p_campaign_id: input.campaignId,
        p_node_type: input.nodeType,
        p_label: input.label,
        p_description: input.description || null,
        p_properties: input.properties || null,
        p_embedding: embedding || null,
        p_importance_score: input.importanceScore || 0.5,
        p_organization_id: input.organizationId,
      });

      if (error) {
        throw new Error(`Failed to insert KG node: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('MemoryEngine.insertKGNode error:', error);
      throw error;
    }
  }

  /**
   * Link knowledge graph nodes
   */
  async linkKGNodes(input: LinkKGNodesInput): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('link_knowledge_graph_nodes', {
        p_from_node_id: input.fromNodeId,
        p_to_node_id: input.toNodeId,
        p_campaign_id: input.campaignId,
        p_edge_type: input.edgeType,
        p_weight: input.weight || 1.0,
        p_properties: input.properties || null,
        p_organization_id: input.organizationId,
      });

      if (error) {
        throw new Error(`Failed to link KG nodes: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('MemoryEngine.linkKGNodes error:', error);
      throw error;
    }
  }

  /**
   * Get knowledge graph context for campaign
   */
  async getKnowledgeGraphContext(
    campaignId: string,
    organizationId: string,
    nodeTypes?: KGNodeType[],
    minImportance: number = 0.5
  ): Promise<CampaignKnowledgeGraph> {
    try {
      const { data, error } = await supabase.rpc('get_graph_context_for_campaign', {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
        p_node_types: nodeTypes || null,
        p_min_importance: minImportance,
      });

      if (error) {
        throw new Error(`Failed to get KG context: ${error.message}`);
      }

      return {
        campaignId: data.campaignId,
        nodes: data.nodes || [],
        edges: data.edges || [],
      };
    } catch (error) {
      console.error('MemoryEngine.getKnowledgeGraphContext error:', error);
      throw error;
    }
  }

  /**
   * Inject context for agent planning/execution
   */
  async injectContext(input: ContextInjectionInput): Promise<ContextInjectionResult> {
    try {
      let memories: MemoryQueryResult[] = [];
      let knowledgeGraph: CampaignKnowledgeGraph | null = null;

      // Get relevant memories
      if (input.queryText) {
        const queryEmbedding = await this.generateEmbedding(input.queryText);

        memories = await this.getRelevantMemories({
          queryEmbedding,
          organizationId: input.organizationId,
          agentType: input.agentType,
          campaignId: input.campaignId,
          limit: input.maxMemories || 10,
          minSimilarity: 0.7,
        });
      } else if (input.campaignId) {
        const context = await this.loadCampaignContext(
          input.campaignId,
          input.organizationId,
          input.maxMemories || 10
        );
        memories = context.memories.map((m) => ({
          ...m,
          similarity: 1.0,
        }));
      }

      // Get knowledge graph if requested
      if (input.includeKnowledgeGraph && input.campaignId) {
        knowledgeGraph = await this.getKnowledgeGraphContext(
          input.campaignId,
          input.organizationId
        );
      }

      // Build context prompt
      const contextPrompt = this.buildContextPrompt(memories, knowledgeGraph);

      // Calculate stats
      const avgSimilarity =
        memories.length > 0
          ? memories.reduce((sum, m) => sum + m.similarity, 0) / memories.length
          : 0;

      return {
        memories,
        knowledgeGraph,
        contextPrompt,
        stats: {
          memoryCount: memories.length,
          avgSimilarity,
          nodeCount: knowledgeGraph?.nodes.length || 0,
          edgeCount: knowledgeGraph?.edges.length || 0,
        },
      };
    } catch (error) {
      console.error('MemoryEngine.injectContext error:', error);
      throw error;
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('MemoryEngine.generateEmbedding error:', error);
      throw error;
    }
  }

  /**
   * Generate summary using GPT-4
   */
  private async generateSummary(text: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following text in 1-2 concise sentences.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      return completion.choices[0].message.content || text.slice(0, 200);
    } catch (error) {
      console.error('MemoryEngine.generateSummary error:', error);
      // Fallback to truncation
      return text.slice(0, 200);
    }
  }

  /**
   * Build context prompt from memories and knowledge graph
   */
  private buildContextPrompt(
    memories: MemoryQueryResult[],
    knowledgeGraph: CampaignKnowledgeGraph | null
  ): string {
    let prompt = '';

    // Add memories
    if (memories.length > 0) {
      prompt += '# Relevant Memories\n\n';
      memories.forEach((memory, i) => {
        prompt += `${i + 1}. [${memory.memoryType}] (${Math.round(memory.similarity * 100)}% relevant)\n`;
        prompt += `   ${memory.summary || memory.content}\n\n`;
      });
    }

    // Add knowledge graph
    if (knowledgeGraph && knowledgeGraph.nodes.length > 0) {
      prompt += '\n# Campaign Knowledge Graph\n\n';

      // Group nodes by type
      const nodesByType = knowledgeGraph.nodes.reduce((acc, node) => {
        if (!acc[node.type]) acc[node.type] = [];
        acc[node.type].push(node);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [type, nodes] of Object.entries(nodesByType)) {
        prompt += `## ${type}\n`;
        nodes.forEach((node) => {
          prompt += `- ${node.label}`;
          if (node.description) {
            prompt += `: ${node.description}`;
          }
          prompt += '\n';
        });
        prompt += '\n';
      }

      // Add key relationships
      if (knowledgeGraph.edges.length > 0) {
        prompt += '## Key Relationships\n';
        knowledgeGraph.edges
          .slice(0, 10)
          .forEach((edge) => {
            prompt += `- ${edge.from} ${edge.type} ${edge.to}\n`;
          });
      }
    }

    return prompt;
  }

  /**
   * Link memory to knowledge graph
   * Automatically creates nodes and edges from memory content
   */
  async linkToKnowledgeGraph(
    memory: AgentMemory,
    organizationId: string
  ): Promise<void> {
    try {
      if (!memory.campaignId) {
        return; // No campaign context
      }

      // Extract key entities using GPT-4
      const entities = await this.extractEntities(memory.content);

      // Create nodes for entities
      for (const entity of entities) {
        await this.insertKGNode({
          nodeId: entity.id,
          campaignId: memory.campaignId,
          nodeType: entity.type as KGNodeType,
          label: entity.label,
          description: entity.description,
          properties: { source: 'memory', memoryId: memory.memoryId },
          organizationId,
        });
      }

      // Create edges based on relationships
      for (const relationship of entities.flatMap((e) => e.relationships || [])) {
        await this.linkKGNodes({
          fromNodeId: relationship.from,
          toNodeId: relationship.to,
          campaignId: memory.campaignId,
          edgeType: relationship.type,
          weight: relationship.weight || 1.0,
          organizationId,
        });
      }
    } catch (error) {
      console.error('MemoryEngine.linkToKnowledgeGraph error:', error);
      // Don't throw - this is a nice-to-have feature
    }
  }

  /**
   * Extract entities from text using GPT-4
   */
  private async extractEntities(text: string): Promise<any[]> {
    try {
      const prompt = `Extract key entities and relationships from the following text. Focus on campaigns, contacts, topics, decisions, outcomes, and insights.

Text:
${text}

Return JSON array of entities with format:
[
  {
    "id": "unique-id",
    "type": "CAMPAIGN|CONTACT|TOPIC|DECISION|OUTCOME|INSIGHT",
    "label": "entity name",
    "description": "brief description",
    "relationships": [
      {"from": "entity-id", "to": "entity-id", "type": "TARGETS|RELATES_TO|RESULTS_IN", "weight": 1.0}
    ]
  }
]`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured entities from text.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result.entities || [];
    } catch (error) {
      console.error('MemoryEngine.extractEntities error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const memoryEngine = new MemoryEngine();
