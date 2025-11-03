#!/usr/bin/env node

/**
 * Verification Script for Sprint 54 Phase 5.1
 * External API Layer & Developer Access
 */

const fs = require('fs');
const path = require('path');

const CHECKS = [];
let passedChecks = 0;
let failedChecks = 0;

function check(description, fn) {
  CHECKS.push({ description, fn });
}

function runChecks() {
  console.log('\n🔍 Running Sprint 54 Phase 5.1 Verification Checks...\n');
  console.log('=' .repeat(80));

  CHECKS.forEach(({ description, fn }, index) => {
    try {
      fn();
      passedChecks++;
      console.log(`✅ ${index + 1}. ${description}`);
    } catch (error) {
      failedChecks++;
      console.log(`❌ ${index + 1}. ${description}`);
      console.log(`   Error: ${error.message}`);
    }
  });

  console.log('='.repeat(80));
  console.log(`\n📊 Results: ${passedChecks}/${CHECKS.length} checks passed`);

  if (failedChecks > 0) {
    console.log(`\n❌ ${failedChecks} checks failed. Please review the errors above.`);
    process.exit(1);
  } else {
    console.log('\n✅ All checks passed! Sprint 54 Phase 5.1 is complete.\n');
    process.exit(0);
  }
}

// =====================================================
// FILE EXISTENCE CHECKS
// =====================================================

check('TypeScript types file exists', () => {
  const filePath = path.join(
    __dirname,
    '../../packages/shared-types/src/external-api.ts'
  );
  if (!fs.existsSync(filePath)) {
    throw new Error('external-api.ts not found');
  }
});

check('Database migration file exists', () => {
  const filePath = path.join(
    __dirname,
    'src/database/migrations/20251112_create_external_api_layer.sql'
  );
  if (!fs.existsSync(filePath)) {
    throw new Error('20251112_create_external_api_layer.sql not found');
  }
});

check('ExternalAPIAuthService file exists', () => {
  const filePath = path.join(__dirname, 'src/services/externalAPIAuthService.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error('externalAPIAuthService.ts not found');
  }
});

check('WebhookDispatcherService file exists', () => {
  const filePath = path.join(__dirname, 'src/services/webhookDispatcherService.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error('webhookDispatcherService.ts not found');
  }
});

check('ExternalAgentAPIService file exists', () => {
  const filePath = path.join(__dirname, 'src/services/externalAgentAPIService.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error('externalAgentAPIService.ts not found');
  }
});

check('API routes file exists', () => {
  const filePath = path.join(__dirname, 'src/routes/external-agent.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error('external-agent.ts routes file not found');
  }
});

check('OpenAPI documentation file exists', () => {
  const filePath = path.join(__dirname, 'src/docs/openapi.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('openapi.json not found');
  }
});

// =====================================================
// TYPESCRIPT TYPES CHECKS
// =====================================================

check('RateLimitTier enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export enum RateLimitTier')) {
    throw new Error('RateLimitTier enum not exported');
  }
});

check('RateLimitTier has 5 tiers', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  const tiers = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'UNLIMITED'];
  tiers.forEach((tier) => {
    if (!content.includes(tier)) {
      throw new Error(`Missing rate limit tier: ${tier}`);
    }
  });
});

check('AccessLevel enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export enum AccessLevel')) {
    throw new Error('AccessLevel enum not exported');
  }
});

check('AccessLevel has 4 levels', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  const levels = ['READ_ONLY', 'WRITE', 'ADMIN', 'FULL_ACCESS'];
  levels.forEach((level) => {
    if (!content.includes(level)) {
      throw new Error(`Missing access level: ${level}`);
    }
  });
});

check('APIClientType enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export enum APIClientType')) {
    throw new Error('APIClientType enum not exported');
  }
});

check('WebhookEventType enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export enum WebhookEventType')) {
    throw new Error('WebhookEventType enum not exported');
  }
});

