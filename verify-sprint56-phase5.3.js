#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 56 PHASE 5.3
// Admin Dashboard for Usage Monitoring & System Analytics
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
// BACKEND VERIFICATION
// =====================================================

section('1. TypeScript Types Verification');

const typesBasePath = path.join(__dirname, 'packages/shared-types/src');
const typesPath = path.join(typesBasePath, 'admin-analytics.ts');

check(
  'TypeScript types file exists',
  fs.existsSync(typesPath),
  `Expected: ${typesPath}`
);

if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, 'utf-8');

  check('AnalyticsTimeRange enum defined', typesContent.includes('enum AnalyticsTimeRange'));
  check('ErrorSeverity enum defined', typesContent.includes('enum ErrorSeverity'));
  check('ErrorCategory enum defined', typesContent.includes('enum ErrorCategory'));
  check('OverviewStats interface defined', typesContent.includes('interface OverviewStats'));
  check('TenantActivity interface defined', typesContent.includes('interface TenantActivity'));
  check('AgentActivity interface defined', typesContent.includes('interface AgentActivity'));
  check('ErrorLogEntry interface defined', typesContent.includes('interface ErrorLogEntry'));
  check('PerformanceMetrics interface defined', typesContent.includes('interface PerformanceMetrics'));
  check('AdminPermissions interface defined', typesContent.includes('interface AdminPermissions'));
}

section('2. Database Migration Verification');

const migrationsBasePath = path.join(__dirname, 'apps/api/src/database/migrations');
const migrationPath = path.join(migrationsBasePath, '20251113_create_admin_analytics.sql');

check(
  'Database migration file exists',
  fs.existsSync(migrationPath),
  `Expected: ${migrationPath}`
);

if (fs.existsSync(migrationPath)) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

  check('admin_users table created', migrationContent.includes('CREATE TABLE IF NOT EXISTS admin_users'));
  check('error_logs table created', migrationContent.includes('CREATE TABLE IF NOT EXISTS error_logs'));
  check('RLS policies defined', migrationContent.includes('ALTER TABLE') && migrationContent.includes('ENABLE ROW LEVEL SECURITY'));
  check('get_admin_overview_stats function', migrationContent.includes('CREATE OR REPLACE FUNCTION get_admin_overview_stats'));
  check('get_tenant_activity function', migrationContent.includes('CREATE OR REPLACE FUNCTION get_tenant_activity'));
  check('get_agent_activity function', migrationContent.includes('CREATE OR REPLACE FUNCTION get_agent_activity'));
  check('get_error_logs function', migrationContent.includes('CREATE OR REPLACE FUNCTION get_error_logs'));
  check('get_performance_metrics function', migrationContent.includes('CREATE OR REPLACE FUNCTION get_performance_metrics'));
  check('Indexes created', migrationContent.includes('CREATE INDEX'));
}

section('3. Backend Service Verification');

const servicesBasePath = path.join(__dirname, 'apps/api/src/services');
const servicePath = path.join(servicesBasePath, 'adminAnalyticsService.ts');

check(
  'AdminAnalyticsService exists',
  fs.existsSync(servicePath),
  `Expected: ${servicePath}`
);

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');

  check('getOverviewStats method', serviceContent.includes('getOverviewStats'));
  check('getTenantActivity method', serviceContent.includes('getTenantActivity'));
  check('exportTenantActivity method', serviceContent.includes('exportTenantActivity'));
  check('getAgentActivity method', serviceContent.includes('getAgentActivity'));
  check('getAgentLoadHeatmap method', serviceContent.includes('getAgentLoadHeatmap'));
  check('getErrorLogs method', serviceContent.includes('getErrorLogs'));
  check('getPerformanceMetrics method', serviceContent.includes('getPerformanceMetrics'));
  check('verifyAdminAccess method', serviceContent.includes('verifyAdminAccess'));
  check('getAdminPermissions method', serviceContent.includes('getAdminPermissions'));
  check('CSV export implementation', serviceContent.includes('csv') || serviceContent.includes('CSV'));
}

section('4. API Routes Verification');

const routesBasePath = path.join(__dirname, 'apps/api/src/routes');
const routesPath = path.join(routesBasePath, 'admin-console.ts');

check(
  'Admin console routes file exists',
  fs.existsSync(routesPath),
  `Expected: ${routesPath}`
);

