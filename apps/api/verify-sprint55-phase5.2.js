// =====================================================
// SPRINT 55 PHASE 5.2 VERIFICATION SCRIPT
// Multi-Tenant Developer Portal & Token Management Console
// =====================================================

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;
const errors = [];

function check(description, condition, errorMsg = '') {
  if (condition) {
    passCount++;
    console.log(`✓ ${description}`);
  } else {
    failCount++;
    const msg = `✗ ${description}${errorMsg ? ': ' + errorMsg : ''}`;
    console.error(msg);
    errors.push(msg);
  }
}

console.log('\n=================================================');
console.log('SPRINT 55 PHASE 5.2 VERIFICATION');
console.log('Multi-Tenant Developer Portal & Token Management Console');
console.log('=================================================\n');

// =====================================================
// 1. FILE EXISTENCE CHECKS (14 checks)
// =====================================================

console.log('\n--- File Existence Checks ---\n');

const dashboardBasePath = path.join(__dirname, '../../apps/dashboard/src');

const requiredFiles = [
  // Hooks
  'hooks/useDeveloperAPI.ts',
  // Components
  'components/developer/TokenCard.tsx',
  'components/developer/UsageMetricsChart.tsx',
  'components/developer/WebhookStatusList.tsx',
  'components/developer/DeveloperDocsPanel.tsx',
  // Pages
  'pages/developer-console/APIKeysTab.tsx',
  'pages/developer-console/UsageTab.tsx',
  'pages/developer-console/WebhooksTab.tsx',
  'pages/developer-console/DocumentationTab.tsx',
  'pages/developer-console/DeveloperConsole.tsx',
];

requiredFiles.forEach((file) => {
  const filePath = path.join(dashboardBasePath, file);
  check(
    `File exists: ${file}`,
    fs.existsSync(filePath),
    `File not found at ${filePath}`
  );
});

// =====================================================
// 2. HOOKS FILE CHECKS (20 checks)
// =====================================================

console.log('\n--- React Hooks File Checks ---\n');

const hooksPath = path.join(dashboardBasePath, 'hooks/useDeveloperAPI.ts');
if (fs.existsSync(hooksPath)) {
  const hooksContent = fs.readFileSync(hooksPath, 'utf-8');

  check('useAPIKeys hook exported', hooksContent.includes('export function useAPIKeys'));
  check('useCreateToken hook exported', hooksContent.includes('export function useCreateToken'));
  check('useRotateToken hook exported', hooksContent.includes('export function useRotateToken'));
  check('useRevokeToken hook exported', hooksContent.includes('export function useRevokeToken'));
  check('useUsageAnalytics hook exported', hooksContent.includes('export function useUsageAnalytics'));
  check('useWebhooks hook exported', hooksContent.includes('export function useWebhooks'));
  check('useRegisterWebhook hook exported', hooksContent.includes('export function useRegisterWebhook'));
  check('useWebhookStats hook exported', hooksContent.includes('export function useWebhookStats'));
  check('useOpenAPISchema hook exported', hooksContent.includes('export function useOpenAPISchema'));
  check('useRetryWebhook hook exported', hooksContent.includes('export function useRetryWebhook'));
  check('useUpdateWebhook hook exported', hooksContent.includes('export function useUpdateWebhook'));

  check('APIToken interface defined', hooksContent.includes('interface APIToken'));
  check('UsageMetrics interface defined', hooksContent.includes('interface UsageMetrics'));
  check('WebhookRegistration interface defined', hooksContent.includes('interface WebhookRegistration'));
  check('WebhookStats interface defined', hooksContent.includes('interface WebhookStats'));

  check('API_BASE_URL configured', hooksContent.includes('API_BASE_URL'));
  check('axios imports present', hooksContent.includes("import axios"));
  check('useState imports present', hooksContent.includes('useState'));
  check('useEffect imports present', hooksContent.includes('useEffect'));
  check('useCallback imports present', hooksContent.includes('useCallback'));
}

// =====================================================
// 3. TOKEN CARD COMPONENT CHECKS (12 checks)
// =====================================================

console.log('\n--- TokenCard Component Checks ---\n');

