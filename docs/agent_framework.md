# Pravado Agent Framework

This document explains the internal orchestration system for Pravado's autonomous and copilot agents. It is powered by a queue-first architecture and governed by a modular agent execution runtime.

---

## Agent Philosophy

Agents are autonomous services that complete modular tasks:
- **Strategy planning**: Create comprehensive marketing and PR strategies
- **Content drafting**: Generate blog posts, press releases, social content
- **Outreach generation**: Compose personalized PR emails to media contacts
- **SEO optimization**: Optimize content for search engines
- **Keyword research**: Identify content opportunities and keyword gaps
- **Competitor analysis**: Analyze competitive landscape

Each agent:
- Receives inputs in a normalized `AgentContext` structure
- Uses LLM (OpenAI/Anthropic) + custom logic for decision-making
- Logs each action with metadata to `agent_logs` table
- Can trigger other agents recursively for complex workflows
- Reports results via standardized `AgentOutput` format

---

## Agent Lifecycle

### 1. Task Creation
- User initiates action in dashboard (e.g., "Generate blog post")
- API creates `agent_task` record in Supabase with status `QUEUED`
- Task is enqueued to Redis/Upstash queue with priority level

### 2. Task Processing
- Background worker polls Redis queue
- Worker retrieves task and builds `AgentContext` from database
- Agent status updated to `RUNNING` with `started_at` timestamp

### 3. AI Execution
- Agent makes LLM calls with appropriate prompts and constraints
- Multiple iterations possible for refinement
- Progress logged to `agent_logs` for observability

### 4. Output Generation
- Agent produces `AgentOutput` with:
  - `result`: The generated content or analysis
  - `confidence`: AI confidence score (0-1)
  - `tokensUsed`: LLM token consumption
  - `metadata`: Reasoning, alternatives, next steps, warnings

### 5. Task Completion
- Output stored in `agent_task.output` field
- Status updated to `COMPLETED` or `FAILED`
- `completed_at` timestamp recorded
- User notified via real-time subscription

### 6. Error Handling
- Failed tasks capture error details in `agent_task.error`
- Retryable errors trigger automatic retry with exponential backoff
- Non-retryable errors escalate to user for manual intervention

---

## Agent Types

### CONTENT_GENERATOR
**Purpose**: Automated creation of various content types

**Capabilities**:
- Blog posts and articles
- Press releases
- Social media posts (LinkedIn, Twitter, etc.)
- Email newsletters
- Landing page copy
- Video scripts

**Input Context**:
- Content type and channel
- Target audience
- Tone and style guide
- Brand voice parameters
- Keywords to include

**Output**:
- Generated content
- Word count and reading time
- SEO metadata suggestions
- Alternative versions

---

### SEO_OPTIMIZER
**Purpose**: Optimize content for search engines

**Capabilities**:
- Meta title and description generation
- Keyword density analysis
- Heading structure optimization
- Internal linking suggestions
- Readability improvements
- Schema markup recommendations

**Input Context**:
- Content to optimize
- Focus keyword
- Target search intent
- Competitor analysis

**Output**:
- Optimized meta tags
- Content structure suggestions
- SEO score (0-100)
- Improvement recommendations

---

### OUTREACH_COMPOSER
**Purpose**: Generate personalized PR outreach emails

**Capabilities**:
- Personalized pitch emails
- Follow-up sequences
- Media alert compositions
- Story angle suggestions

**Input Context**:
- Media contact profile
- Story/campaign details
- Previous interactions
- Contact's beat and interests

**Output**:
- Personalized email draft
- Subject line variations
- Optimal send time
- Follow-up schedule

---

### KEYWORD_RESEARCHER
**Purpose**: Identify SEO opportunities and keyword gaps

**Capabilities**:
- Keyword opportunity discovery
- Search volume analysis
- Competitor keyword analysis
- Content gap identification
- Keyword clustering

**Input Context**:
- Industry/niche
- Current content portfolio
- Competitor URLs
- Target audience

**Output**:
- Prioritized keyword list
- Keyword clusters
- Content opportunities
- Difficulty and volume metrics

---

### STRATEGY_PLANNER
**Purpose**: Develop comprehensive marketing and PR strategies

**Capabilities**:
- Campaign strategy development
- Content calendar creation
- Channel recommendations
- Budget allocation suggestions
- Success metrics definition

