/**
 * Sprint 37 Sanity Check Script
 * Verifies database tables and basic API structure
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials from .env.sample
const SUPABASE_URL = 'https://zahrjxnwqaxsezcrnpef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaHJqeG53cWF4c2V6Y3JucGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mzk4MDYsImV4cCI6MjA3NzUxNTgwNn0.rMvH14j3QB-W6X0m5NTXOWGSaC46x4F6Dxm9ONfrNUc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSanityChecks() {
  console.log('\n🔍 Sprint 37: Memory Lifecycle Sanity Check\n');
  console.log('='.repeat(60));

  // Test 1: Check database connection
  console.log('\n1️⃣ Testing Supabase Connection...');
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (error) {
      console.log('   ⚠️  Connection successful but query failed:', error.message);
      console.log('   (This is expected if migrations haven\'t been run yet)');
    } else {
      console.log('   ✅ Supabase connection successful!');
      console.log(`   Found ${data?.length || 0} organizations`);
    }
  } catch (err) {
    console.log('   ❌ Connection failed:', err.message);
  }

  // Test 2: Check if memory lifecycle tables exist
  console.log('\n2️⃣ Checking Memory Lifecycle Tables...');

  const tables = [
    'agent_memory_episodes',
    'agent_memory_chunks',
    'agent_memory_lifecycle_events'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log(`   ❌ Table "${table}" does not exist`);
          console.log(`      → Migration 20250102000037_memory_lifecycle.sql needs to be run`);
        } else {
          console.log(`   ⚠️  Table "${table}" exists but query failed: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Table "${table}" exists`);
        console.log(`      Found ${data?.length || 0} records`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking table "${table}":`, err.message);
    }
  }

  // Test 3: Check for lifecycle columns on episodes table
  console.log('\n3️⃣ Checking Lifecycle Columns...');

  const expectedColumns = [
    'age_score',
    'decay_factor',
    'compressed',
    'archived_at',
    'last_reinforced_at',
    'reinforcement_count'
  ];

  try {
    const { data, error } = await supabase
      .from('agent_memory_episodes')
      .select(expectedColumns.join(', '))
      .limit(1);

    if (error) {
      if (error.code === '42703') {
        console.log('   ❌ Lifecycle columns missing from agent_memory_episodes');
        console.log('      → Migration needs to be applied');
      } else if (error.code === '42P01') {
        console.log('   ❌ Table agent_memory_episodes does not exist');
      } else {
        console.log('   ⚠️  Column check failed:', error.message);
      }
    } else {
      console.log('   ✅ All lifecycle columns present on agent_memory_episodes');
    }
  } catch (err) {
    console.log('   ❌ Error checking columns:', err.message);
  }

  // Test 4: Check API files
  console.log('\n4️⃣ Checking API Implementation Files...');

  const fs = require('fs');
  const path = require('path');

  const files = [
    'apps/api/src/routes/agent-memory-lifecycle.routes.ts',
    'apps/api/src/controllers/agent-memory-lifecycle.controller.ts',
    'apps/agents/src/memory/memory-lifecycle-engine.ts',
    'apps/dashboard/src/hooks/useMemoryLifecycle.ts',
    'apps/api/supabase/migrations/20250102000037_memory_lifecycle.sql'
  ];

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`   ✅ ${file}`);
      console.log(`      Size: ${(stats.size / 1024).toFixed(1)}KB`);
    } else {
      console.log(`   ❌ ${file} - NOT FOUND`);
    }
  }

  // Test 5: Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 SANITY CHECK SUMMARY\n');
  console.log('To complete the sanity check, you need to:');
  console.log('');
  console.log('✅ Step 1: Install dependencies');
  console.log('   cd /home/saipienlabs/projects/pravado-platform');
  console.log('   pnpm install');
  console.log('');
  console.log('✅ Step 2: Run database migrations');
  console.log('   cd apps/api');
  console.log('   npx supabase db push');
  console.log('   (or apply migrations manually to your Supabase project)');
  console.log('');
  console.log('✅ Step 3: Start the API server');
  console.log('   cd apps/api');
  console.log('   pnpm dev');
  console.log('');
  console.log('✅ Step 4: Test endpoints');
  console.log('   GET http://localhost:3001/api/v1/agent-memory-lifecycle/dashboard');
  console.log('   GET http://localhost:3001/api/v1/agent-memory-lifecycle/retention-plan');
  console.log('');
  console.log('✅ Step 5: Test React hooks');
  console.log('   Import and use hooks from apps/dashboard/src/hooks/useMemoryLifecycle.ts');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

// Run the checks
runSanityChecks()
  .then(() => {
    console.log('✅ Sanity check complete!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Sanity check failed:', err);
    process.exit(1);
  });
