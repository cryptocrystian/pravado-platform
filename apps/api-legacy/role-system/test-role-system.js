#!/usr/bin/env node

// =====================================================
// ROLE SYSTEM TEST SCRIPT
// Sprint 39 Phase 3.3.1: Test role detection and routing
// =====================================================

const fs = require('fs');
const path = require('path');

// Load role types from source file (parse as text since it's TypeScript)
const roleTypesPath = path.join(__dirname, '../../packages/shared-types/src/role.ts');
const roleTypesContent = fs.readFileSync(roleTypesPath, 'utf8');

// Mock UserRole enum
const UserRole = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  AGENT: 'agent',
  CAMPAIGN_MANAGER: 'campaign_manager',
  CONTENT_CREATOR: 'content_creator',
  EDITOR: 'editor',
  STRATEGIST: 'strategist',
  ANALYST: 'analyst',
  ACCOUNT_MANAGER: 'account_manager',
  CLIENT: 'client',
  EXECUTIVE: 'executive',
  TEAM_MEMBER: 'team_member',
  MEDIA_CONTACT: 'media_contact',
  GUEST: 'guest',
};

// Parse ROLE_CONFIGS from the file content (simplified approach)
// We'll extract key info using regex
function extractRoleConfig(role) {
  const rolePattern = new RegExp(`\\[UserRole\\.${role.toUpperCase().replace('_', '_')}\\]:\\s*{([\\s\\S]*?)}\\s*,?\\s*(?:\\[|\\};)`, 'm');
  const match = roleTypesContent.match(rolePattern);

  if (!match) return null;

  const configText = match[1];

  // Extract properties
  const defaultRoute = configText.match(/defaultRoute:\s*['"]([^'"]+)['"]/)?.[1];
  const category = configText.match(/category:\s*RoleCategory\.([A-Z_]+)/)?.[1]?.toLowerCase();
  const label = configText.match(/label:\s*['"]([^'"]+)['"]/)?.[1];

  // Extract permissions
  const permissions = {};
  const permPattern = /can([A-Za-z]+):\s*(true|false)/g;
  let permMatch;
  while ((permMatch = permPattern.exec(configText)) !== null) {
    permissions[`can${permMatch[1]}`] = permMatch[2] === 'true';
  }

  return {
    role: UserRole[role],
    category,
    label,
    defaultRoute,
    permissions,
  };
}

// Build ROLE_CONFIGS
const ROLE_CONFIGS = {};
Object.keys(UserRole).forEach((roleKey) => {
  ROLE_CONFIGS[UserRole[roleKey]] = extractRoleConfig(roleKey);
});

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let passedTests = 0;
let totalTests = 0;