if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf-8');

  check('Admin middleware defined', routesContent.includes('requireAdminAccess'));
  check('GET /overview endpoint', routesContent.includes('/overview'));
  check('GET /tenants endpoint', routesContent.includes('/tenants'));
  check('GET /tenants/export endpoint', routesContent.includes('/tenants/export'));
  check('GET /agents endpoint', routesContent.includes('/agents'));
  check('GET /agents/heatmap endpoint', routesContent.includes('/agents/heatmap'));
  check('GET /errors endpoint', routesContent.includes('/errors'));
  check('GET /performance endpoint', routesContent.includes('/performance'));
  check('GET /health endpoint', routesContent.includes('/health'));
  check('Error handling implemented', routesContent.includes('try') && routesContent.includes('catch'));
}

section('5. React Hooks Verification');

const hooksBasePath = path.join(__dirname, 'apps/dashboard/src/hooks');
const hooksPath = path.join(hooksBasePath, 'useAdminAPI.ts');

check(
  'Admin API hooks file exists',
  fs.existsSync(hooksPath),
  `Expected: ${hooksPath}`
);

if (fs.existsSync(hooksPath)) {
  const hooksContent = fs.readFileSync(hooksPath, 'utf-8');

  check('useOverviewStats hook', hooksContent.includes('useOverviewStats'));
  check('useTenantActivity hook', hooksContent.includes('useTenantActivity'));
  check('useExportTenantActivity hook', hooksContent.includes('useExportTenantActivity'));
  check('useAgentActivity hook', hooksContent.includes('useAgentActivity'));
  check('useAgentLoadHeatmap hook', hooksContent.includes('useAgentLoadHeatmap'));
  check('useErrorLogs hook', hooksContent.includes('useErrorLogs'));
  check('usePerformanceMetrics hook', hooksContent.includes('usePerformanceMetrics'));
  check('useState hook usage', hooksContent.includes('useState'));
  check('useEffect hook usage', hooksContent.includes('useEffect'));
  check('useCallback hook usage', hooksContent.includes('useCallback'));
}

// =====================================================
// FRONTEND VERIFICATION
// =====================================================

section('6. Admin Components Verification');

const componentsBasePath = path.join(__dirname, 'apps/dashboard/src/components/admin');

// StatsCard component
const statsCardPath = path.join(componentsBasePath, 'StatsCard.tsx');
check('StatsCard component exists', fs.existsSync(statsCardPath), `Expected: ${statsCardPath}`);
if (fs.existsSync(statsCardPath)) {
  const content = fs.readFileSync(statsCardPath, 'utf-8');
  check('StatsCard has props interface', content.includes('StatsCardProps'));
  check('StatsCard displays title', content.includes('title'));
  check('StatsCard displays value', content.includes('value'));
  check('StatsCard has loading state', content.includes('loading'));
  check('StatsCard supports icons', content.includes('icon'));
  check('StatsCard supports trends', content.includes('trend'));
}

// PeakUsageChart component
const peakChartPath = path.join(componentsBasePath, 'PeakUsageChart.tsx');
check('PeakUsageChart component exists', fs.existsSync(peakChartPath), `Expected: ${peakChartPath}`);
if (fs.existsSync(peakChartPath)) {
  const content = fs.readFileSync(peakChartPath, 'utf-8');
  check('PeakUsageChart uses Recharts', content.includes('recharts'));
  check('PeakUsageChart has props interface', content.includes('PeakUsageChartProps'));
  check('PeakUsageChart has loading state', content.includes('loading'));
  check('PeakUsageChart supports bar chart', content.includes('BarChart'));
  check('PeakUsageChart has responsive container', content.includes('ResponsiveContainer'));
}

// ErrorBreakdownChart component
const errorChartPath = path.join(componentsBasePath, 'ErrorBreakdownChart.tsx');
check('ErrorBreakdownChart component exists', fs.existsSync(errorChartPath), `Expected: ${errorChartPath}`);
if (fs.existsSync(errorChartPath)) {
  const content = fs.readFileSync(errorChartPath, 'utf-8');
  check('ErrorBreakdownChart uses Recharts', content.includes('recharts'));
  check('ErrorBreakdownChart has props interface', content.includes('ErrorBreakdownChartProps'));
  check('ErrorBreakdownChart has severity colors', content.includes('SEVERITY_COLORS'));
  check('ErrorBreakdownChart has category colors', content.includes('CATEGORY_COLORS'));
  check('ErrorBreakdownChart uses PieChart', content.includes('PieChart'));
}

