import type { AgentChatThread, CreateAgentChatThreadInput, AgentMessage, CreateAgentMessageInput, MessageRequest, EscalationRequest } from '@pravado/types';
import { EventEmitter } from 'events';
export declare class MessageCenter extends EventEmitter {
    private messageSubscriptions;
    private escalationHandlers;
    constructor();
    createThread(input: CreateAgentChatThreadInput): Promise<AgentChatThread>;
    getOrCreateThread(goalId: string | undefined, taskId: string | undefined, participants: string[], organizationId: string): Promise<AgentChatThread>;
    getThread(threadId: string, organizationId: string): Promise<AgentChatThread>;
    getGoalThreads(goalId: string, organizationId: string): Promise<AgentChatThread[]>;
    closeThread(threadId: string, closedBy: string, organizationId: string): Promise<AgentChatThread>;
    sendMessage(input: CreateAgentMessageInput): Promise<AgentMessage>;
    getThreadMessages(threadId: string, organizationId: string, limit?: number): Promise<AgentMessage[]>;
    markAsRead(messageIds: string[], agentId: string, organizationId: string): Promise<void>;
    subscribeToMessages(agentId: string, callback: (message: AgentMessage) => void): () => void;
    private notifySubscribers;
    broadcastMessage(request: MessageRequest, senderId: string, organizationId: string, goalId?: string, taskId?: string): Promise<AgentMessage>;
    escalate(request: EscalationRequest, agentId: string, organizationId: string): Promise<AgentMessage>;
    onEscalation(handler: (escalation: EscalationRequest) => void): () => void;
    private mapToThread;
    private mapToMessage;
}
export declare const messageCenter: MessageCenter;
//# sourceMappingURL=message-center.d.ts.map