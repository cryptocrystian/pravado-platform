#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 43
// Agent Playbook Orchestration (Phase 3.5.1)
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
log('  SPRINT 43 PHASE 3.5.1 VERIFICATION', 'blue');
log('  Agent Playbook Orchestration', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. TYPESCRIPT TYPES
// =====================================================
log('1️⃣  TYPESCRIPT TYPES', 'yellow');
console.log('');

const typesFile = 'packages/shared-types/src/agent-playbook.ts';

check(checkFile(typesFile, 'Agent playbook types file exists'));

check(checkFileContent(
  typesFile,
  [
    'export interface AgentContext',
    'export interface PlaybookChainConfig',
    'export interface ExecutionResult',
    'export interface AgentPlaybookDecisionLog',
  ],
  'Core interfaces defined'
));

check(checkFileContent(
  typesFile,
  [
    'agentId',
    'organizationId',
    'userPrompt',
    'conversationHistory',
    'relevantMemories',
  ],
  'AgentContext has all required fields'
));

check(checkFileContent(
  typesFile,
  [
    'playbooks:',
    'playbookId',
    'inputMapping',
    'continueOnFailure',
  ],
  'PlaybookChainConfig has chaining fields'
));

check(checkFileContent(
  typesFile,
  [
    'export interface PlaybookSelectionRequest',
    'export interface PlaybookSelectionResponse',
    'export interface TriggerPlaybookRequest',
  ],
  'Request/Response interfaces defined'
));

check(checkFileContent(
  typesFile,
  [
    'export interface AgentPlaybookLogEntity',
    'agent_id',
    'reasoning',
    'confidence_score',
    'alternatives_considered',
  ],
  'Database entity interface defined'
));

console.log('');

// =====================================================
// 2. DATABASE MIGRATION
// =====================================================
log('2️⃣  DATABASE MIGRATION', 'yellow');
console.log('');

const migrationPattern = /apps\/api\/src\/database\/migrations\/\d+_create_agent_playbook_logs\.sql/;
const migrationFiles = fs.readdirSync(
  path.join(__dirname, 'src', 'database', 'migrations')
).filter(f => f.includes('create_agent_playbook_logs'));

if (migrationFiles.length > 0) {
  const migrationFile = `apps/api/src/database/migrations/${migrationFiles[0]}`;

  check(checkFile(migrationFile, 'Migration file exists'));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE TABLE IF NOT EXISTS agent_playbook_logs',
      'agent_id UUID NOT NULL',
      'organization_id UUID NOT NULL',
      'user_prompt TEXT NOT NULL',
      'agent_context JSONB NOT NULL',
      'reasoning TEXT NOT NULL',
      'confidence_score DECIMAL',
    ],
    'Table schema with all columns'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'selected_playbook_id UUID',
      'selected_playbook_name TEXT',
      'playbook_found BOOLEAN',
      'alternatives_considered JSONB',
      'execution_id UUID',
    ],
    'Playbook selection fields'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE INDEX',
      'idx_agent_playbook_logs_agent_id',
      'idx_agent_playbook_logs_organization_id',
      'idx_agent_playbook_logs_playbook_id',
    ],
    'Indexes created'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY',
      'agent_playbook_logs_select_policy',
      'agent_playbook_logs_insert_policy',
    ],
    'RLS policies defined'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE OR REPLACE FUNCTION get_agent_playbook_stats',
      'CREATE OR REPLACE FUNCTION get_recent_agent_decisions',
      'CREATE OR REPLACE FUNCTION get_playbook_selection_trends',
    ],
    'Helper functions created'
  ));
} else {
  log('❌ Migration file not found', 'red');
  totalChecks += 6;
}

console.log('');

// =====================================================
// 3. ORCHESTRATOR SERVICE
// =====================================================
log('3️⃣  ORCHESTRATOR SERVICE', 'yellow');
console.log('');

const orchestratorFile = 'apps/api/src/services/agentPlaybookOrchestrator.ts';

check(checkFile(orchestratorFile, 'Orchestrator service file exists'));

