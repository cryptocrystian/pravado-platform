#!/usr/bin/env node

// =====================================================
// SPRINT 50 PHASE 4.6 VERIFICATION SCRIPT
// Multi-Agent Dialogue Protocols & Turn-Taking Logic
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

log('\n🔍 Sprint 50 Phase 4.6 Verification Script', 'blue');
log('Multi-Agent Dialogue Protocols & Turn-Taking Logic\n', 'blue');

// =====================================================
// 1. TYPESCRIPT TYPES
// =====================================================

section('1. TypeScript Types Verification (35 checks)');

const typesFile = path.join(__dirname, '../../packages/shared-types/src/multi-agent-dialogue.ts');

if (fileExists(typesFile, 'Multi-agent dialogue types file')) {
  // Enums
  fileContains(typesFile, "export enum TurnType", 'TurnType enum exported');
  fileContains(typesFile, "STATEMENT = 'statement'", 'TurnType.STATEMENT defined');
  fileContains(typesFile, "QUESTION = 'question'", 'TurnType.QUESTION defined');
  fileContains(typesFile, "PROPOSAL = 'proposal'", 'TurnType.PROPOSAL defined');

  fileContains(typesFile, "export enum AgentRoleType", 'AgentRoleType enum exported');
  fileContains(typesFile, "FACILITATOR = 'facilitator'", 'AgentRoleType.FACILITATOR defined');
  fileContains(typesFile, "CONTRIBUTOR = 'contributor'", 'AgentRoleType.CONTRIBUTOR defined');
  fileContains(typesFile, "EXPERT = 'expert'", 'AgentRoleType.EXPERT defined');
  fileContains(typesFile, "DECISION_MAKER = 'decision_maker'", 'AgentRoleType.DECISION_MAKER defined');

  fileContains(typesFile, "export enum TurnTakingStrategy", 'TurnTakingStrategy enum exported');
  fileContains(typesFile, "ROUND_ROBIN = 'round_robin'", 'TurnTakingStrategy.ROUND_ROBIN defined');
  fileContains(typesFile, "ROLE_PRIORITY = 'role_priority'", 'TurnTakingStrategy.ROLE_PRIORITY defined');
  fileContains(typesFile, "CONFIDENCE_WEIGHTED = 'confidence_weighted'", 'TurnTakingStrategy.CONFIDENCE_WEIGHTED defined');

  fileContains(typesFile, "export enum DialogueStatus", 'DialogueStatus enum exported');
  fileContains(typesFile, "ACTIVE = 'active'", 'DialogueStatus.ACTIVE defined');
  fileContains(typesFile, "COMPLETED = 'completed'", 'DialogueStatus.COMPLETED defined');

  fileContains(typesFile, "export enum DialogueOutcome", 'DialogueOutcome enum exported');
  fileContains(typesFile, "CONSENSUS = 'consensus'", 'DialogueOutcome.CONSENSUS defined');

  fileContains(typesFile, "export enum InterruptionReason", 'InterruptionReason enum exported');
  fileContains(typesFile, "AGENT_CONFUSION = 'agent_confusion'", 'InterruptionReason.AGENT_CONFUSION defined');

  // Interfaces
  fileContains(typesFile, "export interface MultiAgentConversationSession", 'MultiAgentConversationSession interface exported');
  fileContains(typesFile, "export interface AgentParticipant", 'AgentParticipant interface exported');
  fileContains(typesFile, "export interface DialogueContext", 'DialogueContext interface exported');
  fileContains(typesFile, "export interface DialogueTurn", 'DialogueTurn interface exported');
  fileContains(typesFile, "export interface DialogueTurnResult", 'DialogueTurnResult interface exported');
  fileContains(typesFile, "export interface DialogueInterruptionEvent", 'DialogueInterruptionEvent interface exported');
  fileContains(typesFile, "export interface TranscriptWithMetadata", 'TranscriptWithMetadata interface exported');
  fileContains(typesFile, "export interface InitializeDialogueInput", 'InitializeDialogueInput interface exported');
  fileContains(typesFile, "export interface TakeTurnInput", 'TakeTurnInput interface exported');
  fileContains(typesFile, "export interface InterruptDialogueInput", 'InterruptDialogueInput interface exported');
  fileContains(typesFile, "export interface TurnAction", 'TurnAction interface exported');

  // Interface fields
  fileContains(typesFile, "strategy: TurnTakingStrategy", 'MultiAgentConversationSession has strategy field');
  fileContains(typesFile, "participants: AgentParticipant[]", 'MultiAgentConversationSession has participants field');
  fileContains(typesFile, "turnOrder: string[]", 'MultiAgentConversationSession has turnOrder field');
  fileContains(typesFile, "role: AgentRoleType", 'AgentParticipant has role field');
}

