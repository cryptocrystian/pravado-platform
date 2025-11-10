"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignReadiness = exports.CampaignReadiness = void 0;
const events_1 = require("events");
const supabase_1 = require("../lib/supabase");
class CampaignReadiness extends events_1.EventEmitter {
    constructor() {
        super();
    }
    async calculateReadiness(request) {
        const { campaignId, organizationId } = request;
        try {
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
            const readinessResult = {
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
            await supabase_1.supabase
                .from('campaigns')
                .update({
                readiness_score: readinessResult.readinessScore,
                readiness_status: readinessResult.readinessStatus,
                updated_at: new Date().toISOString(),
            })
                .eq('id', campaignId)
                .eq('organization_id', organizationId);
            this.emit('readiness-calculated', {
                campaignId,
                readinessScore: readinessResult.readinessScore,
                readinessStatus: readinessResult.readinessStatus,
            });
            if (readinessResult.readinessStatus === 'NOT_READY') {
                this.emit('readiness-alert', {
                    campaignId,
                    severity: 'high',
                    message: 'Campaign is not ready for execution',
                    issues: readinessResult.issues,
                });
            }
            else if (readinessResult.readinessStatus === 'NEEDS_REVIEW') {
                this.emit('readiness-alert', {
                    campaignId,
                    severity: 'medium',
                    message: 'Campaign needs review before execution',
                    issues: readinessResult.issues,
                });
            }
            return readinessResult;
        }
        catch (error) {
            console.error('CampaignReadiness.calculateReadiness error:', error);
            throw error;
        }
    }
    async getTargetingSummary(campaignId, organizationId) {
        try {
            const { data: campaign, error: campaignError } = await supabase_1.supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .eq('organization_id', organizationId)
                .single();
            if (campaignError) {
                throw new Error(`Failed to fetch campaign: ${campaignError.message}`);
            }
            const { data: matches, error: matchesError } = await supabase_1.supabase
                .from('campaign_contact_matches')
                .select('*')
                .eq('campaign_id', campaignId)
                .eq('organization_id', organizationId);
            if (matchesError) {
                throw new Error(`Failed to fetch matches: ${matchesError.message}`);
            }
            const totalMatches = matches?.length || 0;
            const approvedMatches = matches?.filter((m) => m.is_approved).length || 0;
            const excludedMatches = matches?.filter((m) => m.is_excluded).length || 0;
            const pendingApproval = matches?.filter((m) => !m.is_approved && !m.is_excluded).length || 0;
            const matchScores = matches?.map((m) => parseFloat(m.match_score)) || [];
            const avgMatchScore = matchScores.length > 0
                ? matchScores.reduce((sum, s) => sum + s, 0) / matchScores.length
                : 0;
            const topMatchScore = matchScores.length > 0 ? Math.max(...matchScores) : 0;
            const lowMatchScore = matchScores.length > 0 ? Math.min(...matchScores) : 0;
            const readiness = await this.calculateReadiness({ campaignId, organizationId });
            const lastMatchedAt = matches && matches.length > 0
                ? new Date(Math.max(...matches.map((m) => new Date(m.created_at).getTime())))
                : null;
            const approvedMatchTimestamps = matches
                ?.filter((m) => m.approved_at)
                .map((m) => new Date(m.approved_at).getTime()) || [];
            const lastApprovedAt = approvedMatchTimestamps.length > 0
                ? new Date(Math.max(...approvedMatchTimestamps))
                : null;
            return {
                campaignId,
                campaignName: campaign.name || 'Untitled Campaign',
                targetingMode: campaign.targeting_mode || 'SEMI_AUTO',
                criteria: campaign.targeting_criteria || {},
                totalMatches,
                approvedMatches,
                excludedMatches,
                pendingApproval,
                avgMatchScore,
                topMatchScore,
                lowMatchScore,
                readinessScore: readiness.readinessScore,
                readinessStatus: readiness.readinessStatus,
                issues: readiness.issues,
                lastMatchedAt,
                lastApprovedAt,
            };
        }
        catch (error) {
            console.error('CampaignReadiness.getTargetingSummary error:', error);
            throw error;
        }
    }
    async monitorCampaignsReadiness(organizationId, statuses) {
        try {
            let query = supabase_1.supabase
                .from('campaigns')
                .select('id, organization_id')
                .eq('organization_id', organizationId)
                .eq('status', 'ACTIVE');
            if (statuses && statuses.length > 0) {
                query = query.in('readiness_status', statuses);
            }
            const { data: campaigns, error } = await query;
            if (error) {
                throw new Error(`Failed to fetch campaigns: ${error.message}`);
            }
            const readinessResults = await Promise.all((campaigns || []).map((campaign) => this.calculateReadiness({
                campaignId: campaign.id,
                organizationId: campaign.organization_id,
            })));
            return readinessResults;
        }
        catch (error) {
            console.error('CampaignReadiness.monitorCampaignsReadiness error:', error);
            throw error;
        }
    }
    async getRecommendations(campaignId, organizationId) {
        try {
            const readiness = await this.calculateReadiness({ campaignId, organizationId });
            const critical = [];
            const important = [];
            const suggestions = [];
            if (readiness.totalMatches === 0) {
                critical.push('No contacts matched - campaign cannot be executed');
                critical.push('Run contact matching with appropriate targeting criteria');
            }
            else if (readiness.totalMatches < 5) {
                important.push(`Only ${readiness.totalMatches} contacts matched - consider broadening criteria`);
                suggestions.push('Lower minimum relationship tier or expand topic coverage');
            }
            if (readiness.approvedMatches === 0 && readiness.totalMatches > 0) {
                important.push('No contacts approved yet - review and approve matches');
                suggestions.push('Review top-scoring matches first for quick approval');
            }
            if (readiness.tierACount === 0 && readiness.totalMatches > 0) {
                important.push('No Tier A contacts - campaign may have lower success rate');
                suggestions.push('Consider nurturing B-tier contacts or adjusting expectations');
            }
            if (readiness.avgMatchScore < 0.5) {
                important.push(`Low average match score (${readiness.avgMatchScore.toFixed(2)}) - matches may not be optimal`);
                suggestions.push('Refine targeting criteria to improve match quality');
            }
            const totalTiers = readiness.tierACount + readiness.tierBCount + readiness.tierCCount;
            if (totalTiers > 0) {
                const tierAPercent = (readiness.tierACount / totalTiers) * 100;
                const tierCPercent = (readiness.tierCCount / totalTiers) * 100;
                if (tierAPercent < 20) {
                    suggestions.push('Consider adding more Tier A contacts for higher success probability');
                }
                if (tierCPercent > 60) {
                    suggestions.push('High proportion of Tier C contacts - may require more nurturing effort');
                }
            }
            switch (readiness.readinessStatus) {
                case 'READY':
                    suggestions.push('Campaign is ready for execution');
                    break;
                case 'NEEDS_REVIEW':
                    important.push('Human review recommended before execution');
                    break;
                case 'INSUFFICIENT_CONTACTS':
                    critical.push('Not enough contacts to execute campaign effectively');
                    break;
                case 'NOT_READY':
                    critical.push('Campaign has critical issues preventing execution');
                    break;
            }
            return { critical, important, suggestions };
        }
        catch (error) {
            console.error('CampaignReadiness.getRecommendations error:', error);
            throw error;
        }
    }
    async canExecuteCampaign(campaignId, organizationId) {
        try {
            const readiness = await this.calculateReadiness({ campaignId, organizationId });
            const recommendations = await this.getRecommendations(campaignId, organizationId);
            const canExecute = readiness.readinessStatus === 'READY';
            return {
                canExecute,
                blockers: recommendations.critical,
                warnings: recommendations.important,
            };
        }
        catch (error) {
            console.error('CampaignReadiness.canExecuteCampaign error:', error);
            throw error;
        }
    }
    async autoApproveMatches(campaignId, organizationId, options = {}) {
        const { minScore = 0.7, minTier = 'B', maxCount = 50, dryRun = false, } = options;
        try {
            let query = supabase_1.supabase
                .from('campaign_contact_matches')
                .select(`
          *,
          contact:contacts!inner(
            id,
            relationship_scores(relationship_tier)
          )
        `)
                .eq('campaign_id', campaignId)
                .eq('organization_id', organizationId)
                .eq('is_approved', false)
                .eq('is_excluded', false)
                .gte('match_score', minScore)
                .order('match_score', { ascending: false })
                .limit(maxCount);
            const { data: matches, error } = await query;
            if (error) {
                throw new Error(`Failed to fetch matches: ${error.message}`);
            }
            const tierOrder = { A: 3, B: 2, C: 1, UNRATED: 0 };
            const minTierValue = tierOrder[minTier];
            const eligibleMatches = (matches || []).filter((match) => {
                const tier = match.contact?.relationship_scores?.[0]?.relationship_tier || 'UNRATED';
                return (tierOrder[tier] || 0) >= minTierValue;
            });
            if (dryRun) {
                return {
                    approved: 0,
                    skipped: (matches?.length || 0) - eligibleMatches.length,
                    matchIds: eligibleMatches.map((m) => m.id),
                };
            }
            const matchIds = eligibleMatches.map((m) => m.id);
            if (matchIds.length > 0) {
                const { error: updateError } = await supabase_1.supabase
                    .from('campaign_contact_matches')
                    .update({
                    is_approved: true,
                    approved_by: 'SYSTEM',
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                    .in('id', matchIds);
                if (updateError) {
                    throw new Error(`Failed to approve matches: ${updateError.message}`);
                }
            }
            this.emit('auto-approve-completed', {
                campaignId,
                approved: matchIds.length,
            });
            return {
                approved: matchIds.length,
                skipped: (matches?.length || 0) - eligibleMatches.length,
                matchIds,
            };
        }
        catch (error) {
            console.error('CampaignReadiness.autoApproveMatches error:', error);
            throw error;
        }
    }
    async updateTargetingCriteria(campaignId, organizationId, criteria, triggerRematch = false) {
        try {
            const { error } = await supabase_1.supabase
                .from('campaigns')
                .update({
                targeting_criteria: criteria,
                updated_at: new Date().toISOString(),
            })
                .eq('id', campaignId)
                .eq('organization_id', organizationId);
            if (error) {
                throw new Error(`Failed to update targeting criteria: ${error.message}`);
            }
            this.emit('criteria-updated', { campaignId, criteria });
            if (triggerRematch) {
                this.emit('rematch-requested', { campaignId, criteria });
            }
        }
        catch (error) {
            console.error('CampaignReadiness.updateTargetingCriteria error:', error);
            throw error;
        }
    }
}
exports.CampaignReadiness = CampaignReadiness;
exports.campaignReadiness = new CampaignReadiness();
//# sourceMappingURL=campaign-readiness.js.map