"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactMatcher = exports.ContactMatcher = void 0;
const events_1 = require("events");
const supabase_1 = require("../lib/supabase");
class ContactMatcher extends events_1.EventEmitter {
    constructor() {
        super();
    }
    async matchContactsToCampaign(request) {
        const { campaignId, criteria, organizationId, limit = 50 } = request;
        try {
            const { data, error } = await supabase_1.supabase.rpc('match_contacts_to_campaign', {
                p_campaign_id: campaignId,
                p_criteria: criteria,
                p_organization_id: organizationId,
            });
            if (error) {
                console.error('Error matching contacts:', error);
                throw new Error(`Failed to match contacts: ${error.message}`);
            }
            const matches = (data || []).slice(0, limit).map((row) => ({
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
            this.emit('contacts-matched', {
                campaignId,
                matchCount: matches.length,
                avgMatchScore: matches.reduce((sum, m) => sum + m.matchScore, 0) / (matches.length || 1),
            });
            return matches;
        }
        catch (error) {
            console.error('ContactMatcher.matchContactsToCampaign error:', error);
            throw error;
        }
    }
    async createBulkMatches(request) {
        const { campaignId, organizationId } = request;
        try {
            const matches = await this.matchContactsToCampaign(request);
            const matchInputs = matches.map((match) => ({
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
            for (const input of matchInputs) {
                const { data: existing } = await supabase_1.supabase
                    .from('campaign_contact_matches')
                    .select('id')
                    .eq('campaign_id', input.campaignId)
                    .eq('contact_id', input.contactId)
                    .eq('organization_id', organizationId)
                    .single();
                if (existing) {
                    await supabase_1.supabase
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
                }
                else {
                    await supabase_1.supabase.from('campaign_contact_matches').insert({
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
            const readiness = await this.calculateReadiness(campaignId, organizationId);
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
        }
        catch (error) {
            console.error('ContactMatcher.createBulkMatches error:', error);
            throw error;
        }
    }
    async getSuitableContactsForTopics(request) {
        const { topics, organizationId, minRelationshipTier = 'C', limit = 50 } = request;
        try {
            const { data, error } = await supabase_1.supabase.rpc('get_suitable_contacts_for_topics', {
                p_topics: topics,
                p_organization_id: organizationId,
                p_min_tier: minRelationshipTier,
            });
            if (error) {
                console.error('Error getting suitable contacts:', error);
                throw new Error(`Failed to get suitable contacts: ${error.message}`);
            }
            const contacts = (data || []).slice(0, limit).map((row) => ({
                contactId: row.contact_id,
                contactName: row.contact_name,
                outlet: row.outlet,
                beat: row.beat,
                matchScore: parseFloat(row.match_score),
                matchReasons: ['TOPIC_ALIGNMENT'],
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
        }
        catch (error) {
            console.error('ContactMatcher.getSuitableContactsForTopics error:', error);
            throw error;
        }
    }
    async getCampaignMatches(campaignId, organizationId, filters) {
        try {
            let query = supabase_1.supabase
                .from('campaign_contact_matches')
                .select(`
          *,
          contact:contacts(id, name, outlet, beat, topics, expertise_areas)
        `)
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
        }
        catch (error) {
            console.error('ContactMatcher.getCampaignMatches error:', error);
            throw error;
        }
    }
    async approveMatch(matchId, userId, organizationId) {
        try {
            const { data, error } = await supabase_1.supabase
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
        }
        catch (error) {
            console.error('ContactMatcher.approveMatch error:', error);
            throw error;
        }
    }
    async excludeMatch(matchId, userId, reason, organizationId) {
        try {
            const { data, error } = await supabase_1.supabase
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
        }
        catch (error) {
            console.error('ContactMatcher.excludeMatch error:', error);
            throw error;
        }
    }
    async calculateReadiness(campaignId, organizationId) {
        const { data, error } = await supabase_1.supabase.rpc('calculate_campaign_readiness', {
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
    transformMatch(row) {
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
    async generateSuggestions(campaignId, organizationId, agentId, context) {
        try {
            const { data: campaign } = await supabase_1.supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .eq('organization_id', organizationId)
                .single();
            if (!campaign) {
                throw new Error('Campaign not found');
            }
            const criteria = {
                requiredTopics: campaign.topics || context?.contentThemes || [],
                minRelationshipTier: 'B',
                minEngagementScore: 0.5,
                useAgentRecommendations: true,
                agentId,
            };
            const matches = await this.matchContactsToCampaign({
                campaignId,
                criteria,
                organizationId,
                limit: 20,
            });
            const suggestions = matches.map((match) => {
                const reasons = [];
                if (match.matchReasons.includes('RELATIONSHIP_SCORE')) {
                    reasons.push('Strong existing relationship');
                }
                if (match.matchReasons.includes('TOPIC_ALIGNMENT')) {
                    reasons.push(`Covers ${match.matchingTopics?.length || 0} relevant topics`);
                }
                if (match.matchReasons.includes('PAST_SUCCESS')) {
                    reasons.push('History of successful collaborations');
                }
                if (match.matchReasons.includes('ENGAGEMENT_HISTORY')) {
                    reasons.push('High engagement rate');
                }
                return {
                    contactId: match.contactId,
                    contactName: match.contactName,
                    outlet: match.outlet,
                    suggestionReason: reasons.join('; ') || 'Good overall match',
                    confidence: match.matchScore,
                    estimatedSuccessRate: match.totalInteractions > 0
                        ? match.successfulOutcomes / match.totalInteractions
                        : 0.5,
                    relationshipTier: match.relationshipTier,
                    matchingTopics: match.matchingTopics || [],
                };
            });
            this.emit('suggestions-generated', {
                campaignId,
                agentId,
                suggestionCount: suggestions.length,
            });
            return suggestions;
        }
        catch (error) {
            console.error('ContactMatcher.generateSuggestions error:', error);
            throw error;
        }
    }
}
exports.ContactMatcher = ContactMatcher;
exports.contactMatcher = new ContactMatcher();
//# sourceMappingURL=contact-matcher.js.map