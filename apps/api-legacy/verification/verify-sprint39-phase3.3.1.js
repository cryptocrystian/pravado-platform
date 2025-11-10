#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 39 PHASE 3.3.1
// Role-Aware Defaults System
// =====================================================

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', '..', filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function checkFileContent(filePath, patterns, description) {
  const fullPath = path.join(__dirname, '..', '..', filePath);

  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const results = patterns.map((pattern) => {
    if (typeof pattern === 'string') {
      return content.includes(pattern);
    } else {
      return pattern.test(content);
    }
  });

  const allFound = results.every(Boolean);
  if (allFound) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing expected content`, 'red');
    return false;
  }
}

let passedChecks = 0;
let totalChecks = 0;

function check(result) {
  totalChecks++;
  if (result) passedChecks++;
  return result;
}

console.log('\n');
log('═══════════════════════════════════════════════════', 'blue');
log('  SPRINT 39 PHASE 3.3.1 VERIFICATION', 'blue');
log('  Role-Aware Defaults System', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. ROLE TYPES (shared-types)
// =====================================================
log('1️⃣  ROLE TYPES (shared-types)', 'yellow');
console.log('');

check(checkFileContent(
  'packages/shared-types/src/role.ts',
  [
    'export enum UserRole',
    'ADMIN = \'admin\'',
    'DEVELOPER = \'developer\'',
    'AGENT = \'agent\'',
    'CAMPAIGN_MANAGER = \'campaign_manager\'',
    'CONTENT_CREATOR = \'content_creator\'',
    'EDITOR = \'editor\'',
    'STRATEGIST = \'strategist\'',
    'ANALYST = \'analyst\'',
    'ACCOUNT_MANAGER = \'account_manager\'',
    'CLIENT = \'client\'',
    'EXECUTIVE = \'executive\'',
    'TEAM_MEMBER = \'team_member\'',
    'MEDIA_CONTACT = \'media_contact\'',
    'GUEST = \'guest\'',
  ],
  'UserRole enum with all 14 roles'
));

check(checkFileContent(
  'packages/shared-types/src/role.ts',
  [
    'export interface RoleConfig',
    'export interface RolePermissions',
    'export const ROLE_CONFIGS',
    'canManageCampaigns',
    'canManageContent',
    'canManageContacts',
    'canManageTeam',
    'canManageSettings',
    'canViewAnalytics',
    'canManageAgents',
    'canExecuteAgents',
  ],
  'RoleConfig, RolePermissions interfaces and ROLE_CONFIGS constant'
));

check(checkFileContent(
  'packages/shared-types/src/role.ts',
  [
    'export interface RoleDetectionInput',
    'export interface RoleDetectionResult',
    'export interface NavigationItem',
    'export interface DashboardConfig',
  ],
  'Helper interfaces for role detection and navigation'
));

console.log('');

// =====================================================
// 2. ROLE DETECTION SERVICE (API)
// =====================================================
log('2️⃣  ROLE DETECTION SERVICE (API)', 'yellow');
console.log('');

check(checkFile(
  'apps/api/src/services/role-detection.service.ts',
  'RoleDetectionService file exists'
));

check(checkFileContent(
  'apps/api/src/services/role-detection.service.ts',
  [
    'export class RoleDetectionService',
    'async detectRole',
    'detectRoleFromSession',
    'detectRoleFromDatabase',
    'inferRoleFromContext',
    'buildResult',
    'getRoleConfig',
    'getRolePermissions',
    'hasPermission',
    'getDefaultRoute',
  ],
  'RoleDetectionService core methods implemented'
));

check(checkFileContent(
  'apps/api/src/services/role-detection.service.ts',
  [
    'detectAllUserRoles',
    'updateUserRole',
    'assignUserRole',
    'removeUserRole',
  ],
  'RoleDetectionService management methods implemented'
));

check(checkFileContent(
  'apps/api/src/services/role-detection.service.ts',
  [
    'export const roleDetectionService',
    'RoleDetectionService.getInstance()',
  ],
  'RoleDetectionService singleton export'
));

console.log('');

// =====================================================
// 3. NAVIGATION HOOK (Dashboard)
// =====================================================
log('3️⃣  NAVIGATION HOOK (Dashboard)', 'yellow');
console.log('');

check(checkFile(
  'apps/dashboard/src/config/navigation.config.ts',
  'Navigation configuration file exists'
));

check(checkFileContent(
  'apps/dashboard/src/config/navigation.config.ts',
  [
    'export const NAVIGATION_CONFIG',
    'dashboard',
    'campaigns',
    'content',
    'contacts',
    'agents',
    'analytics',
    'settings',
  ],
  'Navigation config with all main sections'
));

check(checkFile(
  'apps/dashboard/src/hooks/useRoleBasedNavigation.ts',
  'useRoleBasedNavigation hook file exists'
));

check(checkFileContent(
  'apps/dashboard/src/hooks/useRoleBasedNavigation.ts',
  [
    'export function useUserRole',
    'export function useRoleBasedNavigation',
    'export function useHasPermission',
    'export function useHasRole',
    'export function useHasAnyRole',
    'export function useRoleConfig',
    'export function useDefaultRoute',
  ],
  'useRoleBasedNavigation core hooks'
));

check(checkFileContent(
  'apps/dashboard/src/hooks/useRoleBasedNavigation.ts',
  [
    'export function useCanAccessPath',
    'export function useNavigationBreadcrumbs',
    'export function useNavigationByCategory',
    'export function useQuickActions',
  ],
  'useRoleBasedNavigation utility hooks'
));

console.log('');

// =====================================================
// 4. DEFAULT LANDING ROUTER (Dashboard)
// =====================================================
log('4️⃣  DEFAULT LANDING ROUTER (Dashboard)', 'yellow');
console.log('');

check(checkFile(
  'apps/dashboard/src/components/routing/DefaultLandingRouter.tsx',
  'DefaultLandingRouter component file exists'
));

check(checkFileContent(
  'apps/dashboard/src/components/routing/DefaultLandingRouter.tsx',
  [
    'export function DefaultLandingRouter',
    'export function ProtectedRoute',
    'export function UnauthorizedPage',
    'useDefaultRoute',
    'useUserRole',
  ],
  'DefaultLandingRouter component with route protection'
));

console.log('');

// =====================================================
// 5. DASHBOARD STUBS (Dashboard)
// =====================================================
log('5️⃣  DASHBOARD STUBS (Dashboard)', 'yellow');
console.log('');

const dashboards = [
  { name: 'AdminDashboard', role: 'admin' },
  { name: 'DeveloperDashboard', role: 'developer' },
  { name: 'AgentDashboard', role: 'agent' },
  { name: 'CampaignManagerDashboard', role: 'campaign_manager' },
  { name: 'ContentCreatorDashboard', role: 'content_creator' },
  { name: 'EditorDashboard', role: 'editor' },
  { name: 'StrategistDashboard', role: 'strategist' },
  { name: 'AnalystDashboard', role: 'analyst' },
  { name: 'AccountManagerDashboard', role: 'account_manager' },
  { name: 'ClientDashboard', role: 'client' },
  { name: 'ExecutiveDashboard', role: 'executive' },
  { name: 'TeamMemberDashboard', role: 'team_member' },
  { name: 'MediaContactDashboard', role: 'media_contact' },
  { name: 'GuestDashboard', role: 'guest' },
];

dashboards.forEach((dashboard) => {
  check(checkFile(
    `apps/dashboard/src/pages/dashboards/${dashboard.name}.tsx`,
    `${dashboard.name} component (${dashboard.role})`
  ));
});

check(checkFile(
  'apps/dashboard/src/pages/dashboards/index.ts',
  'Dashboard index file with all exports'
));

check(checkFile(
  'apps/dashboard/src/components/dashboards/DashboardTemplate.tsx',
  'DashboardTemplate shared component'
));

console.log('');

// =====================================================
// 6. ROLE-BASED MIDDLEWARE (API)
// =====================================================
log('6️⃣  ROLE-BASED MIDDLEWARE (API)', 'yellow');
console.log('');

check(checkFile(
  'apps/api/src/middleware/role-guard.middleware.ts',
  'Role guard middleware file exists'
));

check(checkFileContent(
  'apps/api/src/middleware/role-guard.middleware.ts',
  [
    'export async function detectUserRole',
    'export function requireRole',
    'export function requirePermission',
    'export function requireAnyPermission',
    'export function requireAllPermissions',
  ],
  'Role guard middleware core functions'
));

check(checkFileContent(
  'apps/api/src/middleware/role-guard.middleware.ts',
  [
    'export function requireAdmin',
    'export function requireDeveloperAccess',
    'export async function verifyOrganizationAccess',
  ],
  'Role guard middleware helper functions'
));

console.log('');

// =====================================================
// FINAL RESULTS
// =====================================================
log('═══════════════════════════════════════════════════', 'blue');
log('  VERIFICATION RESULTS', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('');

const percentage = Math.round((passedChecks / totalChecks) * 100);
const statusColor = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';

log(`Total Checks: ${totalChecks}`, 'blue');
log(`Passed: ${passedChecks}`, 'green');
log(`Failed: ${totalChecks - passedChecks}`, 'red');
log(`Success Rate: ${percentage}%`, statusColor);

console.log('');

if (percentage === 100) {
  log('🎉 All checks passed! Sprint 39 Phase 3.3.1 implementation verified!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most checks passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple issues detected. Please review the failed checks.', 'red');
}

console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
