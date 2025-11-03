# Sprint 45 Phase 4.1: Human-Agent Interaction Interface

## Overview

Sprint 45 Phase 4.1 implements the foundational backend and API layer for enabling real-time, multi-modal interaction between human users and AI agents. This system provides messaging, turn-taking, memory alignment, and personality mirroring capabilities.

### Key Features

- **Real-time Messaging**: Send and receive messages between users and agents
- **Personality Mirroring**: Dynamic tone adaptation based on user communication style
- **Context Injection**: Memory-aware responses using agent context and history
- **Turn Tracking**: Structured user-agent exchanges with metadata
- **Conversation Management**: Full lifecycle management of conversations
- **Analytics**: Conversation metrics and agent performance tracking
- **Full-text Search**: Search across all conversation messages
- **Multi-tenant Security**: Row-level security for organization isolation

## Architecture

### Component Stack

```
┌─────────────────────────────────────────┐
│         REST API Endpoints              │
│   (agent-interaction.ts routes)         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      AgentMessenger Service             │
│  - sendMessageToAgent()                 │
│  - startConversation()                  │
│  - mirrorPersonalityTraits()            │
│  - updateAgentMemoryFromTurn()          │
└─────┬──────────────────────────┬────────┘
      │                          │
      │                          │
┌─────▼──────────┐    ┌──────────▼────────┐
│ Personality    │    │  Context          │
│ Engine         │    │  Enhancer         │
│ (Sprint 44)    │    │  (Sprint 43)      │
└─────┬──────────┘    └──────────┬────────┘
      │                          │
      │       ┌──────────────────▼────────┐
      │       │   OpenAI GPT-4            │
      │       │   Response Generation     │
      │       └──────────────────┬────────┘
      │                          │
┌─────▼──────────────────────────▼────────┐
│           PostgreSQL Database           │
│  - agent_conversations                  │
│  - agent_messages                       │
│  - user_agent_turns                     │
│  - agent_memory (Sprint 43)             │
└─────────────────────────────────────────┘
```

### Data Flow: Sending a Message

1. **User sends message** via `POST /api/agent-interaction/send`
2. **Store user message** in `agent_messages` table
3. **Get agent persona** from personality engine
4. **Mirror personality** (optional) - detect user tone and blend with agent tone
5. **Build enhanced context** from agent memory and playbooks
6. **Get recent history** (last 10 messages)
7. **Build system prompt** with persona, tone, and context
8. **Generate response** via OpenAI GPT-4
9. **Store agent message** with metadata and context
10. **Create turn record** linking user and agent messages
11. **Update conversation** stats (message count, last active time)
12. **Return result** with message, personality, context, and stats

## Components

### 1. TypeScript Types (`packages/shared-types/src/agent-interaction.ts`)

#### Core Types

**AgentMessage**
```typescript
interface AgentMessage {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent';
  senderId: string;
  text: string;
  metadata?: MessageMetadata;
  context?: MessageContext;
  timestamp: Date;
  isEdited?: boolean;
  parentMessageId?: string;
}
```

**MessageMetadata**
```typescript
interface MessageMetadata {
  tone?: PersonalityTone;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  intent?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  topics?: string[];
  entities?: string[];
  contextRefs?: string[];
  custom?: Record<string, any>;
}
```

**AgentConversation**
```typescript
interface AgentConversation {
  id: string;
  userId: string;
  agentId: string;
  organizationId: string;
  title?: string;
  status: ConversationStatus;
  messageCount: number;
  lastMessageAt?: Date;
  lastActiveAt: Date;
  metadata?: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}
```

**MessageProcessingResult**
```typescript
interface MessageProcessingResult {
  message: AgentMessage;
  appliedPersonality?: {
    tone: PersonalityTone;
    userAlignment: UserAlignment;
    mirrored: boolean;
  };
  contextUsed?: {
    memorySnippets: number;
    recentTurns: number;
    contextSources: string[];
  };
  stats?: {
    processingTimeMs: number;
    tokensUsed: number;
    confidenceScore: number;
  };
  suggestions?: string[];
}
```

