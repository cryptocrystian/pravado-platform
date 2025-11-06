// =====================================================
// PERSONA INTELLIGENCE HOOKS
// Sprint 31: Persona intelligence & adaptive voice modeling
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PersonaDefinition,
  PersonaProfile,
  AdaptiveVoiceStrategy,
  PersonaInferenceResult,
  PersonaEventLog,
  PersonaStrategy,
  CreatePersonaDefinitionInput,
  UpdatePersonaDefinitionInput,
  InferPersonaInput,
  OverridePersonaInput,
  OverrideToneInput,
  UpdatePersonaFromEngagementInput,
  GetAdaptiveStrategyInput,
  ToneArchetype,
  VoiceMode,
  ConfidenceLevel,
  TONE_ARCHETYPE_CONFIGS,
  VOICE_MODE_CONFIGS,
  CONFIDENCE_LEVEL_CONFIGS,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MUTATION HOOKS - PERSONA DEFINITIONS
// =====================================================

/**
 * Create persona definition
 */
export function useCreatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreatePersonaDefinitionInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/personas`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create persona');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });
}

/**
 * Update persona definition
 */
export function useUpdatePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePersonaDefinitionInput) => {
      const res = await fetch(`${API_BASE}/personas/${input.personaId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update persona');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      queryClient.invalidateQueries({ queryKey: ['persona', variables.personaId] });
    },
  });
}

/**
 * Delete persona definition
 */
export function useDeletePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personaId: string) => {
      const res = await fetch(`${API_BASE}/personas/${personaId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete persona');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });
}

// =====================================================
// MUTATION HOOKS - CONTACT PERSONAS
// =====================================================

/**
 * Infer persona for contact
 */
export function useInferPersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<InferPersonaInput, 'organizationId'> & { organizationId?: string }) => {
      const res = await fetch(`${API_BASE}/personas/contacts/${input.contactId}/persona/infer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: input.forceRefresh }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to infer persona');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-persona', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-strategy', variables.contactId] });
    },
  });
}

/**
 * Override persona for contact
 */
export function useOverridePersona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<OverridePersonaInput, 'organizationId' | 'setBy'>) => {
      const res = await fetch(`${API_BASE}/personas/contacts/${input.contactId}/persona`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: input.personaId, reason: input.reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to override persona');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-persona', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-strategy', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['persona-events', variables.contactId] });
    },
  });
}

/**
 * Override tone/voice for contact
 */
export function useOverrideToneVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<OverrideToneInput, 'organizationId' | 'setBy'>) => {
      const res = await fetch(`${API_BASE}/personas/contacts/${input.contactId}/tone`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredTone: input.preferredTone,
          preferredVoice: input.preferredVoice,
          reason: input.reason,
          appliesToCampaigns: input.appliesToCampaigns,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to override tone/voice');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-persona', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-strategy', variables.contactId] });
    },
  });
}

/**
 * Update persona from engagement
 */
export function useUpdateFromEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<UpdatePersonaFromEngagementInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/personas/contacts/${input.contactId}/persona/engagement`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionType: input.interactionType,
          sentimentScore: input.sentimentScore,
          responsePositive: input.responsePositive,
          campaignId: input.campaignId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update from engagement');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-persona', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-strategy', variables.contactId] });
    },
  });
}

// =====================================================
// QUERY HOOKS - PERSONA DEFINITIONS
// =====================================================

/**
 * Get all persona definitions
 */
export function usePersonas() {
  return useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/personas`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch personas');
      }
      const data = await res.json();
      return data.personas as PersonaDefinition[];
    },
  });
}

/**
 * Get single persona definition
 */
export function usePersona(personaId: string | undefined) {
  return useQuery({
    queryKey: ['persona', personaId],
    queryFn: async () => {
      if (!personaId) return null;
      const res = await fetch(`${API_BASE}/personas/${personaId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch persona');
      }
      const data = await res.json();
      return data.persona as PersonaDefinition;
    },
    enabled: !!personaId,
  });
}

/**
 * Get persona strategy
 */
export function usePersonaStrategy(personaId: string | undefined, useCaseTag?: string) {
  return useQuery({
    queryKey: ['persona-strategy', personaId, useCaseTag],
    queryFn: async () => {
      if (!personaId) return null;
      const url = useCaseTag
        ? `${API_BASE}/personas/${personaId}/strategy?useCaseTag=${useCaseTag}`
        : `${API_BASE}/personas/${personaId}/strategy`;
      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch persona strategy');
      }
      const data = await res.json();
      return data.strategy as PersonaStrategy;
    },
    enabled: !!personaId,
  });
}

// =====================================================
// QUERY HOOKS - CONTACT PERSONAS
// =====================================================

/**
 * Get contact's persona profile
 */
export function useContactPersona(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-persona', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const res = await fetch(`${API_BASE}/personas/contacts/${contactId}/persona`, {
        credentials: 'include',
      });
      if (!res.ok) {
        // 404 is expected for contacts without personas
        if (res.status === 404) return null;
        throw new Error('Failed to fetch contact persona');
      }
      const data = await res.json();
      return data.profile as PersonaProfile;
    },
    enabled: !!contactId,
  });
}

/**
 * Get adaptive strategy for contact
 */
export function useAdaptiveStrategy(contactId: string | undefined, useCaseTag?: string) {
  return useQuery({
    queryKey: ['adaptive-strategy', contactId, useCaseTag],
    queryFn: async () => {
      if (!contactId) return null;
      const url = useCaseTag
        ? `${API_BASE}/personas/contacts/${contactId}/adaptive-strategy?useCaseTag=${useCaseTag}`
        : `${API_BASE}/personas/contacts/${contactId}/adaptive-strategy`;
      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch adaptive strategy');
      }
      const data = await res.json();
      return data.strategy as AdaptiveVoiceStrategy;
    },
    enabled: !!contactId,
  });
}

/**
 * Get persona events for contact
 */
export function usePersonaEvents(contactId: string | undefined, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['persona-events', contactId, limit, offset],
    queryFn: async () => {
      if (!contactId) return { events: [], total: 0 };
      const res = await fetch(
        `${API_BASE}/personas/contacts/${contactId}/persona/events?limit=${limit}&offset=${offset}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        throw new Error('Failed to fetch persona events');
      }
      const data = await res.json();
      return { events: data.events as PersonaEventLog[], total: data.total as number };
    },
    enabled: !!contactId,
  });
}

