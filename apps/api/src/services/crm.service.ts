// =====================================================
// CRM SERVICE
// =====================================================
// Business logic for CRM relationship management, interactions, and follow-ups

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type {
  ContactInteraction,
  CreateInteractionInput,
  UpdateInteractionInput,
  ContactRelationship,
  CreateRelationshipInput,
  UpdateRelationshipInput,
  FollowUp,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  RecentActivityView,
  RelationshipStrengthView,
  OverdueFollowUpView,
  UserCRMStats,
  InteractionSummary,
  InteractionType,
  InteractionChannel,
  InteractionSentiment,
  InteractionDirection,
} from '@pravado/shared-types';

export class CRMService {
  // =====================================================
  // INTERACTION METHODS
  // =====================================================

  /**
   * Log a new contact interaction
   */
  async logInteraction(
    userId: string,
    input: CreateInteractionInput
  ): Promise<ContactInteraction> {
    try {
      const { data, error } = await supabase
        .from('contact_interactions')
        .insert({
          contact_id: input.contactId,
          user_id: userId,
          interaction_type: input.interactionType,
          direction: input.direction,
          channel: input.channel,
          subject: input.subject || null,
          notes: input.notes || null,
          outcome: input.outcome || null,
          sentiment: input.sentiment || null,
          related_campaign_id: input.relatedCampaignId || null,
          occurred_at: input.occurredAt,
          duration_minutes: input.durationMinutes || null,
          attachments: input.attachments || null,
          external_links: input.externalLinks || [],
          organization_id: input.organizationId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to log interaction', error);
        throw new Error(`Failed to log interaction: ${error.message}`);
      }

      logger.info('Interaction logged successfully', {
        interactionId: data.id,
        contactId: input.contactId,
        type: input.interactionType,
      });

      return this.mapInteractionFromDb(data);
    } catch (error) {
      logger.error('Log interaction failed', error);
      throw error;
    }
  }

  /**
   * Get all interactions for a contact
   */
  async getContactInteractions(
    contactId: string,
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<ContactInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('contact_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get contact interactions', error);
        throw new Error(`Failed to get contact interactions: ${error.message}`);
      }

      return (data || []).map(this.mapInteractionFromDb);
    } catch (error) {
      logger.error('Get contact interactions failed', error);
      throw error;
    }
  }

  /**
   * Get interaction by ID
   */
  async getInteractionById(
    id: string,
    organizationId: string
  ): Promise<ContactInteraction | null> {
    const { data, error } = await supabase
      .from('contact_interactions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('Failed to get interaction', error);
      throw new Error(`Failed to get interaction: ${error.message}`);
    }

    return data ? this.mapInteractionFromDb(data) : null;
  }

  /**
   * Update an interaction
   */
  async updateInteraction(
    id: string,
    userId: string,
    organizationId: string,
    input: UpdateInteractionInput
  ): Promise<ContactInteraction> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.subject !== undefined) updateData.subject = input.subject;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.outcome !== undefined) updateData.outcome = input.outcome;
      if (input.sentiment !== undefined) updateData.sentiment = input.sentiment;
      if (input.occurredAt !== undefined) updateData.occurred_at = input.occurredAt;
      if (input.durationMinutes !== undefined)
        updateData.duration_minutes = input.durationMinutes;

      const { data, error } = await supabase
        .from('contact_interactions')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update interaction', error);
        throw new Error(`Failed to update interaction: ${error.message}`);
      }

      return this.mapInteractionFromDb(data);
    } catch (error) {
      logger.error('Update interaction failed', error);
      throw error;
    }
  }

  /**
   * Delete an interaction
   */
  async deleteInteraction(
    id: string,
    organizationId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('contact_interactions')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Failed to delete interaction', error);
      throw new Error(`Failed to delete interaction: ${error.message}`);
    }
  }

  /**
   * Get interaction summary for a contact
   */
  async getInteractionSummary(
    contactId: string,
    organizationId: string
  ): Promise<InteractionSummary> {
    try {
      const { data, error } = await supabase
        .from('contact_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false });

      if (error) {
        logger.error('Failed to get interaction summary', error);
        throw new Error(`Failed to get interaction summary: ${error.message}`);
      }

      const interactions = (data || []).map(this.mapInteractionFromDb);

      // Calculate aggregations
      const byType: Record<InteractionType, number> = {} as any;
      const byChannel: Record<InteractionChannel, number> = {} as any;
      const bySentiment: Record<InteractionSentiment, number> = {} as any;
      const byDirection: Record<InteractionDirection, number> = {} as any;

      interactions.forEach((interaction) => {
        byType[interaction.interactionType] = (byType[interaction.interactionType] || 0) + 1;
        byChannel[interaction.channel] = (byChannel[interaction.channel] || 0) + 1;
        byDirection[interaction.direction] = (byDirection[interaction.direction] || 0) + 1;
        if (interaction.sentiment) {
          bySentiment[interaction.sentiment] = (bySentiment[interaction.sentiment] || 0) + 1;
        }
      });

      return {
        totalInteractions: interactions.length,
        byType,
        byChannel,
        bySentiment,
        byDirection,
        recentInteractions: interactions.slice(0, 10),
      };
    } catch (error) {
      logger.error('Get interaction summary failed', error);
      throw error;
    }
  }

  // =====================================================
  // RELATIONSHIP METHODS
  // =====================================================

  /**
   * Create a new contact relationship
   */
  async createRelationship(
    userId: string,
    input: CreateRelationshipInput
  ): Promise<ContactRelationship> {
    try {
      const { data, error } = await supabase
        .from('contact_relationships')
        .insert({
          contact_id: input.contactId,
          user_id: userId,
          relationship_type: input.relationshipType,
          notes: input.notes || null,
          priority_level: input.priorityLevel || 0,
          organization_id: input.organizationId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create relationship', error);
        throw new Error(`Failed to create relationship: ${error.message}`);
      }

      logger.info('Relationship created successfully', {
        relationshipId: data.id,
        contactId: input.contactId,
        userId,
      });

      return this.mapRelationshipFromDb(data);
    } catch (error) {
      logger.error('Create relationship failed', error);
      throw error;
    }
  }

  /**
   * Get relationship between user and contact
   */
  async getRelationship(
    userId: string,
    contactId: string,
    organizationId: string
  ): Promise<ContactRelationship | null> {
    const { data, error } = await supabase
      .from('contact_relationships')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('Failed to get relationship', error);
      throw new Error(`Failed to get relationship: ${error.message}`);
    }

    return data ? this.mapRelationshipFromDb(data) : null;
  }

  /**
   * Get all relationships for a user
   */
  async getUserRelationships(
    userId: string,
    organizationId: string,
    activeOnly = true,
    limit = 100,
    offset = 0
  ): Promise<ContactRelationship[]> {
    try {
      let query = supabase
        .from('contact_relationships')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      query = query
        .order('strength_score', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user relationships', error);
        throw new Error(`Failed to get user relationships: ${error.message}`);
      }

      return (data || []).map(this.mapRelationshipFromDb);
    } catch (error) {
      logger.error('Get user relationships failed', error);
      throw error;
    }
  }

  /**
   * Update a relationship
   */
  async updateRelationship(
    userId: string,
    contactId: string,
    organizationId: string,
    input: UpdateRelationshipInput
  ): Promise<ContactRelationship> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.relationshipType !== undefined)
        updateData.relationship_type = input.relationshipType;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.priorityLevel !== undefined)
        updateData.priority_level = input.priorityLevel;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from('contact_relationships')
        .update(updateData)
        .eq('user_id', userId)
        .eq('contact_id', contactId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update relationship', error);
        throw new Error(`Failed to update relationship: ${error.message}`);
      }

      return this.mapRelationshipFromDb(data);
    } catch (error) {
      logger.error('Update relationship failed', error);
      throw error;
    }
  }

  /**
   * Get relationship strengths view
   */
  async getRelationshipStrengths(
    userId: string,
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<RelationshipStrengthView[]> {
    try {
      const { data, error } = await supabase
        .from('relationship_strengths')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('strength_score', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get relationship strengths', error);
        throw new Error(`Failed to get relationship strengths: ${error.message}`);
      }

      return (data || []).map(this.mapRelationshipStrengthFromDb);
    } catch (error) {
      logger.error('Get relationship strengths failed', error);
      throw error;
    }
  }

  // =====================================================
  // FOLLOW-UP METHODS
  // =====================================================

  /**
   * Schedule a follow-up
   */
  async scheduleFollowUp(
    userId: string,
    input: CreateFollowUpInput
  ): Promise<FollowUp> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({
          contact_id: input.contactId,
          interaction_id: input.interactionId || null,
          title: input.title,
          notes: input.notes || null,
          due_date: input.dueDate,
          priority: input.priority || 'MEDIUM',
          status: 'PENDING',
          organization_id: input.organizationId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to schedule follow-up', error);
        throw new Error(`Failed to schedule follow-up: ${error.message}`);
      }

      logger.info('Follow-up scheduled successfully', {
        followUpId: data.id,
        contactId: input.contactId,
        dueDate: input.dueDate,
      });

      return this.mapFollowUpFromDb(data);
    } catch (error) {
      logger.error('Schedule follow-up failed', error);
      throw error;
    }
  }

  /**
   * Get follow-up by ID
   */
  async getFollowUpById(
    id: string,
    organizationId: string
  ): Promise<FollowUp | null> {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('Failed to get follow-up', error);
      throw new Error(`Failed to get follow-up: ${error.message}`);
    }

    return data ? this.mapFollowUpFromDb(data) : null;
  }

  /**
   * Get all follow-ups for a user
   */
  async getUserFollowUps(
    userId: string,
    organizationId: string,
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<FollowUp[]> {
    try {
      let query = supabase
        .from('follow_ups')
        .select('*')
        .eq('created_by', userId)
        .eq('organization_id', organizationId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('due_date', { ascending: true }).range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user follow-ups', error);
        throw new Error(`Failed to get user follow-ups: ${error.message}`);
      }

      return (data || []).map(this.mapFollowUpFromDb);
    } catch (error) {
      logger.error('Get user follow-ups failed', error);
      throw error;
    }
  }

  /**
   * Get pending follow-ups for a user
   */
  async getPendingFollowUps(
    userId: string,
    organizationId: string,
    limit = 50
  ): Promise<FollowUp[]> {
    return this.getUserFollowUps(userId, organizationId, 'PENDING', limit);
  }

  /**
   * Get overdue follow-ups
   */
  async getOverdueFollowUps(
    userId: string,
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<OverdueFollowUpView[]> {
    try {
      const { data, error } = await supabase
        .from('overdue_follow_ups')
        .select('*')
        .eq('created_by', userId)
        .eq('organization_id', organizationId)
        .order('days_overdue', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get overdue follow-ups', error);
        throw new Error(`Failed to get overdue follow-ups: ${error.message}`);
      }

      return (data || []).map(this.mapOverdueFollowUpFromDb);
    } catch (error) {
      logger.error('Get overdue follow-ups failed', error);
      throw error;
    }
  }

  /**
   * Update a follow-up
   */
  async updateFollowUp(
    id: string,
    userId: string,
    organizationId: string,
    input: UpdateFollowUpInput
  ): Promise<FollowUp> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.completionNotes !== undefined)
        updateData.completion_notes = input.completionNotes;

      const { data, error } = await supabase
        .from('follow_ups')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update follow-up', error);
        throw new Error(`Failed to update follow-up: ${error.message}`);
      }

      return this.mapFollowUpFromDb(data);
    } catch (error) {
      logger.error('Update follow-up failed', error);
      throw error;
    }
  }

  /**
   * Complete a follow-up
   */
  async completeFollowUp(
    id: string,
    userId: string,
    organizationId: string,
    completionNotes?: string
  ): Promise<FollowUp> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to complete follow-up', error);
        throw new Error(`Failed to complete follow-up: ${error.message}`);
      }

      logger.info('Follow-up completed', { followUpId: id });

      return this.mapFollowUpFromDb(data);
    } catch (error) {
      logger.error('Complete follow-up failed', error);
      throw error;
    }
  }

  /**
   * Delete a follow-up
   */
  async deleteFollowUp(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Failed to delete follow-up', error);
      throw new Error(`Failed to delete follow-up: ${error.message}`);
    }
  }

  // =====================================================
  // ACTIVITY & STATS METHODS
  // =====================================================

  /**
   * Get recent activity for a user
   */
  async getRecentActivity(
    userId: string,
    organizationId: string,
    days = 30,
    limit = 50,
    offset = 0
  ): Promise<RecentActivityView[]> {
    try {
      const { data, error } = await supabase
        .from('recent_contact_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get recent activity', error);
        throw new Error(`Failed to get recent activity: ${error.message}`);
      }

      return (data || []).map(this.mapRecentActivityFromDb);
    } catch (error) {
      logger.error('Get recent activity failed', error);
      throw error;
    }
  }

  /**
   * Get CRM stats for a user
   */
  async getUserCRMStats(
    userId: string,
    organizationId: string
  ): Promise<UserCRMStats> {
    try {
      const { data, error } = await supabase.rpc('get_user_crm_stats', {
        user_uuid: userId,
      });

      if (error) {
        logger.error('Failed to get user CRM stats', error);
        throw new Error(`Failed to get user CRM stats: ${error.message}`);
      }

      return {
        totalRelationships: data[0].total_relationships || 0,
        hotRelationships: data[0].hot_relationships || 0,
        warmRelationships: data[0].warm_relationships || 0,
        coolRelationships: data[0].cool_relationships || 0,
        coldRelationships: data[0].cold_relationships || 0,
        interactionsThisWeek: data[0].interactions_this_week || 0,
        interactionsThisMonth: data[0].interactions_this_month || 0,
        pendingFollowUps: data[0].pending_follow_ups || 0,
        overdueFollowUps: data[0].overdue_follow_ups || 0,
        avgStrengthScore: parseFloat(data[0].avg_strength_score) || 0,
      };
    } catch (error) {
      logger.error('Get user CRM stats failed', error);
      throw error;
    }
  }

  /**
   * Mark overdue follow-ups (scheduled job)
   */
  async markOverdueFollowUps(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_overdue_follow_ups');

      if (error) {
        logger.error('Failed to mark overdue follow-ups', error);
        throw new Error(`Failed to mark overdue follow-ups: ${error.message}`);
      }

      logger.info('Marked overdue follow-ups', { count: data });

      return data || 0;
    } catch (error) {
      logger.error('Mark overdue follow-ups failed', error);
      throw error;
    }
  }

  // =====================================================
  // MAPPER HELPERS
  // =====================================================

  private mapInteractionFromDb(data: any): ContactInteraction {
    return {
      id: data.id,
      contactId: data.contact_id,
      userId: data.user_id,
      interactionType: data.interaction_type,
      direction: data.direction,
      channel: data.channel,
      subject: data.subject,
      notes: data.notes,
      outcome: data.outcome,
      sentiment: data.sentiment,
      relatedCampaignId: data.related_campaign_id,
      occurredAt: new Date(data.occurred_at),
      durationMinutes: data.duration_minutes,
      attachments: data.attachments,
      externalLinks: data.external_links || [],
      organizationId: data.organization_id,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapRelationshipFromDb(data: any): ContactRelationship {
    return {
      id: data.id,
      contactId: data.contact_id,
      userId: data.user_id,
      relationshipType: data.relationship_type,
      notes: data.notes,
      strengthScore: parseFloat(data.strength_score) || 0,
      interactionCount: data.interaction_count || 0,
      lastInteractionAt: data.last_interaction_at
        ? new Date(data.last_interaction_at)
        : null,
      isActive: data.is_active,
      priorityLevel: data.priority_level || 0,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapFollowUpFromDb(data: any): FollowUp {
    return {
      id: data.id,
      contactId: data.contact_id,
      interactionId: data.interaction_id,
      title: data.title,
      notes: data.notes,
      dueDate: new Date(data.due_date),
      priority: data.priority,
      status: data.status,
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      completionNotes: data.completion_notes,
      reminderSent: data.reminder_sent,
      reminderSentAt: data.reminder_sent_at ? new Date(data.reminder_sent_at) : null,
      organizationId: data.organization_id,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapRecentActivityFromDb(data: any): RecentActivityView {
    return {
      userId: data.user_id,
      contactId: data.contact_id,
      contactName: data.contact_name,
      outlet: data.outlet,
      interactionType: data.interaction_type,
      direction: data.direction,
      channel: data.channel,
      occurredAt: new Date(data.occurred_at),
      sentiment: data.sentiment,
      organizationId: data.organization_id,
    };
  }

  private mapRelationshipStrengthFromDb(data: any): RelationshipStrengthView {
    return {
      userId: data.user_id,
      contactId: data.contact_id,
      contactName: data.contact_name,
      tier: data.tier,
      outlet: data.outlet,
      relationshipType: data.relationship_type,
      strengthScore: parseFloat(data.strength_score) || 0,
      interactionCount: data.interaction_count || 0,
      lastInteractionAt: data.last_interaction_at
        ? new Date(data.last_interaction_at)
        : null,
      priorityLevel: data.priority_level || 0,
      isActive: data.is_active,
      relationshipTemperature: data.relationship_temperature,
      organizationId: data.organization_id,
    };
  }

  private mapOverdueFollowUpFromDb(data: any): OverdueFollowUpView {
    return {
      id: data.id,
      contactId: data.contact_id,
      contactName: data.contact_name,
      title: data.title,
      dueDate: new Date(data.due_date),
      priority: data.priority,
      createdBy: data.created_by,
      daysOverdue: data.days_overdue,
      organizationId: data.organization_id,
    };
  }
}

export const crmService = new CRMService();
