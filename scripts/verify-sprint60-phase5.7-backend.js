#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT - SPRINT 60 PHASE 5.7 (BACKEND)
// Unified Admin Access Controls, Role Management & Audit Extensions
// =====================================================

const fs = require('fs');
const path = require('path');

const SHARED_TYPES_ROOT = path.join(__dirname, '../packages/shared-types/src');
const API_ROOT = path.join(__dirname, '../apps/api');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

const results = {
  types: [],
  migration: [],
  service: [],
  routes: [],
};

function checkFileExists(filePath, description) {
  totalChecks++;

  if (fs.existsSync(filePath)) {
    passedChecks++;
    return { status: 'PASS', description, path: filePath };
  } else {
    failedChecks++;
    return { status: 'FAIL', description: `Missing: ${description}`, path: filePath };
  }
}

function checkFileContains(filePath, searchString, description) {
  totalChecks++;

  if (!fs.existsSync(filePath)) {
    failedChecks++;
    return { status: 'FAIL', description: `File not found: ${description}`, path: filePath };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(searchString)) {
    passedChecks++;
    return { status: 'PASS', description, path: filePath };
  } else {
    failedChecks++;
    return { status: 'FAIL', description: `Missing content: ${description}`, path: filePath };
  }
}

console.log('\n==============================================');
console.log('SPRINT 60 PHASE 5.7 (BACKEND) - VERIFICATION');
console.log('Admin Access Controls & Role Management');
console.log('==============================================\n');

// =====================================================
// 1. TYPESCRIPT TYPES VERIFICATION
// =====================================================

console.log('1. Verifying TypeScript Types (admin-access.ts)...\n');

const typesFile = path.join(SHARED_TYPES_ROOT, 'admin-access.ts');
results.types.push(
  checkFileExists(typesFile, 'admin-access.ts exists')
);

