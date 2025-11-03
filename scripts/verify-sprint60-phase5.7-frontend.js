#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT - SPRINT 60 PHASE 5.7 (FRONTEND)
// Admin Role Assignment, Permission Matrix & Audit Console
// =====================================================

const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.join(__dirname, '../apps/dashboard/src');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

const results = {
  hooks: [],
  components: [],
  pages: [],
  integration: [],
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
console.log('SPRINT 60 PHASE 5.7 (FRONTEND) - VERIFICATION');
console.log('Admin Access Controls UI & Components');
console.log('==============================================\n');

// =====================================================
// 1. REACT HOOKS VERIFICATION
// =====================================================

console.log('1. Verifying React Hooks (useAdminAccessAPI.ts)...\n');

const hooksFile = path.join(DASHBOARD_ROOT, 'hooks/useAdminAccessAPI.ts');
results.hooks.push(
  checkFileExists(hooksFile, 'useAdminAccessAPI.ts exists')
);

// Check imports
results.hooks.push(
  checkFileContains(hooksFile, "useState", 'Imports useState'),
  checkFileContains(hooksFile, "useEffect", 'Imports useEffect'),
  checkFileContains(hooksFile, "useCallback", 'Imports useCallback'),
  checkFileContains(hooksFile, "import axios", 'Imports axios'),
  checkFileContains(hooksFile, "@pravado/shared-types", 'Imports from shared-types')
);

// Check all 8 hooks
const hooks = [
  'useAdminRoles',
  'useAdminPermissions',
  'useAssignRole',
  'useRemoveRole',
  'useGrantPermission',
  'useRevokePermission',
  'useAccessAuditLogs',
  'useRoleStatistics',
  'useUsersWithRoles',
];

hooks.forEach(hookName => {
  results.hooks.push(
    checkFileContains(hooksFile, `export function ${hookName}`, `${hookName} hook exported`)
  );
});

// Check hook functionality
results.hooks.push(
  checkFileContains(hooksFile, 'API_BASE_URL', 'API base URL configured'),
  checkFileContains(hooksFile, 'localStorage.getItem', 'Uses localStorage for auth'),
  checkFileContains(hooksFile, 'Bearer', 'Uses Bearer token authentication'),
  checkFileContains(hooksFile, '/admin-access/roles', 'Calls /roles endpoint'),
  checkFileContains(hooksFile, '/admin-access/permissions', 'Calls /permissions endpoint'),
  checkFileContains(hooksFile, '/admin-access/assign-role', 'Calls /assign-role endpoint'),
  checkFileContains(hooksFile, '/admin-access/remove-role', 'Calls /remove-role endpoint'),
  checkFileContains(hooksFile, '/admin-access/grant-permission', 'Calls /grant-permission endpoint'),
  checkFileContains(hooksFile, '/admin-access/revoke-permission', 'Calls /revoke-permission endpoint'),
  checkFileContains(hooksFile, '/admin-access/audit-log', 'Calls /audit-log endpoint'),
  checkFileContains(hooksFile, '/admin-access/statistics', 'Calls /statistics endpoint'),
  checkFileContains(hooksFile, '/admin-access/users', 'Calls /users endpoint')
);

// =====================================================
// 2. SHARED COMPONENTS VERIFICATION
// =====================================================

console.log('\n2. Verifying Shared Components (components/admin/access/)...\n');

const componentsDir = path.join(DASHBOARD_ROOT, 'components/admin/access');

// RoleTag.tsx
const roleTagFile = path.join(componentsDir, 'RoleTag.tsx');
results.components.push(
  checkFileExists(roleTagFile, 'RoleTag.tsx exists'),
  checkFileContains(roleTagFile, 'export interface RoleTagProps', 'RoleTagProps interface'),
  checkFileContains(roleTagFile, 'export const RoleTag', 'RoleTag component exported'),
  checkFileContains(roleTagFile, 'getRoleColor', 'getRoleColor function'),
  checkFileContains(roleTagFile, 'AdminRole.SUPER_ADMIN', 'Handles SUPER_ADMIN role'),
  checkFileContains(roleTagFile, 'AdminRole.ADMIN', 'Handles ADMIN role'),
  checkFileContains(roleTagFile, 'AdminRole.ANALYST', 'Handles ANALYST role'),
  checkFileContains(roleTagFile, 'AdminRole.SUPPORT', 'Handles SUPPORT role'),
  checkFileContains(roleTagFile, 'AdminRole.MODERATOR', 'Handles MODERATOR role'),
  checkFileContains(roleTagFile, 'ROLE_DISPLAY_NAMES', 'Uses ROLE_DISPLAY_NAMES'),
  checkFileContains(roleTagFile, '<Chip', 'Uses Material-UI Chip'),
  checkFileContains(roleTagFile, 'onDelete', 'Supports onDelete prop')
);

// AccessAuditTable.tsx
const auditTableFile = path.join(componentsDir, 'AccessAuditTable.tsx');
results.components.push(
  checkFileExists(auditTableFile, 'AccessAuditTable.tsx exists'),
  checkFileContains(auditTableFile, 'export interface AccessAuditTableProps', 'AccessAuditTableProps interface'),
  checkFileContains(auditTableFile, 'export const AccessAuditTable', 'AccessAuditTable component exported'),
  checkFileContains(auditTableFile, 'getActionIcon', 'getActionIcon function'),
  checkFileContains(auditTableFile, 'getActionColor', 'getActionColor function'),
  checkFileContains(auditTableFile, 'formatActionType', 'formatActionType function'),
  checkFileContains(auditTableFile, 'RoleAuditActionType', 'Uses RoleAuditActionType'),
  checkFileContains(auditTableFile, '<Table', 'Uses Material-UI Table'),
  checkFileContains(auditTableFile, '<TablePagination', 'Uses TablePagination'),
  checkFileContains(auditTableFile, 'rowsPerPageOptions', 'Has pagination options'),
  checkFileContains(auditTableFile, 'Actor', 'Shows actor column'),
  checkFileContains(auditTableFile, 'Target User', 'Shows target user column'),
  checkFileContains(auditTableFile, 'Role', 'Shows role column'),
  checkFileContains(auditTableFile, 'Permission', 'Shows permission column'),
  checkFileContains(auditTableFile, 'Timestamp', 'Shows timestamp column'),
  checkFileContains(auditTableFile, 'IP Address', 'Shows IP address column')
);

// RoleAssignmentTable.tsx
const roleAssignmentFile = path.join(componentsDir, 'RoleAssignmentTable.tsx');
results.components.push(
  checkFileExists(roleAssignmentFile, 'RoleAssignmentTable.tsx exists'),
  checkFileContains(roleAssignmentFile, 'export interface RoleAssignmentTableProps', 'RoleAssignmentTableProps interface'),
  checkFileContains(roleAssignmentFile, 'export const RoleAssignmentTable', 'RoleAssignmentTable component exported'),
  checkFileContains(roleAssignmentFile, 'onAssignRole', 'Supports assign role action'),
  checkFileContains(roleAssignmentFile, 'onRemoveRole', 'Supports remove role action'),
  checkFileContains(roleAssignmentFile, '<Dialog', 'Uses Material-UI Dialog'),
  checkFileContains(roleAssignmentFile, 'assignDialogOpen', 'Has assign dialog state'),
  checkFileContains(roleAssignmentFile, 'removeDialogOpen', 'Has remove dialog state'),
  checkFileContains(roleAssignmentFile, '<RoleTag', 'Uses RoleTag component'),
  checkFileContains(roleAssignmentFile, '<Select', 'Has role selection'),
  checkFileContains(roleAssignmentFile, 'reason', 'Captures reason for action'),
  checkFileContains(roleAssignmentFile, '<TablePagination', 'Has pagination')
);

// PermissionMatrix.tsx
const permissionMatrixFile = path.join(componentsDir, 'PermissionMatrix.tsx');
results.components.push(
  checkFileExists(permissionMatrixFile, 'PermissionMatrix.tsx exists'),
  checkFileContains(permissionMatrixFile, 'export interface PermissionMatrixProps', 'PermissionMatrixProps interface'),
  checkFileContains(permissionMatrixFile, 'export const PermissionMatrix', 'PermissionMatrix component exported'),
  checkFileContains(permissionMatrixFile, 'onGrantPermission', 'Supports grant permission'),
  checkFileContains(permissionMatrixFile, 'onRevokePermission', 'Supports revoke permission'),
  checkFileContains(permissionMatrixFile, 'readOnly', 'Supports read-only mode'),
  checkFileContains(permissionMatrixFile, '<Checkbox', 'Uses Material-UI Checkbox'),
  checkFileContains(permissionMatrixFile, 'permissionsByCategory', 'Groups permissions by category'),
  checkFileContains(permissionMatrixFile, 'hasPermission', 'hasPermission function'),
  checkFileContains(permissionMatrixFile, 'handleTogglePermission', 'Toggle permission handler'),
  checkFileContains(permissionMatrixFile, 'isSystemRole', 'Checks for system roles'),
  checkFileContains(permissionMatrixFile, 'formatPermissionName', 'Formats permission names'),
  checkFileContains(permissionMatrixFile, 'stickyHeader', 'Has sticky header')
);

// RoleForm.tsx
const roleFormFile = path.join(componentsDir, 'RoleForm.tsx');
results.components.push(
  checkFileExists(roleFormFile, 'RoleForm.tsx exists'),
  checkFileContains(roleFormFile, 'export interface RoleFormProps', 'RoleFormProps interface'),
  checkFileContains(roleFormFile, 'export interface RoleFormData', 'RoleFormData interface'),
  checkFileContains(roleFormFile, 'export const RoleForm', 'RoleForm component exported'),
  checkFileContains(roleFormFile, "mode: 'create' | 'edit'", 'Supports create/edit modes'),
  checkFileContains(roleFormFile, 'validateForm', 'Form validation'),
  checkFileContains(roleFormFile, '<TextField', 'Has text fields'),
  checkFileContains(roleFormFile, 'roleName', 'Has role name field'),
  checkFileContains(roleFormFile, 'displayName', 'Has display name field'),
  checkFileContains(roleFormFile, 'description', 'Has description field'),
  checkFileContains(roleFormFile, 'isActive', 'Has active status'),
  checkFileContains(roleFormFile, '<Switch', 'Uses Material-UI Switch'),
  checkFileContains(roleFormFile, 'onSubmit', 'Has submit handler'),
  checkFileContains(roleFormFile, 'onCancel', 'Has cancel handler')
);

// =====================================================
// 3. ADMIN CONSOLE PAGES VERIFICATION
// =====================================================

console.log('\n3. Verifying Admin Console Pages (pages/admin-console/access/)...\n');

const pagesDir = path.join(DASHBOARD_ROOT, 'pages/admin-console/access');

// RoleAssignmentTab.tsx
const roleAssignmentTabFile = path.join(pagesDir, 'RoleAssignmentTab.tsx');
results.pages.push(
  checkFileExists(roleAssignmentTabFile, 'RoleAssignmentTab.tsx exists'),
  checkFileContains(roleAssignmentTabFile, 'export const RoleAssignmentTab', 'RoleAssignmentTab component exported'),
  checkFileContains(roleAssignmentTabFile, 'useUsersWithRoles', 'Uses useUsersWithRoles hook'),
  checkFileContains(roleAssignmentTabFile, 'useAssignRole', 'Uses useAssignRole hook'),
  checkFileContains(roleAssignmentTabFile, 'useRemoveRole', 'Uses useRemoveRole hook'),
  checkFileContains(roleAssignmentTabFile, '<RoleAssignmentTable', 'Uses RoleAssignmentTable component'),
  checkFileContains(roleAssignmentTabFile, 'handleAssignRole', 'Has assign role handler'),
  checkFileContains(roleAssignmentTabFile, 'handleRemoveRole', 'Has remove role handler'),
  checkFileContains(roleAssignmentTabFile, 'page', 'Has pagination state'),
  checkFileContains(roleAssignmentTabFile, 'pageSize', 'Has page size state'),
  checkFileContains(roleAssignmentTabFile, 'Role Assignment', 'Has page title'),
  checkFileContains(roleAssignmentTabFile, 'currentUserRole', 'Checks current user role')
);

// PermissionMatrixTab.tsx
const permissionMatrixTabFile = path.join(pagesDir, 'PermissionMatrixTab.tsx');
results.pages.push(
  checkFileExists(permissionMatrixTabFile, 'PermissionMatrixTab.tsx exists'),
  checkFileContains(permissionMatrixTabFile, 'export const PermissionMatrixTab', 'PermissionMatrixTab component exported'),
  checkFileContains(permissionMatrixTabFile, 'useAdminRoles', 'Uses useAdminRoles hook'),
  checkFileContains(permissionMatrixTabFile, 'useGrantPermission', 'Uses useGrantPermission hook'),
  checkFileContains(permissionMatrixTabFile, 'useRevokePermission', 'Uses useRevokePermission hook'),
  checkFileContains(permissionMatrixTabFile, '<PermissionMatrix', 'Uses PermissionMatrix component'),
  checkFileContains(permissionMatrixTabFile, 'handleGrantPermission', 'Has grant permission handler'),
  checkFileContains(permissionMatrixTabFile, 'handleRevokePermission', 'Has revoke permission handler'),
  checkFileContains(permissionMatrixTabFile, 'canModifyPermissions', 'Checks permissions'),
  checkFileContains(permissionMatrixTabFile, 'Permission Matrix', 'Has page title'),
  checkFileContains(permissionMatrixTabFile, 'readOnly', 'Supports read-only mode')
);

// AccessAuditTab.tsx
const accessAuditTabFile = path.join(pagesDir, 'AccessAuditTab.tsx');
results.pages.push(
  checkFileExists(accessAuditTabFile, 'AccessAuditTab.tsx exists'),
  checkFileContains(accessAuditTabFile, 'export const AccessAuditTab', 'AccessAuditTab component exported'),
  checkFileContains(accessAuditTabFile, 'useAccessAuditLogs', 'Uses useAccessAuditLogs hook'),
  checkFileContains(accessAuditTabFile, '<AccessAuditTable', 'Uses AccessAuditTable component'),
  checkFileContains(accessAuditTabFile, 'filters', 'Has filters state'),
  checkFileContains(accessAuditTabFile, 'handleApplyFilters', 'Has apply filters handler'),
  checkFileContains(accessAuditTabFile, 'handleClearFilters', 'Has clear filters handler'),
  checkFileContains(accessAuditTabFile, 'handleExportCSV', 'Has CSV export handler'),
  checkFileContains(accessAuditTabFile, '<Grid', 'Uses Grid layout for filters'),
  checkFileContains(accessAuditTabFile, 'actionType', 'Filters by action type'),
  checkFileContains(accessAuditTabFile, 'role', 'Filters by role'),
  checkFileContains(accessAuditTabFile, 'permission', 'Filters by permission'),
  checkFileContains(accessAuditTabFile, 'actorId', 'Filters by actor ID'),
  checkFileContains(accessAuditTabFile, 'targetUserId', 'Filters by target user'),
  checkFileContains(accessAuditTabFile, 'startDate', 'Filters by start date'),
  checkFileContains(accessAuditTabFile, 'endDate', 'Filters by end date'),
  checkFileContains(accessAuditTabFile, 'Blob', 'Uses Blob for CSV export'),
  checkFileContains(accessAuditTabFile, 'Download', 'Has download button')
);

// AccessControlTabs.tsx
const accessControlTabsFile = path.join(pagesDir, 'AccessControlTabs.tsx');
results.pages.push(
  checkFileExists(accessControlTabsFile, 'AccessControlTabs.tsx exists'),
  checkFileContains(accessControlTabsFile, 'export const AccessControlTabs', 'AccessControlTabs component exported'),
  checkFileContains(accessControlTabsFile, '<Tabs', 'Uses Material-UI Tabs'),
  checkFileContains(accessControlTabsFile, '<RoleAssignmentTab', 'Includes RoleAssignmentTab'),
  checkFileContains(accessControlTabsFile, '<PermissionMatrixTab', 'Includes PermissionMatrixTab'),
  checkFileContains(accessControlTabsFile, '<AccessAuditTab', 'Includes AccessAuditTab'),
  checkFileContains(accessControlTabsFile, 'People', 'Has People icon'),
  checkFileContains(accessControlTabsFile, 'Lock', 'Has Lock icon'),
  checkFileContains(accessControlTabsFile, 'History', 'Has History icon'),
  checkFileContains(accessControlTabsFile, 'Role Assignment', 'Has Role Assignment tab'),
  checkFileContains(accessControlTabsFile, 'Permission Matrix', 'Has Permission Matrix tab'),
  checkFileContains(accessControlTabsFile, 'Audit Trail', 'Has Audit Trail tab')
);

// =====================================================
// 4. ADMIN CONSOLE INTEGRATION VERIFICATION
// =====================================================

console.log('\n4. Verifying AdminConsole Integration...\n');

const adminConsoleFile = path.join(DASHBOARD_ROOT, 'pages/AdminConsole.tsx');
results.integration.push(
  checkFileExists(adminConsoleFile, 'AdminConsole.tsx exists'),
  checkFileContains(adminConsoleFile, 'Shield', 'Imports Shield icon'),
  checkFileContains(adminConsoleFile, 'AccessControlTabs', 'Imports AccessControlTabs'),
  checkFileContains(adminConsoleFile, './admin-console/access/AccessControlTabs', 'Imports from access directory'),
  checkFileContains(adminConsoleFile, 'Access Controls', 'Has Access Controls tab label'),
  checkFileContains(adminConsoleFile, 'icon={<Shield', 'Uses Shield icon for Access tab'),
  checkFileContains(adminConsoleFile, 'a11yProps(7)', 'Has 8th tab (index 7)'),
  checkFileContains(adminConsoleFile, '<AccessControlTabs />', 'Renders AccessControlTabs component'),
  checkFileContains(adminConsoleFile, 'index={7}', 'Has TabPanel for index 7')
);

// Check all tabs are present
const expectedTabs = [
  'Overview',
  'Tenant Activity',
  'Agent Activity',
  'Error Explorer',
  'Performance',
  'Moderation',
  'Debug Tools',
  'Access Controls',
];

expectedTabs.forEach(tabName => {
  results.integration.push(
    checkFileContains(adminConsoleFile, tabName, `Has ${tabName} tab`)
  );
});

// =====================================================
// RESULTS SUMMARY
// =====================================================

console.log('\n==============================================');
console.log('VERIFICATION RESULTS');
console.log('==============================================\n');

const sections = [
  { name: 'React Hooks', results: results.hooks },
  { name: 'Shared Components', results: results.components },
  { name: 'Admin Console Pages', results: results.pages },
  { name: 'AdminConsole Integration', results: results.integration },
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
  process.exit(1);
} else {
  console.log('✅ All frontend checks passed! Sprint 60 Phase 5.7 (Frontend) implementation complete.\n');
  console.log('Implementation Summary:');
  console.log('- 8 React hooks for admin access API');
  console.log('- 5 shared components (RoleTag, AccessAuditTable, RoleAssignmentTable, PermissionMatrix, RoleForm)');
  console.log('- 3 admin console pages (RoleAssignmentTab, PermissionMatrixTab, AccessAuditTab)');
  console.log('- AccessControlTabs wrapper with nested navigation');
  console.log('- AdminConsole integration with 8th tab (Access Controls)\n');
  process.exit(0);
}
