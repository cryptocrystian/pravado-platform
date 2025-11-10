/**
 * Sprint 37 Migration Executor
 * Applies 20250102000037_memory_lifecycle.sql programmatically
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase connection (using Management API)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zahrjxnwqaxsezcrnpef.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaHJqeG53cWF4c2V6Y3JucGVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTkzOTgwNiwiZXhwIjoyMDc3NTE1ODA2fQ.Ybcpx6e0FZJIrHKBE2p-Qqt7tUgGjcQTEC8eOq3hqlY';

const MIGRATION_FILE = path.join(__dirname, 'supabase/migrations/20250102000037_memory_lifecycle.sql');

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  console.log('\n🔧 Sprint 37: Applying Memory Lifecycle Migration\n');
  console.log('='.repeat(60));

  try {
    // Connect to database
    console.log('\n1️⃣  Connecting to PostgreSQL...');
    await client.connect();
    console.log('   ✅ Connected successfully');

    // Read migration file
    console.log('\n2️⃣  Reading migration file...');
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    const sqlSize = (migrationSQL.length / 1024).toFixed(1);
    console.log(`   ✅ Loaded ${sqlSize}KB of SQL`);

    // Begin transaction
    console.log('\n3️⃣  Starting transaction...');
    await client.query('BEGIN');
    console.log('   ✅ Transaction started');

    // Execute migration
    console.log('\n4️⃣  Executing migration SQL...');
    console.log('   (This may take 10-30 seconds...)');

    const startTime = Date.now();
    await client.query(migrationSQL);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`   ✅ Migration executed in ${duration}s`);

    // Commit transaction
    console.log('\n5️⃣  Committing transaction...');
    await client.query('COMMIT');
    console.log('   ✅ Transaction committed');

    // Verify key components
    console.log('\n6️⃣  Verifying migration...');

    // Check lifecycle columns
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'agent_memory_episodes'
        AND column_name IN ('age_score', 'decay_factor', 'compressed', 'archived_at')
      ORDER BY column_name
    `);

    console.log(`   ✅ Found ${columnsResult.rows.length}/4 lifecycle columns`);
    columnsResult.rows.forEach(row => {
      console.log(`      - ${row.column_name}`);
    });

    // Check lifecycle events table
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'agent_memory_lifecycle_events'
      ) as exists
    `);

    if (tableResult.rows[0].exists) {
      console.log('   ✅ Table agent_memory_lifecycle_events created');
    } else {
      console.log('   ⚠️  Table agent_memory_lifecycle_events not found');
    }

    // Check functions
    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE '%memory%'
        AND routine_name LIKE '%lifecycle%'
      ORDER BY routine_name
    `);

    console.log(`   ✅ Found ${functionsResult.rows.length} lifecycle functions:`);
    functionsResult.rows.forEach((row, i) => {
      if (i < 5) {
        console.log(`      - ${row.routine_name}`);
      }
    });
    if (functionsResult.rows.length > 5) {
      console.log(`      ... and ${functionsResult.rows.length - 5} more`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ SUCCESS: Sprint 37 migration applied successfully!\n');
    console.log('Next steps:');
    console.log('1. Run verification: node verify-migration.js');
    console.log('2. Start API server: pnpm dev');
    console.log('3. Test endpoints: ../../test-lifecycle-api.sh');
    console.log('');

  } catch (error) {
    // Rollback on error
    try {
      await client.query('ROLLBACK');
      console.log('\n❌ Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('Failed to rollback:', rollbackError.message);
    }

    console.error('\n' + '='.repeat(60));
    console.error('\n❌ MIGRATION FAILED\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error.detail || 'No additional details');
    console.error('');

    if (error.message.includes('does not exist')) {
      console.error('💡 Tip: Ensure earlier migrations have been run first');
      console.error('   Required tables: agent_memory_episodes, agent_memory_chunks');
    }

    process.exit(1);

  } finally {
    await client.end();
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log('Migration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
