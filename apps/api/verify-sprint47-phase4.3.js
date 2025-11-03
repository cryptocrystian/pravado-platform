#!/usr/bin/env node

/**
 * =====================================================
 * SPRINT 47 PHASE 4.3 VERIFICATION SCRIPT
 * =====================================================
 *
 * Verifies: Conversational Analytics Dashboard
 * Components:
 * - AgentConversationAnalytics service
 * - Analytics API routes
 * - React hooks for analytics
 * - Analytics components (charts, cards)
 * - AgentAnalyticsDashboard page
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (details) {
      console.log(`  ${colors.dim}${details}${colors.reset}`);
    }
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (details) {
      console.log(`  ${colors.red}${details}${colors.reset}`);
    }
    failed++;
  }
}

function section(title) {
  console.log(`\n${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(title.length));
}

// =====================================================
// FILE PATHS
// =====================================================

const API_ROOT = path.resolve(__dirname);
const DASHBOARD_ROOT = path.resolve(__dirname, '../dashboard');

const SERVICE_FILE = path.join(API_ROOT, 'src/services/agentConversationAnalytics.ts');
const ROUTES_FILE = path.join(API_ROOT, 'src/routes/agent-analytics.ts');
const ROUTES_INDEX = path.join(API_ROOT, 'src/routes/index.ts');

const HOOKS_FILE = path.join(DASHBOARD_ROOT, 'src/hooks/useAgentAnalytics.ts');
const COMPONENTS_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-analytics/AnalyticsComponents.tsx');
const DASHBOARD_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-analytics/AgentAnalyticsDashboard.tsx');
const INDEX_FILE = path.join(DASHBOARD_ROOT, 'src/pages/agent-analytics/index.ts');

// =====================================================
// SECTION 1: Analytics Service
// =====================================================

section('1. Analytics Service');

check('agentConversationAnalytics.ts file exists', fs.existsSync(SERVICE_FILE), SERVICE_FILE);

if (fs.existsSync(SERVICE_FILE)) {
  const serviceContent = fs.readFileSync(SERVICE_FILE, 'utf-8');

  // Class definition
  check('AgentConversationAnalyticsService class defined', serviceContent.includes('class AgentConversationAnalyticsService'));

  // Core methods
  check('getConversationSummary method exists', serviceContent.includes('getConversationSummary'));
  check('getSentimentTrends method exists', serviceContent.includes('getSentimentTrends'));
  check('getTopicDistribution method exists', serviceContent.includes('getTopicDistribution'));
  check('getEngagementMetrics method exists', serviceContent.includes('getEngagementMetrics'));
  check('getResolutionOutcomes method exists', serviceContent.includes('getResolutionOutcomes'));

  // Type definitions
  check('ConversationSummary interface defined', serviceContent.includes('interface ConversationSummary'));
  check('SentimentDataPoint interface defined', serviceContent.includes('interface SentimentDataPoint'));
  check('TopicData interface defined', serviceContent.includes('interface TopicData'));
  check('EngagementMetrics interface defined', serviceContent.includes('interface EngagementMetrics'));
  check('ResolutionOutcomes interface defined', serviceContent.includes('interface ResolutionOutcomes'));
  check('DateRange interface defined', serviceContent.includes('interface DateRange'));

  // Database queries
  check('Uses pool.query for database access', serviceContent.includes('pool.query'));
  check('getConversationSummary has SQL query', serviceContent.includes('SELECT') && serviceContent.includes('FROM agent_conversations'));
  check('getSentimentTrends groups by date', serviceContent.includes('DATE_TRUNC') || serviceContent.includes('GROUP BY'));
  check('getTopicDistribution uses JSONB operations', serviceContent.includes('jsonb_array_elements') || serviceContent.includes('metadata'));
  check('getEngagementMetrics calculates response times', serviceContent.includes('avg_agent_response_time') || serviceContent.includes('EXTRACT'));
  check('getResolutionOutcomes counts by status', serviceContent.includes('status'));

  // Organization filtering
  check('Supports organization filtering', serviceContent.includes('organizationId'));

  // Date range support
  check('Supports date range filtering', serviceContent.includes('startDate') && serviceContent.includes('endDate'));

  // Export
  check('Service exported as singleton', serviceContent.includes('export const agentConversationAnalytics'));
}

// =====================================================
// SECTION 2: Analytics API Routes
// =====================================================

section('2. Analytics API Routes');

check('agent-analytics.ts file exists', fs.existsSync(ROUTES_FILE), ROUTES_FILE);

if (fs.existsSync(ROUTES_FILE)) {
  const routesContent = fs.readFileSync(ROUTES_FILE, 'utf-8');

  // Router setup
  check('Express router created', routesContent.includes('express.Router'));
  check('Imports analytics service', routesContent.includes('agentConversationAnalytics'));

  // Route endpoints
  check('GET /summary/:agentId endpoint exists', routesContent.includes('/summary/:agentId'));
  check('GET /sentiment/:agentId endpoint exists', routesContent.includes('/sentiment/:agentId'));
  check('GET /topics/:agentId endpoint exists', routesContent.includes('/topics/:agentId'));
  check('GET /engagement/:agentId endpoint exists', routesContent.includes('/engagement/:agentId'));
  check('GET /resolution/:agentId endpoint exists', routesContent.includes('/resolution/:agentId'));
  check('GET /health endpoint exists', routesContent.includes('/health'));

  // Middleware functions
  check('getOrganizationId helper exists', routesContent.includes('getOrganizationId'));
  check('parseDateRange helper exists', routesContent.includes('parseDateRange'));

  // Route logic
  check('/summary calls getConversationSummary', routesContent.includes('getConversationSummary'));
  check('/sentiment calls getSentimentTrends', routesContent.includes('getSentimentTrends'));
  check('/topics calls getTopicDistribution', routesContent.includes('getTopicDistribution'));
  check('/engagement calls getEngagementMetrics', routesContent.includes('getEngagementMetrics'));
  check('/resolution calls getResolutionOutcomes', routesContent.includes('getResolutionOutcomes'));

  // Error handling
  check('Routes have error handling', routesContent.includes('try') && routesContent.includes('catch'));
  check('Returns JSON responses', routesContent.includes('res.json'));

  // Router export
  check('Router exported as default', routesContent.includes('export default router'));
}

// Check routes index
check('routes/index.ts file exists', fs.existsSync(ROUTES_INDEX));

if (fs.existsSync(ROUTES_INDEX)) {
  const indexContent = fs.readFileSync(ROUTES_INDEX, 'utf-8');

  check('Imports agent-analytics routes', indexContent.includes('agent-analytics'));
  check('Mounts agent-analytics routes', indexContent.includes("router.use('/agent-analytics'"));
}

// =====================================================
// SECTION 3: React Hooks
// =====================================================

section('3. React Hooks');

check('useAgentAnalytics.ts file exists', fs.existsSync(HOOKS_FILE), HOOKS_FILE);

if (fs.existsSync(HOOKS_FILE)) {
  const hooksContent = fs.readFileSync(HOOKS_FILE, 'utf-8');

  // Hook functions
  check('useConversationSummary hook defined', hooksContent.includes('export function useConversationSummary'));
  check('useSentimentTrends hook defined', hooksContent.includes('export function useSentimentTrends'));
  check('useTopicDistribution hook defined', hooksContent.includes('export function useTopicDistribution'));
  check('useEngagementMetrics hook defined', hooksContent.includes('export function useEngagementMetrics'));
  check('useResolutionOutcomes hook defined', hooksContent.includes('export function useResolutionOutcomes'));

  // React Query integration
  check('Uses useQuery from React Query', hooksContent.includes('useQuery'));
  check('Defines query keys', hooksContent.includes('analyticsQueryKeys'));

  // API calls
  check('Uses fetchApi helper', hooksContent.includes('fetchApi'));
  check('Calls /api/agent-analytics/summary', hooksContent.includes('/api/agent-analytics/summary'));
  check('Calls /api/agent-analytics/sentiment', hooksContent.includes('/api/agent-analytics/sentiment'));
  check('Calls /api/agent-analytics/topics', hooksContent.includes('/api/agent-analytics/topics'));
  check('Calls /api/agent-analytics/engagement', hooksContent.includes('/api/agent-analytics/engagement'));
  check('Calls /api/agent-analytics/resolution', hooksContent.includes('/api/agent-analytics/resolution'));

  // Type imports/definitions
  check('ConversationSummary type defined', hooksContent.includes('ConversationSummary'));
  check('SentimentDataPoint type defined', hooksContent.includes('SentimentDataPoint'));
  check('TopicData type defined', hooksContent.includes('TopicData'));
  check('EngagementMetrics type defined', hooksContent.includes('EngagementMetrics'));
  check('ResolutionOutcomes type defined', hooksContent.includes('ResolutionOutcomes'));

  // Date range support
  check('buildDateRangeQuery helper exists', hooksContent.includes('buildDateRangeQuery'));
  check('Supports date range in hooks', hooksContent.includes('dateRange'));

  // Hook options
  check('Hooks support enabled option', hooksContent.includes('enabled'));
  check('Hooks support refetchInterval', hooksContent.includes('refetchInterval'));
  check('Hooks have staleTime configured', hooksContent.includes('staleTime'));
}

// =====================================================
// SECTION 4: Analytics Components
// =====================================================

section('4. Analytics Components');

check('AnalyticsComponents.tsx file exists', fs.existsSync(COMPONENTS_FILE), COMPONENTS_FILE);

if (fs.existsSync(COMPONENTS_FILE)) {
  const componentsContent = fs.readFileSync(COMPONENTS_FILE, 'utf-8');

  // Component exports
  check('ConversationSummaryCard exported', componentsContent.includes('export const ConversationSummaryCard'));
  check('SentimentTrendChart exported', componentsContent.includes('export const SentimentTrendChart'));
  check('TopicDistributionChart exported', componentsContent.includes('export const TopicDistributionChart'));
  check('EngagementMetricsCard exported', componentsContent.includes('export const EngagementMetricsCard'));
  check('ResolutionBreakdownCard exported', componentsContent.includes('export const ResolutionBreakdownCard'));

  // Recharts imports
  check('Imports from recharts', componentsContent.includes('recharts'));
  check('Uses AreaChart', componentsContent.includes('AreaChart'));
  check('Uses BarChart', componentsContent.includes('BarChart'));
  check('Uses PieChart', componentsContent.includes('PieChart'));

  // Component props
  check('ConversationSummaryCard has props interface', componentsContent.includes('ConversationSummaryCardProps'));
  check('SentimentTrendChart has props interface', componentsContent.includes('SentimentTrendChartProps'));
  check('TopicDistributionChart has props interface', componentsContent.includes('TopicDistributionChartProps'));
  check('EngagementMetrics has props interface', componentsContent.includes('EngagementMetricsProps'));
  check('ResolutionBreakdown has props interface', componentsContent.includes('ResolutionBreakdownProps'));

  // Loading states
  check('Components handle loading state', componentsContent.includes('isLoading'));
  check('Shows loading skeleton', componentsContent.includes('animate-pulse'));

  // Empty states
  check('Components handle empty data', componentsContent.includes('No') && componentsContent.includes('data available'));

  // Utility functions
  check('formatTime helper exists', componentsContent.includes('formatTime'));
  check('formatNumber helper exists', componentsContent.includes('formatNumber'));

  // Chart configuration
  check('SentimentTrendChart uses stacked areas', componentsContent.includes('stackId'));
  check('TopicDistributionChart shows percentages', componentsContent.includes('percentage'));
  check('ResolutionBreakdown shows pie chart', componentsContent.includes('PieChart'));

  // Responsive design
  check('Uses ResponsiveContainer', componentsContent.includes('ResponsiveContainer'));
}

// =====================================================
// SECTION 5: Dashboard Page
// =====================================================

section('5. Dashboard Page');

check('AgentAnalyticsDashboard.tsx file exists', fs.existsSync(DASHBOARD_FILE), DASHBOARD_FILE);

if (fs.existsSync(DASHBOARD_FILE)) {
  const dashboardContent = fs.readFileSync(DASHBOARD_FILE, 'utf-8');

  // Component definition
  check('AgentAnalyticsDashboard exported', dashboardContent.includes('export const AgentAnalyticsDashboard'));

  // Hooks usage
  check('Uses useConversationSummary', dashboardContent.includes('useConversationSummary'));
  check('Uses useSentimentTrends', dashboardContent.includes('useSentimentTrends'));
  check('Uses useTopicDistribution', dashboardContent.includes('useTopicDistribution'));
  check('Uses useEngagementMetrics', dashboardContent.includes('useEngagementMetrics'));
  check('Uses useResolutionOutcomes', dashboardContent.includes('useResolutionOutcomes'));

  // Component rendering
  check('Renders ConversationSummaryCard', dashboardContent.includes('ConversationSummaryCard'));
  check('Renders SentimentTrendChart', dashboardContent.includes('SentimentTrendChart'));
  check('Renders TopicDistributionChart', dashboardContent.includes('TopicDistributionChart'));
  check('Renders EngagementMetricsCard', dashboardContent.includes('EngagementMetricsCard'));
  check('Renders ResolutionBreakdownCard', dashboardContent.includes('ResolutionBreakdownCard'));

  // State management
  check('Has dateRange state', dashboardContent.includes('dateRange'));
  check('Has sentimentInterval state', dashboardContent.includes('sentimentInterval'));

  // Date range controls
  check('handleDateRangeChange function exists', dashboardContent.includes('handleDateRangeChange'));
  check('Has date range buttons', dashboardContent.includes('7d') || dashboardContent.includes('Last 7 Days'));

  // Sentiment interval controls
  check('Has interval selector', dashboardContent.includes('daily') && dashboardContent.includes('weekly') && dashboardContent.includes('monthly'));

  // Empty state
  check('Handles no agent selected', dashboardContent.includes('No Agent Selected') || dashboardContent.includes('!agentId'));

  // Layout
  check('Uses grid layout', dashboardContent.includes('grid'));
  check('Responsive design', dashboardContent.includes('lg:'));
}

// Index file
check('index.ts file exists', fs.existsSync(INDEX_FILE));

if (fs.existsSync(INDEX_FILE)) {
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');

  check('Exports AgentAnalyticsDashboard', indexContent.includes('AgentAnalyticsDashboard'));
  check('Exports component modules', indexContent.includes('AnalyticsComponents'));
}

// =====================================================
// SUMMARY
// =====================================================

console.log('\n' + '='.repeat(50));
console.log(`${colors.cyan}VERIFICATION SUMMARY${colors.reset}`);
console.log('='.repeat(50));
console.log('');

const total = passed + failed;
const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

console.log(`Passed: ${colors.green}${passed}/${total} (${percentage}%)${colors.reset}`);

if (failed > 0) {
  console.log(`Failed: ${colors.red}${failed}/${total}${colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}⚠ Some checks failed. Please review the output above.${colors.reset}`);
  process.exit(1);
} else {
  console.log('');
  console.log(`${colors.green}✓ All checks passed! Sprint 47 Phase 4.3 implementation is complete.${colors.reset}`);
  process.exit(0);
}
