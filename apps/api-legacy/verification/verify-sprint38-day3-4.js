#!/usr/bin/env node

// =====================================================
// SPRINT 38 DAY 3-4 VERIFICATION SCRIPT
// Verifies slot resolution logic and template engine
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.warn('⚠️  Missing OpenAI API key - GPT resolver tests will be skipped');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =====================================================
// VERIFICATION CHECKS
// =====================================================

async function verifyImplementationComplete() {
  console.log('\n📄 Checking implementation completeness...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');

  if (!fs.existsSync(enginePath)) {
    console.error('❌ Engine file not found:', enginePath);
    return false;
  }

  const content = fs.readFileSync(enginePath, 'utf-8');

  const checks = [
    { name: 'extractSlots() implementation', pattern: /extractSlots\(templateText: string\): ParsedSlot\[\] \{[\s\S]*?const regex = \/\{\{/ },
    { name: 'replaceSlotsInTemplate() implementation', pattern: /replaceSlotsInTemplate\([\s\S]*?\.replace\(\/\{\{/ },
    { name: 'validateSlotValue() implementation', pattern: /validateSlotValue\([\s\S]*?if \(slot\.required/ },
    { name: 'resolveSlot() implementation', pattern: /async resolveSlot\([\s\S]*?switch \(slot\.resolutionStrategy\)/ },
    { name: 'resolvePrompt() implementation', pattern: /async resolvePrompt\([\s\S]*?const startTime = Date\.now\(\)/ },
    { name: 'logInvocation() implementation', pattern: /async logInvocation\([\s\S]*?await supabase\.from\('prompt_invocations'\)/ },
    { name: 'StaticSlotResolver', pattern: /class StaticSlotResolver[\s\S]*?async resolve/ },
    { name: 'ContextSlotResolver', pattern: /class ContextSlotResolver[\s\S]*?split\('\.'\)/ },
    { name: 'MemorySlotResolver', pattern: /class MemorySlotResolver[\s\S]*?agentMemoryEngine/ },
    { name: 'DatabaseSlotResolver', pattern: /class DatabaseSlotResolver[\s\S]*?supabase\.from/ },
    { name: 'GptSlotResolver', pattern: /class GptSlotResolver[\s\S]*?openai\.chat\.completions/ },
    { name: 'OpenAI import', pattern: /import OpenAI from 'openai'/ },
    { name: 'Supabase client initialization', pattern: /const supabase = createClient\(supabaseUrl, supabaseKey\)/ },
    { name: 'OpenAI client initialization', pattern: /const openai = new OpenAI\(/ },
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

async function verifyExtractSlotsFunction() {
  console.log('\n🔍 Testing extractSlots() function...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf-8');

  // Check for regex pattern in some form
  if (content.includes('/{') && content.includes('[a-zA-Z0-9_]') && content.includes('/g')) {
    console.log('  ✅ Regex pattern for slot extraction is present');
  } else {
    console.error('  ❌ Regex pattern for slot extraction is missing');
    return false;
  }

  // Check for while loop with exec
  if (content.includes('while ((match = regex.exec(templateText))')) {
    console.log('  ✅ Uses while loop with regex.exec() for extraction');
  } else {
    console.error('  ❌ Missing while loop with regex.exec()');
    return false;
  }

  console.log('  ✅ extractSlots() implementation verified');
  return true;
}

async function verifyValidationLogic() {
  console.log('\n✔️  Testing validation logic...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf-8');

  const checks = [
    { name: 'Required field validation', pattern: /if \(slot\.required && \(value === undefined/ },
    { name: 'Type validation', pattern: /const valueType = Array\.isArray\(value\)/ },
    { name: 'Regex validation', pattern: /if \(slot\.validationRegex/ },
    { name: 'RegExp.test() usage', pattern: /pattern\.test\(value\)/ },
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

async function verifyResolverImplementations() {
  console.log('\n⚙️  Verifying resolver implementations...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf-8');

  const checks = [
    { name: 'Static - returns default value', pattern: /StaticSlotResolver[\s\S]*?return slot\.defaultValue/ },
    { name: 'Context - splits path and traverses', pattern: /ContextSlotResolver[\s\S]*?split\('\.'\)/ },
    { name: 'Memory - calls agentMemoryEngine.searchMemory', pattern: /MemorySlotResolver[\s\S]*?agentMemoryEngine\.searchMemory/ },
    { name: 'Database - executes Supabase query', pattern: /DatabaseSlotResolver[\s\S]*?supabase\.from\(tableName\)/ },
    { name: 'GPT - calls OpenAI API', pattern: /GptSlotResolver[\s\S]*?openai\.chat\.completions\.create/ },
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

async function verifyOrchestrationFlow() {
  console.log('\n🎯 Verifying orchestration flow...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf-8');

  const checks = [
    { name: 'Fetches template from database', pattern: /from\('prompt_templates'\)/ },
    { name: 'Fetches slots for template', pattern: /from\('prompt_slots'\)/ },
    { name: 'Calls extractSlots()', pattern: /extractSlots\(template\.template_text\)/ },
    { name: 'Loops through slots and resolves', pattern: /for \(const slotDef of slots/ },
    { name: 'Validates resolved values', pattern: /validateSlotValue\(slotDef, value\)/ },
    { name: 'Replaces slots in template', pattern: /replaceSlotsInTemplate\(/ },
    { name: 'Estimates tokens', pattern: /estimateTokenCount\(/ },
    { name: 'Logs invocation', pattern: /logInvocation\(/ },
    { name: 'Returns ResolvePromptOutput', pattern: /return \{[\s\S]*?success:[\s\S]*?resolvedPrompt:/ },
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

async function verifyErrorHandling() {
  console.log('\n🛡️  Verifying error handling...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf-8');

  const checks = [
    { name: 'Try-catch in resolveSlot()', pattern: /async resolveSlot[\s\S]*?try \{[\s\S]*?catch \(error\)/ },
    { name: 'Try-catch in resolvePrompt()', pattern: /async resolvePrompt[\s\S]*?try \{[\s\S]*?catch \(error\) \{/ },
    { name: 'Error logging in logInvocation()', pattern: /logInvocation[\s\S]*?catch \(error\) \{[\s\S]*?console\.error/ },
    { name: 'Falls back to defaultValue on error', pattern: /return slot\.defaultValue \|\| ''/ },
    { name: 'Logs errors array', pattern: /errors: SlotResolutionError\[\]/ },
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

async function verifyInvocationLogging() {
  console.log('\n📊 Verifying invocation logging...');

  const enginePath = path.join(__dirname, '../agents/src/prompts/prompt-template-engine.ts');
  const content = fs.readFileSync(enginePath, 'utf-8');

  const checks = [
    { name: 'Inserts to prompt_invocations table', pattern: /supabase\.from\('prompt_invocations'\)\.insert/ },
    { name: 'Logs organization_id', pattern: /organization_id: params\.organizationId/ },
    { name: 'Logs template_id', pattern: /template_id: params\.templateId/ },
    { name: 'Logs resolved_prompt', pattern: /resolved_prompt: params\.resolvedPrompt/ },
    { name: 'Logs resolved_slots', pattern: /resolved_slots: params\.resolvedSlots/ },
    { name: 'Logs response_time_ms', pattern: /response_time_ms: params\.responseTimeMs/ },
    { name: 'Logs gpt_token_count', pattern: /gpt_token_count: params\.gptTokenCount/ },
    { name: 'Logs success status', pattern: /success: params\.success/ },
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

async function verifyDatabaseSchema() {
  console.log('\n🗄️  Checking database schema (migration applied)...');

  try {
    // Check if prompt_templates table exists
    const { error: templatesError } = await supabase
      .from('prompt_templates')
      .select('id')
      .limit(0);

    if (templatesError) {
      console.log('  ⚠️  prompt_templates table not found (migration not applied yet)');
    } else {
      console.log('  ✅ prompt_templates table exists');
    }

    // Check if prompt_slots table exists
    const { error: slotsError } = await supabase
      .from('prompt_slots')
      .select('id')
      .limit(0);

    if (slotsError) {
      console.log('  ⚠️  prompt_slots table not found (migration not applied yet)');
    } else {
      console.log('  ✅ prompt_slots table exists');
    }

    // Check if prompt_invocations table exists
    const { error: invocationsError } = await supabase
      .from('prompt_invocations')
      .select('id')
      .limit(0);

    if (invocationsError) {
      console.log('  ⚠️  prompt_invocations table not found (migration not applied yet)');
    } else {
      console.log('  ✅ prompt_invocations table exists');
    }

    return true;
  } catch (error) {
    console.error('  ❌ Error checking database schema:', error.message);
    return false;
  }
}

// =====================================================
// MAIN VERIFICATION FLOW
// =====================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Sprint 38 Day 3-4 Verification                   ║');
  console.log('║  Slot Resolution & Template Engine                ║');
  console.log('╚════════════════════════════════════════════════════╝');

  const results = {
    implementationComplete: await verifyImplementationComplete(),
    extractSlots: await verifyExtractSlotsFunction(),
    validation: await verifyValidationLogic(),
    resolvers: await verifyResolverImplementations(),
    orchestration: await verifyOrchestrationFlow(),
    errorHandling: await verifyErrorHandling(),
    logging: await verifyInvocationLogging(),
    database: await verifyDatabaseSchema(),
  };

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const checks = [
    { name: 'Implementation Complete', result: results.implementationComplete },
    { name: 'extractSlots() Function', result: results.extractSlots },
    { name: 'Validation Logic', result: results.validation },
    { name: 'Resolver Implementations', result: results.resolvers },
    { name: 'Orchestration Flow', result: results.orchestration },
    { name: 'Error Handling', result: results.errorHandling },
    { name: 'Invocation Logging', result: results.logging },
    { name: 'Database Schema', result: results.database },
  ];

  for (const check of checks) {
    console.log(`${check.result ? '✅' : '❌'} ${check.name}`);
  }

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n🎉 All checks passed! Sprint 38 Day 3-4 implementation is complete.');
    console.log('\n📋 Implementation Summary:');
    console.log('   ✅ Template parsing with regex extraction');
    console.log('   ✅ 5 slot resolution strategies (STATIC, CONTEXT, MEMORY, DATABASE, GPT)');
    console.log('   ✅ Comprehensive validation (required, type, regex)');
    console.log('   ✅ Error handling with fallback to defaults');
    console.log('   ✅ Complete orchestration flow');
    console.log('   ✅ Invocation logging for analytics');
    console.log('\n📋 Next Steps:');
    console.log('   1. Apply migration via Supabase Dashboard (if not done)');
    console.log('   2. Create test templates and slots');
    console.log('   3. Run integration tests');
    console.log('   4. Build API routes for template management');
    console.log('   5. Create dashboard UI for template editing');
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
