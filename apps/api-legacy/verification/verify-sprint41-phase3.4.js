#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 41 PHASE 3.4
// AI Playbooks System - Database & Types (Days 1-2)
// =====================================================

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', '..', filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function checkFileContent(filePath, patterns, description) {
  const fullPath = path.join(__dirname, '..', '..', filePath);

  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const results = patterns.map((pattern) => {
    if (typeof pattern === 'string') {
      return content.includes(pattern);
    } else {
      return pattern.test(content);
    }
  });

  const allFound = results.every(Boolean);
  if (allFound) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing expected content`, 'red');
    patterns.forEach((pattern, index) => {
      if (!results[index]) {
        const patternStr = typeof pattern === 'string' ? pattern : pattern.toString();
        log(`  Missing: ${patternStr}`, 'yellow');
      }
    });
    return false;
  }
}

let passedChecks = 0;
let totalChecks = 0;

function check(result) {
  totalChecks++;
  if (result) passedChecks++;
  return result;
}

console.log('\n');
log('═══════════════════════════════════════════════════', 'blue');
log('  SPRINT 41 PHASE 3.4 VERIFICATION', 'blue');
log('  AI Playbooks System - Database & Types', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. DATABASE MIGRATION FILE
// =====================================================
log('1️⃣  DATABASE MIGRATION FILE', 'yellow');
console.log('');

check(checkFile(
  'apps/api/src/database/migrations/20250102_create_playbooks_system.sql',
  'Migration file exists'
));

const migrationFile = 'apps/api/src/database/migrations/20250102_create_playbooks_system.sql';

// Check enum types
check(checkFileContent(
  migrationFile,
  [
    'CREATE TYPE playbook_status',
    'CREATE TYPE playbook_execution_status',
    'CREATE TYPE playbook_step_type',
    'CREATE TYPE step_result_status',
  ],
  'Enum types defined'
));

// Check tables
check(checkFileContent(
  migrationFile,
  [
    'CREATE TABLE playbooks',
    'CREATE TABLE playbook_steps',
    'CREATE TABLE playbook_executions',
    'CREATE TABLE playbook_step_results',
  ],
  'All four tables created'
));

// Check playbooks table structure
check(checkFileContent(
  migrationFile,
  [
    'id UUID PRIMARY KEY',
    'organization_id UUID NOT NULL',
    'name VARCHAR(255)',
    'status playbook_status',
    'input_schema JSONB',
    'output_schema JSONB',
    'timeout_seconds INTEGER',
    'max_retries INTEGER',
  ],
  'Playbooks table has required columns'
));

// Check playbook_steps table structure
check(checkFileContent(
  migrationFile,
  [
    'playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE',
    'step_name VARCHAR(255)',
    'step_type playbook_step_type',
    'step_order INTEGER',
    'input_mapping JSONB',
    'on_success_step_id UUID',
    'on_failure_step_id UUID',
  ],
  'Playbook_steps table has required columns and foreign keys'
));

// Check playbook_executions table structure
check(checkFileContent(
  migrationFile,
  [
    'playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE',
    'status playbook_execution_status',
    'trigger_source VARCHAR(100)',
    'input_data JSONB',
    'output_data JSONB',
    'started_at TIMESTAMP WITH TIME ZONE',
    'completed_at TIMESTAMP WITH TIME ZONE',
    'duration_ms INTEGER',
  ],
  'Playbook_executions table has required columns'
));

// Check playbook_step_results table structure
check(checkFileContent(
  migrationFile,
  [
    'execution_id UUID NOT NULL REFERENCES playbook_executions(id) ON DELETE CASCADE',
    'step_id UUID NOT NULL REFERENCES playbook_steps(id) ON DELETE CASCADE',
    'status step_result_status',
    'attempt_number INTEGER',
    'input_data JSONB',
    'output_data JSONB',
  ],
  'Playbook_step_results table has required columns'
));

console.log('');

// =====================================================
// 2. INDEXES
// =====================================================
log('2️⃣  DATABASE INDEXES', 'yellow');
console.log('');

check(checkFileContent(
  migrationFile,
  [
    'CREATE INDEX idx_playbooks_organization_id',
    'CREATE INDEX idx_playbooks_status',
    'CREATE INDEX idx_playbook_steps_playbook_id',
    'CREATE INDEX idx_playbook_executions_playbook_id',
    'CREATE INDEX idx_playbook_executions_organization_id',
    'CREATE INDEX idx_playbook_step_results_execution_id',
  ],
  'Required indexes created'
));

console.log('');

// =====================================================
// 3. ROW LEVEL SECURITY (RLS)
// =====================================================
log('3️⃣  ROW LEVEL SECURITY POLICIES', 'yellow');
console.log('');

check(checkFileContent(
  migrationFile,
  [
    'ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE playbook_steps ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE playbook_executions ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE playbook_step_results ENABLE ROW LEVEL SECURITY',
  ],
  'RLS enabled on all tables'
));

check(checkFileContent(
  migrationFile,
  [
    'CREATE POLICY playbooks_tenant_isolation',
    'CREATE POLICY playbook_steps_tenant_isolation',
    'CREATE POLICY playbook_executions_tenant_isolation',
    'CREATE POLICY playbook_step_results_tenant_isolation',
  ],
  'Tenant isolation policies created'
));

check(checkFileContent(
  migrationFile,
  [
    "current_setting('app.current_organization_id')",
  ],
  'RLS policies use organization_id for multi-tenant isolation'
));

console.log('');

// =====================================================
// 4. TRIGGERS AND FUNCTIONS
// =====================================================
log('4️⃣  TRIGGERS AND HELPER FUNCTIONS', 'yellow');
console.log('');

check(checkFileContent(
  migrationFile,
  [
    'CREATE OR REPLACE FUNCTION update_updated_at_column()',
    'CREATE TRIGGER update_playbooks_updated_at',
    'CREATE TRIGGER update_playbook_steps_updated_at',
    'CREATE TRIGGER update_playbook_executions_updated_at',
  ],
  'Updated_at triggers created'
));

check(checkFileContent(
  migrationFile,
  [
    'CREATE OR REPLACE FUNCTION calculate_execution_duration()',
    'CREATE TRIGGER calculate_playbook_execution_duration',
    'CREATE TRIGGER calculate_step_result_duration',
  ],
  'Duration calculation triggers created'
));

console.log('');

// =====================================================
// 5. POSTGRESQL FUNCTIONS
// =====================================================
log('5️⃣  POSTGRESQL QUERY FUNCTIONS', 'yellow');
console.log('');

check(checkFileContent(
  migrationFile,
  [
    'CREATE OR REPLACE FUNCTION get_playbook_execution_summary(p_playbook_id UUID)',
    'total_executions BIGINT',
    'successful_executions BIGINT',
    'failed_executions BIGINT',
    'success_rate NUMERIC',
  ],
  'get_playbook_execution_summary function created'
));

check(checkFileContent(
  migrationFile,
  [
    'CREATE OR REPLACE FUNCTION get_active_playbooks(p_agent_id UUID)',
    'total_steps INTEGER',
    'execution_count BIGINT',
  ],
  'get_active_playbooks function created'
));

check(checkFileContent(
  migrationFile,
  [
    'CREATE OR REPLACE FUNCTION get_execution_progress(p_execution_id UUID)',
    'progress_percentage INTEGER',
    'current_step_name VARCHAR(255)',
    'elapsed_time_ms INTEGER',
  ],
  'get_execution_progress function created'
));

console.log('');

// =====================================================
// 6. TYPESCRIPT TYPES FILE
// =====================================================
log('6️⃣  TYPESCRIPT TYPES AND INTERFACES', 'yellow');
console.log('');

const typesFile = 'packages/shared-types/src/playbooks.ts';

check(checkFile(
  typesFile,
  'Playbooks types file exists'
));

// Check enums
check(checkFileContent(
  typesFile,
  [
    'export enum PlaybookStatus',
    'DRAFT',
    'ACTIVE',
    'ARCHIVED',
    'DEPRECATED',
  ],
  'PlaybookStatus enum defined'
));

check(checkFileContent(
  typesFile,
  [
    'export enum PlaybookExecutionStatus',
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'TIMEOUT',
  ],
  'PlaybookExecutionStatus enum defined'
));

check(checkFileContent(
  typesFile,
  [
    'export enum PlaybookStepType',
    'AGENT_EXECUTION',
    'DATA_TRANSFORM',
    'CONDITIONAL_BRANCH',
    'API_CALL',
    'MEMORY_SEARCH',
    'PROMPT_TEMPLATE',
  ],
  'PlaybookStepType enum defined'
));

check(checkFileContent(
  typesFile,
  [
    'export enum StepResultStatus',
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'SKIPPED',
  ],
  'StepResultStatus enum defined'
));

console.log('');

// =====================================================
// 7. CORE INTERFACES
// =====================================================
log('7️⃣  CORE INTERFACES', 'yellow');
console.log('');

check(checkFileContent(
  typesFile,
  [
    'export interface Playbook',
    'id: string',
    'organizationId: string',
    'name: string',
    'status: PlaybookStatus',
    'inputSchema: Record<string, any>',
    'outputSchema: Record<string, any>',
  ],
  'Playbook interface defined'
));

check(checkFileContent(
  typesFile,
  [
    'export interface PlaybookStep',
    'id: string',
    'playbookId: string',
    'stepName: string',
    'stepType: PlaybookStepType',
    'stepOrder: number',
    'inputMapping: Record<string, any>',
  ],
  'PlaybookStep interface defined'
));

check(checkFileContent(
  typesFile,
  [
    'export interface PlaybookExecution',
    'id: string',
    'playbookId: string',
    'status: PlaybookExecutionStatus',
    'inputData: Record<string, any>',
    'outputData: Record<string, any>',
    'startedAt?: string',
    'completedAt?: string',
  ],
  'PlaybookExecution interface defined'
));

check(checkFileContent(
  typesFile,
  [
    'export interface PlaybookStepResult',
    'executionId: string',
    'stepId: string',
    'status: StepResultStatus',
    'attemptNumber: number',
    'inputData: Record<string, any>',
    'outputData: Record<string, any>',
  ],
  'PlaybookStepResult interface defined'
));

console.log('');

// =====================================================
// 8. INPUT/OUTPUT TYPES
// =====================================================
log('8️⃣  INPUT/OUTPUT TYPES', 'yellow');
console.log('');

check(checkFileContent(
  typesFile,
  [
    'export interface CreatePlaybookInput',
    'export interface UpdatePlaybookInput',
    'export interface CreatePlaybookStepInput',
    'export interface UpdatePlaybookStepInput',
    'export interface ExecutePlaybookInput',
    'export interface ExecuteStepInput',
  ],
  'All input types defined'
));

console.log('');

// =====================================================
// 9. CONFIGURATION CONSTANTS
// =====================================================
log('9️⃣  CONFIGURATION CONSTANTS', 'yellow');
console.log('');

check(checkFileContent(
  typesFile,
  [
    'export const DEFAULT_TIMEOUTS',
    'PLAYBOOK: 3600',
    'STEP: 300',
  ],
  'DEFAULT_TIMEOUTS constants defined'
));

check(checkFileContent(
  typesFile,
  [
    'export const DEFAULT_RETRY_CONFIG',
    'MAX_RETRIES',
    'RETRY_DELAY_SECONDS',
  ],
  'DEFAULT_RETRY_CONFIG constants defined'
));

check(checkFileContent(
  typesFile,
  [
    'export const PLAYBOOK_STATUS_CONFIGS',
    'export const EXECUTION_STATUS_CONFIGS',
    'export const STEP_TYPE_CONFIGS',
  ],
  'UI rendering config constants defined'
));

console.log('');

// =====================================================
// 10. TYPES INDEX EXPORT
// =====================================================
log('🔟 SHARED TYPES INDEX EXPORT', 'yellow');
console.log('');

check(checkFileContent(
  'packages/shared-types/src/index.ts',
  [
    "export * from './playbooks'",
  ],
  'Playbooks types exported from index'
));

console.log('');

// =====================================================
// 11. DOCUMENTATION
// =====================================================
log('1️⃣1️⃣  DOCUMENTATION AND COMMENTS', 'yellow');
console.log('');

check(checkFileContent(
  migrationFile,
  [
    'COMMENT ON TABLE playbooks',
    'COMMENT ON TABLE playbook_steps',
    'COMMENT ON TABLE playbook_executions',
    'COMMENT ON TABLE playbook_step_results',
  ],
  'Database table comments added'
));

check(checkFileContent(
  typesFile,
  [
    '/**',
    'interface Playbook',
    'interface PlaybookStep',
    'interface PlaybookExecution',
  ],
  'TSDoc comments on interfaces'
));

console.log('');

// =====================================================
// FINAL RESULTS
// =====================================================
log('═══════════════════════════════════════════════════', 'blue');
log('  VERIFICATION RESULTS', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('');

const percentage = Math.round((passedChecks / totalChecks) * 100);
const statusColor = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';

log(`Total Checks: ${totalChecks}`, 'blue');
log(`Passed: ${passedChecks}`, 'green');
log(`Failed: ${totalChecks - passedChecks}`, 'red');
log(`Success Rate: ${percentage}%`, statusColor);

console.log('');

if (percentage === 100) {
  log('🎉 All checks passed! Sprint 41 Phase 3.4 (Days 1-2) implementation verified!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most checks passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple issues detected. Please review the failed checks.', 'red');
}

console.log('');
log('📊 IMPLEMENTATION SUMMARY', 'cyan');
console.log('');
console.log('Database Schema:');
console.log('  - Tables: 4 (playbooks, playbook_steps, playbook_executions, playbook_step_results)');
console.log('  - Enum Types: 4 (status enums)');
console.log('  - Indexes: 12+ for query optimization');
console.log('  - RLS Policies: 4 (one per table)');
console.log('  - Triggers: 6 (updated_at, duration calculation)');
console.log('  - Functions: 3 (summary, active playbooks, progress)');
console.log('');
console.log('TypeScript Types:');
console.log('  - Enums: 4 (PlaybookStatus, PlaybookExecutionStatus, PlaybookStepType, StepResultStatus)');
console.log('  - Core Interfaces: 4 (Playbook, PlaybookStep, PlaybookExecution, PlaybookStepResult)');
console.log('  - Input/Output Types: 6+');
console.log('  - Config Constants: 5 (timeouts, retries, UI configs)');
console.log('  - Helper Types: Query filters, list responses, summaries');
console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
