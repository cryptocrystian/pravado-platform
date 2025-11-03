#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT - SPRINT 58 PHASE 5.5
// Admin Controls for Moderation, Abuse Management & Threshold Tuning (Frontend)
// =====================================================

const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.join(__dirname, '../apps/dashboard/src');
const SHARED_TYPES_ROOT = path.join(__dirname, '../packages/shared-types/src');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

const results = {
  hooks: [],
  components: [],
  pages: [],
  integration: [],
  types: [],
};

function checkFileExists(filePath, description) {
  totalChecks++;
  const fullPath = path.join(DASHBOARD_ROOT, filePath);

  if (fs.existsSync(fullPath)) {
    passedChecks++;
    return { status: 'PASS', description, path: filePath };
  } else {
    failedChecks++;
    return { status: 'FAIL', description: `Missing: ${description}`, path: filePath };
  }
}

function checkFileContains(filePath, searchString, description) {
  totalChecks++;
  const fullPath = path.join(DASHBOARD_ROOT, filePath);

  if (!fs.existsSync(fullPath)) {
    failedChecks++;
    return { status: 'FAIL', description: `File not found: ${description}`, path: filePath };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchString)) {
    passedChecks++;
    return { status: 'PASS', description, path: filePath };
  } else {
    failedChecks++;
    return { status: 'FAIL', description: `Missing content: ${description}`, path: filePath };
  }
}

function checkMultipleStrings(filePath, strings, description) {
  const results = [];
  for (const str of strings) {
    results.push(checkFileContains(filePath, str, `${description} - "${str}"`));
  }
  return results;
}

console.log('\n==============================================');
console.log('SPRINT 58 PHASE 5.5 - VERIFICATION');
console.log('Admin Controls for Moderation (Frontend)');
console.log('==============================================\n');

// =====================================================
// 1. REACT HOOKS VERIFICATION (useAdminAPI.ts)
// =====================================================

console.log('1. Verifying React Hooks (useAdminAPI.ts)...\n');

results.hooks.push(
  checkFileExists('hooks/useAdminAPI.ts', 'useAdminAPI.ts exists')
);

const hookChecks = [
  { name: 'useAuditLogs', imports: ['AuditLogEntry', 'AuditLogFilters'] },
  { name: 'useExportAuditLogs', imports: ['ExportFormat'] },
  { name: 'useAbuseReports', imports: ['AbuseReport', 'AbuseReportFilters'] },
  { name: 'useFlagClient', imports: ['FlagClientRequest'] },
  { name: 'useBanToken', imports: ['BanTokenRequest', 'BanTokenResponse'] },
  { name: 'useCheckFlagged', imports: ['ModerationFlag'] },
  { name: 'useModerationStats', imports: ['ModerationStats'] },
];

hookChecks.forEach(({ name, imports }) => {
  results.hooks.push(
    checkFileContains('hooks/useAdminAPI.ts', `export function ${name}`, `Hook ${name} exported`)
  );

  imports.forEach(imp => {
    results.hooks.push(
      checkFileContains('hooks/useAdminAPI.ts', imp, `${name} imports ${imp}`)
    );
  });
});

// Check hook implementation patterns
results.hooks.push(
  checkFileContains('hooks/useAdminAPI.ts', 'useState', 'useAuditLogs uses useState'),
  checkFileContains('hooks/useAdminAPI.ts', 'useCallback', 'Hooks use useCallback'),
  checkFileContains('hooks/useAdminAPI.ts', 'useEffect', 'Hooks use useEffect'),
  checkFileContains('hooks/useAdminAPI.ts', '/moderation/audit-logs', 'Audit logs endpoint'),
  checkFileContains('hooks/useAdminAPI.ts', '/moderation/abuse-reports', 'Abuse reports endpoint'),
  checkFileContains('hooks/useAdminAPI.ts', '/moderation/flag-client', 'Flag client endpoint'),
  checkFileContains('hooks/useAdminAPI.ts', '/moderation/ban-token', 'Ban token endpoint'),
);

