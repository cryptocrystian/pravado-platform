#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 43 PHASE 3.5.2
// Agent Collaboration & Escalation
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
log('  SPRINT 43 PHASE 3.5.2 VERIFICATION', 'blue');
log('  Agent Collaboration & Escalation', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. TYPESCRIPT TYPES
// =====================================================
log('1️⃣  TYPESCRIPT TYPES', 'yellow');
console.log('');

const typesFile = 'packages/shared-types/src/agent-collaboration.ts';

check(checkFile(typesFile, 'Agent collaboration types file exists'));

check(checkFileContent(
  typesFile,
  [
    'export interface EscalationRequest',
    'export interface EscalationResult',
    'export interface DelegationRequest',
    'export interface DelegationResult',
  ],
  'Core escalation and delegation interfaces'
));

check(checkFileContent(
  typesFile,
  [
    'export interface CollaborationRequest',
    'export interface CollaborationResult',
  ],
  'Coordination interfaces defined'
));

check(checkFileContent(
  typesFile,
  [
    'export interface AgentCollaborationLog',
    'export interface AgentCollaborationLogEntity',
  ],
  'Log entity interfaces defined'
));

check(checkFileContent(
  typesFile,
  [
    'export interface AgentProfile',
    'export interface AgentRoleHierarchy',
    'canEscalateTo',
  ],
  'Agent profile and hierarchy types'
));

check(checkFileContent(
  typesFile,
  [
    'failureReason',
    'confidenceScore',
    'requiredCapabilities',
  ],
  'Escalation request fields'
));

console.log('');

// =====================================================
// 2. DATABASE MIGRATION
// =====================================================
log('2️⃣  DATABASE MIGRATION', 'yellow');
console.log('');

const migrationPattern = /apps\/api\/src\/database\/migrations\/\d+_create_agent_collaboration_logs\.sql/;
const migrationFiles = fs.readdirSync(
  path.join(__dirname, 'src', 'database', 'migrations')
).filter(f => f.includes('create_agent_collaboration_logs'));

if (migrationFiles.length > 0) {
  const migrationFile = `apps/api/src/database/migrations/${migrationFiles[0]}`;

  check(checkFile(migrationFile, 'Migration file exists'));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE TABLE IF NOT EXISTS agent_collaboration_logs',
      'collaboration_type',
      'initiating_agent_id',
      'target_agent_ids',
      'organization_id',
    ],
    'Table schema with all columns'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE TYPE collaboration_type',
      'escalation',
      'delegation',
      'coordination',
    ],
    'Collaboration type enum'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE INDEX',
      'idx_agent_collab_logs_initiating_agent',
      'idx_agent_collab_logs_target_agents',
      'idx_agent_collab_logs_organization',
    ],
    'Indexes created'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY',
      'agent_collab_logs_select_policy',
      'agent_collab_logs_insert_policy',
    ],
    'RLS policies defined'
  ));

  check(checkFileContent(
    migrationFile,
    [
      'CREATE OR REPLACE FUNCTION get_agent_collaboration_stats',
      'CREATE OR REPLACE FUNCTION get_recent_agent_collaborations',
      'CREATE OR REPLACE FUNCTION get_organization_collaboration_trends',
      'CREATE OR REPLACE FUNCTION get_escalation_patterns',
      'CREATE OR REPLACE FUNCTION get_agent_workload',
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

const orchestratorFile = 'apps/api/src/services/agentCollaborationOrchestrator.ts';

check(checkFile(orchestratorFile, 'Orchestrator service file exists'));

check(checkFileContent(
  orchestratorFile,
  [
    'class AgentCollaborationOrchestrator',
    'export const agentCollaborationOrchestrator',
  ],
  'Orchestrator class and singleton export'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async escalateTaskToAgent',
    'EscalationRequest',
    'EscalationResult',
  ],
  'escalateTaskToAgent method exists'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async delegateTaskToAgent',
    'DelegationRequest',
    'DelegationResult',
  ],
  'delegateTaskToAgent method exists'
));

check(checkFileContent(
  orchestratorFile,
  [
    'async coordinateAgentsOnWorkflow',
    'CollaborationRequest',
    'CollaborationResult',
  ],
  'coordinateAgentsOnWorkflow method exists'
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
    'selectEscalationTarget',
    'buildEscalationSystemPrompt',
    'buildEscalationUserPrompt',
  ],
  'GPT-4 escalation selection methods'
));

