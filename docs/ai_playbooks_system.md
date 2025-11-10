# AI Playbooks System - Technical Documentation

**Sprint 41 Phase 3.4 (Days 1-2)**
**Status:** ✅ Complete
**Verification:** 32/32 checks passed (100%)

---

## Overview

The AI Playbooks System provides a structured, reusable framework for configuring and executing multi-step agent workflows with branching logic, memory integration, and comprehensive output tracking.

## Architecture

### Database Schema

The system is built on four core tables:

1. **`playbooks`** - Metadata and configuration for playbooks
2. **`playbook_steps`** - Ordered steps with input/output schemas and branching logic
3. **`playbook_executions`** - Execution instances with status tracking
4. **`playbook_step_results`** - Individual step execution results

### Key Features

- ✅ **Multi-Tenant Isolation** - Full RLS policies using `organization_id`
- ✅ **Schema Versioning** - Future-proof with `schema_version` field
- ✅ **Branching Logic** - Conditional execution paths via `on_success_step_id` and `on_failure_step_id`
- ✅ **Memory Integration** - `MEMORY_SEARCH` step type for semantic memory queries
- ✅ **Flexible I/O** - JSONB schemas for inputs/outputs
- ✅ **Retry Mechanisms** - Configurable retries with exponential backoff
- ✅ **Progress Tracking** - Real-time execution progress monitoring
- ✅ **Analytics** - Built-in summary functions for execution metrics

---

## Database Schema Details

### Tables

#### `playbooks`
Stores playbook metadata and configuration.

**Key Columns:**
- `id` (UUID) - Primary key
- `organization_id` (UUID) - Tenant isolation
- `name` (VARCHAR) - Playbook name (unique per org + version)
- `version` (INTEGER) - Version number for schema evolution
- `status` (playbook_status) - DRAFT | ACTIVE | ARCHIVED | DEPRECATED
- `input_schema` (JSONB) - JSON schema for required inputs
- `output_schema` (JSONB) - JSON schema for expected outputs
- `timeout_seconds` (INTEGER) - Maximum execution time
- `max_retries` (INTEGER) - Retry attempts on failure
- `tags` (TEXT[]) - Categorization tags
- `agent_id` (UUID) - Optional agent association

#### `playbook_steps`
Defines ordered execution steps with branching.

**Key Columns:**
- `id` (UUID) - Primary key
- `playbook_id` (UUID) - Foreign key to playbooks (CASCADE DELETE)
- `step_name` (VARCHAR) - Human-readable step name
- `step_type` (playbook_step_type) - Type of step (see enum below)
- `step_order` (INTEGER) - Execution order
- `config` (JSONB) - Step-specific configuration
- `input_mapping` (JSONB) - Maps previous outputs to this step's inputs
- `condition` (JSONB) - Conditional logic for execution
- `on_success_step_id` (UUID) - Next step on success
- `on_failure_step_id` (UUID) - Next step on failure
- `is_optional` (BOOLEAN) - Skip on failure if true

#### `playbook_executions`
Tracks execution instances.

**Key Columns:**
- `id` (UUID) - Primary key
- `playbook_id` (UUID) - Foreign key to playbooks
- `organization_id` (UUID) - Tenant isolation
- `status` (playbook_execution_status) - Current execution status
- `trigger_source` (VARCHAR) - manual | api | scheduled | event
- `input_data` (JSONB) - Execution input data
- `output_data` (JSONB) - Final execution output
- `current_step_id` (UUID) - Currently executing step
- `completed_steps` (INTEGER) - Progress counter
- `total_steps` (INTEGER) - Total steps in playbook
- `started_at` (TIMESTAMPTZ) - Execution start time
- `completed_at` (TIMESTAMPTZ) - Execution end time
- `duration_ms` (INTEGER) - Auto-calculated duration

#### `playbook_step_results`
Stores individual step execution results.