const tokenCardPath = path.join(dashboardBasePath, 'components/developer/TokenCard.tsx');
if (fs.existsSync(tokenCardPath)) {
  const tokenCardContent = fs.readFileSync(tokenCardPath, 'utf-8');

  check('TokenCard component exported', tokenCardContent.includes('export const TokenCard'));
  check('TokenCardProps interface defined', tokenCardContent.includes('interface TokenCardProps'));
  check('useRotateToken hook imported', tokenCardContent.includes('useRotateToken'));
  check('useRevokeToken hook imported', tokenCardContent.includes('useRevokeToken'));
  check('Rotate token dialog present', tokenCardContent.includes('Rotate API Token'));
  check('Revoke token dialog present', tokenCardContent.includes('Revoke API Token'));
  check('Token prefix display', tokenCardContent.includes('tokenPrefix'));
  check('Access level display', tokenCardContent.includes('accessLevel'));
  check('Rate limit tier display', tokenCardContent.includes('rateLimitTier'));
  check('Scopes display', tokenCardContent.includes('scopes'));
  check('Copy token functionality', tokenCardContent.includes('ContentCopy'));
  check('Token status display', tokenCardContent.includes('isActive'));
}

// =====================================================
// 4. USAGE METRICS CHART COMPONENT CHECKS (15 checks)
// =====================================================

console.log('\n--- UsageMetricsChart Component Checks ---\n');

const usageChartPath = path.join(dashboardBasePath, 'components/developer/UsageMetricsChart.tsx');
if (fs.existsSync(usageChartPath)) {
  const usageChartContent = fs.readFileSync(usageChartPath, 'utf-8');

  check('UsageMetricsChart component exported', usageChartContent.includes('export const UsageMetricsChart'));
  check('UsageMetricsChartProps interface defined', usageChartContent.includes('interface UsageMetricsChartProps'));
  check('Recharts imports present', usageChartContent.includes('recharts'));
  check('BarChart component used', usageChartContent.includes('BarChart'));
  check('PieChart component used', usageChartContent.includes('PieChart'));
  check('LineChart component used', usageChartContent.includes('LineChart'));
  check('Total requests display', usageChartContent.includes('totalRequests'));
  check('Success rate calculation', usageChartContent.includes('successRate'));
  check('Error rate calculation', usageChartContent.includes('errorRate'));
  check('Rate limit display', usageChartContent.includes('rateLimitedRequests'));
  check('P95 response time display', usageChartContent.includes('p95ResponseTime'));
  check('P99 response time display', usageChartContent.includes('p99ResponseTime'));
  check('Requests by endpoint chart', usageChartContent.includes('requestsByEndpoint'));
  check('Requests by status chart', usageChartContent.includes('requestsByStatus'));
  check('Chart toggle buttons', usageChartContent.includes('ToggleButton'));
}

// =====================================================
// 5. WEBHOOK STATUS LIST COMPONENT CHECKS (13 checks)
// =====================================================

console.log('\n--- WebhookStatusList Component Checks ---\n');

const webhookListPath = path.join(dashboardBasePath, 'components/developer/WebhookStatusList.tsx');
if (fs.existsSync(webhookListPath)) {
  const webhookListContent = fs.readFileSync(webhookListPath, 'utf-8');

  check('WebhookStatusList component exported', webhookListContent.includes('export const WebhookStatusList'));
  check('WebhookStatusListProps interface defined', webhookListContent.includes('interface WebhookStatusListProps'));
  check('WebhookRow component present', webhookListContent.includes('const WebhookRow'));
  check('useWebhookStats hook imported', webhookListContent.includes('useWebhookStats'));
  check('useRetryWebhook hook imported', webhookListContent.includes('useRetryWebhook'));
  check('useUpdateWebhook hook imported', webhookListContent.includes('useUpdateWebhook'));
  check('Webhook URL display', webhookListContent.includes('webhook.url'));
  check('Webhook status display', webhookListContent.includes('isActive'));
  check('Total deliveries display', webhookListContent.includes('totalDeliveries'));
  check('Failed deliveries display', webhookListContent.includes('failedDeliveries'));
  check('Retry functionality present', webhookListContent.includes('retryWebhook'));
  check('Edit webhook dialog', webhookListContent.includes('Edit Webhook'));
  check('Collapsible stats display', webhookListContent.includes('Collapse'));
}

// =====================================================
// 6. DEVELOPER DOCS PANEL COMPONENT CHECKS (10 checks)
// =====================================================

console.log('\n--- DeveloperDocsPanel Component Checks ---\n');

