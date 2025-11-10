// =====================================================
// INVOICING SERVICE
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

export interface UnbilledUsage {
  organizationId: string;
  date: string;
  totalCostUsd: number;
  totalRequests: number;
  planTier: string;
}

export interface InvoiceItem {
  organizationId: string;
  description: string;
  amount: number;
  quantity: number;
  currency: string;
  metadata: Record<string, any>;
}

export interface CreateInvoiceResult {
  invoiceId: string;
  organizationId: string;
  totalAmount: number;
  itemCount: number;
  periodStart: string;
  periodEnd: string;
}

// =====================================================
// UNBILLED USAGE CALCULATION
// =====================================================

/**
 * Get unbilled usage for organization
 */
export async function getUnbilledUsage(organizationId: string): Promise<UnbilledUsage[]> {
  try {
    const { data, error } = await supabase.rpc('get_unbilled_usage', {
      org_id: organizationId,
    });

    if (error) {
      logger.error('Failed to get unbilled usage', { organizationId, error: error.message });
      throw error;
    }

    return (data || []).map((row: any) => ({
      organizationId,
      date: row.date,
      totalCostUsd: parseFloat(row.total_cost_usd),
      totalRequests: row.total_requests,
      planTier: row.plan_tier,
    }));
  } catch (err: any) {
    logger.error('Failed to get unbilled usage', { organizationId, error: err.message });
    throw err;
  }
}

/**
 * Get all organizations with unbilled usage
 */
export async function getOrganizationsWithUnbilledUsage(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('billing_usage_ledger')
      .select('organization_id')
      .eq('billed', false)
      .order('organization_id');

    if (error) {
      logger.error('Failed to get orgs with unbilled usage', { error: error.message });
      throw error;
    }

    // Get unique organization IDs
    const orgIds = [...new Set((data || []).map((row) => row.organization_id))];
    return orgIds;
  } catch (err: any) {
    logger.error('Failed to get orgs with unbilled usage', { error: err.message });
    throw err;
  }
}

/**
 * Calculate billable amount for usage record
 */
function calculateBillableAmount(usage: UnbilledUsage): number {
  // For now, use total cost directly
  // In production, you might apply markup, minimum charges, etc.
  return Math.max(usage.totalCostUsd, 0);
}

// =====================================================
// STRIPE INVOICE ITEM CREATION
// =====================================================

/**
 * Create invoice item in Stripe for usage
 */
