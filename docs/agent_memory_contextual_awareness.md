# Agent Memory & Contextual Awareness Enhancements

**Sprint 43 - Phase 3.5.3**

## Overview

The Agent Memory & Contextual Awareness Enhancements system equips AI agents with deeper contextual understanding by aggregating memory, preferences, historical interactions, and temporal awareness. This enables more personalized, informed, and contextually appropriate responses.

### Key Capabilities

1. **Enhanced Context Building** - Aggregate data from multiple sources (memory, playbooks, collaborations, preferences)
2. **GPT-4 Memory Summarization** - Condense memory into searchable summaries with topics, entities, and trends
3. **Context Injection** - Replace template placeholders with enriched context data

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Task Execution                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AgentContextEnhancer Service                    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  buildEnhancedContext()                             │    │
│  │  - Fetch memory snippets (vector similarity)        │    │
│  │  - Fetch recent playbooks                           │    │
│  │  - Fetch past collaborations                        │    │
│  │  - Build temporal context                           │    │
│  │  - Extract key entities & trending topics           │    │
│  │  - Cache results (5 min TTL)                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  summarizeAgentMemory()                             │    │
│  │  - Check for existing summary                       │    │
│  │  - Fetch memory entries (time-windowed)            │    │
│  │  - Use GPT-4 to generate summary                    │    │
│  │  - Extract topics, entities, trends                 │    │
│  │  - Store in agent_memory_summaries                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  injectContextIntoPrompt()                          │    │
│  │  - Replace {{memory}} placeholders                  │    │
│  │  - Replace {{entities}} placeholders                │    │
│  │  - Replace {{topics}} placeholders                  │    │
│  │  - Estimate token usage                             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Sources                               │
│                                                              │
│  - agent_memory (vector embeddings)                          │
│  - agent_playbook_logs                                       │
│  - agent_collaboration_logs                                  │
│  - user_profiles (preferences)                               │
│  - agent_settings                                            │
│  - agent_memory_summaries (GPT-4 generated)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Methods

### 1. buildEnhancedContext()

Build enriched context by aggregating data from multiple sources.

#### Purpose

Provide agents with comprehensive contextual information including:
- Relevant memory snippets (vector similarity search)
- Recent playbook executions
- Past collaborations and escalations
- User preferences and agent settings
- Temporal context (time of day, day of week)
- Key entities and trending topics

#### Method Signature

```typescript
async buildEnhancedContext(
  agentId: string,
  taskContext: {
    prompt: string;
    userId?: string;
    organizationId?: string;
    metadata?: Record<string, any>;
  },
  options?: {
    includeMemory?: boolean;        // Default: true
    includePlaybooks?: boolean;     // Default: true
    includeCollaborations?: boolean; // Default: true
    includePreferences?: boolean;   // Default: true
    maxMemorySnippets?: number;     // Default: 10
    maxRecentPlaybooks?: number;    // Default: 5
    timeWindowDays?: number;        // Default: 30
  }
): Promise<EnhancedAgentContext>
```

#### Return Type

```typescript
interface EnhancedAgentContext {
  agentId: string;
  organizationId: string;
  prompt: string;
  userId?: string;
  preferences?: UserPreferences;
  agentSettings?: AgentSettings;
  memorySnippets: MemorySnippet[];
  recentPlaybooks: PlaybookExecution[];
  pastCollaborations: CollaborationSummary[];
  temporalContext?: TemporalContext;
  keyEntities?: KeyEntity[];
  trendingTopics?: string[];
  metadata?: Record<string, any>;
}
```

#### Example Usage

```typescript
import { agentContextEnhancer } from '../services/agentContextEnhancer';

// Build enhanced context for a task
const context = await agentContextEnhancer.buildEnhancedContext(
  'agent-123',
  {
    prompt: 'Create a press release for our new product launch',
    userId: 'user-456',
    organizationId: 'org-789',
    metadata: { campaign: 'Q1-2024' }
  },
  {
    maxMemorySnippets: 15,
    timeWindowDays: 60
  }
);

console.log(`Context built with ${context.memorySnippets.length} memory snippets`);
console.log(`Key entities: ${context.keyEntities?.map(e => e.name).join(', ')}`);
console.log(`Trending topics: ${context.trendingTopics?.join(', ')}`);
```

#### Performance Optimization

- **Caching**: Context is cached for 5 minutes using a key combining agentId and prompt
- **Parallel Fetching**: All data sources are queried in parallel using `Promise.all`
- **Time Windows**: Queries are limited to recent data (default 30 days)
- **Result Limits**: Maximum 10 memory snippets, 5 playbooks by default

