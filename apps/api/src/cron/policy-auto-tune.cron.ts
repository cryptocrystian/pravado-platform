// =====================================================
// POLICY AUTO-TUNE CRON JOB
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// Nightly job to adapt policies based on telemetry

import { CronJob } from 'cron';
import { adaptPolicy, isAdaptationEnabled } from '../services/policy-adaptation.service';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// =====================================================
// CONFIGURATION
// =====================================================

// Run daily at 02:00 UTC (lowest traffic time)
const CRON_SCHEDULE = '0 2 * * *';

// =====================================================
// JOB IMPLEMENTATION
// =====================================================

/**
 * Run policy adaptation for all organizations
 */
async function runPolicyAutoTune(): Promise<void> {
  try {
    if (!isAdaptationEnabled()) {
      logger.info('[PolicyAutoTune] Skipping - policy adaptation is disabled');
      return;
    }

    logger.info('[PolicyAutoTune] Starting nightly policy auto-tune');

    // Get all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id');

    if (error || !organizations) {
      logger.error('[PolicyAutoTune] Failed to fetch organizations', error);
      return;
    }

    logger.info('[PolicyAutoTune] Processing adaptations', {
      organizationCount: organizations.length,
    });

    let successCount = 0;
    let errorCount = 0;
    const results: Array<{
      organizationId: string;
      success: boolean;
      adaptations?: number;
      error?: string;
    }> = [];

    // Process each organization
    for (const org of organizations) {
      try {
        const result = await adaptPolicy(org.id);

        const totalAdaptations =
          result.adaptations.alphaAdjustments.length +
          result.adaptations.providerDisablements.length +
          result.adaptations.providerEnablements.length;

        results.push({
          organizationId: org.id,
          success: true,
          adaptations: totalAdaptations,
        });

        successCount++;

        // Log if adaptations were made
        if (totalAdaptations > 0) {
          logger.info('[PolicyAutoTune] Adaptations applied', {
            organizationId: org.id,
            alphaAdjustments: result.adaptations.alphaAdjustments.length,
            disablements: result.adaptations.providerDisablements.length,
            enablements: result.adaptations.providerEnablements.length,
            recommendations: result.recommendations,
          });
        }

        // Store adaptation result in database (optional)
        await storeAdaptationResult(result);
      } catch (error: any) {
        logger.error('[PolicyAutoTune] Error adapting policy for organization', {
          organizationId: org.id,
          error: error.message,
        });

        results.push({
          organizationId: org.id,
          success: false,
          error: error.message,
        });

        errorCount++;
      }
    }

    logger.info('[PolicyAutoTune] Nightly auto-tune complete', {
      totalOrganizations: organizations.length,
      successCount,
      errorCount,
      totalAdaptations: results.reduce((sum, r) => sum + (r.adaptations || 0), 0),
    });
  } catch (error: any) {
    logger.error('[PolicyAutoTune] Fatal error in auto-tune job', error);
  }
}

/**
 * Store adaptation result in database for audit trail
 */
async function storeAdaptationResult(result: any): Promise<void> {
  try {
    // Optional: Store in a policy_adaptations table for audit trail
    // For now, we just log it

    const totalAdaptations =
      result.adaptations.alphaAdjustments.length +
      result.adaptations.providerDisablements.length +
      result.adaptations.providerEnablements.length;

    if (totalAdaptations > 0) {
      // Could store in database here
      // await supabase.from('policy_adaptation_logs').insert({...})
    }
  } catch (error) {
    logger.error('[PolicyAutoTune] Error storing adaptation result', error);
  }
}

// =====================================================
// CRON JOB SETUP
// =====================================================

/**
 * Create and configure the cron job
 */
export function createPolicyAutoTuneJob(): CronJob {
  const job = new CronJob(
    CRON_SCHEDULE,
    runPolicyAutoTune,
    null, // onComplete
    false, // start
    'UTC' // timezone
  );

  logger.info('[PolicyAutoTune] Cron job configured', {
    schedule: CRON_SCHEDULE,
    timezone: 'UTC',
    enabled: isAdaptationEnabled(),
  });

  return job;
}

/**
 * Start the policy auto-tune job
 */
export function startPolicyAutoTuneJob(): CronJob | null {
  if (!isAdaptationEnabled()) {
    logger.info('[PolicyAutoTune] Skipping job start - policy adaptation is disabled');
    logger.info('[PolicyAutoTune] Set ENABLE_POLICY_ADAPTATION=true to enable');
    return null;
  }

  const job = createPolicyAutoTuneJob();
  job.start();

  logger.info('[PolicyAutoTune] Cron job started', {
    nextRun: job.nextDate().toISO(),
  });

  return job;
}

/**
 * Manually trigger the auto-tune job (for testing)
 */
export async function triggerManualAutoTune(): Promise<void> {
  logger.info('[PolicyAutoTune] Manual trigger initiated');
  await runPolicyAutoTune();
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  createJob: createPolicyAutoTuneJob,
  startJob: startPolicyAutoTuneJob,
  triggerManual: triggerManualAutoTune,
};
