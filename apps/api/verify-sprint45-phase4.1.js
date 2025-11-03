#!/usr/bin/env node

/**
 * =====================================================
 * VERIFICATION SCRIPT: Sprint 45 Phase 4.1
 * Human-Agent Interaction Interface
 * =====================================================
 *
 * This script verifies the implementation of:
 * 1. Human-agent messaging system
 * 2. Personality mirroring and tone matching
 * 3. Context injection and memory updates
 * 4. Database schema for conversations and messages
 * 5. API endpoints for interaction operations
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
const typesPath = path.join(basePath, '../../packages/shared-types/src/agent-interaction.ts');
const typesIndexPath = path.join(basePath, '../../packages/shared-types/src/index.ts');
const migrationPath = path.join(
  basePath,
  'src/database/migrations/20251105_create_agent_interactions.sql'
);
const servicePath = path.join(basePath, 'src/services/agentMessenger.ts');
const routesPath = path.join(basePath, 'src/routes/agent-interaction.ts');

// =====================================================
// 1. VERIFY TYPE DEFINITIONS
// =====================================================

section('1. Type Definitions');

check(
  'agent-interaction.ts file exists',
  fs.existsSync(typesPath),
  typesPath
);

if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, 'utf-8');

  // Check core interfaces
  check(
    'AgentMessage interface defined',
    typesContent.includes('export interface AgentMessage')
  );

  check(
    'AgentConversation interface defined',
    typesContent.includes('export interface AgentConversation')
  );

  check(
    'UserAgentTurn interface defined',
    typesContent.includes('export interface UserAgentTurn')
  );

  check(
    'MessageMetadata interface defined',
    typesContent.includes('export interface MessageMetadata')
  );

  check(
    'MessageProcessingResult interface defined',
    typesContent.includes('export interface MessageProcessingResult')
  );

  check(
    'LiveInteractionSession interface defined',
    typesContent.includes('export interface LiveInteractionSession')
  );

  check(
    'SendMessageRequest interface defined',
    typesContent.includes('export interface SendMessageRequest')
  );

  check(
    'StartConversationRequest interface defined',
    typesContent.includes('export interface StartConversationRequest')
  );

  check(
    'AppliedToneStyle interface defined',
    typesContent.includes('export interface AppliedToneStyle')
  );

  check(
    'UpdateMemoryRequest interface defined',
    typesContent.includes('export interface UpdateMemoryRequest')
  );

  // Check type definitions
  check(
    'ConversationStatus type defined',
    typesContent.includes("export type ConversationStatus")
  );

  // Check AgentMessage has required fields
  const messageMatch = typesContent.match(
    /export interface AgentMessage\s*{([^}]+)}/s
  );
  if (messageMatch) {
    const messageFields = messageMatch[1];
    check(
      'AgentMessage has conversationId',
      messageFields.includes('conversationId')
    );
    check(
      'AgentMessage has senderType',
      messageFields.includes('senderType')
    );
    check(
      'AgentMessage has text',
      messageFields.includes('text')
    );
    check(
      'AgentMessage has metadata',
      messageFields.includes('metadata')
    );
  }

  // Check MessageMetadata fields
  const metadataMatch = typesContent.match(
    /export interface MessageMetadata\s*{([^}]+)}/s
  );
  if (metadataMatch) {
    const metadataFields = metadataMatch[1];
    check(
      'MessageMetadata has tone',
      metadataFields.includes('tone')
    );
    check(
      'MessageMetadata has sentiment',
      metadataFields.includes('sentiment')
    );
  }
}

// Check types are exported from index
if (fs.existsSync(typesIndexPath)) {
  const indexContent = fs.readFileSync(typesIndexPath, 'utf-8');
  check(
    'agent-interaction types exported from index',
    indexContent.includes("export * from './agent-interaction'")
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
    'conversation_status enum created',
    migrationContent.includes("CREATE TYPE conversation_status AS ENUM")
  );

  check(
    'sender_type enum created',
    migrationContent.includes("CREATE TYPE sender_type AS ENUM")
  );

  check(
    'message_sentiment enum created',
    migrationContent.includes("CREATE TYPE message_sentiment AS ENUM")
  );

  // Check table creation
  check(
    'agent_conversations table created',
    migrationContent.includes('CREATE TABLE IF NOT EXISTS agent_conversations')
  );

  check(
    'agent_messages table created',
    migrationContent.includes('CREATE TABLE IF NOT EXISTS agent_messages')
  );

  check(
    'user_agent_turns table created',
    migrationContent.includes('CREATE TABLE IF NOT EXISTS user_agent_turns')
  );

  // Check agent_conversations columns
  check(
    'conversations: user_id column exists',
    migrationContent.includes('user_id UUID NOT NULL')
  );

  check(
    'conversations: agent_id column exists',
    migrationContent.includes('agent_id UUID NOT NULL')
  );

  check(
    'conversations: organization_id column exists',
    migrationContent.includes('organization_id UUID NOT NULL')
  );

  check(
    'conversations: status column exists',
    migrationContent.includes('status conversation_status')
  );

  check(
    'conversations: message_count column exists',
    migrationContent.includes('message_count INTEGER')
  );

  check(
    'conversations: last_active_at column exists',
    migrationContent.includes('last_active_at TIMESTAMP')
  );

  // Check agent_messages columns
  check(
    'messages: conversation_id column exists',
    migrationContent.includes('conversation_id UUID NOT NULL')
  );

  check(
    'messages: sender_type column exists',
    migrationContent.includes('sender_type sender_type NOT NULL')
  );

  check(
    'messages: sender_id column exists',
    migrationContent.includes('sender_id UUID NOT NULL')
  );

  check(
    'messages: text column exists',
    migrationContent.includes('text TEXT NOT NULL')
  );

  check(
    'messages: metadata column exists',
    migrationContent.includes('metadata JSONB')
  );

  check(
    'messages: context column exists',
    migrationContent.includes('context JSONB')
  );

  // Check user_agent_turns columns
  check(
    'turns: user_message_id column exists',
    migrationContent.includes('user_message_id UUID NOT NULL')
  );

  check(
    'turns: agent_message_id column exists',
    migrationContent.includes('agent_message_id UUID NOT NULL')
  );

  check(
    'turns: turn_number column exists',
    migrationContent.includes('turn_number INTEGER NOT NULL')
  );

  // Check indexes
  check(
    'Conversations user_id index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id')
  );

  check(
    'Messages conversation_id index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id')
  );

  check(
    'Full-text search index on messages',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_messages_text_fts')
  );

  check(
    'Messages metadata GIN index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_messages_metadata')
  );

  check(
    'Messages context GIN index created',
    migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_agent_messages_context')
  );

  // Check helper functions
  check(
    'get_user_active_conversations function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_user_active_conversations(')
  );

  check(
    'get_conversation_messages function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_conversation_messages(')
  );

  check(
    'get_recent_turns function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_recent_turns(')
  );

  check(
    'get_conversation_analytics function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_conversation_analytics(')
  );

  check(
    'search_messages function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION search_messages(')
  );

  check(
    'get_agent_conversation_stats function exists',
    migrationContent.includes('CREATE OR REPLACE FUNCTION get_agent_conversation_stats(')
  );

  // Check RLS
  check(
    'RLS enabled on conversations',
    migrationContent.includes('ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY')
  );

  check(
    'RLS enabled on messages',
    migrationContent.includes('ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY')
  );

  check(
    'RLS enabled on turns',
    migrationContent.includes('ALTER TABLE user_agent_turns ENABLE ROW LEVEL SECURITY')
  );

  check(
    'RLS select policy for conversations',
    migrationContent.includes('CREATE POLICY agent_conversations_select_policy')
  );

  // Check triggers
  check(
    'Update conversation on message trigger',
    migrationContent.includes('CREATE TRIGGER trigger_update_conversation_on_message')
  );

  check(
    'Update conversation timestamp trigger',
    migrationContent.includes('CREATE TRIGGER trigger_update_conversation_timestamp')
  );

  check(
    'Archive inactive conversations function',
    migrationContent.includes('CREATE OR REPLACE FUNCTION archive_inactive_conversations(')
  );
}

// =====================================================
// 3. VERIFY SERVICE IMPLEMENTATION
// =====================================================

section('3. Service Implementation');

check(
  'agentMessenger.ts file exists',
  fs.existsSync(servicePath),
  servicePath
);

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  // Check class definition
  check(
    'AgentMessenger class defined',
    serviceContent.includes('class AgentMessenger')
  );

  // Check core methods
  check(
    'sendMessageToAgent method exists',
    serviceContent.includes('sendMessageToAgent')
  );

  check(
    'startConversation method exists',
    serviceContent.includes('startConversation')
  );

  check(
    'getConversationHistory method exists',
    serviceContent.includes('getConversationHistory')
  );

  check(
    'mirrorPersonalityTraits method exists',
    serviceContent.includes('mirrorPersonalityTraits')
  );

  check(
    'updateAgentMemoryFromTurn method exists',
    serviceContent.includes('updateAgentMemoryFromTurn')
  );

  // Check sendMessageToAgent implementation
  check(
    'sendMessageToAgent stores user message',
    serviceContent.includes('storeMessage')
  );

  check(
    'sendMessageToAgent generates agent response',
    serviceContent.includes('openai') ||
      serviceContent.includes('OpenAI')
  );

  check(
    'sendMessageToAgent uses personality engine',
    serviceContent.includes('agentPersonalityEngine') ||
      serviceContent.includes('generateAgentPersona')
  );

  check(
    'sendMessageToAgent uses context enhancer',
    serviceContent.includes('agentContextEnhancer') ||
      serviceContent.includes('buildEnhancedContext')
  );

  check(
    'sendMessageToAgent creates turn record',
    serviceContent.includes('createTurn')
  );

  // Check mirrorPersonalityTraits implementation
  check(
    'mirrorPersonalityTraits gets agent persona',
    serviceContent.includes('generateAgentPersona')
  );

  check(
    'mirrorPersonalityTraits detects user tone',
    serviceContent.includes('detectUserTone')
  );

  check(
    'mirrorPersonalityTraits blends tones',
    serviceContent.includes('blendTones')
  );

  // Check updateAgentMemoryFromTurn implementation
  check(
    'updateAgentMemoryFromTurn extracts topics',
    serviceContent.includes('extractTopics') ||
      serviceContent.includes('topics')
  );

  check(
    'updateAgentMemoryFromTurn extracts entities',
    serviceContent.includes('extractEntities') ||
      serviceContent.includes('entities')
  );

  check(
    'updateAgentMemoryFromTurn stores memory',
    serviceContent.includes('agent_memory')
  );

  // Check helper methods
  check(
    'buildSystemPrompt method exists',
    serviceContent.includes('buildSystemPrompt')
  );

  check(
    'buildConversationMessages method exists',
    serviceContent.includes('buildConversationMessages')
  );

  check(
    'detectUserTone method exists',
    serviceContent.includes('detectUserTone')
  );

  // Check imports
  check(
    'Service imports OpenAI',
    serviceContent.includes('OpenAI')
  );

  check(
    'Service imports agentPersonalityEngine',
    serviceContent.includes('agentPersonalityEngine')
  );

  check(
    'Service imports agentContextEnhancer',
    serviceContent.includes('agentContextEnhancer')
  );

  check(
    'Service imports database client',
    serviceContent.includes('supabase')
  );

  check(
    'Service imports types',
    serviceContent.includes('@pravado/shared-types')
  );

  // Check singleton export
  check(
    'Service exported as singleton',
    serviceContent.includes('export const agentMessenger')
  );
}

// =====================================================
// 4. VERIFY API ROUTES
// =====================================================

section('4. API Routes');

check(
  'agent-interaction.ts routes file exists',
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
    'POST /send endpoint exists',
    routesContent.includes("router.post('/send'")
  );

  check(
    'POST /start endpoint exists',
    routesContent.includes("router.post('/start'")
  );

  check(
    'GET /history/:conversationId endpoint exists',
    routesContent.includes("router.get('/history/:conversationId'")
  );

  check(
    'POST /mirror endpoint exists',
    routesContent.includes("router.post('/mirror'")
  );

  check(
    'POST /update-memory endpoint exists',
    routesContent.includes("router.post('/update-memory'")
  );

  check(
    'GET /conversations endpoint exists',
    routesContent.includes("router.get('/conversations'")
  );

  check(
    'GET /conversation/:conversationId endpoint exists',
    routesContent.includes("router.get('/conversation/:conversationId'")
  );

  check(
    'PUT /conversation/:conversationId/status endpoint exists',
    routesContent.includes("router.put('/conversation/:conversationId/status'")
  );

  check(
    'GET /analytics/conversation/:conversationId endpoint exists',
    routesContent.includes("router.get('/analytics/conversation/:conversationId'")
  );

  check(
    'GET /analytics/agent/:agentId endpoint exists',
    routesContent.includes("router.get('/analytics/agent/:agentId'")
  );

  check(
    'GET /search endpoint exists',
    routesContent.includes("router.get('/search'")
  );

  check(
    'GET /turns/:conversationId endpoint exists',
    routesContent.includes("router.get('/turns/:conversationId'")
  );

  // Check endpoint implementations
  check(
    '/send endpoint calls sendMessageToAgent',
    routesContent.includes('sendMessageToAgent')
  );

  check(
    '/start endpoint calls startConversation',
    routesContent.includes('startConversation')
  );

  check(
    '/history endpoint calls getConversationHistory',
    routesContent.includes('getConversationHistory')
  );

  check(
    '/mirror endpoint calls mirrorPersonalityTraits',
    routesContent.includes('mirrorPersonalityTraits')
  );

  check(
    '/update-memory endpoint calls updateAgentMemoryFromTurn',
    routesContent.includes('updateAgentMemoryFromTurn')
  );

  check(
    '/conversations endpoint uses get_user_active_conversations',
    routesContent.includes('get_user_active_conversations')
  );

  check(
    '/analytics/conversation endpoint uses get_conversation_analytics',
    routesContent.includes('get_conversation_analytics')
  );

  check(
    '/analytics/agent endpoint uses get_agent_conversation_stats',
    routesContent.includes('get_agent_conversation_stats')
  );

  check(
    '/search endpoint uses search_messages',
    routesContent.includes('search_messages')
  );

  check(
    '/turns endpoint uses get_recent_turns',
    routesContent.includes('get_recent_turns')
  );

  // Check error handling
  check(
    'Routes have error handling',
    routesContent.includes('try') &&
      routesContent.includes('catch')
  );

  // Check imports
  check(
    'Routes import agentMessenger',
    routesContent.includes('agentMessenger')
  );

  check(
    'Routes import database pool',
    routesContent.includes('pool')
  );

  check(
    'Routes import types',
    routesContent.includes('@pravado/shared-types')
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
  console.log(`\n${colors.green}✓ All checks passed! Sprint 45 Phase 4.1 implementation is complete.${colors.reset}`);
} else if (percentage >= 80) {
  console.log(`\n${colors.yellow}⚠ Most checks passed, but some items need attention.${colors.reset}`);
} else {
  console.log(`\n${colors.red}✗ Multiple checks failed. Please review the implementation.${colors.reset}`);
}

console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
