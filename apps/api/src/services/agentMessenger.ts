// =====================================================
// AGENT MESSENGER SERVICE
// Sprint 45 Phase 4.1
// =====================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { OpenAI } from 'openai';
import { agentPersonalityEngine } from './agentPersonalityEngine';
import { agentContextEnhancer } from './agentContextEnhancer';
import type {
  AgentMessage,
  AgentConversation,
  UserAgentTurn,
  MessageProcessingResult,
  SendMessageRequest,
  StartConversationRequest,
  GetConversationHistoryRequest,
  MirrorPersonalityRequest,
  AppliedToneStyle,
  UpdateMemoryRequest,
  MessageMetadata,
  AgentPersona,
  PersonalityTone,
  UserAlignment,
} from '@pravado/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Agent Messenger Service
 * Handles real-time human-agent messaging with personality mirroring and context injection
 */
class AgentMessenger {
  /**
   * Send message to agent and get response
   */
  async sendMessageToAgent(
    conversationId: string,
    message: {
      text: string;
      userId: string;
      metadata?: MessageMetadata;
    },
    options?: {
      waitForResponse?: boolean;
      mirrorTone?: boolean;
      includeContext?: boolean;
      maxTokens?: number;
    }
  ): Promise<MessageProcessingResult> {
    const {
      waitForResponse = true,
      mirrorTone = true,
      includeContext = true,
      maxTokens = 2000,
    } = options || {};

    const startTime = Date.now();

    // 1. Get conversation
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // 2. Store user message
    const userMessage = await this.storeMessage({
      conversationId,
      senderType: 'user',
      senderId: message.userId,
      text: message.text,
      metadata: message.metadata || {},
    });

    if (!waitForResponse) {
      // Return immediately without agent response
      return {
        message: userMessage,
        stats: {
          processingTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          confidenceScore: 1.0,
        },
      };
    }

    // 3. Get agent persona
    const persona = await agentPersonalityEngine.generateAgentPersona(
      conversation.agentId,
      conversation.organizationId,
      {
        forceRegenerate: false,
        saveProfile: false,
      }
    );

    // 4. Mirror personality traits if requested
    let appliedPersonality: AppliedToneStyle | undefined;
    if (mirrorTone) {
      appliedPersonality = await this.mirrorPersonalityTraits(
        conversation.agentId,
        message.userId,
        conversationId
      );
    }

    // 5. Build enhanced context
    let contextData: any = null;
    if (includeContext) {
      contextData = await agentContextEnhancer.buildEnhancedContext(
        conversation.agentId,
        {
          prompt: message.text,
          userId: message.userId,
          organizationId: conversation.organizationId,
        },
        {
          maxMemorySnippets: 5,
          maxRecentPlaybooks: 3,
          timeWindowDays: 30,
        }
      );
    }

    // 6. Get recent conversation history
    const recentMessages = await this.getConversationHistory(
      conversationId,
      {
        limit: 10,
        includeMetadata: false,
      }
    );

    // 7. Build system prompt with personality and context
    const systemPrompt = this.buildSystemPrompt(
      persona,
      appliedPersonality,
      contextData
    );

    // 8. Build conversation messages for OpenAI
    const messages = this.buildConversationMessages(
      systemPrompt,
      recentMessages.slice(-10), // Last 10 messages
      message.text
    );

    // 9. Generate agent response with OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const agentResponseText = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // 10. Store agent response
    const agentMessage = await this.storeMessage({
      conversationId,
      senderType: 'agent',
      senderId: conversation.agentId,
      text: agentResponseText,
      metadata: {
        tone: appliedPersonality?.appliedTone || persona.tone,
        sentiment: 'neutral',
      },
      context: {
        persona: {
          tone: persona.tone,
          decisionStyle: persona.decisionStyle,
          userAlignment: persona.userAlignment,
        },
        contextSources: contextData ? ['agent_memory', 'agent_settings'] : [],
        memorySnippets: contextData?.memorySnippets || [],
        tokens: {
          input: completion.usage?.prompt_tokens || 0,
          output: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
        processing: {
          latencyMs: Date.now() - startTime,
          model: 'gpt-4',
          temperature: 0.7,
        },
      },
    });

    // 11. Create turn record
    const turnNumber = await this.getNextTurnNumber(conversationId);
    await this.createTurn({
      conversationId,
      userMessageId: userMessage.id,
      agentMessageId: agentMessage.id,
      turnNumber,
      userMessage: message.text,
      agentResponse: agentResponseText,
      metadata: {
        agentConfidence: 0.85,
        durationMs: Date.now() - startTime,
      },
    });

    // 12. Return processing result
    return {
      message: agentMessage,
      appliedPersonality: appliedPersonality
        ? {
            tone: appliedPersonality.appliedTone,
            userAlignment: persona.userAlignment,
            mirrored: true,
          }
        : undefined,
      contextUsed: contextData
        ? {
            memorySnippets: contextData.memorySnippets?.length || 0,
            recentTurns: recentMessages.length,
            contextSources: ['agent_memory', 'agent_settings'],
          }
        : undefined,
      stats: {
        processingTimeMs: Date.now() - startTime,
        tokensUsed: completion.usage?.total_tokens || 0,
        confidenceScore: 0.85,
      },
    };
  }

  /**
   * Start a new conversation
   */
  async startConversation(
    userId: string,
    agentId: string,
    organizationId: string,
    options?: {
      initialMessage?: string;
      title?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AgentConversation> {
    const conversationId = uuidv4();

    // Create conversation
    const { data, error } = await supabase
      .from('agent_conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        agent_id: agentId,
        organization_id: organizationId,
        title: options?.title || null,
        status: 'active',
        metadata: options?.metadata || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    const conversation: AgentConversation = {
      id: data.id,
      userId: data.user_id,
      agentId: data.agent_id,
      organizationId: data.organization_id,
      title: data.title,
      status: data.status,
      messageCount: data.message_count,
      lastActiveAt: new Date(data.last_active_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    // Send initial message if provided
    if (options?.initialMessage) {
      await this.sendMessageToAgent(conversationId, {
        text: options.initialMessage,
        userId,
      });
    }

    return conversation;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
      includeMetadata?: boolean;
      includeContext?: boolean;
    }
  ): Promise<AgentMessage[]> {
    const { limit = 50, offset = 0, includeMetadata = true, includeContext = false } = options || {};

    const { data, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch conversation history: ${error.message}`);
    }

    return data.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderType: msg.sender_type,
      senderId: msg.sender_id,
      text: msg.text,
      metadata: includeMetadata ? msg.metadata : undefined,
      context: includeContext ? msg.context : undefined,
      timestamp: new Date(msg.created_at),
      isEdited: msg.is_edited,
      parentMessageId: msg.parent_message_id,
    }));
  }

  /**
   * Mirror personality traits from user
   */
  async mirrorPersonalityTraits(
    agentId: string,
    userId: string,
    conversationId?: string,
    recentTurns: number = 3
  ): Promise<AppliedToneStyle> {
    // Get agent's base persona
    const agentPersona = await agentPersonalityEngine.generateAgentPersona(
      agentId,
      'default-org', // Would be passed in properly
      {
        forceRegenerate: false,
        saveProfile: false,
      }
    );

    // Get recent user messages to detect tone
    let userTone: PersonalityTone = agentPersona.tone;
    let mirroringConfidence = 0.5;

    if (conversationId) {
      const recentMessages = await this.getRecentUserMessages(conversationId, recentTurns);

      if (recentMessages.length > 0) {
        // Analyze user tone from recent messages
        const detectedTone = this.detectUserTone(recentMessages);
        if (detectedTone) {
          userTone = detectedTone.tone;
          mirroringConfidence = detectedTone.confidence;
        }
      }
    }

    // Determine applied tone (blend base tone with user tone)
    const appliedTone = this.blendTones(agentPersona.tone, userTone, mirroringConfidence);

    return {
      baseTone: agentPersona.tone,
      mirroredTone: userTone,
      appliedTone,
      userAlignment: agentPersona.userAlignment,
      mirroringConfidence,
      adjustments: [
        `Shifted from ${agentPersona.tone} to ${appliedTone}`,
        `User tone detected: ${userTone} (${Math.round(mirroringConfidence * 100)}% confidence)`,
      ],
    };
  }

  /**
   * Update agent memory from conversation turn
   */
  async updateAgentMemoryFromTurn(
    agentId: string,
    turn: UserAgentTurn,
    organizationId: string,
    options?: {
      extractEntities?: boolean;
      extractTopics?: boolean;
      updateLongTerm?: boolean;
    }
  ): Promise<void> {
    const { extractEntities = true, extractTopics = true, updateLongTerm = false } = options || {};

    // Extract topics and entities from the turn
    const topics: string[] = [];
    const entities: string[] = [];

    if (extractTopics) {
      // Simple topic extraction (in production, use NLP)
      const topicKeywords = ['product', 'campaign', 'launch', 'strategy', 'content', 'media'];
      topicKeywords.forEach((keyword) => {
        if (turn.userMessage.toLowerCase().includes(keyword) || turn.agentResponse.toLowerCase().includes(keyword)) {
          topics.push(keyword);
        }
      });
    }

    if (extractEntities) {
      // Simple entity extraction (in production, use NER)
      const words = turn.userMessage.split(' ');
      words.forEach((word) => {
        if (word.length > 0 && word[0] === word[0].toUpperCase()) {
          entities.push(word);
        }
      });
    }

    // Store memory entry
    try {
      await supabase.from('agent_memory').insert({
        agent_id: agentId,
        organization_id: organizationId,
        memory_type: 'conversation',
        content: `User: ${turn.userMessage}\nAgent: ${turn.agentResponse}`,
        metadata: {
          conversation_id: turn.conversationId,
          turn_number: turn.turnNumber,
          topics,
          entities,
          timestamp: turn.timestamp,
        },
        importance_score: 0.5,
      });
    } catch (error: any) {
      console.error('Error storing memory:', error);
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Get conversation
   */
  private async getConversation(conversationId: string): Promise<AgentConversation | null> {
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      agentId: data.agent_id,
      organizationId: data.organization_id,
      title: data.title,
      status: data.status,
      messageCount: data.message_count,
      lastMessageAt: data.last_message_at ? new Date(data.last_message_at) : undefined,
      lastActiveAt: new Date(data.last_active_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      archivedAt: data.archived_at ? new Date(data.archived_at) : undefined,
    };
  }

  /**
   * Store message
   */
  private async storeMessage(message: {
    conversationId: string;
    senderType: 'user' | 'agent';
    senderId: string;
    text: string;
    metadata?: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<AgentMessage> {
    const { data, error } = await supabase
      .from('agent_messages')
      .insert({
        conversation_id: message.conversationId,
        sender_type: message.senderType,
        sender_id: message.senderId,
        text: message.text,
        metadata: message.metadata || null,
        context: message.context || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store message: ${error.message}`);
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderType: data.sender_type,
      senderId: data.sender_id,
      text: data.text,
      metadata: data.metadata,
      context: data.context,
      timestamp: new Date(data.created_at),
      isEdited: data.is_edited,
      parentMessageId: data.parent_message_id,
    };
  }

  /**
   * Create turn record
   */
  private async createTurn(turn: {
    conversationId: string;
    userMessageId: string;
    agentMessageId: string;
    turnNumber: number;
    userMessage: string;
    agentResponse: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { error } = await supabase.from('user_agent_turns').insert({
      conversation_id: turn.conversationId,
      user_message_id: turn.userMessageId,
      agent_message_id: turn.agentMessageId,
      turn_number: turn.turnNumber,
      user_message: turn.userMessage,
      agent_response: turn.agentResponse,
      metadata: turn.metadata || null,
    });

    if (error) {
      console.error('Error creating turn:', error);
    }
  }

  /**
   * Get next turn number for conversation
   */
  private async getNextTurnNumber(conversationId: string): Promise<number> {
    const { data, error } = await supabase
      .from('user_agent_turns')
      .select('turn_number')
      .eq('conversation_id', conversationId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 1;
    }

    return data.turn_number + 1;
  }

  /**
   * Get recent user messages
   */
  private async getRecentUserMessages(conversationId: string, limit: number): Promise<AgentMessage[]> {
    const { data, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'user')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderType: msg.sender_type,
      senderId: msg.sender_id,
      text: msg.text,
      metadata: msg.metadata,
      timestamp: new Date(msg.created_at),
    }));
  }

  /**
   * Detect user tone from messages
   */
  private detectUserTone(messages: AgentMessage[]): { tone: PersonalityTone; confidence: number } | null {
    if (messages.length === 0) {
      return null;
    }

    // Simple heuristic-based tone detection
    // In production, use NLP/sentiment analysis

    const combinedText = messages.map((m) => m.text).join(' ').toLowerCase();

    const toneIndicators: Record<PersonalityTone, string[]> = {
      formal: ['please', 'thank you', 'appreciate', 'kindly'],
      casual: ['hey', 'yeah', 'cool', 'awesome', 'thanks'],
      witty: ['haha', 'lol', 'clever', 'funny'],
      assertive: ['need', 'must', 'require', 'immediately'],
      friendly: ['hi', 'hello', 'great', 'wonderful'],
      professional: ['regarding', 'concerning', 'request', 'information'],
      empathetic: ['understand', 'feel', 'appreciate', 'care'],
      direct: ['want', 'need', 'tell me', 'show me'],
      diplomatic: ['perhaps', 'might', 'could', 'possibly'],
    };

    let bestTone: PersonalityTone = 'professional';
    let maxScore = 0;

    Object.entries(toneIndicators).forEach(([tone, indicators]) => {
      const score = indicators.filter((indicator) => combinedText.includes(indicator)).length;
      if (score > maxScore) {
        maxScore = score;
        bestTone = tone as PersonalityTone;
      }
    });

    const confidence = Math.min(maxScore / 3, 1); // Normalize to 0-1

    return { tone: bestTone, confidence };
  }

  /**
   * Blend base tone with user tone
   */
  private blendTones(
    baseTone: PersonalityTone,
    userTone: PersonalityTone,
    mirroringStrength: number
  ): PersonalityTone {
    // If mirroring confidence is low, stick with base tone
    if (mirroringStrength < 0.3) {
      return baseTone;
    }

    // If mirroring confidence is high, shift toward user tone
    if (mirroringStrength > 0.7) {
      return userTone;
    }

    // Medium confidence: blend (simplified - just use user tone)
    return userTone;
  }

  /**
   * Build system prompt with personality and context
   */
  private buildSystemPrompt(
    persona: AgentPersona,
    appliedPersonality?: AppliedToneStyle,
    contextData?: any
  ): string {
    let prompt = `You are a helpful AI agent with the following personality:\n`;
    prompt += `Tone: ${appliedPersonality?.appliedTone || persona.tone}\n`;
    prompt += `Decision Style: ${persona.decisionStyle}\n`;
    prompt += `User Alignment: ${persona.userAlignment}\n\n`;

    if (contextData && contextData.memorySnippets && contextData.memorySnippets.length > 0) {
      prompt += `Relevant context from past interactions:\n`;
      contextData.memorySnippets.slice(0, 3).forEach((snippet: any) => {
        prompt += `- ${snippet.content}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Respond naturally and maintain this personality throughout the conversation.`;

    return prompt;
  }

  /**
   * Build conversation messages for OpenAI
   */
  private buildConversationMessages(
    systemPrompt: string,
    history: AgentMessage[],
    currentUserMessage: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    history.forEach((msg) => {
      messages.push({
        role: msg.senderType === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: currentUserMessage,
    });

    return messages;
  }
}

// Export singleton instance
export const agentMessenger = new AgentMessenger();