// =====================================================
// 2. SHARED COMPONENTS VERIFICATION
// =====================================================

console.log('\n2. Verifying Shared Moderation Components...\n');

const components = [
  {
    name: 'ModerationPanelHeader',
    file: 'components/admin/moderation/ModerationPanelHeader.tsx',
    props: ['title', 'subtitle', 'children'],
    imports: ['Typography', 'Box'],
  },
  {
    name: 'AbuseScoreBadge',
    file: 'components/admin/moderation/AbuseScoreBadge.tsx',
    props: ['score', 'severity', 'size'],
    imports: ['Chip', 'AbuseScore'],
  },
  {
    name: 'AuditLogTable',
    file: 'components/admin/moderation/AuditLogTable.tsx',
    props: ['logs', 'total', 'loading', 'page', 'pageSize'],
    imports: ['Table', 'TableBody', 'TableCell', 'AuditLogEntry', 'Collapse'],
  },
  {
    name: 'AbuseReportTable',
    file: 'components/admin/moderation/AbuseReportTable.tsx',
    props: ['reports', 'total', 'loading', 'page', 'pageSize'],
    imports: ['Table', 'AbuseReport', 'Dialog'],
  },
  {
    name: 'ModerationFlagTable',
    file: 'components/admin/moderation/ModerationFlagTable.tsx',
    props: ['flags', 'loading'],
    imports: ['Table', 'ModerationFlag', 'Chip'],
  },
  {
    name: 'ManualFlagForm',
    file: 'components/admin/moderation/ManualFlagForm.tsx',
    props: ['onSubmit', 'loading'],
    imports: ['TextField', 'Select', 'FlagClientRequest', 'ModerationFlagType'],
  },
  {
    name: 'ThresholdEditor',
    file: 'components/admin/moderation/ThresholdEditor.tsx',
    props: ['config', 'onSave', 'onReset', 'loading'],
    imports: ['TextField', 'Grid', 'AbuseDetectionConfig'],
  },
];

