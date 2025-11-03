# Sprint 46 Phase 4.2: Real-Time Messaging UI + Frontend Hooks

## Overview

Sprint 46 Phase 4.2 implements a React-based, production-grade chat interface for real-time human-agent messaging. This frontend layer integrates with the backend API from Sprint 45 Phase 4.1, providing a complete messaging experience with typing indicators, personality mirroring, auto-scrolling, and intelligent memory injection.

### Key Features

- **Real-time Chat Interface**: Responsive, modern chat UI with smooth animations
- **Typing Indicators**: Animated dots showing when agent is generating response
- **Personality Mirroring**: Visual display of tone adaptation and confidence levels
- **Auto-scroll**: Automatic scrolling to new messages with smooth behavior
- **Message Metadata**: Display of tone, sentiment, urgency, and topics
- **Memory Injection**: Automatic extraction and storage of conversation learnings
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for newlines
- **Responsive Design**: Mobile-first design that adapts to all screen sizes
- **React Query Integration**: Optimistic updates, caching, and real-time refetching

## Architecture

### Component Stack

```
┌─────────────────────────────────────────┐
│         ChatMessenger (Container)       │
│  - Message history                      │
│  - Input handling                       │
│  - Auto-scroll management               │
│  - Memory injection                     │
└────────────┬────────────────────────────┘
             │
       ┌─────┴─────┬──────────────┐
       │           │              │
┌──────▼──────┐  ┌─▼─────────┐  ┌▼──────────────┐
│   Profile   │  │  Message  │  │    Hooks      │
│   Banner    │  │ Component │  │ useAgentChat  │
│             │  │           │  │               │
└─────────────┘  └───────────┘  └───┬───────────┘
                                     │
                           ┌─────────▼────────────┐
                           │   React Query        │
                           │   State Management   │
                           └─────────┬────────────┘
                                     │
                           ┌─────────▼────────────┐
                           │   Backend API        │
                           │ (Sprint 45 Phase 4.1)│
                           └──────────────────────┘
```

## Components

### 1. React Hooks (`apps/dashboard/src/hooks/useAgentChat.ts`)

Centralized hooks for all chat-related operations using React Query.

#### Core Hooks

**useStartConversation()**

Start a new conversation with an agent.

```typescript
import { useStartConversation } from '../hooks/useAgentChat';

function MyComponent() {
  const { mutate: startConversation, isPending } = useStartConversation({
    onSuccess: (conversation) => {
      console.log('Conversation started:', conversation.id);
      navigate(`/chat/${conversation.id}`);
    },
    onError: (error) => {
      console.error('Failed to start conversation:', error);
    },
  });

  const handleStartChat = () => {
    startConversation({
      agentId: 'agent-123',
      title: 'PR Strategy Discussion',
      initialMessage: 'Hi, I need help with my campaign',
      metadata: { source: 'dashboard' },
    });
  };

  return (
    <button onClick={handleStartChat} disabled={isPending}>
      {isPending ? 'Starting...' : 'Start Chat'}
    </button>
  );
}
```

**useSendMessage()**

Send a message to an agent and receive response.

```typescript
import { useSendMessage } from '../hooks/useAgentChat';

function ChatInput({ conversationId }) {
  const [text, setText] = useState('');

  const { mutate: sendMessage, isPending } = useSendMessage({
    onTypingStart: () => console.log('Agent is typing...'),
    onTypingEnd: () => console.log('Agent finished typing'),
    onSuccess: (result) => {
      console.log('Message sent:', result.message);
      setText('');
    },
  });

  const handleSend = () => {
    sendMessage({
      conversationId,
      text,
      metadata: { urgency: 'high' },
      options: {
        mirrorTone: true,
        includeContext: true,
        maxTokens: 500,
      },
    });
  };

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handleSend} disabled={isPending}>
        Send
      </button>
    </div>
  );
}
```

**useChatHistory()**

Fetch and auto-refresh conversation history.

```typescript
import { useChatHistory } from '../hooks/useAgentChat';

function MessageList({ conversationId }) {
  const { data: messages, isLoading, error } = useChatHistory(conversationId, {
    limit: 50,
    offset: 0,
    includeMetadata: true,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) return <div>Loading messages...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {messages?.map((msg) => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

**useTypingIndicator()**

Manage typing indicator state.

```typescript
import { useTypingIndicator } from '../hooks/useAgentChat';