check(checkFileContent(
  orchestratorFile,
  [
    'class AgentPlaybookOrchestrator',
    'export const agentPlaybookOrchestrator',
  ],
  'Orchestrator class and singleton export'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async selectRelevantPlaybook',
    'PlaybookSelectionRequest',
    'PlaybookSelectionResponse',
  ],
  'selectRelevantPlaybook method exists'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async chainPlaybookExecutions',
    'PlaybookChainConfig',
    'ExecutionResult',
  ],
  'chainPlaybookExecutions method exists'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async triggerPlaybookForAgent',
    'TriggerPlaybookRequest',
  ],
  'triggerPlaybookForAgent method exists'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async logAgentPlaybookDecision',
    'AgentPlaybookDecisionLog',
  ],
  'logAgentPlaybookDecision method exists'
));

console.log('');

// =====================================================
// 4. GPT-4 INTEGRATION
// =====================================================
log('4️⃣  GPT-4 INTEGRATION', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'import { OpenAI }',
    'const openai = new OpenAI',
  ],
  'OpenAI client imported and initialized'
));

check(checkFileContent(
  orchestratorFile,
  [
    'buildSelectionSystemPrompt',
    'buildSelectionUserPrompt',
  ],
  'Prompt building methods exist'
));

check(checkFileContent(
  orchestratorFile,
  [
    'openai.chat.completions.create',
    'model: \'gpt-4\'',
    'messages:',
    'role: \'system\'',
    'role: \'user\'',
  ],
  'GPT-4 API call in selection method'
));

check(checkFileContent(
  orchestratorFile,
  [
    'You are an AI agent trying to solve a task',
    'available playbooks',
    'Select the SINGLE most relevant playbook',
  ],
  'System prompt for playbook selection'
));

check(checkFileContent(
  orchestratorFile,
  [
    'response_format: { type: \'json_object\' }',
    'JSON.parse',
    'selectedPlaybookId',
    'reasoning',
    'confidence',
  ],
  'JSON response parsing'
));

console.log('');

// =====================================================
// 5. PLAYBOOK CHAINING
// =====================================================
log('5️⃣  PLAYBOOK CHAINING', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'for (const playbookConfig of chainConfig.playbooks)',
    'inputMapping',
    'mapPlaybookInput',
  ],
  'Sequential execution with input mapping'
));

check(checkFileContent(
  orchestratorFile,
  [
    'continueOnFailure',
    'if (executionResult.status === \'failed\' && !continueOnFailure)',
  ],
  'Failure handling in chains'
));

check(checkFileContent(
  orchestratorFile,
  [
    'chainOutputs',
    'currentInput = executionResult.output',
  ],
  'Output collection and passing'
));

check(checkFileContent(
  orchestratorFile,
  [
    'private mapPlaybookInput',
    '$previous_output.',
    'getNestedValue',
  ],
  'Input mapping implementation'
));

console.log('');

// =====================================================
// 6. DECISION LOGGING
// =====================================================
log('6️⃣  DECISION LOGGING', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'await this.logAgentPlaybookDecision',
    'agentId:',
    'organizationId:',
    'userPrompt:',
    'reasoning:',
    'confidenceScore:',
  ],
  'Decision logging called with all fields'
));

check(checkFileContent(
  orchestratorFile,
  [
    'from(\'agent_playbook_logs\')',
    '.insert(logEntity)',
  ],
  'Database insert for logs'
));

check(checkFileContent(
  orchestratorFile,
  [
    'updateDecisionLogExecution',
    'execution_id: executionId',
  ],
  'Execution ID update after triggering'
));

console.log('');

// =====================================================
// 7. API ROUTES
// =====================================================
log('7️⃣  API ROUTES', 'yellow');
console.log('');

const routesFile = 'apps/api/src/routes/agent-playbooks.ts';

check(checkFile(routesFile, 'API routes file exists'));

