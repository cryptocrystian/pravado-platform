// =====================================================
// AGENT CHAT HOOKS
// Sprint 46 Phase 4.2
// =====================================================
//
// Purpose: React Query hooks for real-time agent messaging
// Provides: Conversation management, message sending, history, typing indicators
//

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AgentConversation,
  AgentMessage,
  MessageProcessingResult,
  AppliedToneStyle,
  SendMessageRequest,
  StartConversationRequest,
  MessageMetadata,
} from '@pravado/types';

// =====================================================
// API CLIENT
// =====================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
}

/**
 * Fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': localStorage.getItem('userId') || 'default-user-id',
      'x-organization-id': localStorage.getItem('organizationId') || 'default-org-id',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// =====================================================
// QUERY KEYS
// =====================================================

export const chatQueryKeys = {
  all: ['agent-chat'] as const,
  conversations: () => [...chatQueryKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...chatQueryKeys.all, 'conversation', id] as const,
  history: (conversationId: string) => [...chatQueryKeys.all, 'history', conversationId] as const,
  turns: (conversationId: string) => [...chatQueryKeys.all, 'turns', conversationId] as const,
  personality: (agentId: string, userId: string) =>
    [...chatQueryKeys.all, 'personality', agentId, userId] as const,
};

// =====================================================
// HOOK: useStartConversation
// =====================================================

interface UseStartConversationOptions {
  onSuccess?: (conversation: AgentConversation) => void;
  onError?: (error: Error) => void;
}

interface StartConversationParams {
  agentId: string;
  title?: string;
  initialMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Start a new conversation with an agent
 */
export function useStartConversation(options?: UseStartConversationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StartConversationParams) => {
      const userId = localStorage.getItem('userId') || 'default-user-id';
      const organizationId = localStorage.getItem('organizationId') || 'default-org-id';

      const request: StartConversationRequest = {
        userId,
        agentId: params.agentId,
        organizationId,
        title: params.title,
        initialMessage: params.initialMessage,
        metadata: params.metadata,
      };

      const response = await fetchApi<{ success: boolean; conversation: AgentConversation }>(
        '/api/agent-interaction/start',
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      return response.conversation;
    },
    onSuccess: (data) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

// =====================================================
// HOOK: useSendMessage
// =====================================================

interface UseSendMessageOptions {
  onSuccess?: (result: MessageProcessingResult) => void;
  onError?: (error: Error) => void;
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
}

interface SendMessageParams {
  conversationId: string;
  text: string;
  metadata?: MessageMetadata;
  options?: {
    waitForResponse?: boolean;
    mirrorTone?: boolean;
    includeContext?: boolean;
    maxTokens?: number;
  };
}

/**
 * Send a message to an agent and get response
 */
export function useSendMessage(options?: UseSendMessageOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      const userId = localStorage.getItem('userId') || 'default-user-id';

      // Trigger typing indicator
      options?.onTypingStart?.();

      const request: SendMessageRequest = {
        conversationId: params.conversationId,
        text: params.text,
        userId,
        metadata: params.metadata,
        options: {
          waitForResponse: true,
          mirrorTone: true,
          includeContext: true,
          ...params.options,
        },
      };

      const response = await fetchApi<{ success: boolean; result: MessageProcessingResult }>(
        '/api/agent-interaction/send',
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      return response.result;
    },
    onSuccess: (data, variables) => {
      // Stop typing indicator
      options?.onTypingEnd?.();

      // Invalidate conversation history
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.history(variables.conversationId)
      });

      // Invalidate turns
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.turns(variables.conversationId)
      });

      // Invalidate conversation details (to update message count)
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversation(variables.conversationId)
      });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onTypingEnd?.();
      options?.onError?.(error as Error);
    },
  });
}

// =====================================================
// HOOK: useChatHistory
// =====================================================

interface UseChatHistoryOptions {
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
  includeContext?: boolean;
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Fetch conversation history with auto-refresh
 */
export function useChatHistory(
  conversationId: string | null,
  options?: UseChatHistoryOptions
) {
  const {
    limit = 50,
    offset = 0,
    includeMetadata = true,
    includeContext = false,
    refetchInterval,
    enabled = true,
  } = options || {};

  return useQuery({
    queryKey: [...chatQueryKeys.history(conversationId || ''), limit, offset],
    queryFn: async () => {
      if (!conversationId) return [];

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        includeMetadata: includeMetadata.toString(),
        includeContext: includeContext.toString(),
      });

      const response = await fetchApi<{
        success: boolean;
        messages: AgentMessage[];
        count: number;
      }>(`/api/agent-interaction/history/${conversationId}?${params}`);

      return response.messages;
    },
    enabled: enabled && !!conversationId,
    refetchInterval,
    staleTime: 1000, // Refetch if data is older than 1 second
  });
}

// =====================================================
// HOOK: useTypingIndicator
// =====================================================

interface TypingState {
  isTyping: boolean;
  startedAt?: Date;
}

/**
 * Manage typing indicator state
 */
export function useTypingIndicator() {
  const [typingState, setTypingState] = useState<TypingState>({ isTyping: false });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    setTypingState({ isTyping: true, startedAt: new Date() });

    // Auto-stop typing after 30 seconds (safety fallback)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 30000);
  }, []);

  const stopTyping = useCallback(() => {
    setTypingState({ isTyping: false });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping: typingState.isTyping,
    startedAt: typingState.startedAt,
    startTyping,
    stopTyping,
  };
}

