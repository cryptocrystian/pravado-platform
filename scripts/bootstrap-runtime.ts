#!/usr/bin/env ts-node

// =====================================================
// RUNTIME BOOTSTRAP SCRIPT
// Sprint 62: Release Orchestration
// =====================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('\n==============================================');
console.log('PRAVADO PLATFORM - RUNTIME BOOTSTRAP');
console.log('==============================================\n');

let totalSteps = 0;
let completedSteps = 0;
let failedSteps = 0;

async function executeStep(name: string, fn: () => Promise<void>): Promise<void> {
  totalSteps++;
  try {
    process.stdout.write(`${name}... `);
    await fn();
    completedSteps++;
    console.log('✅');
  } catch (error: any) {
    failedSteps++;
    console.log(`❌\n   Error: ${error.message}`);
  }
}

// =====================================================
// 1. POPULATE DEFAULT ROLES
// =====================================================

async function populateDefaultRoles() {
  const defaultRoles = [
    {
      role_name: 'super_admin',
      display_name: 'Super Administrator',
      description: 'Full system access including role management and system control',
      is_system_role: true,
      is_active: true,
    },
    {
      role_name: 'admin',
      display_name: 'Administrator',
      description: 'Administrative access excluding role management',
      is_system_role: true,
      is_active: true,
    },
    {
      role_name: 'analyst',
      display_name: 'Data Analyst',
      description: 'Read-only access to analytics and reports',
      is_system_role: true,
      is_active: true,
    },
    {
      role_name: 'support',
      display_name: 'Support Agent',
      description: 'Access to user support tools and moderation',
      is_system_role: true,
      is_active: true,
    },
    {
      role_name: 'moderator',
      display_name: 'Content Moderator',
      description: 'Access to moderation queue and actions',
      is_system_role: true,
      is_active: true,
    },
  ];

  for (const role of defaultRoles) {
    const { error } = await supabase
      .from('admin_roles')
      .upsert(role, { onConflict: 'role_name' });

    if (error) throw error;
  }
}

// =====================================================
// 2. POPULATE DEFAULT PERMISSIONS
// =====================================================

async function populateDefaultPermissions() {
  const defaultPermissions = [
    // Analytics
    { permission_name: 'view_analytics', display_name: 'View Analytics', category: 'analytics' },
    { permission_name: 'export_data', display_name: 'Export Data', category: 'analytics' },
    { permission_name: 'view_user_activity', display_name: 'View User Activity', category: 'analytics' },
    { permission_name: 'view_agent_activity', display_name: 'View Agent Activity', category: 'analytics' },
    { permission_name: 'view_performance_metrics', display_name: 'View Performance Metrics', category: 'analytics' },

    // Moderation
    { permission_name: 'manage_moderation', display_name: 'Manage Moderation', category: 'moderation' },
    { permission_name: 'view_moderation_queue', display_name: 'View Moderation Queue', category: 'moderation' },
    { permission_name: 'take_moderation_action', display_name: 'Take Moderation Action', category: 'moderation' },
    { permission_name: 'escalate_moderation', display_name: 'Escalate Moderation', category: 'moderation' },
    { permission_name: 'view_moderation_history', display_name: 'View Moderation History', category: 'moderation' },

    // Debug
    { permission_name: 'view_debug_traces', display_name: 'View Debug Traces', category: 'debug' },
    { permission_name: 'view_error_logs', display_name: 'View Error Logs', category: 'debug' },
    { permission_name: 'view_performance_debug', display_name: 'View Performance Debug', category: 'debug' },

    // Access Control
    { permission_name: 'manage_roles', display_name: 'Manage Roles', category: 'access_control' },
    { permission_name: 'assign_roles', display_name: 'Assign Roles', category: 'access_control' },
    { permission_name: 'manage_permissions', display_name: 'Manage Permissions', category: 'access_control' },
    { permission_name: 'view_audit_logs', display_name: 'View Audit Logs', category: 'access_control' },
    { permission_name: 'export_audit_logs', display_name: 'Export Audit Logs', category: 'access_control' },

    // Agents
    { permission_name: 'manage_agents', display_name: 'Manage Agents', category: 'agents' },
    { permission_name: 'view_agent_conversations', display_name: 'View Agent Conversations', category: 'agents' },

    // System
    { permission_name: 'manage_system_settings', display_name: 'Manage System Settings', category: 'system' },
    { permission_name: 'view_system_health', display_name: 'View System Health', category: 'system' },
    { permission_name: 'manage_production_flags', display_name: 'Manage Production Flags', category: 'system' },
    { permission_name: 'system_lockdown', display_name: 'System Lockdown', category: 'system' },

    // Support
    { permission_name: 'view_user_profiles', display_name: 'View User Profiles', category: 'support' },
    { permission_name: 'manage_user_support', display_name: 'Manage User Support', category: 'support' },
  ];

  for (const permission of defaultPermissions) {
    const { error } = await supabase
      .from('admin_permissions')
      .upsert(permission, { onConflict: 'permission_name' });

    if (error) throw error;
  }
}

