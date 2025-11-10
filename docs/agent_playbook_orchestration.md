# Agent Playbook Orchestration

**Sprint 43 Phase 3.5.1**
**Status:** ✅ Complete
**Verification:** 44/44 checks passed (100%)

---

## Overview

The Agent Playbook Orchestration system enables AI agents to autonomously select, launch, and chain playbooks based on user prompts and agent context. This system uses GPT-4 for intelligent playbook selection and provides comprehensive decision logging for transparency and analytics.

### Key Capabilities

1. **Intelligent Playbook Selection** - Uses GPT-4 to analyze agent context and select the most relevant playbook
2. **Playbook Chaining** - Execute multiple playbooks in sequence with automatic input/output mapping
3. **Auto-Trigger** - Combine selection and execution in a single operation
4. **Decision Logging** - Record all reasoning, alternatives, and confidence scores
5. **Analytics** - Track trends, statistics, and agent performance

---

## Architecture

### Component Overview

```
AgentPlaybookOrchestrator
├── selectRelevantPlaybook()    # GPT-4 powered selection
├── chainPlaybookExecutions()   # Sequential execution with I/O mapping
├── triggerPlaybookForAgent()   # Auto-select and trigger
└── logAgentPlaybookDecision()  # Decision logging

Database
├── agent_playbook_logs         # Decision log table
├── get_agent_playbook_stats()  # Statistics function
├── get_recent_agent_decisions() # Recent decisions function
└── get_playbook_selection_trends() # Trends function

API Routes (/api/agent-playbooks)
├── POST /select               # Select playbook for context
├── POST /trigger              # Auto-trigger playbook
├── POST /chain                # Chain multiple playbooks
├── GET /logs/:agentId         # Get decision logs
├── GET /stats/:agentId        # Get agent statistics
└── GET /trends/:orgId         # Get selection trends
```

---

## Core Components

### 1. AgentPlaybookOrchestrator Service

**Location:** `apps/api/src/services/agentPlaybookOrchestrator.ts`

The main orchestration service with four core methods:

#### Method 1: selectRelevantPlaybook()

Selects the most relevant playbook using GPT-4 analysis.

**Signature:**
```typescript
async selectRelevantPlaybook(
  request: PlaybookSelectionRequest
): Promise<PlaybookSelectionResponse>
```

**Request:**
```typescript
interface PlaybookSelectionRequest {
  context: AgentContext;
  availablePlaybooks?: Playbook[];  // Optional, otherwise fetches all
  minConfidence?: number;           // Default: 0.6
  logDecision?: boolean;            // Default: true
}

interface AgentContext {
  agentId: string;
  organizationId: string;
  userPrompt: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  relevantMemories?: Array<{
    content: string;
    relevance: number;
    source: string;
  }>;
  currentGoal?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
interface PlaybookSelectionResponse {
  playbook: Playbook | null;
  reasoning: string;
  confidence: number;
  alternatives: Array<{
    playbookId: string;
    playbookName: string;
    reason: string;
    score: number;
  }>;
  decisionLogId?: string;
}
```

**How It Works:**

1. Fetches available playbooks (or uses provided list)
2. Builds GPT-4 prompt with:
   - User's prompt
   - Agent context (goals, memories, conversation)
   - All available playbooks with descriptions
3. Calls GPT-4 with JSON response format
4. Parses selection with reasoning and confidence
5. Checks confidence threshold
6. Logs decision to database
7. Returns selected playbook

**GPT-4 System Prompt:**
```
You are an AI agent trying to solve a task using available playbooks (workflows).

Your job is to:
1. Analyze the user's prompt and agent context
2. Review all available playbooks
3. Select the SINGLE most relevant playbook that best matches the task
4. Provide your reasoning and confidence score

Rules:
- Only select ONE playbook (the best match)
- If NO playbook is suitable, return null with explanation
- Consider the playbook's name, description, category, and tags
- Use agent memory and context to make informed decisions
- Confidence score should be 0.0 to 1.0
```