components.forEach(({ name, file, props, imports }) => {
  results.components.push(
    checkFileExists(file, `${name} component exists`)
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

  imports.forEach(imp => {
    results.components.push(
      checkFileContains(file, imp, `${name} imports ${imp}`)
    );
  });
});

// Additional component-specific checks
results.components.push(
  checkFileContains('components/admin/moderation/AbuseScoreBadge.tsx', 'AbuseScore.ABUSIVE', 'AbuseScoreBadge handles ABUSIVE'),
  checkFileContains('components/admin/moderation/AbuseScoreBadge.tsx', 'AbuseScore.SUSPICIOUS', 'AbuseScoreBadge handles SUSPICIOUS'),
  checkFileContains('components/admin/moderation/AbuseScoreBadge.tsx', 'AbuseScore.NORMAL', 'AbuseScoreBadge handles NORMAL'),
  checkFileContains('components/admin/moderation/AuditLogTable.tsx', 'KeyboardArrowUp', 'AuditLogTable has expandable rows'),
  checkFileContains('components/admin/moderation/AbuseReportTable.tsx', 'DialogTitle', 'AbuseReportTable has detail modal'),
  checkFileContains('components/admin/moderation/ManualFlagForm.tsx', 'if (!clientId && !tokenId && !ipAddress)', 'ManualFlagForm has validation'),
  checkFileContains('components/admin/moderation/ThresholdEditor.tsx', 'DEFAULT_CONFIG', 'ThresholdEditor has default config'),
  checkFileContains('components/admin/moderation/ThresholdEditor.tsx', 'rateLimitExceededThreshold', 'ThresholdEditor has rate limit field'),
  checkFileContains('components/admin/moderation/ThresholdEditor.tsx', 'abusiveScoreThreshold', 'ThresholdEditor has score fields'),
);

// =====================================================
// 3. TAB PAGES VERIFICATION
// =====================================================

console.log('\n3. Verifying Moderation Tab Pages...\n');

const pages = [
  {
    name: 'AuditTrailTab',
    file: 'pages/admin-console/moderation/AuditTrailTab.tsx',
    hooks: ['useAuditLogs', 'useExportAuditLogs'],
    components: ['ModerationPanelHeader', 'AuditLogTable'],
    features: ['Export', 'actionType', 'actorId', 'searchQuery'],
  },
  {
    name: 'AbuseReportsTab',
    file: 'pages/admin-console/moderation/AbuseReportsTab.tsx',
    hooks: ['useAbuseReports'],
    components: ['ModerationPanelHeader', 'AbuseReportTable'],
    features: ['abuseScore', 'clientId', 'ipAddress'],
  },
  {
    name: 'ModerationActionsTab',
    file: 'pages/admin-console/moderation/ModerationActionsTab.tsx',
    hooks: ['useCheckFlagged'],
    components: ['ModerationPanelHeader', 'ModerationFlagTable'],
    features: ['activeFlags', 'loading'],
  },
  {
    name: 'ManualFlaggingTab',
    file: 'pages/admin-console/moderation/ManualFlaggingTab.tsx',
    hooks: ['useFlagClient'],
    components: ['ModerationPanelHeader', 'ManualFlagForm'],
    features: ['flagClient', 'flagging'],
  },
  {
    name: 'ThresholdSettingsTab',
    file: 'pages/admin-console/moderation/ThresholdSettingsTab.tsx',
    hooks: [],
    components: ['ModerationPanelHeader', 'ThresholdEditor'],
    features: ['config', 'handleSave', 'handleReset', 'AbuseDetectionConfig'],
  },
];

pages.forEach(({ name, file, hooks, components, features }) => {
  results.pages.push(
    checkFileExists(file, `${name} page exists`)
  );

  results.pages.push(
    checkFileContains(file, `export const ${name}`, `${name} exported`),
    checkFileContains(file, 'React.FC', `${name} is React.FC`)
  );

  hooks.forEach(hook => {
    results.pages.push(
      checkFileContains(file, hook, `${name} uses ${hook}`)
    );
  });

  components.forEach(comp => {
    results.pages.push(
      checkFileContains(file, comp, `${name} uses ${comp}`)
    );
  });

  features.forEach(feat => {
    results.pages.push(
      checkFileContains(file, feat, `${name} implements ${feat}`)
    );
  });
});

// Additional page-specific checks
results.pages.push(
  checkFileContains('pages/admin-console/moderation/AuditTrailTab.tsx', 'CSV', 'AuditTrailTab exports CSV'),
  checkFileContains('pages/admin-console/moderation/AuditTrailTab.tsx', 'JSON', 'AuditTrailTab exports JSON'),
  checkFileContains('pages/admin-console/moderation/AbuseReportsTab.tsx', 'FormControl', 'AbuseReportsTab has filters'),
  checkFileContains('pages/admin-console/moderation/ThresholdSettingsTab.tsx', 'Warning:', 'ThresholdSettingsTab has warning'),
);

// =====================================================
// 4. INTEGRATION VERIFICATION
// =====================================================

console.log('\n4. Verifying Integration...\n');

// Check ModerationTab exists
results.integration.push(
  checkFileExists('pages/admin-console/ModerationTab.tsx', 'ModerationTab exists')
);

// Check ModerationTab structure
results.integration.push(
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'AuditTrailTab', 'ModerationTab imports AuditTrailTab'),
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'AbuseReportsTab', 'ModerationTab imports AbuseReportsTab'),
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'ModerationActionsTab', 'ModerationTab imports ModerationActionsTab'),
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'ManualFlaggingTab', 'ModerationTab imports ManualFlaggingTab'),
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'ThresholdSettingsTab', 'ModerationTab imports ThresholdSettingsTab'),
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'Tabs', 'ModerationTab has nested tabs'),
  checkFileContains('pages/admin-console/ModerationTab.tsx', 'TabPanel', 'ModerationTab has TabPanel'),
);

