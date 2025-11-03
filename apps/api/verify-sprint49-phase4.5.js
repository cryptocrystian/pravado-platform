#!/usr/bin/env node

// =====================================================
// SPRINT 49 PHASE 4.5 VERIFICATION SCRIPT
// Agent Self-Evaluation & Meta-Cognition Engine
// =====================================================

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(message) {
  passCount++;
  log(`✓ ${message}`, 'green');
}

function fail(message) {
  failCount++;
  log(`✗ ${message}`, 'red');
}

function warn(message) {
  warnCount++;
  log(`⚠ ${message}`, 'yellow');
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(title, 'blue');
  log('='.repeat(60), 'blue');
}

function fileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    pass(`${description} exists`);
    return true;
  } else {
    fail(`${description} not found: ${filePath}`);
    return false;
  }
}

function fileContains(filePath, searchString, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      pass(description);
      return true;
    } else {
      fail(description);
      return false;
    }
  } catch (error) {
    fail(`${description} - Error reading file: ${error.message}`);
    return false;
  }
}

// =====================================================
// START VERIFICATION
// =====================================================

log('\n🔍 Sprint 49 Phase 4.5 Verification Script', 'blue');
log('Agent Self-Evaluation & Meta-Cognition Engine\n', 'blue');

// =====================================================
// 1. TYPESCRIPT TYPES
// =====================================================

section('1. TypeScript Types Verification (30 checks)');

const typesFile = path.join(__dirname, '../../packages/shared-types/src/agent-self-eval.ts');

if (fileExists(typesFile, 'Agent self-eval types file')) {
  // Enums
  fileContains(typesFile, "export enum EvalType", 'EvalType enum exported');
  fileContains(typesFile, "CONFIDENCE = 'confidence'", 'EvalType.CONFIDENCE defined');
  fileContains(typesFile, "CONTRADICTION = 'contradiction'", 'EvalType.CONTRADICTION defined');
  fileContains(typesFile, "IMPROVEMENT = 'improvement'", 'EvalType.IMPROVEMENT defined');

  fileContains(typesFile, "export enum NextStepAction", 'NextStepAction enum exported');
  fileContains(typesFile, "PROCEED = 'proceed'", 'NextStepAction.PROCEED defined');
  fileContains(typesFile, "RETRY = 'retry'", 'NextStepAction.RETRY defined');
  fileContains(typesFile, "ESCALATE = 'escalate'", 'NextStepAction.ESCALATE defined');
  fileContains(typesFile, "COLLABORATE = 'collaborate'", 'NextStepAction.COLLABORATE defined');

  fileContains(typesFile, "export enum ConfidenceLevel", 'ConfidenceLevel enum exported');
  fileContains(typesFile, "VERY_LOW = 'very_low'", 'ConfidenceLevel.VERY_LOW defined');
  fileContains(typesFile, "HIGH = 'high'", 'ConfidenceLevel.HIGH defined');

  fileContains(typesFile, "export enum ImprovementCategory", 'ImprovementCategory enum exported');
  fileContains(typesFile, "TONE = 'tone'", 'ImprovementCategory.TONE defined');
  fileContains(typesFile, "DECISION_MAKING = 'decision_making'", 'ImprovementCategory.DECISION_MAKING defined');

  fileContains(typesFile, "export enum SuggestionStatus", 'SuggestionStatus enum exported');
  fileContains(typesFile, "PENDING = 'pending'", 'SuggestionStatus.PENDING defined');
  fileContains(typesFile, "APPLIED = 'applied'", 'SuggestionStatus.APPLIED defined');

  // Interfaces
  fileContains(typesFile, "export interface ConfidenceAssessment", 'ConfidenceAssessment interface exported');
  fileContains(typesFile, "export interface ConfidenceEvaluationInput", 'ConfidenceEvaluationInput interface exported');
  fileContains(typesFile, "export interface ContradictionCheckResult", 'ContradictionCheckResult interface exported');
  fileContains(typesFile, "export interface ContradictionDetectionInput", 'ContradictionDetectionInput interface exported');
  fileContains(typesFile, "export interface SelfImprovementPlan", 'SelfImprovementPlan interface exported');
  fileContains(typesFile, "export interface SelfImprovementInput", 'SelfImprovementInput interface exported');
  fileContains(typesFile, "export interface AgentSelfEvalLog", 'AgentSelfEvalLog interface exported');
  fileContains(typesFile, "export interface SelfImprovementSuggestion", 'SelfImprovementSuggestion interface exported');
  fileContains(typesFile, "export interface SpecificChange", 'SpecificChange interface exported');
  fileContains(typesFile, "export interface ConflictingStatement", 'ConflictingStatement interface exported');

  // Interface fields
  fileContains(typesFile, "confidenceScore: number", 'ConfidenceAssessment has confidenceScore field');
  fileContains(typesFile, "suggestedNextStep: NextStepAction", 'ConfidenceAssessment has suggestedNextStep field');
}