**Example:**
```typescript
const response = await agentPlaybookOrchestrator.selectRelevantPlaybook({
  context: {
    agentId: 'agent-123',
    organizationId: 'org-456',
    userPrompt: 'Send a personalized email to our top 10 customers',
    currentGoal: 'Customer retention campaign',
    relevantMemories: [
      { content: 'Customer segmentation complete', relevance: 0.9, source: 'memory-1' }
    ]
  },
  minConfidence: 0.7
});

// Returns:
// {
//   playbook: { id: 'pb-1', name: 'Email Campaign Playbook', ... },
//   reasoning: 'This playbook handles personalized email campaigns with customer segmentation',
//   confidence: 0.85,
//   alternatives: [
//     { playbookId: 'pb-2', playbookName: 'Generic Email', reason: 'Less personalized', score: 0.6 }
//   ],
//   decisionLogId: 'log-789'
// }
```

---

#### Method 2: chainPlaybookExecutions()

Executes multiple playbooks in sequence with automatic input/output mapping.

**Signature:**
```typescript
async chainPlaybookExecutions(
  chainConfig: PlaybookChainConfig
): Promise<ExecutionResult>
```

**Config:**
```typescript
interface PlaybookChainConfig {
  chainId?: string;
  playbooks: Array<{
    playbookId: string;
    inputMapping?: Record<string, string>;  // Map from previous output
    continueOnFailure?: boolean;            // Default: false
    timeoutMs?: number;
  }>;
  initialInput?: Record<string, any>;
  agentContext?: AgentContext;
  logChainSteps?: boolean;
}
```

**Input Mapping Examples:**
```typescript
// Simple field mapping
inputMapping: {
  'userId': '$previous_output.customerId',
  'email': '$previous_output.primaryEmail'
}

// Nested field access
inputMapping: {
  'name': '$previous_output.user.fullName',
  'preferences': '$previous_output.settings.preferences'
}

// Literal values
inputMapping: {
  'status': 'active',
  'source': 'automated'
}
```

**Example:**
```typescript
const result = await agentPlaybookOrchestrator.chainPlaybookExecutions({
  playbooks: [
    {
      playbookId: 'fetch-customers',
      // First playbook uses initialInput
    },
    {
      playbookId: 'segment-customers',
      inputMapping: {
        'customers': '$previous_output.customerList'
      }
    },
    {
      playbookId: 'send-emails',
      inputMapping: {
        'recipients': '$previous_output.topSegment',
        'template': 'premium_offer'
      },
      continueOnFailure: false  // Stop chain if this fails
    }
  ],
  initialInput: {
    limit: 100,
    status: 'active'
  }
});

// Returns:
// {
//   executionId: 'chain-123',
//   selectedPlaybooks: [
//     { playbookId: 'fetch-customers', playbookName: 'Fetch Customers', executionId: 'exec-1' },
//     { playbookId: 'segment-customers', playbookName: 'Segment Customers', executionId: 'exec-2' },
//     { playbookId: 'send-emails', playbookName: 'Send Emails', executionId: 'exec-3' }
//   ],
//   status: 'success',
//   output: { emailsSent: 10, failedEmails: [] },
//   chainOutputs: [
//     { playbookId: 'fetch-customers', output: { customerList: [...] }, status: 'completed' },
//     { playbookId: 'segment-customers', output: { topSegment: [...] }, status: 'completed' },
//     { playbookId: 'send-emails', output: { emailsSent: 10 }, status: 'completed' }
//   ],
//   startedAt: '2025-01-02T10:00:00Z',
//   completedAt: '2025-01-02T10:05:30Z',
//   durationMs: 330000
// }
```

---

#### Method 3: triggerPlaybookForAgent()

Combines selection and execution in one operation.

