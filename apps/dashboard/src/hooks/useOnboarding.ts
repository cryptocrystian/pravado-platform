// =====================================================
// CANONICAL ONBOARDING HOOK
// =====================================================
// Single hook for intake wizard onboarding with AI strategy generation

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  OnboardingSession,
  OnboardingResult,
  IntakeStep,
  OnboardingStatus,
} from '@pravado/types';

// =====================================================
// TYPES
// =====================================================

interface CreateSessionInput {
  organizationId: string;
  userId: string;
}

interface SaveIntakeInput {
  sessionId: string;
  step: IntakeStep;
  data: Record<string, any>;
}

interface ProcessInput {
  sessionId: string;
  autoStartPlanner?: boolean;
}

// =====================================================
// MAIN HOOK
// =====================================================

/**
 * Canonical onboarding hook - manages intake wizard, AI processing, and results
 *
 * Usage:
 * ```tsx
 * const {
 *   session,
 *   result,
 *   isLoading,
 *   error,
 *   createSession,
 *   saveIntakeResponse,
 *   startProcessing,
 * } = useOnboarding();
 * ```
 */
export function useOnboarding() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Session query (polls while processing)
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ['onboarding-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/api/v1/onboarding/session/${sessionId}/result`);
      return response.data.session as OnboardingSession;
    },
    enabled: !!sessionId,
    refetchInterval: (data) => {
      // Poll every 3 seconds while processing
      const status = data?.status;
      if (status === 'PROCESSING' || status === 'STRATEGY_READY' || status === 'PLANNER_READY') {
        return 3000;
      }
      return false;
    },
    staleTime: 1000,
  });

  // Result query (includes session + intake + AI outputs)
  const {
    data: result,
    isLoading: resultLoading,
    error: resultError,
  } = useQuery({
    queryKey: ['onboarding-result', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/api/v1/onboarding/session/${sessionId}/result`);
      return response.data as OnboardingResult;
    },
    enabled: !!sessionId && (session?.status === 'PLANNER_READY' || session?.status === 'COMPLETED'),
    staleTime: 60000,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const response = await api.post('/api/v1/onboarding/session', input);
      return response.data as OnboardingSession;
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      queryClient.setQueryData(['onboarding-session', data.id], data);
    },
  });

  // Save intake response mutation
  const saveIntakeMutation = useMutation({
    mutationFn: async (input: SaveIntakeInput) => {
      const response = await api.post(
        `/api/v1/onboarding/session/${input.sessionId}/intake`,
        {
          step: input.step,
          data: input.data,
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate session to reflect updated steps
      queryClient.invalidateQueries({
        queryKey: ['onboarding-session', variables.sessionId],
      });
    },
  });

  // Start processing mutation
  const startProcessingMutation = useMutation({
    mutationFn: async (input: ProcessInput) => {
      const response = await api.post(
        `/api/v1/onboarding/session/${input.sessionId}/process`,
        {
          autoStartPlanner: input.autoStartPlanner ?? true,
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Start polling by invalidating session
      queryClient.invalidateQueries({
        queryKey: ['onboarding-session', variables.sessionId],
      });
    },
  });

  // Helper functions
  const createSession = useCallback(
    async (input: CreateSessionInput) => {
      return createSessionMutation.mutateAsync(input);
    },
    [createSessionMutation]
  );

  const saveIntakeResponse = useCallback(
    async (payload: { sessionId: string; step: IntakeStep; data: any }) => {
      return saveIntakeMutation.mutateAsync({
        sessionId: payload.sessionId,
        step: payload.step,
        data: payload.data,
      });
    },
    [saveIntakeMutation]
  );

  const startProcessing = useCallback(
    async (autoStartPlanner: boolean = true) => {
      if (!sessionId) {
        throw new Error('No active session. Create a session first.');
      }
      return startProcessingMutation.mutateAsync({
        sessionId,
        autoStartPlanner,
      });
    },
    [sessionId, startProcessingMutation]
  );

  return {
    // State
    session,
    result,
    sessionId,
    isLoading:
      sessionLoading ||
      resultLoading ||
      createSessionMutation.isPending ||
      saveIntakeMutation.isPending ||
      startProcessingMutation.isPending,
    error:
      sessionError ||
      resultError ||
      createSessionMutation.error ||
      saveIntakeMutation.error ||
      startProcessingMutation.error,

    // Actions
    createSession,
    saveIntakeResponse,
    startProcessing,

    // Computed properties
    isProcessing:
      session?.status === 'PROCESSING' ||
      session?.status === 'STRATEGY_READY' ||
      session?.status === 'PLANNER_READY',
    isComplete: session?.status === 'COMPLETED',
    isFailed: session?.status === 'FAILED',
    isAbandoned: session?.status === 'ABANDONED',

    // Polling interval
    pollInterval: 3000, // ms
  };
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Hook to check if organization can start onboarding
 */
export function useCanStartOnboarding(organizationId: string) {
  return useQuery({
    queryKey: ['can-start-onboarding', organizationId],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/v1/onboarding/can-start?organizationId=${organizationId}`);
        return response.data.canStart as boolean;
      } catch (error: any) {
        // 403 means cannot start
        if (error.response?.status === 403) {
          return false;
        }
        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Hook to get current session for organization (if exists)
 */
export function useCurrentSession(organizationId: string) {
  return useQuery({
    queryKey: ['current-onboarding-session', organizationId],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/v1/onboarding/session/current?organizationId=${organizationId}`);
        return response.data as OnboardingSession;
      } catch (error: any) {
        // 404 means no session exists
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: 30000,
  });
}
