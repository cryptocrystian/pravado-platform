import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  OnboardingSession,
  IntakeStep,
  CreateIntakeResponseInput,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function useOnboarding() {
  const queryClient = useQueryClient();

  // Fetch current session
  const {
    data: session,
    isLoading,
    error,
  } = useQuery<OnboardingSession>({
    queryKey: ['onboarding', 'current'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/onboarding/sessions/current`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch session');
      }
      return res.json();
    },
    retry: false,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/onboarding/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to create session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Save intake response mutation
  const saveResponseMutation = useMutation({
    mutationFn: async ({
      sessionId,
      step,
      data,
    }: {
      sessionId: string;
      step: IntakeStep;
      data: any;
    }) => {
      const res = await fetch(`${API_BASE}/onboarding/sessions/${sessionId}/intake`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      });
      if (!res.ok) throw new Error('Failed to save response');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Start processing mutation
  const startProcessingMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`${API_BASE}/onboarding/sessions/${sessionId}/start-processing`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to start processing');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Get result query
  const getResultQuery = (sessionId: string | null) =>
    useQuery({
      queryKey: ['onboarding', sessionId, 'result'],
      queryFn: async () => {
        if (!sessionId) return null;
        const res = await fetch(`${API_BASE}/onboarding/sessions/${sessionId}/result`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch result');
        return res.json();
      },
      enabled: !!sessionId,
    });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`${API_BASE}/onboarding/sessions/${sessionId}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to complete onboarding');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  return {
    session,
    isLoading,
    error,
    createSession: createSessionMutation.mutate,
    saveIntakeResponse: saveResponseMutation.mutateAsync,
    startProcessing: startProcessingMutation.mutateAsync,
    getResult: getResultQuery,
    completeOnboarding: completeOnboardingMutation.mutateAsync,
  };
}