**Signature:**
```typescript
async triggerPlaybookForAgent(
  request: TriggerPlaybookRequest
): Promise<ExecutionResult>
```

**Request:**
```typescript
interface TriggerPlaybookRequest {
  agentId: string;
  userPrompt: string;
  additionalContext?: Partial<AgentContext>;
  playbookId?: string;              // Skip selection if provided
  input?: Record<string, any>;
  logDecision?: boolean;            // Default: true
}
```

**Example:**
```typescript
// Auto-select and trigger
const result = await agentPlaybookOrchestrator.triggerPlaybookForAgent({
  agentId: 'agent-123',
  userPrompt: 'Analyze our Q4 sales performance',
  additionalContext: {
    organizationId: 'org-456',
    currentGoal: 'Quarterly business review'
  }
});

// Or skip selection and trigger specific playbook
const result = await agentPlaybookOrchestrator.triggerPlaybookForAgent({
  agentId: 'agent-123',
  userPrompt: 'Run sales analysis',
  playbookId: 'sales-analysis-playbook',
  input: {
    quarter: 'Q4',
    year: 2024
  }
});
```

---

#### Method 4: logAgentPlaybookDecision()

Logs playbook selection decisions to the database.

**Signature:**
```typescript
async logAgentPlaybookDecision(
  decision: Omit<AgentPlaybookDecisionLog, 'id' | 'timestamp'>
): Promise<string>
```

**Decision Log:**
```typescript
interface AgentPlaybookDecisionLog {
  id: string;                      // Auto-generated
  agentId: string;
  organizationId: string;
  userPrompt: string;
  agentContext: AgentContext;
  reasoning: string;               // GPT-4 explanation
  selectedPlaybookId: string | null;
  selectedPlaybookName?: string;
  alternativesConsidered: Array<{
    playbookId: string;
    playbookName: string;
    reason: string;
    score?: number;
  }>;
  confidenceScore: number;         // 0.0 to 1.0
  playbookFound: boolean;
  executionId?: string;
  timestamp: Date;                 // Auto-generated
  metadata?: Record<string, any>;
}
```

---

### 2. Database Schema

**Location:** `apps/api/src/database/migrations/20251102230047_create_agent_playbook_logs.sql`

#### Table: agent_playbook_logs

```sql
CREATE TABLE agent_playbook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent and organization
  agent_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- User prompt and context
  user_prompt TEXT NOT NULL,
  agent_context JSONB NOT NULL DEFAULT '{}',

  -- LLM decision
  reasoning TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Selected playbook
  selected_playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  selected_playbook_name TEXT,
  playbook_found BOOLEAN NOT NULL DEFAULT false,

  -- Alternatives considered
  alternatives_considered JSONB NOT NULL DEFAULT '[]',

  -- Execution reference
  execution_id UUID REFERENCES playbook_executions(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_agent_playbook_logs_agent_id` - Query by agent
- `idx_agent_playbook_logs_organization_id` - Query by organization
- `idx_agent_playbook_logs_playbook_id` - Query by playbook
- `idx_agent_playbook_logs_execution_id` - Query by execution
- `idx_agent_playbook_logs_created_at` - Time-based queries
- `idx_agent_playbook_logs_agent_org_created` - Composite for analytics
- GIN indexes on JSONB columns for efficient querying

**RLS Policies:**
- Multi-tenant isolation using `organization_id`
- Policies for SELECT, INSERT, UPDATE, DELETE

---

### 3. Helper Functions

#### get_agent_playbook_stats()

Get playbook selection statistics for an agent.

```sql
SELECT * FROM get_agent_playbook_stats(
  p_agent_id := 'agent-123',
  p_start_date := '2025-01-01',
  p_end_date := '2025-01-31'
);
```

**Returns:**
```
total_decisions | successful_selections | failed_selections | avg_confidence | most_selected_playbook_id | selection_count
100            | 85                    | 15                | 0.78           | pb-1                      | 45
```

