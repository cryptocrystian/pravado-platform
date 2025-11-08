// =====================================================
// MESSAGE CENTER
// =====================================================
// In-memory message bus for cross-agent communication and escalation

import { createClient } from '@supabase/supabase-js';
import type {
  AgentChatThread,
  CreateAgentChatThreadInput,
  AgentMessage,
  CreateAgentMessageInput,
  MessageRequest,
  EscalationRequest,
  AgentMessageType,
} from '@pravado/types';
import { logger } from '../lib/logger';
import { EventEmitter } from 'events';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Message Center - In-memory message bus for agent communication
 */
export class MessageCenter extends EventEmitter {
  private messageSubscriptions: Map<string, Set<(message: AgentMessage) => void>>;
  private escalationHandlers: Set<(escalation: EscalationRequest) => void>;

  constructor() {
    super();
    this.messageSubscriptions = new Map();
    this.escalationHandlers = new Set();
  }

  // =====================================================
  // THREAD MANAGEMENT
  // =====================================================

  /**
   * Create a new chat thread for agent communication
   */
  async createThread(input: CreateAgentChatThreadInput): Promise<AgentChatThread> {
    try {
      logger.info('Creating chat thread', {
        goalId: input.goalId,
        taskId: input.taskId,
        participants: input.participants,
        organizationId: input.organizationId,
      });

      // Validate that at least one context is provided
      if (!input.goalId && !input.taskId) {
        throw new Error('Either goalId or taskId must be provided');
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: input.organizationId,
      });

      const { data, error } = await supabase
        .from('agent_chat_threads')
        .insert({
          goal_id: input.goalId || null,
          task_id: input.taskId || null,
          title: input.title || null,
          participants: input.participants,
          human_observer: input.humanObserver || null,
          organization_id: input.organizationId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create thread', error);
        throw new Error(`Failed to create thread: ${error.message}`);
      }

      logger.info('Thread created successfully', { threadId: data.id });
      return this.mapToThread(data);
    } catch (error) {
      logger.error('Error creating thread', error);
      throw error;
    }
  }

  /**
   * Get or create a thread for goal/task context
   */
  async getOrCreateThread(
    goalId: string | undefined,
    taskId: string | undefined,
    participants: string[],
    organizationId: string
  ): Promise<AgentChatThread> {
    try {
      logger.info('Getting or creating thread', {
        goalId,
        taskId,
        participants,
        organizationId,
      });

      const { data, error } = await supabase.rpc('get_or_create_thread', {
        p_goal_id: goalId || null,
        p_task_id: taskId || null,
        p_participants: participants,
        p_organization_id: organizationId,
      });

      if (error) {
        logger.error('Failed to get/create thread', error);
        throw new Error(`Failed to get/create thread: ${error.message}`);
      }

      // Fetch the thread details
      return await this.getThread(data, organizationId);
    } catch (error) {
      logger.error('Error getting/creating thread', error);
      throw error;
    }
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string, organizationId: string): Promise<AgentChatThread> {
    try {
      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_chat_threads')
        .select('*')
        .eq('id', threadId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        logger.error('Failed to fetch thread', error);
        throw new Error(`Failed to fetch thread: ${error.message}`);
      }

      return this.mapToThread(data);
    } catch (error) {
      logger.error('Error fetching thread', error);
      throw error;
    }
  }

  /**
   * Get threads for a goal
   */
  async getGoalThreads(
    goalId: string,
    organizationId: string
  ): Promise<AgentChatThread[]> {
    try {
      logger.info('Fetching goal threads', { goalId, organizationId });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_chat_threads')
        .select('*')
        .eq('goal_id', goalId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        logger.error('Failed to fetch goal threads', error);
        throw new Error(`Failed to fetch goal threads: ${error.message}`);
      }

      return (data || []).map(this.mapToThread);
    } catch (error) {
      logger.error('Error fetching goal threads', error);
      throw error;
    }
  }

