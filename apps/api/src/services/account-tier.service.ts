// =====================================================
// ACCOUNT TIER SERVICE
// Sprint 72: Automated Billing & Revenue Operations Integration
// Sprint 75: Validated Pricing Rollout (Balanced Model - 4 tiers)
// =====================================================

import { supabase } from '../lib/supabaseClient';
import { logger } from './logger.service';
import { logAIEvent } from './notification.service';

// =====================================================
// TYPES
// =====================================================

export type PlanTier = 'starter' | 'pro' | 'premium' | 'enterprise';
export type LegacyPlanTier = 'trial' | 'pro' | 'enterprise'; // Backward compatibility

export interface TierLimits {
  maxDailyCost: number;
  maxRequestCost: number;
  maxTokensIn: number;
  maxTokensOut: number;
  maxConcurrentJobs: number;
  allowedProviders: string[];
  cacheTTLHours: number;
}

export interface OrganizationTierInfo {
  organizationId: string;
  planTier: PlanTier;
  subscriptionStatus: string | null;
  paymentStatus: string;
  failedPaymentCount: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

// =====================================================
// STRIPE PRICE ID MAPPING (Sprint 75)
// =====================================================

/**
 * Map Stripe price ID to plan tier
 * Uses environment variables for Stripe price IDs from Balanced Model pricing
 */
export function mapStripePriceToTier(stripePriceId: string): PlanTier | null {
  const priceMap: Record<string, PlanTier> = {
    // Monthly prices
    [process.env.STRIPE_PRICE_STARTER || '']: 'starter',
    [process.env.STRIPE_PRICE_PRO || '']: 'pro',
    [process.env.STRIPE_PRICE_PREMIUM || '']: 'premium',
    [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise',

    // Annual prices
    [process.env.STRIPE_PRICE_STARTER_ANNUAL || '']: 'starter',
    [process.env.STRIPE_PRICE_PRO_ANNUAL || '']: 'pro',
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '']: 'premium',
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || '']: 'enterprise',
  };

  return priceMap[stripePriceId] || null;
}

/**
 * Map plan tier to Stripe price IDs
 */
export function mapTierToStripePrices(tier: PlanTier): {
  monthly: string | undefined;
  annual: string | undefined;
} {
  const tierPriceMap: Record<PlanTier, { monthly: string | undefined; annual: string | undefined }> = {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER,
      annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO,
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    },
    premium: {
      monthly: process.env.STRIPE_PRICE_PREMIUM,
      annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    },
    enterprise: {
      monthly: process.env.STRIPE_PRICE_ENTERPRISE,
      annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
    },
  };

  return tierPriceMap[tier];
}

/**
 * Check if a Stripe price ID is for annual billing
 */
export function isAnnualPrice(stripePriceId: string): boolean {
  const annualPrices = [
    process.env.STRIPE_PRICE_STARTER_ANNUAL,
    process.env.STRIPE_PRICE_PRO_ANNUAL,
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  ].filter(Boolean);

  return annualPrices.includes(stripePriceId);
}

// =====================================================
// TIER LIMITS CONFIGURATION
// =====================================================

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  starter: {
    maxDailyCost: 5.0, // $149/mo plan can handle more daily cost
    maxRequestCost: 0.05,
    maxTokensIn: 4000,
    maxTokensOut: 2000,
    maxConcurrentJobs: 2,
    allowedProviders: ['openai'], // gpt-4o-mini primarily
    cacheTTLHours: 12,
  },
  pro: {
    maxDailyCost: 100.0, // $599/mo plan
    maxRequestCost: 0.5,
    maxTokensIn: 8000,
    maxTokensOut: 4000,
    maxConcurrentJobs: 10,
    allowedProviders: ['openai', 'anthropic'],
    cacheTTLHours: 24,
  },
  premium: {
    maxDailyCost: 500.0, // $1,499/mo plan
    maxRequestCost: 1.0,
    maxTokensIn: 12000,
    maxTokensOut: 6000,
    maxConcurrentJobs: 25,
    allowedProviders: ['openai', 'anthropic'],
    cacheTTLHours: 48,
  },
  enterprise: {
    maxDailyCost: 2000.0, // $5,000+/mo plan
    maxRequestCost: 5.0,
    maxTokensIn: 32000,
    maxTokensOut: 16000,
    maxConcurrentJobs: 100,
    allowedProviders: ['openai', 'anthropic'],
    cacheTTLHours: 72,
  },
};