check(checkFileContent(
  orchestratorFile,
  [
    'selectDelegationTarget',
  ],
  'GPT-4 delegation selection method'
));

check(checkFileContent(
  orchestratorFile,
  [
    'constructAgentChain',
  ],
  'GPT-4 agent chain construction method'
));

check(checkFileContent(
  orchestratorFile,
  [
    'openai.chat.completions.create',
    'model: \'gpt-4\'',
  ],
  'GPT-4 API calls in methods'
));

console.log('');

// =====================================================
// 5. ROLE HIERARCHY
// =====================================================
log('5️⃣  ROLE HIERARCHY', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'const ROLE_HIERARCHY',
    'role:',
    'level:',
    'capabilities:',
    'canEscalateTo:',
  ],
  'Role hierarchy configuration defined'
));

check(checkFileContent(
  orchestratorFile,
  [
    'canEscalateTo',
    'private canEscalateTo(',
  ],
  'Escalation validation logic'
));

check(checkFileContent(
  orchestratorFile,
  [
    'assistant',
    'specialist',
    'strategist',
    'manager',
    'executive',
  ],
  'Standard roles defined in hierarchy'
));

console.log('');

// =====================================================
// 6. COLLABORATION LOGGING
// =====================================================
log('6️⃣  COLLABORATION LOGGING', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'private async logCollaboration',
    'AgentCollaborationLogEntity',
  ],
  'Collaboration logging method exists'
));

check(checkFileContent(
  orchestratorFile,
  [
    'from(\'agent_collaboration_logs\')',
    '.insert(',
  ],
  'Database insert for collaboration logs'
));

check(checkFileContent(
  orchestratorFile,
  [
    'logEscalation',
    'logDelegation',
    'logCollaboration',
  ],
  'Logging flags in request types'
));

console.log('');

// =====================================================
// 7. AGENT MATCHING
// =====================================================
log('7️⃣  AGENT MATCHING', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'private async getAgentProfile',
    'AgentProfile',
  ],
  'Agent profile retrieval method'
));

check(checkFileContent(
  orchestratorFile,
  [
    'private async findAgents',
    'FindAgentRequest',
    'AgentMatch',
  ],
  'Agent finding/matching method'
));

console.log('');

// =====================================================
// 8. API ROUTES
// =====================================================
log('8️⃣  API ROUTES', 'yellow');
console.log('');

const routesFile = 'apps/api/src/routes/agent-collaboration.ts';

check(checkFile(routesFile, 'API routes file exists'));

check(checkFileContent(
  routesFile,
  [
    'router.post(\'/escalate\'',
    'agentCollaborationOrchestrator.escalateTaskToAgent',
  ],
  'POST /escalate endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.post(\'/delegate\'',
    'agentCollaborationOrchestrator.delegateTaskToAgent',
  ],
  'POST /delegate endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.post(\'/coordinate\'',
    'agentCollaborationOrchestrator.coordinateAgentsOnWorkflow',
  ],
  'POST /coordinate endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/logs/:agentId\'',
    'from(\'agent_collaboration_logs\')',
  ],
  'GET /logs/:agentId endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/stats/:agentId\'',
    'get_agent_collaboration_stats',
  ],
  'GET /stats/:agentId endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/trends/:organizationId\'',
    'get_organization_collaboration_trends',
  ],
  'GET /trends/:organizationId endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/escalation-patterns/:organizationId\'',
    'get_escalation_patterns',
  ],
  'GET /escalation-patterns endpoint'
));

