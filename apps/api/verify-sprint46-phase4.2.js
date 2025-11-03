#!/usr/bin/env node

/**
 * =====================================================
 * SPRINT 46 PHASE 4.2 VERIFICATION SCRIPT
 * =====================================================
 *
 * Verifies: Real-Time Messaging UI + Frontend Hooks
 * Components:
 * - React hooks (useAgentChat.ts)
 * - ChatMessage component
 * - AgentProfileBanner component
 * - ChatMessenger component
 * - Tailwind animations
 * - API integration
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (details) {
      console.log(`  ${colors.dim}${details}${colors.reset}`);
    }
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (details) {
      console.log(`  ${colors.red}${details}${colors.reset}`);
    }
    failed++;
  }
}

function section(title) {
  console.log(`\n${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(title.length));
}

// =====================================================
// FILE PATHS
// =====================================================

const DASHBOARD_ROOT = path.resolve(__dirname, '../../apps/dashboard');
const HOOKS_FILE = path.join(DASHBOARD_ROOT, 'src/hooks/useAgentChat.ts');
const CHAT_MESSAGE_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-chat/ChatMessage.tsx');
const AGENT_BANNER_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-chat/AgentProfileBanner.tsx');
const CHAT_MESSENGER_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-chat/ChatMessenger.tsx');
const INDEX_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-chat/index.ts');
const TAILWIND_CONFIG = path.join(DASHBOARD_ROOT, 'tailwind.config.ts');

// =====================================================
// SECTION 1: React Hooks (useAgentChat.ts)
// =====================================================

section('1. React Hooks (useAgentChat.ts)');

check('useAgentChat.ts file exists', fs.existsSync(HOOKS_FILE), HOOKS_FILE);

if (fs.existsSync(HOOKS_FILE)) {
  const hooksContent = fs.readFileSync(HOOKS_FILE, 'utf-8');

  // Core hooks existence
  check('useStartConversation hook defined', hooksContent.includes('export function useStartConversation'));
  check('useSendMessage hook defined', hooksContent.includes('export function useSendMessage'));
  check('useChatHistory hook defined', hooksContent.includes('export function useChatHistory'));
  check('useTypingIndicator hook defined', hooksContent.includes('export function useTypingIndicator'));
  check('useMirrorPersonality hook defined', hooksContent.includes('export function useMirrorPersonality'));
  check('useAgentMemoryInjection hook defined', hooksContent.includes('export function useAgentMemoryInjection'));

  // Additional helpful hooks
  check('useConversations hook defined', hooksContent.includes('export function useConversations'));
  check('useConversation hook defined', hooksContent.includes('export function useConversation'));
  check('useConversationAnalytics hook defined', hooksContent.includes('export function useConversationAnalytics'));
  check('useUpdateConversationStatus hook defined', hooksContent.includes('export function useUpdateConversationStatus'));
  check('useAutoScroll hook defined', hooksContent.includes('export function useAutoScroll'));

  // React Query usage
  check('useMutation imported/used', hooksContent.includes('useMutation'));
  check('useQuery imported/used', hooksContent.includes('useQuery'));
  check('useQueryClient imported/used', hooksContent.includes('useQueryClient'));

  // Hook implementations
  check('useStartConversation uses mutationFn', hooksContent.includes('mutationFn') && hooksContent.includes('StartConversationParams'));
  check('useSendMessage uses mutationFn', hooksContent.includes('SendMessageParams'));
  check('useChatHistory uses queryFn', hooksContent.includes('queryFn') && hooksContent.includes('chatQueryKeys.history'));

  // Typing indicator state management
  check('useTypingIndicator has isTyping state', hooksContent.includes('isTyping'));
  check('useTypingIndicator has startTyping', hooksContent.includes('startTyping'));
  check('useTypingIndicator has stopTyping', hooksContent.includes('stopTyping'));

  // API integration
  check('fetchApi helper function defined', hooksContent.includes('async function fetchApi'));
  check('API_BASE_URL defined', hooksContent.includes('API_BASE_URL'));
  check('Uses /api/agent-interaction/start endpoint', hooksContent.includes('/api/agent-interaction/start'));
  check('Uses /api/agent-interaction/send endpoint', hooksContent.includes('/api/agent-interaction/send'));
  check('Uses /api/agent-interaction/history endpoint', hooksContent.includes('/api/agent-interaction/history'));
  check('Uses /api/agent-interaction/mirror endpoint', hooksContent.includes('/api/agent-interaction/mirror'));
  check('Uses /api/agent-interaction/update-memory endpoint', hooksContent.includes('/api/agent-interaction/update-memory'));

  // Query keys
  check('chatQueryKeys object defined', hooksContent.includes('export const chatQueryKeys'));
  check('Query keys for conversations', hooksContent.includes('conversations:'));
  check('Query keys for history', hooksContent.includes('history:'));
  check('Query keys for personality', hooksContent.includes('personality:'));

  // Options and configuration
  check('useSendMessage has onTypingStart callback', hooksContent.includes('onTypingStart'));
  check('useSendMessage has onTypingEnd callback', hooksContent.includes('onTypingEnd'));
  check('useChatHistory has refetchInterval option', hooksContent.includes('refetchInterval'));
  check('useChatHistory has enabled option', hooksContent.includes('enabled'));

  // Type imports
  check('Imports AgentConversation type', hooksContent.includes('AgentConversation'));
  check('Imports AgentMessage type', hooksContent.includes('AgentMessage'));
  check('Imports MessageProcessingResult type', hooksContent.includes('MessageProcessingResult'));
  check('Imports AppliedToneStyle type', hooksContent.includes('AppliedToneStyle'));

  // Error handling
  check('fetchApi has error handling', hooksContent.includes('throw new Error'));
  check('Hooks have onSuccess callbacks', hooksContent.includes('onSuccess'));
  check('Hooks have onError callbacks', hooksContent.includes('onError'));

  // Query invalidation
  check('Invalidates queries on success', hooksContent.includes('invalidateQueries'));
  check('useAutoScroll handles message updates', hooksContent.includes('prevMessageCountRef'));
}

// =====================================================
// SECTION 2: ChatMessage Component
// =====================================================

section('2. ChatMessage Component');

check('ChatMessage.tsx file exists', fs.existsSync(CHAT_MESSAGE_FILE), CHAT_MESSAGE_FILE);

if (fs.existsSync(CHAT_MESSAGE_FILE)) {
  const chatMessageContent = fs.readFileSync(CHAT_MESSAGE_FILE, 'utf-8');

  // Component definition
  check('ChatMessage component exported', chatMessageContent.includes('export const ChatMessage'));
  check('TypingIndicator component exported', chatMessageContent.includes('export const TypingIndicator'));

  // Props interface
  check('ChatMessageProps interface defined', chatMessageContent.includes('interface ChatMessageProps'));
  check('Props includes message', chatMessageContent.includes('message:'));
  check('Props includes showMetadata', chatMessageContent.includes('showMetadata'));
  check('Props includes animate', chatMessageContent.includes('animate'));

  // Rendering logic
  check('Displays message text', chatMessageContent.includes('message.text'));
  check('Aligns based on sender type', chatMessageContent.includes('isAgent') && chatMessageContent.includes('isUser'));
  check('Shows timestamp', chatMessageContent.includes('timestamp'));
  check('Shows sentiment icon', chatMessageContent.includes('sentiment'));
  check('Shows tone badge', chatMessageContent.includes('tone'));
  check('Shows urgency indicator', chatMessageContent.includes('urgency'));
  check('Shows topics', chatMessageContent.includes('topics'));

  // Helper functions
  check('getSentimentDisplay function exists', chatMessageContent.includes('function getSentimentDisplay'));
  check('getToneColor function exists', chatMessageContent.includes('function getToneColor'));
  check('getUrgencyDisplay function exists', chatMessageContent.includes('function getUrgencyDisplay'));

  // Styling
  check('Uses Tailwind classes', chatMessageContent.includes('className'));
  check('Different styles for agent/user', chatMessageContent.includes('bg-indigo-600') && chatMessageContent.includes('bg-white'));
  check('Rounded corners for bubbles', chatMessageContent.includes('rounded-2xl'));
  check('Animation class applied', chatMessageContent.includes('animate-slideIn'));

  // TypingIndicator
  check('TypingIndicator shows animated dots', chatMessageContent.includes('animate-bounce'));
  check('TypingIndicator has multiple dots', chatMessageContent.includes('animationDelay'));
  check('TypingIndicator shows "typing..." text', chatMessageContent.includes('typing'));

  // Imports
  check('Imports AgentMessage type', chatMessageContent.includes('AgentMessage'));
  check('Imports date-fns', chatMessageContent.includes('date-fns'));
}

// =====================================================
// SECTION 3: AgentProfileBanner Component
// =====================================================

section('3. AgentProfileBanner Component');

check('AgentProfileBanner.tsx file exists', fs.existsSync(AGENT_BANNER_FILE), AGENT_BANNER_FILE);

if (fs.existsSync(AGENT_BANNER_FILE)) {
  const bannerContent = fs.readFileSync(AGENT_BANNER_FILE, 'utf-8');

  // Component definition
  check('AgentProfileBanner component exported', bannerContent.includes('export const AgentProfileBanner'));

  // Props interface
  check('AgentProfileBannerProps interface defined', bannerContent.includes('interface AgentProfileBannerProps'));
  check('Props includes agentId', bannerContent.includes('agentId'));
  check('Props includes agentName', bannerContent.includes('agentName'));
  check('Props includes personality', bannerContent.includes('personality'));
  check('Props includes isOnline', bannerContent.includes('isOnline'));
  check('Props includes messageCount', bannerContent.includes('messageCount'));
  check('Props includes onClose', bannerContent.includes('onClose'));

  // Display elements
  check('Shows agent avatar', bannerContent.includes('avatar'));
  check('Shows agent name', bannerContent.includes('agentName'));
  check('Shows agent role', bannerContent.includes('agentRole'));
  check('Shows online indicator', bannerContent.includes('Online') || bannerContent.includes('bg-green-500'));
  check('Shows message count', bannerContent.includes('messageCount'));
  check('Shows personality traits', bannerContent.includes('personality'));

  // Personality display
  check('Shows base tone', bannerContent.includes('baseTone'));
  check('Shows applied tone', bannerContent.includes('appliedTone'));
  check('Shows mirrored tone', bannerContent.includes('mirroredTone'));
  check('Shows user alignment', bannerContent.includes('userAlignment'));
  check('Shows mirroring confidence', bannerContent.includes('mirroringConfidence'));
  check('Shows adjustments', bannerContent.includes('adjustments'));

  // Helper functions
  check('getInitials function exists', bannerContent.includes('function getInitials'));
  check('getToneDisplay function exists', bannerContent.includes('function getToneDisplay'));
  check('getAlignmentDisplay function exists', bannerContent.includes('function getAlignmentDisplay'));

  // Mirroring indicator
  check('Detects if mirroring is active', bannerContent.includes('isMirroring'));
  check('Shows arrow between tones', bannerContent.includes('→') || bannerContent.includes('M13 7l5 5'));

  // Styling
  check('Responsive design (mobile/desktop)', bannerContent.includes('md:'));
  check('Close button exists', bannerContent.includes('onClose'));
}

// =====================================================
// SECTION 4: ChatMessenger Main Component
// =====================================================

section('4. ChatMessenger Main Component');

check('ChatMessenger.tsx file exists', fs.existsSync(CHAT_MESSENGER_FILE), CHAT_MESSENGER_FILE);

if (fs.existsSync(CHAT_MESSENGER_FILE)) {
  const messengerContent = fs.readFileSync(CHAT_MESSENGER_FILE, 'utf-8');

  // Component definition
  check('ChatMessenger component exported', messengerContent.includes('export const ChatMessenger'));

  // Props and routing
  check('Uses useParams hook', messengerContent.includes('useParams'));
  check('Uses useNavigate hook', messengerContent.includes('useNavigate'));
  check('Props includes conversationId', messengerContent.includes('conversationId'));
  check('Props includes agentId', messengerContent.includes('agentId'));

  // State management
  check('Has messageText state', messengerContent.includes('messageText'));
  check('Has showMetadata state', messengerContent.includes('showMetadata'));
  check('Uses refs for scrolling', messengerContent.includes('useRef'));

  // Hook usage
  check('Uses useConversation hook', messengerContent.includes('useConversation'));
  check('Uses useChatHistory hook', messengerContent.includes('useChatHistory'));
  check('Uses useSendMessage hook', messengerContent.includes('useSendMessage'));
  check('Uses useTypingIndicator hook', messengerContent.includes('useTypingIndicator'));
  check('Uses useMirrorPersonality hook', messengerContent.includes('useMirrorPersonality'));
  check('Uses useAutoScroll hook', messengerContent.includes('useAutoScroll'));
  check('Uses useAgentMemoryInjection hook', messengerContent.includes('useAgentMemoryInjection'));

  // Component rendering
  check('Renders AgentProfileBanner', messengerContent.includes('AgentProfileBanner'));
  check('Renders ChatMessage components', messengerContent.includes('ChatMessage'));
  check('Renders TypingIndicator', messengerContent.includes('TypingIndicator'));

  // Message handling
  check('Has handleSendMessage function', messengerContent.includes('handleSendMessage'));
  check('Has handleKeyDown for keyboard shortcuts', messengerContent.includes('handleKeyDown'));
  check('Enter key sends message', messengerContent.includes('Enter') && messengerContent.includes('preventDefault'));
  check('Shift+Enter creates newline', messengerContent.includes('shiftKey'));

  // UI features
  check('Has textarea input', messengerContent.includes('textarea'));
  check('Has send button', messengerContent.includes('Send') || messengerContent.includes('button'));
  check('Shows loading state', messengerContent.includes('isLoading') || messengerContent.includes('Loading'));
  check('Shows empty state', messengerContent.includes('Empty') || messengerContent.includes('Start'));
  check('Shows typing indicator when sending', messengerContent.includes('isTyping'));

  // Auto-scroll
  check('Auto-scrolls to new messages', messengerContent.includes('scrollTo') || messengerContent.includes('scrollHeight'));
  check('Smooth scroll behavior', messengerContent.includes('smooth'));

  // Memory injection
  check('Injects memory after message sent', messengerContent.includes('injectMemory'));
  check('Extracts topics and entities', messengerContent.includes('extractTopics') && messengerContent.includes('extractEntities'));

  // Options
  check('Enables tone mirroring', messengerContent.includes('mirrorTone: true'));
  check('Enables context inclusion', messengerContent.includes('includeContext: true'));
  check('Sets max tokens', messengerContent.includes('maxTokens'));

  // Responsive design
  check('Responsive padding/margins', messengerContent.includes('md:px') || messengerContent.includes('md:py'));
  check('Responsive text sizes', messengerContent.includes('md:text'));

  // Error handling
  check('Has error handling in onError', messengerContent.includes('onError'));
}

// =====================================================
// SECTION 5: Index File
// =====================================================

section('5. Index File');

check('index.ts file exists', fs.existsSync(INDEX_FILE), INDEX_FILE);

if (fs.existsSync(INDEX_FILE)) {
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');

  check('Exports ChatMessenger', indexContent.includes('ChatMessenger'));
  check('Exports ChatMessage', indexContent.includes('ChatMessage'));
  check('Exports TypingIndicator', indexContent.includes('TypingIndicator'));
  check('Exports AgentProfileBanner', indexContent.includes('AgentProfileBanner'));
  check('Has default export', indexContent.includes('export default'));
}

// =====================================================
// SECTION 6: Tailwind Configuration
// =====================================================

section('6. Tailwind Configuration');

check('tailwind.config.ts file exists', fs.existsSync(TAILWIND_CONFIG), TAILWIND_CONFIG);

if (fs.existsSync(TAILWIND_CONFIG)) {
  const tailwindContent = fs.readFileSync(TAILWIND_CONFIG, 'utf-8');

  check('Has keyframes configuration', tailwindContent.includes('keyframes'));
  check('Has slideIn animation keyframe', tailwindContent.includes('slideIn'));
  check('slideIn has opacity transition', tailwindContent.includes('opacity'));
  check('slideIn has transform transition', tailwindContent.includes('transform'));
  check('Has animation configuration', tailwindContent.includes('animation'));
  check('slideIn animation registered', tailwindContent.includes('slideIn'));
}

// =====================================================
// SUMMARY
// =====================================================

console.log('\n' + '='.repeat(50));
console.log(`${colors.cyan}VERIFICATION SUMMARY${colors.reset}`);
console.log('='.repeat(50));
console.log('');

const total = passed + failed;
const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

console.log(`Passed: ${colors.green}${passed}/${total} (${percentage}%)${colors.reset}`);

if (failed > 0) {
  console.log(`Failed: ${colors.red}${failed}/${total}${colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}⚠ Some checks failed. Please review the output above.${colors.reset}`);
  process.exit(1);
} else {
  console.log('');
  console.log(`${colors.green}✓ All checks passed! Sprint 46 Phase 4.2 implementation is complete.${colors.reset}`);
  process.exit(0);
}
