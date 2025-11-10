// =====================================================
// STRIPE WEBHOOKS SERVICE
// Sprint 72: Automated Billing & Revenue Operations Integration
// =====================================================

import Stripe from 'stripe';
import { supabase } from '../lib/supabaseClient';
import { logger } from './logger.service';
import { logAIEvent } from './notification.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// =====================================================
// TYPES
// =====================================================

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface StripeCustomerRecord {
  id: string;
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  planTier: string;
  paymentStatus: string;
}

// =====================================================
// WEBHOOK SIGNATURE VERIFICATION
// =====================================================

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err: any) {
    logger.error('Webhook signature verification failed', { error: err.message });
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}

// =====================================================
// EVENT STORAGE
// =====================================================

/**
 * Store webhook event in database for idempotency and audit
 */
async function storeWebhookEvent(event: Stripe.Event): Promise<boolean> {
  try {
    // Extract related IDs from event
    const eventData = event.data.object as any;
    const stripeCustomerId = eventData.customer || eventData.id;
    const stripeSubscriptionId = eventData.subscription || null;
    const stripeInvoiceId = eventData.invoice || eventData.id;

    // Try to find organization from customer mapping
    let organizationId: string | null = null;
    if (stripeCustomerId) {
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('organization_id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      organizationId = customer?.organization_id || null;
    }

    const { error } = await supabase.from('stripe_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_invoice_id: event.type.startsWith('invoice.') ? stripeInvoiceId : null,
      organization_id: organizationId,
      event_data: event as any,
      processed: false,
    });

    if (error) {
      // If duplicate (UNIQUE constraint), that's okay - event already stored
      if (error.code === '23505') {
        logger.info('Webhook event already stored (duplicate)', { eventId: event.id });
        return false; // Don't process again
      }
      throw error;
    }

    logger.info('Stored webhook event', { eventId: event.id, type: event.type });
    return true;
  } catch (err: any) {
    logger.error('Failed to store webhook event', { eventId: event.id, error: err.message });
    throw err;
  }
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(eventId: string, error?: string): Promise<void> {
  try {
    await supabase
      .from('stripe_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_error: error || null,
      })
      .eq('stripe_event_id', eventId);

    logger.info('Marked event as processed', { eventId, hasError: !!error });
  } catch (err: any) {
    logger.error('Failed to mark event as processed', { eventId, error: err.message });
  }
}

// =====================================================
// WEBHOOK EVENT HANDLERS
// =====================================================

/**
 * Handle invoice.paid event
 * Mark usage as billed, log success event
 */
async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  logger.info('Processing invoice.paid', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid,
  });

  try {
    // Get organization from customer mapping
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('organization_id, plan_tier')
      .eq('stripe_customer_id', invoice.customer as string)
      .single();

    if (!customer) {
      logger.warn('No customer mapping found for invoice', { customerId: invoice.customer });
      return;
    }

    // Store invoice record
    await supabase.from('stripe_invoices').upsert({
      organization_id: customer.organization_id,
      stripe_customer_id: invoice.customer as string,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription as string,
      amount_due: invoice.amount_due / 100, // Convert cents to dollars
      amount_paid: invoice.amount_paid / 100,
      amount_remaining: invoice.amount_remaining / 100,
      currency: invoice.currency,
      status: invoice.status || 'paid',
      paid: invoice.paid || false,
      invoice_date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paid_at: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      invoice_pdf: invoice.invoice_pdf || null,
      hosted_invoice_url: invoice.hosted_invoice_url || null,
    });

    // Mark usage as billed using helper function
    if (invoice.period_start && invoice.period_end) {
      const startDate = new Date(invoice.period_start * 1000).toISOString().split('T')[0];
      const endDate = new Date(invoice.period_end * 1000).toISOString().split('T')[0];

      await supabase.rpc('mark_usage_billed', {
        org_id: customer.organization_id,
        start_date: startDate,
        end_date: endDate,
        invoice_id: invoice.id,
      });

      logger.info('Marked usage as billed', {
        organizationId: customer.organization_id,
        startDate,
        endDate,
        invoiceId: invoice.id,
      });
    }

    // Update customer payment status to current
    await supabase.rpc('update_customer_payment_status', {
      customer_id: invoice.customer as string,
      new_status: 'current',
    });

    // Update last payment info
    await supabase
      .from('stripe_customers')
      .update({
        last_payment_date: new Date().toISOString(),
        last_payment_amount: invoice.amount_paid / 100,
      })
      .eq('stripe_customer_id', invoice.customer as string);

    // Log success event
    await logAIEvent({
      organizationId: customer.organization_id,
      eventType: 'payment_success',
      severity: 'info',
      title: 'Payment Successful',
      message: `Invoice ${invoice.number} paid successfully for $${(invoice.amount_paid / 100).toFixed(2)}`,
      metadata: {
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        planTier: customer.plan_tier,
      },
    });

    logger.info('Invoice paid processed successfully', {
      organizationId: customer.organization_id,
      invoiceId: invoice.id,
    });
  } catch (err: any) {
    logger.error('Failed to process invoice.paid', { error: err.message, invoiceId: invoice.id });
    throw err;
  }
}