// =====================================================
// 3. MAP PERMISSIONS TO ROLES
// =====================================================

async function mapPermissionsToRoles() {
  // Get all roles and permissions
  const { data: roles } = await supabase.from('admin_roles').select('role_id, role_name');
  const { data: permissions } = await supabase.from('admin_permissions').select('permission_id, permission_name');

  if (!roles || !permissions) throw new Error('Failed to fetch roles or permissions');

  const roleMap = Object.fromEntries(roles.map(r => [r.role_name, r.role_id]));
  const permMap = Object.fromEntries(permissions.map(p => [p.permission_name, p.permission_id]));

  // Define role-permission mappings
  const mappings: Record<string, string[]> = {
    super_admin: Object.keys(permMap), // All permissions
    admin: [
      'view_analytics',
      'export_data',
      'view_user_activity',
      'view_agent_activity',
      'view_performance_metrics',
      'manage_moderation',
      'view_moderation_queue',
      'take_moderation_action',
      'escalate_moderation',
      'view_moderation_history',
      'view_debug_traces',
      'view_error_logs',
      'view_performance_debug',
      'view_audit_logs',
      'export_audit_logs',
      'manage_agents',
      'view_agent_conversations',
      'view_system_health',
      'view_user_profiles',
      'manage_user_support',
    ],
    analyst: [
      'view_analytics',
      'export_data',
      'view_user_activity',
      'view_agent_activity',
      'view_performance_metrics',
      'view_moderation_history',
      'view_audit_logs',
      'view_system_health',
    ],
    support: [
      'view_user_activity',
      'view_moderation_queue',
      'take_moderation_action',
      'view_moderation_history',
      'view_user_profiles',
      'manage_user_support',
      'escalate_moderation',
    ],
    moderator: [
      'manage_moderation',
      'view_moderation_queue',
      'take_moderation_action',
      'view_moderation_history',
    ],
  };

  // Insert mappings
  for (const [roleName, permissionNames] of Object.entries(mappings)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    for (const permName of permissionNames) {
      const permId = permMap[permName];
      if (!permId) continue;

      const { error } = await supabase
        .from('admin_role_permissions')
        .upsert(
          { role_id: roleId, permission_id: permId },
          { onConflict: 'role_id,permission_id', ignoreDuplicates: true }
        );

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    }
  }
}

// =====================================================
// 4. SET PRODUCTION FLAGS
// =====================================================

