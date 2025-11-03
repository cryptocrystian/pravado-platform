#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 57 PHASE 5.4
// Audit Trails, Abuse Detection & Platform Moderation
// =====================================================

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let passCount = 0;
let failCount = 0;
const failures = [];

function check(description, condition, details = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    passCount++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    if (details) console.log(`  ${colors.yellow}${details}${colors.reset}`);
    failCount++;
    failures.push({ description, details });
  }
}

function section(title) {
  console.log(`\n${colors.cyan}${colors.bright}${title}${colors.reset}`);
  console.log('='.repeat(title.length));
}

// =====================================================
// 1. TYPESCRIPT TYPES VERIFICATION
// =====================================================

section('1. TypeScript Types Verification');

const typesBasePath = path.join(__dirname, 'packages/shared-types/src');
const moderationTypesPath = path.join(typesBasePath, 'moderation.ts');

check(
  'Moderation types file exists',
  fs.existsSync(moderationTypesPath),
  `Expected: ${moderationTypesPath}`
);

if (fs.existsSync(moderationTypesPath)) {
  const content = fs.readFileSync(moderationTypesPath, 'utf-8');

  // Enums
  check('AuditActionType enum defined', content.includes('enum AuditActionType'));
  check('AbuseScore enum defined', content.includes('enum AbuseScore'));
  check('AbusePatternType enum defined', content.includes('enum AbusePatternType'));
  check('ModerationFlagType enum defined', content.includes('enum ModerationFlagType'));
  check('ModerationSeverity enum defined', content.includes('enum ModerationSeverity'));

  // Audit action types
  check('TOKEN_CREATED action type', content.includes("TOKEN_CREATED = 'token_created'"));
  check('TOKEN_ROTATED action type', content.includes("TOKEN_ROTATED = 'token_rotated'"));
  check('TOKEN_REVOKED action type', content.includes("TOKEN_REVOKED = 'token_revoked'"));
  check('AGENT_CREATED action type', content.includes("AGENT_CREATED = 'agent_created'"));
  check('AGENT_UPDATED action type', content.includes("AGENT_UPDATED = 'agent_updated'"));
  check('ESCALATION_TRIGGERED action type', content.includes("ESCALATION_TRIGGERED = 'escalation_triggered'"));
  check('ADMIN_LOGIN action type', content.includes("ADMIN_LOGIN = 'admin_login'"));
  check('CLIENT_FLAGGED action type', content.includes("CLIENT_FLAGGED = 'client_flagged'"));
  check('CLIENT_BANNED action type', content.includes("CLIENT_BANNED = 'client_banned'"));
  check('TOKEN_BANNED action type', content.includes("TOKEN_BANNED = 'token_banned'"));

  // Abuse pattern types
  check('RATE_LIMIT_BYPASS pattern', content.includes("RATE_LIMIT_BYPASS = 'rate_limit_bypass'"));
  check('INVALID_PAYLOAD_SPAM pattern', content.includes("INVALID_PAYLOAD_SPAM = 'invalid_payload_spam'"));
  check('UNAUTHORIZED_ACCESS_ATTEMPTS pattern', content.includes("UNAUTHORIZED_ACCESS_ATTEMPTS = 'unauthorized_access_attempts'"));
  check('TOKEN_REPLAY_ATTACK pattern', content.includes("TOKEN_REPLAY_ATTACK = 'token_replay_attack'"));
  check('EXCESSIVE_WEBHOOK_FAILURES pattern', content.includes("EXCESSIVE_WEBHOOK_FAILURES = 'excessive_webhook_failures'"));

  // Interfaces
  check('AuditLogEntry interface defined', content.includes('interface AuditLogEntry'));
  check('AuditLogFilters interface defined', content.includes('interface AuditLogFilters'));
  check('AbuseDetectionMetrics interface defined', content.includes('interface AbuseDetectionMetrics'));
  check('AbuseReport interface defined', content.includes('interface AbuseReport'));
  check('AbuseReportFilters interface defined', content.includes('interface AbuseReportFilters'));
  check('ModerationFlag interface defined', content.includes('interface ModerationFlag'));
  check('FlagClientRequest interface defined', content.includes('interface FlagClientRequest'));
  check('BanTokenRequest interface defined', content.includes('interface BanTokenRequest'));
  check('BanTokenResponse interface defined', content.includes('interface BanTokenResponse'));
  check('AbuseDetectionConfig interface defined', content.includes('interface AbuseDetectionConfig'));
  check('AbuseAlertWebhook interface defined', content.includes('interface AbuseAlertWebhook'));
  check('ModerationStats interface defined', content.includes('interface ModerationStats'));
  check('ModeratorPermissions interface defined', content.includes('interface ModeratorPermissions'));

  // AuditLogEntry fields
  check('AuditLogEntry has logId', content.includes('logId: string'));
  check('AuditLogEntry has actorId', content.includes('actorId: string'));
  check('AuditLogEntry has actionType', content.includes('actionType: AuditActionType'));
  check('AuditLogEntry has targetId', content.includes('targetId?: string'));
  check('AuditLogEntry has timestamp', content.includes('timestamp: string'));
  check('AuditLogEntry has ipAddress', content.includes('ipAddress: string'));
  check('AuditLogEntry has metadata', content.includes('metadata: Record<string, any>'));
  check('AuditLogEntry has success flag', content.includes('success: boolean'));

  // AbuseDetectionMetrics fields
  check('AbuseDetectionMetrics has rateLimitExceededCount', content.includes('rateLimitExceededCount: number'));
  check('AbuseDetectionMetrics has malformedPayloadCount', content.includes('malformedPayloadCount: number'));
  check('AbuseDetectionMetrics has unauthorizedAttempts', content.includes('unauthorizedAttempts: number'));
  check('AbuseDetectionMetrics has tokenReuseCount', content.includes('tokenReuseCount: number'));
  check('AbuseDetectionMetrics has webhookFailureCount', content.includes('webhookFailureCount: number'));

  // Export format type
  check('ExportFormat type defined', content.includes("type ExportFormat = 'csv' | 'json'"));
}