**Input Context**:
- Business goals
- Target audience
- Available resources
- Timeline and budget

**Output**:
- Strategy document
- Tactical roadmap
- KPIs and metrics
- Resource requirements

---

### COMPETITOR_ANALYZER
**Purpose**: Analyze competitive landscape

**Capabilities**:
- Competitor content analysis
- PR strategy comparison
- SEO gap analysis
- Social media presence review
- Market positioning insights

**Input Context**:
- Competitor list
- Analysis dimensions
- Industry benchmarks

**Output**:
- Competitive analysis report
- Opportunities and threats
- Recommended counter-strategies
- Performance benchmarks

---

## Shared Types & Interfaces

All agent types are defined in `packages/shared-types/src/agent.ts`:

### AgentTask
```typescript
{
  id: string;
  type: AgentType;
  status: AgentTaskStatus;
  priority: AgentPriority;
  context: AgentContext;
  output: AgentOutput | null;
  error: AgentError | null;
  // ... timestamps and metadata
}
```

### AgentContext
```typescript
{
  campaignId?: string;
  contentId?: string;
  instructions: string;
  parameters: Record<string, unknown>;
  constraints: AgentConstraints;
}
```

### AgentOutput
```typescript
{
  result: unknown;
  confidence: number;
  tokensUsed: number;
  model: string;
  metadata: AgentOutputMetadata;
}
```

### AgentError
```typescript
{
  code: string;
  message: string;
  details: Record<string, unknown>;
  retryable: boolean;
  retryCount: number;
}
```

---

## Queue Architecture

### BullMQ + Redis Integration

**Queue Name**: `agent-tasks`

**Priority Levels**:
- **URGENT** (priority 1): Time-sensitive tasks
- **HIGH** (priority 2): Important but not urgent
- **NORMAL** (priority 3): Standard tasks
- **LOW** (priority 4): Background processing

**Concurrency**: Configurable via `AGENT_WORKER_CONCURRENCY` env var (default: 5)

**Retry Strategy**:
- Max attempts: 3
- Backoff: Exponential with 2s base delay
- Retry only if `error.retryable === true`

---

## Integration Points

### Triggering Agents

**From Dashboard**:
```typescript
// User clicks "Generate Content" button
await fetch('/api/v1/agents/tasks', {
  method: 'POST',
  body: JSON.stringify({
    type: 'CONTENT_GENERATOR',
    priority: 'HIGH',
    context: {
      instructions: 'Write a blog post about...',
      parameters: { ... },
      constraints: { ... }
    }
  })
});
```

**From API**:
```typescript
import { agentService } from './services/agent.service';

const task = await agentService.createTask({
  type: AgentType.SEO_OPTIMIZER,
  priority: 'NORMAL',
  context: { /* ... */ },
  userId: req.user.sub,
  organizationId: req.user.organizationId
});
```

---

## Monitoring & Observability

### Agent Logs
All agent actions are logged to `agent_logs` table:
- Level: DEBUG, INFO, WARN, ERROR
- Message: Human-readable action description
- Data: Structured metadata
- Timestamp: Precise execution time

### Metrics to Track
- Task completion time (P50, P95, P99)
- Success vs failure rate by agent type
- LLM token consumption
- Queue depth and wait time
- Retry frequency

---

## Best Practices

### 1. Context Design
- Provide clear, specific instructions
- Include all necessary parameters upfront
- Set appropriate constraints (token limits, tone, etc.)

### 2. Error Handling
- Always set `retryable` flag correctly
- Include actionable error messages
- Log sufficient context for debugging

### 3. Output Quality
- Include confidence scores
- Provide alternative options when applicable
- Suggest next steps for user
- Warn about potential issues

### 4. Performance
- Use appropriate LLM models (GPT-4 for complex, GPT-3.5 for simple)
- Implement caching for repeated queries
- Set reasonable token limits
- Monitor execution time

---

## Future Enhancements

- **Multi-agent orchestration**: Agents collaborating on complex tasks
- **Human-in-the-loop**: Approval checkpoints for critical operations
- **Learning from feedback**: Agents improving based on user edits
- **Real-time streaming**: Progressive output as agent works
- **Custom agent plugins**: User-defined agent behaviors