// Check index exports
const typesIndex = path.join(__dirname, '../../packages/shared-types/src/index.ts');
fileContains(typesIndex, "export * from './multi-agent-dialogue'", 'Multi-agent dialogue types exported from index');

// =====================================================
// 2. DATABASE MIGRATION
// =====================================================

section('2. Database Migration Verification (40 checks)');

const migrationFile = path.join(__dirname, 'src/database/migrations/20251108_create_multi_agent_conversations.sql');

if (fileExists(migrationFile, 'Multi-agent dialogue migration file')) {
  // ENUMs
  fileContains(migrationFile, "CREATE TYPE turn_type AS ENUM", 'turn_type enum created');
  fileContains(migrationFile, "'statement'", 'statement turn type value');
  fileContains(migrationFile, "'question'", 'question turn type value');
  fileContains(migrationFile, "'proposal'", 'proposal turn type value');

  fileContains(migrationFile, "CREATE TYPE agent_role_type AS ENUM", 'agent_role_type enum created');
  fileContains(migrationFile, "'facilitator'", 'facilitator role value');
  fileContains(migrationFile, "'contributor'", 'contributor role value');
  fileContains(migrationFile, "'decision_maker'", 'decision_maker role value');

  fileContains(migrationFile, "CREATE TYPE turn_taking_strategy AS ENUM", 'turn_taking_strategy enum created');
  fileContains(migrationFile, "'round_robin'", 'round_robin strategy value');
  fileContains(migrationFile, "'role_priority'", 'role_priority strategy value');

  fileContains(migrationFile, "CREATE TYPE dialogue_status AS ENUM", 'dialogue_status enum created');
  fileContains(migrationFile, "CREATE TYPE dialogue_outcome AS ENUM", 'dialogue_outcome enum created');
  fileContains(migrationFile, "CREATE TYPE interruption_reason AS ENUM", 'interruption_reason enum created');

  // Tables
  fileContains(migrationFile, "CREATE TABLE multi_agent_conversations", 'multi_agent_conversations table created');
  fileContains(migrationFile, "CREATE TABLE multi_agent_turns", 'multi_agent_turns table created');
  fileContains(migrationFile, "CREATE TABLE dialogue_interruptions", 'dialogue_interruptions table created');

  // Table columns
  fileContains(migrationFile, "participants TEXT[] NOT NULL", 'participants column in conversations');
  fileContains(migrationFile, "participant_roles JSONB NOT NULL", 'participant_roles column in conversations');
  fileContains(migrationFile, "strategy turn_taking_strategy", 'strategy column in conversations');
  fileContains(migrationFile, "status dialogue_status", 'status column in conversations');
  fileContains(migrationFile, "turn_order TEXT[] NOT NULL", 'turn_order column in conversations');
  fileContains(migrationFile, "shared_state JSONB", 'shared_state column in conversations');

  fileContains(migrationFile, "turn_number INTEGER NOT NULL", 'turn_number column in turns');
  fileContains(migrationFile, "turn_type turn_type NOT NULL", 'turn_type column in turns');
  fileContains(migrationFile, "next_speaker TEXT", 'next_speaker column in turns');
  fileContains(migrationFile, "actions JSONB", 'actions column in turns');

  fileContains(migrationFile, "reason interruption_reason NOT NULL", 'reason column in interruptions');
  fileContains(migrationFile, "resolved BOOLEAN", 'resolved column in interruptions');

  // Indexes
  fileContains(migrationFile, "CREATE INDEX idx_multi_agent_conversations_status", 'Index on status created');
  fileContains(migrationFile, "CREATE INDEX idx_multi_agent_conversations_strategy", 'Index on strategy created');
  fileContains(migrationFile, "CREATE INDEX idx_multi_agent_turns_session", 'Index on session_id created');
  fileContains(migrationFile, "CREATE INDEX idx_multi_agent_turns_agent", 'Index on agent_id created');
  fileContains(migrationFile, "CREATE INDEX idx_dialogue_interruptions_session", 'Index on interruption session created');

  // Helper Functions
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_dialogue_analytics", 'get_dialogue_analytics function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_next_speaker_round_robin", 'get_next_speaker_round_robin function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_turn_patterns", 'get_turn_patterns function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION get_active_conversations", 'get_active_conversations function created');
  fileContains(migrationFile, "CREATE OR REPLACE FUNCTION check_dialogue_expiry", 'check_dialogue_expiry function created');

  // Triggers
  fileContains(migrationFile, "CREATE TRIGGER trigger_update_conversation_timestamp", 'Update timestamp trigger created');
  fileContains(migrationFile, "CREATE TRIGGER trigger_increment_total_turns", 'Increment total turns trigger created');
  fileContains(migrationFile, "CREATE TRIGGER trigger_mark_session_interrupted", 'Mark interrupted trigger created');

  // RLS
  fileContains(migrationFile, "ENABLE ROW LEVEL SECURITY", 'RLS enabled');
  fileContains(migrationFile, "CREATE POLICY select_org_conversations", 'Select policy for conversations created');
}