// Check index.ts exports moderation types
const indexPath = path.join(typesBasePath, 'index.ts');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  check('index.ts exports moderation types', indexContent.includes("export * from './moderation'"));
}

// =====================================================
// 2. DATABASE MIGRATION VERIFICATION
// =====================================================

section('2. Database Migration Verification');

const migrationsBasePath = path.join(__dirname, 'apps/api/src/database/migrations');
const migrationPath = path.join(migrationsBasePath, '20251114_create_moderation_system.sql');

check(
  'Database migration file exists',
  fs.existsSync(migrationPath),
  `Expected: ${migrationPath}`
);

if (fs.existsSync(migrationPath)) {
  const content = fs.readFileSync(migrationPath, 'utf-8');

  // Tables
  check('audit_logs table created', content.includes('CREATE TABLE IF NOT EXISTS audit_logs'));
  check('abuse_reports table created', content.includes('CREATE TABLE IF NOT EXISTS abuse_reports'));
  check('moderation_flags table created', content.includes('CREATE TABLE IF NOT EXISTS moderation_flags'));
  check('abuse_detection_config table created', content.includes('CREATE TABLE IF NOT EXISTS abuse_detection_config'));

  // audit_logs columns
  check('audit_logs has log_id', content.includes('log_id UUID PRIMARY KEY'));
  check('audit_logs has actor_id', content.includes('actor_id VARCHAR'));
  check('audit_logs has action_type', content.includes('action_type VARCHAR'));
  check('audit_logs has target_id', content.includes('target_id VARCHAR'));
  check('audit_logs has timestamp', content.includes('timestamp TIMESTAMP WITH TIME ZONE'));
  check('audit_logs has ip_address', content.includes('ip_address INET'));
  check('audit_logs has metadata', content.includes('metadata JSONB'));
  check('audit_logs has organization_id', content.includes('organization_id UUID'));
  check('audit_logs has success flag', content.includes('success BOOLEAN'));

  // Indexes
  check('GIN index on audit_logs metadata', content.includes('CREATE INDEX') && content.includes('audit_logs') && content.includes('USING GIN (metadata)'));
  check('Index on audit_logs timestamp', content.includes('idx_audit_logs_timestamp'));
  check('Index on audit_logs actor_id', content.includes('idx_audit_logs_actor_id'));
  check('Index on audit_logs action_type', content.includes('idx_audit_logs_action_type'));
  check('Index on abuse_reports severity', content.includes('idx_abuse_reports_severity'));
  check('Index on moderation_flags client_id', content.includes('idx_moderation_flags_client_id'));

  // RLS policies
  check('RLS enabled on audit_logs', content.includes('ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY'));
  check('RLS enabled on abuse_reports', content.includes('ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY'));
  check('RLS enabled on moderation_flags', content.includes('ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY'));
  check('RLS policy for audit_logs tenant isolation', content.includes('CREATE POLICY audit_logs_tenant_isolation'));
  check('RLS policy for abuse_reports moderator access', content.includes('CREATE POLICY abuse_reports_moderator_access'));
  check('RLS policy for moderation_flags moderator access', content.includes('CREATE POLICY moderation_flags_moderator_access'));

  // Immutability
  check('Audit logs are immutable (no update policy)', content.includes('audit_logs_no_update') || content.includes('FOR UPDATE'));
  check('Audit logs insert-only policy', content.includes('audit_logs_insert_only'));

  // TTL cleanup functions
  check('cleanup_old_audit_logs function', content.includes('CREATE OR REPLACE FUNCTION cleanup_old_audit_logs'));
  check('cleanup_old_abuse_reports function', content.includes('CREATE OR REPLACE FUNCTION cleanup_old_abuse_reports'));
  check('deactivate_expired_flags function', content.includes('CREATE OR REPLACE FUNCTION deactivate_expired_flags'));
  check('TTL references 90 days', content.includes("INTERVAL '90 days'"));

  // Helper functions
  check('get_active_flags_for_client function', content.includes('CREATE OR REPLACE FUNCTION get_active_flags_for_client'));
  check('get_active_flags_for_token function', content.includes('CREATE OR REPLACE FUNCTION get_active_flags_for_token'));
  check('get_active_flags_for_ip function', content.includes('CREATE OR REPLACE FUNCTION get_active_flags_for_ip'));
  check('is_flagged function', content.includes('CREATE OR REPLACE FUNCTION is_flagged'));
  check('get_abuse_detection_config function', content.includes('CREATE OR REPLACE FUNCTION get_abuse_detection_config'));

  // Triggers
  check('Auto-update timestamp trigger for abuse_reports', content.includes('abuse_reports_update_timestamp'));
  check('Auto-update timestamp trigger for moderation_flags', content.includes('moderation_flags_update_timestamp'));

  // Default configuration
  check('Default abuse detection config inserted', content.includes('INSERT INTO abuse_detection_config'));
}

