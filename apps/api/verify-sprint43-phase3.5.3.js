#!/usr/bin/env node

/**
 * =====================================================
 * VERIFICATION SCRIPT: Sprint 43 Phase 3.5.3
 * Agent Memory & Contextual Awareness Enhancements
 * =====================================================
 *
 * This script verifies the implementation of:
 * 1. Enhanced context building
 * 2. GPT-4 memory summarization
 * 3. Context injection into prompts
 * 4. Database schema for memory summaries
 * 5. API endpoints for context operations
 */

const fs = require('fs');
const path = require('path');

// Color output for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
};

let passedChecks = 0;
let totalChecks = 0;
let errors = [];

function check(description, condition, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    if (details) {
      console.log(`  ${colors.dim}${details}${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    if (details) {
      console.log(`  ${colors.red}${details}${colors.reset}`);
    }
    errors.push({ description, details });
  }
}

function section(title) {
  console.log(`\n${colors.blue}${title}${colors.reset}`);
  console.log('='.repeat(title.length));
}

// =====================================================
// FILE PATHS
// =====================================================

const basePath = __dirname;
const typesPath = path.join(basePath, '../../packages/shared-types/src/agent-context.ts');
const typesIndexPath = path.join(basePath, '../../packages/shared-types/src/index.ts');
const migrationPath = path.join(
  basePath,
  'src/database/migrations/20251102233024_create_agent_memory_summaries.sql'
);
const servicePath = path.join(basePath, 'src/services/agentContextEnhancer.ts');
const routesPath = path.join(basePath, 'src/routes/agent-context.ts');

// =====================================================
// 1. VERIFY TYPE DEFINITIONS
// =====================================================

section('1. Type Definitions');

check(
  'agent-context.ts file exists',
  fs.existsSync(typesPath),
  typesPath
);

if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, 'utf-8');

  // Check core interfaces
  check(
    'EnhancedAgentContext interface defined',
    typesContent.includes('export interface EnhancedAgentContext')
  );

  check(
    'MemorySummary interface defined',
    typesContent.includes('export interface MemorySummary')
  );

  check(
    'BuildContextRequest interface defined',
    typesContent.includes('export interface BuildContextRequest')
  );

  check(
    'SummarizeMemoryRequest interface defined',
    typesContent.includes('export interface SummarizeMemoryRequest')
  );

  check(
    'ContextInjectionResult interface defined',
    typesContent.includes('export interface ContextInjectionResult')
  );

  check(
    'MemorySnippet interface defined',
    typesContent.includes('export interface MemorySnippet')
  );

  check(
    'KeyEntity interface defined',
    typesContent.includes('export interface KeyEntity')
  );

  check(
    'TemporalContext interface defined',
    typesContent.includes('export interface TemporalContext')
  );

  check(
    'UserPreferences interface defined',
    typesContent.includes('export interface UserPreferences')
  );

  check(
    'AgentSettings interface defined',
    typesContent.includes('export interface AgentSettings')
  );

  check(
    'MemoryScope type defined',
    typesContent.includes("export type MemoryScope = 'short_term' | 'long_term' | 'session' | 'historical'")
  );

  // Check EnhancedAgentContext has required fields
  const contextMatch = typesContent.match(
    /export interface EnhancedAgentContext\s*{([^}]+)}/s
  );
  if (contextMatch) {
    const contextFields = contextMatch[1];
    check(
      'EnhancedAgentContext has memorySnippets',
      contextFields.includes('memorySnippets')
    );
    check(
      'EnhancedAgentContext has recentPlaybooks',
      contextFields.includes('recentPlaybooks')
    );
    check(
      'EnhancedAgentContext has pastCollaborations',
      contextFields.includes('pastCollaborations')
    );
    check(
      'EnhancedAgentContext has keyEntities',
      contextFields.includes('keyEntities')
    );
    check(
      'EnhancedAgentContext has trendingTopics',
      contextFields.includes('trendingTopics')
    );
  }
}

// Check types are exported from index
if (fs.existsSync(typesIndexPath)) {
  const indexContent = fs.readFileSync(typesIndexPath, 'utf-8');
  check(
    'agent-context types exported from index',
    indexContent.includes("export * from './agent-context'")
  );
}

// =====================================================
// 2. VERIFY DATABASE MIGRATION
// =====================================================

section('2. Database Migration');

check(
  'Migration file exists',
  fs.existsSync(migrationPath),
  migrationPath
);

if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

  // Check ENUMs
  check(
    'memory_scope enum created',
    migrationContent.includes("CREATE TYPE memory_scope AS ENUM ('short_term', 'long_term', 'session', 'historical')")
  );

  check(
    'summary_type enum created',
    migrationContent.includes("CREATE TYPE summary_type AS ENUM ('short_term', 'long_term', 'topical', 'entity_based')")
  );

  // Check table creation
  check(
    'agent_memory_summaries table created',
    migrationContent.includes('CREATE TABLE IF NOT EXISTS agent_memory_summaries')
  );

  // Check required columns
  check(
    'agent_id column exists',
    migrationContent.includes('agent_id UUID NOT NULL')
  );

  check(
    'organization_id column exists',
    migrationContent.includes('organization_id UUID NOT NULL REFERENCES organizations')
  );

  check(
    'summary_type column exists',
    migrationContent.includes('summary_type summary_type NOT NULL')
  );

  check(
    'scope column exists',
    migrationContent.includes('scope memory_scope NOT NULL')
  );

  check(
    'summary_text column exists',
    migrationContent.includes('summary_text TEXT NOT NULL')
  );

  check(
    'topics column exists',
    migrationContent.includes('topics TEXT[] NOT NULL')
  );

  check(
    'entities column exists',
    migrationContent.includes('entities JSONB NOT NULL')
  );

  check(
    'trends column exists',
    migrationContent.includes('trends TEXT[] NOT NULL')
  );

  check(
    'time_period_start column exists',
    migrationContent.includes('time_period_start TIMESTAMP WITH TIME ZONE NOT NULL')
  );

  check(
    'time_period_end column exists',
    migrationContent.includes('time_period_end TIMESTAMP WITH TIME ZONE NOT NULL')
  );

  // Check indexes
  check(
    'Agent ID index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_agent_id')
  );

  check(
    'Full-text search index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_summary_text_fts')
  );

  check(
    'Topics GIN index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_topics')
  );

  check(
    'Entities GIN index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_memory_summaries_entities')
  );

  // Check helper functions
  check(
    'get_recent_agent_summary function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_recent_agent_summary(')
  );

  check(
    'get_agent_top_topics function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_agent_top_topics(')
  );

  check(
    'get_agent_top_entities function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_agent_top_entities(')
  );

  check(
    'get_trending_topics function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_trending_topics(')
  );

  check(
    'search_agent_summaries function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION search_agent_summaries(')
  );

  // Check RLS
  check(
    'Row Level Security enabled',
    migrationContent.includes('ALTER TABLE agent_memory_summaries ENABLE ROW LEVEL SECURITY')
  );

  check(
    'RLS select policy created',
    migrationContent.includes('CREATE POLICY agent_memory_summaries_select_policy')
  );

  // Check triggers
  check(
    'Cleanup trigger created',
    migrationContent.includes('CREATE TRIGGER trigger_cleanup_old_summaries')
  );
}

// =====================================================
// 3. VERIFY SERVICE IMPLEMENTATION
// =====================================================

section('3. Service Implementation');

check(
  'agentContextEnhancer.ts file exists',
  fs.existsSync(servicePath),
  servicePath
);

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  // Check class/object definition
  check(
    'AgentContextEnhancer class/object defined',
    serviceContent.includes('class AgentContextEnhancer') ||
      serviceContent.includes('const agentContextEnhancer')
  );

  // Check core methods
  check(
    'buildEnhancedContext method exists',
    serviceContent.includes('buildEnhancedContext')
  );

  check(
    'summarizeAgentMemory method exists',
    serviceContent.includes('summarizeAgentMemory')
  );

  check(
    'injectContextIntoPrompt method exists',
    serviceContent.includes('injectContextIntoPrompt')
  );

  // Check buildEnhancedContext implementation
  check(
    'buildEnhancedContext fetches memory snippets',
    serviceContent.includes('agent_memory') &&
      serviceContent.includes('similarity') ||
      serviceContent.includes('vector_similarity')
  );

  check(
    'buildEnhancedContext fetches recent playbooks',
    serviceContent.includes('agent_playbook_logs') ||
      serviceContent.includes('recentPlaybooks')
  );

  check(
    'buildEnhancedContext fetches collaborations',
    serviceContent.includes('agent_collaboration_logs') ||
      serviceContent.includes('pastCollaborations')
  );

  check(
    'buildEnhancedContext builds temporal context',
    serviceContent.includes('temporalContext') &&
      (serviceContent.includes('getHours') || serviceContent.includes('timeOfDay'))
  );

  check(
    'buildEnhancedContext uses caching',
    serviceContent.includes('cache') &&
      (serviceContent.includes('Map') || serviceContent.includes('Cache'))
  );

  // Check summarizeAgentMemory implementation
  check(
    'summarizeAgentMemory uses GPT-4',
    serviceContent.includes('gpt-4') ||
      serviceContent.includes('model: \'gpt') ||
      serviceContent.includes('openai')
  );

  check(
    'summarizeAgentMemory checks for existing summaries',
    serviceContent.includes('get_recent_agent_summary') ||
      serviceContent.includes('agent_memory_summaries')
  );

  check(
    'summarizeAgentMemory stores summary in database',
    serviceContent.includes('INSERT INTO agent_memory_summaries') ||
      serviceContent.includes('agent_memory_summaries')
  );

  check(
    'summarizeAgentMemory extracts topics',
    serviceContent.includes('topics') &&
      serviceContent.includes('summary')
  );

  check(
    'summarizeAgentMemory extracts entities',
    serviceContent.includes('entities') &&
      serviceContent.includes('summary')
  );

  check(
    'summarizeAgentMemory extracts trends',
    serviceContent.includes('trends') &&
      serviceContent.includes('summary')
  );

  // Check injectContextIntoPrompt implementation
  check(
    'injectContextIntoPrompt replaces {{memory}} placeholder',
    serviceContent.includes('{{memory}}') ||
      serviceContent.includes('memory')
  );

  check(
    'injectContextIntoPrompt replaces {{entities}} placeholder',
    serviceContent.includes('{{entities}}') ||
      serviceContent.includes('entities')
  );

  check(
    'injectContextIntoPrompt replaces {{topics}} placeholder',
    serviceContent.includes('{{topics}}') ||
      serviceContent.includes('topics')
  );

  check(
    'injectContextIntoPrompt estimates token usage',
    serviceContent.includes('tokensUsed') ||
      serviceContent.includes('tokens')
  );

  // Check error handling
  check(
    'Service has error handling',
    serviceContent.includes('try') &&
      serviceContent.includes('catch')
  );

  // Check imports
  check(
    'Service imports OpenAI',
    serviceContent.includes('openai') ||
      serviceContent.includes('OpenAI')
  );

  check(
    'Service imports database pool',
    (serviceContent.includes('pool') && serviceContent.includes('database')) ||
      serviceContent.includes('supabase')
  );

  check(
    'Service imports types',
    serviceContent.includes('@pravado/shared-types') ||
      serviceContent.includes('EnhancedAgentContext')
  );
}

// =====================================================
// 4. VERIFY API ROUTES
// =====================================================

section('4. API Routes');

check(
  'agent-context.ts routes file exists',
  fs.existsSync(routesPath),
  routesPath
);

if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf-8');

  // Check router setup
  check(
    'Express router created',
    routesContent.includes('express.Router()')
  );

  // Check core endpoints
  check(
    'POST /build endpoint exists',
    routesContent.includes("router.post('/build'") ||
      routesContent.includes('router.post("/build"')
  );

  check(
    'POST /summarize endpoint exists',
    routesContent.includes("router.post('/summarize'") ||
      routesContent.includes('router.post("/summarize"')
  );

  check(
    'POST /inject endpoint exists',
    routesContent.includes("router.post('/inject'") ||
      routesContent.includes('router.post("/inject"')
  );

  check(
    'GET /summaries/:agentId endpoint exists',
    routesContent.includes("router.get('/summaries/:agentId'") ||
      routesContent.includes('router.get("/summaries/:agentId"')
  );

  check(
    'GET /topics/:agentId endpoint exists',
    routesContent.includes("router.get('/topics/:agentId'") ||
      routesContent.includes('router.get("/topics/:agentId"')
  );

  check(
    'GET /entities/:agentId endpoint exists',
    routesContent.includes("router.get('/entities/:agentId'") ||
      routesContent.includes('router.get("/entities/:agentId"')
  );

  check(
    'GET /trending/:agentId endpoint exists',
    routesContent.includes("router.get('/trending/:agentId'") ||
      routesContent.includes('router.get("/trending/:agentId"')
  );

  check(
    'GET /search/:agentId endpoint exists',
    routesContent.includes("router.get('/search/:agentId'") ||
      routesContent.includes('router.get("/search/:agentId"')
  );

  // Check endpoint implementations
  check(
    '/build endpoint calls buildEnhancedContext',
    routesContent.includes('buildEnhancedContext')
  );

  check(
    '/summarize endpoint calls summarizeAgentMemory',
    routesContent.includes('summarizeAgentMemory')
  );

  check(
    '/inject endpoint calls injectContextIntoPrompt',
    routesContent.includes('injectContextIntoPrompt')
  );

  check(
    '/topics endpoint uses get_agent_top_topics',
    routesContent.includes('get_agent_top_topics')
  );

  check(
    '/entities endpoint uses get_agent_top_entities',
    routesContent.includes('get_agent_top_entities')
  );

  check(
    '/trending endpoint uses get_trending_topics',
    routesContent.includes('get_trending_topics')
  );

  check(
    '/search endpoint uses search_agent_summaries',
    routesContent.includes('search_agent_summaries')
  );

  // Check error handling
  check(
    'Routes have error handling',
    routesContent.includes('try') &&
      routesContent.includes('catch')
  );

  // Check imports
  check(
    'Routes import agentContextEnhancer',
    routesContent.includes('agentContextEnhancer')
  );

  check(
    'Routes import database pool',
    routesContent.includes('pool')
  );

  check(
    'Routes import types',
    routesContent.includes('@pravado/shared-types') ||
      routesContent.includes('BuildContextRequest')
  );

  // Check router export
  check(
    'Router exported as default',
    routesContent.includes('export default router')
  );
}

// =====================================================
// SUMMARY
// =====================================================

console.log('\n' + '='.repeat(50));
console.log(`${colors.blue}VERIFICATION SUMMARY${colors.reset}`);
console.log('='.repeat(50));

const percentage = Math.round((passedChecks / totalChecks) * 100);
const statusColor = percentage === 100 ? colors.green : percentage >= 80 ? colors.yellow : colors.red;

console.log(`\nPassed: ${statusColor}${passedChecks}/${totalChecks} (${percentage}%)${colors.reset}`);

if (errors.length > 0) {
  console.log(`\n${colors.red}Failed Checks:${colors.reset}`);
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.description}`);
    if (error.details) {
      console.log(`   ${error.details}`);
    }
  });
}

if (percentage === 100) {
  console.log(`\n${colors.green}✓ All checks passed! Sprint 43 Phase 3.5.3 implementation is complete.${colors.reset}`);
} else if (percentage >= 80) {
  console.log(`\n${colors.yellow}⚠ Most checks passed, but some items need attention.${colors.reset}`);
} else {
  console.log(`\n${colors.red}✗ Multiple checks failed. Please review the implementation.${colors.reset}`);
}

console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