---

### 2. summarizeAgentMemory()

Use GPT-4 to generate condensed summaries of agent memory.

#### Purpose

Create searchable, concise summaries of agent memory that:
- Reduce context window usage
- Enable semantic search across agent history
- Extract key topics, entities, and trends
- Provide temporal awareness of memory evolution

#### Method Signature

```typescript
async summarizeAgentMemory(
  agentId: string,
  scope: 'short_term' | 'long_term' | 'session' | 'historical',
  organizationId: string,
  options?: {
    summaryType?: 'short_term' | 'long_term' | 'topical' | 'entity_based';
    timeWindowDays?: number;    // Default: 7 for short_term, 30 for long_term
    maxEntries?: number;        // Default: 100
    forceRegenerate?: boolean;  // Default: false
  }
): Promise<MemorySummary>
```

#### Return Type

```typescript
interface MemorySummary {
  id: string;
  agentId: string;
  organizationId: string;
  summaryType: 'short_term' | 'long_term' | 'topical' | 'entity_based';
  scope: 'short_term' | 'long_term' | 'session' | 'historical';
  summaryText: string;
  topics: string[];
  entities: KeyEntity[];
  trends?: string[];
  timePeriod: {
    start: Date;
    end: Date;
  };
  entryCount: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}
```

#### Example Usage

```typescript
// Generate short-term memory summary (last 7 days)
const shortTermSummary = await agentContextEnhancer.summarizeAgentMemory(
  'agent-123',
  'short_term',
  'org-789',
  {
    summaryType: 'short_term',
    timeWindowDays: 7
  }
);

console.log('Summary:', shortTermSummary.summaryText);
console.log('Topics:', shortTermSummary.topics);
console.log('Entities:', shortTermSummary.entities.map(e => e.name));
console.log('Trends:', shortTermSummary.trends);

// Generate long-term topical summary (last 30 days)
const topicalSummary = await agentContextEnhancer.summarizeAgentMemory(
  'agent-123',
  'long_term',
  'org-789',
  {
    summaryType: 'topical',
    timeWindowDays: 30,
    maxEntries: 200
  }
);
```

#### GPT-4 Summarization Prompt

The system uses GPT-4 with a structured prompt:

```
You are summarizing an AI agent's memory to create a concise context summary.

Analyze the provided memory entries and generate:
1. A concise summary (2-3 paragraphs)
2. Key topics (5-10 topics)
3. Key entities (people, organizations, products, concepts)
4. Trends (patterns or recurring themes)

Response format (JSON):
{
  "summary": "concise summary text",
  "topics": ["topic1", "topic2", ...],
  "entities": [
    {"name": "entity name", "type": "person|organization|product|concept", "mentions": count}
  ],
  "trends": ["trend1", "trend2", ...]
}
```

#### Smart Caching

- Checks for existing recent summaries before generating
- Reuses summaries created within the last hour (configurable)
- Use `forceRegenerate: true` to bypass cache

---

### 3. injectContextIntoPrompt()

Replace template placeholders with enriched context data.

#### Purpose

Transform prompt templates with placeholders into fully contextualized prompts:
- Replace `{{memory}}` with relevant memory snippets
- Replace `{{entities}}` with key entities
- Replace `{{topics}}` with trending topics
- Replace `{{preferences}}` with user preferences
- Estimate token usage for context window management

#### Method Signature

```typescript
injectContextIntoPrompt(
  template: string,
  context: EnhancedAgentContext
): ContextInjectionResult
```

#### Return Type

```typescript
interface ContextInjectionResult {
  prompt: string;
  tokensUsed: number;
  placeholdersReplaced: string[];
  contextSummary: {
    memorySnippets: number;
    recentPlaybooks: number;
    collaborations: number;
    entities: number;
  };
}
```

#### Supported Placeholders

| Placeholder | Description | Example Output |
|------------|-------------|----------------|
| `{{memory}}` / `{{recentMemory}}` | Recent memory snippets | "User prefers casual tone. Previous campaign: Q4-2023 product launch" |
| `{{playbooks}}` / `{{recentPlaybooks}}` | Recent playbook executions | "Recently executed: Press Release Writer (success), Media Pitch Generator (success)" |
| `{{collaborations}}` | Past escalations/delegations | "Escalated to Strategist Agent on 2024-01-15 for strategic planning" |
| `{{entities}}` / `{{keyEntities}}` | Key entities from memory | "TechCorp (organization), John Smith (person), Product X (product)" |
| `{{topics}}` / `{{trendingTopics}}` | Trending topics | "product launches, media relations, content marketing" |
| `{{preferences}}` | User preferences | "Tone: professional, Language: en, Timezone: America/New_York" |
| `{{timeOfDay}}` | Current time of day | "morning" / "afternoon" / "evening" / "night" |
| `{{dayOfWeek}}` | Current day of week | "Monday" |
| `{{prompt}}` | Original task prompt | The user's original request |