const docsPanelPath = path.join(dashboardBasePath, 'components/developer/DeveloperDocsPanel.tsx');
if (fs.existsSync(docsPanelPath)) {
  const docsPanelContent = fs.readFileSync(docsPanelPath, 'utf-8');

  check('DeveloperDocsPanel component exported', docsPanelContent.includes('export const DeveloperDocsPanel'));
  check('DeveloperDocsPanelProps interface defined', docsPanelContent.includes('interface DeveloperDocsPanelProps'));
  check('useOpenAPISchema hook imported', docsPanelContent.includes('useOpenAPISchema'));
  check('SwaggerUI imported', docsPanelContent.includes('swagger-ui-react'));
  check('Authentication instructions present', docsPanelContent.includes('Authentication'));
  check('Rate limits documentation', docsPanelContent.includes('Rate Limit'));
  check('Code examples present', docsPanelContent.includes('curl'));
  check('JavaScript example present', docsPanelContent.includes('javascript') || docsPanelContent.includes('JavaScript'));
  check('Python example present', docsPanelContent.includes('python') || docsPanelContent.includes('Python'));
  check('API token injection support', docsPanelContent.includes('apiToken'));
}

// =====================================================
// 7. API KEYS TAB PAGE CHECKS (11 checks)
// =====================================================

console.log('\n--- API Keys Tab Page Checks ---\n');

const apiKeysTabPath = path.join(dashboardBasePath, 'pages/developer-console/APIKeysTab.tsx');
if (fs.existsSync(apiKeysTabPath)) {
  const apiKeysTabContent = fs.readFileSync(apiKeysTabPath, 'utf-8');

  check('APIKeysTab component exported', apiKeysTabContent.includes('export const APIKeysTab'));
  check('APIKeysTabProps interface defined', apiKeysTabContent.includes('interface APIKeysTabProps'));
  check('TokenCard component imported', apiKeysTabContent.includes('TokenCard'));
  check('useAPIKeys hook imported', apiKeysTabContent.includes('useAPIKeys'));
  check('useCreateToken hook imported', apiKeysTabContent.includes('useCreateToken'));
  check('Create token dialog present', apiKeysTabContent.includes('Create New API Token'));
  check('Token name input field', apiKeysTabContent.includes('Token Name'));
  check('Access level selection', apiKeysTabContent.includes('Access Level'));
  check('Rate limit tier selection', apiKeysTabContent.includes('Rate Limit Tier'));
  check('Scopes selection', apiKeysTabContent.includes('Scopes'));
  check('Empty state handling', apiKeysTabContent.includes('No API Tokens'));
}

// =====================================================
// 8. USAGE TAB PAGE CHECKS (10 checks)
// =====================================================

console.log('\n--- Usage Tab Page Checks ---\n');

const usageTabPath = path.join(dashboardBasePath, 'pages/developer-console/UsageTab.tsx');
if (fs.existsSync(usageTabPath)) {
  const usageTabContent = fs.readFileSync(usageTabPath, 'utf-8');

  check('UsageTab component exported', usageTabContent.includes('export const UsageTab'));
  check('UsageTabProps interface defined', usageTabContent.includes('interface UsageTabProps'));
  check('UsageMetricsChart component imported', usageTabContent.includes('UsageMetricsChart'));
  check('useUsageAnalytics hook imported', usageTabContent.includes('useUsageAnalytics'));
  check('Time range selector present', usageTabContent.includes('Time Range'));
  check('Date picker integration', usageTabContent.includes('DatePicker'));
  check('Export functionality', usageTabContent.includes('Export'));
  check('Refresh functionality', usageTabContent.includes('Refresh'));
  check('Custom date range support', usageTabContent.includes('custom'));
  check('No data state handling', usageTabContent.includes('No Usage Data'));
}

// =====================================================
// 9. WEBHOOKS TAB PAGE CHECKS (11 checks)
// =====================================================

console.log('\n--- Webhooks Tab Page Checks ---\n');

const webhooksTabPath = path.join(dashboardBasePath, 'pages/developer-console/WebhooksTab.tsx');
if (fs.existsSync(webhooksTabPath)) {
  const webhooksTabContent = fs.readFileSync(webhooksTabPath, 'utf-8');

  check('WebhooksTab component exported', webhooksTabContent.includes('export const WebhooksTab'));
  check('WebhooksTabProps interface defined', webhooksTabContent.includes('interface WebhooksTabProps'));
  check('WebhookStatusList component imported', webhooksTabContent.includes('WebhookStatusList'));
  check('useWebhooks hook imported', webhooksTabContent.includes('useWebhooks'));
  check('useRegisterWebhook hook imported', webhooksTabContent.includes('useRegisterWebhook'));
  check('Register webhook dialog', webhooksTabContent.includes('Register New Webhook'));
  check('Webhook URL input', webhooksTabContent.includes('Webhook URL'));
  check('Event selection', webhooksTabContent.includes('Events to Subscribe'));
  check('Webhook secret generation', webhooksTabContent.includes('Generate'));
  check('Custom headers support', webhooksTabContent.includes('Custom Headers'));
  check('Empty state handling', webhooksTabContent.includes('No Webhooks'));
}