**Key Columns:**
- `id` (UUID) - Primary key
- `execution_id` (UUID) - Foreign key to playbook_executions
- `step_id` (UUID) - Foreign key to playbook_steps
- `status` (step_result_status) - Step execution status
- `attempt_number` (INTEGER) - Retry attempt number
- `input_data` (JSONB) - Step input data
- `output_data` (JSONB) - Step output data
- `started_at` (TIMESTAMPTZ) - Step start time
- `completed_at` (TIMESTAMPTZ) - Step end time
- `duration_ms` (INTEGER) - Auto-calculated duration

### Enum Types

#### `playbook_status`
- `DRAFT` - Being created/edited
- `ACTIVE` - Ready for execution
- `ARCHIVED` - Stored but not in use
- `DEPRECATED` - Outdated, should not be used

#### `playbook_execution_status`
- `PENDING` - Queued for execution
- `RUNNING` - Currently executing
- `PAUSED` - Temporarily paused
- `COMPLETED` - Successfully finished
- `FAILED` - Execution failed
- `CANCELLED` - Manually cancelled
- `TIMEOUT` - Exceeded time limit

#### `playbook_step_type`
- `AGENT_EXECUTION` - Execute an AI agent
- `DATA_TRANSFORM` - Transform/process data
- `CONDITIONAL_BRANCH` - Branch based on conditions
- `PARALLEL_EXECUTION` - Execute multiple steps in parallel
- `WAIT_FOR_INPUT` - Pause for user input
- `API_CALL` - External API request
- `DATABASE_QUERY` - Query the database
- `MEMORY_SEARCH` - Search agent memory with embeddings
- `PROMPT_TEMPLATE` - Resolve a prompt template
- `CUSTOM_FUNCTION` - Execute custom JavaScript/TypeScript

#### `step_result_status`
- `PENDING` - Not yet started
- `RUNNING` - Currently executing
- `COMPLETED` - Successfully finished
- `FAILED` - Execution failed
- `SKIPPED` - Skipped (optional step)
- `TIMEOUT` - Exceeded time limit

---

## PostgreSQL Functions

### `get_playbook_execution_summary(playbook_id UUID)`
Returns execution statistics for a playbook.

**Returns:**
- `total_executions` - Total number of executions
- `successful_executions` - Count of completed executions
- `failed_executions` - Count of failed executions
- `running_executions` - Count of currently running
- `avg_duration_ms` - Average execution duration
- `last_execution_at` - Timestamp of most recent execution
- `success_rate` - Percentage of successful executions

**Usage:**
```sql
SELECT * FROM get_playbook_execution_summary('playbook-uuid-here');
```

### `get_active_playbooks(agent_id UUID)`
Returns all active playbooks for a specific agent.

**Returns:**
- `id` - Playbook ID
- `name` - Playbook name
- `description` - Playbook description
- `category` - Playbook category
- `version` - Version number
- `total_steps` - Number of steps
- `last_executed_at` - Last execution timestamp
- `execution_count` - Total execution count

**Usage:**
```sql
SELECT * FROM get_active_playbooks('agent-uuid-here');
```

### `get_execution_progress(execution_id UUID)`
Returns real-time execution progress.

**Returns:**
- `execution_id` - Execution ID
- `status` - Current status
- `progress_percentage` - Completion percentage (0-100)
- `current_step_name` - Name of currently executing step
- `completed_steps` - Number of completed steps
- `total_steps` - Total number of steps
- `elapsed_time_ms` - Time elapsed since start

**Usage:**
```sql
SELECT * FROM get_execution_progress('execution-uuid-here');
```

---

## TypeScript Types

All types are available in `@pravado/shared-types`:

```typescript
import {
  Playbook,
  PlaybookStep,
  PlaybookExecution,
  PlaybookStepResult,
  PlaybookStatus,
  PlaybookExecutionStatus,
  PlaybookStepType,
  StepResultStatus,
} from '@pravado/shared-types';
```

### Core Interfaces

