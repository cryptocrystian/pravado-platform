# Sprint 38: Agent Prompt Pipeline + Dynamic Slot Filling

**Sprint Number**: 38
**Dependencies**: Sprint 36 (Agent Memory), Sprint 37 (Lifecycle)
**Estimated Complexity**: High
**Duration Target**: 6-day sprint
**Status**: 🚀 Ready to Begin

---

## 🎯 Goal

Build a sophisticated prompt construction system that dynamically assembles AI prompts from templates with variable slots, enabling:
- Reusable prompt templates with typed slots
- Context-aware slot filling from agent memory
- A/B testing of prompt variations
- GPT-4 powered prompt optimization
- Analytics on prompt performance

This system will make agent prompts maintainable, testable, and continuously improving.

---

## 📋 Success Criteria

By the end of Sprint 38, we should have:

✅ **Database Schema**
- Prompt templates with slot definitions stored in Postgres
- Prompt versions for A/B testing
- Prompt performance metrics tracked
- RLS policies for multi-tenant security

✅ **Backend Engine**
- Template parser that identifies slots (e.g., `{{agent_name}}`, `{{goal}}`)
- Slot resolver that fills slots from context/memory/database
- Prompt versioning system (v1, v2, etc.)
- GPT-4 prompt optimizer that suggests improvements

✅ **API Layer**
- 10+ endpoints for prompt management
- CRUD operations on templates
- Slot resolution endpoint
- A/B test management
- Performance analytics

✅ **Frontend Hooks**
- 15+ React hooks for prompt operations
- Real-time prompt preview with filled slots
- A/B test configuration UI helpers
- Performance metrics visualization

✅ **Type Safety**
- Complete TypeScript definitions for all prompt operations
- Typed slot definitions (string, number, memory_reference, etc.)
- Template validation schemas

---

## 🏗️ Architecture

### 1. Database Schema

**New Tables**:

#### `prompt_templates`
```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'content_generation', 'outreach', 'analysis', etc.
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES prompt_templates(id),

  -- Template content
  template_text TEXT NOT NULL,
  slot_definitions JSONB DEFAULT '[]',

  -- Configuration
  model TEXT DEFAULT 'gpt-4',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER,
  system_message TEXT,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  is_default BOOLEAN DEFAULT FALSE,

  -- Metadata
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `prompt_slots`
```sql
CREATE TABLE prompt_slots (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES prompt_templates(id),

  -- Slot definition
  slot_name TEXT NOT NULL, -- e.g., 'agent_name', 'campaign_goal'
  slot_type TEXT NOT NULL, -- 'string', 'number', 'memory_query', 'database_query'
  description TEXT,

  -- Validation
  required BOOLEAN DEFAULT TRUE,
  default_value TEXT,
  validation_regex TEXT,

  -- Resolution strategy
  resolution_strategy TEXT, -- 'static', 'context', 'memory', 'database', 'gpt'
  resolution_config JSONB, -- Strategy-specific configuration

  -- Examples for GPT optimization
  example_values TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `prompt_ab_tests`
```sql
CREATE TABLE prompt_ab_tests (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  -- Test configuration
  test_name TEXT NOT NULL,
  description TEXT,
  variant_a_template_id UUID REFERENCES prompt_templates(id),
  variant_b_template_id UUID REFERENCES prompt_templates(id),

  -- Distribution
  traffic_split DECIMAL(3,2) DEFAULT 0.5, -- 0.5 = 50/50 split

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Winner
  winning_variant TEXT, -- 'a', 'b', 'tie'
  winner_determined_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `prompt_executions`
```sql
CREATE TABLE prompt_executions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_id UUID REFERENCES prompt_templates(id),
  ab_test_id UUID REFERENCES prompt_ab_tests(id),

  -- Execution details
  filled_prompt TEXT NOT NULL,
  slot_values JSONB, -- Record what values filled each slot

  -- Context
  agent_id UUID,
  campaign_id UUID,
  thread_id TEXT,

  -- Performance
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),

  -- Quality metrics
  output_length INTEGER,
  success BOOLEAN,
  user_feedback_score INTEGER, -- 1-5 rating if available

  -- Model used
  model TEXT,
  temperature DECIMAL(3,2),

  -- Timestamps
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `prompt_optimization_suggestions`
```sql
CREATE TABLE prompt_optimization_suggestions (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES prompt_templates(id),

  -- Suggestion from GPT-4
  suggested_template TEXT NOT NULL,
  reasoning TEXT,
  expected_improvement TEXT,

  -- Confidence
  confidence_score DECIMAL(3,2), -- 0-1

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'rejected'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**:
```sql
CREATE INDEX idx_templates_org ON prompt_templates(organization_id);
CREATE INDEX idx_templates_category ON prompt_templates(category);
CREATE INDEX idx_templates_status ON prompt_templates(status);
CREATE INDEX idx_executions_template ON prompt_executions(template_id);
CREATE INDEX idx_executions_created ON prompt_executions(executed_at DESC);
```

**PostgreSQL Functions**:
- `get_active_prompt_template(category, organization_id)` - Get current active template
- `calculate_prompt_performance(template_id, days)` - Performance metrics
- `determine_ab_test_winner(test_id)` - Statistical analysis
- `get_prompt_analytics_dashboard(organization_id)` - Dashboard data

---

### 2. Prompt Engine

**File**: `apps/agents/src/prompts/prompt-engine.ts`

**Core Classes**:

```typescript
class PromptEngine {
  // Template parsing
  parseTemplate(templateText: string): ParsedTemplate
  extractSlots(templateText: string): SlotDefinition[]