**AppliedToneStyle**
```typescript
interface AppliedToneStyle {
  baseTone: PersonalityTone;
  mirroredTone?: PersonalityTone;
  appliedTone: PersonalityTone;
  userAlignment: UserAlignment;
  mirroringConfidence: number;
  adjustments?: string[];
}
```

### 2. Database Schema (`20251105_create_agent_interactions.sql`)

#### Tables

**agent_conversations**
- Primary conversation tracking table
- Links users, agents, and organizations
- Tracks status, message count, activity timestamps
- Stores metadata in JSONB

**agent_messages**
- Individual message storage
- References conversation
- Stores sender type (user/agent), sender ID, text
- Metadata (tone, sentiment, intent, etc.) in JSONB
- Context (persona, tokens, processing) in JSONB
- Parent message ID for threading

**user_agent_turns**
- Turn-based conversation tracking
- Links user message ID and agent message ID
- Sequential turn numbering per conversation
- Denormalized text for fast access
- Metadata for ratings, feedback, confidence

#### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX idx_agent_conversations_agent ON agent_conversations(agent_id);
CREATE INDEX idx_agent_conversations_org ON agent_conversations(organization_id);
CREATE INDEX idx_agent_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX idx_agent_messages_sender ON agent_messages(sender_id);

-- Full-text search
CREATE INDEX idx_agent_messages_text_fts
  ON agent_messages USING GIN (to_tsvector('english', text));

-- JSONB indexes
CREATE INDEX idx_agent_messages_metadata USING GIN (metadata);
CREATE INDEX idx_agent_messages_context USING GIN (context);
```

#### Helper Functions

**get_user_active_conversations(user_id, limit)**
- Returns user's active conversations
- Sorted by last_active_at DESC
- Excludes archived conversations

**get_conversation_messages(conversation_id, limit, offset)**
- Returns paginated messages for a conversation
- Ordered by created_at ASC

**get_recent_turns(conversation_id, limit)**
- Returns recent turns for a conversation
- Ordered by turn_number DESC

**get_conversation_analytics(conversation_id)**
- Returns conversation statistics
- Message count, avg response time, sentiment distribution

**get_agent_conversation_stats(agent_id, days)**
- Returns agent performance metrics
- Total conversations, messages, avg response time

**search_messages(user_id, query, limit)**
- Full-text search across user's messages
- Uses PostgreSQL tsvector for performance

**archive_inactive_conversations()**
- Archives conversations inactive for 30+ days
- Should be called by scheduled job

#### Row-Level Security (RLS)

All tables have RLS enabled with policies enforcing organization-level isolation:

```sql
-- Example policy
CREATE POLICY select_own_org_conversations
  ON agent_conversations
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

### 3. AgentMessenger Service (`apps/api/src/services/agentMessenger.ts`)

Core service class handling all messaging logic.

#### Key Methods

**sendMessageToAgent(conversationId, message, options)**

Sends a message to an agent and gets a response.

```typescript
const result = await agentMessenger.sendMessageToAgent(
  conversationId,
  {
    text: "How can I improve my PR strategy?",
    userId: "user-123",
    metadata: { urgency: 'high' }
  },
  {
    waitForResponse: true,
    mirrorTone: true,
    includeContext: true,
    maxTokens: 500
  }
);
```

**Process Flow:**
1. Validate conversation exists
2. Store user message
3. Get agent persona from personality engine
4. Mirror personality traits if requested
5. Build enhanced context from memory/playbooks
6. Get recent conversation history
7. Build system prompt with persona + context
8. Generate response via OpenAI GPT-4
9. Store agent message with metadata
10. Create turn record
11. Return MessageProcessingResult

**startConversation(userId, agentId, organizationId, options)**

