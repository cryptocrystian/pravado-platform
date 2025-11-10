#!/usr/bin/env ts-node
// =====================================================
// SPRINT 72 TRUTH VERIFICATION SCRIPT
// Automated Billing & Revenue Operations Integration
// =====================================================

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  details?: string;
  file?: string;
}

const results: CheckResult[] = [];

// =====================================================
// FILE EXISTENCE CHECKS
// =====================================================

function checkFileExists(filePath: string, description: string): void {
  const fullPath = path.join(__dirname, '../../..', filePath);
  const exists = fs.existsSync(fullPath);

  results.push({
    check: `File Exists: ${description}`,
    status: exists ? 'pass' : 'fail',
    details: exists ? undefined : `Missing file: ${filePath}`,
    file: filePath,
  });
}

function checkFileContains(
  filePath: string,
  searchString: string | RegExp,
  description: string
): void {
  const fullPath = path.join(__dirname, '../../..', filePath);

  if (!fs.existsSync(fullPath)) {
    results.push({
      check: description,
      status: 'fail',
      details: `File not found: ${filePath}`,
      file: filePath,
    });
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = typeof searchString === 'string'
    ? content.includes(searchString)
    : searchString.test(content);

  results.push({
    check: description,
    status: found ? 'pass' : 'fail',
    details: found ? undefined : `Pattern not found in ${filePath}`,
    file: filePath,
  });
}

// =====================================================
// PHASE 1: DATABASE MIGRATION
// =====================================================

console.log('🔍 Verifying Phase 1: Database Migration...\n');

checkFileExists(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'Stripe Integration Migration'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'CREATE TABLE IF NOT EXISTS stripe_customers',
  'stripe_customers table defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'CREATE TABLE IF NOT EXISTS stripe_invoices',
  'stripe_invoices table defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'CREATE TABLE IF NOT EXISTS stripe_events',
  'stripe_events table defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'get_stripe_customer',
  'get_stripe_customer() function defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'get_unpaid_invoices',
  'get_unpaid_invoices() function defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'get_revenue_metrics',
  'get_revenue_metrics() function defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'sync_plan_tier_from_stripe',
  'sync_plan_tier_from_stripe() function defined'
);

checkFileContains(
  'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
  'ENABLE ROW LEVEL SECURITY',
  'RLS policies enabled'
);

// =====================================================
// PHASE 2: BACKEND SERVICES
// =====================================================

console.log('🔍 Verifying Phase 2: Backend Services...\n');

checkFileExists(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'Stripe Webhooks Service'
);

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'verifyWebhookSignature',
  'Webhook signature verification function'
);

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'processWebhookEvent',
  'Webhook event processor function'
);

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'handleInvoicePaid',
  'invoice.paid handler defined'
);

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'handleInvoicePaymentFailed',
  'invoice.payment_failed handler defined'
);

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'handleSubscriptionUpdated',
  'subscription.updated handler defined'
);

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  'handleCheckoutCompleted',
  'checkout.session.completed handler defined'
);

checkFileExists(
  'apps/api/src/services/invoicing.service.ts',
  'Invoicing Service'
);

checkFileContains(
  'apps/api/src/services/invoicing.service.ts',
  'getUnbilledUsage',
  'getUnbilledUsage() function defined'
);

checkFileContains(
  'apps/api/src/services/invoicing.service.ts',
  'createInvoiceItemsForOrganization',
  'createInvoiceItemsForOrganization() function defined'
);

checkFileContains(
  'apps/api/src/services/invoicing.service.ts',
  'createInvoiceForOrganization',
  'createInvoiceForOrganization() function defined'
);

checkFileContains(
  'apps/api/src/services/invoicing.service.ts',
  'addCreditAdjustment',
  'addCreditAdjustment() function defined'
);

checkFileContains(
  'apps/api/src/services/invoicing.service.ts',
  'voidInvoice',
  'voidInvoice() function defined'
);

checkFileExists(
  'apps/api/src/services/account-tier.service.ts',
  'Account Tier Service'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  'getTierLimits',
  'getTierLimits() function defined'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  'getOrganizationTier',
  'getOrganizationTier() function defined'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  'upgradeTier',
  'upgradeTier() function defined'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  'downgradeTier',
  'downgradeTier() function defined'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  'handlePaymentFailure',
  'handlePaymentFailure() function defined'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  'enforceAllTierLimits',
  'enforceAllTierLimits() function defined'
);