#### Example Usage

```typescript
// Define a prompt template
const template = `
You are a PR agent with the following context:

## Recent Memory
{{memory}}

## Key Topics
{{topics}}

## User Preferences
{{preferences}}

## Current Context
Time: {{timeOfDay}}, {{dayOfWeek}}

## Task
{{prompt}}
`;

// Build context
const context = await agentContextEnhancer.buildEnhancedContext(
  'agent-123',
  {
    prompt: 'Write a press release for our product',
    userId: 'user-456',
    organizationId: 'org-789'
  }
);

// Inject context into template
const result = agentContextEnhancer.injectContextIntoPrompt(template, context);

console.log('Final prompt:', result.prompt);
console.log('Estimated tokens:', result.tokensUsed);
console.log('Placeholders replaced:', result.placeholdersReplaced);
console.log('Context summary:', result.contextSummary);
```

#### Example Output

```typescript
{
  prompt: `
You are a PR agent with the following context:

## Recent Memory
- User prefers professional tone
- Previous successful campaign: Q4-2023 Product Launch
- Focus on tech media outlets

## Key Topics
product launches, media relations, tech industry, content marketing

## User Preferences
Tone: professional
Language: en
Timezone: America/New_York

## Current Context
Time: morning, Monday

## Task
Write a press release for our product
`,
  tokensUsed: 387,
  placeholdersReplaced: ['memory', 'topics', 'preferences', 'timeOfDay', 'dayOfWeek', 'prompt'],
  contextSummary: {
    memorySnippets: 8,
    recentPlaybooks: 3,
    collaborations: 1,
    entities: 5
  }
}
```

---

## API Reference

All endpoints are available under `/api/agent-context/`

### Context Building

#### POST /api/agent-context/build

Build enhanced context for agent task execution.

**Request Body:**
```json
{
  "agentId": "agent-123",
  "organizationId": "org-789",
  "taskContext": {
    "prompt": "Create a press release",
    "userId": "user-456",
    "metadata": {}
  },
  "options": {
    "includeMemory": true,
    "includePlaybooks": true,
    "maxMemorySnippets": 15,
    "timeWindowDays": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "context": {
    "agentId": "agent-123",
    "organizationId": "org-789",
    "prompt": "Create a press release",
    "memorySnippets": [...],
    "recentPlaybooks": [...],
    "pastCollaborations": [...],
    "keyEntities": [...],
    "trendingTopics": [...]
  },
  "metadata": {
    "memorySnippetsCount": 10,
    "recentPlaybooksCount": 5,
    "collaborationsCount": 2,
    "entitiesCount": 8,
    "topicsCount": 6
  }
}
```

#### POST /api/agent-context/inject

Inject context into prompt template.

**Request Body:**
```json
{
  "template": "You are a PR agent. Recent memory: {{memory}}. Task: {{prompt}}",
  "context": {
    "agentId": "agent-123",
    "prompt": "Write a press release",
    "memorySnippets": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "prompt": "You are a PR agent. Recent memory: User prefers professional tone...",
    "tokensUsed": 245,
    "placeholdersReplaced": ["memory", "prompt"],
    "contextSummary": {
      "memorySnippets": 8,
      "recentPlaybooks": 3,
      "collaborations": 1,
      "entities": 5
    }
  }
}
```

### Memory Summarization

#### POST /api/agent-context/summarize

Generate GPT-4 powered memory summary.

**Request Body:**
```json
{
  "agentId": "agent-123",
  "organizationId": "org-789",
  "scope": "short_term",
  "summaryType": "short_term",
  "timeWindowDays": 7,
  "forceRegenerate": false
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": "summary-abc",
    "agentId": "agent-123",
    "summaryType": "short_term",
    "scope": "short_term",
    "summaryText": "Over the past week, the agent focused on...",
    "topics": ["product launches", "media relations", "content creation"],
    "entities": [
      {"name": "TechCorp", "type": "organization", "mentions": 12},
      {"name": "John Smith", "type": "person", "mentions": 5}
    ],
    "trends": ["increased focus on AI coverage", "shift to video content"],
    "timePeriod": {
      "start": "2024-01-15T00:00:00Z",
      "end": "2024-01-22T00:00:00Z"
    },
    "entryCount": 45,
    "createdAt": "2024-01-22T10:30:00Z"
  },
  "metadata": {
    "entryCount": 45,
    "topicsCount": 3,
    "entitiesCount": 2,
    "trendsCount": 2
  }
}
```