Creates a new conversation.

```typescript
const conversation = await agentMessenger.startConversation(
  "user-123",
  "agent-456",
  "org-789",
  {
    title: "PR Strategy Discussion",
    initialMessage: "Hi, I need help with my campaign",
    metadata: { source: 'web-app' }
  }
);
```

**getConversationHistory(conversationId, options)**

Retrieves conversation messages with pagination.

```typescript
const messages = await agentMessenger.getConversationHistory(
  conversationId,
  {
    limit: 50,
    offset: 0,
    includeMetadata: true,
    includeContext: true
  }
);
```

**mirrorPersonalityTraits(agentId, userId, conversationId, recentTurns)**

Analyzes user tone and blends with agent persona.

```typescript
const appliedTone = await agentMessenger.mirrorPersonalityTraits(
  "agent-456",
  "user-123",
  conversationId,
  3 // analyze last 3 turns
);

// Returns:
// {
//   baseTone: 'professional',
//   mirroredTone: 'casual',
//   appliedTone: 'friendly',
//   userAlignment: 'collaborative',
//   mirroringConfidence: 0.75,
//   adjustments: [...]
// }
```

**Tone Detection Logic:**
- Analyzes recent user messages
- Uses keyword-based heuristics
- Calculates confidence based on indicator frequency
- Blends base agent tone with detected user tone

**updateAgentMemoryFromTurn(agentId, turn, organizationId, options)**

Extracts learnings from conversation turn and stores in memory.

```typescript
await agentMessenger.updateAgentMemoryFromTurn(
  "agent-456",
  turn,
  "org-789",
  {
    extractTopics: true,
    extractEntities: true,
    updatePersona: false
  }
);
```

### 4. API Endpoints (`apps/api/src/routes/agent-interaction.ts`)

#### Core Messaging Endpoints

**POST /api/agent-interaction/send**

Send message to agent and get response.

**Request:**
```json
{
  "conversationId": "uuid",
  "text": "How can I improve my PR strategy?",
  "userId": "uuid",
  "metadata": {
    "urgency": "high",
    "topics": ["PR", "strategy"]
  },
  "options": {
    "waitForResponse": true,
    "mirrorTone": true,
    "includeContext": true,
    "maxTokens": 500
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "message": {
      "id": "uuid",
      "conversationId": "uuid",
      "senderType": "agent",
      "senderId": "uuid",
      "text": "I'd be happy to help...",
      "metadata": { "tone": "professional" },
      "timestamp": "2025-11-03T10:00:00Z"
    },
    "appliedPersonality": {
      "tone": "professional",
      "userAlignment": "collaborative",
      "mirrored": true
    },
    "contextUsed": {
      "memorySnippets": 5,
      "recentTurns": 3,
      "contextSources": ["agent_memory", "agent_settings"]
    },
    "stats": {
      "processingTimeMs": 1250,
      "tokensUsed": 342,
      "confidenceScore": 0.85
    }
  }
}
```

**POST /api/agent-interaction/start**

Start a new conversation.

**Request:**
```json
{
  "userId": "uuid",
  "agentId": "uuid",
  "organizationId": "uuid",
  "title": "PR Strategy Discussion",
  "initialMessage": "Hi, I need help",
  "metadata": { "source": "web-app" }
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "userId": "uuid",
    "agentId": "uuid",
    "organizationId": "uuid",
    "title": "PR Strategy Discussion",
    "status": "active",
    "messageCount": 1,
    "createdAt": "2025-11-03T10:00:00Z"
  }
}
```

**GET /api/agent-interaction/history/:conversationId**

Get conversation history.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `includeMetadata` (default: false)
- `includeContext` (default: false)

**Response:**
```json
{
  "success": true,
  "messages": [...],
  "count": 25,
  "limit": 50,
  "offset": 0
}
```

**POST /api/agent-interaction/mirror**

Mirror personality traits from user.

