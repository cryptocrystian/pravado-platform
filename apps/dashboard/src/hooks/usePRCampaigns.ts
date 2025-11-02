// =====================================================
// PR CAMPAIGN HOOKS
// =====================================================
// React Query hooks for PR campaign, press release, and pitch management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  PRCampaign,
  PressRelease,
  CampaignInteraction,
  PitchTemplate,
  CreatePRCampaignInput,
  UpdatePRCampaignInput,
  CreatePressReleaseInput,
  UpdatePressReleaseInput,
  CreateCampaignInteractionInput,
  UpdateCampaignInteractionInput,
  CreatePitchTemplateInput,
  UpdatePitchTemplateInput,
  CampaignStats,
  PressReleaseStats,
  GeneratedPitch,
  RecommendedTarget,
} from '@pravado/shared-types';

// =====================================================
// CAMPAIGN HOOKS
// =====================================================

export function useCampaigns(filters?: {
  status?: string;
  teamId?: string;
  ownerId?: string;
}) {
  return useQuery<PRCampaign[]>({
    queryKey: ['pr-campaigns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.teamId) params.append('teamId', filters.teamId);
      if (filters?.ownerId) params.append('ownerId', filters.ownerId);

      const response = await api.get(`/pr/campaigns?${params.toString()}`);
      return response.data;
    },
  });
}

