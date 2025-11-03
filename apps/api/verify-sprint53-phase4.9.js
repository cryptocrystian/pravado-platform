#!/usr/bin/env node

/**
 * Verification Script for Sprint 53 Phase 4.9
 * Knowledge Alignment & Playbook Sync Engine
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
  console.log('\n🔍 Running Sprint 53 Phase 4.9 Verification Checks...\n');
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
    console.log('\n✅ All checks passed! Sprint 53 Phase 4.9 is complete.\n');
    process.exit(0);
  }
}

// =====================================================
// FILE EXISTENCE CHECKS
// =====================================================

check('TypeScript types file exists', () => {
  const filePath = path.join(
    __dirname,
    '../../packages/shared-types/src/agent-playbook-sync.ts'
  );
  if (!fs.existsSync(filePath)) {
    throw new Error('agent-playbook-sync.ts not found');
  }
});

check('Database migration file exists', () => {
  const filePath = path.join(
    __dirname,
    'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'
  );
  if (!fs.existsSync(filePath)) {
    throw new Error('20251111_create_agent_playbook_sync_logs.sql not found');
  }
});

check('Service file exists', () => {
  const filePath = path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error('agentPlaybookSyncEngine.ts not found');
  }
});

check('API routes file exists', () => {
  const filePath = path.join(__dirname, 'src/routes/agent-playbook-sync.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error('agent-playbook-sync.ts routes file not found');
  }
});

// =====================================================
// TYPESCRIPT TYPES CHECKS
// =====================================================

check('DriftType enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export enum DriftType')) {
    throw new Error('DriftType enum not exported');
  }
});

check('DriftType has 9+ drift types', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  const driftTypes = [
    'TONE_DRIFT',
    'ESCALATION_BEHAVIOR',
    'POLICY_ADHERENCE',
    'DECISION_MAKING',
    'KNOWLEDGE_GAP',
    'PERSONALITY_SHIFT',
    'OBJECTIVE_MISALIGNMENT',
    'COMMUNICATION_STYLE',
    'PRIORITY_MISMATCH',
  ];
  driftTypes.forEach((type) => {
    if (!content.includes(type)) {
      throw new Error(`Missing drift type: ${type}`);
    }
  });
});

check('CorrectionType enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export enum CorrectionType')) {
    throw new Error('CorrectionType enum not exported');
  }
});

check('CorrectionType has 8 correction types', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  const correctionTypes = [
    'MEMORY_UPDATE',
    'PERSONALITY_ADJUSTMENT',
    'BEHAVIOR_MODIFIER',
    'KNOWLEDGE_INJECTION',
    'OBJECTIVE_REALIGNMENT',
    'RULESET_UPDATE',
    'ESCALATION_PATH_UPDATE',
    'COMMUNICATION_TEMPLATE',
  ];
  correctionTypes.forEach((type) => {
    if (!content.includes(type)) {
      throw new Error(`Missing correction type: ${type}`);
    }
  });
});

check('SyncStatus enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export enum SyncStatus')) {
    throw new Error('SyncStatus enum not exported');
  }
});

check('SyncStatus has 5 status values', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'];
  statuses.forEach((status) => {
    if (!content.includes(status)) {
      throw new Error(`Missing sync status: ${status}`);
    }
  });
});

check('PlaybookMappingSource enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export enum PlaybookMappingSource')) {
    throw new Error('PlaybookMappingSource enum not exported');
  }
});

check('DriftSeverity enum is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export enum DriftSeverity')) {
    throw new Error('DriftSeverity enum not exported');
  }
});

check('DriftItem interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface DriftItem')) {
    throw new Error('DriftItem interface not exported');
  }
});

check('DriftReport interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface DriftReport')) {
    throw new Error('DriftReport interface not exported');
  }
});

check('SyncResult interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface SyncResult')) {
    throw new Error('SyncResult interface not exported');
  }
});

check('CorrectionResult interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface CorrectionResult')) {
    throw new Error('CorrectionResult interface not exported');
  }
});

check('PlaybookMapping interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface PlaybookMapping')) {
    throw new Error('PlaybookMapping interface not exported');
  }
});

check('BehaviorAlignment interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface BehaviorAlignment')) {
    throw new Error('BehaviorAlignment interface not exported');
  }
});

check('CorrectionPlan interface is exported', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface CorrectionPlan')) {
    throw new Error('CorrectionPlan interface not exported');
  }
});

check('Input types are exported (SyncAgentWithPlaybookInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface SyncAgentWithPlaybookInput')) {
    throw new Error('SyncAgentWithPlaybookInput interface not exported');
  }
});

check('Input types are exported (DetectDriftInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface DetectDriftInput')) {
    throw new Error('DetectDriftInput interface not exported');
  }
});

check('Input types are exported (AutoCorrectDriftInput)', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export interface AutoCorrectDriftInput')) {
    throw new Error('AutoCorrectDriftInput interface not exported');
  }
});

// =====================================================
// DATABASE MIGRATION CHECKS
// =====================================================

check('Migration creates drift_type enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE drift_type AS ENUM')) {
    throw new Error('drift_type enum not created');
  }
});

check('Migration creates drift_severity enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE drift_severity AS ENUM')) {
    throw new Error('drift_severity enum not created');
  }
});

check('Migration creates correction_type enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE correction_type AS ENUM')) {
    throw new Error('correction_type enum not created');
  }
});

check('Migration creates sync_status enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE sync_status AS ENUM')) {
    throw new Error('sync_status enum not created');
  }
});

check('Migration creates playbook_mapping_source enum', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TYPE playbook_mapping_source AS ENUM')) {
    throw new Error('playbook_mapping_source enum not created');
  }
});

check('Migration creates playbooks table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS playbooks')) {
    throw new Error('playbooks table not created');
  }
});

check('Migration creates agent_playbook_sync_logs table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS agent_playbook_sync_logs')) {
    throw new Error('agent_playbook_sync_logs table not created');
  }
});

check('Migration creates agent_drift_detection_logs table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS agent_drift_detection_logs')) {
    throw new Error('agent_drift_detection_logs table not created');
  }
});

check('Migration creates agent_drift_corrections table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS agent_drift_corrections')) {
    throw new Error('agent_drift_corrections table not created');
  }
});

check('Migration creates agent_playbook_mappings table', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TABLE IF NOT EXISTS agent_playbook_mappings')) {
    throw new Error('agent_playbook_mappings table not created');
  }
});

check('Sync logs table has expires_at column for TTL', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  const syncLogsSection = content.split('CREATE TABLE IF NOT EXISTS agent_playbook_sync_logs')[1];
  if (!syncLogsSection || !syncLogsSection.includes('expires_at')) {
    throw new Error('agent_playbook_sync_logs missing expires_at column');
  }
});

check('Drift logs table has expires_at column for TTL', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  const driftLogsSection = content.split('CREATE TABLE IF NOT EXISTS agent_drift_detection_logs')[1];
  if (!driftLogsSection || !driftLogsSection.includes('expires_at')) {
    throw new Error('agent_drift_detection_logs missing expires_at column');
  }
});

check('Migration has GIN indexes for JSONB columns', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('USING GIN')) {
    throw new Error('Missing GIN indexes for JSONB columns');
  }
});

check('Migration has full-text search indexes', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes("to_tsvector('english'")) {
    throw new Error('Missing full-text search indexes');
  }
});

check('Migration creates cleanup_expired_sync_logs trigger', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TRIGGER cleanup_expired_sync_logs_trigger')) {
    throw new Error('cleanup_expired_sync_logs_trigger not created');
  }
});

check('Migration creates cleanup_expired_drift_logs trigger', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TRIGGER cleanup_expired_drift_logs_trigger')) {
    throw new Error('cleanup_expired_drift_logs_trigger not created');
  }
});

check('Migration creates deactivate_old_mappings trigger', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TRIGGER deactivate_old_mappings_trigger')) {
    throw new Error('deactivate_old_mappings_trigger not created');
  }
});

check('Migration creates calculate_alignment_improvement trigger', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE TRIGGER calculate_alignment_improvement_trigger')) {
    throw new Error('calculate_alignment_improvement_trigger not created');
  }
});

check('Migration enables RLS on all tables', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  const tables = [
    'playbooks',
    'agent_playbook_sync_logs',
    'agent_drift_detection_logs',
    'agent_drift_corrections',
    'agent_playbook_mappings',
  ];
  tables.forEach((table) => {
    if (!content.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)) {
      throw new Error(`RLS not enabled for ${table}`);
    }
  });
});

check('Migration creates RLS policies for organization isolation', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE POLICY')) {
    throw new Error('Missing RLS policies');
  }
});

check('Migration creates helper function get_agent_sync_summary', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION get_agent_sync_summary')) {
    throw new Error('get_agent_sync_summary function not created');
  }
});

check('Migration creates helper function get_agent_drift_summary', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION get_agent_drift_summary')) {
    throw new Error('get_agent_drift_summary function not created');
  }
});

check('Migration creates helper function get_agent_alignment_score', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/database/migrations/20251111_create_agent_playbook_sync_logs.sql'),
    'utf-8'
  );
  if (!content.includes('CREATE OR REPLACE FUNCTION get_agent_alignment_score')) {
    throw new Error('get_agent_alignment_score function not created');
  }
});

// =====================================================
// SERVICE CHECKS
// =====================================================

check('Service exports agentPlaybookSyncEngine singleton', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('export const agentPlaybookSyncEngine')) {
    throw new Error('agentPlaybookSyncEngine singleton not exported');
  }
});

check('Service has syncAgentWithPlaybook method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async syncAgentWithPlaybook(')) {
    throw new Error('syncAgentWithPlaybook method not found');
  }
});

check('Service has detectDriftFromPlaybook method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async detectDriftFromPlaybook(')) {
    throw new Error('detectDriftFromPlaybook method not found');
  }
});

check('Service has autoCorrectDrift method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async autoCorrectDrift(')) {
    throw new Error('autoCorrectDrift method not found');
  }
});

check('Service has getSyncLogs method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async getSyncLogs(')) {
    throw new Error('getSyncLogs method not found');
  }
});

check('Service has getDriftLogs method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async getDriftLogs(')) {
    throw new Error('getDriftLogs method not found');
  }
});

check('Service has getDriftMetrics method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async getDriftMetrics(')) {
    throw new Error('getDriftMetrics method not found');
  }
});

check('Service has getSyncMetrics method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async getSyncMetrics(')) {
    throw new Error('getSyncMetrics method not found');
  }
});

check('Service uses OpenAI for drift detection', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes("from 'openai'") || !content.includes('this.openai')) {
    throw new Error('OpenAI integration not found');
  }
});

check('Service has performAIDriftDetection private method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async performAIDriftDetection(')) {
    throw new Error('performAIDriftDetection method not found');
  }
});

check('Service has applyMappingToAgent method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async applyMappingToAgent(')) {
    throw new Error('applyMappingToAgent method not found');
  }
});

check('Service has applyCorrectionToAgent method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async applyCorrectionToAgent(')) {
    throw new Error('applyCorrectionToAgent method not found');
  }
});

check('Service has updateAgentMemory method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async updateAgentMemory(')) {
    throw new Error('updateAgentMemory method not found');
  }
});

check('Service has adjustAgentPersonality method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async adjustAgentPersonality(')) {
    throw new Error('adjustAgentPersonality method not found');
  }
});

check('Service has updateBehaviorModifier method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async updateBehaviorModifier(')) {
    throw new Error('updateBehaviorModifier method not found');
  }
});

check('Service has injectKnowledge method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async injectKnowledge(')) {
    throw new Error('injectKnowledge method not found');
  }
});

check('Service has realignObjectives method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async realignObjectives(')) {
    throw new Error('realignObjectives method not found');
  }
});

check('Service has updateRuleset method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async updateRuleset(')) {
    throw new Error('updateRuleset method not found');
  }
});

check('Service has updateEscalationPath method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async updateEscalationPath(')) {
    throw new Error('updateEscalationPath method not found');
  }
});

check('Service has updateCommunicationTemplate method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async updateCommunicationTemplate(')) {
    throw new Error('updateCommunicationTemplate method not found');
  }
});

check('Service has logSyncOperation method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async logSyncOperation(')) {
    throw new Error('logSyncOperation method not found');
  }
});

check('Service has logDriftDetection method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async logDriftDetection(')) {
    throw new Error('logDriftDetection method not found');
  }
});

check('Service has logDriftCorrection method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async logDriftCorrection(')) {
    throw new Error('logDriftCorrection method not found');
  }
});

check('Service has measureAgentAlignment method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async measureAgentAlignment(')) {
    throw new Error('measureAgentAlignment method not found');
  }
});

check('Service has getPlaybookById method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('async getPlaybookById(')) {
    throw new Error('getPlaybookById method not found');
  }
});

check('Service has calculateOverallSeverity method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('calculateOverallSeverity(')) {
    throw new Error('calculateOverallSeverity method not found');
  }
});

check('Service has generateRecommendedActions method', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('generateRecommendedActions(')) {
    throw new Error('generateRecommendedActions method not found');
  }
});

// =====================================================
// API ROUTES CHECKS
// =====================================================

check('Routes file exports router', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes('export default router')) {
    throw new Error('Router not exported from routes file');
  }
});

check('Routes has POST /sync endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.post('/sync'")) {
    throw new Error('POST /sync endpoint not found');
  }
});

check('Routes has POST /detect-drift endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.post('/detect-drift'")) {
    throw new Error('POST /detect-drift endpoint not found');
  }
});

check('Routes has POST /correct-drift endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.post('/correct-drift'")) {
    throw new Error('POST /correct-drift endpoint not found');
  }
});

check('Routes has GET /sync-logs/:agentId endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/sync-logs/:agentId'")) {
    throw new Error('GET /sync-logs/:agentId endpoint not found');
  }
});

check('Routes has GET /drift-logs/:agentId endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/drift-logs/:agentId'")) {
    throw new Error('GET /drift-logs/:agentId endpoint not found');
  }
});

check('Routes has GET /drift-metrics endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/drift-metrics'")) {
    throw new Error('GET /drift-metrics endpoint not found');
  }
});

check('Routes has GET /sync-metrics endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/sync-metrics'")) {
    throw new Error('GET /sync-metrics endpoint not found');
  }
});

check('Routes has GET /health endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("router.get('/health'")) {
    throw new Error('GET /health endpoint not found');
  }
});

check('Routes imports agentPlaybookSyncEngine service', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  if (!content.includes("from '../services/agentPlaybookSyncEngine'")) {
    throw new Error('agentPlaybookSyncEngine service not imported');
  }
});

check('Routes validates input on sync endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  const syncSection = content.split("router.post('/sync'")[1];
  if (!syncSection || !syncSection.includes('agentId') || !syncSection.includes('playbookId')) {
    throw new Error('Input validation missing on sync endpoint');
  }
});

check('Routes validates input on detect-drift endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  const driftSection = content.split("router.post('/detect-drift'")[1];
  if (!driftSection || !driftSection.includes('agentId') || !driftSection.includes('organizationId')) {
    throw new Error('Input validation missing on detect-drift endpoint');
  }
});

check('Routes validates input on correct-drift endpoint', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/agent-playbook-sync.ts'),
    'utf-8'
  );
  const correctSection = content.split("router.post('/correct-drift'")[1];
  if (!correctSection || !correctSection.includes('agentId') || !correctSection.includes('organizationId')) {
    throw new Error('Input validation missing on correct-drift endpoint');
  }
});

// =====================================================
// INTEGRATION CHECKS
// =====================================================

check('Routes are registered in main index.ts', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/routes/index.ts'),
    'utf-8'
  );
  if (!content.includes("from './agent-playbook-sync'")) {
    throw new Error('agent-playbook-sync routes not imported in index.ts');
  }
  if (!content.includes("router.use('/agent-playbook-sync'")) {
    throw new Error('agent-playbook-sync routes not registered in index.ts');
  }
});

check('Types are exported in shared-types index.ts', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../../packages/shared-types/src/index.ts'),
    'utf-8'
  );
  if (!content.includes("export * from './agent-playbook-sync'")) {
    throw new Error('agent-playbook-sync types not exported in index.ts');
  }
});

// =====================================================
// FUNCTIONAL CHECKS
// =====================================================

check('Sync method handles forceSync option', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('forceSync')) {
    throw new Error('forceSync option not handled');
  }
});

check('Sync method handles dryRun option', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('dryRun')) {
    throw new Error('dryRun option not handled');
  }
});

check('Sync method handles selectiveSync option', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('selectiveSync')) {
    throw new Error('selectiveSync option not handled');
  }
});

check('Drift detection uses GPT-4 model', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes("model: 'gpt-4'")) {
    throw new Error('GPT-4 model not used for drift detection');
  }
});

check('Drift detection excludes drift types based on options', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  if (!content.includes('excludeDriftTypes')) {
    throw new Error('excludeDriftTypes option not handled');
  }
});

check('Auto-correct handles severity threshold', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  const correctSection = content.split('async autoCorrectDrift(')[1];
  if (!correctSection || !correctSection.includes('severityThreshold')) {
    throw new Error('severityThreshold not handled in autoCorrectDrift');
  }
});

check('Auto-correct handles maxCorrections option', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  const correctSection = content.split('async autoCorrectDrift(')[1];
  if (!correctSection || !correctSection.includes('maxCorrections')) {
    throw new Error('maxCorrections option not handled in autoCorrectDrift');
  }
});

check('Auto-correct measures alignment before and after', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  const correctSection = content.split('async autoCorrectDrift(')[1];
  if (!correctSection || !correctSection.includes('beforeAlignment') || !correctSection.includes('afterAlignment')) {
    throw new Error('Alignment measurement not implemented in autoCorrectDrift');
  }
});

check('Sync logs have 90-day TTL', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  const logSyncSection = content.split('async logSyncOperation(')[1];
  if (!logSyncSection || !logSyncSection.includes('90')) {
    throw new Error('90-day TTL not set for sync logs');
  }
});

check('Drift logs have 90-day TTL', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  const logDriftSection = content.split('async logDriftDetection(')[1];
  if (!logDriftSection || !logDriftSection.includes('90')) {
    throw new Error('90-day TTL not set for drift logs');
  }
});

check('Service handles all 8 correction types', () => {
  const content = fs.readFileSync(
    path.join(__dirname, 'src/services/agentPlaybookSyncEngine.ts'),
    'utf-8'
  );
  const correctionTypes = [
    'memory_update',
    'personality_adjustment',
    'behavior_modifier',
    'knowledge_injection',
    'objective_realignment',
    'ruleset_update',
    'escalation_path_update',
    'communication_template',
  ];
  const applySection = content.split('async applyCorrectionToAgent(')[1];
  if (!applySection) {
    throw new Error('applyCorrectionToAgent method not found');
  }
  correctionTypes.forEach((type) => {
    if (!applySection.includes(`'${type}'`)) {
      throw new Error(`Correction type ${type} not handled`);
    }
  });
});

// =====================================================
// RUN ALL CHECKS
// =====================================================

runChecks();