**Request:**
```json
{
  "agentId": "uuid",
  "userId": "uuid",
  "conversationId": "uuid",
  "recentTurns": 3
}
```

**Response:**
```json
{
  "success": true,
  "appliedToneStyle": {
    "baseTone": "professional",
    "mirroredTone": "casual",
    "appliedTone": "friendly",
    "userAlignment": "collaborative",
    "mirroringConfidence": 0.75,
    "adjustments": [
      "Shifted from professional to friendly",
      "User tone detected: casual (75% confidence)"
    ]
  }
}
```

**POST /api/agent-interaction/update-memory**

Update agent memory from conversation turn.

**Request:**
```json
{
  "agentId": "uuid",
  "turn": {
    "conversationId": "uuid",
    "userMessage": "...",
    "agentResponse": "...",
    "turnNumber": 5
  },
  "organizationId": "uuid",
  "options": {
    "extractTopics": true,
    "extractEntities": true
  }
}
```

#### Conversation Management Endpoints

**GET /api/agent-interaction/conversations**

Get user's active conversations.

**Query Parameters:**
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "conversations": [...],
  "count": 15
}
```

**GET /api/agent-interaction/conversation/:conversationId**

Get conversation details.

**PUT /api/agent-interaction/conversation/:conversationId/status**

Update conversation status.

**Request:**
```json
{
  "status": "paused" // or "active", "archived", "completed"
}
```

**DELETE /api/agent-interaction/conversation/:conversationId**

Delete or archive conversation.

**Query Parameters:**
- `archive` (default: false) - If true, archives instead of deleting

#### Analytics Endpoints

**GET /api/agent-interaction/analytics/conversation/:conversationId**

Get conversation analytics.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "messageCount": 42,
    "avgResponseTimeMs": 1200,
    "sentimentDistribution": {
      "positive": 0.6,
      "neutral": 0.3,
      "negative": 0.1
    },
    "topTopics": ["PR", "strategy", "media"]
  }
}
```

**GET /api/agent-interaction/analytics/agent/:agentId**

Get agent conversation stats.

**Query Parameters:**
- `days` (default: 30)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalConversations": 156,
    "totalMessages": 2340,
    "avgResponseTimeMs": 1150,
    "satisfactionScore": 4.2
  },
  "days": 30
}
```

**GET /api/agent-interaction/search**

Search messages.

**Query Parameters:**
- `q` (required) - Search query
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "results": [...],
  "count": 12,
  "query": "PR strategy"
}
```

**GET /api/agent-interaction/turns/:conversationId**

Get conversation turns.

**Query Parameters:**
- `limit` (default: 10)

**GET /api/agent-interaction/health**

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T10:00:00Z",
  "database": "connected",
  "tables": {
    "conversations": "exists",
    "messages": "exists",
    "turns": "exists"
  },
  "service": "agent-messenger"
}
```

## Integration Guide

### Prerequisites

1. **Sprint 43 (Agent Context)** - Required for context enhancement
2. **Sprint 44 (Agent Personality)** - Required for persona generation
3. **OpenAI API Key** - For GPT-4 response generation
4. **PostgreSQL Database** - For data storage

### Setup Steps

#### 1. Install Dependencies

```bash
cd apps/api
npm install
```

#### 2. Run Database Migration

```bash
# Connect to PostgreSQL
psql -U postgres -d pravado

# Run migration
\i src/database/migrations/20251105_create_agent_interactions.sql
```

#### 3. Configure Environment Variables

```bash
# .env
OPENAI_API_KEY=your-api-key
DATABASE_URL=postgresql://user:pass@localhost:5432/pravado
```

#### 4. Import and Register Routes

```typescript
// apps/api/src/index.ts
import agentInteractionRoutes from './routes/agent-interaction';

