#!/usr/bin/env node

// =====================================================
// SPRINT 48 PHASE 4.4 VERIFICATION SCRIPT
// Feedback Loop + Continuous Improvement Engine
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

function countOccurrences(filePath, searchString) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return (content.match(new RegExp(searchString, 'g')) || []).length;
  } catch (error) {
    return 0;
  }
}

// =====================================================
// START VERIFICATION
// =====================================================

log('\n🔍 Sprint 48 Phase 4.4 Verification Script', 'blue');
log('Feedback Loop + Continuous Improvement Engine\n', 'blue');

// =====================================================
// 1. TYPESCRIPT TYPES
// =====================================================

section('1. TypeScript Types Verification (25 checks)');

const typesFile = path.join(__dirname, '../../packages/shared-types/src/agent-feedback.ts');

if (fileExists(typesFile, 'Agent feedback types file')) {
  // Enums
  fileContains(typesFile, "export enum FeedbackRating", 'FeedbackRating enum exported');
  fileContains(typesFile, "THUMBS_UP = 'thumbs_up'", 'FeedbackRating.THUMBS_UP defined');
  fileContains(typesFile, "THUMBS_DOWN = 'thumbs_down'", 'FeedbackRating.THUMBS_DOWN defined');
  fileContains(typesFile, "STAR_1 = 'star_1'", 'FeedbackRating.STAR_1 defined');
  fileContains(typesFile, "STAR_5 = 'star_5'", 'FeedbackRating.STAR_5 defined');

  fileContains(typesFile, "export enum FeedbackScope", 'FeedbackScope enum exported');
  fileContains(typesFile, "RESPONSE_QUALITY = 'response_quality'", 'FeedbackScope.RESPONSE_QUALITY defined');
  fileContains(typesFile, "TONE = 'tone'", 'FeedbackScope.TONE defined');
  fileContains(typesFile, "ACCURACY = 'accuracy'", 'FeedbackScope.ACCURACY defined');
  fileContains(typesFile, "HELPFULNESS = 'helpfulness'", 'FeedbackScope.HELPFULNESS defined');

  fileContains(typesFile, "export enum ImprovementPriority", 'ImprovementPriority enum exported');
  fileContains(typesFile, "CRITICAL = 'critical'", 'ImprovementPriority.CRITICAL defined');
  fileContains(typesFile, "HIGH = 'high'", 'ImprovementPriority.HIGH defined');

  fileContains(typesFile, "export enum ImprovementStatus", 'ImprovementStatus enum exported');
  fileContains(typesFile, "PENDING = 'pending'", 'ImprovementStatus.PENDING defined');
  fileContains(typesFile, "COMPLETED = 'completed'", 'ImprovementStatus.COMPLETED defined');

  // Interfaces
  fileContains(typesFile, "export interface AgentFeedbackInput", 'AgentFeedbackInput interface exported');
  fileContains(typesFile, "export interface AgentFeedbackEntry", 'AgentFeedbackEntry interface exported');
  fileContains(typesFile, "export interface FeedbackMetrics", 'FeedbackMetrics interface exported');
  fileContains(typesFile, "export interface FeedbackSummary", 'FeedbackSummary interface exported');
  fileContains(typesFile, "export interface IssueSummary", 'IssueSummary interface exported');
  fileContains(typesFile, "export interface ImprovementPlan", 'ImprovementPlan interface exported');
  fileContains(typesFile, "export interface ProposedChange", 'ProposedChange interface exported');

  // Interface fields
  fileContains(typesFile, "agentId: string", 'AgentFeedbackInput has agentId field');
  fileContains(typesFile, "proposedChanges: ProposedChange[]", 'ImprovementPlan has proposedChanges field');
}

// Check index exports
const typesIndex = path.join(__dirname, '../../packages/shared-types/src/index.ts');
fileContains(typesIndex, "export * from './agent-feedback'", 'Agent feedback types exported from index');

// =====================================================
// 2. DATABASE MIGRATION
// =====================================================

section('2. Database Migration Verification (30 checks)');

const migrationFile = path.join(__dirname, 'src/database/migrations/20251106_create_agent_feedback_log.sql');