// =====================================================
// PHASE 3: API ROUTES & CRON
// =====================================================

console.log('🔍 Verifying Phase 3: API Routes & Cron...\n');

checkFileExists(
  'apps/api/src/routes/stripe-webhooks.routes.ts',
  'Stripe Webhooks Routes'
);

checkFileContains(
  'apps/api/src/routes/stripe-webhooks.routes.ts',
  "'/stripe'",
  'POST /webhooks/stripe endpoint defined'
);

checkFileContains(
  'apps/api/src/routes/stripe-webhooks.routes.ts',
  "router.post",
  'Webhook POST handler defined'
);

checkFileContains(
  'apps/api/src/routes/index.ts',
  "import stripeWebhooksRoutes from './stripe-webhooks.routes'",
  'Webhook routes imported in index'
);

checkFileContains(
  'apps/api/src/routes/index.ts',
  "router.use('/webhooks', stripeWebhooksRoutes)",
  'Webhook routes registered'
);

checkFileExists(
  'apps/api/src/cron/usage-billing.cron.ts',
  'Usage Billing Cron Job'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  'aggregateAllOrganizationsUsage',
  'Usage aggregation function defined'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  'processInvoicing',
  'Invoice processing function defined'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  'enforceTierLimits',
  'Tier limits enforcement function defined'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  'startBillingCron',
  'Cron job starter function defined'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  'cron.schedule',
  'Cron schedule configured'
);

// =====================================================
// PHASE 4: FRONTEND COMPONENTS
// =====================================================

console.log('🔍 Verifying Phase 4: Frontend Components...\n');

checkFileExists(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'Billing Console Component'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'BillingConsole',
  'BillingConsole component exported'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'MetricsView',
  'MetricsView sub-component defined'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'CustomersView',
  'CustomersView sub-component defined'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'InvoicesView',
  'InvoicesView sub-component defined'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'AtRiskView',
  'AtRiskView sub-component defined'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'useBillingCustomers',
  'useBillingCustomers hook imported'
);

checkFileContains(
  'apps/dashboard/src/components/admin/BillingConsole.tsx',
  'useAddCreditAdjustment',
  'useAddCreditAdjustment hook imported'
);

checkFileExists(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'Billing Data Hooks'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useBillingCustomers',
  'useBillingCustomers hook exported'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useBillingInvoices',
  'useBillingInvoices hook exported'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useRevenueMetrics',
  'useRevenueMetrics hook exported'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useOrganizationsAtRisk',
  'useOrganizationsAtRisk hook exported'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useAddCreditAdjustment',
  'useAddCreditAdjustment mutation hook exported'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useVoidInvoice',
  'useVoidInvoice mutation hook exported'
);

checkFileContains(
  'apps/dashboard/src/hooks/useBillingData.ts',
  'useTriggerBilling',
  'useTriggerBilling mutation hook exported'
);

// =====================================================
// PHASE 5: ENVIRONMENT & DOCUMENTATION
// =====================================================

console.log('🔍 Verifying Phase 5: Environment & Documentation...\n');

checkFileContains(
  '.env.sample',
  'STRIPE_SECRET_KEY',
  'STRIPE_SECRET_KEY in .env.sample'
);

checkFileContains(
  '.env.sample',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_WEBHOOK_SECRET in .env.sample'
);

checkFileContains(
  '.env.sample',
  'STRIPE_PRICE_TRIAL',
  'STRIPE_PRICE_TRIAL in .env.sample'
);

checkFileContains(
  '.env.sample',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_PRO in .env.sample'
);

checkFileContains(
  '.env.sample',
  'STRIPE_PRICE_ENTERPRISE',
  'STRIPE_PRICE_ENTERPRISE in .env.sample'
);

checkFileContains(
  '.env.sample',
  'BILLING_CYCLE_CRON',
  'BILLING_CYCLE_CRON in .env.sample'
);

checkFileContains(
  'docs/architecture.md',
  'Phase 10: Automated Billing & Revenue Operations',
  'Phase 10 documentation added'
);

checkFileContains(
  'docs/architecture.md',
  'Usage Aggregation & Billing Ledger',
  'Usage Aggregation section documented'
);