// Check AdminConsole integration
results.integration.push(
  checkFileExists('pages/AdminConsole.tsx', 'AdminConsole exists'),
  checkFileContains('pages/AdminConsole.tsx', 'Security', 'AdminConsole imports Security icon'),
  checkFileContains('pages/AdminConsole.tsx', 'ModerationTab', 'AdminConsole imports ModerationTab'),
  checkFileContains('pages/AdminConsole.tsx', '<Security />', 'AdminConsole uses Security icon'),
  checkFileContains('pages/AdminConsole.tsx', 'Moderation', 'AdminConsole has Moderation label'),
  checkFileContains('pages/AdminConsole.tsx', 'a11yProps(5)', 'AdminConsole has 6th tab'),
  checkFileContains('pages/AdminConsole.tsx', '<ModerationTab />', 'AdminConsole renders ModerationTab'),
);

// =====================================================
// 5. TYPE SAFETY VERIFICATION
// =====================================================

console.log('\n5. Verifying Type Safety...\n');

// Check shared-types imports in components
const typeChecks = [
  { file: 'hooks/useAdminAPI.ts', types: ['AuditLogEntry', 'AbuseReport', 'ModerationFlag', 'ModerationStats'] },
  { file: 'components/admin/moderation/AbuseScoreBadge.tsx', types: ['AbuseScore'] },
  { file: 'components/admin/moderation/AuditLogTable.tsx', types: ['AuditLogEntry'] },
  { file: 'components/admin/moderation/AbuseReportTable.tsx', types: ['AbuseReport'] },
  { file: 'components/admin/moderation/ModerationFlagTable.tsx', types: ['ModerationFlag'] },
  { file: 'components/admin/moderation/ManualFlagForm.tsx', types: ['FlagClientRequest', 'ModerationFlagType', 'ModerationSeverity'] },
  { file: 'components/admin/moderation/ThresholdEditor.tsx', types: ['AbuseDetectionConfig'] },
  { file: 'pages/admin-console/moderation/AuditTrailTab.tsx', types: ['AuditActionType', 'ExportFormat'] },
  { file: 'pages/admin-console/moderation/AbuseReportsTab.tsx', types: ['AbuseScore'] },
  { file: 'pages/admin-console/moderation/ThresholdSettingsTab.tsx', types: ['AbuseDetectionConfig'] },
];

typeChecks.forEach(({ file, types }) => {
  types.forEach(type => {
    results.types.push(
      checkFileContains(file, type, `${path.basename(file)} uses ${type}`)
    );
  });
});

// Check @pravado/shared-types imports
results.types.push(
  checkFileContains('hooks/useAdminAPI.ts', '@pravado/shared-types', 'useAdminAPI imports from shared-types'),
  checkFileContains('components/admin/moderation/ManualFlagForm.tsx', '@pravado/shared-types', 'ManualFlagForm imports from shared-types'),
  checkFileContains('pages/admin-console/moderation/AuditTrailTab.tsx', '@pravado/shared-types', 'AuditTrailTab imports from shared-types'),
);

// =====================================================
// RESULTS SUMMARY
// =====================================================

console.log('\n==============================================');
console.log('VERIFICATION RESULTS');
console.log('==============================================\n');

const sections = [
  { name: 'React Hooks (useAdminAPI.ts)', results: results.hooks },
  { name: 'Shared Components', results: results.components },
  { name: 'Tab Pages', results: results.pages },
  { name: 'Integration', results: results.integration },
  { name: 'Type Safety', results: results.types },
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
  console.log('✅ All checks passed! Sprint 58 Phase 5.5 implementation complete.\n');
  process.exit(0);
}