#### get_recent_agent_decisions()

Get recent playbook selection decisions.

```sql
SELECT * FROM get_recent_agent_decisions(
  p_agent_id := 'agent-123',
  p_limit := 10
);
```

#### get_playbook_selection_trends()

Get playbook selection trends for an organization.

```sql
SELECT * FROM get_playbook_selection_trends(
  p_organization_id := 'org-456',
  p_days := 30
);
```

**Returns:**
```
playbook_id | playbook_name       | selection_count | avg_confidence | success_rate
pb-1        | Email Campaign      | 45              | 0.82           | 0.95
pb-2        | Sales Analysis      | 30              | 0.75           | 0.88
pb-3        | Customer Segmenting | 25              | 0.79           | 0.92
```

---

## API Reference

### Base URL
```
/api/agent-playbooks
```

### Endpoints

#### 1. POST /select

Select the most relevant playbook for an agent context.

**Request:**
```json
{
  "context": {
    "agentId": "agent-123",
    "organizationId": "org-456",
    "userPrompt": "Send personalized emails to top customers",
    "currentGoal": "Customer retention",
    "conversationHistory": [
      { "role": "user", "content": "Who are our top customers?", "timestamp": "2025-01-02T10:00:00Z" }
    ],
    "relevantMemories": [
      { "content": "Completed customer segmentation", "relevance": 0.9, "source": "memory-1" }
    ]
  },
  "minConfidence": 0.7,
  "logDecision": true
}
```

**Response (200):**
```json
{
  "playbook": {
    "id": "pb-1",
    "name": "Email Campaign Playbook",
    "description": "Automated personalized email campaigns"
  },
  "reasoning": "This playbook handles personalized email campaigns with customer segmentation support",
  "confidence": 0.85,
  "alternatives": [
    {
      "playbookId": "pb-2",
      "playbookName": "Generic Email Blast",
      "reason": "Less personalized, doesn't use segmentation",
      "score": 0.6
    }
  ],
  "decisionLogId": "log-789"
}
```

---

#### 2. POST /trigger

Auto-select and trigger a playbook for an agent.

**Request:**
```json
{
  "agentId": "agent-123",
  "userPrompt": "Analyze Q4 sales performance",
  "additionalContext": {
    "organizationId": "org-456",
    "currentGoal": "Quarterly business review"
  },
  "input": {
    "quarter": "Q4",
    "year": 2024
  },
  "logDecision": true
}
```

**Response (200):**
```json
{
  "executionId": "exec-123",
  "selectedPlaybooks": [
    {
      "playbookId": "sales-analysis",
      "playbookName": "Sales Analysis Playbook",
      "executionId": "exec-123"
    }
  ],
  "status": "success",
  "output": {
    "totalRevenue": 1250000,
    "topProducts": ["Product A", "Product B"],
    "growthRate": 0.15
  },
  "decisionLogId": "log-790",
  "startedAt": "2025-01-02T10:00:00Z",
  "completedAt": "2025-01-02T10:05:00Z",
  "durationMs": 300000
}
```

---

#### 3. POST /chain

Execute multiple playbooks in sequence.

**Request:**
```json
{
  "playbooks": [
    {
      "playbookId": "fetch-customers",
      "continueOnFailure": false
    },
    {
      "playbookId": "segment-customers",
      "inputMapping": {
        "customers": "$previous_output.customerList"
      },
      "continueOnFailure": false
    },
    {
      "playbookId": "send-emails",
      "inputMapping": {
        "recipients": "$previous_output.topSegment",
        "template": "premium_offer"
      },
      "continueOnFailure": false,
      "timeoutMs": 120000
    }
  ],
  "initialInput": {
    "limit": 100,
    "status": "active"
  }
}
```