// =====================================================
// HELPER HOOKS - CONFIGURATION
// =====================================================

/**
 * Get tone archetype configuration
 */
export function useToneConfig(tone: ToneArchetype | undefined) {
  if (!tone) return null;
  return TONE_ARCHETYPE_CONFIGS[tone];
}

/**
 * Get voice mode configuration
 */
export function useVoiceConfig(voice: VoiceMode | undefined) {
  if (!voice) return null;
  return VOICE_MODE_CONFIGS[voice];
}

/**
 * Get confidence level configuration
 */
export function useConfidenceConfig(level: ConfidenceLevel | undefined) {
  if (!level) return null;
  return CONFIDENCE_LEVEL_CONFIGS[level];
}

/**
 * Get tone color
 */
export function useToneColor(tone: ToneArchetype | undefined) {
  const config = useToneConfig(tone);
  return config?.color || '#6B7280';
}

/**
 * Get tone icon
 */
export function useToneIcon(tone: ToneArchetype | undefined) {
  const config = useToneConfig(tone);
  return config?.icon || 'user';
}

/**
 * Get confidence color
 */
export function useConfidenceColor(level: ConfidenceLevel | undefined) {
  const config = useConfidenceConfig(level);
  return config?.color || '#6B7280';
}

/**
 * Get confidence from score
 */
export function useConfidenceLevelFromScore(score: number | undefined): ConfidenceLevel | null {
  if (score === undefined) return null;
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.5) return 'MEDIUM';
  return 'LOW';
}

// =====================================================
// HELPER HOOKS - UI HELPERS
// =====================================================

/**
 * Get persona label
 */
export function usePersonaLabel(personaId: string | undefined) {
  const { data: persona } = usePersona(personaId);
  return persona?.name || 'Unknown Persona';
}

/**
 * Get recommended tone for persona
 */
export function useRecommendedTone(personaId: string | undefined) {
  const { data: persona } = usePersona(personaId);
  return persona?.defaultTone;
}

/**
 * Get recommended voice for persona
 */
export function useRecommendedVoice(personaId: string | undefined) {
  const { data: persona } = usePersona(personaId);
  return persona?.defaultVoice;
}

/**
 * Get effectiveness indicator
 */
export function useEffectivenessIndicator(effectivenessScore: number | undefined) {
  if (effectivenessScore === undefined) return { label: 'Unknown', color: '#6B7280' };
  if (effectivenessScore >= 0.7) return { label: 'Excellent', color: '#10B981' };
  if (effectivenessScore >= 0.5) return { label: 'Good', color: '#3B82F6' };
  if (effectivenessScore >= 0.3) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Poor', color: '#EF4444' };
}

/**
 * Check if persona is verified
 */
export function useIsPersonaVerified(contactId: string | undefined) {
  const { data: profile } = useContactPersona(contactId);
  const confidenceLevel = useConfidenceLevelFromScore(profile?.confidence);
  return confidenceLevel === 'HIGH' && (profile?.confidence ?? 0) >= 0.8;
}

/**
 * Get persona assignment source label
 */
export function useAssignmentSourceLabel(source: 'INFERRED' | 'MANUAL' | 'ML_MODEL' | undefined) {
  if (!source) return 'Unknown';
  const labels = {
    INFERRED: 'Auto-detected',
    MANUAL: 'Manually set',
    ML_MODEL: 'ML Predicted',
  };
  return labels[source];
}

// =====================================================
// HELPER HOOKS - FILTERING & SORTING
// =====================================================

/**
 * Filter personas by tone
 */
export function usePersonasByTone(tone: ToneArchetype | undefined) {
  const { data: personas } = usePersonas();
  if (!tone || !personas) return [];
  return personas.filter((p) => p.defaultTone === tone);
}

/**
 * Filter personas by system/custom
 */
export function useSystemPersonas() {
  const { data: personas } = usePersonas();
  return personas?.filter((p) => p.isSystemPersona) || [];
}

export function useCustomPersonas() {
  const { data: personas } = usePersonas();
  return personas?.filter((p) => !p.isSystemPersona) || [];
}

/**
 * Sort personas by name
 */
export function useSortedPersonas() {
  const { data: personas } = usePersonas();
  if (!personas) return [];
  return [...personas].sort((a, b) => a.name.localeCompare(b.name));
}

// =====================================================
// HELPER HOOKS - STATS
// =====================================================

/**
 * Get persona stats
 */
export function usePersonaStats(personaId: string | undefined) {
  // This would require additional backend endpoints to aggregate stats
  // Placeholder for future implementation
  return {
    totalAssignments: 0,
    averageConfidence: 0,
    averageEffectiveness: 0,
    positiveResponseRate: 0,
  };
}

/**
 * Check if contact has override
 */
export function useHasPersonaOverride(contactId: string | undefined) {
  const { data: profile } = useContactPersona(contactId);
  return profile?.hasOverride || false;
}

/**
 * Get override reason
 */
export function useOverrideReason(contactId: string | undefined) {
  const { data: profile } = useContactPersona(contactId);
  return profile?.overrideReason;
}