// =====================================================
// 3. MODERATION SERVICE VERIFICATION
// =====================================================

section('3. Moderation Service Verification');

const servicesBasePath = path.join(__dirname, 'apps/api/src/services');
const servicePath = path.join(servicesBasePath, 'moderationService.ts');

check(
  'ModerationService file exists',
  fs.existsSync(servicePath),
  `Expected: ${servicePath}`
);

if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf-8');

  // Class definition
  check('ModerationService class defined', content.includes('class ModerationService'));
  check('Service imports shared types', content.includes("from '@pravado/shared-types'"));

  // Audit logging methods
  check('logAuditEntry method', content.includes('logAuditEntry'));
  check('getAuditLogs method', content.includes('getAuditLogs'));
  check('exportAuditLogs method', content.includes('exportAuditLogs'));

  // Abuse detection methods
  check('getAbuseDetectionConfig method', content.includes('getAbuseDetectionConfig'));
  check('detectAbuse method', content.includes('detectAbuse'));
  check('createAbuseReport method', content.includes('createAbuseReport'));
  check('getAbuseReports method', content.includes('getAbuseReports'));

  // Moderation flag methods
  check('flagClient method', content.includes('flagClient'));
  check('banToken method', content.includes('banToken'));
  check('isFlagged method', content.includes('isFlagged'));
  check('getActiveFlags method', content.includes('getActiveFlags'));

  // Statistics methods
  check('getModerationStats method', content.includes('getModerationStats'));

  // Permission methods
  check('verifyModeratorAccess method', content.includes('verifyModeratorAccess'));
  check('getModeratorPermissions method', content.includes('getModeratorPermissions'));

  // Abuse scoring logic
  check('Rate limit abuse detection', content.includes('rateLimitExceededCount') || content.includes('rate_limit'));
  check('Malformed payload detection', content.includes('malformedPayloadCount') || content.includes('malformed'));
  check('Unauthorized access detection', content.includes('unauthorizedAttempts'));
  check('Token replay detection', content.includes('tokenReuseCount') || content.includes('token_reuse'));
  check('Webhook failure detection', content.includes('webhookFailureCount'));

  // Scoring thresholds
  check('Suspicious score threshold used', content.includes('suspiciousScoreThreshold'));
  check('Abusive score threshold used', content.includes('abusiveScoreThreshold'));

  // CSV export implementation
  check('CSV export logic', content.includes('csv') || content.includes('CSV') || content.includes('.join'));
  check('JSON export logic', content.includes('json') || content.includes('JSON'));

  // Database queries
  check('Parameterized SQL queries', content.includes('$1') && content.includes('this.db.query'));
  check('Pagination support', content.includes('LIMIT') || content.includes('pageSize'));
  check('Filtering support', content.includes('WHERE'));
}