**Response (200):**
```json
{
  "executionId": "chain-123",
  "selectedPlaybooks": [
    { "playbookId": "fetch-customers", "playbookName": "Fetch Customers", "executionId": "exec-1" },
    { "playbookId": "segment-customers", "playbookName": "Segment Customers", "executionId": "exec-2" },
    { "playbookId": "send-emails", "playbookName": "Send Emails", "executionId": "exec-3" }
  ],
  "status": "success",
  "output": { "emailsSent": 10 },
  "chainOutputs": [
    { "playbookId": "fetch-customers", "output": { "customerList": [...] }, "status": "completed" },
    { "playbookId": "segment-customers", "output": { "topSegment": [...] }, "status": "completed" },
    { "playbookId": "send-emails", "output": { "emailsSent": 10 }, "status": "completed" }
  ],
  "startedAt": "2025-01-02T10:00:00Z",
  "completedAt": "2025-01-02T10:05:30Z",
  "durationMs": 330000
}
```

---

#### 4. GET /logs/:agentId

Get decision logs for an agent.

**Query Parameters:**
- `limit` (default: 50) - Number of logs to return
- `offset` (default: 0) - Pagination offset

**Response (200):**
```json
{
  "logs": [
    {
      "id": "log-789",
      "agent_id": "agent-123",
      "organization_id": "org-456",
      "user_prompt": "Send emails to top customers",
      "reasoning": "Selected Email Campaign playbook based on...",
      "selected_playbook_id": "pb-1",
      "selected_playbook_name": "Email Campaign Playbook",
      "confidence_score": 0.85,
      "playbook_found": true,
      "execution_id": "exec-123",
      "created_at": "2025-01-02T10:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

#### 5. GET /stats/:agentId

Get playbook selection statistics for an agent.

**Query Parameters:**
- `days` (default: 30) - Number of days to analyze

**Response (200):**
```json
{
  "total_decisions": 100,
  "successful_selections": 85,
  "failed_selections": 15,
  "avg_confidence": 0.78,
  "most_selected_playbook_id": "pb-1",
  "most_selected_playbook_name": "Email Campaign",
  "selection_count": 45
}
```

---

#### 6. GET /trends/:organizationId

Get playbook selection trends for an organization.

**Query Parameters:**
- `days` (default: 30) - Number of days to analyze

**Response (200):**
```json
{
  "trends": [
    {
      "playbook_id": "pb-1",
      "playbook_name": "Email Campaign",
      "selection_count": 45,
      "avg_confidence": 0.82,
      "success_rate": 0.95
    },
    {
      "playbook_id": "pb-2",
      "playbook_name": "Sales Analysis",
      "selection_count": 30,
      "avg_confidence": 0.75,
      "success_rate": 0.88
    }
  ],
  "period": {
    "days": 30,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z"
  }
}
```

---

## Usage Examples

### Example 1: Simple Playbook Trigger

```typescript
import { agentPlaybookOrchestrator } from './services/agentPlaybookOrchestrator';

// Agent receives user request
const userPrompt = "Send a newsletter to all active subscribers";

// Trigger playbook (auto-selects best match)
const result = await agentPlaybookOrchestrator.triggerPlaybookForAgent({
  agentId: 'marketing-agent-1',
  userPrompt,
  additionalContext: {
    organizationId: 'acme-corp',
    currentGoal: 'Monthly newsletter campaign'
  }
});

if (result.status === 'success') {
  console.log(`Newsletter sent! ${result.output.emailsSent} emails delivered`);
} else {
  console.error(`Failed: ${result.errorMessage}`);
}
```

---

### Example 2: Multi-Stage Workflow Chain

```typescript
// Chain: Fetch data → Analyze → Generate report → Send notification
const chainResult = await agentPlaybookOrchestrator.chainPlaybookExecutions({
  playbooks: [
    {
      playbookId: 'fetch-sales-data',
      timeoutMs: 60000
    },
    {
      playbookId: 'analyze-trends',
      inputMapping: {
        'salesData': '$previous_output.rawData',
        'period': '$previous_output.dateRange'
      }
    },
    {
      playbookId: 'generate-report',
      inputMapping: {
        'analysis': '$previous_output.trendAnalysis',
        'template': 'executive_summary'
      }
    },
    {
      playbookId: 'send-slack-notification',
      inputMapping: {
        'channel': '#executives',
        'reportUrl': '$previous_output.reportUrl'
      },
      continueOnFailure: true  // Don't fail chain if Slack fails
    }
  ],
  initialInput: {
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  }
});

