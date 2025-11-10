#!/usr/bin/env node

// =====================================================
// SPRINT 38 DAY 5-6 VERIFICATION SCRIPT
// Verifies API routes and React hooks implementation
// =====================================================

const fs = require('fs');
const path = require('path');

// =====================================================
// VERIFICATION CHECKS
// =====================================================

async function verifyControllerImplementation() {
  console.log('\n📄 Checking controller implementation...');

  const controllerPath = path.join(__dirname, 'src/controllers/prompt-template.controller.ts');

  if (!fs.existsSync(controllerPath)) {
    console.error('❌ Controller file not found:', controllerPath);
    return false;
  }

  const content = fs.readFileSync(controllerPath, 'utf-8');

  const checks = [
    { name: 'createPromptTemplate function', pattern: /export async function createPromptTemplate/ },
    { name: 'updatePromptTemplate function', pattern: /export async function updatePromptTemplate/ },
    { name: 'getPromptTemplateById function', pattern: /export async function getPromptTemplateById/ },
    { name: 'getPromptTemplateByUseCase function', pattern: /export async function getPromptTemplateByUseCase/ },
    { name: 'listPromptTemplates function', pattern: /export async function listPromptTemplates/ },
    { name: 'deletePromptTemplate function', pattern: /export async function deletePromptTemplate/ },
    { name: 'resolvePromptTemplate function', pattern: /export async function resolvePromptTemplate/ },
    { name: 'getPromptTemplateAnalytics function', pattern: /export async function getPromptTemplateAnalytics/ },
    { name: 'createPromptSlot function', pattern: /export async function createPromptSlot/ },
    { name: 'updatePromptSlot function', pattern: /export async function updatePromptSlot/ },
    { name: 'deletePromptSlot function', pattern: /export async function deletePromptSlot/ },
    { name: 'Organization ID validation', pattern: /if \(!organizationId\)/ },
    { name: 'Error handling with try-catch', pattern: /try \{[\s\S]*?\} catch \(error\)/ },
    { name: 'Supabase client usage', pattern: /await supabase/ },
    { name: 'Type imports from shared-types', pattern: /from '@pravado\/shared-types'/ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ Found: ${check.name}`);
    } else {
      console.error(`  ❌ Missing: ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyRoutesImplementation() {
  console.log('\n🛣️  Checking routes implementation...');

  const routesPath = path.join(__dirname, 'src/routes/prompt-template.routes.ts');

  if (!fs.existsSync(routesPath)) {
    console.error('❌ Routes file not found:', routesPath);
    return false;
  }

  const content = fs.readFileSync(routesPath, 'utf-8');

  const checks = [
    { name: 'POST / - Create template', pattern: /router\.post\('\/'\s*,\s*promptTemplateController\.createPromptTemplate/ },
    { name: 'PUT /:id - Update template', pattern: /router\.put\('\/:id'\s*,\s*promptTemplateController\.updatePromptTemplate/ },
    { name: 'GET /:id - Get template by ID', pattern: /router\.get\('\/:id'\s*,\s*promptTemplateController\.getPromptTemplateById/ },
    { name: 'GET /use-case/:useCase - Get by use case', pattern: /router\.get\('\/use-case\/:useCase'\s*,\s*promptTemplateController\.getPromptTemplateByUseCase/ },
    { name: 'GET / - List templates', pattern: /router\.get\('\/'\s*,\s*promptTemplateController\.listPromptTemplates/ },
    { name: 'DELETE /:id - Delete template', pattern: /router\.delete\('\/:id'\s*,\s*promptTemplateController\.deletePromptTemplate/ },
    { name: 'POST /:id/resolve - Resolve prompt', pattern: /router\.post\('\/:id\/resolve'\s*,\s*promptTemplateController\.resolvePromptTemplate/ },
    { name: 'GET /:id/analytics - Get analytics', pattern: /router\.get\('\/:id\/analytics'\s*,\s*promptTemplateController\.getPromptTemplateAnalytics/ },
    { name: 'POST /:id/slots - Create slot', pattern: /router\.post\('\/:id\/slots'\s*,\s*promptTemplateController\.createPromptSlot/ },
    { name: 'PUT /:templateId/slots/:slotId - Update slot', pattern: /router\.put\('\/:templateId\/slots\/:slotId'\s*,\s*promptTemplateController\.updatePromptSlot/ },
    { name: 'DELETE /:templateId/slots/:slotId - Delete slot', pattern: /router\.delete\('\/:templateId\/slots\/:slotId'\s*,\s*promptTemplateController\.deletePromptSlot/ },
    { name: 'Controller imports', pattern: /import \* as promptTemplateController/ },
    { name: 'Router export', pattern: /export default router/ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ Found: ${check.name}`);
    } else {
      console.error(`  ❌ Missing: ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyRoutesRegistration() {
  console.log('\n🔗 Checking routes registration...');

  const indexPath = path.join(__dirname, 'src/routes/index.ts');

  if (!fs.existsSync(indexPath)) {
    console.error('❌ Routes index file not found:', indexPath);
    return false;
  }

  const content = fs.readFileSync(indexPath, 'utf-8');

  const checks = [
    { name: 'Import prompt template routes', pattern: /import promptTemplateRoutes from '\.\/prompt-template\.routes'/ },
    { name: 'Register /prompt-templates route', pattern: /router\.use\('\/prompt-templates',\s*promptTemplateRoutes\)/ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ Found: ${check.name}`);
    } else {
      console.error(`  ❌ Missing: ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyReactHooks() {
  console.log('\n⚛️  Checking React hooks implementation...');

  const hooksPath = path.join(__dirname, '../dashboard/src/hooks/usePromptTemplates.ts');

  if (!fs.existsSync(hooksPath)) {
    console.error('❌ React hooks file not found:', hooksPath);
    return false;
  }

  const content = fs.readFileSync(hooksPath, 'utf-8');

  const checks = [
    { name: 'usePromptTemplates - List hook', pattern: /export function usePromptTemplates/ },
    { name: 'usePromptTemplateById - Get by ID hook', pattern: /export function usePromptTemplateById/ },
    { name: 'usePromptTemplateByUseCase - Get by use case hook', pattern: /export function usePromptTemplateByUseCase/ },
    { name: 'useCreatePromptTemplate - Create mutation', pattern: /export function useCreatePromptTemplate/ },
    { name: 'useUpdatePromptTemplate - Update mutation', pattern: /export function useUpdatePromptTemplate/ },
    { name: 'useDeletePromptTemplate - Delete mutation', pattern: /export function useDeletePromptTemplate/ },
    { name: 'useResolvePrompt - Resolve mutation', pattern: /export function useResolvePrompt/ },
    { name: 'usePromptAnalytics - Analytics hook', pattern: /export function usePromptAnalytics/ },
    { name: 'useCreatePromptSlot - Create slot mutation', pattern: /export function useCreatePromptSlot/ },
    { name: 'useUpdatePromptSlot - Update slot mutation', pattern: /export function useUpdatePromptSlot/ },
    { name: 'useDeletePromptSlot - Delete slot mutation', pattern: /export function useDeletePromptSlot/ },
    { name: 'usePromptUseCases - Helper hook', pattern: /export function usePromptUseCases/ },
    { name: 'useResolutionStrategyConfigs - Helper hook', pattern: /export function useResolutionStrategyConfigs/ },
    { name: 'useSlotTypeConfigs - Helper hook', pattern: /export function useSlotTypeConfigs/ },
    { name: 'React Query imports', pattern: /import.*useQuery.*useMutation.*from '@tanstack\/react-query'/ },
    { name: 'API client import', pattern: /import.*api.*from '@\/lib\/api'/ },
    { name: 'Type imports from shared-types', pattern: /from '@pravado\/shared-types'/ },
    { name: 'Query client usage', pattern: /const queryClient = useQueryClient\(\)/ },
    { name: 'Query invalidation', pattern: /queryClient\.invalidateQueries/ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ Found: ${check.name}`);
    } else {
      console.error(`  ❌ Missing: ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyHelperHooks() {
  console.log('\n🛠️  Checking helper hooks...');

  const hooksPath = path.join(__dirname, '../dashboard/src/hooks/usePromptTemplates.ts');
  const content = fs.readFileSync(hooksPath, 'utf-8');

  const checks = [
    { name: 'useUseCaseConfig - Get use case config', pattern: /export function useUseCaseConfig/ },
    { name: 'useResolutionStrategyConfig - Get strategy config', pattern: /export function useResolutionStrategyConfig/ },
    { name: 'useSlotTypeConfig - Get slot type config', pattern: /export function useSlotTypeConfig/ },
    { name: 'useActiveTemplatesCount - Count active templates', pattern: /export function useActiveTemplatesCount/ },
    { name: 'useTemplatesByCategory - Filter by category', pattern: /export function useTemplatesByCategory/ },
    { name: 'usePromptTemplateDetails - Get with details', pattern: /export function usePromptTemplateDetails/ },
    { name: 'useTemplateHasRequiredSlots - Check required slots', pattern: /export function useTemplateHasRequiredSlots/ },
    { name: 'useTemplateSlotNames - Get slot names', pattern: /export function useTemplateSlotNames/ },
    { name: 'useClonePromptTemplate - Clone template', pattern: /export function useClonePromptTemplate/ },
    { name: 'useExportPromptTemplate - Export as JSON', pattern: /export function useExportPromptTemplate/ },
    { name: 'useTemplateStatusLabel - Get status label', pattern: /export function useTemplateStatusLabel/ },
    { name: 'Uses SLOT_RESOLUTION_CONFIGS', pattern: /SLOT_RESOLUTION_CONFIGS/ },
    { name: 'Uses PROMPT_USE_CASE_CONFIGS', pattern: /PROMPT_USE_CASE_CONFIGS/ },
    { name: 'Uses SLOT_TYPE_CONFIGS', pattern: /SLOT_TYPE_CONFIGS/ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ Found: ${check.name}`);
    } else {
      console.error(`  ❌ Missing: ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyTypeUsage() {
  console.log('\n📦 Checking type usage from shared-types...');

  const controllerPath = path.join(__dirname, 'src/controllers/prompt-template.controller.ts');
  const hooksPath = path.join(__dirname, '../dashboard/src/hooks/usePromptTemplates.ts');

  const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
  const hooksContent = fs.readFileSync(hooksPath, 'utf-8');

  const types = [
    'PromptTemplate',
    'PromptTemplateWithDetails',
    'CreatePromptTemplateInput',
    'UpdatePromptTemplateInput',
    'ResolvePromptInput',
    'ResolvePromptOutput',
    'PromptPerformanceMetrics',
    'PromptSlot',
    'CreatePromptSlotInput',
    'UpdatePromptSlotInput',
    'PromptTemplatesResponse',
  ];

  let allFound = true;
  for (const type of types) {
    const inController = controllerContent.includes(type);
    const inHooks = hooksContent.includes(type);

    if (inController && inHooks) {
      console.log(`  ✅ Type '${type}' used in both controller and hooks`);
    } else if (inController) {
      console.log(`  ⚠️  Type '${type}' used in controller only`);
    } else if (inHooks) {
      console.log(`  ⚠️  Type '${type}' used in hooks only`);
    } else {
      console.error(`  ❌ Type '${type}' not found in either file`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyErrorHandling() {
  console.log('\n🛡️  Checking error handling...');

  const controllerPath = path.join(__dirname, 'src/controllers/prompt-template.controller.ts');
  const content = fs.readFileSync(controllerPath, 'utf-8');

  const checks = [
    { name: '400 Bad Request responses', pattern: /return res\.status\(400\)\.json/ },
    { name: '404 Not Found responses', pattern: /return res\.status\(404\)\.json/ },
    { name: '500 Internal Server Error responses', pattern: /return res\.status\(500\)\.json/ },
    { name: '201 Created responses', pattern: /return res\.status\(201\)\.json/ },
    { name: 'Try-catch blocks', pattern: /try \{[\s\S]*?\} catch/ },
    { name: 'Error logging', pattern: /console\.error/ },
    { name: 'Input validation', pattern: /if \(!input\./ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.error(`  ❌ ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

async function verifyMultiTenantSecurity() {
  console.log('\n🔒 Checking multi-tenant security (RLS)...');

  const controllerPath = path.join(__dirname, 'src/controllers/prompt-template.controller.ts');
  const content = fs.readFileSync(controllerPath, 'utf-8');

  const checks = [
    { name: 'Organization ID extraction from headers', pattern: /req\.headers\['x-organization-id'\]/ },
    { name: 'Organization ID validation', pattern: /if \(!organizationId\)/ },
    { name: 'Filters queries by organization_id', pattern: /\.eq\('organization_id', organizationId\)/ },
    { name: 'User ID extraction from headers', pattern: /req\.headers\['x-user-id'\]/ },
  ];

  let allFound = true;
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.error(`  ❌ ${check.name}`);
      allFound = false;
    }
  }

  return allFound;
}

// =====================================================
// MAIN VERIFICATION FLOW
// =====================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Sprint 38 Day 5-6 Verification                   ║');
  console.log('║  API Routes + React Hooks                         ║');
  console.log('╚════════════════════════════════════════════════════╝');

  const results = {
    controller: await verifyControllerImplementation(),
    routes: await verifyRoutesImplementation(),
    registration: await verifyRoutesRegistration(),
    reactHooks: await verifyReactHooks(),
    helperHooks: await verifyHelperHooks(),
    types: await verifyTypeUsage(),
    errorHandling: await verifyErrorHandling(),
    security: await verifyMultiTenantSecurity(),
  };

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const checks = [
    { name: 'Controller Implementation', result: results.controller },
    { name: 'Routes Implementation', result: results.routes },
    { name: 'Routes Registration', result: results.registration },
    { name: 'React Hooks', result: results.reactHooks },
    { name: 'Helper Hooks', result: results.helperHooks },
    { name: 'Type Usage', result: results.types },
    { name: 'Error Handling', result: results.errorHandling },
    { name: 'Multi-Tenant Security', result: results.security },
  ];

  for (const check of checks) {
    console.log(`${check.result ? '✅' : '❌'} ${check.name}`);
  }

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n🎉 All checks passed! Sprint 38 Day 5-6 implementation is complete.');
    console.log('\n📋 API Endpoints Available:');
    console.log('   POST   /api/v1/prompt-templates');
    console.log('   PUT    /api/v1/prompt-templates/:id');
    console.log('   GET    /api/v1/prompt-templates/:id');
    console.log('   GET    /api/v1/prompt-templates/use-case/:useCase');
    console.log('   GET    /api/v1/prompt-templates');
    console.log('   DELETE /api/v1/prompt-templates/:id');
    console.log('   POST   /api/v1/prompt-templates/:id/resolve');
    console.log('   GET    /api/v1/prompt-templates/:id/analytics');
    console.log('   POST   /api/v1/prompt-templates/:id/slots');
    console.log('   PUT    /api/v1/prompt-templates/:templateId/slots/:slotId');
    console.log('   DELETE /api/v1/prompt-templates/:templateId/slots/:slotId');
    console.log('\n📋 React Hooks Available:');
    console.log('   • usePromptTemplates() - List templates');
    console.log('   • usePromptTemplateById() - Get template');
    console.log('   • useCreatePromptTemplate() - Create');
    console.log('   • useUpdatePromptTemplate() - Update');
    console.log('   • useDeletePromptTemplate() - Delete');
    console.log('   • useResolvePrompt() - Resolve template');
    console.log('   • usePromptAnalytics() - Get metrics');
    console.log('   • + 11 more specialized hooks');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start API server: pnpm run dev (in apps/api)');
    console.log('   2. Test API endpoints with Postman/curl');
    console.log('   3. Build UI components using React hooks');
    console.log('   4. Add template editor interface');
    console.log('   5. Create analytics dashboard');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please review and fix before proceeding.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
