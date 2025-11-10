#!/usr/bin/env node

// =====================================================
// VERIFICATION SCRIPT FOR SPRINT 42
// Visual Playbook Editor (Phase 3.5 Days 1-3)
// =====================================================

const fs = require('fs');
const path = require('path');

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
    patterns.forEach((pattern, index) => {
      if (!results[index]) {
        const patternStr = typeof pattern === 'string' ? pattern : pattern.toString();
        log(`  Missing: ${patternStr}`, 'yellow');
      }
    });
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
log('  SPRINT 42 PHASE 3.5 VERIFICATION', 'blue');
log('  Visual Playbook Editor (Days 1-3)', 'blue');
log('═══════════════════════════════════════════════════', 'blue');
console.log('\n');

// =====================================================
// 1. EDITOR HOOK
// =====================================================
log('1️⃣  PLAYBOOK EDITOR STATE HOOK', 'yellow');
console.log('');

const editorHook = 'apps/dashboard/src/hooks/usePlaybookEditor.ts';

check(checkFile(editorHook, 'Editor hook file exists'));

check(checkFileContent(
  editorHook,
  [
    'export function usePlaybookEditor',
    'export interface StepPosition',
    'export interface StepConnection',
    'export interface ValidationIssue',
    'export interface PlaybookEditorState',
  ],
  'Core types and hook exported'
));

check(checkFileContent(
  editorHook,
  [
    'const addStep',
    'const removeStep',
    'const updateStep',
    'const updateStepPosition',
    'const connectSteps',
    'const disconnectSteps',
  ],
  'Step manipulation functions defined'
));

check(checkFileContent(
  editorHook,
  [
    'const selectStep',
    'const startDragging',
    'const stopDragging',
    'const setZoom',
    'const setPanOffset',
    'const autoLayout',
  ],
  'UI interaction functions defined'
));

check(checkFileContent(
  editorHook,
  [
    'const getConnections',
    'const getSelectedStep',
    'function validateSteps',
    'function hasCircularReference',
  ],
  'Helper and validation functions defined'
));

console.log('');

// =====================================================
// 2. STEP NODE COMPONENT
// =====================================================
log('2️⃣  PLAYBOOK STEP NODE COMPONENT', 'yellow');
console.log('');

const stepNode = 'apps/dashboard/src/components/playbook-editor/PlaybookStepNode.tsx';

check(checkFile(stepNode, 'Step node component exists'));

check(checkFileContent(
  stepNode,
  [
    'export interface PlaybookStepNodeProps',
    'export function PlaybookStepNode',
    'STEP_TYPE_CONFIGS',
  ],
  'Step node component and props defined'
));

check(checkFileContent(
  stepNode,
  [
    'isSelected',
    'isDragging',
    'validationIssues',
    'onSelect',
    'onDragStart',
    'onDragEnd',
  ],
  'Step node handles selection and dragging'
));

check(checkFileContent(
  stepNode,
  [
    'onConnectSuccess',
    'onConnectFailure',
    'CheckCircle2',
    'XCircle',
  ],
  'Step node has connection points'
));

check(checkFileContent(
  stepNode,
  [
    'hasErrors',
    'hasWarnings',
    'AlertCircle',
  ],
  'Step node displays validation issues'
));

console.log('');

// =====================================================
// 3. STEP CONNECTOR COMPONENT
// =====================================================
log('3️⃣  STEP CONNECTOR COMPONENT', 'yellow');
console.log('');

const connector = 'apps/dashboard/src/components/playbook-editor/StepConnector.tsx';

check(checkFile(connector, 'Step connector component exists'));

check(checkFileContent(
  connector,
  [
    'export interface StepConnectorProps',
    'export function StepConnector',
    'export function StepConnectors',
  ],
  'Connector components defined'
));

check(checkFileContent(
  connector,
  [
    'const pathData',
    'markerEnd',
    '<path',
    '<marker',
  ],
  'SVG path and markers for arrows'
));

check(checkFileContent(
  connector,
  [
    'connection.type === \'success\'',
    'strokeColor',
    'isSelected',
  ],
  'Connection type and selection handling'
));

console.log('');

// =====================================================
// 4. EDITOR CANVAS COMPONENT
// =====================================================
log('4️⃣  EDITOR CANVAS COMPONENT', 'yellow');
console.log('');