### Analytics Endpoints

#### GET /api/agent-context/summaries/:agentId

Get memory summaries for an agent.

**Query Parameters:**
- `scope` (optional): Filter by scope (short_term, long_term, session, historical)
- `summaryType` (optional): Filter by type
- `limit` (optional): Max results (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "summaries": [...],
  "count": 10,
  "limit": 10,
  "offset": 0
}
```

#### GET /api/agent-context/summaries/:agentId/recent

Get most recent summary for an agent.

**Query Parameters:**
- `scope` (optional): Default "short_term"
- `summaryType` (optional): Default "short_term"

**Response:**
```json
{
  "success": true,
  "summary": {...}
}
```

#### GET /api/agent-context/topics/:agentId

Get top topics for an agent.

**Query Parameters:**
- `days` (optional): Time window in days (default: 30)
- `limit` (optional): Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "topics": [
    {"topic": "product launches", "occurrence_count": 15},
    {"topic": "media relations", "occurrence_count": 12}
  ],
  "count": 2,
  "days": 30
}
```

#### GET /api/agent-context/entities/:agentId

Get top entities for an agent.

**Query Parameters:**
- `days` (optional): Time window in days (default: 30)
- `limit` (optional): Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "entities": [
    {"entity_name": "TechCorp", "entity_type": "organization", "mention_count": 25},
    {"entity_name": "John Smith", "entity_type": "person", "mention_count": 18}
  ],
  "count": 2,
  "days": 30
}
```

#### GET /api/agent-context/trending/:agentId

Get trending topics for an agent (recency-weighted).

**Query Parameters:**
- `days` (optional): Time window in days (default: 7)

**Response:**
```json
{
  "success": true,
  "trendingTopics": [
    {"topic": "AI coverage", "trend_score": 8.5},
    {"topic": "video content", "trend_score": 7.2}
  ],
  "count": 2,
  "days": 7
}
```

#### GET /api/agent-context/search/:agentId

Full-text search across agent summaries.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "summary-123",
      "summary_text": "...",
      "topics": [...],
      "relevance": 0.89,
      "created_at": "2024-01-22T10:30:00Z"
    }
  ],
  "count": 1,
  "query": "product launch"
}
```

#### GET /api/agent-context/summaries/:agentId/time-range

Get summaries for a specific time range.

**Query Parameters:**
- `start` (required): Start date (ISO 8601)
- `end` (required): End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "summaries": [...],
  "count": 5,
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

---

## Database Schema

### agent_memory_summaries Table

```sql
CREATE TABLE agent_memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent and organization
  agent_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Summary classification
  summary_type summary_type NOT NULL,  -- 'short_term', 'long_term', 'topical', 'entity_based'
  scope memory_scope NOT NULL,         -- 'short_term', 'long_term', 'session', 'historical'

  -- Summary content
  summary_text TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  entities JSONB NOT NULL DEFAULT '[]',
  trends TEXT[] NOT NULL DEFAULT '{}',

  -- Time period covered
  time_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Summary metadata
  entry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Indexes

```sql
-- Basic indexes
CREATE INDEX idx_agent_memory_summaries_agent_id ON agent_memory_summaries(agent_id);
CREATE INDEX idx_agent_memory_summaries_organization_id ON agent_memory_summaries(organization_id);
CREATE INDEX idx_agent_memory_summaries_created_at ON agent_memory_summaries(created_at DESC);

-- Composite indexes
CREATE INDEX idx_agent_memory_summaries_agent_scope_type
  ON agent_memory_summaries(agent_id, scope, summary_type, created_at DESC);

-- GIN indexes for arrays and JSONB
CREATE INDEX idx_agent_memory_summaries_topics USING GIN (topics);
CREATE INDEX idx_agent_memory_summaries_entities USING GIN (entities);
CREATE INDEX idx_agent_memory_summaries_metadata USING GIN (metadata);

-- Full-text search index
CREATE INDEX idx_agent_memory_summaries_summary_text_fts
  ON agent_memory_summaries USING GIN (to_tsvector('english', summary_text));