// TenantTable component
const tenantTablePath = path.join(componentsBasePath, 'TenantTable.tsx');
check('TenantTable component exists', fs.existsSync(tenantTablePath), `Expected: ${tenantTablePath}`);
if (fs.existsSync(tenantTablePath)) {
  const content = fs.readFileSync(tenantTablePath, 'utf-8');
  check('TenantTable has props interface', content.includes('TenantTableProps'));
  check('TenantTable has pagination', content.includes('TablePagination'));
  check('TenantTable has sorting', content.includes('TableSortLabel'));
  check('TenantTable has export functionality', content.includes('onExport'));
  check('TenantTable has loading state', content.includes('loading'));
}

// AgentHeatmap component
const agentHeatmapPath = path.join(componentsBasePath, 'AgentHeatmap.tsx');
check('AgentHeatmap component exists', fs.existsSync(agentHeatmapPath), `Expected: ${agentHeatmapPath}`);
if (fs.existsSync(agentHeatmapPath)) {
  const content = fs.readFileSync(agentHeatmapPath, 'utf-8');
  check('AgentHeatmap has props interface', content.includes('AgentHeatmapProps'));
  check('AgentHeatmap has color scaling', content.includes('getColor'));
  check('AgentHeatmap has tooltips', content.includes('Tooltip'));
  check('AgentHeatmap has loading state', content.includes('loading'));
  check('AgentHeatmap displays hourly data', content.includes('hourlyLoad'));
}

// ErrorLogViewer component
const errorLogPath = path.join(componentsBasePath, 'ErrorLogViewer.tsx');
check('ErrorLogViewer component exists', fs.existsSync(errorLogPath), `Expected: ${errorLogPath}`);
if (fs.existsSync(errorLogPath)) {
  const content = fs.readFileSync(errorLogPath, 'utf-8');
  check('ErrorLogViewer has props interface', content.includes('ErrorLogViewerProps'));
  check('ErrorLogViewer has expandable rows', content.includes('Collapse'));
  check('ErrorLogViewer has copy functionality', content.includes('navigator.clipboard'));
  check('ErrorLogViewer displays severity', content.includes('severity'));
  check('ErrorLogViewer displays stack traces', content.includes('stackTrace'));
}

section('7. Admin Tab Pages Verification');

const pagesBasePath = path.join(__dirname, 'apps/dashboard/src/pages/admin-console');

// OverviewTab
const overviewTabPath = path.join(pagesBasePath, 'OverviewTab.tsx');
check('OverviewTab page exists', fs.existsSync(overviewTabPath), `Expected: ${overviewTabPath}`);
if (fs.existsSync(overviewTabPath)) {
  const content = fs.readFileSync(overviewTabPath, 'utf-8');
  check('OverviewTab uses useOverviewStats hook', content.includes('useOverviewStats'));
  check('OverviewTab displays StatsCard', content.includes('StatsCard'));
  check('OverviewTab displays PeakUsageChart', content.includes('PeakUsageChart'));
  check('OverviewTab displays ErrorBreakdownChart', content.includes('ErrorBreakdownChart'));
  check('OverviewTab has time range selector', content.includes('timeRange'));
}

// TenantActivityTab
const tenantTabPath = path.join(pagesBasePath, 'TenantActivityTab.tsx');
check('TenantActivityTab page exists', fs.existsSync(tenantTabPath), `Expected: ${tenantTabPath}`);
if (fs.existsSync(tenantTabPath)) {
  const content = fs.readFileSync(tenantTabPath, 'utf-8');
  check('TenantActivityTab uses useTenantActivity hook', content.includes('useTenantActivity'));
  check('TenantActivityTab displays TenantTable', content.includes('TenantTable'));
  check('TenantActivityTab has export dialog', content.includes('Dialog'));
  check('TenantActivityTab has search functionality', content.includes('searchQuery'));
  check('TenantActivityTab has CSV download', content.includes('Blob') || content.includes('download'));
}