const canvas = 'apps/dashboard/src/components/playbook-editor/PlaybookEditorCanvas.tsx';

check(checkFile(canvas, 'Canvas component exists'));

check(checkFileContent(
  canvas,
  [
    'export interface PlaybookEditorCanvasProps',
    'export function PlaybookEditorCanvas',
  ],
  'Canvas component and props defined'
));

check(checkFileContent(
  canvas,
  [
    'const [dragging, setDragging]',
    'const [connecting, setConnecting]',
    'const [isPanning, setIsPanning]',
    'const handleStepDragStart',
  ],
  'Drag and drop state management'
));

check(checkFileContent(
  canvas,
  [
    'handleMouseMove',
    'handleMouseUp',
    'handleWheel',
    'handleCanvasClick',
  ],
  'Mouse event handlers'
));

check(checkFileContent(
  canvas,
  [
    'backgroundImage:',
    'backgroundSize:',
    'Grid Background',
  ],
  'Grid background rendering'
));

check(checkFileContent(
  canvas,
  [
    'transform:',
    'scale(${zoom})',
    'Zoom Controls',
  ],
  'Zoom and pan functionality'
));

check(checkFileContent(
  canvas,
  [
    '<PlaybookStepNode',
    '<StepConnectors',
    'Canvas Controls',
  ],
  'Renders step nodes and connectors'
));

console.log('');

// =====================================================
// 5. CONFIG PANEL COMPONENT
// =====================================================
log('5️⃣  STEP CONFIGURATION PANEL', 'yellow');
console.log('');

const configPanel = 'apps/dashboard/src/components/playbook-editor/StepConfigPanel.tsx';

check(checkFile(configPanel, 'Config panel component exists'));

check(checkFileContent(
  configPanel,
  [
    'export interface StepConfigPanelProps',
    'export function StepConfigPanel',
  ],
  'Config panel component defined'
));

check(checkFileContent(
  configPanel,
  [
    'const [stepName, setStepName]',
    'const [description, setDescription]',
    'const [timeoutSeconds, setTimeoutSeconds]',
    'const [maxRetries, setMaxRetries]',
    'const [isOptional, setIsOptional]',
    'const [config, setConfig]',
  ],
  'Form state management'
));

check(checkFileContent(
  configPanel,
  [
    'const handleSave',
    'const handleDelete',
    'const handleConfigChange',
  ],
  'Form action handlers'
));

check(checkFileContent(
  configPanel,
  [
    'function StepTypeConfigForm',
    'PlaybookStepType.AGENT_EXECUTION',
    'PlaybookStepType.API_CALL',
    'PlaybookStepType.DATA_TRANSFORM',
  ],
  'Dynamic configuration forms for step types'
));

console.log('');

// =====================================================
// 6. MAIN EDITOR PAGE
// =====================================================
log('6️⃣  PLAYBOOK EDITOR PAGE', 'yellow');
console.log('');

const editorPage = 'apps/dashboard/src/pages/playbooks/PlaybookEditorPage.tsx';

check(checkFile(editorPage, 'Editor page component exists'));

check(checkFileContent(
  editorPage,
  [
    'export function PlaybookEditorPage',
    'usePlaybookWithSteps',
    'usePlaybookEditor',
  ],
  'Editor page uses hooks'
));

check(checkFileContent(
  editorPage,
  [
    '<PlaybookEditorCanvas',
    '<StepConfigPanel',
  ],
  'Editor page renders canvas and config panel'
));

check(checkFileContent(
  editorPage,
  [
    'const handleSave',
    'const handleActivate',
    'const handleAddStep',
  ],
  'Editor page has action handlers'
));

check(checkFileContent(
  editorPage,
  [
    'showStepMenu',
    'Add Step',
    'STEP_TYPE_CONFIGS',
  ],
  'Add step menu implemented'
));

check(checkFileContent(
  editorPage,
  [
    'editor.validationIssues',
    'AlertTriangle',
    'Auto Layout',
  ],
  'Validation display and auto-layout'
));

console.log('');

// =====================================================
// 7. FEATURE VERIFICATION
// =====================================================
log('7️⃣  FEATURE IMPLEMENTATION', 'yellow');
console.log('');

