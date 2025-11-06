// =====================================================
// ONBOARDING HOOKS
// Sprint 73: User Onboarding + Trial-to-Paid Conversion Automation
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// =====================================================
// TYPES
// =====================================================

export interface OnboardingState {
  organizationId: string;
  currentStep: number;
  step1OrgSetup: boolean;
  step2ApiKeys: boolean;
  step3FirstAgent: boolean;
  step4UsageDemo: boolean;
  wizardCompleted: boolean;
  wizardCompletedAt: Date | null;
  trialStartedAt: Date;
  trialExpiresAt: Date;
  trialExpired: boolean;
  inGracePeriod: boolean;
  trialBudgetUsd: number;
  trialBudgetUsedUsd: number;
  daysRemaining: number;
  budgetRemaining: number;
}

export interface TrialStatus {
  trialActive: boolean;
  trialExpired: boolean;
  inGracePeriod: boolean;
  daysRemaining: number;
  budgetRemaining: number;
  budgetUsedPercent: number;
  trialExpiresAt: Date;
  gracePeriodEndsAt: Date | null;
}

export interface SignupData {
  email: string;
  password: string;
  organizationName: string;
  fullName?: string;
  inviteCode?: string;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Get onboarding state
 */
export function useOnboardingState(organizationId: string) {
  return useQuery({
    queryKey: ['onboarding-state', organizationId],
    queryFn: async () => {
      const response = await api.get(`/onboarding/${organizationId}/state`);
      return response.data.data as OnboardingState;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Get trial status
 */
export function useTrialStatus(organizationId: string) {
  return useQuery({
    queryKey: ['trial-status', organizationId],
    queryFn: async () => {
      const response = await api.get(`/onboarding/${organizationId}/trial-status`);
      return response.data.data as TrialStatus;
    },
    enabled: !!organizationId,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Get onboarding progress percentage
 */
export function useOnboardingProgress(organizationId: string) {
  return useQuery({
    queryKey: ['onboarding-progress', organizationId],
    queryFn: async () => {
      const response = await api.get(`/onboarding/${organizationId}/progress`);
      return response.data.data.progress as number;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Check if should show upgrade prompt
 */
export function useUpgradePrompt(organizationId: string) {
  return useQuery({
    queryKey: ['upgrade-prompt', organizationId],
    queryFn: async () => {
      const response = await api.get(`/onboarding/${organizationId}/upgrade-prompt`);
      return response.data.data as { shouldPrompt: boolean; reason?: string };
    },
    enabled: !!organizationId,
    staleTime: 30000,
  });
}

/**
 * Check if can execute new jobs
 */
export function useCanExecuteJobs(organizationId: string) {
  return useQuery({
    queryKey: ['can-execute', organizationId],
    queryFn: async () => {
      const response = await api.get(`/onboarding/${organizationId}/can-execute`);
      return response.data.data as { allowed: boolean; reason?: string };
    },
    enabled: !!organizationId,
    staleTime: 10000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Sign up new organization
 */
export function useSignup() {
  return useMutation({
    mutationFn: async (data: SignupData) => {
      const response = await api.post('/onboarding/signup', data);
      return response.data.data as {
        organizationId: string;
        userId: string;
        trialExpiresAt: Date;
      };
    },
  });
}

/**
 * Complete onboarding step
 */
export function useCompleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      stepNumber,
    }: {
      organizationId: string;
      stepNumber: number;
    }) => {
      const response = await api.post(`/onboarding/${organizationId}/step/${stepNumber}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-state', variables.organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['onboarding-progress', variables.organizationId],
      });
    },
  });
}

/**
 * Create checkout link for upgrade
 */
export function useCreateCheckoutLink() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      tier,
      successUrl,
      cancelUrl,
    }: {
      organizationId: string;
      tier: 'pro' | 'enterprise';
      successUrl?: string;
      cancelUrl?: string;
    }) => {
      const response = await api.post(`/onboarding/${organizationId}/checkout-link`, {
        tier,
        successUrl,
        cancelUrl,
      });
      return response.data.data.checkoutUrl as string;
    },
  });
}

/**
 * Generate invite code
 */
export function useGenerateInviteCode() {
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await api.post(`/onboarding/${organizationId}/invite-code`);
      return response.data.data.inviteCode as string;
    },
  });
}

/**
 * Validate invite code
 */
export function useValidateInviteCode() {
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const response = await api.post('/onboarding/validate-invite', { inviteCode });
      return response.data.data.organizationId as string;
    },
  });
}