console.log(`Chain completed in ${chainResult.durationMs}ms`);
console.log(`Final output:`, chainResult.output);
```

---

### Example 3: Playbook Selection with Context

```typescript
// Agent has conversation history and memories
const selectionResponse = await agentPlaybookOrchestrator.selectRelevantPlaybook({
  context: {
    agentId: 'sales-agent-2',
    organizationId: 'acme-corp',
    userPrompt: 'Follow up with leads from last week',
    currentGoal: 'Convert Q1 pipeline',
    conversationHistory: [
      {
        role: 'user',
        content: 'How many leads do we have?',
        timestamp: new Date('2025-01-02T09:00:00Z')
      },
      {
        role: 'assistant',
        content: 'We have 45 qualified leads from last week',
        timestamp: new Date('2025-01-02T09:01:00Z')
      }
    ],
    relevantMemories: [
      {
        content: 'Lead scoring model updated with new criteria',
        relevance: 0.85,
        source: 'knowledge-base'
      },
      {
        content: 'Email templates for lead nurturing approved',
        relevance: 0.90,
        source: 'recent-actions'
      }
    ]
  },
  minConfidence: 0.75
});

if (selectionResponse.playbook) {
  console.log(`Selected: ${selectionResponse.playbook.name}`);
  console.log(`Reasoning: ${selectionResponse.reasoning}`);
  console.log(`Confidence: ${selectionResponse.confidence}`);

  // Now trigger the selected playbook
  const execution = await playbookExecutionEngine.executePlaybook(
    selectionResponse.playbook.id,
    { leadSource: 'last_week' }
  );
} else {
  console.log(`No suitable playbook found: ${selectionResponse.reasoning}`);
}
```

---

## Best Practices

### 1. Confidence Thresholds

Set appropriate minimum confidence thresholds based on task criticality:

- **High-risk operations** (e.g., financial transactions, data deletion): `minConfidence: 0.85+`
- **Medium-risk operations** (e.g., customer communications): `minConfidence: 0.70-0.85`
- **Low-risk operations** (e.g., data retrieval, reporting): `minConfidence: 0.60-0.70`

### 2. Context Enrichment

Provide rich context for better playbook selection:

```typescript
const context: AgentContext = {
  agentId: 'agent-1',
  organizationId: 'org-1',
  userPrompt: 'Analyze customer feedback',

  // Include relevant conversation history
  conversationHistory: recentMessages.slice(-5),

  // Include related memories
  relevantMemories: await memoryService.search({
    query: 'customer feedback analysis',
    limit: 5
  }),

  // Specify current goal
  currentGoal: 'Q1 customer satisfaction improvement',

  // Include permissions
  permissions: ['read:customers', 'write:reports'],

  // Add custom metadata
  metadata: {
    department: 'customer_success',
    urgency: 'high'
  }
};
```

### 3. Error Handling in Chains

Design chains with appropriate failure handling:

```typescript
const chainConfig: PlaybookChainConfig = {
  playbooks: [
    {
      playbookId: 'critical-step-1',
      continueOnFailure: false  // Stop chain if this fails
    },
    {
      playbookId: 'critical-step-2',
      continueOnFailure: false
    },
    {
      playbookId: 'optional-notification',
      continueOnFailure: true   // Continue even if notification fails
    }
  ]
};
```

### 4. Decision Logging

Always log important decisions for audit trail and debugging:

```typescript
const result = await agentPlaybookOrchestrator.triggerPlaybookForAgent({
  agentId: 'agent-1',
  userPrompt: 'Process refund for order #12345',
  logDecision: true  // Always log financial operations
});

