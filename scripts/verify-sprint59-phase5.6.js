#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT - SPRINT 59 PHASE 5.6
// Agent Explainability, Trace Logging & Debug Interfaces (Internal Tools)
// =====================================================

const fs = require('fs');
const path = require('path');

const SHARED_TYPES_ROOT = path.join(__dirname, '../packages/shared-types/src');
const API_ROOT = path.join(__dirname, '../apps/api');
const DASHBOARD_ROOT = path.join(__dirname, '../apps/dashboard/src');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

const results = {
  types: [],
  migration: [],
  service: [],
  routes: [],
  components: [],
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
console.log('SPRINT 59 PHASE 5.6 - VERIFICATION');
console.log('Agent Debug & Trace Logging');
console.log('==============================================\n');

// =====================================================
// 1. TYPESCRIPT TYPES VERIFICATION
// =====================================================

console.log('1. Verifying TypeScript Types (agent-debug.ts)...\n');

const typesFile = path.join(SHARED_TYPES_ROOT, 'agent-debug.ts');
results.types.push(
  checkFileExists(typesFile, 'agent-debug.ts exists')
);

// Check enums
const enums = ['TraceNodeType', 'TraceSeverity'];
enums.forEach(enumName => {
  results.types.push(
    checkFileContains(typesFile, `export enum ${enumName}`, `Enum ${enumName} exported`)
  );
});

// Check TraceNodeType values
const nodeTypes = [
  'SYSTEM_PROMPT',
  'USER_INPUT',
  'TOOL_CALL',
  'FUNCTION_CALL',
  'MEMORY_FETCH',
  'MEMORY_UPDATE',
  'RESPONSE_GENERATION',
  'RESPONSE_RENDER',
  'ERROR_HANDLING',
  'API_CALL',
];
nodeTypes.forEach(type => {
  results.types.push(
    checkFileContains(typesFile, type, `TraceNodeType.${type} defined`)
  );
});

// Check TraceSeverity values
const severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
severities.forEach(severity => {
  results.types.push(
    checkFileContains(typesFile, severity, `TraceSeverity.${severity} defined`)
  );
});

// Check interfaces
const interfaces = [
  'TraceNode',
  'AgentExecutionStep',
  'DebugMetadata',
  'AgentTraceTree',
  'AgentTraceSummary',
  'TraceLogEntry',
  'TraceNodeEntry',
  'TraceSearchFilters',
  'TraceSearchResults',
  'LogTraceRequest',
  'LogTraceResponse',
  'TraceNodePath',
  'TracePerformanceMetrics',
];
interfaces.forEach(interfaceName => {
  results.types.push(
    checkFileContains(typesFile, `export interface ${interfaceName}`, `Interface ${interfaceName} exported`)
  );
});

// Check key interface properties
results.types.push(
  checkFileContains(typesFile, 'nodeId:', 'TraceNode has nodeId'),
  checkFileContains(typesFile, 'nodeType:', 'TraceNode has nodeType'),
  checkFileContains(typesFile, 'severity:', 'TraceNode has severity'),
  checkFileContains(typesFile, 'duration?:', 'TraceNode has duration'),
  checkFileContains(typesFile, 'children?:', 'TraceNode has children'),
  checkFileContains(typesFile, 'rootNodes:', 'AgentTraceTree has rootNodes'),
  checkFileContains(typesFile, 'debugMetadata:', 'AgentTraceTree has debugMetadata'),
  checkFileContains(typesFile, 'totalDuration:', 'AgentTraceSummary has totalDuration'),
  checkFileContains(typesFile, 'errorCount:', 'AgentTraceSummary has errorCount'),
  checkFileContains(typesFile, 'slowestNode?:', 'AgentTraceSummary has slowestNode'),
);

// Check index.ts export
const indexFile = path.join(SHARED_TYPES_ROOT, 'index.ts');
results.types.push(
  checkFileContains(indexFile, "export * from './agent-debug'", 'agent-debug exported from index')
);

// =====================================================
// 2. DATABASE MIGRATION VERIFICATION
// =====================================================

console.log('\n2. Verifying Database Migration...\n');

const migrationFile = path.join(API_ROOT, 'supabase/migrations/20251115_create_agent_trace_logs.sql');
results.migration.push(
  checkFileExists(migrationFile, 'Migration file exists')
);

// Check tables
results.migration.push(
  checkFileContains(migrationFile, 'CREATE TABLE IF NOT EXISTS agent_trace_logs', 'agent_trace_logs table created'),
  checkFileContains(migrationFile, 'CREATE TABLE IF NOT EXISTS agent_trace_nodes', 'agent_trace_nodes table created')
);

// Check agent_trace_logs columns
const traceLogsColumns = [
  'trace_id UUID PRIMARY KEY',
  'agent_id UUID NOT NULL',
  'tenant_id UUID NOT NULL',
  'conversation_id UUID',
  'turn_id UUID',
  'start_time TIMESTAMPTZ',
  'end_time TIMESTAMPTZ',
  'total_duration INTEGER',
  'root_node_ids UUID[]',
  'debug_metadata JSONB',
  'tags TEXT[]',
  'searchable_text TEXT',
  'expires_at TIMESTAMPTZ',
];
traceLogsColumns.forEach(col => {
  results.migration.push(
    checkFileContains(migrationFile, col, `agent_trace_logs has ${col.split(' ')[0]}`)
  );
});

// Check agent_trace_nodes columns
const traceNodesColumns = [
  'node_id UUID PRIMARY KEY',
  'trace_id UUID NOT NULL',
  'parent_node_id UUID',
  'node_type VARCHAR(50)',
  'severity VARCHAR(20)',
  'label VARCHAR(255)',
  'description TEXT',
  'start_time TIMESTAMPTZ',
  'end_time TIMESTAMPTZ',
  'duration INTEGER',
  'metadata JSONB',
  'input_data JSONB',
  'output_data JSONB',
  'error_message TEXT',
  'stack_trace TEXT',
];
traceNodesColumns.forEach(col => {
  results.migration.push(
    checkFileContains(migrationFile, col, `agent_trace_nodes has ${col.split(' ')[0]}`)
  );
});

// Check indexes
results.migration.push(
  checkFileContains(migrationFile, 'CREATE INDEX idx_agent_trace_logs_agent_id', 'Index on agent_id'),
  checkFileContains(migrationFile, 'CREATE INDEX idx_agent_trace_logs_tenant_id', 'Index on tenant_id'),
  checkFileContains(migrationFile, 'CREATE INDEX idx_agent_trace_logs_search', 'Full-text search index'),
  checkFileContains(migrationFile, 'CREATE INDEX idx_agent_trace_nodes_trace_id', 'Index on trace_id in nodes')
);

// Check functions
const functions = [
  'get_trace_for_turn',
  'get_traces_for_agent',
  'get_trace_node_path',
  'get_trace_children',
  'get_trace_summary',
  'cleanup_expired_traces',
];
functions.forEach(func => {
  results.migration.push(
    checkFileContains(migrationFile, `CREATE OR REPLACE FUNCTION ${func}`, `Function ${func} created`)
  );
});

// Check RLS
results.migration.push(
  checkFileContains(migrationFile, 'ALTER TABLE agent_trace_logs ENABLE ROW LEVEL SECURITY', 'RLS enabled on trace_logs'),
  checkFileContains(migrationFile, 'ALTER TABLE agent_trace_nodes ENABLE ROW LEVEL SECURITY', 'RLS enabled on trace_nodes'),
  checkFileContains(migrationFile, 'CREATE POLICY tenant_isolation_trace_logs', 'RLS policy for trace_logs'),
  checkFileContains(migrationFile, 'CREATE POLICY tenant_isolation_trace_nodes', 'RLS policy for trace_nodes')
);

// Check TTL functionality
results.migration.push(
  checkFileContains(migrationFile, 'expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL \'30 days\')', '30-day TTL'),
  checkFileContains(migrationFile, 'cleanup_expired_traces', 'Cleanup function for expired traces')
);

// =====================================================
// 3. BACKEND SERVICE VERIFICATION
// =====================================================

console.log('\n3. Verifying AgentDebugService...\n');

const serviceFile = path.join(API_ROOT, 'src/services/agentDebugService.ts');
results.service.push(
  checkFileExists(serviceFile, 'agentDebugService.ts exists')
);

// Check class and methods
results.service.push(
  checkFileContains(serviceFile, 'export class AgentDebugService', 'AgentDebugService class exported'),
  checkFileContains(serviceFile, 'static async logTraceTree', 'logTraceTree method'),
  checkFileContains(serviceFile, 'static async getTraceByTurn', 'getTraceByTurn method'),
  checkFileContains(serviceFile, 'static async getTraceByAgent', 'getTraceByAgent method'),
  checkFileContains(serviceFile, 'static async searchTraces', 'searchTraces method'),
  checkFileContains(serviceFile, 'static async summarizeTrace', 'summarizeTrace method'),
  checkFileContains(serviceFile, 'static async getPerformanceMetrics', 'getPerformanceMetrics method')
);

// Check imports
results.service.push(
  checkFileContains(serviceFile, "import { supabase }", 'Imports supabase'),
  checkFileContains(serviceFile, '@pravado/shared-types', 'Imports from shared-types'),
  checkFileContains(serviceFile, 'AgentTraceTree', 'Imports AgentTraceTree'),
  checkFileContains(serviceFile, 'TraceNode', 'Imports TraceNode'),
  checkFileContains(serviceFile, 'LogTraceRequest', 'Imports LogTraceRequest')
);

// Check key functionality
results.service.push(
  checkFileContains(serviceFile, 'agent_trace_logs', 'Uses agent_trace_logs table'),
  checkFileContains(serviceFile, 'agent_trace_nodes', 'Uses agent_trace_nodes table'),
  checkFileContains(serviceFile, 'buildTraceTree', 'Has buildTraceTree helper'),
  checkFileContains(serviceFile, 'getTraceNodes', 'Has getTraceNodes helper'),
  checkFileContains(serviceFile, 'searchableText', 'Builds searchable text'),
  checkFileContains(serviceFile, 'Recursively insert', 'Recursively inserts nodes')
);

// =====================================================
// 4. API ROUTES VERIFICATION
// =====================================================

console.log('\n4. Verifying API Routes...\n');

const routesFile = path.join(API_ROOT, 'src/routes/agent-debug.ts');
results.routes.push(
  checkFileExists(routesFile, 'agent-debug.ts routes exist')
);

// Check imports and setup
results.routes.push(
  checkFileContains(routesFile, "import { Router", 'Imports Router'),
  checkFileContains(routesFile, 'AgentDebugService', 'Imports AgentDebugService'),
  checkFileContains(routesFile, 'const router = Router()', 'Router initialized'),
  checkFileContains(routesFile, 'export default router', 'Router exported')
);

// Check endpoints
const endpoints = [
  { method: 'POST', path: '/log-trace', desc: 'POST /log-trace endpoint' },
  { method: 'GET', path: '/turn/:turnId', desc: 'GET /turn/:turnId endpoint' },
  { method: 'GET', path: '/agent/:agentId', desc: 'GET /agent/:agentId endpoint' },
  { method: 'GET', path: '/search', desc: 'GET /search endpoint' },
  { method: 'GET', path: '/summary/:traceId', desc: 'GET /summary/:traceId endpoint' },
  { method: 'GET', path: '/metrics/:traceId', desc: 'GET /metrics/:traceId endpoint' },
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
  checkFileContains(routesFile, 'res.status(400)', 'Returns 400 on validation errors'),
  checkFileContains(routesFile, 'res.status(404)', 'Returns 404 on not found')
);

// =====================================================
// 5. FRONTEND COMPONENTS VERIFICATION
// =====================================================

console.log('\n5. Verifying Frontend Components...\n');

const components = [
  {
    name: 'TraceNodeCard',
    file: path.join(DASHBOARD_ROOT, 'components/admin/debug/TraceNodeCard.tsx'),
    props: ['node', 'depth'],
    features: ['getSeverityColor', 'formatDuration', 'Collapse', 'expanded'],
  },
  {
    name: 'AgentTraceSearchInput',
    file: path.join(DASHBOARD_ROOT, 'components/admin/debug/AgentTraceSearchInput.tsx'),
    props: ['onSearch', 'loading'],
    features: ['TraceSearchFilters', 'showAdvanced', 'tags', 'severity'],
  },
  {
    name: 'TraceDetailTab',
    file: path.join(DASHBOARD_ROOT, 'pages/admin-console/debug/TraceDetailTab.tsx'),
    props: ['traceId', 'onBack'],
    features: ['AgentTraceTree', 'TracePerformanceMetrics', 'TraceNodeCard', 'metrics'],
  },
  {
    name: 'DebugTraceExplorerTab',
    file: path.join(DASHBOARD_ROOT, 'pages/admin-console/debug/DebugTraceExplorerTab.tsx'),
    props: ['onViewTrace'],
    features: ['AgentTraceSearchInput', 'Table', 'page', 'fetchTraces'],
  },
  {
    name: 'AgentDebugTabs',
    file: path.join(DASHBOARD_ROOT, 'pages/admin-console/debug/AgentDebugTabs.tsx'),
    props: [],
    features: ['DebugTraceExplorerTab', 'TraceDetailTab', 'Tabs', 'TabPanel'],
  },
];

components.forEach(({ name, file, props, features }) => {
  results.components.push(
    checkFileExists(file, `${name} exists`)
  );

  results.components.push(
    checkFileContains(file, `export const ${name}`, `${name} exported`),
    checkFileContains(file, 'React.FC', `${name} is React.FC`)
  );

  props.forEach(prop => {
    results.components.push(
      checkFileContains(file, prop, `${name} has ${prop} prop`)
    );
  });

  features.forEach(feature => {
    results.components.push(
      checkFileContains(file, feature, `${name} implements ${feature}`)
    );
  });
});

// Additional component checks
results.components.push(
  checkFileContains(components[0].file, 'TraceSeverity', 'TraceNodeCard uses TraceSeverity'),
  checkFileContains(components[0].file, 'TraceNodeType', 'TraceNodeCard uses TraceNodeType'),
  checkFileContains(components[1].file, 'FormControl', 'AgentTraceSearchInput has form controls'),
  checkFileContains(components[2].file, 'axios.get', 'TraceDetailTab fetches data'),
  checkFileContains(components[3].file, 'TablePagination', 'DebugTraceExplorerTab has pagination'),
  checkFileContains(components[4].file, 'useState', 'AgentDebugTabs uses state')
);

// =====================================================
// 6. INTEGRATION VERIFICATION
// =====================================================

console.log('\n6. Verifying Integration...\n');

// Check AdminConsole integration
const adminConsoleFile = path.join(DASHBOARD_ROOT, 'pages/AdminConsole.tsx');
results.integration.push(
  checkFileExists(adminConsoleFile, 'AdminConsole exists'),
  checkFileContains(adminConsoleFile, 'BugReport', 'AdminConsole imports BugReport icon'),
  checkFileContains(adminConsoleFile, 'AgentDebugTabs', 'AdminConsole imports AgentDebugTabs'),
  checkFileContains(adminConsoleFile, '<BugReport />', 'AdminConsole uses BugReport icon'),
  checkFileContains(adminConsoleFile, 'Debug Tools', 'AdminConsole has Debug Tools label'),
  checkFileContains(adminConsoleFile, 'a11yProps(6)', 'AdminConsole has 7th tab'),
  checkFileContains(adminConsoleFile, '<AgentDebugTabs />', 'AdminConsole renders AgentDebugTabs')
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
  { name: 'Frontend Components', results: results.components },
  { name: 'Integration', results: results.integration },
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
  console.log('✅ All checks passed! Sprint 59 Phase 5.6 implementation complete.\n');
  process.exit(0);
}