  /**
   * Close a thread
   */
  async closeThread(
    threadId: string,
    closedBy: string,
    organizationId: string
  ): Promise<AgentChatThread> {
    try {
      logger.info('Closing thread', { threadId, closedBy, organizationId });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_chat_threads')
        .update({
          is_active: false,
          closed_at: new Date().toISOString(),
          closed_by: closedBy,
        })
        .eq('id', threadId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to close thread', error);
        throw new Error(`Failed to close thread: ${error.message}`);
      }

      logger.info('Thread closed successfully', { threadId });
      return this.mapToThread(data);
    } catch (error) {
      logger.error('Error closing thread', error);
      throw error;
    }
  }

  // =====================================================
  // MESSAGE MANAGEMENT
  // =====================================================

  /**
   * Send a message to a thread
   */
  async sendMessage(input: CreateAgentMessageInput): Promise<AgentMessage> {
    try {
      logger.info('Sending message', {
        threadId: input.threadId,
        senderType: input.senderType,
        messageType: input.messageType,
        organizationId: input.organizationId,
      });

      // Validate sender
      if (input.senderType === 'agent' && !input.senderAgentId) {
        throw new Error('Agent messages must have senderAgentId');
      }
      if (input.senderType === 'user' && !input.senderUserId) {
        throw new Error('User messages must have senderUserId');
      }

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: input.organizationId,
      });