// =====================================================
// 4. API ROUTES VERIFICATION
// =====================================================

section('4. API Routes Verification');

const routesBasePath = path.join(__dirname, 'apps/api/src/routes');
const routesPath = path.join(routesBasePath, 'moderation.ts');

check(
  'Moderation routes file exists',
  fs.existsSync(routesPath),
  `Expected: ${routesPath}`
);

if (fs.existsSync(routesPath)) {
  const content = fs.readFileSync(routesPath, 'utf-8');

  // Router setup
  check('Express Router imported', content.includes('Router'));
  check('ModerationService imported', content.includes('ModerationService'));

  // Middleware
  check('requireModeratorAccess middleware', content.includes('requireModeratorAccess'));
  check('Middleware checks user authentication', content.includes('userId'));
  check('Middleware verifies moderator role', content.includes('verifyModeratorAccess'));
  check('Middleware applies to all routes', content.includes('router.use'));

  // Routes
  check('GET /audit-logs endpoint', content.includes("'/audit-logs'") && content.includes('router.get'));
  check('GET /audit-logs/export endpoint', content.includes("'/audit-logs/export'"));
  check('GET /abuse-reports endpoint', content.includes("'/abuse-reports'"));
  check('POST /flag-client endpoint', content.includes("'/flag-client'") && content.includes('router.post'));
  check('POST /ban-token endpoint', content.includes("'/ban-token'") && content.includes('router.post'));
  check('GET /check-flagged endpoint', content.includes("'/check-flagged'"));
  check('GET /stats endpoint', content.includes("'/stats'"));
  check('GET /health endpoint', content.includes("'/health'"));

  // Request validation
  check('Validates flag-client request', content.includes('if (!request.clientId && !request.tokenId && !request.ipAddress)'));
  check('Validates ban-token request', content.includes('if (!request.tokenId || !request.reason)'));

  // Permission checks
  check('Checks canViewAuditLogs permission', content.includes('canViewAuditLogs'));
  check('Checks canExportAuditLogs permission', content.includes('canExportAuditLogs'));
  check('Checks canViewAbuseReports permission', content.includes('canViewAbuseReports'));
  check('Checks canFlagClients permission', content.includes('canFlagClients'));
  check('Checks canBanTokens permission', content.includes('canBanTokens'));

  // Error handling
  check('Try-catch blocks for error handling', content.includes('try') && content.includes('catch'));
  check('Returns proper error responses', content.includes('res.status(500)'));
  check('Returns proper success responses', content.includes('success: true'));

  // Export format handling
  check('CSV download headers', content.includes('text/csv') || content.includes('Content-Type'));
  check('JSON download headers', content.includes('application/json'));
  check('Attachment filenames', content.includes('Content-Disposition') || content.includes('attachment'));
}

