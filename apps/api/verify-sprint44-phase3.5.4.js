#!/usr/bin/env node

/**
 * =====================================================
 * VERIFICATION SCRIPT: Sprint 44 Phase 3.5.4
 * Agent Personality & Behavior Modeling System
 * =====================================================
 *
 * This script verifies the implementation of:
 * 1. Agent persona generation
 * 2. Personality application to prompts
 * 3. Persona traits analytics
 * 4. Database schema for personality profiles
 * 5. API endpoints for personality operations
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
const typesPath = path.join(basePath, '../../packages/shared-types/src/agent-personality.ts');
const typesIndexPath = path.join(basePath, '../../packages/shared-types/src/index.ts');
const migrationPath = path.join(
  basePath,
  'src/database/migrations/20251104_create_agent_personality_profiles.sql'
);
const servicePath = path.join(basePath, 'src/services/agentPersonalityEngine.ts');
const routesPath = path.join(basePath, 'src/routes/agent-personality.ts');

// =====================================================
// 1. VERIFY TYPE DEFINITIONS
// =====================================================

section('1. Type Definitions');

check(
  'agent-personality.ts file exists',
  fs.existsSync(typesPath),
  typesPath
);

if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, 'utf-8');

  // Check core interfaces
  check(
    'AgentPersona interface defined',
    typesContent.includes('export interface AgentPersona')
  );

  check(
    'PersonaTraitsAnalytics interface defined',
    typesContent.includes('export interface PersonaTraitsAnalytics')
  );

  check(
    'GeneratePersonaRequest interface defined',
    typesContent.includes('export interface GeneratePersonaRequest')
  );

  check(
    'ApplyPersonalityRequest interface defined',
    typesContent.includes('export interface ApplyPersonalityRequest')
  );

  check(
    'ApplyPersonalityResult interface defined',
    typesContent.includes('export interface ApplyPersonalityResult')
  );

  check(
    'PersonalityProfile interface defined',
    typesContent.includes('export interface PersonalityProfile')
  );

  check(
    'CognitiveBias interface defined',
    typesContent.includes('export interface CognitiveBias')
  );

  // Check type definitions
  check(
    'PersonalityTone type defined',
    typesContent.includes("export type PersonalityTone")
  );

  check(
    'DecisionStyle type defined',
    typesContent.includes("export type DecisionStyle")
  );

  check(
    'CollaborationStyle type defined',
    typesContent.includes("export type CollaborationStyle")
  );

  check(
    'MemoryStyle type defined',
    typesContent.includes("export type MemoryStyle")
  );

  check(
    'UserAlignment type defined',
    typesContent.includes("export type UserAlignment")
  );

  check(
    'BiasType type defined',
    typesContent.includes("export type BiasType")
  );

  // Check AgentPersona has required fields
  const personaMatch = typesContent.match(
    /export interface AgentPersona\s*{([^}]+)}/s
  );
  if (personaMatch) {
    const personaFields = personaMatch[1];
    check(
      'AgentPersona has tone field',
      personaFields.includes('tone')
    );
    check(
      'AgentPersona has decisionStyle field',
      personaFields.includes('decisionStyle')
    );
    check(
      'AgentPersona has collaborationStyle field',
      personaFields.includes('collaborationStyle')
    );
    check(
      'AgentPersona has memoryStyle field',
      personaFields.includes('memoryStyle')
    );
    check(
      'AgentPersona has userAlignment field',
      personaFields.includes('userAlignment')
    );
    check(
      'AgentPersona has biases field',
      personaFields.includes('biases')
    );
  }
}

// Check types are exported from index
if (fs.existsSync(typesIndexPath)) {
  const indexContent = fs.readFileSync(typesIndexPath, 'utf-8');
  check(
    'agent-personality types exported from index',
    indexContent.includes("export * from './agent-personality'")
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
    'personality_tone enum created',
    migrationContent.includes("CREATE TYPE personality_tone AS ENUM")
  );

  check(
    'decision_style enum created',
    migrationContent.includes("CREATE TYPE decision_style AS ENUM")
  );

  check(
    'collaboration_style enum created',
    migrationContent.includes("CREATE TYPE collaboration_style AS ENUM")
  );

  check(
    'memory_style enum created',
    migrationContent.includes("CREATE TYPE memory_style AS ENUM")
  );

  check(
    'user_alignment enum created',
    migrationContent.includes("CREATE TYPE user_alignment AS ENUM")
  );

  check(
    'bias_type enum created',
    migrationContent.includes("CREATE TYPE bias_type AS ENUM")
  );

  // Check table creation
  check(
    'agent_personality_profiles table created',
    migrationContent.includes('CREATE TABLE IF NOT EXISTS agent_personality_profiles')
  );

  // Check required columns
  check(
    'agent_id column exists',
    migrationContent.includes('agent_id UUID NOT NULL')
  );

  check(
    'organization_id column exists',
    migrationContent.includes('organization_id UUID NOT NULL')
  );

  check(
    'tone column exists',
    migrationContent.includes('tone personality_tone NOT NULL')
  );

  check(
    'decision_style column exists',
    migrationContent.includes('decision_style decision_style NOT NULL')
  );

  check(
    'collaboration_style column exists',
    migrationContent.includes('collaboration_style collaboration_style NOT NULL')
  );

  check(
    'memory_style column exists',
    migrationContent.includes('memory_style memory_style NOT NULL')
  );

  check(
    'user_alignment column exists',
    migrationContent.includes('user_alignment user_alignment NOT NULL')
  );

  check(
    'biases column exists',
    migrationContent.includes('biases JSONB NOT NULL')
  );

  check(
    'confidence_score column exists',
    migrationContent.includes('confidence_score DECIMAL')
  );

  check(
    'is_active column exists',
    migrationContent.includes('is_active BOOLEAN NOT NULL')
  );

  check(
    'version column exists',
    migrationContent.includes('version INTEGER NOT NULL')
  );

  // Check indexes
  check(
    'Agent ID index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_agent_id')
  );

  check(
    'Active profiles index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_active')
  );

  check(
    'Biases GIN index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_biases')
  );

  check(
    'Traits GIN index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_personality_profiles_traits')
  );

  // Check helper functions
  check(
    'get_active_personality_profile function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_active_personality_profile(')
  );

  check(
    'get_personality_profile_version function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_personality_profile_version(')
  );

  check(
    'get_personality_evolution function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_personality_evolution(')
  );

  check(
    'get_agents_by_tone function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_agents_by_tone(')
  );

  check(
    'get_agents_by_decision_style function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_agents_by_decision_style(')
  );

  check(
    'get_personality_trait_distribution function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_personality_trait_distribution(')
  );

  check(
    'compare_agent_personalities function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION compare_agent_personalities(')
  );

  // Check RLS
  check(
    'Row Level Security enabled',
    migrationContent.includes('ALTER TABLE agent_personality_profiles ENABLE ROW LEVEL SECURITY')
  );

  check(
    'RLS select policy created',
    migrationContent.includes('CREATE POLICY agent_personality_profiles_select_policy')
  );

  // Check triggers
  check(
    'Update timestamp trigger created',
    migrationContent.includes('CREATE TRIGGER trigger_update_personality_profile_timestamp')
  );

  check(
    'Deactivate old profiles trigger created',
    migrationContent.includes('CREATE TRIGGER trigger_deactivate_old_personality_profiles')
  );

  check(
    'Auto-increment version trigger created',
    migrationContent.includes('CREATE TRIGGER trigger_auto_increment_personality_version')
  );
}

// =====================================================
// 3. VERIFY SERVICE IMPLEMENTATION
// =====================================================

section('3. Service Implementation');

check(
  'agentPersonalityEngine.ts file exists',
  fs.existsSync(servicePath),
  servicePath
);

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  // Check class definition
  check(
    'AgentPersonalityEngine class defined',
    serviceContent.includes('class AgentPersonalityEngine')
  );

  // Check core methods
  check(
    'generateAgentPersona method exists',
    serviceContent.includes('generateAgentPersona')
  );

  check(
    'applyPersonalityToPrompt method exists',
    serviceContent.includes('applyPersonalityToPrompt')
  );

  check(
    'getPersonaTraits method exists',
    serviceContent.includes('getPersonaTraits')
  );

  // Check generateAgentPersona implementation
  check(
    'generateAgentPersona fetches agent settings',
    serviceContent.includes('fetchAgentSettings')
  );

  check(
    'generateAgentPersona fetches memory patterns',
    serviceContent.includes('fetchMemoryPatterns')
  );

  check(
    'generateAgentPersona fetches collaboration patterns',
    serviceContent.includes('fetchCollaborationPatterns')
  );

  check(
    'generateAgentPersona fetches playbook patterns',
    serviceContent.includes('fetchPlaybookPatterns')
  );

  check(
    'generateAgentPersona determines tone',
    serviceContent.includes('determineTone')
  );

  check(
    'generateAgentPersona determines decision style',
    serviceContent.includes('determineDecisionStyle')
  );

  check(
    'generateAgentPersona determines collaboration style',
    serviceContent.includes('determineCollaborationStyle')
  );

  check(
    'generateAgentPersona detects biases',
    serviceContent.includes('detectBiases')
  );

  check(
    'generateAgentPersona saves profile to database',
    serviceContent.includes('saveProfile')
  );

  // Check applyPersonalityToPrompt implementation
  check(
    'applyPersonalityToPrompt has tone modifier logic',
    serviceContent.includes('getToneModifier') &&
      serviceContent.includes('injectToneModifier')
  );

  check(
    'applyPersonalityToPrompt has style modifier logic',
    serviceContent.includes('getStyleModifier') &&
      serviceContent.includes('injectStyleModifier')
  );

  check(
    'applyPersonalityToPrompt has bias reminder logic',
    serviceContent.includes('getBiasReminders') &&
      serviceContent.includes('injectBiasReminders')
  );

  check(
    'applyPersonalityToPrompt replaces placeholders',
    serviceContent.includes('.replace') &&
      (serviceContent.includes('tone') || serviceContent.includes('decisionStyle'))
  );

  check(
    'applyPersonalityToPrompt estimates token usage',
    serviceContent.includes('tokensAdded') ||
      serviceContent.includes('totalTokens')
  );

  // Check getPersonaTraits implementation
  check(
    'getPersonaTraits analyzes tone usage',
    serviceContent.includes('analyzeToneUsage')
  );

  check(
    'getPersonaTraits analyzes collaboration patterns',
    serviceContent.includes('analyzeCollaborationPatterns')
  );

  check(
    'getPersonaTraits analyzes decision metrics',
    serviceContent.includes('analyzeDecisionMetrics')
  );

  check(
    'getPersonaTraits detects behavioral trends',
    serviceContent.includes('detectBehavioralTrends')
  );

  check(
    'getPersonaTraits analyzes communication style',
    serviceContent.includes('analyzeCommunicationStyle')
  );

  check(
    'getPersonaTraits analyzes task patterns',
    serviceContent.includes('analyzeTaskPatterns')
  );

  // Check error handling
  check(
    'Service has error handling',
    serviceContent.includes('try') &&
      serviceContent.includes('catch')
  );

  // Check imports
  check(
    'Service imports database client',
    serviceContent.includes('supabase') ||
      serviceContent.includes('pool')
  );

  check(
    'Service imports types',
    serviceContent.includes('@pravado/shared-types') ||
      serviceContent.includes('AgentPersona')
  );

  // Check singleton export
  check(
    'Service exported as singleton',
    serviceContent.includes('export const agentPersonalityEngine')
  );
}

// =====================================================
// 4. VERIFY API ROUTES
// =====================================================

section('4. API Routes');

check(
  'agent-personality.ts routes file exists',
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
    'POST /generate endpoint exists',
    routesContent.includes("router.post('/generate'") ||
      routesContent.includes('router.post("/generate"')
  );

  check(
    'POST /apply endpoint exists',
    routesContent.includes("router.post('/apply'") ||
      routesContent.includes('router.post("/apply"')
  );

  check(
    'POST /traits endpoint exists',
    routesContent.includes("router.post('/traits'") ||
      routesContent.includes('router.post("/traits"')
  );

  check(
    'GET /profile/:agentId endpoint exists',
    routesContent.includes("router.get('/profile/:agentId'") ||
      routesContent.includes('router.get("/profile/:agentId"')
  );

  check(
    'GET /evolution/:agentId endpoint exists',
    routesContent.includes("router.get('/evolution/:agentId'") ||
      routesContent.includes('router.get("/evolution/:agentId"')
  );

  check(
    'GET /by-tone/:tone endpoint exists',
    routesContent.includes("router.get('/by-tone/:tone'") ||
      routesContent.includes('router.get("/by-tone/:tone"')
  );

  check(
    'GET /by-decision-style/:style endpoint exists',
    routesContent.includes("router.get('/by-decision-style/:style'") ||
      routesContent.includes('router.get("/by-decision-style/:style"')
  );

  check(
    'GET /distribution endpoint exists',
    routesContent.includes("router.get('/distribution'") ||
      routesContent.includes('router.get("/distribution"')
  );

  check(
    'GET /compare/:agentA/:agentB endpoint exists',
    routesContent.includes("router.get('/compare/:agentA/:agentB'") ||
      routesContent.includes('router.get("/compare/:agentA/:agentB"')
  );

  check(
    'PUT /profile/:profileId/activate endpoint exists',
    routesContent.includes("router.put('/profile/:profileId/activate'") ||
      routesContent.includes('router.put("/profile/:profileId/activate"')
  );

  check(
    'DELETE /profile/:profileId endpoint exists',
    routesContent.includes("router.delete('/profile/:profileId'") ||
      routesContent.includes('router.delete("/profile/:profileId"')
  );

  // Check endpoint implementations
  check(
    '/generate endpoint calls generateAgentPersona',
    routesContent.includes('generateAgentPersona')
  );

  check(
    '/apply endpoint calls applyPersonalityToPrompt',
    routesContent.includes('applyPersonalityToPrompt')
  );

  check(
    '/traits endpoint calls getPersonaTraits',
    routesContent.includes('getPersonaTraits')
  );

  check(
    '/profile endpoint uses get_active_personality_profile',
    routesContent.includes('get_active_personality_profile')
  );

  check(
    '/evolution endpoint uses get_personality_evolution',
    routesContent.includes('get_personality_evolution')
  );

  check(
    '/by-tone endpoint uses get_agents_by_tone',
    routesContent.includes('get_agents_by_tone')
  );

  check(
    '/by-decision-style endpoint uses get_agents_by_decision_style',
    routesContent.includes('get_agents_by_decision_style')
  );

  check(
    '/distribution endpoint uses get_personality_trait_distribution',
    routesContent.includes('get_personality_trait_distribution')
  );

  check(
    '/compare endpoint uses compare_agent_personalities',
    routesContent.includes('compare_agent_personalities')
  );

  // Check error handling
  check(
    'Routes have error handling',
    routesContent.includes('try') &&
      routesContent.includes('catch')
  );

  // Check imports
  check(
    'Routes import agentPersonalityEngine',
    routesContent.includes('agentPersonalityEngine')
  );

  check(
    'Routes import database pool',
    routesContent.includes('pool')
  );

  check(
    'Routes import types',
    routesContent.includes('@pravado/shared-types') ||
      routesContent.includes('GeneratePersonaRequest')
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
  console.log(`\n${colors.green}✓ All checks passed! Sprint 44 Phase 3.5.4 implementation is complete.${colors.reset}`);
} else if (percentage >= 80) {
  console.log(`\n${colors.yellow}⚠ Most checks passed, but some items need attention.${colors.reset}`);
} else {
  console.log(`\n${colors.red}✗ Multiple checks failed. Please review the implementation.${colors.reset}`);
}

console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