      const { data, error } = await supabase
        .from('agent_messages')
        .insert({
          thread_id: input.threadId,
          sender_agent_id: input.senderAgentId || null,
          sender_user_id: input.senderUserId || null,
          sender_type: input.senderType,
          message_type: input.messageType,
          content: input.content,
          metadata: input.metadata || null,
          in_reply_to: input.inReplyTo || null,
          organization_id: input.organizationId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to send message', error);
        throw new Error(`Failed to send message: ${error.message}`);
      }

      const message = this.mapToMessage(data);

      // Emit message event for in-memory subscribers
      this.emit('message', message);
      this.notifySubscribers(message);

      logger.info('Message sent successfully', { messageId: message.id });
      return message;
    } catch (error) {
      logger.error('Error sending message', error);
      throw error;
    }
  }

  /**
   * Get messages from a thread
   */
  async getThreadMessages(
    threadId: string,
    organizationId: string,
    limit: number = 50
  ): Promise<AgentMessage[]> {
    try {
      logger.info('Fetching thread messages', {
        threadId,
        organizationId,
        limit,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('thread_id', threadId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch messages', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      return (data || []).map(this.mapToMessage).reverse();
    } catch (error) {
      logger.error('Error fetching messages', error);
      throw error;
    }
  }

  /**
   * Mark messages as read by an agent
   */
  async markAsRead(
    messageIds: string[],
    agentId: string,
    organizationId: string
  ): Promise<void> {
    try {
      logger.info('Marking messages as read', {
        messageIds,
        agentId,
        organizationId,
      });

      // Set organization context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_organization_id',
        setting_value: organizationId,
      });

      // Update each message to add agent to read_by array
      for (const messageId of messageIds) {
        const { error } = await supabase
          .from('agent_messages')
          .update({
            read_by: supabase.rpc('array_append', {
              array: supabase.raw('read_by'),
              element: agentId,
            }),
            read_at: new Date().toISOString(),
          })
          .eq('id', messageId)
          .eq('organization_id', organizationId);

        if (error) {
          logger.error('Failed to mark message as read', error);
        }
      }

      logger.info('Messages marked as read', { count: messageIds.length });
    } catch (error) {
      logger.error('Error marking messages as read', error);
      throw error;
    }
  }

  // =====================================================
  // IN-MEMORY MESSAGE BUS
  // =====================================================

  /**
   * Subscribe to messages for an agent
   */
  subscribeToMessages(
    agentId: string,
    callback: (message: AgentMessage) => void
  ): () => void {
    logger.info('Agent subscribing to messages', { agentId });

    if (!this.messageSubscriptions.has(agentId)) {
      this.messageSubscriptions.set(agentId, new Set());
    }

    this.messageSubscriptions.get(agentId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.messageSubscriptions.get(agentId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.messageSubscriptions.delete(agentId);
        }
      }
    };
  }

  /**
   * Notify subscribed agents of a new message
   */
  private notifySubscribers(message: AgentMessage): void {
    // Get the thread to find participants
    this.getThread(message.threadId, message.organizationId)
      .then((thread) => {
        for (const agentId of thread.participants) {
          const callbacks = this.messageSubscriptions.get(agentId);
          if (callbacks) {
            callbacks.forEach((callback) => {
              try {
                callback(message);
              } catch (error) {
                logger.error('Error in message callback', error);
              }
            });
          }
        }
      })
      .catch((error) => {
        logger.error('Failed to notify subscribers', error);
      });
  }

  /**
   * Broadcast a message to multiple agents
   */
  async broadcastMessage(
    request: MessageRequest,
    senderId: string,
    organizationId: string,
    goalId?: string,
    taskId?: string
  ): Promise<AgentMessage> {
    try {
      logger.info('Broadcasting message', {
        recipients: request.recipients,
        messageType: request.messageType,
        organizationId,
      });

      // Get or create thread for these participants
      const thread = await this.getOrCreateThread(
        goalId,
        taskId,
        [senderId, ...request.recipients],
        organizationId
      );

      // Send the message
      return await this.sendMessage({
        threadId: thread.id,
        senderAgentId: senderId,
        senderType: 'agent',
        messageType: request.messageType,
        content: request.content,
        metadata: {
          requiresResponse: request.requiresResponse,
          deadline: request.deadline,
        },
        organizationId,
      });
    } catch (error) {
      logger.error('Error broadcasting message', error);
      throw error;
    }
  }

  // =====================================================
  // ESCALATION HANDLING
  // =====================================================

  /**
   * Escalate an issue to human oversight
   */
  async escalate(
    request: EscalationRequest,
    agentId: string,
    organizationId: string
  ): Promise<AgentMessage> {
    try {
      logger.info('Escalating issue', {
        agentId,
        severity: request.severity,
        organizationId,
      });

      // Validate that at least one context is provided
      if (!request.goalId && !request.taskId) {
        throw new Error('Either goalId or taskId must be provided for escalation');
      }

      // Get or create thread with system as participant
      const thread = await this.getOrCreateThread(
        request.goalId,
        request.taskId,
        [agentId, 'system'],
        organizationId
      );

      // Send escalation message
      const message = await this.sendMessage({
        threadId: thread.id,
        senderAgentId: agentId,
        senderType: 'agent',
        messageType: 'ESCALATION',
        content: request.reason,
        metadata: {
          severity: request.severity,
          requestedAction: request.requestedAction,
          goalId: request.goalId,
          taskId: request.taskId,
        },
        organizationId,
      });

      // Notify escalation handlers
      this.escalationHandlers.forEach((handler) => {
        try {
          handler(request);
        } catch (error) {
          logger.error('Error in escalation handler', error);
        }
      });

      this.emit('escalation', request);

      logger.info('Escalation created', { messageId: message.id });
      return message;
    } catch (error) {
      logger.error('Error escalating issue', error);
      throw error;
    }
  }

  /**
   * Register an escalation handler
   */
  onEscalation(handler: (escalation: EscalationRequest) => void): () => void {
    this.escalationHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.escalationHandlers.delete(handler);
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Map database row to AgentChatThread type
   */
  private mapToThread(row: any): AgentChatThread {
    return {
      id: row.id,
      goalId: row.goal_id,
      taskId: row.task_id,
      title: row.title,
      participants: row.participants || [],
      humanObserver: row.human_observer,
      isActive: row.is_active,
      closedAt: row.closed_at ? new Date(row.closed_at) : null,
      closedBy: row.closed_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      organizationId: row.organization_id,
    };
  }

  /**
   * Map database row to AgentMessage type
   */
  private mapToMessage(row: any): AgentMessage {
    return {
      id: row.id,
      threadId: row.thread_id,
      senderAgentId: row.sender_agent_id,
      senderUserId: row.sender_user_id,
      senderType: row.sender_type as 'agent' | 'system' | 'user',
      messageType: row.message_type as AgentMessageType,
      content: row.content,
      metadata: row.metadata,
      readBy: row.read_by || [],
      readAt: row.read_at ? new Date(row.read_at) : null,
      inReplyTo: row.in_reply_to,
      createdAt: new Date(row.created_at),
      organizationId: row.organization_id,
    };
  }
}

// Singleton instance
export const messageCenter = new MessageCenter();