```

### Helper Functions

The migration includes several PostgreSQL helper functions:

- `get_recent_agent_summary()` - Get most recent summary by scope and type
- `get_summaries_for_time_range()` - Get summaries within date range
- `get_agent_top_topics()` - Get most frequent topics
- `get_agent_top_entities()` - Get most mentioned entities
- `get_trending_topics()` - Get trending topics (recency-weighted)
- `search_agent_summaries()` - Full-text search across summaries

---

## Best Practices

### 1. Context Building

**Do:**
- ✅ Use caching by reusing agents and prompts when possible
- ✅ Limit time windows to relevant periods (7-30 days for most use cases)
- ✅ Specify `maxMemorySnippets` based on your context window
- ✅ Include only necessary data sources (set includeMemory, includePlaybooks flags)

**Don't:**
- ❌ Request unlimited memory snippets (risks context overflow)
- ❌ Use excessively long time windows (degrades performance)
- ❌ Build context on every request without caching

### 2. Memory Summarization

**Do:**
- ✅ Generate summaries periodically (e.g., daily for short-term, weekly for long-term)
- ✅ Use appropriate `summaryType` for your use case (topical, entity_based)
- ✅ Allow summaries to be reused (don't use `forceRegenerate` unnecessarily)
- ✅ Monitor GPT-4 costs and usage

**Don't:**
- ❌ Generate summaries on every request (expensive and slow)
- ❌ Summarize empty or minimal memory (wait for sufficient data)
- ❌ Use very large `maxEntries` values (impacts GPT-4 context window)

### 3. Prompt Injection

**Do:**
- ✅ Design templates with clear placeholder conventions
- ✅ Monitor token usage to stay within context limits
- ✅ Test templates with real context data
- ✅ Provide fallback text for missing context

**Don't:**
- ❌ Inject excessively large context (causes token overflow)
- ❌ Use unclear placeholder names
- ❌ Inject sensitive data without filtering

---

## Performance Considerations

### Caching Strategy

**Context Caching:**
- TTL: 5 minutes
- Key: `${agentId}:${prompt.slice(0, 50)}`
- Storage: In-memory Map (consider Redis for production)

**Summary Caching:**
- Checks for summaries created within last hour
- Use `forceRegenerate: true` to bypass

### Query Optimization

**Parallel Fetching:**
```typescript
const [memorySnippets, recentPlaybooks, collaborations, preferences] = await Promise.all([
  fetchMemory(),
  fetchPlaybooks(),
  fetchCollaborations(),
  fetchPreferences()
]);
```

**Limited Windows:**
- Default 30 days for memory queries
- Default 100 entries for summarization
- Indexed queries on `created_at`, `agent_id`

### Database Performance

**Indexes:**
- B-tree indexes on agent_id, created_at for fast lookups
- GIN indexes on JSONB, arrays for entity/topic queries
- Full-text search index on summary_text

**Row Level Security:**
- All queries filtered by organization_id
- Uses PostgreSQL RLS policies

---

## Integration Examples

### Example 1: Personalized Content Generation

```typescript
import { agentContextEnhancer } from '../services/agentContextEnhancer';

async function generatePersonalizedContent(agentId: string, userId: string, prompt: string) {
  // 1. Build enhanced context
  const context = await agentContextEnhancer.buildEnhancedContext(
    agentId,
    {
      prompt,
      userId,
      organizationId: 'org-123'
    },
    {
      maxMemorySnippets: 20,
      timeWindowDays: 60
    }
  );

  // 2. Define template
  const template = `
You are a content writer. Use the following context to personalize your response:

**Previous Interactions:**
{{memory}}

**User Preferences:**
{{preferences}}

**Trending Topics:**
{{topics}}

**Key Entities:**
{{entities}}

**Task:**
{{prompt}}

Write content that aligns with the user's preferences and builds on past interactions.
  `;

  // 3. Inject context
  const { prompt: enrichedPrompt, tokensUsed } = agentContextEnhancer.injectContextIntoPrompt(
    template,
    context
  );

  // 4. Send to LLM
  const response = await callLLM(enrichedPrompt);

  console.log(`Context-enriched prompt used ${tokensUsed} tokens`);
  return response;
}
```

### Example 2: Daily Memory Summarization Job

```typescript
import { agentContextEnhancer } from '../services/agentContextEnhancer';

