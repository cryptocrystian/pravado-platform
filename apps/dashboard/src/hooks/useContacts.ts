import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Contact,
  ContactSearchParams,
  ContactSearchResult,
  CreateContactInput,
  UpdateContactInput,
  ContactTag,
  CreateContactTagInput,
  UpdateContactTagInput,
  TriggerEnrichmentInput,
} from '@pravado/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// =====================================================
// CONTACT QUERIES
// =====================================================

export function useContacts(params: ContactSearchParams) {
  return useQuery<ContactSearchResult>({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.append('search', params.search);
      if (params.tier) queryParams.append('tier', JSON.stringify(params.tier));
      if (params.topics) queryParams.append('topics', JSON.stringify(params.topics));
      if (params.regions) queryParams.append('regions', JSON.stringify(params.regions));
      if (params.tagIds) queryParams.append('tagIds', JSON.stringify(params.tagIds));
      if (params.outlet) queryParams.append('outlet', params.outlet);
      if (params.role) queryParams.append('role', JSON.stringify(params.role));
      if (params.hasEmail !== undefined) queryParams.append('hasEmail', String(params.hasEmail));
      if (params.hasLinkedIn !== undefined) queryParams.append('hasLinkedIn', String(params.hasLinkedIn));
      if (params.hasTwitter !== undefined) queryParams.append('hasTwitter', String(params.hasTwitter));
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.offset) queryParams.append('offset', String(params.offset));
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const res = await fetch(`${API_BASE}/contacts?${queryParams}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });
}

export function useContact(id: string | null) {
  return useQuery<Contact>({
    queryKey: ['contacts', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`${API_BASE}/contacts/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useContactStats() {
  return useQuery({
    queryKey: ['contacts', 'stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/contacts/stats`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });
}

// =====================================================
// CONTACT MUTATIONS
// =====================================================

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      const res = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateContactInput }) => {
      const res = await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update contact');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete contact');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const res = await fetch(`${API_BASE}/contacts/bulk-delete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      });
      if (!res.ok) throw new Error('Failed to delete contacts');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

// =====================================================
// TAG QUERIES & MUTATIONS
// =====================================================

export function useContactTags() {
  return useQuery<ContactTag[]>({
    queryKey: ['contacts', 'tags'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/contacts/tags`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
  });
}

export function useCreateContactTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactTagInput) => {
      const res = await fetch(`${API_BASE}/contacts/tags`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', 'tags'] });
    },
  });
}

// =====================================================
// ENRICHMENT
// =====================================================

export function useTriggerEnrichment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const res = await fetch(`${API_BASE}/contacts/enrich`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      });
      if (!res.ok) throw new Error('Failed to trigger enrichment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useEnrichmentJobs() {
  return useQuery({
    queryKey: ['contacts', 'enrichment-jobs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/contacts/enrichment`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch enrichment jobs');
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
}
