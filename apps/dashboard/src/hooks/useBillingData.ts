// =====================================================
// BILLING DATA HOOKS
// Sprint 72: Automated Billing & Revenue Operations Integration
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// =====================================================
// TYPES
// =====================================================

export interface BillingCustomer {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  billingEmail: string | null;
  billingName: string | null;
  subscriptionStatus: string | null;
  paymentStatus: string;
  planTier: string;
  failedPaymentCount: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

export interface BillingInvoice {
  stripeInvoiceId: string;
  organizationId: string;
  stripeCustomerId: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  status: string;
  paid: boolean;
  invoiceDate: string;
  dueDate: string | null;
  paidAt: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

export interface RevenueMetrics {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidAmount: number;
  activeSubscriptions: number;
}

export interface OrganizationAtRisk {
  organizationId: string;
  planTier: string;
  failedPaymentCount: number;
  paymentStatus: string;
}

export interface UnbilledUsage {
  date: string;
  totalCost: number;
  totalRequests: number;
  planTier: string;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get all billing customers
 */
export function useBillingCustomers() {
  return useQuery({
    queryKey: ['billing-customers'],
    queryFn: async () => {
      const response = await api.get('/billing/customers');
      return response.data.data as BillingCustomer[];
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get customer by organization ID
 */
export function useBillingCustomer(organizationId: string) {
  return useQuery({
    queryKey: ['billing-customer', organizationId],
    queryFn: async () => {
      const response = await api.get(`/billing/customers/${organizationId}`);
      return response.data.data as BillingCustomer;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Get all invoices
 */
export function useBillingInvoices(limit = 100) {
  return useQuery({
    queryKey: ['billing-invoices', limit],
    queryFn: async () => {
      const response = await api.get(`/billing/invoices?limit=${limit}`);
      return response.data.data as BillingInvoice[];
    },
    staleTime: 60000,
  });
}

/**
 * Get invoices for organization
 */
export function useOrganizationInvoices(organizationId: string) {
  return useQuery({
    queryKey: ['billing-invoices', organizationId],
    queryFn: async () => {
      const response = await api.get(`/billing/invoices/${organizationId}`);
      return response.data.data as BillingInvoice[];
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Get unpaid invoices for organization
 */
export function useUnpaidInvoices(organizationId: string) {
  return useQuery({
    queryKey: ['unpaid-invoices', organizationId],
    queryFn: async () => {
      const response = await api.get(`/billing/invoices/${organizationId}/unpaid`);
      return response.data.data as BillingInvoice[];
    },
    enabled: !!organizationId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get revenue metrics
 */
export function useRevenueMetrics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: [
      'revenue-metrics',
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await api.get(`/billing/metrics?${params.toString()}`);
      return response.data.data as RevenueMetrics;
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get organizations at risk
 */
export function useOrganizationsAtRisk() {
  return useQuery({
    queryKey: ['organizations-at-risk'],
    queryFn: async () => {
      const response = await api.get('/billing/at-risk');
      return response.data.data as OrganizationAtRisk[];
    },
    staleTime: 60000,
  });
}

/**
 * Get unbilled usage for organization
 */
export function useUnbilledUsage(organizationId: string) {
  return useQuery({
    queryKey: ['unbilled-usage', organizationId],
    queryFn: async () => {
      const response = await api.get(`/billing/unbilled/${organizationId}`);
      return response.data.data as UnbilledUsage[];
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Get tier distribution
 */
export function useTierDistribution() {
  return useQuery({
    queryKey: ['tier-distribution'],
    queryFn: async () => {
      const response = await api.get('/billing/tier-distribution');
      return response.data.data as Record<string, number>;
    },
    staleTime: 300000, // 5 minutes
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Add credit adjustment
 */
export function useAddCreditAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      amount,
      description,
    }: {
      organizationId: string;
      amount: number;
      description: string;
    }) => {
      const response = await api.post(`/billing/credit/${organizationId}`, {
        amount,
        description,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['billing-customers'] });
      queryClient.invalidateQueries({
        queryKey: ['billing-customer', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['billing-invoices', variables.organizationId],
      });
    },
  });
}

/**
 * Void invoice
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      invoiceId,
    }: {
      organizationId: string;
      invoiceId: string;
    }) => {
      const response = await api.post(`/billing/invoice/${invoiceId}/void`, {
        organizationId,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate invoice queries
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({
        queryKey: ['billing-invoices', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['unpaid-invoices', variables.organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['revenue-metrics'] });
    },
  });
}

/**
 * Create invoice for organization
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await api.post(`/billing/invoice/${organizationId}`);
      return response.data;
    },
    onSuccess: (_, organizationId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({
        queryKey: ['billing-invoices', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['unbilled-usage', organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['revenue-metrics'] });
    },
  });
}

/**
 * Trigger billing cycle (admin only)
 */
export function useTriggerBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/billing/trigger');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all billing queries
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['unbilled-usage'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-metrics'] });
    },
  });
}

/**
 * Update organization tier (admin only)
 */
export function useUpdateOrganizationTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      newTier,
      reason,
    }: {
      organizationId: string;
      newTier: 'trial' | 'pro' | 'enterprise';
      reason: string;
    }) => {
      const response = await api.post(`/billing/tier/${organizationId}`, {
        newTier,
        reason,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate customer queries
      queryClient.invalidateQueries({ queryKey: ['billing-customers'] });
      queryClient.invalidateQueries({
        queryKey: ['billing-customer', variables.organizationId],
      });
      queryClient.invalidateQueries({ queryKey: ['tier-distribution'] });
    },
  });
}

/**
 * Get customer usage vs limits
 */
export function useUsageVsLimits(organizationId: string) {
  return useQuery({
    queryKey: ['usage-vs-limits', organizationId],
    queryFn: async () => {
      const response = await api.get(`/billing/usage-limits/${organizationId}`);
      return response.data.data as {
        planTier: string;
        limits: {
          maxDailyCost: number;
          maxRequestCost: number;
          maxTokensIn: number;
          maxTokensOut: number;
          maxConcurrentJobs: number;
          allowedProviders: string[];
          cacheTTLHours: number;
        };
        currentUsage: {
          dailyCost: number;
          dailyRequests: number;
        };
        utilization: {
          costPercent: number;
          requestsPercent: number;
        };
      };
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Refresh Stripe customer data
 */
export function useRefreshStripeCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await api.post(`/billing/sync/${organizationId}`);
      return response.data;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['billing-customers'] });
      queryClient.invalidateQueries({
        queryKey: ['billing-customer', organizationId],
      });
    },
  });
}
