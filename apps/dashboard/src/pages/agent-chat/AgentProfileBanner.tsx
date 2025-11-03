// =====================================================
// AGENT PROFILE BANNER COMPONENT
// Sprint 46 Phase 4.2
// =====================================================
//
// Purpose: Display agent profile, personality traits, and status
// Features: Agent avatar, name, personality badges, mirroring indicator
//

import React from 'react';
import type { AppliedToneStyle } from '@pravado/shared-types';

// =====================================================
// TYPES
// =====================================================

interface AgentProfileBannerProps {
  agentId: string;
  agentName?: string;
  agentRole?: string;
  avatarUrl?: string;
  personality?: AppliedToneStyle;
  isOnline?: boolean;
  messageCount?: number;
  onClose?: () => void;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get avatar initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get tone color and icon
 */
function getToneDisplay(tone?: string) {
  switch (tone) {
    case 'formal':
      return { icon: '🎩', color: 'bg-blue-100 text-blue-700', label: 'Formal' };
    case 'casual':
      return { icon: '😎', color: 'bg-green-100 text-green-700', label: 'Casual' };
    case 'friendly':
      return { icon: '🤗', color: 'bg-pink-100 text-pink-700', label: 'Friendly' };
    case 'professional':
      return { icon: '💼', color: 'bg-indigo-100 text-indigo-700', label: 'Professional' };
    case 'witty':
      return { icon: '🎭', color: 'bg-purple-100 text-purple-700', label: 'Witty' };
    case 'assertive':
      return { icon: '💪', color: 'bg-orange-100 text-orange-700', label: 'Assertive' };
    case 'empathetic':
      return { icon: '❤️', color: 'bg-rose-100 text-rose-700', label: 'Empathetic' };
    case 'direct':
      return { icon: '🎯', color: 'bg-gray-100 text-gray-700', label: 'Direct' };
    case 'diplomatic':
      return { icon: '🤝', color: 'bg-cyan-100 text-cyan-700', label: 'Diplomatic' };
    default:
      return { icon: '🤖', color: 'bg-gray-100 text-gray-700', label: 'Neutral' };
  }
}

/**
 * Get alignment icon
 */
function getAlignmentDisplay(alignment?: string) {
  switch (alignment) {
    case 'collaborative':
      return { icon: '🤝', label: 'Collaborative' };
    case 'directive':
      return { icon: '📋', label: 'Directive' };
    case 'supportive':
      return { icon: '🤲', label: 'Supportive' };
    case 'analytical':
      return { icon: '📊', label: 'Analytical' };
    default:
      return { icon: '⚖️', label: 'Balanced' };
  }
}

// =====================================================
// COMPONENT
// =====================================================

export const AgentProfileBanner: React.FC<AgentProfileBannerProps> = ({
  agentId,
  agentName = 'AI Agent',
  agentRole = 'Assistant',
  avatarUrl,
  personality,
  isOnline = true,
  messageCount = 0,
  onClose,
}) => {
  const initials = getInitials(agentName);
  const baseTone = getToneDisplay(personality?.baseTone);
  const appliedTone = getToneDisplay(personality?.appliedTone);
  const alignment = getAlignmentDisplay(personality?.userAlignment);

  const isMirroring = personality?.baseTone !== personality?.appliedTone;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Header Row */}
      <div className="px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Agent Info */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={agentName}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover ring-2 ring-indigo-100"
                />
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-indigo-100">
                  <span className="text-white font-semibold text-lg md:text-xl">
                    {initials}
                  </span>
                </div>
              )}

              {/* Online Indicator */}
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Name & Role */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {agentName}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="truncate">{agentRole}</span>
                {messageCount > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      {messageCount} messages
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Personality Traits */}
      {personality && (
        <div className="px-4 pb-3 md:px-6 md:pb-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Base Tone */}
            <div
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium
                ${baseTone.color}
              `}
            >
              <span>{baseTone.icon}</span>
              <span>Base: {baseTone.label}</span>
            </div>

            {/* Applied Tone (if different) */}
            {isMirroring && (
              <>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium
                    ${appliedTone.color} ring-2 ring-offset-1 ring-indigo-300
                  `}
                >
                  <span>{appliedTone.icon}</span>
                  <span>Mirrored: {appliedTone.label}</span>
                </div>
              </>
            )}

            {/* User Alignment */}
            {personality.userAlignment && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium bg-purple-100 text-purple-700">
                <span>{alignment.icon}</span>
                <span>{alignment.label}</span>
              </div>
            )}

            {/* Mirroring Confidence */}
            {isMirroring && personality.mirroringConfidence && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium bg-amber-100 text-amber-700">
                <span>📊</span>
                <span>{Math.round(personality.mirroringConfidence * 100)}% confidence</span>
              </div>
            )}
          </div>

          {/* Adjustments Info */}
          {isMirroring && personality.adjustments && personality.adjustments.length > 0 && (
            <div className="mt-2 text-xs text-gray-600 italic">
              {personality.adjustments[0]}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentProfileBanner;