app.use('/api/agent-interaction', agentInteractionRoutes);
```

#### 5. Verify Installation

```bash
node verify-sprint45-phase4.1.js
```

Expected output: `✓ All checks passed! (115/115)`

### Usage Examples

#### Example 1: Start Conversation and Send Message

```typescript
// 1. Start conversation
const { conversation } = await fetch('/api/agent-interaction/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    agentId: 'agent-456',
    organizationId: 'org-789',
    title: 'PR Strategy Discussion',
    initialMessage: 'Hi, I need help with my PR campaign'
  })
}).then(r => r.json());

// 2. Send follow-up message
const { result } = await fetch('/api/agent-interaction/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: conversation.id,
    text: 'What are the best practices for tech PR?',
    options: {
      mirrorTone: true,
      includeContext: true
    }
  })
}).then(r => r.json());

console.log(result.message.text); // Agent's response
console.log(result.appliedPersonality); // Personality details
console.log(result.stats); // Processing stats
```

#### Example 2: Personality Mirroring

```typescript
// Analyze user tone and mirror it
const { appliedToneStyle } = await fetch('/api/agent-interaction/mirror', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-456',
    userId: 'user-123',
    conversationId: 'conv-789',
    recentTurns: 3
  })
}).then(r => r.json());

console.log(`Base tone: ${appliedToneStyle.baseTone}`);
console.log(`User tone: ${appliedToneStyle.mirroredTone}`);
console.log(`Applied tone: ${appliedToneStyle.appliedTone}`);
console.log(`Confidence: ${appliedToneStyle.mirroringConfidence}`);
```

#### Example 3: Get Conversation History

```typescript
const { messages } = await fetch(
  '/api/agent-interaction/history/conv-789?limit=50&includeMetadata=true'
).then(r => r.json());

messages.forEach(msg => {
  console.log(`[${msg.senderType}] ${msg.text}`);
  console.log(`  Tone: ${msg.metadata?.tone}`);
  console.log(`  Sentiment: ${msg.metadata?.sentiment}`);
});
```

#### Example 4: Search Messages

```typescript
const { results } = await fetch(
  '/api/agent-interaction/search?q=PR+strategy&limit=20'
).then(r => r.json());