async function dailySummarizationJob() {
  const agents = await getActiveAgents();

  for (const agent of agents) {
    try {
      // Generate short-term summary (last 7 days)
      const summary = await agentContextEnhancer.summarizeAgentMemory(
        agent.id,
        'short_term',
        agent.organizationId,
        {
          summaryType: 'short_term',
          timeWindowDays: 7,
          maxEntries: 100
        }
      );

      console.log(`Summary created for ${agent.id}:`);
      console.log(`  Topics: ${summary.topics.join(', ')}`);
      console.log(`  Entities: ${summary.entities.length}`);
      console.log(`  Entry count: ${summary.entryCount}`);
    } catch (error) {
      console.error(`Failed to summarize for ${agent.id}:`, error);
    }
  }
}

// Run daily at 2 AM
schedule.scheduleJob('0 2 * * *', dailySummarizationJob);
```

### Example 3: Context-Aware Agent Routing

```typescript
import { agentContextEnhancer } from '../services/agentContextEnhancer';

async function routeToSpecializedAgent(taskPrompt: string, userId: string) {
  // Build context for routing agent
  const context = await agentContextEnhancer.buildEnhancedContext(
    'routing-agent',
    {
      prompt: taskPrompt,
      userId,
      organizationId: 'org-123'
    }
  );

  // Analyze trending topics and recent playbooks to determine best agent
  const { trendingTopics, recentPlaybooks } = context;

  if (trendingTopics?.includes('media relations')) {
    return 'media-relations-agent';
  } else if (trendingTopics?.includes('content creation')) {
    return 'content-writer-agent';
  } else if (recentPlaybooks.some(p => p.playbookName.includes('Strategic'))) {
    return 'strategy-agent';
  }

  return 'general-agent';
}
```

### Example 4: Trend Analysis Dashboard

```typescript
import { pool } from '../database/db';

async function getTrendAnalytics(agentId: string, days: number = 30) {
  // Get top topics
  const topicsResult = await pool.query(
    'SELECT * FROM get_agent_top_topics($1, $2, $3)',
    [agentId, days, 10]
  );

  // Get top entities
  const entitiesResult = await pool.query(
    'SELECT * FROM get_agent_top_entities($1, $2, $3)',
    [agentId, days, 10]
  );

  // Get trending topics (recency-weighted)
  const trendingResult = await pool.query(
    'SELECT * FROM get_trending_topics($1, $2)',
    [agentId, 7]
  );

  return {
    topTopics: topicsResult.rows,
    topEntities: entitiesResult.rows,
    trending: trendingResult.rows
  };
}
```

---

## Verification

Run the verification script to ensure proper implementation:

```bash
cd apps/api
node verify-sprint43-phase3.5.3.js
```

**Expected Output:**
```
✓ All checks passed! Sprint 43 Phase 3.5.3 implementation is complete.
Passed: 90/90 (100%)
```

---

## Files Created

### TypeScript Types
- `packages/shared-types/src/agent-context.ts` - Type definitions for enhanced context

### Database
- `apps/api/src/database/migrations/20251102233024_create_agent_memory_summaries.sql` - Migration for summaries table

### Services
- `apps/api/src/services/agentContextEnhancer.ts` - Core context enhancement service

### API Routes
- `apps/api/src/routes/agent-context.ts` - REST API endpoints

### Verification
- `apps/api/verify-sprint43-phase3.5.3.js` - Implementation verification script

### Documentation
- `docs/agent_memory_contextual_awareness.md` - This document

---

## Next Steps

1. **Deploy Database Migration**
   ```bash
   psql -d pravado -f apps/api/src/database/migrations/20251102233024_create_agent_memory_summaries.sql
   ```

2. **Configure Environment Variables**
   ```bash
   OPENAI_API_KEY=your-key-here
   ```

3. **Register Routes**
   Add to your Express app:
   ```typescript
   import agentContextRoutes from './routes/agent-context';
   app.use('/api/agent-context', agentContextRoutes);
   ```

4. **Schedule Summarization Jobs**
   Set up periodic summarization for active agents

5. **Monitor Performance**
   - Track GPT-4 usage and costs
   - Monitor cache hit rates
   - Analyze query performance

---

## Related Documentation

- [Agent Collaboration & Escalation](./agent_collaboration_escalation.md) - Sprint 43 Phase 3.5.2
- [Agent Framework](./agent_framework.md) - Core agent system
- [Agent Playbooks](./agent_playbooks.md) - Playbook orchestration system

---

**Last Updated:** November 2, 2024
**Sprint:** 43 - Phase 3.5.3
**Status:** ✅ Complete (90/90 verification checks passed)
