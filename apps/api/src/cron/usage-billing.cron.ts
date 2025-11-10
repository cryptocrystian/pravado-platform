// =====================================================
// USAGE BILLING CRON JOB
// Sprint 72: Automated Billing & Revenue Operations Integration
// =====================================================

import cron from 'node-cron';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../services/logger.service';
import { aggregateDailyUsage } from '../services/billing-ledger.service';
import { createInvoicesForAllOrganizations } from '../services/invoicing.service';
import { enforceAllTierLimits } from '../services/account-tier.service';
import { logAIEvent } from '../services/notification.service';

// =====================================================
// CRON JOB CONFIGURATION
// =====================================================

// Default: Run at 01:00 UTC daily
const BILLING_CYCLE_CRON = process.env.BILLING_CYCLE_CRON || '0 1 * * *';

// =====================================================
// JOB EXECUTION FUNCTIONS
// =====================================================

/**
 * Aggregate daily usage for all organizations
 */
async function aggregateAllOrganizationsUsage(): Promise<{
  processed: number;
  failed: number;
}> {
  try {
    logger.info('Starting daily usage aggregation for all organizations');

    // Get all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id');

    if (error) {
      logger.error('Failed to get organizations', { error: error.message });
      throw error;
    }

    if (!organizations || organizations.length === 0) {
      logger.warn('No organizations found for usage aggregation');
      return { processed: 0, failed: 0 };
    }

    // Yesterday's date (aggregate yesterday's usage)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    let processed = 0;
    let failed = 0;

    // Aggregate usage for each organization
    for (const org of organizations) {
      try {
        const result = await aggregateDailyUsage(org.id, yesterday);
        if (result) {
          processed++;
          logger.info('Aggregated usage for organization', {
            organizationId: org.id,
            date: yesterday.toISOString().split('T')[0],
            totalCost: result.totalCostUsd,
            totalRequests: result.totalRequests,
          });
        }
      } catch (err: any) {
        failed++;
        logger.error('Failed to aggregate usage for organization', {
          organizationId: org.id,
          error: err.message,
        });
      }
    }

    logger.info('Daily usage aggregation completed', {
      totalOrgs: organizations.length,
      processed,
      failed,
      date: yesterday.toISOString().split('T')[0],
    });

    return { processed, failed };
  } catch (err: any) {
    logger.error('Failed to aggregate all organizations usage', {
      error: err.message,
    });
    throw err;
  }
}

/**
 * Create invoices for all organizations with unbilled usage
 */
async function processInvoicing(): Promise<{
  created: number;
  totalAmount: number;
}> {
  try {
    logger.info('Starting invoice processing');

    const results = await createInvoicesForAllOrganizations();

    const totalAmount = results.reduce((sum, r) => sum + r.totalAmount, 0);

    logger.info('Invoice processing completed', {
      invoicesCreated: results.length,
      totalAmount,
    });

    return {
      created: results.length,
      totalAmount,
    };
  } catch (err: any) {
    logger.error('Failed to process invoicing', { error: err.message });
    throw err;
  }
}

/**
 * Enforce tier limits and downgrade accounts if needed
 */
async function enforceTierLimits(): Promise<{
  checked: number;
  downgraded: number;
}> {
  try {
    logger.info('Starting tier limits enforcement');

    const result = await enforceAllTierLimits();

    logger.info('Tier limits enforcement completed', result);

    return result;
  } catch (err: any) {
    logger.error('Failed to enforce tier limits', { error: err.message });
    throw err;
  }
}

/**
 * Main billing cron job execution
 */
async function executeBillingCron(): Promise<void> {
  const startTime = Date.now();
  logger.info('=== BILLING CRON JOB STARTED ===');

  try {
    // Step 1: Aggregate yesterday's usage for all organizations
    const usageResult = await aggregateAllOrganizationsUsage();

    // Step 2: Create invoices for unbilled usage
    const invoiceResult = await processInvoicing();

    // Step 3: Enforce tier limits (downgrade delinquent accounts)
    const tierResult = await enforceTierLimits();

    const duration = Date.now() - startTime;

    logger.info('=== BILLING CRON JOB COMPLETED ===', {
      duration: `${duration}ms`,
      usageAggregated: usageResult.processed,
      usageFailed: usageResult.failed,
      invoicesCreated: invoiceResult.created,
      totalInvoiceAmount: invoiceResult.totalAmount,
      tierChecks: tierResult.checked,
      tierDowngrades: tierResult.downgraded,
    });

    // Log success event (to admin only)
    await logAIEvent({
      organizationId: '00000000-0000-0000-0000-000000000000', // System event
      eventType: 'billing_cron_success',
      severity: 'info',
      title: 'Daily Billing Job Completed',
      message: `Processed ${usageResult.processed} orgs, created ${invoiceResult.created} invoices ($${invoiceResult.totalAmount.toFixed(2)})`,
      metadata: {
        duration,
        usageAggregated: usageResult.processed,
        invoicesCreated: invoiceResult.created,
        totalAmount: invoiceResult.totalAmount,
        tierDowngrades: tierResult.downgraded,
      },
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;

    logger.error('=== BILLING CRON JOB FAILED ===', {
      duration: `${duration}ms`,
      error: err.message,
      stack: err.stack,
    });

    // Log failure event
    await logAIEvent({
      organizationId: '00000000-0000-0000-0000-000000000000', // System event
      eventType: 'billing_cron_failed',
      severity: 'critical',
      title: 'Daily Billing Job Failed',
      message: `Billing cron job failed: ${err.message}`,
      metadata: {
        duration,
        error: err.message,
      },
    });

    // Re-throw to ensure monitoring systems catch the error
    throw err;
  }
}

// =====================================================
// CRON JOB SCHEDULING
// =====================================================

/**
 * Start the billing cron job
 */
export function startBillingCron(): void {
  logger.info('Scheduling billing cron job', {
    schedule: BILLING_CYCLE_CRON,
    timezone: 'UTC',
  });

  cron.schedule(
    BILLING_CYCLE_CRON,
    async () => {
      try {
        await executeBillingCron();
      } catch (err: any) {
        logger.error('Billing cron job execution failed', {
          error: err.message,
        });
      }
    },
    {
      scheduled: true,
      timezone: 'UTC',
    }
  );

  logger.info('Billing cron job scheduled successfully');
}

/**
 * Manually trigger billing cron (for testing/admin)
 */
export async function triggerBillingCronManually(): Promise<void> {
  logger.warn('Manually triggering billing cron job');
  await executeBillingCron();
}

// =====================================================
// EXPORT
// =====================================================

export default {
  start: startBillingCron,
  trigger: triggerBillingCronManually,
};