check('WebhookEventType has 8+ events', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  const events = [
    'AGENT_RESPONSE',
    'TASK_COMPLETED',
    'TASK_FAILED',
    'CONVERSATION_STARTED',
    'CONVERSATION_ENDED',
    'AGENT_STATUS_CHANGE',
    'ERROR_OCCURRED',
    'RATE_LIMIT_EXCEEDED',
  ];
  events.forEach((event) => {
    if (!content.includes(event)) {
      throw new Error(`Missing webhook event: ${event}`);
    }
  });
});

check('ExternalAPIToken interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface ExternalAPIToken')) {
    throw new Error('ExternalAPIToken interface not exported');
  }
});

check('RegisteredClient interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface RegisteredClient')) {
    throw new Error('RegisteredClient interface not exported');
  }
});

check('APILogEvent interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface APILogEvent')) {
    throw new Error('APILogEvent interface not exported');
  }
});

check('ExternalAgentRequest interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface ExternalAgentRequest')) {
    throw new Error('ExternalAgentRequest interface not exported');
  }
});

check('WebhookRegistration interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface WebhookRegistration')) {
    throw new Error('WebhookRegistration interface not exported');
  }
});

check('RateLimitStatus interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface RateLimitStatus')) {
    throw new Error('RateLimitStatus interface not exported');
  }
});

check('APIAccessScope interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface APIAccessScope')) {
    throw new Error('APIAccessScope interface not exported');
  }
});

check('Input types are exported (CreateAPITokenInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface CreateAPITokenInput')) {
    throw new Error('CreateAPITokenInput interface not exported');
  }
});

check('Input types are exported (ValidateAPITokenInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface ValidateAPITokenInput')) {
    throw new Error('ValidateAPITokenInput interface not exported');
  }
});

check('Input types are exported (SubmitExternalTaskInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface SubmitExternalTaskInput')) {
    throw new Error('SubmitExternalTaskInput interface not exported');
  }
});

check('Input types are exported (RegisterWebhookInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface RegisterWebhookInput')) {
    throw new Error('RegisterWebhookInput interface not exported');
  }
});

check('Output types are exported (CreateTokenResponse)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface CreateTokenResponse')) {
    throw new Error('CreateTokenResponse interface not exported');
  }
});

check('Output types are exported (ValidateTokenResponse)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/external-api.ts'),
    'utf-8'
  );
  if (!content.includes('export interface ValidateTokenResponse')) {
    throw new Error('ValidateTokenResponse interface not exported');
  }
});

// =====================================================
// DATABASE MIGRATION CHECKS
// =====================================================

check('Migration creates rate_limit_tier enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE rate_limit_tier AS ENUM')) {
    throw new Error('rate_limit_tier enum not created');
  }
});

check('Migration creates access_level enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE access_level AS ENUM')) {
    throw new Error('access_level enum not created');
  }
});

check('Migration creates api_client_type enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE api_client_type AS ENUM')) {
    throw new Error('api_client_type enum not created');
  }
});

check('Migration creates webhook_event_type enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE webhook_event_type AS ENUM')) {
    throw new Error('webhook_event_type enum not created');
  }
});

check('Migration creates api_request_status enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE api_request_status AS ENUM')) {
    throw new Error('api_request_status enum not created');
  }
});

check('Migration creates webhook_delivery_status enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE webhook_delivery_status AS ENUM')) {
    throw new Error('webhook_delivery_status enum not created');
  }
});

check('Migration creates registered_clients table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS registered_clients')) {
    throw new Error('registered_clients table not created');
  }
});

check('Migration creates external_api_tokens table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS external_api_tokens')) {
    throw new Error('external_api_tokens table not created');
  }
});

check('Migration creates api_access_logs table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS api_access_logs')) {
    throw new Error('api_access_logs table not created');
  }
});

check('Migration creates webhook_registrations table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS webhook_registrations')) {
    throw new Error('webhook_registrations table not created');
  }
});

check('Migration creates webhook_delivery_attempts table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS webhook_delivery_attempts')) {
    throw new Error('webhook_delivery_attempts table not created');
  }
});

check('Migration creates external_agent_requests table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS external_agent_requests')) {
    throw new Error('external_agent_requests table not created');
  }
});

check('Migration creates rate_limit_tracking table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS rate_limit_tracking')) {
    throw new Error('rate_limit_tracking table not created');
  }
});

