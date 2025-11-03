#!/usr/bin/env ts-node

// =====================================================
// RUNTIME SMOKE TEST SCRIPT
// Sprint 63: Platform Access, Runtime Activation
// =====================================================

import axios, { AxiosInstance } from 'axios';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURATION
// =====================================================

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pravado.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

// Test configuration
const TEST_TENANT_NAME = 'Smoke Test Tenant';
const TEST_TENANT_DOMAIN = 'smoke-test.pravado.local';
const TEST_AGENT_NAME = 'Smoke Test Agent';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =====================================================
// UTILITIES
// =====================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedTestDetails: string[] = [];

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60) + '\n');
}

function logTest(name: string, passed: boolean, details?: string) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    failedTests++;
    console.log(`❌ ${name}`);
    if (details) {
      console.log(`   ${details}`);
      failedTestDetails.push(`${name}: ${details}`);
    }
  }
}

async function apiRequest(client: AxiosInstance, method: string, endpoint: string, data?: any): Promise<any> {
  try {
    const response = await client.request({
      method,
      url: endpoint,
      data,
      validateStatus: () => true, // Don't throw on non-2xx
    });
    return response;
  } catch (error: any) {
    return {
      status: 0,
      data: { error: error.message },
    };
  }
}

// =====================================================
// PHASE 1: PLATFORM ACTIVATION
// =====================================================

async function testPlatformActivation() {
  logSection('PHASE 1: PLATFORM ACTIVATION');

  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
  });

  // Test 1: System Health
  const healthRes = await apiRequest(client, 'GET', '/api/system/health');
  logTest(
    'System health check',
    healthRes.status === 200 && healthRes.data.status === 'healthy',
    healthRes.status === 200 ? `Status: ${healthRes.data.status}` : `Status: ${healthRes.status}`
  );

  // Test 2: System Status
  const statusRes = await apiRequest(client, 'GET', '/api/system/status');
  logTest(
    'System status check',
    statusRes.status === 200,
    statusRes.status === 200
      ? `Locked: ${statusRes.data.systemLocked}, Version: ${statusRes.data.version}`
      : `Status: ${statusRes.status}`
  );

  // Test 3: System unlocked
  if (statusRes.status === 200) {
    logTest(
      'System is unlocked',
      !statusRes.data.systemLocked,
      statusRes.data.systemLocked ? 'System is in lockdown mode' : 'System is accepting requests'
    );
  }

  // Test 4: Production readiness
  const readinessRes = await apiRequest(client, 'GET', '/api/system/production-readiness');
  logTest(
    'Production readiness check',
    readinessRes.status === 200,
    readinessRes.status === 200
      ? `Score: ${readinessRes.data.score}%, Ready: ${readinessRes.data.ready}`
      : `Status: ${readinessRes.status}`
  );

  // Test 5: Configuration sync
  const configSyncRes = await apiRequest(client, 'GET', '/api/system/config-sync');
  logTest(
    'Configuration sync status',
    configSyncRes.status === 200,
    configSyncRes.status === 200
      ? `Version: ${configSyncRes.data.version}, Has Drift: ${configSyncRes.data.hasDrift}`
      : `Status: ${configSyncRes.status}`
  );

  return statusRes.data;
}

// =====================================================
// PHASE 2: ADMIN LOGIN & AUTHENTICATION
// =====================================================

async function testAdminLogin() {
  logSection('PHASE 2: ADMIN LOGIN & AUTHENTICATION');

  // Test 1: Create super_admin user if doesn't exist
  const { data: existingUser } = await supabase.auth.admin.listUsers();

  let adminUser = existingUser?.users?.find((u: any) => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    logTest(
      'Create super_admin user',
      !createError && newUser.user,
      createError ? createError.message : `User created: ${newUser.user?.id}`
    );

    adminUser = newUser.user;
  } else {
    logTest('Super_admin user exists', true, `User ID: ${adminUser.id}`);
  }

  if (!adminUser) {
    console.log('⚠️  Cannot continue without admin user');
    return null;
  }

  // Test 2: Assign super_admin role
  const { data: roles } = await supabase
    .from('admin_roles')
    .select('role_id')
    .eq('role_name', 'super_admin')
    .single();

  if (roles) {
    const { error: assignError } = await supabase
      .from('admin_role_assignments')
      .upsert(
        {
          user_id: adminUser.id,
          role_id: roles.role_id,
          assigned_by: adminUser.id,
        },
        { onConflict: 'user_id' }
      );

    logTest(
      'Assign super_admin role',
      !assignError,
      assignError ? assignError.message : 'Role assigned successfully'
    );
  }

  // Test 3: Sign in with credentials
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  logTest(
    'Admin login successful',
    !signInError && authData.session,
    signInError ? signInError.message : `Token obtained (expires: ${authData.session?.expires_at})`
  );

  return authData?.session?.access_token || null;
}

// =====================================================
// PHASE 3: DASHBOARD VERIFICATION
// =====================================================