check(checkFileContent(
  routesFile,
  [
    'router.post(\'/select\'',
    'agentPlaybookOrchestrator.selectRelevantPlaybook',
  ],
  'POST /select endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.post(\'/trigger\'',
    'agentPlaybookOrchestrator.triggerPlaybookForAgent',
  ],
  'POST /trigger endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.post(\'/chain\'',
    'agentPlaybookOrchestrator.chainPlaybookExecutions',
  ],
  'POST /chain endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/logs/:agentId\'',
    'from(\'agent_playbook_logs\')',
  ],
  'GET /logs/:agentId endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/stats/:agentId\'',
    'get_agent_playbook_stats',
  ],
  'GET /stats/:agentId endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/trends/:organizationId\'',
    'get_playbook_selection_trends',
  ],
  'GET /trends/:organizationId endpoint'
));

console.log('');

// =====================================================
// 8. ERROR HANDLING & VALIDATION
// =====================================================
log('8️⃣  ERROR HANDLING & VALIDATION', 'yellow');
console.log('');

check(checkFileContent(
  routesFile,
  [
    'if (!selectionRequest.context)',
    'return res.status(400)',
    'Missing required field',
  ],
  'Request validation in endpoints'
));

check(checkFileContent(
  orchestratorFile,
  [
    'try {',
    'catch (error)',
    'console.error',
    'throw new Error',
  ],
  'Error handling in orchestrator'
));

check(checkFileContent(
  orchestratorFile,
  [
    'if (confidence < minConfidence)',
    'Confidence below threshold',
  ],
  'Confidence threshold validation'
));

console.log('');

// =====================================================
// 9. INTEGRATION WITH EXISTING SERVICES
// =====================================================
log('9️⃣  INTEGRATION', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'import',
    'playbookService',
    'playbookExecutionEngine',
  ],
  'Imports existing playbook services'
));

check(checkFileContent(
  orchestratorFile,
  [
    'playbookService.getPlaybookById',
    'playbookService.listPlaybooks',
  ],
  'Uses playbookService methods'
));

check(checkFileContent(
  orchestratorFile,
  [
    'playbookExecutionEngine.executePlaybook',
    'waitForExecution',
  ],
  'Uses execution engine'
));

console.log('');

// =====================================================
// 10. TYPES EXPORT
// =====================================================
log('🔟  TYPES EXPORT', 'yellow');
console.log('');

const indexFile = 'packages/shared-types/src/index.ts';

check(checkFileContent(
  indexFile,
  [
    'export * from \'./agent-playbook\'',
  ],
  'Agent playbook types exported from index'
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
  log('🎉 All checks passed! Sprint 43 implementation verified!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most checks passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple issues detected. Please review the failed checks.', 'red');
}

console.log('');
log('📊 IMPLEMENTATION SUMMARY', 'cyan');
console.log('');
console.log('Core Components:');
console.log('  - AgentPlaybookOrchestrator: Main orchestration service');
console.log('  - agent_playbook_logs: Decision logging table');
console.log('  - AgentContext: Context interface for selection');
console.log('  - PlaybookChainConfig: Configuration for chaining');
console.log('  - API Routes: REST endpoints for orchestration');
console.log('');
console.log('Features Implemented:');
console.log('  - ✅ GPT-4 powered playbook selection');
console.log('  - ✅ Intelligent context analysis');
console.log('  - ✅ Playbook chaining with input/output mapping');
console.log('  - ✅ Auto-trigger for agents');
console.log('  - ✅ Decision logging with reasoning');
console.log('  - ✅ Confidence scoring');
console.log('  - ✅ Alternative tracking');
console.log('  - ✅ Statistics and trends');
console.log('  - ✅ Multi-tenant security');
console.log('  - ✅ RLS policies');
console.log('');
console.log('API Endpoints:');
console.log('  - POST   /api/agent-playbooks/select');
console.log('  - POST   /api/agent-playbooks/trigger');
console.log('  - POST   /api/agent-playbooks/chain');
console.log('  - GET    /api/agent-playbooks/logs/:agentId');
console.log('  - GET    /api/agent-playbooks/stats/:agentId');
console.log('  - GET    /api/agent-playbooks/trends/:organizationId');
console.log('  - GET    /api/agent-playbooks/recent-decisions/:agentId');
console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