check('Tokens table has token_hash column for security', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('token_hash')) {
    throw new Error('token_hash column not found in tokens table');
  }
});

check('Tokens table has unique index on token_hash', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('UNIQUE INDEX idx_tokens_hash')) {
    throw new Error('Unique index on token_hash not found');
  }
});

check('API logs table has expires_at column for TTL', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  const logsSection = content.split('CREATE TABLE IF NOT EXISTS api_access_logs')[1];
  if (!logsSection || !logsSection.includes('expires_at')) {
    throw new Error('api_access_logs missing expires_at column');
  }
});

check('Migration has GIN indexes for JSONB columns', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('USING GIN')) {
    throw new Error('Missing GIN indexes for JSONB columns');
  }
});

check('Migration creates check_rate_limit function', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION check_rate_limit')) {
    throw new Error('check_rate_limit function not created');
  }
});

check('Migration creates increment_rate_limit function', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION increment_rate_limit')) {
    throw new Error('increment_rate_limit function not created');
  }
});

check('Migration creates get_api_analytics function', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION get_api_analytics')) {
    throw new Error('get_api_analytics function not created');
  }
});

check('Migration creates get_webhook_stats function', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION get_webhook_stats')) {
    throw new Error('get_webhook_stats function not created');
  }
});

check('Migration creates cleanup triggers for TTL', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('cleanup_expired_api_logs_trigger')) {
    throw new Error('cleanup_expired_api_logs_trigger not created');
  }
});

check('Migration creates update_webhook_stats trigger', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('update_webhook_stats_trigger')) {
    throw new Error('update_webhook_stats_trigger not created');
  }
});

check('Migration enables RLS on all tables', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  const tables = [
    'registered_clients',
    'external_api_tokens',
    'api_access_logs',
    'webhook_registrations',
    'webhook_delivery_attempts',
    'external_agent_requests',
    'rate_limit_tracking',
  ];
  tables.forEach((table) => {
    if (!content.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)) {
      throw new Error(`RLS not enabled for ${table}`);
    }
  });
});

check('Migration creates RLS policies for organization isolation', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251112_create_external_api_layer.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE POLICY')) {
    throw new Error('Missing RLS policies');
  }
});

// =====================================================
// SERVICE CHECKS - ExternalAPIAuthService
// =====================================================

check('ExternalAPIAuthService exports singleton', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('export const externalAPIAuthService')) {
    throw new Error('externalAPIAuthService singleton not exported');
  }
});

check('ExternalAPIAuthService has registerClient method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('async registerClient(')) {
    throw new Error('registerClient method not found');
  }
});

check('ExternalAPIAuthService has createAPIToken method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('async createAPIToken(')) {
    throw new Error('createAPIToken method not found');
  }
});

check('ExternalAPIAuthService has validateAPIToken method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('async validateAPIToken(')) {
    throw new Error('validateAPIToken method not found');
  }
});

check('ExternalAPIAuthService has revokeAPIToken method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('async revokeAPIToken(')) {
    throw new Error('revokeAPIToken method not found');
  }
});

check('ExternalAPIAuthService has rotateAPIToken method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('async rotateAPIToken(')) {
    throw new Error('rotateAPIToken method not found');
  }
});

check('ExternalAPIAuthService has checkRateLimit method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('async checkRateLimit(')) {
    throw new Error('checkRateLimit method not found');
  }
});

check('ExternalAPIAuthService uses crypto for token hashing', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes("from 'crypto'") || !content.includes('sha256')) {
    throw new Error('Crypto SHA-256 hashing not implemented');
  }
});

check('ExternalAPIAuthService generates secure random tokens', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('randomBytes')) {
    throw new Error('Secure random token generation not implemented');
  }
});

check('ExternalAPIAuthService has rate limit configurations', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAPIAuthService.ts'),
    'utf-8'
  );
  if (!content.includes('RATE_LIMITS')) {
    throw new Error('Rate limit configurations not found');
  }
});

// =====================================================
// SERVICE CHECKS - WebhookDispatcherService
// =====================================================