```typescript
interface Playbook {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  version: number;
  status: PlaybookStatus;
  tags?: string[];
  category?: string;
  agentId?: string;
  schemaVersion: number;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  timeoutSeconds: number;
  maxRetries: number;
  retryDelaySeconds: number;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaybookStep {
  id: string;
  playbookId: string;
  stepName: string;
  stepType: PlaybookStepType;
  stepOrder: number;
  description?: string;
  config: Record<string, any>;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  inputMapping: Record<string, any>;
  condition?: Record<string, any>;
  onSuccessStepId?: string;
  onFailureStepId?: string;
  timeoutSeconds: number;
  maxRetries: number;
  isOptional: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface PlaybookExecution {
  id: string;
  playbookId: string;
  organizationId: string;
  executionName?: string;
  status: PlaybookExecutionStatus;
  triggeredBy?: string;
  triggerSource: string;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  errorMessage?: string;
  errorStack?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  currentStepId?: string;
  completedSteps: number;
  totalSteps?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface PlaybookStepResult {
  id: string;
  executionId: string;
  stepId: string;
  status: StepResultStatus;
  attemptNumber: number;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  errorMessage?: string;
  errorStack?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### Configuration Constants

```typescript
const DEFAULT_TIMEOUTS = {
  PLAYBOOK: 3600,  // 1 hour
  STEP: 300,       // 5 minutes
  AGENT_EXECUTION: 600,   // 10 minutes
  API_CALL: 30,    // 30 seconds
  DATABASE_QUERY: 60,     // 1 minute
};

const DEFAULT_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_SECONDS: 30,
  BACKOFF_MULTIPLIER: 2,
};
```

---

## Security

### Row Level Security (RLS)

All tables have RLS policies enforcing tenant isolation:

```sql
-- Example: playbooks table policy
CREATE POLICY playbooks_tenant_isolation ON playbooks
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

**Usage in Application:**
```typescript
// Set organization context before queries
await supabase.rpc('set_config', {
  parameter: 'app.current_organization_id',
  value: organizationId
});
```

### Cascade Deletes

All foreign keys use `ON DELETE CASCADE` to maintain referential integrity:
- Deleting a playbook deletes all its steps and executions
- Deleting an execution deletes all its step results

---

## Indexes

Optimized indexes for common query patterns:

```sql
-- Playbooks
idx_playbooks_organization_id
idx_playbooks_status
idx_playbooks_agent_id
idx_playbooks_category
idx_playbooks_tags (GIN index for array queries)

-- Playbook Steps
idx_playbook_steps_playbook_id
idx_playbook_steps_step_type
idx_playbook_steps_step_order

-- Playbook Executions
idx_playbook_executions_playbook_id
idx_playbook_executions_organization_id
idx_playbook_executions_status
idx_playbook_executions_started_at

-- Playbook Step Results
idx_playbook_step_results_execution_id
idx_playbook_step_results_step_id
idx_playbook_step_results_status
```

---

## Migration

**File:** `apps/api/src/database/migrations/20250102_create_playbooks_system.sql`

**To Apply:**
```bash
# Using Supabase CLI
supabase db push

# Or directly with psql
psql -U postgres -d pravado -f apps/api/src/database/migrations/20250102_create_playbooks_system.sql
```

---

## Next Steps (Days 3-6)

1. **Playbook Execution Engine** - Core execution logic with step resolution
2. **Step Handlers** - Implementations for each step type
3. **REST API Endpoints** - CRUD operations for playbooks and executions
4. **React Hooks** - Frontend integration with React Query
5. **Playbook Builder UI** - Visual workflow editor
6. **Execution Monitoring** - Real-time progress tracking dashboard

---

## Files Created

```
apps/api/src/database/migrations/
└── 20250102_create_playbooks_system.sql  (400+ LOC)

packages/shared-types/src/
├── playbooks.ts  (600+ LOC)
└── index.ts  (updated)

apps/api/
├── verify-sprint41-phase3.4.js  (600+ LOC)
└── docs/
    └── ai_playbooks_system.md  (this file)
```

---

## Verification

**Script:** `apps/api/verify-sprint41-phase3.4.js`

**Run Verification:**
```bash
node apps/api/verify-sprint41-phase3.4.js
```

**Results:** ✅ 32/32 checks passed (100%)

---

**Last Updated:** 2025-01-02
**Sprint:** 41 Phase 3.4 Days 1-2
**Author:** AI Development Team