// =====================================================
// TIER RETRIEVAL & VALIDATION
// =====================================================

/**
 * Get tier limits for plan tier
 */
export function getTierLimits(planTier: PlanTier): TierLimits {
  return TIER_LIMITS[planTier] || TIER_LIMITS.starter;
}

/**
 * Get tier hierarchy for upgrade/downgrade paths
 */
export function getTierHierarchy(): PlanTier[] {
  return ['starter', 'pro', 'premium', 'enterprise'];
}

/**
 * Get next tier in upgrade path
 */
export function getNextTier(currentTier: PlanTier): PlanTier | null {
  const hierarchy = getTierHierarchy();
  const currentIndex = hierarchy.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === hierarchy.length - 1) {
    return null; // Already at highest tier
  }

  return hierarchy[currentIndex + 1];
}

/**
 * Get previous tier in downgrade path
 */
export function getPreviousTier(currentTier: PlanTier): PlanTier | null {
  const hierarchy = getTierHierarchy();
  const currentIndex = hierarchy.indexOf(currentTier);

  if (currentIndex <= 0) {
    return null; // Already at lowest tier
  }

  return hierarchy[currentIndex - 1];
}

/**
 * Get organization tier info
 */
export async function getOrganizationTier(
  organizationId: string
): Promise<OrganizationTierInfo | null> {
  try {
    // Get organization plan tier
    const { data: org } = await supabase
      .from('organizations')
      .select('plan_tier')
      .eq('id', organizationId)
      .single();

    if (!org) {
      logger.warn('Organization not found', { organizationId });
      return null;
    }

    // Get Stripe customer info
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    return {
      organizationId,
      planTier: (org.plan_tier as PlanTier) || 'trial',
      subscriptionStatus: customer?.subscription_status || null,
      paymentStatus: customer?.payment_status || 'current',
      failedPaymentCount: customer?.failed_payment_count || 0,
      stripeCustomerId: customer?.stripe_customer_id || null,
      stripeSubscriptionId: customer?.stripe_subscription_id || null,
    };
  } catch (err: any) {
    logger.error('Failed to get organization tier', {
      organizationId,
      error: err.message,
    });
    return null;
  }
}

/**
 * Check if organization can execute request based on tier limits
 */
export async function canExecuteRequest(
  organizationId: string,
  estimatedCost: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const tierInfo = await getOrganizationTier(organizationId);
    if (!tierInfo) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const limits = getTierLimits(tierInfo.planTier);

    // Check payment status
    if (tierInfo.paymentStatus === 'delinquent') {
      return {
        allowed: false,
        reason: 'Account is delinquent - payment required',
      };
    }

    if (tierInfo.paymentStatus === 'canceled') {
      return {
        allowed: false,
        reason: 'Account subscription canceled',
      };
    }

    // Check request cost limit
    if (estimatedCost > limits.maxRequestCost) {
      return {
        allowed: false,
        reason: `Request cost $${estimatedCost.toFixed(4)} exceeds tier limit $${limits.maxRequestCost}`,
      };
    }

    // Check daily cost limit
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsage } = await supabase
      .from('billing_usage_ledger')
      .select('total_cost_usd')
      .eq('organization_id', organizationId)
      .eq('date', today)
      .single();

    const currentDailyCost = todayUsage?.total_cost_usd || 0;
    if (currentDailyCost + estimatedCost > limits.maxDailyCost) {
      return {
        allowed: false,
        reason: `Daily budget limit reached ($${limits.maxDailyCost})`,
      };
    }

    return { allowed: true };
  } catch (err: any) {
    logger.error('Failed to check request execution', {
      organizationId,
      error: err.message,
    });
    return { allowed: false, reason: 'Internal error checking limits' };
  }
}

// =====================================================
// TIER UPGRADES & DOWNGRADES
// =====================================================

/**
 * Upgrade organization tier
 */
