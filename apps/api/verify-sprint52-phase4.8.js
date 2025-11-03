#!/usr/bin/env node

/**
 * Sprint 52 Phase 4.8 Verification Script
 * Agent Arbitration Engine & Conflict Resolution Protocols
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

const TYPES_FILE = path.join(PACKAGES, 'shared-types/src/agent-arbitration.ts');
const TYPES_INDEX = path.join(PACKAGES, 'shared-types/src/index.ts');
const MIGRATION_FILE = path.join(
  APPS,
  'api/src/database/migrations/20251110_create_agent_conflict_resolution.sql'
);
const SERVICE_FILE = path.join(APPS, 'api/src/services/agentArbitrationEngine.ts');
const ROUTES_FILE = path.join(APPS, 'api/src/routes/agent-arbitration.ts');
const ROUTES_INDEX = path.join(APPS, 'api/src/routes/index.ts');

console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.blue}║  Sprint 52 Phase 4.8 Verification                     ║${colors.reset}`);
console.log(`${colors.blue}║  Agent Arbitration Engine & Conflict Resolution        ║${colors.reset}`);
console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

// =====================================================
// 1. FILE EXISTENCE CHECKS
// =====================================================

section('1. File Existence');

checkFileExists(TYPES_FILE, 'TypeScript types file (agent-arbitration.ts)');
checkFileExists(MIGRATION_FILE, 'Database migration file');
checkFileExists(SERVICE_FILE, 'Service file (agentArbitrationEngine.ts)');
checkFileExists(ROUTES_FILE, 'API routes file (agent-arbitration.ts)');

// =====================================================
// 2. TYPESCRIPT TYPES VERIFICATION
// =====================================================

section('2. TypeScript Types (agent-arbitration.ts)');

// Enums
checkFileContains(TYPES_FILE, 'export enum ArbitrationStrategy', 'ArbitrationStrategy enum exported');
checkFileContains(TYPES_FILE, 'MAJORITY_VOTE', 'ArbitrationStrategy.MAJORITY_VOTE');
checkFileContains(TYPES_FILE, 'CONFIDENCE_WEIGHTED', 'ArbitrationStrategy.CONFIDENCE_WEIGHTED');
checkFileContains(TYPES_FILE, 'ESCALATE_TO_FACILITATOR', 'ArbitrationStrategy.ESCALATE_TO_FACILITATOR');
checkFileContains(TYPES_FILE, 'DEFER_TO_EXPERT', 'ArbitrationStrategy.DEFER_TO_EXPERT');
checkFileContains(TYPES_FILE, 'GPT4_MODERATED', 'ArbitrationStrategy.GPT4_MODERATED');
checkFileContains(TYPES_FILE, 'CONSENSUS_BUILDING', 'ArbitrationStrategy.CONSENSUS_BUILDING');

checkFileContains(TYPES_FILE, 'export enum ConflictType', 'ConflictType enum exported');
checkFileContains(TYPES_FILE, 'REASONING_MISMATCH', 'ConflictType.REASONING_MISMATCH');
checkFileContains(TYPES_FILE, 'TONE_DISAGREEMENT', 'ConflictType.TONE_DISAGREEMENT');
checkFileContains(TYPES_FILE, 'ACTION_CONFLICT', 'ConflictType.ACTION_CONFLICT');
checkFileContains(TYPES_FILE, 'ENTITY_EVALUATION', 'ConflictType.ENTITY_EVALUATION');
checkFileContains(TYPES_FILE, 'PRIORITY_CONFLICT', 'ConflictType.PRIORITY_CONFLICT');
checkFileContains(TYPES_FILE, 'FACTUAL_CONTRADICTION', 'ConflictType.FACTUAL_CONTRADICTION');

checkFileContains(TYPES_FILE, 'export enum ConflictSeverity', 'ConflictSeverity enum exported');
checkFileContains(TYPES_FILE, 'LOW', 'ConflictSeverity.LOW');
checkFileContains(TYPES_FILE, 'MEDIUM', 'ConflictSeverity.MEDIUM');
checkFileContains(TYPES_FILE, 'HIGH', 'ConflictSeverity.HIGH');
checkFileContains(TYPES_FILE, 'CRITICAL', 'ConflictSeverity.CRITICAL');

checkFileContains(TYPES_FILE, 'export enum ResolutionOutcomeType', 'ResolutionOutcomeType enum exported');
checkFileContains(TYPES_FILE, 'CONSENSUS_REACHED', 'ResolutionOutcomeType.CONSENSUS_REACHED');
checkFileContains(TYPES_FILE, 'MAJORITY_DECISION', 'ResolutionOutcomeType.MAJORITY_DECISION');
checkFileContains(TYPES_FILE, 'EXPERT_OVERRIDE', 'ResolutionOutcomeType.EXPERT_OVERRIDE');
checkFileContains(TYPES_FILE, 'ESCALATED', 'ResolutionOutcomeType.ESCALATED');
checkFileContains(TYPES_FILE, 'COMPROMISE', 'ResolutionOutcomeType.COMPROMISE');

checkFileContains(TYPES_FILE, 'export enum ConflictStatus', 'ConflictStatus enum exported');
checkFileContains(TYPES_FILE, 'DETECTED', 'ConflictStatus.DETECTED');
checkFileContains(TYPES_FILE, 'UNDER_REVIEW', 'ConflictStatus.UNDER_REVIEW');
checkFileContains(TYPES_FILE, 'RESOLVING', 'ConflictStatus.RESOLVING');
checkFileContains(TYPES_FILE, 'RESOLVED', 'ConflictStatus.RESOLVED');
checkFileContains(TYPES_FILE, 'EXPIRED', 'ConflictStatus.EXPIRED');

checkFileContains(TYPES_FILE, 'export enum ArbitratorRole', 'ArbitratorRole enum exported');
checkFileContains(TYPES_FILE, 'FACILITATOR', 'ArbitratorRole.FACILITATOR');
checkFileContains(TYPES_FILE, 'EXPERT', 'ArbitratorRole.EXPERT');
checkFileContains(TYPES_FILE, 'AI_MODERATOR', 'ArbitratorRole.AI_MODERATOR');

// Core Interfaces
checkFileContains(TYPES_FILE, 'export interface DetectConflictInput', 'DetectConflictInput interface');
checkFileContains(TYPES_FILE, 'export interface AgentOutput', 'AgentOutput interface');
checkFileContains(TYPES_FILE, 'export interface DetectedConflict', 'DetectedConflict interface');
checkFileContains(TYPES_FILE, 'export interface ConflictingAssertion', 'ConflictingAssertion interface');
checkFileContains(TYPES_FILE, 'export interface ConflictReport', 'ConflictReport interface');
checkFileContains(TYPES_FILE, 'export interface ResolveConflictInput', 'ResolveConflictInput interface');
checkFileContains(TYPES_FILE, 'export interface AgentTurn', 'AgentTurn interface');
checkFileContains(TYPES_FILE, 'export interface AgentMetric', 'AgentMetric interface');
checkFileContains(TYPES_FILE, 'export interface ResolutionOutcome', 'ResolutionOutcome interface');
checkFileContains(TYPES_FILE, 'export interface ArbitratorFeedback', 'ArbitratorFeedback interface');
checkFileContains(TYPES_FILE, 'export interface LogConflictResolutionInput', 'LogConflictResolutionInput interface');
checkFileContains(TYPES_FILE, 'export interface ResolutionProposal', 'ResolutionProposal interface');
checkFileContains(TYPES_FILE, 'export interface ConflictContext', 'ConflictContext interface');
checkFileContains(TYPES_FILE, 'export interface AgentConflictLog', 'AgentConflictLog interface');
checkFileContains(TYPES_FILE, 'export interface AgentResolutionOutcome', 'AgentResolutionOutcome interface');
checkFileContains(TYPES_FILE, 'export interface ConflictHistoryQuery', 'ConflictHistoryQuery interface');
checkFileContains(TYPES_FILE, 'export interface ResolutionOutcomeQuery', 'ResolutionOutcomeQuery interface');
checkFileContains(TYPES_FILE, 'export interface ConflictMetrics', 'ConflictMetrics interface');
checkFileContains(TYPES_FILE, 'export interface ConflictTrend', 'ConflictTrend interface');
checkFileContains(TYPES_FILE, 'export interface StrategyPerformance', 'StrategyPerformance interface');
checkFileContains(TYPES_FILE, 'export interface AgentConflictProfile', 'AgentConflictProfile interface');

// DetectedConflict fields
checkFileContains(TYPES_FILE, 'conflictId: string', 'DetectedConflict.conflictId');
checkFileContains(TYPES_FILE, 'type: ConflictType', 'DetectedConflict.type');
checkFileContains(TYPES_FILE, 'severity: ConflictSeverity', 'DetectedConflict.severity');
checkFileContains(TYPES_FILE, 'status: ConflictStatus', 'DetectedConflict.status');
checkFileContains(TYPES_FILE, 'involvedAgents: string[]', 'DetectedConflict.involvedAgents');
checkFileContains(TYPES_FILE, 'conflictingAssertions: ConflictingAssertion[]', 'DetectedConflict.conflictingAssertions');

// ResolutionOutcome fields
checkFileContains(TYPES_FILE, 'success: boolean', 'ResolutionOutcome.success');
checkFileContains(TYPES_FILE, 'outcomeType: ResolutionOutcomeType', 'ResolutionOutcome.outcomeType');
checkFileContains(TYPES_FILE, 'strategy: ArbitrationStrategy', 'ResolutionOutcome.strategy');
checkFileContains(TYPES_FILE, 'resolution: string', 'ResolutionOutcome.resolution');

// Check export in index
checkFileContains(TYPES_INDEX, "export * from './agent-arbitration'", 'agent-arbitration exported in index');

// =====================================================
// 3. DATABASE MIGRATION VERIFICATION
// =====================================================

section('3. Database Migration');

// Enums
checkFileContains(MIGRATION_FILE, 'CREATE TYPE arbitration_strategy AS ENUM', 'arbitration_strategy enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE conflict_type AS ENUM', 'conflict_type enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE conflict_severity AS ENUM', 'conflict_severity enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE resolution_outcome_type AS ENUM', 'resolution_outcome_type enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE conflict_status AS ENUM', 'conflict_status enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE arbitrator_role AS ENUM', 'arbitrator_role enum');

// Tables
checkFileContains(MIGRATION_FILE, 'CREATE TABLE agent_conflict_logs', 'agent_conflict_logs table');
checkFileContains(MIGRATION_FILE, 'CREATE TABLE agent_resolution_outcomes', 'agent_resolution_outcomes table');

// agent_conflict_logs columns
checkFileContains(MIGRATION_FILE, 'conflict_id VARCHAR', 'agent_conflict_logs.conflict_id');
checkFileContains(MIGRATION_FILE, 'agent_ids UUID[]', 'agent_conflict_logs.agent_ids');
checkFileContains(MIGRATION_FILE, 'conflict_type conflict_type', 'agent_conflict_logs.conflict_type');
checkFileContains(MIGRATION_FILE, 'severity conflict_severity', 'agent_conflict_logs.severity');
checkFileContains(MIGRATION_FILE, 'status conflict_status', 'agent_conflict_logs.status');
checkFileContains(MIGRATION_FILE, 'conflicting_assertions JSONB', 'agent_conflict_logs.conflicting_assertions');
checkFileContains(MIGRATION_FILE, 'expires_at TIMESTAMP', 'agent_conflict_logs.expires_at');

// agent_resolution_outcomes columns
checkFileContains(MIGRATION_FILE, 'outcome_type resolution_outcome_type', 'agent_resolution_outcomes.outcome_type');
checkFileContains(MIGRATION_FILE, 'strategy arbitration_strategy', 'agent_resolution_outcomes.strategy');
checkFileContains(MIGRATION_FILE, 'resolution TEXT', 'agent_resolution_outcomes.resolution');
checkFileContains(MIGRATION_FILE, 'chosen_agent UUID', 'agent_resolution_outcomes.chosen_agent');
checkFileContains(MIGRATION_FILE, 'consensus JSONB', 'agent_resolution_outcomes.consensus');
checkFileContains(MIGRATION_FILE, 'votes JSONB', 'agent_resolution_outcomes.votes');
checkFileContains(MIGRATION_FILE, 'rounds_required INTEGER', 'agent_resolution_outcomes.rounds_required');

// Indexes
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_conflict_logs_agents', 'idx_conflict_logs_agents GIN index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_conflict_logs_type', 'idx_conflict_logs_type index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_conflict_logs_severity', 'idx_conflict_logs_severity index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_conflict_logs_status', 'idx_conflict_logs_status index');
checkFileContains(MIGRATION_FILE, 'USING GIN(agent_ids)', 'GIN index on agent_ids array');
checkFileContains(MIGRATION_FILE, 'USING GIN(conflicting_assertions)', 'GIN index on conflicting_assertions JSONB');

// Helper Functions
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_conflict_metrics', 'get_conflict_metrics function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_conflict_trends', 'get_conflict_trends function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_strategy_performance', 'get_strategy_performance function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_agent_conflict_profile', 'get_agent_conflict_profile function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_conflict_history', 'get_conflict_history function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_resolution_outcomes', 'get_resolution_outcomes function');

// RLS Policies
checkFileContains(MIGRATION_FILE, 'ALTER TABLE agent_conflict_logs ENABLE ROW LEVEL SECURITY', 'RLS enabled on agent_conflict_logs');
checkFileContains(MIGRATION_FILE, 'ALTER TABLE agent_resolution_outcomes ENABLE ROW LEVEL SECURITY', 'RLS enabled on agent_resolution_outcomes');
checkFileContains(MIGRATION_FILE, 'CREATE POLICY conflict_logs_org_isolation', 'RLS policy for conflict_logs');
checkFileContains(MIGRATION_FILE, 'CREATE POLICY resolution_outcomes_org_isolation', 'RLS policy for resolution_outcomes');

// Triggers
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION cleanup_expired_conflicts', 'cleanup_expired_conflicts trigger function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION update_conflict_resolved_at', 'update_conflict_resolved_at trigger function');
checkFileContains(MIGRATION_FILE, 'CREATE TRIGGER cleanup_expired_conflicts_trigger', 'cleanup_expired_conflicts trigger');
checkFileContains(MIGRATION_FILE, 'CREATE TRIGGER conflict_resolved_at_trigger', 'conflict_resolved_at trigger');

// =====================================================
// 4. SERVICE VERIFICATION
// =====================================================

section('4. Service (agentArbitrationEngine.ts)');

// Class and methods
checkFileContains(SERVICE_FILE, 'class AgentArbitrationEngine', 'AgentArbitrationEngine class');
checkFileContains(SERVICE_FILE, 'async detectConflictBetweenAgents', 'detectConflictBetweenAgents method');
checkFileContains(SERVICE_FILE, 'async resolveAgentConflict', 'resolveAgentConflict method');
checkFileContains(SERVICE_FILE, 'async logConflictResolution', 'logConflictResolution method');
checkFileContains(SERVICE_FILE, 'async getConflictHistory', 'getConflictHistory method');
checkFileContains(SERVICE_FILE, 'async getResolutionOutcomes', 'getResolutionOutcomes method');
checkFileContains(SERVICE_FILE, 'async getConflictMetrics', 'getConflictMetrics method');
checkFileContains(SERVICE_FILE, 'async getConflictTrends', 'getConflictTrends method');
checkFileContains(SERVICE_FILE, 'async getStrategyPerformance', 'getStrategyPerformance method');
checkFileContains(SERVICE_FILE, 'async getAgentConflictProfile', 'getAgentConflictProfile method');

// AI Integration
checkFileContains(SERVICE_FILE, "from '../lib/openai'", 'OpenAI import');
checkFileContains(SERVICE_FILE, 'performAIConflictDetection', 'AI conflict detection method');
checkFileContains(SERVICE_FILE, "model: 'gpt-4'", 'GPT-4 model usage');
checkFileContains(SERVICE_FILE, 'openai.chat.completions.create', 'OpenAI API call');

// Resolution strategies
checkFileContains(SERVICE_FILE, 'resolveMajorityVote', 'Majority vote resolution');
checkFileContains(SERVICE_FILE, 'resolveConfidenceWeighted', 'Confidence weighted resolution');
checkFileContains(SERVICE_FILE, 'resolveDeferToExpert', 'Defer to expert resolution');
checkFileContains(SERVICE_FILE, 'resolveGPT4Moderated', 'GPT-4 moderated resolution');
checkFileContains(SERVICE_FILE, 'resolveEscalateToFacilitator', 'Escalate to facilitator resolution');
checkFileContains(SERVICE_FILE, 'resolveConsensusBuilding', 'Consensus building resolution');

// Conflict detection logic
checkFileContains(SERVICE_FILE, "case 'majority_vote'", 'Majority vote strategy case');
checkFileContains(SERVICE_FILE, "case 'confidence_weighted'", 'Confidence weighted strategy case');
checkFileContains(SERVICE_FILE, "case 'defer_to_expert'", 'Defer to expert strategy case');
checkFileContains(SERVICE_FILE, "case 'gpt4_moderated'", 'GPT-4 moderated strategy case');

// Database Operations
checkFileContains(SERVICE_FILE, "from '../database/client'", 'Database client import');
checkFileContains(SERVICE_FILE, 'db.query', 'Database query usage');
checkFileContains(SERVICE_FILE, 'INSERT INTO agent_conflict_logs', 'Insert conflict log');
checkFileContains(SERVICE_FILE, 'INSERT INTO agent_resolution_outcomes', 'Insert resolution outcome');
checkFileContains(SERVICE_FILE, 'SELECT * FROM get_conflict_metrics', 'Call get_conflict_metrics function');
checkFileContains(SERVICE_FILE, 'SELECT * FROM get_conflict_history', 'Call get_conflict_history function');

// Type Imports
checkFileContains(SERVICE_FILE, 'DetectConflictInput', 'DetectConflictInput type import');
checkFileContains(SERVICE_FILE, 'ConflictReport', 'ConflictReport type import');
checkFileContains(SERVICE_FILE, 'DetectedConflict', 'DetectedConflict type import');
checkFileContains(SERVICE_FILE, 'ResolveConflictInput', 'ResolveConflictInput type import');
checkFileContains(SERVICE_FILE, 'ResolutionOutcome', 'ResolutionOutcome type import');
checkFileContains(SERVICE_FILE, 'LogConflictResolutionInput', 'LogConflictResolutionInput type import');

// Singleton export
checkFileContains(SERVICE_FILE, 'export const agentArbitrationEngine', 'Singleton export');
checkFileContains(SERVICE_FILE, 'new AgentArbitrationEngine()', 'Singleton instantiation');

// =====================================================
// 5. API ROUTES VERIFICATION
// =====================================================

section('5. API Routes (agent-arbitration.ts)');

// Route definitions
checkFileContains(ROUTES_FILE, "router.post('/detect'", 'POST /detect route');
checkFileContains(ROUTES_FILE, "router.post('/resolve'", 'POST /resolve route');
checkFileContains(ROUTES_FILE, "router.post('/log'", 'POST /log route');
checkFileContains(ROUTES_FILE, "router.get('/conflicts/:agentId'", 'GET /conflicts/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/outcomes/:agentId'", 'GET /outcomes/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/metrics'", 'GET /metrics route');
checkFileContains(ROUTES_FILE, "router.get('/trends'", 'GET /trends route');
checkFileContains(ROUTES_FILE, "router.get('/strategy-performance'", 'GET /strategy-performance route');
checkFileContains(ROUTES_FILE, "router.get('/agent-profile/:agentId'", 'GET /agent-profile/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/health'", 'GET /health route');

// Service imports
checkFileContains(ROUTES_FILE, "from '../services/agentArbitrationEngine'", 'Service import');
checkFileContains(ROUTES_FILE, 'agentArbitrationEngine.detectConflictBetweenAgents', 'detectConflictBetweenAgents service call');
checkFileContains(ROUTES_FILE, 'agentArbitrationEngine.resolveAgentConflict', 'resolveAgentConflict service call');
checkFileContains(ROUTES_FILE, 'agentArbitrationEngine.logConflictResolution', 'logConflictResolution service call');
checkFileContains(ROUTES_FILE, 'agentArbitrationEngine.getConflictHistory', 'getConflictHistory service call');
checkFileContains(ROUTES_FILE, 'agentArbitrationEngine.getResolutionOutcomes', 'getResolutionOutcomes service call');
checkFileContains(ROUTES_FILE, 'agentArbitrationEngine.getConflictMetrics', 'getConflictMetrics service call');

// Validation
checkFileContains(ROUTES_FILE, "return res.status(400)", 'Input validation with 400 status');
checkFileContains(ROUTES_FILE, 'Invalid input', 'Validation error messages');

// Error handling
checkFileContains(ROUTES_FILE, 'catch (error: any)', 'Error handling');
checkFileContains(ROUTES_FILE, "res.status(500)", 'Error response with 500 status');

// Type imports
checkFileContains(ROUTES_FILE, 'DetectConflictInput', 'DetectConflictInput type import');
checkFileContains(ROUTES_FILE, 'ResolveConflictInput', 'ResolveConflictInput type import');
checkFileContains(ROUTES_FILE, 'LogConflictResolutionInput', 'LogConflictResolutionInput type import');
checkFileContains(ROUTES_FILE, 'ConflictHistoryQuery', 'ConflictHistoryQuery type import');
checkFileContains(ROUTES_FILE, 'ResolutionOutcomeQuery', 'ResolutionOutcomeQuery type import');

// Export
checkFileContains(ROUTES_FILE, 'export default router', 'Router export');

// Check routes index registration
checkFileContains(ROUTES_INDEX, "import agentArbitrationRoutes from './agent-arbitration'", 'Routes import in index');
checkFileContains(ROUTES_INDEX, "router.use('/agent-arbitration', agentArbitrationRoutes)", 'Routes registration in index');

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
    `${colors.green}🎉 All checks passed! Sprint 52 Phase 4.8 is complete.${colors.reset}\n`
  );
  process.exit(0);
}