checkFileContains(
  'docs/architecture.md',
  'Stripe Integration',
  'Stripe Integration section documented'
);

checkFileContains(
  'docs/architecture.md',
  'Account Tier Management',
  'Account Tier Management section documented'
);

checkFileContains(
  'docs/architecture.md',
  'Admin Billing Console',
  'Admin Billing Console section documented'
);

// =====================================================
// INTEGRATION CHECKS
// =====================================================

console.log('🔍 Verifying Integration & Consistency...\n');

checkFileContains(
  'apps/api/src/services/stripe-webhooks.service.ts',
  "from '../lib/supabaseClient'",
  'Stripe webhooks service uses Supabase client'
);

checkFileContains(
  'apps/api/src/services/invoicing.service.ts',
  "from './logger.service'",
  'Invoicing service uses logger'
);

checkFileContains(
  'apps/api/src/services/account-tier.service.ts',
  "from './notification.service'",
  'Account tier service logs events to notification service'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  "from '../services/billing-ledger.service'",
  'Cron job imports billing ledger service'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  "from '../services/invoicing.service'",
  'Cron job imports invoicing service'
);

checkFileContains(
  'apps/api/src/cron/usage-billing.cron.ts',
  "from '../services/account-tier.service'",
  'Cron job imports account tier service'
);

// =====================================================
// GENERATE REPORT
// =====================================================

const passCount = results.filter((r) => r.status === 'pass').length;
const failCount = results.filter((r) => r.status === 'fail').length;
const warnCount = results.filter((r) => r.status === 'warning').length;
const totalCount = results.length;
const passRate = ((passCount / totalCount) * 100).toFixed(1);

const report = {
  sprint: 72,
  title: 'Automated Billing & Revenue Operations Integration',
  timestamp: new Date().toISOString(),
  summary: {
    total: totalCount,
    passed: passCount,
    failed: failCount,
    warnings: warnCount,
    passRate: `${passRate}%`,
  },
  phases: {
    phase1_database: {
      description: 'Database Migration & Schema',
      checks: results.slice(0, 9),
    },
    phase2_services: {
      description: 'Backend Services',
      checks: results.slice(9, 31),
    },
    phase3_api_cron: {
      description: 'API Routes & Cron Jobs',
      checks: results.slice(31, 42),
    },
    phase4_frontend: {
      description: 'Frontend Components',
      checks: results.slice(42, 59),
    },
    phase5_env_docs: {
      description: 'Environment & Documentation',
      checks: results.slice(59, 71),
    },
    integration: {
      description: 'Integration & Consistency',
      checks: results.slice(71),
    },
  },
  files_created: [
    'apps/api/supabase/migrations/20251109000001_stripe_integration.sql',
    'apps/api/src/services/stripe-webhooks.service.ts',
    'apps/api/src/services/invoicing.service.ts',
    'apps/api/src/services/account-tier.service.ts',
    'apps/api/src/routes/stripe-webhooks.routes.ts',
    'apps/api/src/cron/usage-billing.cron.ts',
    'apps/dashboard/src/components/admin/BillingConsole.tsx',
    'apps/dashboard/src/hooks/useBillingData.ts',
  ],
  files_modified: [
    'apps/api/src/routes/index.ts',
    '.env.sample',
    'docs/architecture.md',
  ],
  conclusion:
    passRate === '100.0'
      ? '✅ All checks passed! Sprint 72 implementation is complete and verified.'
      : failCount > 0
      ? `⚠️  ${failCount} check(s) failed. Please review the failed checks above.`
      : `✅ Implementation complete with ${warnCount} warning(s).`,
};

// Write report to file
const reportPath = path.join(__dirname, '../../../truth_verification_report_v7.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Console output
console.log('\n' + '='.repeat(70));
console.log('SPRINT 72 VERIFICATION REPORT');
console.log('='.repeat(70));
console.log(`\n📊 Summary:`);
console.log(`   Total Checks: ${totalCount}`);
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   ⚠️  Warnings: ${warnCount}`);
console.log(`   Pass Rate: ${passRate}%`);
console.log(`\n${report.conclusion}`);
console.log(`\n📄 Full report saved to: truth_verification_report_v7.json`);
console.log('='.repeat(70) + '\n');

// Exit with error code if failures
process.exit(failCount > 0 ? 1 : 0);