function Chat() {
  const { isTyping, startTyping, stopTyping } = useTypingIndicator();

  const handleSendMessage = async () => {
    startTyping();
    try {
      await sendMessageToAPI();
    } finally {
      stopTyping();
    }
  };

  return (
    <div>
      {isTyping && <div>Agent is typing...</div>}
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}
```

**useMirrorPersonality()**

Get agent's mirrored personality traits.

```typescript
import { useMirrorPersonality } from '../hooks/useAgentChat';

function PersonalityDisplay({ agentId, conversationId }) {
  const { data: personality, isLoading } = useMirrorPersonality(
    agentId,
    conversationId,
    { recentTurns: 3 }
  );

  if (isLoading) return <div>Loading personality...</div>;

  return (
    <div>
      <p>Base Tone: {personality?.baseTone}</p>
      <p>Mirrored Tone: {personality?.mirroredTone}</p>
      <p>Applied Tone: {personality?.appliedTone}</p>
      <p>Confidence: {personality?.mirroringConfidence * 100}%</p>
    </div>
  );
}
```

**useAgentMemoryInjection()**

Inject conversation learnings into agent memory.

```typescript
import { useAgentMemoryInjection } from '../hooks/useAgentChat';

function Chat() {
  const { mutate: injectMemory } = useAgentMemoryInjection({
    onSuccess: () => console.log('Memory updated'),
  });

  const handleMessageSent = (userMsg, agentMsg, turnNumber) => {
    injectMemory({
      agentId: 'agent-123',
      turn: {
        conversationId: 'conv-456',
        userMessage: userMsg,
        agentResponse: agentMsg,
        turnNumber,
      },
      options: {
        extractTopics: true,
        extractEntities: true,
      },
    });
  };

  return <div>...</div>;
}
```

#### Utility Hooks

**useConversations()** - Fetch user's active conversations
**useConversation()** - Fetch single conversation details
**useConversationAnalytics()** - Get conversation metrics
**useUpdateConversationStatus()** - Update conversation status
**useAutoScroll()** - Auto-scroll to latest message

### 2. ChatMessage Component (`apps/dashboard/src/pages/agent-chat/ChatMessage.tsx`)

Displays individual messages with metadata, styling, and animations.

#### Features

- **Sender-based Alignment**: User messages on right (blue), agent on left (white)
- **Metadata Display**: Tone, sentiment, urgency, timestamp, topics
- **Animations**: Smooth slide-in animation for new messages
- **Responsive**: Adapts to mobile and desktop screens
- **Accessibility**: Proper ARIA labels and semantic HTML

#### Usage

```typescript
import { ChatMessage } from './ChatMessage';

function MessageList({ messages }) {
  return (
    <div>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          showMetadata={true}
          animate={true}
        />
      ))}
    </div>
  );
}
```

#### Props

```typescript
interface ChatMessageProps {
  message: AgentMessage;
  showMetadata?: boolean; // Show tone, sentiment, etc. (default: true)
  animate?: boolean; // Apply slide-in animation (default: true)
}
```

#### Metadata Display

**Tone Badge**: Shows agent's communication tone
- Formal, Casual, Friendly, Professional, Witty, etc.
- Color-coded badges with icons

**Sentiment Icon**: Shows message sentiment
- 😊 Positive (green)
- 😌 Neutral (gray)
- 😔 Negative (red)
- 😐 Mixed (yellow)

**Urgency Indicator**: Shows message priority
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Low

**Topics**: Hashtag-style topic badges
- Auto-extracted from message content
- Shows up to 3 topics

### 3. TypingIndicator Component

Animated typing indicator shown when agent is generating response.

```typescript
import { TypingIndicator } from './ChatMessage';