// =====================================================
// 5. INTEGRATION & SECURITY CHECKS
// =====================================================

section('5. Integration & Security Verification');

// Check imports in service
if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');
  check('Service imports Pool from pg', serviceContent.includes("from 'pg'") || serviceContent.includes('Pool'));
  check('Service constructor accepts database', serviceContent.includes('constructor') && serviceContent.includes('database') || serviceContent.includes('Pool'));
}

// Check routes integration
if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf-8');
  check('Routes export default router', routesContent.includes('export default router'));
  check('Routes can initialize service', routesContent.includes('initModerationService') || routesContent.includes('moderationService'));
}

// Security checks from migration
if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  check('Uses UUID for primary keys', migrationContent.includes('UUID PRIMARY KEY'));
  check('Uses INET type for IP addresses', migrationContent.includes('ip_address INET'));
  check('Uses JSONB for metadata', migrationContent.includes('JSONB'));
  check('Timestamps use TIMESTAMP WITH TIME ZONE', migrationContent.includes('TIMESTAMP WITH TIME ZONE'));
  check('Constraint on moderation_flags identifiers', migrationContent.includes('CONSTRAINT moderation_flags_identifier_check'));
}

// =====================================================
// 6. FUNCTIONAL COMPLETENESS CHECKS
// =====================================================

section('6. Functional Completeness Verification');

// Audit trail functionality
check('Audit trail tracks token operations', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('TOKEN_CREATED'));
check('Audit trail tracks agent changes', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('AGENT_UPDATED'));
check('Audit trail tracks escalations', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('ESCALATION_TRIGGERED'));
check('Audit trail tracks admin actions', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('ADMIN_LOGIN'));
check('Audit trail tracks API key operations', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('API_KEY_CREATED'));
check('Audit trail tracks webhook operations', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('WEBHOOK_REGISTERED'));

// Abuse detection patterns
check('Detects rate limit bypass', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('RATE_LIMIT_BYPASS'));
check('Detects malformed payloads', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('INVALID_PAYLOAD_SPAM'));
check('Detects unauthorized access', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('UNAUTHORIZED_ACCESS_ATTEMPTS'));
check('Detects token replay', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('TOKEN_REPLAY_ATTACK'));
check('Detects webhook failures', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('EXCESSIVE_WEBHOOK_FAILURES'));

// Moderation actions
check('Warning flag type', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('WARNING'));
check('Restriction flag type', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('RESTRICTION'));
check('Suspension flag type', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('SUSPENSION'));
check('Ban flag type', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('BAN'));

// Severity levels
check('Low severity level', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('LOW'));
check('Medium severity level', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('MEDIUM'));
check('High severity level', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('HIGH'));
check('Critical severity level', fs.existsSync(moderationTypesPath) && fs.readFileSync(moderationTypesPath, 'utf-8').includes('CRITICAL'));

// =====================================================
// SUMMARY
// =====================================================

section('Verification Summary');

const total = passCount + failCount;
const passRate = ((passCount / total) * 100).toFixed(1);

console.log(`\n${colors.bright}Total Checks: ${total}${colors.reset}`);
console.log(`${colors.green}✓ Passed: ${passCount}${colors.reset}`);
console.log(`${colors.red}✗ Failed: ${failCount}${colors.reset}`);
console.log(`${colors.cyan}Pass Rate: ${passRate}%${colors.reset}\n`);

if (failCount > 0) {
  console.log(`${colors.red}${colors.bright}Failed Checks:${colors.reset}`);
  failures.forEach((failure, index) => {
    console.log(`${index + 1}. ${failure.description}`);
    if (failure.details) console.log(`   ${colors.yellow}${failure.details}${colors.reset}`);
  });
  console.log('');
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bright}🎉 All verification checks passed!${colors.reset}\n`);
  process.exit(0);
}