check('WebhookDispatcherService exports singleton', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('export const webhookDispatcherService')) {
    throw new Error('webhookDispatcherService singleton not exported');
  }
});

check('WebhookDispatcherService has registerWebhook method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('async registerWebhook(')) {
    throw new Error('registerWebhook method not found');
  }
});

check('WebhookDispatcherService has triggerWebhook method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('async triggerWebhook(')) {
    throw new Error('triggerWebhook method not found');
  }
});

check('WebhookDispatcherService has generateSignature method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('generateSignature(')) {
    throw new Error('generateSignature method not found');
  }
});

check('WebhookDispatcherService has validateSignature method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('validateSignature(')) {
    throw new Error('validateSignature method not found');
  }
});

check('WebhookDispatcherService implements retry logic', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('deliverWebhook') || !content.includes('backoff')) {
    throw new Error('Retry logic with exponential backoff not implemented');
  }
});

check('WebhookDispatcherService uses HMAC for signatures', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes('hmac') || !content.includes('sha256')) {
    throw new Error('HMAC-SHA256 signature not implemented');
  }
});

check('WebhookDispatcherService uses axios for HTTP requests', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/webhookDispatcherService.ts'),
    'utf-8'
  );
  if (!content.includes("from 'axios'")) {
    throw new Error('Axios not used for webhook delivery');
  }
});

// =====================================================
// SERVICE CHECKS - ExternalAgentAPIService
// =====================================================

check('ExternalAgentAPIService exports singleton', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('export const externalAgentAPIService')) {
    throw new Error('externalAgentAPIService singleton not exported');
  }
});

check('ExternalAgentAPIService has submitExternalTask method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('async submitExternalTask(')) {
    throw new Error('submitExternalTask method not found');
  }
});

check('ExternalAgentAPIService has getTaskResult method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('async getTaskResult(')) {
    throw new Error('getTaskResult method not found');
  }
});

check('ExternalAgentAPIService has getAgentStatus method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('async getAgentStatus(')) {
    throw new Error('getAgentStatus method not found');
  }
});

check('ExternalAgentAPIService has getConversationLog method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('async getConversationLog(')) {
    throw new Error('getConversationLog method not found');
  }
});

check('ExternalAgentAPIService has logAPIRequest method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('async logAPIRequest(')) {
    throw new Error('logAPIRequest method not found');
  }
});

check('ExternalAgentAPIService has getAPIAnalytics method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/externalAgentAPIService.ts'),
    'utf-8'
  );
  if (!content.includes('async getAPIAnalytics(')) {
    throw new Error('getAPIAnalytics method not found');
  }
});

// =====================================================
// API ROUTES CHECKS
// =====================================================

check('Routes file exports router', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes('export default router')) {
    throw new Error('Router not exported from routes file');
  }
});

check('Routes has POST /submit-task endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("/submit-task") || !content.includes("router.post")) {
    throw new Error('POST /submit-task endpoint not found');
  }
});

check('Routes has GET /result/:requestId endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("/result/:requestId") || !content.includes("router.get")) {
    throw new Error('GET /result/:requestId endpoint not found');
  }
});

check('Routes has GET /status/:agentId endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("/status/:agentId") || !content.includes("router.get")) {
    throw new Error('GET /status/:agentId endpoint not found');
  }
});

check('Routes has GET /history/:conversationId endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("/history/:conversationId") || !content.includes("router.get")) {
    throw new Error('GET /history/:conversationId endpoint not found');
  }
});

check('Routes has POST /register-webhook endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("/register-webhook") || !content.includes("router.post")) {
    throw new Error('POST /register-webhook endpoint not found');
  }
});

check('Routes has POST /rotate-token endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("/rotate-token") || !content.includes("router.post")) {
    throw new Error('POST /rotate-token endpoint not found');
  }
});

check('Routes has GET /api-docs/openapi.json endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/api-docs/openapi.json'")) {
    throw new Error('GET /api-docs/openapi.json endpoint not found');
  }
});

check('Routes has GET /health endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/health'")) {
    throw new Error('GET /health endpoint not found');
  }
});

check('Routes has authentication middleware', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes('authenticateExternalAPI')) {
    throw new Error('Authentication middleware not found');
  }
});