if (fileExists(migrationFile, 'Agent feedback migration file')) {
  // ENUMs
  fileContains(migrationFile, "CREATE TYPE feedback_rating AS ENUM", 'feedback_rating enum created');
  fileContains(migrationFile, "'thumbs_up'", 'thumbs_up rating value');
  fileContains(migrationFile, "'thumbs_down'", 'thumbs_down rating value');
  fileContains(migrationFile, "'star_1'", 'star_1 rating value');
  fileContains(migrationFile, "'star_5'", 'star_5 rating value');

  fileContains(migrationFile, "CREATE TYPE feedback_scope AS ENUM", 'feedback_scope enum created');
  fileContains(migrationFile, "'response_quality'", 'response_quality scope value');
  fileContains(migrationFile, "'tone'", 'tone scope value');
  fileContains(migrationFile, "'accuracy'", 'accuracy scope value');

  fileContains(migrationFile, "CREATE TYPE improvement_priority AS ENUM", 'improvement_priority enum created');
  fileContains(migrationFile, "CREATE TYPE improvement_status AS ENUM", 'improvement_status enum created');

  // Tables
  fileContains(migrationFile, "CREATE TABLE agent_feedback_log", 'agent_feedback_log table created');
  fileContains(migrationFile, "CREATE TABLE agent_improvement_plans", 'agent_improvement_plans table created');

  // Table columns
  fileContains(migrationFile, "agent_id UUID NOT NULL", 'agent_id column in feedback_log');
  fileContains(migrationFile, "message_id UUID", 'message_id column in feedback_log');
  fileContains(migrationFile, "conversation_id UUID", 'conversation_id column in feedback_log');
  fileContains(migrationFile, "rating feedback_rating NOT NULL", 'rating column in feedback_log');
  fileContains(migrationFile, "categories feedback_scope[]", 'categories array column in feedback_log');
  fileContains(migrationFile, "is_anonymous BOOLEAN", 'is_anonymous column in feedback_log');

  fileContains(migrationFile, "proposed_changes JSONB", 'proposed_changes column in improvement_plans');
  fileContains(migrationFile, "estimated_impact JSONB", 'estimated_impact column in improvement_plans');

  // Indexes
  fileContains(migrationFile, "CREATE INDEX idx_agent_feedback_agent", 'Index on agent_id created');
  fileContains(migrationFile, "CREATE INDEX idx_agent_feedback_message", 'Index on message_id created');
  fileContains(migrationFile, "CREATE INDEX idx_agent_feedback_categories", 'GIN index on categories created');
  fileContains(migrationFile, "USING GIN (categories)", 'GIN index properly configured');

  // Helper Functions
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_feedback_metrics", 'get_feedback_metrics function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_feedback_distribution", 'get_feedback_distribution function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_common_issues", 'get_common_issues function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_rating_trends", 'get_rating_trends function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_message_feedback", 'get_message_feedback function created');
}

// =====================================================
// 3. BACKEND SERVICE
// =====================================================

section('3. Backend Service Verification (25 checks)');

const serviceFile = path.join(__dirname, 'src/services/agentFeedbackEngine.ts');

if (fileExists(serviceFile, 'Agent feedback engine service')) {
  fileContains(serviceFile, "class AgentFeedbackEngineService", 'AgentFeedbackEngineService class defined');

  // Methods
  fileContains(serviceFile, "async recordAgentFeedback", 'recordAgentFeedback method exists');
  fileContains(serviceFile, "async getFeedbackSummary", 'getFeedbackSummary method exists');
  fileContains(serviceFile, "async getFeedbackMetrics", 'getFeedbackMetrics method exists');
  fileContains(serviceFile, "async generateAgentImprovementTasks", 'generateAgentImprovementTasks method exists');
  fileContains(serviceFile, "async getImprovementPlans", 'getImprovementPlans method exists');
  fileContains(serviceFile, "async queryFeedback", 'queryFeedback method exists');

  // GPT-4 Integration
  fileContains(serviceFile, "import OpenAI from 'openai'", 'OpenAI SDK imported');
  fileContains(serviceFile, "new OpenAI", 'OpenAI client instantiated');
  fileContains(serviceFile, "openai.chat.completions.create", 'GPT-4 API called');
  fileContains(serviceFile, "model: 'gpt-4'", 'GPT-4 model specified');
  fileContains(serviceFile, "buildImprovementPrompt", 'Improvement prompt builder exists');

  // Database queries
  fileContains(serviceFile, "INSERT INTO agent_feedback_log", 'Feedback insertion query');
  fileContains(serviceFile, "INSERT INTO agent_improvement_plans", 'Improvement plan insertion query');
  fileContains(serviceFile, "get_feedback_metrics", 'Uses get_feedback_metrics function');
  fileContains(serviceFile, "get_common_issues", 'Uses get_common_issues function');
  fileContains(serviceFile, "get_feedback_distribution", 'Uses get_feedback_distribution function');

  // Data mapping
  fileContains(serviceFile, "mapFeedbackEntry", 'mapFeedbackEntry method exists');
  fileContains(serviceFile, "mapImprovementPlan", 'mapImprovementPlan method exists');
  fileContains(serviceFile, "saveImprovementPlan", 'saveImprovementPlan method exists');

  // Export
  fileContains(serviceFile, "export const agentFeedbackEngine", 'agentFeedbackEngine singleton exported');
  fileContains(serviceFile, "new AgentFeedbackEngineService()", 'Service instantiated');
}