export async function upgradeTier(
  organizationId: string,
  newTier: PlanTier,
  reason: string
): Promise<boolean> {
  try {
    const currentTierInfo = await getOrganizationTier(organizationId);
    if (!currentTierInfo) {
      throw new Error('Organization not found');
    }

    const oldTier = currentTierInfo.planTier;

    // Validate upgrade path
    const tierOrder: PlanTier[] = ['starter', 'pro', 'premium', 'enterprise'];
    if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(oldTier)) {
      logger.warn('Invalid upgrade path', { oldTier, newTier });
      return false;
    }

    // Update organization tier using helper function
    await supabase.rpc('sync_plan_tier_from_stripe', {
      org_id: organizationId,
      new_tier: newTier,
    });

    logger.info('Upgraded organization tier', {
      organizationId,
      oldTier,
      newTier,
      reason,
    });

    // Log upgrade event
    await logAIEvent({
      organizationId,
      eventType: 'plan_upgraded',
      severity: 'info',
      title: 'Plan Upgraded',
      message: `Plan upgraded from ${oldTier} to ${newTier}: ${reason}`,
      metadata: {
        oldTier,
        newTier,
        reason,
      },
    });

    return true;
  } catch (err: any) {
    logger.error('Failed to upgrade tier', {
      organizationId,
      newTier,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Downgrade organization tier
 */
export async function downgradeTier(
  organizationId: string,
  newTier: PlanTier,
  reason: string
): Promise<boolean> {
  try {
    const currentTierInfo = await getOrganizationTier(organizationId);
    if (!currentTierInfo) {
      throw new Error('Organization not found');
    }

    const oldTier = currentTierInfo.planTier;

    // Validate downgrade path
    const tierOrder: PlanTier[] = ['starter', 'pro', 'premium', 'enterprise'];
    if (tierOrder.indexOf(newTier) >= tierOrder.indexOf(oldTier)) {
      logger.warn('Invalid downgrade path', { oldTier, newTier });
      return false;
    }

    // Update organization tier using helper function
    await supabase.rpc('sync_plan_tier_from_stripe', {
      org_id: organizationId,
      new_tier: newTier,
    });

    logger.warn('Downgraded organization tier', {
      organizationId,
      oldTier,
      newTier,
      reason,
    });

    // Log downgrade event
    await logAIEvent({
      organizationId,
      eventType: 'plan_downgraded',
      severity: 'warning',
      title: 'Plan Downgraded',
      message: `Plan downgraded from ${oldTier} to ${newTier}: ${reason}`,
      metadata: {
        oldTier,
        newTier,
        reason,
      },
    });

    return true;
  } catch (err: any) {
    logger.error('Failed to downgrade tier', {
      organizationId,
      newTier,
      error: err.message,
    });
    throw err;
  }
}

// =====================================================
// AUTOMATIC TIER MANAGEMENT
// =====================================================

/**
 * Handle payment failure - downgrade if threshold exceeded
 */
export async function handlePaymentFailure(organizationId: string): Promise<void> {
  try {
    const tierInfo = await getOrganizationTier(organizationId);
    if (!tierInfo) {
      logger.warn('Organization not found for payment failure handling', { organizationId });
      return;
    }

    // If 3+ failed payments and not already on starter, downgrade to starter
    if (tierInfo.failedPaymentCount >= 3 && tierInfo.planTier !== 'starter') {
      await downgradeTier(
        organizationId,
        'starter',
        `${tierInfo.failedPaymentCount} consecutive payment failures`
      );

      logger.warn('Auto-downgraded to starter after failed payments', {
        organizationId,
        failedCount: tierInfo.failedPaymentCount,
      });

      // Log critical event
      await logAIEvent({
        organizationId,
        eventType: 'plan_downgraded',
        severity: 'critical',
        title: 'Account Downgraded - Payment Failures',
        message: `Account downgraded to starter after ${tierInfo.failedPaymentCount} failed payments`,
        metadata: {
          failedPaymentCount: tierInfo.failedPaymentCount,
          oldTier: tierInfo.planTier,
          newTier: 'starter',
        },
      });
    }
  } catch (err: any) {
    logger.error('Failed to handle payment failure', {
      organizationId,
      error: err.message,
    });
  }
}

/**
 * Handle successful payment - upgrade tier if eligible
 */
export async function handlePaymentSuccess(
  organizationId: string,
  planTier?: PlanTier
): Promise<void> {
  try {
    const tierInfo = await getOrganizationTier(organizationId);
    if (!tierInfo) {
      logger.warn('Organization not found for payment success handling', { organizationId });
      return;
    }

    // If tier specified and different from current, upgrade
    if (planTier && planTier !== tierInfo.planTier) {
      await upgradeTier(organizationId, planTier, 'Successful payment for new plan');

      logger.info('Auto-upgraded tier after successful payment', {
        organizationId,
        oldTier: tierInfo.planTier,
        newTier: planTier,
      });
    }
  } catch (err: any) {
    logger.error('Failed to handle payment success', {
      organizationId,
      error: err.message,
    });
  }
}

/**
 * Check and enforce tier limits for all organizations
 * Run as daily cron job
 */
export async function enforceAllTierLimits(): Promise<{
  checked: number;
  downgraded: number;
}> {
  try {
    logger.info('Starting tier limits enforcement');

    // Get all organizations with failed payments or delinquent status
    const { data: delinquentCustomers } = await supabase
      .from('stripe_customers')
      .select('organization_id, failed_payment_count, payment_status, plan_tier')
      .or('failed_payment_count.gte.3,payment_status.eq.delinquent')
      .neq('plan_tier', 'starter');

    if (!delinquentCustomers || delinquentCustomers.length === 0) {
      logger.info('No organizations need enforcement');
      return { checked: 0, downgraded: 0 };
    }

    let downgraded = 0;
    for (const customer of delinquentCustomers) {
      try {
        await handlePaymentFailure(customer.organization_id);
        downgraded++;
      } catch (err: any) {
        logger.error('Failed to enforce tier limits for organization', {
          organizationId: customer.organization_id,
          error: err.message,
        });
      }
    }

    logger.info('Tier limits enforcement completed', {
      checked: delinquentCustomers.length,
      downgraded,
    });

    return {
      checked: delinquentCustomers.length,
      downgraded,
    };
  } catch (err: any) {
    logger.error('Failed to enforce tier limits', { error: err.message });
    throw err;
  }
}

// =====================================================
// TIER ANALYTICS
// =====================================================

/**
 * Get tier distribution across all organizations
 */
export async function getTierDistribution(): Promise<Record<PlanTier, number>> {
  try {
    const { data, error } = await supabase.rpc('get_plan_tier_distribution');

    if (error) {
      logger.error('Failed to get tier distribution', { error: error.message });
      throw error;
    }

    // Convert array to record
    const distribution: Record<string, number> = {
      starter: 0,
      pro: 0,
      premium: 0,
      enterprise: 0,
    };

    (data || []).forEach((row: any) => {
      distribution[row.plan_tier] = parseInt(row.count);
    });

    return distribution as Record<PlanTier, number>;
  } catch (err: any) {
    logger.error('Failed to get tier distribution', { error: err.message });
    throw err;
  }
}

/**
 * Get organizations at risk of downgrade
 */
export async function getOrganizationsAtRisk(): Promise<
  Array<{
    organizationId: string;
    planTier: string;
    failedPaymentCount: number;
    paymentStatus: string;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('organization_id, plan_tier, failed_payment_count, payment_status')
      .gte('failed_payment_count', 2)
      .neq('plan_tier', 'starter')
      .order('failed_payment_count', { ascending: false });

    if (error) {
      logger.error('Failed to get organizations at risk', { error: error.message });
      throw error;
    }

    return (data || []).map((row) => ({
      organizationId: row.organization_id,
      planTier: row.plan_tier,
      failedPaymentCount: row.failed_payment_count,
      paymentStatus: row.payment_status,
    }));
  } catch (err: any) {
    logger.error('Failed to get organizations at risk', { error: err.message });
    throw err;
  }
}

/**
 * Get organization usage vs tier limits
 */
export async function getUsageVsLimits(
  organizationId: string
): Promise<{
  planTier: PlanTier;
  limits: TierLimits;
  currentUsage: {
    dailyCost: number;
    dailyRequests: number;
  };
  utilization: {
    costPercent: number;
    requestsPercent: number;
  };
}> {
  try {
    const tierInfo = await getOrganizationTier(organizationId);
    if (!tierInfo) {
      throw new Error('Organization not found');
    }

    const limits = getTierLimits(tierInfo.planTier);

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsage } = await supabase
      .from('billing_usage_ledger')
      .select('total_cost_usd, total_requests')
      .eq('organization_id', organizationId)
      .eq('date', today)
      .single();

    const dailyCost = todayUsage?.total_cost_usd || 0;
    const dailyRequests = todayUsage?.total_requests || 0;

    return {
      planTier: tierInfo.planTier,
      limits,
      currentUsage: {
        dailyCost,
        dailyRequests,
      },
      utilization: {
        costPercent: (dailyCost / limits.maxDailyCost) * 100,
        requestsPercent: 0, // No request limit, just cost
      },
    };
  } catch (err: any) {
    logger.error('Failed to get usage vs limits', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}
