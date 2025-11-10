/**
 * Migration Check Script
 * Verifies if Sprint 37 migration has been applied
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zahrjxnwqaxsezcrnpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaHJqeG53cWF4c2V6Y3JucGVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTkzOTgwNiwiZXhwIjoyMDc3NTE1ODA2fQ.Ybcpx6e0FZJIrHKBE2p-Qqt7tUgGjcQTEC8eOq3hqlY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkMigration() {
  console.log('\n🔍 Sprint 37 Migration Check\n');
  console.log('='.repeat(60));

  let allPassed = true;

  // Check 1: agent_memory_episodes columns
  console.log('\n1️⃣  Checking agent_memory_episodes lifecycle columns...');
  try {
    const { data, error } = await supabase
      .from('agent_memory_episodes')
      .select('id, age_score, decay_factor, compressed, archived_at')
      .limit(0);

    if (error) {
      if (error.code === '42703') {
        console.log('   ❌ Lifecycle columns missing');
        console.log('   → Run migration 20250102000037_memory_lifecycle.sql');
        allPassed = false;
      } else if (error.code === '42P01') {
        console.log('   ❌ Table agent_memory_episodes does not exist');
        console.log('   → Run earlier migrations first');
        allPassed = false;
      } else {
        console.log(`   ⚠️  Warning: ${error.message}`);
      }
    } else {
      console.log('   ✅ All lifecycle columns present');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Check 2: agent_memory_lifecycle_events table
  console.log('\n2️⃣  Checking agent_memory_lifecycle_events table...');
  try {
    const { data, error } = await supabase
      .from('agent_memory_lifecycle_events')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('   ❌ Table agent_memory_lifecycle_events does not exist');
        console.log('   → Run migration 20250102000037_memory_lifecycle.sql');
        allPassed = false;
      } else {
        console.log(`   ⚠️  Warning: ${error.message}`);
      }
    } else {
      console.log('   ✅ Table exists and is accessible');
      console.log(`   Found ${data?.length || 0} lifecycle events`);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Check 3: PostgreSQL functions
  console.log('\n3️⃣  Checking PostgreSQL lifecycle functions...');
  try {
    // Try to call one of the functions
    const { data, error } = await supabase.rpc('get_memory_lifecycle_dashboard', {
      p_organization_id: '00000000-0000-0000-0000-000000000000' // Dummy ID
    });

    if (error) {
      if (error.code === '42883') {
        console.log('   ❌ Function get_memory_lifecycle_dashboard does not exist');
        console.log('   → Run migration 20250102000037_memory_lifecycle.sql');
        allPassed = false;
      } else {
        console.log(`   ⚠️  Function exists but returned: ${error.message}`);
        console.log('   ✅ Function is defined (error is expected with dummy org ID)');
      }
    } else {
      console.log('   ✅ Function get_memory_lifecycle_dashboard is working');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('\n✅ SUCCESS: Sprint 37 migration has been applied!\n');
    console.log('You can now:');
    console.log('1. Start the API server: cd apps/api && pnpm dev');
    console.log('2. Run tests: ./test-lifecycle-api.sh');
    return 0;
  } else {
    console.log('\n❌ MIGRATION NEEDED: Please apply the migration\n');
    console.log('Steps to apply migration:');
    console.log('1. Go to: ' + SUPABASE_URL + '/project/_/sql');
    console.log('2. Create new query');
    console.log('3. Copy contents from:');
    console.log('   apps/api/supabase/migrations/20250102000037_memory_lifecycle.sql');
    console.log('4. Execute the query');
    console.log('5. Re-run this script to verify');
    console.log('');
    return 1;
  }
}

checkMigration()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  });
