// =====================================================
// CHAT MESSENGER COMPONENT
// Sprint 46 Phase 4.2
// =====================================================
//
// Purpose: Main chat interface for human-agent messaging
// Features: Message history, typing indicators, personality mirroring, auto-scroll
//

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AgentProfileBanner } from './AgentProfileBanner';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import {
  useSendMessage,
  useChatHistory,
  useTypingIndicator,
  useMirrorPersonality,
  useConversation,
  useAutoScroll,
  useAgentMemoryInjection,
} from '../../hooks/useAgentChat';

// =====================================================
// TYPES
// =====================================================

interface ChatMessengerProps {
  conversationId?: string;
  agentId?: string;
  onClose?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const ChatMessenger: React.FC<ChatMessengerProps> = ({
  conversationId: propConversationId,
  agentId: propAgentId,
  onClose,
}) => {
  // Router params (if using route-based navigation)
  const params = useParams<{ conversationId?: string; agentId?: string }>();
  const navigate = useNavigate();

  // Determine conversation/agent IDs from props or params
  const conversationId = propConversationId || params.conversationId || null;
  const agentId = propAgentId || params.agentId || null;

  // Local state
  const [messageText, setMessageText] = useState('');
  const [showMetadata, setShowMetadata] = useState(true);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hooks
  const { data: conversation } = useConversation(conversationId);
  const { data: messages, isLoading: isLoadingHistory } = useChatHistory(conversationId, {
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const { isTyping, startTyping, stopTyping } = useTypingIndicator();

  const { mutate: sendMessage, isPending: isSending } = useSendMessage({
    onTypingStart: startTyping,
    onTypingEnd: stopTyping,
    onSuccess: (result) => {
      // Clear input
      setMessageText('');

      // Inject memory from the turn
      if (conversation && result.message) {
        const lastUserMessage = messages?.[messages.length - 2];
        if (lastUserMessage) {
          injectMemory({
            agentId: conversation.agentId,
            turn: {
              conversationId: conversation.id,
              userMessage: lastUserMessage.text,
              agentResponse: result.message.text,
              turnNumber: Math.floor(messages.length / 2),
            },
            options: {
              extractTopics: true,
              extractEntities: true,
            },
          });
        }
      }

      // Focus input
      inputRef.current?.focus();
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error.message}`);
    },
  });

  const { data: personality } = useMirrorPersonality(
    conversation?.agentId || agentId,
    conversationId,
    { enabled: !!conversationId }
  );

  const { mutate: injectMemory } = useAgentMemoryInjection();

  // Auto-scroll to bottom when new messages arrive
  useAutoScroll(messages, messagesContainerRef);

  // Handle send message
  const handleSendMessage = () => {
    if (!conversationId || !messageText.trim() || isSending) return;

    sendMessage({
      conversationId,
      text: messageText.trim(),
      options: {
        mirrorTone: true,
        includeContext: true,
        maxTokens: 500,
      },
    });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (Shift+Enter for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [messageText]);

  // Loading state
  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <p className="text-gray-600 text-lg">No conversation selected</p>
          <p className="text-gray-500 text-sm mt-1">Start a new conversation to begin chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header: Agent Profile Banner */}
      <AgentProfileBanner
        agentId={conversation?.agentId || agentId || ''}
        agentName={conversation?.title || 'AI Agent'}
        agentRole="PR Strategy Assistant"
        personality={personality}
        isOnline={true}
        messageCount={conversation?.messageCount || messages?.length || 0}
        onClose={onClose || (() => navigate('/agent-chat'))}
      />

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8 space-y-4"
      >
        {/* Loading State */}
        {isLoadingHistory && !messages && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingHistory && messages && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="text-gray-400 mb-4">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the conversation</h3>
              <p className="text-gray-600 mb-4">
                Send a message to begin chatting with your AI agent. Your agent will adapt to your
                communication style and provide personalized responses.
              </p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-left">
                <p className="font-medium text-indigo-900 mb-2">Try asking:</p>
                <ul className="space-y-1 text-indigo-700">
                  <li>• "What's our current PR strategy?"</li>
                  <li>• "Help me draft a press release"</li>
                  <li>• "Analyze our latest campaign performance"</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages && messages.length > 0 && (
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                showMetadata={showMetadata}
                animate={true}
              />
            ))}

            {/* Typing Indicator */}
            {isTyping && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 md:px-6 md:py-4">
        <div className="max-w-4xl mx-auto">
          {/* Metadata Toggle */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {showMetadata ? 'Hide' : 'Show'} metadata
            </button>

            {/* Character count */}
            <span className="text-xs text-gray-500">
              {messageText.length} / 10000
            </span>
          </div>

          {/* Input Row */}
          <div className="flex gap-3 items-end">
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isSending}
                maxLength={10000}
                rows={1}
                className="
                  w-full px-4 py-3 pr-12
                  border border-gray-300 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  resize-none
                  text-sm md:text-base
                "
              />

              {/* Emoji/Attachment Buttons (placeholder) */}
              <div className="absolute right-3 bottom-3 flex gap-1">
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Add emoji"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || isSending}
              className="
                flex-shrink-0
                px-6 py-3
                bg-indigo-600 text-white font-medium
                rounded-xl
                hover:bg-indigo-700
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors
                flex items-center gap-2
              "
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span className="hidden md:inline">Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span className="hidden md:inline">Send</span>
                </>
              )}
            </button>
          </div>

          {/* Hints */}
          <div className="mt-2 text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to send,{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Shift+Enter</kbd> for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessenger;