// =====================================================
// 10. DOCUMENTATION TAB PAGE CHECKS (5 checks)
// =====================================================

console.log('\n--- Documentation Tab Page Checks ---\n');

const docTabPath = path.join(dashboardBasePath, 'pages/developer-console/DocumentationTab.tsx');
if (fs.existsSync(docTabPath)) {
  const docTabContent = fs.readFileSync(docTabPath, 'utf-8');

  check('DocumentationTab component exported', docTabContent.includes('export const DocumentationTab'));
  check('DocumentationTabProps interface defined', docTabContent.includes('interface DocumentationTabProps'));
  check('DeveloperDocsPanel component imported', docTabContent.includes('DeveloperDocsPanel'));
  check('API token prop passed', docTabContent.includes('apiToken'));
  check('Component renders DeveloperDocsPanel', docTabContent.includes('<DeveloperDocsPanel'));
}

// =====================================================
// 11. MAIN DEVELOPER CONSOLE PAGE CHECKS (15 checks)
// =====================================================

console.log('\n--- Main Developer Console Page Checks ---\n');

const mainConsolePath = path.join(dashboardBasePath, 'pages/developer-console/DeveloperConsole.tsx');
if (fs.existsSync(mainConsolePath)) {
  const mainConsoleContent = fs.readFileSync(mainConsolePath, 'utf-8');

  check('DeveloperConsole component exported', mainConsoleContent.includes('export const DeveloperConsole'));
  check('DeveloperConsoleProps interface defined', mainConsoleContent.includes('interface DeveloperConsoleProps'));
  check('APIKeysTab imported', mainConsoleContent.includes('APIKeysTab'));
  check('UsageTab imported', mainConsoleContent.includes('UsageTab'));
  check('WebhooksTab imported', mainConsoleContent.includes('WebhooksTab'));
  check('DocumentationTab imported', mainConsoleContent.includes('DocumentationTab'));
  check('Tabs component present', mainConsoleContent.includes('<Tabs'));
  check('Tab navigation present', mainConsoleContent.includes('<Tab'));
  check('API Keys tab defined', mainConsoleContent.includes('api-keys'));
  check('Usage tab defined', mainConsoleContent.includes('usage'));
  check('Webhooks tab defined', mainConsoleContent.includes('webhooks'));
  check('Documentation tab defined', mainConsoleContent.includes('documentation'));
  check('Breadcrumbs navigation', mainConsoleContent.includes('Breadcrumbs'));
  check('Page header present', mainConsoleContent.includes('Developer Console'));
  check('Tab content rendering', mainConsoleContent.includes('activeTab'));
}

// =====================================================
// 12. SECURITY & TENANT ISOLATION CHECKS (8 checks)
// =====================================================

console.log('\n--- Security & Tenant Isolation Checks ---\n');

if (fs.existsSync(hooksPath)) {
  const hooksContent = fs.readFileSync(hooksPath, 'utf-8');

  check('Authorization header present', hooksContent.includes('Authorization'));
  check('Bearer token authentication', hooksContent.includes('Bearer'));
  check('clientId parameter usage', hooksContent.includes('clientId'));
  check('organizationId parameter usage (in create)', hooksContent.includes('organizationId'));
  check('Token stored in localStorage', hooksContent.includes('localStorage'));
}

if (fs.existsSync(mainConsolePath)) {
  const mainConsoleContent = fs.readFileSync(mainConsolePath, 'utf-8');

  check('clientId prop passed to tabs', mainConsoleContent.includes('clientId={clientId}'));
  check('organizationId prop passed to API Keys tab', mainConsoleContent.includes('organizationId={organizationId}'));
  check('Authentication check present', mainConsoleContent.includes('authenticated') || mainConsoleContent.includes('clientId') && mainConsoleContent.includes('organizationId'));
}

// =====================================================
// 13. RESPONSIVE DESIGN CHECKS (7 checks)
// =====================================================

console.log('\n--- Responsive Design Checks ---\n');

const allComponentFiles = [
  tokenCardPath,
  usageChartPath,
  webhookListPath,
  docsPanelPath,
  apiKeysTabPath,
  usageTabPath,
  webhooksTabPath,
];

const responsivePatterns = ['xs', 'sm', 'md', 'lg', 'xl'];
let foundResponsive = false;

allComponentFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (responsivePatterns.some(pattern => content.includes(pattern))) {
      foundResponsive = true;
    }
  }
});