// =====================================================
// HOOK: useMirrorPersonality
// =====================================================

interface UseMirrorPersonalityOptions {
  recentTurns?: number;
  enabled?: boolean;
}

/**
 * Get mirrored personality traits for an agent
 */
export function useMirrorPersonality(
  agentId: string | null,
  conversationId: string | null,
  options?: UseMirrorPersonalityOptions
) {
  const { recentTurns = 3, enabled = true } = options || {};

  return useQuery({
    queryKey: [...chatQueryKeys.personality(agentId || '', conversationId || ''), recentTurns],
    queryFn: async () => {
      if (!agentId) return null;

      const userId = localStorage.getItem('userId') || 'default-user-id';

      const response = await fetchApi<{
        success: boolean;
        appliedToneStyle: AppliedToneStyle;
      }>('/api/agent-interaction/mirror', {
        method: 'POST',
        body: JSON.stringify({
          agentId,
          userId,
          conversationId,
          recentTurns,
        }),
      });

      return response.appliedToneStyle;
    },
    enabled: enabled && !!agentId,
    staleTime: 60000, // Cache for 1 minute
  });
}

// =====================================================
// HOOK: useAgentMemoryInjection
// =====================================================

interface UseAgentMemoryInjectionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface AgentMemoryInjectionParams {
  agentId: string;
  turn: {
    conversationId: string;
    userMessage: string;
    agentResponse: string;
    turnNumber: number;
    metadata?: Record<string, any>;
  };
  options?: {
    extractTopics?: boolean;
    extractEntities?: boolean;
    updatePersona?: boolean;
  };
}

/**
 * Inject conversation learnings into agent memory
 */
export function useAgentMemoryInjection(options?: UseAgentMemoryInjectionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AgentMemoryInjectionParams) => {
      const organizationId = localStorage.getItem('organizationId') || 'default-org-id';

      const response = await fetchApi<{ success: boolean; message: string }>(
        '/api/agent-interaction/update-memory',
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: params.agentId,
            turn: params.turn,
            organizationId,
            options: params.options,
          }),
        }
      );

      return response;
    },
    onSuccess: () => {
      // Invalidate agent memory queries if they exist
      queryClient.invalidateQueries({ queryKey: ['agent-memory'] });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

// =====================================================
// HOOK: useConversations
// =====================================================

interface UseConversationsOptions {
  limit?: number;
  refetchInterval?: number;
}

/**
 * Fetch user's active conversations
 */
export function useConversations(options?: UseConversationsOptions) {
  const { limit = 20, refetchInterval } = options || {};

  return useQuery({
    queryKey: [...chatQueryKeys.conversations(), limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() });

      const response = await fetchApi<{
        success: boolean;
        conversations: AgentConversation[];
        count: number;
      }>(`/api/agent-interaction/conversations?${params}`);

      return response.conversations;
    },
    refetchInterval,
    staleTime: 5000, // 5 seconds
  });
}

// =====================================================
// HOOK: useConversation
// =====================================================

/**
 * Fetch a single conversation's details
 */
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: chatQueryKeys.conversation(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) return null;

      const response = await fetchApi<{
        success: boolean;
        conversation: AgentConversation;
      }>(`/api/agent-interaction/conversation/${conversationId}`);

      return response.conversation;
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
  });
}

// =====================================================
// HOOK: useConversationAnalytics
// =====================================================

/**
 * Fetch conversation analytics
 */
export function useConversationAnalytics(conversationId: string | null) {
  return useQuery({
    queryKey: [...chatQueryKeys.all, 'analytics', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const response = await fetchApi<{
        success: boolean;
        analytics: {
          messageCount: number;
          avgResponseTimeMs: number;
          sentimentDistribution: Record<string, number>;
          topTopics: string[];
        };
      }>(`/api/agent-interaction/analytics/conversation/${conversationId}`);

      return response.analytics;
    },
    enabled: !!conversationId,
    staleTime: 30000, // 30 seconds
  });
}

// =====================================================
// HOOK: useUpdateConversationStatus
// =====================================================

interface UseUpdateConversationStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Update conversation status (active, paused, archived, completed)
 */
export function useUpdateConversationStatus(options?: UseUpdateConversationStatusOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { conversationId: string; status: string }) => {
      const response = await fetchApi<{ success: boolean; message: string }>(
        `/api/agent-interaction/conversation/${params.conversationId}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: params.status }),
        }
      );

      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversation(variables.conversationId)
      });
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations() });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

// =====================================================
// HOOK: useAutoScroll
// =====================================================

/**
 * Auto-scroll to bottom when new messages arrive
 */
export function useAutoScroll(
  messages: AgentMessage[] | undefined,
  containerRef: React.RefObject<HTMLElement>
) {
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (!messages || !containerRef.current) return;

    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // Scroll to bottom when new messages arrive
    if (currentCount > prevCount) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }

    prevMessageCountRef.current = currentCount;
  }, [messages, containerRef]);
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  useStartConversation,
  useSendMessage,
  useChatHistory,
  useTypingIndicator,
  useMirrorPersonality,
  useAgentMemoryInjection,
  useConversations,
  useConversation,
  useConversationAnalytics,
  useUpdateConversationStatus,
  useAutoScroll,
};
