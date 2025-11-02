// =====================================================
// CONTACT SERVICE
// =====================================================
// Business logic for media contact management

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
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
  ContactStats,
} from '@pravado/shared-types';

export class ContactService {
  /**
   * Search contacts with advanced filtering and pagination
   */
  async searchContacts(
    organizationId: string,
    params: ContactSearchParams
  ): Promise<ContactSearchResult> {
    const {
      search,
      tier,
      topics,
      regions,
      tagIds,
      outlet,
      role,
      hasEmail,
      hasLinkedIn,
      hasTwitter,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    try {
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      // Apply filters
      if (search) {
        // Use full-text search
        query = query.textSearch('search_vector', search, {
          type: 'plain',
          config: 'english',
        });
      }

      if (tier && tier.length > 0) {
        query = query.in('tier', tier);
      }

      if (topics && topics.length > 0) {
        query = query.overlaps('topics', topics);
      }

      if (regions && regions.length > 0) {
        query = query.overlaps('regions', regions);
      }

      if (tagIds && tagIds.length > 0) {
        query = query.overlaps('tag_ids', tagIds);
      }

      if (outlet) {
        query = query.ilike('outlet', `%${outlet}%`);
      }

      if (role && role.length > 0) {
        query = query.in('role', role);
      }

      if (hasEmail !== undefined) {
        if (hasEmail) {
          query = query.not('email', 'is', null);
        } else {
          query = query.is('email', null);
        }
      }

      if (hasLinkedIn !== undefined) {
        if (hasLinkedIn) {
          query = query.not('linkedin_url', 'is', null);
        } else {
          query = query.is('linkedin_url', null);
        }
      }

      if (hasTwitter !== undefined) {
        if (hasTwitter) {
          query = query.not('twitter_url', 'is', null);
        } else {
          query = query.is('twitter_url', null);
        }
      }

      // Apply sorting
      const sortColumn = {
        name: 'full_name',
        outlet: 'outlet',
        tier: 'tier',
        createdAt: 'created_at',
      }[sortBy];

      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to search contacts', error);
        throw new Error(`Failed to search contacts: ${error.message}`);
      }

      return {
        contacts: data || [],
        total: count || 0,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Contact search failed', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: string, organizationId: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to fetch contact', error);
      throw new Error(`Failed to fetch contact: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new contact
   */
  async createContact(input: CreateContactInput, userId: string): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...input,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create contact', error);
      throw new Error(`Failed to create contact: ${error.message}`);
    }

    logger.info(`Contact created: ${data.id}`);

    return data;
  }

  /**
   * Update contact
   */
  async updateContact(
    id: string,
    input: UpdateContactInput,
    organizationId: string,
    userId: string
  ): Promise<Contact> {
    const { data, error} = await supabase
      .from('contacts')
      .update({
        ...input,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update contact', error);
      throw new Error(`Failed to update contact: ${error.message}`);
    }

    logger.info(`Contact updated: ${id}`);

    return data;
  }

  /**
   * Soft delete contact
   */
  async deleteContact(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to delete contact', error);
      throw new Error(`Failed to delete contact: ${error.message}`);
    }

    logger.info(`Contact deleted: ${id}`);
  }

  /**
   * Bulk delete contacts
   */
  async bulkDeleteContacts(contactIds: string[], organizationId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', contactIds)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      logger.error('Failed to bulk delete contacts', error);
      throw new Error(`Failed to bulk delete contacts: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    logger.info(`Bulk deleted ${deletedCount} contacts`);

    return deletedCount;
  }

  /**
   * Get contact statistics
   */
  async getContactStats(organizationId: string): Promise<ContactStats> {
    const { data, error } = await supabase.rpc('get_contact_stats', {
      p_org_id: organizationId,
    });

    if (error) {
      logger.error('Failed to get contact stats', error);
      throw new Error(`Failed to get contact stats: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // TAG MANAGEMENT
  // =====================================================

  /**
   * Get all tags for organization
   */
  async getTags(organizationId: string): Promise<ContactTag[]> {
    const { data, error } = await supabase
      .from('contact_tags')
      .select('*')
      .eq('organization_id', organizationId)
      .order('usage_count', { ascending: false });

    if (error) {
      logger.error('Failed to fetch tags', error);
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new tag
   */
  async createTag(input: CreateContactTagInput): Promise<ContactTag> {
    // Generate slug from name
    const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data, error } = await supabase
      .from('contact_tags')
      .insert({
        ...input,
        slug,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create tag', error);
      throw new Error(`Failed to create tag: ${error.message}`);
    }

    logger.info(`Tag created: ${data.id}`);

    return data;
  }

  /**
   * Update tag
   */
  async updateTag(id: string, input: UpdateContactTagInput, organizationId: string): Promise<ContactTag> {
    const updates: any = { ...input };

    // Regenerate slug if name changed
    if (input.name) {
      updates.slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    const { data, error } = await supabase
      .from('contact_tags')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update tag', error);
      throw new Error(`Failed to update tag: ${error.message}`);
    }

    logger.info(`Tag updated: ${id}`);

    return data;
  }

  /**
   * Delete tag
   */
  async deleteTag(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Failed to delete tag', error);
      throw new Error(`Failed to delete tag: ${error.message}`);
    }

    logger.info(`Tag deleted: ${id}`);
  }

  // =====================================================
  // ENRICHMENT
  // =====================================================

  /**
   * Trigger enrichment for contacts
   */
  async triggerEnrichment(input: TriggerEnrichmentInput, userId: string): Promise<string> {
    // Create enrichment job record
    const { data: job, error } = await supabase
      .from('contact_enrichment_jobs')
      .insert({
        contact_ids: input.contactIds,
        organization_id: input.organizationId,
        requested_by: userId,
        total_contacts: input.contactIds.length,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to create enrichment job', error);
      throw new Error(`Failed to create enrichment job: ${error.message}`);
    }

    logger.info(`Enrichment job created: ${job.id} for ${input.contactIds.length} contacts`);

    // Enqueue the job to BullMQ for async processing
    // Note: In production, this would import and call enqueueContactEnrichment
    // For now, the job is created and agents will pick it up
    // TODO: Import and call: await enqueueContactEnrichment({ jobId: job.id, contactIds: input.contactIds, organizationId: input.organizationId });

    return job.id;
  }

  /**
   * Get enrichment job status
   */
  async getEnrichmentJob(jobId: string, organizationId: string) {
    const { data, error } = await supabase
      .from('contact_enrichment_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      logger.error('Failed to fetch enrichment job', error);
      throw new Error(`Failed to fetch enrichment job: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all enrichment jobs for organization
   */
  async getEnrichmentJobs(organizationId: string, limit = 20) {
    const { data, error } = await supabase
      .from('contact_enrichment_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch enrichment jobs', error);
      throw new Error(`Failed to fetch enrichment jobs: ${error.message}`);
    }

    return data || [];
  }
}

export const contactService = new ContactService();