function test(description, condition) {
  totalTests++;
  if (condition) {
    passedTests++;
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description}`, 'red');
    return false;
  }
}

console.log('\n');
log('═══════════════════════════════════════════════════', 'blue');
log('  ROLE SYSTEM TESTS', 'blue');
log('  Sprint 39 Phase 3.3.1', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. ROLE CONFIGURATION TESTS
// =====================================================
log('1️⃣  ROLE CONFIGURATION TESTS', 'yellow');
console.log('');

// Test that all 14 roles have configurations
const allRoles = [
  UserRole.ADMIN,
  UserRole.DEVELOPER,
  UserRole.AGENT,
  UserRole.CAMPAIGN_MANAGER,
  UserRole.CONTENT_CREATOR,
  UserRole.EDITOR,
  UserRole.STRATEGIST,
  UserRole.ANALYST,
  UserRole.ACCOUNT_MANAGER,
  UserRole.CLIENT,
  UserRole.EXECUTIVE,
  UserRole.TEAM_MEMBER,
  UserRole.MEDIA_CONTACT,
  UserRole.GUEST,
];

allRoles.forEach((role) => {
  const config = ROLE_CONFIGS[role];
  test(`${role} has config`, config !== undefined);
  test(`${role} has label`, config && config.label !== undefined);
  test(`${role} has default route`, config && config.defaultRoute !== undefined);
  test(`${role} has permissions`, config && config.permissions !== undefined);
});

console.log('');

// =====================================================
// 2. PERMISSION TESTS
// =====================================================
log('2️⃣  PERMISSION TESTS', 'yellow');
console.log('');

// Admin should have all permissions
const adminPerms = ROLE_CONFIGS[UserRole.ADMIN].permissions;
test(
  'Admin has canManageCampaigns',
  adminPerms.canManageCampaigns === true
);
test(
  'Admin has canManageContent',
  adminPerms.canManageContent === true
);
test(
  'Admin has canManageTeam',
  adminPerms.canManageTeam === true
);
test(
  'Admin has canManageSettings',
  adminPerms.canManageSettings === true
);
test(
  'Admin has canManageRoles',
  adminPerms.canManageRoles === true
);

// Guest should have no permissions
const guestPerms = ROLE_CONFIGS[UserRole.GUEST].permissions;
test(
  'Guest cannot manage campaigns',
  guestPerms.canManageCampaigns === false
);
test(
  'Guest cannot manage content',
  guestPerms.canManageContent === false
);
test(
  'Guest cannot view analytics',
  guestPerms.canViewAnalytics === false
);

// Campaign Manager specific permissions
const campaignManagerPerms = ROLE_CONFIGS[UserRole.CAMPAIGN_MANAGER].permissions;
test(
  'Campaign Manager can manage campaigns',
  campaignManagerPerms.canManageCampaigns === true
);
test(
  'Campaign Manager can execute agents',
  campaignManagerPerms.canExecuteAgents === true
);
test(
  'Campaign Manager cannot manage agents',
  campaignManagerPerms.canManageAgents === false
);

// Content Creator specific permissions
const contentCreatorPerms = ROLE_CONFIGS[UserRole.CONTENT_CREATOR].permissions;
test(
  'Content Creator can manage content',
  contentCreatorPerms.canManageContent === true
);
test(
  'Content Creator cannot manage campaigns',
  contentCreatorPerms.canManageCampaigns === false
);

// Analyst specific permissions
const analystPerms = ROLE_CONFIGS[UserRole.ANALYST].permissions;
test(
  'Analyst can view analytics',
  analystPerms.canViewAnalytics === true
);
test(
  'Analyst can export data',
  analystPerms.canExportData === true
);
test(
  'Analyst cannot manage campaigns',
  analystPerms.canManageCampaigns === false
);

console.log('');

// =====================================================
// 3. DEFAULT ROUTE TESTS
// =====================================================
log('3️⃣  DEFAULT ROUTE TESTS', 'yellow');
console.log('');

// Test that each role has a unique default route
const defaultRoutes = allRoles.map((role) => ({
  role,
  route: ROLE_CONFIGS[role].defaultRoute,
}));

test(
  'Admin default route is /dashboard/admin',
  ROLE_CONFIGS[UserRole.ADMIN].defaultRoute === '/dashboard/admin'
);

test(
  'Developer default route is /dashboard/developer',
  ROLE_CONFIGS[UserRole.DEVELOPER].defaultRoute === '/dashboard/developer'
);

test(
  'Agent default route is /dashboard/agent',
  ROLE_CONFIGS[UserRole.AGENT].defaultRoute === '/dashboard/agent'
);

test(
  'Campaign Manager default route is /dashboard/campaign-manager',
  ROLE_CONFIGS[UserRole.CAMPAIGN_MANAGER].defaultRoute === '/dashboard/campaign-manager'
);

test(
  'Content Creator default route is /dashboard/content-creator',
  ROLE_CONFIGS[UserRole.CONTENT_CREATOR].defaultRoute === '/dashboard/content-creator'
);

test(
  'Client default route is /dashboard/client',
  ROLE_CONFIGS[UserRole.CLIENT].defaultRoute === '/dashboard/client'
);

test(
  'Executive default route is /dashboard/executive',
  ROLE_CONFIGS[UserRole.EXECUTIVE].defaultRoute === '/dashboard/executive'
);

test(
  'Guest default route is /dashboard/guest',
  ROLE_CONFIGS[UserRole.GUEST].defaultRoute === '/dashboard/guest'
);

// Test that all routes start with /dashboard/
test(
  'All default routes start with /dashboard/',
  defaultRoutes.every((r) => r.route.startsWith('/dashboard/'))
);

console.log('');

// =====================================================
// 4. ROLE CATEGORY TESTS
// =====================================================
log('4️⃣  ROLE CATEGORY TESTS', 'yellow');
console.log('');

test(
  'Admin is in SYSTEM category',
  ROLE_CONFIGS[UserRole.ADMIN].category === 'system'
);

test(
  'Developer is in SYSTEM category',
  ROLE_CONFIGS[UserRole.DEVELOPER].category === 'system'
);

test(
  'Agent is in CORE_TEAM category',
  ROLE_CONFIGS[UserRole.AGENT].category === 'core_team'
);

test(
  'Campaign Manager is in CORE_TEAM category',
  ROLE_CONFIGS[UserRole.CAMPAIGN_MANAGER].category === 'core_team'
);

test(
  'Client is in CLIENT category',
  ROLE_CONFIGS[UserRole.CLIENT].category === 'client'
);

test(
  'Executive is in CLIENT category',
  ROLE_CONFIGS[UserRole.EXECUTIVE].category === 'client'
);

test(
  'Media Contact is in MEDIA category',
  ROLE_CONFIGS[UserRole.MEDIA_CONTACT].category === 'media'
);

test(
  'Guest is in LIMITED category',
  ROLE_CONFIGS[UserRole.GUEST].category === 'limited'
);

console.log('');

// =====================================================
// 5. ROLE HIERARCHY TESTS
// =====================================================
log('5️⃣  ROLE HIERARCHY TESTS', 'yellow');
console.log('');

// Admin should have more permissions than any other role
const adminPermCount = Object.values(adminPerms).filter(Boolean).length;
const guestPermCount = Object.values(guestPerms).filter(Boolean).length;
const clientPermCount = Object.values(ROLE_CONFIGS[UserRole.CLIENT].permissions).filter(Boolean).length;

test(
  'Admin has more permissions than Guest',
  adminPermCount > guestPermCount
);

test(
  'Admin has more permissions than Client',
  adminPermCount > clientPermCount
);

test(
  'Guest has fewest permissions',
  guestPermCount === 0
);

console.log('');

// =====================================================
// 6. MOCK SESSION TESTS
// =====================================================
log('6️⃣  MOCK SESSION TESTS', 'yellow');
console.log('');

// Simulate role detection for each role
function simulateRoleDetection(role) {
  return {
    role,
    roleConfig: ROLE_CONFIGS[role],
    permissions: ROLE_CONFIGS[role].permissions,
    confidence: 1.0,
    source: 'session',
  };
}

// Test each role
allRoles.forEach((role) => {
  const result = simulateRoleDetection(role);
  test(
    `Mock session for ${role} returns correct config`,
    result.role === role &&
    result.roleConfig.role === role &&
    result.permissions === ROLE_CONFIGS[role].permissions
  );
});

console.log('');

// =====================================================
// 7. NAVIGATION ACCESS TESTS
// =====================================================
log('7️⃣  NAVIGATION ACCESS TESTS', 'yellow');
console.log('');

// Test that roles have appropriate navigation access
function canAccessDashboard(role) {
  return true; // All roles can access dashboard
}

function canAccessCampaigns(role) {
  return ROLE_CONFIGS[role].permissions.canManageCampaigns;
}

function canAccessContent(role) {
  return ROLE_CONFIGS[role].permissions.canManageContent;
}

function canAccessSettings(role) {
  return ROLE_CONFIGS[role].permissions.canManageSettings;
}

function canAccessAnalytics(role) {
  return ROLE_CONFIGS[role].permissions.canViewAnalytics;
}

test('Admin can access campaigns', canAccessCampaigns(UserRole.ADMIN));
test('Admin can access content', canAccessContent(UserRole.ADMIN));
test('Admin can access settings', canAccessSettings(UserRole.ADMIN));
test('Admin can access analytics', canAccessAnalytics(UserRole.ADMIN));

test('Guest cannot access campaigns', !canAccessCampaigns(UserRole.GUEST));
test('Guest cannot access content', !canAccessContent(UserRole.GUEST));
test('Guest cannot access settings', !canAccessSettings(UserRole.GUEST));
test('Guest cannot access analytics', !canAccessAnalytics(UserRole.GUEST));

test('Content Creator can access content', canAccessContent(UserRole.CONTENT_CREATOR));
test('Content Creator cannot access settings', !canAccessSettings(UserRole.CONTENT_CREATOR));

test('Analyst can access analytics', canAccessAnalytics(UserRole.ANALYST));
test('Analyst cannot access campaigns', !canAccessCampaigns(UserRole.ANALYST));

console.log('');

// =====================================================
// FINAL RESULTS
// =====================================================
log('═══════════════════════════════════════════════════', 'blue');
log('  TEST RESULTS', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('');

const percentage = Math.round((passedTests / totalTests) * 100);
const statusColor = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';

log(`Total Tests: ${totalTests}`, 'blue');
log(`Passed: ${passedTests}`, 'green');
log(`Failed: ${totalTests - passedTests}`, 'red');
log(`Success Rate: ${percentage}%`, statusColor);

console.log('');

if (percentage === 100) {
  log('🎉 All tests passed! Role system is working correctly!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most tests passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple test failures detected. Please review.', 'red');
}

console.log('');

// Print summary table
log('═══════════════════════════════════════════════════', 'cyan');
log('  ROLE SUMMARY TABLE', 'cyan');
log('═══════════════════════════════════════════════════', 'cyan');
console.log('');

console.log('Role                  | Category   | Default Route              | Perm Count');
console.log('----------------------|------------|----------------------------|------------');
allRoles.forEach((role) => {
  const config = ROLE_CONFIGS[role];
  const permCount = Object.values(config.permissions).filter(Boolean).length;
  const roleName = config.label.padEnd(20);
  const category = config.category.padEnd(10);
  const route = config.defaultRoute.padEnd(26);
  console.log(`${roleName} | ${category} | ${route} | ${permCount}`);
});

console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