// Check index exports
const typesIndex = path.join(__dirname, '../../packages/shared-types/src/index.ts');
fileContains(typesIndex, "export * from './agent-self-eval'", 'Agent self-eval types exported from index');

// =====================================================
// 2. DATABASE MIGRATION
// =====================================================

section('2. Database Migration Verification (35 checks)');

const migrationFile = path.join(__dirname, 'src/database/migrations/20251107_create_agent_self_eval_logs.sql');

if (fileExists(migrationFile, 'Agent self-eval migration file')) {
  // ENUMs
  fileContains(migrationFile, "CREATE TYPE eval_type AS ENUM", 'eval_type enum created');
  fileContains(migrationFile, "'confidence'", 'confidence eval type value');
  fileContains(migrationFile, "'contradiction'", 'contradiction eval type value');
  fileContains(migrationFile, "'improvement'", 'improvement eval type value');

  fileContains(migrationFile, "CREATE TYPE next_step_action AS ENUM", 'next_step_action enum created');
  fileContains(migrationFile, "'proceed'", 'proceed action value');
  fileContains(migrationFile, "'escalate'", 'escalate action value');
  fileContains(migrationFile, "'collaborate'", 'collaborate action value');

  fileContains(migrationFile, "CREATE TYPE confidence_level AS ENUM", 'confidence_level enum created');
  fileContains(migrationFile, "CREATE TYPE improvement_category AS ENUM", 'improvement_category enum created');
  fileContains(migrationFile, "CREATE TYPE suggestion_status AS ENUM", 'suggestion_status enum created');

  // Tables
  fileContains(migrationFile, "CREATE TABLE agent_self_eval_logs", 'agent_self_eval_logs table created');
  fileContains(migrationFile, "CREATE TABLE agent_self_improvement_suggestions", 'agent_self_improvement_suggestions table created');

  // Table columns
  fileContains(migrationFile, "agent_id UUID NOT NULL", 'agent_id column in eval_logs');
  fileContains(migrationFile, "eval_type eval_type NOT NULL", 'eval_type column in eval_logs');
  fileContains(migrationFile, "confidence_score NUMERIC", 'confidence_score column in eval_logs');
  fileContains(migrationFile, "suggested_action next_step_action", 'suggested_action column in eval_logs');
  fileContains(migrationFile, "context JSONB NOT NULL", 'context column in eval_logs');
  fileContains(migrationFile, "result JSONB NOT NULL", 'result column in eval_logs');

  fileContains(migrationFile, "specific_changes JSONB NOT NULL", 'specific_changes column in suggestions');
  fileContains(migrationFile, "confidence_level NUMERIC", 'confidence_level column in suggestions');
  fileContains(migrationFile, "priority TEXT NOT NULL", 'priority column in suggestions');
  fileContains(migrationFile, "status suggestion_status", 'status column in suggestions');

  // Indexes
  fileContains(migrationFile, "CREATE INDEX idx_self_eval_logs_agent", 'Index on agent_id created');
  fileContains(migrationFile, "CREATE INDEX idx_self_eval_logs_type", 'Index on eval_type created');
  fileContains(migrationFile, "CREATE INDEX idx_self_eval_logs_confidence", 'Index on confidence_score created');
  fileContains(migrationFile, "CREATE INDEX idx_improvement_suggestions_category", 'Index on category created');
  fileContains(migrationFile, "CREATE INDEX idx_improvement_suggestions_status", 'Index on status created');

  // Helper Functions
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_self_eval_metrics", 'get_self_eval_metrics function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_confidence_trends", 'get_confidence_trends function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_contradiction_trends", 'get_contradiction_trends function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_pending_improvements", 'get_pending_improvements function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_low_confidence_evaluations", 'get_low_confidence_evaluations function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_failure_patterns", 'get_failure_patterns function created');

  // RLS
  fileContains(migrationFile, "ENABLE ROW LEVEL SECURITY", 'RLS enabled');
  fileContains(migrationFile, "CREATE POLICY select_org_self_eval_logs", 'Select policy for eval logs created');
  fileContains(migrationFile, "CREATE POLICY insert_self_eval_logs", 'Insert policy for eval logs created');
}