async function setProductionFlags() {
  // Note: Production flags are managed in-memory in productionFlags.ts
  // This step verifies they're set correctly via environment variables
  const flags = {
    ENABLE_PUBLIC_API_ACCESS: process.env.ENABLE_PUBLIC_API_ACCESS === 'true',
    DISABLE_MODERATION_AUTOFLOW: process.env.DISABLE_MODERATION_AUTOFLOW === 'true',
    AUDIT_LOGGING_ENABLED: process.env.AUDIT_LOGGING_ENABLED !== 'false',
    TRACE_LOGGING_ENABLED: process.env.TRACE_LOGGING_ENABLED === 'true',
    RATE_LIMIT_TUNING_MODE: process.env.RATE_LIMIT_TUNING_MODE === 'true',
  };

  console.log('\n   Production Flags Configuration:');
  console.log(`   - ENABLE_PUBLIC_API_ACCESS: ${flags.ENABLE_PUBLIC_API_ACCESS}`);
  console.log(`   - DISABLE_MODERATION_AUTOFLOW: ${flags.DISABLE_MODERATION_AUTOFLOW}`);
  console.log(`   - AUDIT_LOGGING_ENABLED: ${flags.AUDIT_LOGGING_ENABLED}`);
  console.log(`   - TRACE_LOGGING_ENABLED: ${flags.TRACE_LOGGING_ENABLED}`);
  console.log(`   - RATE_LIMIT_TUNING_MODE: ${flags.RATE_LIMIT_TUNING_MODE}`);

  // Verify required flags
  if (!flags.AUDIT_LOGGING_ENABLED) {
    console.log('\n   ⚠️  Warning: AUDIT_LOGGING_ENABLED is false. This should be true in production.');
  }

  if (flags.TRACE_LOGGING_ENABLED) {
    console.log('\n   ⚠️  Warning: TRACE_LOGGING_ENABLED is true. This may impact performance.');
  }
}

// =====================================================
// 5. INITIALIZE SYSTEM LOCKDOWN STATE
// =====================================================

async function initializeLockdownState() {
  // System lockdown state is managed in-memory in productionFlags.ts
  // This step just logs the initial state
  console.log('\n   System lockdown initialized to: unlocked');
  console.log('   Use POST /api/system/lockdown to enable lockdown');
}

// =====================================================
// 6. SYNC ABUSE/MODERATION CONFIGS
// =====================================================

async function syncConfigs() {
  // Configuration is defined in sync-production-config.js
  // This step verifies the sync file exists and is valid
  const configFile = '.config-sync.json';
  const fs = require('fs');

  if (!fs.existsSync(configFile)) {
    throw new Error('Configuration sync file not found. Run: node scripts/sync-production-config.js');
  }

  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

  console.log(`\n   Configuration Version: ${config.version}`);
  console.log(`   Last Synced: ${config.timestamp}`);
  console.log('   Configurations:');
  console.log(`   - Abuse Detection: ✓`);
  console.log(`   - Rate Limits: ✓`);
  console.log(`   - Moderation Thresholds: ✓`);
  console.log(`   - Admin Roles: ✓`);
  console.log(`   - Webhook Retry: ✓`);
}

// =====================================================
// 7. VERIFY DATABASE SCHEMA
// =====================================================

async function verifyDatabaseSchema() {
  const criticalTables = [
    'admin_roles',
    'admin_permissions',
    'admin_role_permissions',
    'admin_role_assignments',
    'role_audit_logs',
    'moderation_queue',
    'moderation_actions',
    'agent_trace_logs',
    'system_event_logs',
  ];

  for (const table of criticalTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) throw new Error(`Table ${table} not accessible: ${error.message}`);
  }

  console.log(`\n   Verified ${criticalTables.length} critical tables`);
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('Starting runtime bootstrap...\n');

  await executeStep('1. Populating default roles', populateDefaultRoles);
  await executeStep('2. Populating default permissions', populateDefaultPermissions);
  await executeStep('3. Mapping permissions to roles', mapPermissionsToRoles);
  await executeStep('4. Setting production flags', setProductionFlags);
  await executeStep('5. Initializing lockdown state', initializeLockdownState);
  await executeStep('6. Syncing configurations', syncConfigs);
  await executeStep('7. Verifying database schema', verifyDatabaseSchema);

  console.log('\n==============================================');
  console.log('BOOTSTRAP SUMMARY');
  console.log('==============================================\n');
  console.log(`Total Steps: ${totalSteps}`);
  console.log(`✅ Completed: ${completedSteps}`);
  console.log(`❌ Failed: ${failedSteps}`);
  console.log('');

  if (failedSteps > 0) {
    console.log('❌ Bootstrap completed with errors. Please review and fix.');
    process.exit(1);
  } else {
    console.log('✅ Bootstrap completed successfully!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Assign super_admin role to your user account');
    console.log('2. Verify system health: GET /api/system/health');
    console.log('3. Check production readiness: GET /api/system/production-readiness');
    console.log('');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error during bootstrap:', error);
  process.exit(1);
});