  // Slot resolution
  async resolveSlots(
    template: PromptTemplate,
    context: PromptContext
  ): Promise<Record<string, any>>

  // Prompt assembly
  async assemblePrompt(
    templateId: string,
    context: PromptContext
  ): Promise<FilledPrompt>

  // A/B testing
  async selectVariant(
    testId: string,
    context: PromptContext
  ): Promise<PromptTemplate>

  // Optimization
  async optimizePrompt(
    templateId: string,
    performanceData: PromptPerformance[]
  ): Promise<OptimizationSuggestion>

  // Execution tracking
  async trackExecution(
    templateId: string,
    execution: PromptExecution
  ): Promise<void>

  // Analytics
  async getPerformanceMetrics(
    templateId: string,
    timeRange: TimeRange
  ): Promise<PromptMetrics>
}

class SlotResolver {
  // Resolution strategies
  async resolveStaticSlot(slot: SlotDefinition): Promise<any>
  async resolveContextSlot(slot: SlotDefinition, context: any): Promise<any>
  async resolveMemorySlot(slot: SlotDefinition, agentId: string): Promise<any>
  async resolveDatabaseSlot(slot: SlotDefinition, queryParams: any): Promise<any>
  async resolveGptSlot(slot: SlotDefinition, prompt: string): Promise<any>
}

class PromptOptimizer {
  // GPT-4 powered optimization
  async analyzePromptPerformance(
    template: PromptTemplate,
    executions: PromptExecution[]
  ): Promise<AnalysisResult>

  async generateOptimizationSuggestion(
    analysis: AnalysisResult
  ): Promise<OptimizationSuggestion>

