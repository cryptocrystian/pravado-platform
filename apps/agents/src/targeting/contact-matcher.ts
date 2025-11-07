// =====================================================
// CONTACT MATCHER - Smart Contact Targeting Engine
// =====================================================

import { EventEmitter } from 'events';
import { supabase } from '../lib/supabase';
import type {
  MatchContactsRequest,
  ContactMatchResult,
  TargetingCriteria,
  CampaignContactMatch,
  CreateCampaignContactMatchInput,
  UpdateCampaignContactMatchInput,
  BulkMatchResult,
  SuitableContactsRequest,
  TargetingSuggestion,
  MatchReason,
} from '@pravado/types';

/**
 * Contact Matcher Engine
 * Handles intelligent contact targeting and matching
 */
export class ContactMatcher extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Match contacts to a campaign based on criteria
   */
  async matchContactsToCampaign(
    request: MatchContactsRequest
  ): Promise<ContactMatchResult[]> {
    const { campaignId, criteria, organizationId, limit = 50 } = request;

    try {
      // Call the PostgreSQL function
      const { data, error } = await supabase.rpc('match_contacts_to_campaign', {
        p_campaign_id: campaignId,
        p_criteria: criteria as any,
        p_organization_id: organizationId,
      });

      if (error) {
        console.error('Error matching contacts:', error);
        throw new Error(`Failed to match contacts: ${error.message}`);
      }

      // Transform database results to ContactMatchResult
      const matches: ContactMatchResult[] = (data || []).slice(0, limit).map((row: any) => ({
        contactId: row.contact_id,
        contactName: row.contact_name,
        outlet: row.outlet,
        beat: row.beat,
        matchScore: parseFloat(row.match_score),
        matchReasons: row.match_reasons || [],
        matchRationale: row.match_rationale,
        relationshipScoreFactor: row.relationship_score_factor
          ? parseFloat(row.relationship_score_factor)
          : null,
        topicAlignmentFactor: row.topic_alignment_factor
          ? parseFloat(row.topic_alignment_factor)
          : null,
        pastSuccessFactor: row.past_success_factor
          ? parseFloat(row.past_success_factor)
          : null,
        engagementFactor: row.engagement_factor ? parseFloat(row.engagement_factor) : null,
        relationshipTier: row.relationship_tier,
        relationshipScore: row.relationship_score ? parseFloat(row.relationship_score) : null,
        totalInteractions: row.total_interactions || 0,
        successfulOutcomes: row.successful_outcomes || 0,
        lastInteractionAt: row.last_interaction_at ? new Date(row.last_interaction_at) : null,
        openRate: row.open_rate ? parseFloat(row.open_rate) : null,
        replyRate: row.reply_rate ? parseFloat(row.reply_rate) : null,
        engagementLevel: row.engagement_level,
        matchingTopics: row.matching_topics || [],
        expertiseAreas: row.expertise_areas || [],
      }));

      // Emit event
      this.emit('contacts-matched', {
        campaignId,
        matchCount: matches.length,
        avgMatchScore:
          matches.reduce((sum, m) => sum + m.matchScore, 0) / (matches.length || 1),
      });

      return matches;
    } catch (error) {
      console.error('ContactMatcher.matchContactsToCampaign error:', error);
      throw error;
    }
  }

  /**
   * Create bulk matches and store them in the database
   */
  async createBulkMatches(
    request: MatchContactsRequest
  ): Promise<BulkMatchResult> {
    const { campaignId, organizationId } = request;

    try {
      // Get matched contacts
      const matches = await this.matchContactsToCampaign(request);

      // Create match records in database
      const matchInputs: CreateCampaignContactMatchInput[] = matches.map((match) => ({
        campaignId,
        contactId: match.contactId,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
        matchRationale: match.matchRationale || undefined,
        relationshipScoreFactor: match.relationshipScoreFactor || undefined,
        topicAlignmentFactor: match.topicAlignmentFactor || undefined,
        pastSuccessFactor: match.pastSuccessFactor || undefined,
        engagementFactor: match.engagementFactor || undefined,
        organizationId,
      }));

      let created = 0;
      let updated = 0;

      // Insert or update matches
      for (const input of matchInputs) {
        const { data: existing } = await supabase
          .from('campaign_contact_matches')
          .select('id')
          .eq('campaign_id', input.campaignId)
          .eq('contact_id', input.contactId)
          .eq('organization_id', organizationId)
          .single();

        if (existing) {
          // Update existing match
          await supabase
            .from('campaign_contact_matches')
            .update({
              match_score: input.matchScore,
              match_reasons: input.matchReasons,
              match_rationale: input.matchRationale,
              relationship_score_factor: input.relationshipScoreFactor,
              topic_alignment_factor: input.topicAlignmentFactor,
              past_success_factor: input.pastSuccessFactor,
              engagement_factor: input.engagementFactor,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          updated++;
        } else {
          // Create new match
          await supabase.from('campaign_contact_matches').insert({
            campaign_id: input.campaignId,
            contact_id: input.contactId,
            match_score: input.matchScore,
            match_reasons: input.matchReasons,
            match_rationale: input.matchRationale,
            relationship_score_factor: input.relationshipScoreFactor,
            topic_alignment_factor: input.topicAlignmentFactor,
            past_success_factor: input.pastSuccessFactor,
            engagement_factor: input.engagementFactor,
            suggested_by_agent: input.suggestedByAgent,
            agent_confidence: input.agentConfidence,
            metadata: input.metadata,
            organization_id: organizationId,
          });
          created++;
        }
      }

      // Get campaign readiness
      const readiness = await this.calculateReadiness(campaignId, organizationId);

      // Emit event
      this.emit('bulk-matches-created', {
        campaignId,
        created,
        updated,
        readiness,
      });

      return {
        campaignId,
        matchesCreated: created,
        matchesUpdated: updated,
        topMatches: matches.slice(0, 10),
        readiness,
      };
    } catch (error) {
      console.error('ContactMatcher.createBulkMatches error:', error);
      throw error;
    }
  }

  /**
   * Get suitable contacts for specific topics
   */
  async getSuitableContactsForTopics(
    request: SuitableContactsRequest
  ): Promise<ContactMatchResult[]> {
    const { topics, organizationId, minRelationshipTier = 'C', limit = 50 } = request;

    try {
      const { data, error } = await supabase.rpc('get_suitable_contacts_for_topics', {
        p_topics: topics,
        p_organization_id: organizationId,
        p_min_tier: minRelationshipTier,
      });

      if (error) {
        console.error('Error getting suitable contacts:', error);
        throw new Error(`Failed to get suitable contacts: ${error.message}`);
      }

      // Transform results
      const contacts: ContactMatchResult[] = (data || []).slice(0, limit).map((row: any) => ({
        contactId: row.contact_id,
        contactName: row.contact_name,
        outlet: row.outlet,
        beat: row.beat,
        matchScore: parseFloat(row.match_score),
        matchReasons: ['TOPIC_ALIGNMENT' as MatchReason],
        matchRationale: `Matches ${row.topic_matches || 0} of ${topics.length} topics`,
        relationshipScoreFactor: null,
        topicAlignmentFactor: parseFloat(row.match_score),
        pastSuccessFactor: null,
        engagementFactor: null,
        relationshipTier: row.relationship_tier,
        relationshipScore: row.relationship_score ? parseFloat(row.relationship_score) : null,
        totalInteractions: 0,
        successfulOutcomes: 0,
        lastInteractionAt: null,
        openRate: null,
        replyRate: null,
        engagementLevel: null,
        matchingTopics: row.matching_topics || [],
        expertiseAreas: row.expertise_areas || [],
      }));

      return contacts;
    } catch (error) {
      console.error('ContactMatcher.getSuitableContactsForTopics error:', error);
      throw error;
    }
  }

  /**
   * Get existing matches for a campaign
   */
  async getCampaignMatches(
    campaignId: string,
    organizationId: string,
    filters?: {
      approved?: boolean;
      excluded?: boolean;
      minScore?: number;
    }
  ): Promise<CampaignContactMatch[]> {
    try {
      let query = supabase
        .from('campaign_contact_matches')
        .select(
          `
          *,
          contact:contacts(id, name, outlet, beat, topics, expertise_areas)
        `
        )
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .order('match_score', { ascending: false });

      if (filters?.approved !== undefined) {
        query = query.eq('is_approved', filters.approved);
      }

      if (filters?.excluded !== undefined) {
        query = query.eq('is_excluded', filters.excluded);
      }

      if (filters?.minScore !== undefined) {
        query = query.gte('match_score', filters.minScore);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching campaign matches:', error);
        throw new Error(`Failed to fetch campaign matches: ${error.message}`);
      }

      return (data || []).map((row) => ({
        id: row.id,
        campaignId: row.campaign_id,
        contactId: row.contact_id,
        matchScore: parseFloat(row.match_score),
        matchReasons: row.match_reasons || [],
        matchRationale: row.match_rationale,
        relationshipScoreFactor: row.relationship_score_factor
          ? parseFloat(row.relationship_score_factor)
          : null,
        topicAlignmentFactor: row.topic_alignment_factor
          ? parseFloat(row.topic_alignment_factor)
          : null,
        pastSuccessFactor: row.past_success_factor
          ? parseFloat(row.past_success_factor)
          : null,
        engagementFactor: row.engagement_factor ? parseFloat(row.engagement_factor) : null,
        isExcluded: row.is_excluded,
        excludedReason: row.excluded_reason,
        excludedBy: row.excluded_by,
        excludedAt: row.excluded_at ? new Date(row.excluded_at) : null,
        isApproved: row.is_approved,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at ? new Date(row.approved_at) : null,
        suggestedByAgent: row.suggested_by_agent,
        agentConfidence: row.agent_confidence ? parseFloat(row.agent_confidence) : null,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        organizationId: row.organization_id,
      }));
    } catch (error) {
      console.error('ContactMatcher.getCampaignMatches error:', error);
      throw error;
    }
  }

  /**
   * Approve a contact match
   */
  async approveMatch(
    matchId: string,
    userId: string,
    organizationId: string
  ): Promise<CampaignContactMatch> {
    try {
      const { data, error } = await supabase
        .from('campaign_contact_matches')
        .update({
          is_approved: true,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Error approving match:', error);
        throw new Error(`Failed to approve match: ${error.message}`);
      }

      this.emit('match-approved', { matchId, userId });

      return this.transformMatch(data);
    } catch (error) {
      console.error('ContactMatcher.approveMatch error:', error);
      throw error;
    }
  }

  /**
   * Exclude a contact match
   */
  async excludeMatch(
    matchId: string,
    userId: string,
    reason: string,
    organizationId: string
  ): Promise<CampaignContactMatch> {
    try {
      const { data, error } = await supabase
        .from('campaign_contact_matches')
        .update({
          is_excluded: true,
          excluded_reason: reason,
          excluded_by: userId,
          excluded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Error excluding match:', error);
        throw new Error(`Failed to exclude match: ${error.message}`);
      }

      this.emit('match-excluded', { matchId, userId, reason });

      return this.transformMatch(data);
    } catch (error) {
      console.error('ContactMatcher.excludeMatch error:', error);
      throw error;
    }
  }

  /**
   * Calculate campaign readiness (delegates to campaign-readiness module)
   */
  private async calculateReadiness(campaignId: string, organizationId: string) {
    const { data, error } = await supabase.rpc('calculate_campaign_readiness', {
      p_campaign_id: campaignId,
      p_organization_id: organizationId,
    });

    if (error) {
      console.error('Error calculating readiness:', error);
      throw new Error(`Failed to calculate readiness: ${error.message}`);
    }

    const result = data?.[0];
    if (!result) {
      throw new Error('No readiness data returned');
    }

    return {
      campaignId,
      readinessScore: parseFloat(result.readiness_score),
      readinessStatus: result.readiness_status,
      totalMatches: result.total_matches || 0,
      approvedMatches: result.approved_matches || 0,
      avgMatchScore: result.avg_match_score ? parseFloat(result.avg_match_score) : 0,
      tierACount: result.tier_a_count || 0,
      tierBCount: result.tier_b_count || 0,
      tierCCount: result.tier_c_count || 0,
      issues: result.issues || [],
      recommendations: result.recommendations || [],
      calculatedAt: new Date(),
    };
  }

  /**
   * Transform database row to CampaignContactMatch
   */
  private transformMatch(row: any): CampaignContactMatch {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      contactId: row.contact_id,
      matchScore: parseFloat(row.match_score),
      matchReasons: row.match_reasons || [],
      matchRationale: row.match_rationale,
      relationshipScoreFactor: row.relationship_score_factor
        ? parseFloat(row.relationship_score_factor)
        : null,
      topicAlignmentFactor: row.topic_alignment_factor
        ? parseFloat(row.topic_alignment_factor)
        : null,
      pastSuccessFactor: row.past_success_factor ? parseFloat(row.past_success_factor) : null,
      engagementFactor: row.engagement_factor ? parseFloat(row.engagement_factor) : null,
      isExcluded: row.is_excluded,
      excludedReason: row.excluded_reason,
      excludedBy: row.excluded_by,
      excludedAt: row.excluded_at ? new Date(row.excluded_at) : null,
      isApproved: row.is_approved,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      suggestedByAgent: row.suggested_by_agent,
      agentConfidence: row.agent_confidence ? parseFloat(row.agent_confidence) : null,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      organizationId: row.organization_id,
    };
  }

  /**
   * Generate AI-powered targeting suggestions
   */
  async generateSuggestions(
    campaignId: string,
    organizationId: string,
    agentId: string,
    context?: {
      campaignGoals?: string[];
      targetAudience?: string;
      contentThemes?: string[];
    }
  ): Promise<TargetingSuggestion[]> {
    try {
      // First, get campaign details
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('organization_id', organizationId)
        .single();

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Build criteria from campaign and context
      const criteria: TargetingCriteria = {
        requiredTopics: campaign.topics || context?.contentThemes || [],
        minRelationshipTier: 'B',
        minEngagementScore: 0.5,
        useAgentRecommendations: true,
        agentId,
      };

      // Get matches
      const matches = await this.matchContactsToCampaign({
        campaignId,
        criteria,
        organizationId,
        limit: 20,
      });

      // Transform to suggestions
      const suggestions: TargetingSuggestion[] = matches.map((match) => {
        const reasons: string[] = [];
        if (match.matchReasons.includes('RELATIONSHIP_SCORE' as MatchReason)) {
          reasons.push('Strong existing relationship');
        }
        if (match.matchReasons.includes('TOPIC_ALIGNMENT' as MatchReason)) {
          reasons.push(`Covers ${match.matchingTopics?.length || 0} relevant topics`);
        }
        if (match.matchReasons.includes('PAST_SUCCESS' as MatchReason)) {
          reasons.push('History of successful collaborations');
        }
        if (match.matchReasons.includes('ENGAGEMENT_HISTORY' as MatchReason)) {
          reasons.push('High engagement rate');
        }

        return {
          contactId: match.contactId,
          contactName: match.contactName,
          outlet: match.outlet,
          suggestionReason: reasons.join('; ') || 'Good overall match',
          confidence: match.matchScore,
          estimatedSuccessRate:
            match.totalInteractions > 0
              ? match.successfulOutcomes / match.totalInteractions
              : 0.5,
          relationshipTier: match.relationshipTier,
          matchingTopics: match.matchingTopics || [],
        };
      });

      // Emit event
      this.emit('suggestions-generated', {
        campaignId,
        agentId,
        suggestionCount: suggestions.length,
      });

      return suggestions;
    } catch (error) {
      console.error('ContactMatcher.generateSuggestions error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const contactMatcher = new ContactMatcher();