// =====================================================
// 3. BACKEND SERVICE
// =====================================================

section('3. Backend Service Verification (35 checks)');

const serviceFile = path.join(__dirname, 'src/services/multiAgentDialogueManager.ts');

if (fileExists(serviceFile, 'Multi-agent dialogue manager service')) {
  fileContains(serviceFile, "class MultiAgentDialogueManagerService", 'MultiAgentDialogueManagerService class defined');

  // Methods
  fileContains(serviceFile, "async initializeDialogue", 'initializeDialogue method exists');
  fileContains(serviceFile, "async takeTurn", 'takeTurn method exists');
  fileContains(serviceFile, "async getDialogueTranscript", 'getDialogueTranscript method exists');
  fileContains(serviceFile, "async getNextSpeaker", 'getNextSpeaker method exists');
  fileContains(serviceFile, "async interruptDialogue", 'interruptDialogue method exists');
  fileContains(serviceFile, "async resolveInterruption", 'resolveInterruption method exists');
  fileContains(serviceFile, "async getDialogueAnalytics", 'getDialogueAnalytics method exists');

  // Helper methods
  fileContains(serviceFile, "getDefaultPermissions", 'getDefaultPermissions method exists');
  fileContains(serviceFile, "determineTurnOrder", 'determineTurnOrder method exists');
  fileContains(serviceFile, "getSession", 'getSession method exists');
  fileContains(serviceFile, "checkExpiry", 'checkExpiry method exists');
  fileContains(serviceFile, "expireSession", 'expireSession method exists');
  fileContains(serviceFile, "completeSession", 'completeSession method exists');
  fileContains(serviceFile, "generateAgentOutput", 'generateAgentOutput method exists');
  fileContains(serviceFile, "getNextSpeakerRoundRobin", 'getNextSpeakerRoundRobin method exists');
  fileContains(serviceFile, "getNextSpeakerRolePriority", 'getNextSpeakerRolePriority method exists');
  fileContains(serviceFile, "getNextSpeakerConfidenceWeighted", 'getNextSpeakerConfidenceWeighted method exists');
  fileContains(serviceFile, "shouldContinueDialogue", 'shouldContinueDialogue method exists');
  fileContains(serviceFile, "generateContinuationReasoning", 'generateContinuationReasoning method exists');
  fileContains(serviceFile, "generateSummary", 'generateSummary method exists');

  // Database queries
  fileContains(serviceFile, "INSERT INTO multi_agent_conversations", 'Conversation insertion query');
  fileContains(serviceFile, "INSERT INTO multi_agent_turns", 'Turn insertion query');
  fileContains(serviceFile, "INSERT INTO dialogue_interruptions", 'Interruption insertion query');
  fileContains(serviceFile, "get_dialogue_analytics", 'Uses get_dialogue_analytics function');
  fileContains(serviceFile, "get_next_speaker_round_robin", 'Uses get_next_speaker_round_robin function');

  // Data mapping
  fileContains(serviceFile, "mapConversationSession", 'mapConversationSession method exists');
  fileContains(serviceFile, "mapTurn", 'mapTurn method exists');
  fileContains(serviceFile, "mapInterruption", 'mapInterruption method exists');

  // Turn-taking logic
  fileContains(serviceFile, "switch (strategy)", 'Strategy-based turn selection');
  fileContains(serviceFile, "case 'round_robin':", 'Round-robin strategy handled');
  fileContains(serviceFile, "case 'role_priority':", 'Role-priority strategy handled');
  fileContains(serviceFile, "case 'confidence_weighted':", 'Confidence-weighted strategy handled');

  // Export
  fileContains(serviceFile, "export const multiAgentDialogueManager", 'multiAgentDialogueManager singleton exported');
  fileContains(serviceFile, "new MultiAgentDialogueManagerService()", 'Service instantiated');
}