// =====================================================
// 4. API ROUTES
// =====================================================

section('4. API Routes Verification (15 checks)');

const routesFile = path.join(__dirname, 'src/routes/agent-feedback.ts');

if (fileExists(routesFile, 'Agent feedback routes file')) {
  fileContains(routesFile, "import express", 'Express imported');
  fileContains(routesFile, "import { agentFeedbackEngine }", 'AgentFeedbackEngine service imported');

  // Routes
  fileContains(routesFile, "router.post('/submit'", 'POST /submit route defined');
  fileContains(routesFile, "router.get('/summary/:agentId'", 'GET /summary/:agentId route defined');
  fileContains(routesFile, "router.post('/generate-plan/:agentId'", 'POST /generate-plan/:agentId route defined');
  fileContains(routesFile, "router.get('/plans/:agentId'", 'GET /plans/:agentId route defined');
  fileContains(routesFile, "router.get('/health'", 'GET /health route defined');

  // Service calls
  fileContains(routesFile, "agentFeedbackEngine.recordAgentFeedback", 'Calls recordAgentFeedback service');
  fileContains(routesFile, "agentFeedbackEngine.getFeedbackSummary", 'Calls getFeedbackSummary service');
  fileContains(routesFile, "agentFeedbackEngine.generateAgentImprovementTasks", 'Calls generateAgentImprovementTasks service');
  fileContains(routesFile, "agentFeedbackEngine.getImprovementPlans", 'Calls getImprovementPlans service');

  // Error handling
  fileContains(routesFile, "try", 'Try-catch blocks present');
  fileContains(routesFile, "catch", 'Error handling present');

  // Export
  fileContains(routesFile, "export default router", 'Router exported');
}

// Check route registration
const routesIndex = path.join(__dirname, 'src/routes/index.ts');
fileContains(routesIndex, "import agentFeedbackRoutes from './agent-feedback'", 'Agent feedback routes imported in index');
fileContains(routesIndex, "router.use('/agent-feedback', agentFeedbackRoutes)", 'Agent feedback routes registered');

// =====================================================
// 5. REACT HOOKS
// =====================================================

section('5. React Hooks Verification (15 checks)');

const hooksFile = path.join(__dirname, '../dashboard/src/hooks/useAgentFeedback.ts');

if (fileExists(hooksFile, 'useAgentFeedback hooks file')) {
  fileContains(hooksFile, "import { useMutation, useQuery", 'React Query hooks imported');

  // Hooks
  fileContains(hooksFile, "export function useSubmitFeedback", 'useSubmitFeedback hook exported');
  fileContains(hooksFile, "export function useFeedbackSummary", 'useFeedbackSummary hook exported');
  fileContains(hooksFile, "export function useGenerateImprovementPlans", 'useGenerateImprovementPlans hook exported');
  fileContains(hooksFile, "export function useImprovementPlans", 'useImprovementPlans hook exported');

  // API calls
  fileContains(hooksFile, "/api/agent-feedback/submit", 'Submit feedback endpoint called');
  fileContains(hooksFile, "/api/agent-feedback/summary", 'Summary endpoint called');
  fileContains(hooksFile, "/api/agent-feedback/generate-plan", 'Generate plan endpoint called');
  fileContains(hooksFile, "/api/agent-feedback/plans", 'Plans endpoint called');

  // Query keys
  fileContains(hooksFile, "export const feedbackQueryKeys", 'feedbackQueryKeys exported');

  // Cache invalidation
  fileContains(hooksFile, "queryClient.invalidateQueries", 'Cache invalidation present');

  // Callbacks
  fileContains(hooksFile, "onSuccess", 'onSuccess callbacks');
  fileContains(hooksFile, "onError", 'onError callbacks');
}

// =====================================================
// 6. FRONTEND COMPONENTS
// =====================================================

section('6. Frontend Components Verification (30 checks)');

const dashboardDir = path.join(__dirname, '../dashboard/src/pages/agent-feedback');

// Component files
const feedbackForm = path.join(dashboardDir, 'FeedbackForm.tsx');
const statsCard = path.join(dashboardDir, 'FeedbackStatsCard.tsx');
const issuesChart = path.join(dashboardDir, 'TrendingIssuesChart.tsx');
const historyTable = path.join(dashboardDir, 'FeedbackHistoryTable.tsx');
const planViewer = path.join(dashboardDir, 'ImprovementPlanViewer.tsx');
const dashboard = path.join(dashboardDir, 'AgentFeedbackDashboard.tsx');
const indexFile = path.join(dashboardDir, 'index.ts');

