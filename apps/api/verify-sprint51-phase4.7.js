#!/usr/bin/env node

/**
 * Sprint 51 Phase 4.7 Verification Script
 * Agent Moderation & Safety Enforcement Engine
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

function checkFileContainsRegex(filePath, regex, description) {
  if (!fs.existsSync(filePath)) {
    fail(`Cannot check content - file missing: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = regex.test(content);

  if (matches) {
    pass(description);
    return true;
  } else {
    fail(description);
    return false;
  }
}

function countOccurrences(filePath, searchString) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.match(new RegExp(searchString, 'g'));
  return matches ? matches.length : 0;
}

// =====================================================
// FILE PATHS
// =====================================================

const ROOT = path.join(__dirname, '../..');
const PACKAGES = path.join(ROOT, 'packages');
const APPS = path.join(ROOT, 'apps');

const TYPES_FILE = path.join(PACKAGES, 'shared-types/src/agent-moderation.ts');
const TYPES_INDEX = path.join(PACKAGES, 'shared-types/src/index.ts');
const MIGRATION_FILE = path.join(
  APPS,
  'api/src/database/migrations/20251108_create_agent_moderation_log.sql'
);
const SERVICE_FILE = path.join(APPS, 'api/src/services/agentModerationEngine.ts');
const ROUTES_FILE = path.join(APPS, 'api/src/routes/agent-moderation.ts');
const ROUTES_INDEX = path.join(APPS, 'api/src/routes/index.ts');

console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.blue}║  Sprint 51 Phase 4.7 Verification                     ║${colors.reset}`);
console.log(`${colors.blue}║  Agent Moderation & Safety Enforcement Engine          ║${colors.reset}`);
console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

// =====================================================
// 1. FILE EXISTENCE CHECKS
// =====================================================

section('1. File Existence');

checkFileExists(TYPES_FILE, 'TypeScript types file (agent-moderation.ts)');
checkFileExists(MIGRATION_FILE, 'Database migration file');
checkFileExists(SERVICE_FILE, 'Service file (agentModerationEngine.ts)');
checkFileExists(ROUTES_FILE, 'API routes file (agent-moderation.ts)');

// =====================================================
// 2. TYPESCRIPT TYPES VERIFICATION
// =====================================================

section('2. TypeScript Types (agent-moderation.ts)');

// Enums
checkFileContains(TYPES_FILE, 'export enum ModerationCategory', 'ModerationCategory enum exported');
checkFileContains(TYPES_FILE, 'POLICY_VIOLATION', 'ModerationCategory.POLICY_VIOLATION');
checkFileContains(TYPES_FILE, 'BRAND_MISMATCH', 'ModerationCategory.BRAND_MISMATCH');
checkFileContains(TYPES_FILE, 'TONE_VIOLATION', 'ModerationCategory.TONE_VIOLATION');
checkFileContains(TYPES_FILE, 'HALLUCINATION', 'ModerationCategory.HALLUCINATION');
checkFileContains(TYPES_FILE, 'SENSITIVE_TOPIC', 'ModerationCategory.SENSITIVE_TOPIC');
checkFileContains(TYPES_FILE, 'INAPPROPRIATE_CONTENT', 'ModerationCategory.INAPPROPRIATE_CONTENT');
checkFileContains(TYPES_FILE, 'OFFENSIVE_LANGUAGE', 'ModerationCategory.OFFENSIVE_LANGUAGE');
checkFileContains(TYPES_FILE, 'BIAS_DETECTED', 'ModerationCategory.BIAS_DETECTED');
checkFileContains(TYPES_FILE, 'FACTUAL_ERROR', 'ModerationCategory.FACTUAL_ERROR');
checkFileContains(TYPES_FILE, 'PRIVACY_CONCERN', 'ModerationCategory.PRIVACY_CONCERN');

checkFileContains(TYPES_FILE, 'export enum ModerationAction', 'ModerationAction enum exported');
checkFileContains(TYPES_FILE, 'ALLOW', 'ModerationAction.ALLOW');
checkFileContains(TYPES_FILE, 'REWRITE', 'ModerationAction.REWRITE');
checkFileContains(TYPES_FILE, 'WARN', 'ModerationAction.WARN');
checkFileContains(TYPES_FILE, 'ESCALATE', 'ModerationAction.ESCALATE');
checkFileContains(TYPES_FILE, 'BLOCK', 'ModerationAction.BLOCK');

checkFileContains(TYPES_FILE, 'export enum ModerationSeverity', 'ModerationSeverity enum exported');
checkFileContains(TYPES_FILE, 'LOW', 'ModerationSeverity.LOW');
checkFileContains(TYPES_FILE, 'MEDIUM', 'ModerationSeverity.MEDIUM');
checkFileContains(TYPES_FILE, 'HIGH', 'ModerationSeverity.HIGH');
checkFileContains(TYPES_FILE, 'CRITICAL', 'ModerationSeverity.CRITICAL');

checkFileContains(TYPES_FILE, 'export enum RuleType', 'RuleType enum exported');
checkFileContains(TYPES_FILE, 'REGEX', 'RuleType.REGEX');
checkFileContains(TYPES_FILE, 'KEYWORD', 'RuleType.KEYWORD');
checkFileContains(TYPES_FILE, 'SENTIMENT', 'RuleType.SENTIMENT');
checkFileContains(TYPES_FILE, 'LENGTH', 'RuleType.LENGTH');
checkFileContains(TYPES_FILE, 'TONE', 'RuleType.TONE');
checkFileContains(TYPES_FILE, 'CUSTOM', 'RuleType.CUSTOM');

checkFileContains(TYPES_FILE, 'export enum ModerationSource', 'ModerationSource enum exported');
checkFileContains(TYPES_FILE, 'AI_ANALYSIS', 'ModerationSource.AI_ANALYSIS');
checkFileContains(TYPES_FILE, 'STATIC_RULES', 'ModerationSource.STATIC_RULES');
checkFileContains(TYPES_FILE, 'HYBRID', 'ModerationSource.HYBRID');
checkFileContains(TYPES_FILE, 'MANUAL_REVIEW', 'ModerationSource.MANUAL_REVIEW');

// Core Interfaces
checkFileContains(TYPES_FILE, 'export interface ModerationResult', 'ModerationResult interface');
checkFileContains(TYPES_FILE, 'flagged: boolean', 'ModerationResult.flagged');
checkFileContains(TYPES_FILE, 'action: ModerationAction', 'ModerationResult.action');
checkFileContains(TYPES_FILE, 'categories: ModerationCategory[]', 'ModerationResult.categories');
checkFileContains(TYPES_FILE, 'severity: ModerationSeverity', 'ModerationResult.severity');
checkFileContains(TYPES_FILE, 'confidence: number', 'ModerationResult.confidence');
checkFileContains(TYPES_FILE, 'reasoning: string', 'ModerationResult.reasoning');
checkFileContains(TYPES_FILE, 'suggestedRewrite?: string', 'ModerationResult.suggestedRewrite');
checkFileContains(TYPES_FILE, 'flags: ModerationFlag[]', 'ModerationResult.flags');

checkFileContains(TYPES_FILE, 'export interface ModerationFlag', 'ModerationFlag interface');
checkFileContains(TYPES_FILE, 'export interface ModerateAgentOutputInput', 'ModerateAgentOutputInput interface');
checkFileContains(TYPES_FILE, 'export interface ModerationRule', 'ModerationRule interface');
checkFileContains(TYPES_FILE, 'export interface ModerationRuleset', 'ModerationRuleset interface');
checkFileContains(TYPES_FILE, 'export interface ModerationActionResult', 'ModerationActionResult interface');
checkFileContains(TYPES_FILE, 'export interface LogModerationEventInput', 'LogModerationEventInput interface');
checkFileContains(TYPES_FILE, 'export interface AgentModerationLog', 'AgentModerationLog interface');
checkFileContains(TYPES_FILE, 'export interface ModerationRuleRecord', 'ModerationRuleRecord interface');
checkFileContains(TYPES_FILE, 'export interface ModerationHistoryQuery', 'ModerationHistoryQuery interface');
checkFileContains(TYPES_FILE, 'export interface ModerationRuleQuery', 'ModerationRuleQuery interface');
checkFileContains(TYPES_FILE, 'export interface ModerationMetrics', 'ModerationMetrics interface');
checkFileContains(TYPES_FILE, 'export interface ModerationTrend', 'ModerationTrend interface');
checkFileContains(TYPES_FILE, 'export interface CategoryBreakdown', 'CategoryBreakdown interface');
checkFileContains(TYPES_FILE, 'export interface GuardrailConfig', 'GuardrailConfig interface');
checkFileContains(TYPES_FILE, 'export interface AIModerationPrompt', 'AIModerationPrompt interface');
checkFileContains(TYPES_FILE, 'export interface AIModerationResponse', 'AIModerationResponse interface');

// Check export in index
checkFileContains(TYPES_INDEX, "export * from './agent-moderation'", 'agent-moderation exported in index');

// =====================================================
// 3. DATABASE MIGRATION VERIFICATION
// =====================================================

section('3. Database Migration');

// Enums
checkFileContains(MIGRATION_FILE, 'CREATE TYPE moderation_category AS ENUM', 'moderation_category enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE moderation_action AS ENUM', 'moderation_action enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE moderation_severity AS ENUM', 'moderation_severity enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE rule_type AS ENUM', 'rule_type enum');
checkFileContains(MIGRATION_FILE, 'CREATE TYPE moderation_source AS ENUM', 'moderation_source enum');

// Tables
checkFileContains(MIGRATION_FILE, 'CREATE TABLE agent_moderation_log', 'agent_moderation_log table');
checkFileContains(MIGRATION_FILE, 'CREATE TABLE moderation_rules', 'moderation_rules table');
checkFileContains(MIGRATION_FILE, 'CREATE TABLE moderation_rulesets', 'moderation_rulesets table');

// agent_moderation_log columns
checkFileContains(MIGRATION_FILE, 'agent_id UUID NOT NULL', 'agent_moderation_log.agent_id');
checkFileContains(MIGRATION_FILE, 'message TEXT NOT NULL', 'agent_moderation_log.message');
checkFileContains(MIGRATION_FILE, 'flags JSONB', 'agent_moderation_log.flags');
checkFileContains(MIGRATION_FILE, 'categories moderation_category[]', 'agent_moderation_log.categories');
checkFileContains(MIGRATION_FILE, 'severity moderation_severity', 'agent_moderation_log.severity');
checkFileContains(MIGRATION_FILE, 'action moderation_action', 'agent_moderation_log.action');
checkFileContains(MIGRATION_FILE, 'confidence NUMERIC', 'agent_moderation_log.confidence');
checkFileContains(MIGRATION_FILE, 'reasoning TEXT', 'agent_moderation_log.reasoning');
checkFileContains(MIGRATION_FILE, 'source moderation_source', 'agent_moderation_log.source');
checkFileContains(MIGRATION_FILE, 'organization_id UUID', 'agent_moderation_log.organization_id');

// moderation_rules columns
checkFileContains(MIGRATION_FILE, 'type rule_type NOT NULL', 'moderation_rules.type');
checkFileContains(MIGRATION_FILE, 'category moderation_category', 'moderation_rules.category');
checkFileContains(MIGRATION_FILE, 'config JSONB', 'moderation_rules.config');
checkFileContains(MIGRATION_FILE, 'priority INTEGER', 'moderation_rules.priority');

// Indexes
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_moderation_log_agent', 'idx_moderation_log_agent index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_moderation_log_org', 'idx_moderation_log_org index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_moderation_log_categories', 'idx_moderation_log_categories GIN index');
checkFileContains(MIGRATION_FILE, 'CREATE INDEX idx_moderation_log_message_fts', 'Full-text search index on message');
checkFileContains(MIGRATION_FILE, 'USING GIN(categories)', 'GIN index on categories array');
checkFileContains(MIGRATION_FILE, "to_tsvector('english', message)", 'Full-text search vector on message');

// Helper Functions
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_moderation_metrics', 'get_moderation_metrics function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_moderation_trends', 'get_moderation_trends function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_category_breakdown', 'get_category_breakdown function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_moderation_history', 'get_moderation_history function');
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION get_moderation_rules', 'get_moderation_rules function');

// RLS Policies
checkFileContains(MIGRATION_FILE, 'ALTER TABLE agent_moderation_log ENABLE ROW LEVEL SECURITY', 'RLS enabled on agent_moderation_log');
checkFileContains(MIGRATION_FILE, 'ALTER TABLE moderation_rules ENABLE ROW LEVEL SECURITY', 'RLS enabled on moderation_rules');
checkFileContains(MIGRATION_FILE, 'CREATE POLICY moderation_log_org_isolation', 'RLS policy for moderation_log');
checkFileContains(MIGRATION_FILE, 'CREATE POLICY moderation_rules_org_isolation', 'RLS policy for moderation_rules');

// Triggers
checkFileContains(MIGRATION_FILE, 'CREATE OR REPLACE FUNCTION update_moderation_updated_at', 'update_moderation_updated_at trigger function');
checkFileContains(MIGRATION_FILE, 'CREATE TRIGGER moderation_rules_updated_at', 'moderation_rules updated_at trigger');

// =====================================================
// 4. SERVICE VERIFICATION
// =====================================================

section('4. Service (agentModerationEngine.ts)');

// Class and methods
checkFileContains(SERVICE_FILE, 'class AgentModerationEngine', 'AgentModerationEngine class');
checkFileContains(SERVICE_FILE, 'async moderateAgentOutput', 'moderateAgentOutput method');
checkFileContains(SERVICE_FILE, 'async logModerationEvent', 'logModerationEvent method');
checkFileContains(SERVICE_FILE, 'async getModerationHistory', 'getModerationHistory method');
checkFileContains(SERVICE_FILE, 'async getModerationMetrics', 'getModerationMetrics method');
checkFileContains(SERVICE_FILE, 'async getModerationTrends', 'getModerationTrends method');
checkFileContains(SERVICE_FILE, 'async getCategoryBreakdown', 'getCategoryBreakdown method');
checkFileContains(SERVICE_FILE, 'async getModerationRules', 'getModerationRules method');
checkFileContains(SERVICE_FILE, 'async applyModerationRules', 'applyModerationRules method');

// AI Integration
checkFileContains(SERVICE_FILE, "from '../lib/openai'", 'OpenAI import');
checkFileContains(SERVICE_FILE, 'performAIModerationAnalysis', 'AI moderation analysis method');
checkFileContains(SERVICE_FILE, "model: 'gpt-4'", 'GPT-4 model usage');
checkFileContains(SERVICE_FILE, 'openai.chat.completions.create', 'OpenAI API call');

// Static Rules
checkFileContains(SERVICE_FILE, 'applyStaticRules', 'Static rules application');
checkFileContains(SERVICE_FILE, 'matchRule', 'Rule matching logic');
checkFileContains(SERVICE_FILE, "case 'regex'", 'Regex rule type');
checkFileContains(SERVICE_FILE, "case 'keyword'", 'Keyword rule type');
checkFileContains(SERVICE_FILE, "case 'length'", 'Length rule type');

// Hybrid Logic
checkFileContains(SERVICE_FILE, 'combineResults', 'Combine static and AI results');
checkFileContains(SERVICE_FILE, 'compareSeverity', 'Severity comparison');
checkFileContains(SERVICE_FILE, 'compareAction', 'Action comparison');

// Database Operations
checkFileContains(SERVICE_FILE, "from '../database/client'", 'Database client import');
checkFileContains(SERVICE_FILE, 'db.query', 'Database query usage');
checkFileContains(SERVICE_FILE, 'INSERT INTO agent_moderation_log', 'Insert moderation log');
checkFileContains(SERVICE_FILE, 'SELECT * FROM get_moderation_metrics', 'Call get_moderation_metrics function');
checkFileContains(SERVICE_FILE, 'SELECT * FROM get_moderation_history', 'Call get_moderation_history function');

// Type Imports
checkFileContains(SERVICE_FILE, 'ModerateAgentOutputInput', 'ModerateAgentOutputInput type import');
checkFileContains(SERVICE_FILE, 'ModerationResult', 'ModerationResult type import');
checkFileContains(SERVICE_FILE, 'ModerationFlag', 'ModerationFlag type import');
checkFileContains(SERVICE_FILE, 'ModerationAction', 'ModerationAction type import');
checkFileContains(SERVICE_FILE, 'ModerationCategory', 'ModerationCategory type import');
checkFileContains(SERVICE_FILE, 'ModerationSeverity', 'ModerationSeverity type import');

// Singleton export
checkFileContains(SERVICE_FILE, 'export const agentModerationEngine', 'Singleton export');
checkFileContains(SERVICE_FILE, 'new AgentModerationEngine()', 'Singleton instantiation');

// =====================================================
// 5. API ROUTES VERIFICATION
// =====================================================

section('5. API Routes (agent-moderation.ts)');

// Route definitions
checkFileContains(ROUTES_FILE, "router.post('/moderate'", 'POST /moderate route');
checkFileContains(ROUTES_FILE, "router.post('/apply-rules'", 'POST /apply-rules route');
checkFileContains(ROUTES_FILE, "router.post('/log'", 'POST /log route');
checkFileContains(ROUTES_FILE, "router.get('/history/:agentId'", 'GET /history/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/metrics/:agentId'", 'GET /metrics/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/trends/:agentId'", 'GET /trends/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/category-breakdown/:agentId'", 'GET /category-breakdown/:agentId route');
checkFileContains(ROUTES_FILE, "router.get('/rules'", 'GET /rules route');
checkFileContains(ROUTES_FILE, "router.get('/health'", 'GET /health route');

// Service imports
checkFileContains(ROUTES_FILE, "from '../services/agentModerationEngine'", 'Service import');
checkFileContains(ROUTES_FILE, 'agentModerationEngine.moderateAgentOutput', 'moderateAgentOutput service call');
checkFileContains(ROUTES_FILE, 'agentModerationEngine.applyModerationRules', 'applyModerationRules service call');
checkFileContains(ROUTES_FILE, 'agentModerationEngine.logModerationEvent', 'logModerationEvent service call');
checkFileContains(ROUTES_FILE, 'agentModerationEngine.getModerationHistory', 'getModerationHistory service call');
checkFileContains(ROUTES_FILE, 'agentModerationEngine.getModerationMetrics', 'getModerationMetrics service call');

// Validation
checkFileContains(ROUTES_FILE, "return res.status(400)", 'Input validation with 400 status');
checkFileContains(ROUTES_FILE, 'Missing required fields', 'Validation error messages');

// Error handling
checkFileContains(ROUTES_FILE, 'catch (error: any)', 'Error handling');
checkFileContains(ROUTES_FILE, "res.status(500)", 'Error response with 500 status');

// Type imports
checkFileContains(ROUTES_FILE, 'ModerateAgentOutputInput', 'ModerateAgentOutputInput type import');
checkFileContains(ROUTES_FILE, 'LogModerationEventInput', 'LogModerationEventInput type import');
checkFileContains(ROUTES_FILE, 'ModerationHistoryQuery', 'ModerationHistoryQuery type import');

// Export
checkFileContains(ROUTES_FILE, 'export default router', 'Router export');

// Check routes index registration
checkFileContains(ROUTES_INDEX, "import agentModerationRoutes from './agent-moderation'", 'Routes import in index');
checkFileContains(ROUTES_INDEX, "router.use('/agent-moderation', agentModerationRoutes)", 'Routes registration in index');

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
    `${colors.green}🎉 All checks passed! Sprint 51 Phase 4.7 is complete.${colors.reset}\n`
  );
  process.exit(0);
}