/**
 * Handle invoice.payment_failed event
 * Increment failed payment count, log failure, trigger notification
 */
async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  logger.warn('Processing invoice.payment_failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    attempt: invoice.attempt_count,
  });

  try {
    // Get organization from customer mapping
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('organization_id, plan_tier, failed_payment_count')
      .eq('stripe_customer_id', invoice.customer as string)
      .single();

    if (!customer) {
      logger.warn('No customer mapping found for failed payment', { customerId: invoice.customer });
      return;
    }

    // Update payment status to past_due
    await supabase.rpc('update_customer_payment_status', {
      customer_id: invoice.customer as string,
      new_status: 'past_due',
    });

    // Get updated failed payment count
    const { data: updatedCustomer } = await supabase
      .from('stripe_customers')
      .select('failed_payment_count')
      .eq('stripe_customer_id', invoice.customer as string)
      .single();

    const failedCount = updatedCustomer?.failed_payment_count || 0;

    // If 3+ failed payments, mark as delinquent
    if (failedCount >= 3) {
      await supabase
        .from('stripe_customers')
        .update({ payment_status: 'delinquent' })
        .eq('stripe_customer_id', invoice.customer as string);

      logger.error('Customer marked as delinquent', {
        organizationId: customer.organization_id,
        failedCount,
      });
    }

    // Store invoice record
    await supabase.from('stripe_invoices').upsert({
      organization_id: customer.organization_id,
      stripe_customer_id: invoice.customer as string,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription as string,
      amount_due: invoice.amount_due / 100,
      amount_paid: invoice.amount_paid / 100,
      amount_remaining: invoice.amount_remaining / 100,
      currency: invoice.currency,
      status: invoice.status || 'open',
      paid: false,
      invoice_date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      invoice_pdf: invoice.invoice_pdf || null,
      hosted_invoice_url: invoice.hosted_invoice_url || null,
    });

    // Log critical event for failed payment
    await logAIEvent({
      organizationId: customer.organization_id,
      eventType: 'payment_failed',
      severity: failedCount >= 3 ? 'critical' : 'error',
      title: 'Payment Failed',
      message: `Payment failed for invoice ${invoice.number}. Failed payment count: ${failedCount}`,
      metadata: {
        invoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        failedCount,
        planTier: customer.plan_tier,
      },
    });

    logger.warn('Invoice payment failed processed', {
      organizationId: customer.organization_id,
      invoiceId: invoice.id,
      failedCount,
    });
  } catch (err: any) {
    logger.error('Failed to process invoice.payment_failed', {
      error: err.message,
      invoiceId: invoice.id,
    });
    throw err;
  }
}

/**
 * Handle customer.subscription.updated event
 * Sync plan tier changes
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  logger.info('Processing customer.subscription.updated', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  try {
    // Get organization from customer mapping
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('organization_id, plan_tier')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();

    if (!customer) {
      logger.warn('No customer mapping found for subscription update', {
        customerId: subscription.customer,
      });
      return;
    }

    // Determine plan tier from Stripe Price ID
    const priceId = subscription.items.data[0]?.price.id;
    let newTier = customer.plan_tier; // Default to current tier

    if (priceId === process.env.STRIPE_PRICE_TRIAL) {
      newTier = 'trial';
    } else if (priceId === process.env.STRIPE_PRICE_PRO) {
      newTier = 'pro';
    } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) {
      newTier = 'enterprise';
    }

    // Update stripe_customers table
    await supabase
      .from('stripe_customers')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        plan_tier: newTier,
        stripe_price_id: priceId,
      })
      .eq('stripe_customer_id', subscription.customer as string);

    // Sync plan tier to organization if changed
    if (newTier !== customer.plan_tier) {
      await supabase.rpc('sync_plan_tier_from_stripe', {
        org_id: customer.organization_id,
        new_tier: newTier,
      });

      // Log tier change event
      await logAIEvent({
        organizationId: customer.organization_id,
        eventType: newTier === 'trial' ? 'plan_downgraded' : 'plan_upgraded',
        severity: 'info',
        title: `Plan ${newTier === 'trial' ? 'Downgraded' : 'Upgraded'}`,
        message: `Plan changed from ${customer.plan_tier} to ${newTier}`,
        metadata: {
          oldTier: customer.plan_tier,
          newTier,
          subscriptionId: subscription.id,
        },
      });

      logger.info('Plan tier synced', {
        organizationId: customer.organization_id,
        oldTier: customer.plan_tier,
        newTier,
      });
    }

    logger.info('Subscription updated processed successfully', {
      organizationId: customer.organization_id,
      subscriptionId: subscription.id,
    });
  } catch (err: any) {
    logger.error('Failed to process subscription.updated', {
      error: err.message,
      subscriptionId: subscription.id,
    });
    throw err;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrade to trial, log event
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  logger.warn('Processing customer.subscription.deleted', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  try {
    // Get organization from customer mapping
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('organization_id, plan_tier')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();

    if (!customer) {
      logger.warn('No customer mapping found for subscription deletion', {
        customerId: subscription.customer,
      });
      return;
    }

    // Update stripe_customers table
    await supabase
      .from('stripe_customers')
      .update({
        stripe_subscription_id: null,
        subscription_status: 'canceled',
        payment_status: 'canceled',
        plan_tier: 'trial',
      })
      .eq('stripe_customer_id', subscription.customer as string);

    // Downgrade organization to trial
    await supabase.rpc('sync_plan_tier_from_stripe', {
      org_id: customer.organization_id,
      new_tier: 'trial',
    });

    // Log downgrade event
    await logAIEvent({
      organizationId: customer.organization_id,
      eventType: 'plan_downgraded',
      severity: 'warning',
      title: 'Subscription Canceled',
      message: `Subscription canceled, account downgraded to trial from ${customer.plan_tier}`,
      metadata: {
        oldTier: customer.plan_tier,
        newTier: 'trial',
        subscriptionId: subscription.id,
      },
    });

    logger.warn('Subscription deleted, account downgraded to trial', {
      organizationId: customer.organization_id,
      oldTier: customer.plan_tier,
    });
  } catch (err: any) {
    logger.error('Failed to process subscription.deleted', {
      error: err.message,
      subscriptionId: subscription.id,
    });
    throw err;
  }
}

/**
 * Handle checkout.session.completed event
 * Create/update stripe_customer, activate subscription
 */