  async applyOptimization(
    templateId: string,
    suggestionId: string
  ): Promise<PromptTemplate>
}
```

**Slot Resolution Strategies**:

1. **Static**: Use provided default value
2. **Context**: Extract from runtime context object
3. **Memory**: Query agent memory system (Sprint 36)
4. **Database**: Execute parameterized query
5. **GPT**: Use GPT to generate slot value dynamically

---

### 3. API Layer

**Controller**: `apps/api/src/controllers/prompt-pipeline.controller.ts`

**Routes**: `apps/api/src/routes/prompt-pipeline.routes.ts`

**Endpoints** (12+):

#### Template Management
- `POST /api/v1/prompts/templates` - Create template
- `GET /api/v1/prompts/templates` - List templates
- `GET /api/v1/prompts/templates/:id` - Get template
- `PUT /api/v1/prompts/templates/:id` - Update template
- `DELETE /api/v1/prompts/templates/:id` - Delete template
- `POST /api/v1/prompts/templates/:id/version` - Create new version

#### Slot Operations
- `POST /api/v1/prompts/templates/:id/slots` - Add slot
- `PUT /api/v1/prompts/slots/:id` - Update slot
- `POST /api/v1/prompts/resolve` - Resolve slots and fill template

#### A/B Testing
- `POST /api/v1/prompts/ab-tests` - Create A/B test
- `GET /api/v1/prompts/ab-tests/:id` - Get test details
- `POST /api/v1/prompts/ab-tests/:id/start` - Start test
- `POST /api/v1/prompts/ab-tests/:id/stop` - Stop test
- `GET /api/v1/prompts/ab-tests/:id/results` - Get results

#### Optimization
- `POST /api/v1/prompts/templates/:id/optimize` - Request GPT optimization
- `GET /api/v1/prompts/templates/:id/suggestions` - Get suggestions
- `POST /api/v1/prompts/suggestions/:id/apply` - Apply suggestion

#### Analytics
- `GET /api/v1/prompts/templates/:id/analytics` - Template performance
- `GET /api/v1/prompts/dashboard` - Prompts dashboard
- `POST /api/v1/prompts/executions` - Log execution

---

### 4. Frontend Hooks

**File**: `apps/dashboard/src/hooks/usePromptPipeline.ts`

**Mutation Hooks** (8):
```typescript
useCreateTemplate() - Create new template
useUpdateTemplate() - Update template
useDeleteTemplate() - Delete template
useAddSlot() - Add slot to template
useResolvePrompt() - Resolve and fill prompt
useCreateABTest() - Create A/B test
useOptimizePrompt() - Request optimization
useApplyOptimization() - Apply suggestion
```

**Query Hooks** (7):
```typescript
useTemplates() - List templates
useTemplate() - Get single template
useTemplateAnalytics() - Performance metrics
useABTest() - Get A/B test
useABTestResults() - Test results
useOptimizationSuggestions() - Get suggestions
usePromptDashboard() - Dashboard data
```

**Helper Hooks** (10+):
```typescript
useSlotValidation() - Validate slot values
usePromptPreview() - Live preview with slots filled
useSlotTypeIcon() - Icons for slot types
useTemplateStatusBadge() - Status badges
useABTestProgress() - Test progress indicators
usePerformanceChart() - Chart data for metrics
useOptimizationConfidence() - Confidence indicators
useTokenEstimate() - Estimate token usage
useCostEstimate() - Estimate API cost
useSlotResolver() - Client-side slot resolution
```

---

### 5. TypeScript Types

**File**: `packages/shared-types/src/prompts.ts`

```typescript
// Core types
export interface PromptTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: PromptCategory;
  version: number;
  templateText: string;
  slotDefinitions: SlotDefinition[];
  model: string;
  temperature: number;
  maxTokens?: number;
  systemMessage?: string;
  status: PromptStatus;
  isDefault: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SlotDefinition {
  id: string;
  slotName: string;
  slotType: SlotType;
  description?: string;
  required: boolean;
  defaultValue?: string;
  validationRegex?: string;
  resolutionStrategy: ResolutionStrategy;
  resolutionConfig?: Record<string, any>;
  exampleValues?: string[];
}

export interface FilledPrompt {
  templateId: string;
  filledText: string;
  slotValues: Record<string, any>;
  model: string;
  temperature: number;
  tokensEstimate: number;
  costEstimateUsd: number;
}

export interface ABTest {
  id: string;
  testName: string;
  variantA: PromptTemplate;
  variantB: PromptTemplate;
  trafficSplit: number;
  status: ABTestStatus;
  startedAt?: string;
  endedAt?: string;
  winner?: 'a' | 'b' | 'tie';
}