// Later, review the decision
const logs = await fetch(`/api/agent-playbooks/logs/${agentId}`);
```

### 5. Monitoring and Analytics

Regularly review agent performance:

```typescript
// Weekly review
const stats = await fetch(`/api/agent-playbooks/stats/agent-1?days=7`);

if (stats.avg_confidence < 0.7) {
  console.warn('Agent confidence dropping - review playbook descriptions');
}

if (stats.failed_selections > stats.total_decisions * 0.2) {
  console.warn('High failure rate - add more playbooks or improve descriptions');
}
```

---

## Performance Considerations

### GPT-4 API Calls

- **Latency:** 2-5 seconds typical for playbook selection
- **Optimization:** Cache playbook descriptions, use smaller context when possible
- **Cost:** ~$0.03 per selection (GPT-4 pricing as of 2025)

### Playbook Chaining

- **Timeout Management:** Set appropriate timeouts for each step
- **Parallel Execution:** Future enhancement - execute independent playbooks in parallel
- **Resource Limits:** Consider max chain length (recommended: 5-7 playbooks)

### Database Queries

- Indexes optimize common queries (agent logs, org trends)
- JSONB GIN indexes enable efficient context searches
- Consider archiving old logs (>90 days) for performance

---

## Troubleshooting

### Issue: Low Confidence Scores

**Symptoms:** All playbooks returning confidence < 0.6

**Solutions:**
1. Improve playbook descriptions with more detail
2. Add relevant tags and categories
3. Enrich agent context with more memories
4. Review GPT-4 prompt engineering

### Issue: Wrong Playbook Selected

**Symptoms:** Correct playbook exists but different one selected

**Solutions:**
1. Review decision log reasoning
2. Improve target playbook description
3. Add distinguishing tags/categories
4. Provide more specific user prompts

### Issue: Chain Failures

**Symptoms:** Chains stopping at specific steps

**Solutions:**
1. Check input mapping expressions
2. Verify field names match output schema
3. Add error handling with `continueOnFailure`
4. Review individual playbook execution logs

---

## Files Created

### TypeScript Types (250+ LOC)
```
packages/shared-types/src/
└── agent-playbook.ts
```

### Database Migration (260+ LOC)
```
apps/api/src/database/migrations/
└── 20251102230047_create_agent_playbook_logs.sql
```

### Orchestrator Service (550+ LOC)
```
apps/api/src/services/
└── agentPlaybookOrchestrator.ts
```

### API Routes (290+ LOC)
```
apps/api/src/routes/
└── agent-playbooks.ts
```

### Verification Script (450+ LOC)
```
apps/api/
└── verify-sprint43-phase3.5.1.js
```

### Documentation
```
docs/
└── agent_playbook_orchestration.md (this file)
```

---

## Summary

Sprint 43 Phase 3.5.1 successfully delivered agent-driven playbook orchestration:

✅ **Core Features**
- GPT-4 powered playbook selection
- Intelligent context analysis
- Sequential playbook chaining
- Automatic input/output mapping
- Auto-trigger for agents
- Comprehensive decision logging

✅ **Quality**
- 44/44 verification checks passed (100%)
- Full TypeScript type safety
- Multi-tenant security with RLS
- Error handling and validation
- Performance optimizations

✅ **Integration**
- Works with existing playbook system
- Integrates with Sprint 41 execution engine
- Reuses existing types and services
- RESTful API design

The orchestration system enables truly autonomous AI agents that can select and execute complex workflows based on natural language prompts and contextual understanding.

---

**Last Updated:** 2025-01-02
**Sprint:** 43 Phase 3.5.1
**Author:** AI Development Team