results.forEach(msg => {
  console.log(`${msg.text} (${msg.conversation_title})`);
});
```

## Development Notes

### Personality Mirroring Algorithm

The tone detection uses keyword-based heuristics:

```typescript
const toneIndicators = {
  formal: ['please', 'thank you', 'appreciate', 'kindly'],
  casual: ['hey', 'yeah', 'cool', 'awesome', 'thanks'],
  witty: ['haha', 'lol', 'clever', 'funny'],
  assertive: ['need', 'must', 'require', 'immediately'],
  friendly: ['hi', 'hello', 'great', 'wonderful'],
  professional: ['regarding', 'concerning', 'request', 'information'],
  empathetic: ['understand', 'feel', 'appreciate', 'care'],
  direct: ['want', 'need', 'tell me', 'show me'],
  diplomatic: ['perhaps', 'might', 'could', 'possibly']
};
```

**Production Enhancement:**
- Replace with NLP/sentiment analysis (e.g., BERT, GPT-4 function calling)
- Add user feedback loop for tone accuracy
- Track tone evolution over conversation lifecycle

### Context Building

Context is built from multiple sources:

1. **Agent Memory** - Previous learnings from this agent
2. **Agent Settings** - Configuration and preferences
3. **Recent Playbooks** - Relevant playbook runs
4. **Conversation History** - Last 10 messages

**Token Budget Management:**
- Total prompt tokens capped at 4000 by default
- Context limited to top 5 memory snippets
- History limited to last 10 messages
- System prompt ~500 tokens
- Leaves ~2500 tokens for user input + response

### Memory Updates

Memory is extracted from turns using simple heuristics:

**Topics:**
- Common PR keywords (e.g., "press release", "media", "campaign")
- Capitalized phrases (potential proper nouns)

**Entities:**
- Capitalized words (names, companies, publications)
- Common entity patterns (dates, locations)

**Production Enhancement:**
- Use NER (Named Entity Recognition) models
- Implement topic modeling (LDA, BERTopic)
- Add entity disambiguation and linking

### Performance Considerations

**Database Indexes:**
- Full-text search on messages: ~10ms for most queries
- JSONB metadata indexes: ~5ms for filtered queries
- Foreign key indexes: Ensure < 1ms joins

**Caching Strategy:**
- Agent personas: Cache for 1 hour (invalidate on personality updates)
- Recent conversations: Cache for 5 minutes
- Conversation history: No caching (real-time critical)

**OpenAI Rate Limits:**
- GPT-4: 10,000 RPM (requests per minute)
- Implement exponential backoff on 429 errors
- Queue messages during high load

### Security Considerations

**Row-Level Security (RLS):**
- All queries filtered by organization_id
- Prevents cross-tenant data leaks
- Set `app.current_organization_id` before queries

**Input Validation:**
- Sanitize all user input before storage
- Validate message length (max 10,000 chars)
- Rate limit per user (max 60 messages/minute)

**API Authentication:**
- All endpoints require valid session token
- Extract user_id and organization_id from session
- Implement role-based access control (RBAC)

## Testing

### Unit Tests

```bash
npm test -- agentMessenger.test.ts
```

**Test Coverage:**
- sendMessageToAgent: Message storage, response generation, turn creation
- mirrorPersonalityTraits: Tone detection, blending logic
- updateAgentMemoryFromTurn: Topic/entity extraction, memory storage
- startConversation: Conversation creation, initial message handling

### Integration Tests

```bash
npm test -- agent-interaction.routes.test.ts
```

**Test Coverage:**
- POST /send: Full flow with mocked OpenAI
- GET /history: Pagination, metadata inclusion
- POST /mirror: Personality detection accuracy
- Analytics endpoints: Correct aggregations

### Verification Script

```bash
node verify-sprint45-phase4.1.js
```

Runs 115 checks across:
- Type definitions (20 checks)
- Database migration (52 checks)
- Service implementation (28 checks)
- API routes (20 checks)

## Deployment

### Database Migration

```bash
# Production deployment
psql $DATABASE_URL -f src/database/migrations/20251105_create_agent_interactions.sql
```

### Scheduled Jobs

Set up cron job to archive inactive conversations:

```bash
# Run daily at 2 AM
0 2 * * * psql $DATABASE_URL -c "SELECT archive_inactive_conversations();"
```

### Monitoring

**Key Metrics:**
- Message processing time: Target < 2s (p95)
- OpenAI API errors: Target < 1%
- Database query time: Target < 100ms (p95)
- Conversation completion rate: Target > 80%

**Alerts:**
- OpenAI API rate limits exceeded
- Database connection pool exhausted
- Message processing time > 5s
- Error rate > 5%

## Future Enhancements

### Phase 4.2: Real-time WebSocket Support
- WebSocket server for live messaging
- Typing indicators
- Read receipts
- Online/offline status

### Phase 4.3: Advanced Personality Mirroring
- ML-based tone detection
- User feedback integration
- Personality evolution over time
- A/B testing different mirroring strategies

### Phase 4.4: Multi-modal Messages
- Image message support
- File attachments
- Voice messages (transcribed)
- Rich media (links, embeds)

### Phase 4.5: Conversation Intelligence
- Intent classification
- Sentiment tracking over time
- Topic clustering
- Conversation quality scoring

## Support

For issues or questions:
- Check verification script: `node verify-sprint45-phase4.1.js`
- Review logs: `tail -f logs/agent-messenger.log`
- Database health: `GET /api/agent-interaction/health`

## References

- Sprint 43: Agent Context Enhancement
- Sprint 44: Agent Personality System
- OpenAI API Documentation: https://platform.openai.com/docs
- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