function Chat() {
  const { isTyping } = useTypingIndicator();

  return (
    <div>
      {/* Messages */}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
```

Features:
- Three animated dots with staggered bounce
- "Agent is typing..." label
- Consistent with agent message styling

### 4. AgentProfileBanner Component (`apps/dashboard/src/pages/agent-chat/AgentProfileBanner.tsx`)

Header banner showing agent profile, personality traits, and status.

#### Features

- **Agent Avatar**: Photo or initials-based placeholder
- **Online Status**: Green indicator for active agents
- **Personality Display**: Base tone, mirrored tone, confidence
- **Message Count**: Total messages in conversation
- **Mirroring Indicator**: Visual arrow showing tone adaptation
- **Responsive**: Optimized for mobile and desktop

#### Usage

```typescript
import { AgentProfileBanner } from './AgentProfileBanner';

function Chat({ conversation, personality }) {
  return (
    <div>
      <AgentProfileBanner
        agentId={conversation.agentId}
        agentName="Sarah - PR Strategist"
        agentRole="Campaign Strategy Assistant"
        avatarUrl="/avatars/sarah.jpg"
        personality={personality}
        isOnline={true}
        messageCount={conversation.messageCount}
        onClose={() => navigate('/dashboard')}
      />
      {/* Chat content */}
    </div>
  );
}
```

#### Props

```typescript
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
```

#### Personality Display

When personality mirroring is active, the banner shows:

```
🎩 Base: Professional  →  🤗 Mirrored: Friendly  📊 75% confidence
```

**Base Tone**: Agent's default personality
**Mirrored Tone**: Detected user tone (if different)
**Applied Tone**: Final blended tone being used
**Confidence**: Mirroring accuracy percentage

### 5. ChatMessenger Component (`apps/dashboard/src/pages/agent-chat/ChatMessenger.tsx`)

Main container component orchestrating the entire chat experience.

#### Features

- **Message History**: Scrollable message thread with pagination
- **Real-time Updates**: Polls for new messages every 5 seconds
- **Auto-scroll**: Smooth scroll to bottom on new messages
- **Typing Indicator**: Shows when agent is generating response
- **Memory Injection**: Auto-stores learnings after each exchange
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for newlines
- **Empty States**: Helpful prompts when no messages
- **Loading States**: Spinners during data fetching
- **Error Handling**: User-friendly error messages

#### Usage

```typescript
import { ChatMessenger } from './ChatMessenger';

// Route-based usage
<Route path="/chat/:conversationId" element={<ChatMessenger />} />

// Prop-based usage
<ChatMessenger
  conversationId="conv-123"
  agentId="agent-456"
  onClose={() => navigate('/dashboard')}
/>
```

#### Props

```typescript
interface ChatMessengerProps {
  conversationId?: string; // Can also come from route params
  agentId?: string; // Optional agent ID
  onClose?: () => void; // Close handler
}
```

#### Keyboard Shortcuts

- **Enter**: Send message
- **Shift+Enter**: Insert newline
- **Character limit**: 10,000 characters

#### Auto-scroll Behavior

Messages automatically scroll to bottom when:
- New message arrives
- User sends a message
- Component first loads

Scroll behavior is smooth (animated) for better UX.

#### Memory Injection

After each agent response, the component automatically:
1. Extracts topics from the conversation turn
2. Extracts entities (names, companies, etc.)
3. Stores as memory entry in agent's memory bank
4. Links to conversation for context

This keeps the agent's knowledge current with the conversation.

## Styling and Animations

### Tailwind Configuration

Custom animations added to `tailwind.config.ts`:

```typescript
{
  keyframes: {
    slideIn: {
      '0%': { opacity: '0', transform: 'translateY(10px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
  },
  animation: {
    slideIn: 'slideIn 0.3s ease-out',
  },
}
```

### Color Scheme

**User Messages**:
- Background: `bg-indigo-600`
- Text: `text-white`
- Alignment: Right

**Agent Messages**:
- Background: `bg-white`
- Border: `border-gray-200`
- Text: `text-gray-900`
- Alignment: Left

**Tone Badges**:
- Formal: Blue
- Casual: Green
- Friendly: Pink
- Professional: Indigo
- Witty: Purple
- Assertive: Orange
- Empathetic: Rose
- Direct: Gray
- Diplomatic: Cyan

### Responsive Breakpoints

- **Mobile**: Default styling (< 768px)
- **Desktop**: `md:` classes (≥ 768px)

Changes at desktop breakpoint:
- Larger text sizes
- More padding/spacing
- Wider message bubbles
- Additional UI elements visible

## Integration Guide

### Prerequisites

1. **Sprint 45 Phase 4.1** - Backend API must be running
2. **React Query** - Install `@tanstack/react-query`
3. **React Router** - Install `react-router-dom`
4. **date-fns** - Install `date-fns` for timestamp formatting
5. **Tailwind CSS** - Must be configured

### Installation

```bash
# Install dependencies
cd apps/dashboard
npm install @tanstack/react-query react-router-dom date-fns

# Ensure Tailwind is configured
npm install -D tailwindcss postcss autoprefixer
```

### Setup React Query

```typescript
// apps/dashboard/src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

### Add Routes

```typescript
// apps/dashboard/src/routes.tsx
import { ChatMessenger } from './pages/agent-chat';

const routes = [
  {
    path: '/chat/:conversationId',
    element: <ChatMessenger />,
  },
  // ... other routes
];
```

### Environment Variables

```bash
# .env
REACT_APP_API_URL=http://localhost:3001
```

### User Authentication

The hooks read user/org IDs from localStorage:

```typescript
// Set on login
localStorage.setItem('userId', 'user-123');
localStorage.setItem('organizationId', 'org-456');
```

Production implementation should use proper auth context/session management.

## Usage Examples

### Example 1: Basic Chat Page

```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatMessenger } from '../pages/agent-chat';

export default function ChatPage() {
  return (
    <div className="h-screen">
      <ChatMessenger />
    </div>
  );
}
```

### Example 2: Chat with Conversation List

```typescript
import React, { useState } from 'react';
import { ChatMessenger } from '../pages/agent-chat';
import { useConversations, useStartConversation } from '../hooks/useAgentChat';

export default function ChatDashboard() {
  const [activeConversationId, setActiveConversationId] = useState(null);

  const { data: conversations } = useConversations({ limit: 20 });
  const { mutate: startConversation } = useStartConversation({
    onSuccess: (conv) => setActiveConversationId(conv.id),
  });

  return (
    <div className="flex h-screen">
      {/* Sidebar: Conversation List */}
      <div className="w-1/4 border-r bg-white">
        <button
          onClick={() => startConversation({
            agentId: 'agent-123',
            title: 'New Conversation',
          })}
          className="w-full p-4 bg-indigo-600 text-white"
        >
          New Chat
        </button>
        <div className="overflow-y-auto">
          {conversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                activeConversationId === conv.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="font-medium">{conv.title}</div>
              <div className="text-sm text-gray-500">
                {conv.messageCount} messages
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Chat Messenger */}
      <div className="flex-1">
        {activeConversationId ? (
          <ChatMessenger
            conversationId={activeConversationId}
            onClose={() => setActiveConversationId(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a conversation or start a new one
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example 3: Embedded Chat Widget

```typescript
import React, { useState } from 'react';
import { ChatMessenger } from '../pages/agent-chat';
import { useStartConversation } from '../hooks/useAgentChat';

export function ChatWidget({ agentId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const { mutate: startConversation } = useStartConversation({
    onSuccess: (conv) => {
      setConversationId(conv.id);
      setIsOpen(true);
    },
  });

  const handleOpen = () => {
    if (conversationId) {
      setIsOpen(true);
    } else {
      startConversation({ agentId, title: 'Support Chat' });
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700"
      >
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          <ChatMessenger
            conversationId={conversationId}
            agentId={agentId}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}
```

## Development Notes

### React Query Caching

**Query Keys Structure**:
```typescript
['agent-chat', 'conversations'] // All conversations
['agent-chat', 'conversation', conversationId] // Single conversation
['agent-chat', 'history', conversationId, limit, offset] // Message history
['agent-chat', 'personality', agentId, userId] // Personality data
```

**Stale Times**:
- Chat history: 1 second (near real-time)
- Conversations: 5 seconds
- Conversation details: 10 seconds
- Personality: 1 minute
- Analytics: 30 seconds

**Refetch Intervals**:
- Chat history: 5 seconds (configurable)
- Active conversations: Optional

### Performance Optimization

**Message Rendering**:
- Use React.memo() for ChatMessage components
- Virtualize long message lists (react-window)
- Limit initial load to 50 messages

**Auto-scroll**:
- Only scroll on new messages (not on refetch)
- Use refs to avoid layout thrashing
- Smooth behavior for better UX

**API Calls**:
- Debounce message sends (prevent double-send)
- Cancel in-flight requests on unmount
- Implement optimistic updates for instant feedback

### Accessibility

**Keyboard Navigation**:
- Tab through all interactive elements
- Enter to send, Shift+Enter for newline
- Escape to close dialogs

**Screen Readers**:
- Proper ARIA labels on all buttons
- Semantic HTML (header, main, footer)
- Live regions for new messages

**Visual**:
- High contrast colors
- Clear focus indicators
- Responsive text sizes

## Testing

### Unit Tests

```typescript
// ChatMessage.test.tsx
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';

test('renders user message on right', () => {
  const message = {
    id: '1',
    text: 'Hello',
    senderType: 'user',
    timestamp: new Date(),
  };

  render(<ChatMessage message={message} />);

  const element = screen.getByText('Hello');
  expect(element).toBeInTheDocument();
  expect(element.closest('div')).toHaveClass('justify-end');
});

test('shows metadata when enabled', () => {
  const message = {
    id: '1',
    text: 'Hello',
    senderType: 'agent',
    metadata: { tone: 'professional', sentiment: 'positive' },
    timestamp: new Date(),
  };

  render(<ChatMessage message={message} showMetadata={true} />);

  expect(screen.getByText(/professional/i)).toBeInTheDocument();
  expect(screen.getByText(/positive/i)).toBeInTheDocument();
});
```

### Integration Tests

```typescript
// ChatMessenger.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatMessenger } from './ChatMessenger';

const queryClient = new QueryClient();

test('sends message on enter key', async () => {
  const conversationId = 'conv-123';

  render(
    <QueryClientProvider client={queryClient}>
      <ChatMessenger conversationId={conversationId} />
    </QueryClientProvider>
  );

  const input = screen.getByPlaceholderText(/type your message/i);

  await userEvent.type(input, 'Hello agent');
  await userEvent.keyboard('{Enter}');

  await waitFor(() => {
    expect(input).toHaveValue(''); // Input cleared after send
  });
});
```

## Deployment

### Build

```bash
cd apps/dashboard
npm run build
```

### Environment Variables

```bash
# Production
REACT_APP_API_URL=https://api.pravado.com

# Staging
REACT_APP_API_URL=https://staging-api.pravado.com
```

### Monitoring

**Key Metrics**:
- Message send latency (target: < 2s)
- UI render time (target: < 100ms)
- WebSocket connection uptime (future)
- Error rate (target: < 1%)

**Logging**:
- Log all API errors
- Track failed message sends
- Monitor typing indicator timeouts

## Future Enhancements

### Phase 4.3: WebSocket Support
- Real-time message delivery
- Live typing indicators
- Presence detection
- Read receipts

### Phase 4.4: Rich Media
- Image message support
- File attachments
- Voice messages (transcribed)
- Link previews

### Phase 4.5: Advanced Features
- Message editing
- Message reactions
- Thread support
- Message search
- Conversation export

## Troubleshooting

### Messages not loading

**Problem**: Messages don't appear in chat
**Solution**:
- Check API is running (`http://localhost:3001/api/agent-interaction/health`)
- Verify conversationId is valid
- Check browser console for errors
- Ensure user/org IDs are set in localStorage

### Typing indicator stuck

**Problem**: Typing indicator doesn't disappear
**Solution**:
- Check network tab for failed API calls
- Verify onTypingEnd callback is firing
- Check for JavaScript errors in console
- Timeout will auto-clear after 30 seconds

### Personality not showing

**Problem**: Personality badges missing
**Solution**:
- Ensure useMirrorPersonality is called with valid IDs
- Check API endpoint returns personality data
- Verify conversationId has recent turns
- Check component receives personality prop

### Auto-scroll not working

**Problem**: Chat doesn't scroll to bottom
**Solution**:
- Check messagesContainerRef is attached to correct element
- Verify useAutoScroll receives messages array
- Ensure messages length is changing
- Check for CSS overflow issues

## Support

For issues or questions:
- Run verification: `node apps/api/verify-sprint46-phase4.2.js`
- Check browser console for errors
- Review network tab for failed API calls
- Test with Sprint 45 Phase 4.1 backend

## References

- Sprint 45 Phase 4.1: Human-Agent Interaction Interface (Backend)
- React Query Documentation: https://tanstack.com/query/latest
- React Router Documentation: https://reactrouter.com/
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- date-fns Documentation: https://date-fns.org/