// =====================================================
// 3. BACKEND SERVICE
// =====================================================

section('3. Backend Service Verification (30 checks)');

const serviceFile = path.join(__dirname, 'src/services/agentSelfEvaluator.ts');

if (fileExists(serviceFile, 'Agent self-evaluator service')) {
  fileContains(serviceFile, "class AgentSelfEvaluatorService", 'AgentSelfEvaluatorService class defined');

  // Methods
  fileContains(serviceFile, "async evaluateDecisionConfidence", 'evaluateDecisionConfidence method exists');
  fileContains(serviceFile, "async detectContradictions", 'detectContradictions method exists');
  fileContains(serviceFile, "async generateSelfImprovementProposal", 'generateSelfImprovementProposal method exists');
  fileContains(serviceFile, "async getEvaluationLogs", 'getEvaluationLogs method exists');
  fileContains(serviceFile, "async getImprovementSuggestions", 'getImprovementSuggestions method exists');
  fileContains(serviceFile, "async getSelfEvalMetrics", 'getSelfEvalMetrics method exists');

  // GPT-4 Integration
  fileContains(serviceFile, "import OpenAI from 'openai'", 'OpenAI SDK imported');
  fileContains(serviceFile, "new OpenAI", 'OpenAI client instantiated');
  fileContains(serviceFile, "openai.chat.completions.create", 'GPT-4 API called');
  fileContains(serviceFile, "model: 'gpt-4'", 'GPT-4 model specified');

  // Helper methods
  fileContains(serviceFile, "calculateSuccessRate", 'calculateSuccessRate method exists');
  fileContains(serviceFile, "getSimilarTaskCount", 'getSimilarTaskCount method exists');
  fileContains(serviceFile, "assessMemoryRelevance", 'assessMemoryRelevance method exists');
  fileContains(serviceFile, "assessContextCompleteness", 'assessContextCompleteness method exists');
  fileContains(serviceFile, "calculateConfidenceScore", 'calculateConfidenceScore method exists');
  fileContains(serviceFile, "getConfidenceLevel", 'getConfidenceLevel method exists');
  fileContains(serviceFile, "determineSuggestedAction", 'determineSuggestedAction method exists');
  fileContains(serviceFile, "analyzeForContradictions", 'analyzeForContradictions method exists');
  fileContains(serviceFile, "buildImprovementPrompt", 'buildImprovementPrompt method exists');

  // Database queries
  fileContains(serviceFile, "INSERT INTO agent_self_eval_logs", 'Eval log insertion query');
  fileContains(serviceFile, "INSERT INTO agent_self_improvement_suggestions", 'Improvement suggestion insertion query');
  fileContains(serviceFile, "get_self_eval_metrics", 'Uses get_self_eval_metrics function');

  // Data mapping
  fileContains(serviceFile, "mapEvalLog", 'mapEvalLog method exists');
  fileContains(serviceFile, "mapImprovementSuggestion", 'mapImprovementSuggestion method exists');
  fileContains(serviceFile, "logEvaluation", 'logEvaluation method exists');
  fileContains(serviceFile, "saveSelfImprovementPlan", 'saveSelfImprovementPlan method exists');

  // Export
  fileContains(serviceFile, "export const agentSelfEvaluator", 'agentSelfEvaluator singleton exported');
  fileContains(serviceFile, "new AgentSelfEvaluatorService()", 'Service instantiated');
}