async function handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  logger.info('Processing checkout.session.completed', {
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });

  try {
    // Extract organization ID from session metadata
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) {
      logger.warn('No organizationId in session metadata', { sessionId: session.id });
      return;
    }

    // Determine plan tier from session metadata or subscription
    let planTier = session.metadata?.planTier || 'pro';

    // Create or update stripe_customers record
    const { error } = await supabase.from('stripe_customers').upsert({
      organization_id: organizationId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      stripe_payment_method_id: session.payment_method_options as any,
      billing_email: session.customer_details?.email || null,
      billing_name: session.customer_details?.name || null,
      billing_address: session.customer_details?.address as any,
      subscription_status: 'active',
      payment_status: 'current',
      plan_tier: planTier,
      failed_payment_count: 0,
    });

    if (error) {
      logger.error('Failed to create/update customer record', { error: error.message });
      throw error;
    }

    // Sync plan tier to organization
    await supabase.rpc('sync_plan_tier_from_stripe', {
      org_id: organizationId,
      new_tier: planTier,
    });

    // Log activation event
    await logAIEvent({
      organizationId,
      eventType: 'plan_upgraded',
      severity: 'info',
      title: 'Subscription Activated',
      message: `New ${planTier} subscription activated`,
      metadata: {
        planTier,
        customerId: session.customer,
        subscriptionId: session.subscription,
      },
    });

    logger.info('Checkout completed, subscription activated', {
      organizationId,
      planTier,
      customerId: session.customer,
    });
  } catch (err: any) {
    logger.error('Failed to process checkout.session.completed', {
      error: err.message,
      sessionId: session.id,
    });
    throw err;
  }
}

// =====================================================
// MAIN WEBHOOK PROCESSOR
// =====================================================

/**
 * Process Stripe webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    // Store event for idempotency
    const shouldProcess = await storeWebhookEvent(event);
    if (!shouldProcess) {
      logger.info('Event already processed, skipping', { eventId: event.id });
      return;
    }

    // Route to appropriate handler
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;

      default:
        logger.info('Unhandled event type', { eventType: event.type });
    }

    // Mark as processed
    await markEventProcessed(event.id);
  } catch (err: any) {
    logger.error('Failed to process webhook event', {
      eventId: event.id,
      eventType: event.type,
      error: err.message,
    });

    // Mark as processed with error
    await markEventProcessed(event.id, err.message);
    throw err;
  }
}

// =====================================================
// STRIPE CUSTOMER MANAGEMENT
// =====================================================

/**
 * Get or create Stripe customer for organization
 */
export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  name?: string
): Promise<string> {
  try {
    // Check if customer already exists
    const { data: existing } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      return existing.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { organizationId },
    });

    // Store customer record
    await supabase.from('stripe_customers').insert({
      organization_id: organizationId,
      stripe_customer_id: customer.id,
      billing_email: email,
      billing_name: name,
      plan_tier: 'trial',
      payment_status: 'current',
    });

    logger.info('Created Stripe customer', {
      organizationId,
      customerId: customer.id,
    });

    return customer.id;
  } catch (err: any) {
    logger.error('Failed to get/create Stripe customer', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get Stripe customer for organization
 */
export async function getStripeCustomer(organizationId: string): Promise<StripeCustomerRecord | null> {
  try {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      subscriptionStatus: data.subscription_status,
      planTier: data.plan_tier,
      paymentStatus: data.payment_status,
    };
  } catch (err: any) {
    logger.error('Failed to get Stripe customer', {
      organizationId,
      error: err.message,
    });
    return null;
  }
}