async function createStripeInvoiceItem(
  stripeCustomerId: string,
  usage: UnbilledUsage
): Promise<Stripe.InvoiceItem> {
  try {
    const amount = calculateBillableAmount(usage);
    const amountCents = Math.round(amount * 100); // Convert to cents

    if (amountCents <= 0) {
      logger.info('Skipping invoice item with zero amount', { usage });
      throw new Error('Cannot create invoice item with zero amount');
    }

    const invoiceItem = await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: amountCents,
      currency: 'usd',
      description: `AI Usage for ${usage.date} (${usage.totalRequests} requests)`,
      metadata: {
        organizationId: usage.organizationId,
        usageDate: usage.date,
        requests: usage.totalRequests.toString(),
        planTier: usage.planTier,
      },
    });

    logger.info('Created Stripe invoice item', {
      invoiceItemId: invoiceItem.id,
      organizationId: usage.organizationId,
      date: usage.date,
      amount,
    });

    return invoiceItem;
  } catch (err: any) {
    logger.error('Failed to create Stripe invoice item', {
      organizationId: usage.organizationId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Create invoice items for all unbilled usage
 */
export async function createInvoiceItemsForOrganization(
  organizationId: string
): Promise<number> {
  try {
    // Get Stripe customer ID
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id, plan_tier')
      .eq('organization_id', organizationId)
      .single();

    if (!customer) {
      logger.warn('No Stripe customer found for organization', { organizationId });
      return 0;
    }

    // Get unbilled usage
    const unbilledUsage = await getUnbilledUsage(organizationId);
    if (unbilledUsage.length === 0) {
      logger.info('No unbilled usage for organization', { organizationId });
      return 0;
    }

    logger.info('Creating invoice items for unbilled usage', {
      organizationId,
      unbilledDays: unbilledUsage.length,
    });

    // Create invoice item for each usage record
    let itemCount = 0;
    for (const usage of unbilledUsage) {
      try {
        await createStripeInvoiceItem(customer.stripe_customer_id, usage);
        itemCount++;
      } catch (err: any) {
        logger.error('Failed to create invoice item for date', {
          organizationId,
          date: usage.date,
          error: err.message,
        });
        // Continue with other items even if one fails
      }
    }

    logger.info('Created invoice items for organization', {
      organizationId,
      itemCount,
    });

    return itemCount;
  } catch (err: any) {
    logger.error('Failed to create invoice items for organization', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}

// =====================================================
// INVOICE CREATION & FINALIZATION
// =====================================================

/**
 * Create and finalize invoice for organization
 */
export async function createInvoiceForOrganization(
  organizationId: string
): Promise<CreateInvoiceResult | null> {
  try {
    // Get Stripe customer
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id, stripe_subscription_id, plan_tier')
      .eq('organization_id', organizationId)
      .single();

    if (!customer) {
      logger.warn('No Stripe customer found for organization', { organizationId });
      return null;
    }

    // Get unbilled usage to calculate period
    const unbilledUsage = await getUnbilledUsage(organizationId);
    if (unbilledUsage.length === 0) {
      logger.info('No unbilled usage to invoice', { organizationId });
      return null;
    }

    // Calculate period from unbilled usage
    const dates = unbilledUsage.map((u) => u.date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    // Create invoice items first
    const itemCount = await createInvoiceItemsForOrganization(organizationId);
    if (itemCount === 0) {
      logger.warn('No invoice items created', { organizationId });
      return null;
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customer.stripe_customer_id,
      auto_advance: true, // Automatically finalize and attempt payment
      description: `AI Usage from ${periodStart} to ${periodEnd}`,
      metadata: {
        organizationId,
        periodStart,
        periodEnd,
        planTier: customer.plan_tier,
      },
    });

    logger.info('Created Stripe invoice', {
      invoiceId: invoice.id,
      organizationId,
      periodStart,
      periodEnd,
    });

    // Finalize invoice to trigger payment
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    logger.info('Finalized Stripe invoice', {
      invoiceId: finalizedInvoice.id,
      organizationId,
      total: finalizedInvoice.total / 100,
    });

    // Log invoice creation event
    await logAIEvent({
      organizationId,
      eventType: 'invoice_created',
      severity: 'info',
      title: 'Invoice Created',
      message: `Invoice ${finalizedInvoice.number} created for $${(finalizedInvoice.total / 100).toFixed(2)}`,
      metadata: {
        invoiceId: finalizedInvoice.id,
        amount: finalizedInvoice.total / 100,
        periodStart,
        periodEnd,
        itemCount,
      },
    });

    return {
      invoiceId: finalizedInvoice.id,
      organizationId,
      totalAmount: finalizedInvoice.total / 100,
      itemCount,
      periodStart,
      periodEnd,
    };
  } catch (err: any) {
    logger.error('Failed to create invoice for organization', {
      organizationId,
      error: err.message,
    });

    // Log invoice creation failure
    await logAIEvent({
      organizationId,
      eventType: 'invoice_creation_failed',
      severity: 'error',
      title: 'Invoice Creation Failed',
      message: `Failed to create invoice: ${err.message}`,
      metadata: {
        error: err.message,
      },
    });

    throw err;
  }
}

/**
 * Create invoices for all organizations with unbilled usage
 */
export async function createInvoicesForAllOrganizations(): Promise<CreateInvoiceResult[]> {
  try {
    logger.info('Starting batch invoice creation');

    const orgIds = await getOrganizationsWithUnbilledUsage();
    logger.info('Found organizations with unbilled usage', { count: orgIds.length });

    const results: CreateInvoiceResult[] = [];

    for (const orgId of orgIds) {
      try {
        const result = await createInvoiceForOrganization(orgId);
        if (result) {
          results.push(result);
        }
      } catch (err: any) {
        logger.error('Failed to create invoice for organization', {
          organizationId: orgId,
          error: err.message,
        });
        // Continue with other organizations even if one fails
      }
    }

    logger.info('Batch invoice creation completed', {
      totalOrgs: orgIds.length,
      successCount: results.length,
      totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
    });

    return results;
  } catch (err: any) {
    logger.error('Failed to create invoices for all organizations', {
      error: err.message,
    });
    throw err;
  }
}

// =====================================================
// MANUAL INVOICE OPERATIONS
// =====================================================

/**
 * Add manual credit adjustment to customer
 */
export async function addCreditAdjustment(
  organizationId: string,
  amount: number,
  description: string
): Promise<Stripe.InvoiceItem> {
  try {
    // Get Stripe customer
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!customer) {
      throw new Error('Stripe customer not found');
    }

    // Create negative invoice item (credit)
    const amountCents = Math.round(Math.abs(amount) * 100) * -1; // Negative for credit

    const invoiceItem = await stripe.invoiceItems.create({
      customer: customer.stripe_customer_id,
      amount: amountCents,
      currency: 'usd',
      description: description || 'Manual credit adjustment',
      metadata: {
        organizationId,
        type: 'credit_adjustment',
      },
    });

    logger.info('Added credit adjustment', {
      organizationId,
      amount,
      description,
      invoiceItemId: invoiceItem.id,
    });

    // Log credit adjustment event
    await logAIEvent({
      organizationId,
      eventType: 'credit_adjustment',
      severity: 'info',
      title: 'Credit Adjustment',
      message: `Credit of $${Math.abs(amount).toFixed(2)} added: ${description}`,
      metadata: {
        amount: Math.abs(amount),
        description,
        invoiceItemId: invoiceItem.id,
      },
    });

    return invoiceItem;
  } catch (err: any) {
    logger.error('Failed to add credit adjustment', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Void an unpaid invoice
 */
export async function voidInvoice(
  organizationId: string,
  invoiceId: string
): Promise<Stripe.Invoice> {
  try {
    // Verify invoice belongs to organization
    const { data: invoiceRecord } = await supabase
      .from('stripe_invoices')
      .select('organization_id')
      .eq('stripe_invoice_id', invoiceId)
      .single();

    if (!invoiceRecord || invoiceRecord.organization_id !== organizationId) {
      throw new Error('Invoice not found or does not belong to organization');
    }

    // Void invoice in Stripe
    const invoice = await stripe.invoices.voidInvoice(invoiceId);

    // Update invoice record
    await supabase
      .from('stripe_invoices')
      .update({
        status: 'void',
        paid: false,
      })
      .eq('stripe_invoice_id', invoiceId);

    logger.info('Voided invoice', {
      organizationId,
      invoiceId,
    });

    // Log invoice void event
    await logAIEvent({
      organizationId,
      eventType: 'invoice_voided',
      severity: 'warning',
      title: 'Invoice Voided',
      message: `Invoice ${invoice.number} voided`,
      metadata: {
        invoiceId,
      },
    });

    return invoice;
  } catch (err: any) {
    logger.error('Failed to void invoice', {
      organizationId,
      invoiceId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get revenue metrics for date range
 */
export async function getRevenueMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidAmount: number;
  activeSubscriptions: number;
}> {
  try {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const { data, error } = await supabase.rpc('get_revenue_metrics', {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    });

    if (error) {
      logger.error('Failed to get revenue metrics', { error: error.message });
      throw error;
    }

    const metrics = data[0] || {
      total_revenue: 0,
      total_invoices: 0,
      paid_invoices: 0,
      unpaid_amount: 0,
      active_subscriptions: 0,
    };

    return {
      totalRevenue: parseFloat(metrics.total_revenue) || 0,
      totalInvoices: parseInt(metrics.total_invoices) || 0,
      paidInvoices: parseInt(metrics.paid_invoices) || 0,
      unpaidAmount: parseFloat(metrics.unpaid_amount) || 0,
      activeSubscriptions: parseInt(metrics.active_subscriptions) || 0,
    };
  } catch (err: any) {
    logger.error('Failed to get revenue metrics', { error: err.message });
    throw err;
  }
}

/**
 * Get unpaid invoices for organization
 */
export async function getUnpaidInvoices(
  organizationId: string
): Promise<
  Array<{
    stripeInvoiceId: string;
    amountDue: number;
    dueDate: string | null;
    status: string;
  }>
> {
  try {
    const { data, error } = await supabase.rpc('get_unpaid_invoices', {
      org_id: organizationId,
    });

    if (error) {
      logger.error('Failed to get unpaid invoices', {
        organizationId,
        error: error.message,
      });
      throw error;
    }

    return (data || []).map((row: any) => ({
      stripeInvoiceId: row.stripe_invoice_id,
      amountDue: parseFloat(row.amount_due),
      dueDate: row.due_date,
      status: row.status,
    }));
  } catch (err: any) {
    logger.error('Failed to get unpaid invoices', {
      organizationId,
      error: err.message,
    });
    throw err;
  }
}
