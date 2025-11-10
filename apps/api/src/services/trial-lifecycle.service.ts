// =====================================================
// TRIAL LIFECYCLE SERVICE
// Sprint 73: User Onboarding + Trial-to-Paid Conversion Automation
// =====================================================

import { supabase } from '../lib/supabaseClient';
import { logger } from './logger.service';
import { logAIEvent } from './notification.service';
import { convert_trial_to_paid } from './stripe-webhooks.service';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

// =====================================================
// TYPES
// =====================================================

export interface TrialExpiryCandidate {
  organizationId: string;
  trialExpiresAt: Date;
  hoursRemaining: number;
  budgetRemaining: number;
}

export interface GracePeriodOrganization {
  organizationId: string;
  gracePeriodEndsAt: Date;
  hoursRemaining: number;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// =====================================================
// TRIAL EXPIRY DETECTION
// =====================================================

/**
 * Get trials expiring soon (within 24 hours)
 */
export async function getExpiringTrials(hoursThreshold = 24): Promise<TrialExpiryCandidate[]> {
  try {
    const { data, error } = await supabase.rpc('get_expiring_trials', {
      hours_threshold: hoursThreshold,
    });

    if (error) {
      throw error;
    }

    return (data || []).map((row: any) => ({
      organizationId: row.organization_id,
      trialExpiresAt: new Date(row.trial_expires_at),
      hoursRemaining: parseFloat(row.hours_remaining),
      budgetRemaining: parseFloat(row.budget_remaining),
    }));
  } catch (err: any) {
    logger.error('Failed to get expiring trials', { error: err.message });
    throw err;
  }
}

/**
 * Get organizations in grace period
 */
export async function getGracePeriodOrganizations(): Promise<GracePeriodOrganization[]> {
  try {
    const { data, error } = await supabase.rpc('get_grace_period_organizations');

    if (error) {
      throw error;
    }

    return (data || []).map((row: any) => ({
      organizationId: row.organization_id,
      gracePeriodEndsAt: new Date(row.grace_period_ends_at),
      hoursRemaining: parseFloat(row.hours_remaining),
    }));
  } catch (err: any) {
    logger.error('Failed to get grace period organizations', { error: err.message });
    throw err;
  }
}

/**
 * Expire trial for organization
 */
export async function expireTrial(
  organizationId: string,
  reason: 'time_limit' | 'budget_limit' | 'manual' = 'time_limit'
): Promise<void> {
  try {
    logger.warn('Expiring trial', { organizationId, reason });

    const { error } = await supabase.rpc('expire_trial', {
      org_id: organizationId,
      expiry_reason: reason,
    });

    if (error) {
      throw error;
    }

    // Log trial expiry event
    await logAIEvent({
      organizationId,
      eventType: 'trial_expired',
      severity: 'warning',
      title: 'Trial Expired',
      message: `Trial period has ended: ${reason}`,
      metadata: { reason },
    });

    logger.warn('Trial expired', { organizationId, reason });
  } catch (err: any) {
    logger.error('Failed to expire trial', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * End grace period for organization
 */
export async function endGracePeriod(organizationId: string): Promise<void> {
  try {
    logger.warn('Ending grace period', { organizationId });

    const { error } = await supabase.rpc('end_grace_period', {
      org_id: organizationId,
    });

    if (error) {
      throw error;
    }

    // Log grace period end
    await logAIEvent({
      organizationId,
      eventType: 'grace_period_ended',
      severity: 'critical',
      title: 'Grace Period Ended',
      message: 'Trial grace period has ended - account restricted',
      metadata: {},
    });

    logger.warn('Grace period ended', { organizationId });
  } catch (err: any) {
    logger.error('Failed to end grace period', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}

// =====================================================
// BUDGET TRACKING
// =====================================================

/**
 * Update trial budget usage (called after each AI request)
 */
export async function updateTrialBudgetUsage(
  organizationId: string,
  costIncrement: number
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_trial_budget_usage', {
      org_id: organizationId,
      cost_increment: costIncrement,
    });

    if (error) {
      throw error;
    }

    // Check if budget warning thresholds crossed
    const { data: status } = await supabase.rpc('get_trial_status', {
      org_id: organizationId,
    });

    if (status && status.length > 0) {
      const budgetUsedPercent = parseFloat(status[0].budget_used_percent);

      // Log warning at 80% budget
      if (budgetUsedPercent >= 80 && budgetUsedPercent < 95) {
        await logAIEvent({
          organizationId,
          eventType: 'limit_warning_80',
          severity: 'warning',
          title: 'Trial Budget Warning',
          message: `${budgetUsedPercent.toFixed(0)}% of trial budget used`,
          metadata: { budgetUsedPercent },
        });
      }

      // Log critical warning at 95% budget
      if (budgetUsedPercent >= 95 && budgetUsedPercent < 100) {
        await logAIEvent({
          organizationId,
          eventType: 'limit_warning_95',
          severity: 'error',
          title: 'Trial Budget Critical',
          message: `${budgetUsedPercent.toFixed(0)}% of trial budget used - upgrade soon`,
          metadata: { budgetUsedPercent },
        });
      }
    }
  } catch (err: any) {
    logger.error('Failed to update trial budget usage', {
      organizationId,
      error: err.message,
    });
  }
}

// =====================================================
// EMAIL NOTIFICATIONS
// =====================================================

/**
 * Send trial email via Mailgun
 */
async function sendTrialEmail(
  to: string,
  template: EmailTemplate
): Promise<void> {
  if (!process.env.ONBOARDING_EMAILS_ENABLED || process.env.ONBOARDING_EMAILS_ENABLED !== 'true') {
    logger.info('Trial emails disabled, skipping send', { to });
    return;
  }

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    logger.warn('Mailgun not configured, skipping email', { to });
    return;
  }

  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: `Pravado <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: [to],
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    logger.info('Trial email sent', { to, subject: template.subject });
  } catch (err: any) {
    logger.error('Failed to send trial email', {
      to,
      error: err.message,
    });
  }
}

/**
 * Send trial day 1 email
 */
export async function sendTrialDay1Email(organizationId: string): Promise<void> {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('billing_email')
      .eq('organization_id', organizationId)
      .single();

    if (!customer?.billing_email) {
      logger.warn('No billing email found for trial day 1', { organizationId });
      return;
    }

    const template: EmailTemplate = {
      subject: 'Welcome to Your Pravado Trial',
      text: `Welcome to Pravado!\n\nYour 7-day trial has started. You have $2.00 of AI credits to explore our platform.\n\nGet started:\n1. Complete the onboarding wizard\n2. Set up your first AI agent\n3. Run a test campaign\n\nQuestions? Reply to this email.\n\n- The Pravado Team`,
      html: `<h2>Welcome to Pravado!</h2><p>Your 7-day trial has started. You have <strong>$2.00</strong> of AI credits to explore our platform.</p><h3>Get Started:</h3><ol><li>Complete the onboarding wizard</li><li>Set up your first AI agent</li><li>Run a test campaign</li></ol><p>Questions? Reply to this email.</p><p>- The Pravado Team</p>`,
    };

    await sendTrialEmail(customer.billing_email, template);

    await supabase
      .from('onboarding_state')
      .update({ trial_day_1_email_sent: true })
      .eq('organization_id', organizationId);
  } catch (err: any) {
    logger.error('Failed to send trial day 1 email', {
      organizationId,
      error: err.message,
    });
  }
}

/**
 * Send trial day 3 email
 */
export async function sendTrialDay3Email(organizationId: string): Promise<void> {
  try {
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('billing_email')
      .eq('organization_id', organizationId)
      .single();

    if (!customer?.billing_email) return;

    const template: EmailTemplate = {
      subject: 'Pravado Trial - Day 3: Tips for Success',
      text: `You're halfway through your Pravado trial!\n\nHere are some tips:\n- Check your AI usage dashboard\n- Review generated content quality\n- Try different agent configurations\n\n4 days remaining. Upgrade anytime to unlock full features.\n\n- The Pravado Team`,
      html: `<h2>You're halfway through your Pravado trial!</h2><p>Here are some tips:</p><ul><li>Check your AI usage dashboard</li><li>Review generated content quality</li><li>Try different agent configurations</li></ul><p><strong>4 days remaining.</strong> Upgrade anytime to unlock full features.</p><p>- The Pravado Team</p>`,
    };

    await sendTrialEmail(customer.billing_email, template);

    await supabase
      .from('onboarding_state')
      .update({ trial_day_3_email_sent: true })
      .eq('organization_id', organizationId);
  } catch (err: any) {
    logger.error('Failed to send trial day 3 email', {
      organizationId,
      error: err.message,
    });
  }
}

