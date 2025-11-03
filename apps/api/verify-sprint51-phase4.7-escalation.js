#!/usr/bin/env node

/**
 * Sprint 51 Phase 4.7 Verification Script
 * Advanced Escalation Logic & Multi-Agent Handoff System
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passCount = 0;
let failCount = 0;
const failures = [];

function pass(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
  passCount++;
}

function fail(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  failures.push(message);
  failCount++;
}

function section(title) {
  console.log(`\n${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    pass(`${description} exists`);
    return true;
  } else {
    fail(`${description} is missing: ${filePath}`);
    return false;
  }
}

function checkFileContains(filePath, searchString, description) {
  if (!fs.existsSync(filePath)) {
    fail(`Cannot check content - file missing: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const contains = content.includes(searchString);

  if (contains) {
    pass(description);
    return true;
  } else {
    fail(description);
    return false;
  }
}

// =====================================================
// FILE PATHS
// =====================================================

const ROOT = path.join(__dirname, '../..');
const PACKAGES = path.join(ROOT, 'packages');
const APPS = path.join(ROOT, 'apps');

const TYPES_FILE = path.join(PACKAGES, 'shared-types/src/agent-escalation.ts');
const TYPES_INDEX = path.join(PACKAGES, 'shared-types/src/index.ts');
const MIGRATION_FILE = path.join(
  APPS,
  'api/src/database/migrations/20251109_create_agent_escalation_chains.sql'
);
const SERVICE_FILE = path.join(APPS, 'api/src/services/agentEscalationOrchestrator.ts');
const ROUTES_FILE = path.join(APPS, 'api/src/routes/agent-escalation.ts');
const ROUTES_INDEX = path.join(APPS, 'api/src/routes/index.ts');

console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.blue}║  Sprint 51 Phase 4.7 Verification (Escalation)        ║${colors.reset}`);
console.log(`${colors.blue}║  Advanced Escalation Logic & Multi-Agent Handoff       ║${colors.reset}`);
console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

// =====================================================
// 1. FILE EXISTENCE CHECKS
// =====================================================

section('1. File Existence');

checkFileExists(TYPES_FILE, 'TypeScript types file (agent-escalation.ts)');
checkFileExists(MIGRATION_FILE, 'Database migration file');
checkFileExists(SERVICE_FILE, 'Service file (agentEscalationOrchestrator.ts)');
checkFileExists(ROUTES_FILE, 'API routes file (agent-escalation.ts)');

// =====================================================
// 2. TYPESCRIPT TYPES VERIFICATION
// =====================================================

section('2. TypeScript Types (agent-escalation.ts)');

// Enums
checkFileContains(TYPES_FILE, 'export enum EscalationType', 'EscalationType enum exported');
checkFileContains(TYPES_FILE, 'SKILL_BASED', 'EscalationType.SKILL_BASED');
checkFileContains(TYPES_FILE, 'ROLE_BASED', 'EscalationType.ROLE_BASED');
checkFileContains(TYPES_FILE, 'LAST_SUCCESSFUL', 'EscalationType.LAST_SUCCESSFUL');
checkFileContains(TYPES_FILE, 'DEFAULT_CHAIN', 'EscalationType.DEFAULT_CHAIN');
checkFileContains(TYPES_FILE, 'MANUAL', 'EscalationType.MANUAL');
checkFileContains(TYPES_FILE, 'CONFIDENCE_THRESHOLD', 'EscalationType.CONFIDENCE_THRESHOLD');

checkFileContains(TYPES_FILE, 'export enum EscalationReason', 'EscalationReason enum exported');
checkFileContains(TYPES_FILE, 'LOW_CONFIDENCE', 'EscalationReason.LOW_CONFIDENCE');
checkFileContains(TYPES_FILE, 'MISSING_SKILL', 'EscalationReason.MISSING_SKILL');
checkFileContains(TYPES_FILE, 'COMPLEXITY_THRESHOLD', 'EscalationReason.COMPLEXITY_THRESHOLD');
checkFileContains(TYPES_FILE, 'ERROR_OCCURRED', 'EscalationReason.ERROR_OCCURRED');
checkFileContains(TYPES_FILE, 'TIMEOUT', 'EscalationReason.TIMEOUT');

checkFileContains(TYPES_FILE, 'export enum EscalationOutcome', 'EscalationOutcome enum exported');
checkFileContains(TYPES_FILE, 'SUCCESS', 'EscalationOutcome.SUCCESS');
checkFileContains(TYPES_FILE, 'FAILED', 'EscalationOutcome.FAILED');
checkFileContains(TYPES_FILE, 'NO_AGENT_AVAILABLE', 'EscalationOutcome.NO_AGENT_AVAILABLE');
checkFileContains(TYPES_FILE, 'REJECTED', 'EscalationOutcome.REJECTED');

checkFileContains(TYPES_FILE, 'export enum HandoffMethod', 'HandoffMethod enum exported');
checkFileContains(TYPES_FILE, 'DIRECT', 'HandoffMethod.DIRECT');
checkFileContains(TYPES_FILE, 'SKILL_MATCH', 'HandoffMethod.SKILL_MATCH');
checkFileContains(TYPES_FILE, 'ROLE_PRIORITY', 'HandoffMethod.ROLE_PRIORITY');
checkFileContains(TYPES_FILE, 'LAST_SUCCESSFUL', 'HandoffMethod.LAST_SUCCESSFUL');

checkFileContains(TYPES_FILE, 'export enum EscalationPathType', 'EscalationPathType enum exported');
checkFileContains(TYPES_FILE, 'SEQUENTIAL', 'EscalationPathType.SEQUENTIAL');
checkFileContains(TYPES_FILE, 'PARALLEL', 'EscalationPathType.PARALLEL');
checkFileContains(TYPES_FILE, 'CONDITIONAL', 'EscalationPathType.CONDITIONAL');

checkFileContains(TYPES_FILE, 'export enum FallbackStrategy', 'FallbackStrategy enum exported');
checkFileContains(TYPES_FILE, 'RETRY_DEFAULT', 'FallbackStrategy.RETRY_DEFAULT');
checkFileContains(TYPES_FILE, 'RETURN_TO_USER', 'FallbackStrategy.RETURN_TO_USER');
checkFileContains(TYPES_FILE, 'ESCALATE_TO_HUMAN', 'FallbackStrategy.ESCALATE_TO_HUMAN');
checkFileContains(TYPES_FILE, 'USE_LAST_SUCCESSFUL', 'FallbackStrategy.USE_LAST_SUCCESSFUL');

// Core Interfaces
checkFileContains(TYPES_FILE, 'export interface EscalateTaskInput', 'EscalateTaskInput interface');
checkFileContains(TYPES_FILE, 'export interface EscalationResult', 'EscalationResult interface');
checkFileContains(TYPES_FILE, 'export interface HandoffToAgentInput', 'HandoffToAgentInput interface');
checkFileContains(TYPES_FILE, 'export interface HandoffResult', 'HandoffResult interface');
checkFileContains(TYPES_FILE, 'export interface FallbackToDefaultInput', 'FallbackToDefaultInput interface');
checkFileContains(TYPES_FILE, 'export interface EscalationFallbackResult', 'EscalationFallbackResult interface');
checkFileContains(TYPES_FILE, 'export interface EscalationPath', 'EscalationPath interface');
checkFileContains(TYPES_FILE, 'export interface EscalationPathStep', 'EscalationPathStep interface');
checkFileContains(TYPES_FILE, 'export interface EscalationLog', 'EscalationLog interface');
checkFileContains(TYPES_FILE, 'export interface EscalationHistoryQuery', 'EscalationHistoryQuery interface');
checkFileContains(TYPES_FILE, 'export interface EscalationMetrics', 'EscalationMetrics interface');
checkFileContains(TYPES_FILE, 'export interface EscalationTrend', 'EscalationTrend interface');
checkFileContains(TYPES_FILE, 'export interface EscalationPathPerformance', 'EscalationPathPerformance interface');
checkFileContains(TYPES_FILE, 'export interface AgentHandoffStats', 'AgentHandoffStats interface');
checkFileContains(TYPES_FILE, 'export interface AgentAvailability', 'AgentAvailability interface');
checkFileContains(TYPES_FILE, 'export interface AgentSelectionCriteria', 'AgentSelectionCriteria interface');

// EscalationResult fields
checkFileContains(TYPES_FILE, 'success: boolean', 'EscalationResult.success');
checkFileContains(TYPES_FILE, 'nextAgent?: string', 'EscalationResult.nextAgent');
checkFileContains(TYPES_FILE, 'method: HandoffMethod', 'EscalationResult.method');
checkFileContains(TYPES_FILE, 'escalationType: EscalationType', 'EscalationResult.escalationType');
checkFileContains(TYPES_FILE, 'outcome: EscalationOutcome', 'EscalationResult.outcome');
checkFileContains(TYPES_FILE, 'attemptedAgents: string[]', 'EscalationResult.attemptedAgents');
checkFileContains(TYPES_FILE, 'failedAttempts:', 'EscalationResult.failedAttempts');

// HandoffResult fields
checkFileContains(TYPES_FILE, 'fromAgent: string', 'HandoffResult.fromAgent');
checkFileContains(TYPES_FILE, 'toAgent: string', 'HandoffResult.toAgent');
checkFileContains(TYPES_FILE, 'handoffId: string', 'HandoffResult.handoffId');
checkFileContains(TYPES_FILE, 'contextTransferred: boolean', 'HandoffResult.contextTransferred');
checkFileContains(TYPES_FILE, 'memoryPreserved: boolean', 'HandoffResult.memoryPreserved');

// Check export in index
checkFileContains(TYPES_INDEX, "export * from './agent-escalation'", 'agent-escalation exported in index');

// =====================================================
// 3. DATABASE MIGRATION VERIFICATION
// =====================================================

section('3. Database Migration');

// Enums
checkFileContains(MIGRATION_FILE, 'CREATE TYPE escalation_type AS ENUM', 'escalation_type enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE escalation_reason AS ENUM', 'escalation_reason enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE escalation_outcome AS ENUM', 'escalation_outcome enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE handoff_method AS ENUM', 'handoff_method enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE escalation_path_type AS ENUM', 'escalation_path_type enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE fallback_strategy AS ENUM', 'fallback_strategy enum');

// Tables
checkFileContains(MIGRATION_FILE, 'CREATE TABLE agent_escalation_logs', 'agent_escalation_logs table');
checkFileContains(MIGRATION_FILE, 'CREATE TABLE agent_escalation_paths', 'agent_escalation_paths table');

// agent_escalation_logs columns
checkFileContains(MIGRATION_FILE, 'from_agent_id UUID NOT NULL', 'agent_escalation_logs.from_agent_id');
checkFileContains(MIGRATION_FILE, 'to_agent_id UUID', 'agent_escalation_logs.to_agent_id');
checkFileContains(MIGRATION_FILE, 'escalation_type escalation_type', 'agent_escalation_logs.escalation_type');
checkFileContains(MIGRATION_FILE, 'reason escalation_reason', 'agent_escalation_logs.reason');
checkFileContains(MIGRATION_FILE, 'outcome escalation_outcome', 'agent_escalation_logs.outcome');
checkFileContains(MIGRATION_FILE, 'method handoff_method', 'agent_escalation_logs.method');
checkFileContains(MIGRATION_FILE, 'attempted_agents UUID[]', 'agent_escalation_logs.attempted_agents');
checkFileContains(MIGRATION_FILE, 'path TEXT', 'agent_escalation_logs.path');

// agent_escalation_paths columns
checkFileContains(MIGRATION_FILE, 'path_type escalation_path_type', 'agent_escalation_paths.path_type');
checkFileContains(MIGRATION_FILE, 'steps JSONB', 'agent_escalation_paths.steps');
checkFileContains(MIGRATION_FILE, 'trigger_conditions JSONB', 'agent_escalation_paths.trigger_conditions');
checkFileContains(MIGRATION_FILE, 'is_default BOOLEAN', 'agent_escalation_paths.is_default');
checkFileContains(MIGRATION_FILE, 'priority INTEGER', 'agent_escalation_paths.priority');

// Indexes
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_escalation_logs_from_agent', 'idx_escalation_logs_from_agent index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_escalation_logs_to_agent', 'idx_escalation_logs_to_agent index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_escalation_logs_attempted', 'idx_escalation_logs_attempted GIN index');
checkFileContains(MIGRATION_FILE, 'USING GIN(attempted_agents)', 'GIN index on attempted_agents array');
checkFileContains(MIGRATION_FILE, 'USING GIN(steps)', 'GIN index on steps JSONB');

// Helper Functions
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_escalation_metrics', 'get_escalation_metrics function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_escalation_trends', 'get_escalation_trends function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_escalation_path_performance', 'get_escalation_path_performance function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_agent_handoff_stats', 'get_agent_handoff_stats function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_escalation_history', 'get_escalation_history function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_escalation_paths', 'get_escalation_paths function');

// RLS Policies
checkFileContains(MIGRATION_FILE, 'ALTER TABLE agent_escalation_logs ENABLE ROW LEVEL SECURITY', 'RLS enabled on agent_escalation_logs');
checkFileContains(MIGRATION_FILE, 'ALTER TABLE agent_escalation_paths ENABLE ROW LEVEL SECURITY', 'RLS enabled on agent_escalation_paths');
checkFileContains(MIGRATION_FILE, 'CREATE POLICY escalation_logs_org_isolation', 'RLS policy for escalation_logs');
checkFileContains(MIGRATION_FILE, 'CREATE POLICY escalation_paths_org_isolation', 'RLS policy for escalation_paths');

// Triggers
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION update_escalation_updated_at', 'update_escalation_updated_at trigger function');
checkFileContains(MIGRATION_FILE, 'CREATE TRIGGER escalation_paths_updated_at', 'escalation_paths updated_at trigger');

// =====================================================
// 4. SERVICE VERIFICATION
// =====================================================

section('4. Service (agentEscalationOrchestrator.ts)');

// Class and methods
checkFileContains(SERVICE_FILE, 'class AgentEscalationOrchestrator', 'AgentEscalationOrchestrator class');
checkFileContains(SERVICE_FILE, 'async escalateTask', 'escalateTask method');
checkFileContains(SERVICE_FILE, 'async handoffToAgent', 'handoffToAgent method');
checkFileContains(SERVICE_FILE, 'async fallbackToDefault', 'fallbackToDefault method');
checkFileContains(SERVICE_FILE, 'async getEscalationHistory', 'getEscalationHistory method');
checkFileContains(SERVICE_FILE, 'async getEscalationMetrics', 'getEscalationMetrics method');
checkFileContains(SERVICE_FILE, 'async getEscalationTrends', 'getEscalationTrends method');
checkFileContains(SERVICE_FILE, 'async getEscalationPathPerformance', 'getEscalationPathPerformance method');
checkFileContains(SERVICE_FILE, 'async getAgentHandoffStats', 'getAgentHandoffStats method');

// Helper methods
checkFileContains(SERVICE_FILE, 'findEscalationPath', 'findEscalationPath helper method');
checkFileContains(SERVICE_FILE, 'executeEscalationPath', 'executeEscalationPath helper method');
checkFileContains(SERVICE_FILE, 'findAgentForStep', 'findAgentForStep helper method');
checkFileContains(SERVICE_FILE, 'findBestAgent', 'findBestAgent helper method');
checkFileContains(SERVICE_FILE, 'checkAgentAvailability', 'checkAgentAvailability helper method');
checkFileContains(SERVICE_FILE, 'transferContext', 'transferContext helper method');
checkFileContains(SERVICE_FILE, 'transferMemory', 'transferMemory helper method');
checkFileContains(SERVICE_FILE, 'logEscalation', 'logEscalation helper method');

// Escalation logic
checkFileContains(SERVICE_FILE, 'attemptedAgents', 'Attempted agents tracking');
checkFileContains(SERVICE_FILE, 'failedAttempts', 'Failed attempts tracking');
checkFileContains(SERVICE_FILE, 'escalationPath', 'Escalation path usage');
checkFileContains(SERVICE_FILE, 'nextAgent', 'Next agent selection');

// Handoff logic
checkFileContains(SERVICE_FILE, 'contextTransferred', 'Context transfer tracking');
checkFileContains(SERVICE_FILE, 'memoryPreserved', 'Memory preservation tracking');
checkFileContains(SERVICE_FILE, 'handoffId', 'Handoff ID generation');
checkFileContains(SERVICE_FILE, 'turnNote', 'Turn note for handoff');

// Fallback logic
checkFileContains(SERVICE_FILE, 'getDefaultEscalationPath', 'Default path retrieval');
checkFileContains(SERVICE_FILE, 'findLastSuccessfulAgent', 'Last successful agent finding');
checkFileContains(SERVICE_FILE, 'buildFallbackMessage', 'Fallback message building');
checkFileContains(SERVICE_FILE, 'buildFallbackSuggestions', 'Fallback suggestions building');

// Database Operations
checkFileContains(SERVICE_FILE, "from '../database/client'", 'Database client import');
checkFileContains(SERVICE_FILE, 'db.query', 'Database query usage');
checkFileContains(SERVICE_FILE, 'INSERT INTO agent_escalation_logs', 'Insert escalation log');
checkFileContains(SERVICE_FILE, 'SELECT * FROM get_escalation_metrics', 'Call get_escalation_metrics function');
checkFileContains(SERVICE_FILE, 'SELECT * FROM get_escalation_history', 'Call get_escalation_history function');

// Type Imports
checkFileContains(SERVICE_FILE, 'EscalateTaskInput', 'EscalateTaskInput type import');
checkFileContains(SERVICE_FILE, 'EscalationResult', 'EscalationResult type import');
checkFileContains(SERVICE_FILE, 'HandoffToAgentInput', 'HandoffToAgentInput type import');
checkFileContains(SERVICE_FILE, 'HandoffResult', 'HandoffResult type import');
checkFileContains(SERVICE_FILE, 'FallbackToDefaultInput', 'FallbackToDefaultInput type import');
checkFileContains(SERVICE_FILE, 'EscalationFallbackResult', 'EscalationFallbackResult type import');

// Singleton export
checkFileContains(SERVICE_FILE, 'export const agentEscalationOrchestrator', 'Singleton export');
checkFileContains(SERVICE_FILE, 'new AgentEscalationOrchestrator()', 'Singleton instantiation');

// =====================================================
// 5. API ROUTES VERIFICATION
// =====================================================

section('5. API Routes (agent-escalation.ts)');

// Route definitions
checkFileContains(ROUTES_FILE, "router.post('/escalate'", 'POST /escalate route');
checkFileContains(ROUTES_FILE, "router.post('/handoff'", 'POST /handoff route');
checkFileContains(ROUTES_FILE, "router.post('/fallback'", 'POST /fallback route');
checkFileContains(ROUTES_FILE, "router.get('/history/:agentId'", 'GET /history/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/metrics/:agentId'", 'GET /metrics/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/trends/:agentId'", 'GET /trends/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/path-performance'", 'GET /path-performance route');
checkFileContains(ROUTES_FILE, "router.get('/handoff-stats/:agentId'", 'GET /handoff-stats/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/health'", 'GET /health route');

// Service imports
checkFileContains(ROUTES_FILE, "from '../services/agentEscalationOrchestrator'", 'Service import');
checkFileContains(ROUTES_FILE, 'agentEscalationOrchestrator.escalateTask', 'escalateTask service call');
checkFileContains(ROUTES_FILE, 'agentEscalationOrchestrator.handoffToAgent', 'handoffToAgent service call');
checkFileContains(ROUTES_FILE, 'agentEscalationOrchestrator.fallbackToDefault', 'fallbackToDefault service call');
checkFileContains(ROUTES_FILE, 'agentEscalationOrchestrator.getEscalationHistory', 'getEscalationHistory service call');
checkFileContains(ROUTES_FILE, 'agentEscalationOrchestrator.getEscalationMetrics', 'getEscalationMetrics service call');

// Validation
checkFileContains(ROUTES_FILE, "return res.status(400)", 'Input validation with 400 status');
checkFileContains(ROUTES_FILE, 'Missing required fields', 'Validation error messages');

// Error handling
checkFileContains(ROUTES_FILE, 'catch (error: any)', 'Error handling');
checkFileContains(ROUTES_FILE, "res.status(500)", 'Error response with 500 status');

// Type imports
checkFileContains(ROUTES_FILE, 'EscalateTaskInput', 'EscalateTaskInput type import');
checkFileContains(ROUTES_FILE, 'HandoffToAgentInput', 'HandoffToAgentInput type import');
checkFileContains(ROUTES_FILE, 'FallbackToDefaultInput', 'FallbackToDefaultInput type import');
checkFileContains(ROUTES_FILE, 'EscalationHistoryQuery', 'EscalationHistoryQuery type import');

// Export
checkFileContains(ROUTES_FILE, 'export default router', 'Router export');

// Check routes index registration
checkFileContains(ROUTES_INDEX, "import agentEscalationRoutes from './agent-escalation'", 'Routes import in index');
checkFileContains(ROUTES_INDEX, "router.use('/agent-escalation', agentEscalationRoutes)", 'Routes registration in index');

// =====================================================
// SUMMARY
// =====================================================

console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.blue}║  Verification Summary                                  ║${colors.reset}`);
console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

const total = passCount + failCount;
const percentage = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

console.log(`Total Checks: ${total}`);
console.log(
  `${colors.green}Passed: ${passCount}${colors.reset} | ${colors.red}Failed: ${failCount}${colors.reset}`
);
console.log(`Success Rate: ${percentage}%\n`);

if (failCount > 0) {
  console.log(`${colors.red}Failed Checks:${colors.reset}`);
  failures.forEach((failure, index) => {
    console.log(`  ${index + 1}. ${failure}`);
  });
  console.log('');
  process.exit(1);
} else {
  console.log(
    `${colors.green}🎉 All checks passed! Sprint 51 Phase 4.7 (Escalation) is complete.${colors.reset}\n`
  );
  process.exit(0);
}