// Check enums
const enums = [
  { name: 'AdminRole', values: ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPPORT', 'MODERATOR'] },
  { name: 'AdminPermission', values: ['VIEW_ANALYTICS', 'EXPORT_DATA', 'MANAGE_MODERATION', 'MANAGE_ROLES'] },
  { name: 'RoleAuditActionType', values: ['ROLE_ASSIGNED', 'ROLE_REMOVED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED'] },
];

enums.forEach(({ name, values }) => {
  results.types.push(
    checkFileContains(typesFile, `export enum ${name}`, `Enum ${name} exported`)
  );

  values.forEach(value => {
    results.types.push(
      checkFileContains(typesFile, value, `${name}.${value} defined`)
    );
  });
});

// Check interfaces
const interfaces = [
  'AdminUser',
  'AdminRoleAssignment',
  'AdminPermissionMap',
  'RoleCreationRequest',
  'AssignRoleRequest',
  'RemoveRoleRequest',
  'GrantPermissionRequest',
  'RevokePermissionRequest',
  'RoleAuditEntry',
  'RoleDetails',
  'PermissionCheckResult',
  'RoleAuditFilters',
  'RoleAuditResults',
  'AssignRoleResponse',
  'GrantPermissionResponse',
  'RoleStatistics',
  'UserRoleSummary',
];

interfaces.forEach(interfaceName => {
  results.types.push(
    checkFileContains(typesFile, `export interface ${interfaceName}`, `Interface ${interfaceName} exported`)
  );
});

// Check default configurations
results.types.push(
  checkFileContains(typesFile, 'DEFAULT_ROLE_PERMISSIONS', 'DEFAULT_ROLE_PERMISSIONS defined'),
  checkFileContains(typesFile, 'ROLE_DISPLAY_NAMES', 'ROLE_DISPLAY_NAMES defined'),
  checkFileContains(typesFile, 'ROLE_DESCRIPTIONS', 'ROLE_DESCRIPTIONS defined')
);

// Check index.ts export
const indexFile = path.join(SHARED_TYPES_ROOT, 'index.ts');
results.types.push(
  checkFileContains(indexFile, "export * from './admin-access'", 'admin-access exported from index')
);

// =====================================================
// 2. DATABASE MIGRATION VERIFICATION
// =====================================================

console.log('\n2. Verifying Database Migration...\n');

const migrationFile = path.join(API_ROOT, 'supabase/migrations/20251116_create_admin_roles.sql');
results.migration.push(
  checkFileExists(migrationFile, 'Migration file exists')
);

// Check tables
const tables = ['admin_roles', 'admin_permissions', 'admin_role_permissions', 'admin_role_assignments', 'role_audit_logs'];
tables.forEach(table => {
  results.migration.push(
    checkFileContains(migrationFile, `CREATE TABLE IF NOT EXISTS ${table}`, `${table} table created`)
  );
});

// Check admin_roles columns
const rolesColumns = ['role_id UUID PRIMARY KEY', 'role_name VARCHAR(100) UNIQUE', 'display_name', 'is_system_role', 'is_active'];
rolesColumns.forEach(col => {
  results.migration.push(
    checkFileContains(migrationFile, col, `admin_roles has ${col.split(' ')[0]}`)
  );
});

// Check admin_permissions columns
const permColumns = ['permission_id UUID PRIMARY KEY', 'permission_name VARCHAR(100) UNIQUE', 'category VARCHAR(50)'];
permColumns.forEach(col => {
  results.migration.push(
    checkFileContains(migrationFile, col, `admin_permissions has ${col.split(' ')[0]}`)
  );
});

// Check seed data
results.migration.push(
  checkFileContains(migrationFile, "INSERT INTO admin_roles", 'Default roles seeded'),
  checkFileContains(migrationFile, "INSERT INTO admin_permissions", 'Default permissions seeded'),
  checkFileContains(migrationFile, "INSERT INTO admin_role_permissions", 'Role-permission mappings seeded'),
  checkFileContains(migrationFile, "('super_admin'", 'Super admin role seeded'),
  checkFileContains(migrationFile, "('admin'", 'Admin role seeded'),
  checkFileContains(migrationFile, "('analyst'", 'Analyst role seeded'),
  checkFileContains(migrationFile, "('support'", 'Support role seeded'),
  checkFileContains(migrationFile, "('moderator'", 'Moderator role seeded')
);

// Check functions
const functions = [
  'get_user_roles',
  'get_user_permissions',
  'check_user_permission',
  'get_role_statistics',
  'cleanup_expired_role_audit_logs',
  'cleanup_expired_role_assignments',
];

functions.forEach(func => {
  results.migration.push(
    checkFileContains(migrationFile, `CREATE OR REPLACE FUNCTION ${func}`, `Function ${func} created`)
  );
});

// Check indexes
results.migration.push(
  checkFileContains(migrationFile, 'CREATE INDEX idx_admin_roles_role_name', 'Index on role_name'),
  checkFileContains(migrationFile, 'CREATE INDEX idx_admin_permissions_permission_name', 'Index on permission_name'),
  checkFileContains(migrationFile, 'CREATE INDEX idx_admin_role_assignments_user_id', 'Index on user_id'),
  checkFileContains(migrationFile, 'CREATE INDEX idx_role_audit_logs_timestamp', 'Index on timestamp')
);

// Check RLS
results.migration.push(
  checkFileContains(migrationFile, 'ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY', 'RLS enabled on admin_roles'),
  checkFileContains(migrationFile, 'ALTER TABLE role_audit_logs ENABLE ROW LEVEL SECURITY', 'RLS enabled on role_audit_logs'),
  checkFileContains(migrationFile, 'CREATE POLICY view_roles', 'View roles policy'),
  checkFileContains(migrationFile, 'CREATE POLICY view_audit_logs', 'View audit logs policy')
);

// Check TTL
results.migration.push(
  checkFileContains(migrationFile, "expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')", '90-day TTL for audit logs')
);

// =====================================================
// 3. BACKEND SERVICE VERIFICATION
// =====================================================

console.log('\n3. Verifying RoleAccessService...\n');

const serviceFile = path.join(API_ROOT, 'src/services/roleAccessService.ts');
results.service.push(
  checkFileExists(serviceFile, 'roleAccessService.ts exists')
);

// Check class and methods
const methods = [
  'getAdminRoles',
  'getAdminPermissions',
  'assignRoleToUser',
  'removeRoleFromUser',
  'grantPermissionToRole',
  'revokePermissionFromRole',
  'logRoleChange',
  'getRoleAuditTrail',
  'checkUserPermission',
  'getRoleStatistics',
  'getUsersWithRoles',
];

results.service.push(
  checkFileContains(serviceFile, 'export class RoleAccessService', 'RoleAccessService class exported')
);

methods.forEach(method => {
  results.service.push(
    checkFileContains(serviceFile, `static async ${method}`, `${method} method defined`)
  );
});

// Check imports
results.service.push(
  checkFileContains(serviceFile, "import { supabase }", 'Imports supabase'),
  checkFileContains(serviceFile, '@pravado/shared-types', 'Imports from shared-types'),
  checkFileContains(serviceFile, 'AdminRole', 'Imports AdminRole'),
  checkFileContains(serviceFile, 'AdminPermission', 'Imports AdminPermission'),
  checkFileContains(serviceFile, 'RoleAuditEntry', 'Imports RoleAuditEntry')
);

// Check key functionality
results.service.push(
  checkFileContains(serviceFile, 'admin_roles', 'Uses admin_roles table'),
  checkFileContains(serviceFile, 'admin_permissions', 'Uses admin_permissions table'),
  checkFileContains(serviceFile, 'admin_role_assignments', 'Uses admin_role_assignments table'),
  checkFileContains(serviceFile, 'role_audit_logs', 'Uses role_audit_logs table'),
  checkFileContains(serviceFile, 'RoleAuditActionType', 'Uses RoleAuditActionType'),
  checkFileContains(serviceFile, 'check_user_permission', 'Calls check_user_permission function'),
  checkFileContains(serviceFile, 'get_role_statistics', 'Calls get_role_statistics function')
);

// =====================================================
// 4. API ROUTES VERIFICATION
// =====================================================

console.log('\n4. Verifying API Routes...\n');

const routesFile = path.join(API_ROOT, 'src/routes/admin-access.ts');
results.routes.push(
  checkFileExists(routesFile, 'admin-access.ts routes exist')
);

// Check imports
results.routes.push(
  checkFileContains(routesFile, "import { Router", 'Imports Router'),
  checkFileContains(routesFile, 'RoleAccessService', 'Imports RoleAccessService'),
  checkFileContains(routesFile, 'const router = Router()', 'Router initialized'),
  checkFileContains(routesFile, 'export default router', 'Router exported')
);

// Check endpoints
const endpoints = [
  { method: 'GET', path: '/roles', desc: 'GET /roles endpoint' },
  { method: 'GET', path: '/permissions', desc: 'GET /permissions endpoint' },
  { method: 'POST', path: '/assign-role', desc: 'POST /assign-role endpoint' },
  { method: 'POST', path: '/remove-role', desc: 'POST /remove-role endpoint' },
  { method: 'POST', path: '/grant-permission', desc: 'POST /grant-permission endpoint' },
  { method: 'POST', path: '/revoke-permission', desc: 'POST /revoke-permission endpoint' },
  { method: 'GET', path: '/audit-log', desc: 'GET /audit-log endpoint' },
  { method: 'GET', path: '/check-permission/:userId/:permission', desc: 'GET /check-permission endpoint' },
  { method: 'GET', path: '/statistics', desc: 'GET /statistics endpoint' },
  { method: 'GET', path: '/users', desc: 'GET /users endpoint' },
];

endpoints.forEach(endpoint => {
  const methodLower = endpoint.method.toLowerCase();
  results.routes.push(
    checkFileContains(routesFile, `router.${methodLower}('${endpoint.path}`, endpoint.desc)
  );
});

// Check error handling
results.routes.push(
  checkFileContains(routesFile, 'try {', 'Has try-catch error handling'),
  checkFileContains(routesFile, 'catch (error', 'Has catch blocks'),
  checkFileContains(routesFile, 'res.status(500)', 'Returns 500 on errors'),
  checkFileContains(routesFile, 'res.status(400)', 'Returns 400 on validation errors')
);

// =====================================================
// RESULTS SUMMARY
// =====================================================

console.log('\n==============================================');
console.log('VERIFICATION RESULTS');
console.log('==============================================\n');

const sections = [
  { name: 'TypeScript Types', results: results.types },
  { name: 'Database Migration', results: results.migration },
  { name: 'Backend Service', results: results.service },
  { name: 'API Routes', results: results.routes },
];

sections.forEach(({ name, results }) => {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`${name}: ${passed}/${total} checks passed (${percentage}%)`);

  const failures = results.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    failures.forEach(f => {
      console.log(`  ❌ ${f.description}`);
    });
  }
  console.log('');
});

console.log('==============================================');
console.log(`TOTAL: ${passedChecks}/${totalChecks} checks passed (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
console.log('==============================================\n');

if (failedChecks > 0) {
  console.log(`❌ ${failedChecks} check(s) failed. Please review the errors above.\n`);
  console.log('Note: This is a backend-only verification. Frontend components will be verified separately.\n');
  process.exit(1);
} else {
  console.log('✅ All backend checks passed! Sprint 60 Phase 5.7 (Backend) implementation complete.\n');
  console.log('Note: Frontend components (hooks, components, pages) still need to be implemented.\n');
  process.exit(0);
}