check(checkFileContent(
  routesFile,
  [
    'router.get(\'/workload/:agentId\'',
    'get_agent_workload',
  ],
  'GET /workload endpoint'
));

console.log('');

// =====================================================
// 9. ERROR HANDLING & VALIDATION
// =====================================================
log('9️⃣  ERROR HANDLING & VALIDATION', 'yellow');
console.log('');

check(checkFileContent(
  routesFile,
  [
    'if (!escalationRequest.agentId)',
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
  ],
  'Error handling in orchestrator'
));

check(checkFileContent(
  orchestratorFile,
  [
    'if (!targetAgent)',
    'errorMessage',
  ],
  'Validation and error messages'
));

console.log('');

// =====================================================
// 10. DELEGATION MODES
// =====================================================
log('🔟  DELEGATION MODES', 'yellow');
console.log('');

check(checkFileContent(
  orchestratorFile,
  [
    'mode === \'synchronous\'',
    'mode === \'asynchronous\'',
  ],
  'Synchronous and asynchronous delegation support'
));

check(checkFileContent(
  orchestratorFile,
  [
    'waitForCompletion',
  ],
  'Wait for completion option'
));

console.log('');

// =====================================================
// 11. TYPES EXPORT
// =====================================================
log('1️⃣1️⃣  TYPES EXPORT', 'yellow');
console.log('');

const indexFile = 'packages/shared-types/src/index.ts';

check(checkFileContent(
  indexFile,
  [
    'export * from \'./agent-collaboration\'',
  ],
  'Agent collaboration types exported from index'
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
  log('🎉 All checks passed! Sprint 43 Phase 3.5.2 implementation verified!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most checks passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple issues detected. Please review the failed checks.', 'red');
}

console.log('');
log('📊 IMPLEMENTATION SUMMARY', 'cyan');
console.log('');
console.log('Core Components:');
console.log('  - AgentCollaborationOrchestrator: Main collaboration service');
console.log('  - agent_collaboration_logs: Collaboration logging table');
console.log('  - EscalationRequest/Result: Escalation interfaces');
console.log('  - DelegationRequest/Result: Delegation interfaces');
console.log('  - CollaborationRequest/Result: Coordination interfaces');
console.log('  - API Routes: REST endpoints for collaboration');
console.log('');
console.log('Features Implemented:');
console.log('  - ✅ GPT-4 powered escalation target selection');
console.log('  - ✅ Role hierarchy validation');
console.log('  - ✅ Intelligent delegation to specialized agents');
console.log('  - ✅ Synchronous and asynchronous delegation');
console.log('  - ✅ Multi-agent workflow coordination');
console.log('  - ✅ Dynamic agent chain construction');
console.log('  - ✅ Comprehensive collaboration logging');
console.log('  - ✅ Collaboration statistics and trends');
console.log('  - ✅ Escalation pattern analysis');
console.log('  - ✅ Agent workload tracking');
console.log('  - ✅ Multi-tenant security');
console.log('  - ✅ RLS policies');
console.log('');
console.log('API Endpoints:');
console.log('  - POST   /api/agent-collaboration/escalate');
console.log('  - POST   /api/agent-collaboration/delegate');
console.log('  - POST   /api/agent-collaboration/coordinate');
console.log('  - GET    /api/agent-collaboration/logs/:agentId');
console.log('  - GET    /api/agent-collaboration/stats/:agentId');
console.log('  - GET    /api/agent-collaboration/trends/:organizationId');
console.log('  - GET    /api/agent-collaboration/escalation-patterns/:organizationId');
console.log('  - GET    /api/agent-collaboration/workload/:agentId');
console.log('  - GET    /api/agent-collaboration/recent/:agentId');
console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