export interface OptimizationSuggestion {
  id: string;
  templateId: string;
  suggestedTemplate: string;
  reasoning: string;
  expectedImprovement: string;
  confidenceScore: number;
  status: 'pending' | 'applied' | 'rejected';
}

// Enums
export enum PromptCategory {
  CONTENT_GENERATION = 'content_generation',
  OUTREACH = 'outreach',
  ANALYSIS = 'analysis',
  SUMMARIZATION = 'summarization',
  RESEARCH = 'research',
}

export enum SlotType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  MEMORY_QUERY = 'memory_query',
  DATABASE_QUERY = 'database_query',
  GPT_GENERATED = 'gpt_generated',
}

export enum ResolutionStrategy {
  STATIC = 'static',
  CONTEXT = 'context',
  MEMORY = 'memory',
  DATABASE = 'database',
  GPT = 'gpt',
}
```

---

## 🔄 Integration with Existing Systems

### Sprint 36 (Agent Memory)
- Memory slots can query recent episodes
- Retention priority guides context selection
- Memory summaries fill content slots

### Sprint 37 (Lifecycle)
- Aging scores determine memory relevance for prompts
- Compressed memories save tokens in context
- Lifecycle events tracked for prompt optimization

### Agent Framework
- Agents use prompt pipeline for all LLM calls
- Prompt executions logged for agent evaluation
- A/B tests improve agent performance

---

## 📈 Key Features

### 1. Dynamic Slot Resolution

Example template:
```
Generate a {{content_type}} about {{topic}} for {{agent_name}}.

The goal is to {{campaign_goal}}.

Relevant context from past work:
{{memory:related_content}}

Target audience: {{persona:primary}}
Tone: {{brand_voice}}
```

Slots automatically filled from:
- Agent metadata
- Campaign configuration
- Memory system
- Database queries
- GPT generation

### 2. A/B Testing

Test two prompt variations simultaneously:
- Automatic traffic splitting
- Performance tracking
- Statistical significance calculation
- Automatic winner selection

### 3. GPT-4 Optimization

System analyzes:
- Success rates
- Token efficiency
- Output quality scores
- User feedback

GPT-4 suggests improvements:
- Clearer instructions
- Better examples
- Optimized structure

---

## 🧪 Testing Strategy

1. **Unit Tests**: Slot resolution logic
2. **Integration Tests**: Template → filled prompt flow
3. **E2E Tests**: Full prompt execution cycle
4. **Performance Tests**: Resolution speed
5. **A/B Test Validation**: Statistical algorithms

---

## 📊 Success Metrics

- Template reusability: 80%+ of prompts from templates
- Slot resolution accuracy: 95%+
- A/B test confidence: 95% statistical significance
- Optimization impact: 10%+ improvement in metrics
- Token efficiency: 20%+ reduction vs hardcoded prompts

---

## 🚀 Implementation Order

**Day 1-2**: Database schema + migration
**Day 2-3**: Prompt engine core (parsing, resolution)
**Day 3-4**: API layer (templates, slots, execution)
**Day 4-5**: Frontend hooks + A/B testing
**Day 5-6**: GPT optimization + analytics + testing

---

## 🔐 Security Considerations

- RLS on all prompt tables
- Sensitive slots (API keys, passwords) encrypted
- Template injection prevention
- Rate limiting on optimization requests
- Audit logging of template changes

---

## 💡 Future Enhancements (Post-Sprint 38)

- Prompt marketplace (share templates)
- Multi-language support
- Voice/audio prompt variants
- Real-time collaboration on templates
- Prompt version diffing UI
- Automatic regression testing

---

**Ready to Begin**: ✅
**Dependencies Met**: ✅ (Sprint 36 & 37 complete)
**Scope Defined**: ✅
**Success Criteria Clear**: ✅

Let's ship Sprint 38! 🚀
