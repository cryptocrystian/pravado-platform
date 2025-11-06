/**
 * Plans Hooks
 *
 * React Query hooks for pricing tiers, plan entitlements, and Stripe checkout.
 * Supports 4-tier Balanced Model pricing from PVS-01.
 *
 * Tiers: starter ($149) | pro ($599) | premium ($1,499) | enterprise ($5,000+)
 *
 * Sprint 75 - Track B: Validated Pricing Rollout
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ============================================================================
// Types
// ============================================================================

export type PlanTier = 'starter' | 'pro' | 'premium' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanPolicy {
  tier: PlanTier;
  tier_display_name: string;
  tier_description: string;
  monthly_price_usd: number;
  annual_price_usd: number;
  journalist_contacts_limit: number | null;
  ai_generations_monthly: number | null;
  media_searches_monthly: number | null;
  storage_gb_limit: number | null;
  max_users: number | null;
  podcast_syndications_monthly: number | null;
  citemind_queries_monthly: number | null;
  api_access: boolean;
  white_label_reports: boolean;
  custom_integrations: boolean;
  dedicated_csm: boolean;
  priority_support_hours: number | null;
  sla_uptime_percent: number | null;
  is_active: boolean;
  is_recommended: boolean;
  sort_order: number;
}

export interface CurrentPlan {
  tier: PlanTier;
  billing_cycle: BillingCycle;
  monthly_price_usd: number;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  current_period_end: string;
  trial_ends_at: string | null;
}

export interface UsageStatus {
  feature: string;
  used: number;
  limit: number | null;
  utilization_percent: number | null;
  is_approaching_limit: boolean;
  is_at_limit: boolean;
}

export interface StripeCheckoutSession {
  url: string;
  session_id: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get all plan policies (pricing matrix)
 *
 * @returns Array of plan policies for all tiers
 */
export function usePlanMatrix() {
  return useQuery<PlanPolicy[]>({
    queryKey: ['plans', 'matrix'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/billing/plans`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch plan matrix');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 300000, // 5 minutes (plans don't change often)
  });
}

/**
 * Get current organization's plan
 *
 * @returns Current plan details including tier, billing cycle, and status
 */
export function useCurrentPlan() {
  return useQuery<CurrentPlan>({
    queryKey: ['plans', 'current'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/billing/current-plan`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch current plan');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get feature usage status
 *
 * @returns Usage status for all features with limits
 */
export function useUsageStatus() {
  return useQuery<UsageStatus[]>({
    queryKey: ['plans', 'usage'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/billing/usage`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch usage status');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Start Stripe checkout session for plan upgrade/downgrade
 *
 * @param tier - Target plan tier
 * @param billingCycle - Monthly or annual billing
 * @returns Mutation that returns Stripe checkout URL
 */
export function useStartCheckout() {
  const queryClient = useQueryClient();

  return useMutation<StripeCheckoutSession, Error, { tier: PlanTier; billingCycle: BillingCycle }>({
    mutationFn: async ({ tier, billingCycle }) => {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billing_cycle: billingCycle,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const data = await res.json();
      return data.data || data;
    },
    onSuccess: () => {
      // Invalidate current plan query after successful checkout initiation
      queryClient.invalidateQueries({ queryKey: ['plans', 'current'] });
    },
  });
}

/**
 * Cancel current subscription
 *
 * @returns Mutation to cancel subscription at period end
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/billing/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'current'] });
    },
  });
}

/**
 * Get recommended tier based on current usage
 *
 * @returns Recommended tier or null if current tier is optimal
 */
export function useRecommendedTier() {
  return useQuery<{ recommended_tier: PlanTier | null; reason: string }>({
    queryKey: ['plans', 'recommended'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/billing/recommended-tier`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch recommended tier');
      }

      const data = await res.json();
      return data.data || data;
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get billing portal URL for managing subscription
 *
 * @returns Stripe Customer Portal URL
 */
export function useBillingPortal() {
  return useMutation<{ url: string }, Error>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const data = await res.json();
      return data.data || data;
    },
  });
}