export function useCampaign(campaignId: string | null) {
  return useQuery<PRCampaign>({
    queryKey: ['pr-campaign', campaignId],
    queryFn: async () => {
      const response = await api.get(`/pr/campaigns/${campaignId}`);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation<PRCampaign, Error, CreatePRCampaignInput>({
    mutationFn: async (input) => {
      const response = await api.post('/pr/campaigns', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pr-campaigns'] });
    },
  });
}

export function useUpdateCampaign(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<PRCampaign, Error, UpdatePRCampaignInput>({
    mutationFn: async (input) => {
      const response = await api.put(`/pr/campaigns/${campaignId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pr-campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['pr-campaigns'] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (campaignId) => {
      await api.delete(`/pr/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pr-campaigns'] });
    },
  });
}

export function useCampaignStats(campaignId: string | null) {
  return useQuery<CampaignStats>({
    queryKey: ['pr-campaign-stats', campaignId],
    queryFn: async () => {
      const response = await api.get(`/pr/campaigns/${campaignId}/stats`);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

// =====================================================
// PRESS RELEASE HOOKS
// =====================================================

export function usePressReleases(filters?: {
  campaignId?: string;
  status?: string;
}) {
  return useQuery<PressRelease[]>({
    queryKey: ['press-releases', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.campaignId) params.append('campaignId', filters.campaignId);
      if (filters?.status) params.append('status', filters.status);

      const response = await api.get(`/pr/releases?${params.toString()}`);
      return response.data;
    },
  });
}

export function usePressRelease(releaseId: string | null) {
  return useQuery<PressRelease>({
    queryKey: ['press-release', releaseId],
    queryFn: async () => {
      const response = await api.get(`/pr/releases/${releaseId}`);
      return response.data;
    },
    enabled: !!releaseId,
  });
}

export function useCreatePressRelease() {
  const queryClient = useQueryClient();

  return useMutation<PressRelease, Error, CreatePressReleaseInput>({
    mutationFn: async (input) => {
      const response = await api.post('/pr/releases', input);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['press-releases'] });
      if (data.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['pr-campaign', data.campaignId] });
      }
    },
  });
}

export function useUpdatePressRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation<PressRelease, Error, UpdatePressReleaseInput>({
    mutationFn: async (input) => {
      const response = await api.put(`/pr/releases/${releaseId}`, input);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['press-release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['press-releases'] });
      if (data.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['pr-campaign', data.campaignId] });
      }
    },
  });
}

export function useDeletePressRelease() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (releaseId) => {
      await api.delete(`/pr/releases/${releaseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['press-releases'] });
    },
  });
}

export function usePressReleaseStats(releaseId: string | null) {
  return useQuery<PressReleaseStats>({
    queryKey: ['press-release-stats', releaseId],
    queryFn: async () => {
      const response = await api.get(`/pr/releases/${releaseId}/stats`);
      return response.data;
    },
    enabled: !!releaseId,
    refetchInterval: 10000, // Refetch stats every 10 seconds
  });
}

// =====================================================
// AI & TARGETING HOOKS
// =====================================================

export function useGeneratePitch() {
  return useMutation<
    GeneratedPitch,
    Error,
    {
      releaseId: string;
      contactId: string;
      templateId?: string;
      customInstructions?: string;
    }
  >({
    mutationFn: async ({ releaseId, contactId, templateId, customInstructions }) => {
      const response = await api.post(`/pr/releases/${releaseId}/pitch/${contactId}`, {
        templateId,
        customInstructions,
      });
      return response.data;
    },
  });
}

export function useRecommendedTargets(
  releaseId: string | null,
  options?: {
    maxResults?: number;
    minScore?: number;
  }
) {
  return useQuery<RecommendedTarget[]>({
    queryKey: ['recommended-targets', releaseId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.maxResults) params.append('maxResults', options.maxResults.toString());
      if (options?.minScore) params.append('minScore', options.minScore.toString());

      const response = await api.get(`/pr/releases/${releaseId}/targets?${params.toString()}`);
      return response.data;
    },
    enabled: !!releaseId,
  });
}

// =====================================================
// INTERACTION HOOKS
// =====================================================

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation<CampaignInteraction, Error, CreateCampaignInteractionInput>({
    mutationFn: async (input) => {
      const response = await api.post('/pr/interactions', input);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', data.contactId] });
      if (data.pressReleaseId) {
        queryClient.invalidateQueries({ queryKey: ['press-release-stats', data.pressReleaseId] });
      }
      if (data.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['pr-campaign-stats', data.campaignId] });
      }
    },
  });
}

export function useUpdateInteraction(interactionId: string) {
  const queryClient = useQueryClient();

  return useMutation<CampaignInteraction, Error, UpdateCampaignInteractionInput>({
    mutationFn: async (input) => {
      const response = await api.put(`/pr/interactions/${interactionId}`, input);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', data.contactId] });
      if (data.pressReleaseId) {
        queryClient.invalidateQueries({ queryKey: ['press-release-stats', data.pressReleaseId] });
      }
      if (data.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['pr-campaign-stats', data.campaignId] });
      }
    },
  });
}

export function useContactInteractions(contactId: string | null) {
  return useQuery<CampaignInteraction[]>({
    queryKey: ['contact-interactions', contactId],
    queryFn: async () => {
      const response = await api.get(`/pr/contacts/${contactId}/interactions`);
      return response.data;
    },
    enabled: !!contactId,
  });
}

// =====================================================
// PITCH TEMPLATE HOOKS
// =====================================================

export function usePitchTemplates() {
  return useQuery<PitchTemplate[]>({
    queryKey: ['pitch-templates'],
    queryFn: async () => {
      const response = await api.get('/pr/templates');
      return response.data;
    },
  });
}

export function useCreatePitchTemplate() {
  const queryClient = useQueryClient();

  return useMutation<PitchTemplate, Error, CreatePitchTemplateInput>({
    mutationFn: async (input) => {
      const response = await api.post('/pr/templates', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch-templates'] });
    },
  });
}

export function useUpdatePitchTemplate(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation<PitchTemplate, Error, UpdatePitchTemplateInput>({
    mutationFn: async (input) => {
      const response = await api.put(`/pr/templates/${templateId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch-templates'] });
    },
  });
}

export function useDeletePitchTemplate() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (templateId) => {
      await api.delete(`/pr/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch-templates'] });
    },
  });
}