fileExists(feedbackForm, 'FeedbackForm component');
fileExists(statsCard, 'FeedbackStatsCard component');
fileExists(issuesChart, 'TrendingIssuesChart component');
fileExists(historyTable, 'FeedbackHistoryTable component');
fileExists(planViewer, 'ImprovementPlanViewer component');
fileExists(dashboard, 'AgentFeedbackDashboard component');
fileExists(indexFile, 'Component index file');

// FeedbackForm checks
if (fs.existsSync(feedbackForm)) {
  fileContains(feedbackForm, "useSubmitFeedback", 'FeedbackForm uses useSubmitFeedback hook');
  fileContains(feedbackForm, "FeedbackRating", 'FeedbackForm handles ratings');
  fileContains(feedbackForm, "FeedbackScope", 'FeedbackForm handles categories');
  fileContains(feedbackForm, "isAnonymous", 'FeedbackForm supports anonymous feedback');
  fileContains(feedbackForm, "RATING_OPTIONS", 'FeedbackForm has rating options');
  fileContains(feedbackForm, "CATEGORY_OPTIONS", 'FeedbackForm has category options');
}

// FeedbackStatsCard checks
if (fs.existsSync(statsCard)) {
  fileContains(statsCard, "FeedbackMetrics", 'FeedbackStatsCard uses FeedbackMetrics type');
  fileContains(statsCard, "avgRating", 'FeedbackStatsCard displays average rating');
  fileContains(statsCard, "totalFeedback", 'FeedbackStatsCard displays total feedback');
  fileContains(statsCard, "ratingDistribution", 'FeedbackStatsCard displays rating distribution');
}

// TrendingIssuesChart checks
if (fs.existsSync(issuesChart)) {
  fileContains(issuesChart, "BarChart", 'TrendingIssuesChart uses BarChart');
  fileContains(issuesChart, "IssueSummary", 'TrendingIssuesChart uses IssueSummary type');
  fileContains(issuesChart, "avgRating", 'TrendingIssuesChart displays average rating');
}

// FeedbackHistoryTable checks
if (fs.existsSync(historyTable)) {
  fileContains(historyTable, "AgentFeedbackEntry", 'FeedbackHistoryTable uses AgentFeedbackEntry type');
  fileContains(historyTable, "searchTerm", 'FeedbackHistoryTable has search functionality');
  fileContains(historyTable, "ratingFilter", 'FeedbackHistoryTable has rating filter');
  fileContains(historyTable, "sortBy", 'FeedbackHistoryTable has sorting functionality');
}

// ImprovementPlanViewer checks
if (fs.existsSync(planViewer)) {
  fileContains(planViewer, "ImprovementPlan", 'ImprovementPlanViewer uses ImprovementPlan type');
  fileContains(planViewer, "proposedChanges", 'ImprovementPlanViewer displays proposed changes');
  fileContains(planViewer, "priority", 'ImprovementPlanViewer displays priority');
  fileContains(planViewer, "confidence", 'ImprovementPlanViewer displays confidence');
}

// AgentFeedbackDashboard checks
if (fs.existsSync(dashboard)) {
  fileContains(dashboard, "useFeedbackSummary", 'Dashboard uses useFeedbackSummary hook');
  fileContains(dashboard, "useImprovementPlans", 'Dashboard uses useImprovementPlans hook');
  fileContains(dashboard, "useGenerateImprovementPlans", 'Dashboard uses useGenerateImprovementPlans hook');
  fileContains(dashboard, "FeedbackForm", 'Dashboard includes FeedbackForm');
  fileContains(dashboard, "FeedbackStatsCard", 'Dashboard includes FeedbackStatsCard');
  fileContains(dashboard, "TrendingIssuesChart", 'Dashboard includes TrendingIssuesChart');
  fileContains(dashboard, "FeedbackHistoryTable", 'Dashboard includes FeedbackHistoryTable');
  fileContains(dashboard, "ImprovementPlanViewer", 'Dashboard includes ImprovementPlanViewer');
}

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
  log('\n✓ Sprint 48 Phase 4.4 verification PASSED!', 'green');
  log('All components are properly implemented.\n', 'green');
  process.exit(0);
} else if (failCount === 0) {
  log('\n⚠ Sprint 48 Phase 4.4 verification PASSED with warnings', 'yellow');
  log('Review warnings before deployment.\n', 'yellow');
  process.exit(0);
} else {
  log('\n✗ Sprint 48 Phase 4.4 verification FAILED', 'red');
  log('Fix the failed checks before deployment.\n', 'red');
  process.exit(1);
}
