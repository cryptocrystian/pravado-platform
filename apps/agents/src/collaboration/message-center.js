"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageCenter = exports.MessageCenter = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../lib/logger");
const events_1 = require("events");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
class MessageCenter extends events_1.EventEmitter {
    messageSubscriptions;
    escalationHandlers;
    constructor() {
        super();
        this.messageSubscriptions = new Map();
        this.escalationHandlers = new Set();
    }
    async createThread(input) {
        try {
            logger_1.logger.info('Creating chat thread', {
                goalId: input.goalId,
                taskId: input.taskId,
                participants: input.participants,
                organizationId: input.organizationId,
            });
            if (!input.goalId && !input.taskId) {
                throw new Error('Either goalId or taskId must be provided');
            }
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
                logger_1.logger.error('Failed to create thread', error);
                throw new Error(`Failed to create thread: ${error.message}`);
            }
            logger_1.logger.info('Thread created successfully', { threadId: data.id });
            return this.mapToThread(data);
        }
        catch (error) {
            logger_1.logger.error('Error creating thread', error);
            throw error;
        }
    }
    async getOrCreateThread(goalId, taskId, participants, organizationId) {
        try {
            logger_1.logger.info('Getting or creating thread', {
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
                logger_1.logger.error('Failed to get/create thread', error);
                throw new Error(`Failed to get/create thread: ${error.message}`);
            }
            return await this.getThread(data, organizationId);
        }
        catch (error) {
            logger_1.logger.error('Error getting/creating thread', error);
            throw error;
        }
    }
    async getThread(threadId, organizationId) {
        try {
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
                logger_1.logger.error('Failed to fetch thread', error);
                throw new Error(`Failed to fetch thread: ${error.message}`);
            }
            return this.mapToThread(data);
        }
        catch (error) {
            logger_1.logger.error('Error fetching thread', error);
            throw error;
        }
    }
    async getGoalThreads(goalId, organizationId) {
        try {
            logger_1.logger.info('Fetching goal threads', { goalId, organizationId });
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
                logger_1.logger.error('Failed to fetch goal threads', error);
                throw new Error(`Failed to fetch goal threads: ${error.message}`);
            }
            return (data || []).map(this.mapToThread);
        }
        catch (error) {
            logger_1.logger.error('Error fetching goal threads', error);
            throw error;
        }
    }
    async closeThread(threadId, closedBy, organizationId) {
        try {
            logger_1.logger.info('Closing thread', { threadId, closedBy, organizationId });
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
                logger_1.logger.error('Failed to close thread', error);
                throw new Error(`Failed to close thread: ${error.message}`);
            }
            logger_1.logger.info('Thread closed successfully', { threadId });
            return this.mapToThread(data);
        }
        catch (error) {
            logger_1.logger.error('Error closing thread', error);
            throw error;
        }
    }
    async sendMessage(input) {
        try {
            logger_1.logger.info('Sending message', {
                threadId: input.threadId,
                senderType: input.senderType,
                messageType: input.messageType,
                organizationId: input.organizationId,
            });
            if (input.senderType === 'agent' && !input.senderAgentId) {
                throw new Error('Agent messages must have senderAgentId');
            }
            if (input.senderType === 'user' && !input.senderUserId) {
                throw new Error('User messages must have senderUserId');
            }
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
                logger_1.logger.error('Failed to send message', error);
                throw new Error(`Failed to send message: ${error.message}`);
            }
            const message = this.mapToMessage(data);
            this.emit('message', message);
            this.notifySubscribers(message);
            logger_1.logger.info('Message sent successfully', { messageId: message.id });
            return message;
        }
        catch (error) {
            logger_1.logger.error('Error sending message', error);
            throw error;
        }
    }
    async getThreadMessages(threadId, organizationId, limit = 50) {
        try {
            logger_1.logger.info('Fetching thread messages', {
                threadId,
                organizationId,
                limit,
            });
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
                logger_1.logger.error('Failed to fetch messages', error);
                throw new Error(`Failed to fetch messages: ${error.message}`);
            }
            return (data || []).map(this.mapToMessage).reverse();
        }
        catch (error) {
            logger_1.logger.error('Error fetching messages', error);
            throw error;
        }
    }
    async markAsRead(messageIds, agentId, organizationId) {
        try {
            logger_1.logger.info('Marking messages as read', {
                messageIds,
                agentId,
                organizationId,
            });
            await supabase.rpc('set_config', {
                setting_name: 'app.current_organization_id',
                setting_value: organizationId,
            });
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
                    logger_1.logger.error('Failed to mark message as read', error);
                }
            }
            logger_1.logger.info('Messages marked as read', { count: messageIds.length });
        }
        catch (error) {
            logger_1.logger.error('Error marking messages as read', error);
            throw error;
        }
    }
    subscribeToMessages(agentId, callback) {
        logger_1.logger.info('Agent subscribing to messages', { agentId });
        if (!this.messageSubscriptions.has(agentId)) {
            this.messageSubscriptions.set(agentId, new Set());
        }
        this.messageSubscriptions.get(agentId).add(callback);
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
    notifySubscribers(message) {
        this.getThread(message.threadId, message.organizationId)
            .then((thread) => {
            for (const agentId of thread.participants) {
                const callbacks = this.messageSubscriptions.get(agentId);
                if (callbacks) {
                    callbacks.forEach((callback) => {
                        try {
                            callback(message);
                        }
                        catch (error) {
                            logger_1.logger.error('Error in message callback', error);
                        }
                    });
                }
            }
        })
            .catch((error) => {
            logger_1.logger.error('Failed to notify subscribers', error);
        });
    }
    async broadcastMessage(request, senderId, organizationId, goalId, taskId) {
        try {
            logger_1.logger.info('Broadcasting message', {
                recipients: request.recipients,
                messageType: request.messageType,
                organizationId,
            });
            const thread = await this.getOrCreateThread(goalId, taskId, [senderId, ...request.recipients], organizationId);
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
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting message', error);
            throw error;
        }
    }
    async escalate(request, agentId, organizationId) {
        try {
            logger_1.logger.info('Escalating issue', {
                agentId,
                severity: request.severity,
                organizationId,
            });
            if (!request.goalId && !request.taskId) {
                throw new Error('Either goalId or taskId must be provided for escalation');
            }
            const thread = await this.getOrCreateThread(request.goalId, request.taskId, [agentId, 'system'], organizationId);
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
            this.escalationHandlers.forEach((handler) => {
                try {
                    handler(request);
                }
                catch (error) {
                    logger_1.logger.error('Error in escalation handler', error);
                }
            });
            this.emit('escalation', request);
            logger_1.logger.info('Escalation created', { messageId: message.id });
            return message;
        }
        catch (error) {
            logger_1.logger.error('Error escalating issue', error);
            throw error;
        }
    }
    onEscalation(handler) {
        this.escalationHandlers.add(handler);
        return () => {
            this.escalationHandlers.delete(handler);
        };
    }
    mapToThread(row) {
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
    mapToMessage(row) {
        return {
            id: row.id,
            threadId: row.thread_id,
            senderAgentId: row.sender_agent_id,
            senderUserId: row.sender_user_id,
            senderType: row.sender_type,
            messageType: row.message_type,
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
exports.MessageCenter = MessageCenter;
exports.messageCenter = new MessageCenter();
//# sourceMappingURL=message-center.js.map