// =====================================================
// 4. API ROUTES
// =====================================================

section('4. API Routes Verification (20 checks)');

const routesFile = path.join(__dirname, 'src/routes/agent-self-eval.ts');

if (fileExists(routesFile, 'Agent self-eval routes file')) {
  fileContains(routesFile, "import express", 'Express imported');
  fileContains(routesFile, "import { agentSelfEvaluator }", 'AgentSelfEvaluator service imported');

  // Routes
  fileContains(routesFile, "router.post('/evaluate'", 'POST /evaluate route defined');
  fileContains(routesFile, "router.post('/contradictions'", 'POST /contradictions route defined');
  fileContains(routesFile, "router.post('/suggest-improvement'", 'POST /suggest-improvement route defined');
  fileContains(routesFile, "router.get('/logs/:agentId'", 'GET /logs/:agentId route defined');
  fileContains(routesFile, "router.get('/suggestions/:agentId'", 'GET /suggestions/:agentId route defined');
  fileContains(routesFile, "router.get('/metrics/:agentId'", 'GET /metrics/:agentId route defined');
  fileContains(routesFile, "router.get('/health'", 'GET /health route defined');

  // Service calls
  fileContains(routesFile, "agentSelfEvaluator.evaluateDecisionConfidence", 'Calls evaluateDecisionConfidence service');
  fileContains(routesFile, "agentSelfEvaluator.detectContradictions", 'Calls detectContradictions service');
  fileContains(routesFile, "agentSelfEvaluator.generateSelfImprovementProposal", 'Calls generateSelfImprovementProposal service');
  fileContains(routesFile, "agentSelfEvaluator.getEvaluationLogs", 'Calls getEvaluationLogs service');
  fileContains(routesFile, "agentSelfEvaluator.getImprovementSuggestions", 'Calls getImprovementSuggestions service');
  fileContains(routesFile, "agentSelfEvaluator.getSelfEvalMetrics", 'Calls getSelfEvalMetrics service');

  // Validation
  fileContains(routesFile, "if (!input.agentId", 'Input validation present');

  // Error handling
  fileContains(routesFile, "try", 'Try-catch blocks present');
  fileContains(routesFile, "catch", 'Error handling present');

  // Export
  fileContains(routesFile, "export default router", 'Router exported');
}

// Check route registration
const routesIndex = path.join(__dirname, 'src/routes/index.ts');
fileContains(routesIndex, "import agentSelfEvalRoutes from './agent-self-eval'", 'Agent self-eval routes imported in index');
fileContains(routesIndex, "router.use('/agent-self-eval', agentSelfEvalRoutes)", 'Agent self-eval routes registered');

// =====================================================
// SUMMARY
// =====================================================

section('Verification Summary');

const totalChecks = passCount + failCount + warnCount;
const passRate = ((passCount / totalChecks) * 100).toFixed(1);

log(`\nTotal Checks: ${totalChecks}`, 'blue');
log(`Passed: ${passCount}`, 'green');
log(`Failed: ${failCount}`, failCount > 0 ? 'red' : 'gray');
log(`Warnings: ${warnCount}`, warnCount > 0 ? 'yellow' : 'gray');
log(`Pass Rate: ${passRate}%`, passRate >= 95 ? 'green' : passRate >= 80 ? 'yellow' : 'red');

if (failCount === 0 && warnCount === 0) {
  log('\n✓ Sprint 49 Phase 4.5 verification PASSED!', 'green');
  log('All components are properly implemented.\n', 'green');
  process.exit(0);
} else if (failCount === 0) {
  log('\n⚠ Sprint 49 Phase 4.5 verification PASSED with warnings', 'yellow');
  log('Review warnings before deployment.\n', 'yellow');
  process.exit(0);
} else {
  log('\n✗ Sprint 49 Phase 4.5 verification FAILED', 'red');
  log('Fix the failed checks before deployment.\n', 'red');
  process.exit(1);
}