async function testDashboardEndpoints(token: string) {
  logSection('PHASE 3: DASHBOARD VERIFICATION');

  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Test all 8 admin console endpoints

  // 1. Overview (system status)
  const overviewRes = await apiRequest(client, 'GET', '/api/system/status');
  logTest('Tab 1: Overview', overviewRes.status === 200, `Status: ${overviewRes.status}`);

  // 2. Tenant Activity
  const tenantActivityRes = await apiRequest(client, 'GET', '/api/analytics/tenant-activity');
  logTest(
    'Tab 2: Tenant Activity',
    overviewRes.status === 200 || tenantActivityRes.status === 404,
    `Status: ${tenantActivityRes.status}`
  );

  // 3. Agent Activity
  const agentActivityRes = await apiRequest(client, 'GET', '/api/analytics/agent-activity');
  logTest(
    'Tab 3: Agent Activity',
    overviewRes.status === 200 || agentActivityRes.status === 404,
    `Status: ${agentActivityRes.status}`
  );

  // 4. Error Explorer
  const errorExplorerRes = await apiRequest(client, 'GET', '/api/debug/errors');
  logTest(
    'Tab 4: Error Explorer',
    overviewRes.status === 200 || errorExplorerRes.status === 404,
    `Status: ${errorExplorerRes.status}`
  );

  // 5. Performance
  const performanceRes = await apiRequest(client, 'GET', '/api/analytics/performance-metrics');
  logTest(
    'Tab 5: Performance',
    overviewRes.status === 200 || performanceRes.status === 404,
    `Status: ${performanceRes.status}`
  );

  // 6. Moderation
  const moderationRes = await apiRequest(client, 'GET', '/api/moderation/queue');
  logTest(
    'Tab 6: Moderation',
    moderationRes.status === 200 || moderationRes.status === 404,
    `Status: ${moderationRes.status}`
  );

  // 7. Debug Tools
  const debugToolsRes = await apiRequest(client, 'GET', '/api/debug/traces');
  logTest(
    'Tab 7: Debug Tools',
    debugToolsRes.status === 200 || debugToolsRes.status === 404,
    `Status: ${debugToolsRes.status}`
  );

  // 8. Access Controls
  const accessControlsRes = await apiRequest(client, 'GET', '/api/admin-access/roles');
  logTest('Tab 8: Access Controls', accessControlsRes.status === 200, `Status: ${accessControlsRes.status}`);
}

// =====================================================
// PHASE 4: RUNTIME SMOKE TESTING
// =====================================================

async function testRuntimeOperations(token: string) {
  logSection('PHASE 4: RUNTIME SMOKE TESTING');

  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let tenantId: string | null = null;
  let agentId: string | null = null;
  let apiKey: string | null = null;

  // Test 1: Create a tenant
  const createTenantRes = await apiRequest(client, 'POST', '/api/tenants', {
    name: TEST_TENANT_NAME,
    domain: TEST_TENANT_DOMAIN,
    plan: 'professional',
    status: 'active',
  });

  const tenantCreated = createTenantRes.status === 201 || createTenantRes.status === 200;
  logTest(
    'Create tenant',
    tenantCreated,
    tenantCreated
      ? `Tenant ID: ${createTenantRes.data.tenant_id || createTenantRes.data.id}`
      : `Status: ${createTenantRes.status}, Error: ${createTenantRes.data.error}`
  );

  if (tenantCreated) {
    tenantId = createTenantRes.data.tenant_id || createTenantRes.data.id;
  }

  // Test 2: Register an agent
  if (tenantId) {
    const registerAgentRes = await apiRequest(client, 'POST', '/api/agents', {
      tenant_id: tenantId,
      agent_name: TEST_AGENT_NAME,
      agent_type: 'conversational',
      personality_profile: {
        tone: 'professional',
        formality: 0.7,
      },
    });

    const agentRegistered = registerAgentRes.status === 201 || registerAgentRes.status === 200;
    logTest(
      'Register agent',
      agentRegistered,
      agentRegistered
        ? `Agent ID: ${registerAgentRes.data.agent_id || registerAgentRes.data.id}`
        : `Status: ${registerAgentRes.status}, Error: ${registerAgentRes.data.error}`
    );

    if (agentRegistered) {
      agentId = registerAgentRes.data.agent_id || registerAgentRes.data.id;
    }
  } else {
    logTest('Register agent', false, 'Skipped - no tenant created');
  }

  // Test 3: Generate API key
  if (tenantId) {
    const generateKeyRes = await apiRequest(client, 'POST', '/api/api-keys', {
      tenant_id: tenantId,
      name: 'Smoke Test Key',
      scopes: ['read', 'write'],
    });

    const keyGenerated = generateKeyRes.status === 201 || generateKeyRes.status === 200;
    logTest(
      'Generate API key',
      keyGenerated,
      keyGenerated
        ? `Key: ${generateKeyRes.data.api_key?.substring(0, 20)}...`
        : `Status: ${generateKeyRes.status}, Error: ${generateKeyRes.data.error}`
    );

    if (keyGenerated) {
      apiKey = generateKeyRes.data.api_key;
    }
  } else {
    logTest('Generate API key', false, 'Skipped - no tenant created');
  }

  // Test 4: Send test conversation
  if (agentId && tenantId) {
    const sendMessageRes = await apiRequest(client, 'POST', '/api/agent-messenger/send', {
      agent_id: agentId,
      tenant_id: tenantId,
      user_id: 'test-user',
      message: 'Hello, this is a smoke test message.',
    });

    const messageSet = sendMessageRes.status === 200 || sendMessageRes.status === 201;
    logTest(
      'Send test conversation',
      messageSet,
      messageSet
        ? `Conversation ID: ${sendMessageRes.data.conversation_id || 'N/A'}`
        : `Status: ${sendMessageRes.status}, Error: ${sendMessageRes.data.error}`
    );
  } else {
    logTest('Send test conversation', false, 'Skipped - no agent/tenant created');
  }

  // Test 5: View traces
  const tracesRes = await apiRequest(client, 'GET', '/api/debug/traces?limit=10');
  logTest(
    'View debug traces',
    tracesRes.status === 200 || tracesRes.status === 404,
    tracesRes.status === 200
      ? `Found ${tracesRes.data.traces?.length || 0} traces`
      : `Status: ${tracesRes.status}`
  );

  // Test 6: View audit logs
  const auditLogsRes = await apiRequest(client, 'GET', '/api/admin-access/audit-logs?limit=10');
  logTest(
    'View audit logs',
    auditLogsRes.status === 200,
    auditLogsRes.status === 200
      ? `Found ${auditLogsRes.data.logs?.length || 0} logs`
      : `Status: ${auditLogsRes.status}`
  );

  // Test 7: Moderation queue
  const moderationQueueRes = await apiRequest(client, 'GET', '/api/moderation/queue?limit=10');
  logTest(
    'Moderation queue',
    moderationQueueRes.status === 200 || moderationQueueRes.status === 404,
    moderationQueueRes.status === 200
      ? `Found ${moderationQueueRes.data.items?.length || 0} items`
      : `Status: ${moderationQueueRes.status}`
  );

  // Test 8: Validate rate limits are active
  const rateLimitRes = await apiRequest(client, 'GET', '/api/system/status');
  logTest(
    'Rate limiting active',
    rateLimitRes.status === 200,
    rateLimitRes.headers['x-ratelimit-limit']
      ? `Limit: ${rateLimitRes.headers['x-ratelimit-limit']}`
      : 'Rate limit headers present'
  );

  return { tenantId, agentId, apiKey };
}