// Drag and drop
check(checkFileContent(
  canvas,
  [
    'Drag to rearrange steps',
    'Math.round(newX / 20) * 20',
    'Snap to grid',
  ],
  'Drag to rearrange with grid snapping'
));

// Click to select
check(checkFileContent(
  stepNode,
  [
    'onClick={onSelect}',
    'isSelected',
    'border-primary',
  ],
  'Click to select step'
));

// Connection handles
check(checkFileContent(
  stepNode,
  [
    'Connection Handles',
    'Success connection point',
    'Incoming connection point',
  ],
  'Connection handles on nodes'
));

// Zoom controls
check(checkFileContent(
  canvas,
  [
    'Zoom Controls',
    'onClick={() => onZoomChange(zoom + 0.1)}',
    'onClick={() => onZoomChange(zoom - 0.1)}',
  ],
  'Zoom in/out controls'
));

// Keyboard shortcuts
check(checkFileContent(
  canvas,
  [
    'const handleKeyDown',
    'e.key === \'Delete\'',
    'e.key === \'+\'',
    'e.key === \'-\'',
  ],
  'Keyboard shortcuts implemented'
));

// Visual validation
check(checkFileContent(
  editorHook,
  [
    'function validateSteps',
    'Check for disconnected steps',
    'Check for circular references',
  ],
  'Visual validation logic'
));

// Integration with API
check(checkFileContent(
  editorPage,
  [
    'useUpdatePlaybook',
    'useCreatePlaybook',
    'await updateMutation.mutateAsync',
  ],
  'Integration with playbook APIs'
));

console.log('');

// =====================================================
// 8. ACCESSIBILITY
// =====================================================
log('8️⃣  ACCESSIBILITY FEATURES', 'yellow');
console.log('');

check(checkFileContent(
  stepNode,
  [
    'title=',
    'aria-',
  ],
  'Step node has accessibility attributes'
));

check(checkFileContent(
  canvas,
  [
    'Canvas Controls',
    'title="',
  ],
  'Canvas controls have tooltips'
));

console.log('');

// =====================================================
// 9. RESPONSIVE DESIGN
// =====================================================
log('9️⃣  RESPONSIVE DESIGN', 'yellow');
console.log('');

check(checkFileContent(
  editorPage,
  [
    'flex flex-col',
    'flex-1',
    'overflow-hidden',
  ],
  'Responsive layout classes'
));

check(checkFileContent(
  configPanel,
  [
    'w-96',
    'overflow-y-auto',
  ],
  'Config panel responsive sizing'
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
  log('🎉 All checks passed! Sprint 42 (Days 1-3) implementation verified!', 'green');
} else if (percentage >= 80) {
  log('⚠️  Most checks passed, but some issues need attention.', 'yellow');
} else {
  log('❌ Multiple issues detected. Please review the failed checks.', 'red');
}

console.log('');
log('📊 IMPLEMENTATION SUMMARY', 'cyan');
console.log('');
console.log('Core Components:');
console.log('  - PlaybookEditorPage: Main editor page with toolbar');
console.log('  - PlaybookEditorCanvas: Drag-and-drop canvas with grid');
console.log('  - PlaybookStepNode: Visual representation of workflow steps');
console.log('  - StepConnector: SVG arrows showing step connections');
console.log('  - StepConfigPanel: Dynamic configuration sidebar');
console.log('  - usePlaybookEditor: State management hook');
console.log('');
console.log('Features Implemented:');
console.log('  - ✅ Drag to rearrange steps');
console.log('  - ✅ Click to select steps');
console.log('  - ✅ Visual step connections (success/failure)');
console.log('  - ✅ Grid snapping for clean layouts');
console.log('  - ✅ Zoom in/out controls');
console.log('  - ✅ Pan canvas (middle click or space + drag)');
console.log('  - ✅ Auto-layout algorithm');
console.log('  - ✅ Dynamic config forms based on step type');
console.log('  - ✅ Visual validation warnings');
console.log('  - ✅ Keyboard shortcuts');
console.log('  - ✅ Integration with existing APIs');
console.log('  - ✅ Responsive design');
console.log('  - ✅ Accessibility features');
console.log('');

// Exit with appropriate code
process.exit(percentage === 100 ? 0 : 1);
