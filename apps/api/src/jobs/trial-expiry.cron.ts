// =====================================================
// TRIAL EXPIRY CRON JOB
// Sprint 73: User Onboarding + Trial-to-Paid Conversion Automation
// =====================================================

import cron from 'node-cron';
import { logger } from '../services/logger.service';
import {
  getExpiringTrials,
  getGracePeriodOrganizations,
  expireTrial,
  endGracePeriod,
  sendTrialDay1Email,
  sendTrialDay3Email,
  sendTrialDay7Email,
  sendTrialExpiredEmail,
} from '../services/trial-lifecycle.service';
import { supabase } from '../lib/supabaseClient';

// =====================================================
// CRON JOB CONFIGURATION
// =====================================================

// Run every 6 hours to check trial expiry and send emails
const TRIAL_CHECK_CRON = '0 */6 * * *'; // Every 6 hours

// =====================================================
// JOB EXECUTION FUNCTIONS
// =====================================================

/**
 * Check and expire trials that have reached time limit
 */
async function processTrialExpiry(): Promise<{
  expired: number;
  graceEnded: number;
}> {
  try {
    logger.info('Processing trial expiry checks');

    let expired = 0;
    let graceEnded = 0;

    // Get trials that are expiring (within 24 hours)
    const expiringTrials = await getExpiringTrials(24);

    for (const trial of expiringTrials) {
      try {
        // If trial is expiring in < 1 hour, expire it now
        if (trial.hoursRemaining < 1) {
          await expireTrial(trial.organizationId, 'time_limit');
          await sendTrialExpiredEmail(trial.organizationId);
          expired++;
          logger.info('Trial expired', {
            organizationId: trial.organizationId,
            hoursRemaining: trial.hoursRemaining,
          });
        }
      } catch (err: any) {
        logger.error('Failed to expire trial', {
          organizationId: trial.organizationId,
          error: err.message,
        });
      }
    }

    // Check grace periods
    const gracePeriodOrgs = await getGracePeriodOrganizations();

    for (const org of gracePeriodOrgs) {
      try {
        // If grace period is over, end it
        if (org.hoursRemaining <= 0) {
          await endGracePeriod(org.organizationId);
          graceEnded++;
          logger.warn('Grace period ended', {
            organizationId: org.organizationId,
          });
        }
      } catch (err: any) {
        logger.error('Failed to end grace period', {
          organizationId: org.organizationId,
          error: err.message,
        });
      }
    }

    logger.info('Trial expiry processing completed', {
      expired,
      graceEnded,
      totalChecked: expiringTrials.length,
    });

    return { expired, graceEnded };
  } catch (err: any) {
    logger.error('Failed to process trial expiry', { error: err.message });
    throw err;
  }
}

/**
 * Send trial lifecycle emails based on day
 */
async function sendTrialLifecycleEmails(): Promise<{
  day1Sent: number;
  day3Sent: number;
  day7Sent: number;
}> {
  try {
    logger.info('Sending trial lifecycle emails');

    let day1Sent = 0;
    let day3Sent = 0;
    let day7Sent = 0;

    // Get all active trials
    const { data: trials, error } = await supabase
      .from('onboarding_state')
      .select('organization_id, trial_started_at, trial_day_1_email_sent, trial_day_3_email_sent, trial_day_7_email_sent, trial_expired')
      .eq('trial_expired', false);

    if (error) {
      throw error;
    }

    if (!trials) {
      logger.info('No active trials found for email sending');
      return { day1Sent: 0, day3Sent: 0, day7Sent: 0 };
    }

    const now = new Date();

    for (const trial of trials) {
      try {
        const trialStart = new Date(trial.trial_started_at);
        const daysSinceStart = Math.floor(
          (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send day 1 email (if 1 day has passed and not sent)
        if (daysSinceStart >= 1 && !trial.trial_day_1_email_sent) {
          await sendTrialDay1Email(trial.organization_id);
          day1Sent++;
        }

        // Send day 3 email (if 3 days have passed and not sent)
        if (daysSinceStart >= 3 && !trial.trial_day_3_email_sent) {
          await sendTrialDay3Email(trial.organization_id);
          day3Sent++;
        }

        // Send day 7 email (if 7 days have passed and not sent)
        if (daysSinceStart >= 7 && !trial.trial_day_7_email_sent) {
          await sendTrialDay7Email(trial.organization_id);
          day7Sent++;
        }
      } catch (err: any) {
        logger.error('Failed to send trial lifecycle email', {
          organizationId: trial.organization_id,
          error: err.message,
        });
      }
    }

    logger.info('Trial lifecycle emails sent', {
      day1Sent,
      day3Sent,
      day7Sent,
    });

    return { day1Sent, day3Sent, day7Sent };
  } catch (err: any) {
    logger.error('Failed to send trial lifecycle emails', { error: err.message });
    throw err;
  }
}

/**
 * Main trial cron job execution
 */
async function executeTrialCron(): Promise<void> {
  const startTime = Date.now();
  logger.info('=== TRIAL EXPIRY CRON JOB STARTED ===');

  try {
    // Step 1: Process trial expiry
    const expiryResult = await processTrialExpiry();

    // Step 2: Send lifecycle emails
    const emailResult = await sendTrialLifecycleEmails();

    const duration = Date.now() - startTime;

    logger.info('=== TRIAL EXPIRY CRON JOB COMPLETED ===', {
      duration: `${duration}ms`,
      trialsExpired: expiryResult.expired,
      gracePeriodsEnded: expiryResult.graceEnded,
      day1EmailsSent: emailResult.day1Sent,
      day3EmailsSent: emailResult.day3Sent,
      day7EmailsSent: emailResult.day7Sent,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;

    logger.error('=== TRIAL EXPIRY CRON JOB FAILED ===', {
      duration: `${duration}ms`,
      error: err.message,
      stack: err.stack,
    });

    throw err;
  }
}

// =====================================================
// CRON JOB SCHEDULING
// =====================================================

/**
 * Start the trial expiry cron job
 */
export function startTrialExpiryCron(): void {
  logger.info('Scheduling trial expiry cron job', {
    schedule: TRIAL_CHECK_CRON,
    timezone: 'UTC',
  });

  cron.schedule(
    TRIAL_CHECK_CRON,
    async () => {
      try {
        await executeTrialCron();
      } catch (err: any) {
        logger.error('Trial expiry cron job execution failed', {
          error: err.message,
        });
      }
    },
    {
      scheduled: true,
      timezone: 'UTC',
    }
  );

  logger.info('Trial expiry cron job scheduled successfully');
}

/**
 * Manually trigger trial expiry cron (for testing/admin)
 */
export async function triggerTrialExpiryCronManually(): Promise<void> {
  logger.warn('Manually triggering trial expiry cron job');
  await executeTrialCron();
}

// =====================================================
// EXPORT
// =====================================================

export default {
  start: startTrialExpiryCron,
  trigger: triggerTrialExpiryCronManually,
};