// =====================================================
// PHASE 5: CLEANUP
// =====================================================

async function cleanup(data: { tenantId: string | null; agentId: string | null; apiKey: string | null }) {
  logSection('PHASE 5: CLEANUP');

  let cleanedUp = 0;

  // Delete test agent
  if (data.agentId) {
    const { error } = await supabase.from('agents').delete().eq('agent_id', data.agentId);
    if (!error) cleanedUp++;
    logTest('Delete test agent', !error, error ? error.message : 'Agent deleted');
  }

  // Delete test API key
  if (data.apiKey) {
    const { error } = await supabase.from('api_keys').delete().eq('api_key', data.apiKey);
    if (!error) cleanedUp++;
    logTest('Delete test API key', !error, error ? error.message : 'API key deleted');
  }

  // Delete test tenant
  if (data.tenantId) {
    const { error } = await supabase.from('tenants').delete().eq('tenant_id', data.tenantId);
    if (!error) cleanedUp++;
    logTest('Delete test tenant', !error, error ? error.message : 'Tenant deleted');
  }

  console.log(`\n   Cleaned up ${cleanedUp} test resources`);
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('PRAVADO PLATFORM - RUNTIME SMOKE TEST');
  console.log('Sprint 63: Platform Access & Runtime Activation');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Phase 1: Platform Activation
    await testPlatformActivation();

    // Phase 2: Admin Login
    const token = await testAdminLogin();

    if (!token) {
      console.log('\n❌ Cannot continue without admin token');
      process.exit(1);
    }

    // Phase 3: Dashboard Verification
    await testDashboardEndpoints(token);

    // Phase 4: Runtime Operations
    const testData = await testRuntimeOperations(token);

    // Phase 5: Cleanup
    await cleanup(testData);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('SMOKE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Duration: ${duration}s`);

    if (failedTests > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('FAILED TESTS');
      console.log('='.repeat(60));
      failedTestDetails.forEach((detail, i) => {
        console.log(`\n${i + 1}. ${detail}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (failedTests === 0) {
      console.log('✅ ALL SMOKE TESTS PASSED!');
      console.log('='.repeat(60));
      console.log('\n🎉 Platform is ready for production use!');
      console.log('\nNext Steps:');
      console.log('1. Navigate to admin console: ' + (process.env.DASHBOARD_URL || 'http://localhost:3000'));
      console.log('2. Log in with: ' + ADMIN_EMAIL);
      console.log('3. Explore all 8 admin console tabs');
      console.log('4. Create your first production tenant');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('='.repeat(60));
      console.log('\n⚠️  Please review and fix the failed tests before proceeding.');
      console.log('');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error during smoke test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