check('Routes validates Bearer token from Authorization header', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes('Bearer') || !content.includes('authorization')) {
    throw new Error('Bearer token validation not implemented');
  }
});

check('Routes adds security headers', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  const headers = ['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection'];
  headers.forEach((header) => {
    if (!content.includes(header)) {
      throw new Error(`Security header ${header} not set`);
    }
  });
});

check('Routes adds rate limit headers', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes('X-RateLimit-Limit') || !content.includes('X-RateLimit-Remaining')) {
    throw new Error('Rate limit headers not added');
  }
});

check('Routes logs API requests', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/external-agent.ts'),
    'utf-8'
  );
  if (!content.includes('logAPIRequest')) {
    throw new Error('API request logging not implemented');
  }
});

// =====================================================
// OPENAPI DOCUMENTATION CHECKS
// =====================================================

check('OpenAPI spec has version 3.1.0', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/docs/openapi.json'),
    'utf-8'
  );
  const spec = JSON.parse(content);
  if (spec.openapi !== '3.1.0') {
    throw new Error('OpenAPI version is not 3.1.0');
  }
});

check('OpenAPI spec has API info', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/docs/openapi.json'),
    'utf-8'
  );
  const spec = JSON.parse(content);
  if (!spec.info || !spec.info.title || !spec.info.version) {
    throw new Error('OpenAPI info section incomplete');
  }
});

check('OpenAPI spec has security schemes', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/docs/openapi.json'),
    'utf-8'
  );
  const spec = JSON.parse(content);
  if (!spec.components || !spec.components.securitySchemes || !spec.components.securitySchemes.BearerAuth) {
    throw new Error('BearerAuth security scheme not defined');
  }
});

check('OpenAPI spec defines all main endpoints', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/docs/openapi.json'),
    'utf-8'
  );
  const spec = JSON.parse(content);
  const endpoints = [
    '/external-agent/submit-task',
    '/external-agent/result/{requestId}',
    '/external-agent/status/{agentId}',
    '/external-agent/history/{conversationId}',
    '/external-agent/register-webhook',
    '/external-agent/rotate-token',
  ];
  endpoints.forEach((endpoint) => {
    if (!spec.paths || !spec.paths[endpoint]) {
      throw new Error(`Endpoint ${endpoint} not documented in OpenAPI spec`);
    }
  });
});

check('OpenAPI spec defines request/response schemas', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/docs/openapi.json'),
    'utf-8'
  );
  const spec = JSON.parse(content);
  const schemas = [
    'SubmitTaskRequest',
    'SubmitTaskResponse',
    'TaskResultResponse',
    'AgentStatusResponse',
    'RegisterWebhookRequest',
    'Error',
  ];
  schemas.forEach((schema) => {
    if (!spec.components || !spec.components.schemas || !spec.components.schemas[schema]) {
      throw new Error(`Schema ${schema} not defined in OpenAPI spec`);
    }
  });
});

check('OpenAPI spec defines error responses', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/docs/openapi.json'),
    'utf-8'
  );
  const spec = JSON.parse(content);
  const responses = ['BadRequest', 'Unauthorized', 'NotFound', 'RateLimitExceeded', 'InternalError'];
  responses.forEach((response) => {
    if (!spec.components || !spec.components.responses || !spec.components.responses[response]) {
      throw new Error(`Response ${response} not defined in OpenAPI spec`);
    }
  });
});

// =====================================================
// INTEGRATION CHECKS
// =====================================================

check('Routes are registered in main index.ts', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/index.ts'),
    'utf-8'
  );
  if (!content.includes("from './external-agent'")) {
    throw new Error('external-agent routes not imported in index.ts');
  }
  if (!content.includes("router.use('/external-agent'")) {
    throw new Error('external-agent routes not registered in index.ts');
  }
});

check('Types are exported in shared-types index.ts', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/index.ts'),
    'utf-8'
  );
  if (!content.includes("export * from './external-api'")) {
    throw new Error('external-api types not exported in index.ts');
  }
});

// =====================================================
// RUN ALL CHECKS
// =====================================================

runChecks();