// AgentActivityTab
const agentTabPath = path.join(pagesBasePath, 'AgentActivityTab.tsx');
check('AgentActivityTab page exists', fs.existsSync(agentTabPath), `Expected: ${agentTabPath}`);
if (fs.existsSync(agentTabPath)) {
  const content = fs.readFileSync(agentTabPath, 'utf-8');
  check('AgentActivityTab uses useAgentActivity hook', content.includes('useAgentActivity'));
  check('AgentActivityTab uses useAgentLoadHeatmap hook', content.includes('useAgentLoadHeatmap'));
  check('AgentActivityTab displays AgentHeatmap', content.includes('AgentHeatmap'));
  check('AgentActivityTab displays metrics table', content.includes('Table'));
  check('AgentActivityTab has agent selection', content.includes('Checkbox'));
}

// ErrorExplorerTab
const errorTabPath = path.join(pagesBasePath, 'ErrorExplorerTab.tsx');
check('ErrorExplorerTab page exists', fs.existsSync(errorTabPath), `Expected: ${errorTabPath}`);
if (fs.existsSync(errorTabPath)) {
  const content = fs.readFileSync(errorTabPath, 'utf-8');
  check('ErrorExplorerTab uses useErrorLogs hook', content.includes('useErrorLogs'));
  check('ErrorExplorerTab displays ErrorLogViewer', content.includes('ErrorLogViewer'));
  check('ErrorExplorerTab has severity filter', content.includes('severityFilter'));
  check('ErrorExplorerTab has category filter', content.includes('categoryFilter'));
  check('ErrorExplorerTab has pagination', content.includes('page'));
}

// PerformanceTab
const perfTabPath = path.join(pagesBasePath, 'PerformanceTab.tsx');
check('PerformanceTab page exists', fs.existsSync(perfTabPath), `Expected: ${perfTabPath}`);
if (fs.existsSync(perfTabPath)) {
  const content = fs.readFileSync(perfTabPath, 'utf-8');
  check('PerformanceTab uses usePerformanceMetrics hook', content.includes('usePerformanceMetrics'));
  check('PerformanceTab displays route latency chart', content.includes('BarChart'));
  check('PerformanceTab displays slowest requests', content.includes('slowestRequests'));
  check('PerformanceTab displays webhook metrics', content.includes('webhookMetrics'));
  check('PerformanceTab has StatsCard components', content.includes('StatsCard'));
}

section('8. Main AdminConsole Page Verification');

const adminConsolePath = path.join(__dirname, 'apps/dashboard/src/pages/AdminConsole.tsx');
check('AdminConsole main page exists', fs.existsSync(adminConsolePath), `Expected: ${adminConsolePath}`);

if (fs.existsSync(adminConsolePath)) {
  const content = fs.readFileSync(adminConsolePath, 'utf-8');

  check('AdminConsole has tab navigation', content.includes('Tabs') && content.includes('Tab'));
  check('AdminConsole has access control', content.includes('isAdmin'));
  check('AdminConsole has access denied screen', content.includes('Access Denied'));
  check('AdminConsole has breadcrumbs', content.includes('Breadcrumbs'));
  check('AdminConsole imports OverviewTab', content.includes('OverviewTab'));
  check('AdminConsole imports TenantActivityTab', content.includes('TenantActivityTab'));
  check('AdminConsole imports AgentActivityTab', content.includes('AgentActivityTab'));
  check('AdminConsole imports ErrorExplorerTab', content.includes('ErrorExplorerTab'));
  check('AdminConsole imports PerformanceTab', content.includes('PerformanceTab'));
  check('AdminConsole has loading state', content.includes('CircularProgress') || content.includes('loading'));
  check('AdminConsole has error handling', content.includes('error'));
  check('AdminConsole has TabPanel component', content.includes('TabPanel'));
}

section('9. Material-UI Integration Verification');

const componentsToCheck = [
  statsCardPath,
  peakChartPath,
  errorChartPath,
  tenantTablePath,
  agentHeatmapPath,
  errorLogPath,
];

componentsToCheck.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    check(`${fileName} uses Material-UI`, content.includes('@mui/material'));
  }
});

section('10. TypeScript Type Safety Verification');

const tsFilesToCheck = [
  statsCardPath,
  peakChartPath,
  errorChartPath,
  tenantTablePath,
  agentHeatmapPath,
  errorLogPath,
  overviewTabPath,
  tenantTabPath,
  agentTabPath,
  errorTabPath,
  perfTabPath,
  adminConsolePath,
];

tsFilesToCheck.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    check(`${fileName} imports from @pravado/shared-types`, content.includes('@pravado/shared-types'));
  }
});

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