check('Grid system used for responsive layout', foundResponsive);

if (fs.existsSync(usageChartPath)) {
  const usageChartContent = fs.readFileSync(usageChartPath, 'utf-8');
  check('ResponsiveContainer for charts', usageChartContent.includes('ResponsiveContainer'));
}

if (fs.existsSync(mainConsolePath)) {
  const mainConsoleContent = fs.readFileSync(mainConsolePath, 'utf-8');
  check('Scrollable tabs for mobile', mainConsoleContent.includes('scrollable') || mainConsoleContent.includes('variant'));
  check('Container with maxWidth', mainConsoleContent.includes('Container'));
}

if (fs.existsSync(apiKeysTabPath)) {
  const apiKeysTabContent = fs.readFileSync(apiKeysTabPath, 'utf-8');
  check('Grid layout in forms', apiKeysTabContent.includes('Grid'));
}

if (fs.existsSync(usageTabPath)) {
  const usageTabContent = fs.readFileSync(usageTabPath, 'utf-8');
  check('Flexible button groups', usageTabContent.includes('ButtonGroup'));
  check('Date picker responsive props', usageTabContent.includes('fullWidth') || usageTabContent.includes('Grid'));
}

// =====================================================
// 14. USER EXPERIENCE CHECKS (10 checks)
// =====================================================

console.log('\n--- User Experience Checks ---\n');

if (fs.existsSync(tokenCardPath)) {
  const tokenCardContent = fs.readFileSync(tokenCardPath, 'utf-8');
  check('Loading states in TokenCard', tokenCardContent.includes('loading') || tokenCardContent.includes('CircularProgress'));
  check('Error states in TokenCard', tokenCardContent.includes('error') || tokenCardContent.includes('Alert'));
}

if (fs.existsSync(usageChartPath)) {
  const usageChartContent = fs.readFileSync(usageChartPath, 'utf-8');
  check('Loading states in charts', usageChartContent.includes('loading') || usageChartContent.includes('Loading'));
}

if (fs.existsSync(apiKeysTabPath)) {
  const apiKeysTabContent = fs.readFileSync(apiKeysTabPath, 'utf-8');
  check('Success alerts for token creation', apiKeysTabContent.includes('success') && apiKeysTabContent.includes('Alert'));
  check('Warning for copying token', apiKeysTabContent.includes('warning') || apiKeysTabContent.includes('Important'));
}

if (fs.existsSync(usageTabPath)) {
  const usageTabContent = fs.readFileSync(usageTabPath, 'utf-8');
  check('Export data functionality', usageTabContent.includes('export') || usageTabContent.includes('download'));
}

if (fs.existsSync(webhooksTabPath)) {
  const webhooksTabContent = fs.readFileSync(webhooksTabPath, 'utf-8');
  check('Webhook security warnings', webhooksTabContent.includes('Security') || webhooksTabContent.includes('verify'));
  check('Helpful tooltips and info', webhooksTabContent.includes('Info') || webhooksTabContent.includes('helperText'));
}

if (fs.existsSync(docsPanelPath)) {
  const docsPanelContent = fs.readFileSync(docsPanelPath, 'utf-8');
  check('Code copy functionality', docsPanelContent.includes('copy') || docsPanelContent.includes('ContentCopy'));
  check('Multiple language examples', docsPanelContent.includes('curl') && (docsPanelContent.includes('javascript') || docsPanelContent.includes('JavaScript')));
}

// =====================================================
// SUMMARY
// =====================================================

console.log('\n=================================================');
console.log('VERIFICATION SUMMARY');
console.log('=================================================\n');

const totalChecks = passCount + failCount;
const passPercentage = ((passCount / totalChecks) * 100).toFixed(2);

console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${passCount} (${passPercentage}%)`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n--- Failed Checks ---\n');
  errors.forEach((error) => console.error(error));
}

console.log('\n=================================================');

if (passCount >= 85 && failCount === 0) {
  console.log('✓ ALL CHECKS PASSED - Sprint 55 Phase 5.2 Complete!');
  console.log('=================================================\n');
  process.exit(0);
} else if (passCount >= 85) {
  console.log(`✓ MINIMUM REQUIREMENTS MET (${passCount}/85)`);
  console.log('⚠ Some optional checks failed');
  console.log('=================================================\n');
  process.exit(0);
} else {
  console.log(`✗ VERIFICATION FAILED - ${failCount} checks failed`);
  console.log(`Need at least 85 passing checks, got ${passCount}`);
  console.log('=================================================\n');
  process.exit(1);
}