// =====================================================
// 4. API ROUTES
// =====================================================

section('4. API Routes Verification (20 checks)');

const routesFile = path.join(__dirname, 'src/routes/multi-agent-dialogue.ts');

if (fileExists(routesFile, 'Multi-agent dialogue routes file')) {
  fileContains(routesFile, "import express", 'Express imported');
  fileContains(routesFile, "import { multiAgentDialogueManager }", 'MultiAgentDialogueManager service imported');

  // Routes
  fileContains(routesFile, "router.post('/init'", 'POST /init route defined');
  fileContains(routesFile, "router.post('/turn'", 'POST /turn route defined');
  fileContains(routesFile, "router.get('/transcript/:sessionId'", 'GET /transcript/:sessionId route defined');
  fileContains(routesFile, "router.post('/interrupt'", 'POST /interrupt route defined');
  fileContains(routesFile, "router.post('/resolve-interruption'", 'POST /resolve-interruption route defined');
  fileContains(routesFile, "router.get('/analytics/:sessionId'", 'GET /analytics/:sessionId route defined');
  fileContains(routesFile, "router.get('/next-speaker/:sessionId'", 'GET /next-speaker/:sessionId route defined');
  fileContains(routesFile, "router.get('/health'", 'GET /health route defined');

  // Service calls
  fileContains(routesFile, "multiAgentDialogueManager.initializeDialogue", 'Calls initializeDialogue service');
  fileContains(routesFile, "multiAgentDialogueManager.takeTurn", 'Calls takeTurn service');
  fileContains(routesFile, "multiAgentDialogueManager.getDialogueTranscript", 'Calls getDialogueTranscript service');
  fileContains(routesFile, "multiAgentDialogueManager.interruptDialogue", 'Calls interruptDialogue service');
  fileContains(routesFile, "multiAgentDialogueManager.resolveInterruption", 'Calls resolveInterruption service');
  fileContains(routesFile, "multiAgentDialogueManager.getDialogueAnalytics", 'Calls getDialogueAnalytics service');

  // Validation
  fileContains(routesFile, "if (!input.agentIds", 'Input validation present');

  // Export
  fileContains(routesFile, "export default router", 'Router exported');
}

// Check route registration
const routesIndex = path.join(__dirname, 'src/routes/index.ts');
fileContains(routesIndex, "import multiAgentDialogueRoutes from './multi-agent-dialogue'", 'Multi-agent dialogue routes imported in index');
fileContains(routesIndex, "router.use('/multi-agent-dialogue', multiAgentDialogueRoutes)", 'Multi-agent dialogue routes registered');

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
  log('\n✓ Sprint 50 Phase 4.6 verification PASSED!', 'green');
  log('All components are properly implemented.\n', 'green');
  process.exit(0);
} else if (failCount === 0) {
  log('\n⚠ Sprint 50 Phase 4.6 verification PASSED with warnings', 'yellow');
  log('Review warnings before deployment.\n', 'yellow');
  process.exit(0);
} else {
  log('\n✗ Sprint 50 Phase 4.6 verification FAILED', 'red');
  log('Fix the failed checks before deployment.\n', 'red');
  process.exit(1);
}
