// =====================================================
// CHAT MESSAGE COMPONENT
// Sprint 46 Phase 4.2
// =====================================================
//
// Purpose: Display individual chat messages with metadata
// Features: Left/right alignment, tone/sentiment display, timestamps
//

import React from 'react';
import type { AgentMessage } from '@pravado/types';
import { formatDistanceToNow } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

interface ChatMessageProps {
  message: AgentMessage;
  showMetadata?: boolean;
  animate?: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get sentiment icon and color
 */
function getSentimentDisplay(sentiment?: string) {
  switch (sentiment) {
    case 'positive':
      return { icon: '😊', color: 'text-green-600', bg: 'bg-green-50' };
    case 'negative':
      return { icon: '😔', color: 'text-red-600', bg: 'bg-red-50' };
    case 'mixed':
      return { icon: '😐', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    case 'neutral':
    default:
      return { icon: '😌', color: 'text-gray-600', bg: 'bg-gray-50' };
  }
}

/**
 * Get tone display color
 */
function getToneColor(tone?: string) {
  switch (tone) {
    case 'formal':
      return 'text-blue-700 bg-blue-100';
    case 'casual':
      return 'text-green-700 bg-green-100';
    case 'friendly':
      return 'text-pink-700 bg-pink-100';
    case 'professional':
      return 'text-indigo-700 bg-indigo-100';
    case 'witty':
      return 'text-purple-700 bg-purple-100';
    case 'assertive':
      return 'text-orange-700 bg-orange-100';
    case 'empathetic':
      return 'text-rose-700 bg-rose-100';
    case 'direct':
      return 'text-gray-700 bg-gray-100';
    case 'diplomatic':
      return 'text-cyan-700 bg-cyan-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get urgency display
 */
function getUrgencyDisplay(urgency?: string) {
  switch (urgency) {
    case 'critical':
      return { icon: '🔴', label: 'Critical', color: 'text-red-700 bg-red-100' };
    case 'high':
      return { icon: '🟠', label: 'High', color: 'text-orange-700 bg-orange-100' };
    case 'medium':
      return { icon: '🟡', label: 'Medium', color: 'text-yellow-700 bg-yellow-100' };
    case 'low':
    default:
      return { icon: '🟢', label: 'Low', color: 'text-green-700 bg-green-100' };
  }
}

// =====================================================
// COMPONENT
// =====================================================

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showMetadata = true,
  animate = true,
}) => {
  const isAgent = message.senderType === 'agent';
  const isUser = message.senderType === 'user';

  const sentiment = getSentimentDisplay(message.metadata?.sentiment);
  const toneColor = getToneColor(message.metadata?.tone);
  const urgency = getUrgencyDisplay(message.metadata?.urgency);

  // Format timestamp
  const timestamp = message.timestamp
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : '';

  return (
    <div
      className={`
        flex w-full mb-4
        ${isAgent ? 'justify-start' : 'justify-end'}
        ${animate ? 'animate-slideIn' : ''}
      `}
    >
      <div
        className={`
          max-w-[75%] md:max-w-[60%]
          ${isAgent ? 'mr-auto' : 'ml-auto'}
        `}
      >
        {/* Message Bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl shadow-sm
            ${
              isAgent
                ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                : 'bg-indigo-600 text-white rounded-tr-sm'
            }
          `}
        >
          {/* Message Text */}
          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>

          {/* Message Metadata */}
          {showMetadata && (
            <div className="mt-2 pt-2 border-t border-opacity-20 border-current">
              <div className="flex flex-wrap gap-2 items-center text-xs opacity-75">
                {/* Timestamp */}
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {timestamp}
                </span>

                {/* Sentiment */}
                {message.metadata?.sentiment && (
                  <span className="flex items-center gap-1">
                    <span>{sentiment.icon}</span>
                    <span className="capitalize">{message.metadata.sentiment}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Extended Metadata (Below Bubble) */}
        {showMetadata && (isAgent || message.metadata?.tone || message.metadata?.urgency) && (
          <div className={`mt-1 px-2 ${isAgent ? 'text-left' : 'text-right'}`}>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {/* Tone Badge */}
              {message.metadata?.tone && (
                <span
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded-full font-medium
                    ${toneColor}
                  `}
                >
                  Tone: {message.metadata.tone}
                </span>
              )}

              {/* Urgency Badge */}
              {message.metadata?.urgency && (
                <span
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded-full font-medium
                    ${urgency.color}
                  `}
                >
                  {urgency.icon} {urgency.label}
                </span>
              )}

              {/* Topics */}
              {message.metadata?.topics && message.metadata.topics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {message.metadata.topics.slice(0, 3).map((topic, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =====================================================
// TYPING INDICATOR COMPONENT
// =====================================================

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[75%] md:max-w-[60%] mr-auto">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <div className="mt-1 px-2 text-left">
          <span className="text-xs text-gray-500 italic">Agent is typing...</span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
