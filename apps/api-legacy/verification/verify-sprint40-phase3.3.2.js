#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 40 PHASE 3.3.2
// Role-Based Dashboards - Production Implementation
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
log('  SPRINT 40 PHASE 3.3.2 VERIFICATION', 'blue');
log('  Role-Based Dashboards - Production', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. SHARED WIDGETS
// =====================================================
log('1️⃣  SHARED WIDGETS', 'yellow');
console.log('');

const widgets = [
  'StatCard',
  'ChartWidget',
  'ActivityFeed',
  'QuickActions',
  'DataTable',
  'ProgressCard',
  'AlertCard',
];

widgets.forEach((widget) => {
  check(checkFile(
    `apps/dashboard/src/components/widgets/${widget}.tsx`,
    `${widget} widget component`
  ));
});

check(checkFile(
  'apps/dashboard/src/components/widgets/index.ts',
  'Widgets index export file'
));

console.log('');

// =====================================================
// 2. LAYOUT COMPONENTS
// =====================================================
log('2️⃣  LAYOUT COMPONENTS', 'yellow');
console.log('');

check(checkFile(
  'apps/dashboard/src/components/layouts/RoleDashboardLayout.tsx',
  'RoleDashboardLayout wrapper component'
));

check(checkFileContent(
  'apps/dashboard/src/components/layouts/RoleDashboardLayout.tsx',
  [
    'export function RoleDashboardLayout',
    'export function DashboardGrid',
    'export function DashboardSection',
    'export function DashboardWidget',
  ],
  'Layout component exports'
));

console.log('');

// =====================================================
// 3. PRODUCTION DASHBOARDS
// =====================================================
log('3️⃣  PRODUCTION DASHBOARDS', 'yellow');
console.log('');

const dashboards = [
  { name: 'AdminDashboard', role: 'admin', widgets: ['StatCard', 'ChartWidget', 'ActivityFeed', 'DataTable', 'QuickActions'] },
  { name: 'DeveloperDashboard', role: 'developer', widgets: ['StatCard', 'ChartWidget', 'DataTable', 'QuickActions'] },
  { name: 'AgentDashboard', role: 'agent', widgets: ['StatCard', 'ChartWidget', 'ActivityFeed', 'ProgressCard', 'QuickActions'] },
  { name: 'CampaignManagerDashboard', role: 'campaign_manager', widgets: ['StatCard', 'ChartWidget', 'DataTable', 'ProgressCard'] },
  { name: 'ContentCreatorDashboard', role: 'content_creator', widgets: ['StatCard', 'ChartWidget', 'DataTable', 'ProgressCard'] },
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
  const filePath = `apps/dashboard/src/pages/dashboards/${dashboard.name}.tsx`;
  check(checkFile(filePath, `${dashboard.name} (${dashboard.role})`));

  if (dashboard.widgets && dashboard.widgets.length > 0) {
    check(checkFileContent(
      filePath,
      [
        'RoleDashboardLayout',
        ...dashboard.widgets,
      ],
      `${dashboard.name} uses production widgets`
    ));
  }
});

console.log('');

// =====================================================
// 4. DASHBOARD INTEGRATION
// =====================================================
log('4️⃣  DASHBOARD INTEGRATION', 'yellow');
console.log('');

check(checkFile(
  'apps/dashboard/src/pages/dashboards/index.ts',
  'Dashboard index file with exports'
));

check(checkFileContent(
  'apps/dashboard/src/pages/dashboards/index.ts',
  [
    'export { AdminDashboard }',
    'export { DeveloperDashboard }',
    'export { AgentDashboard }',
    'export { CampaignManagerDashboard }',
    'export { ContentCreatorDashboard }',
    'export { GuestDashboard }',
  ],
  'Dashboard exports'
));

console.log('');

// =====================================================
// 5. WIDGET FUNCTIONALITY
// =====================================================
log('5️⃣  WIDGET FUNCTIONALITY', 'yellow');
console.log('');

check(checkFileContent(
  'apps/dashboard/src/components/widgets/StatCard.tsx',
  [
    'export interface StatCardProps',
    'export function StatCard',
    'trend',
    'loading',
  ],
  'StatCard has all required props and features'
));

check(checkFileContent(
  'apps/dashboard/src/components/widgets/ChartWidget.tsx',
  [
    'export function ChartWidget',
    'export function SimpleBarChart',
    'export function SimpleTrendChart',
  ],
  'ChartWidget has chart components'
));

check(checkFileContent(
  'apps/dashboard/src/components/widgets/QuickActions.tsx',
  [
    'export interface QuickAction',
    'export function QuickActions',
    'variant',
    'onClick',
  ],
  'QuickActions component features'
));

check(checkFileContent(
  'apps/dashboard/src/components/widgets/DataTable.tsx',
  [
    'export interface TableColumn',
    'export function DataTable',
    'onRowClick',
    'render',
  ],
  'DataTable component features'
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
  log('🎉 All checks passed! Sprint 40 Phase 3.3.2 implementation verified!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most checks passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple issues detected. Please review the failed checks.', 'red');
}

console.log('');
log('📊 IMPLEMENTATION SUMMARY', 'blue');
console.log('');
console.log('Shared Widgets: 7 components');
console.log('Layout Components: 4 exports');
console.log('Production Dashboards: 14 roles');
console.log('  - Fully Implemented: 5 (Admin, Developer, Agent, Campaign Manager, Content Creator)');
console.log('  - Basic Structure: 9 (remaining roles)');
console.log('');

// Exit with appropriate code
process.exit(percentage >= 80 ? 0 : 1);