/**
 * Send trial day 7 email
 */
export async function sendTrialDay7Email(organizationId: string): Promise<void> {
  try {
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('billing_email')
      .eq('organization_id', organizationId)
      .single();

    if (!customer?.billing_email) return;

    const template: EmailTemplate = {
      subject: 'Pravado Trial Ending - Upgrade to Continue',
      text: `Your Pravado trial ends today!\n\nUpgrade now to:\n- Keep your AI agents running\n- Unlock unlimited usage\n- Access premium models\n\nUpgrade: [Link]\n\nQuestions? We're here to help.\n\n- The Pravado Team`,
      html: `<h2>Your Pravado trial ends today!</h2><p>Upgrade now to:</p><ul><li>Keep your AI agents running</li><li>Unlock unlimited usage</li><li>Access premium models</li></ul><p><a href="${process.env.API_URL}/onboarding/upgrade">Upgrade Now</a></p><p>Questions? We're here to help.</p><p>- The Pravado Team</p>`,
    };

    await sendTrialEmail(customer.billing_email, template);

    await supabase
      .from('onboarding_state')
      .update({ trial_day_7_email_sent: true })
      .eq('organization_id', organizationId);
  } catch (err: any) {
    logger.error('Failed to send trial day 7 email', {
      organizationId,
      error: err.message,
    });
  }
}

/**
 * Send trial expired email
 */
export async function sendTrialExpiredEmail(organizationId: string): Promise<void> {
  try {
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('billing_email')
      .eq('organization_id', organizationId)
      .single();

    if (!customer?.billing_email) return;

    const template: EmailTemplate = {
      subject: 'Pravado Trial Expired - 24 Hour Grace Period',
      text: `Your Pravado trial has expired.\n\nYou have 24 hours of grace period access. After that, new AI jobs will be disabled until you upgrade.\n\nUpgrade now: [Link]\n\nNeed help? Contact support.\n\n- The Pravado Team`,
      html: `<h2>Your Pravado trial has expired</h2><p>You have <strong>24 hours of grace period</strong> access. After that, new AI jobs will be disabled until you upgrade.</p><p><a href="${process.env.API_URL}/onboarding/upgrade">Upgrade Now</a></p><p>Need help? Contact support.</p><p>- The Pravado Team</p>`,
    };

    await sendTrialEmail(customer.billing_email, template);

    await supabase
      .from('onboarding_state')
      .update({ trial_expired_email_sent: true })
      .eq('organization_id', organizationId);
  } catch (err: any) {
    logger.error('Failed to send trial expired email', {
      organizationId,
      error: err.message,
    });
  }
}

// =====================================================
// MARKETING WEBHOOKS
// =====================================================

/**
 * Send trial event to Zapier/HubSpot
 */
export async function sendMarketingWebhook(
  eventType: string,
  organizationId: string,
  data: Record<string, any>
): Promise<void> {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.debug('Zapier webhook not configured, skipping', { eventType });
    return;
  }

  try {
    const payload = {
      event: eventType,
      organizationId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    logger.info('Marketing webhook sent', { eventType, organizationId });
  } catch (err: any) {
    logger.error('Failed to send marketing webhook', {
      eventType,
      organizationId,
      error: err.message,
    });
  }
}

/**
 * Track trial conversion
 */
export async function trackTrialConversion(
  organizationId: string,
  tier: string
): Promise<void> {
  try {
    // Mark as converted in database
    await supabase.rpc('convert_trial_to_paid', {
      org_id: organizationId,
      new_tier: tier,
    });

    // Send marketing webhook
    await sendMarketingWebhook('trial_converted', organizationId, {
      tier,
      conversionDate: new Date().toISOString(),
    });

    logger.info('Trial conversion tracked', { organizationId, tier });
  } catch (err: any) {
    logger.error('Failed to track trial conversion', {
      organizationId,
      error: err.message,
    });
  }
}

// =====================================================
// TRIAL LIFECYCLE CHECKS
// =====================================================

/**
 * Check if organization can execute new jobs
 */
export async function canExecuteTrialJob(organizationId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    const { data: state } = await supabase
      .from('onboarding_state')
      .select('trial_expired, in_grace_period, trial_budget_exhausted')
      .eq('organization_id', organizationId)
      .single();

    if (!state) {
      // No onboarding state means not on trial, allow
      return { allowed: true };
    }

    // Check if trial expired and grace period ended
    if (state.trial_expired && !state.in_grace_period) {
      return {
        allowed: false,
        reason: 'Trial expired - please upgrade to continue',
      };
    }

    // Check if budget exhausted
    if (state.trial_budget_exhausted) {
      return {
        allowed: false,
        reason: 'Trial budget exhausted - please upgrade to continue',
      };
    }

    return { allowed: true };
  } catch (err: any) {
    logger.error('Failed to check trial job execution', {
      organizationId,
      error: err.message,
    });
    return { allowed: true }; // Fail open
  }
}
